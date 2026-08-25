begin;

alter table ml_private.bom_items
  add column intentional_free_text boolean not null default false,
  add column supplier_item_id uuid,
  add column substitute_item_id uuid,
  add column status text not null default 'draft',
  add column shortage_quantity ml_private.nonnegative_quantity not null default 0,
  add column unit_cost numeric(14,4) not null default 0,
  add column currency ml_private.iso_currency not null default 'USD',
  add column cost_impact numeric(14,4) not null default 0;

-- WP4-foundation custom rows were already deliberate; preserve that intent
-- before enforcing the explicit 2.0 representation.
update ml_private.bom_items
set intentional_free_text = (item_type = 'custom');

alter table ml_private.bom_items
  add constraint bom_items_intentional_free_text_check check (
    (item_type = 'custom' and intentional_free_text)
    or (item_type <> 'custom' and not intentional_free_text)
  ),
  add constraint bom_items_status_check
    check (status in ('draft', 'linked', 'approved', 'shortage', 'substituted')),
  add constraint bom_items_substitute_not_self_check
    check (substitute_item_id is null or substitute_item_id <> id),
  add constraint bom_items_supplier_item_fk foreign key (studio_id, supplier_item_id)
    references ml_private.supplier_items(studio_id, id) on delete restrict,
  add constraint bom_items_substitute_item_fk foreign key (studio_id, substitute_item_id)
    references ml_private.bom_items(studio_id, id) on delete restrict;

alter table ml_private.bom_items
  add constraint bom_items_description_not_blank_check
    check (length(btrim(description)) > 0) not valid,
  add constraint bom_items_quantity_positive_check
    check (quantity > 0) not valid,
  add constraint bom_items_placement_not_blank_check
    check (length(btrim(coalesce(placement, ''))) > 0) not valid,
  add constraint bom_items_unit_cost_nonnegative_check
    check (unit_cost >= 0),
  add constraint bom_items_shortage_within_quantity_check
    check (shortage_quantity <= quantity) not valid;

create index ml_bom_items_supplier_item_idx
  on ml_private.bom_items (studio_id, supplier_item_id)
  where supplier_item_id is not null;
create index ml_bom_items_substitute_item_idx
  on ml_private.bom_items (studio_id, substitute_item_id)
  where substitute_item_id is not null;
create index ml_bom_items_shortage_idx
  on ml_private.bom_items (studio_id, spec_id, sort_order)
  where shortage_quantity > 0 or status = 'shortage';

alter table ml_private.construction_sections
  add constraint construction_sections_name_not_blank_check
    check (length(btrim(name)) > 0) not valid;

alter table ml_private.construction_steps
  add column machine_required boolean not null default false,
  add column stitch_required boolean not null default false,
  add column status text not null default 'draft',
  add constraint construction_steps_operation_not_blank_check
    check (length(btrim(operation)) > 0) not valid,
  add constraint construction_steps_status_check
    check (status in ('draft', 'ready', 'approved')),
  add constraint construction_steps_seam_allowance_nonnegative_check
    check (seam_allowance is null or seam_allowance >= 0),
  add constraint construction_steps_required_machine_check
    check (not machine_required or length(btrim(coalesce(machine, ''))) > 0),
  add constraint construction_steps_required_stitch_check
    check (not stitch_required or length(btrim(coalesce(stitch_spec, ''))) > 0);

alter table ml_private.construction_details
  add column status text not null default 'open',
  add constraint construction_details_status_check
    check (status in ('open', 'resolved', 'dismissed')),
  add constraint construction_details_callout_not_blank_check
    check (length(btrim(callout)) > 0) not valid,
  add constraint construction_details_normalized_anchor_check check (
    anchor_json = '{}'::jsonb
    or (
      jsonb_typeof(anchor_json -> 'x') = 'number'
      and jsonb_typeof(anchor_json -> 'y') = 'number'
      and (anchor_json ->> 'x')::numeric between 0 and 1
      and (anchor_json ->> 'y')::numeric between 0 and 1
    )
  );

create index ml_construction_details_open_critical_idx
  on ml_private.construction_details (studio_id, step_id)
  where severity = 'critical' and status = 'open';

alter table ml_private.tech_pack_exports
  add column ruleset_version text,
  add column storage_path text,
  add column generated_at timestamptz,
  add column section_manifest_json jsonb not null default '[]'::jsonb,
  add column approved_by uuid references auth.users(id) on delete set null,
  add column approved_at timestamptz;

-- Keep WP4-foundation artifacts reviewable while upgrading them to the final
-- evidence contract. New exports must always supply the accepted ruleset/path.
update ml_private.tech_pack_exports
set
  ruleset_version = coalesce(ruleset_version, 'wp4-foundation-v0'),
  storage_path = coalesce(
    storage_path,
    'studios/' || studio_id::text || '/technical/exports/' || export_asset_id::text
      || '/legacy-' || id::text || '.' || format
  ),
  generated_at = coalesce(generated_at, created_at);

alter table ml_private.tech_pack_exports
  alter column ruleset_version set not null,
  alter column storage_path set not null,
  alter column generated_at set default now(),
  alter column generated_at set not null,
  add constraint tech_pack_exports_ruleset_not_blank_check
    check (length(btrim(ruleset_version)) > 0),
  add constraint tech_pack_exports_private_storage_path_check
    check (storage_path ~ '^studios/[0-9a-f-]{36}/technical/exports/[0-9a-f-]{36}/[A-Za-z0-9._-]+\\.(pdf|zip)$'),
  add constraint tech_pack_exports_section_manifest_check
    check (jsonb_typeof(section_manifest_json) = 'array'),
  add constraint tech_pack_exports_approval_pair_check
    check ((approved_by is null) = (approved_at is null));

alter table ml_private.technical_specs
  add column release_version_id uuid,
  add column release_validation_run_id uuid,
  add column released_by uuid references auth.users(id) on delete restrict,
  add column released_at timestamptz,
  add constraint technical_specs_release_version_fk foreign key (studio_id, release_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict;

create table ml_private.validation_waivers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  validation_run_id uuid not null,
  rule_code text not null check (length(btrim(rule_code)) between 1 and 120),
  domain text not null check (domain in ('flats', 'pom', 'measurements', 'bom', 'construction', 'files', 'release')),
  reason text not null check (length(btrim(reason)) between 8 and 1000),
  actor_id uuid not null references auth.users(id) on delete restrict,
  follow_up_task_id uuid not null,
  waived_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  unique (studio_id, validation_run_id, rule_code),
  constraint validation_waivers_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete restrict,
  constraint validation_waivers_run_fk foreign key (studio_id, validation_run_id)
    references ml_private.validation_runs(studio_id, id) on delete restrict,
  constraint validation_waivers_follow_up_task_fk foreign key (studio_id, follow_up_task_id)
    references ml_private.tasks(studio_id, id) on delete restrict
);

alter table ml_private.technical_specs
  add constraint technical_specs_release_validation_run_fk foreign key (studio_id, release_validation_run_id)
    references ml_private.validation_runs(studio_id, id) on delete restrict,
  add constraint technical_specs_release_evidence_check check (
    status <> 'released'
    or (
      release_version_id is not null
      and release_validation_run_id is not null
      and released_by is not null
      and released_at is not null
    )
  );

create index ml_validation_waivers_spec_idx
  on ml_private.validation_waivers (studio_id, spec_id, waived_at desc);
create index ml_validation_waivers_run_idx
  on ml_private.validation_waivers (studio_id, validation_run_id);
create index ml_technical_specs_release_version_idx
  on ml_private.technical_specs (studio_id, release_version_id)
  where release_version_id is not null;

alter table ml_private.validation_waivers enable row level security;
create policy studio_select on ml_private.validation_waivers
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));
grant select on table ml_private.validation_waivers to authenticated;

comment on column ml_private.bom_items.intentional_free_text is
  'True only when the designer deliberately accepts an unlinked custom specification row.';
comment on table ml_private.validation_waivers is
  'Immutable release exception evidence. Privacy-domain rules are excluded by the domain constraint and cannot be waived.';
comment on column ml_private.tech_pack_exports.section_manifest_json is
  'Immutable ordered manifest of structured tech-pack sections included in the generated artifact.';

commit;
