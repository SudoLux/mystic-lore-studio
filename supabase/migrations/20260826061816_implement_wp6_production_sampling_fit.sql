-- Mystic Lore Studio 2.0 WP6a: sourcing, sampling, and fit evidence.
--
-- This migration deliberately stops ahead of cost sheets, production orders,
-- and QC. Every production observation is tied to a garment version and, when
-- applicable, a stable POM identity so a physical decision remains auditable.

begin;

-- Supplier/factory capabilities are extensible metadata, while operational
-- relationships remain normalized. Factories may optionally be represented by
-- a supplier identity without forcing that relationship for every studio.
alter table ml_private.suppliers
  add column capabilities_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(capabilities_json) = 'object'),
  add column minimum_order_quantity integer
    check (minimum_order_quantity is null or minimum_order_quantity > 0);

alter table ml_private.factories
  add column supplier_id uuid,
  add column contact_name text,
  add column contact_email text,
  add column phone text,
  add constraint factories_supplier_fk
    foreign key (studio_id, supplier_id)
    references ml_private.suppliers(studio_id, id)
    on delete set null (supplier_id);

-- A round can be planned before its source is frozen, but the minute it gains
-- fit evidence it must be pinned. The submission data is intentionally kept
-- separate from a later cost/order release.
alter table ml_private.sample_rounds
  add column requested_at timestamptz,
  add column notes text not null default '';

alter table ml_private.fit_sessions
  add column garment_version_id uuid,
  add column status text not null default 'draft'
    check (status in ('draft', 'in_review', 'decided')),
  add column decision_note text not null default '',
  add constraint fit_sessions_version_fk
    foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id)
    on delete restrict;

alter table ml_private.fit_issues
  add column garment_version_id uuid,
  add column pom_point_id uuid,
  add column owner_task_id uuid,
  add constraint fit_issues_version_fk
    foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id)
    on delete restrict,
  add constraint fit_issues_pom_fk
    foreign key (studio_id, pom_point_id)
    references ml_private.pom_points(studio_id, id)
    on delete restrict,
  add constraint fit_issues_owner_task_fk
    foreign key (studio_id, owner_task_id)
    references ml_private.tasks(studio_id, id)
    on delete set null (owner_task_id);

alter table ml_private.fit_measurements
  add column fit_session_id uuid,
  add column garment_version_id uuid,
  add constraint fit_measurements_session_fk
    foreign key (studio_id, fit_session_id)
    references ml_private.fit_sessions(studio_id, id)
    on delete restrict,
  add constraint fit_measurements_version_fk
    foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id)
    on delete restrict;

-- Media is a normalized evidence relationship, never an opaque attachment
-- list. Queue state supports resilient mobile capture before an object upload
-- is acknowledged by Storage.
create table ml_private.sample_round_media (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  sample_round_id uuid not null,
  asset_id uuid not null,
  role text not null default 'sample' check (role in ('sample', 'detail', 'fit', 'reference')),
  capture_status text not null default 'uploaded' check (capture_status in ('queued', 'uploaded', 'failed')),
  captured_at timestamptz not null default now(),
  retry_count integer not null default 0 check (retry_count >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, sample_round_id, asset_id),
  constraint sample_round_media_round_fk foreign key (studio_id, sample_round_id)
    references ml_private.sample_rounds(studio_id, id) on delete cascade,
  constraint sample_round_media_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.fit_session_media (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  fit_session_id uuid not null,
  asset_id uuid not null,
  role text not null default 'fit' check (role in ('fit', 'detail', 'reference', 'mark_up')),
  capture_status text not null default 'uploaded' check (capture_status in ('queued', 'uploaded', 'failed')),
  captured_at timestamptz not null default now(),
  retry_count integer not null default 0 check (retry_count >= 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, fit_session_id, asset_id),
  constraint fit_session_media_session_fk foreign key (studio_id, fit_session_id)
    references ml_private.fit_sessions(studio_id, id) on delete cascade,
  constraint fit_session_media_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

-- Promotions retain their source issue and pin. A POM promotion is a
-- candidate only; it never changes the technical specification directly.
create table ml_private.fit_issue_promotions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  fit_issue_id uuid not null,
  garment_id uuid not null,
  garment_version_id uuid not null,
  promotion_type text not null check (promotion_type in ('task', 'pom_adjustment_candidate', 'construction_callout', 'version_note')),
  status text not null default 'candidate' check (status in ('candidate', 'applied', 'dismissed')),
  task_id uuid,
  pom_point_id uuid,
  construction_detail_id uuid,
  note text not null default '',
  candidate_json jsonb not null default '{}'::jsonb check (jsonb_typeof(candidate_json) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint fit_issue_promotions_issue_fk foreign key (studio_id, fit_issue_id)
    references ml_private.fit_issues(studio_id, id) on delete restrict,
  constraint fit_issue_promotions_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint fit_issue_promotions_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict,
  constraint fit_issue_promotions_task_fk foreign key (studio_id, task_id)
    references ml_private.tasks(studio_id, id) on delete set null (task_id),
  constraint fit_issue_promotions_pom_fk foreign key (studio_id, pom_point_id)
    references ml_private.pom_points(studio_id, id) on delete restrict,
  constraint fit_issue_promotions_construction_detail_fk foreign key (studio_id, construction_detail_id)
    references ml_private.construction_details(studio_id, id) on delete restrict,
  constraint fit_issue_promotions_target_check check (
    (promotion_type = 'task' and task_id is not null and pom_point_id is null and construction_detail_id is null)
    or (promotion_type = 'pom_adjustment_candidate' and pom_point_id is not null and task_id is null and construction_detail_id is null)
    or (promotion_type = 'construction_callout' and construction_detail_id is not null and task_id is null and pom_point_id is null)
    or (promotion_type = 'version_note' and task_id is null and pom_point_id is null and construction_detail_id is null)
  )
);

-- These guards force same-garment, same-version provenance across every
-- physical observation. Existing pre-WP6 rows remain readable; all new
-- version-pinned data follows the stricter command path.
create or replace function ml_internal.assert_fit_session_version_pin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sample ml_private.sample_rounds;
  version_garment_id uuid;
begin
  select * into sample from ml_private.sample_rounds
  where studio_id = new.studio_id and id = new.sample_round_id;
  if sample.id is null then
    raise exception 'Fit session sample round is not available.' using errcode = '23514';
  end if;
  if new.garment_version_id is null then
    raise exception 'Fit sessions require a pinned garment version.' using errcode = '23514';
  end if;
  select garment_id into version_garment_id from ml_private.garment_versions
  where studio_id = new.studio_id and id = new.garment_version_id;
  if version_garment_id is distinct from sample.garment_id
    or sample.garment_version_id is distinct from new.garment_version_id then
    raise exception 'Fit session version must match the sample round and garment.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function ml_internal.assert_fit_measurement_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sample ml_private.sample_rounds;
  session ml_private.fit_sessions;
  point_spec_id uuid;
  spec_garment_id uuid;
begin
  select * into sample from ml_private.sample_rounds where studio_id = new.studio_id and id = new.sample_round_id;
  select * into session from ml_private.fit_sessions where studio_id = new.studio_id and id = new.fit_session_id;
  select spec_id into point_spec_id from ml_private.pom_points where studio_id = new.studio_id and id = new.pom_point_id;
  select garment_id into spec_garment_id from ml_private.technical_specs where studio_id = new.studio_id and id = point_spec_id;
  if sample.id is null or session.id is null or point_spec_id is null or new.garment_version_id is null
    or session.sample_round_id <> sample.id
    or session.garment_version_id <> new.garment_version_id
    or sample.garment_version_id <> new.garment_version_id
    or spec_garment_id <> sample.garment_id then
    raise exception 'Fit measurement must reference one sample, session, version, and stable POM for the same garment.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function ml_internal.assert_fit_issue_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session ml_private.fit_sessions;
  sample ml_private.sample_rounds;
  point_spec_id uuid;
  spec_garment_id uuid;
begin
  select * into session from ml_private.fit_sessions where studio_id = new.studio_id and id = new.fit_session_id;
  select * into sample from ml_private.sample_rounds where studio_id = new.studio_id and id = session.sample_round_id;
  if session.id is null or sample.id is null or new.garment_version_id is null
    or session.garment_version_id <> new.garment_version_id then
    raise exception 'Fit issue must retain its session and pinned garment version.' using errcode = '23514';
  end if;
  if new.pom_point_id is not null then
    select spec_id into point_spec_id from ml_private.pom_points where studio_id = new.studio_id and id = new.pom_point_id;
    select garment_id into spec_garment_id from ml_private.technical_specs where studio_id = new.studio_id and id = point_spec_id;
    if point_spec_id is null or spec_garment_id <> sample.garment_id then
      raise exception 'Fit issue POM must belong to the sampled garment.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function ml_internal.assert_fit_promotion_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  issue ml_private.fit_issues;
  session ml_private.fit_sessions;
  sample ml_private.sample_rounds;
  point_spec_id uuid;
  detail_step_id uuid;
  detail_section_id uuid;
  detail_spec_id uuid;
begin
  select * into issue from ml_private.fit_issues where studio_id = new.studio_id and id = new.fit_issue_id;
  select * into session from ml_private.fit_sessions where studio_id = new.studio_id and id = issue.fit_session_id;
  select * into sample from ml_private.sample_rounds where studio_id = new.studio_id and id = session.sample_round_id;
  if issue.id is null or sample.id is null or new.garment_id <> sample.garment_id
    or new.garment_version_id <> issue.garment_version_id then
    raise exception 'Fit promotion must preserve issue, garment, and version provenance.' using errcode = '23514';
  end if;
  if new.pom_point_id is not null then
    select spec_id into point_spec_id from ml_private.pom_points where studio_id = new.studio_id and id = new.pom_point_id;
    if not exists (select 1 from ml_private.technical_specs where studio_id = new.studio_id and id = point_spec_id and garment_id = new.garment_id) then
      raise exception 'POM adjustment candidate must target the sampled garment.' using errcode = '23514';
    end if;
  end if;
  if new.construction_detail_id is not null then
    select step_id into detail_step_id from ml_private.construction_details where studio_id = new.studio_id and id = new.construction_detail_id;
    select section_id into detail_section_id from ml_private.construction_steps where studio_id = new.studio_id and id = detail_step_id;
    select spec_id into detail_spec_id from ml_private.construction_sections where studio_id = new.studio_id and id = detail_section_id;
    if not exists (select 1 from ml_private.technical_specs where studio_id = new.studio_id and id = detail_spec_id and garment_id = new.garment_id) then
      raise exception 'Construction callout must target the sampled garment.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function ml_internal.assert_fit_session_version_pin() from public, anon, authenticated;
revoke all on function ml_internal.assert_fit_measurement_provenance() from public, anon, authenticated;
revoke all on function ml_internal.assert_fit_issue_provenance() from public, anon, authenticated;
revoke all on function ml_internal.assert_fit_promotion_provenance() from public, anon, authenticated;

create trigger fit_sessions_require_version_pin
  before insert or update of sample_round_id, garment_version_id on ml_private.fit_sessions
  for each row execute function ml_internal.assert_fit_session_version_pin();
create trigger fit_measurements_require_provenance
  before insert or update of sample_round_id, fit_session_id, garment_version_id, pom_point_id on ml_private.fit_measurements
  for each row execute function ml_internal.assert_fit_measurement_provenance();
create trigger fit_issues_require_provenance
  before insert or update of fit_session_id, garment_version_id, pom_point_id on ml_private.fit_issues
  for each row execute function ml_internal.assert_fit_issue_provenance();
create trigger fit_issue_promotions_require_provenance
  before insert or update of fit_issue_id, garment_id, garment_version_id, pom_point_id, construction_detail_id on ml_private.fit_issue_promotions
  for each row execute function ml_internal.assert_fit_promotion_provenance();

-- New mutable evidence tables use the established timestamp/revision trigger,
-- membership-derived RLS policy shape, and least-privilege authenticated grant.
create trigger sample_round_media_touch_mutable_row
  before update on ml_private.sample_round_media
  for each row execute function ml_internal.touch_mutable_row();
create trigger fit_session_media_touch_mutable_row
  before update on ml_private.fit_session_media
  for each row execute function ml_internal.touch_mutable_row();
create trigger fit_issue_promotions_touch_mutable_row
  before update on ml_private.fit_issue_promotions
  for each row execute function ml_internal.touch_mutable_row();

alter table ml_private.sample_round_media enable row level security;
alter table ml_private.fit_session_media enable row level security;
alter table ml_private.fit_issue_promotions enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['sample_round_media', 'fit_session_media', 'fit_issue_promotions'] loop
    execute format('create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create policy studio_insert on ml_private.%I for insert to authenticated with check (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
    execute format('create policy studio_update on ml_private.%I for update to authenticated using (studio_id in (select ml_internal.writable_studio_ids())) with check (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
    execute format('create policy studio_delete on ml_private.%I for delete to authenticated using (studio_id in (select ml_internal.writable_studio_ids()))', table_name);
    execute format('grant select, insert, update, delete on table ml_private.%I to authenticated', table_name);
  end loop;
end;
$$;

create index ml_factories_supplier_idx on ml_private.factories (studio_id, supplier_id) where supplier_id is not null;
create index ml_sample_rounds_version_status_idx on ml_private.sample_rounds (studio_id, garment_version_id, status) where garment_version_id is not null;
create index ml_fit_sessions_version_date_idx on ml_private.fit_sessions (studio_id, garment_version_id, fit_date desc) where garment_version_id is not null;
create index ml_fit_issues_version_status_idx on ml_private.fit_issues (studio_id, garment_version_id, status, severity) where garment_version_id is not null;
create index ml_fit_issues_pom_idx on ml_private.fit_issues (studio_id, pom_point_id) where pom_point_id is not null;
create index ml_fit_measurements_session_pom_idx on ml_private.fit_measurements (studio_id, fit_session_id, pom_point_id) where fit_session_id is not null;
create index ml_fit_measurements_version_pom_idx on ml_private.fit_measurements (studio_id, garment_version_id, pom_point_id) where garment_version_id is not null;
create index ml_sample_round_media_round_idx on ml_private.sample_round_media (studio_id, sample_round_id, sort_order);
create index ml_fit_session_media_session_idx on ml_private.fit_session_media (studio_id, fit_session_id, sort_order);
create index ml_fit_issue_promotions_issue_idx on ml_private.fit_issue_promotions (studio_id, fit_issue_id, created_at desc);
create index ml_fit_issue_promotions_version_idx on ml_private.fit_issue_promotions (studio_id, garment_version_id, status);

comment on table ml_private.sample_round_media is 'Private sample evidence mapped to a canonical media asset, including offline upload retry state.';
comment on table ml_private.fit_session_media is 'Private fit-session evidence mapped to a canonical media asset, including mobile capture retry state.';
comment on table ml_private.fit_issue_promotions is 'Provenance-preserving promotion of a fit issue into a task, POM candidate, construction callout, or version note.';
comment on column ml_private.sample_rounds.garment_version_id is 'Pinned technical/garment Freeze Frame for all downstream sample and fit evidence.';
comment on column ml_private.fit_measurements.pom_point_id is 'Stable canonical POM identity; never a rendered canvas coordinate.';

commit;
