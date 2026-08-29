begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(36);

select has_table(
  'ml_private', 'canonical_operation_receipts',
  'canonical operation retry receipts are persisted'
);
select has_function(
  'ml_private', 'commit_canonical_operation',
  array['uuid', 'uuid', 'uuid', 'text', 'jsonb'],
  'the canonical transactional command is installed'
);
select has_function(
  'ml_internal', 'canonical_client_columns', array['text'],
  'the browser mutation surface is an explicit checked-in column allowlist'
);
select is(
  (select prosecdef from pg_proc where oid = 'ml_private.commit_canonical_operation(uuid,uuid,uuid,text,jsonb)'::regprocedure),
  false,
  'canonical writes remain security-invoker operations'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where grantee = 'authenticated'
     and routine_schema = 'ml_private'
     and routine_name = 'commit_canonical_operation'
     and privilege_type = 'EXECUTE'),
  1::bigint,
  'authenticated clients may execute only the typed operation boundary'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where grantee = 'anon'
     and routine_schema = 'ml_private'
     and routine_name = 'commit_canonical_operation'
     and privilege_type = 'EXECUTE'),
  0::bigint,
  'anonymous clients cannot execute canonical operations'
);
select is(
  (select count(*) from pg_trigger trigger
   join pg_class relation on relation.oid = trigger.tgrelid
   join pg_namespace namespace on namespace.oid = relation.relnamespace
   where not trigger.tgisinternal
     and namespace.nspname = 'ml_private'
     and relation.relname in ('garments', 'tasks')
     and trigger.tgname in ('canonical_operation_guard', 'canonical_operation_audit')),
  4::bigint,
  'canonical roots and child rows install both guard and audit triggers'
);
select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'authenticated'
     and table_schema = 'ml_private'
     and table_name = 'canonical_operation_receipts'
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE')),
  0::bigint,
  'browser roles cannot forge or alter operation receipts'
);

insert into auth.users (id, email) values
  ('12000000-0000-4000-8000-000000000001', 'transport-owner-a@example.test'),
  ('12000000-0000-4000-8000-000000000002', 'transport-owner-b@example.test'),
  ('12000000-0000-4000-8000-000000000003', 'transport-reviewer-a@example.test');

insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'Transport Studio A', 'transport-studio-a'),
  ('22000000-0000-4000-8000-000000000002', '12000000-0000-4000-8000-000000000002', 'Transport Studio B', 'transport-studio-b');
insert into ml_private.studio_members (studio_id, user_id, role, status, joined_at) values
  ('22000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000003', 'reviewer', 'active', now());

insert into ml_private.garments (id, studio_id, garment_code, title) values
  ('42000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'TX-001', 'Transport garment A'),
  ('42000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'TX-002', 'Transport garment B');
insert into ml_private.tasks (id, studio_id, garment_id, title) values
  ('52000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'First transport task'),
  ('52000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'Second transport task');
insert into ml_private.materials (id, studio_id, material_code, name, category) values
  ('43000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'TX-MAT-001', 'Transport material', 'woven');
insert into ml_private.material_variants (id, studio_id, material_id, sku) values
  ('44000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 'TX-MAT-001-BLK');
update ml_private.studio_settings
set version_policy = '{"canonicalPersistence":"cloud"}'
where studio_id = '22000000-0000-4000-8000-000000000001';

set local role authenticated;
set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';

select ok(
  has_column_privilege('authenticated', 'ml_private.inventory_entries', 'id', 'update'),
  'the atomic command can acquire its inventory preflight row lock'
);
select ok(
  not has_column_privilege('authenticated', 'ml_private.inventory_entries', 'note', 'update'),
  'inventory business fields remain non-updatable for authenticated clients'
);
select is(
  ml_private.commit_canonical_operation(
    '61000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    null,
    'sync',
    '[{"entityType":"inventory_entries","entityId":"45000000-0000-4000-8000-000000000001","action":"insert","baseRevision":null,"row":{"variant_id":"44000000-0000-4000-8000-000000000001","entry_type":"receive","quantity":1,"unit":"m","note":"First shadow import"}}]'::jsonb
  ) ->> 'status',
  'applied',
  'a first shadow import can append inventory through the atomic command'
);
select is(
  (select count(*) from ml_private.inventory_entries
   where id = '45000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the inventory append is persisted once'
);
select throws_like(
  $$update ml_private.inventory_entries
    set note = 'Forbidden direct rewrite'
    where id = '45000000-0000-4000-8000-000000000001'$$,
  '%permission denied for table inventory_entries%',
  'direct authenticated updates still cannot reach append-only inventory rows'
);

select throws_ok(
  $$update ml_private.tasks set title = 'Forbidden direct edit' where id = '52000000-0000-4000-8000-000000000001'$$,
  '42501',
  'Canonical cloud writes must use commit_canonical_operation.',
  'ordinary browser writes cannot bypass the operation transaction'
);

update ml_private.studio_settings
set version_policy = '{"canonicalPersistence":"shadow"}'
where studio_id = '22000000-0000-4000-8000-000000000001';
select throws_ok(
  $$update ml_private.tasks set title = 'Forbidden shadow edit' where id = '52000000-0000-4000-8000-000000000001'$$,
  '42501',
  'Canonical cloud writes must use commit_canonical_operation.',
  'shadow mode also exercises the transactional operation and RLS boundary'
);
update ml_private.studio_settings
set version_policy = '{"canonicalPersistence":"cloud"}'
where studio_id = '22000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000010','22000000-0000-4000-8000-000000000001',null,'user','[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{"updated_at":"2026-01-01T00:00:00Z"}}]'::jsonb)$$,
  '42501',
  'Canonical mutation for tasks contains a server-owned or unknown column.',
  'generic mutations cannot assign server-owned timestamp columns'
);
select throws_ok(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000011','22000000-0000-4000-8000-000000000001',null,'user','[{"entityType":"garments","entityId":"42000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{"garment_code":"FORGED"}}]'::jsonb)$$,
  '42501',
  'Stable identity columns cannot be changed after insert.',
  'generic mutations cannot rewrite stable identity columns'
);
select throws_ok(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000012','22000000-0000-4000-8000-000000000001',null,'user','[{"entityType":"ai_jobs","entityId":"72000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{}}]'::jsonb)$$,
  '42501',
  'AI job lifecycle changes require the governed transition command.',
  'generic operations cannot bypass the governed AI lifecycle command'
);

select is(
  ml_private.commit_canonical_operation(
    '62000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'user',
    '[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{"title":"Committed task title"}}]'::jsonb
  ) ->> 'status',
  'applied',
  'an owner atomically applies a fresh canonical mutation'
);
select is(
  (select title from ml_private.tasks where id = '52000000-0000-4000-8000-000000000001'),
  'Committed task title',
  'the authoritative normalized row is updated'
);
select is(
  (select revision from ml_private.tasks where id = '52000000-0000-4000-8000-000000000001'),
  2::bigint,
  'the server assigns the next authoritative revision'
);
select is(
  (select count(*) from ml_private.change_events
   where operation_id = '62000000-0000-4000-8000-000000000001'
     and entity_type = 'tasks' and operation = 'update'),
  1::bigint,
  'the database derives exactly one change event from the written row'
);
select is(
  (select count(*) from ml_private.canonical_operation_receipts
   where id = '62000000-0000-4000-8000-000000000001'),
  1::bigint,
  'the applied operation has one append-only retry receipt'
);
select is(
  ml_private.commit_canonical_operation(
    '62000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'user',
    '[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{"title":"Committed task title"}}]'::jsonb
  ) ->> 'status',
  'duplicate',
  'an identical operation ID is treated as completed without replay'
);
select throws_ok(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000001','22000000-0000-4000-8000-000000000001','42000000-0000-4000-8000-000000000001','user','[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{"title":"Different request"}}]'::jsonb)$$,
  '23505',
  'Operation ID was already used for a different canonical request.',
  'an operation ID cannot be replayed with a different request body'
);
select is(
  (select revision from ml_private.tasks where id = '52000000-0000-4000-8000-000000000001'),
  2::bigint,
  'a duplicate operation does not increment the row twice'
);

select is(
  ml_private.commit_canonical_operation(
    '62000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'sync',
    '[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":1,"row":{"title":"Stale overwrite"}}]'::jsonb
  ) ->> 'status',
  'conflict',
  'a stale revision returns a reviewable conflict instead of overwriting'
);
select is(
  (select title from ml_private.tasks where id = '52000000-0000-4000-8000-000000000001'),
  'Committed task title',
  'a stale operation leaves authoritative data unchanged'
);

select is(
  ml_private.commit_canonical_operation(
    '62000000-0000-4000-8000-000000000003',
    '22000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'sync',
    '[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":2,"row":{"title":"Atomic first row"}},{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000002","action":"update","baseRevision":99,"row":{"title":"Atomic stale row"}}]'::jsonb
  ) ->> 'status',
  'conflict',
  'one stale mutation rejects the complete normalized group'
);
select is(
  (select title from ml_private.tasks where id = '52000000-0000-4000-8000-000000000001'),
  'Committed task title',
  'preflight prevents a partially applied multi-row command'
);

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000004','22000000-0000-4000-8000-000000000001',null,'user','[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":2,"row":{"title":"Cross Studio"}}]'::jsonb)$$,
  '42501',
  'Authentication and writable Studio membership are required.',
  'cross-Studio owners cannot dispatch operations into another Studio'
);

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000005','22000000-0000-4000-8000-000000000001',null,'user','[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000001","action":"update","baseRevision":2,"row":{"title":"Reviewer edit"}}]'::jsonb)$$,
  '42501',
  'Authentication and writable Studio membership are required.',
  'reviewers remain read-only at the operation boundary'
);

set local request.jwt.claim.sub = '12000000-0000-4000-8000-000000000001';
select is(
  ml_private.commit_canonical_operation(
    '62000000-0000-4000-8000-000000000006',
    '22000000-0000-4000-8000-000000000001',
    '42000000-0000-4000-8000-000000000001',
    'user',
    '[{"entityType":"tasks","entityId":"52000000-0000-4000-8000-000000000002","action":"delete","baseRevision":1,"row":null}]'::jsonb
  ) ->> 'status',
  'applied',
  'deletable child rows are removed through the atomic command'
);
select is(
  (select count(*) from ml_private.sync_tombstones
   where studio_id = '22000000-0000-4000-8000-000000000001'
     and entity_type = 'tasks'
     and client_id = '52000000-0000-4000-8000-000000000002'),
  1::bigint,
  'a delete creates its reload tombstone in the same transaction'
);

set local role anon;
select throws_like(
  $$select ml_private.commit_canonical_operation('62000000-0000-4000-8000-000000000007','22000000-0000-4000-8000-000000000001',null,'user','[]'::jsonb)$$,
  '%permission denied for schema ml_private%',
  'anonymous clients cannot reach the private operation boundary'
);

reset role;
set local role service_role;
select throws_ok(
  $$update ml_private.tasks set title = 'Service bypass attempt' where id = '52000000-0000-4000-8000-000000000001'$$,
  '42501',
  'Canonical cloud writes must use commit_canonical_operation.',
  'service-role direct DML is blocked without explicit trusted migration context'
);

select * from finish();
rollback;
