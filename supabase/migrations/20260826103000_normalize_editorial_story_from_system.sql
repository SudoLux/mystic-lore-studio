-- WP7: Canonical private editorial collections and Story from System.
-- This is additive: legacy LookbookPage and StudioData remain recoverable until
-- the accepted cutover, while canonical records become the Editorial route owner.

begin;

alter table ml_private.editorial_collections
  add column if not exists subtitle text not null default '',
  add column if not exists description text not null default '',
  add column if not exists primary_garment_version_id uuid,
  add column if not exists transition_json jsonb not null default '{}'::jsonb check (jsonb_typeof(transition_json) = 'object'),
  add column if not exists export_settings_json jsonb not null default '{}'::jsonb check (jsonb_typeof(export_settings_json) = 'object'),
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null,
  add column if not exists published_at timestamptz;

alter table ml_private.editorial_collections drop constraint if exists editorial_collections_status_check;
alter table ml_private.editorial_collections add constraint editorial_collections_status_check
  check (status in ('draft', 'in_review', 'ready', 'approved', 'published', 'retired', 'archived'));

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'editorial_collections_primary_version_fk') then
    alter table ml_private.editorial_collections add constraint editorial_collections_primary_version_fk
      foreign key (studio_id, primary_garment_version_id) references ml_private.garment_versions(studio_id, id) on delete restrict;
  end if;
end $$;

create table ml_private.editorial_collection_garments (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  collection_id uuid not null,
  garment_id uuid not null,
  role text not null check (role in ('primary', 'supporting')),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, collection_id, garment_id),
  constraint editorial_collection_garments_collection_fk foreign key (studio_id, collection_id)
    references ml_private.editorial_collections(studio_id, id) on delete cascade,
  constraint editorial_collection_garments_garment_fk foreign key (studio_id, garment_id)
    references ml_private.garments(studio_id, id) on delete restrict
);
create unique index if not exists ml_editorial_collection_one_primary_idx
  on ml_private.editorial_collection_garments (studio_id, collection_id) where role = 'primary';
create index if not exists ml_editorial_collection_garments_garment_idx
  on ml_private.editorial_collection_garments (studio_id, garment_id);

insert into ml_private.editorial_collection_garments (studio_id, collection_id, garment_id, role, sort_order)
select studio_id, id, garment_id, 'primary', 0 from ml_private.editorial_collections
on conflict (studio_id, collection_id, garment_id) do nothing;

alter table ml_private.editorial_scenes
  add column if not exists subtitle text not null default '',
  add column if not exists description text not null default '',
  add column if not exists narrative_role text not null default 'supporting',
  add column if not exists background_json jsonb not null default '{}'::jsonb check (jsonb_typeof(background_json) = 'object');

alter table ml_private.editorial_blocks
  add column if not exists live_source text,
  add column if not exists source_garment_id uuid,
  add column if not exists source_version_id uuid,
  add column if not exists source_entity_id uuid,
  add column if not exists source_field_path text,
  add column if not exists source_checksum text,
  add column if not exists staleness text not null default 'current' check (staleness in ('current', 'source_changed', 'missing_source')),
  add column if not exists ai_artifact_id uuid references ml_private.ai_artifacts(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'editorial_blocks_live_source_check') then
    alter table ml_private.editorial_blocks add constraint editorial_blocks_live_source_check
      check (live_source is null or live_source in ('garment', 'design_brief', 'material', 'technical_spec', 'measurement_set', 'construction_step', 'production_timeline', 'garment_version'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'editorial_blocks_source_garment_fk') then
    alter table ml_private.editorial_blocks add constraint editorial_blocks_source_garment_fk
      foreign key (studio_id, source_garment_id) references ml_private.garments(studio_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'editorial_blocks_source_version_fk') then
    alter table ml_private.editorial_blocks add constraint editorial_blocks_source_version_fk
      foreign key (studio_id, source_version_id) references ml_private.garment_versions(studio_id, id) on delete restrict;
  end if;
end $$;
create index if not exists ml_editorial_blocks_source_idx on ml_private.editorial_blocks (studio_id, source_garment_id, source_version_id) where live_source is not null;

create table ml_private.editorial_exports (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  collection_id uuid not null,
  collection_revision bigint not null check (collection_revision > 0),
  format text not null check (format in ('pdf', 'image')),
  checksum ml_private.sha256_checksum not null,
  storage_path text not null check (storage_path ~ '^studios/[0-9a-f-]+/editorial/exports/'),
  source_garment_version_id uuid,
  manifest_json jsonb not null check (jsonb_typeof(manifest_json) = 'object'),
  generated_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, collection_id, format, checksum),
  constraint editorial_exports_collection_fk foreign key (studio_id, collection_id)
    references ml_private.editorial_collections(studio_id, id) on delete restrict,
  constraint editorial_exports_source_version_fk foreign key (studio_id, source_garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict
);
create index if not exists ml_editorial_exports_collection_idx on ml_private.editorial_exports (studio_id, collection_id, generated_at desc);
create index if not exists ml_editorial_exports_source_version_idx on ml_private.editorial_exports (studio_id, source_garment_version_id) where source_garment_version_id is not null;

create or replace function ml_internal.assert_editorial_live_source()
returns trigger language plpgsql security definer set search_path = '' as $$
declare collection_id uuid;
begin
  if new.live_source is null then return new; end if;
  if new.source_garment_id is null or new.source_field_path is null or btrim(new.source_field_path) = '' then
    raise exception 'Live editorial blocks require a source garment and exact field path.' using errcode = '23514';
  end if;
  select scene.collection_id into collection_id from ml_private.editorial_scenes scene
  where scene.studio_id = new.studio_id and scene.id = new.scene_id;
  if not exists (select 1 from ml_private.editorial_collection_garments relation
    where relation.studio_id = new.studio_id and relation.collection_id = collection_id and relation.garment_id = new.source_garment_id) then
    raise exception 'Live editorial source must be a linked primary or supporting garment.' using errcode = '23514';
  end if;
  if new.source_version_id is not null and not exists (select 1 from ml_private.garment_versions version
    where version.studio_id = new.studio_id and version.id = new.source_version_id and version.garment_id = new.source_garment_id) then
    raise exception 'Live editorial source version must belong to its source garment.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function ml_internal.assert_editorial_live_source() from public, anon, authenticated;
drop trigger if exists editorial_blocks_assert_live_source on ml_private.editorial_blocks;
create trigger editorial_blocks_assert_live_source before insert or update of live_source, source_garment_id, source_version_id, source_field_path, scene_id
  on ml_private.editorial_blocks for each row execute function ml_internal.assert_editorial_live_source();

create or replace function ml_internal.editorial_exports_append_only()
returns trigger language plpgsql security definer set search_path = '' as $$
begin raise exception 'Editorial export manifests are immutable; create a new export.' using errcode = '55000'; end $$;
revoke all on function ml_internal.editorial_exports_append_only() from public, anon, authenticated;
create trigger editorial_exports_append_only before update or delete on ml_private.editorial_exports
  for each row execute function ml_internal.editorial_exports_append_only();

-- New private tables receive minimal authenticated grants plus membership RLS.
alter table ml_private.editorial_collection_garments enable row level security;
alter table ml_private.editorial_exports enable row level security;
revoke all on table ml_private.editorial_collection_garments, ml_private.editorial_exports from anon, authenticated;
grant select, insert, update, delete on table ml_private.editorial_collection_garments to authenticated;
grant select, insert on table ml_private.editorial_exports to authenticated;
create policy studio_select on ml_private.editorial_collection_garments for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_insert on ml_private.editorial_collection_garments for insert to authenticated with check (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_update on ml_private.editorial_collection_garments for update to authenticated using (studio_id in (select ml_internal.member_studio_ids())) with check (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_delete on ml_private.editorial_collection_garments for delete to authenticated using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_select on ml_private.editorial_exports for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()));
create policy studio_insert on ml_private.editorial_exports for insert to authenticated with check (studio_id in (select ml_internal.member_studio_ids()));

comment on table ml_private.editorial_collection_garments is 'Canonical primary/supporting garment relationship for private Editorial Collections.';
comment on table ml_private.editorial_exports is 'Immutable private export manifest; actual bytes live only in private studio-assets paths.';
comment on column ml_private.editorial_blocks.source_field_path is 'Exact approved source field mapped into a Story from System block; never infer from prose.';

commit;
