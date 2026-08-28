begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(24);

select is(
  (select count(*) from information_schema.routines
   where routine_schema = 'ml_private' and routine_name in (
     'create_canonical_freeze_frame', 'commit_canonical_restore',
     'release_technical_spec', 'record_tech_pack_export',
     'record_editorial_export', 'commit_qc_waiver',
     'decide_qc_inspection', 'transition_ai_job',
     'record_ai_validation_candidate', 'delete_freeze_frame'
   )),
  10::bigint,
  'all protected WP4-WP9 command boundaries are installed'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where grantee = 'authenticated' and routine_schema = 'ml_private'
     and routine_name in (
       'create_canonical_freeze_frame', 'commit_canonical_restore',
       'release_technical_spec', 'record_tech_pack_export',
       'record_editorial_export', 'commit_qc_waiver',
       'decide_qc_inspection', 'transition_ai_job',
       'record_ai_validation_candidate', 'delete_freeze_frame'
     ) and privilege_type = 'EXECUTE'),
  10::bigint,
  'authenticated callers receive only command execution grants'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where grantee = 'anon' and routine_schema = 'ml_private'
     and routine_name in ('release_technical_spec', 'record_editorial_export', 'transition_ai_job')),
  0::bigint,
  'anonymous callers cannot execute protected commands'
);
select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'authenticated' and table_schema = 'ml_private'
     and table_name in ('editorial_exports', 'tech_pack_exports')
     and privilege_type = 'INSERT'),
  0::bigint,
  'browser roles cannot directly forge export evidence'
);

insert into auth.users (id, email) values
  ('13000000-0000-4000-8000-000000000001', 'protected-owner@example.test'),
  ('13000000-0000-4000-8000-000000000002', 'protected-reviewer@example.test');
insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Protected Studio', 'protected-studio');
insert into ml_private.studio_members (studio_id, user_id, role, status, joined_at) values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000002', 'reviewer', 'active', now());
insert into ml_private.garments (id, studio_id, garment_code, title) values
  ('43000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'PC-001', 'Protected garment');
insert into ml_private.technical_specs (id, studio_id, garment_id, base_size, unit, status) values
  ('44000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 'M', 'cm', 'approved');
insert into ml_private.editorial_collections (
  id, studio_id, garment_id, title, template_type, status, subtitle,
  description, transition_json, export_settings_json
) values (
  '45000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001', 'Protected editorial', 'campaign',
  'approved', '', '', '{}'::jsonb, '{}'::jsonb
);
update ml_private.studio_settings
set version_policy = '{"canonicalPersistence":"cloud"}'
where studio_id = '23000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';

select is(
  ml_private.create_canonical_freeze_frame(
    '43000000-0000-4000-8000-000000000001', 'Named checkpoint', '',
    '{"domain":"all"}'::jsonb, '{"schemaVersion":1,"scope":"all"}'::jsonb,
    repeat('a', 64), 1, '63000000-0000-4000-8000-000000000001', 'named'
  ) ->> 'status',
  'applied',
  'owner creates a Freeze Frame from fresh server state'
);
select is(
  (select count(*) from ml_private.garment_versions
   where garment_id = '43000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Freeze Frame command creates one immutable version'
);
select is(
  (select revision from ml_private.garments where id = '43000000-0000-4000-8000-000000000001'),
  2::bigint,
  'Freeze Frame advances the authoritative garment revision'
);
select is(
  ml_private.create_canonical_freeze_frame(
    '43000000-0000-4000-8000-000000000001', 'Named checkpoint', '',
    '{"domain":"all"}'::jsonb, '{"schemaVersion":1,"scope":"all"}'::jsonb,
    repeat('a', 64), 1, '63000000-0000-4000-8000-000000000001', 'named'
  ) ->> 'status',
  'applied',
  'retry returns the original protected receipt without replay'
);
select is(
  (select count(*) from ml_private.garment_versions
   where garment_id = '43000000-0000-4000-8000-000000000001'),
  1::bigint,
  'Freeze Frame retry does not duplicate evidence'
);
select throws_ok(
  $$select ml_private.create_canonical_freeze_frame(
    '43000000-0000-4000-8000-000000000001', 'Stale checkpoint', '',
    '{"domain":"all"}'::jsonb, '{"schemaVersion":1}'::jsonb, repeat('b', 64),
    1, '63000000-0000-4000-8000-000000000002', 'named')$$,
  '40001',
  'Fresh server state is required; expected revision 1, found 2.',
  'stale Freeze Frame creation is rejected'
);

select is(
  ml_private.commit_canonical_restore(
    '23000000-0000-4000-8000-000000000001',
    '43000000-0000-4000-8000-000000000001',
    (select current_version_id from ml_private.garments where id = '43000000-0000-4000-8000-000000000001'),
    'Restore checkpoint', 'Restore the reviewed all-domain checkpoint.',
    '{"domain":"all"}'::jsonb, '{"schemaVersion":1,"scope":"all"}'::jsonb,
    repeat('f', 64), 2,
    '63000000-0000-4000-8000-000000000005',
    '63000000-0000-4000-8000-000000000006',
    '["garment.title"]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    repeat('1', 64), '[]'::jsonb
  ) ->> 'status',
  'applied',
  'a restore with no normalized child-row changes still creates protected evidence'
);
select is(
  (select count(*) from ml_private.restore_operations where garment_id = '43000000-0000-4000-8000-000000000001'),
  1::bigint,
  'restore records append-only replay evidence'
);
select is(
  (select revision from ml_private.garments where id = '43000000-0000-4000-8000-000000000001'),
  3::bigint,
  'restore advances the garment revision without rewriting earlier versions'
);

select is(
  ml_private.record_editorial_export(
    '45000000-0000-4000-8000-000000000001', 1,
    '63000000-0000-4000-8000-000000000003',
    jsonb_build_object(
      'id', '65000000-0000-4000-8000-000000000001',
      'collectionId', '45000000-0000-4000-8000-000000000001',
      'collectionRevision', 1, 'format', 'pdf', 'checksum', repeat('c', 64),
      'storagePath', 'studios/23000000-0000-4000-8000-000000000001/editorial/exports/45000000-0000-4000-8000-000000000001/pdf-c.pdf',
      'sourceGarmentVersionId', null, 'manifest', '{}'::jsonb,
      'generatedAt', now(), 'approvedBy', null, 'approvedAt', null,
      'createdAt', now(), 'updatedAt', now()
    )
  ) ->> 'status',
  'applied',
  'editorial export is committed through its fresh-state command'
);
select is(
  (select count(*) from ml_private.editorial_exports where collection_id = '45000000-0000-4000-8000-000000000001'),
  1::bigint,
  'editorial export stores one immutable manifest'
);
select is(
  (select count(*) from ml_private.change_events
   where operation_id = '63000000-0000-4000-8000-000000000003'
     and entity_type = 'editorial_export'),
  1::bigint,
  'editorial export emits attributable ledger evidence'
);
select throws_ok(
  $$insert into ml_private.editorial_exports (
    studio_id, collection_id, collection_revision, format, checksum,
    storage_path, manifest_json
  ) values (
    '23000000-0000-4000-8000-000000000001',
    '45000000-0000-4000-8000-000000000001', 1, 'pdf', repeat('d',64),
    'studios/23000000-0000-4000-8000-000000000001/editorial/exports/45000000-0000-4000-8000-000000000001/direct.pdf', '{}'::jsonb
  )$$,
  '42501',
  'permission denied for table editorial_exports',
  'browser cannot bypass the editorial export command'
);

reset role;
insert into ml_private.ai_jobs (
  id, studio_id, garment_id, requested_by, job_type, status, model,
  prompt_version, provider, idempotency_key, source_checksum
) values (
  '55000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
  '43000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001',
  'pom_assistance', 'queued', 'fake-v1', 'wp9-pom-v1', 'deterministic_fake',
  'protected-transition', repeat('e', 64)
);
set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';
select is(
  ml_private.transition_ai_job('55000000-0000-4000-8000-000000000001', 1, 'running') ->> 'jobStatus',
  'running',
  'provider lifecycle command starts a queued AI job'
);
select is(
  (select revision from ml_private.ai_jobs where id = '55000000-0000-4000-8000-000000000001'),
  2::bigint,
  'AI transition assigns the authoritative next revision'
);
select is(
  ml_private.transition_ai_job('55000000-0000-4000-8000-000000000001', 1, 'running') ->> 'status',
  'duplicate',
  'lost-response retry recognizes the completed AI transition'
);

set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select ml_private.transition_ai_job('55000000-0000-4000-8000-000000000001', 2, 'failed', 'reviewer_attempt')$$,
  '42501',
  'AI job is unavailable.',
  'reviewer cannot invoke provider-owned AI transitions'
);
select throws_ok(
  $$select ml_private.record_editorial_export(
    '45000000-0000-4000-8000-000000000001', 1,
    '63000000-0000-4000-8000-000000000004', '{}'::jsonb)$$,
  '42501',
  'Editorial collection is unavailable.',
  'reviewer cannot commit editorial export evidence'
);

set local role anon;
select throws_like(
  $$select ml_private.transition_ai_job('55000000-0000-4000-8000-000000000001', 2, 'failed')$$,
  '%permission denied for schema ml_private%',
  'anonymous access cannot reach protected command schemas'
);

reset role;
select is(
  (select count(*) from ml_private.canonical_operation_receipts
   where id in (
     '63000000-0000-4000-8000-000000000001',
     '63000000-0000-4000-8000-000000000003'
   )),
  2::bigint,
  'protected retry evidence is append-only and operation-scoped'
);

select * from finish();
rollback;
