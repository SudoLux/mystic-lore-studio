-- Mystic Lore Studio 2.0 canonical Storage buckets and tenant policies.
-- Legacy project-images and portfolio-images buckets remain unchanged.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'studio-assets',
  'studio-assets',
  false,
  52428800,
  array[
    'image/webp', 'image/jpeg', 'image/png', 'image/svg+xml',
    'application/pdf', 'application/zip', 'application/x-zip-compressed',
    'application/octet-stream', 'application/postscript',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-assets',
  'portfolio-assets',
  true,
  12582912,
  array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function ml_internal.storage_studio_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  if object_name ~ '^studios/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+' then
    return split_part(object_name, '/', 2)::uuid;
  end if;
  return null;
end;
$$;

create or replace function ml_internal.storage_publication_id(object_name text)
returns uuid
language plpgsql
immutable
set search_path = ''
as $$
begin
  if object_name ~ '^publications/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.+' then
    return split_part(object_name, '/', 2)::uuid;
  end if;
  return null;
end;
$$;

comment on function ml_internal.storage_studio_id(text) is
  'Parses canonical private paths: studios/{studio_id}/assets|derivatives|technical|samples|editorial/...';
comment on function ml_internal.storage_publication_id(text) is
  'Parses copied public paths: publications/{publication_id}/{publication_asset_id}/{filename}.';

revoke all on function ml_internal.storage_studio_id(text) from public, anon, authenticated;
revoke all on function ml_internal.storage_publication_id(text) from public, anon, authenticated;
grant execute on function ml_internal.storage_studio_id(text) to authenticated;
grant execute on function ml_internal.storage_publication_id(text) to authenticated;

drop policy if exists ml_studio_assets_select_member on storage.objects;
create policy ml_studio_assets_select_member
  on storage.objects for select to authenticated
  using (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and ml_internal.storage_studio_id(name) in (select ml_internal.member_studio_ids())
  );

drop policy if exists ml_studio_assets_insert_writer on storage.objects;
create policy ml_studio_assets_insert_writer
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and split_part(name, '/', 3) in ('assets', 'derivatives', 'technical', 'samples', 'editorial', 'exports')
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  );

drop policy if exists ml_studio_assets_update_writer on storage.objects;
create policy ml_studio_assets_update_writer
  on storage.objects for update to authenticated
  using (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  )
  with check (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and split_part(name, '/', 3) in ('assets', 'derivatives', 'technical', 'samples', 'editorial', 'exports')
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  );

drop policy if exists ml_studio_assets_delete_writer on storage.objects;
create policy ml_studio_assets_delete_writer
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  );

-- Public buckets bypass object RLS for direct public downloads. No anon policy
-- is added here, so anonymous callers cannot list storage.objects. Only copied
-- derivatives staged in ml_public.publication_assets may be uploaded.
drop policy if exists ml_portfolio_assets_select_member on storage.objects;
create policy ml_portfolio_assets_select_member
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1
      from ml_public.publication_assets asset
      where asset.publication_id = ml_internal.storage_publication_id(name)
        and asset.storage_path = name
        and asset.studio_id in (select ml_internal.member_studio_ids())
    )
  );

drop policy if exists ml_portfolio_assets_insert_draft_writer on storage.objects;
create policy ml_portfolio_assets_insert_draft_writer
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1
      from ml_public.publication_assets asset
      join ml_public.publications publication on publication.id = asset.publication_id
      where asset.publication_id = ml_internal.storage_publication_id(name)
        and asset.storage_path = name
        and publication.published_at is null
        and asset.studio_id in (select ml_internal.writable_studio_ids())
    )
  );

drop policy if exists ml_portfolio_assets_update_draft_writer on storage.objects;
create policy ml_portfolio_assets_update_draft_writer
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1
      from ml_public.publication_assets asset
      join ml_public.publications publication on publication.id = asset.publication_id
      where asset.publication_id = ml_internal.storage_publication_id(name)
        and asset.storage_path = name
        and publication.published_at is null
        and asset.studio_id in (select ml_internal.writable_studio_ids())
    )
  )
  with check (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1
      from ml_public.publication_assets asset
      join ml_public.publications publication on publication.id = asset.publication_id
      where asset.publication_id = ml_internal.storage_publication_id(name)
        and asset.storage_path = name
        and publication.published_at is null
        and asset.studio_id in (select ml_internal.writable_studio_ids())
    )
  );

-- Published copied derivatives may be deleted by their Studio writer as the
-- first step of unpublication. The immutable manifest row and publication
-- history remain; unpublish_publication refuses to complete while an object is
-- still publicly retrievable.
drop policy if exists ml_portfolio_assets_delete_writer on storage.objects;
create policy ml_portfolio_assets_delete_writer
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-assets'
    and exists (
      select 1
      from ml_public.publication_assets asset
      where asset.publication_id = ml_internal.storage_publication_id(name)
        and asset.storage_path = name
        and asset.studio_id in (select ml_internal.writable_studio_ids())
    )
  );

commit;
