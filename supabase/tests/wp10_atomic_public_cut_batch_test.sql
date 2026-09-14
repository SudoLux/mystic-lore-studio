begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, ml_private, ml_public;

select plan(25);

select has_table('ml_private', 'public_cut_batches', 'private Public Cut batch evidence is installed');
select is(
  (select count(*) from information_schema.routines
   where routine_schema = 'ml_private' and routine_name in (
     'begin_public_cut_batch', 'stage_public_cut_asset',
     'commit_public_cut_batch', 'unpublish_public_cut_batch'
   )),
  4::bigint,
  'begin, media stage, atomic commit, and visibility-first unpublish commands exist'
);
select is(
  (select count(*) from information_schema.role_routine_grants
   where grantee = 'anon' and routine_schema = 'ml_private'
     and routine_name like '%public_cut_batch%' and privilege_type = 'EXECUTE'),
  0::bigint,
  'anonymous clients cannot execute publication batch commands'
);
select is(
  (select count(*) from information_schema.role_table_grants
   where grantee = 'authenticated' and table_schema = 'ml_private'
     and table_name = 'public_cut_batches' and privilege_type in ('INSERT', 'UPDATE', 'DELETE')),
  0::bigint,
  'browser clients cannot forge batch state transitions directly'
);
select ok(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'ml_private.public_cut_batches'::regclass),
  'Public Cut batches enable and force RLS'
);

insert into auth.users (id, email) values
  ('13000000-0000-4000-8000-000000000001', 'batch-owner-a@example.test'),
  ('13000000-0000-4000-8000-000000000002', 'batch-owner-b@example.test'),
  ('13000000-0000-4000-8000-000000000003', 'batch-reviewer-a@example.test');
insert into ml_private.studios (id, owner_user_id, name, slug) values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'Batch Studio A', 'batch-studio-a'),
  ('23000000-0000-4000-8000-000000000002', '13000000-0000-4000-8000-000000000002', 'Batch Studio B', 'batch-studio-b');
insert into ml_private.studio_members (studio_id, user_id, role, status, joined_at) values
  ('23000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000003', 'reviewer', 'active', now());
insert into ml_private.portfolio_profiles (
  id, studio_id, username_slug, display_name, headline, bio, status
) values (
  '33000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
  'batch-designer', 'Batch Designer', 'Independent designer', 'Public-safe biography.', 'ready'
);

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000003';
select throws_ok(
  $$select ml_private.begin_public_cut_batch(
    '43000000-0000-4000-8000-000000000001',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001', '[]'::jsonb)$$,
  '42501', 'Writable Studio membership is required to begin a Public Cut batch.',
  'reviewers cannot begin a publication batch'
);

set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select ml_private.begin_public_cut_batch(
    '43000000-0000-4000-8000-000000000002',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001', '[]'::jsonb)$$,
  '42501', 'Writable Studio membership is required to begin a Public Cut batch.',
  'cross-Studio owners cannot begin another Studio publication batch'
);

set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';

-- Media-stage failure: the draft references one reviewed derivative, but no
-- publication asset row or Storage object exists. Nothing becomes anonymous.
select is(
  ml_private.begin_public_cut_batch(
    '43000000-0000-4000-8000-000000000003',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'id', '53000000-0000-4000-8000-000000000001',
      'publicationType', 'profile',
      'sourceId', '33000000-0000-4000-8000-000000000001',
      'sourceRevision', 1,
      'sourceVersionId', null,
      'publicPath', '/portfolio/batch-designer',
      'snapshot', '{"profile":{"displayName":"Batch Designer","usernameSlug":"batch-designer"},"projects":[],"editorials":[],"generatedAt":"2026-08-27T00:00:00Z"}'::jsonb,
      'mediaManifest', jsonb_build_array(jsonb_build_object(
        'sourceAssetId', '63000000-0000-4000-8000-000000000001',
        'sourceDerivativeId', '63000000-0000-4000-8000-000000000002',
        'publicationAssetId', '63000000-0000-4000-8000-000000000003',
        'publicStoragePath', 'publications/53000000-0000-4000-8000-000000000001/63000000-0000-4000-8000-000000000003/hero.jpg',
        'checksum', repeat('a', 64), 'copiedFromChecksum', repeat('a', 64),
        'mimeType', 'image/jpeg', 'role', 'cover', 'altText', 'Public image'
      )),
      'checksum', repeat('b', 64)
    ))
  ) ->> 'status',
  'draft',
  'begin creates only an anonymous-invisible draft set'
);
select throws_ok(
  $$select ml_private.commit_public_cut_batch('43000000-0000-4000-8000-000000000003')$$,
  '23514', 'Every expected Public Cut derivative must be copied before commit.',
  'a media-stage failure cannot partially publish the batch'
);
select results_eq(
  $$select count(*) from ml_public.publications where batch_id = '43000000-0000-4000-8000-000000000003' and is_public$$,
  array[0::bigint],
  'the failed batch contains zero public rows'
);

set local role anon;
select results_eq(
  $$select count(*) from ml_public.publications$$,
  array[0::bigint],
  'anonymous reads cannot observe any failed-batch draft'
);

-- Freshness failure between preview and commit also leaves only a draft.
set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';
select is(
  ml_private.begin_public_cut_batch(
    '43000000-0000-4000-8000-000000000004',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'id', '53000000-0000-4000-8000-000000000004',
      'publicationType', 'profile', 'sourceId', '33000000-0000-4000-8000-000000000001',
      'sourceRevision', 1, 'sourceVersionId', null,
      'publicPath', '/portfolio/batch-designer',
      'snapshot', '{"profile":{"displayName":"Batch Designer","usernameSlug":"batch-designer"},"projects":[],"editorials":[],"generatedAt":"2026-08-27T00:00:00Z"}'::jsonb,
      'mediaManifest', '[]'::jsonb, 'checksum', repeat('c', 64)
    ))
  ) ->> 'status',
  'draft',
  'a fresh source can begin a no-media profile draft'
);
update ml_private.portfolio_profiles set display_name = 'Batch Designer Revised'
where id = '33000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select ml_private.commit_public_cut_batch('43000000-0000-4000-8000-000000000004')$$,
  '40001', 'Public Cut sources changed after preview; rebuild the batch.',
  'commit reloads canonical sources and rejects a stale preview'
);
select results_eq(
  $$select count(*) from ml_public.publications where batch_id = '43000000-0000-4000-8000-000000000004' and is_public$$,
  array[0::bigint],
  'a stale batch exposes no partial snapshot'
);

-- Rebuilt fresh batch promotes all of its rows in one transaction.
select is(
  ml_private.begin_public_cut_batch(
    '43000000-0000-4000-8000-000000000005',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'id', '53000000-0000-4000-8000-000000000005',
      'publicationType', 'profile', 'sourceId', '33000000-0000-4000-8000-000000000001',
      'sourceRevision', 2, 'sourceVersionId', null,
      'publicPath', '/portfolio/batch-designer',
      'snapshot', '{"profile":{"displayName":"Batch Designer Revised","usernameSlug":"batch-designer"},"projects":[],"editorials":[],"generatedAt":"2026-08-27T00:01:00Z"}'::jsonb,
      'mediaManifest', '[]'::jsonb, 'checksum', repeat('d', 64)
    ))
  ) ->> 'status',
  'draft',
  'a rebuilt batch records the fresh profile revision'
);
select is(
  ml_private.begin_public_cut_batch(
    '43000000-0000-4000-8000-000000000005',
    '23000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'id', '53000000-0000-4000-8000-000000000005',
      'publicationType', 'profile', 'sourceId', '33000000-0000-4000-8000-000000000001',
      'sourceRevision', 2, 'sourceVersionId', null,
      'publicPath', '/portfolio/batch-designer',
      'snapshot', '{"profile":{"displayName":"Batch Designer Revised","usernameSlug":"batch-designer"},"projects":[],"editorials":[],"generatedAt":"2026-08-27T00:01:00Z"}'::jsonb,
      'mediaManifest', '[]'::jsonb, 'checksum', repeat('d', 64)
    ))
  ) ->> 'status',
  'duplicate',
  'retrying the same batch ID and sources is idempotent'
);
select is(
  ml_private.commit_public_cut_batch('43000000-0000-4000-8000-000000000005') ->> 'status',
  'published',
  'the complete fresh batch becomes public atomically'
);
select is(
  ml_private.commit_public_cut_batch('43000000-0000-4000-8000-000000000005') ->> 'status',
  'duplicate',
  'commit retry is idempotent'
);
select is(
  (select status from ml_private.public_cut_batches where id = '43000000-0000-4000-8000-000000000005'),
  'published',
  'batch evidence records the committed state and time'
);
select is(
  (select count(*) from ml_private.change_events where operation_id = '43000000-0000-4000-8000-000000000005' and operation = 'publish'),
  1::bigint,
  'one audit event represents the atomic batch commit'
);

set local role anon;
select results_eq(
  $$select count(*) from ml_public.publications where is_current and is_public$$,
  array[1::bigint],
  'anonymous readers see the complete committed batch'
);

set local role authenticated;
set local request.jwt.claim.sub = '13000000-0000-4000-8000-000000000001';
select is(
  ml_private.unpublish_public_cut_batch('33000000-0000-4000-8000-000000000001') ->> 'status',
  'unpublished',
  'unpublish removes database visibility before cleanup'
);
select results_eq(
  $$select count(*) from ml_public.publications where profile_id = '33000000-0000-4000-8000-000000000001' and is_public$$,
  array[0::bigint],
  'all current rows are private before Storage cleanup begins'
);
select is(
  (select status from ml_private.public_cut_batches where id = '43000000-0000-4000-8000-000000000005'),
  'unpublished',
  'batch history records the visibility removal'
);

set local role anon;
select results_eq(
  $$select count(*) from ml_public.publications$$,
  array[0::bigint],
  'anonymous access is denied immediately after unpublish'
);

select * from finish();
rollback;
