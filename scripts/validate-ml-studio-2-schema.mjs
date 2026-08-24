import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const sha256 = (path) => createHash('sha256').update(read(path)).digest('hex');

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const legacyHashes = new Map([
  ['supabase/migrations/20260617010000_create_mystic_lore_schema.sql', 'a71494d04c90889f8fb1fde750ecb7ada28a5e83683d4b3a6f870f29f76cb28c'],
  ['supabase/migrations/20260621010000_add_cloud_sync_and_storage.sql', 'd89fe1268a14ca055d6945a7769bac17704e9fd1121c8c64a967f686ac30111c'],
  ['supabase/migrations/20260628010000_add_sync_tombstones.sql', 'f16aa6471636e5cc4e1edf7529f433728aedd97ee6a9b94a2527f159639dd36d'],
  ['supabase/migrations/20260707010000_add_portfolio_profile.sql', 'cc0b8e09c20f89a53ec8a49d9e984461119718c77ef2067d1fe2ea933e0e8098'],
  ['supabase/migrations/20260710010000_add_public_portfolio_publications.sql', 'c98f7d4e091fffb384ed2e4e9359b4a535900940a2a798df58168e592af6d690'],
  ['supabase/migrations/20260711010000_create_public_portfolio_snapshots.sql', 'fdcee4c79ccc960526d81ffe3a6d7189261465ea63fb30f0b63ccee02200401d'],
  ['tests/fixtures/legacy-studio-data-v5.json', '25c1980b4b0cdcfccb49c164816d84cf3768f9979f47cbed056aef76ef52e9c3'],
]);

for (const [path, expectedHash] of legacyHashes) {
  check(sha256(path) === expectedHash, `Legacy input changed unexpectedly: ${path}`);
}

const foundationPath = 'supabase/migrations/20260824051228_ml_studio_2_canonical_schema.sql';
const rlsPath = 'supabase/migrations/20260824051237_ml_studio_2_rls_and_publication_boundary.sql';
const storagePath = 'supabase/migrations/20260824051247_ml_studio_2_storage_policies.sql';
const bootstrapPath = 'supabase/migrations/20260824070629_enable_canonical_migration_bootstrap.sql';
const testPath = 'supabase/tests/ml_studio_2_rls_test.sql';
const foundation = read(foundationPath);
const rls = read(rlsPath);
const storage = read(storagePath);
const bootstrap = read(bootstrapPath);
const rlsTest = read(testPath);

const structurallyBalanced = (sql) => {
  let depth = 0;
  let state = 'normal';
  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];
    if (state === 'line-comment') {
      if (char === '\n') state = 'normal';
      continue;
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') {
        state = 'normal';
        index += 1;
      }
      continue;
    }
    if (state === 'single-quote') {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") state = 'normal';
      continue;
    }
    if (state === 'dollar-quote') {
      if (char === '$' && next === '$') {
        state = 'normal';
        index += 1;
      }
      continue;
    }
    if (char === '-' && next === '-') {
      state = 'line-comment';
      index += 1;
    } else if (char === '/' && next === '*') {
      state = 'block-comment';
      index += 1;
    } else if (char === "'") {
      state = 'single-quote';
    } else if (char === '$' && next === '$') {
      state = 'dollar-quote';
      index += 1;
    } else if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth < 0) return false;
    }
  }
  return depth === 0 && state === 'normal';
};

for (const [path, sql] of [
  [foundationPath, foundation],
  [rlsPath, rls],
  [storagePath, storage],
  [bootstrapPath, bootstrap],
  [testPath, rlsTest],
]) {
  check(structurallyBalanced(sql), `Unbalanced SQL delimiters in ${path}.`);
}

const expectedPrivateTables = [
  'profiles', 'studios', 'studio_members', 'studio_settings', 'collections',
  'garments', 'tags', 'garment_tags', 'design_briefs', 'inspiration_boards',
  'inspiration_items', 'media_assets', 'garment_media', 'media_derivatives',
  'design_annotations', 'materials', 'material_variants', 'inventory_entries',
  'garment_materials', 'components', 'component_variants', 'garment_components',
  'supplier_items', 'technical_specs', 'technical_flats', 'flat_annotations',
  'technical_files', 'tech_pack_exports', 'validation_runs', 'pom_points',
  'measurement_sets', 'measurement_values', 'grade_rules', 'grade_rule_values',
  'fit_measurements', 'bom_items', 'construction_sections', 'construction_steps',
  'construction_details', 'technical_templates', 'template_applications',
  'suppliers', 'factories', 'sample_rounds', 'fit_sessions', 'fit_issues',
  'cost_sheets', 'cost_items', 'production_orders', 'qc_results',
  'editorial_collections', 'editorial_scenes', 'editorial_blocks',
  'editorial_assets', 'portfolio_profiles', 'portfolio_projects',
  'portfolio_editorials', 'garment_versions', 'entity_revisions', 'change_events',
  'restore_operations', 'tasks', 'calendar_events', 'ai_jobs', 'ai_artifacts',
  'sync_tombstones',
].sort();

const actualPrivateTables = [...foundation.matchAll(/create table ml_private\.([a-z_]+)/g)]
  .map((match) => match[1])
  .sort();
const actualPublicTables = [...foundation.matchAll(/create table ml_public\.([a-z_]+)/g)]
  .map((match) => match[1])
  .sort();

check(
  JSON.stringify(actualPrivateTables) === JSON.stringify(expectedPrivateTables),
  'Canonical private table set does not match Product Bible pages 19-31.',
);
check(
  JSON.stringify(actualPublicTables) === JSON.stringify(['publication_assets', 'publications']),
  'Public schema must contain only publications and copied publication asset manifests.',
);

const tableBlock = (table) => {
  const match = foundation.match(
    new RegExp(`create table ml_private\\.${table} \\(([\\s\\S]*?)\\n\\);`),
  );
  return match?.[1] ?? '';
};

for (const table of expectedPrivateTables) {
  const block = tableBlock(table);
  check(block.length > 0, `Could not parse canonical table: ${table}`);
  check(/primary key/.test(block), `Canonical table lacks a primary key: ${table}`);
  if (!['profiles', 'studios'].includes(table)) {
    check(/\bstudio_id uuid\b/.test(block), `Tenant table lacks studio_id: ${table}`);
  }
  check(
    rls.includes(`'${table}'`) || rls.includes(`ml_private.${table}`),
    `Canonical table is missing from RLS coverage: ${table}`,
  );
}

const immutableOrJoinTables = new Set([
  'garment_tags', 'inventory_entries', 'garment_versions', 'tech_pack_exports',
  'validation_runs', 'template_applications', 'entity_revisions', 'change_events',
  'restore_operations',
]);
for (const table of expectedPrivateTables) {
  if (immutableOrJoinTables.has(table)) continue;
  const block = tableBlock(table);
  for (const column of ['created_at', 'updated_at', 'revision']) {
    check(block.includes(column), `Mutable table ${table} lacks ${column}.`);
  }
}

const allowedJsonbColumns = new Set([
  'version_policy', 'ai_policy', 'layout_json', 'position_json', 'rights_json',
  'framing_json', 'anchor_json', 'spec_json', 'scope_json', 'snapshot_json',
  'result_json', 'diagram_anchor_json', 'size_range_json', 'payload_json',
  'mapping_json', 'capabilities_json', 'model_profile_json', 'transition_json',
  'content_json', 'settings_json', 'usage_json', 'case_study_json', 'json_patch',
  'inverse_patch', 'input_refs_json', 'candidate_json', 'provenance_json',
  'confidence_json', 'media_manifest',
]);
const jsonbColumns = [...foundation.matchAll(/^\s+([a-z_]+) jsonb\b/gm)]
  .map((match) => match[1]);
for (const column of jsonbColumns) {
  check(allowedJsonbColumns.has(column), `Unapproved JSONB column: ${column}`);
  check(!/_ids_json$/.test(column), `Core relationships may not be stored in JSONB: ${column}`);
}

check((foundation.match(/references /g) ?? []).length >= 80, 'Expected explicit canonical foreign keys are missing.');
check((foundation.match(/create (?:unique )?index /g) ?? []).length >= 55, 'Expected canonical indexes are missing.');
const canonicalSql = foundation + rls + storage + bootstrap;
check(!/\b(create|alter|drop) table public\./i.test(canonicalSql), 'WP2 must not create, alter, or drop legacy public tables.');
check(!/\bdrop table\b/i.test(canonicalSql), 'WP2 migrations may not drop tables.');
check(!/\brename\s+(?:table|column)\b/i.test(canonicalSql), 'WP2 migrations may not rename legacy structures.');
check(!/auth\.role\s*\(/i.test(rls + storage), 'Policies must use TO roles, not auth.role().');
check(!/using\s*\(\s*true\s*\)/i.test(rls), 'Canonical policies may not use unconditional USING (true).');
check(!/select ml_internal\.(?:is_studio_member|can_write_studio|is_studio_owner)\([^)]*studio_id/i.test(rls + storage), 'Row-dependent RLS helpers must use cached Studio-ID sets.');
check(rls.includes("to anon\n  using (is_public and is_current"), 'Anonymous reads must be publication-only and current-only.');
check(rls.includes('jsonb_has_private_key'), 'Public payload denylist guard is missing.');
check(rls.includes('Publication payloads are immutable'), 'Public payload immutability guard is missing.');

for (const bucket of ['studio-assets', 'portfolio-assets']) {
  check(storage.includes(`'${bucket}'`), `Canonical Storage bucket is missing: ${bucket}`);
}
for (const operation of ['select', 'insert', 'update', 'delete']) {
  check(
    new RegExp(`ml_studio_assets_${operation}`).test(storage),
    `Private Storage ${operation} policy is missing.`,
  );
  check(
    new RegExp(`ml_portfolio_assets_${operation}`).test(storage),
    `Public derivative Storage ${operation} policy is missing.`,
  );
}
check(
  bootstrap.includes('create policy studio_settings_insert_owner'),
  'Canonical migration bootstrap lacks the owner-only studio settings insert policy.',
);
check(
  bootstrap.includes('grant insert on table ml_private.studio_settings to authenticated'),
  'Canonical migration bootstrap lacks the matching least-privilege table grant.',
);

const srcFiles = [];
const walk = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else srcFiles.push(path);
  }
};
for (const uiDirectory of ['src/components/', 'src/hooks/', 'src/pages/', 'src/routes/']) {
  walk(fileURLToPath(new URL(uiDirectory, root)));
}
srcFiles.push(fileURLToPath(new URL('src/App.tsx', root)));
for (const path of srcFiles) {
  const contents = readFileSync(path, 'utf8');
  check(
    !/ml_private|ml_public|studio-assets|portfolio-assets/.test(contents),
    `Current UI was switched to a WP2 canonical path: ${path}`,
  );
}

const plan = Number(rlsTest.match(/select plan\((\d+)\)/)?.[1] ?? 0);
const assertions = (rlsTest.match(/^select (?:is|results_eq|throws_like|throws_ok|lives_ok)\(/gm) ?? []).length;
check(plan === assertions, `pgTAP plan (${plan}) does not match assertion count (${assertions}).`);
check(rlsTest.includes('set local role anon'), 'pgTAP suite lacks anonymous access tests.');
check(rlsTest.includes('Cross-studio'), 'pgTAP suite lacks cross-studio denial tests.');
check(rlsTest.includes('unpublish_publication'), 'pgTAP suite lacks unpublication tests.');

const migrationNames = readdirSync(new URL('supabase/migrations/', root))
  .filter((name) => name.endsWith('.sql'))
  .sort();
for (const path of [foundationPath, rlsPath, storagePath, bootstrapPath]) {
  check(migrationNames.includes(path.split('/').at(-1)), `Named migration missing: ${path}`);
}
check(
  migrationNames.indexOf(foundationPath.split('/').at(-1))
    < migrationNames.indexOf(rlsPath.split('/').at(-1))
  && migrationNames.indexOf(rlsPath.split('/').at(-1))
    < migrationNames.indexOf(storagePath.split('/').at(-1))
  && migrationNames.indexOf(storagePath.split('/').at(-1))
    < migrationNames.indexOf(bootstrapPath.split('/').at(-1)),
  'WP2 migration order is not schema -> RLS -> Storage -> migration bootstrap.',
);

if (failures.length > 0) {
  console.error(`ML Studio 2.0 schema validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `ML Studio 2.0 schema validation passed: ${actualPrivateTables.length} private tables, `
      + `${actualPublicTables.length} public projection tables, ${assertions} pgTAP assertions, `
      + `${legacyHashes.size} preserved legacy inputs.`,
  );
}
