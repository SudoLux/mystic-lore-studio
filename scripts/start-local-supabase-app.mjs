import { spawn } from 'node:child_process';
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
const anonKey = local.ANON_KEY ?? local.PUBLISHABLE_KEY;
if (!apiUrl || !anonKey) {
  process.stderr.write('Local Supabase status did not include API_URL and an anonymous key.\n');
  process.exit(1);
}

const vite = spawn(
  'node_modules/.bin/vite',
  ['--host', '127.0.0.1', '--port', '4173'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_SUPABASE_ANON_KEY: anonKey,
      VITE_SUPABASE_URL: apiUrl,
    },
    stdio: 'inherit',
  },
);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => vite.kill(signal));
}
vite.on('exit', (code) => process.exit(code ?? 0));
