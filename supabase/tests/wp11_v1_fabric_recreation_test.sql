begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private;

select plan(17);

select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'ml_private'
     and routine_name = 'apply_trusted_v1_fabric_relationships'
     and grantee = 'service_role'
     and privilege_type = 'EXECUTE'),
  1::bigint,
  'V1 fabric recreation command is executable by the service role'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'ml_private'
     and routine_name = 'apply_trusted_v1_fabric_relationships'
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'browser roles cannot execute the V1 fabric recreation command'
);

insert into auth.users (id, email) values
  ('17000000-0000-4000-8000-000000000001', 'fabric-recreation-owner@example.test');
insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('27000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001', 'Fabric recreation Studio', 'fabric-recreation-studio'),
  ('27000000-0000-4000-8000-000000000002', '17000000-0000-4000-8000-000000000001', 'Other Studio', 'fabric-recreation-other');
insert into ml_private.garments (id, studio_id, garment_code, title) values
  ('47000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', 'FR-001', 'Fabric recreation garment'),
  ('47000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000002', 'FR-002', 'Other garment');
insert into ml_private.materials (id, studio_id, material_code, name, category) values
  ('37000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', 'MAT-FR-001', 'Recreated wool', 'Wool');
insert into ml_private.material_variants (id, studio_id, material_id, color_name) values
  ('57000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', '37000000-0000-4000-8000-000000000001', 'Black');

set local role authenticated;
set local request.jwt.claim.sub = '17000000-0000-4000-8000-000000000001';
select throws_like(
  $$select ml_private.apply_trusted_v1_fabric_relationships(
    '27000000-0000-4000-8000-000000000001', 'read-v1-write-beta-no-media', '[]'::jsonb)$$,
  '%permission denied for function apply_trusted_v1_fabric_relationships%',
  'authenticated owners cannot enter the trusted recreation context'
);

set local role service_role;
select throws_ok(
  $$select ml_private.apply_trusted_v1_fabric_relationships(
    '27000000-0000-4000-8000-000000000001', 'wrong-confirmation', '[]'::jsonb)$$,
  '42501',
  'Trusted V1 fabric recreation confirmation and service role are required.',
  'service role still requires the exact no-media confirmation'
);
select throws_ok(
  $$select ml_private.apply_trusted_v1_fabric_relationships(
    '27000000-0000-4000-8000-000000000001', 'read-v1-write-beta-no-media',
    '[{"id":"67000000-0000-4000-8000-000000000001","garmentId":"47000000-0000-4000-8000-000000000001","variantId":"57000000-0000-4000-8000-000000000001","role":"shell","requiredQuantity":2.5,"reservedQuantity":0,"unit":"yd","status":"planned","createdAt":"2026-08-30T12:00:00Z","updatedAt":"2026-08-30T12:00:00Z","unsupported":true}]'::jsonb)$$,
  '22023',
  'Trusted V1 fabric relationship contains unsupported fields.',
  'the trusted command rejects non-allowlisted fields'
);
select throws_ok(
  $$select ml_private.apply_trusted_v1_fabric_relationships(
    '27000000-0000-4000-8000-000000000001', 'read-v1-write-beta-no-media',
    '[{"id":"67000000-0000-4000-8000-000000000002","garmentId":"47000000-0000-4000-8000-000000000002","variantId":"57000000-0000-4000-8000-000000000001","role":"shell","requiredQuantity":2.5,"reservedQuantity":0,"unit":"yd","status":"planned"}]'::jsonb)$$,
  '23503',
  'Trusted V1 fabric relationship references a row outside the target Studio.',
  'cross-Studio relationships are rejected'
);

select is(
  ml_private.apply_trusted_v1_fabric_relationships(
    '27000000-0000-4000-8000-000000000001', 'read-v1-write-beta-no-media',
    '[{"id":"67000000-0000-4000-8000-000000000001","garmentId":"47000000-0000-4000-8000-000000000001","variantId":"57000000-0000-4000-8000-000000000001","role":"shell","requiredQuantity":2.5,"reservedQuantity":0,"unit":"yd","status":"planned","createdAt":"2026-08-30T12:00:00Z","updatedAt":"2026-08-30T12:00:00Z"}]'::jsonb
  ) ->> 'inserted',
  '1',
  'a reviewed relationship is inserted'
);
select is(
  (select count(*) from ml_private.garment_materials where id = '67000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the canonical garment/material link exists once'
);
select results_eq(
  $$select role, required_quantity::numeric, unit::text from ml_private.garment_materials
    where id = '67000000-0000-4000-8000-000000000001'$$,
  $$values ('shell'::text, 2.5::numeric, 'yd'::text)$$,
  'role, yardage, and unit are preserved'
);
select is(
  ml_private.apply_trusted_v1_fabric_relationships(
    '27000000-0000-4000-8000-000000000001', 'read-v1-write-beta-no-media',
    '[{"id":"67000000-0000-4000-8000-000000000001","garmentId":"47000000-0000-4000-8000-000000000001","variantId":"57000000-0000-4000-8000-000000000001","role":"shell","requiredQuantity":2.5,"reservedQuantity":0,"unit":"yd","status":"planned"}]'::jsonb
  ) ->> 'unchanged',
  '1',
  'an identical retry is idempotent'
);
select is(
  (select count(*) from ml_private.material_variant_media where studio_id = '27000000-0000-4000-8000-000000000001'),
  0::bigint,
  'fabric recreation creates no media relationship'
);

select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'ml_private'
     and routine_name = 'detach_trusted_v1_fabric_media_links'
     and grantee = 'service_role'
     and privilege_type = 'EXECUTE'),
  1::bigint,
  'V1 media cleanup is executable by the service role'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'ml_private'
     and routine_name = 'detach_trusted_v1_fabric_media_links'
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'browser roles cannot execute the V1 media cleanup'
);

reset role;
insert into ml_private.media_assets (
  id, studio_id, created_by, storage_path, original_filename,
  mime_type, size_bytes, checksum, rights_json
) values
  ('77000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001', 'studios/27000000-0000-4000-8000-000000000001/assets/v1.jpg', 'v1.jpg', 'image/jpeg', 10, repeat('a', 64), '{"migrationSource":"mystic-lore-v1"}'::jsonb),
  ('77000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000001', '17000000-0000-4000-8000-000000000001', 'studios/27000000-0000-4000-8000-000000000001/assets/v2.jpg', 'v2.jpg', 'image/jpeg', 10, repeat('b', 64), '{}'::jsonb);
insert into ml_private.material_variant_media (id, studio_id, variant_id, asset_id, role) values
  ('87000000-0000-4000-8000-000000000001', '27000000-0000-4000-8000-000000000001', '57000000-0000-4000-8000-000000000001', '77000000-0000-4000-8000-000000000001', 'swatch'),
  ('87000000-0000-4000-8000-000000000002', '27000000-0000-4000-8000-000000000001', '57000000-0000-4000-8000-000000000001', '77000000-0000-4000-8000-000000000002', 'reference');

set local role authenticated;
select throws_like(
  $$select ml_private.detach_trusted_v1_fabric_media_links(
    '27000000-0000-4000-8000-000000000001', 'detach-v1-fabric-links-preserve-assets')$$,
  '%permission denied for function detach_trusted_v1_fabric_media_links%',
  'authenticated owners cannot invoke trusted V1 media cleanup'
);
set local role service_role;
select is(
  ml_private.detach_trusted_v1_fabric_media_links(
    '27000000-0000-4000-8000-000000000001', 'detach-v1-fabric-links-preserve-assets'
  ) ->> 'detached',
  '1',
  'only the V1-tagged fabric media link is detached'
);
select is(
  (select count(*) from ml_private.material_variant_media where id = '87000000-0000-4000-8000-000000000002'),
  1::bigint,
  'genuine V2 material media remains linked'
);
select is(
  (select count(*) from ml_private.media_assets where id in (
    '77000000-0000-4000-8000-000000000001', '77000000-0000-4000-8000-000000000002'
  )),
  2::bigint,
  'both underlying assets remain preserved for recovery'
);

select * from finish();
rollback;
