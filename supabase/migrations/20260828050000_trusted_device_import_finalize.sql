-- Narrow server-only completion step for an isolated beta device import.
-- The browser never receives this grant or its trusted migration context.

begin;

create or replace function ml_internal.touch_mutable_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('ml.trusted_migration', true) = 'on' then
    return new;
  end if;
  new.created_at := old.created_at;
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

create or replace function ml_private.finalize_trusted_device_import(
  p_studio_id uuid,
  p_confirmation text,
  p_garment_pins jsonb,
  p_spec_pins jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pin jsonb;
  garment_count integer := 0;
  spec_count integer := 0;
begin
  if current_setting('role', true) <> 'service_role'
    or p_confirmation <> 'isolated-beta-device-import-v1'
    or jsonb_typeof(p_garment_pins) <> 'array'
    or jsonb_typeof(p_spec_pins) <> 'array'
  then
    raise exception 'Trusted device import confirmation and service role are required.' using errcode = '42501';
  end if;
  if not exists (select 1 from ml_private.studios where id = p_studio_id) then
    raise exception 'Trusted device import Studio is unavailable.' using errcode = '42501';
  end if;

  perform set_config('ml.trusted_migration', 'on', true);

  for pin in select value from jsonb_array_elements(p_garment_pins)
  loop
    if nullif(pin ->> 'currentVersionId', '') is not null and not exists (
      select 1 from ml_private.garment_versions version
      where version.studio_id = p_studio_id
        and version.garment_id = (pin ->> 'id')::uuid
        and version.id = (pin ->> 'currentVersionId')::uuid
    ) then
      raise exception 'Garment current-version pin is invalid.' using errcode = '23514';
    end if;
    update ml_private.garments
    set current_version_id = nullif(pin ->> 'currentVersionId', '')::uuid,
        revision = (pin ->> 'revision')::bigint,
        updated_at = (pin ->> 'updatedAt')::timestamptz
    where studio_id = p_studio_id and id = (pin ->> 'id')::uuid;
    if not found then raise exception 'Garment pin target is missing.' using errcode = '23514'; end if;
    garment_count := garment_count + 1;
  end loop;

  for pin in select value from jsonb_array_elements(p_spec_pins)
  loop
    if nullif(pin ->> 'releaseValidationRunId', '') is not null and not exists (
      select 1 from ml_private.validation_runs run
      where run.studio_id = p_studio_id
        and run.spec_id = (pin ->> 'id')::uuid
        and run.id = (pin ->> 'releaseValidationRunId')::uuid
    ) then
      raise exception 'Technical release validation pin is invalid.' using errcode = '23514';
    end if;
    update ml_private.technical_specs
    set release_validation_run_id = nullif(pin ->> 'releaseValidationRunId', '')::uuid,
        revision = (pin ->> 'revision')::bigint,
        updated_at = (pin ->> 'updatedAt')::timestamptz
    where studio_id = p_studio_id and id = (pin ->> 'id')::uuid;
    if not found then raise exception 'Technical specification pin target is missing.' using errcode = '23514'; end if;
    spec_count := spec_count + 1;
  end loop;

  perform set_config('ml.trusted_migration', '', true);
  return jsonb_build_object('status', 'applied', 'garments', garment_count, 'technicalSpecs', spec_count);
end;
$$;

revoke all on function ml_private.finalize_trusted_device_import(uuid, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function ml_private.finalize_trusted_device_import(uuid, text, jsonb, jsonb)
  to service_role;

comment on function ml_private.finalize_trusted_device_import(uuid, text, jsonb, jsonb) is
  'Service-only isolated-beta migration completion for circular garment/version and spec/validation pins. Never browser callable.';

commit;
