begin;

select plan(10);

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

select * from finish();
rollback;
