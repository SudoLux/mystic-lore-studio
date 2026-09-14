-- One-time, service-only completion command for the reviewed V1 fabric
-- recreation. This deliberately supports only missing garment/material links;
-- it cannot update or delete canonical rows and it never touches media.

begin;

create or replace function ml_private.apply_trusted_v1_fabric_relationships(
  p_studio_id uuid,
  p_confirmation text,
  p_relationships jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  relationship jsonb;
  v_relationship_id uuid;
  v_garment_id uuid;
  v_variant_id uuid;
  v_relationship_role text;
  v_relationship_status text;
  v_relationship_unit ml_private.quantity_unit;
  v_required_quantity ml_private.nonnegative_quantity;
  v_reserved_quantity ml_private.nonnegative_quantity;
  v_created_at timestamptz;
  v_updated_at timestamptz;
  inserted_count integer := 0;
  unchanged_count integer := 0;
begin
  if current_setting('role', true) <> 'service_role'
    or p_confirmation <> 'read-v1-write-beta-no-media'
  then
    raise exception 'Trusted V1 fabric recreation confirmation and service role are required.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_relationships) <> 'array'
    or jsonb_array_length(p_relationships) > 50
  then
    raise exception 'Trusted V1 fabric relationships must be an array of at most 50 rows.'
      using errcode = '22023';
  end if;

  if not exists (select 1 from ml_private.studios where id = p_studio_id) then
    raise exception 'Trusted V1 fabric recreation Studio is unavailable.'
      using errcode = '42501';
  end if;

  perform set_config('ml.trusted_migration', 'on', true);

  for relationship in select value from jsonb_array_elements(p_relationships)
  loop
    if relationship - array[
      'id', 'garmentId', 'variantId', 'role', 'requiredQuantity',
      'reservedQuantity', 'unit', 'status', 'createdAt', 'updatedAt'
    ] <> '{}'::jsonb then
      raise exception 'Trusted V1 fabric relationship contains unsupported fields.'
        using errcode = '22023';
    end if;

    v_relationship_id := nullif(relationship ->> 'id', '')::uuid;
    v_garment_id := nullif(relationship ->> 'garmentId', '')::uuid;
    v_variant_id := nullif(relationship ->> 'variantId', '')::uuid;
    v_relationship_role := nullif(btrim(relationship ->> 'role'), '');
    v_relationship_status := nullif(relationship ->> 'status', '');
    v_relationship_unit := nullif(relationship ->> 'unit', '')::ml_private.quantity_unit;
    v_required_quantity := (relationship ->> 'requiredQuantity')::ml_private.nonnegative_quantity;
    v_reserved_quantity := (relationship ->> 'reservedQuantity')::ml_private.nonnegative_quantity;
    v_created_at := coalesce(nullif(relationship ->> 'createdAt', '')::timestamptz, now());
    v_updated_at := coalesce(nullif(relationship ->> 'updatedAt', '')::timestamptz, v_created_at);

    if v_relationship_id is null
      or v_garment_id is null
      or v_variant_id is null
      or v_relationship_role is null
      or v_relationship_status not in ('planned', 'reserved', 'issued', 'consumed', 'released')
      or v_relationship_unit is null
      or v_required_quantity is null
      or v_reserved_quantity is null
      or (v_reserved_quantity > v_required_quantity and v_relationship_status not in ('issued', 'consumed'))
    then
      raise exception 'Trusted V1 fabric relationship is incomplete or invalid.'
        using errcode = '23514';
    end if;

    if not exists (
      select 1 from ml_private.garments garment
      where garment.studio_id = p_studio_id and garment.id = v_garment_id
    ) or not exists (
      select 1 from ml_private.material_variants variant
      where variant.studio_id = p_studio_id and variant.id = v_variant_id
    ) then
      raise exception 'Trusted V1 fabric relationship references a row outside the target Studio.'
        using errcode = '23503';
    end if;

    if exists (
      select 1 from ml_private.garment_materials existing
      where existing.studio_id = p_studio_id
        and (
          existing.id = v_relationship_id
          or (
            existing.garment_id = v_garment_id
            and existing.variant_id = v_variant_id
            and existing.role = v_relationship_role
            and existing.placement is null
          )
        )
    ) then
      unchanged_count := unchanged_count + 1;
      continue;
    end if;

    insert into ml_private.garment_materials (
      id, studio_id, garment_id, variant_id, role, placement,
      required_quantity, reserved_quantity, unit, status,
      created_at, updated_at, revision
    ) values (
      v_relationship_id, p_studio_id, v_garment_id, v_variant_id, v_relationship_role, null,
      v_required_quantity, v_reserved_quantity, v_relationship_unit, v_relationship_status,
      v_created_at, v_updated_at, 1
    );
    inserted_count := inserted_count + 1;
  end loop;

  perform set_config('ml.trusted_migration', '', true);
  return jsonb_build_object(
    'status', 'applied',
    'inserted', inserted_count,
    'unchanged', unchanged_count,
    'mediaMutations', 0
  );
end;
$$;

revoke all on function ml_private.apply_trusted_v1_fabric_relationships(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function ml_private.apply_trusted_v1_fabric_relationships(uuid, text, jsonb)
  to service_role;

comment on function ml_private.apply_trusted_v1_fabric_relationships(uuid, text, jsonb) is
  'Service-only, insert-only completion command for reviewed V1 fabric-to-garment links in isolated beta. Never browser callable; never mutates media.';

commit;
