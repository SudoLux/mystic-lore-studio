-- Allow a Studio owner to retry an upsert of the settings row that the Studio
-- bootstrap trigger creates atomically. Supabase upsert requires INSERT plus
-- SELECT and UPDATE permissions even when the singleton already exists.

begin;

create policy studio_settings_insert_owner on ml_private.studio_settings
  for insert to authenticated
  with check (studio_id in (select ml_internal.owned_studio_ids()));

grant insert on table ml_private.studio_settings to authenticated;

comment on policy studio_settings_insert_owner on ml_private.studio_settings is
  'Permits the authenticated Studio owner to retry the singleton settings upsert during canonical migration.';

commit;
