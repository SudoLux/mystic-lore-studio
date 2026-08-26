-- Mystic Lore Studio 2.0 WP6b: costing, production orders, QC, and timeline.
--
-- Every commercial and quality decision is pinned to the same released
-- garment version. Milestones, template checks, inspection results, waivers,
-- evidence, and follow-up tasks remain normalized and tenant isolated.

begin;

-- Quantity-aware costing ------------------------------------------------------

alter table ml_private.cost_sheets
  add column name text not null default 'Cost scenario',
  add column cogs_per_unit numeric(14,4) not null default 0 check (cogs_per_unit >= 0),
  add column wholesale_unit_price numeric(14,4) not null default 0 check (wholesale_unit_price >= 0),
  add column margin_pct numeric(7,4) not null default 0 check (margin_pct between -10000 and 100),
  add column approved_by uuid references auth.users(id) on delete set null,
  add column approved_at timestamptz,
  add constraint cost_sheets_name_not_blank_check check (btrim(name) <> ''),
  add constraint cost_sheets_approval_evidence_check check (
    (status in ('approved', 'superseded') and approved_by is not null and approved_at is not null)
    or (status = 'draft' and approved_by is null and approved_at is null)
  );

update ml_private.cost_sheets
set cogs_per_unit = round(calculated_total / quantity_basis, 4),
    wholesale_unit_price = round(calculated_total / quantity_basis, 4);

alter table ml_private.cost_items
  add column basis text not null default 'per_unit'
    check (basis in ('per_unit', 'per_order')),
  add column currency ml_private.iso_currency,
  add column bom_item_id uuid,
  add column material_variant_id uuid,
  add column component_variant_id uuid,
  add constraint cost_items_category_check
    check (category in ('material', 'trim', 'labor', 'overhead', 'freight')) not valid,
  add constraint cost_items_bom_fk foreign key (studio_id, bom_item_id)
    references ml_private.bom_items(studio_id, id) on delete set null (bom_item_id),
  add constraint cost_items_material_variant_fk foreign key (studio_id, material_variant_id)
    references ml_private.material_variants(studio_id, id) on delete restrict,
  add constraint cost_items_component_variant_fk foreign key (studio_id, component_variant_id)
    references ml_private.component_variants(studio_id, id) on delete restrict,
  add constraint cost_items_description_not_blank_check check (btrim(description) <> '');

update ml_private.cost_items item
set currency = sheet.currency
from ml_private.cost_sheets sheet
where sheet.studio_id = item.studio_id and sheet.id = item.cost_sheet_id;

alter table ml_private.cost_items alter column currency set not null;

create or replace function ml_internal.enforce_cost_item_currency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare sheet_currency ml_private.iso_currency;
begin
  select currency into sheet_currency from ml_private.cost_sheets
  where studio_id = new.studio_id and id = new.cost_sheet_id;
  if sheet_currency is null or new.currency <> sheet_currency then
    raise exception 'Cost item currency must match its cost sheet.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function ml_internal.assert_cost_sheet_release_pin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.garment_version_id is null or not exists (
    select 1 from ml_private.technical_specs spec
    where spec.studio_id = new.studio_id and spec.garment_id = new.garment_id
      and spec.status = 'released' and spec.release_version_id = new.garment_version_id
  ) then
    raise exception 'Cost sheet must pin a released garment version.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and old.garment_version_id is distinct from new.garment_version_id then
    raise exception 'Cost sheet source versions are immutable.' using errcode = '23514';
  end if;
  if new.approved_by is not null and (select auth.uid()) is not null and new.approved_by <> (select auth.uid()) then
    raise exception 'Cost approval actor must match the authenticated caller.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status in ('approved', 'superseded')
    and (to_jsonb(old) - 'updated_at' - 'revision' - 'status') <> (to_jsonb(new) - 'updated_at' - 'revision' - 'status') then
    raise exception 'Approved cost evidence is immutable; create a new scenario.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function ml_internal.recalculate_cost_sheet(p_studio_id uuid, p_cost_sheet_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update ml_private.cost_sheets sheet
  set calculated_total = totals.total,
      cogs_per_unit = round(totals.total / sheet.quantity_basis, 4),
      margin_pct = case when sheet.wholesale_unit_price > 0
        then round(((sheet.wholesale_unit_price - (totals.total / sheet.quantity_basis)) / sheet.wholesale_unit_price) * 100, 4)
        else 0 end
  from (
    select coalesce(round(sum(item.total * case when item.basis = 'per_unit' then target.quantity_basis else 1 end), 4), 0) total
    from ml_private.cost_sheets target
    left join ml_private.cost_items item
      on item.studio_id = target.studio_id and item.cost_sheet_id = target.id
    where target.studio_id = p_studio_id and target.id = p_cost_sheet_id
    group by target.id
  ) totals
  where sheet.studio_id = p_studio_id and sheet.id = p_cost_sheet_id;
$$;

create or replace function ml_internal.recalculate_cost_sheet_from_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform ml_internal.recalculate_cost_sheet(coalesce(new.studio_id, old.studio_id), coalesce(new.cost_sheet_id, old.cost_sheet_id));
  return coalesce(new, old);
end;
$$;

create or replace function ml_internal.recalculate_cost_sheet_from_scenario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform ml_internal.recalculate_cost_sheet(new.studio_id, new.id);
  return new;
end;
$$;

revoke all on function ml_internal.enforce_cost_item_currency() from public, anon, authenticated;
revoke all on function ml_internal.assert_cost_sheet_release_pin() from public, anon, authenticated;
revoke all on function ml_internal.recalculate_cost_sheet(uuid, uuid) from public, anon, authenticated;
revoke all on function ml_internal.recalculate_cost_sheet_from_item() from public, anon, authenticated;
revoke all on function ml_internal.recalculate_cost_sheet_from_scenario() from public, anon, authenticated;

create trigger cost_items_enforce_currency
  before insert or update of studio_id, cost_sheet_id, currency on ml_private.cost_items
  for each row execute function ml_internal.enforce_cost_item_currency();
create trigger cost_sheets_require_release_pin
  before insert or update on ml_private.cost_sheets
  for each row execute function ml_internal.assert_cost_sheet_release_pin();
create trigger cost_items_recalculate_sheet
  after insert or update or delete on ml_private.cost_items
  for each row execute function ml_internal.recalculate_cost_sheet_from_item();
create trigger cost_sheets_recalculate_scenario
  after update of quantity_basis, wholesale_unit_price on ml_private.cost_sheets
  for each row execute function ml_internal.recalculate_cost_sheet_from_scenario();

-- Released-version production orders and milestones --------------------------

alter table ml_private.production_orders
  add column cost_sheet_id uuid,
  add column target_start_date date,
  add column target_delivery_date date,
  add column approved_by uuid references auth.users(id) on delete set null,
  add column approved_at timestamptz,
  add column placed_at timestamptz,
  add constraint production_orders_cost_sheet_fk foreign key (studio_id, cost_sheet_id)
    references ml_private.cost_sheets(studio_id, id) on delete restrict,
  add constraint production_orders_target_dates_check check (
    target_start_date is null or target_delivery_date is null or target_start_date <= target_delivery_date
  );

create table ml_private.production_milestones (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  production_order_id uuid not null,
  name text not null check (btrim(name) <> ''),
  owner_id uuid references auth.users(id) on delete set null,
  target_date date,
  completed_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'blocked', 'complete', 'cancelled')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, production_order_id, sort_order),
  constraint production_milestones_order_fk foreign key (studio_id, production_order_id)
    references ml_private.production_orders(studio_id, id) on delete cascade,
  constraint production_milestones_completion_check check (
    (status = 'complete' and completed_at is not null) or (status <> 'complete' and completed_at is null)
  )
);

create or replace function ml_internal.assert_production_order_release_pin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare sheet ml_private.cost_sheets;
begin
  if tg_op = 'UPDATE' and (old.garment_version_id <> new.garment_version_id
    or old.factory_id <> new.factory_id or old.cost_sheet_id is distinct from new.cost_sheet_id) then
    raise exception 'Production order release, factory, and approved cost sheet are immutable.' using errcode = '23514';
  end if;
  if new.approved_by is not null and (select auth.uid()) is not null and new.approved_by <> (select auth.uid()) then
    raise exception 'Order approval actor must match the authenticated caller.' using errcode = '42501';
  end if;
  select * into sheet from ml_private.cost_sheets
  where studio_id = new.studio_id and id = new.cost_sheet_id;
  if sheet.id is null or sheet.status <> 'approved'
    or sheet.garment_id <> new.garment_id
    or sheet.garment_version_id <> new.garment_version_id then
    raise exception 'Production order requires an approved cost sheet for the same garment release.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from ml_private.technical_specs spec
    where spec.studio_id = new.studio_id and spec.garment_id = new.garment_id
      and spec.status = 'released' and spec.release_version_id = new.garment_version_id
  ) then
    raise exception 'Production order must pin a released garment version.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function ml_internal.assert_production_order_release_pin() from public, anon, authenticated;
create trigger production_orders_require_release_pin
  before insert or update of garment_id, garment_version_id, cost_sheet_id on ml_private.production_orders
  for each row execute function ml_internal.assert_production_order_release_pin();

-- Versioned QC templates, inspections, results, and waivers ------------------

create table ml_private.qc_templates (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, name, version)
);

create table ml_private.qc_template_checks (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  template_id uuid not null,
  check_code text not null check (check_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  name text not null check (btrim(name) <> ''),
  description text not null default '',
  method text not null default '',
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  required boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, template_id, check_code),
  unique (studio_id, template_id, id),
  constraint qc_template_checks_template_fk foreign key (studio_id, template_id)
    references ml_private.qc_templates(studio_id, id) on delete cascade
);

create table ml_private.qc_inspections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  production_order_id uuid not null,
  garment_version_id uuid not null,
  template_id uuid not null,
  template_version integer not null check (template_version > 0),
  status text not null default 'draft' check (status in ('draft', 'in_review', 'decided')),
  release_decision text not null default 'pending' check (release_decision in ('pending', 'approve', 'hold', 'reject')),
  inspected_by uuid references auth.users(id) on delete set null,
  inspected_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint qc_inspections_order_fk foreign key (studio_id, production_order_id)
    references ml_private.production_orders(studio_id, id) on delete cascade,
  constraint qc_inspections_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict,
  constraint qc_inspections_template_fk foreign key (studio_id, template_id)
    references ml_private.qc_templates(studio_id, id) on delete restrict,
  constraint qc_inspections_decision_evidence_check check (
    (status = 'decided' and release_decision <> 'pending' and decided_by is not null and decided_at is not null)
    or (status <> 'decided' and release_decision = 'pending' and decided_by is null and decided_at is null)
  )
);

alter table ml_private.qc_results
  drop constraint qc_results_result_check,
  drop constraint qc_results_studio_id_production_order_id_check_code_key,
  add column inspection_id uuid,
  add column template_check_id uuid,
  add column evidence_asset_id uuid,
  add column issue_task_id uuid,
  add constraint qc_results_result_check check (result in ('pending', 'pass', 'fail', 'conditional', 'waived', 'not_applicable')),
  add constraint qc_results_inspection_fk foreign key (studio_id, inspection_id)
    references ml_private.qc_inspections(studio_id, id) on delete cascade,
  add constraint qc_results_template_check_fk foreign key (studio_id, template_check_id)
    references ml_private.qc_template_checks(studio_id, id) on delete restrict,
  add constraint qc_results_evidence_asset_fk foreign key (studio_id, evidence_asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict,
  add constraint qc_results_issue_task_fk foreign key (studio_id, issue_task_id)
    references ml_private.tasks(studio_id, id) on delete set null (issue_task_id),
  add constraint qc_results_inspection_check_unique unique (studio_id, inspection_id, check_code);

update ml_private.qc_results set severity = 'medium' where severity is null;
update ml_private.qc_results set notes = '' where notes is null;
alter table ml_private.qc_results alter column severity set not null;
alter table ml_private.qc_results alter column notes set not null;

create table ml_private.qc_waivers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  inspection_id uuid not null,
  qc_result_id uuid not null,
  affected_check_code text not null,
  reason text not null check (btrim(reason) <> ''),
  actor_id uuid not null references auth.users(id) on delete restrict,
  follow_up_task_id uuid not null,
  waived_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, qc_result_id),
  constraint qc_waivers_inspection_fk foreign key (studio_id, inspection_id)
    references ml_private.qc_inspections(studio_id, id) on delete restrict,
  constraint qc_waivers_result_fk foreign key (studio_id, qc_result_id)
    references ml_private.qc_results(studio_id, id) on delete restrict,
  constraint qc_waivers_task_fk foreign key (studio_id, follow_up_task_id)
    references ml_private.tasks(studio_id, id) on delete restrict
);

create or replace function ml_internal.assert_qc_inspection_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare production_order ml_private.production_orders; template ml_private.qc_templates;
begin
  select * into production_order from ml_private.production_orders where studio_id = new.studio_id and id = new.production_order_id;
  select * into template from ml_private.qc_templates where studio_id = new.studio_id and id = new.template_id;
  if production_order.id is null or production_order.garment_version_id <> new.garment_version_id
    or template.id is null or template.version <> new.template_version then
    raise exception 'QC inspection must pin its order version and template version.' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and (old.production_order_id <> new.production_order_id
    or old.garment_version_id <> new.garment_version_id or old.template_id <> new.template_id
    or old.template_version <> new.template_version) then
    raise exception 'QC order, release, and template pins are immutable.' using errcode = '23514';
  end if;
  if new.inspected_by is not null and (select auth.uid()) is not null and new.inspected_by <> (select auth.uid()) then
    raise exception 'QC inspection actor must match the authenticated caller.' using errcode = '42501';
  end if;
  if new.decided_by is not null and (select auth.uid()) is not null and new.decided_by <> (select auth.uid()) then
    raise exception 'QC decision actor must match the authenticated caller.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and old.status = 'decided' and to_jsonb(old) <> to_jsonb(new) then
    raise exception 'Decided QC inspections are immutable.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function ml_internal.assert_qc_result_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare inspection ml_private.qc_inspections; template_check ml_private.qc_template_checks;
begin
  select * into inspection from ml_private.qc_inspections where studio_id = new.studio_id and id = new.inspection_id;
  select * into template_check from ml_private.qc_template_checks where studio_id = new.studio_id and id = new.template_check_id;
  if inspection.id is null or inspection.production_order_id <> new.production_order_id
    or template_check.id is null or template_check.template_id <> inspection.template_id
    or template_check.check_code <> new.check_code or template_check.severity <> new.severity then
    raise exception 'QC result must match its order, inspection, and template check.' using errcode = '23514';
  end if;
  if inspection.status = 'decided' then
    raise exception 'Decided QC inspection results are immutable.' using errcode = '23514';
  end if;
  if new.result = 'waived' and not exists (
    select 1 from ml_private.qc_waivers waiver
    where waiver.studio_id = new.studio_id and waiver.qc_result_id = new.id
  ) then
    raise exception 'A QC result cannot be marked waived before append-only waiver evidence exists.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function ml_internal.assert_qc_waiver_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare result ml_private.qc_results; inspection ml_private.qc_inspections; production_order ml_private.production_orders; task ml_private.tasks;
begin
  select * into result from ml_private.qc_results where studio_id = new.studio_id and id = new.qc_result_id;
  select * into inspection from ml_private.qc_inspections where studio_id = new.studio_id and id = new.inspection_id;
  select * into production_order from ml_private.production_orders where studio_id = new.studio_id and id = inspection.production_order_id;
  select * into task from ml_private.tasks where studio_id = new.studio_id and id = new.follow_up_task_id;
  if result.id is null or result.inspection_id <> inspection.id or result.check_code <> new.affected_check_code
    or result.result not in ('fail', 'conditional', 'waived') or task.id is null or task.garment_id <> production_order.garment_id then
    raise exception 'QC waiver requires matching failed result, actor, rule, and garment follow-up task.' using errcode = '23514';
  end if;
  if (select auth.uid()) is not null and new.actor_id <> (select auth.uid()) then
    raise exception 'QC waiver actor must match the authenticated caller.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function ml_internal.assert_qc_inspection_provenance() from public, anon, authenticated;
revoke all on function ml_internal.assert_qc_result_provenance() from public, anon, authenticated;
revoke all on function ml_internal.assert_qc_waiver_provenance() from public, anon, authenticated;

create trigger qc_inspections_require_provenance
  before insert or update on ml_private.qc_inspections
  for each row execute function ml_internal.assert_qc_inspection_provenance();
create trigger qc_results_require_provenance
  before insert or update of production_order_id, inspection_id, template_check_id, check_code, severity on ml_private.qc_results
  for each row execute function ml_internal.assert_qc_result_provenance();
create trigger qc_waivers_require_provenance
  before insert on ml_private.qc_waivers
  for each row execute function ml_internal.assert_qc_waiver_provenance();

create trigger production_milestones_touch_mutable_row before update on ml_private.production_milestones for each row execute function ml_internal.touch_mutable_row();
create trigger qc_templates_touch_mutable_row before update on ml_private.qc_templates for each row execute function ml_internal.touch_mutable_row();
create trigger qc_template_checks_touch_mutable_row before update on ml_private.qc_template_checks for each row execute function ml_internal.touch_mutable_row();
create trigger qc_inspections_touch_mutable_row before update on ml_private.qc_inspections for each row execute function ml_internal.touch_mutable_row();

-- Waivers are append-only. Other approval and status transitions are captured
-- by change_events with actor, operation, before/after evidence, and time.
create trigger qc_waivers_append_only
  before update or delete on ml_private.qc_waivers
  for each row execute function ml_internal.reject_history_mutation();

create or replace function ml_internal.record_production_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare garment_id_value uuid; entity_type_value text; before_value jsonb; after_value jsonb; revision_before bigint; revision_after bigint;
begin
  entity_type_value := tg_table_name;
  before_value := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  after_value := to_jsonb(new);
  revision_before := case when tg_op = 'INSERT' then null else old.revision end;
  revision_after := new.revision;
  if tg_table_name in ('cost_sheets', 'production_orders') then
    garment_id_value := new.garment_id;
  elsif tg_table_name = 'qc_inspections' then
    select garment_id into garment_id_value from ml_private.production_orders where studio_id = new.studio_id and id = new.production_order_id;
  else
    select production_order.garment_id into garment_id_value
    from ml_private.qc_inspections inspection
    join ml_private.production_orders production_order on production_order.studio_id = inspection.studio_id and production_order.id = inspection.production_order_id
    where inspection.studio_id = new.studio_id and inspection.id = new.inspection_id;
  end if;
  insert into ml_private.change_events (
    studio_id, garment_id, origin, actor_id, operation_id, entity_type, entity_id,
    operation, json_patch, inverse_patch, scope_json, base_revision, result_revision
  ) values (
    new.studio_id, garment_id_value, 'user', (select auth.uid()), gen_random_uuid(), entity_type_value, new.id,
    case when tg_op = 'INSERT' then 'create' else 'update' end,
    jsonb_build_array(jsonb_build_object('op', case when tg_op = 'INSERT' then 'add' else 'replace' end, 'path', '/', 'value', after_value)),
    case when before_value is null then jsonb_build_array(jsonb_build_object('op', 'remove', 'path', '/')) else jsonb_build_array(jsonb_build_object('op', 'replace', 'path', '/', 'value', before_value)) end,
    '{"domain":"production"}'::jsonb, revision_before, revision_after
  );
  return new;
end;
$$;

revoke all on function ml_internal.record_production_transition() from public, anon, authenticated;
create trigger cost_sheets_record_approval after update of status on ml_private.cost_sheets for each row when (old.status is distinct from new.status) execute function ml_internal.record_production_transition();
create trigger production_orders_record_status after insert or update of status on ml_private.production_orders for each row execute function ml_internal.record_production_transition();
create trigger qc_inspections_record_decision after update of status, release_decision on ml_private.qc_inspections for each row when (old.status is distinct from new.status or old.release_decision is distinct from new.release_decision) execute function ml_internal.record_production_transition();
create trigger qc_waivers_record_create after insert on ml_private.qc_waivers for each row execute function ml_internal.record_production_transition();

-- RLS, least privilege, and indexes ------------------------------------------

do $$
declare table_name text;
begin
  foreach table_name in array array['production_milestones', 'qc_templates', 'qc_template_checks', 'qc_inspections', 'qc_waivers'] loop
    execute format('alter table ml_private.%I enable row level security', table_name);
  end loop;
  foreach table_name in array array['production_milestones', 'qc_templates', 'qc_template_checks'] loop
    execute format('create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create policy studio_insert on ml_private.%I for insert to authenticated with check (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
    execute format('create policy studio_update on ml_private.%I for update to authenticated using (studio_id in (select ml_internal.writable_studio_ids())) with check (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
    execute format('create policy studio_delete on ml_private.%I for delete to authenticated using (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
    execute format('grant select, insert, update, delete on table ml_private.%I to authenticated', table_name);
  end loop;
  foreach table_name in array array['qc_inspections', 'qc_waivers'] loop
    execute format('create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create policy studio_insert on ml_private.%I for insert to authenticated with check (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
  end loop;
  create policy studio_update on ml_private.qc_inspections for update to authenticated
    using (studio_id in (select ml_internal.writable_studio_ids()))
    with check (studio_id in (select ml_internal.writable_studio_ids()));
  grant select, insert, update on table ml_private.qc_inspections to authenticated;
  grant select, insert on table ml_private.qc_waivers to authenticated;
end;
$$;

create index ml_cost_items_sheet_basis_idx on ml_private.cost_items (studio_id, cost_sheet_id, basis, sort_order);
create index ml_cost_items_bom_idx on ml_private.cost_items (studio_id, bom_item_id) where bom_item_id is not null;
create index ml_cost_items_material_idx on ml_private.cost_items (studio_id, material_variant_id) where material_variant_id is not null;
create index ml_cost_items_component_idx on ml_private.cost_items (studio_id, component_variant_id) where component_variant_id is not null;
create index ml_production_orders_cost_sheet_idx on ml_private.production_orders (studio_id, cost_sheet_id) where cost_sheet_id is not null;
create index ml_production_milestones_order_idx on ml_private.production_milestones (studio_id, production_order_id, sort_order);
create index ml_production_milestones_target_idx on ml_private.production_milestones (studio_id, target_date, status) where target_date is not null;
create index ml_qc_template_checks_template_idx on ml_private.qc_template_checks (studio_id, template_id, sort_order);
create index ml_qc_inspections_order_idx on ml_private.qc_inspections (studio_id, production_order_id, created_at desc);
create index ml_qc_inspections_version_idx on ml_private.qc_inspections (studio_id, garment_version_id, status);
create index ml_qc_results_inspection_idx on ml_private.qc_results (studio_id, inspection_id, check_code) where inspection_id is not null;
create index ml_qc_results_evidence_idx on ml_private.qc_results (studio_id, evidence_asset_id) where evidence_asset_id is not null;
create index ml_qc_waivers_inspection_idx on ml_private.qc_waivers (studio_id, inspection_id, waived_at desc);
create index ml_qc_waivers_task_idx on ml_private.qc_waivers (studio_id, follow_up_task_id);

comment on column ml_private.cost_sheets.currency is 'ISO 4217 currency inherited by every numeric cost item in the scenario.';
comment on column ml_private.production_orders.garment_version_id is 'Immutable released garment Freeze Frame; later edits create staleness and never repoint the order.';
comment on table ml_private.production_milestones is 'Ordered production timeline milestones with owner, target date, completion evidence, and status.';
comment on table ml_private.qc_inspections is 'Version-pinned application of an immutable QC template version to one production order.';
comment on table ml_private.qc_waivers is 'Append-only QC exception evidence requiring actor, reason, time, affected check, and follow-up task.';

commit;
