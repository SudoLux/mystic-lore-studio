import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import JSZip from 'jszip';
import {
  canonicalCodecRegistry,
  canonicalValueChecksum,
  encodeCanonicalMigrationRecord,
  materializeMutableRows,
} from '../src/domains/persistence/index.ts';
import type { CanonicalWorkspaceState } from '../src/domains/workspace/index.ts';

const actorColumns = new Set([
  'actor_id', 'approved_by', 'applied_by', 'assignee_id', 'created_by', 'decided_by',
  'inspected_by', 'owner_id', 'published_by', 'released_by', 'requested_by', 'user_id',
]);

const mutableImportOrder = [
  'collections', 'suppliers', 'factories', 'garments', 'design_briefs',
  'media_assets', 'media_derivatives', 'inspiration_boards', 'inspiration_items',
  'garment_media', 'design_annotations', 'materials', 'material_variants',
  'inventory_entries', 'components', 'component_variants', 'supplier_items',
  'garment_materials', 'garment_components', 'technical_templates', 'technical_specs',
  'technical_flats', 'flat_annotations', 'technical_files', 'pom_points',
  'measurement_sets', 'measurement_values', 'grade_rules', 'grade_rule_values',
  'bom_items', 'construction_sections', 'construction_steps', 'construction_details',
  'sample_rounds', 'sample_round_media', 'fit_sessions', 'fit_session_media',
  'fit_measurements', 'fit_issues', 'tasks', 'fit_issue_promotions', 'cost_sheets',
  'cost_items', 'production_orders', 'production_milestones', 'qc_templates',
  'qc_template_checks', 'qc_inspections', 'qc_results', 'calendar_events',
  'editorial_collections', 'editorial_collection_garments', 'editorial_scenes',
  'editorial_blocks', 'editorial_assets', 'portfolio_profiles', 'portfolio_projects',
  'portfolio_project_assets', 'portfolio_editorials', 'portfolio_editorial_scenes',
  'portfolio_editorial_assets', 'portfolio_technical_excerpts', 'ai_jobs', 'ai_job_input_refs',
];

const protectedImportOrder = [
  'garment_versions', 'entity_revisions', 'validation_runs', 'validation_waivers',
  'template_applications', 'tech_pack_exports', 'restore_operations', 'qc_waivers',
  'editorial_exports', 'ai_artifacts', 'ai_artifact_acceptances', 'change_events',
  'ai_acceptance_commands',
];

const forbiddenProjectRef = 'jsjhqnmlgceunlxgenkg';
const bundlePath = process.argv[2] ? resolve(process.argv[2]) : '';
const betaUrl = required('ML_BETA_SUPABASE_URL');
const serviceKey = required('ML_BETA_SERVICE_ROLE_KEY');
const projectRef = required('ML_BETA_PROJECT_REF');
const configuredOwnerUserId = process.env.ML_BETA_OWNER_USER_ID?.trim() ?? '';
const configuredOwnerEmail = process.env.ML_BETA_OWNER_EMAIL?.trim().toLowerCase() ?? '';

if (!bundlePath) fail('Usage: npm run beta:import-device -- /absolute/path/to/recovery.mlstudio.zip');
if (process.env.ML_BETA_CONFIRM_ISOLATED !== 'true') fail('Set ML_BETA_CONFIRM_ISOLATED=true after confirming this is a dedicated disposable beta project.');
if (projectRef === forbiddenProjectRef || betaUrl.includes(forbiddenProjectRef)) fail('The configured production project is read-only and cannot be a beta import target.');
if (!betaUrl.includes(projectRef) && process.env.ML_BETA_ALLOW_LOCAL !== 'true') fail('ML_BETA_PROJECT_REF does not match the Supabase URL.');

const zip = await JSZip.loadAsync(await readFile(bundlePath));
const workspaceFile = zip.file('workspace.json');
const manifestFile = zip.file('manifest.json');
if (!workspaceFile || !manifestFile) fail('The recovery bundle is missing workspace.json or manifest.json.');
const workspaceEnvelope = JSON.parse(await workspaceFile.async('text')) as {
  checksum: string;
  format: string;
  state: CanonicalWorkspaceState;
};
const mediaManifest = JSON.parse(await manifestFile.async('text')) as {
  format: string;
  media: Array<{ checksum: string; id: string; mimeType: string; path: string; storagePath: string }>;
  studioId: string;
  workspaceChecksum: string;
};
if (workspaceEnvelope.format !== 'ml-canonical-recovery-v2' || mediaManifest.format !== 'ml-canonical-media-manifest-v1') fail('Unsupported recovery bundle format.');
if (workspaceEnvelope.state.studioId !== mediaManifest.studioId) fail('Workspace and media manifest Studio IDs differ.');
const sourceChecksum = await canonicalValueChecksum(workspaceEnvelope.state);
if (sourceChecksum !== workspaceEnvelope.checksum || sourceChecksum !== mediaManifest.workspaceChecksum) fail('Recovery workspace checksum verification failed.');

const admin = createClient(betaUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const owner = configuredOwnerUserId
  ? await admin.auth.admin.getUserById(configuredOwnerUserId)
  : await findOwnerByEmail(configuredOwnerEmail);
if (owner.error || !owner.data.user) fail(`The beta owner user is unavailable: ${owner.error?.message ?? 'unknown user'}`);
const ownerUserId = owner.data.user.id;
const columns = await loadColumnManifest(betaUrl, serviceKey);
const state = workspaceEnvelope.state;
const startedAt = new Date().toISOString();
const existingStudio = await admin.schema('ml_private').from('studios').select('*').eq('id', state.studioId).maybeSingle();
if (existingStudio.error) fail(existingStudio.error.message);
if (!existingStudio.data) {
  const created = await admin.schema('ml_private').from('studios').insert({
    id: state.studioId,
    name: process.env.ML_BETA_STUDIO_NAME ?? 'Mystic Lore Isolated Beta',
    owner_user_id: ownerUserId,
    slug: process.env.ML_BETA_STUDIO_SLUG ?? `mystic-lore-beta-${state.studioId.slice(0, 8)}`,
  });
  if (created.error) fail(`Could not create the beta Studio: ${created.error.message}`);
} else if (existingStudio.data.owner_user_id !== ownerUserId) {
  fail('The recovery Studio ID already belongs to a different beta owner.');
}

const settings = await admin.schema('ml_private').from('studio_settings').select('version_policy').eq('studio_id', state.studioId).single();
if (settings.error) fail(settings.error.message);
const priorPolicy = objectValue(settings.data.version_policy);
const priorMode = priorPolicy.canonicalPersistence ?? priorPolicy.canonical_persistence ?? 'local-recovery';
if (priorMode === 'cloud') fail('The beta Studio is already cloud-authoritative. Device import is no longer a valid rollback path.');
const localPolicy = await admin.schema('ml_private').from('studio_settings').update({
  version_policy: { ...priorPolicy, canonicalPersistence: 'local-recovery' },
}).eq('studio_id', state.studioId);
if (localPolicy.error) fail(localPolicy.error.message);

let mediaInserted = 0;
let mediaUnchanged = 0;
for (const item of mediaManifest.media) {
  const file = zip.file(item.path);
  if (!file) fail(`Recovery bundle is missing ${item.path}.`);
  const bytes = await file.async('uint8array');
  if (sha256(bytes) !== item.checksum) fail(`Media checksum failed for ${item.id}.`);
  const upload = await admin.storage.from('studio-assets').upload(item.storagePath, bytes, {
    cacheControl: '31536000', contentType: item.mimeType, upsert: false,
  });
  if (!upload.error) {
    mediaInserted += 1;
  } else if (/already exists|duplicate/i.test(upload.error.message)) {
    const existing = await admin.storage.from('studio-assets').download(item.storagePath);
    if (existing.error || !existing.data || sha256(new Uint8Array(await existing.data.arrayBuffer())) !== item.checksum) {
      fail(`An existing beta Storage object differs at ${item.storagePath}.`);
    }
    mediaUnchanged += 1;
  } else {
    fail(`Could not upload ${item.storagePath}: ${upload.error.message}`);
  }
}

const mutableRows = groupMutableRows(state, columns, ownerUserId);
const rowEvidence: Record<string, { inserted: number; unchanged: number }> = {};
for (const table of mutableImportOrder) {
  if (table === 'garments') {
    await importRows(table, (mutableRows[table] ?? []).map((row) => without(row, 'current_version_id')), false);
    await importGarmentVersions();
    continue;
  }
  if (table === 'technical_specs') {
    await importRows(table, (mutableRows[table] ?? []).map((row) => without(row, 'release_validation_run_id')), false);
    continue;
  }
  await importRows(table, mutableRows[table] ?? [], false);
}

for (const table of protectedImportOrder) {
  if (table === 'garment_versions') continue;
  const entry = canonicalCodecRegistry.find((candidate) => candidate.table === table);
  if (!entry?.stateKey) continue;
  const rows = (state[entry.stateKey] as unknown[]).map((record) => prepareRow(
    table,
    encodeCanonicalMigrationRecord(entry, record as Record<string, unknown>),
    columns,
    ownerUserId,
  ));
  await importRows(table, sortProtectedRows(table, rows), true);
}

const finalize = await admin.schema('ml_private').rpc('finalize_trusted_device_import', {
  p_confirmation: 'isolated-beta-device-import-v1',
  p_garment_pins: state.garments.map((garment) => ({
    currentVersionId: state.garmentVersions.filter((version) => version.garmentId === garment.id).sort((a, b) => b.versionNo - a.versionNo)[0]?.id ?? null,
    id: garment.id,
    revision: garment.revision,
    updatedAt: garment.updatedAt,
  })),
  p_spec_pins: state.technicalSpecs.map((spec) => ({
    id: spec.id,
    releaseValidationRunId: spec.releaseValidationRunId,
    revision: spec.revision,
    updatedAt: spec.updatedAt,
  })),
  p_studio_id: state.studioId,
});
if (finalize.error) fail(`Could not finalize circular source pins: ${finalize.error.message}`);

const shadowPolicy = await admin.schema('ml_private').from('studio_settings').update({
  version_policy: { ...priorPolicy, canonicalPersistence: 'shadow', deviceImportChecksum: sourceChecksum },
}).eq('studio_id', state.studioId);
if (shadowPolicy.error) fail(shadowPolicy.error.message);

const report = {
  completedAt: new Date().toISOString(),
  format: 'ml-canonical-beta-device-import-report-v1',
  media: { inserted: mediaInserted, unchanged: mediaUnchanged, total: mediaManifest.media.length },
  mode: { after: 'shadow', before: priorMode },
  projectRef,
  rows: rowEvidence,
  source: { bundlePath, checksum: sourceChecksum, studioId: state.studioId },
  startedAt,
  warnings: ['Actor-owned beta evidence was mapped to the configured beta owner while source IDs and checksums were preserved.'],
};
const reportPath = `${bundlePath}.import-report.json`;
await writeFile(reportPath, JSON.stringify(report, null, 2));
process.stdout.write(`BETA_DEVICE_IMPORT_REPORT=${reportPath}\n`);

async function importGarmentVersions() {
  const entry = canonicalCodecRegistry.find((candidate) => candidate.table === 'garment_versions')!;
  const rows = state.garmentVersions.map((record) => prepareRow(
    'garment_versions', encodeCanonicalMigrationRecord(entry, record as unknown as Record<string, unknown>), columns, ownerUserId,
  )).sort((a, b) => Number(a.version_no) - Number(b.version_no));
  await importRows('garment_versions', rows, true);
}

async function importRows(table: string, rows: Record<string, unknown>[], immutable: boolean) {
  if (!rows.length) return;
  const evidence = rowEvidence[table] ?? { inserted: 0, unchanged: 0 };
  for (const row of rows) {
    const id = String(row.id ?? '');
    if (!id) fail(`Trusted import row for ${table} has no stable ID.`);
    const existing = await admin.schema('ml_private').from(table).select('*').eq('id', id).maybeSingle();
    if (existing.error) fail(`${table}:${id}: ${existing.error.message}`);
    if (existing.data) {
      if (!rowMatches(existing.data, row)) fail(`${table}:${id} differs from an interrupted/retried beta import.`);
      evidence.unchanged += 1;
      continue;
    }
    const inserted = await admin.schema('ml_private').from(table).insert(row);
    if (inserted.error) fail(`${immutable ? 'immutable ' : ''}${table}:${id}: ${inserted.error.message}`);
    evidence.inserted += 1;
  }
  rowEvidence[table] = evidence;
}

function groupMutableRows(source: CanonicalWorkspaceState, columnManifest: Map<string, Set<string>>, actorId: string) {
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const { codec, record } of materializeMutableRows(source).values()) {
    (grouped[codec.table] ??= []).push(prepareRow(
      codec.table, encodeCanonicalMigrationRecord(codec, record), columnManifest, actorId,
    ));
  }
  return grouped;
}

async function findOwnerByEmail(email: string) {
  if (!email) fail('Set ML_BETA_OWNER_EMAIL (recommended) or ML_BETA_OWNER_USER_ID.');
  const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (users.error) return { data: { user: null }, error: users.error };
  const user = users.data.users.find((candidate) => candidate.email?.toLowerCase() === email) ?? null;
  return { data: { user }, error: user ? null : { message: `No beta Auth user matches ${email}. Sign up in the beta app first.` } };
}

function prepareRow(table: string, input: Record<string, unknown>, columnManifest: Map<string, Set<string>>, actorId: string) {
  const allowed = columnManifest.get(table);
  if (!allowed) fail(`The beta OpenAPI schema does not expose ml_private.${table}.`);
  const row = Object.fromEntries(Object.entries(input).filter(([key]) => allowed!.has(key)));
  for (const column of actorColumns) if (allowed!.has(column) && row[column]) row[column] = actorId;
  if (table === 'media_assets') row.created_by = actorId;
  if (table === 'design_annotations') row.author_id = actorId;
  if (table === 'inventory_entries') row.actor_id = actorId;
  if (table === 'ai_jobs') row.requested_by = actorId;
  return row;
}

async function loadColumnManifest(url: string, key: string) {
  const response = await fetch(`${url.replace(/\/$/, '')}/rest/v1/`, { headers: {
    Accept: 'application/openapi+json',
    'Accept-Profile': 'ml_private',
    Authorization: `Bearer ${key}`,
    apikey: key,
  } });
  if (!response.ok) fail(`Could not load beta schema metadata (${response.status}).`);
  const openApi = await response.json() as { definitions?: Record<string, { properties?: Record<string, unknown> }> };
  return new Map(Object.entries(openApi.definitions ?? {}).map(([table, definition]) => [table, new Set(Object.keys(definition.properties ?? {}))]));
}

function sortProtectedRows(table: string, rows: Record<string, unknown>[]) {
  if (table === 'garment_versions') return rows.sort((a, b) => Number(a.version_no) - Number(b.version_no));
  return rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function without(row: Record<string, unknown>, key: string) {
  const { [key]: _omitted, ...rest } = row;
  return rest;
}

function rowMatches(existing: Record<string, unknown>, candidate: Record<string, unknown>) {
  return Object.entries(candidate).every(([key, value]) => stable(existing[key]) === stable(value));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${key}:${stable(item)}`).join(',')}}`;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toISOString();
  return JSON.stringify(value);
}

function sha256(value: Uint8Array) { return createHash('sha256').update(value).digest('hex'); }
function objectValue(value: unknown) { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function required(name: string) { const value = process.env[name]?.trim(); if (!value) fail(`${name} is required.`); return value; }
function fail(message: string): never { throw new Error(message); }
