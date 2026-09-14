import { useCanonicalWorkspace } from './useCanonicalWorkspace';
import {
  createSpec,
  deterministicExportFilename,
  executeTechnicalCommand,
  generateDeterministicTechPack,
  registerExport,
  registerFlat,
  releaseRulesetVersion,
  type TechnicalCommand,
} from '../domains/technical';
import type { CanonicalTechnicalFile, TechnicalFlatView } from '../domains/workspace';
import { getImageBlob, saveImageBlob } from '../lib/imageBlobStore';
import { storeTechnicalSource } from '../lib/technicalFiles';
import { recordClientEvent } from '../lib/observability';
import {
  loadCanonicalMediaBlob,
  recordTechPackExportCommand,
  stageCanonicalMediaBlob,
} from '../domains/persistence';

export function useTechnicalStudio() {
  const { commitWorkspace, commitWorkspaceAsync, currentActorId, requireFreshWorkspace, state } = useCanonicalWorkspace();
  const execute = (command: TechnicalCommand) => commitWorkspace((current) => executeTechnicalCommand(current, command));

  const createSpecification = (garmentId: string, baseSize = 'M', unit: 'mm' | 'cm' | 'in' = 'cm') => {
    let specId = '';
    commitWorkspace((current) => { const result = createSpec(current, garmentId, baseSize, unit); specId = result.spec.id; return result.state; });
    return specId;
  };

  const uploadFlatRevision = async (specId: string, view: TechnicalFlatView, file: File) => {
    if (!state) throw new Error('The workspace is not ready.');
    const asset = await storeTechnicalSource(file, state.studioId);
    let flatId = '';
    commitWorkspace((current) => {
      const withAsset = { ...current, mediaAssets: [...current.mediaAssets, asset] };
      const revisions = withAsset.technicalFlats.filter((item) => item.specId === specId && item.view === view).length + 1;
      const result = registerFlat(withAsset, specId, asset.id, view, `R${revisions}`);
      flatId = result.flat.id;
      return result.state;
    });
    return flatId;
  };

  const uploadTechnicalFile = async (specId: string, fileType: CanonicalTechnicalFile['fileType'], versionLabel: string, file: File) => {
    if (!state) throw new Error('The workspace is not ready.');
    if (!state.technicalSpecs.some((item) => item.id === specId)) throw new Error('Technical specification not found.');
    const asset = await storeTechnicalSource(file, state.studioId);
    const now = new Date().toISOString();
    const technicalFile: CanonicalTechnicalFile = { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: state.studioId, updatedAt: now, assetId: asset.id, fileType, isSource: true, specId, versionLabel: versionLabel.trim() || 'R1' };
    commitWorkspace((current) => ({ ...current, mediaAssets: [...current.mediaAssets, asset], technicalFiles: [...current.technicalFiles, technicalFile] }));
    return technicalFile.id;
  };

  const ensureTechPackTemplate = () => {
    if (!state) throw new Error('The workspace is not ready.');
    const existing = state.templates.find((item) => item.templateType === 'tech_pack' && item.status === 'active');
    if (existing) return existing.id;
    const now = new Date().toISOString();
    const template = { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: state.studioId, updatedAt: now, name: 'Mystic Lore Complete Tech Pack', payload: { sections: ['overview', 'flats', 'pom_measurements', 'bom', 'construction', 'grading_files'] }, status: 'active' as const, templateType: 'tech_pack' as const, version: 1 };
    commitWorkspace((current) => ({ ...current, templates: [...current.templates, template] }));
    return template.id;
  };

  const createExport = async (specId: string, selectedTemplateId?: string) => {
    const fresh = await requireFreshWorkspace();
    const spec = fresh.technicalSpecs.find((item) => item.id === specId)!;
    if (!spec?.releaseVersionId || spec.status !== 'released') throw new Error('Release the validated specification before generating its tech pack.');
    const garment = fresh.garments.find((item) => item.id === spec.garmentId)!;
    const templateRecord = fresh.templates.find((item) => item.id === selectedTemplateId && item.templateType === 'tech_pack' && item.status === 'active') ?? fresh.templates.find((item) => item.templateType === 'tech_pack' && item.status === 'active');
    if (!templateRecord) throw new Error('Select an active tech-pack template.');
    const version = fresh.garmentVersions.find((item) => item.id === spec.releaseVersionId)!;
    let generated;
    try {
      generated = await generateDeterministicTechPack(fresh, specId, version.id, templateRecord.id, async (assetId) => {
        const asset = fresh.mediaAssets.find((item) => item.id === assetId);
        if (!asset) return null;
        return asset.localBlobKey ? (await getImageBlob(asset.localBlobKey) ?? await loadCanonicalMediaBlob(asset)) : await loadCanonicalMediaBlob(asset);
      });
    } catch (error) {
      recordClientEvent({ context: { format: 'zip', stage: 'generate_tech_pack' }, kind: 'export_failure' });
      throw error;
    }
    const blob = new Blob([Uint8Array.from(generated.bytes)], { type: 'application/zip' });
    const checksum = generated.checksum;
    const filename = deterministicExportFilename(garment.garmentCode, version.versionNo, templateRecord.version, checksum, 'zip');
    const assetId = crypto.randomUUID();
    const blobKey = `technical-export:${assetId}`;
    await saveImageBlob(blobKey, blob);
    const now = new Date().toISOString();
    const storagePath = `studios/${fresh.studioId}/technical/exports/${assetId}/${filename}`;
    const asset = { createdAt: now, id: assetId, revision: 1, studioId: fresh.studioId, updatedAt: now, checksum, height: null, localBlobKey: blobKey, mimeType: 'application/zip', name: filename, rights: { source: 'private deterministic structured technical export' }, sizeBytes: blob.size, storagePath, storageState: 'queued' as const, width: null };
    await stageCanonicalMediaBlob(asset, blob);
    const registered = registerExport({ ...fresh, mediaAssets: [...fresh.mediaAssets, asset] }, { approvedAt: now, approvedBy: currentActorId, deterministicFilename: filename, exportAssetId: asset.id, format: 'zip', garmentVersionId: version.id, generatedAt: now, checksum, rulesetVersion: releaseRulesetVersion, sectionManifest: generated.sectionManifest, sourceRevisionLabel: spec.revisionLabel, specId, storagePath, templateId: templateRecord.id, templateVersion: templateRecord.version });
    await commitWorkspaceAsync(() => ({ ...fresh, mediaAssets: [...fresh.mediaAssets, asset] }), { skipAutoLedger: true });
    await recordTechPackExportCommand({
      expectedSpecRevision: spec.revision,
      exportRecord: registered.exportRecord,
      operationId: crypto.randomUUID(),
    });
    await requireFreshWorkspace();
    return { blob, checksum, filename, sectionManifest: generated.sectionManifest };
  };

  return { createExport, createSpecification, ensureTechPackTemplate, execute, state, uploadFlatRevision, uploadTechnicalFile };
}
