begin;

-- Freeze Frame identity and parent/current integrity ---------------------------

alter table ml_private.garment_versions
  add column notes text not null default '',
  add column version_kind text not null default 'named',
  add column base_revision bigint not null default 1,
  add constraint garment_versions_kind_check
    check (version_kind in ('named', 'release', 'restore')),
  add constraint garment_versions_base_revision_check
    check (base_revision > 0);

update ml_private.garment_versions
set scope_json = jsonb_set(scope_json, '{domain}', '"technical"'::jsonb, true)
where not (scope_json ? 'domain');

alter table ml_private.garment_versions
  add constraint garment_versions_scope_domain_check check (
    scope_json ->> 'domain' in ('all', 'design', 'technical', 'production', 'editorial', 'portfolio')
  );

alter table ml_private.garment_versions
  drop constraint if exists garment_versions_studio_id_garment_id_checksum_key,
  drop constraint if exists garment_versions_parent_fk,
  add constraint garment_versions_same_garment_identity_key
    unique (studio_id, garment_id, id),
  add constraint garment_versions_parent_fk
    foreign key (studio_id, garment_id, parent_version_id)
    references ml_private.garment_versions(studio_id, garment_id, id)
    on delete restrict;

alter table ml_private.garments
  drop constraint if exists garments_current_version_fk,
  add constraint garments_current_version_fk
    foreign key (studio_id, id, current_version_id)
    references ml_private.garment_versions(studio_id, garment_id, id)
    on delete restrict;

create index ml_garment_versions_checksum_idx
  on ml_private.garment_versions (studio_id, garment_id, checksum);
create index ml_garment_versions_parent_idx
  on ml_private.garment_versions (studio_id, garment_id, parent_version_id)
  where parent_version_id is not null;

-- Append-only replay evidence --------------------------------------------------

alter table ml_private.entity_revisions
  add column scope text not null default 'all',
  add constraint entity_revisions_scope_check
    check (scope in ('all', 'design', 'technical', 'production', 'editorial', 'portfolio'));

alter table ml_private.change_events
  add column scope_json jsonb not null default '{"domain":"all"}'::jsonb,
  add column related_operation_ids uuid[] not null default '{}'::uuid[],
  add column base_revision bigint,
  add column result_revision bigint,
  add constraint change_events_scope_object_check
    check (jsonb_typeof(scope_json) = 'object'),
  add constraint change_events_revision_order_check check (
    base_revision is null
    or result_revision is null
    or result_revision >= base_revision
  );

alter table ml_private.restore_operations
  add column replay_patch jsonb not null default '[]'::jsonb,
  add column inverse_patch jsonb not null default '[]'::jsonb,
  add column selected_keys_json jsonb not null default '[]'::jsonb,
  add column dependency_json jsonb not null default '[]'::jsonb,
  add column preview_checksum ml_private.sha256_checksum,
  add column base_revision bigint,
  add column result_revision bigint,
  add constraint restore_operations_replay_patch_check
    check (jsonb_typeof(replay_patch) = 'array'),
  add constraint restore_operations_inverse_patch_check
    check (jsonb_typeof(inverse_patch) = 'array'),
  add constraint restore_operations_selected_keys_check
    check (jsonb_typeof(selected_keys_json) = 'array'),
  add constraint restore_operations_dependency_check
    check (jsonb_typeof(dependency_json) = 'array');

update ml_private.restore_operations operation
set
  scope_json = case when operation.scope_json ? 'domain'
    then operation.scope_json
    else operation.scope_json || '{"domain":"technical"}'::jsonb end,
  preview_checksum = coalesce(
    operation.preview_checksum,
    (select version.checksum from ml_private.garment_versions version
      where version.studio_id = operation.studio_id and version.id = operation.result_version_id),
    repeat('0', 64)::ml_private.sha256_checksum
  ),
  base_revision = coalesce(
    operation.base_revision,
    (select version.base_revision from ml_private.garment_versions version
      where version.studio_id = operation.studio_id and version.id = operation.source_version_id),
    1
  ),
  result_revision = coalesce(
    operation.result_revision,
    (select version.base_revision + 1 from ml_private.garment_versions version
      where version.studio_id = operation.studio_id and version.id = operation.result_version_id),
    2
  );

alter table ml_private.restore_operations
  alter column preview_checksum set not null,
  alter column base_revision set not null,
  alter column result_revision set not null,
  add constraint restore_operations_revision_order_check
    check (base_revision > 0 and result_revision > base_revision),
  add constraint restore_operations_scope_domain_check check (
    scope_json ->> 'domain' in ('all', 'design', 'technical', 'production', 'editorial', 'portfolio')
  );

create index ml_change_events_entity_time_idx
  on ml_private.change_events (studio_id, garment_id, entity_type, entity_id, occurred_at desc);
create index ml_restore_operations_source_idx
  on ml_private.restore_operations (studio_id, source_version_id, created_at desc);
create index ml_tech_pack_exports_version_idx
  on ml_private.tech_pack_exports (studio_id, garment_version_id);
create index ml_production_orders_version_idx
  on ml_private.production_orders (studio_id, garment_version_id);
create index ml_sample_rounds_version_idx
  on ml_private.sample_rounds (studio_id, garment_version_id)
  where garment_version_id is not null;
create index ml_cost_sheets_version_idx
  on ml_private.cost_sheets (studio_id, garment_version_id)
  where garment_version_id is not null;
create index ml_publications_source_version_idx
  on ml_public.publications (studio_id, source_version_id)
  where source_version_id is not null;

-- Immutable history and protected dependency guard ----------------------------

create or replace function ml_internal.reject_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Version history is append-only; create a new event or Freeze Frame.'
    using errcode = '23514';
end;
$$;

create or replace function ml_internal.guard_freeze_frame_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'Freeze Frames are immutable; create a new Freeze Frame.'
      using errcode = '23514';
  end if;

  if exists (select 1 from ml_private.technical_specs spec
      where spec.studio_id = old.studio_id and spec.release_version_id = old.id)
    or exists (select 1 from ml_private.tech_pack_exports export
      where export.studio_id = old.studio_id and export.garment_version_id = old.id)
    or exists (select 1 from ml_private.production_orders production_order
      where production_order.studio_id = old.studio_id and production_order.garment_version_id = old.id)
    or exists (select 1 from ml_public.publications publication
      where publication.studio_id = old.studio_id and publication.source_version_id = old.id)
  then
    raise exception 'Freeze Frame is protected by a release, export, order, or publication.'
      using errcode = '23503';
  end if;

  return old;
end;
$$;

revoke all on function ml_internal.reject_history_mutation() from public, anon, authenticated;
revoke all on function ml_internal.guard_freeze_frame_mutation() from public, anon, authenticated;

create trigger change_events_append_only
  before update or delete on ml_private.change_events
  for each row execute function ml_internal.reject_history_mutation();
create trigger entity_revisions_append_only
  before update or delete on ml_private.entity_revisions
  for each row execute function ml_internal.reject_history_mutation();
create trigger restore_operations_append_only
  before update or delete on ml_private.restore_operations
  for each row execute function ml_internal.reject_history_mutation();
create trigger garment_versions_immutable_and_protected
  before update or delete on ml_private.garment_versions
  for each row execute function ml_internal.guard_freeze_frame_mutation();

-- Fresh-revision Freeze Frame and restore commands ----------------------------

create or replace function ml_internal.create_freeze_frame(
  p_garment_id uuid,
  p_label text,
  p_notes text,
  p_scope_json jsonb,
  p_snapshot_json jsonb,
  p_checksum ml_private.sha256_checksum,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_version_kind text default 'named'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target ml_private.garments;
  next_version_no integer;
  new_version_id uuid := gen_random_uuid();
  scope_domain text := coalesce(p_scope_json ->> 'domain', 'all');
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into target
  from ml_private.garments garment
  where garment.id = p_garment_id
  for update;

  if target.id is null or not ml_internal.can_write_studio(target.studio_id) then
    raise exception 'Garment not found or caller cannot create a Freeze Frame.' using errcode = '42501';
  end if;
  if target.revision <> p_expected_revision then
    raise exception 'Fresh server state is required; expected revision %, found %.', p_expected_revision, target.revision
      using errcode = '40001';
  end if;
  if length(btrim(coalesce(p_label, ''))) = 0 or jsonb_typeof(p_scope_json) <> 'object'
    or jsonb_typeof(p_snapshot_json) <> 'object'
    or scope_domain not in ('all', 'design', 'technical', 'production', 'editorial', 'portfolio')
    or p_version_kind not in ('named', 'release', 'restore')
  then
    raise exception 'Freeze Frame label, scope, snapshot, or kind is invalid.' using errcode = '23514';
  end if;

  select coalesce(max(version.version_no), 0) + 1 into next_version_no
  from ml_private.garment_versions version
  where version.studio_id = target.studio_id and version.garment_id = target.id;

  insert into ml_private.garment_versions (
    id, studio_id, garment_id, parent_version_id, version_no, label, notes,
    version_kind, base_revision, scope_json, snapshot_json, checksum, created_by
  ) values (
    new_version_id, target.studio_id, target.id, target.current_version_id,
    next_version_no, btrim(p_label), btrim(coalesce(p_notes, '')),
    p_version_kind, target.revision, p_scope_json, p_snapshot_json, p_checksum,
    (select auth.uid())
  );

  insert into ml_private.entity_revisions (
    studio_id, garment_version_id, entity_type, entity_id, operation,
    snapshot_json, checksum, scope
  ) values (
    target.studio_id, new_version_id, 'garment_scope', target.id,
    case when p_version_kind = 'restore' then 'restore' else 'create' end,
    p_snapshot_json, p_checksum, scope_domain
  );

  update ml_private.garments
  set current_version_id = new_version_id, revision = revision + 1, updated_at = now()
  where studio_id = target.studio_id and id = target.id;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id, entity_type,
    entity_id, operation, json_patch, inverse_patch, scope_json,
    base_revision, result_revision
  ) values (
    target.studio_id, target.id,
    case when p_version_kind = 'restore' then 'restore' else 'user' end,
    (select auth.uid()), p_operation_id, 'garment_version', new_version_id,
    'create',
    jsonb_build_array(jsonb_build_object('op', 'add', 'path', '/garment_versions/' || new_version_id::text, 'value', p_snapshot_json)),
    jsonb_build_array(jsonb_build_object('op', 'remove', 'path', '/garment_versions/' || new_version_id::text)),
    p_scope_json, target.revision, target.revision + 1
  );

  return new_version_id;
end;
$$;

create or replace function ml_internal.record_restore_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch,
    scope_json, base_revision, result_revision
  ) values (
    new.studio_id, new.garment_id, 'restore', new.actor_id, new.id,
    'garment', new.garment_id, 'restore', new.replay_patch, new.inverse_patch,
    new.scope_json, new.base_revision, new.result_revision
  );
  return new;
end;
$$;

create or replace function ml_internal.commit_restore(
  p_garment_id uuid,
  p_source_version_id uuid,
  p_label text,
  p_reason text,
  p_scope_json jsonb,
  p_result_snapshot jsonb,
  p_result_checksum ml_private.sha256_checksum,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_selected_keys jsonb,
  p_dependency_json jsonb,
  p_replay_patch jsonb,
  p_inverse_patch jsonb,
  p_preview_checksum ml_private.sha256_checksum
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_version_id uuid;
  source_version ml_private.garment_versions;
begin
  select * into source_version
  from ml_private.garment_versions version
  where version.id = p_source_version_id and version.garment_id = p_garment_id;

  if source_version.id is null then
    raise exception 'Restore source Freeze Frame does not belong to this garment.' using errcode = '23514';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 8
    or jsonb_typeof(p_selected_keys) <> 'array'
    or jsonb_typeof(p_dependency_json) <> 'array'
    or jsonb_typeof(p_replay_patch) <> 'array'
    or jsonb_typeof(p_inverse_patch) <> 'array'
  then
    raise exception 'Restore reason, selection, dependencies, or replay evidence is invalid.' using errcode = '23514';
  end if;

  result_version_id := ml_internal.create_freeze_frame(
    p_garment_id, p_label, p_reason, p_scope_json, p_result_snapshot,
    p_result_checksum, p_expected_revision, p_operation_id, 'restore'
  );

  insert into ml_private.restore_operations (
    id, studio_id, garment_id, source_version_id, result_version_id,
    scope_json, reason, actor_id, replay_patch, inverse_patch,
    selected_keys_json, dependency_json, preview_checksum,
    base_revision, result_revision
  ) values (
    p_operation_id, source_version.studio_id, p_garment_id,
    p_source_version_id, result_version_id, p_scope_json, btrim(p_reason),
    (select auth.uid()), p_replay_patch, p_inverse_patch, p_selected_keys,
    p_dependency_json, p_preview_checksum, p_expected_revision,
    p_expected_revision + 1
  );

  return result_version_id;
end;
$$;

revoke all on function ml_internal.create_freeze_frame(uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, text) from public, anon, authenticated;
revoke all on function ml_internal.commit_restore(uuid, uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, jsonb, jsonb, jsonb, jsonb, ml_private.sha256_checksum) from public, anon, authenticated;
-- The invoker wrappers need only EXECUTE on these exact functions. The
-- ml_internal schema itself is not exposed to API roles, and both commands
-- perform their own auth.uid(), Studio-membership, and fresh-revision checks.
grant execute on function ml_internal.create_freeze_frame(uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, text) to authenticated;
grant execute on function ml_internal.commit_restore(uuid, uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, jsonb, jsonb, jsonb, jsonb, ml_private.sha256_checksum) to authenticated;

create or replace function ml_private.create_freeze_frame(
  p_garment_id uuid,
  p_label text,
  p_notes text,
  p_scope_json jsonb,
  p_snapshot_json jsonb,
  p_checksum ml_private.sha256_checksum,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_version_kind text default 'named'
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ml_internal.create_freeze_frame(
    p_garment_id, p_label, p_notes, p_scope_json, p_snapshot_json,
    p_checksum, p_expected_revision, p_operation_id, p_version_kind
  );
$$;

create or replace function ml_private.commit_restore(
  p_garment_id uuid,
  p_source_version_id uuid,
  p_label text,
  p_reason text,
  p_scope_json jsonb,
  p_result_snapshot jsonb,
  p_result_checksum ml_private.sha256_checksum,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_selected_keys jsonb,
  p_dependency_json jsonb,
  p_replay_patch jsonb,
  p_inverse_patch jsonb,
  p_preview_checksum ml_private.sha256_checksum
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select ml_internal.commit_restore(
    p_garment_id, p_source_version_id, p_label, p_reason, p_scope_json,
    p_result_snapshot, p_result_checksum, p_expected_revision, p_operation_id,
    p_selected_keys, p_dependency_json, p_replay_patch, p_inverse_patch,
    p_preview_checksum
  );
$$;

revoke all on function ml_private.create_freeze_frame(uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, text) from public, anon;
revoke all on function ml_private.commit_restore(uuid, uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, jsonb, jsonb, jsonb, jsonb, ml_private.sha256_checksum) from public, anon;
grant execute on function ml_private.create_freeze_frame(uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, text) to authenticated;
grant execute on function ml_private.commit_restore(uuid, uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, jsonb, jsonb, jsonb, jsonb, ml_private.sha256_checksum) to authenticated;

create or replace function ml_internal.require_fresh_publication_source()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_public and not old.is_public and new.source_version_id is not null
    and not exists (
      select 1
      from ml_private.garment_versions version
      join ml_private.garments garment
        on garment.studio_id = version.studio_id
       and garment.id = version.garment_id
       and garment.current_version_id = version.id
      where version.studio_id = new.studio_id
        and version.id = new.source_version_id
    )
  then
    raise exception 'Fresh server state is required; publication source is not the current Freeze Frame.'
      using errcode = '40001';
  end if;
  return new;
end;
$$;

revoke all on function ml_internal.require_fresh_publication_source() from public, anon, authenticated;
create trigger publications_require_fresh_source
  before update of is_public on ml_public.publications
  for each row execute function ml_internal.require_fresh_publication_source();

comment on table ml_private.garment_versions is
  'Immutable named Freeze Frames. Parent/current identity is garment-scoped and checksums are reproducible rather than globally unique.';
comment on table ml_private.change_events is
  'Append-only replay ledger with mutation origin, actor, operation group, garment scope, before/after patches, revisions, and time.';
comment on table ml_private.restore_operations is
  'Non-destructive restore audit linking source and newly-created result Freeze Frames plus selected scope and downstream warnings.';

commit;
