-- Detach only fabric media relationships created by the earlier V1 visual
-- merge. Assets and Storage objects remain preserved for recovery. Genuine V2
-- uploads, garment media, and every untagged relationship remain untouched.

begin;

create or replace function ml_private.detach_trusted_v1_fabric_media_links(
  p_studio_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  detached_count integer := 0;
begin
  if current_setting('role', true) <> 'service_role'
    or p_confirmation <> 'detach-v1-fabric-links-preserve-assets'
  then
    raise exception 'Trusted V1 fabric media cleanup confirmation and service role are required.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from ml_private.studios where id = p_studio_id) then
    raise exception 'Trusted V1 fabric media cleanup Studio is unavailable.'
      using errcode = '42501';
  end if;

  perform set_config('ml.trusted_migration', 'on', true);

  delete from ml_private.material_variant_media relationship
  using ml_private.media_assets asset
  where relationship.studio_id = p_studio_id
    and asset.studio_id = p_studio_id
    and asset.id = relationship.asset_id
    and asset.rights_json ->> 'migrationSource' = 'mystic-lore-v1';
  get diagnostics detached_count = row_count;

  perform set_config('ml.trusted_migration', '', true);
  return jsonb_build_object(
    'status', 'applied',
    'detached', detached_count,
    'assetsDeleted', 0,
    'storageObjectsDeleted', 0
  );
end;
$$;

revoke all on function ml_private.detach_trusted_v1_fabric_media_links(uuid, text)
  from public, anon, authenticated;
grant execute on function ml_private.detach_trusted_v1_fabric_media_links(uuid, text)
  to service_role;

comment on function ml_private.detach_trusted_v1_fabric_media_links(uuid, text) is
  'Service-only cleanup of material media links explicitly tagged as V1 visual-import evidence. Assets and Storage objects are preserved.';

commit;
