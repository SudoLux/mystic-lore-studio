-- Mystic Lore Studio 2.0 canonical domain foundation.
--
-- The existing public schema remains the legacy application contract. Canonical
-- private records live in ml_private, public-safe immutable projections live in
-- ml_public, and privileged helpers live in the non-exposed ml_internal schema.

begin;

create extension if not exists pgcrypto;

create schema if not exists ml_internal;
create schema if not exists ml_private;
create schema if not exists ml_public;

comment on schema ml_internal is
  'Non-exposed security, ownership, and lifecycle helpers for Mystic Lore Studio 2.0.';
comment on schema ml_private is
  'Canonical private Studio 2.0 domain graph. Access is derived from active studio membership.';
comment on schema ml_public is
  'Immutable, public-safe publication snapshots and copied derivative manifests only.';

revoke all on schema ml_internal from public, anon, authenticated;
revoke all on schema ml_private from public, anon, authenticated;
revoke all on schema ml_public from public, anon, authenticated;

create domain ml_private.slug as text
  check (value ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');
create domain ml_private.iso_currency as text
  check (value ~ '^[A-Z]{3}$');
create domain ml_private.sha256_checksum as text
  check (value ~ '^[a-f0-9]{64}$');
create domain ml_private.nonnegative_quantity as numeric(14,4)
  check (value >= 0);
create domain ml_private.positive_quantity as numeric(14,4)
  check (value > 0);

create type ml_private.membership_role as enum ('owner', 'editor', 'reviewer', 'viewer');
create type ml_private.membership_status as enum ('invited', 'active', 'suspended', 'removed');
create type ml_private.measurement_unit as enum ('mm', 'cm', 'in');
create type ml_private.quantity_unit as enum (
  'mm', 'cm', 'm', 'in', 'yd', 'g', 'kg', 'oz', 'lb', 'each', 'pair', 'set', 'roll'
);
create type ml_private.ai_decision as enum ('pending', 'accepted', 'rejected');
create type ml_public.publication_type as enum ('profile', 'project', 'editorial');

create or replace function ml_internal.touch_mutable_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

comment on function ml_internal.touch_mutable_row() is
  'Maintains immutable created_at plus monotonic updated_at and revision fields.';

create or replace function ml_internal.protect_stable_identifier()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if to_jsonb(new) -> tg_argv[0] is distinct from to_jsonb(old) -> tg_argv[0] then
    raise exception '% is immutable once assigned', tg_argv[0]
      using errcode = '23514';
  end if;
  return new;
end;
$$;

comment on function ml_internal.protect_stable_identifier() is
  'Prevents reuse-by-renaming of garment codes and public slugs.';

-- Identity, studio, and catalog ------------------------------------------------

create table ml_private.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_asset_id uuid,
  locale text not null default 'en-US' check (locale ~ '^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0)
);

create table ml_private.studios (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  slug ml_private.slug not null unique,
  timezone text not null default 'UTC',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (id, owner_user_id)
);

create table ml_private.studio_members (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role ml_private.membership_role not null,
  status ml_private.membership_status not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, user_id),
  unique (studio_id, id),
  check ((status = 'active' and joined_at is not null) or status <> 'active')
);

create table ml_private.studio_settings (
  studio_id uuid primary key references ml_private.studios(id) on delete cascade,
  units ml_private.measurement_unit not null default 'cm',
  currency ml_private.iso_currency not null default 'USD',
  version_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(version_policy) = 'object'),
  ai_policy jsonb not null default '{}'::jsonb check (jsonb_typeof(ai_policy) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0)
);

create table ml_private.collections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  season text,
  status text not null default 'draft' check (status in ('draft', 'active', 'on_hold', 'complete', 'archived')),
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, name, season)
);

create table ml_private.garments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  collection_id uuid,
  garment_code text not null check (garment_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  title text not null check (length(btrim(title)) between 1 and 240),
  garment_type text,
  status text not null default 'draft' check (status in ('draft', 'active', 'on_hold', 'approved', 'released', 'archived', 'cancelled')),
  phase text not null default 'brief' check (phase in ('brief', 'design', 'materials', 'technical', 'sampling', 'production', 'story', 'portfolio')),
  current_version_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_code),
  constraint garments_collection_fk foreign key (studio_id, collection_id)
    references ml_private.collections(studio_id, id) on delete set null (collection_id)
);

create table ml_private.tags (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  color text check (color is null or color ~ '^#[0-9A-Fa-f]{6}$'),
  scope text not null default 'garment' check (scope in ('garment', 'material', 'component', 'editorial', 'portfolio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, scope, name)
);

create table ml_private.garment_tags (
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  tag_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (garment_id, tag_id),
  constraint garment_tags_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint garment_tags_tag_fk foreign key (studio_id, tag_id)
    references ml_private.tags(studio_id, id) on delete cascade
);

-- Vendor identity is created before supplier offers and production evidence.
create table ml_private.suppliers (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  supplier_type text not null check (supplier_type in ('material', 'component', 'service', 'mixed')),
  contact_name text,
  contact_email text,
  phone text,
  website text,
  status text not null default 'active' check (status in ('prospect', 'active', 'paused', 'archived')),
  default_lead_time_days integer check (default_lead_time_days is null or default_lead_time_days >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id)
);

create table ml_private.factories (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  capabilities_json jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities_json) = 'object'),
  minimum_order_quantity integer check (minimum_order_quantity is null or minimum_order_quantity > 0),
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  status text not null default 'active' check (status in ('prospect', 'active', 'paused', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id)
);

-- Design and media -------------------------------------------------------------

create table ml_private.design_briefs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  intent text,
  target_wearer text,
  silhouette text,
  color_story text,
  key_features text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_id),
  constraint design_briefs_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.inspiration_boards (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 200),
  layout_json jsonb not null default '{}'::jsonb check (jsonb_typeof(layout_json) = 'object'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint inspiration_boards_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.media_assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  storage_path text not null unique check (storage_path ~ '^studios/[0-9a-f-]{36}/'),
  original_filename text not null,
  mime_type text not null check (mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
  size_bytes bigint not null check (size_bytes >= 0),
  checksum ml_private.sha256_checksum not null,
  rights_json jsonb not null default '{}'::jsonb check (jsonb_typeof(rights_json) = 'object'),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, checksum)
);

alter table ml_private.profiles
  add constraint profiles_avatar_asset_fk foreign key (avatar_asset_id)
    references ml_private.media_assets(id) on delete set null;

create table ml_private.inspiration_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  board_id uuid not null,
  asset_id uuid not null,
  caption text,
  position_json jsonb not null default '{}'::jsonb check (jsonb_typeof(position_json) = 'object'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint inspiration_items_board_fk foreign key (studio_id, board_id)
    references ml_private.inspiration_boards(studio_id, id) on delete cascade,
  constraint inspiration_items_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.garment_media (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  asset_id uuid not null,
  role text not null check (role in ('hero', 'gallery', 'design', 'flat', 'sample', 'detail', 'editorial', 'portfolio', 'reference')),
  sort_order integer not null default 0 check (sort_order >= 0),
  framing_json jsonb not null default '{}'::jsonb check (jsonb_typeof(framing_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_id, asset_id, role),
  constraint garment_media_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint garment_media_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.media_derivatives (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  source_asset_id uuid not null,
  variant text not null check (variant in ('thumbnail', 'display', 'editorial', 'portfolio', 'technical', 'export')),
  storage_path text not null unique check (storage_path ~ '^studios/[0-9a-f-]{36}/'),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  checksum ml_private.sha256_checksum not null,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, source_asset_id, variant, checksum),
  constraint media_derivatives_source_fk foreign key (studio_id, source_asset_id)
    references ml_private.media_assets(studio_id, id) on delete cascade
);

create table ml_private.design_annotations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  asset_id uuid not null,
  author_id uuid references auth.users(id) on delete set null,
  anchor_json jsonb not null check (jsonb_typeof(anchor_json) = 'object'),
  body text not null check (length(btrim(body)) > 0),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint design_annotations_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint design_annotations_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete cascade
);

-- Materials, variants, components, supplier offers, and inventory ledger -------

create table ml_private.materials (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  material_code text not null check (material_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  category text not null,
  composition text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, material_code)
);

create table ml_private.material_variants (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  material_id uuid not null,
  color_name text,
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  width ml_private.nonnegative_quantity,
  width_unit ml_private.measurement_unit,
  weight_gsm ml_private.nonnegative_quantity,
  sku text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, material_id, sku),
  check ((width is null and width_unit is null) or (width is not null and width_unit is not null)),
  constraint material_variants_material_fk foreign key (studio_id, material_id)
    references ml_private.materials(studio_id, id) on delete cascade
);

create table ml_private.components (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  component_code text not null check (component_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  category text not null,
  spec_json jsonb not null default '{}'::jsonb check (jsonb_typeof(spec_json) = 'object'),
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, component_code)
);

create table ml_private.component_variants (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  component_id uuid not null,
  finish text,
  size text,
  color text,
  sku text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, component_id, sku),
  constraint component_variants_component_fk foreign key (studio_id, component_id)
    references ml_private.components(studio_id, id) on delete cascade
);

create table ml_private.inventory_entries (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  variant_id uuid not null,
  entry_type text not null check (entry_type in ('receive', 'reserve', 'release', 'consume', 'return', 'adjust')),
  quantity ml_private.positive_quantity not null,
  unit ml_private.quantity_unit not null,
  occurred_at timestamptz not null default now(),
  actor_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  constraint inventory_entries_variant_fk foreign key (studio_id, variant_id)
    references ml_private.material_variants(studio_id, id) on delete restrict
);

create table ml_private.garment_materials (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  variant_id uuid not null,
  role text not null,
  placement text,
  required_quantity ml_private.nonnegative_quantity not null default 0,
  reserved_quantity ml_private.nonnegative_quantity not null default 0,
  unit ml_private.quantity_unit not null,
  status text not null default 'planned' check (status in ('planned', 'reserved', 'issued', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_id, variant_id, role, placement),
  check (reserved_quantity <= required_quantity or status in ('issued', 'consumed')),
  constraint garment_materials_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint garment_materials_variant_fk foreign key (studio_id, variant_id)
    references ml_private.material_variants(studio_id, id) on delete restrict
);

create table ml_private.garment_components (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  variant_id uuid not null,
  placement text,
  quantity ml_private.nonnegative_quantity not null default 0,
  unit ml_private.quantity_unit not null default 'each',
  status text not null default 'planned' check (status in ('planned', 'reserved', 'issued', 'consumed', 'released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_id, variant_id, placement),
  constraint garment_components_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint garment_components_variant_fk foreign key (studio_id, variant_id)
    references ml_private.component_variants(studio_id, id) on delete restrict
);

create table ml_private.supplier_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  supplier_id uuid not null,
  item_type text not null check (item_type in ('material_variant', 'component_variant')),
  material_variant_id uuid,
  component_variant_id uuid,
  sku text,
  currency ml_private.iso_currency not null,
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  purchase_unit ml_private.quantity_unit not null,
  minimum_order_quantity ml_private.nonnegative_quantity,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  is_preferred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, supplier_id, sku),
  check (
    (item_type = 'material_variant' and material_variant_id is not null and component_variant_id is null)
    or (item_type = 'component_variant' and component_variant_id is not null and material_variant_id is null)
  ),
  constraint supplier_items_supplier_fk foreign key (studio_id, supplier_id)
    references ml_private.suppliers(studio_id, id) on delete cascade,
  constraint supplier_items_material_variant_fk foreign key (studio_id, material_variant_id)
    references ml_private.material_variants(studio_id, id) on delete cascade,
  constraint supplier_items_component_variant_fk foreign key (studio_id, component_variant_id)
    references ml_private.component_variants(studio_id, id) on delete cascade
);

-- Version root -----------------------------------------------------------------

create table ml_private.garment_versions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  parent_version_id uuid,
  version_no integer not null check (version_no > 0),
  label text not null check (length(btrim(label)) between 1 and 160),
  scope_json jsonb not null default '{}'::jsonb check (jsonb_typeof(scope_json) = 'object'),
  snapshot_json jsonb not null check (jsonb_typeof(snapshot_json) = 'object'),
  checksum ml_private.sha256_checksum not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  unique (studio_id, garment_id, version_no),
  unique (studio_id, garment_id, checksum),
  constraint garment_versions_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint garment_versions_parent_fk foreign key (studio_id, parent_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

alter table ml_private.garments
  add constraint garments_current_version_fk foreign key (studio_id, current_version_id)
    references ml_private.garment_versions(studio_id, id) on delete set null (current_version_id);

-- Technical foundation, flats, POM, grading, BOM, and construction -------------

create table ml_private.technical_specs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'released', 'superseded')),
  base_size text not null,
  unit ml_private.measurement_unit not null,
  revision_label text not null default 'A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_id),
  constraint technical_specs_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.technical_flats (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  view text not null check (view in ('front', 'back', 'left', 'right', 'inside', 'detail', 'other')),
  asset_id uuid not null,
  source text not null check (source in ('uploaded', 'drawn', 'generated', 'derived')),
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, spec_id, view, asset_id),
  constraint technical_flats_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade,
  constraint technical_flats_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.flat_annotations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  flat_id uuid not null,
  anchor_json jsonb not null check (jsonb_typeof(anchor_json) = 'object'),
  label text not null,
  detail text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint flat_annotations_flat_fk foreign key (studio_id, flat_id)
    references ml_private.technical_flats(studio_id, id) on delete cascade
);

create table ml_private.technical_files (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  asset_id uuid not null,
  file_type text not null check (file_type in ('pattern', 'cad', 'illustrator', 'spreadsheet', 'pdf', 'reference', 'other')),
  version_label text,
  is_source boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint technical_files_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade,
  constraint technical_files_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.tech_pack_exports (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  garment_version_id uuid not null,
  export_asset_id uuid not null,
  format text not null check (format in ('pdf', 'zip')),
  checksum ml_private.sha256_checksum not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  constraint tech_pack_exports_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete restrict,
  constraint tech_pack_exports_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict,
  constraint tech_pack_exports_asset_fk foreign key (studio_id, export_asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.validation_runs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  garment_version_id uuid,
  status text not null check (status in ('passed', 'failed', 'warning', 'error')),
  ruleset_version text not null,
  result_json jsonb not null check (jsonb_typeof(result_json) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  constraint validation_runs_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade,
  constraint validation_runs_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

create table ml_private.pom_points (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9._-]{0,31}$'),
  name text not null,
  method text not null,
  diagram_anchor_json jsonb not null default '{}'::jsonb check (jsonb_typeof(diagram_anchor_json) = 'object'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, spec_id, code),
  constraint pom_points_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade
);

create table ml_private.measurement_sets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  name text not null,
  sample_type text,
  base_size text not null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, spec_id, name),
  constraint measurement_sets_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade
);

create table ml_private.measurement_values (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  set_id uuid not null,
  pom_point_id uuid not null,
  size text not null,
  target numeric(12,4) not null,
  tolerance_plus ml_private.nonnegative_quantity not null default 0,
  tolerance_minus ml_private.nonnegative_quantity not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, set_id, pom_point_id, size),
  constraint measurement_values_set_fk foreign key (studio_id, set_id)
    references ml_private.measurement_sets(studio_id, id) on delete cascade,
  constraint measurement_values_pom_fk foreign key (studio_id, pom_point_id)
    references ml_private.pom_points(studio_id, id) on delete restrict
);

create table ml_private.grade_rules (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  name text not null,
  size_range_json jsonb not null check (jsonb_typeof(size_range_json) in ('array', 'object')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, spec_id, name),
  constraint grade_rules_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade
);

create table ml_private.grade_rule_values (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  grade_rule_id uuid not null,
  pom_point_id uuid not null,
  from_size text not null,
  to_size text not null,
  delta numeric(12,4) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, grade_rule_id, pom_point_id, from_size, to_size),
  check (from_size <> to_size),
  constraint grade_rule_values_rule_fk foreign key (studio_id, grade_rule_id)
    references ml_private.grade_rules(studio_id, id) on delete cascade,
  constraint grade_rule_values_pom_fk foreign key (studio_id, pom_point_id)
    references ml_private.pom_points(studio_id, id) on delete restrict
);

create table ml_private.bom_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  item_type text not null check (item_type in ('material_variant', 'component_variant', 'custom')),
  material_variant_id uuid,
  component_variant_id uuid,
  description text not null,
  quantity ml_private.nonnegative_quantity not null default 0,
  unit ml_private.quantity_unit not null,
  placement text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  check (
    (item_type = 'material_variant' and material_variant_id is not null and component_variant_id is null)
    or (item_type = 'component_variant' and component_variant_id is not null and material_variant_id is null)
    or (item_type = 'custom' and material_variant_id is null and component_variant_id is null)
  ),
  constraint bom_items_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade,
  constraint bom_items_material_variant_fk foreign key (studio_id, material_variant_id)
    references ml_private.material_variants(studio_id, id) on delete restrict,
  constraint bom_items_component_variant_fk foreign key (studio_id, component_variant_id)
    references ml_private.component_variants(studio_id, id) on delete restrict
);

create table ml_private.construction_sections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  spec_id uuid not null,
  name text not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, spec_id, name),
  constraint construction_sections_spec_fk foreign key (studio_id, spec_id)
    references ml_private.technical_specs(studio_id, id) on delete cascade
);

create table ml_private.construction_steps (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  section_id uuid not null,
  step_number integer not null check (step_number > 0),
  operation text not null,
  machine text,
  stitch_spec text,
  seam_allowance numeric(12,4),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, section_id, step_number),
  constraint construction_steps_section_fk foreign key (studio_id, section_id)
    references ml_private.construction_sections(studio_id, id) on delete cascade
);

create table ml_private.construction_details (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  step_id uuid not null,
  asset_id uuid,
  anchor_json jsonb not null default '{}'::jsonb check (jsonb_typeof(anchor_json) = 'object'),
  callout text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint construction_details_step_fk foreign key (studio_id, step_id)
    references ml_private.construction_steps(studio_id, id) on delete cascade,
  constraint construction_details_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete set null (asset_id)
);

create table ml_private.technical_templates (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  template_type text not null check (template_type in ('pom', 'measurement', 'grading', 'bom', 'construction', 'validation')),
  name text not null,
  payload_json jsonb not null check (jsonb_typeof(payload_json) = 'object'),
  version integer not null default 1 check (version > 0),
  status text not null default 'active' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, template_type, name, version)
);

create table ml_private.template_applications (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  template_id uuid not null,
  garment_id uuid not null,
  applied_by uuid references auth.users(id) on delete set null,
  mapping_json jsonb not null default '{}'::jsonb check (jsonb_typeof(mapping_json) = 'object'),
  applied_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  constraint template_applications_template_fk foreign key (studio_id, template_id)
    references ml_private.technical_templates(studio_id, id) on delete restrict,
  constraint template_applications_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

-- Production, samples, fitting, costing, orders, and QC -------------------------

create table ml_private.sample_rounds (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  factory_id uuid,
  garment_version_id uuid,
  round_no integer not null check (round_no > 0),
  sample_type text not null,
  status text not null default 'planned' check (status in ('planned', 'requested', 'in_progress', 'received', 'reviewed', 'approved', 'rejected')),
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, garment_id, round_no),
  constraint sample_rounds_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint sample_rounds_factory_fk foreign key (studio_id, factory_id)
    references ml_private.factories(studio_id, id) on delete set null (factory_id),
  constraint sample_rounds_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

create table ml_private.fit_sessions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  sample_round_id uuid not null,
  fit_date date not null,
  model_profile_json jsonb not null default '{}'::jsonb check (jsonb_typeof(model_profile_json) = 'object'),
  summary text,
  decision text check (decision is null or decision in ('revise', 'approve', 'reject', 'hold')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint fit_sessions_round_fk foreign key (studio_id, sample_round_id)
    references ml_private.sample_rounds(studio_id, id) on delete cascade
);

create table ml_private.fit_issues (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  fit_session_id uuid not null,
  area text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  observation text not null,
  resolution text,
  status text not null default 'open' check (status in ('open', 'planned', 'resolved', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint fit_issues_session_fk foreign key (studio_id, fit_session_id)
    references ml_private.fit_sessions(studio_id, id) on delete cascade
);

create table ml_private.fit_measurements (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  sample_round_id uuid not null,
  pom_point_id uuid not null,
  size text not null,
  actual numeric(12,4) not null,
  variance numeric(12,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, sample_round_id, pom_point_id, size),
  constraint fit_measurements_round_fk foreign key (studio_id, sample_round_id)
    references ml_private.sample_rounds(studio_id, id) on delete cascade,
  constraint fit_measurements_pom_fk foreign key (studio_id, pom_point_id)
    references ml_private.pom_points(studio_id, id) on delete restrict
);

create table ml_private.cost_sheets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  garment_version_id uuid,
  currency ml_private.iso_currency not null,
  quantity_basis integer not null default 1 check (quantity_basis > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded')),
  calculated_total numeric(14,4) not null default 0 check (calculated_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint cost_sheets_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint cost_sheets_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

create table ml_private.cost_items (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  cost_sheet_id uuid not null,
  category text not null,
  description text not null,
  quantity ml_private.nonnegative_quantity not null default 1,
  unit_cost numeric(14,4) not null check (unit_cost >= 0),
  waste_pct numeric(7,4) not null default 0 check (waste_pct between 0 and 100),
  total numeric(14,4) generated always as (round(quantity * unit_cost * (1 + waste_pct / 100), 4)) stored,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint cost_items_sheet_fk foreign key (studio_id, cost_sheet_id)
    references ml_private.cost_sheets(studio_id, id) on delete cascade
);

create table ml_private.production_orders (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  garment_version_id uuid not null,
  factory_id uuid not null,
  order_code text not null check (order_code ~ '^[A-Z0-9][A-Z0-9._-]{1,63}$'),
  quantity integer not null check (quantity > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'placed', 'in_production', 'shipped', 'received', 'closed', 'cancelled')),
  target_ship_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, order_code),
  constraint production_orders_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete restrict,
  constraint production_orders_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict,
  constraint production_orders_factory_fk foreign key (studio_id, factory_id)
    references ml_private.factories(studio_id, id) on delete restrict
);

create table ml_private.qc_results (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  production_order_id uuid not null,
  check_code text not null,
  result text not null check (result in ('pass', 'fail', 'conditional', 'not_applicable')),
  severity text check (severity is null or severity in ('low', 'medium', 'high', 'critical')),
  notes text,
  inspected_by uuid references auth.users(id) on delete set null,
  inspected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, production_order_id, check_code),
  constraint qc_results_order_fk foreign key (studio_id, production_order_id)
    references ml_private.production_orders(studio_id, id) on delete cascade
);

-- Editorial and private portfolio curation -------------------------------------

create table ml_private.editorial_collections (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  title text not null,
  template_type text not null,
  theme_id text,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint editorial_collections_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.editorial_scenes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  collection_id uuid not null,
  scene_type text not null,
  title text,
  sort_order integer not null default 0 check (sort_order >= 0),
  transition_json jsonb not null default '{}'::jsonb check (jsonb_typeof(transition_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, collection_id, sort_order),
  constraint editorial_scenes_collection_fk foreign key (studio_id, collection_id)
    references ml_private.editorial_collections(studio_id, id) on delete cascade
);

create table ml_private.editorial_blocks (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  scene_id uuid not null,
  block_type text not null,
  content_json jsonb not null default '{}'::jsonb check (jsonb_typeof(content_json) = 'object'),
  settings_json jsonb not null default '{}'::jsonb check (jsonb_typeof(settings_json) = 'object'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, scene_id, sort_order),
  constraint editorial_blocks_scene_fk foreign key (studio_id, scene_id)
    references ml_private.editorial_scenes(studio_id, id) on delete cascade
);

create table ml_private.editorial_assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  collection_id uuid not null,
  asset_id uuid not null,
  role text not null,
  usage_json jsonb not null default '{}'::jsonb check (jsonb_typeof(usage_json) = 'object'),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, collection_id, asset_id, role),
  constraint editorial_assets_collection_fk foreign key (studio_id, collection_id)
    references ml_private.editorial_collections(studio_id, id) on delete cascade,
  constraint editorial_assets_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.portfolio_profiles (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null unique references ml_private.studios(id) on delete cascade,
  username_slug ml_private.slug not null unique,
  headline text,
  bio text,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id)
);

create table ml_private.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  profile_id uuid not null,
  garment_id uuid not null,
  slug ml_private.slug not null,
  case_study_json jsonb not null default '{}'::jsonb check (jsonb_typeof(case_study_json) = 'object'),
  visibility text not null default 'private' check (visibility in ('private', 'ready', 'published')),
  sort_order integer not null default 0 check (sort_order >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (profile_id, slug),
  constraint portfolio_projects_profile_fk foreign key (studio_id, profile_id)
    references ml_private.portfolio_profiles(studio_id, id) on delete cascade,
  constraint portfolio_projects_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete restrict
);

create table ml_private.portfolio_editorials (
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  profile_id uuid not null,
  collection_id uuid not null,
  slug ml_private.slug not null,
  visibility text not null default 'private' check (visibility in ('private', 'ready', 'published')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  primary key (profile_id, collection_id),
  unique (studio_id, profile_id, collection_id),
  unique (profile_id, slug),
  constraint portfolio_editorials_profile_fk foreign key (studio_id, profile_id)
    references ml_private.portfolio_profiles(studio_id, id) on delete cascade,
  constraint portfolio_editorials_collection_fk foreign key (studio_id, collection_id)
    references ml_private.editorial_collections(studio_id, id) on delete cascade
);

-- Versioning audit, workflow, AI, and sync --------------------------------------

create table ml_private.entity_revisions (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_version_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('create', 'update', 'delete', 'restore')),
  snapshot_json jsonb not null check (jsonb_typeof(snapshot_json) = 'object'),
  checksum ml_private.sha256_checksum not null,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  unique (studio_id, garment_version_id, entity_type, entity_id),
  constraint entity_revisions_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete cascade
);

create table ml_private.change_events (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid,
  origin text not null check (origin in ('user', 'sync', 'migration', 'ai_acceptance', 'restore', 'publication', 'system')),
  actor_id uuid references auth.users(id) on delete set null,
  operation_id uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  operation text not null check (operation in ('create', 'update', 'delete', 'restore', 'publish', 'unpublish', 'role_change', 'accept_ai')),
  json_patch jsonb not null default '[]'::jsonb check (jsonb_typeof(json_patch) = 'array'),
  inverse_patch jsonb not null default '[]'::jsonb check (jsonb_typeof(inverse_patch) = 'array'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  constraint change_events_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete set null (garment_id)
);

create table ml_private.restore_operations (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid not null,
  source_version_id uuid not null,
  result_version_id uuid not null,
  scope_json jsonb not null default '{}'::jsonb check (jsonb_typeof(scope_json) = 'object'),
  reason text not null,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  unique (studio_id, result_version_id),
  check (source_version_id <> result_version_id),
  constraint restore_operations_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade,
  constraint restore_operations_source_fk foreign key (studio_id, source_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict,
  constraint restore_operations_result_fk foreign key (studio_id, result_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

create table ml_private.tasks (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid,
  title text not null check (length(btrim(title)) between 1 and 240),
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_at timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  constraint tasks_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.calendar_events (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid,
  event_type text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  assignee_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  check (ends_at is null or ends_at >= starts_at),
  constraint calendar_events_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  garment_id uuid,
  requested_by uuid references auth.users(id) on delete set null,
  job_type text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  model text not null,
  prompt_version text not null,
  input_refs_json jsonb not null default '[]'::jsonb check (jsonb_typeof(input_refs_json) = 'array'),
  started_at timestamptz,
  completed_at timestamptz,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  check (completed_at is null or started_at is not null),
  constraint ai_jobs_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete cascade
);

create table ml_private.ai_artifacts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  ai_job_id uuid not null,
  artifact_type text not null,
  candidate_json jsonb not null check (jsonb_typeof(candidate_json) = 'object'),
  provenance_json jsonb not null check (jsonb_typeof(provenance_json) = 'object'),
  confidence_json jsonb not null default '{}'::jsonb check (jsonb_typeof(confidence_json) = 'object'),
  decision ml_private.ai_decision not null default 'pending',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  check ((decision = 'pending' and decided_at is null) or (decision <> 'pending' and decided_at is not null)),
  constraint ai_artifacts_job_fk foreign key (studio_id, ai_job_id)
    references ml_private.ai_jobs(studio_id, id) on delete cascade
);

create table ml_private.sync_tombstones (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  client_id text not null,
  deleted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, entity_type, client_id)
);

-- Immutable public projection ---------------------------------------------------

create table ml_public.publications (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  profile_id uuid not null,
  publication_type ml_public.publication_type not null,
  source_id uuid not null,
  portfolio_project_id uuid,
  portfolio_editorial_collection_id uuid,
  source_version_id uuid,
  public_path text not null check (public_path ~ '^/[a-z0-9]+(?:[/-][a-z0-9]+)*$'),
  snapshot_json jsonb not null check (jsonb_typeof(snapshot_json) = 'object'),
  media_manifest jsonb not null default '[]'::jsonb check (jsonb_typeof(media_manifest) = 'array'),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  is_public boolean not null default false,
  is_current boolean not null default false,
  published_at timestamptz,
  unpublished_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  check (not is_public or published_at is not null),
  check (not is_current or is_public),
  check (unpublished_at is null or (not is_public and not is_current)),
  check (
    (publication_type = 'profile' and source_id = profile_id and portfolio_project_id is null and portfolio_editorial_collection_id is null and source_version_id is null)
    or (publication_type = 'project' and source_id = portfolio_project_id and portfolio_project_id is not null and portfolio_editorial_collection_id is null and source_version_id is not null)
    or (publication_type = 'editorial' and source_id = portfolio_editorial_collection_id and portfolio_project_id is null and portfolio_editorial_collection_id is not null and source_version_id is not null)
  ),
  constraint publications_studio_fk foreign key (studio_id)
    references ml_private.studios(id) on delete restrict,
  constraint publications_profile_fk foreign key (studio_id, profile_id)
    references ml_private.portfolio_profiles(studio_id, id) on delete restrict,
  constraint publications_project_fk foreign key (studio_id, portfolio_project_id)
    references ml_private.portfolio_projects(studio_id, id) on delete restrict,
  constraint publications_editorial_fk foreign key (studio_id, profile_id, portfolio_editorial_collection_id)
    references ml_private.portfolio_editorials(studio_id, profile_id, collection_id) on delete restrict,
  constraint publications_version_fk foreign key (studio_id, source_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);

create table ml_public.publication_assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null,
  publication_id uuid not null,
  role text not null,
  storage_path text not null unique check (storage_path ~ '^publications/[0-9a-f-]{36}/'),
  mime_type text not null check (mime_type ~ '^[a-z0-9.+-]+/[a-z0-9.+-]+$'),
  size_bytes bigint not null check (size_bytes >= 0),
  checksum text not null check (checksum ~ '^[a-f0-9]{64}$'),
  copied_from_checksum text not null check (copied_from_checksum ~ '^[a-f0-9]{64}$'),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  unique (studio_id, id),
  unique (publication_id, role, sort_order),
  constraint publication_assets_publication_fk foreign key (studio_id, publication_id)
    references ml_public.publications(studio_id, id) on delete restrict
);

create unique index ml_publications_one_current_source_idx
  on ml_public.publications (profile_id, publication_type, source_id)
  where is_current;
create unique index ml_publications_one_current_path_idx
  on ml_public.publications (public_path)
  where is_current;
create index ml_publication_assets_publication_sort_idx
  on ml_public.publication_assets (publication_id, sort_order);

-- Ownership bootstrap and stable identity guards --------------------------------

create or replace function ml_internal.bootstrap_studio_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into ml_private.studio_members (
    studio_id, user_id, role, status, joined_at
  ) values (
    new.id, new.owner_user_id, 'owner', 'active', now()
  ) on conflict (studio_id, user_id) do nothing;

  insert into ml_private.studio_settings (studio_id)
  values (new.id)
  on conflict (studio_id) do nothing;

  return new;
end;
$$;

revoke all on function ml_internal.bootstrap_studio_owner() from public, anon, authenticated;

create trigger bootstrap_studio_owner
  after insert on ml_private.studios
  for each row execute function ml_internal.bootstrap_studio_owner();

create trigger garments_protect_garment_code
  before update on ml_private.garments
  for each row execute function ml_internal.protect_stable_identifier('garment_code');
create trigger studios_protect_slug
  before update on ml_private.studios
  for each row execute function ml_internal.protect_stable_identifier('slug');
create trigger portfolio_profiles_protect_slug
  before update on ml_private.portfolio_profiles
  for each row execute function ml_internal.protect_stable_identifier('username_slug');
create trigger portfolio_projects_protect_slug
  before update on ml_private.portfolio_projects
  for each row execute function ml_internal.protect_stable_identifier('slug');
create trigger portfolio_editorials_protect_slug
  before update on ml_private.portfolio_editorials
  for each row execute function ml_internal.protect_stable_identifier('slug');

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'studios', 'studio_members', 'studio_settings', 'collections', 'garments', 'tags',
    'suppliers', 'factories', 'design_briefs', 'inspiration_boards', 'inspiration_items',
    'media_assets', 'garment_media', 'media_derivatives', 'design_annotations', 'materials',
    'material_variants', 'components', 'component_variants', 'garment_materials',
    'garment_components', 'supplier_items', 'technical_specs', 'technical_flats',
    'flat_annotations', 'technical_files', 'pom_points', 'measurement_sets',
    'measurement_values', 'grade_rules', 'grade_rule_values', 'bom_items',
    'construction_sections', 'construction_steps', 'construction_details',
    'technical_templates', 'sample_rounds', 'fit_sessions', 'fit_issues',
    'fit_measurements', 'cost_sheets', 'cost_items', 'production_orders', 'qc_results',
    'editorial_collections', 'editorial_scenes', 'editorial_blocks', 'editorial_assets',
    'portfolio_profiles', 'portfolio_projects', 'portfolio_editorials', 'tasks',
    'calendar_events', 'ai_jobs', 'ai_artifacts', 'sync_tombstones'
  ] loop
    execute format(
      'create trigger touch_mutable_row before update on ml_private.%I for each row execute function ml_internal.touch_mutable_row()',
      table_name
    );
  end loop;
end;
$$;

-- Explicit lookup, ordering, and policy-support indexes. Composite ownership
-- foreign keys are indexed in tenant-first order so cascades cannot scan across
-- studios and application queries can always include studio_id.
create index ml_studio_members_user_status_idx on ml_private.studio_members (user_id, status, studio_id);
create index ml_collections_studio_sort_idx on ml_private.collections (studio_id, sort_order);
create index ml_garments_studio_phase_idx on ml_private.garments (studio_id, phase, updated_at desc);
create index ml_garments_collection_idx on ml_private.garments (studio_id, collection_id);
create index ml_garment_tags_tag_idx on ml_private.garment_tags (studio_id, tag_id);
create index ml_inspiration_boards_garment_idx on ml_private.inspiration_boards (studio_id, garment_id, sort_order);
create index ml_inspiration_items_board_idx on ml_private.inspiration_items (studio_id, board_id, sort_order);
create index ml_inspiration_items_asset_idx on ml_private.inspiration_items (studio_id, asset_id);
create index ml_media_assets_studio_created_idx on ml_private.media_assets (studio_id, created_at desc);
create index ml_garment_media_garment_role_idx on ml_private.garment_media (studio_id, garment_id, role, sort_order);
create index ml_media_derivatives_source_idx on ml_private.media_derivatives (studio_id, source_asset_id, variant);
create index ml_design_annotations_garment_idx on ml_private.design_annotations (studio_id, garment_id, status);
create index ml_material_variants_material_idx on ml_private.material_variants (studio_id, material_id);
create index ml_component_variants_component_idx on ml_private.component_variants (studio_id, component_id);
create index ml_inventory_entries_variant_time_idx on ml_private.inventory_entries (studio_id, variant_id, occurred_at desc);
create index ml_garment_materials_garment_idx on ml_private.garment_materials (studio_id, garment_id, status);
create index ml_garment_materials_variant_idx on ml_private.garment_materials (studio_id, variant_id);
create index ml_garment_components_garment_idx on ml_private.garment_components (studio_id, garment_id, status);
create index ml_garment_components_variant_idx on ml_private.garment_components (studio_id, variant_id);
create index ml_supplier_items_supplier_idx on ml_private.supplier_items (studio_id, supplier_id);
create index ml_supplier_items_material_idx on ml_private.supplier_items (studio_id, material_variant_id) where material_variant_id is not null;
create index ml_supplier_items_component_idx on ml_private.supplier_items (studio_id, component_variant_id) where component_variant_id is not null;
create index ml_garment_versions_garment_idx on ml_private.garment_versions (studio_id, garment_id, version_no desc);
create index ml_technical_flats_spec_idx on ml_private.technical_flats (studio_id, spec_id, sort_order);
create index ml_flat_annotations_flat_idx on ml_private.flat_annotations (studio_id, flat_id, sort_order);
create index ml_technical_files_spec_idx on ml_private.technical_files (studio_id, spec_id);
create index ml_technical_files_asset_idx on ml_private.technical_files (studio_id, asset_id);
create index ml_tech_pack_exports_spec_idx on ml_private.tech_pack_exports (studio_id, spec_id, created_at desc);
create index ml_validation_runs_spec_idx on ml_private.validation_runs (studio_id, spec_id, created_at desc);
create index ml_pom_points_spec_sort_idx on ml_private.pom_points (studio_id, spec_id, sort_order);
create index ml_measurement_sets_spec_idx on ml_private.measurement_sets (studio_id, spec_id);
create index ml_measurement_values_set_idx on ml_private.measurement_values (studio_id, set_id, pom_point_id);
create index ml_grade_rules_spec_idx on ml_private.grade_rules (studio_id, spec_id);
create index ml_grade_values_rule_idx on ml_private.grade_rule_values (studio_id, grade_rule_id, pom_point_id);
create index ml_bom_items_spec_sort_idx on ml_private.bom_items (studio_id, spec_id, sort_order);
create index ml_construction_sections_spec_idx on ml_private.construction_sections (studio_id, spec_id, sort_order);
create index ml_construction_steps_section_idx on ml_private.construction_steps (studio_id, section_id, sort_order);
create index ml_construction_details_step_idx on ml_private.construction_details (studio_id, step_id, sort_order);
create index ml_template_applications_template_idx on ml_private.template_applications (studio_id, template_id);
create index ml_template_applications_garment_idx on ml_private.template_applications (studio_id, garment_id);
create index ml_sample_rounds_garment_idx on ml_private.sample_rounds (studio_id, garment_id, round_no desc);
create index ml_sample_rounds_factory_idx on ml_private.sample_rounds (studio_id, factory_id) where factory_id is not null;
create index ml_fit_sessions_round_idx on ml_private.fit_sessions (studio_id, sample_round_id, fit_date desc);
create index ml_fit_issues_session_idx on ml_private.fit_issues (studio_id, fit_session_id, status);
create index ml_fit_measurements_round_idx on ml_private.fit_measurements (studio_id, sample_round_id, pom_point_id);
create index ml_cost_sheets_garment_idx on ml_private.cost_sheets (studio_id, garment_id, status);
create index ml_cost_items_sheet_idx on ml_private.cost_items (studio_id, cost_sheet_id, sort_order);
create index ml_production_orders_garment_idx on ml_private.production_orders (studio_id, garment_id, status);
create index ml_production_orders_factory_idx on ml_private.production_orders (studio_id, factory_id, status);
create index ml_qc_results_order_idx on ml_private.qc_results (studio_id, production_order_id);
create index ml_editorial_collections_garment_idx on ml_private.editorial_collections (studio_id, garment_id);
create index ml_editorial_scenes_collection_idx on ml_private.editorial_scenes (studio_id, collection_id, sort_order);
create index ml_editorial_blocks_scene_idx on ml_private.editorial_blocks (studio_id, scene_id, sort_order);
create index ml_editorial_assets_collection_idx on ml_private.editorial_assets (studio_id, collection_id, sort_order);
create index ml_portfolio_projects_profile_idx on ml_private.portfolio_projects (studio_id, profile_id, sort_order);
create index ml_portfolio_projects_garment_idx on ml_private.portfolio_projects (studio_id, garment_id);
create index ml_portfolio_editorials_collection_idx on ml_private.portfolio_editorials (studio_id, collection_id);
create index ml_entity_revisions_version_idx on ml_private.entity_revisions (studio_id, garment_version_id);
create index ml_change_events_garment_time_idx on ml_private.change_events (studio_id, garment_id, occurred_at desc);
create index ml_change_events_operation_idx on ml_private.change_events (studio_id, operation_id);
create index ml_restore_operations_garment_idx on ml_private.restore_operations (studio_id, garment_id, created_at desc);
create index ml_tasks_studio_status_idx on ml_private.tasks (studio_id, status, due_at);
create index ml_tasks_garment_idx on ml_private.tasks (studio_id, garment_id) where garment_id is not null;
create index ml_tasks_assignee_idx on ml_private.tasks (studio_id, assignee_id, status) where assignee_id is not null;
create index ml_calendar_events_starts_idx on ml_private.calendar_events (studio_id, starts_at);
create index ml_ai_jobs_studio_status_idx on ml_private.ai_jobs (studio_id, status, created_at);
create index ml_ai_artifacts_job_idx on ml_private.ai_artifacts (studio_id, ai_job_id, decision);
create index ml_sync_tombstones_user_time_idx on ml_private.sync_tombstones (studio_id, user_id, deleted_at desc);

-- Table comments explicitly document ownership and sensitivity.
comment on table ml_private.profiles is 'Person identity keyed to auth.users; readable and writable only by that user.';
comment on table ml_private.studios is 'Canonical tenant root; owner membership and default settings are created atomically.';
comment on table ml_private.studio_members is 'Authoritative studio access list used by all canonical RLS policies.';
comment on table ml_private.studio_settings is 'Shared studio policy. JSONB is limited to extensible version and AI policy settings.';
comment on table ml_private.garments is 'Canonical garment identity. garment_code is immutable and rows are archived rather than hard-deleted by clients.';
comment on table ml_private.media_assets is 'Private source media manifest for objects beneath studio-assets/studios/{studio_id}/.';
comment on table ml_private.inventory_entries is 'Append-only material quantity ledger; available totals are derived, never stored as authority.';
comment on table ml_private.technical_specs is 'Private technical release root for flats, POM, BOM, construction, validation, and export evidence.';
comment on table ml_private.garment_versions is 'Immutable named garment Freeze Frames with reproducible checksums.';
comment on table ml_private.change_events is 'Append-only mutation ledger recording origin, actor, operation, and reversible patches.';
comment on table ml_private.ai_jobs is 'Private AI work requests; input references remain private and cannot be published directly.';
comment on table ml_private.ai_artifacts is 'Reviewable AI candidates. Acceptance is a decision, not a direct domain mutation.';
comment on table ml_public.publications is 'Immutable public-safe snapshot payloads; anonymous reads are limited to the current published row.';
comment on table ml_public.publication_assets is 'Copied public-safe derivative manifest only; no private source storage path is exposed.';

commit;
