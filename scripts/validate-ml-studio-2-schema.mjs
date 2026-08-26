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
const technicalPath = 'supabase/migrations/20260825035858_add_technical_foundation_contracts.sql';
const measurementPath = 'supabase/migrations/20260825051344_enforce_pom_measurement_integrity.sql';
const releasePath = 'supabase/migrations/20260825184506_complete_wp4_bom_construction_release_pack.sql';
const versioningPath = 'supabase/migrations/20260825203246_implement_wp5_freeze_frames_restore.sql';
const productionPath = 'supabase/migrations/20260826061816_implement_wp6_production_sampling_fit.sql';
const testPath = 'supabase/tests/ml_studio_2_rls_test.sql';
const foundation = read(foundationPath);
const rls = read(rlsPath);
const storage = read(storagePath);
const bootstrap = read(bootstrapPath);
const technical = read(technicalPath);
const measurement = read(measurementPath);
const release = read(releasePath);
const versioning = read(versioningPath);
const production = read(productionPath);
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
  [technicalPath, technical],
  [measurementPath, measurement],
  [releasePath, release],
  [versioningPath, versioning],
  [productionPath, production],
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
  'validation_waivers',
  'sample_round_media', 'fit_session_media', 'fit_issue_promotions',
  'sync_tombstones',
].sort();

const canonicalTableSql = foundation + '\n' + release + '\n' + production;
const actualPrivateTables = [...canonicalTableSql.matchAll(/create table ml_private\.([a-z_]+)/g)]
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
  const match = canonicalTableSql.match(
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
    rls.includes(`'${table}'`) || rls.includes(`ml_private.${table}`) || release.includes(`ml_private.${table}`) || production.includes(`ml_private.${table}`),
    `Canonical table is missing from RLS coverage: ${table}`,
  );
}

const immutableOrJoinTables = new Set([
  'garment_tags', 'inventory_entries', 'garment_versions', 'tech_pack_exports',
  'validation_runs', 'template_applications', 'entity_revisions', 'change_events',
  'restore_operations', 'validation_waivers',
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
  'section_manifest_json',
]);
const jsonbColumns = [...canonicalTableSql.matchAll(/^\s+([a-z_]+) jsonb\b/gm)]
  .map((match) => match[1]);
for (const column of jsonbColumns) {
  check(allowedJsonbColumns.has(column), `Unapproved JSONB column: ${column}`);
  check(!/_ids_json$/.test(column), `Core relationships may not be stored in JSONB: ${column}`);
}

check((foundation.match(/references /g) ?? []).length >= 80, 'Expected explicit canonical foreign keys are missing.');
check((foundation.match(/create (?:unique )?index /g) ?? []).length >= 55, 'Expected canonical indexes are missing.');
const canonicalSql = foundation + rls + storage + bootstrap + technical + measurement + release + versioning + production;
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
check(technical.includes("severity text not null default 'info'"), 'WP4 flat annotation severity contract is missing.');
check(technical.includes("status text not null default 'open'"), 'WP4 flat annotation resolution contract is missing.');
check(technical.includes('flat_annotations_open_critical_idx'), 'WP4 unresolved-critical annotation index is missing.');
for (const field of ['template_id', 'template_version', 'source_revision_label', 'deterministic_filename']) {
  check(technical.includes(`add column ${field}`), `WP4 export identity field is missing: ${field}`);
}
check(technical.includes("'tech_pack'"), 'WP4 tech-pack template type is missing.');
check(measurement.includes('pom_points_normalized_anchor_check'), 'WP4 POM normalized-anchor constraint is missing.');
check(measurement.includes('measurement_values_target_nonnegative_check'), 'WP4 non-negative measurement target constraint is missing.');
check(measurement.includes('fit_measurements_actual_nonnegative_check'), 'WP4 non-negative fit actual constraint is missing.');
for (const index of ['ml_measurement_values_pom_size_idx', 'ml_grade_values_pom_idx', 'ml_fit_measurements_pom_size_idx']) {
  check(measurement.includes(`create index ${index}`), `WP4 POM query index is missing: ${index}`);
}
for (const field of ['intentional_free_text', 'supplier_item_id', 'substitute_item_id', 'shortage_quantity', 'cost_impact']) {
  check(release.includes(`add column ${field}`), `WP4 BOM release field is missing: ${field}`);
}
for (const field of ['release_version_id', 'release_validation_run_id', 'released_by', 'released_at']) {
  check(release.includes(`add column ${field}`), `WP4 release identity field is missing: ${field}`);
}
for (const field of ['ruleset_version', 'storage_path', 'generated_at', 'section_manifest_json', 'approved_by', 'approved_at']) {
  check(release.includes(`add column ${field}`), `WP4 deterministic export evidence is missing: ${field}`);
}
check(release.includes('create table ml_private.validation_waivers'), 'WP4 waiver audit table is missing.');
check(release.includes("domain in ('flats', 'pom', 'measurements', 'bom', 'construction', 'files', 'release')"), 'WP4 privacy rules must be excluded from waivable domains.');
check(release.includes('alter table ml_private.validation_waivers enable row level security'), 'WP4 waiver evidence must enable RLS.');
check(
  release.indexOf('update ml_private.bom_items') < release.indexOf('add constraint bom_items_intentional_free_text_check'),
  'WP4 existing custom BOM intent must be backfilled before its explicit-intent constraint.',
);
check(
  release.indexOf('update ml_private.tech_pack_exports') < release.indexOf('alter column ruleset_version set not null'),
  'WP4 foundation exports must receive deterministic release evidence before non-null enforcement.',
);
for (const field of ['notes', 'version_kind', 'base_revision']) {
  check(versioning.includes(`add column ${field}`), `WP5 Freeze Frame field is missing: ${field}`);
}
check(versioning.includes('add column related_operation_ids'), 'WP5 combined merge operation references are missing.');
for (const field of ['replay_patch', 'inverse_patch', 'selected_keys_json', 'dependency_json', 'preview_checksum']) {
  check(versioning.includes(`add column ${field}`), `WP5 restore evidence field is missing: ${field}`);
}
for (const trigger of ['change_events_append_only', 'entity_revisions_append_only', 'restore_operations_append_only', 'garment_versions_immutable_and_protected', 'publications_require_fresh_source']) {
  check(versioning.includes(`create trigger ${trigger}`), `WP5 append-only or fresh-state trigger is missing: ${trigger}`);
}
for (const command of ['create_freeze_frame', 'commit_restore']) {
  check(versioning.includes(`function ml_private.${command}`), `WP5 authenticated command boundary is missing: ${command}`);
}
check(versioning.includes('on delete restrict'), 'WP5 protected Freeze Frame relationships must use restricted deletion.');
check(versioning.includes("set search_path = ''"), 'WP5 command and trigger functions must pin an empty search path.');
for (const table of ['sample_round_media', 'fit_session_media', 'fit_issue_promotions']) {
  check(production.includes(`create table ml_private.${table}`), `WP6 production evidence table is missing: ${table}`);
  check(production.includes(`alter table ml_private.${table} enable row level security`), `WP6 production evidence RLS is missing: ${table}`);
}
for (const trigger of ['fit_sessions_require_version_pin', 'fit_measurements_require_provenance', 'fit_issues_require_provenance', 'fit_issue_promotions_require_provenance']) {
  check(production.includes(`create trigger ${trigger}`), `WP6 provenance trigger is missing: ${trigger}`);
}
for (const index of ['ml_fit_sessions_version_date_idx', 'ml_fit_issues_version_status_idx', 'ml_fit_measurements_session_pom_idx', 'ml_fit_issue_promotions_issue_idx']) {
  check(production.includes(`create index ${index}`), `WP6 fit evidence lookup index is missing: ${index}`);
}

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

const wp3CanonicalFiles = [
  'src/hooks/useCanonicalWorkspace.tsx',
  'src/pages/GarmentLibrary/GarmentLibraryPage.tsx',
  'src/pages/GarmentWorkspace/CanonicalGarmentWorkspacePage.tsx',
  'src/pages/LibraryVault/LibraryVaultPage.tsx',
  'src/components/shared/RelationshipPicker.tsx',
];
for (const path of wp3CanonicalFiles) {
  const contents = read(path);
  check(
    contents.includes('useCanonicalWorkspace')
      || contents.includes('RelationshipOption')
      || path.endsWith('useCanonicalWorkspace.tsx'),
    `WP3 canonical route boundary missing: ${path}`,
  );
}
const router = read('src/routes/StudioPageRouter.tsx');
check(router.includes('<GarmentLibraryPage'), 'Garment Library route must use the canonical WP3 page.');
check(router.includes('<CanonicalGarmentWorkspacePage'), 'Garment detail route must use the canonical WP3 workspace.');
check(router.includes('<LibraryVaultPage'), 'Material Vault route must use the canonical WP3 library page.');
check(!router.includes('<ProjectsPage'), 'WP3 must remove the legacy project-library read path.');
check(!router.includes('<FabricVaultPage'), 'WP3 must remove the legacy fabric-vault read path.');
const technicalPage = read('src/pages/TechnicalStudio/TechnicalStudioPage.tsx');
const technicalRepository = read('src/domains/technical/technicalRepository.ts');
check(router.includes('<TechnicalStudioPage'), 'WP4 Technical Studio route is missing.');
check(technicalPage.includes('FlatCanvas'), 'WP4 Flats workspace is missing.');
check(technicalRepository.includes('missing_required_view'), 'WP4 required-view validation is missing.');
check(technicalRepository.includes('missing_source_mapping'), 'WP4 source-mapping validation is missing.');
check(technicalRepository.includes('unresolved_critical_annotation'), 'WP4 critical-annotation validation is missing.');
check(technicalRepository.includes('deterministicExportFilename'), 'WP4 deterministic export naming is missing.');
const measurementRepository = read('src/domains/technical/measurementRepository.ts');
const measurementPage = read('src/pages/TechnicalStudio/MeasurementStudio.tsx');
for (const contract of ['convertMeasurement', 'measurementWithinTolerance', 'previewGradeRule', 'parseMeasurementCsv', 'restoreMeasurementSelection']) {
  check(measurementRepository.includes(`function ${contract}`), `WP4 measurement repository contract is missing: ${contract}`);
}
check(measurementPage.includes('POMCanvas'), 'WP4 accessible POM canvas is missing.');
check(measurementPage.includes('MeasurementDataGrid'), 'WP4 dense measurement grid is missing.');
check(measurementPage.includes('Structural compare and selective restore'), 'WP4 structural restore UI is missing.');
const releaseRepository = read('src/domains/technical/releaseRepository.ts');
const releasePage = read('src/pages/TechnicalStudio/ReleaseStudio.tsx');
for (const contract of ['createBomItem', 'applyConstructionTemplate', 'validateRelease', 'releaseTechnicalSpec', 'generateDeterministicTechPack']) {
  check(releaseRepository.includes(`function ${contract}`), `WP4 release repository contract is missing: ${contract}`);
}
for (const contract of ['Component detail', 'Assembly sequence', 'Request audited waiver', 'Non-waivable privacy', 'Export panel']) {
  check(releasePage.includes(contract), `WP4 release UI contract is missing: ${contract}`);
}
const versioningRepository = read('src/domains/versioning/versioningRepository.ts');
const versionsPage = read('src/pages/Versions/VersionsPage.tsx');
for (const contract of ['recordWorkspaceChangeEvents', 'createFreezeFrame', 'compareFreezeFrame', 'previewRestore', 'commitRestore', 'assertFreshServerState']) {
  check(versioningRepository.includes(`function ${contract}`), `WP5 versioning repository contract is missing: ${contract}`);
}
for (const contract of ['Timeline', 'Version A', 'Version B', 'Structural comparison', 'Preview restore', 'ReleaseGate']) {
  check(versionsPage.includes(contract), `WP5 Versions/Diff UI contract is missing: ${contract}`);
}
check(router.includes('<VersionsPage'), 'WP5 Versions & Diff route is missing.');
const productionRepository = read('src/domains/production/productionRepository.ts');
const productionPage = read('src/pages/Production/ProductionPage.tsx');
for (const contract of ['createSampleRound', 'createFitSession', 'recordFitMeasurement', 'createFitIssue', 'promoteFitIssue']) {
  check(productionRepository.includes(`function ${contract}`), `WP6 production repository contract is missing: ${contract}`);
}
for (const contract of ['Production & sampling', 'Fit review', 'Capture evidence', 'Promote observation', 'POM candidate']) {
  check(productionPage.includes(contract), `WP6 Production UI contract is missing: ${contract}`);
}
check(router.includes('<ProductionPage'), 'WP6 Production route is missing.');

const plan = Number(rlsTest.match(/select plan\((\d+)\)/)?.[1] ?? 0);
const assertions = (rlsTest.match(/^select (?:is|results_eq|throws_like|throws_ok|lives_ok)\(/gm) ?? []).length;
check(plan === assertions, `pgTAP plan (${plan}) does not match assertion count (${assertions}).`);
check(rlsTest.includes('set local role anon'), 'pgTAP suite lacks anonymous access tests.');
check(rlsTest.includes('Cross-studio'), 'pgTAP suite lacks cross-studio denial tests.');
check(rlsTest.includes('unpublish_publication'), 'pgTAP suite lacks unpublication tests.');

const migrationNames = readdirSync(new URL('supabase/migrations/', root))
  .filter((name) => name.endsWith('.sql'))
  .sort();
for (const path of [foundationPath, rlsPath, storagePath, bootstrapPath, technicalPath, measurementPath, releasePath, versioningPath, productionPath]) {
  check(migrationNames.includes(path.split('/').at(-1)), `Named migration missing: ${path}`);
}
check(
  migrationNames.indexOf(foundationPath.split('/').at(-1))
    < migrationNames.indexOf(rlsPath.split('/').at(-1))
  && migrationNames.indexOf(rlsPath.split('/').at(-1))
    < migrationNames.indexOf(storagePath.split('/').at(-1))
  && migrationNames.indexOf(storagePath.split('/').at(-1))
    < migrationNames.indexOf(bootstrapPath.split('/').at(-1))
  && migrationNames.indexOf(bootstrapPath.split('/').at(-1))
    < migrationNames.indexOf(technicalPath.split('/').at(-1))
  && migrationNames.indexOf(technicalPath.split('/').at(-1))
    < migrationNames.indexOf(measurementPath.split('/').at(-1))
  && migrationNames.indexOf(measurementPath.split('/').at(-1))
    < migrationNames.indexOf(releasePath.split('/').at(-1))
  && migrationNames.indexOf(releasePath.split('/').at(-1))
    < migrationNames.indexOf(versioningPath.split('/').at(-1))
  && migrationNames.indexOf(versioningPath.split('/').at(-1))
    < migrationNames.indexOf(productionPath.split('/').at(-1)),
  'Migration order is not schema -> RLS -> Storage -> bootstrap -> WP4 flats -> measurements -> release -> WP5 versioning -> WP6 production.',
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
