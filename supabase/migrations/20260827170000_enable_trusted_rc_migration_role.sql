-- Allow the trusted, server-only migration runner to execute the canonical
-- non-destructive upsert plan. Browser clients never receive this role/key.

begin;

grant usage on schema ml_private to service_role;
grant select, insert, update on all tables in schema ml_private to service_role;
grant usage, select on all sequences in schema ml_private to service_role;

grant usage on schema ml_public to service_role;
grant select on all tables in schema ml_public to service_role;

alter default privileges in schema ml_private
  grant select, insert, update on tables to service_role;
alter default privileges in schema ml_private
  grant usage, select on sequences to service_role;
alter default privileges in schema ml_public
  grant select on tables to service_role;

comment on schema ml_private is
  'Canonical private Studio 2.0 graph. Member access uses RLS; service_role has narrowly scoped non-destructive migration privileges.';

commit;
