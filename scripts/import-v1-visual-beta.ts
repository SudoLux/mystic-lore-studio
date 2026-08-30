import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { stableUuid } from '../src/domains/migration/stableIdentity.ts';

type Row = Record<string, unknown>;
type ReportCount = { inserted: number; unchanged: number };

const V1_REF = 'jsjhqnmlgceunlxgenkg';
const BETA_REF = 'iahrcupmyjnyyqszrmcx';
const dryRun = process.argv.includes('--dry-run');
const v1Url = required('ML_V1_SUPABASE_URL');
const v1Key = required('ML_V1_SERVICE_ROLE_KEY');
const v1OwnerId = required('ML_V1_OWNER_USER_ID');
const betaUrl = required('ML_BETA_SUPABASE_URL');
const betaKey = required('ML_BETA_SERVICE_ROLE_KEY');
const betaRef = required('ML_BETA_PROJECT_REF');
const studioId = required('ML_BETA_STUDIO_ID');

if (!v1Url.includes(V1_REF)) fail(`ML_V1_SUPABASE_URL must point to the read-only V1 project ${V1_REF}.`);
if (betaRef !== BETA_REF || !betaUrl.includes(BETA_REF)) fail(`The visual merge may target only isolated beta ${BETA_REF}.`);
if (process.env.ML_V1_VISUAL_IMPORT_CONFIRM !== 'read-v1-write-beta') fail('Set ML_V1_VISUAL_IMPORT_CONFIRM=read-v1-write-beta after checking both project references.');

const source = createClient(v1Url, v1Key, { auth: { autoRefreshToken: false, persistSession: false } });
const target = createClient(betaUrl, betaKey, { auth: { autoRefreshToken: false, persistSession: false } });
const startedAt = new Date().toISOString();
const counts: Record<string, ReportCount> = {};
const warnings: string[] = [];
const mappings: Array<{ canonicalId: string; legacyId: string; type: string }> = [];
const media: Array<{ assetId: string; checksum: string; destination: string; legacyId: string; role: string; source: string }> = [];

const [projects, fabrics, projectImages] = await Promise.all([
  selectV1('projects'), selectV1('fabrics'), selectV1('project_images'),
]);
if (projects.length !== 7 || fabrics.length !== 12 || projectImages.length !== 21) {
  warnings.push(`Expected the verified 7 projects, 12 fabrics, and 21 project images; found ${projects.length}, ${fabrics.length}, and ${projectImages.length}.`);
}

const studio = await target.schema('ml_private').from('studios').select('id,owner_user_id').eq('id', studioId).single();
if (studio.error || !studio.data) fail(`Beta Studio is unavailable: ${studio.error?.message ?? studioId}`);
const ownerUserId = String(studio.data.owner_user_id);
const settings = await target.schema('ml_private').from('studio_settings').select('version_policy').eq('studio_id', studioId).single();
if (settings.error) fail(settings.error.message);
const priorPolicy = objectValue(settings.data.version_policy);
const priorMode = String(priorPolicy.canonicalPersistence ?? priorPolicy.canonical_persistence ?? 'shadow');
const restoreMode = String(priorPolicy.visualImportPreviousMode ?? priorMode);

const existingGarments = await selectBeta('garments');
const existingMaterials = await selectBeta('materials');
const existingVariants = await selectBeta('material_variants');
const existingSuppliers = await selectBeta('suppliers');
const existingInventory = await selectBeta('inventory_entries');

if (!dryRun) await setMode('local-recovery', {
  visualImportPreviousMode: restoreMode,
  visualImportStartedAt: startedAt,
  visualImportState: 'running',
});
let completed = false;
let failure: string | null = null;
try {
  const garmentByLegacyProject = new Map<string, string>();
  for (const project of projects) {
    const legacyId = sourceIdentity(project, 'project');
    const expectedId = await stableUuid(`${studioId}:garments:project:${legacyId}`);
    const title = text(project.title, 'Untitled garment');
    const candidate = existingGarments.find((row) => row.id === expectedId)
      ?? uniqueMatch(existingGarments, (row) => normalize(row.title) === normalize(title), `garment “${title}”`);
    let garmentId = candidate ? String(candidate.id) : expectedId;
    if (!candidate) {
      await insertIfMissing('garments', {
        created_at: project.created_at ?? startedAt,
        garment_code: `MLS-${garmentId.slice(0, 8).toUpperCase()}`,
        garment_type: project.garment_type ?? null,
        id: garmentId,
        phase: canonicalPhase(text(project.workflow_phase, 'Concept')),
        status: canonicalStatus(text(project.status, 'Active')),
        studio_id: studioId,
        title,
        updated_at: project.updated_at ?? startedAt,
      });
    }
    garmentByLegacyProject.set(String(project.id), garmentId);
    mappings.push({ canonicalId: garmentId, legacyId, type: 'garment' });
  }

  const variantByLegacyFabric = new Map<string, string>();
  for (const fabric of fabrics) {
    const legacyId = sourceIdentity(fabric, 'fabric');
    const expectedMaterialId = await stableUuid(`${studioId}:materials:fabric:${legacyId}`);
    const name = text(fabric.name, 'Untitled fabric');
    const material = existingMaterials.find((row) => row.id === expectedMaterialId)
      ?? uniqueMatch(existingMaterials, (row) => normalize(row.name) === normalize(name), `material “${name}”`);
    const materialId = material ? String(material.id) : expectedMaterialId;
    if (!material) await insertIfMissing('materials', {
      category: fabric.fabric_type ?? 'Fabric', composition: fabric.fiber_content ?? null,
      created_at: fabric.created_at ?? startedAt, id: materialId,
      material_code: `MAT-${materialId.slice(0, 8).toUpperCase()}`, name,
      status: fabric.archive_status === 'Archived' ? 'archived' : 'active', studio_id: studioId,
      updated_at: fabric.updated_at ?? startedAt,
    });
    const expectedVariantId = await stableUuid(`${studioId}:material_variants:fabric-variant:${legacyId}`);
    const variant = existingVariants.find((row) => row.id === expectedVariantId)
      ?? uniqueMatch(existingVariants, (row) => row.material_id === materialId, `variant for “${name}”`);
    const variantId = variant ? String(variant.id) : expectedVariantId;
    if (!variant) await insertIfMissing('material_variants', {
      color_hex: validHex(metadata(fabric).primaryColorHex), color_name: fabric.primary_color ?? null,
      created_at: fabric.created_at ?? startedAt, id: variantId, material_id: materialId,
      sku: `LEGACY-${variantId.slice(0, 12).toUpperCase()}`,
      status: fabric.archive_status === 'Archived' ? 'archived' : 'active', studio_id: studioId,
      updated_at: fabric.updated_at ?? startedAt, weight_gsm: numberOrNull(metadata(fabric).weightGsm),
      width: numberOrNull(fabric.width_inches), width_unit: numberOrNull(fabric.width_inches) === null ? null : 'in',
    });
    variantByLegacyFabric.set(String(fabric.id), variantId);
    mappings.push({ canonicalId: variantId, legacyId, type: 'material_variant' });

    const openingQuantity = numberOrNull(fabric.yardage_total);
    if (openingQuantity && openingQuantity > 0) {
      const variantEntries = existingInventory.filter((row) => row.variant_id === variantId);
      const openingId = await stableUuid(`${studioId}:inventory_entries:v1-opening:${legacyId}`);
      const deterministicOpening = variantEntries.find((row) => row.id === openingId);
      if (deterministicOpening || variantEntries.length === 0) {
        await insertIfMissing('inventory_entries', {
          actor_id: ownerUserId, created_at: fabric.created_at ?? startedAt,
          entry_type: 'receive', id: openingId,
          note: `V1 opening balance recovery (${legacyId})`, occurred_at: fabric.created_at ?? startedAt,
          quantity: openingQuantity, studio_id: studioId, unit: 'yd', variant_id: variantId,
        });
        if (!deterministicOpening) existingInventory.push({
          entry_type: 'receive', id: openingId, quantity: openingQuantity, variant_id: variantId,
        });
      } else {
        const currentTotal = inventoryTotal(variantEntries);
        const message = Math.abs(currentTotal - openingQuantity) < 0.0001
          ? `Fabric ${legacyId} already has an equivalent ${currentTotal} yd canonical balance; no opening entry was duplicated.`
          : `Fabric ${legacyId} has ${currentTotal} yd in the V2 ledger versus ${openingQuantity} yd in V1; the append-only V2 ledger was preserved for review.`;
        warnings.push(message);
        bump('inventory_entries', false);
      }
    }

    await insertIfMissing('material_variant_profiles', {
      best_uses: strings(fabric.best_uses), bin_number: fabric.bin_number ?? null,
      care_notes: fabric.care_notes ?? null, country_of_origin: metadata(fabric).countryOfOrigin ?? null,
      created_at: fabric.created_at ?? startedAt, drape: fabric.drape ?? null,
      hand_feel: fabric.hand_feel ?? null, id: await stableUuid(`${studioId}:material_variant_profiles:v1:${legacyId}`),
      lore_note: fabric.lore_note ?? null, mood_tags: strings(fabric.mood_tags), opacity: fabric.opacity ?? null,
      private_notes: metadata(fabric).notes ?? null, purchase_date: fabric.purchase_date ?? null,
      rarity: fabric.rarity ?? null, secondary_colors: strings(fabric.secondary_colors), shelf: fabric.shelf ?? null,
      storage_location: fabric.storage_location ?? null, storage_status: fabric.storage_status ?? null,
      stretch: fabric.stretch ?? null, structure: fabric.structure ?? null, studio_id: studioId,
      texture: fabric.texture ?? null, updated_at: fabric.updated_at ?? startedAt, variant_id: variantId,
      weave_or_knit: fabric.weave_or_knit ?? null,
    });

    const supplierName = text(fabric.supplier, '');
    if (supplierName) {
      const normalizedSupplier = normalize(supplierName);
      const supplier = existingSuppliers.find((row) => normalize(row.name) === normalizedSupplier);
      const supplierId = supplier ? String(supplier.id) : await stableUuid(`${studioId}:suppliers:v1:${normalizedSupplier}`);
      if (!supplier) {
        await insertIfMissing('suppliers', {
          capabilities_json: {}, created_at: fabric.created_at ?? startedAt, id: supplierId,
          name: supplierName, status: 'active', studio_id: studioId, supplier_type: 'material',
          updated_at: fabric.updated_at ?? startedAt,
        });
        existingSuppliers.push({ id: supplierId, name: supplierName });
      }
      await insertIfMissing('supplier_items', {
        created_at: fabric.created_at ?? startedAt, currency: 'USD',
        id: await stableUuid(`${studioId}:supplier_items:v1-fabric:${legacyId}`), is_preferred: true,
        item_type: 'material_variant', material_variant_id: variantId, purchase_unit: 'yd',
        sku: `V1-${legacyId}`.slice(0, 200), studio_id: studioId, supplier_id: supplierId,
        unit_cost: Math.max(0, Number(fabric.cost_per_yard ?? 0)), updated_at: fabric.updated_at ?? startedAt,
      });
    } else if (numberOrNull(fabric.cost_per_yard) !== null) {
      warnings.push(`Fabric ${legacyId} has a cost but no supplier; the cost remains in the V1 recovery source until a supplier is chosen.`);
    }

    if (fabric.image_path) {
      const imageId = `fabric-image:${legacyId}`;
      const assetId = await copyAsset({
        height: numberOrNull(fabric.image_height), legacyId: imageId,
        mimeType: text(fabric.image_mime_type, 'image/jpeg'), name: text(fabric.image_filename, `${legacyId}.jpg`),
        role: 'swatch', sizeBytes: numberOrNull(fabric.image_size_bytes), sourcePath: String(fabric.image_path),
        width: numberOrNull(fabric.image_width),
      });
      await insertIfMissing('material_variant_media', {
        asset_id: assetId, created_at: fabric.created_at ?? startedAt,
        framing_json: framing(fabric, 'image_'), id: await stableUuid(`${studioId}:material_variant_media:v1:${legacyId}`),
        role: 'swatch', sort_order: 0, studio_id: studioId, updated_at: fabric.updated_at ?? startedAt,
        variant_id: variantId,
      });
    }
  }

  for (const image of projectImages) {
    const garmentId = garmentByLegacyProject.get(String(image.project_id));
    if (!garmentId) { warnings.push(`Project image ${sourceIdentity(image, 'project-image')} has no garment match.`); continue; }
    const legacyId = sourceIdentity(image, 'project-image');
    const role = imageRole(text(image.slot_type, 'gallery'));
    const assetId = await copyAsset({
      height: numberOrNull(image.height), legacyId, mimeType: text(image.mime_type, 'image/jpeg'),
      name: text(image.filename, `${legacyId}.jpg`), role, sizeBytes: numberOrNull(image.size_bytes),
      sourcePath: text(image.storage_path), width: numberOrNull(image.width),
    });
    await insertIfMissing('garment_media', {
      asset_id: assetId, created_at: image.created_at ?? startedAt,
      framing_json: framing(image), garment_id: garmentId,
      id: await stableUuid(`${studioId}:garment_media:v1:${legacyId}:${role}`), role,
      sort_order: Number(image.display_order ?? slotOrder(text(image.slot_type))), studio_id: studioId,
      updated_at: image.updated_at ?? startedAt,
    });
  }
  completed = true;
} catch (reason) {
  failure = reason instanceof Error ? reason.message : String(reason);
  warnings.push(`Import stopped safely: ${failure}`);
} finally {
  if (!dryRun) await restorePersistenceMode(restoreMode === 'cloud' ? 'shadow' : restoreMode);
}

const report = {
  completed, completedAt: new Date().toISOString(), counts, dryRun, failure,
  format: 'ml-v1-visual-beta-import-report-v1', mappings, media,
  source: { projectRef: V1_REF, projects: projects.length, fabrics: fabrics.length, projectImages: projectImages.length },
  target: { projectRef: BETA_REF, studioId }, warnings,
};
const reportPath = process.env.ML_V1_VISUAL_REPORT_PATH ?? `v1-visual-beta-import-${Date.now()}.json`;
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`V1_VISUAL_IMPORT_REPORT=${reportPath}\n`);
if (!completed) process.exitCode = 1;

async function copyAsset(input: { height: number | null; legacyId: string; mimeType: string; name: string; role: string; sizeBytes: number | null; sourcePath: string; width: number | null }) {
  if (!input.sourcePath) fail(`Media ${input.legacyId} has no V1 Storage path.`);
  const downloaded = await source.storage.from('project-images').download(input.sourcePath);
  if (downloaded.error || !downloaded.data) fail(`Could not read V1 media ${input.legacyId}: ${downloaded.error?.message ?? 'missing bytes'}`);
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer());
  const checksum = sha256(bytes);
  const existing = await target.schema('ml_private').from('media_assets').select('*').eq('studio_id', studioId).eq('checksum', checksum).maybeSingle();
  if (existing.error) fail(existing.error.message);
  const assetId = existing.data ? String(existing.data.id) : await stableUuid(`${studioId}:media_assets:checksum:${checksum}`);
  const destination = existing.data ? String(existing.data.storage_path) : `studios/${studioId}/assets/v1/${assetId}/${safeName(input.name)}`;
  if (!dryRun && !existing.data) {
    const upload = await target.storage.from('studio-assets').upload(destination, bytes, { cacheControl: '31536000', contentType: input.mimeType, upsert: false });
    if (upload.error && !/already exists|duplicate/i.test(upload.error.message)) fail(`Could not copy ${input.legacyId}: ${upload.error.message}`);
  }
  if (!dryRun) {
    const verify = await target.storage.from('studio-assets').download(destination);
    if (verify.error || !verify.data || sha256(new Uint8Array(await verify.data.arrayBuffer())) !== checksum) fail(`Destination checksum differs for ${input.legacyId}.`);
  }
  if (!dryRun && !existing.data) {
    await insertIfMissing('media_assets', {
      checksum, created_at: startedAt, created_by: ownerUserId, height: input.height, id: assetId,
      mime_type: input.mimeType, original_filename: input.name,
      rights_json: { legacyId: input.legacyId, migrationSource: 'mystic-lore-v1', source: 'private V1 Studio media' },
      size_bytes: bytes.byteLength, storage_path: destination, studio_id: studioId, updated_at: startedAt, width: input.width,
    });
  } else bump('media_assets', Boolean(dryRun && !existing.data));
  media.push({ assetId, checksum, destination, legacyId: input.legacyId, role: input.role, source: input.sourcePath });
  return assetId;
}

async function insertIfMissing(table: string, row: Row) {
  const found = await target.schema('ml_private').from(table).select('*').eq('id', String(row.id)).maybeSingle();
  if (found.error) fail(`${table}:${row.id}: ${found.error.message}`);
  if (found.data) {
    const differences = Object.entries(row).filter(([key, value]) =>
      !['created_at', 'updated_at', 'revision'].includes(key)
      && JSON.stringify(found.data?.[key]) !== JSON.stringify(value));
    if (differences.length) warnings.push(`${table}:${row.id} kept the existing V2 values for ${differences.map(([key]) => key).join(', ')}.`);
    bump(table, false);
    return;
  }
  if (dryRun) { bump(table, true); return; }
  const inserted = await target.schema('ml_private').from(table).insert(row);
  if (inserted.error) fail(`${table}:${row.id}: ${inserted.error.message}`);
  bump(table, true);
}

async function selectV1(table: string) {
  const response = await source.from(table).select('*').eq('user_id', v1OwnerId).order('id');
  if (response.error) fail(`V1 ${table}: ${response.error.message}`);
  return (response.data ?? []) as Row[];
}
async function selectBeta(table: string) {
  const response = await target.schema('ml_private').from(table).select('*').eq('studio_id', studioId).order('id');
  if (response.error) fail(`Beta ${table}: ${response.error.message}`);
  return (response.data ?? []) as Row[];
}
async function setMode(mode: string, extra: Row = {}) {
  const response = await target.schema('ml_private').from('studio_settings').update({
    version_policy: { ...priorPolicy, ...extra, canonicalPersistence: mode },
  }).eq('studio_id', studioId);
  if (response.error) fail(`Could not set beta mode to ${mode}: ${response.error.message}`);
}
async function restorePersistenceMode(mode: string) {
  const restored: Row = { ...priorPolicy, canonicalPersistence: mode };
  delete restored.visualImportPreviousMode;
  delete restored.visualImportStartedAt;
  delete restored.visualImportState;
  const response = await target.schema('ml_private').from('studio_settings').update({ version_policy: restored }).eq('studio_id', studioId);
  if (response.error) fail(`Could not restore beta mode to ${mode}: ${response.error.message}`);
}
function uniqueMatch(rows: Row[], predicate: (row: Row) => boolean, label: string) {
  const matches = rows.filter(predicate);
  if (matches.length > 1) fail(`Ambiguous canonical match for ${label}; no records were guessed.`);
  return matches[0];
}
function sourceIdentity(row: Row, type: string) { return text(row.client_id, text(row.id, type)); }
function metadata(row: Row) { return objectValue(row.metadata); }
function objectValue(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function strings(value: unknown) { return Array.isArray(value) ? value.map(String).filter(Boolean) : []; }
function text(value: unknown, fallback = '') { return typeof value === 'string' && value.trim() ? value.trim() : fallback; }
function normalize(value: unknown) { return text(value).toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function numberOrNull(value: unknown) { const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; }
function inventoryTotal(entries: Row[]) { return entries.reduce((total, entry) => total + (['receive', 'return', 'adjust'].includes(String(entry.entry_type)) ? 1 : -1) * Number(entry.quantity ?? 0), 0); }
function validHex(value: unknown) { return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : null; }
function canonicalPhase(value: string) { const phase = value.toLowerCase(); if (/production|final build/.test(phase)) return 'production'; if (/sample|fitting|revision/.test(phase)) return 'sampling'; if (/pattern|material/.test(phase)) return 'materials'; if (/lookbook|photo/.test(phase)) return 'story'; if (/technical/.test(phase)) return 'technical'; return /concept|research/.test(phase) ? 'brief' : 'design'; }
function canonicalStatus(value: string) { const status = value.toLowerCase(); if (status.includes('archiv')) return 'archived'; if (status.includes('pause') || status.includes('block')) return 'on_hold'; if (status.includes('complete')) return 'approved'; return status.includes('idea') ? 'draft' : 'active'; }
function imageRole(slot: string) { return slot === 'hero' ? 'hero' : slot.startsWith('editorial') ? 'editorial' : 'gallery'; }
function slotOrder(slot: string) { const value = Number(slot.split(':')[1] ?? 0); return Number.isFinite(value) ? value : 0; }
function framing(row: Row, prefix = '') { return { objectFit: row[`${prefix}fit`] ?? 'cover', objectPositionX: Number(row[`${prefix}position_x`] ?? 50), objectPositionY: Number(row[`${prefix}position_y`] ?? 50), zoom: Number(row[`${prefix}zoom`] ?? 1) }; }
function safeName(value: string) { return value.normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'v1-asset'; }
function sha256(value: Uint8Array) { return createHash('sha256').update(value).digest('hex'); }
function bump(table: string, inserted: boolean) { const count = counts[table] ?? { inserted: 0, unchanged: 0 }; if (inserted) count.inserted += 1; else count.unchanged += 1; counts[table] = count; }
function required(name: string) { const value = process.env[name]?.trim(); if (!value) fail(`Missing ${name}.`); return value; }
function fail(message: string): never { throw new Error(message); }
