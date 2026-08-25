begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(33);

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

set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000002';
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

reset role;
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
