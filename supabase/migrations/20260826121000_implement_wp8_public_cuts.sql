-- WP8: portfolio curation and the explicit private-to-public Public Cut.
-- Anonymous clients read immutable ml_public payloads only. All selection,
-- source identity, privacy review, and derivative provenance remain canonical.

begin;

alter table ml_private.portfolio_profiles
  add column if not exists display_name text not null default '',
  add column if not exists location text not null default '',
  add column if not exists public_email text not null default '',
  add column if not exists resume_public_url text not null default '',
  add column if not exists avatar_asset_id uuid;

alter table ml_private.portfolio_projects
  add column if not exists source_version_id uuid,
  add column if not exists featured boolean not null default false,
  add column if not exists include_technical_excerpt boolean not null default false;

alter table ml_private.portfolio_editorials
  add column if not exists source_version_id uuid;

alter table ml_public.publications
  add column if not exists source_revision bigint not null default 1 check (source_revision > 0);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'portfolio_profiles_avatar_asset_fk') then
    alter table ml_private.portfolio_profiles add constraint portfolio_profiles_avatar_asset_fk
      foreign key (studio_id, avatar_asset_id) references ml_private.media_assets(studio_id, id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'portfolio_projects_source_version_fk') then
    alter table ml_private.portfolio_projects add constraint portfolio_projects_source_version_fk
      foreign key (studio_id, source_version_id) references ml_private.garment_versions(studio_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'portfolio_editorials_source_version_fk') then
    alter table ml_private.portfolio_editorials add constraint portfolio_editorials_source_version_fk
      foreign key (studio_id, source_version_id) references ml_private.garment_versions(studio_id, id) on delete restrict;
  end if;
end $$;

create table ml_private.portfolio_project_assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  portfolio_project_id uuid not null,
  asset_id uuid not null,
  role text not null check (role in ('cover', 'gallery', 'process', 'technical_excerpt')),
  alt_text text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, portfolio_project_id, asset_id, role),
  constraint portfolio_project_assets_project_fk foreign key (studio_id, portfolio_project_id)
    references ml_private.portfolio_projects(studio_id, id) on delete cascade,
  constraint portfolio_project_assets_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.portfolio_editorial_scenes (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  profile_id uuid not null,
  collection_id uuid not null,
  scene_id uuid not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, profile_id, collection_id, scene_id),
  constraint portfolio_editorial_scenes_selection_fk foreign key (studio_id, profile_id, collection_id)
    references ml_private.portfolio_editorials(studio_id, profile_id, collection_id) on delete cascade,
  constraint portfolio_editorial_scenes_scene_fk foreign key (studio_id, scene_id)
    references ml_private.editorial_scenes(studio_id, id) on delete restrict
);

create table ml_private.portfolio_editorial_assets (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  profile_id uuid not null,
  collection_id uuid not null,
  asset_id uuid not null,
  role text not null default 'editorial',
  alt_text text not null default '',
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, profile_id, collection_id, asset_id, role),
  constraint portfolio_editorial_assets_selection_fk foreign key (studio_id, profile_id, collection_id)
    references ml_private.portfolio_editorials(studio_id, profile_id, collection_id) on delete cascade,
  constraint portfolio_editorial_assets_asset_fk foreign key (studio_id, asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create table ml_private.portfolio_technical_excerpts (
  id uuid primary key default gen_random_uuid(),
  studio_id uuid not null references ml_private.studios(id) on delete cascade,
  profile_id uuid not null,
  portfolio_project_id uuid not null,
  garment_version_id uuid not null,
  title text not null check (btrim(title) <> ''),
  summary text not null check (btrim(summary) <> ''),
  public_download_asset_id uuid,
  visible boolean not null default true,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision bigint not null default 1 check (revision > 0),
  unique (studio_id, id),
  unique (studio_id, portfolio_project_id),
  constraint portfolio_technical_excerpts_profile_fk foreign key (studio_id, profile_id)
    references ml_private.portfolio_profiles(studio_id, id) on delete cascade,
  constraint portfolio_technical_excerpts_project_fk foreign key (studio_id, portfolio_project_id)
    references ml_private.portfolio_projects(studio_id, id) on delete cascade,
  constraint portfolio_technical_excerpts_version_fk foreign key (studio_id, garment_version_id)
    references ml_private.garment_versions(studio_id, id) on delete restrict,
  constraint portfolio_technical_excerpts_download_fk foreign key (studio_id, public_download_asset_id)
    references ml_private.media_assets(studio_id, id) on delete restrict
);

create index ml_portfolio_project_assets_project_idx on ml_private.portfolio_project_assets (studio_id, portfolio_project_id, sort_order);
create index ml_portfolio_project_assets_asset_idx on ml_private.portfolio_project_assets (studio_id, asset_id);
create index ml_portfolio_profiles_avatar_idx on ml_private.portfolio_profiles (studio_id, avatar_asset_id) where avatar_asset_id is not null;
create index ml_portfolio_editorial_scenes_scene_idx on ml_private.portfolio_editorial_scenes (studio_id, scene_id);
create index ml_portfolio_editorial_assets_asset_idx on ml_private.portfolio_editorial_assets (studio_id, asset_id);
create index ml_portfolio_technical_excerpts_version_idx on ml_private.portfolio_technical_excerpts (studio_id, garment_version_id);
create index ml_portfolio_technical_excerpts_profile_idx on ml_private.portfolio_technical_excerpts (studio_id, profile_id);
create index ml_portfolio_projects_source_version_idx on ml_private.portfolio_projects (studio_id, source_version_id) where source_version_id is not null;
create index ml_portfolio_editorials_source_version_idx on ml_private.portfolio_editorials (studio_id, source_version_id) where source_version_id is not null;
create index ml_publications_public_path_lookup_idx on ml_public.publications (public_path, publication_type) where is_current and is_public and unpublished_at is null;

create or replace function ml_internal.assert_portfolio_source_version()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_garment_id uuid;
begin
  if new.source_version_id is null then return new; end if;
  if tg_table_name = 'portfolio_projects' then
    target_garment_id := new.garment_id;
  else
    select garment_relation.garment_id into target_garment_id
    from ml_private.editorial_collection_garments garment_relation
    where garment_relation.studio_id = new.studio_id and garment_relation.collection_id = new.collection_id and garment_relation.role = 'primary';
  end if;
  if not exists (select 1 from ml_private.garment_versions version where version.studio_id = new.studio_id and version.id = new.source_version_id and version.garment_id = target_garment_id) then
    raise exception 'Portfolio source version must belong to the selected garment.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function ml_internal.assert_portfolio_source_version() from public, anon, authenticated;
create trigger portfolio_projects_assert_source_version before insert or update of source_version_id, garment_id on ml_private.portfolio_projects for each row execute function ml_internal.assert_portfolio_source_version();
create trigger portfolio_editorials_assert_source_version before insert or update of source_version_id, collection_id on ml_private.portfolio_editorials for each row execute function ml_internal.assert_portfolio_source_version();

create or replace function ml_internal.assert_portfolio_technical_excerpt()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from ml_private.portfolio_projects project
    join ml_private.technical_specs spec on spec.studio_id = project.studio_id and spec.garment_id = project.garment_id
    where project.studio_id = new.studio_id and project.id = new.portfolio_project_id
      and project.profile_id = new.profile_id and project.source_version_id = new.garment_version_id
      and spec.release_version_id = new.garment_version_id and spec.status = 'released'
  ) then
    raise exception 'Technical excerpts require the project released source version.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function ml_internal.assert_portfolio_technical_excerpt() from public, anon, authenticated;
create trigger portfolio_technical_excerpts_assert_source before insert or update on ml_private.portfolio_technical_excerpts for each row execute function ml_internal.assert_portfolio_technical_excerpt();

-- The application builder uses an allowlist; this database allowlist is an
-- independent final gate. Recursive denylisting covers any nested extension.
create or replace function ml_internal.publication_root_keys_allowed(payload jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(payload) = 'object'
    and not exists (
      select 1 from jsonb_object_keys(payload) root_key
      where root_key <> all (array['profile', 'projects', 'editorials', 'generatedAt'])
    );
$$;

create or replace function ml_internal.jsonb_has_private_key(payload jsonb)
returns boolean language sql immutable set search_path = '' as $$
  with recursive walk(value) as (
    select coalesce(payload, 'null'::jsonb)
    union all
    select child.value from walk current_node cross join lateral (
      select object_value as value from jsonb_each(case when jsonb_typeof(current_node.value) = 'object' then current_node.value else '{}'::jsonb end) object_children(object_key, object_value)
      union all
      select array_value from jsonb_array_elements(case when jsonb_typeof(current_node.value) = 'array' then current_node.value else '[]'::jsonb end) array_children(array_value)
    ) child
  )
  select exists (
    select 1 from walk current_node cross join lateral jsonb_object_keys(case when jsonb_typeof(current_node.value) = 'object' then current_node.value else '{}'::jsonb end) object_keys(key)
    where regexp_replace(lower(object_keys.key), '[^a-z0-9]', '', 'g') = any (array[
      'actorid','aiartifacts','aijobs','bomitems','constructiondetails','constructionsteps',
      'costitems','costs','costsheets','factoryid','factories','fitissues','fitnotes',
      'inputrefs','modelprofile','notes','owneruserid','patternfiles','privatefiles',
      'privatenotes','prompt','prompts','pompoints','rawaiinputs','storagepath','studioid',
      'supplierid','supplieritems','suppliers','tasks','technicalfiles','technicalspecs','unitcost'
    ])
  );
$$;

create or replace function ml_internal.jsonb_has_unknown_public_key(payload jsonb)
returns boolean language sql immutable set search_path = '' as $$
  with recursive walk(value) as (
    select coalesce(payload, 'null'::jsonb)
    union all
    select child.value from walk current_node cross join lateral (
      select object_value as value from jsonb_each(case when jsonb_typeof(current_node.value) = 'object' then current_node.value else '{}'::jsonb end) object_children(object_key, object_value)
      union all
      select array_value from jsonb_array_elements(case when jsonb_typeof(current_node.value) = 'array' then current_node.value else '[]'::jsonb end) array_children(array_value)
    ) child
  )
  select exists (
    select 1 from walk current_node cross join lateral jsonb_object_keys(case when jsonb_typeof(current_node.value) = 'object' then current_node.value else '{}'::jsonb end) object_keys(key)
    where object_keys.key <> all (array[
      'profile','projects','editorials','generatedAt','accentColor','align','alignment','alt','approvedAt','approvedVersionId',
      'attribution','avatar','background','bio','blocks','body','caption','caseStudy','challenge','collection','colorHex',
      'colorStory','columns','composition','content','cover','coverImage','description','designIntent','displayName','downloadUrl',
      'downloads','email','eyebrow','featured','featuredImages','fit','gallery','garmentType','heading','headline','height',
      'image','imageReference','images','items','key','label','layout','location','materials','name','narrativeRole','order',
      'outcome','overview','overlayColor','overlayOpacity','phase','positionX','positionY','process','processSummary','progress',
      'quote','reference','resumeUrl','role','rows','sceneType','scenes','season','silhouette','size','skills','slug','solution',
      'sortOrder','src','style','subtitle','summary','targetWearer','templateType','text','themeId','title','tone','tools',
      'transition','type','updatedAt','usage','usernameSlug','value','values','visibleSections','width','zoom'
    ])
  );
$$;

create or replace function ml_internal.enforce_wp8_public_cut()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not ml_internal.publication_root_keys_allowed(new.snapshot_json) then
    raise exception 'Publication snapshot root contains a key outside the Public Cut allowlist.' using errcode = '23514';
  end if;
  if ml_internal.jsonb_has_private_key(new.snapshot_json) then
    raise exception 'Publication snapshot contains private Studio data.' using errcode = '23514';
  end if;
  if ml_internal.jsonb_has_unknown_public_key(new.snapshot_json) then
    raise exception 'Publication snapshot contains a nested key outside the Public Cut allowlist.' using errcode = '23514';
  end if;
  if jsonb_typeof(new.snapshot_json -> 'profile') <> 'object'
     or jsonb_typeof(new.snapshot_json -> 'projects') <> 'array'
     or jsonb_typeof(new.snapshot_json -> 'editorials') <> 'array'
     or jsonb_typeof(new.media_manifest) <> 'array' then
    raise exception 'Publication payload does not match the Public Cut contract.' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(new.media_manifest) item
    where not (item ?& array['sourceAssetId','sourceDerivativeId','publicationAssetId','publicStoragePath','checksum','copiedFromChecksum','mimeType','role'])
      or item ->> 'publicStoragePath' !~ ('^publications/' || new.id::text || '/[0-9a-f-]{36}/')
  ) then
    raise exception 'Public media manifest lacks copied derivative provenance or an exact publication path.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function ml_internal.enforce_wp8_public_cut() from public, anon, authenticated;
create trigger publications_enforce_wp8_public_cut before insert or update of snapshot_json, media_manifest on ml_public.publications for each row execute function ml_internal.enforce_wp8_public_cut();

alter table ml_public.publication_assets
  add column if not exists source_asset_id uuid,
  add column if not exists source_derivative_id uuid,
  add column if not exists rights_checked_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'publication_assets_source_asset_fk') then
    alter table ml_public.publication_assets add constraint publication_assets_source_asset_fk
      foreign key (studio_id, source_asset_id) references ml_private.media_assets(studio_id, id) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'publication_assets_source_derivative_fk') then
    alter table ml_public.publication_assets add constraint publication_assets_source_derivative_fk
      foreign key (studio_id, source_derivative_id) references ml_private.media_derivatives(studio_id, id) on delete restrict;
  end if;
end $$;
create index ml_publication_assets_source_asset_idx on ml_public.publication_assets (studio_id, source_asset_id) where source_asset_id is not null;
create index ml_publication_assets_source_derivative_idx on ml_public.publication_assets (studio_id, source_derivative_id) where source_derivative_id is not null;

create or replace function ml_internal.enforce_public_derivative_provenance()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.source_asset_id is null or new.source_derivative_id is null or new.rights_checked_at is null then
    raise exception 'Copied public assets require source, derivative, and rights evidence.' using errcode = '23514';
  end if;
  if not exists (
    select 1 from ml_private.media_derivatives derivative
    join ml_private.media_assets asset on asset.studio_id = derivative.studio_id and asset.id = derivative.source_asset_id
    where derivative.studio_id = new.studio_id and derivative.id = new.source_derivative_id
      and derivative.source_asset_id = new.source_asset_id and derivative.variant in ('portfolio', 'export')
      and derivative.checksum = new.copied_from_checksum
      and coalesce(asset.rights_json ->> 'license', '') <> ''
  ) then
    raise exception 'Publication asset is not a rights-cleared portfolio derivative.' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function ml_internal.enforce_public_derivative_provenance() from public, anon, authenticated;
create trigger publication_assets_enforce_provenance before insert on ml_public.publication_assets for each row execute function ml_internal.enforce_public_derivative_provenance();

-- New selection tables are private, studio-scoped, and never granted to anon.
do $$ declare table_name text; begin
  foreach table_name in array array['portfolio_project_assets','portfolio_editorial_scenes','portfolio_editorial_assets','portfolio_technical_excerpts'] loop
    execute format('alter table ml_private.%I enable row level security', table_name);
    execute format('alter table ml_private.%I force row level security', table_name);
    execute format('revoke all on table ml_private.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table ml_private.%I to authenticated', table_name);
    execute format('create policy studio_select on ml_private.%I for select to authenticated using (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create policy studio_insert on ml_private.%I for insert to authenticated with check (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create policy studio_update on ml_private.%I for update to authenticated using (studio_id in (select ml_internal.member_studio_ids())) with check (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create policy studio_delete on ml_private.%I for delete to authenticated using (studio_id in (select ml_internal.member_studio_ids()))', table_name);
    execute format('create trigger touch_mutable_row before update on ml_private.%I for each row execute function ml_internal.touch_mutable_row()', table_name);
  end loop;
end $$;

comment on table ml_private.portfolio_project_assets is 'Explicitly selected private assets for a future Public Cut; never anonymously readable.';
comment on table ml_private.portfolio_editorial_scenes is 'Explicit selected-scene relationship for public editorial curation.';
comment on table ml_private.portfolio_editorial_assets is 'Explicit selected-asset relationship for public editorial curation.';
comment on table ml_private.portfolio_technical_excerpts is 'Optional curated excerpt from an approved released garment version; never the full technical graph.';
comment on table ml_public.publications is 'Immutable allowlisted Public Cut snapshots. Anonymous routes read this table and copied publication assets only.';
comment on column ml_public.publication_assets.source_derivative_id is 'Private provenance reference visible only to Studio members; anonymous clients receive the copied public path.';

commit;
