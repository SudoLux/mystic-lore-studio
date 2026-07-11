-- Public Portfolio snapshots are intentionally separate from Mystic Lore
-- Studio's private project, task, note, material, and editorial tables.
-- Anonymous visitors can read only rows explicitly marked public below.

create extension if not exists pgcrypto;

-- One sanitized recruiter-facing profile per Studio user. The JSON snapshot is
-- optional presentation metadata; it must never contain raw private app state.
create table if not exists public.portfolio_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username_slug text not null unique,
  display_name text not null,
  headline text,
  bio text,
  location text,
  email text,
  resume_url text,
  avatar_image_url text,
  snapshot jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_profiles_username_slug_format
    check (username_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- One sanitized, public-safe case-study snapshot per portfolio URL. The
-- project_id is the private app's stable client ID, not a foreign key to the
-- private projects table, so no private table becomes anonymously readable.
create table if not exists public.published_portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username_slug text not null,
  project_id text not null,
  project_slug text not null,
  title text not null,
  description text,
  cover_image_url text,
  snapshot jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_portfolio_projects_username_project_slug_key
    unique (username_slug, project_slug),
  constraint published_portfolio_projects_username_slug_format
    check (username_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint published_portfolio_projects_project_slug_format
    check (project_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

-- Sanitized editorial presentations. As with projects, this table stores a
-- prepared snapshot rather than opening private Editorial Collection records.
create table if not exists public.published_editorials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username_slug text not null,
  editorial_id text not null,
  editorial_slug text not null,
  title text not null,
  snapshot jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_editorials_username_editorial_slug_key
    unique (username_slug, editorial_slug),
  constraint published_editorials_username_slug_format
    check (username_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint published_editorials_editorial_slug_format
    check (editorial_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

comment on table public.portfolio_profiles is
  'Public-safe portfolio profile snapshots. Private profile metadata remains in public.profiles behind owner-only RLS.';
comment on table public.published_portfolio_projects is
  'Public-safe recruiter case-study snapshots. This table never references private project rows.';
comment on table public.published_editorials is
  'Public-safe Editorial Collection snapshots. This table never exposes private editorials directly.';

-- The unique constraints already index public URL lookups. These supporting
-- indexes keep owner operations and username listings fast under RLS.
create index if not exists portfolio_profiles_user_id_idx
  on public.portfolio_profiles (user_id);
create index if not exists published_portfolio_projects_user_id_idx
  on public.published_portfolio_projects (user_id);
create index if not exists published_portfolio_projects_username_slug_idx
  on public.published_portfolio_projects (username_slug);
create index if not exists published_editorials_user_id_idx
  on public.published_editorials (user_id);
create index if not exists published_editorials_username_slug_idx
  on public.published_editorials (username_slug);

alter table public.portfolio_profiles enable row level security;
alter table public.published_portfolio_projects enable row level security;
alter table public.published_editorials enable row level security;

-- Owners can inspect all of their own public and unpublished snapshots.
-- Anonymous visitors can read only rows deliberately marked public.
drop policy if exists "Public can read published portfolio profiles" on public.portfolio_profiles;
create policy "Public can read published portfolio profiles"
  on public.portfolio_profiles for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Owners can read own portfolio profiles" on public.portfolio_profiles;
create policy "Owners can read own portfolio profiles"
  on public.portfolio_profiles for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can insert own portfolio profiles" on public.portfolio_profiles;
create policy "Owners can insert own portfolio profiles"
  on public.portfolio_profiles for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can update own portfolio profiles" on public.portfolio_profiles;
create policy "Owners can update own portfolio profiles"
  on public.portfolio_profiles for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can delete own portfolio profiles" on public.portfolio_profiles;
create policy "Owners can delete own portfolio profiles"
  on public.portfolio_profiles for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Public can read published portfolio projects" on public.published_portfolio_projects;
create policy "Public can read published portfolio projects"
  on public.published_portfolio_projects for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Owners can read own published portfolio projects" on public.published_portfolio_projects;
create policy "Owners can read own published portfolio projects"
  on public.published_portfolio_projects for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can insert own published portfolio projects" on public.published_portfolio_projects;
create policy "Owners can insert own published portfolio projects"
  on public.published_portfolio_projects for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can update own published portfolio projects" on public.published_portfolio_projects;
create policy "Owners can update own published portfolio projects"
  on public.published_portfolio_projects for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can delete own published portfolio projects" on public.published_portfolio_projects;
create policy "Owners can delete own published portfolio projects"
  on public.published_portfolio_projects for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Public can read published editorials" on public.published_editorials;
create policy "Public can read published editorials"
  on public.published_editorials for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Owners can read own published editorials" on public.published_editorials;
create policy "Owners can read own published editorials"
  on public.published_editorials for select
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can insert own published editorials" on public.published_editorials;
create policy "Owners can insert own published editorials"
  on public.published_editorials for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can update own published editorials" on public.published_editorials;
create policy "Owners can update own published editorials"
  on public.published_editorials for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Owners can delete own published editorials" on public.published_editorials;
create policy "Owners can delete own published editorials"
  on public.published_editorials for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Explicit grants support the secure-by-default Data API. RLS above remains
-- authoritative: anon can only SELECT public snapshots and can never mutate.
grant select on table public.portfolio_profiles to anon;
grant select, insert, update, delete on table public.portfolio_profiles to authenticated;
grant select on table public.published_portfolio_projects to anon;
grant select, insert, update, delete on table public.published_portfolio_projects to authenticated;
grant select on table public.published_editorials to anon;
grant select, insert, update, delete on table public.published_editorials to authenticated;

-- Reuse Mystic Lore's shared timestamp helper for all three snapshot tables.
drop trigger if exists set_portfolio_profiles_updated_at on public.portfolio_profiles;
create trigger set_portfolio_profiles_updated_at
  before update on public.portfolio_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_published_portfolio_projects_updated_at on public.published_portfolio_projects;
create trigger set_published_portfolio_projects_updated_at
  before update on public.published_portfolio_projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_published_editorials_updated_at on public.published_editorials;
create trigger set_published_editorials_updated_at
  before update on public.published_editorials
  for each row execute function public.set_updated_at();
