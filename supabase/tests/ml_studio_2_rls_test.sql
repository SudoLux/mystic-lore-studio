begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(68);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'wp2-owner-a@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'wp2-owner-b@example.test'),
  ('10000000-0000-4000-8000-000000000003', 'wp2-reviewer-a@example.test');

insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'WP2 Studio A', 'wp2-studio-a'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'WP2 Studio B', 'wp2-studio-b');

select is(
  (select column_default from information_schema.columns where table_schema = 'ml_private' and table_name = 'flat_annotations' and column_name = 'severity'),
  '''info''::text',
  'flat annotations expose a structured severity workflow field'
);
select is(
  (select column_default from information_schema.columns where table_schema = 'ml_private' and table_name = 'flat_annotations' and column_name = 'status'),
  '''open''::text',
  'flat annotations expose a structured resolution workflow field'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'ml_private' and table_name = 'tech_pack_exports' and column_name in ('template_id', 'template_version', 'source_revision_label', 'deterministic_filename')),
  4::bigint,
  'technical exports retain every deterministic identity input'
);
select is(
  (select count(*) from pg_constraint where conname in (
    'pom_points_name_not_blank_check', 'pom_points_method_not_blank_check',
    'pom_points_normalized_anchor_check', 'measurement_sets_name_not_blank_check',
    'measurement_sets_base_size_not_blank_check', 'measurement_values_size_not_blank_check',
    'measurement_values_target_nonnegative_check', 'grade_rule_values_sizes_not_blank_check',
    'fit_measurements_size_not_blank_check', 'fit_measurements_actual_nonnegative_check'
  )),
  10::bigint,
  'POM, target, grade, and fit decimal integrity constraints are installed'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'ml_private' and indexname in (
    'ml_measurement_values_pom_size_idx', 'ml_grade_values_pom_idx', 'ml_fit_measurements_pom_size_idx'
  )),
  3::bigint,
  'POM-centered target, grade, and fit lookup indexes are installed'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'ml_private' and table_name = 'bom_items' and column_name in (
    'intentional_free_text', 'supplier_item_id', 'substitute_item_id', 'status',
    'shortage_quantity', 'unit_cost', 'currency', 'cost_impact'
  )),
  8::bigint,
  'BOM rows retain explicit link, offer, substitute, shortage, status, and cost evidence'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'ml_private' and table_name = 'tech_pack_exports' and column_name in (
    'ruleset_version', 'storage_path', 'generated_at', 'section_manifest_json', 'approved_by', 'approved_at'
  )),
  6::bigint,
  'tech-pack exports retain ruleset, private path, generation time, manifest, and approval evidence'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'ml_private' and table_name = 'technical_specs' and column_name in (
    'release_version_id', 'release_validation_run_id', 'released_by', 'released_at'
  )),
  4::bigint,
  'technical release roots reference their checkpoint, validation run, actor, and time'
);
select is(
  (select count(*) from pg_constraint where conname in (
    'bom_items_intentional_free_text_check', 'bom_items_status_check',
    'bom_items_substitute_not_self_check', 'bom_items_supplier_item_fk',
    'bom_items_substitute_item_fk', 'bom_items_description_not_blank_check',
    'bom_items_quantity_positive_check', 'bom_items_placement_not_blank_check',
    'bom_items_unit_cost_nonnegative_check', 'bom_items_shortage_within_quantity_check',
    'construction_steps_operation_not_blank_check',
    'construction_steps_status_check', 'construction_steps_seam_allowance_nonnegative_check',
    'construction_steps_required_machine_check', 'construction_steps_required_stitch_check',
    'construction_details_status_check', 'construction_details_callout_not_blank_check',
    'construction_details_normalized_anchor_check'
  )),
  18::bigint,
  'BOM and construction integrity constraints are installed'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'ml_private' and indexname in (
    'ml_bom_items_supplier_item_idx', 'ml_bom_items_substitute_item_idx',
    'ml_bom_items_shortage_idx', 'ml_construction_details_open_critical_idx',
    'ml_validation_waivers_spec_idx', 'ml_validation_waivers_run_idx',
    'ml_technical_specs_release_version_idx'
  )),
  7::bigint,
  'release validation and relationship lookup indexes are installed'
);
select is(
  (select relation.relrowsecurity
   from pg_class relation
   join pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'ml_private' and relation.relname = 'validation_waivers'),
  true,
  'validation waiver evidence is protected by row-level security'
);
select is(
  (select count(*) from pg_constraint
   where conrelid = 'ml_private.validation_waivers'::regclass
     and conname = 'validation_waivers_domain_check'
     and pg_get_constraintdef(oid) not ilike '%privacy%'),
  1::bigint,
  'privacy cannot be represented as a waivable release domain'
);
select is(
  (select count(*) from information_schema.columns
   where table_schema = 'ml_private'
     and ((table_name = 'garment_versions' and column_name in ('notes', 'version_kind', 'base_revision'))
       or (table_name = 'change_events' and column_name = 'related_operation_ids'))),
  4::bigint,
  'Freeze Frames retain decision identity and merge events retain both source operation IDs'
);
select is(
  (select count(*) from information_schema.columns
   where table_schema = 'ml_private' and table_name = 'restore_operations'
     and column_name in ('replay_patch', 'inverse_patch', 'selected_keys_json',
       'dependency_json', 'preview_checksum', 'base_revision', 'result_revision')),
  7::bigint,
  'restore commits retain selection, replay, checksum, dependency, and revision evidence'
);
select is(
  (select count(*) from pg_constraint where conname in (
    'garment_versions_kind_check', 'garment_versions_base_revision_check',
    'garment_versions_scope_domain_check', 'garment_versions_parent_fk',
    'restore_operations_revision_order_check', 'restore_operations_scope_domain_check'
  )),
  6::bigint,
  'Freeze Frame parentage, scope, kind, and restore revision constraints are installed'
);
select is(
  (select count(*) from pg_indexes where schemaname in ('ml_private', 'ml_public')
    and indexname in ('ml_garment_versions_checksum_idx', 'ml_garment_versions_parent_idx',
      'ml_change_events_entity_time_idx', 'ml_restore_operations_source_idx',
      'ml_tech_pack_exports_version_idx', 'ml_production_orders_version_idx',
      'ml_publications_source_version_idx')),
  7::bigint,
  'version comparison and protected dependency indexes are installed'
);
select is(
  (select count(*) from pg_trigger trigger
   join pg_class relation on relation.oid = trigger.tgrelid
   join pg_namespace namespace on namespace.oid = relation.relnamespace
   where not trigger.tgisinternal and namespace.nspname in ('ml_private', 'ml_public')
     and trigger.tgname in ('change_events_append_only', 'entity_revisions_append_only',
       'restore_operations_append_only', 'garment_versions_immutable_and_protected',
       'publications_require_fresh_source')),
  5::bigint,
  'append-only history, protected Freeze Frames, and fresh publication triggers are installed'
);
select is(
  (select count(*) from information_schema.routines
   where routine_schema = 'ml_private'
     and routine_name in ('create_freeze_frame', 'commit_restore')),
  2::bigint,
  'authenticated Freeze Frame and restore command boundaries are installed'
);
select is(
  (select count(*) from information_schema.tables
   where table_schema = 'ml_private' and table_name in ('sample_round_media', 'fit_session_media', 'fit_issue_promotions')),
  3::bigint,
  'WP6 creates normalized private evidence and promotion relationship tables'
);
select is(
  (select count(*) from information_schema.columns
   where table_schema = 'ml_private'
     and ((table_name = 'suppliers' and column_name in ('capabilities_json', 'minimum_order_quantity'))
       or (table_name = 'factories' and column_name in ('supplier_id', 'contact_name', 'contact_email', 'phone'))
       or (table_name = 'fit_sessions' and column_name in ('garment_version_id', 'status', 'decision_note'))
       or (table_name = 'fit_measurements' and column_name in ('fit_session_id', 'garment_version_id'))
       or (table_name = 'fit_issues' and column_name in ('garment_version_id', 'pom_point_id', 'owner_task_id')))),
  14::bigint,
  'WP6 stores sourcing capability and fit provenance as explicit columns'
);
select is(
  (select count(*) from pg_constraint where conname in (
    'fit_sessions_version_fk', 'fit_measurements_session_fk', 'fit_measurements_version_fk',
    'fit_issues_version_fk', 'fit_issues_pom_fk', 'fit_issue_promotions_target_check')),
  6::bigint,
  'fit source/version/POM and promotion targets have normalized constraints'
);
select is(
  (select count(*) from pg_trigger trigger
   join pg_class relation on relation.oid = trigger.tgrelid
   join pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'ml_private' and trigger.tgname in (
     'fit_sessions_require_version_pin', 'fit_measurements_require_provenance',
     'fit_issues_require_provenance', 'fit_issue_promotions_require_provenance')),
  4::bigint,
  'fit sessions, measurements, issues, and promotions enforce provenance triggers'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'ml_private' and indexname in (
    'ml_fit_sessions_version_date_idx', 'ml_fit_issues_version_status_idx',
    'ml_fit_measurements_session_pom_idx', 'ml_fit_issue_promotions_issue_idx')),
  4::bigint,
  'version-pinned fit review lookups have tenant-first indexes'
);
select is(
  (select count(*) from pg_class relation
   join pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'ml_private'
     and relation.relname in ('sample_round_media', 'fit_session_media', 'fit_issue_promotions')
     and relation.relrowsecurity),
  3::bigint,
  'new production evidence tables enable row-level security'
);
select is(
  (select count(*) from pg_policies
   where schemaname = 'ml_private' and tablename in ('sample_round_media', 'fit_session_media', 'fit_issue_promotions')
     and policyname in ('studio_select', 'studio_insert', 'studio_update', 'studio_delete')),
  12::bigint,
  'new production evidence tables use membership-derived read/write policies'
);
select is(
  (select count(*) from information_schema.table_privileges
   where table_schema = 'ml_private' and grantee = 'authenticated'
     and table_name in ('sample_round_media', 'fit_session_media', 'fit_issue_promotions')
     and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  12::bigint,
  'authenticated grants are limited to the canonical evidence tables and enforced by RLS'
);

insert into ml_private.studio_members (
  studio_id, user_id, role, status, joined_at
) values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000003',
  'reviewer', 'active', now()
);

insert into ml_private.collections (id, studio_id, name, season) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Studio A Collection', '2027'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Studio B Collection', '2027');

insert into ml_private.garments (
  id, studio_id, collection_id, garment_code, title
) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'GA-001', 'Studio A Garment'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'GB-001', 'Studio B Garment');

insert into ml_private.technical_specs (
  id, studio_id, garment_id, base_size, unit
) values (
  '41000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001', 'M', 'cm'
);

insert into ml_private.validation_runs (
  id, studio_id, spec_id, status, ruleset_version, result_json, created_by
) values (
  '42000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001', 'warning', 'wp4-release-v1',
  '{"issues":["bom.shortage"]}'::jsonb,
  '10000000-0000-4000-8000-000000000001'
);

insert into ml_private.tasks (
  id, studio_id, garment_id, title, priority
) values (
  '43000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'Resolve approved shortage', 'high'
);

insert into ml_private.validation_waivers (
  id, studio_id, spec_id, validation_run_id, rule_code, domain, reason,
  actor_id, follow_up_task_id
) values (
  '44000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '41000000-0000-4000-8000-000000000001',
  '42000000-0000-4000-8000-000000000001', 'bom.shortage', 'bom',
  'Prototype shortage approved with production follow-up.',
  '10000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001'
);

insert into ml_private.portfolio_profiles (
  id, studio_id, username_slug, headline
) values (
  '50000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'wp2-designer', 'Test profile'
);

insert into ml_public.publications (
  id, studio_id, profile_id, publication_type, source_id, public_path,
  snapshot_json, media_manifest, checksum, is_public, is_current,
  published_at, unpublished_at, created_by
) values
  (
    '60000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001', 'profile',
    '50000000-0000-4000-8000-000000000001', '/wp2-designer',
    '{"display_name":"WP2 Designer"}'::jsonb,
    '[{"role":"hero"}]'::jsonb, repeat('a', 64),
    false, false, null, null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001', 'profile',
    '50000000-0000-4000-8000-000000000001', '/wp2-designer',
    '{"display_name":"Draft"}'::jsonb, '[]'::jsonb, repeat('b', 64),
    false, false, null, null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001', 'profile',
    '50000000-0000-4000-8000-000000000001', '/wp2-designer',
    '{"display_name":"Old public cut"}'::jsonb, '[]'::jsonb, repeat('c', 64),
    true, false, now() - interval '1 day', null,
    '10000000-0000-4000-8000-000000000001'
  ),
  (
    '60000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001', 'profile',
    '50000000-0000-4000-8000-000000000001', '/wp2-designer',
    '{"display_name":"Unpublished"}'::jsonb, '[]'::jsonb, repeat('d', 64),
    false, false, now() - interval '2 days', now() - interval '1 day',
    '10000000-0000-4000-8000-000000000001'
  );

insert into ml_public.publication_assets (
  id, studio_id, publication_id, role, storage_path, mime_type,
  size_bytes, checksum, copied_from_checksum, width, height, alt_text
) values (
  '70000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '60000000-0000-4000-8000-000000000001', 'hero',
  'publications/60000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001/hero.webp',
  'image/webp', 1024, repeat('e', 64), repeat('f', 64),
  800, 1000, 'Public-safe test derivative'
);

update ml_public.publications
set is_public = true, is_current = true, published_at = now()
where id = '60000000-0000-4000-8000-000000000001';

select is(
  (select count(*) from pg_class relation
   join pg_namespace namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'ml_private'
     and relation.relkind = 'r' and not relation.relrowsecurity),
  0::bigint,
  'every canonical private table has RLS enabled'
);
select is(
  (select count(*) from pg_policies
   where schemaname = 'ml_private' and 'anon'::name = any (roles)),
  0::bigint,
  'no canonical private table grants an anon policy'
);
select is(
  (select count(*)
   from information_schema.tables table_info
   where table_info.table_schema = 'ml_private'
     and table_info.table_type = 'BASE TABLE'
     and table_info.table_name not in ('profiles', 'studios')
     and not exists (
       select 1 from information_schema.columns column_info
       where column_info.table_schema = table_info.table_schema
         and column_info.table_name = table_info.table_name
         and column_info.column_name = 'studio_id'
     )),
  0::bigint,
  'all tenant-owned canonical tables carry studio_id'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select is(
  ml_internal.is_studio_member('20000000-0000-4000-8000-000000000001'),
  true,
  'Studio A owner resolves as an active Studio A member'
);
select is(
  ml_internal.is_studio_member('20000000-0000-4000-8000-000000000002'),
  false,
  'Studio A owner is not a Studio B member'
);
select results_eq(
  $$select count(*) from ml_private.garments$$,
  array[1::bigint],
  'Studio A owner selects only Studio A garments'
);
select results_eq(
  $$select count(*) from ml_private.validation_waivers$$,
  array[1::bigint],
  'same-Studio owner reads immutable release waiver evidence'
);
select throws_like(
  $$insert into ml_private.validation_waivers (
      studio_id, spec_id, validation_run_id, rule_code, domain, reason,
      actor_id, follow_up_task_id
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '41000000-0000-4000-8000-000000000001',
      '42000000-0000-4000-8000-000000000001', 'bom.direct-client', 'bom',
      'Direct authenticated writes must remain unavailable.',
      '10000000-0000-4000-8000-000000000001',
      '43000000-0000-4000-8000-000000000001'
    )$$,
  '%permission denied for table validation_waivers%',
  'authenticated clients cannot forge waiver audit rows directly'
);
select results_eq(
  $$with changed as (
      update ml_private.garments
      set title = 'Studio A Garment Updated'
      where id = '40000000-0000-4000-8000-000000000001'
      returning 1
    ) select count(*) from changed$$,
  array[1::bigint],
  'Studio A owner can update a Studio A garment'
);
select results_eq(
  $$with changed as (
      update ml_private.garments
      set title = 'Cross-studio mutation'
      where id = '40000000-0000-4000-8000-000000000002'
      returning 1
    ) select count(*) from changed$$,
  array[0::bigint],
  'Studio A owner cannot update a Studio B garment'
);
select lives_ok(
  $$insert into ml_private.studio_settings (studio_id, units, currency)
    values ('20000000-0000-4000-8000-000000000001', 'in', 'USD')
    on conflict (studio_id) do update
    set units = excluded.units, currency = excluded.currency$$,
  'Studio owner can safely retry the singleton settings upsert during canonical migration'
);
select lives_ok(
  $$select ml_private.create_freeze_frame(
      '40000000-0000-4000-8000-000000000001', 'Owner design review',
      'Approved cross-domain direction', '{"domain":"all"}'::jsonb,
      '{"garment":{"id":"40000000-0000-4000-8000-000000000001"}}'::jsonb,
      repeat('1', 64)::ml_private.sha256_checksum,
      (select revision from ml_private.garments where id = '40000000-0000-4000-8000-000000000001'),
      '90000000-0000-4000-8000-000000000001', 'named'
    )$$,
  'Studio owner creates a fresh-revision named Freeze Frame through the command boundary'
);
select results_eq(
  $$select count(*) from ml_private.garment_versions version
    join ml_private.garments garment on garment.current_version_id = version.id
    where version.label = 'Owner design review' and version.parent_version_id is null
      and version.base_revision < garment.revision$$,
  array[1::bigint],
  'Freeze Frame becomes the current garment child and preserves its base revision'
);
select throws_ok(
  $$select ml_private.create_freeze_frame(
      '40000000-0000-4000-8000-000000000001', 'Stale frame', '',
      '{"domain":"all"}'::jsonb, '{}'::jsonb,
      repeat('2', 64)::ml_private.sha256_checksum, 1,
      '90000000-0000-4000-8000-000000000002', 'named'
    )$$,
  '40001',
  'Fresh server state is required; expected revision 1, found 3.',
  'stale Freeze Frame creation is rejected rather than blindly queued'
);
select lives_ok(
  $$select ml_private.create_freeze_frame(
      '40000000-0000-4000-8000-000000000001', 'Factory release frame',
      'Protected release evidence', '{"domain":"technical"}'::jsonb,
      '{"technical":{"status":"released"}}'::jsonb,
      repeat('3', 64)::ml_private.sha256_checksum,
      (select revision from ml_private.garments where id = '40000000-0000-4000-8000-000000000001'),
      '90000000-0000-4000-8000-000000000003', 'release'
    )$$,
  'Studio owner creates a release Freeze Frame as a child of the current frame'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
select results_eq(
  $$select count(*) from ml_private.validation_waivers$$,
  array[0::bigint],
  'cross-Studio owner cannot read Studio A waiver evidence'
);
select throws_like(
  $$insert into ml_private.studio_settings (studio_id, units, currency)
    values ('20000000-0000-4000-8000-000000000001', 'mm', 'EUR')
    on conflict (studio_id) do update
    set units = excluded.units, currency = excluded.currency$$,
  '%row-level security%',
  'Cross-studio owner cannot retry another Studio settings upsert'
);
select throws_like(
  $$insert into ml_private.garments (studio_id, garment_code, title)
    values ('20000000-0000-4000-8000-000000000001', 'GA-002', 'Forbidden garment')$$,
  '%row-level security%',
  'Studio B owner cannot insert a Studio A garment'
);
select throws_ok(
  $$select ml_private.create_freeze_frame(
      '40000000-0000-4000-8000-000000000001', 'Cross-studio frame', '',
      '{"domain":"all"}'::jsonb, '{}'::jsonb,
      repeat('4', 64)::ml_private.sha256_checksum, 4,
      '90000000-0000-4000-8000-000000000004', 'named'
    )$$,
  '42501',
  'Garment not found or caller cannot create a Freeze Frame.',
  'cross-Studio owners cannot create Freeze Frames for another Studio'
);
select throws_like(
  $$insert into ml_private.tasks (studio_id, garment_id, title)
    values (
      '20000000-0000-4000-8000-000000000002',
      '40000000-0000-4000-8000-000000000001',
      'Cross-studio relationship'
    )$$,
  '%foreign key constraint%',
  'composite foreign keys reject cross-studio relationships even for a valid writer'
);

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000003';
select results_eq(
  $$select count(*) from ml_private.garments$$,
  array[1::bigint],
  'reviewer role can read its Studio garments'
);
select results_eq(
  $$select count(*) from ml_private.validation_waivers$$,
  array[1::bigint],
  'same-Studio reviewer can inspect release waiver evidence'
);
select throws_like(
  $$insert into ml_private.garments (studio_id, garment_code, title)
    values ('20000000-0000-4000-8000-000000000001', 'GA-003', 'Reviewer write')$$,
  '%row-level security%',
  'reviewer role cannot write Studio records'
);

reset role;
set local role anon;
select throws_like(
  $$select count(*) from ml_private.garments$$,
  '%permission denied for schema ml_private%',
  'anonymous callers cannot access the private schema'
);
select results_eq(
  $$select count(*) from ml_public.publications$$,
  array[1::bigint],
  'anonymous callers see only one current public publication'
);
select results_eq(
  $$select public_path from ml_public.publications$$,
  array['/wp2-designer'::text],
  'anonymous publication reads return only the current public path'
);
select results_eq(
  $$select count(*) from ml_public.publication_assets$$,
  array[1::bigint],
  'anonymous callers see only copied assets for a current publication'
);
select throws_like(
  $$select ml_private.create_freeze_frame(
      '40000000-0000-4000-8000-000000000001', 'Anonymous frame', '',
      '{"domain":"all"}'::jsonb, '{}'::jsonb,
      repeat('5', 64)::ml_private.sha256_checksum, 4,
      '90000000-0000-4000-8000-000000000005', 'named'
    )$$,
  '%permission denied for schema ml_private%',
  'anonymous callers cannot invoke private Freeze Frame commands'
);

reset role;
select throws_ok(
  $$update ml_private.change_events
    set origin = 'system'
    where operation_id = '90000000-0000-4000-8000-000000000001'$$,
  '23514',
  'Version history is append-only; create a new event or Freeze Frame.',
  'change ledger rows cannot be rewritten'
);
select throws_ok(
  $$delete from ml_private.entity_revisions
    where garment_version_id = (
      select id from ml_private.garment_versions where label = 'Owner design review'
    )$$,
  '23514',
  'Version history is append-only; create a new event or Freeze Frame.',
  'entity revision evidence cannot be deleted'
);
update ml_private.technical_specs
set release_version_id = (
  select id from ml_private.garment_versions where label = 'Factory release frame'
)
where id = '41000000-0000-4000-8000-000000000001';
select throws_ok(
  $$delete from ml_private.garment_versions where label = 'Factory release frame'$$,
  '23503',
  'Freeze Frame is protected by a release, export, order, or publication.',
  'release-referenced Freeze Frames cannot be deleted'
);
insert into ml_private.portfolio_projects (
  id, studio_id, profile_id, garment_id, slug, case_study_json, visibility
) values (
  '51000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  'studio-a-garment', '{}', 'ready'
);
insert into ml_public.publications (
  id, studio_id, profile_id, publication_type, source_id, source_version_id,
  portfolio_project_id, public_path, snapshot_json, media_manifest, checksum,
  is_public, is_current, created_by
) values (
  '60000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001', 'project',
  '51000000-0000-4000-8000-000000000001',
  (select id from ml_private.garment_versions where label = 'Owner design review'),
  '51000000-0000-4000-8000-000000000001',
  '/wp2-designer/studio-a-garment', '{"display_name":"Stale cut"}'::jsonb,
  '[]'::jsonb, repeat('6', 64), false, false,
  '10000000-0000-4000-8000-000000000001'
);
select throws_ok(
  $$update ml_public.publications set is_public = true, published_at = now()
    where id = '60000000-0000-4000-8000-000000000005'$$,
  '40001',
  'Fresh server state is required; publication source is not the current Freeze Frame.',
  'publication cannot use a stale Freeze Frame as its fresh source'
);
select throws_ok(
  $$insert into ml_public.publications (
      studio_id, profile_id, publication_type, source_id, public_path,
      snapshot_json, checksum
    ) values (
      '20000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001', 'profile',
      '50000000-0000-4000-8000-000000000001', '/wp2-private-key',
      '{"unit_cost":45}'::jsonb, repeat('9', 64)
    )$$,
  '23514',
  'Publication snapshot contains a private-only key.',
  'public snapshots reject private-only keys recursively'
);
select throws_ok(
  $$update ml_public.publications
    set snapshot_json = '{"display_name":"Mutated"}'::jsonb
    where id = '60000000-0000-4000-8000-000000000001'$$,
  '23514',
  'Publication payloads are immutable; create a new publication snapshot.',
  'published snapshot payloads are immutable'
);
select is(
  ml_internal.storage_studio_id(
    'studios/20000000-0000-4000-8000-000000000001/assets/asset/file.webp'
  ),
  '20000000-0000-4000-8000-000000000001'::uuid,
  'private storage helper parses the tenant path'
);
select is(
  ml_internal.storage_studio_id('users/10000000-0000-4000-8000-000000000001/file.webp'),
  null::uuid,
  'legacy or malformed paths do not resolve as canonical Studio paths'
);
select is(
  (select count(*) from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'ml_%_assets_%'),
  8::bigint,
  'all canonical private and public Storage operation policies are installed'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select ml_private.unpublish_publication('60000000-0000-4000-8000-000000000001')$$,
  'Studio A owner can unpublish after copied public objects are removed'
);

set local role anon;
select results_eq(
  $$select count(*) from ml_public.publications$$,
  array[0::bigint],
  'unpublishing removes anonymous publication access without deleting history'
);
select results_eq(
  $$select count(*) from ml_public.publication_assets$$,
  array[0::bigint],
  'unpublishing removes anonymous access to the copied-asset manifest'
);

reset role;
select is(
  (select count(*) from ml_private.change_events
   where operation_id = '60000000-0000-4000-8000-000000000001'
     and operation = 'unpublish'),
  1::bigint,
  'unpublication emits one immutable change event'
);
select throws_ok(
  $$delete from ml_public.publication_assets
    where id = '70000000-0000-4000-8000-000000000001'$$,
  '23514',
  'Published asset manifests are retained as immutable history.',
  'unpublication retains the immutable copied-asset manifest history'
);

select * from finish();
rollback;
