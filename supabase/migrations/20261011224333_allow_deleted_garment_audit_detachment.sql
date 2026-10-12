-- Deleting an editable garment preserves its audit entries. PostgreSQL clears
-- only their optional live-garment pointer via the existing foreign key.
-- Direct history edits, payload changes, and protected evidence stay forbidden.
create or replace function ml_internal.reject_history_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and tg_table_schema = 'ml_private' and tg_table_name = 'change_events' then
    if pg_catalog.pg_trigger_depth() > 1
    and current_setting('ml.canonical_operation_context', true) = 'on'
    and old.garment_id is not null and new.garment_id is null
    and (to_jsonb(new) - 'garment_id') = (to_jsonb(old) - 'garment_id')
    and not exists (
      select 1 from ml_private.garments
      where studio_id = old.studio_id and id = old.garment_id
    ) then
      return new;
    end if;
  end if;
  if tg_op = 'DELETE' and tg_table_name = 'change_events'
    and (current_setting('role', true) in ('postgres', 'supabase_admin') or (current_setting('role', true) in ('none', '') and session_user in ('postgres', 'supabase_admin')))
    and not exists (select 1 from ml_private.studios where id=old.studio_id) then
    return old;
  end if;
  raise exception 'Version history is append-only; create a new event or Freeze Frame.'
    using errcode = '23514';
end;
$$;
