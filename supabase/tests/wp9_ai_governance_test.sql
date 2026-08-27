begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(31);

select is(
  (select count(*) from information_schema.tables where table_schema = 'ml_private' and table_name in ('ai_job_input_refs', 'ai_artifact_media', 'ai_artifact_acceptances', 'ai_acceptance_commands')),
  4::bigint,
  'WP9 normalizes input, media, acceptance, and command-receipt evidence'
);
select is(
  (select count(*) from information_schema.columns where table_schema = 'ml_private' and (
    (table_name = 'ai_jobs' and column_name in ('provider', 'idempotency_key', 'source_checksum', 'retry_of_job_id', 'attempt_no'))
    or (table_name = 'ai_artifacts' and column_name in ('source_checksum', 'candidate_checksum', 'field_manifest_json', 'decision_reason', 'acceptance_operation_id', 'accepted_payload_checksum', 'generated_at'))
  )),
  12::bigint,
  'jobs and candidates retain model-run, source, decision, retry, and checksum evidence'
);
select is(
  (select count(*) from pg_constraint where conname in ('ai_jobs_job_type_check', 'ai_jobs_retry_of_job_fk', 'ai_job_input_refs_job_fk', 'ai_job_input_refs_version_fk', 'ai_artifact_media_artifact_fk', 'ai_artifact_media_asset_fk', 'ai_artifact_acceptances_artifact_fk', 'ai_acceptance_commands_acceptance_fk', 'ai_acceptance_commands_change_event_fk')),
  9::bigint,
  'WP9 relationships and workflow boundaries use explicit constraints'
);
select is(
  (select count(*) from pg_indexes where schemaname = 'ml_private' and indexname in ('ml_ai_jobs_idempotency_idx', 'ml_ai_jobs_retry_idx', 'ml_ai_jobs_garment_created_idx', 'ml_ai_job_input_refs_job_idx', 'ml_ai_job_input_refs_entity_idx', 'ml_ai_job_input_refs_version_idx', 'ml_ai_artifact_media_artifact_idx', 'ml_ai_artifact_media_asset_idx', 'ml_ai_acceptances_actor_time_idx', 'ml_ai_acceptance_commands_event_idx')),
  10::bigint,
  'AI tenant, source, retry, artifact, actor, and event lookups are indexed'
);
select is(
  (select count(*) from pg_class relation join pg_namespace namespace on namespace.oid = relation.relnamespace where namespace.nspname = 'ml_private' and relation.relname in ('ai_job_input_refs', 'ai_artifact_media', 'ai_artifact_acceptances', 'ai_acceptance_commands') and relation.relrowsecurity and relation.relforcerowsecurity),
  4::bigint,
  'all new AI evidence tables enable and force RLS'
);
select is(
  (select count(*) from pg_policies where schemaname = 'ml_private' and ((tablename = 'ai_job_input_refs' and policyname in ('studio_select', 'studio_insert')) or (tablename in ('ai_artifact_media', 'ai_artifact_acceptances', 'ai_acceptance_commands') and policyname = 'studio_select'))),
  5::bigint,
  'AI evidence policies separate writable job inputs from provider and command-owned evidence'
);
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'ml_private' and table_name in ('ai_jobs', 'ai_artifacts', 'ai_job_input_refs', 'ai_artifact_media', 'ai_artifact_acceptances', 'ai_acceptance_commands')),
  0::bigint,
  'anonymous clients receive no private AI table grants'
);
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'ml_private' and table_name = 'ai_artifacts' and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  1::bigint,
  'browser members can read artifacts but cannot author or decide them directly'
);
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'ml_private' and table_name = 'ai_jobs' and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  2::bigint,
  'browser members can read and enqueue jobs but cannot forge provider status'
);
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'ml_private' and table_name in ('ai_artifact_acceptances', 'ai_acceptance_commands') and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  2::bigint,
  'acceptance and command evidence is read-only to authenticated browser roles'
);
select is(
  (select count(*) from information_schema.routines where routine_schema = 'ml_private' and routine_name in ('accept_ai_artifact', 'reject_ai_artifact')),
  2::bigint,
  'governed acceptance and rejection commands are installed'
);
select is(
  (select count(*) from information_schema.role_routine_grants where grantee = 'authenticated' and routine_schema = 'ml_private' and routine_name in ('accept_ai_artifact', 'reject_ai_artifact') and privilege_type = 'EXECUTE'),
  2::bigint,
  'only the authenticated application role receives AI decision command access'
);

insert into auth.users (id, email) values
  ('11000000-0000-4000-8000-000000000001', 'wp9-owner-a@example.test'),
  ('11000000-0000-4000-8000-000000000002', 'wp9-owner-b@example.test'),
  ('11000000-0000-4000-8000-000000000003', 'wp9-reviewer-a@example.test');

insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'WP9 Studio A', 'wp9-studio-a'),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'WP9 Studio B', 'wp9-studio-b');

insert into ml_private.studio_members (studio_id, user_id, role, status, joined_at) values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'reviewer', 'active', now());

insert into ml_private.garments (id, studio_id, garment_code, title) values
  ('41000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'AI-001', 'Governed garment'),
  ('41000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'AI-002', 'Other garment');
insert into ml_private.technical_specs (id, studio_id, garment_id, base_size, unit) values
  ('42000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'M', 'cm');

-- Capture one candidate against revision 1, then make its source stale.
insert into ml_private.ai_jobs (id, studio_id, garment_id, requested_by, job_type, status, model, prompt_version, provider, idempotency_key, source_checksum) values
  ('51000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'pom_assistance', 'candidate', 'fake-v1', 'wp9-pom-v1', 'deterministic_fake', 'stale-job', repeat('a', 64));
insert into ml_private.ai_job_input_refs (id, studio_id, ai_job_id, entity_type, entity_id, entity_revision, source_checksum) values
  ('52000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'garment', '41000000-0000-4000-8000-000000000001', 1, repeat('1', 64));
insert into ml_private.ai_artifacts (id, studio_id, ai_job_id, artifact_type, candidate_json, provenance_json, confidence_json, source_checksum, candidate_checksum) values
  ('53000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000001', 'pom_assistance', '{"points":[]}', '{"provider":"fake-v1"}', '{"method":{"level":"medium"}}', repeat('a', 64), repeat('b', 64));
update ml_private.garments set title = 'Governed garment revised' where id = '41000000-0000-4000-8000-000000000001';

-- Fresh candidate used for permission, direct-write, and acceptance tests.
insert into ml_private.ai_jobs (id, studio_id, garment_id, requested_by, job_type, status, model, prompt_version, provider, idempotency_key, source_checksum) values
  ('51000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'pom_assistance', 'candidate', 'fake-v1', 'wp9-pom-v1', 'deterministic_fake', 'fresh-job', repeat('c', 64));
insert into ml_private.ai_job_input_refs (id, studio_id, ai_job_id, entity_type, entity_id, entity_revision, source_checksum)
select '52000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'garment', id, revision, repeat('2', 64)
from ml_private.garments where id = '41000000-0000-4000-8000-000000000001';
insert into ml_private.ai_artifacts (id, studio_id, ai_job_id, artifact_type, candidate_json, provenance_json, confidence_json, source_checksum, candidate_checksum) values
  ('53000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'pom_assistance', '{"points":[{"key":"pom:hps"}]}', '{"provider":"fake-v1"}', '{"method":{"level":"medium"}}', repeat('c', 64), repeat('d', 64));

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select results_eq($$select count(*) from ml_private.ai_jobs$$, array[2::bigint], 'Studio owner can read same-studio AI jobs');

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select results_eq($$select count(*) from ml_private.ai_artifacts$$, array[2::bigint], 'same-studio reviewer can inspect private AI candidates');
select throws_ok(
  $$insert into ml_private.ai_jobs (studio_id, garment_id, requested_by, job_type, model, prompt_version, source_checksum) values ('21000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000003', 'pom_assistance', 'fake-v1', 'wp9-pom-v1', repeat('e', 64))$$,
  '42501', 'new row violates row-level security policy for table "ai_jobs"',
  'reviewers cannot enqueue provider work'
);

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000002';
select results_eq($$select count(*) from ml_private.ai_jobs$$, array[0::bigint], 'cross-studio members cannot infer AI job IDs');

set local role anon;
select throws_ok($$select count(*) from ml_private.ai_jobs$$, '42501', 'permission denied for schema ml_private', 'anonymous users cannot access private AI evidence');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select throws_ok(
  $$update ml_private.ai_artifacts set decision = 'accepted', decided_by = '11000000-0000-4000-8000-000000000001', decided_at = now() where id = '53000000-0000-4000-8000-000000000002'$$,
  '42501', 'permission denied for table ai_artifacts',
  'browser members cannot directly accept a candidate'
);

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select ml_private.accept_ai_artifact('53000000-0000-4000-8000-000000000002', repeat('c', 64), '61000000-0000-4000-8000-000000000001', '[{"fieldKey":"pom:hps","commandType":"measurement.create-pom","changeEventId":"62000000-0000-4000-8000-000000000001"}]'::jsonb, 'Reviewer cannot commit this candidate.', repeat('f', 64))$$,
  '42501', 'AI artifact is unavailable to this Studio member.',
  'reviewers cannot decide AI candidates'
);

set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select ml_private.accept_ai_artifact('53000000-0000-4000-8000-000000000002', repeat('c', 64), '61000000-0000-4000-8000-000000000001', '[]'::jsonb, 'No command evidence was supplied.', repeat('f', 64))$$,
  '23514', 'Acceptance requires at least one typed domain command receipt.',
  'acceptance fails without a normal domain command receipt'
);
select throws_ok(
  $$select ml_private.accept_ai_artifact('53000000-0000-4000-8000-000000000001', repeat('a', 64), '61000000-0000-4000-8000-000000000002', '[{"fieldKey":"pom:hps","commandType":"measurement.create-pom","changeEventId":"62000000-0000-4000-8000-000000000001"}]'::jsonb, 'Stale candidate must remain blocked.', repeat('f', 64))$$,
  '40001', 'AI candidate sources changed after generation.',
  'acceptance fails when a source revision changed after generation'
);

reset role;
insert into ml_private.pom_points (id, studio_id, spec_id, code, name, method, diagram_anchor_json, sort_order) values
  ('63000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 'HPS', 'High point shoulder', 'Measure from HPS to hem.', '{"x":0.5,"y":0.1}', 0);
insert into ml_private.change_events (id, studio_id, garment_id, origin, actor_id, operation_id, entity_type, entity_id, operation) values
  ('62000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001', 'ai_acceptance', '11000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000001', 'pom_point', '63000000-0000-4000-8000-000000000001', 'create');

set local role authenticated;
set local request.jwt.claim.sub = '11000000-0000-4000-8000-000000000001';
select lives_ok(
  $$select ml_private.accept_ai_artifact('53000000-0000-4000-8000-000000000002', repeat('c', 64), '61000000-0000-4000-8000-000000000001', '[{"fieldKey":"pom:hps","commandType":"measurement.create-pom","changeEventId":"62000000-0000-4000-8000-000000000001"}]'::jsonb, 'Reviewed method and anchor against the flat.', repeat('f', 64))$$,
  'owner accepts only after the typed domain command event exists'
);

reset role;
select is((select decision::text from ml_private.ai_artifacts where id = '53000000-0000-4000-8000-000000000002'), 'accepted', 'artifact records the designer decision');
select is((select count(*) from ml_private.ai_artifact_acceptances where ai_artifact_id = '53000000-0000-4000-8000-000000000002'), 1::bigint, 'acceptance records actor, note, checksums, and operation identity');
select is((select count(*) from ml_private.ai_acceptance_commands where change_event_id = '62000000-0000-4000-8000-000000000001' and command_type = 'measurement.create-pom'), 1::bigint, 'field selection links to the exact normal domain command event');
select is((select count(*) from ml_private.change_events where operation_id = '61000000-0000-4000-8000-000000000001' and entity_type = 'ai_artifact' and operation = 'accept_ai'), 1::bigint, 'accepted artifact emits one explicit AI acceptance event');
select is((select count(*) from ml_private.change_events where id = '62000000-0000-4000-8000-000000000001' and entity_type = 'pom_point'), 1::bigint, 'normal domain event remains immutable acceptance evidence');
select throws_ok(
  $$update ml_private.ai_artifact_acceptances set decision_note = 'rewrite' where ai_artifact_id = '53000000-0000-4000-8000-000000000002'$$,
  '23514', 'AI acceptance evidence is append-only.',
  'acceptance evidence cannot be rewritten'
);

select throws_ok(
  $$insert into ml_private.ai_job_input_refs (studio_id, ai_job_id, entity_type, entity_id, entity_revision, source_checksum) values ('21000000-0000-4000-8000-000000000001', '51000000-0000-4000-8000-000000000002', 'garment', '41000000-0000-4000-8000-000000000001', 1, repeat('9', 64))$$,
  '40001', 'AI input reference revision is stale at job creation.',
  'job creation rejects stale source revision claims'
);

insert into ml_private.media_assets (id, studio_id, storage_path, original_filename, mime_type, size_bytes, checksum) values
  ('71000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'studios/21000000-0000-4000-8000-000000000001/ai/candidate.png', 'candidate.png', 'image/png', 10, repeat('7', 64)),
  ('71000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000001', 'studios/21000000-0000-4000-8000-000000000002/ai/cross-studio.png', 'cross-studio.png', 'image/png', 10, repeat('8', 64));
select lives_ok(
  $$insert into ml_private.ai_artifact_media (studio_id, ai_artifact_id, asset_id, role) values ('21000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000001', 'generated')$$,
  'generated AI media can link only through a private same-studio path'
);
select throws_ok(
  $$insert into ml_private.ai_artifact_media (studio_id, ai_artifact_id, asset_id, role) values ('21000000-0000-4000-8000-000000000001', '53000000-0000-4000-8000-000000000002', '71000000-0000-4000-8000-000000000002', 'generated')$$,
  '23514', 'AI artifact media must remain in the private Studio asset path.',
  'generated media cannot cross Studio storage prefixes'
);

select * from finish();
rollback;
