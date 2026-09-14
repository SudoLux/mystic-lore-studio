begin;

-- commit_canonical_operation preflights every target with SELECT ... FOR
-- UPDATE. PostgreSQL requires some UPDATE privilege for that row lock even
-- when the requested inventory mutation is an INSERT. Inventory remains
-- append-only: only the immutable identity column is granted, there is no
-- inventory UPDATE RLS policy, and the canonical operation command rejects
-- every inventory action except insert.
grant update (id) on table ml_private.inventory_entries to authenticated;

commit;
