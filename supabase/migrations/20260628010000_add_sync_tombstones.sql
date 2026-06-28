-- Durable deletion records prevent stale device caches from recreating rows
-- that were deleted on another signed-in device.

create table if not exists public.sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity text not null check (
    entity in (
      'project',
      'fabric',
      'task',
      'note',
      'material',
      'lookbook',
      'project_image',
      'fabric_image',
      'yardage'
    )
  ),
  client_id text not null,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entity, client_id)
);

comment on table public.sync_tombstones is
  'Deletion markers used to reconcile stale offline caches across a user''s devices.';

create index if not exists sync_tombstones_user_id_idx
  on public.sync_tombstones(user_id);
create index if not exists sync_tombstones_user_deleted_at_idx
  on public.sync_tombstones(user_id, deleted_at desc);

alter table public.sync_tombstones enable row level security;

drop trigger if exists set_sync_tombstones_updated_at on public.sync_tombstones;
create trigger set_sync_tombstones_updated_at
  before update on public.sync_tombstones
  for each row execute function public.set_updated_at();

create policy "Authenticated users can select own sync tombstones"
  on public.sync_tombstones for select to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own sync tombstones"
  on public.sync_tombstones for insert to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can update own sync tombstones"
  on public.sync_tombstones for update to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can delete own sync tombstones"
  on public.sync_tombstones for delete to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create or replace function public.sync_entity_for_table(table_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select case table_name
    when 'projects' then 'project'
    when 'fabrics' then 'fabric'
    when 'tasks' then 'task'
    when 'notes' then 'note'
    when 'materials' then 'material'
    when 'lookbook_pages' then 'lookbook'
    when 'project_images' then 'project_image'
    when 'yardage_entries' then 'yardage'
  end;
$$;

create or replace function public.record_deleted_sync_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sync_entity text := public.sync_entity_for_table(tg_table_name);
  deletion_time timestamptz := now();
begin
  if sync_entity is null then
    return old;
  end if;

  insert into public.sync_tombstones (
    user_id,
    entity,
    client_id,
    deleted_at,
    updated_at
  ) values (
    old.user_id,
    sync_entity,
    old.client_id,
    deletion_time,
    deletion_time
  )
  on conflict (user_id, entity, client_id) do update set
    deleted_at = greatest(public.sync_tombstones.deleted_at, excluded.deleted_at),
    updated_at = now();

  return old;
end;
$$;

create or replace function public.guard_tombstoned_sync_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sync_entity text := public.sync_entity_for_table(tg_table_name);
  tombstone_time timestamptz;
  incoming_time timestamptz := coalesce(new.updated_at, now());
begin
  if sync_entity is null then
    return new;
  end if;

  select deleted_at into tombstone_time
  from public.sync_tombstones
  where user_id = new.user_id
    and entity = sync_entity
    and client_id = new.client_id;

  if tombstone_time is null then
    return new;
  end if;

  if incoming_time <= tombstone_time then
    return null;
  end if;

  delete from public.sync_tombstones
  where user_id = new.user_id
    and entity = sync_entity
    and client_id = new.client_id;

  return new;
end;
$$;

create or replace function public.record_sync_tombstone(
  p_entity text,
  p_client_id text,
  p_deleted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication is required to record a sync tombstone.';
  end if;

  insert into public.sync_tombstones (
    user_id,
    entity,
    client_id,
    deleted_at,
    updated_at
  ) values (
    current_user_id,
    p_entity,
    p_client_id,
    p_deleted_at,
    now()
  )
  on conflict (user_id, entity, client_id) do update set
    deleted_at = greatest(public.sync_tombstones.deleted_at, excluded.deleted_at),
    updated_at = now();
end;
$$;

create or replace function public.clear_fabric_image_if_matches(
  p_fabric_client_id text,
  p_image_client_id text,
  p_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared boolean := false;
  affected_rows integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to clear fabric image metadata.';
  end if;

  update public.fabrics set
    image_filename = null,
    image_fit = null,
    image_height = null,
    image_mime_type = null,
    image_path = null,
    image_position_x = null,
    image_position_y = null,
    image_size_bytes = null,
    image_width = null,
    image_zoom = null,
    metadata = jsonb_set(coalesce(metadata, '{}'::jsonb), '{image}', 'null'::jsonb, true),
    updated_at = now()
  where user_id = auth.uid()
    and client_id = p_fabric_client_id
    and (
      metadata #>> '{image,id}' = p_image_client_id
      or (p_storage_path is not null and image_path = p_storage_path)
    );

  get diagnostics affected_rows = row_count;
  cleared := affected_rows > 0;
  return cleared;
end;
$$;

revoke all on function public.record_sync_tombstone(text, text, timestamptz) from public;
grant execute on function public.record_sync_tombstone(text, text, timestamptz) to authenticated;
revoke all on function public.clear_fabric_image_if_matches(text, text, text) from public;
grant execute on function public.clear_fabric_image_if_matches(text, text, text) to authenticated;
revoke all on function public.record_deleted_sync_row() from public;
revoke all on function public.guard_tombstoned_sync_row() from public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'projects',
    'fabrics',
    'tasks',
    'notes',
    'materials',
    'lookbook_pages',
    'project_images',
    'yardage_entries'
  ] loop
    execute format('drop trigger if exists record_sync_tombstone_on_delete on public.%I', table_name);
    execute format(
      'create trigger record_sync_tombstone_on_delete before delete on public.%I for each row execute function public.record_deleted_sync_row()',
      table_name
    );
    execute format('drop trigger if exists guard_sync_tombstone_on_write on public.%I', table_name);
    execute format(
      'create trigger guard_sync_tombstone_on_write before insert or update on public.%I for each row execute function public.guard_tombstoned_sync_row()',
      table_name
    );
  end loop;
end;
$$;
