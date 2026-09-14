begin;

select plan(14);

select ok(has_schema_privilege('service_role', 'ml_private', 'usage'),
  'trusted service role can resolve the canonical private schema');
select ok(has_table_privilege('service_role', 'ml_private.garments', 'select'),
  'trusted service role can verify private migration rows');
select ok(has_table_privilege('service_role', 'ml_private.garments', 'insert'),
  'trusted service role can insert private migration rows');
select ok(has_table_privilege('service_role', 'ml_private.garments', 'update'),
  'trusted service role can update changed private migration rows');
select ok(not has_table_privilege('service_role', 'ml_private.garments', 'delete'),
  'trusted migration role cannot delete canonical garment data');

select ok(has_schema_privilege('service_role', 'ml_public', 'usage'),
  'trusted service role can resolve public projection evidence');
select ok(has_table_privilege('service_role', 'ml_public.publications', 'select'),
  'trusted service role can verify public projection isolation');
select ok(not has_table_privilege('service_role', 'ml_public.publications', 'insert'),
  'trusted migration role cannot publish a Public Cut');
select ok(not has_schema_privilege('service_role', 'ml_internal', 'usage'),
  'trusted migration role cannot call internal security helpers');
select ok(not has_schema_privilege('anon', 'ml_private', 'usage'),
  'anonymous access remains excluded from the canonical private schema');
select ok(has_schema_privilege('authenticated', 'ml_private', 'usage'),
  'signed-in Studio users can resolve the canonical private schema');
select ok(has_table_privilege('authenticated', 'ml_private.inventory_entries', 'select'),
  'signed-in Studio users can hydrate the inventory ledger through RLS');
select ok(not has_table_privilege('anon', 'ml_private.inventory_entries', 'select'),
  'anonymous users cannot read the inventory ledger');
select ok(not has_table_privilege('authenticated', 'ml_private.inventory_entries', 'delete'),
  'signed-in Studio users cannot delete immutable inventory evidence directly');

select * from finish();
rollback;
