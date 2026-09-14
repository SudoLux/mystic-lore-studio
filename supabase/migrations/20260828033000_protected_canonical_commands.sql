-- Protected WP4-WP9 commands. These functions are the only browser-callable
-- write path for immutable evidence and final decisions.

begin;

alter table ml_private.canonical_operation_receipts
  add column if not exists receipt_kind text not null default 'canonical_operation',
  add column if not exists request_checksum ml_private.sha256_checksum;

create or replace function ml_internal.protected_receipt(
  p_studio_id uuid,
  p_operation_id uuid,
  p_action text,
  p_payload jsonb,
  p_result jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing ml_private.canonical_operation_receipts;
  request_hash text := encode(extensions.digest(jsonb_build_object('action', p_action, 'payload', p_payload)::text, 'sha256'), 'hex');
begin
  select * into existing
  from ml_private.canonical_operation_receipts receipt
  where receipt.studio_id = p_studio_id and receipt.id = p_operation_id;

  if existing.id is not null then
    if existing.receipt_kind <> p_action or existing.request_checksum is distinct from request_hash::ml_private.sha256_checksum then
      raise exception 'Operation ID was already used for a different protected command.' using errcode = '23505';
    end if;
    return existing.result_json;
  end if;

  if p_result is null then return null; end if;
  insert into ml_private.canonical_operation_receipts (
    id, studio_id, actor_id, garment_id, origin, mutation_count,
    receipt_kind, request_checksum, result_json
  ) values (
    p_operation_id, p_studio_id, (select auth.uid()), null, 'system', 1,
    p_action, request_hash::ml_private.sha256_checksum, p_result
  );
  return p_result;
end;
$$;

revoke all on function ml_internal.protected_receipt(uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated;

create or replace function ml_private.commit_canonical_restore(
  p_studio_id uuid,
  p_garment_id uuid,
  p_source_version_id uuid,
  p_label text,
  p_reason text,
  p_scope_json jsonb,
  p_result_snapshot jsonb,
  p_result_checksum ml_private.sha256_checksum,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_mutation_operation_id uuid,
  p_selected_keys jsonb,
  p_dependency_json jsonb,
  p_replay_patch jsonb,
  p_inverse_patch jsonb,
  p_preview_checksum ml_private.sha256_checksum,
  p_mutations jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  prior jsonb;
  mutation_result jsonb;
  result_version_id uuid;
  request_payload jsonb := jsonb_build_object(
    'garmentId', p_garment_id, 'sourceVersionId', p_source_version_id,
    'label', p_label, 'reason', p_reason, 'scope', p_scope_json,
    'resultChecksum', p_result_checksum, 'expectedRevision', p_expected_revision,
    'mutationOperationId', p_mutation_operation_id,
    'selectedKeys', p_selected_keys, 'dependencies', p_dependency_json,
    'replayPatch', p_replay_patch, 'inversePatch', p_inverse_patch,
    'previewChecksum', p_preview_checksum, 'mutations', p_mutations
  );
begin
  if (select auth.uid()) is null or not ml_internal.can_write_studio(p_studio_id) then
    raise exception 'A writable Studio membership is required.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(p_studio_id, p_operation_id, 'restore', request_payload, null);
  if prior is not null then return prior; end if;
  if not exists (select 1 from ml_private.garments where studio_id = p_studio_id and id = p_garment_id) then
    raise exception 'Restore garment is unavailable.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_mutations) <> 'array' then
    raise exception 'Restore mutations must be an array.' using errcode = '23514';
  end if;

  if jsonb_array_length(p_mutations) > 0 then
    mutation_result := ml_private.commit_canonical_operation(
      p_mutation_operation_id, p_studio_id, p_garment_id, 'restore', p_mutations
    );
    if mutation_result ->> 'status' = 'conflict' then
      raise exception 'Restore source rows changed after preview.' using errcode = '40001';
    end if;
  end if;

  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.canonical_operation_id', p_operation_id::text, true);
  perform set_config('ml.canonical_operation_origin', 'restore', true);
  perform set_config('ml.canonical_operation_garment_id', p_garment_id::text, true);

  result_version_id := ml_internal.commit_restore(
    p_garment_id, p_source_version_id, p_label, p_reason, p_scope_json,
    p_result_snapshot, p_result_checksum, p_expected_revision, p_operation_id,
    p_selected_keys, p_dependency_json, p_replay_patch, p_inverse_patch,
    p_preview_checksum
  );
  return ml_internal.protected_receipt(
    p_studio_id, p_operation_id, 'restore', request_payload,
    jsonb_build_object('status', 'applied', 'versionId', result_version_id)
  );
end;
$$;

create or replace function ml_private.create_canonical_freeze_frame(
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
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  garment ml_private.garments;
  request_value jsonb := jsonb_build_object(
    'garmentId', p_garment_id, 'label', p_label, 'notes', p_notes,
    'scope', p_scope_json, 'snapshot', p_snapshot_json, 'checksum', p_checksum,
    'expectedRevision', p_expected_revision, 'kind', p_version_kind
  );
  prior jsonb;
  version_id uuid;
  result_value jsonb;
begin
  select * into garment from ml_private.garments where id = p_garment_id;
  if garment.id is null or not ml_internal.can_write_studio(garment.studio_id) then
    raise exception 'Garment is unavailable.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(garment.studio_id, p_operation_id, 'freeze_frame', request_value, null);
  if prior is not null then return prior; end if;
  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.canonical_operation_id', p_operation_id::text, true);
  perform set_config('ml.canonical_operation_origin', 'user', true);
  perform set_config('ml.canonical_operation_garment_id', garment.id::text, true);
  version_id := ml_internal.create_freeze_frame(
    p_garment_id, p_label, p_notes, p_scope_json, p_snapshot_json,
    p_checksum, p_expected_revision, p_operation_id, p_version_kind
  );
  result_value := jsonb_build_object('status', 'applied', 'versionId', version_id);
  return ml_internal.protected_receipt(garment.studio_id, p_operation_id, 'freeze_frame', request_value, result_value);
end;
$$;

create or replace function ml_private.release_technical_spec(
  p_spec_id uuid,
  p_expected_spec_revision bigint,
  p_expected_garment_revision bigint,
  p_operation_id uuid,
  p_release jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  spec ml_private.technical_specs;
  garment ml_private.garments;
  version_row jsonb := p_release -> 'version';
  run_row jsonb := p_release -> 'validationRun';
  task_row jsonb;
  waiver_row jsonb;
  prior jsonb;
  result_value jsonb;
  new_version_no integer;
  release_time timestamptz := coalesce((p_release ->> 'releasedAt')::timestamptz, now());
begin
  select * into spec from ml_private.technical_specs where id = p_spec_id for update;
  if spec.id is null or (select auth.uid()) is null or not ml_internal.can_write_studio(spec.studio_id) then
    raise exception 'Technical specification is unavailable to this Studio member.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(spec.studio_id, p_operation_id, 'technical_release', p_release, null);
  if prior is not null then return prior; end if;
  select * into garment from ml_private.garments
  where studio_id = spec.studio_id and id = spec.garment_id for update;
  if spec.revision <> p_expected_spec_revision or garment.revision <> p_expected_garment_revision then
    raise exception 'Fresh server state is required for technical release.' using errcode = '40001';
  end if;
  if spec.status = 'released' then
    raise exception 'This technical specification is already released.' using errcode = '23514';
  end if;
  if jsonb_typeof(version_row -> 'snapshot') <> 'object'
    or coalesce(version_row ->> 'kind', '') <> 'release'
    or coalesce(version_row ->> 'garmentId', '')::uuid <> garment.id
    or coalesce(run_row ->> 'specId', '')::uuid <> spec.id
    or coalesce(run_row ->> 'status', '') not in ('passed', 'warning')
    or jsonb_typeof(run_row -> 'issues') <> 'array'
  then
    raise exception 'Release version or validation evidence is invalid.' using errcode = '23514';
  end if;
  select coalesce(max(version_no), 0) + 1 into new_version_no
  from ml_private.garment_versions where studio_id = spec.studio_id and garment_id = garment.id;
  if (version_row ->> 'versionNo')::integer <> new_version_no then
    raise exception 'Release version sequence is stale.' using errcode = '40001';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_release -> 'waivers', '[]'::jsonb)) waiver
    where waiver ->> 'domain' = 'privacy'
      or length(btrim(coalesce(waiver ->> 'reason', ''))) < 8
      or not exists (
        select 1 from jsonb_array_elements(run_row -> 'issues') issue
        where issue ->> 'code' = waiver ->> 'ruleCode'
          and coalesce((issue ->> 'waivable')::boolean, false)
          and coalesce(issue ->> 'domain', '') <> 'privacy'
      )
  ) then
    raise exception 'Release contains an invalid or non-waivable exception.' using errcode = '23514';
  end if;

  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.canonical_operation_id', p_operation_id::text, true);
  perform set_config('ml.canonical_operation_origin', 'user', true);
  perform set_config('ml.canonical_operation_garment_id', garment.id::text, true);

  insert into ml_private.garment_versions (
    id, studio_id, garment_id, parent_version_id, version_no, label, notes,
    version_kind, base_revision, scope_json, snapshot_json, checksum, created_by, created_at
  ) values (
    (version_row ->> 'id')::uuid, spec.studio_id, garment.id,
    nullif(version_row ->> 'parentVersionId', '')::uuid, new_version_no,
    version_row ->> 'label', coalesce(version_row ->> 'notes', ''), 'release',
    garment.revision, jsonb_build_object('domain', coalesce(version_row ->> 'scope', 'technical')),
    version_row -> 'snapshot', (version_row ->> 'checksum')::ml_private.sha256_checksum,
    (select auth.uid()), release_time
  );
  insert into ml_private.entity_revisions (
    studio_id, garment_version_id, entity_type, entity_id, operation,
    snapshot_json, checksum, scope
  ) values (
    spec.studio_id, (version_row ->> 'id')::uuid, 'garment_scope', garment.id,
    'create', version_row -> 'snapshot', (version_row ->> 'checksum')::ml_private.sha256_checksum,
    coalesce(version_row ->> 'scope', 'technical')
  );
  insert into ml_private.validation_runs (
    id, studio_id, spec_id, garment_version_id, status, ruleset_version,
    result_json, created_by, created_at
  ) values (
    (run_row ->> 'id')::uuid, spec.studio_id, spec.id, (version_row ->> 'id')::uuid,
    run_row ->> 'status', run_row ->> 'rulesetVersion',
    jsonb_build_object('issues', run_row -> 'issues'), (select auth.uid()), release_time
  );
  for task_row in select value from jsonb_array_elements(coalesce(p_release -> 'tasks', '[]'::jsonb)) loop
    insert into ml_private.tasks (
      id, studio_id, garment_id, title, description, status, priority,
      due_at, assignee_id, sort_order, created_at, updated_at, revision
    ) values (
      (task_row ->> 'id')::uuid, spec.studio_id, garment.id, task_row ->> 'title',
      coalesce(task_row ->> 'description', ''), coalesce(task_row ->> 'status', 'todo'),
      coalesce(task_row ->> 'priority', 'high'), nullif(task_row ->> 'dueAt', '')::timestamptz,
      nullif(task_row ->> 'assigneeId', '')::uuid, coalesce((task_row ->> 'sortOrder')::integer, 0),
      release_time, release_time, 1
    );
  end loop;
  for waiver_row in select value from jsonb_array_elements(coalesce(p_release -> 'waivers', '[]'::jsonb)) loop
    insert into ml_private.validation_waivers (
      id, studio_id, spec_id, validation_run_id, rule_code, domain,
      reason, actor_id, follow_up_task_id, waived_at, created_at
    ) values (
      (waiver_row ->> 'id')::uuid, spec.studio_id, spec.id, (run_row ->> 'id')::uuid,
      waiver_row ->> 'ruleCode', waiver_row ->> 'domain', waiver_row ->> 'reason',
      (select auth.uid()), (waiver_row ->> 'followUpTaskId')::uuid, release_time, release_time
    );
  end loop;
  update ml_private.garments
  set current_version_id = (version_row ->> 'id')::uuid, revision = revision + 1, updated_at = release_time
  where studio_id = spec.studio_id and id = garment.id;
  update ml_private.technical_specs
  set status = 'released', release_version_id = (version_row ->> 'id')::uuid,
      release_validation_run_id = (run_row ->> 'id')::uuid,
      released_by = (select auth.uid()), released_at = release_time,
      revision = revision + 1, updated_at = release_time
  where studio_id = spec.studio_id and id = spec.id;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id, entity_type,
    entity_id, operation, json_patch, inverse_patch, scope_json,
    base_revision, result_revision
  ) values (
    spec.studio_id, garment.id, 'user', (select auth.uid()), p_operation_id,
    'garment_version', (version_row ->> 'id')::uuid, 'create',
    jsonb_build_array(jsonb_build_object('op', 'add', 'path', '/', 'value', version_row)),
    jsonb_build_array(jsonb_build_object('op', 'remove', 'path', '/')),
    '{"domain":"technical"}'::jsonb, garment.revision, garment.revision + 1
  );
  result_value := jsonb_build_object(
    'status', 'applied', 'versionId', version_row ->> 'id',
    'validationRunId', run_row ->> 'id'
  );
  return ml_internal.protected_receipt(spec.studio_id, p_operation_id, 'technical_release', p_release, result_value);
end;
$$;

create or replace function ml_private.record_tech_pack_export(
  p_spec_id uuid,
  p_expected_spec_revision bigint,
  p_operation_id uuid,
  p_export jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  spec ml_private.technical_specs;
  prior jsonb;
  result_value jsonb;
begin
  select * into spec from ml_private.technical_specs where id = p_spec_id for update;
  if spec.id is null or not ml_internal.can_write_studio(spec.studio_id) then
    raise exception 'Technical specification is unavailable.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(spec.studio_id, p_operation_id, 'tech_pack_export', p_export, null);
  if prior is not null then return prior; end if;
  if spec.revision <> p_expected_spec_revision or spec.status <> 'released'
    or spec.release_version_id is distinct from (p_export ->> 'garmentVersionId')::uuid
    or jsonb_typeof(p_export -> 'sectionManifest') <> 'array'
  then
    raise exception 'Fresh released specification and structured export manifest are required.' using errcode = '40001';
  end if;
  insert into ml_private.tech_pack_exports (
    id, studio_id, spec_id, garment_version_id, export_asset_id, format,
    checksum, created_by, created_at, ruleset_version, storage_path,
    generated_at, section_manifest_json, approved_by, approved_at,
    template_id, template_version, source_revision_label, deterministic_filename
  ) values (
    (p_export ->> 'id')::uuid, spec.studio_id, spec.id,
    (p_export ->> 'garmentVersionId')::uuid, (p_export ->> 'exportAssetId')::uuid,
    p_export ->> 'format', (p_export ->> 'checksum')::ml_private.sha256_checksum,
    (select auth.uid()), (p_export ->> 'createdAt')::timestamptz,
    p_export ->> 'rulesetVersion', p_export ->> 'storagePath',
    (p_export ->> 'generatedAt')::timestamptz, p_export -> 'sectionManifest',
    (select auth.uid()), (p_export ->> 'approvedAt')::timestamptz,
    (p_export ->> 'templateId')::uuid, (p_export ->> 'templateVersion')::integer,
    p_export ->> 'sourceRevisionLabel', p_export ->> 'deterministicFilename'
  );
  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id, entity_type,
    entity_id, operation, json_patch, inverse_patch, scope_json
  ) values (
    spec.studio_id, spec.garment_id, 'user', (select auth.uid()), p_operation_id,
    'tech_pack_export', (p_export ->> 'id')::uuid, 'create',
    jsonb_build_array(jsonb_build_object('op', 'add', 'path', '/', 'value', p_export)),
    jsonb_build_array(jsonb_build_object('op', 'remove', 'path', '/')),
    '{"domain":"technical"}'::jsonb
  );
  result_value := jsonb_build_object('status', 'applied', 'exportId', p_export ->> 'id');
  return ml_internal.protected_receipt(spec.studio_id, p_operation_id, 'tech_pack_export', p_export, result_value);
end;
$$;

create or replace function ml_private.record_editorial_export(
  p_collection_id uuid,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_export jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection ml_private.editorial_collections;
  prior jsonb;
  result_value jsonb;
begin
  select * into collection from ml_private.editorial_collections where id = p_collection_id for update;
  if collection.id is null or not ml_internal.can_write_studio(collection.studio_id) then
    raise exception 'Editorial collection is unavailable.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(collection.studio_id, p_operation_id, 'editorial_export', p_export, null);
  if prior is not null then return prior; end if;
  if collection.revision <> p_expected_revision
    or collection.status not in ('ready', 'approved', 'published')
    or (p_export ->> 'collectionRevision')::bigint <> collection.revision
    or jsonb_typeof(p_export -> 'manifest') <> 'object'
  then
    raise exception 'Fresh approved editorial state is required for export.' using errcode = '40001';
  end if;
  insert into ml_private.editorial_exports (
    id, studio_id, collection_id, collection_revision, format, checksum,
    storage_path, source_garment_version_id, manifest_json, generated_at,
    approved_by, approved_at, created_at, updated_at, revision
  ) values (
    (p_export ->> 'id')::uuid, collection.studio_id, collection.id, collection.revision,
    p_export ->> 'format', (p_export ->> 'checksum')::ml_private.sha256_checksum,
    p_export ->> 'storagePath', nullif(p_export ->> 'sourceGarmentVersionId', '')::uuid,
    p_export -> 'manifest', (p_export ->> 'generatedAt')::timestamptz,
    nullif(p_export ->> 'approvedBy', '')::uuid, nullif(p_export ->> 'approvedAt', '')::timestamptz,
    (p_export ->> 'createdAt')::timestamptz, (p_export ->> 'updatedAt')::timestamptz, 1
  );
  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id, entity_type,
    entity_id, operation, json_patch, inverse_patch, scope_json
  ) values (
    collection.studio_id, collection.garment_id, 'publication', (select auth.uid()), p_operation_id,
    'editorial_export', (p_export ->> 'id')::uuid, 'create',
    jsonb_build_array(jsonb_build_object('op', 'add', 'path', '/', 'value', p_export)),
    jsonb_build_array(jsonb_build_object('op', 'remove', 'path', '/')),
    '{"domain":"editorial"}'::jsonb
  );
  result_value := jsonb_build_object('status', 'applied', 'exportId', p_export ->> 'id');
  return ml_internal.protected_receipt(collection.studio_id, p_operation_id, 'editorial_export', p_export, result_value);
end;
$$;

create or replace function ml_private.commit_qc_waiver(
  p_qc_result_id uuid,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_task jsonb,
  p_waiver jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row ml_private.qc_results;
  inspection ml_private.qc_inspections;
  production_order ml_private.production_orders;
  request_value jsonb := jsonb_build_object('task', p_task, 'waiver', p_waiver);
  prior jsonb;
  result_value jsonb;
begin
  select * into result_row from ml_private.qc_results where id = p_qc_result_id for update;
  if result_row.id is null or not ml_internal.can_write_studio(result_row.studio_id) then
    raise exception 'QC result is unavailable.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(result_row.studio_id, p_operation_id, 'qc_waiver', request_value, null);
  if prior is not null then return prior; end if;
  select * into inspection from ml_private.qc_inspections
  where studio_id = result_row.studio_id and id = result_row.inspection_id;
  select * into production_order from ml_private.production_orders
  where studio_id = result_row.studio_id and id = inspection.production_order_id;
  if result_row.revision <> p_expected_revision or result_row.result not in ('fail', 'conditional')
    or inspection.status = 'decided' or length(btrim(coalesce(p_waiver ->> 'reason', ''))) < 8
    or (p_waiver ->> 'actorId')::uuid <> (select auth.uid())
  then
    raise exception 'Fresh failed QC evidence and a complete waiver are required.' using errcode = '40001';
  end if;
  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.canonical_operation_id', p_operation_id::text, true);
  perform set_config('ml.canonical_operation_origin', 'user', true);
  perform set_config('ml.canonical_operation_garment_id', production_order.garment_id::text, true);
  insert into ml_private.tasks (
    id, studio_id, garment_id, title, description, status, priority,
    due_at, assignee_id, sort_order
  ) values (
    (p_task ->> 'id')::uuid, result_row.studio_id, production_order.garment_id,
    p_task ->> 'title', p_task ->> 'description', p_task ->> 'status',
    p_task ->> 'priority', nullif(p_task ->> 'dueAt', '')::timestamptz,
    nullif(p_task ->> 'assigneeId', '')::uuid, (p_task ->> 'sortOrder')::integer
  );
  insert into ml_private.qc_waivers (
    id, studio_id, inspection_id, qc_result_id, affected_check_code,
    reason, actor_id, follow_up_task_id, waived_at
  ) values (
    (p_waiver ->> 'id')::uuid, result_row.studio_id, inspection.id, result_row.id,
    result_row.check_code, p_waiver ->> 'reason', (select auth.uid()),
    (p_task ->> 'id')::uuid, coalesce((p_waiver ->> 'waivedAt')::timestamptz, now())
  );
  update ml_private.qc_results
  set result = 'waived', issue_task_id = (p_task ->> 'id')::uuid,
      revision = revision + 1, updated_at = now()
  where studio_id = result_row.studio_id and id = result_row.id;
  result_value := jsonb_build_object('status', 'applied', 'waiverId', p_waiver ->> 'id', 'taskId', p_task ->> 'id');
  return ml_internal.protected_receipt(result_row.studio_id, p_operation_id, 'qc_waiver', request_value, result_value);
end;
$$;

create or replace function ml_private.decide_qc_inspection(
  p_inspection_id uuid,
  p_expected_revision bigint,
  p_operation_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inspection ml_private.qc_inspections;
  production_order ml_private.production_orders;
  request_value jsonb := jsonb_build_object('inspectionId', p_inspection_id, 'decision', p_decision, 'revision', p_expected_revision);
  prior jsonb;
  result_value jsonb;
begin
  select * into inspection from ml_private.qc_inspections where id = p_inspection_id for update;
  if inspection.id is null or not ml_internal.can_write_studio(inspection.studio_id) then
    raise exception 'QC inspection is unavailable.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(inspection.studio_id, p_operation_id, 'qc_decision', request_value, null);
  if prior is not null then return prior; end if;
  select * into production_order from ml_private.production_orders
  where studio_id = inspection.studio_id and id = inspection.production_order_id for update;
  if inspection.revision <> p_expected_revision or inspection.status = 'decided'
    or p_decision not in ('approve', 'hold', 'reject') then
    raise exception 'Fresh undecided QC state is required.' using errcode = '40001';
  end if;
  if p_decision = 'approve' and exists (
    select 1 from ml_private.qc_template_checks check_row
    where check_row.studio_id = inspection.studio_id and check_row.template_id = inspection.template_id
      and check_row.required
      and not exists (
        select 1 from ml_private.qc_results result_row
        where result_row.studio_id = inspection.studio_id and result_row.inspection_id = inspection.id
          and result_row.check_code = check_row.check_code
          and result_row.result in ('pass', 'not_applicable', 'waived')
      )
  ) then
    raise exception 'Required QC checks must pass or have immutable waiver evidence.' using errcode = '23514';
  end if;
  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.canonical_operation_id', p_operation_id::text, true);
  perform set_config('ml.canonical_operation_origin', 'user', true);
  perform set_config('ml.canonical_operation_garment_id', production_order.garment_id::text, true);
  update ml_private.qc_inspections
  set status = 'decided', release_decision = p_decision, decided_by = (select auth.uid()),
      decided_at = now(), revision = revision + 1, updated_at = now()
  where studio_id = inspection.studio_id and id = inspection.id;
  if p_decision = 'approve' then
    update ml_private.production_orders
    set status = 'closed', revision = revision + 1, updated_at = now()
    where studio_id = inspection.studio_id and id = production_order.id;
  end if;
  result_value := jsonb_build_object('status', 'applied', 'inspectionId', inspection.id, 'decision', p_decision);
  return ml_internal.protected_receipt(inspection.studio_id, p_operation_id, 'qc_decision', request_value, result_value);
end;
$$;

create or replace function ml_private.transition_ai_job(
  p_job_id uuid,
  p_expected_revision bigint,
  p_status text,
  p_error_code text default null,
  p_artifact jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  job ml_private.ai_jobs;
  result_value jsonb;
begin
  select * into job from ml_private.ai_jobs where id = p_job_id for update;
  if job.id is null or not ml_internal.can_write_studio(job.studio_id) then
    raise exception 'AI job is unavailable.' using errcode = '42501';
  end if;
  if job.status = p_status then
    return jsonb_build_object(
      'status', 'duplicate', 'jobId', job.id, 'jobStatus', job.status,
      'artifactId', (select artifact.id from ml_private.ai_artifacts artifact
        where artifact.studio_id = job.studio_id and artifact.ai_job_id = job.id limit 1)
    );
  end if;
  if job.revision <> p_expected_revision then
    raise exception 'AI job changed after it was loaded.' using errcode = '40001';
  end if;
  if not ((job.status = 'queued' and p_status = 'running')
    or (job.status = 'running' and p_status in ('candidate', 'failed'))) then
    raise exception 'Invalid AI job transition from % to %.', job.status, p_status using errcode = '23514';
  end if;
  if p_status = 'candidate' and (
    p_artifact is null or jsonb_typeof(p_artifact -> 'candidate') <> 'object'
    or jsonb_typeof(p_artifact -> 'provenance') <> 'object'
    or jsonb_typeof(p_artifact -> 'confidence') <> 'object'
    or jsonb_typeof(p_artifact -> 'fields') <> 'array'
    or (p_artifact ->> 'sourceChecksum')::text <> job.source_checksum::text
  ) then
    raise exception 'Candidate transition requires complete provider evidence for the same sources.' using errcode = '23514';
  end if;
  perform set_config('ml.canonical_operation_context', 'on', true);
  perform set_config('ml.canonical_operation_id', gen_random_uuid()::text, true);
  perform set_config('ml.canonical_operation_origin', 'system', true);
  perform set_config('ml.canonical_operation_garment_id', coalesce(job.garment_id::text, ''), true);
  if p_status = 'candidate' then
    insert into ml_private.ai_artifacts (
      id, studio_id, ai_job_id, artifact_type, candidate_json, provenance_json,
      confidence_json, decision, source_checksum, candidate_checksum,
      field_manifest_json, generated_at, created_at, updated_at, revision
    ) values (
      (p_artifact ->> 'id')::uuid, job.studio_id, job.id, p_artifact ->> 'artifactType',
      p_artifact -> 'candidate', p_artifact -> 'provenance', p_artifact -> 'confidence',
      'pending', (p_artifact ->> 'sourceChecksum')::ml_private.sha256_checksum,
      (p_artifact ->> 'candidateChecksum')::ml_private.sha256_checksum,
      p_artifact -> 'fields', (p_artifact ->> 'generatedAt')::timestamptz,
      (p_artifact ->> 'createdAt')::timestamptz, (p_artifact ->> 'updatedAt')::timestamptz, 1
    );
  end if;
  update ml_private.ai_jobs
  set status = p_status,
      started_at = case when p_status = 'running' then now() else started_at end,
      completed_at = case when p_status in ('candidate', 'failed') then now() else null end,
      error_code = case when p_status = 'failed' then coalesce(nullif(btrim(p_error_code), ''), 'provider_failed') else null end,
      revision = revision + 1, updated_at = now()
  where studio_id = job.studio_id and id = job.id;
  result_value := jsonb_build_object('status', 'applied', 'jobId', job.id, 'jobStatus', p_status, 'artifactId', p_artifact ->> 'id');
  return result_value;
end;
$$;

create or replace function ml_private.record_ai_validation_candidate(
  p_artifact_id uuid,
  p_operation_id uuid,
  p_run jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  artifact ml_private.ai_artifacts;
  job ml_private.ai_jobs;
  spec ml_private.technical_specs;
  prior jsonb;
  event_id uuid := gen_random_uuid();
  result_value jsonb;
begin
  select * into artifact from ml_private.ai_artifacts where id = p_artifact_id for update;
  if artifact.id is null or not ml_internal.can_write_studio(artifact.studio_id) then
    raise exception 'AI artifact is unavailable.' using errcode = '42501';
  end if;
  prior := ml_internal.protected_receipt(artifact.studio_id, p_operation_id, 'ai_validation_candidate', p_run, null);
  if prior is not null then return prior; end if;
  select * into job from ml_private.ai_jobs
  where studio_id = artifact.studio_id and id = artifact.ai_job_id;
  select * into spec from ml_private.technical_specs
  where studio_id = artifact.studio_id and id = (p_run ->> 'specId')::uuid;
  if artifact.decision <> 'pending' or job.job_type <> 'tech_pack_validation'
    or not ml_internal.ai_job_sources_are_fresh(job.id)
    or spec.id is null or spec.garment_id is distinct from job.garment_id
    or (p_run ->> 'status') not in ('passed', 'failed', 'warning', 'error')
    or jsonb_typeof(p_run -> 'issues') <> 'array'
  then
    raise exception 'AI validation evidence is stale or invalid.' using errcode = '40001';
  end if;
  insert into ml_private.validation_runs (
    id, studio_id, spec_id, garment_version_id, status, ruleset_version,
    result_json, created_by, created_at
  ) values (
    (p_run ->> 'id')::uuid, artifact.studio_id, spec.id,
    nullif(p_run ->> 'garmentVersionId', '')::uuid, p_run ->> 'status',
    p_run ->> 'rulesetVersion', jsonb_build_object('issues', p_run -> 'issues'),
    (select auth.uid()), coalesce((p_run ->> 'ranAt')::timestamptz, now())
  );
  insert into ml_private.change_events (
    id, studio_id, garment_id, origin, actor_id, operation_id, entity_type,
    entity_id, operation, json_patch, inverse_patch, scope_json
  ) values (
    event_id, artifact.studio_id, job.garment_id, 'ai_acceptance', (select auth.uid()),
    p_operation_id, 'validation_run', (p_run ->> 'id')::uuid, 'create',
    jsonb_build_array(jsonb_build_object('op', 'add', 'path', '/', 'value', p_run)),
    jsonb_build_array(jsonb_build_object('op', 'remove', 'path', '/')),
    '{"domain":"technical"}'::jsonb
  );
  result_value := jsonb_build_object('status', 'applied', 'eventId', event_id, 'validationRunId', p_run ->> 'id');
  return ml_internal.protected_receipt(artifact.studio_id, p_operation_id, 'ai_validation_candidate', p_run, result_value);
end;
$$;

create or replace function ml_private.delete_freeze_frame(
  p_version_id uuid,
  p_expected_garment_revision bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare version_row ml_private.garment_versions; garment ml_private.garments;
begin
  select * into version_row from ml_private.garment_versions where id = p_version_id for update;
  if version_row.id is null or not ml_internal.can_write_studio(version_row.studio_id) then
    raise exception 'Freeze Frame is unavailable.' using errcode = '42501';
  end if;
  select * into garment from ml_private.garments
  where studio_id = version_row.studio_id and id = version_row.garment_id for update;
  if garment.revision <> p_expected_garment_revision or garment.current_version_id = version_row.id then
    raise exception 'Refresh the garment or create a newer current Freeze Frame before deleting this one.' using errcode = '40001';
  end if;
  delete from ml_private.garment_versions where studio_id = version_row.studio_id and id = version_row.id;
end;
$$;

revoke insert on ml_private.editorial_exports, ml_private.tech_pack_exports from authenticated;
revoke update, delete on ml_private.qc_waivers from authenticated;

revoke all on function ml_private.commit_canonical_restore(uuid, uuid, uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, uuid, jsonb, jsonb, jsonb, jsonb, ml_private.sha256_checksum, jsonb) from public, anon, authenticated;
revoke all on function ml_private.create_canonical_freeze_frame(uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, text) from public, anon, authenticated;
revoke all on function ml_private.release_technical_spec(uuid, bigint, bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function ml_private.record_tech_pack_export(uuid, bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function ml_private.record_editorial_export(uuid, bigint, uuid, jsonb) from public, anon, authenticated;
revoke all on function ml_private.commit_qc_waiver(uuid, bigint, uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function ml_private.decide_qc_inspection(uuid, bigint, uuid, text) from public, anon, authenticated;
revoke all on function ml_private.transition_ai_job(uuid, bigint, text, text, jsonb) from public, anon, authenticated;
revoke all on function ml_private.record_ai_validation_candidate(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function ml_private.delete_freeze_frame(uuid, bigint) from public, anon, authenticated;

grant execute on function ml_private.commit_canonical_restore(uuid, uuid, uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, uuid, jsonb, jsonb, jsonb, jsonb, ml_private.sha256_checksum, jsonb) to authenticated;
grant execute on function ml_private.create_canonical_freeze_frame(uuid, text, text, jsonb, jsonb, ml_private.sha256_checksum, bigint, uuid, text) to authenticated;
grant execute on function ml_private.release_technical_spec(uuid, bigint, bigint, uuid, jsonb) to authenticated;
grant execute on function ml_private.record_tech_pack_export(uuid, bigint, uuid, jsonb) to authenticated;
grant execute on function ml_private.record_editorial_export(uuid, bigint, uuid, jsonb) to authenticated;
grant execute on function ml_private.commit_qc_waiver(uuid, bigint, uuid, jsonb, jsonb) to authenticated;
grant execute on function ml_private.decide_qc_inspection(uuid, bigint, uuid, text) to authenticated;
grant execute on function ml_private.transition_ai_job(uuid, bigint, text, text, jsonb) to authenticated;
grant execute on function ml_private.record_ai_validation_candidate(uuid, uuid, jsonb) to authenticated;
grant execute on function ml_private.delete_freeze_frame(uuid, bigint) to authenticated;

comment on function ml_private.release_technical_spec(uuid, bigint, bigint, uuid, jsonb) is
  'Atomic fresh-state release command. Creates the Freeze Frame, validation, waiver/task evidence, ledger event, and source pins together.';
comment on function ml_private.record_editorial_export(uuid, bigint, uuid, jsonb) is
  'Records immutable editorial export evidence only from a freshly locked approved collection.';
comment on function ml_private.transition_ai_job(uuid, bigint, text, text, jsonb) is
  'Server-owned AI lifecycle transition. Candidate artifacts remain evidence and cannot write domain records.';

commit;
