import { validateRelease } from '../technical/releaseRepository';
import type { CanonicalAiJob, CanonicalWorkspaceState } from '../workspace';
import type { FakeAiCandidate } from './contracts';

/** A local, deterministic provider used for development and every normal test. */
export function generateFakeAiCandidate(state: CanonicalWorkspaceState, job: CanonicalAiJob): FakeAiCandidate {
  const garment = required(state.garments.find((item) => item.id === job.garmentId), 'Garment');
  const spec = state.technicalSpecs.find((item) => item.garmentId === garment.id) ?? null;
  const baseProvenance = {
    generatedBy: 'deterministic_fake',
    inputRefIds: [...job.inputRefIds],
    jobId: job.id,
    model: job.selectedModel,
    promptTemplateVersion: job.promptTemplateVersion,
    sourceChecksum: job.sourceChecksum,
  };

  if (job.jobType === 'technical_flat_generation') {
    if (!spec) throw new Error('Create a technical specification before requesting flat candidates.');
    const sourceAsset = job.inputRefIds
      .map((id) => state.aiInputRefs.find((item) => item.id === id))
      .find((item) => item?.entityType === 'media_asset');
    const asset = sourceAsset ? state.mediaAssets.find((item) => item.id === sourceAsset.entityId) : null;
    if (!asset) throw new Error('Technical flat generation requires an approved private reference asset.');
    const missingViews = (['front', 'back'] as const).filter((view) => !state.technicalFlats.some((item) => item.specId === spec.id && item.view === view));
    const flats = (missingViews.length ? missingViews : ['detail'] as const).map((view) => ({ assetId: asset.id, key: `flat:${view}`, sourceMapping: { checksum: asset.checksum, sourceAssetId: asset.id }, specId: spec.id, versionLabel: `AI candidate ${view} · ${job.promptTemplateVersion}`, view }));
    return candidate(baseProvenance, { flats }, flats.map((item) => field(item.key, `${title(item.view)} flat`, `flats.${item.view}`, 'Registers an unapproved flat revision from the selected private source.')), { fidelity: contextual('medium', 'Fake provider checks workflow structure, not visual fidelity.') });
  }

  if (job.jobType === 'pom_assistance') {
    if (!spec) throw new Error('Create a technical specification before requesting POM assistance.');
    const used = new Set(state.pomPoints.filter((item) => item.specId === spec.id).map((item) => item.code));
    const points = [
      { anchor: { x: 0.5, y: 0.12 }, code: uniqueCode(used, 'HPS'), key: 'pom:hps', method: 'Measure vertically from high point shoulder to finished hem.', name: 'High point shoulder length', specId: spec.id },
      { anchor: { x: 0.5, y: 0.42 }, code: uniqueCode(used, 'CW'), key: 'pom:chest-width', method: 'Measure straight across chest, 2.5 cm below armhole.', name: 'Chest width', specId: spec.id },
    ];
    return candidate(baseProvenance, { points }, points.map((item) => field(item.key, `${item.code} · ${item.name}`, `points.${item.code}`, 'Creates one stable POM identity and method.')), { methodFit: contextual('medium', 'Suggested methods require technical-designer review against the garment type.') });
  }

  if (job.jobType === 'bom_assistance') {
    if (!spec) throw new Error('Create a technical specification before requesting BOM assistance.');
    const garmentMaterial = state.garmentMaterials.find((item) => item.garmentId === garment.id);
    const variant = garmentMaterial ? state.materialVariants.find((item) => item.id === garmentMaterial.variantId) : null;
    const material = variant ? state.materials.find((item) => item.id === variant.materialId) : null;
    const items = [{
      componentVariantId: null,
      currency: 'USD',
      description: material && variant ? `${material.name} · ${variant.colorName || variant.sku}` : 'Confirm main material',
      intentionalFreeText: !variant,
      itemType: variant ? 'material_variant' : 'custom',
      key: 'bom:main-material',
      materialVariantId: variant?.id ?? null,
      placement: garmentMaterial?.placement || 'Shell',
      quantity: garmentMaterial?.requiredQuantity || 1,
      specId: spec.id,
      status: variant ? 'linked' : 'approved',
      supplierItemId: null,
      unit: garmentMaterial?.unit || 'yd',
    }];
    return candidate(baseProvenance, { items }, items.map((item) => field(item.key, item.description, 'items.main-material', 'Creates one validated BOM row; unresolved relationships stay explicit.')), { relationshipFit: contextual(variant ? 'high' : 'low', variant ? 'Candidate uses an existing garment-material relationship.' : 'No reusable material relationship was available.') });
  }

  if (job.jobType === 'construction_recommendations') {
    if (!spec) throw new Error('Create a technical specification before requesting construction recommendations.');
    const section = state.constructionSections.find((item) => item.specId === spec.id);
    const steps = [
      { key: 'construction:join-primary-seams', machine: 'Single-needle lockstitch', machineRequired: true, operation: 'Join primary body seams in the approved assembly order.', seamAllowance: 1, sectionId: section?.id ?? null, sectionName: section?.name ?? 'Assembly', specId: spec.id, status: 'ready', stitchRequired: true, stitchSpec: '301 lockstitch · 10-12 SPI' },
      { key: 'construction:finish-edges', machine: 'Overlock', machineRequired: true, operation: 'Finish raw internal edges before final press.', seamAllowance: null, sectionId: section?.id ?? null, sectionName: section?.name ?? 'Assembly', specId: spec.id, status: 'ready', stitchRequired: true, stitchSpec: '504 overedge' },
    ];
    return candidate(baseProvenance, { steps }, steps.map((item) => field(item.key, item.operation, `steps.${item.key}`, 'Creates an ordered construction operation after machine, stitch, seam, and order review.')), { constructionFit: contextual('medium', 'Operations are generic production-aware suggestions and require garment-specific confirmation.') });
  }

  if (job.jobType === 'tech_pack_validation') {
    if (!spec) throw new Error('Create a technical specification before requesting tech-pack validation.');
    const templateId = state.templates.find((item) => item.templateType === 'tech_pack' && item.status === 'active')?.id ?? '';
    const preview = validateRelease(state, spec.id, { checkpointLabel: 'AI validation review', templateId });
    const findings = preview.issues.map((item, index) => ({ ...item, key: `validation:${index}:${item.code}` }));
    const fields = findings.length
      ? findings.map((item) => field(item.key, item.code, item.field, item.message, false))
      : [field('validation:passed', 'No current blockers', 'validation', 'Records a clean deterministic validation run.', false)];
    return candidate(baseProvenance, { findings, specId: spec.id }, fields, { coverage: contextual('high', 'Candidate is derived from the same deterministic release rules used by the manual gate.') });
  }

  if (job.jobType === 'editorial_generation') {
    const collection = state.editorialCollections.find((item) => item.primaryGarmentId === garment.id);
    const scene = collection ? state.editorialScenes.find((item) => item.collectionId === collection.id) : null;
    if (!collection || !scene) throw new Error('Create an editorial collection and scene before requesting editorial candidates.');
    const brief = state.designBriefs.find((item) => item.garmentId === garment.id);
    const blocks = [
      { blockType: 'heading', content: { text: garment.title }, key: 'editorial:heading', sceneId: scene.id },
      { blockType: 'body', content: { text: brief?.intent || `An editorial study of ${garment.title}.` }, key: 'editorial:body', sceneId: scene.id },
    ];
    return candidate(baseProvenance, { blocks }, blocks.map((item) => field(item.key, item.blockType === 'heading' ? 'Scene heading' : 'Story copy', `blocks.${item.blockType}`, 'Adds an editable private editorial block; export and publish remain explicit.')), { toneFit: contextual('medium', 'Draft uses the current title and design intent without evaluating brand voice.') });
  }

  const profile = state.portfolioProfiles[0];
  if (!profile) throw new Error('Create a portfolio profile before requesting portfolio drafting.');
  const project = state.portfolioProjects.find((item) => item.profileId === profile.id && item.garmentId === garment.id) ?? null;
  const brief = state.designBriefs.find((item) => item.garmentId === garment.id);
  const values = {
    challenge: brief?.intent || `Translate ${garment.title} from concept into an accountable garment system.`,
    outcome: 'A documented garment story with traceable design and technical decisions.',
    overview: `${garment.title} is a ${garment.garmentType || 'garment'} developed through Mystic Lore Studio.`,
  };
  return candidate(baseProvenance, { profileId: profile.id, projectId: project?.id ?? null, values }, Object.entries(values).map(([key, value]) => field(`portfolio:${key}`, title(key), `caseStudy.${key}`, value)), { privacyReadiness: contextual('medium', 'Draft contains no private cost, supplier, fit, task, or raw prompt fields; Public Cut review is still required.') });
}

function candidate(provenance: Record<string, unknown>, candidateValue: Record<string, unknown>, fields: FakeAiCandidate['fields'], confidence: FakeAiCandidate['confidence']): FakeAiCandidate {
  return { candidate: candidateValue, confidence, fields, provenance };
}
function field(key: string, label: string, path: string, summary: string, safeForPartialAcceptance = true) { return { key, label, path, safeForPartialAcceptance, summary }; }
function contextual(level: 'low' | 'medium' | 'high', context: string) { return { context, level }; }
function required<T>(value: T | null | undefined, label: string): T { if (!value) throw new Error(`${label} not found.`); return value; }
function title(value: string) { return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function uniqueCode(used: Set<string>, base: string) { let value = base; let index = 2; while (used.has(value)) { value = `${base}${index}`; index += 1; } used.add(value); return value; }
