begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(13);

select has_table('ml_private', 'material_variant_profiles', 'material variant profiles are canonical rows');
select has_table('ml_private', 'material_variant_media', 'material media is a relational canonical join');
select is(
  (select count(*) from information_schema.columns where table_schema = 'ml_private'
    and table_name = 'material_variant_profiles' and column_name in (
      'country_of_origin','secondary_colors','weave_or_knit','stretch','opacity','drape',
      'hand_feel','texture','structure','rarity','best_uses','care_notes','mood_tags',
      'lore_note','private_notes','purchase_date','storage_location','bin_number','shelf','storage_status'
    )),
  20::bigint,
  'V1 textile details remain explicit canonical columns'
);
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'ml_private' and c.relname in ('material_variant_profiles','material_variant_media')
      and c.relrowsecurity and c.relforcerowsecurity),
  2::bigint,
  'material visual tables force RLS'
);
select is(
  (select count(*) from pg_policies where schemaname = 'ml_private'
    and tablename in ('material_variant_profiles','material_variant_media')
    and policyname in ('studio_select','studio_insert','studio_update','studio_delete')),
  8::bigint,
  'material visual tables use membership-derived policies'
);
select is(
  (select count(*) from information_schema.table_privileges where table_schema = 'ml_private'
    and table_name in ('material_variant_profiles','material_variant_media')
    and grantee = 'authenticated' and privilege_type = 'SELECT'),
  2::bigint,
  'authenticated hydration receives explicit SELECT grants'
);
select is(
  (select count(*) from information_schema.table_privileges where table_schema = 'ml_private'
    and table_name in ('material_variant_profiles','material_variant_media')
    and grantee in ('anon','authenticated') and privilege_type in ('INSERT','UPDATE','DELETE')),
  0::bigint,
  'direct browser writes remain unavailable outside the canonical RPC'
);
select is(ml_internal.canonical_client_table('material_variant_media'), 'material_variant_media', 'material media is statically RPC allowlisted');
select ok('framing_json' = any(ml_internal.canonical_client_columns('material_variant_media')), 'material framing is an explicit mutable column');
select ok(ml_internal.canonical_delete_allowed('material_variant_media'), 'material media can be removed through the coordinated RPC');
select ok(
  (select with_check ilike '%garments%' from pg_policies where schemaname = 'storage'
    and tablename = 'objects' and policyname = 'ml_studio_assets_insert_writer'),
  'the existing private garment upload path is accepted by Storage RLS'
);
select is(
  (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
    and policyname like 'ml_studio_assets_%' and 'anon'::name = any(roles)),
  0::bigint,
  'anonymous users receive no private Studio Storage policy'
);

set local role anon;
select throws_ok(
  $$select count(*) from ml_private.material_variant_profiles$$,
  '42501',
  'permission denied for schema ml_private',
  'anonymous callers cannot read material profiles'
);
reset role;

select * from finish();
rollback;
