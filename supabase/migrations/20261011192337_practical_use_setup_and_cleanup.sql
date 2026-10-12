begin;

-- Setup is serialized per verified identity; retries reuse the existing Studio.
create or replace function ml_private.complete_studio_setup(
  p_name text, p_timezone text, p_units ml_private.measurement_unit,
  p_currency ml_private.iso_currency, p_locale text default 'en-US'
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  studio uuid;
  slug_text text;
begin
  if actor is null then raise exception 'Sign in before setting up a Studio.' using errcode = '42501'; end if;
  if length(btrim(p_name)) not between 1 and 160 then raise exception 'Enter a Studio name between 1 and 160 characters.' using errcode = '23514'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then raise exception 'Choose a valid timezone.' using errcode = '23514'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('studio-setup:' || actor::text, 0));
  insert into ml_private.profiles (id, user_id, display_name, locale)
  values (actor, actor, btrim(p_name), p_locale)
  on conflict (user_id) do update set display_name = excluded.display_name, locale = excluded.locale;
  select id into studio from ml_private.studios where owner_user_id = actor order by created_at, id limit 1;
  if studio is null then
    slug_text := btrim(regexp_replace(lower(btrim(p_name)), '[^a-z0-9]+', '-', 'g'), '-');
    studio := gen_random_uuid();
    insert into ml_private.studios (id, owner_user_id, name, slug, timezone)
    values (studio, actor, btrim(p_name), coalesce(nullif(slug_text, ''), 'studio') || '-' || actor::text, p_timezone);
    update ml_private.studio_settings set version_policy = version_policy || '{"canonicalPersistence":"cloud"}'::jsonb where studio_id = studio;
  end if;
  update ml_private.studio_settings set units = p_units, currency = p_currency where studio_id = studio;
  return studio;
end;
$$;
revoke all on function ml_private.complete_studio_setup(text,text,ml_private.measurement_unit,ml_private.iso_currency,text) from public, anon;
grant execute on function ml_private.complete_studio_setup(text,text,ml_private.measurement_unit,ml_private.iso_currency,text) to authenticated;

-- Administrative deletion of a tenant must be able to cascade its final owner.
-- A live Studio still cannot lose its last owner.
create or replace function ml_internal.prevent_last_active_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'owner' and old.status = 'active'
    and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active' or new.studio_id <> old.studio_id)
    and exists (select 1 from ml_private.studios where id = old.studio_id)
    and not exists (select 1 from ml_private.studio_members where studio_id = old.studio_id and id <> old.id and role = 'owner' and status = 'active') then
    raise exception 'A studio must retain at least one active owner.' using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- A cascading tenant retirement must not recreate audit rows under a removed root.
create or replace function ml_internal.record_membership_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if exists (select 1 from ml_private.studios where id=old.studio_id) then
      insert into ml_private.change_events (studio_id,garment_id,origin,actor_id,operation_id,entity_type,entity_id,operation,json_patch,inverse_patch)
      values (old.studio_id,null,'system',(select auth.uid()),gen_random_uuid(),'studio_member',old.id,'role_change','[]'::jsonb,'[]'::jsonb);
    end if;
    return old;
  end if;
  insert into ml_private.change_events (studio_id,garment_id,origin,actor_id,operation_id,entity_type,entity_id,operation,json_patch,inverse_patch)
  values (new.studio_id,null,'system',(select auth.uid()),gen_random_uuid(),'studio_member',new.id,'role_change','[]'::jsonb,'[]'::jsonb);
  return new;
end;
$$;

-- Only a trusted tenant-root cascade may remove its change-event journal.
create or replace function ml_internal.reject_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and tg_table_name = 'change_events'
    and (current_setting('role', true) in ('postgres', 'supabase_admin') or (current_setting('role', true) in ('none', '') and session_user in ('postgres', 'supabase_admin')))
    and not exists (select 1 from ml_private.studios where id=old.studio_id) then
    return old;
  end if;
  raise exception 'Version history is append-only; create a new event or Freeze Frame.'
    using errcode = '23514';
end;
$$;

-- Root cleanup is a separate, narrow command. The generic transport's root
-- protections remain intact; no Storage bytes or immutable evidence are purged.
create or replace function ml_internal.delete_studio_item(
  p_studio_id uuid, p_kind text, p_item_id uuid, p_expected_revision bigint, p_operation_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  table_name text;
  item jsonb;
  payload jsonb := jsonb_build_object('kind', p_kind, 'id', p_item_id, 'revision', p_expected_revision);
  receipt jsonb;
  result jsonb;
begin
  if (select auth.uid()) is null or not ml_internal.is_studio_owner(p_studio_id) then
    raise exception 'An active Studio owner must confirm this removal.' using errcode = '42501';
  end if;
  table_name := case p_kind when 'garment' then 'garments' when 'material_variant' then 'material_variants' when 'editorial' then 'editorial_collections' when 'task' then 'tasks' end;
  if table_name is null or p_operation_id is null then raise exception 'Invalid cleanup request.' using errcode = '23514'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_studio_id::text || ':' || p_operation_id::text, 0));
  perform 1 from ml_private.studios where id = p_studio_id for update;
  receipt := ml_internal.protected_receipt(p_studio_id, p_operation_id, 'delete_studio_item', payload);
  if receipt is not null then return receipt || '{"status":"duplicate"}'::jsonb; end if;
  execute format('select to_jsonb(t) from ml_private.%I t where studio_id=$1 and id=$2 for update', table_name) into item using p_studio_id, p_item_id;
  if item is null or (item->>'revision')::bigint is distinct from p_expected_revision then raise exception 'This item changed on another device. Refresh and review the removal again.' using errcode = '40001'; end if;
  if p_kind = 'garment' and (
    exists (select 1 from ml_private.garment_versions where studio_id=p_studio_id and garment_id=p_item_id)
    or exists (select 1 from ml_private.technical_specs where studio_id=p_studio_id and garment_id=p_item_id and status in ('approved','released'))
    or exists (select 1 from ml_private.portfolio_projects where studio_id=p_studio_id and garment_id=p_item_id and visibility <> 'private')
    or exists (select 1 from ml_private.editorial_collections where studio_id=p_studio_id and garment_id=p_item_id and status <> 'draft')
  ) then raise exception 'This garment has retained evidence or stories. Archive it instead.' using errcode = '23514'; end if;
  if p_kind = 'material_variant' and (
    exists (select 1 from ml_private.inventory_entries where studio_id=p_studio_id and variant_id=p_item_id)
    or exists (select 1 from ml_private.garment_materials where studio_id=p_studio_id and variant_id=p_item_id)
    or exists (select 1 from ml_private.bom_items where studio_id=p_studio_id and material_variant_id=p_item_id)
  ) then raise exception 'This fabric has garment, inventory, or production history. Archive it instead.' using errcode = '23514'; end if;
  if p_kind = 'editorial' and (
    item->>'status' <> 'draft'
    or exists (select 1 from ml_private.editorial_exports where studio_id=p_studio_id and collection_id=p_item_id)
    or exists (select 1 from ml_private.portfolio_editorials where studio_id=p_studio_id and collection_id=p_item_id)
  ) then raise exception 'Only draft stories without retained exports or portfolio links can be deleted. Archive this story instead.' using errcode = '23514'; end if;
  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.operation_id', p_operation_id::text, true);
  perform set_config('ml.operation_origin', 'user', true);
  perform set_config('ml.garment_id', '', true);
  if p_kind = 'garment' then
    delete from ml_private.editorial_collections where studio_id=p_studio_id and garment_id=p_item_id and status='draft';
    delete from ml_private.portfolio_projects where studio_id=p_studio_id and garment_id=p_item_id and visibility='private';
  end if;
  if p_kind = 'material_variant' then
    delete from ml_private.supplier_items where studio_id=p_studio_id and material_variant_id=p_item_id;
  end if;
  execute format('delete from ml_private.%I where studio_id=$1 and id=$2', table_name) using p_studio_id, p_item_id;
  if p_kind = 'material_variant' then
    delete from ml_private.materials m where m.studio_id=p_studio_id and m.id=(item->>'material_id')::uuid and not exists(select 1 from ml_private.material_variants v where v.material_id=m.id and v.studio_id=p_studio_id);
  end if;
  result := jsonb_build_object('status','applied','kind',p_kind,'id',p_item_id);
  perform ml_internal.protected_receipt(p_studio_id,p_operation_id,'delete_studio_item',payload,result);
  return result;
exception when foreign_key_violation then
  raise exception 'This item has retained evidence or links. Archive it or remove editable links first.' using errcode = '23514';
end;
$$;
revoke all on function ml_internal.delete_studio_item(uuid,text,uuid,bigint,uuid) from public, anon;
grant execute on function ml_internal.delete_studio_item(uuid,text,uuid,bigint,uuid) to authenticated;
create or replace function ml_private.delete_studio_item(p_studio_id uuid,p_kind text,p_item_id uuid,p_expected_revision bigint,p_operation_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select ml_internal.delete_studio_item(p_studio_id,p_kind,p_item_id,p_expected_revision,p_operation_id);
$$;
revoke all on function ml_private.delete_studio_item(uuid,text,uuid,bigint,uuid) from public, anon;
grant execute on function ml_private.delete_studio_item(uuid,text,uuid,bigint,uuid) to authenticated;
-- Editors need the same serialization without broader Studio table privileges.
create or replace function ml_internal.lock_writable_studio(p_studio_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not ml_internal.can_write_studio(p_studio_id) then raise exception 'Writable Studio membership required.' using errcode='42501'; end if;
  perform 1 from ml_private.studios where id=p_studio_id for update;
end;
$$;
revoke all on function ml_internal.lock_writable_studio(uuid) from public, anon;
grant execute on function ml_internal.lock_writable_studio(uuid) to authenticated;

-- A stale device cannot reinsert an ID already removed from this Studio.
create or replace function ml_private.commit_canonical_operation(
  p_operation_id uuid,
  p_studio_id uuid,
  p_garment_id uuid,
  p_origin text,
  p_mutations jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  mutation jsonb;
  table_name text;
  action_name text;
  entity_id uuid;
  expected_revision bigint;
  current_row jsonb;
  row_json jsonb;
  conflicts jsonb := '[]'::jsonb;
  authoritative_rows jsonb := '[]'::jsonb;
  result_payload jsonb;
  insert_columns text[];
  update_columns text[];
  requested_columns text[];
  client_columns text[];
  allowed_columns text[];
  column_list text;
  select_list text;
  receipt ml_private.canonical_operation_receipts%rowtype;
  mutation_count integer;
  request_hash ml_private.sha256_checksum;
begin
  if (select auth.uid()) is null or not ml_internal.can_write_studio(p_studio_id) then
    raise exception 'Authentication and writable Studio membership are required.' using errcode = '42501';
  end if;
  if p_origin not in ('user', 'sync', 'ai_acceptance', 'restore', 'publication', 'system') then
    raise exception 'Canonical operation origin is invalid.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_mutations) <> 'array' then
    raise exception 'Canonical mutations must be an array.' using errcode = '23514';
  end if;
  mutation_count := jsonb_array_length(p_mutations);
  if mutation_count < 1 or mutation_count > 2000 then
    raise exception 'Canonical operations require between 1 and 2000 mutations.' using errcode = '23514';
  end if;
  request_hash := encode(extensions.digest(jsonb_build_object(
    'garmentId', p_garment_id, 'origin', p_origin, 'mutations', p_mutations
  )::text, 'sha256'), 'hex')::ml_private.sha256_checksum;
  if (
    select count(*) <> count(distinct (value ->> 'entityType', value ->> 'entityId'))
    from jsonb_array_elements(p_mutations)
  ) then
    raise exception 'A canonical operation cannot mutate the same entity twice.' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_studio_id::text || ':' || p_operation_id::text, 0));
  perform ml_internal.lock_writable_studio(p_studio_id);

  select * into receipt
  from ml_private.canonical_operation_receipts existing
  where existing.studio_id = p_studio_id and existing.id = p_operation_id;
  if receipt.id is not null then
    if receipt.receipt_kind <> 'canonical_operation'
      or receipt.request_checksum is distinct from request_hash then
      raise exception 'Operation ID was already used for a different canonical request.' using errcode = '23505';
    end if;
    return receipt.result_json || jsonb_build_object('status', 'duplicate');
  end if;

  -- Lock and compare every target before the first write so conflicts never
  -- leave partially applied relationship groups.
  for mutation in select value from jsonb_array_elements(p_mutations)
  loop
    table_name := ml_internal.canonical_client_table(mutation ->> 'entityType');
    action_name := mutation ->> 'action';
    entity_id := nullif(mutation ->> 'entityId', '')::uuid;
    expected_revision := nullif(mutation ->> 'baseRevision', '')::bigint;

    if table_name is null or action_name not in ('insert', 'update', 'delete') or entity_id is null then
      raise exception 'Canonical mutation entity, action, or identifier is invalid.' using errcode = '23514';
    end if;
    if table_name = 'inventory_entries' and action_name <> 'insert' then
      raise exception 'Inventory entries are append-only.' using errcode = '23514';
    end if;
    if action_name in ('insert', 'update') and jsonb_typeof(mutation -> 'row') <> 'object' then
      raise exception 'Canonical insert and update mutations require a row object.' using errcode = '23514';
    end if;
    select coalesce(array_agg(key order by key), '{}'::text[])
    into client_columns from jsonb_object_keys(
      case when action_name in ('insert', 'update') then mutation -> 'row' else '{}'::jsonb end
    ) key;
    allowed_columns := ml_internal.canonical_client_columns(table_name);
    if exists (select 1 from unnest(client_columns) item where not item = any(allowed_columns)) then
      raise exception 'Canonical mutation for % contains a server-owned or unknown column.', table_name using errcode = '42501';
    end if;
    if action_name = 'update' and exists (
      select 1 from unnest(client_columns) item
      where item = any(ml_internal.canonical_stable_columns(table_name))
    ) then
      raise exception 'Stable identity columns cannot be changed after insert.' using errcode = '42501';
    end if;
    if table_name = 'ai_jobs' and action_name <> 'insert' then
      raise exception 'AI job lifecycle changes require the governed transition command.' using errcode = '42501';
    end if;
    if table_name = 'qc_waivers' then
      raise exception 'QC waivers require the protected waiver command.' using errcode = '42501';
    end if;
    if table_name = 'technical_specs' and coalesce(mutation #>> '{row,status}', '') = 'released' then
      raise exception 'Technical release requires the protected release command.' using errcode = '42501';
    end if;
    if action_name = 'delete' and not ml_internal.canonical_delete_allowed(table_name) then
      raise exception 'Canonical root % must be archived or transitioned, not deleted.', table_name using errcode = '23514';
    end if;

    execute format(
      'select to_jsonb(target) from ml_private.%I target where target.id = $1 and target.studio_id = $2 for update',
      table_name
    ) into current_row using entity_id, p_studio_id;

    if action_name = 'insert' and exists (select 1 from ml_private.sync_tombstones where studio_id=p_studio_id and entity_type=table_name and client_id=entity_id::text) then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object(
        'entityType', mutation ->> 'entityType', 'entityId', entity_id,
        'expectedRevision', expected_revision, 'currentRevision', null,
        'currentRow', null, 'reason', 'deleted'
      ));
    elsif action_name = 'insert' and current_row is not null then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object(
        'entityType', mutation ->> 'entityType', 'entityId', entity_id,
        'expectedRevision', expected_revision, 'currentRevision', current_row -> 'revision',
        'currentRow', current_row, 'reason', 'already_exists'
      ));
    elsif action_name <> 'insert' and current_row is null then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object(
        'entityType', mutation ->> 'entityType', 'entityId', entity_id,
        'expectedRevision', expected_revision, 'currentRevision', null,
        'currentRow', null, 'reason', 'missing_or_denied'
      ));
    elsif action_name <> 'insert' and current_row ? 'revision'
      and (expected_revision is null or (current_row ->> 'revision')::bigint <> expected_revision) then
      conflicts := conflicts || jsonb_build_array(jsonb_build_object(
        'entityType', mutation ->> 'entityType', 'entityId', entity_id,
        'expectedRevision', expected_revision,
        'currentRevision', (current_row ->> 'revision')::bigint,
        'currentRow', current_row, 'reason', 'stale_revision'
      ));
    end if;
  end loop;

  if jsonb_array_length(conflicts) > 0 then
    return jsonb_build_object('status', 'conflict', 'conflicts', conflicts, 'authoritativeRows', '[]'::jsonb);
  end if;

  perform set_config('ml.operation_id', p_operation_id::text, true);
  perform set_config('ml.operation_origin', p_origin, true);
  perform set_config('ml.garment_id', coalesce(p_garment_id::text, ''), true);

  for mutation in select value from jsonb_array_elements(p_mutations)
  loop
    table_name := ml_internal.canonical_client_table(mutation ->> 'entityType');
    action_name := mutation ->> 'action';
    entity_id := (mutation ->> 'entityId')::uuid;
    row_json := (case
      when jsonb_typeof(mutation -> 'row') = 'object' then mutation -> 'row'
      else '{}'::jsonb
    end)
      || jsonb_build_object('id', entity_id, 'studio_id', p_studio_id);

    row_json := row_json || case table_name
      when 'media_assets' then jsonb_build_object('created_by', (select auth.uid()))
      when 'design_annotations' then jsonb_build_object('author_id', (select auth.uid()))
      when 'inventory_entries' then jsonb_build_object('actor_id', (select auth.uid()))
      when 'fit_issue_promotions' then jsonb_build_object('created_by', (select auth.uid()))
      when 'ai_jobs' then jsonb_build_object('requested_by', (select auth.uid()), 'status', 'queued')
      else '{}'::jsonb
    end;
    if row_json ? 'approved_at' and row_json ->> 'approved_at' is not null then
      row_json := row_json || jsonb_build_object('approved_by', (select auth.uid()));
    end if;
    if row_json ? 'published_at' and row_json ->> 'published_at' is not null then
      row_json := row_json || jsonb_build_object('published_by', (select auth.uid()));
    end if;
    if row_json ? 'inspected_at' and row_json ->> 'inspected_at' is not null then
      row_json := row_json || jsonb_build_object('inspected_by', (select auth.uid()));
    end if;

    select array_agg(attribute.attname order by attribute.attnum)
    into insert_columns
    from pg_catalog.pg_attribute attribute
    where attribute.attrelid = format('ml_private.%I', table_name)::regclass
      and attribute.attnum > 0 and not attribute.attisdropped
      and attribute.attgenerated = ''
      and attribute.attname not in ('created_at', 'updated_at', 'revision');

    select array_agg(key order by key)
    into requested_columns
    from jsonb_object_keys(row_json) key
    where key = any(insert_columns);

    if action_name = 'insert' then
      column_list := array_to_string(array(select format('%I', item) from unnest(requested_columns) item), ', ');
      select_list := array_to_string(array(select format('typed.%I', item) from unnest(requested_columns) item), ', ');
      execute format(
        'insert into ml_private.%I (%s) select %s from jsonb_populate_record(null::ml_private.%I, $1) typed',
        table_name, column_list, select_list, table_name
      ) using row_json;
    elsif action_name = 'update' then
      select array_agg(item order by item)
      into update_columns
      from unnest(requested_columns) item
      where item not in ('id', 'studio_id')
        and not item = any(ml_internal.canonical_stable_columns(table_name));
      if coalesce(array_length(update_columns, 1), 0) = 0 then
        raise exception 'Canonical update for % contains no mutable fields.', table_name using errcode = '23514';
      end if;
      column_list := array_to_string(array(select format('%I', item) from unnest(update_columns) item), ', ');
      select_list := array_to_string(array(select format('typed.%I', item) from unnest(update_columns) item), ', ');
      execute format(
        'update ml_private.%I target set (%s) = (select %s from jsonb_populate_record(null::ml_private.%I, $1) typed) where target.id = $2 and target.studio_id = $3',
        table_name, column_list, select_list, table_name
      ) using row_json, entity_id, p_studio_id;
    else
      execute format(
        'delete from ml_private.%I target where target.id = $1 and target.studio_id = $2',
        table_name
      ) using entity_id, p_studio_id;
    end if;

    if action_name = 'delete' then
      authoritative_rows := authoritative_rows || jsonb_build_array(jsonb_build_object(
        'entityType', mutation ->> 'entityType', 'entityId', entity_id, 'row', null
      ));
    else
      execute format(
        'select to_jsonb(target) from ml_private.%I target where target.id = $1 and target.studio_id = $2',
        table_name
      ) into current_row using entity_id, p_studio_id;
      authoritative_rows := authoritative_rows || jsonb_build_array(jsonb_build_object(
        'entityType', mutation ->> 'entityType', 'entityId', entity_id, 'row', current_row
      ));
    end if;
  end loop;

  result_payload := jsonb_build_object(
    'status', 'applied',
    'operationId', p_operation_id,
    'authoritativeRows', authoritative_rows,
    'eventIds', coalesce((
      select jsonb_agg(event.id order by event.occurred_at, event.id)
      from ml_private.change_events event
      where event.studio_id = p_studio_id and event.operation_id = p_operation_id
    ), '[]'::jsonb)
  );

  perform ml_internal.store_canonical_operation_receipt(
    p_operation_id, p_studio_id, p_garment_id, p_origin,
    mutation_count, request_hash, result_payload
  );
  -- PostgREST ends the transaction after an RPC, but clearing the guard
  -- context here also prevents a caller-controlled surrounding transaction
  -- from reusing the operation identity for an unrelated direct write.
  perform set_config('ml.operation_id', '', true);
  perform set_config('ml.operation_origin', '', true);
  perform set_config('ml.garment_id', '', true);
  return result_payload;
end;
$$;
commit;
