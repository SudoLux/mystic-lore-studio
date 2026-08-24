-- Mystic Lore Studio 2.0 membership-derived RLS and public-cut boundary.

begin;

-- Membership helpers are SECURITY DEFINER to avoid recursive studio_members
-- policies. They live outside every exposed schema, pin search_path to empty,
-- and always evaluate the caller's auth.uid() explicitly.
create or replace function ml_internal.is_studio_member(p_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from ml_private.studio_members membership
      where membership.studio_id = p_studio_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
    );
$$;

create or replace function ml_internal.can_write_studio(p_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from ml_private.studio_members membership
      where membership.studio_id = p_studio_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role in ('owner', 'editor')
    );
$$;

create or replace function ml_internal.is_studio_owner(p_studio_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from ml_private.studio_members membership
      where membership.studio_id = p_studio_id
        and membership.user_id = (select auth.uid())
        and membership.status = 'active'
        and membership.role = 'owner'
    );
$$;

create or replace function ml_internal.member_studio_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.studio_id
  from ml_private.studio_members membership
  where (select auth.uid()) is not null
    and membership.user_id = (select auth.uid())
    and membership.status = 'active';
$$;

create or replace function ml_internal.writable_studio_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.studio_id
  from ml_private.studio_members membership
  where (select auth.uid()) is not null
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'editor');
$$;

create or replace function ml_internal.owned_studio_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select membership.studio_id
  from ml_private.studio_members membership
  where (select auth.uid()) is not null
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role = 'owner';
$$;

comment on function ml_internal.is_studio_member(uuid) is
  'RLS helper: true only for the caller''s active membership in the requested studio.';
comment on function ml_internal.can_write_studio(uuid) is
  'RLS helper: true only for active owner/editor callers; reviewer/viewer remain read-only.';
comment on function ml_internal.is_studio_owner(uuid) is
  'RLS helper: true only for an active owner membership.';
comment on function ml_internal.member_studio_ids() is
  'RLS set helper returning the caller''s active Studio IDs once per statement.';
comment on function ml_internal.writable_studio_ids() is
  'RLS set helper returning Studio IDs where the caller is an active owner/editor.';
comment on function ml_internal.owned_studio_ids() is
  'RLS set helper returning Studio IDs where the caller is an active owner.';

revoke all on function ml_internal.is_studio_member(uuid) from public, anon, authenticated;
revoke all on function ml_internal.can_write_studio(uuid) from public, anon, authenticated;
revoke all on function ml_internal.is_studio_owner(uuid) from public, anon, authenticated;
revoke all on function ml_internal.member_studio_ids() from public, anon, authenticated;
revoke all on function ml_internal.writable_studio_ids() from public, anon, authenticated;
revoke all on function ml_internal.owned_studio_ids() from public, anon, authenticated;
grant execute on function ml_internal.is_studio_member(uuid) to authenticated;
grant execute on function ml_internal.can_write_studio(uuid) to authenticated;
grant execute on function ml_internal.is_studio_owner(uuid) to authenticated;
grant execute on function ml_internal.member_studio_ids() to authenticated;
grant execute on function ml_internal.writable_studio_ids() to authenticated;
grant execute on function ml_internal.owned_studio_ids() to authenticated;

-- Referential guards for actor-owned rows whose user relationship is not a
-- composite foreign key. Removed members may remain referenced historically,
-- but a new assignment/decision must point to an active member of that studio.
create or replace function ml_internal.assert_active_member_reference()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  referenced_user uuid;
begin
  referenced_user := nullif(to_jsonb(new) ->> tg_argv[0], '')::uuid;
  if referenced_user is not null and not exists (
    select 1
    from ml_private.studio_members membership
    where membership.studio_id = new.studio_id
      and membership.user_id = referenced_user
      and membership.status = 'active'
  ) then
    raise exception '% must reference an active member of the same studio', tg_argv[0]
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function ml_internal.assert_active_member_reference() from public, anon, authenticated;

create trigger tasks_validate_assignee
  before insert or update of assignee_id, studio_id on ml_private.tasks
  for each row execute function ml_internal.assert_active_member_reference('assignee_id');
create trigger calendar_events_validate_assignee
  before insert or update of assignee_id, studio_id on ml_private.calendar_events
  for each row execute function ml_internal.assert_active_member_reference('assignee_id');
create trigger ai_artifacts_validate_decider
  before insert or update of decided_by, studio_id on ml_private.ai_artifacts
  for each row execute function ml_internal.assert_active_member_reference('decided_by');

create or replace function ml_internal.prevent_last_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  removes_owner boolean;
begin
  removes_owner := old.role = 'owner'
    and old.status = 'active'
    and (
      tg_op = 'DELETE'
      or new.role <> 'owner'
      or new.status <> 'active'
      or new.studio_id <> old.studio_id
    );

  if removes_owner and not exists (
    select 1
    from ml_private.studio_members membership
    where membership.studio_id = old.studio_id
      and membership.id <> old.id
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    raise exception 'A studio must retain at least one active owner.'
      using errcode = '23514';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function ml_internal.prevent_last_active_owner() from public, anon, authenticated;

create trigger studio_members_retain_owner
  before update or delete on ml_private.studio_members
  for each row execute function ml_internal.prevent_last_active_owner();

create trigger studios_protect_owner_user_id
  before update on ml_private.studios
  for each row execute function ml_internal.protect_stable_identifier('owner_user_id');

-- Public payload privacy guard. Core private relationships are never inferred
-- from JSONB; this recursive key scan is an additional denylist for immutable
-- public snapshots, not a substitute for an allowlisted publication builder.
create or replace function ml_internal.jsonb_has_private_key(payload jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  with recursive walk(value) as (
    select coalesce(payload, 'null'::jsonb)
    union all
    select child.value
    from walk current_node
    cross join lateral (
      select object_value as value
      from jsonb_each(
        case when jsonb_typeof(current_node.value) = 'object'
          then current_node.value else '{}'::jsonb end
      ) as object_children(object_key, object_value)
      union all
      select array_value
      from jsonb_array_elements(
        case when jsonb_typeof(current_node.value) = 'array'
          then current_node.value else '[]'::jsonb end
      ) as array_children(array_value)
    ) child
  )
  select exists (
    select 1
    from walk current_node
    cross join lateral jsonb_object_keys(
      case when jsonb_typeof(current_node.value) = 'object'
        then current_node.value else '{}'::jsonb end
    ) as object_keys(key)
    where lower(object_keys.key) = any (array[
      'studio_id', 'owner_user_id', 'supplier_id', 'supplier_items',
      'unit_cost', 'cost_sheet', 'cost_sheets', 'cost_items', 'factory_id',
      'technical_files', 'pattern_file', 'pattern_files', 'fit_issues',
      'fit_notes', 'model_profile', 'model_profile_json', 'input_refs',
      'input_refs_json', 'ai_jobs', 'prompt', 'prompt_text', 'private_notes',
      'storage_path'
    ])
  );
$$;

create or replace function ml_internal.enforce_publication_boundary()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if ml_internal.jsonb_has_private_key(new.snapshot_json) then
    raise exception 'Publication snapshot contains a private-only key.'
      using errcode = '23514';
  end if;

  if new.snapshot_json::text ~* '(studio-assets|project-images|studios/[0-9a-f-]{36}/)'
    or new.media_manifest::text ~* '(studio-assets|project-images|studios/[0-9a-f-]{36}/)'
  then
    raise exception 'Publication payloads cannot contain private storage paths.'
      using errcode = '23514';
  end if;

  if new.publication_type = 'project' and not exists (
    select 1
    from ml_private.portfolio_projects project
    join ml_private.garment_versions version
      on version.studio_id = project.studio_id
     and version.garment_id = project.garment_id
    where project.studio_id = new.studio_id
      and project.id = new.portfolio_project_id
      and version.id = new.source_version_id
  ) then
    raise exception 'Project publications must reference a Freeze Frame of the curated garment.'
      using errcode = '23514';
  end if;

  if new.publication_type = 'editorial' and not exists (
    select 1
    from ml_private.portfolio_editorials portfolio_editorial
    join ml_private.editorial_collections editorial
      on editorial.studio_id = portfolio_editorial.studio_id
     and editorial.id = portfolio_editorial.collection_id
    join ml_private.garment_versions version
      on version.studio_id = editorial.studio_id
     and version.garment_id = editorial.garment_id
    where portfolio_editorial.studio_id = new.studio_id
      and portfolio_editorial.profile_id = new.profile_id
      and portfolio_editorial.collection_id = new.portfolio_editorial_collection_id
      and version.id = new.source_version_id
  ) then
    raise exception 'Editorial publications must reference a Freeze Frame of the primary garment.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
      or new.studio_id <> old.studio_id
      or new.profile_id <> old.profile_id
      or new.publication_type <> old.publication_type
      or new.source_id <> old.source_id
      or new.portfolio_project_id is distinct from old.portfolio_project_id
      or new.portfolio_editorial_collection_id is distinct from old.portfolio_editorial_collection_id
      or new.source_version_id is distinct from old.source_version_id
      or new.public_path <> old.public_path
      or new.snapshot_json <> old.snapshot_json
      or new.media_manifest <> old.media_manifest
      or new.checksum <> old.checksum
      or new.created_by is distinct from old.created_by
      or new.created_at <> old.created_at
    then
      raise exception 'Publication payloads are immutable; create a new publication snapshot.'
        using errcode = '23514';
    end if;

    if old.unpublished_at is not null and (new.is_public or new.is_current) then
      raise exception 'An unpublished snapshot cannot be republished; create a new snapshot.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function ml_internal.enforce_publication_asset_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_was_published boolean;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Publication asset manifests are immutable; replace the draft row instead.'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if split_part(new.storage_path, '/', 2)::uuid <> new.publication_id
      or split_part(new.storage_path, '/', 3)::uuid <> new.id
    then
      raise exception 'Publication asset path must be publications/{publication_id}/{publication_asset_id}/...'
        using errcode = '23514';
    end if;

    select publication.published_at is not null
      into parent_was_published
    from ml_public.publications publication
    where publication.id = new.publication_id;

    if coalesce(parent_was_published, false) then
      raise exception 'Copied asset manifests must be complete before publication.'
        using errcode = '23514';
    end if;
  end if;

  if tg_op = 'DELETE' then
    select publication.published_at is not null
      into parent_was_published
    from ml_public.publications publication
    where publication.id = old.publication_id;

    if coalesce(parent_was_published, false) then
      raise exception 'Published asset manifests are retained as immutable history.'
        using errcode = '23514';
    end if;
    return old;
  end if;

  return new;
end;
$$;

revoke all on function ml_internal.enforce_publication_boundary() from public, anon, authenticated;
revoke all on function ml_internal.enforce_publication_asset_immutability() from public, anon, authenticated;

create trigger publications_enforce_boundary
  before insert or update on ml_public.publications
  for each row execute function ml_internal.enforce_publication_boundary();
create trigger publication_assets_enforce_immutability
  before insert or update or delete on ml_public.publication_assets
  for each row execute function ml_internal.enforce_publication_asset_immutability();

-- Immutable audit events for role changes, restores, and AI acceptance.
create or replace function ml_internal.record_membership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into ml_private.change_events (
      studio_id, garment_id, origin, actor_id, operation_id,
      entity_type, entity_id, operation, json_patch, inverse_patch
    ) values (
      old.studio_id, null, 'system', (select auth.uid()), gen_random_uuid(),
      'studio_member', old.id, 'role_change', '[]'::jsonb, '[]'::jsonb
    );
    return old;
  end if;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    new.studio_id, null, 'system', (select auth.uid()), gen_random_uuid(),
    'studio_member', new.id, 'role_change', '[]'::jsonb, '[]'::jsonb
  );
  return new;
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
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    new.studio_id, new.garment_id, 'restore', new.actor_id, new.id,
    'garment', new.garment_id, 'restore', '[]'::jsonb, '[]'::jsonb
  );
  return new;
end;
$$;

create or replace function ml_internal.record_ai_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  related_garment_id uuid;
begin
  if old.decision <> 'accepted' and new.decision = 'accepted' then
    select job.garment_id into related_garment_id
    from ml_private.ai_jobs job
    where job.id = new.ai_job_id;

    insert into ml_private.change_events (
      studio_id, garment_id, origin, actor_id, operation_id,
      entity_type, entity_id, operation, json_patch, inverse_patch
    ) values (
      new.studio_id, related_garment_id, 'ai_acceptance', new.decided_by, new.id,
      'ai_artifact', new.id, 'accept_ai', '[]'::jsonb, '[]'::jsonb
    );
  end if;
  return new;
end;
$$;

revoke all on function ml_internal.record_membership_change() from public, anon, authenticated;
revoke all on function ml_internal.record_restore_event() from public, anon, authenticated;
revoke all on function ml_internal.record_ai_acceptance() from public, anon, authenticated;

create trigger studio_members_record_change
  after insert or update or delete on ml_private.studio_members
  for each row execute function ml_internal.record_membership_change();
create trigger restore_operations_record_change
  after insert on ml_private.restore_operations
  for each row execute function ml_internal.record_restore_event();
create trigger ai_artifacts_record_acceptance
  after update of decision on ml_private.ai_artifacts
  for each row execute function ml_internal.record_ai_acceptance();

-- Enable RLS before granting any Data API privileges.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'studios', 'studio_members', 'studio_settings', 'collections', 'garments',
    'tags', 'garment_tags', 'suppliers', 'factories', 'design_briefs',
    'inspiration_boards', 'inspiration_items', 'media_assets', 'garment_media',
    'media_derivatives', 'design_annotations', 'materials', 'material_variants',
    'inventory_entries', 'garment_materials', 'components', 'component_variants',
    'garment_components', 'supplier_items', 'garment_versions', 'technical_specs',
    'technical_flats', 'flat_annotations', 'technical_files', 'tech_pack_exports',
    'validation_runs', 'pom_points', 'measurement_sets', 'measurement_values',
    'grade_rules', 'grade_rule_values', 'fit_measurements', 'bom_items',
    'construction_sections', 'construction_steps', 'construction_details',
    'technical_templates', 'template_applications', 'sample_rounds', 'fit_sessions',
    'fit_issues', 'cost_sheets', 'cost_items', 'production_orders', 'qc_results',
    'editorial_collections', 'editorial_scenes', 'editorial_blocks', 'editorial_assets',
    'portfolio_profiles', 'portfolio_projects', 'portfolio_editorials',
    'entity_revisions', 'change_events', 'restore_operations', 'tasks',
    'calendar_events', 'ai_jobs', 'ai_artifacts', 'sync_tombstones'
  ] loop
    execute format('alter table ml_private.%I enable row level security', table_name);
  end loop;
end;
$$;

alter table ml_public.publications enable row level security;
alter table ml_public.publication_assets enable row level security;

-- Person identity is user-owned rather than studio-owned.
create policy profiles_select_self on ml_private.profiles
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_self on ml_private.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_self on ml_private.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Tenant root and membership management use owner-only mutations.
create policy studios_select_member on ml_private.studios
  for select to authenticated
  using (id in (select ml_internal.member_studio_ids()));
create policy studios_insert_owner on ml_private.studios
  for insert to authenticated
  with check (owner_user_id = (select auth.uid()));
create policy studios_update_owner on ml_private.studios
  for update to authenticated
  using (id in (select ml_internal.owned_studio_ids()))
  with check (id in (select ml_internal.owned_studio_ids()));

create policy studio_members_select_member on ml_private.studio_members
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_members_insert_owner on ml_private.studio_members
  for insert to authenticated
  with check (studio_id in (select ml_internal.owned_studio_ids()));
create policy studio_members_update_owner on ml_private.studio_members
  for update to authenticated
  using (studio_id in (select ml_internal.owned_studio_ids()))
  with check (studio_id in (select ml_internal.owned_studio_ids()));

create policy studio_settings_select_member on ml_private.studio_settings
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_settings_update_owner on ml_private.studio_settings
  for update to authenticated
  using (studio_id in (select ml_internal.owned_studio_ids()))
  with check (studio_id in (select ml_internal.owned_studio_ids()));

-- Fully mutable domain rows. Owners/editors write; every active role reads.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'collections', 'tags', 'garment_tags', 'suppliers', 'factories', 'design_briefs',
    'inspiration_boards', 'inspiration_items', 'media_assets', 'garment_media',
    'media_derivatives', 'design_annotations', 'materials', 'material_variants',
    'garment_materials', 'components', 'component_variants', 'garment_components',
    'supplier_items', 'technical_specs', 'technical_flats', 'flat_annotations',
    'technical_files', 'pom_points', 'measurement_sets', 'measurement_values',
    'grade_rules', 'grade_rule_values', 'fit_measurements', 'bom_items',
    'construction_sections', 'construction_steps', 'construction_details',
    'technical_templates', 'sample_rounds', 'fit_sessions', 'fit_issues',
    'cost_sheets', 'cost_items', 'production_orders', 'qc_results',
    'editorial_collections', 'editorial_scenes', 'editorial_blocks', 'editorial_assets',
    'tasks', 'calendar_events', 'sync_tombstones'
  ] loop
    execute format(
      'create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))',
      table_name
    );
    execute format(
      'create policy studio_insert on ml_private.%I for insert to authenticated with check (studio_id in (select ml_internal.writable_studio_ids()))',
      table_name
    );
    execute format(
      'create policy studio_update on ml_private.%I for update to authenticated using (studio_id in (select ml_internal.writable_studio_ids())) with check (studio_id in (select ml_internal.writable_studio_ids()))',
      table_name
    );
    execute format(
      'create policy studio_delete on ml_private.%I for delete to authenticated using (studio_id in (select ml_internal.writable_studio_ids()))',
      table_name
    );
  end loop;
end;
$$;

-- Retained mutable roots use archive/status transitions, never client hard delete.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'garments', 'portfolio_profiles', 'portfolio_projects', 'portfolio_editorials',
    'ai_jobs', 'ai_artifacts'
  ] loop
    execute format(
      'create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))',
      table_name
    );
    execute format(
      'create policy studio_insert on ml_private.%I for insert to authenticated with check (studio_id in (select ml_internal.writable_studio_ids()))',
      table_name
    );
    execute format(
      'create policy studio_update on ml_private.%I for update to authenticated using (studio_id in (select ml_internal.writable_studio_ids())) with check (studio_id in (select ml_internal.writable_studio_ids()))',
      table_name
    );
  end loop;
end;
$$;

-- Append-only user ledger. Other version/export/audit rows remain server-command
-- authored and receive SELECT-only grants below.
create policy inventory_entries_select on ml_private.inventory_entries
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));
create policy inventory_entries_insert on ml_private.inventory_entries
  for insert to authenticated
  with check (studio_id in (select ml_internal.writable_studio_ids()));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'garment_versions', 'tech_pack_exports', 'validation_runs', 'template_applications',
    'entity_revisions', 'change_events', 'restore_operations'
  ] loop
    execute format(
      'create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))',
      table_name
    );
  end loop;
end;
$$;

-- Anonymous readers see only the current public snapshot and its copied asset
-- manifest. Authenticated members retain access to their studio's history.
create policy publications_anon_current on ml_public.publications
  for select to anon
  using (is_public and is_current and unpublished_at is null);
create policy publications_authenticated_current_or_member on ml_public.publications
  for select to authenticated
  using (
    (is_public and is_current and unpublished_at is null)
    or studio_id in (select ml_internal.member_studio_ids())
  );
create policy publications_stage_member on ml_public.publications
  for insert to authenticated
  with check (
    studio_id in (select ml_internal.writable_studio_ids())
    and not is_public
    and not is_current
    and published_at is null
    and unpublished_at is null
    and created_by = (select auth.uid())
  );

create policy publication_assets_anon_current on ml_public.publication_assets
  for select to anon
  using (
    exists (
      select 1
      from ml_public.publications publication
      where publication.id = publication_assets.publication_id
        and publication.is_public
        and publication.is_current
        and publication.unpublished_at is null
    )
  );
create policy publication_assets_authenticated_current_or_member on ml_public.publication_assets
  for select to authenticated
  using (
    studio_id in (select ml_internal.member_studio_ids())
    or exists (
      select 1
      from ml_public.publications publication
      where publication.id = publication_assets.publication_id
        and publication.is_public
        and publication.is_current
        and publication.unpublished_at is null
    )
  );
create policy publication_assets_stage_member on ml_public.publication_assets
  for insert to authenticated
  with check (
    studio_id in (select ml_internal.writable_studio_ids())
    and exists (
      select 1
      from ml_public.publications publication
      where publication.id = publication_assets.publication_id
        and publication.studio_id = publication_assets.studio_id
        and publication.published_at is null
    )
  );
create policy publication_assets_delete_draft_member on ml_public.publication_assets
  for delete to authenticated
  using (
    studio_id in (select ml_internal.writable_studio_ids())
    and exists (
      select 1
      from ml_public.publications publication
      where publication.id = publication_assets.publication_id
        and publication.published_at is null
    )
  );

-- Publication state transitions are server-command operations. They validate
-- caller membership, copied-object readiness/removal, and emit audit events.
create or replace function ml_internal.publish_publication(p_publication_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target ml_public.publications;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into target
  from ml_public.publications
  where id = p_publication_id
  for update;

  if target.id is null or not ml_internal.can_write_studio(target.studio_id) then
    raise exception 'Publication not found or caller cannot publish it.' using errcode = '42501';
  end if;
  if target.published_at is not null or target.unpublished_at is not null then
    raise exception 'Only a new draft publication can be published.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from ml_public.publication_assets asset
    where asset.publication_id = target.id
  ) and jsonb_array_length(target.media_manifest) > 0 then
    raise exception 'Publication media manifest has no copied derivative records.' using errcode = '23514';
  end if;
  if exists (
    select 1
    from ml_public.publication_assets asset
    where asset.publication_id = target.id
      and not exists (
        select 1 from storage.objects object
        where object.bucket_id = 'portfolio-assets'
          and object.name = asset.storage_path
      )
  ) then
    raise exception 'Every publication derivative must be copied before publishing.' using errcode = '23514';
  end if;

  update ml_public.publications
  set is_current = false
  where profile_id = target.profile_id
    and publication_type = target.publication_type
    and source_id = target.source_id
    and is_current;

  update ml_public.publications
  set is_public = true, is_current = true, published_at = now()
  where id = target.id;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    target.studio_id, null, 'publication', (select auth.uid()), target.id,
    'publication', target.id, 'publish', '[]'::jsonb, '[]'::jsonb
  );
end;
$$;

create or replace function ml_internal.unpublish_publication(p_publication_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target ml_public.publications;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into target
  from ml_public.publications
  where id = p_publication_id
  for update;

  if target.id is null or not ml_internal.can_write_studio(target.studio_id) then
    raise exception 'Publication not found or caller cannot unpublish it.' using errcode = '42501';
  end if;
  if not target.is_public then
    raise exception 'Publication is not public.' using errcode = '23514';
  end if;
  if exists (
    select 1
    from ml_public.publication_assets asset
    join storage.objects object
      on object.bucket_id = 'portfolio-assets'
     and object.name = asset.storage_path
    where asset.publication_id = target.id
  ) then
    raise exception 'Remove copied portfolio-assets objects before unpublishing.' using errcode = '23514';
  end if;

  update ml_public.publications
  set is_public = false, is_current = false, unpublished_at = now()
  where id = target.id;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    target.studio_id, null, 'publication', (select auth.uid()), target.id,
    'publication', target.id, 'unpublish', '[]'::jsonb, '[]'::jsonb
  );
end;
$$;

revoke all on function ml_internal.publish_publication(uuid) from public, anon, authenticated;
revoke all on function ml_internal.unpublish_publication(uuid) from public, anon, authenticated;
grant execute on function ml_internal.publish_publication(uuid) to authenticated;
grant execute on function ml_internal.unpublish_publication(uuid) to authenticated;

create or replace function ml_private.publish_publication(p_publication_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ml_internal.publish_publication(p_publication_id);
$$;
create or replace function ml_private.unpublish_publication(p_publication_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select ml_internal.unpublish_publication(p_publication_id);
$$;

-- Least-privilege Data API grants. No private object is granted to anon.
grant usage on schema ml_internal to authenticated;
grant usage on schema ml_private to authenticated;
grant usage on schema ml_public to anon, authenticated;

grant usage on type ml_private.membership_role to authenticated;
grant usage on type ml_private.membership_status to authenticated;
grant usage on type ml_private.measurement_unit to authenticated;
grant usage on type ml_private.quantity_unit to authenticated;
grant usage on type ml_private.ai_decision to authenticated;
grant usage on type ml_private.slug to authenticated;
grant usage on type ml_private.iso_currency to authenticated;
grant usage on type ml_private.sha256_checksum to authenticated;
grant usage on type ml_private.nonnegative_quantity to authenticated;
grant usage on type ml_private.positive_quantity to authenticated;
grant usage on type ml_public.publication_type to anon, authenticated;

grant select, insert, update on table ml_private.profiles to authenticated;
grant select, insert, update on table ml_private.studios to authenticated;
grant select, insert, update on table ml_private.studio_members to authenticated;
grant select, update on table ml_private.studio_settings to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'collections', 'tags', 'garment_tags', 'suppliers', 'factories', 'design_briefs',
    'inspiration_boards', 'inspiration_items', 'media_assets', 'garment_media',
    'media_derivatives', 'design_annotations', 'materials', 'material_variants',
    'garment_materials', 'components', 'component_variants', 'garment_components',
    'supplier_items', 'technical_specs', 'technical_flats', 'flat_annotations',
    'technical_files', 'pom_points', 'measurement_sets', 'measurement_values',
    'grade_rules', 'grade_rule_values', 'fit_measurements', 'bom_items',
    'construction_sections', 'construction_steps', 'construction_details',
    'technical_templates', 'sample_rounds', 'fit_sessions', 'fit_issues',
    'cost_sheets', 'cost_items', 'production_orders', 'qc_results',
    'editorial_collections', 'editorial_scenes', 'editorial_blocks', 'editorial_assets',
    'tasks', 'calendar_events', 'sync_tombstones'
  ] loop
    execute format('grant select, insert, update, delete on table ml_private.%I to authenticated', table_name);
  end loop;

  foreach table_name in array array[
    'garments', 'portfolio_profiles', 'portfolio_projects', 'portfolio_editorials',
    'ai_jobs', 'ai_artifacts'
  ] loop
    execute format('grant select, insert, update on table ml_private.%I to authenticated', table_name);
  end loop;

  foreach table_name in array array[
    'garment_versions', 'tech_pack_exports', 'validation_runs', 'template_applications',
    'entity_revisions', 'change_events', 'restore_operations'
  ] loop
    execute format('grant select on table ml_private.%I to authenticated', table_name);
  end loop;
end;
$$;

grant select, insert on table ml_private.inventory_entries to authenticated;
grant select on table ml_public.publications, ml_public.publication_assets to anon;
grant select, insert on table ml_public.publications to authenticated;
grant select, insert, delete on table ml_public.publication_assets to authenticated;
grant execute on function ml_private.publish_publication(uuid) to authenticated;
grant execute on function ml_private.unpublish_publication(uuid) to authenticated;

commit;
