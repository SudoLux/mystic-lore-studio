-- DANGER: DEVELOPMENT RESET ONLY
--
-- Running this file permanently deletes all Mystic Lore Studio cloud records,
-- image objects, policies, triggers, and helper functions in this Supabase
-- project. Do not run it during normal setup and do not run it against a
-- production project unless you intentionally want to erase the app's data.

-- Remove the private image policies before removing the development bucket.
drop policy if exists "Users can read own project images" on storage.objects;
drop policy if exists "Users can upload own project images" on storage.objects;
drop policy if exists "Users can update own project images" on storage.objects;
drop policy if exists "Users can delete own project images" on storage.objects;

-- Delete stored files first because Supabase will not remove a non-empty bucket.
delete from storage.objects where bucket_id = 'project-images';
delete from storage.buckets where id = 'project-images';

-- Drop dependent app tables before their project/fabric parent tables.
drop table if exists public.sync_tombstones cascade;
drop table if exists public.lookbook_pages cascade;
drop table if exists public.yardage_entries cascade;
drop table if exists public.project_images cascade;
drop table if exists public.notes cascade;
drop table if exists public.tasks cascade;
drop table if exists public.materials cascade;
drop table if exists public.fabrics cascade;
drop table if exists public.projects cascade;
drop table if exists public.profiles cascade;

-- Remove only Mystic Lore helper functions. The shared pgcrypto extension is
-- intentionally retained because other Supabase features may use it.
drop function if exists public.clear_fabric_image_if_matches(text, text, text) cascade;
drop function if exists public.record_sync_tombstone(text, text, timestamptz) cascade;
drop function if exists public.guard_tombstoned_sync_row() cascade;
drop function if exists public.record_deleted_sync_row() cascade;
drop function if exists public.sync_entity_for_table(text) cascade;
drop function if exists public.set_updated_at() cascade;

-- After this reset finishes, rerun every file in supabase/migrations in
-- timestamp order to rebuild an empty Mystic Lore Studio cloud workspace.
