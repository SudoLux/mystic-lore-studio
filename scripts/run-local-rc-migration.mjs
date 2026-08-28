import { spawnSync } from 'node:child_process';

const status = spawnSync(
  'node_modules/.bin/supabase',
  ['status', '--output', 'json'],
  { cwd: process.cwd(), encoding: 'utf8' },
);

if (status.status !== 0) {
  process.stderr.write(status.stderr || 'Unable to read local Supabase status.\n');
  process.exit(status.status ?? 1);
}

const local = JSON.parse(status.stdout);
const apiUrl = local.API_URL;
const serviceRoleKey = local.SERVICE_ROLE_KEY;

if (!apiUrl || !serviceRoleKey) {
  process.stderr.write('Local Supabase status did not include API_URL and SERVICE_ROLE_KEY.\n');
  process.exit(1);
}

const test = spawnSync(
  'node_modules/.bin/vitest',
  ['run', 'tests/wp10ReleaseCandidateMigration.integration.test.ts', '--reporter=verbose'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      RC_SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
      RC_SUPABASE_URL: apiUrl,
      RUN_LOCAL_SUPABASE_RC: '1',
    },
    stdio: 'inherit',
  },
);

process.exit(test.status ?? 1);
