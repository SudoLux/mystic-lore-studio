import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { stableUuid } from '../src/domains/migration/stableIdentity.ts';

type Row = Record<string, unknown>;
type Action = 'create' | 'update' | 'skip' | 'manual-review';
type Count = { created: number; updated: number; skipped: number };
type Conflict = { canonicalId: string; field: string; legacyId: string; v1: unknown; v2: unknown };

const V1_REF = 'jsjhqnmlgceunlxgenkg';
const BETA_REF = 'iahrcupmyjnyyqszrmcx';
const dryRun = process.argv.includes('--dry-run');
const sourceUrl = required('ML_V1_SUPABASE_URL');
const sourceKey = required('ML_V1_SERVICE_ROLE_KEY');
const sourceOwnerId = required('ML_V1_OWNER_USER_ID');
const targetUrl = required('ML_BETA_SUPABASE_URL');
const targetKey = required('ML_BETA_SERVICE_ROLE_KEY');
const targetRef = required('ML_BETA_PROJECT_REF');
const studioId = required('ML_BETA_STUDIO_ID');

if (!sourceUrl.includes(V1_REF)) fail(`V1 must be the read-only project ${V1_REF}.`);
if (targetRef !== BETA_REF || !targetUrl.includes(BETA_REF)) fail(`Writes are restricted to isolated beta ${BETA_REF}.`);
if (process.env.ML_V1_FABRIC_RECREATION_CONFIRM !== 'read-v1-write-beta-no-media') {
  fail('Set ML_V1_FABRIC_RECREATION_CONFIRM=read-v1-write-beta-no-media after confirming the two project references.');
}

const source = createClient(sourceUrl, sourceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const target = createClient(targetUrl, targetKey, { auth: { autoRefreshToken: false, persistSession: false } });
const startedAt = new Date().toISOString();
const counts: Record<string, Count> = {};
const conflicts: Conflict[] = [];
const errors: string[] = [];
const manualReview: string[] = [];
const unmappedFields = new Set<string>(['fabrics.color_family', 'fabrics.weight (descriptive label)', 'materials.notes']);
const fabricResults: Row[] = [];
const supplierResults: Row[] = [];
const relationshipResults: Row[] = [];
const imageReferences: Row[] = [];
const pendingRelationshipRows: Row[] = [];
let trustedMediaDetachResult: Row | null = null;

const [fabrics, legacyMaterials, legacyProjects] = await Promise.all([
  selectSource('fabrics'), selectSource('materials'), selectSource('projects'),
]);
const studioResponse = await target.schema('ml_private').from('studios').select('id,owner_user_id,name').eq('id', studioId).single();
if (studioResponse.error || !studioResponse.data) fail(`Beta Studio is unavailable: ${studioResponse.error?.message ?? studioId}`);
const ownerUserId = String(studioResponse.data.owner_user_id);

const [materials, variants, profiles, suppliers, supplierItems, inventoryEntries, garments, garmentMaterials, mediaLinks, mediaAssets] = await Promise.all([
  selectTarget('materials'), selectTarget('material_variants'), selectTarget('material_variant_profiles'),
  selectTarget('suppliers'), selectTarget('supplier_items'), selectTarget('inventory_entries'),
  selectTarget('garments'), selectTarget('garment_materials'), selectTarget('material_variant_media'), selectTarget('media_assets'),
]);

const duplicateGroups = groupedDuplicates(fabrics, (fabric) => `${normalize(fabric.name)}|${normalize(fabric.fiber_content)}`);
const projectByLegacyId = new Map<string, string>();
for (const project of legacyProjects) {
  const legacyId = identity(project, 'project');
  const expectedId = await stableUuid(`${studioId}:garments:project:${legacyId}`);
  const exact = garments.filter((garment) => garment.id === expectedId || normalize(garment.title) === normalize(project.title));
  const unique = uniqueRows(exact);
  if (unique.length === 1) projectByLegacyId.set(String(project.id), String(unique[0].id));
  else if (unique.length > 1) manualReview.push(`Project ${legacyId} (${text(project.title)}) has multiple exact V2 garment candidates.`);
}

const variantByLegacyKey = new Map<string, string>();
const legacyFabricKeys = new Map<string, Row>();
for (const fabric of fabrics) {
  const legacyId = identity(fabric, 'fabric');
  legacyFabricKeys.set(String(fabric.id), fabric);
  legacyFabricKeys.set(legacyId, fabric);
  const metadata = objectValue(fabric.metadata);
  const expectedMaterialId = await stableUuid(`${studioId}:materials:fabric:${legacyId}`);
  const exactMaterial = materials.find((row) => row.id === expectedMaterialId);
  const semanticMatches = materials.filter((row) => normalize(row.name) === normalize(fabric.name)
    && normalize(row.composition) === normalize(fabric.fiber_content));
  const candidates = exactMaterial ? [exactMaterial] : semanticMatches;
  if (candidates.length > 1) {
    manualReview.push(`Fabric ${legacyId} (${text(fabric.name)}) has ${candidates.length} exact name/composition matches in V2.`);
    fabricResults.push({ action: 'manual-review' satisfies Action, legacyId, name: fabric.name, reason: 'ambiguous canonical material' });
    continue;
  }

  const existingMaterial = candidates[0];
  const materialId = existingMaterial ? String(existingMaterial.id) : expectedMaterialId;
  const materialDesired: Row = {
    category: text(fabric.fabric_type, 'Fabric'),
    composition: nullableText(fabric.fiber_content),
    created_at: fabric.created_at ?? startedAt,
    id: materialId,
    material_code: `MAT-${materialId.slice(0, 8).toUpperCase()}`,
    name: text(fabric.name, 'Untitled fabric'),
    status: canonicalStatus(fabric.archive_status),
    studio_id: studioId,
    updated_at: fabric.updated_at ?? startedAt,
  };
  const materialResult = await createOrFill('materials', existingMaterial, materialDesired, legacyId);

  const expectedVariantId = await stableUuid(`${studioId}:material_variants:fabric-variant:${legacyId}`);
  const exactVariant = variants.find((row) => row.id === expectedVariantId);
  const relatedVariants = variants.filter((row) => row.material_id === materialId);
  if (!exactVariant && relatedVariants.length > 1) {
    manualReview.push(`Fabric ${legacyId} (${text(fabric.name)}) has multiple V2 variants and no deterministic provenance match.`);
    fabricResults.push({ action: 'manual-review' satisfies Action, legacyId, materialId, name: fabric.name, reason: 'ambiguous material variant' });
    continue;
  }
  const existingVariant = exactVariant ?? relatedVariants[0];
  const variantId = existingVariant ? String(existingVariant.id) : expectedVariantId;
  const variantDesired: Row = {
    color_hex: validHex(metadata.primaryColorHex),
    color_name: nullableText(fabric.primary_color),
    created_at: fabric.created_at ?? startedAt,
    id: variantId,
    material_id: materialId,
    sku: null,
    status: canonicalStatus(fabric.archive_status),
    studio_id: studioId,
    updated_at: fabric.updated_at ?? startedAt,
    weight_gsm: nonnegative(metadata.weightGsm),
    width: nonnegative(fabric.width_inches),
    width_unit: nonnegative(fabric.width_inches) === null ? null : 'in',
  };
  const variantResult = await createOrFill('material_variants', existingVariant, variantDesired, legacyId);
  variantByLegacyKey.set(String(fabric.id), variantId);
  variantByLegacyKey.set(legacyId, variantId);

  const expectedProfileId = await stableUuid(`${studioId}:material_variant_profiles:v1:${legacyId}`);
  const existingProfile = profiles.find((row) => row.id === expectedProfileId || row.variant_id === variantId);
  const profileDesired: Row = {
    best_uses: strings(fabric.best_uses), bin_number: nullableText(fabric.bin_number), care_notes: nullableText(fabric.care_notes),
    country_of_origin: nullableText(metadata.countryOfOrigin), created_at: fabric.created_at ?? startedAt,
    drape: nullableText(fabric.drape), hand_feel: nullableText(fabric.hand_feel), id: existingProfile?.id ?? expectedProfileId,
    lore_note: nullableText(fabric.lore_note), mood_tags: strings(fabric.mood_tags), opacity: nullableText(fabric.opacity),
    private_notes: nullableText(metadata.notes), purchase_date: fabric.purchase_date ?? null, rarity: nullableText(fabric.rarity),
    secondary_colors: strings(fabric.secondary_colors), shelf: nullableText(fabric.shelf), storage_location: nullableText(fabric.storage_location),
    storage_status: nullableText(fabric.storage_status), stretch: nullableText(fabric.stretch), structure: nullableText(fabric.structure),
    studio_id: studioId, texture: nullableText(fabric.texture), updated_at: fabric.updated_at ?? startedAt,
    variant_id: variantId, weave_or_knit: nullableText(fabric.weave_or_knit),
  };
  const profileResult = await createOrFill('material_variant_profiles', existingProfile, profileDesired, legacyId);

  const inventoryResult = await ensureOpeningInventory(fabric, legacyId, variantId);
  const supplierResult = await ensureSupplier(fabric, legacyId, variantId);
  const legacyMedia = mediaLinks.filter((link) => link.variant_id === variantId).filter((link) => {
    const asset = mediaAssets.find((row) => row.id === link.asset_id);
    return objectValue(asset?.rights_json).migrationSource === 'mystic-lore-v1';
  });
  imageReferences.push({
    action: legacyMedia.length ? (dryRun ? 'scheduled-for-detach-assets-preserved' : 'detached-assets-preserved') : 'not-attached',
    legacyId, sourcePathForAuditOnly: fabric.image_path ?? null,
  });
  fabricResults.push({
    action: mergeAction([materialResult, variantResult, profileResult, inventoryResult, supplierResult]),
    canonicalMaterialId: materialId, canonicalVariantId: variantId, legacyId, name: fabric.name,
    imageMigrated: false, preExistingLegacyMediaLinksPreserved: legacyMedia.length,
  });
}

for (const legacyMaterial of legacyMaterials) {
  const metadata = objectValue(legacyMaterial.metadata);
  const fabricReference = text(legacyMaterial.fabric_id, text(metadata.fabricId));
  if (!fabricReference) continue;
  const fabric = legacyFabricKeys.get(fabricReference);
  let variantId = fabric ? variantByLegacyKey.get(identity(fabric, 'fabric')) ?? variantByLegacyKey.get(String(fabric.id)) : undefined;
  let relationshipSource = 'v1-fabric-row';
  if (!fabric) {
    const exactMaterials = materials.filter((row) => normalize(row.name) === normalize(legacyMaterial.material_name));
    if (exactMaterials.length === 1) {
      const exactVariants = variants.filter((row) => row.material_id === exactMaterials[0].id);
      if (exactVariants.length === 1) {
        variantId = String(exactVariants[0].id);
        relationshipSource = 'exact-canonical-name-match-for-v1-material-metadata';
      }
    }
  }
  const garmentId = projectByLegacyId.get(String(legacyMaterial.project_id));
  if (!variantId || !garmentId) {
    manualReview.push(`Material link ${identity(legacyMaterial, 'material-link')} could not map Fabric Vault reference ${fabricReference} and material name ${text(legacyMaterial.material_name, 'unnamed')} to exactly one V2 fabric and garment.`);
    relationshipResults.push({ action: 'manual-review', fabricReference, legacyId: identity(legacyMaterial, 'material-link'), reason: 'fabric or garment mapping unavailable' });
    continue;
  }
  const role = canonicalRole(legacyMaterial.role);
  if (!role) {
    relationshipResults.push({ action: 'manual-review', legacyId: identity(legacyMaterial, 'material-link'), reason: `unsupported or missing role: ${text(legacyMaterial.role, 'none')}` });
    continue;
  }
  const legacyId = identity(legacyMaterial, 'material-link');
  const expectedId = await stableUuid(`${studioId}:garment_materials:v1:${legacyId}`);
  const existing = garmentMaterials.find((row) => row.id === expectedId)
    ?? garmentMaterials.find((row) => row.garment_id === garmentId && row.variant_id === variantId && normalize(row.role) === normalize(role));
  const requiredQuantity = nonnegative(legacyMaterial.yardage_needed) ?? 0;
  const reservedQuantity = Math.min(requiredQuantity, nonnegative(legacyMaterial.yardage_reserved) ?? 0);
  const desired: Row = {
    created_at: legacyMaterial.created_at ?? startedAt, garment_id: garmentId, id: existing?.id ?? expectedId,
    placement: null, required_quantity: requiredQuantity, reserved_quantity: reservedQuantity, role,
    status: relationshipStatus(legacyMaterial.status), studio_id: studioId, unit: 'yd',
    updated_at: legacyMaterial.updated_at ?? startedAt, variant_id: variantId,
  };
  const result: Action = existing ? 'skip' : 'create';
  bump('garment_materials', result);
  if (!existing) {
    pendingRelationshipRows.push({
      id: desired.id,
      garmentId: desired.garment_id,
      variantId: desired.variant_id,
      role: desired.role,
      requiredQuantity: desired.required_quantity,
      reservedQuantity: desired.reserved_quantity,
      unit: desired.unit,
      status: desired.status,
      createdAt: desired.created_at,
      updatedAt: desired.updated_at,
    });
  }
  if (nullableText(legacyMaterial.notes)) unmappedFields.add(`materials.notes (${legacyId})`);
  relationshipResults.push({ action: result, canonicalGarmentId: garmentId, canonicalVariantId: variantId, legacyId, role, source: relationshipSource });
}

let trustedRelationshipResult: Row | null = null;
if (!dryRun && pendingRelationshipRows.length) {
  const response = await target.schema('ml_private').rpc('apply_trusted_v1_fabric_relationships', {
    p_confirmation: 'read-v1-write-beta-no-media',
    p_relationships: pendingRelationshipRows,
    p_studio_id: studioId,
  });
  if (response.error) fail(`Trusted garment/material recreation: ${response.error.message}`);
  trustedRelationshipResult = objectValue(response.data);
}

if (!dryRun) {
  const response = await target.schema('ml_private').rpc('detach_trusted_v1_fabric_media_links', {
    p_confirmation: 'detach-v1-fabric-links-preserve-assets',
    p_studio_id: studioId,
  });
  if (response.error) fail(`Trusted V1 fabric media cleanup: ${response.error.message}`);
  trustedMediaDetachResult = objectValue(response.data);
}

const finalMediaCount = dryRun ? mediaLinks.length : await countTarget('material_variant_media');
const supplierNames = [...new Set([...fabrics.map((row) => text(row.supplier)).filter(Boolean), ...suppliers.map((row) => text(row.name)).filter(Boolean)])];
const potentialSupplierDuplicates = supplierNames.map((name) => ({ name, fingerprint: supplierFingerprint(name) }))
  .flatMap((left, index, values) => values.slice(index + 1).filter((right) => left.fingerprint === right.fingerprint || editDistance(left.fingerprint, right.fingerprint) <= 3).map((right) => [left.name, right.name]))
  .map((names) => [...new Set(names)]);
const report = {
  completed: errors.length === 0,
  completedAt: new Date().toISOString(),
  counts,
  conflicts,
  dryRun,
  duplicateV1Fabrics: duplicateGroups,
  errors,
  fabricResults,
  fields: {
    mapping: {
      'fabrics.name': 'materials.name', 'fabrics.fabric_type': 'materials.category', 'fabrics.fiber_content': 'materials.composition',
      'fabrics.archive_status': 'materials.status + material_variants.status', 'fabrics.primary_color': 'material_variants.color_name',
      'fabrics.metadata.primaryColorHex': 'material_variants.color_hex', 'fabrics.width_inches': 'material_variants.width + width_unit=in',
      'fabrics.metadata.weightGsm': 'material_variants.weight_gsm', 'fabrics technical/story/storage fields': 'material_variant_profiles explicit columns',
      'fabrics.yardage_total': 'inventory_entries deterministic receive entry', 'fabrics.supplier + cost_per_yard': 'suppliers + supplier_items',
      'materials project/fabric link': 'garment_materials', 'fabrics.image_path': 'report only; no V2 media record or Storage operation',
    },
    unmapped: [...unmappedFields].sort(),
  },
  imagePolicy: {
    assetsDeleted: 0, bytesCopied: 0, filesDownloaded: 0, linksAfterRun: finalMediaCount,
    note: 'This recreation copies no image bytes and creates no media records. Links explicitly tagged by the earlier V1 visual import are detached; their private assets and Storage objects remain preserved. Genuine V2 uploads are untouched.',
  },
  imageReferences,
  manualReview,
  relationshipResults,
  trustedMediaDetachResult,
  trustedRelationshipResult,
  source: { fabrics: fabrics.length, materialLinks: legacyMaterials.length, projectRef: V1_REF },
  summary: {
    alreadyExistingV2Matches: fabricResults.filter((row) => row.action === 'skip' || row.action === 'update').length,
    garmentRelationshipsMappable: relationshipResults.filter((row) => row.action !== 'manual-review').length,
    garmentRelationshipsRequiringReview: relationshipResults.filter((row) => row.action === 'manual-review').length,
    potentialDuplicateSupplierGroups: potentialSupplierDuplicates,
    potentialDuplicateV1Fabrics: duplicateGroups.length,
    readyToCreate: counts.materials?.created ?? 0,
    suppliersMatched: supplierResults.filter((row) => row.action === 'skip' || row.action === 'update').length,
    suppliersRequiringCreation: counts.suppliers?.created ?? 0,
    totalV1Fabrics: fabrics.length,
  },
  supplierResults,
  target: { projectRef: BETA_REF, studioId },
};
const defaultPath = dryRun
  ? 'docs/implementation/evidence/wp11/v1-fabric-recreation-dry-run.json'
  : 'docs/implementation/evidence/wp11/v1-fabric-recreation-final.json';
const reportPath = resolve(process.env.ML_V1_FABRIC_RECREATION_REPORT_PATH ?? defaultPath);
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`V1_FABRIC_RECREATION_REPORT=${reportPath}\n`);
if (errors.length) process.exitCode = 1;

async function ensureOpeningInventory(fabric: Row, legacyId: string, variantId: string): Promise<Action> {
  const quantity = nonnegative(fabric.yardage_total);
  if (quantity === null || quantity === 0) return 'skip';
  const expectedId = await stableUuid(`${studioId}:inventory_entries:v1-opening:${legacyId}`);
  const existing = inventoryEntries.find((row) => row.id === expectedId);
  if (existing) return 'skip';
  const variantRows = inventoryEntries.filter((row) => row.variant_id === variantId);
  if (variantRows.length) {
    const balance = inventoryTotal(variantRows);
    if (Math.abs(balance - quantity) > 0.0001) conflicts.push({ canonicalId: variantId, field: 'inventory balance', legacyId, v1: quantity, v2: balance });
    bump('inventory_entries', 'skip');
    return 'skip';
  }
  return createOrFill('inventory_entries', undefined, {
    actor_id: ownerUserId, created_at: fabric.created_at ?? startedAt, entry_type: 'receive', id: expectedId,
    note: `V1 opening balance recreation (${legacyId})`, occurred_at: fabric.created_at ?? startedAt,
    quantity, studio_id: studioId, unit: 'yd', variant_id: variantId,
  }, legacyId);
}

async function ensureSupplier(fabric: Row, legacyId: string, variantId: string): Promise<Action> {
  const supplierName = nullableText(fabric.supplier);
  const unitCost = nonnegative(fabric.cost_per_yard);
  if (!supplierName) {
    if (unitCost !== null) manualReview.push(`Fabric ${legacyId} has a cost (${unitCost}) but no supplier; no supplier item was invented.`);
    return 'skip';
  }
  const normalizedName = normalize(supplierName);
  const matches = suppliers.filter((row) => normalize(row.name) === normalizedName || supplierDomain(row.website) && supplierDomain(row.website) === supplierDomain(objectValue(fabric.metadata).supplierUrl));
  const unique = uniqueRows(matches);
  if (unique.length > 1) {
    manualReview.push(`Supplier ${supplierName} for fabric ${legacyId} has multiple canonical matches.`);
    return 'manual-review';
  }
  const supplierId = unique[0]?.id ? String(unique[0].id) : await stableUuid(`${studioId}:suppliers:v1:${normalizedName}`);
  const supplierResult = await createOrFill('suppliers', unique[0], {
    created_at: fabric.created_at ?? startedAt, id: supplierId, name: supplierName, status: 'active', studio_id: studioId,
    supplier_type: 'material', updated_at: fabric.updated_at ?? startedAt, website: nullableText(objectValue(fabric.metadata).supplierUrl),
  }, legacyId);
  if (!unique[0] && !dryRun) suppliers.push({ id: supplierId, name: supplierName, website: nullableText(objectValue(fabric.metadata).supplierUrl) });
  const expectedItemId = await stableUuid(`${studioId}:supplier_items:v1-fabric:${legacyId}`);
  const existingItem = supplierItems.find((row) => row.id === expectedItemId)
    ?? supplierItems.find((row) => row.supplier_id === supplierId && row.material_variant_id === variantId);
  const itemResult = await createOrFill('supplier_items', existingItem, {
    created_at: fabric.created_at ?? startedAt, currency: 'USD', id: existingItem?.id ?? expectedItemId,
    is_preferred: true, item_type: 'material_variant', material_variant_id: variantId, purchase_unit: 'yd',
    sku: nullableText(objectValue(fabric.metadata).supplierSku), studio_id: studioId, supplier_id: supplierId,
    unit_cost: unitCost ?? 0, updated_at: fabric.updated_at ?? startedAt,
  }, legacyId);
  supplierResults.push({ action: mergeAction([supplierResult, itemResult]), canonicalSupplierId: supplierId, legacyFabricId: legacyId, name: supplierName });
  return mergeAction([supplierResult, itemResult]);
}

async function createOrFill(table: string, existing: Row | undefined, desired: Row, legacyId: string): Promise<Action> {
  if (!existing) {
    if (!dryRun) {
      const response = await target.schema('ml_private').from(table).insert(desired);
      if (response.error) fail(`${table}:${desired.id}: ${response.error.message}`);
    }
    bump(table, 'create');
    return 'create';
  }
  const patch: Row = {};
  for (const [field, v1] of Object.entries(desired)) {
    if (['id', 'studio_id', 'created_at', 'updated_at', 'revision'].includes(field) || empty(v1)) continue;
    const v2 = existing[field];
    if (empty(v2)) patch[field] = v1;
    else if (!equivalent(field, v1, v2)) conflicts.push({ canonicalId: String(existing.id), field, legacyId, v1, v2 });
  }
  if (!Object.keys(patch).length) {
    bump(table, 'skip');
    return 'skip';
  }
  patch.updated_at = startedAt;
  patch.revision = Number(existing.revision ?? 1) + 1;
  if (!dryRun) {
    const response = await target.schema('ml_private').from(table).update(patch).eq('studio_id', studioId).eq('id', String(existing.id));
    if (response.error) fail(`${table}:${existing.id}: ${response.error.message}`);
  }
  bump(table, 'update');
  return 'update';
}

async function selectSource(table: string) {
  const response = await source.from(table).select('*').eq('user_id', sourceOwnerId).order('id');
  if (response.error) fail(`V1 ${table}: ${response.error.message}`);
  return (response.data ?? []) as Row[];
}
async function selectTarget(table: string) {
  const response = await target.schema('ml_private').from(table).select('*').eq('studio_id', studioId).order('id');
  if (response.error) fail(`V2 ${table}: ${response.error.message}`);
  return (response.data ?? []) as Row[];
}
async function countTarget(table: string) {
  const response = await target.schema('ml_private').from(table).select('id', { count: 'exact', head: true }).eq('studio_id', studioId);
  if (response.error) fail(`V2 ${table} count: ${response.error.message}`);
  return response.count ?? 0;
}
function groupedDuplicates(rows: Row[], key: (row: Row) => string) { const groups = new Map<string, Row[]>(); for (const row of rows) groups.set(key(row), [...(groups.get(key(row)) ?? []), row]); return [...groups.entries()].filter(([, values]) => values.length > 1).map(([matchKey, values]) => ({ matchKey, records: values.map((row) => ({ id: row.id, clientId: row.client_id, name: row.name })) })); }
function identity(row: Row, fallback: string) { return text(row.client_id, text(row.id, fallback)); }
function objectValue(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : []; }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function nullableText(value: unknown) { const valueText = text(value); return valueText || null; }
function normalize(value: unknown) { return text(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function nonnegative(value: unknown) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; }
function validHex(value: unknown) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : null; }
function empty(value: unknown) { return value === null || value === undefined || value === '' || Array.isArray(value) && value.length === 0; }
function equivalent(field: string, left: unknown, right: unknown) { if (JSON.stringify(left) === JSON.stringify(right)) return true; if (typeof left === 'number' && typeof right !== 'object') return Math.abs(Number(right) - left) < 0.0001; if (['role', 'status', 'currency', 'unit', 'width_unit'].includes(field)) return normalize(left) === normalize(right); return false; }
function uniqueRows(rows: Row[]) { return [...new Map(rows.map((row) => [String(row.id), row])).values()]; }
function canonicalStatus(value: unknown) { return normalize(value) === 'archived' ? 'archived' : 'active'; }
function canonicalRole(value: unknown) { const role = normalize(value); if (role === 'shell fabric' || role === 'shell') return 'shell'; if (role === 'contrast fabric' || role === 'contrast') return 'contrast'; if (role === 'lining') return 'lining'; if (role === 'trim') return 'trim'; if (role === 'pocketing') return 'pocketing'; if (role === 'binding') return 'binding'; if (role === 'interfacing') return 'interfacing'; return null; }
function relationshipStatus(value: unknown) { const status = normalize(value); if (status === 'reserved') return 'reserved'; if (status === 'cut' || status === 'issued') return 'issued'; if (status === 'used' || status === 'consumed') return 'consumed'; if (status === 'released') return 'released'; return 'planned'; }
function inventoryTotal(entries: Row[]) { return entries.reduce((total, entry) => total + (['receive', 'return', 'adjust'].includes(String(entry.entry_type)) ? 1 : -1) * Number(entry.quantity ?? 0), 0); }
function supplierDomain(value: unknown) { const raw = text(value); if (!raw) return ''; try { return new URL(raw.includes('://') ? raw : `https://${raw}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }
function supplierFingerprint(value: string) { return normalize(value).replace(/\bfrabric\b/g, 'fabric').replace(/\bfabrics\b/g, 'fabric').replace(/\bwarehouse\b/g, 'wholesale'); }
function editDistance(left: string, right: string) { const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]); for (let column = 1; column <= right.length; column += 1) rows[0][column] = column; for (let row = 1; row <= left.length; row += 1) for (let column = 1; column <= right.length; column += 1) rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1)); return rows[left.length][right.length]; }
function mergeAction(actions: Action[]): Action { if (actions.includes('manual-review')) return 'manual-review'; if (actions.includes('create')) return 'create'; if (actions.includes('update')) return 'update'; return 'skip'; }
function bump(table: string, action: 'create' | 'update' | 'skip') { const count = counts[table] ?? { created: 0, skipped: 0, updated: 0 }; count[action === 'create' ? 'created' : action === 'update' ? 'updated' : 'skipped'] += 1; counts[table] = count; }
function required(name: string) { const value = process.env[name]?.trim(); if (!value) fail(`Missing ${name}.`); return value; }
function fail(message: string): never { errors.push(message); throw new Error(message); }
