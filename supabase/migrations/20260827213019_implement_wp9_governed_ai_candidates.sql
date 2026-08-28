-- WP9: governed AI jobs, reviewable candidates, and auditable acceptance.
-- AI provider output remains private evidence. Only an authenticated Studio
-- command may accept a candidate after normal domain commands emitted their
-- own immutable change events.

begin;

alter table ml_private.ai_jobs
  drop constraint if exists ai_jobs_status_check;

alter table ml_private.ai_jobs
  add column if not exists provider text not null default 'unconfigured',
  add column if not exists idempotency_key text,
  add column if not exists source_checksum ml_private.sha256_checksum,
  add column if not exists retry_of_job_id uuid,
  add column if not exists attempt_no integer not null default 1 check (attempt_no > 0),
  add constraint ai_jobs_status_check check (
    status in ('queued', 'running', 'candidate', 'succeeded', 'accepted', 'rejected', 'failed', 'cancelled')
  ),
  add constraint ai_jobs_job_type_check check (
    job_type in (
      'technical_flat_generation', 'pom_assistance', 'bom_assistance',
      'construction_recommendations', 'tech_pack_validation',
      'editorial_generation', 'portfolio_drafting'
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_jobs_retry_of_job_fk'
      and conrelid = 'ml_private.ai_jobs'::regclass
  ) then
    alter table ml_private.ai_jobs
      add constraint ai_jobs_retry_of_job_fk foreign key (studio_id, retry_of_job_id)
        references ml_private.ai_jobs(studio_id, id) on delete restrict;
  end if;
end
$$;

update ml_private.ai_jobs
set source_checksum = encode(extensions.digest(input_refs_json::text, 'sha256'), 'hex')
where source_checksum is null;

alter table ml_private.ai_jobs
  alter column source_checksum set not null;

create unique index ml_ai_jobs_idempotency_idx
  on ml_private.ai_jobs (studio_id, idempotency_key)
  where idempotency_key is not null;
create index ml_ai_jobs_retry_idx
  on ml_private.ai_jobs (studio_id, retry_of_job_id)
  where retry_of_job_id is not null;
create index ml_ai_jobs_garment_created_idx
  on ml_private.ai_jobs (studio_id, garment_id, created_at desc);

create table ml_private.ai_job_input_refs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  ai_job_id uuid not null,
  entity_type text not null check (entity_type in (
    'garment', 'garment_version', 'design_brief', 'media_asset',
    'technical_spec', 'technical_flat', 'technical_template', 'pom_point',
    'measurement_set', 'bom_item', 'construction_step', 'validation_run',
    'material_variant', 'component_variant', 'editorial_collection',
    'portfolio_project'
  )),
  entity_id uuid not null,
  entity_revision bigint not null check (entity_revision > 0),
  source_version_id uuid,
  field_path text not null default '',
  source_checksum ml_private.sha256_checksum not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, ai_job_id, entity_type, entity_id, field_path),
  constraint ai_job_input_refs_job_fk foreign key (studio_id, ai_job_id)
    references ml_private.ai_jobs(studio_id, id) on delete cascade,
  constraint ai_job_input_refs_version_fk foreign key (studio_id, source_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

alter table ml_private.ai_artifacts
  add column if not exists source_checksum ml_private.sha256_checksum,
  add column if not exists candidate_checksum ml_private.sha256_checksum,
  add column if not exists field_manifest_json jsonb not null default '[]'::jsonb,
  add column if not exists decision_reason text,
  add column if not exists acceptance_operation_id uuid,
  add column if not exists accepted_payload_checksum ml_private.sha256_checksum,
  add column if not exists generated_at timestamptz not null default now();

update ml_private.ai_artifacts artifact
set source_checksum = job.source_checksum,
    candidate_checksum = encode(extensions.digest(artifact.candidate_json::text, 'sha256'), 'hex')
from ml_private.ai_jobs job
where job.studio_id = artifact.studio_id
  and job.id = artifact.ai_job_id
  and (artifact.source_checksum is null or artifact.candidate_checksum is null);

alter table ml_private.ai_artifacts
  alter column source_checksum set not null,
  alter column candidate_checksum set not null,
  add constraint ai_artifacts_field_manifest_array_check
    check (jsonb_typeof(field_manifest_json) = 'array');

create table ml_private.ai_artifact_media (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  ai_artifact_id uuid not null,
  asset_id uuid not null,
  role text not null check (role in ('candidate', 'reference', 'comparison', 'generated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, ai_artifact_id, asset_id, role),
  constraint ai_artifact_media_artifact_fk foreign key (studio_id, ai_artifact_id)
    references ml_private.ai_artifacts(studio_id, id) on delete cascade,
  constraint ai_artifact_media_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.ai_artifact_acceptances (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  ai_artifact_id uuid not null,
  operation_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  source_checksum ml_private.sha256_checksum not null,
  candidate_checksum ml_private.sha256_checksum not null,
  accepted_payload_checksum ml_private.sha256_checksum not null,
  decision_note text not null check (btrim(decision_note) <> ''),
  accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, ai_artifact_id),
  unique (studio_id, operation_id),
  constraint ai_artifact_acceptances_artifact_fk foreign key (studio_id, ai_artifact_id)
    references ml_private.ai_artifacts(studio_id, id) on delete restrict
);

create table ml_private.ai_acceptance_commands (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  acceptance_id uuid not null,
  field_key text not null check (btrim(field_key) <> ''),
  command_type text not null check (command_type in (
    'technical.register-flat', 'measurement.create-pom', 'bom.create-item',
    'construction.create-section', 'construction.add-step',
    'technical.run-validation', 'editorial.add-block',
    'portfolio.update-project'
  )),
  target_entity_type text not null check (btrim(target_entity_type) <> ''),
  target_entity_id uuid not null,
  change_event_id uuid not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, acceptance_id, field_key, command_type, target_entity_id),
  constraint ai_acceptance_commands_acceptance_fk foreign key (studio_id, acceptance_id)
    references ml_private.ai_artifact_acceptances(studio_id, id) on delete restrict,
  constraint ai_acceptance_commands_change_event_fk foreign key (studio_id, change_event_id)
    references ml_private.change_events(studio_id, id) on delete restrict
);

create index ml_ai_job_input_refs_job_idx
  on ml_private.ai_job_input_refs (studio_id, ai_job_id, sort_order);
create index ml_ai_job_input_refs_entity_idx
  on ml_private.ai_job_input_refs (studio_id, entity_type, entity_id);
create index ml_ai_job_input_refs_version_idx
  on ml_private.ai_job_input_refs (studio_id, source_version_id)
  where source_version_id is not null;
create index ml_ai_artifact_media_artifact_idx
  on ml_private.ai_artifact_media (studio_id, ai_artifact_id);
create index ml_ai_artifact_media_asset_idx
  on ml_private.ai_artifact_media (studio_id, asset_id);
create index ml_ai_acceptances_actor_time_idx
  on ml_private.ai_artifact_acceptances (studio_id, actor_id, accepted_at desc);
create index ml_ai_acceptance_commands_event_idx
  on ml_private.ai_acceptance_commands (studio_id, change_event_id);

create or replace function ml_internal.ai_entity_revision(
  p_studio_id uuid,
  p_entity_type text,
  p_entity_id uuid
)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entity_revision bigint;
begin
  case p_entity_type
    when 'garment' then select revision into entity_revision from ml_private.garments where studio_id = p_studio_id and id = p_entity_id;
    when 'garment_version' then select revision into entity_revision from ml_private.garment_versions where studio_id = p_studio_id and id = p_entity_id;
    when 'design_brief' then select revision into entity_revision from ml_private.design_briefs where studio_id = p_studio_id and id = p_entity_id;
    when 'media_asset' then select revision into entity_revision from ml_private.media_assets where studio_id = p_studio_id and id = p_entity_id;
    when 'technical_spec' then select revision into entity_revision from ml_private.technical_specs where studio_id = p_studio_id and id = p_entity_id;
    when 'technical_flat' then select revision into entity_revision from ml_private.technical_flats where studio_id = p_studio_id and id = p_entity_id;
    when 'technical_template' then select revision into entity_revision from ml_private.technical_templates where studio_id = p_studio_id and id = p_entity_id;
    when 'pom_point' then select revision into entity_revision from ml_private.pom_points where studio_id = p_studio_id and id = p_entity_id;
    when 'measurement_set' then select revision into entity_revision from ml_private.measurement_sets where studio_id = p_studio_id and id = p_entity_id;
    when 'bom_item' then select revision into entity_revision from ml_private.bom_items where studio_id = p_studio_id and id = p_entity_id;
    when 'construction_step' then select revision into entity_revision from ml_private.construction_steps where studio_id = p_studio_id and id = p_entity_id;
    when 'validation_run' then select revision into entity_revision from ml_private.validation_runs where studio_id = p_studio_id and id = p_entity_id;
    when 'material_variant' then select revision into entity_revision from ml_private.material_variants where studio_id = p_studio_id and id = p_entity_id;
    when 'component_variant' then select revision into entity_revision from ml_private.component_variants where studio_id = p_studio_id and id = p_entity_id;
    when 'editorial_collection' then select revision into entity_revision from ml_private.editorial_collections where studio_id = p_studio_id and id = p_entity_id;
    when 'portfolio_project' then select revision into entity_revision from ml_private.portfolio_projects where studio_id = p_studio_id and id = p_entity_id;
    else return null;
  end case;
  return entity_revision;
end
$$;

create or replace function ml_internal.assert_ai_input_ref()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_revision bigint;
begin
  current_revision := ml_internal.ai_entity_revision(new.studio_id, new.entity_type, new.entity_id);
  if current_revision is null then
    raise exception 'AI input reference must resolve to a same-studio canonical entity.' using errcode = '23514';
  end if;
  if current_revision <> new.entity_revision then
    raise exception 'AI input reference revision is stale at job creation.' using errcode = '40001';
  end if;
  return new;
end
$$;

create trigger ai_job_input_refs_assert_source
  before insert on ml_private.ai_job_input_refs
  for each row execute function ml_internal.assert_ai_input_ref();

create or replace function ml_internal.ai_job_sources_are_fresh(p_ai_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from ml_private.ai_job_input_refs input_ref
    where input_ref.ai_job_id = p_ai_job_id
  ) and not exists (
    select 1
    from ml_private.ai_job_input_refs input_ref
    where input_ref.ai_job_id = p_ai_job_id
      and ml_internal.ai_entity_revision(
        input_ref.studio_id, input_ref.entity_type, input_ref.entity_id
      ) is distinct from input_ref.entity_revision
  );
$$;

create or replace function ml_internal.protect_ai_artifact_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.studio_id <> old.studio_id
     or new.ai_job_id <> old.ai_job_id
     or new.artifact_type <> old.artifact_type
     or new.candidate_json <> old.candidate_json
     or new.field_manifest_json <> old.field_manifest_json
     or new.provenance_json <> old.provenance_json
     or new.confidence_json <> old.confidence_json
     or new.source_checksum <> old.source_checksum
     or new.candidate_checksum <> old.candidate_checksum
     or new.generated_at <> old.generated_at then
    raise exception 'AI candidate evidence is immutable; generate a new artifact.' using errcode = '23514';
  end if;
  if (new.decision, new.decided_by, new.decided_at, new.decision_reason,
      new.acceptance_operation_id, new.accepted_payload_checksum)
      is distinct from
     (old.decision, old.decided_by, old.decided_at, old.decision_reason,
      old.acceptance_operation_id, old.accepted_payload_checksum)
     and current_setting('ml.ai_decision_command', true) is distinct from 'on' then
    raise exception 'AI decisions must use the governed acceptance or rejection command.' using errcode = '23514';
  end if;
  return new;
end
$$;

drop trigger if exists ai_artifacts_record_acceptance on ml_private.ai_artifacts;
create trigger ai_artifacts_protect_evidence
  before update on ml_private.ai_artifacts
  for each row execute function ml_internal.protect_ai_artifact_evidence();

create or replace function ml_internal.prevent_ai_evidence_rewrite()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'AI acceptance evidence is append-only.' using errcode = '23514';
end
$$;

create trigger ai_artifact_acceptances_append_only
  before update or delete on ml_private.ai_artifact_acceptances
  for each row execute function ml_internal.prevent_ai_evidence_rewrite();
create trigger ai_acceptance_commands_append_only
  before update or delete on ml_private.ai_acceptance_commands
  for each row execute function ml_internal.prevent_ai_evidence_rewrite();

create or replace function ml_private.accept_ai_artifact(
  p_artifact_id uuid,
  p_expected_source_checksum ml_private.sha256_checksum,
  p_operation_id uuid,
  p_command_receipts jsonb,
  p_decision_note text,
  p_accepted_payload_checksum ml_private.sha256_checksum
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  artifact ml_private.ai_artifacts%rowtype;
  job ml_private.ai_jobs%rowtype;
  receipt jsonb;
  domain_event ml_private.change_events%rowtype;
  acceptance_id uuid := gen_random_uuid();
  receipt_index integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_command_receipts) <> 'array' or jsonb_array_length(p_command_receipts) = 0 then
    raise exception 'Acceptance requires at least one typed domain command receipt.' using errcode = '23514';
  end if;
  if btrim(coalesce(p_decision_note, '')) = '' then
    raise exception 'Acceptance decision note is required.' using errcode = '23514';
  end if;

  select * into artifact
  from ml_private.ai_artifacts candidate
  where candidate.id = p_artifact_id
  for update;
  if artifact.id is null or not ml_internal.can_write_studio(artifact.studio_id) then
    raise exception 'AI artifact is unavailable to this Studio member.' using errcode = '42501';
  end if;
  if artifact.decision <> 'pending' then
    raise exception 'AI artifact already has a final decision.' using errcode = '23514';
  end if;

  select * into job from ml_private.ai_jobs request
  where request.studio_id = artifact.studio_id and request.id = artifact.ai_job_id;
  if job.status not in ('candidate', 'succeeded') then
    raise exception 'AI job has not produced a reviewable candidate.' using errcode = '23514';
  end if;
  if artifact.source_checksum <> p_expected_source_checksum
     or artifact.source_checksum <> job.source_checksum
     or not ml_internal.ai_job_sources_are_fresh(job.id) then
    raise exception 'AI candidate sources changed after generation.' using errcode = '40001';
  end if;

  insert into ml_private.ai_artifact_acceptances (
    id, studio_id, ai_artifact_id, operation_id, actor_id,
    source_checksum, candidate_checksum, accepted_payload_checksum, decision_note
  ) values (
    acceptance_id, artifact.studio_id, artifact.id, p_operation_id, (select auth.uid()),
    artifact.source_checksum, artifact.candidate_checksum,
    p_accepted_payload_checksum, btrim(p_decision_note)
  );

  for receipt in select value from jsonb_array_elements(p_command_receipts)
  loop
    if jsonb_typeof(receipt) <> 'object'
       or coalesce(receipt ->> 'fieldKey', '') = ''
       or coalesce(receipt ->> 'commandType', '') = ''
       or coalesce(receipt ->> 'changeEventId', '') = '' then
      raise exception 'Each acceptance receipt needs fieldKey, commandType, and changeEventId.' using errcode = '23514';
    end if;

    select * into domain_event
    from ml_private.change_events event
    where event.studio_id = artifact.studio_id
      and event.id = (receipt ->> 'changeEventId')::uuid
      and event.operation_id = p_operation_id
      and event.origin = 'ai_acceptance'
      and event.actor_id = (select auth.uid())
      and event.entity_type <> 'ai_artifact'
      and event.garment_id is not distinct from job.garment_id;
    if domain_event.id is null then
      raise exception 'AI acceptance receipt must reference a normal domain change event.' using errcode = '23514';
    end if;

    insert into ml_private.ai_acceptance_commands (
      studio_id, acceptance_id, field_key, command_type,
      target_entity_type, target_entity_id, change_event_id, sort_order
    ) values (
      artifact.studio_id, acceptance_id, receipt ->> 'fieldKey', receipt ->> 'commandType',
      domain_event.entity_type, domain_event.entity_id, domain_event.id, receipt_index
    );
    receipt_index := receipt_index + 1;
  end loop;

  perform set_config('ml.ai_decision_command', 'on', true);
  update ml_private.ai_artifacts
  set decision = 'accepted', decided_by = (select auth.uid()), decided_at = now(),
      decision_reason = btrim(p_decision_note), acceptance_operation_id = p_operation_id,
      accepted_payload_checksum = p_accepted_payload_checksum,
      updated_at = now(), revision = revision + 1
  where id = artifact.id;
  update ml_private.ai_jobs
  set status = 'accepted', started_at = coalesce(started_at, created_at),
      completed_at = coalesce(completed_at, now()),
      updated_at = now(), revision = revision + 1
  where id = job.id;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    artifact.studio_id, job.garment_id, 'ai_acceptance', (select auth.uid()), p_operation_id,
    'ai_artifact', artifact.id, 'accept_ai',
    jsonb_build_array(jsonb_build_object('op', 'replace', 'path', '/decision', 'value', 'accepted')),
    jsonb_build_array(jsonb_build_object('op', 'replace', 'path', '/decision', 'value', 'pending'))
  );

  return acceptance_id;
end
$$;

create or replace function ml_private.reject_ai_artifact(
  p_artifact_id uuid,
  p_decision_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  artifact ml_private.ai_artifacts%rowtype;
  job ml_private.ai_jobs%rowtype;
  rejection_operation_id uuid := gen_random_uuid();
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;
  if btrim(coalesce(p_decision_note, '')) = '' then
    raise exception 'Rejection reason is required.' using errcode = '23514';
  end if;
  select * into artifact from ml_private.ai_artifacts candidate
  where candidate.id = p_artifact_id for update;
  if artifact.id is null or not ml_internal.can_write_studio(artifact.studio_id) then
    raise exception 'AI artifact is unavailable to this Studio member.' using errcode = '42501';
  end if;
  if artifact.decision <> 'pending' then
    raise exception 'AI artifact already has a final decision.' using errcode = '23514';
  end if;
  select * into job from ml_private.ai_jobs request
  where request.studio_id = artifact.studio_id and request.id = artifact.ai_job_id;

  perform set_config('ml.ai_decision_command', 'on', true);
  update ml_private.ai_artifacts
  set decision = 'rejected', decided_by = (select auth.uid()), decided_at = now(),
      decision_reason = btrim(p_decision_note), updated_at = now(), revision = revision + 1
  where id = artifact.id;
  update ml_private.ai_jobs
  set status = 'rejected', started_at = coalesce(started_at, created_at),
      completed_at = coalesce(completed_at, now()),
      updated_at = now(), revision = revision + 1
  where id = job.id;
  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch
  ) values (
    artifact.studio_id, job.garment_id, 'user', (select auth.uid()), rejection_operation_id,
    'ai_artifact', artifact.id, 'update',
    jsonb_build_array(jsonb_build_object('op', 'replace', 'path', '/decision', 'value', 'rejected')),
    jsonb_build_array(jsonb_build_object('op', 'replace', 'path', '/decision', 'value', 'pending'))
  );
end
$$;

revoke all on function ml_internal.ai_entity_revision(uuid, text, uuid) from public, anon, authenticated;
revoke all on function ml_internal.assert_ai_input_ref() from public, anon, authenticated;
revoke all on function ml_internal.ai_job_sources_are_fresh(uuid) from public, anon, authenticated;
revoke all on function ml_internal.protect_ai_artifact_evidence() from public, anon, authenticated;
revoke all on function ml_internal.prevent_ai_evidence_rewrite() from public, anon, authenticated;
revoke all on function ml_private.accept_ai_artifact(uuid, ml_private.sha256_checksum, uuid, jsonb, text, ml_private.sha256_checksum) from public, anon, authenticated;
revoke all on function ml_private.reject_ai_artifact(uuid, text) from public, anon, authenticated;
grant execute on function ml_private.accept_ai_artifact(uuid, ml_private.sha256_checksum, uuid, jsonb, text, ml_private.sha256_checksum) to authenticated;
grant execute on function ml_private.reject_ai_artifact(uuid, text) to authenticated;

-- Provider-owned artifacts and immutable acceptance rows are never written by
-- a browser role. Members can read Studio evidence; owner/editors enqueue jobs
-- and their normalized input references.
drop policy if exists studio_update on ml_private.ai_jobs;
drop policy if exists studio_insert on ml_private.ai_artifacts;
drop policy if exists studio_update on ml_private.ai_artifacts;
revoke insert, update, delete on table ml_private.ai_artifacts from authenticated;
revoke update, delete on table ml_private.ai_jobs from authenticated;
grant select, insert on table ml_private.ai_jobs to authenticated;
grant select on table ml_private.ai_artifacts to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'ai_job_input_refs', 'ai_artifact_media',
    'ai_artifact_acceptances', 'ai_acceptance_commands'
  ] loop
    execute format('alter table ml_private.%I enable row level security', table_name);
    execute format('alter table ml_private.%I force row level security', table_name);
    execute format('revoke all on table ml_private.%I from anon, authenticated', table_name);
    execute format('grant select on table ml_private.%I to authenticated', table_name);
    execute format(
      'create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))',
      table_name
    );
  end loop;
end
$$;

grant insert on table ml_private.ai_job_input_refs to authenticated;
create policy studio_insert on ml_private.ai_job_input_refs
  for insert to authenticated
  with check (
    studio_id in (select ml_internal.writable_studio_ids())
    and exists (
      select 1 from ml_private.ai_jobs job
      where job.studio_id = ai_job_input_refs.studio_id
        and job.id = ai_job_input_refs.ai_job_id
        and job.status = 'queued'
        and job.requested_by = (select auth.uid())
    )
  );

create or replace function ml_internal.assert_private_ai_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset_path text;
begin
  select asset.storage_path into asset_path
  from ml_private.media_assets asset
  where asset.studio_id = new.studio_id and asset.id = new.asset_id;
  if asset_path is null or asset_path !~ ('^studios/' || new.studio_id::text || '/') then
    raise exception 'AI artifact media must remain in the private Studio asset path.' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke all on function ml_internal.assert_private_ai_media() from public, anon, authenticated;
create trigger ai_artifact_media_require_private_path
  before insert or update on ml_private.ai_artifact_media
  for each row execute function ml_internal.assert_private_ai_media();

comment on table ml_private.ai_job_input_refs is
  'Normalized, versioned AI inputs. input_refs_json remains compatibility metadata; these rows are authoritative for freshness.';
comment on column ml_private.ai_artifacts.field_manifest_json is
  'Immutable review manifest of candidate field key, label, path, summary, and partial-acceptance safety.';
comment on table ml_private.ai_artifact_acceptances is
  'Immutable acceptance decision linked to the exact source, candidate, payload, actor, and operation.';
comment on table ml_private.ai_acceptance_commands is
  'One normalized receipt per selected candidate field and normal domain change event.';
comment on table ml_private.ai_artifact_media is
  'Private generated/reference media linked to an AI candidate; publication requires the normal Public Cut derivative flow.';
comment on function ml_private.accept_ai_artifact(uuid, ml_private.sha256_checksum, uuid, jsonb, text, ml_private.sha256_checksum) is
  'Records acceptance only after fresh inputs and same-operation ai_acceptance domain events are proven.';

commit;
