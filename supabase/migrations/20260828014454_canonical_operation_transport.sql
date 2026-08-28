-- Canonical browser operation transport for the 2.0 system-of-record cutover.
--
-- The trusted migration role remains a separate direct, non-destructive path.
-- Normal authenticated UI writes use commit_canonical_operation so a group of
-- normalized rows is revision-checked, written, audited, and receipted in one
-- database transaction while the underlying DML still runs through RLS.

begin;

alter table ml_private.portfolio_editorials
  add column if not exists id uuid not null default gen_random_uuid();

create unique index if not exists ml_portfolio_editorials_id_idx
  on ml_private.portfolio_editorials (id);
create unique index if not exists ml_portfolio_editorials_studio_id_idx
  on ml_private.portfolio_editorials (studio_id, id);

create table ml_private.canonical_operation_receipts (
  id uuid primary key,
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  garment_id uuid,
  origin text not null check (origin in (
    'user', 'sync', 'migration', 'ai_acceptance', 'restore', 'publication', 'system'
  )),
  mutation_count integer not null check (mutation_count between 1 and 2000),
  receipt_kind text not null default 'canonical_operation',
  request_checksum ml_private.sha256_checksum,
  result_json jsonb not null check (jsonb_typeof(result_json) = 'object'),
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  constraint canonical_operation_receipts_garment_fk
    foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete set null (garment_id)
);

comment on table ml_private.canonical_operation_receipts is
  'Append-only idempotency receipts for canonical browser mutation groups. Payloads contain identifiers and authoritative result rows, never media bytes.';

create index ml_canonical_operation_receipts_studio_time_idx
  on ml_private.canonical_operation_receipts (studio_id, created_at desc);

alter table ml_private.canonical_operation_receipts enable row level security;
alter table ml_private.canonical_operation_receipts force row level security;

create policy canonical_operation_receipts_select_member
  on ml_private.canonical_operation_receipts
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));

grant select on table ml_private.canonical_operation_receipts to authenticated;
revoke insert, update, delete on table ml_private.canonical_operation_receipts
  from anon, authenticated;

create or replace function ml_internal.canonical_client_table(p_entity_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_entity_type
    when 'collections' then 'collections'
    when 'garments' then 'garments'
    when 'suppliers' then 'suppliers'
    when 'factories' then 'factories'
    when 'design_briefs' then 'design_briefs'
    when 'inspiration_boards' then 'inspiration_boards'
    when 'inspiration_items' then 'inspiration_items'
    when 'media_assets' then 'media_assets'
    when 'garment_media' then 'garment_media'
    when 'media_derivatives' then 'media_derivatives'
    when 'design_annotations' then 'design_annotations'
    when 'materials' then 'materials'
    when 'material_variants' then 'material_variants'
    when 'inventory_entries' then 'inventory_entries'
    when 'garment_materials' then 'garment_materials'
    when 'components' then 'components'
    when 'component_variants' then 'component_variants'
    when 'garment_components' then 'garment_components'
    when 'supplier_items' then 'supplier_items'
    when 'technical_specs' then 'technical_specs'
    when 'technical_flats' then 'technical_flats'
    when 'flat_annotations' then 'flat_annotations'
    when 'technical_files' then 'technical_files'
    when 'pom_points' then 'pom_points'
    when 'measurement_sets' then 'measurement_sets'
    when 'measurement_values' then 'measurement_values'
    when 'grade_rules' then 'grade_rules'
    when 'grade_rule_values' then 'grade_rule_values'
    when 'fit_measurements' then 'fit_measurements'
    when 'bom_items' then 'bom_items'
    when 'construction_sections' then 'construction_sections'
    when 'construction_steps' then 'construction_steps'
    when 'construction_details' then 'construction_details'
    when 'technical_templates' then 'technical_templates'
    when 'sample_rounds' then 'sample_rounds'
    when 'sample_round_media' then 'sample_round_media'
    when 'fit_sessions' then 'fit_sessions'
    when 'fit_session_media' then 'fit_session_media'
    when 'fit_issues' then 'fit_issues'
    when 'fit_issue_promotions' then 'fit_issue_promotions'
    when 'cost_sheets' then 'cost_sheets'
    when 'cost_items' then 'cost_items'
    when 'production_orders' then 'production_orders'
    when 'production_milestones' then 'production_milestones'
    when 'qc_templates' then 'qc_templates'
    when 'qc_template_checks' then 'qc_template_checks'
    when 'qc_inspections' then 'qc_inspections'
    when 'qc_results' then 'qc_results'
    when 'qc_waivers' then 'qc_waivers'
    when 'editorial_collections' then 'editorial_collections'
    when 'editorial_collection_garments' then 'editorial_collection_garments'
    when 'editorial_scenes' then 'editorial_scenes'
    when 'editorial_blocks' then 'editorial_blocks'
    when 'editorial_assets' then 'editorial_assets'
    when 'portfolio_profiles' then 'portfolio_profiles'
    when 'portfolio_projects' then 'portfolio_projects'
    when 'portfolio_project_assets' then 'portfolio_project_assets'
    when 'portfolio_editorials' then 'portfolio_editorials'
    when 'portfolio_editorial_scenes' then 'portfolio_editorial_scenes'
    when 'portfolio_editorial_assets' then 'portfolio_editorial_assets'
    when 'portfolio_technical_excerpts' then 'portfolio_technical_excerpts'
    when 'tasks' then 'tasks'
    when 'calendar_events' then 'calendar_events'
    when 'ai_jobs' then 'ai_jobs'
    when 'ai_job_input_refs' then 'ai_job_input_refs'
    else null
  end;
$$;

create or replace function ml_internal.canonical_delete_allowed(p_table_name text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_table_name = any(array[
    'collections', 'design_briefs', 'inspiration_boards', 'inspiration_items',
    'garment_media', 'media_derivatives', 'design_annotations',
    'material_variants', 'garment_materials', 'component_variants',
    'garment_components', 'supplier_items', 'technical_flats',
    'flat_annotations', 'technical_files', 'pom_points', 'measurement_sets',
    'measurement_values', 'grade_rules', 'grade_rule_values', 'fit_measurements',
    'bom_items', 'construction_sections', 'construction_steps',
    'construction_details', 'sample_rounds', 'sample_round_media',
    'fit_sessions', 'fit_session_media', 'fit_issues', 'fit_issue_promotions',
    'cost_sheets', 'cost_items', 'production_milestones', 'qc_template_checks',
    'qc_inspections', 'qc_results', 'editorial_collection_garments',
    'editorial_scenes', 'editorial_blocks', 'editorial_assets',
    'portfolio_project_assets', 'portfolio_editorial_scenes',
    'portfolio_editorial_assets', 'portfolio_technical_excerpts',
    'tasks', 'calendar_events', 'ai_job_input_refs'
  ]::text[]);
$$;

create or replace function ml_internal.canonical_stable_columns(p_table_name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_table_name
    when 'garments' then array['garment_code']::text[]
    when 'materials' then array['material_code']::text[]
    when 'components' then array['component_code']::text[]
    when 'portfolio_profiles' then array['username_slug']::text[]
    when 'portfolio_projects' then array['slug']::text[]
    when 'portfolio_editorials' then array['slug']::text[]
    else '{}'::text[]
  end;
$$;

-- This is deliberately an allowlist, not a list derived from pg_catalog at
-- runtime. Adding a column to a table never makes that column browser-writable.
create or replace function ml_internal.canonical_client_columns(p_table_name text)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_table_name
    when 'collections' then array['name','season','status','sort_order','archived_at']
    when 'garments' then array['collection_id','garment_code','title','garment_type','status','phase','archived_at']
    when 'suppliers' then array['name','supplier_type','contact_name','contact_email','phone','website','status','default_lead_time_days','archived_at','capabilities_json','minimum_order_quantity']
    when 'factories' then array['name','capabilities_json','minimum_order_quantity','lead_time_days','status','archived_at','supplier_id','contact_name','contact_email','phone']
    when 'design_briefs' then array['garment_id','intent','target_wearer','silhouette','color_story','key_features']
    when 'inspiration_boards' then array['garment_id','title','layout_json','sort_order']
    when 'inspiration_items' then array['board_id','asset_id','caption','position_json','sort_order']
    when 'media_assets' then array['storage_path','original_filename','mime_type','size_bytes','checksum','rights_json','width','height','duration_ms']
    when 'garment_media' then array['garment_id','asset_id','role','sort_order','framing_json']
    when 'media_derivatives' then array['source_asset_id','variant','storage_path','mime_type','size_bytes','checksum','width','height']
    when 'design_annotations' then array['garment_id','asset_id','anchor_json','body','status']
    when 'materials' then array['material_code','name','category','composition','status','archived_at']
    when 'material_variants' then array['material_id','color_name','color_hex','width','width_unit','weight_gsm','sku','status']
    when 'inventory_entries' then array['variant_id','entry_type','quantity','unit','occurred_at','note']
    when 'garment_materials' then array['garment_id','variant_id','role','placement','required_quantity','reserved_quantity','unit','status']
    when 'components' then array['component_code','name','category','spec_json','status','archived_at']
    when 'component_variants' then array['component_id','finish','size','color','sku','status']
    when 'garment_components' then array['garment_id','variant_id','placement','quantity','unit','status']
    when 'supplier_items' then array['supplier_id','item_type','material_variant_id','component_variant_id','sku','currency','unit_cost','purchase_unit','minimum_order_quantity','lead_time_days','is_preferred']
    when 'technical_specs' then array['garment_id','status','base_size','unit','revision_label']
    when 'technical_flats' then array['spec_id','view','asset_id','source','approved_at','sort_order']
    when 'flat_annotations' then array['flat_id','anchor_json','label','detail','sort_order','severity','status']
    when 'technical_files' then array['spec_id','asset_id','file_type','version_label','is_source']
    when 'pom_points' then array['spec_id','code','name','method','diagram_anchor_json','sort_order']
    when 'measurement_sets' then array['spec_id','name','sample_type','base_size','status']
    when 'measurement_values' then array['set_id','pom_point_id','size','target','tolerance_plus','tolerance_minus']
    when 'grade_rules' then array['spec_id','name','size_range_json','status']
    when 'grade_rule_values' then array['grade_rule_id','pom_point_id','from_size','to_size','delta']
    when 'fit_measurements' then array['sample_round_id','pom_point_id','size','actual','variance','fit_session_id','garment_version_id']
    when 'bom_items' then array['spec_id','item_type','material_variant_id','component_variant_id','description','quantity','unit','placement','sort_order','intentional_free_text','supplier_item_id','substitute_item_id','status','shortage_quantity','unit_cost','currency','cost_impact']
    when 'construction_sections' then array['spec_id','name','sort_order','status']
    when 'construction_steps' then array['section_id','step_number','operation','machine','stitch_spec','seam_allowance','sort_order','machine_required','stitch_required','status']
    when 'construction_details' then array['step_id','asset_id','anchor_json','callout','severity','sort_order','status']
    when 'technical_templates' then array['template_type','name','payload_json','version','status']
    when 'sample_rounds' then array['garment_id','factory_id','garment_version_id','round_no','sample_type','status','received_at','requested_at','notes']
    when 'sample_round_media' then array['sample_round_id','asset_id','role','capture_status','captured_at','retry_count','sort_order']
    when 'fit_sessions' then array['sample_round_id','fit_date','model_profile_json','summary','decision','garment_version_id','status','decision_note']
    when 'fit_session_media' then array['fit_session_id','asset_id','role','capture_status','captured_at','retry_count','sort_order']
    when 'fit_issues' then array['fit_session_id','area','severity','observation','resolution','status','garment_version_id','pom_point_id','owner_task_id']
    when 'fit_issue_promotions' then array['fit_issue_id','garment_id','garment_version_id','promotion_type','status','task_id','pom_point_id','construction_detail_id','note','candidate_json','resolved_at']
    when 'cost_sheets' then array['garment_id','garment_version_id','currency','quantity_basis','status','calculated_total','name','cogs_per_unit','wholesale_unit_price','margin_pct','approved_at']
    when 'cost_items' then array['cost_sheet_id','category','description','quantity','unit_cost','waste_pct','total','sort_order','basis','currency','bom_item_id','material_variant_id','component_variant_id']
    when 'production_orders' then array['garment_id','garment_version_id','factory_id','order_code','quantity','status','target_ship_date','cost_sheet_id','target_start_date','target_delivery_date','approved_at','placed_at']
    when 'production_milestones' then array['production_order_id','name','owner_id','target_date','completed_at','status','sort_order']
    when 'qc_templates' then array['name','version','status']
    when 'qc_template_checks' then array['template_id','check_code','name','description','method','severity','required','sort_order']
    when 'qc_inspections' then array['production_order_id','garment_version_id','template_id','template_version','status','inspected_at']
    when 'qc_results' then array['production_order_id','check_code','result','severity','notes','inspected_at','inspection_id','template_check_id','evidence_asset_id','issue_task_id']
    when 'qc_waivers' then '{}'::text[]
    when 'editorial_collections' then array['garment_id','title','template_type','theme_id','status','subtitle','description','primary_garment_version_id','transition_json','export_settings_json','approved_at','published_at']
    when 'editorial_collection_garments' then array['collection_id','garment_id','role','sort_order']
    when 'editorial_scenes' then array['collection_id','scene_type','title','sort_order','transition_json','subtitle','description','narrative_role','background_json']
    when 'editorial_blocks' then array['scene_id','block_type','content_json','settings_json','sort_order','live_source','source_garment_id','source_version_id','source_entity_id','source_field_path','source_checksum','staleness','ai_artifact_id']
    when 'editorial_assets' then array['collection_id','asset_id','role','usage_json','sort_order']
    when 'portfolio_profiles' then array['username_slug','headline','bio','status','archived_at','display_name','location','public_email','resume_public_url','avatar_asset_id']
    when 'portfolio_projects' then array['profile_id','garment_id','slug','case_study_json','visibility','sort_order','archived_at','source_version_id','featured','include_technical_excerpt']
    when 'portfolio_project_assets' then array['portfolio_project_id','asset_id','role','alt_text','sort_order']
    when 'portfolio_editorials' then array['profile_id','collection_id','slug','visibility','sort_order','source_version_id']
    when 'portfolio_editorial_scenes' then array['profile_id','collection_id','scene_id','sort_order']
    when 'portfolio_editorial_assets' then array['profile_id','collection_id','asset_id','role','alt_text','sort_order']
    when 'portfolio_technical_excerpts' then array['profile_id','portfolio_project_id','garment_version_id','title','summary','public_download_asset_id','visible','approved_at']
    when 'tasks' then array['garment_id','title','description','status','priority','due_at','assignee_id','sort_order']
    when 'calendar_events' then array['garment_id','event_type','title','starts_at','ends_at','assignee_id']
    when 'ai_jobs' then array['garment_id','job_type','model','prompt_version','input_refs_json','provider','idempotency_key','source_checksum','retry_of_job_id','attempt_no']
    when 'ai_job_input_refs' then array['ai_job_id','entity_type','entity_id','entity_revision','source_version_id','field_path','source_checksum','sort_order']
    else '{}'::text[]
  end;
$$;

revoke all on function ml_internal.canonical_client_table(text)
  from public, anon, authenticated;
revoke all on function ml_internal.canonical_delete_allowed(text)
  from public, anon, authenticated;
revoke all on function ml_internal.canonical_stable_columns(text)
  from public, anon, authenticated;
revoke all on function ml_internal.canonical_client_columns(text)
  from public, anon, authenticated;
grant execute on function ml_internal.canonical_client_table(text)
  to authenticated;
grant execute on function ml_internal.canonical_delete_allowed(text)
  to authenticated;
grant execute on function ml_internal.canonical_stable_columns(text)
  to authenticated;
grant execute on function ml_internal.canonical_client_columns(text)
  to authenticated;

create or replace function ml_internal.reject_uncoordinated_canonical_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_studio_id uuid;
  cloud_authoritative boolean := false;
  caller_role text := coalesce(current_setting('role', true), '');
begin
  if caller_role in ('postgres', 'supabase_admin')
     or current_setting('ml.trusted_migration', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  target_studio_id := coalesce(
    nullif(to_jsonb(new) ->> 'studio_id', '')::uuid,
    nullif(to_jsonb(old) ->> 'studio_id', '')::uuid
  );

  select coalesce(
    setting.version_policy ->> 'canonicalPersistence',
    setting.version_policy ->> 'canonical_persistence',
    'local-recovery'
  ) in ('shadow', 'cloud')
  into cloud_authoritative
  from ml_private.studio_settings setting
  where setting.studio_id = target_studio_id;

  if cloud_authoritative
     and coalesce(current_setting('ml.operation_id', true), '') = ''
     and coalesce(current_setting('ml.canonical_operation_context', true), '') <> 'on' then
    raise exception 'Canonical cloud writes must use commit_canonical_operation.'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function ml_internal.record_canonical_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_text text := current_setting('ml.operation_id', true);
  origin_text text := coalesce(nullif(current_setting('ml.operation_origin', true), ''), 'user');
  garment_text text := current_setting('ml.garment_id', true);
  target_studio_id uuid;
  target_entity_id uuid;
  before_json jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_json jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  base_revision bigint;
  result_revision bigint;
begin
  if coalesce(operation_text, '') = '' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  target_studio_id := coalesce(
    nullif(after_json ->> 'studio_id', '')::uuid,
    nullif(before_json ->> 'studio_id', '')::uuid
  );
  target_entity_id := coalesce(
    nullif(after_json ->> 'id', '')::uuid,
    nullif(before_json ->> 'id', '')::uuid
  );
  base_revision := nullif(before_json ->> 'revision', '')::bigint;
  result_revision := nullif(after_json ->> 'revision', '')::bigint;

  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id,
    entity_type, entity_id, operation, json_patch, inverse_patch,
    scope_json, base_revision, result_revision
  ) values (
    target_studio_id,
    nullif(garment_text, '')::uuid,
    origin_text,
    (select auth.uid()),
    operation_text::uuid,
    tg_table_name,
    target_entity_id,
    case when tg_op = 'INSERT' then 'create' else lower(tg_op) end,
    jsonb_build_array(jsonb_build_object(
      'op', case when tg_op = 'INSERT' then 'add' when tg_op = 'DELETE' then 'remove' else 'replace' end,
      'path', '/entities/' || tg_table_name || '/' || target_entity_id::text,
      'value', after_json
    )),
    jsonb_build_array(jsonb_build_object(
      'op', case when tg_op = 'INSERT' then 'remove' when tg_op = 'DELETE' then 'add' else 'replace' end,
      'path', '/entities/' || tg_table_name || '/' || target_entity_id::text,
      'value', before_json
    )),
    jsonb_build_object('domain', 'all'),
    base_revision,
    result_revision
  );

  if tg_op = 'DELETE' then
    insert into ml_private.sync_tombstones (
      studio_id, user_id, entity_type, client_id, deleted_at
    ) values (
      target_studio_id, (select auth.uid()), tg_table_name,
      target_entity_id::text, now()
    )
    on conflict (studio_id, entity_type, client_id)
    do update set user_id = excluded.user_id, deleted_at = excluded.deleted_at;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function ml_internal.store_canonical_operation_receipt(
  p_operation_id uuid,
  p_studio_id uuid,
  p_garment_id uuid,
  p_origin text,
  p_mutation_count integer,
  p_request_checksum ml_private.sha256_checksum,
  p_result jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or current_setting('ml.operation_id', true) <> p_operation_id::text
     or not ml_internal.can_write_studio(p_studio_id) then
    raise exception 'Canonical operation receipt context is invalid.' using errcode = '42501';
  end if;

  insert into ml_private.canonical_operation_receipts (
    id, studio_id, actor_id, garment_id, origin, mutation_count,
    receipt_kind, request_checksum, result_json
  ) values (
    p_operation_id, p_studio_id, (select auth.uid()), p_garment_id,
    p_origin, p_mutation_count, 'canonical_operation', p_request_checksum, p_result
  );
end;
$$;

revoke all on function ml_internal.reject_uncoordinated_canonical_write()
  from public, anon, authenticated;
revoke all on function ml_internal.record_canonical_row_change()
  from public, anon, authenticated;
revoke all on function ml_internal.store_canonical_operation_receipt(uuid, uuid, uuid, text, integer, ml_private.sha256_checksum, jsonb)
  from public, anon, authenticated;
grant execute on function ml_internal.store_canonical_operation_receipt(uuid, uuid, uuid, text, integer, ml_private.sha256_checksum, jsonb)
  to authenticated;

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

    if action_name = 'insert' and current_row is not null then
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

revoke all on function ml_private.commit_canonical_operation(uuid, uuid, uuid, text, jsonb)
  from public, anon;
grant execute on function ml_private.commit_canonical_operation(uuid, uuid, uuid, text, jsonb)
  to authenticated;

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'collections', 'garments', 'suppliers', 'factories', 'design_briefs',
    'inspiration_boards', 'inspiration_items', 'media_assets', 'garment_media',
    'media_derivatives', 'design_annotations', 'materials', 'material_variants',
    'inventory_entries', 'garment_materials', 'components', 'component_variants',
    'garment_components', 'supplier_items', 'technical_specs', 'technical_flats',
    'flat_annotations', 'technical_files', 'pom_points', 'measurement_sets',
    'measurement_values', 'grade_rules', 'grade_rule_values', 'fit_measurements',
    'bom_items', 'construction_sections', 'construction_steps',
    'construction_details', 'technical_templates', 'sample_rounds',
    'sample_round_media', 'fit_sessions', 'fit_session_media', 'fit_issues',
    'fit_issue_promotions', 'cost_sheets', 'cost_items', 'production_orders',
    'production_milestones', 'qc_templates', 'qc_template_checks',
    'qc_inspections', 'qc_results', 'qc_waivers', 'editorial_collections',
    'editorial_collection_garments', 'editorial_scenes', 'editorial_blocks',
    'editorial_assets', 'portfolio_profiles', 'portfolio_projects',
    'portfolio_project_assets', 'portfolio_editorials',
    'portfolio_editorial_scenes', 'portfolio_editorial_assets',
    'portfolio_technical_excerpts', 'tasks', 'calendar_events', 'ai_jobs',
    'ai_job_input_refs'
  ]
  loop
    execute format(
      'create trigger canonical_operation_guard before insert or update or delete on ml_private.%I for each row execute function ml_internal.reject_uncoordinated_canonical_write()',
      target_table
    );
    execute format(
      'create trigger canonical_operation_audit after insert or update or delete on ml_private.%I for each row execute function ml_internal.record_canonical_row_change()',
      target_table
    );
  end loop;
end;
$$;

commit;
