begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private;

select plan(9);

select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'ml_private'
     and routine_name = 'finalize_trusted_device_import'
     and grantee = 'service_role'
     and privilege_type = 'EXECUTE'),
  1::bigint,
  'trusted device finalizer is executable by the service role'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where routine_schema = 'ml_private'
     and routine_name = 'finalize_trusted_device_import'
     and grantee in ('anon', 'authenticated')),
  0::bigint,
  'browser roles cannot execute the trusted device finalizer'
);

insert into auth.users (id, email) values
  ('16000000-0000-4000-8000-000000000001', 'trusted-import-owner@example.test');
insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('26000000-0000-4000-8000-000000000001', '16000000-0000-4000-8000-000000000001', 'Trusted import Studio', 'trusted-import-studio');
insert into ml_private.garments (id, studio_id, garment_code, title) values
  ('46000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', 'TI-001', 'Trusted import garment');
insert into ml_private.technical_specs (id, studio_id, garment_id, base_size, unit) values
  ('56000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001', '46000000-0000-4000-8000-000000000001', 'M', 'cm');
insert into ml_private.garment_versions (
  id, studio_id, garment_id, version_no, label, scope_json, snapshot_json,
  checksum, created_by, base_revision
) values (
  '66000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001',
  '46000000-0000-4000-8000-000000000001', 1, 'Imported checkpoint',
  '{"domain":"all"}'::jsonb, '{"schemaVersion":10}'::jsonb, repeat('a', 64),
  '16000000-0000-4000-8000-000000000001', 1
);
insert into ml_private.validation_runs (
  id, studio_id, spec_id, garment_version_id, status, ruleset_version,
  result_json, created_by
) values (
  '76000000-0000-4000-8000-000000000001', '26000000-0000-4000-8000-000000000001',
  '56000000-0000-4000-8000-000000000001', '66000000-0000-4000-8000-000000000001',
  'passed', 'trusted-import-v1', '{"issues":[]}'::jsonb,
  '16000000-0000-4000-8000-000000000001'
);

set local role authenticated;
set local request.jwt.claim.sub = '16000000-0000-4000-8000-000000000001';
select throws_like(
  $$select ml_private.finalize_trusted_device_import(
    '26000000-0000-4000-8000-000000000001', 'isolated-beta-device-import-v1',
    '[]'::jsonb, '[]'::jsonb)$$,
  '%permission denied for function finalize_trusted_device_import%',
  'authenticated owners cannot enter the trusted migration context'
);

set local role service_role;
select throws_ok(
  $$select ml_private.finalize_trusted_device_import(
    '26000000-0000-4000-8000-000000000001', 'wrong-confirmation',
    '[]'::jsonb, '[]'::jsonb)$$,
  '42501',
  'Trusted device import confirmation and service role are required.',
  'service role still requires the isolated-beta confirmation phrase'
);
select is(
  ml_private.finalize_trusted_device_import(
    '26000000-0000-4000-8000-000000000001',
    'isolated-beta-device-import-v1',
    '[{"id":"46000000-0000-4000-8000-000000000001","currentVersionId":"66000000-0000-4000-8000-000000000001","revision":7,"updatedAt":"2026-08-27T12:00:00Z"}]'::jsonb,
    '[{"id":"56000000-0000-4000-8000-000000000001","releaseValidationRunId":"76000000-0000-4000-8000-000000000001","revision":9,"updatedAt":"2026-08-27T12:05:00Z"}]'::jsonb
  ) ->> 'status',
  'applied',
  'service role restores circular evidence pins in one trusted completion step'
);
select results_eq(
  $$select current_version_id, revision from ml_private.garments
    where id = '46000000-0000-4000-8000-000000000001'$$,
  $$values ('66000000-0000-4000-8000-000000000001'::uuid, 7::bigint)$$,
  'garment current-version identity and imported revision are preserved exactly'
);
select results_eq(
  $$select release_validation_run_id, revision from ml_private.technical_specs
    where id = '56000000-0000-4000-8000-000000000001'$$,
  $$values ('76000000-0000-4000-8000-000000000001'::uuid, 9::bigint)$$,
  'technical validation identity and imported revision are preserved exactly'
);

reset role;
update ml_private.garments
set title = 'Normal post-import update'
where id = '46000000-0000-4000-8000-000000000001';
select is(
  (select revision from ml_private.garments where id = '46000000-0000-4000-8000-000000000001'),
  8::bigint,
  'trusted migration context is cleared before later ordinary writes'
);
select is(
  (select title from ml_private.garments where id = '46000000-0000-4000-8000-000000000001'),
  'Normal post-import update',
  'ordinary post-import updates remain functional'
);

select * from finish();
rollback;
