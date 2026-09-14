-- WP11G: repair canonical garment uploads and preserve the V1 textile archive
-- as normalized, Studio-owned records. V1 remains a read-only import source.

begin;

create table ml_private.material_variant_profiles (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  variant_id uuid not null,
  country_of_origin text,
  secondary_colors text[] not null default '{}',
  weave_or_knit text,
  stretch text,
  opacity text,
  drape text,
  hand_feel text,
  texture text,
  structure text,
  rarity text,
  best_uses text[] not null default '{}',
  care_notes text,
  mood_tags text[] not null default '{}',
  lore_note text,
  private_notes text,
  purchase_date date,
  storage_location text,
  bin_number text,
  shelf text,
  storage_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, variant_id),
  constraint material_variant_profiles_variant_fk foreign key (studio_id, variant_id)
    references ml_private.material_variants(studio_id, id) on delete cascade
);

create table ml_private.material_variant_media (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  variant_id uuid not null,
  asset_id uuid not null,
  role text not null default 'swatch' check (role in ('swatch', 'detail', 'reference')),
  sort_order integer not null default 0 check (sort_order >= 0),
  framing_json jsonb not null default '{}'::jsonb check (jsonb_typeof(framing_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, variant_id, asset_id, role),
  constraint material_variant_media_variant_fk foreign key (studio_id, variant_id)
    references ml_private.material_variants(studio_id, id) on delete cascade,
  constraint material_variant_media_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

comment on table ml_private.material_variant_profiles is
  'One-to-one descriptive and storage profile for a material variant. Important textile attributes remain explicit columns rather than JSON.';
comment on table ml_private.material_variant_media is
  'Ordered private media relationships for material swatches, details, and references.';

create index ml_material_variant_profiles_variant_idx
  on ml_private.material_variant_profiles (studio_id, variant_id);
create index ml_material_variant_media_variant_role_idx
  on ml_private.material_variant_media (studio_id, variant_id, role, sort_order);

alter table ml_private.material_variant_profiles enable row level security;
alter table ml_private.material_variant_media enable row level security;
alter table ml_private.material_variant_profiles force row level security;
alter table ml_private.material_variant_media force row level security;

create policy studio_select on ml_private.material_variant_profiles
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_insert on ml_private.material_variant_profiles
  for insert to authenticated
  with check (studio_id in (select ml_internal.writable_studio_ids()));
create policy studio_update on ml_private.material_variant_profiles
  for update to authenticated
  using (studio_id in (select ml_internal.writable_studio_ids()))
  with check (studio_id in (select ml_internal.writable_studio_ids()));
create policy studio_delete on ml_private.material_variant_profiles
  for delete to authenticated
  using (studio_id in (select ml_internal.writable_studio_ids()));

create policy studio_select on ml_private.material_variant_media
  for select to authenticated
  using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_insert on ml_private.material_variant_media
  for insert to authenticated
  with check (studio_id in (select ml_internal.writable_studio_ids()));
create policy studio_update on ml_private.material_variant_media
  for update to authenticated
  using (studio_id in (select ml_internal.writable_studio_ids()))
  with check (studio_id in (select ml_internal.writable_studio_ids()));
create policy studio_delete on ml_private.material_variant_media
  for delete to authenticated
  using (studio_id in (select ml_internal.writable_studio_ids()));

grant select on table
  ml_private.material_variant_profiles,
  ml_private.material_variant_media
to authenticated;
revoke insert, update, delete on table
  ml_private.material_variant_profiles,
  ml_private.material_variant_media
from anon, authenticated;

-- Extend the static RPC allowlists without copying their large WP10 cases.
alter function ml_internal.canonical_client_table(text)
  rename to canonical_client_table_wp10;
create function ml_internal.canonical_client_table(p_entity_type text)
returns text language sql immutable set search_path = '' as $$
  select case p_entity_type
    when 'material_variant_profiles' then 'material_variant_profiles'
    when 'material_variant_media' then 'material_variant_media'
    else ml_internal.canonical_client_table_wp10(p_entity_type)
  end;
$$;

alter function ml_internal.canonical_client_columns(text)
  rename to canonical_client_columns_wp10;
create function ml_internal.canonical_client_columns(p_table_name text)
returns text[] language sql immutable set search_path = '' as $$
  select case p_table_name
    when 'material_variant_profiles' then array[
      'variant_id','country_of_origin','secondary_colors','weave_or_knit',
      'stretch','opacity','drape','hand_feel','texture','structure','rarity',
      'best_uses','care_notes','mood_tags','lore_note','private_notes',
      'purchase_date','storage_location','bin_number','shelf','storage_status'
    ]::text[]
    when 'material_variant_media' then
      array['variant_id','asset_id','role','sort_order','framing_json']::text[]
    else ml_internal.canonical_client_columns_wp10(p_table_name)
  end;
$$;

alter function ml_internal.canonical_delete_allowed(text)
  rename to canonical_delete_allowed_wp10;
create function ml_internal.canonical_delete_allowed(p_table_name text)
returns boolean language sql immutable set search_path = '' as $$
  select p_table_name in ('material_variant_profiles', 'material_variant_media')
    or ml_internal.canonical_delete_allowed_wp10(p_table_name);
$$;

revoke all on function ml_internal.canonical_client_table_wp10(text) from public, anon, authenticated;
revoke all on function ml_internal.canonical_client_columns_wp10(text) from public, anon, authenticated;
revoke all on function ml_internal.canonical_delete_allowed_wp10(text) from public, anon, authenticated;
revoke all on function ml_internal.canonical_client_table(text) from public, anon, authenticated;
revoke all on function ml_internal.canonical_client_columns(text) from public, anon, authenticated;
revoke all on function ml_internal.canonical_delete_allowed(text) from public, anon, authenticated;
grant execute on function ml_internal.canonical_client_table_wp10(text) to authenticated;
grant execute on function ml_internal.canonical_client_columns_wp10(text) to authenticated;
grant execute on function ml_internal.canonical_delete_allowed_wp10(text) to authenticated;
grant execute on function ml_internal.canonical_client_table(text) to authenticated;
grant execute on function ml_internal.canonical_client_columns(text) to authenticated;
grant execute on function ml_internal.canonical_delete_allowed(text) to authenticated;

create trigger canonical_operation_guard
  before insert or update or delete on ml_private.material_variant_profiles
  for each row execute function ml_internal.reject_uncoordinated_canonical_write();
create trigger canonical_operation_audit
  after insert or update or delete on ml_private.material_variant_profiles
  for each row execute function ml_internal.record_canonical_row_change();
create trigger canonical_operation_guard
  before insert or update or delete on ml_private.material_variant_media
  for each row execute function ml_internal.reject_uncoordinated_canonical_write();
create trigger canonical_operation_audit
  after insert or update or delete on ml_private.material_variant_media
  for each row execute function ml_internal.record_canonical_row_change();

-- Existing browsers already queued this path family. Keep it valid so those
-- exact idempotent operations can converge without clearing IndexedDB.
drop policy if exists ml_studio_assets_insert_writer on storage.objects;
create policy ml_studio_assets_insert_writer
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and split_part(name, '/', 3) in (
      'assets', 'garments', 'derivatives', 'technical', 'samples',
      'editorial', 'exports'
    )
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  );

drop policy if exists ml_studio_assets_update_writer on storage.objects;
create policy ml_studio_assets_update_writer
  on storage.objects for update to authenticated
  using (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  )
  with check (
    bucket_id = 'studio-assets'
    and ml_internal.storage_studio_id(name) is not null
    and split_part(name, '/', 3) in (
      'assets', 'garments', 'derivatives', 'technical', 'samples',
      'editorial', 'exports'
    )
    and ml_internal.storage_studio_id(name) in (select ml_internal.writable_studio_ids())
  );

comment on function ml_internal.storage_studio_id(text) is
  'Parses canonical private paths: studios/{studio_id}/assets|garments|derivatives|technical|samples|editorial|exports/...';

commit;
