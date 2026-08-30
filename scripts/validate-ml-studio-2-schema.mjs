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
const productionCompletionPath = 'supabase/migrations/20260826080100_complete_wp6_costing_orders_qc.sql';
const editorialPath = 'supabase/migrations/20260826103000_normalize_editorial_story_from_system.sql';
const portfolioPath = 'supabase/migrations/20260826121000_implement_wp8_public_cuts.sql';
const rcMigrationRolePath = 'supabase/migrations/20260827170000_enable_trusted_rc_migration_role.sql';
const aiPath = 'supabase/migrations/20260827213019_implement_wp9_governed_ai_candidates.sql';
const canonicalTransportPath = 'supabase/migrations/20260828014454_canonical_operation_transport.sql';
const publicCutBatchPath = 'supabase/migrations/20260828021002_atomic_public_cut_batch.sql';
const protectedCommandsPath = 'supabase/migrations/20260828033000_protected_canonical_commands.sql';
const trustedDeviceFinalizePath = 'supabase/migrations/20260828050000_trusted_device_import_finalize.sql';
const testPath = 'supabase/tests/ml_studio_2_rls_test.sql';
const rcTestPath = 'supabase/tests/wp10_rc_migration_role_test.sql';
const aiTestPath = 'supabase/tests/wp9_ai_governance_test.sql';
const canonicalTransportTestPath = 'supabase/tests/wp10_canonical_operation_transport_test.sql';
const publicCutBatchTestPath = 'supabase/tests/wp10_atomic_public_cut_batch_test.sql';
const protectedCommandsTestPath = 'supabase/tests/wp10_protected_canonical_commands_test.sql';
const trustedDeviceFinalizeTestPath = 'supabase/tests/wp10_trusted_device_import_test.sql';
const foundation = read(foundationPath);
const rls = read(rlsPath);
const storage = read(storagePath);
const bootstrap = read(bootstrapPath);
const technical = read(technicalPath);
const measurement = read(measurementPath);
const release = read(releasePath);
const versioning = read(versioningPath);
const production = read(productionPath);
const productionCompletion = read(productionCompletionPath);
const editorial = read(editorialPath);
const portfolio = read(portfolioPath);
const rcMigrationRole = read(rcMigrationRolePath);
const ai = read(aiPath);
const canonicalTransport = read(canonicalTransportPath);
const publicCutBatch = read(publicCutBatchPath);
const protectedCommands = read(protectedCommandsPath);
const trustedDeviceFinalize = read(trustedDeviceFinalizePath);
const rlsTest = read(testPath);
const rcRlsTest = read(rcTestPath);
const aiRlsTest = read(aiTestPath);
const canonicalTransportTest = read(canonicalTransportTestPath);
const publicCutBatchTest = read(publicCutBatchTestPath);
const protectedCommandsTest = read(protectedCommandsTestPath);
const trustedDeviceFinalizeTest = read(trustedDeviceFinalizeTestPath);

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
  [productionCompletionPath, productionCompletion],
  [editorialPath, editorial],
  [portfolioPath, portfolio],
  [rcMigrationRolePath, rcMigrationRole],
  [aiPath, ai],
  [canonicalTransportPath, canonicalTransport],
  [publicCutBatchPath, publicCutBatch],
  [protectedCommandsPath, protectedCommands],
  [trustedDeviceFinalizePath, trustedDeviceFinalize],
  [testPath, rlsTest],
  [rcTestPath, rcRlsTest],
  [aiTestPath, aiRlsTest],
  [canonicalTransportTestPath, canonicalTransportTest],
  [publicCutBatchTestPath, publicCutBatchTest],
  [protectedCommandsTestPath, protectedCommandsTest],
  [trustedDeviceFinalizeTestPath, trustedDeviceFinalizeTest],
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
  'ai_job_input_refs', 'ai_artifact_media', 'ai_artifact_acceptances',
  'ai_acceptance_commands',
  'validation_waivers',
  'sample_round_media', 'fit_session_media', 'fit_issue_promotions',
  'production_milestones', 'qc_templates', 'qc_template_checks',
  'qc_inspections', 'qc_waivers',
  'editorial_collection_garments', 'editorial_exports',
  'portfolio_project_assets', 'portfolio_editorial_scenes',
  'portfolio_editorial_assets', 'portfolio_technical_excerpts',
  'sync_tombstones',
  'canonical_operation_receipts', 'public_cut_batches',
].sort();

const canonicalTableSql = foundation + '\n' + release + '\n' + production + '\n' + productionCompletion + '\n' + editorial + '\n' + portfolio + '\n' + ai + '\n' + canonicalTransport + '\n' + publicCutBatch;
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
    rls.includes(`'${table}'`) || rls.includes(`ml_private.${table}`) || release.includes(`ml_private.${table}`) || production.includes(`ml_private.${table}`) || productionCompletion.includes(`ml_private.${table}`) || editorial.includes(`ml_private.${table}`) || portfolio.includes(`ml_private.${table}`) || ai.includes(`ml_private.${table}`) || canonicalTransport.includes(`ml_private.${table}`) || publicCutBatch.includes(`ml_private.${table}`),
    `Canonical table is missing from RLS coverage: ${table}`,
  );
}

const immutableOrJoinTables = new Set([
  'garment_tags', 'inventory_entries', 'garment_versions', 'tech_pack_exports',
  'validation_runs', 'template_applications', 'entity_revisions', 'change_events',
  'restore_operations', 'validation_waivers',
  'canonical_operation_receipts', 'public_cut_batches',
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
  'field_manifest_json',
  'section_manifest_json',
  'manifest_json',
  'source_manifest_json',
]);
const jsonbColumns = expectedPrivateTables.flatMap((table) =>
  [...tableBlock(table).matchAll(/^\s+([a-z_]+) jsonb\b/gm)].map((match) => match[1]),
);
for (const column of jsonbColumns) {
  check(allowedJsonbColumns.has(column), `Unapproved JSONB column: ${column}`);
  check(!/_ids_json$/.test(column), `Core relationships may not be stored in JSONB: ${column}`);
}

check((foundation.match(/references /g) ?? []).length >= 80, 'Expected explicit canonical foreign keys are missing.');
check((foundation.match(/create (?:unique )?index /g) ?? []).length >= 55, 'Expected canonical indexes are missing.');
const canonicalSql = foundation + rls + storage + bootstrap + technical + measurement + release + versioning + production + productionCompletion + editorial + portfolio + rcMigrationRole + ai + canonicalTransport + publicCutBatch + protectedCommands + trustedDeviceFinalize;
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
for (const table of ['production_milestones', 'qc_templates', 'qc_template_checks', 'qc_inspections', 'qc_waivers']) {
  check(productionCompletion.includes(`create table ml_private.${table}`), `WP6 completion table is missing: ${table}`);
  check(productionCompletion.includes(`alter table ml_private.%I enable row level security`) || productionCompletion.includes(`alter table ml_private.${table} enable row level security`), `WP6 completion RLS is missing: ${table}`);
}
for (const field of ['cogs_per_unit', 'wholesale_unit_price', 'margin_pct', 'approved_by', 'approved_at']) {
  check(productionCompletion.includes(`add column ${field}`), `WP6 quantity cost evidence is missing: ${field}`);
}
for (const trigger of ['production_orders_require_release_pin', 'qc_inspections_require_provenance', 'qc_results_require_provenance', 'qc_waivers_append_only', 'production_orders_record_status']) {
  check(productionCompletion.includes(`create trigger ${trigger}`), `WP6 release/QC/audit trigger is missing: ${trigger}`);
}
for (const index of ['ml_cost_items_sheet_basis_idx', 'ml_production_milestones_order_idx', 'ml_qc_inspections_version_idx', 'ml_qc_results_inspection_idx', 'ml_qc_waivers_task_idx']) {
  check(productionCompletion.includes(`create index ${index}`), `WP6 production lookup index is missing: ${index}`);
}
for (const table of ['editorial_collection_garments', 'editorial_exports']) {
  check(editorial.includes(`ml_private.${table}`), `WP7 private editorial table is missing: ${table}`);
  check(editorial.includes(`alter table ml_private.${table} enable row level security`), `WP7 RLS is missing: ${table}`);
}
for (const field of ['primary_garment_version_id', 'source_garment_id', 'source_version_id', 'source_field_path', 'source_checksum', 'staleness', 'ai_artifact_id']) {
  check(editorial.includes(field), `WP7 Story from System field is missing: ${field}`);
}
for (const trigger of ['editorial_blocks_assert_live_source', 'editorial_exports_append_only']) {
  check(editorial.includes(`create trigger ${trigger}`), `WP7 editorial audit/provenance trigger is missing: ${trigger}`);
}
for (const table of ['portfolio_project_assets', 'portfolio_editorial_scenes', 'portfolio_editorial_assets', 'portfolio_technical_excerpts']) {
  check(portfolio.includes(`create table ml_private.${table}`), `WP8 portfolio relationship table is missing: ${table}`);
  check(portfolio.includes(`alter table ml_private.%I enable row level security`) || portfolio.includes(`alter table ml_private.${table} enable row level security`), `WP8 RLS is missing: ${table}`);
}
for (const trigger of ['portfolio_projects_assert_source_version', 'portfolio_editorials_assert_source_version', 'portfolio_technical_excerpts_assert_source', 'publications_enforce_wp8_public_cut', 'publication_assets_enforce_provenance']) {
  check(portfolio.includes(`create trigger ${trigger}`), `WP8 source/privacy/provenance trigger is missing: ${trigger}`);
}
for (const contract of ['publication_root_keys_allowed', 'jsonb_has_private_key', 'jsonb_has_unknown_public_key', 'source_derivative_id', 'rights_checked_at', 'source_revision']) {
  check(portfolio.includes(contract), `WP8 Public Cut boundary contract is missing: ${contract}`);
}
for (const table of ['ai_job_input_refs', 'ai_artifact_media', 'ai_artifact_acceptances', 'ai_acceptance_commands']) {
  check(ai.includes(`create table ml_private.${table}`), `WP9 normalized AI evidence table is missing: ${table}`);
  check(ai.includes(`ml_private.${table}`) && ai.includes('enable row level security'), `WP9 RLS coverage is missing: ${table}`);
}
for (const workflow of ['technical_flat_generation', 'pom_assistance', 'bom_assistance', 'construction_recommendations', 'tech_pack_validation', 'editorial_generation', 'portfolio_drafting']) {
  check(ai.includes(`'${workflow}'`), `WP9 governed workflow is missing: ${workflow}`);
}
for (const field of ['provider', 'idempotency_key', 'source_checksum', 'retry_of_job_id', 'attempt_no', 'candidate_checksum', 'field_manifest_json', 'acceptance_operation_id', 'accepted_payload_checksum', 'generated_at']) {
  check(ai.includes(field), `WP9 provenance or retry field is missing: ${field}`);
}
for (const trigger of ['ai_job_input_refs_assert_source', 'ai_artifacts_protect_evidence', 'ai_artifact_acceptances_append_only', 'ai_acceptance_commands_append_only', 'ai_artifact_media_require_private_path']) {
  check(ai.includes(`create trigger ${trigger}`), `WP9 source/privacy/append-only trigger is missing: ${trigger}`);
}
for (const command of ['accept_ai_artifact', 'reject_ai_artifact']) {
  check(ai.includes(`function ml_private.${command}`), `WP9 governed decision command is missing: ${command}`);
}
for (const contract of ['AI acceptance receipt must reference a normal domain change event.', 'AI candidate sources changed after generation.', 'AI artifact media must remain in the private Studio asset path.']) {
  check(ai.includes(contract), `WP9 trust boundary contract is missing: ${contract}`);
}
check(ai.includes('revoke insert, update, delete on table ml_private.ai_artifacts from authenticated'), 'WP9 browser clients must not write candidate artifacts directly.');
check(ai.includes('grant select on table ml_private.ai_artifacts to authenticated'), 'WP9 reviewers need read-only candidate access.');

for (const contract of [
  'canonical_operation_receipts', 'canonical_client_columns',
  'commit_canonical_operation', 'request_checksum', 'ml.canonical_operation',
]) {
  check(canonicalTransport.includes(contract), `WP10 canonical transaction contract is missing: ${contract}`);
}
check(canonicalTransport.includes('revoke insert, update, delete on table ml_private.canonical_operation_receipts'), 'WP10 operation receipts must be browser read-only.');
check(canonicalTransport.includes("perform set_config('ml.operation_id'"), 'WP10 canonical writes must establish a transaction-scoped direct-write guard.');
check(!/format\([^)]*p_entity_type/i.test(canonicalTransport), 'WP10 canonical operation must never interpolate a client entity type as a table identifier.');

for (const command of ['begin_public_cut_batch', 'stage_public_cut_asset', 'commit_public_cut_batch', 'unpublish_public_cut_batch']) {
  check(publicCutBatch.includes(`function ml_private.${command}`), `WP10 atomic Public Cut command is missing: ${command}`);
}
check(publicCutBatch.includes('create table ml_private.public_cut_batches'), 'WP10 Public Cut requires private, retryable batch evidence.');
check(publicCutBatch.includes("status in ('draft', 'copying', 'ready', 'published', 'failed', 'unpublished')"), 'WP10 Public Cut batch lifecycle is incomplete.');
check(publicCutBatch.includes('update ml_public.publications') && publicCutBatch.includes('is_current = false'), 'WP10 Public Cut commit must retire the former set atomically.');

for (const command of [
  'commit_canonical_restore', 'create_canonical_freeze_frame', 'release_technical_spec',
  'record_tech_pack_export', 'record_editorial_export', 'commit_qc_waiver',
  'decide_qc_inspection', 'transition_ai_job', 'record_ai_validation_candidate',
]) {
  check(protectedCommands.includes(`function ml_private.${command}`), `WP10 protected command is missing: ${command}`);
}
check(trustedDeviceFinalize.includes('finalize_trusted_device_import'), 'WP10 trusted device import finalizer is missing.');
check(trustedDeviceFinalize.includes('to service_role'), 'WP10 trusted device import finalizer must be service-role only.');
check(trustedDeviceFinalize.includes('isolated-beta-device-import-v1'), 'WP10 trusted device import requires an explicit isolated-beta confirmation.');

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
const reviewedCanonicalIdentityPaths = new Set([
  fileURLToPath(new URL('src/hooks/useAuth.tsx', root)),
  fileURLToPath(new URL('src/hooks/useCanonicalWorkspace.tsx', root)),
]);
for (const path of srcFiles) {
  const contents = readFileSync(path, 'utf8');
  check(
    reviewedCanonicalIdentityPaths.has(path)
      || !/ml_private|ml_public|studio-assets|portfolio-assets/.test(contents),
    `UI contains an unreviewed direct canonical/storage path: ${path}`,
  );
}
for (const path of reviewedCanonicalIdentityPaths) {
  const contents = readFileSync(path, 'utf8');
  check(
    !/ml_public|studio-assets|portfolio-assets/.test(contents),
    `Reviewed identity path crossed into public or Storage data: ${path}`,
  );
  check(
    !/\.from\(['"](?!profiles|studios|studio_settings)[^'"]+['"]\)/.test(contents),
    `Reviewed identity path queries a non-identity canonical table: ${path}`,
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
for (const contract of ['Timeline', 'Version A', 'Version B', 'What changed', 'Preview restore', 'ReleaseGate']) {
  check(versionsPage.includes(contract), `WP5 Versions/Diff UI contract is missing: ${contract}`);
}
check(router.includes('<VersionsPage'), 'WP5 Versions & Diff route is missing.');
const productionRepository = read('src/domains/production/productionRepository.ts');
const productionPage = read('src/pages/Production/ProductionPage.tsx');
for (const contract of ['createSampleRound', 'createFitSession', 'recordFitMeasurement', 'createFitIssue', 'promoteFitIssue', 'createCostSheet', 'addCostItem', 'createProductionOrder', 'startQcInspection', 'waiveQcResult', 'decideQcInspection', 'productionTimeline']) {
  check(productionRepository.includes(`function ${contract}`), `WP6 production repository contract is missing: ${contract}`);
}
for (const contract of ['Production & sampling', 'Fit review', 'Capture evidence', 'Promote observation', 'POM candidate', 'Quantity-aware costing', 'Cost Sheet', 'Production order', 'QC checklist', 'Release decision', 'Production chronology']) {
  check(productionPage.includes(contract), `WP6 Production UI contract is missing: ${contract}`);
}
check(router.includes('<ProductionPage'), 'WP6 Production route is missing.');
const editorialPage = read('src/pages/EditorialStudio/EditorialStudioPage.tsx');
const editorialRepository = read('src/domains/editorial/studioRepository.ts');
check(router.includes('<EditorialStudioPage'), 'WP7 Editorial route is missing.');
for (const contract of ['createEditorialCollection', 'addStoryFromSystemBlock', 'refreshEditorialLiveData', 'createEditorialExport']) {
  check(editorialRepository.includes(`function ${contract}`), `WP7 editorial repository contract is missing: ${contract}`);
}
for (const contract of ['Library', 'Scene builder', 'Story from System', 'Commit PDF export']) {
  check(editorialPage.includes(contract), `WP7 editorial UI contract is missing: ${contract}`);
}
const portfolioPage = read('src/pages/PortfolioStudio/PortfolioStudioPage.tsx');
const publicCutRepository = read('src/domains/portfolio/publicCutRepository.ts');
const anonymousPortfolioLoader = read('src/lib/canonicalPublications.ts');
check(router.includes('<PortfolioStudioPage'), 'WP8 Portfolio route is missing.');
for (const contract of ['buildPublicCutPreview', 'privacyScanPublicCut', 'publishPublicCut', 'unpublishPublicCut', 'publicationHistory']) {
  check(publicCutRepository.includes(`function ${contract}`), `WP8 portfolio repository contract is missing: ${contract}`);
}
for (const contract of ['Curate the public cut', 'Public preview', 'Privacy & readiness', 'Publication history']) {
  check(portfolioPage.includes(contract), `WP8 Portfolio manager contract is missing: ${contract}`);
}
check(anonymousPortfolioLoader.includes(".schema('ml_public')"), 'WP8 anonymous loader must query only the public projection schema.');
check(!/CanonicalWorkspace|StudioData|ml_private|useCanonicalWorkspace/.test(anonymousPortfolioLoader), 'WP8 anonymous loader must not import or mention private workspace data.');

const aiRepository = read('src/domains/ai/governedAiRepository.ts');
const aiProvider = read('src/domains/ai/fakeAiProvider.ts');
const aiPage = read('src/pages/AiStudio/AiStudioPage.tsx');
const aiPanel = read('src/components/ai/AiCandidatePanel.tsx');
check(router.includes('<AiStudioPage'), 'WP9 AI Jobs route is missing.');
for (const contract of ['queueAiJob', 'startAiJob', 'completeAiJobWithFakeProvider', 'retryAiJob', 'acceptAiArtifact', 'rejectAiArtifact', 'aiArtifactSourcesFresh', 'assertPrivateCandidateBoundary']) {
  check(aiRepository.includes(`function ${contract}`), `WP9 governed AI repository contract is missing: ${contract}`);
}
for (const command of ['registerFlat', 'createPomPoint', 'createBomItem', 'addConstructionStep', 'recordTechPackValidationRun', 'addEditorialBlock', 'updatePortfolioProject']) {
  check(aiRepository.includes(command), `WP9 typed acceptance command is missing: ${command}`);
}
check(aiRepository.includes("origin: 'ai_acceptance'"), 'WP9 accepted candidates must emit normal AI-origin domain events.');
check(aiProvider.includes("generatedBy: 'deterministic_fake'"), 'WP9 normal tests require the deterministic fake provider.');
check(!/fetch\(|openai|anthropic|paid/i.test(aiProvider), 'WP9 fake provider must not call a paid model.');
for (const contract of ['Queued', 'Running', 'Candidate', 'Accepted', 'Rejected', 'Modified after generation']) {
  check(aiPage.includes(contract), `WP9 AI lifecycle UI state is missing: ${contract}`);
}
for (const contract of ['Inspect sources', 'Candidate fields', 'Contextual confidence', 'Commit consequence', 'Accept selected through domain commands', 'Reject candidate']) {
  check(aiPanel.includes(contract), `WP9 candidate review contract is missing: ${contract}`);
}

const pgTapCount = (contents, path) => {
  const plan = Number(contents.match(/select plan\((\d+)\)/)?.[1] ?? 0);
  const assertionCount = (contents.match(/^select (?:is|isnt|ok|results_eq|throws_like|throws_ok|lives_ok|has_table|has_function)\(/gm) ?? []).length;
  check(plan === assertionCount, `${path} pgTAP plan (${plan}) does not match assertion count (${assertionCount}).`);
  return assertionCount;
};
const assertions = pgTapCount(rlsTest, testPath)
  + pgTapCount(rcRlsTest, rcTestPath)
  + pgTapCount(aiRlsTest, aiTestPath)
  + pgTapCount(canonicalTransportTest, canonicalTransportTestPath)
  + pgTapCount(publicCutBatchTest, publicCutBatchTestPath)
  + pgTapCount(protectedCommandsTest, protectedCommandsTestPath)
  + pgTapCount(trustedDeviceFinalizeTest, trustedDeviceFinalizeTestPath);
check(rlsTest.includes('set local role anon'), 'pgTAP suite lacks anonymous access tests.');
check(rlsTest.includes('Cross-studio'), 'pgTAP suite lacks cross-studio denial tests.');
check(rlsTest.includes('unpublish_publication'), 'pgTAP suite lacks unpublication tests.');
check(aiRlsTest.includes('browser members cannot directly accept a candidate'), 'WP9 pgTAP suite lacks direct-write prevention.');
check(aiRlsTest.includes('acceptance fails when a source revision changed after generation'), 'WP9 pgTAP suite lacks stale-source denial.');
check(aiRlsTest.includes('reviewers cannot decide AI candidates'), 'WP9 pgTAP suite lacks decision permission denial.');
check(aiRlsTest.includes('generated media cannot cross Studio storage prefixes'), 'WP9 pgTAP suite lacks private media enforcement.');
check(rcRlsTest.includes('trusted migration role cannot delete canonical garment data'), 'WP10 pgTAP suite lacks non-destructive service-role enforcement.');
check(rcMigrationRole.includes('grant select, insert, update on all tables in schema ml_private to service_role'), 'WP10 trusted migration role lacks scoped private-table privileges.');
check(!rcMigrationRole.includes('delete on all tables'), 'WP10 trusted migration role must not receive bulk delete privileges.');
check(canonicalTransportTest.includes('ordinary browser writes cannot bypass the operation transaction'), 'WP10 pgTAP suite lacks canonical direct-write rejection.');
check(canonicalTransportTest.includes('an identical operation ID is treated as completed without replay'), 'WP10 pgTAP suite lacks idempotent retry evidence.');
check(publicCutBatchTest.includes('a media-stage failure cannot partially publish the batch'), 'WP10 pgTAP suite lacks partial Public Cut failure privacy evidence.');
check(publicCutBatchTest.includes('unpublish removes database visibility before cleanup'), 'WP10 pgTAP suite lacks visibility-first unpublish evidence.');
check(protectedCommandsTest.includes('restore advances the garment revision without rewriting earlier versions'), 'WP10 pgTAP suite lacks protected restore evidence.');
check(trustedDeviceFinalizeTest.includes('browser roles cannot execute the trusted device finalizer'), 'WP10 pgTAP suite lacks trusted-import browser denial.');

const migrationNames = readdirSync(new URL('supabase/migrations/', root))
  .filter((name) => name.endsWith('.sql'))
  .sort();
for (const path of [foundationPath, rlsPath, storagePath, bootstrapPath, technicalPath, measurementPath, releasePath, versioningPath, productionPath, productionCompletionPath, editorialPath, portfolioPath, aiPath, rcMigrationRolePath, canonicalTransportPath, publicCutBatchPath, protectedCommandsPath, trustedDeviceFinalizePath]) {
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
    < migrationNames.indexOf(productionPath.split('/').at(-1))
  && migrationNames.indexOf(productionPath.split('/').at(-1))
    < migrationNames.indexOf(productionCompletionPath.split('/').at(-1)),
  'Migration order is not schema -> RLS -> Storage -> bootstrap -> WP4 flats -> measurements -> release -> WP5 versioning -> WP6 sampling -> WP6 costing/QC -> WP7 editorial.',
);
check(
  migrationNames.indexOf(productionCompletionPath.split('/').at(-1)) < migrationNames.indexOf(editorialPath.split('/').at(-1)),
  'WP7 editorial migration must run after WP6 costing/QC.',
);
check(
  migrationNames.indexOf(editorialPath.split('/').at(-1)) < migrationNames.indexOf(portfolioPath.split('/').at(-1)),
  'WP8 Public Cut migration must run after WP7 editorial normalization.',
);
check(
  migrationNames.indexOf(portfolioPath.split('/').at(-1)) < migrationNames.indexOf(aiPath.split('/').at(-1)),
  'WP9 governed AI migration must run after the WP8 Public Cut boundary.',
);
check(
  migrationNames.indexOf(rcMigrationRolePath.split('/').at(-1)) < migrationNames.indexOf(aiPath.split('/').at(-1))
    && migrationNames.indexOf(aiPath.split('/').at(-1)) < migrationNames.indexOf(canonicalTransportPath.split('/').at(-1))
    && migrationNames.indexOf(canonicalTransportPath.split('/').at(-1)) < migrationNames.indexOf(publicCutBatchPath.split('/').at(-1))
    && migrationNames.indexOf(publicCutBatchPath.split('/').at(-1)) < migrationNames.indexOf(protectedCommandsPath.split('/').at(-1))
    && migrationNames.indexOf(protectedCommandsPath.split('/').at(-1)) < migrationNames.indexOf(trustedDeviceFinalizePath.split('/').at(-1)),
  'WP10 cutover migrations must run migration role -> governed AI -> canonical transport -> Public Cut batch -> protected commands -> trusted finalizer.',
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
