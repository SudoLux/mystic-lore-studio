import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';

const dist = resolve('dist');
const assets = resolve(dist, 'assets');
const files = await readdir(assets);
const records = await Promise.all(files.map(async (name) => ({
  bytes: (await stat(join(assets, name))).size,
  name,
  type: extname(name),
})));
const budgets = { cssChunkBytes: 350 * 1024, imageBytes: 250 * 1024, jsChunkBytes: 500 * 1024 };
const failures = records.flatMap((record) => {
  const limit = record.type === '.js' ? budgets.jsChunkBytes
    : record.type === '.css' ? budgets.cssChunkBytes
      : ['.png', '.jpg', '.jpeg', '.webp'].includes(record.type) ? budgets.imageBytes : null;
  return limit !== null && record.bytes > limit
    ? [`${record.name} is ${record.bytes} bytes; budget is ${limit}.`]
    : [];
});
const index = await readFile(resolve(dist, 'index.html'));
const report = {
  budgets,
  checkedAt: new Date().toISOString(),
  decision: failures.length ? 'BLOCKED' : 'PASS',
  distChecksum: createHash('sha256').update(index).update(JSON.stringify(records)).digest('hex'),
  failures,
  largestCss: largest(records, '.css'),
  largestImage: largest(records, ['.png', '.jpg', '.jpeg', '.webp']),
  largestJs: largest(records, '.js'),
  routeChunkCount: records.filter((record) => record.type === '.js').length,
  totalBytes: records.reduce((sum, record) => sum + record.bytes, 0) + index.length,
};
const output = resolve('docs/implementation/evidence/wp10/bundle-budget.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

function largest(all, extensions) {
  const accepted = new Set(Array.isArray(extensions) ? extensions : [extensions]);
  return all.filter((record) => accepted.has(record.type)).sort((a, b) => b.bytes - a.bytes)[0] ?? null;
}
