-- Mystic Lore Studio cloud sync foundation schema.
-- This migration creates user-owned tables only; no service-role logic and no
-- public read access are included.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at timestamps for Mystic Lore Studio user-owned rows.';

-- Stores one profile record per authenticated Supabase user.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  studio_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'User profile and studio identity metadata for Mystic Lore Studio.';

-- Stores apparel project records such as garments, capsule pieces, and collections.
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  garment_type text,
  collection_name text,
  season text,
  status text,
  workflow_phase text,
  priority text,
  difficulty text,
  progress numeric(5,2) not null default 0 check (progress >= 0 and progress <= 100),
  design_intent text,
  description text,
  target_wearer text,
  silhouette text,
  key_features text[] not null default '{}',
  color_story text,
  start_date date,
  due_date date,
  general_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is
  'Apparel project records that drive the project library, detail pages, and global Kanban workflow.';

-- Stores fabric inventory records for the Fabric Vault.
create table public.fabrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  fabric_type text,
  color_family text,
  primary_color text,
  secondary_colors text[] not null default '{}',
  yardage_total numeric(8,2) not null default 0 check (yardage_total >= 0),
  width_inches numeric(8,2) check (width_inches is null or width_inches >= 0),
  fiber_content text,
  weave_or_knit text,
  weight text,
  stretch text,
  opacity text,
  drape text,
  hand_feel text,
  texture text,
  structure text,
  supplier text,
  purchase_date date,
  cost_per_yard numeric(10,2) check (cost_per_yard is null or cost_per_yard >= 0),
  storage_location text,
  bin_number text,
  shelf text,
  storage_status text,
  archive_status text,
  rarity text,
  best_uses text[] not null default '{}',
  care_notes text,
  mood_tags text[] not null default '{}',
  lore_note text,
  image_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.fabrics is
  'Fabric Vault inventory records including yardage, material properties, storage details, and visual metadata.';

-- Stores material allocations and fabric-to-project links.
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  fabric_id uuid references public.fabrics(id) on delete set null,
  material_name text,
  role text not null,
  status text,
  yardage_needed numeric(8,2) not null default 0 check (yardage_needed >= 0),
  yardage_reserved numeric(8,2) not null default 0 check (yardage_reserved >= 0),
  yardage_used numeric(8,2) not null default 0 check (yardage_used >= 0),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.materials is
  'Linked project materials, including fabric allocations, roles, statuses, and yardage planning values.';

-- Stores task-board cards for individual apparel projects.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'To Do',
  category text,
  priority text,
  due_date date,
  notes text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is
  'Project-specific task records used by garment task boards and workflow planning.';

-- Stores organized studio journal notes for each apparel project.
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  category text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notes is
  'Categorized project journal notes such as design notes, construction notes, fit notes, and build logs.';

-- Stores project image references for hero, gallery, and lookbook display surfaces.
create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  image_role text not null,
  storage_path text,
  alt_text text,
  display_order integer not null default 0,
  object_fit text not null default 'cover',
  object_position_x numeric(6,2) not null default 50,
  object_position_y numeric(6,2) not null default 50,
  zoom numeric(6,2) not null default 1 check (zoom > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.project_images is
  'Image records and non-destructive display settings for project hero, gallery, and lookbook visuals.';

-- Stores transparent fabric reservation and usage events.
create table public.yardage_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  fabric_id uuid not null references public.fabrics(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  entry_type text not null,
  yardage numeric(8,2) not null check (yardage >= 0),
  notes text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.yardage_entries is
  'Audit-friendly yardage reservation, cutting, usage, and adjustment entries for fabric inventory tracking.';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger set_fabrics_updated_at
  before update on public.fabrics
  for each row execute function public.set_updated_at();

create trigger set_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create trigger set_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger set_notes_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

create trigger set_project_images_updated_at
  before update on public.project_images
  for each row execute function public.set_updated_at();

create trigger set_yardage_entries_updated_at
  before update on public.yardage_entries
  for each row execute function public.set_updated_at();

create index profiles_user_id_idx on public.profiles(user_id);
create index projects_user_id_idx on public.projects(user_id);
create index projects_user_phase_idx on public.projects(user_id, workflow_phase);
create index projects_user_status_idx on public.projects(user_id, status);
create index fabrics_user_id_idx on public.fabrics(user_id);
create index fabrics_user_archive_status_idx on public.fabrics(user_id, archive_status);
create index materials_user_id_idx on public.materials(user_id);
create index materials_project_id_idx on public.materials(project_id);
create index materials_fabric_id_idx on public.materials(fabric_id);
create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_project_status_idx on public.tasks(project_id, status);
create index notes_user_id_idx on public.notes(user_id);
create index notes_project_id_idx on public.notes(project_id);
create index project_images_user_id_idx on public.project_images(user_id);
create index project_images_project_id_idx on public.project_images(project_id);
create index yardage_entries_user_id_idx on public.yardage_entries(user_id);
create index yardage_entries_project_id_idx on public.yardage_entries(project_id);
create index yardage_entries_fabric_id_idx on public.yardage_entries(fabric_id);
create index yardage_entries_material_id_idx on public.yardage_entries(material_id);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.fabrics enable row level security;
alter table public.materials enable row level security;
alter table public.project_images enable row level security;
alter table public.yardage_entries enable row level security;

create policy "Authenticated users can select own profiles"
  on public.profiles for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own profiles"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can update own profiles"
  on public.profiles for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can delete own profiles"
  on public.profiles for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own projects"
  on public.projects for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own projects"
  on public.projects for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can update own projects"
  on public.projects for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can delete own projects"
  on public.projects for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own tasks"
  on public.tasks for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own tasks"
  on public.tasks for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = auth.uid()
    )
    and (
      material_id is null
      or exists (
        select 1
        from public.materials
        where materials.id = tasks.material_id
          and materials.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can update own tasks"
  on public.tasks for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = tasks.project_id
        and projects.user_id = auth.uid()
    )
    and (
      material_id is null
      or exists (
        select 1
        from public.materials
        where materials.id = tasks.material_id
          and materials.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can delete own tasks"
  on public.tasks for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own notes"
  on public.notes for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own notes"
  on public.notes for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = notes.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can update own notes"
  on public.notes for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = notes.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can delete own notes"
  on public.notes for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own fabrics"
  on public.fabrics for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own fabrics"
  on public.fabrics for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can update own fabrics"
  on public.fabrics for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can delete own fabrics"
  on public.fabrics for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own materials"
  on public.materials for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own materials"
  on public.materials for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = materials.project_id
        and projects.user_id = auth.uid()
    )
    and (
      fabric_id is null
      or exists (
        select 1
        from public.fabrics
        where fabrics.id = materials.fabric_id
          and fabrics.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can update own materials"
  on public.materials for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = materials.project_id
        and projects.user_id = auth.uid()
    )
    and (
      fabric_id is null
      or exists (
        select 1
        from public.fabrics
        where fabrics.id = materials.fabric_id
          and fabrics.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can delete own materials"
  on public.materials for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own project images"
  on public.project_images for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own project images"
  on public.project_images for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = project_images.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can update own project images"
  on public.project_images for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.projects
      where projects.id = project_images.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can delete own project images"
  on public.project_images for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can select own yardage entries"
  on public.yardage_entries for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own yardage entries"
  on public.yardage_entries for insert
  to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.fabrics
      where fabrics.id = yardage_entries.fabric_id
        and fabrics.user_id = auth.uid()
    )
    and (
      project_id is null
      or exists (
        select 1
        from public.projects
        where projects.id = yardage_entries.project_id
          and projects.user_id = auth.uid()
      )
    )
    and (
      material_id is null
      or exists (
        select 1
        from public.materials
        where materials.id = yardage_entries.material_id
          and materials.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can update own yardage entries"
  on public.yardage_entries for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1
      from public.fabrics
      where fabrics.id = yardage_entries.fabric_id
        and fabrics.user_id = auth.uid()
    )
    and (
      project_id is null
      or exists (
        select 1
        from public.projects
        where projects.id = yardage_entries.project_id
          and projects.user_id = auth.uid()
      )
    )
    and (
      material_id is null
      or exists (
        select 1
        from public.materials
        where materials.id = yardage_entries.material_id
          and materials.user_id = auth.uid()
      )
    )
  );

create policy "Authenticated users can delete own yardage entries"
  on public.yardage_entries for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);
