import { useCanonicalWorkspace } from './useCanonicalWorkspace';
import {
  createSpec,
  createTechnicalCheckpoint,
  deterministicExportFilename,
  executeTechnicalCommand,
  registerExport,
  registerFlat,
  validateTechnicalSpec,
  type TechnicalCommand,
} from '../domains/technical';
import type { TechnicalFlatView } from '../domains/workspace';
import { getImageBlob, saveImageBlob } from '../lib/imageBlobStore';
import { sha256, storeTechnicalSource } from '../lib/technicalFiles';

export function useTechnicalStudio() {
  const { commitWorkspace, state } = useCanonicalWorkspace();
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

  const createExport = async (specId: string) => {
    if (!state) throw new Error('The workspace is not ready.');
    const issues = validateTechnicalSpec(state, specId, true);
    if (issues.length) throw new Error(issues[0].message);
    const spec = state.technicalSpecs.find((item) => item.id === specId)!;
    const garment = state.garments.find((item) => item.id === spec.garmentId)!;
    let template = state.templates.find((item) => item.templateType === 'tech_pack' && item.status !== 'archived');
    if (!template) {
      const now = new Date().toISOString();
      template = { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId: state.studioId, updatedAt: now, name: 'ML Flats Foundation', payload: { requiredViews: ['front', 'back'] }, status: 'active', templateType: 'tech_pack', version: 1 };
    }
    const templateRecord = template;
    const checkpoint = await createTechnicalCheckpoint(state, specId);
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const sourceFiles = checkpoint.state.technicalFiles.filter((item) => item.specId === specId && item.isSource).sort((a, b) => a.versionLabel.localeCompare(b.versionLabel));
    const manifest = { generatedFrom: { garmentVersionId: checkpoint.version.id, garmentVersionChecksum: checkpoint.version.checksum, sourceRevisionLabel: spec.revisionLabel }, template: { id: templateRecord.id, version: templateRecord.version }, sources: [] as Array<{ checksum: string; name: string; view: string }> };
    for (const source of sourceFiles) {
      const asset = checkpoint.state.mediaAssets.find((item) => item.id === source.assetId)!;
      const blob = asset.localBlobKey ? await getImageBlob(asset.localBlobKey) : null;
      const flat = checkpoint.state.technicalFlats.find((item) => item.assetId === asset.id)!;
      if (blob) zip.file(`sources/${flat.view}-${asset.name}`, blob, { date: new Date('1980-01-01T00:00:00.000Z') });
      manifest.sources.push({ checksum: asset.checksum, name: asset.name, view: flat.view });
    }
    zip.file('manifest.json', JSON.stringify(manifest, null, 2), { date: new Date('1980-01-01T00:00:00.000Z') });
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 }, platform: 'UNIX' });
    const checksum = await sha256(blob);
    const filename = deterministicExportFilename(garment.garmentCode, checkpoint.version.versionNo, templateRecord.version, checksum, 'zip');
    const assetId = crypto.randomUUID();
    const blobKey = `technical-export:${assetId}`;
    await saveImageBlob(blobKey, blob);
    const now = new Date().toISOString();
    const asset = { createdAt: now, id: assetId, revision: 1, studioId: state.studioId, updatedAt: now, checksum, height: null, localBlobKey: blobKey, mimeType: 'application/zip', name: filename, rights: { source: 'private deterministic technical export' }, sizeBytes: blob.size, storagePath: `studios/${state.studioId}/technical/exports/${assetId}/${filename}`, storageState: 'stored' as const, width: null };
    commitWorkspace((current) => {
      const next = { ...current, garmentVersions: [...current.garmentVersions, checkpoint.version], mediaAssets: [...current.mediaAssets, asset], templates: current.templates.some((item) => item.id === templateRecord.id) ? current.templates : [...current.templates, templateRecord] };
      return registerExport(next, { specId, garmentVersionId: checkpoint.version.id, exportAssetId: asset.id, format: 'zip', checksum, templateId: templateRecord.id, templateVersion: templateRecord.version, sourceRevisionLabel: spec.revisionLabel, deterministicFilename: filename }).state;
    });
    return { blob, filename };
  };

  return { createExport, createSpecification, execute, state, uploadFlatRevision };
}
