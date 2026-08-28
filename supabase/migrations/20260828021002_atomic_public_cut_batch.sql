-- Atomic, profile-scoped Public Cut publication batches.
-- Draft snapshots and their copied object evidence remain anonymous-invisible
-- until one database transaction promotes the complete profile set.

begin;

create table ml_private.public_cut_batches (
  id uuid primary key,
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  profile_id uuid not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'copying', 'ready', 'published', 'failed', 'unpublished')),
  publication_ids uuid[] not null check (cardinality(publication_ids) between 1 and 100),
  expected_object_paths text[] not null default '{}'::text[],
  source_manifest_json jsonb not null check (jsonb_typeof(source_manifest_json) = 'array'),
  checksum ml_private.sha256_checksum not null,
  failure_code text,
  failure_detail text,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  unpublished_at timestamptz,
  unique (studio_id, id),
  constraint public_cut_batches_profile_fk foreign key (studio_id, profile_id)
    references ml_private.portfolio_profiles(studio_id, id) on delete restrict,
  check (cardinality(publication_ids) = jsonb_array_length(source_manifest_json)),
  check (not (status = 'published' and committed_at is null)),
  check (not (status = 'unpublished' and unpublished_at is null))
);

create index ml_public_cut_batches_profile_time_idx
  on ml_private.public_cut_batches (studio_id, profile_id, created_at desc);

alter table ml_private.public_cut_batches enable row level security;
alter table ml_private.public_cut_batches force row level security;
create policy public_cut_batches_select_member on ml_private.public_cut_batches
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));

grant select on table ml_private.public_cut_batches to authenticated;
revoke insert, update, delete on table ml_private.public_cut_batches from anon, authenticated;

alter table ml_public.publications
  add column batch_id uuid;

alter table ml_public.publications
  add constraint publications_batch_fk
  foreign key (studio_id, batch_id)
  references ml_private.public_cut_batches(studio_id, id) on delete restrict;

create index ml_publications_batch_idx
  on ml_public.publications (studio_id, batch_id);

create or replace function ml_internal.begin_public_cut_batch(
  p_batch_id uuid,
  p_studio_id uuid,
  p_profile_id uuid,
  p_publications jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  publication jsonb;
  publication_id uuid;
  publication_type text;
  source_id uuid;
  source_revision bigint;
  target_source_version_id uuid;
  expected_paths text[];
  publication_ids uuid[];
  batch_checksum text;
  existing ml_private.public_cut_batches;
begin
  if (select auth.uid()) is null or not ml_internal.can_write_studio(p_studio_id) then
    raise exception 'Writable Studio membership is required to begin a Public Cut batch.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_publications) <> 'array'
     or jsonb_array_length(p_publications) not between 1 and 100 then
    raise exception 'A Public Cut batch requires between 1 and 100 publications.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from ml_private.portfolio_profiles profile
    where profile.studio_id = p_studio_id and profile.id = p_profile_id
  ) then
    raise exception 'The Public Cut profile is unavailable to this Studio.' using errcode = '42501';
  end if;

  batch_checksum := encode(extensions.digest(p_publications::text, 'sha256'), 'hex');
  select * into existing from ml_private.public_cut_batches
  where studio_id = p_studio_id and id = p_batch_id;
  if existing.id is not null then
    if existing.checksum <> batch_checksum then
      raise exception 'The Public Cut batch ID was already used for different sources.' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'status', 'duplicate', 'batchId', existing.id,
      'publicationIds', to_jsonb(existing.publication_ids),
      'expectedObjectPaths', to_jsonb(existing.expected_object_paths)
    );
  end if;

  if (
    select count(*) <> count(distinct (value ->> 'id'))
    from jsonb_array_elements(p_publications)
  ) then
    raise exception 'Publication IDs must be unique inside a Public Cut batch.' using errcode = '23514';
  end if;

  for publication in select value from jsonb_array_elements(p_publications)
  loop
    publication_id := nullif(publication ->> 'id', '')::uuid;
    publication_type := publication ->> 'publicationType';
    source_id := nullif(publication ->> 'sourceId', '')::uuid;
    source_revision := nullif(publication ->> 'sourceRevision', '')::bigint;
    target_source_version_id := nullif(publication ->> 'sourceVersionId', '')::uuid;
    if publication_id is null or source_id is null
       or publication_type not in ('profile', 'project', 'editorial')
       or source_revision is null then
      raise exception 'A Public Cut source identity is incomplete.' using errcode = '23514';
    end if;
    if publication_type = 'profile' and not exists (
      select 1 from ml_private.portfolio_profiles profile
      where profile.studio_id = p_studio_id and profile.id = source_id
        and profile.id = p_profile_id and profile.revision = source_revision
    ) then
      raise exception 'The Public Cut profile source is stale.' using errcode = '40001';
    elsif publication_type = 'project' and not exists (
      select 1 from ml_private.portfolio_projects project
      where project.studio_id = p_studio_id and project.id = source_id
        and project.profile_id = p_profile_id and project.revision = source_revision
        and project.source_version_id = target_source_version_id
    ) then
      raise exception 'A Public Cut project source is stale.' using errcode = '40001';
    elsif publication_type = 'editorial' and not exists (
      select 1 from ml_private.portfolio_editorials editorial
      where editorial.studio_id = p_studio_id and editorial.collection_id = source_id
        and editorial.profile_id = p_profile_id and editorial.revision = source_revision
        and editorial.source_version_id = target_source_version_id
    ) then
      raise exception 'A Public Cut editorial source is stale.' using errcode = '40001';
    end if;

    publication_ids := array_append(publication_ids, publication_id);
    expected_paths := expected_paths || coalesce(array(
      select manifest_item ->> 'publicStoragePath'
      from jsonb_array_elements(coalesce(publication -> 'mediaManifest', '[]'::jsonb)) manifest_item
    ), '{}'::text[]);
  end loop;

  insert into ml_private.public_cut_batches (
    id, studio_id, profile_id, created_by, publication_ids,
    expected_object_paths, source_manifest_json, checksum
  ) values (
    p_batch_id, p_studio_id, p_profile_id, (select auth.uid()), publication_ids,
    coalesce(expected_paths, '{}'::text[]), p_publications, batch_checksum
  );

  for publication in select value from jsonb_array_elements(p_publications)
  loop
    publication_id := (publication ->> 'id')::uuid;
    publication_type := publication ->> 'publicationType';
    source_id := (publication ->> 'sourceId')::uuid;
    target_source_version_id := nullif(publication ->> 'sourceVersionId', '')::uuid;
    insert into ml_public.publications (
      id, batch_id, studio_id, profile_id, publication_type, source_id,
      portfolio_project_id, portfolio_editorial_collection_id, source_version_id,
      public_path, snapshot_json, media_manifest, checksum, source_revision,
      created_by, is_public, is_current
    ) values (
      publication_id, p_batch_id, p_studio_id, p_profile_id,
      publication_type::ml_public.publication_type, source_id,
      case when publication_type = 'project' then source_id else null end,
      case when publication_type = 'editorial' then source_id else null end,
      target_source_version_id, publication ->> 'publicPath', publication -> 'snapshot',
      coalesce(publication -> 'mediaManifest', '[]'::jsonb),
      publication ->> 'checksum', (publication ->> 'sourceRevision')::bigint,
      (select auth.uid()), false, false
    );
  end loop;

  return jsonb_build_object(
    'status', 'draft', 'batchId', p_batch_id,
    'publicationIds', to_jsonb(publication_ids),
    'expectedObjectPaths', to_jsonb(coalesce(expected_paths, '{}'::text[]))
  );
end;
$$;

create or replace function ml_internal.stage_public_cut_asset(
  p_batch_id uuid,
  p_publication_id uuid,
  p_asset jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_batch ml_private.public_cut_batches;
  target_publication ml_public.publications;
  manifest_item jsonb;
  asset_id uuid := nullif(p_asset ->> 'publicationAssetId', '')::uuid;
begin
  select * into target_batch from ml_private.public_cut_batches
  where id = p_batch_id for update;
  if target_batch.id is null or not ml_internal.can_write_studio(target_batch.studio_id) then
    raise exception 'Public Cut batch not found or unavailable.' using errcode = '42501';
  end if;
  if target_batch.status not in ('draft', 'copying', 'ready') then
    raise exception 'Public Cut assets can be staged only before the batch commit.' using errcode = '23514';
  end if;
  select * into target_publication from ml_public.publications
  where id = p_publication_id and batch_id = p_batch_id;
  if target_publication.id is null then
    raise exception 'The publication is not part of this Public Cut batch.' using errcode = '23514';
  end if;
  select item into manifest_item
  from jsonb_array_elements(target_publication.media_manifest) item
  where item ->> 'publicationAssetId' = asset_id::text;
  if manifest_item is null
     or manifest_item ->> 'publicStoragePath' <> p_asset ->> 'publicStoragePath'
     or manifest_item ->> 'sourceAssetId' <> p_asset ->> 'sourceAssetId'
     or manifest_item ->> 'sourceDerivativeId' <> p_asset ->> 'sourceDerivativeId'
     or manifest_item ->> 'checksum' <> p_asset ->> 'checksum' then
    raise exception 'Staged Public Cut media does not match the reviewed manifest.' using errcode = '23514';
  end if;

  insert into ml_public.publication_assets (
    id, studio_id, publication_id, role, storage_path, mime_type,
    size_bytes, checksum, copied_from_checksum, width, height, alt_text,
    sort_order, source_asset_id, source_derivative_id, rights_checked_at
  ) values (
    asset_id, target_batch.studio_id, p_publication_id, manifest_item ->> 'role',
    manifest_item ->> 'publicStoragePath', manifest_item ->> 'mimeType',
    coalesce(nullif(p_asset ->> 'sizeBytes', '')::bigint, 0),
    manifest_item ->> 'checksum', manifest_item ->> 'copiedFromChecksum',
    nullif(p_asset ->> 'width', '')::integer, nullif(p_asset ->> 'height', '')::integer,
    coalesce(manifest_item ->> 'altText', ''), coalesce((p_asset ->> 'sortOrder')::integer, 0),
    (manifest_item ->> 'sourceAssetId')::uuid,
    (manifest_item ->> 'sourceDerivativeId')::uuid, now()
  ) on conflict (id) do nothing;

  update ml_private.public_cut_batches set status = 'copying' where id = p_batch_id;
  return asset_id;
end;
$$;

create or replace function ml_internal.commit_public_cut_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_batch ml_private.public_cut_batches;
begin
  select * into target_batch from ml_private.public_cut_batches
  where id = p_batch_id for update;
  if target_batch.id is null or not ml_internal.can_write_studio(target_batch.studio_id) then
    raise exception 'Public Cut batch not found or unavailable.' using errcode = '42501';
  end if;
  if target_batch.status = 'published' then
    return jsonb_build_object('status', 'duplicate', 'batchId', target_batch.id, 'publicationIds', to_jsonb(target_batch.publication_ids));
  end if;
  if target_batch.status not in ('draft', 'copying', 'ready') then
    raise exception 'This Public Cut batch cannot be committed.' using errcode = '23514';
  end if;
  if (select count(*) from ml_public.publications where batch_id = p_batch_id)
     <> cardinality(target_batch.publication_ids) then
    raise exception 'The Public Cut draft set is incomplete.' using errcode = '23514';
  end if;
  if exists (
    select 1
    from ml_public.publications publication
    cross join lateral jsonb_array_elements(publication.media_manifest) manifest_item
    where publication.batch_id = p_batch_id
      and not exists (
        select 1 from ml_public.publication_assets asset
        join storage.objects object on object.bucket_id = 'portfolio-assets' and object.name = asset.storage_path
        where asset.publication_id = publication.id
          and asset.id = (manifest_item ->> 'publicationAssetId')::uuid
          and asset.storage_path = manifest_item ->> 'publicStoragePath'
          and asset.checksum = manifest_item ->> 'checksum'
      )
  ) then
    raise exception 'Every expected Public Cut derivative must be copied before commit.' using errcode = '23514';
  end if;
  if exists (
    select 1 from ml_public.publications publication
    where publication.batch_id = p_batch_id and (
      (publication.publication_type = 'profile' and not exists (
        select 1 from ml_private.portfolio_profiles profile
        where profile.studio_id = publication.studio_id and profile.id = publication.source_id
          and profile.revision = publication.source_revision
      ))
      or (publication.publication_type = 'project' and not exists (
        select 1 from ml_private.portfolio_projects project
        where project.studio_id = publication.studio_id and project.id = publication.source_id
          and project.profile_id = publication.profile_id
          and project.revision = publication.source_revision
          and project.source_version_id = publication.source_version_id
      ))
      or (publication.publication_type = 'editorial' and not exists (
        select 1 from ml_private.portfolio_editorials editorial
        where editorial.studio_id = publication.studio_id and editorial.profile_id = publication.profile_id
          and editorial.collection_id = publication.source_id
          and editorial.revision = publication.source_revision
          and editorial.source_version_id = publication.source_version_id
      ))
    )
  ) then
    raise exception 'Public Cut sources changed after preview; rebuild the batch.' using errcode = '40001';
  end if;

  update ml_public.publications
  set is_public = false, is_current = false, unpublished_at = now()
  where profile_id = target_batch.profile_id and is_current;

  update ml_public.publications
  set is_public = true, is_current = true, published_at = now()
  where batch_id = p_batch_id;

  update ml_private.public_cut_batches
  set status = 'published', committed_at = now(), failure_code = null, failure_detail = null
  where id = p_batch_id;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    target_batch.studio_id, null, 'publication', (select auth.uid()), target_batch.id,
    'public_cut_batch', target_batch.id, 'publish', '[]'::jsonb, '[]'::jsonb
  );

  return jsonb_build_object('status', 'published', 'batchId', target_batch.id, 'publicationIds', to_jsonb(target_batch.publication_ids));
end;
$$;

create or replace function ml_internal.unpublish_public_cut_batch(p_profile_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_studio_id uuid;
  publication_ids uuid[];
  cleanup_paths text[];
  batch_ids uuid[];
begin
  select profile.studio_id into target_studio_id
  from ml_private.portfolio_profiles profile where profile.id = p_profile_id;
  if target_studio_id is null or not ml_internal.can_write_studio(target_studio_id) then
    raise exception 'Portfolio profile not found or unavailable.' using errcode = '42501';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]), coalesce(array_agg(distinct batch_id) filter (where batch_id is not null), '{}'::uuid[])
  into publication_ids, batch_ids
  from ml_public.publications where profile_id = p_profile_id and is_current;
  select coalesce(array_agg(asset.storage_path), '{}'::text[])
  into cleanup_paths
  from ml_public.publication_assets asset
  where asset.publication_id = any(publication_ids);

  -- Anonymous visibility is removed before any fallible Storage cleanup.
  update ml_public.publications
  set is_public = false, is_current = false, unpublished_at = now()
  where id = any(publication_ids);
  update ml_private.public_cut_batches
  set status = 'unpublished', unpublished_at = now()
  where id = any(batch_ids) and status = 'published';

  if cardinality(publication_ids) > 0 then
    insert into ml_private.change_events (
      studio_id, garment_id, origin, actor_id, operation_id,
      entity_type, entity_id, operation, json_patch, inverse_patch
    ) values (
      target_studio_id, null, 'publication', (select auth.uid()), gen_random_uuid(),
      'public_cut_batch', p_profile_id, 'unpublish', '[]'::jsonb, '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'status', 'unpublished', 'publicationIds', to_jsonb(publication_ids),
    'cleanupPaths', to_jsonb(cleanup_paths)
  );
end;
$$;

create or replace function ml_private.begin_public_cut_batch(
  p_batch_id uuid, p_studio_id uuid, p_profile_id uuid, p_publications jsonb
)
returns jsonb language sql security invoker set search_path = '' as $$
  select ml_internal.begin_public_cut_batch(p_batch_id, p_studio_id, p_profile_id, p_publications);
$$;
create or replace function ml_private.stage_public_cut_asset(
  p_batch_id uuid, p_publication_id uuid, p_asset jsonb
)
returns uuid language sql security invoker set search_path = '' as $$
  select ml_internal.stage_public_cut_asset(p_batch_id, p_publication_id, p_asset);
$$;
create or replace function ml_private.commit_public_cut_batch(p_batch_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select ml_internal.commit_public_cut_batch(p_batch_id);
$$;
create or replace function ml_private.unpublish_public_cut_batch(p_profile_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select ml_internal.unpublish_public_cut_batch(p_profile_id);
$$;

revoke all on function ml_internal.begin_public_cut_batch(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function ml_internal.stage_public_cut_asset(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function ml_internal.commit_public_cut_batch(uuid) from public, anon, authenticated;
revoke all on function ml_internal.unpublish_public_cut_batch(uuid) from public, anon, authenticated;
grant execute on function ml_internal.begin_public_cut_batch(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function ml_internal.stage_public_cut_asset(uuid, uuid, jsonb) to authenticated;
grant execute on function ml_internal.commit_public_cut_batch(uuid) to authenticated;
grant execute on function ml_internal.unpublish_public_cut_batch(uuid) to authenticated;
revoke all on function ml_private.begin_public_cut_batch(uuid, uuid, uuid, jsonb) from public, anon;
revoke all on function ml_private.stage_public_cut_asset(uuid, uuid, jsonb) from public, anon;
revoke all on function ml_private.commit_public_cut_batch(uuid) from public, anon;
revoke all on function ml_private.unpublish_public_cut_batch(uuid) from public, anon;
grant execute on function ml_private.begin_public_cut_batch(uuid, uuid, uuid, jsonb) to authenticated;
grant execute on function ml_private.stage_public_cut_asset(uuid, uuid, jsonb) to authenticated;
grant execute on function ml_private.commit_public_cut_batch(uuid) to authenticated;
grant execute on function ml_private.unpublish_public_cut_batch(uuid) to authenticated;

comment on table ml_private.public_cut_batches is
  'Private two-phase publication batches. A batch becomes anonymously visible only through commit_public_cut_batch after all sources and copied objects are revalidated.';

commit;
