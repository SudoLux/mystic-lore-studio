-- Public recruiter portfolios are stored as sanitized, read-only snapshots.
-- Private project rows, tasks, notes, and studio state remain owner-only.
create table if not exists public.portfolio_publications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username_slug text not null unique,
  snapshot jsonb not null default '{}'::jsonb,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint portfolio_publications_slug_format
    check (username_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

comment on table public.portfolio_publications is
  'Sanitized recruiter-facing portfolio snapshots explicitly published by studio owners.';

create index if not exists portfolio_publications_username_slug_idx
  on public.portfolio_publications (username_slug);

alter table public.portfolio_publications enable row level security;

drop policy if exists "Public can read published portfolios" on public.portfolio_publications;
create policy "Public can read published portfolios"
  on public.portfolio_publications for select
  to anon, authenticated
  using (true);

drop policy if exists "Users can insert own portfolio publication" on public.portfolio_publications;
create policy "Users can insert own portfolio publication"
  on public.portfolio_publications for insert
  to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update own portfolio publication" on public.portfolio_publications;
create policy "Users can update own portfolio publication"
  on public.portfolio_publications for update
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
  with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete own portfolio publication" on public.portfolio_publications;
create policy "Users can delete own portfolio publication"
  on public.portfolio_publications for delete
  to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

-- Data API grants are explicit for compatibility with Supabase's 2026
-- secure-by-default table exposure behavior. RLS remains authoritative.
grant select on table public.portfolio_publications to anon;
grant select, insert, update, delete on table public.portfolio_publications to authenticated;

-- Published portfolio imagery is deliberately separated from the private
-- project-images bucket. Only owners can write under their user path, while
-- the resulting public URLs are suitable for recruiter-facing pages.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio-images',
  'portfolio-images',
  true,
  6291456,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own portfolio images" on storage.objects;
create policy "Users can read own portfolio images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "Users can upload own portfolio images" on storage.objects;
create policy "Users can upload own portfolio images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "Users can update own portfolio images" on storage.objects;
create policy "Users can update own portfolio images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own portfolio images" on storage.objects;
create policy "Users can delete own portfolio images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'portfolio-images'
    and (storage.foldername(name))[1] = 'users'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
