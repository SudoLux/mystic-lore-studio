import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const protectedProductionRef = 'jsjhqnmlgceunlxgenkg';
const requiredEvidence = [
  'cross-device.json',
  'backup-restore.json',
  'accessibility-manual.json',
  'deployed-performance.json',
] as const;

type EvidenceRecord = Record<string, unknown> & { passed?: boolean };
type Gate = { evidence: string; gate: string; issue: string | null; severity: 'Critical' | 'High' | 'Medium' | 'None'; status: 'pass' | 'blocked' };

try {
const url = required('ML_BETA_SUPABASE_URL');
const serviceRoleKey = process.env.ML_BETA_SERVICE_ROLE_KEY?.trim()
  || process.env.ML_BETA_SUPABASE_SERVICE_ROLE_KEY?.trim()
  || required('ML_BETA_SERVICE_ROLE_KEY');
const anonKey = required('ML_BETA_SUPABASE_ANON_KEY');
const studioId = required('ML_BETA_STUDIO_ID');
const projectRef = process.env.ML_BETA_PROJECT_REF || new URL(url).hostname.split('.')[0];
if (projectRef === protectedProductionRef || process.env.ML_BETA_CONFIRM_ISOLATED !== 'true') {
  throw new Error('Beta audit refused: select a dedicated project and set ML_BETA_CONFIRM_ISOLATED=true. The configured production project is protected.');
}

const evidenceDir = resolve(process.env.ML_BETA_EVIDENCE_DIR || 'docs/implementation/evidence/wp10/beta-external');
const outputPath = resolve(process.env.ML_BETA_AUDIT_OUTPUT || 'docs/implementation/evidence/wp10/beta-audit-evidence.json');
const evidence = Object.fromEntries(await Promise.all(requiredEvidence.map(async (name) => [name, await loadEvidence(name, evidenceDir)])));
const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });

const settings = await service.schema('ml_private').from('studio_settings')
  .select('version_policy').eq('studio_id', studioId).maybeSingle();
if (settings.error) throw new Error(`Unable to read beta Studio policy: ${settings.error.message}`);
const policy = objectValue(settings.data?.version_policy);
const canonicalMode = policy.canonicalPersistence ?? policy.canonical_persistence;

const receiptCount = await exactCount(service, 'ml_private', 'canonical_operation_receipts', studioId);
const changeEventCount = await exactCount(service, 'ml_private', 'change_events', studioId);
const tombstoneCount = await exactCount(service, 'ml_private', 'sync_tombstones', studioId);
const publicCount = await exactCount(service, 'ml_public', 'publications', studioId);

const privateProbe = await anonymous.schema('ml_private').from('garments').select('id').eq('studio_id', studioId).limit(1);
const publicProbe = await anonymous.schema('ml_public').from('publications')
  .select('id,is_public').eq('studio_id', studioId).eq('is_public', true).limit(1000);

const crossDevice = evidence['cross-device.json'];
const restore = evidence['backup-restore.json'];
const accessibility = evidence['accessibility-manual.json'];
const performance = evidence['deployed-performance.json'];
const gates: Gate[] = [
  gate('Canonical cloud authority', canonicalMode === 'cloud', `studio_settings reports ${String(canonicalMode ?? 'missing')} instead of cloud.`, 'Critical', `mode=${String(canonicalMode)}; receipts=${receiptCount}; events=${changeEventCount}; tombstones=${tombstoneCount}`),
  gate('Cross-device convergence', crossDevice?.passed === true && crossDevice.outboxEmpty === true && crossDevice.secondDeviceMatched === true && crossDevice.unauthorizedDenied === true, 'Two-profile convergence, empty outbox, or unauthorized denial evidence is incomplete.', 'Critical', digestEvidence(crossDevice)),
  gate('Anonymous privacy boundary', Boolean(privateProbe.error) && !publicProbe.error && (publicProbe.data ?? []).every((row) => row.is_public === true), 'Anonymous private denial or public-only publication read was not proven.', 'Critical', `privateDenied=${Boolean(privateProbe.error)}; publicRows=${publicProbe.data?.length ?? 0}; servicePublicRows=${publicCount}`),
  gate('Database and Storage recovery', restore?.passed === true && equalNonEmpty(restore?.databaseChecksum, restore?.restoredDatabaseChecksum) && equalNonEmpty(restore?.storageChecksum, restore?.restoredStorageChecksum), 'Isolated database and Storage restore checksums are incomplete or differ.', 'High', digestEvidence(restore)),
  gate('Assistive technology and devices', accessibility?.passed === true && accessibility.voiceOverSafari === true && accessibility.nvdaFirefox === true && accessibility.reflow200 === true && accessibility.physicalTouch === true, 'VoiceOver/Safari, NVDA/Firefox, 200% reflow, or physical touch evidence is incomplete.', 'High', digestEvidence(accessibility)),
  gate('Deployed performance', performancePasses(performance), 'Deployed LCP/INP/CLS or representative grid/media measurement is missing or outside the release budget.', 'High', digestEvidence(performance)),
];

const report = {
  auditedAt: new Date().toISOString(),
  decision: gates.some((item) => item.status === 'blocked') ? 'BLOCKED' : 'PASS',
  evidenceDirectory: evidenceDir,
  gates,
  projectRef,
  studioId,
  summary: { changeEventCount, publicCount, receiptCount, tombstoneCount },
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.decision !== 'PASS') process.exitCode = 1;
} catch (reason) {
  const outputPath = resolve(process.env.ML_BETA_AUDIT_OUTPUT || 'docs/implementation/evidence/wp10/beta-audit-evidence.json');
  const report = {
    auditedAt: new Date().toISOString(),
    decision: 'BLOCKED',
    gates: [{
      evidence: 'configuration/evidence preflight',
      gate: 'Isolated beta audit',
      issue: reason instanceof Error ? reason.message : 'The isolated beta audit could not run.',
      severity: 'High',
      status: 'blocked',
    }],
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required. audit:beta never defaults to the configured hosted project.`);
  return value;
}

async function loadEvidence(name: typeof requiredEvidence[number], directory: string): Promise<EvidenceRecord | null> {
  try {
    return JSON.parse(await readFile(resolve(directory, name), 'utf8')) as EvidenceRecord;
  } catch {
    return null;
  }
}

async function exactCount(client: unknown, schema: string, table: string, betaStudioId: string) {
  const dynamicClient = client as {
    schema(name: string): {
      from(name: string): {
        select(columns: string, options: { count: 'exact'; head: true }): {
          eq(column: string, value: string): PromiseLike<{ count: number | null; error: { message: string } | null }>;
        };
      };
    };
  };
  const response = await dynamicClient.schema(schema).from(table).select('*', { count: 'exact', head: true }).eq('studio_id', betaStudioId);
  if (response.error) throw new Error(`${schema}.${table} count failed: ${response.error.message}`);
  return response.count ?? 0;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function gate(gateName: string, passed: boolean, issue: string, severity: Gate['severity'], evidenceText: string): Gate {
  return { evidence: evidenceText, gate: gateName, issue: passed ? null : issue, severity: passed ? 'None' : severity, status: passed ? 'pass' : 'blocked' };
}

function digestEvidence(value: EvidenceRecord | null) {
  if (!value) return 'missing';
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function equalNonEmpty(left: unknown, right: unknown) {
  return typeof left === 'string' && left.length > 0 && left === right;
}

function performancePasses(value: EvidenceRecord | null) {
  if (!value || value.passed !== true) return false;
  const lcp = Number(value.lcpP75Ms);
  const inp = Number(value.inpP75Ms);
  const cls = Number(value.clsP75);
  return Number.isFinite(lcp) && lcp <= 2_500
    && Number.isFinite(inp) && inp <= 200
    && Number.isFinite(cls) && cls <= 0.1
    && value.grid1000RowsMeasured === true
    && value.mediaScenarioMeasured === true;
}
