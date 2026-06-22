-- Mystic Lore Studio data and image sync support.
-- App-facing IDs remain stable in client_id while database relations use UUIDs.

alter table public.profiles
  add column if not exists cloud_migration_completed_at timestamptz;

alter table public.projects add column if not exists client_id text;
alter table public.tasks add column if not exists client_id text;
alter table public.notes add column if not exists client_id text;
alter table public.fabrics add column if not exists client_id text;
alter table public.materials add column if not exists client_id text;
alter table public.project_images add column if not exists client_id text;
alter table public.yardage_entries add column if not exists client_id text;

update public.projects set client_id = id::text where client_id is null;
update public.tasks set client_id = id::text where client_id is null;
update public.notes set client_id = id::text where client_id is null;
update public.fabrics set client_id = id::text where client_id is null;
update public.materials set client_id = id::text where client_id is null;
update public.project_images set client_id = id::text where client_id is null;
update public.yardage_entries set client_id = id::text where client_id is null;

alter table public.projects alter column client_id set not null;
alter table public.tasks alter column client_id set not null;
alter table public.notes alter column client_id set not null;
alter table public.fabrics alter column client_id set not null;
alter table public.materials alter column client_id set not null;
alter table public.project_images alter column client_id set not null;
alter table public.yardage_entries alter column client_id set not null;

create unique index if not exists projects_user_client_id_uidx
  on public.projects(user_id, client_id);
create unique index if not exists tasks_user_client_id_uidx
  on public.tasks(user_id, client_id);
create unique index if not exists notes_user_client_id_uidx
  on public.notes(user_id, client_id);
create unique index if not exists fabrics_user_client_id_uidx
  on public.fabrics(user_id, client_id);
create unique index if not exists materials_user_client_id_uidx
  on public.materials(user_id, client_id);
create unique index if not exists project_images_user_client_id_uidx
  on public.project_images(user_id, client_id);
create unique index if not exists yardage_entries_user_client_id_uidx
  on public.yardage_entries(user_id, client_id);

alter table public.project_images
  rename column image_role to slot_type;
alter table public.project_images
  rename column object_fit to fit;
alter table public.project_images
  rename column object_position_x to position_x;
alter table public.project_images
  rename column object_position_y to position_y;

alter table public.project_images
  add column if not exists filename text,
  add column if not exists mime_type text,
  add column if not exists size_bytes bigint,
  add column if not exists width integer,
  add column if not exists height integer;

alter table public.fabrics
  add column if not exists image_filename text,
  add column if not exists image_mime_type text,
  add column if not exists image_size_bytes bigint,
  add column if not exists image_width integer,
  add column if not exists image_height integer,
  add column if not exists image_fit text default 'cover',
  add column if not exists image_position_x numeric(6,2) default 50,
  add column if not exists image_position_y numeric(6,2) default 50,
  add column if not exists image_zoom numeric(6,2) default 1;

create index if not exists project_images_project_slot_idx
  on public.project_images(project_id, slot_type, display_order);

-- Lookbook content is synchronized separately so edits do not overwrite the
-- rest of the project row.
create table if not exists public.lookbook_pages (
  id uuid primary key default gen_random_uuid(),
  client_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);

comment on table public.lookbook_pages is
  'User-owned project lookbook page content synchronized across devices.';

create index if not exists lookbook_pages_user_id_idx
  on public.lookbook_pages(user_id);
create index if not exists lookbook_pages_project_id_idx
  on public.lookbook_pages(project_id);

create trigger set_lookbook_pages_updated_at
  before update on public.lookbook_pages
  for each row execute function public.set_updated_at();

alter table public.lookbook_pages enable row level security;

create policy "Authenticated users can select own lookbook pages"
  on public.lookbook_pages for select to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Authenticated users can insert own lookbook pages"
  on public.lookbook_pages for insert to authenticated
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1 from public.projects
      where projects.id = lookbook_pages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can update own lookbook pages"
  on public.lookbook_pages for update to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (
    auth.uid() is not null
    and auth.uid() = user_id
    and exists (
      select 1 from public.projects
      where projects.id = lookbook_pages.project_id
        and projects.user_id = auth.uid()
    )
  );

create policy "Authenticated users can delete own lookbook pages"
  on public.lookbook_pages for delete to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

-- Private storage bucket for project, lookbook, and Fabric Vault images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-images',
  'project-images',
  false,
  6291456,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can read own project images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can upload own project images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can update own project images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "Users can delete own project images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
