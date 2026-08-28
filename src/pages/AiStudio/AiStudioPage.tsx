import { Bot, LockKeyhole, Plus, ShieldCheck, Sparkles, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AiCandidatePanel } from '../../components/ai/AiCandidatePanel';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { PageHeader } from '../../components/shared/PageHeader';
import { acceptAiArtifact, aiWorkflowLabels, completeAiJobWithFakeProvider, defaultAiInputRefs, failAiJob, queueAiJob, rejectAiArtifact, retryAiJob, startAiJob } from '../../domains/ai';
import type { AiWorkflow } from '../../domains/workspace';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { recordClientEvent } from '../../lib/observability';
import {
  acceptAiArtifactCommand,
  recordAiValidationCandidateCommand,
  rejectAiArtifactCommand,
  transitionAiJobCommand,
} from '../../domains/persistence';

const workflows = Object.keys(aiWorkflowLabels) as AiWorkflow[];

export function AiStudioPage() { return <CanonicalWorkspaceState><AiStudioWorkspace /></CanonicalWorkspaceState>; }

function AiStudioWorkspace() {
  const { commitWorkspaceAsync, currentActorId, requireFreshWorkspace, state } = useCanonicalWorkspace();
  const [garmentId, setGarmentId] = useState(state?.garments[0]?.id ?? '');
  const [workflow, setWorkflow] = useState<AiWorkflow>('pom_assistance');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { if (!garmentId && state?.garments[0]) setGarmentId(state.garments[0].id); }, [garmentId, state?.garments]);
  if (!state) return null;
  const jobs = state.aiJobs.filter((item) => item.garmentId === garmentId);
  const conflicts = state.conflicts.filter((item) => item.garmentId === garmentId && item.resolution === 'pending').length;
  const offline = navigator.onLine === false;

  const queue = () => run('queue', async () => {
    let jobId = '';
    await commitWorkspaceAsync((current) => { const result = queueAiJob(current, { actorId: currentActorId, garmentId, inputRefs: defaultAiInputRefs(current, garmentId, workflow), promptTemplateVersion: `wp9-${workflow}-v1`, selectedModel: 'deterministic-fake-v1', workflow }); jobId = result.job.id; return result.state; }, { skipAutoLedger: true });
    setNotice(jobId ? 'Candidate request queued with version-pinned private inputs.' : 'Candidate request is already queued.');
  });
  const start = (jobId: string) => run(jobId, async () => {
    const fresh = await requireFreshWorkspace();
    const current = fresh.aiJobs.find((item) => item.id === jobId);
    if (!current) throw new Error('AI job not found.');
    startAiJob(fresh, jobId);
    await transitionAiJobCommand({ expectedRevision: current.revision, jobId, status: 'running' });
    await requireFreshWorkspace();
  });
  const generate = (jobId: string) => run(jobId, async () => {
    const fresh = await requireFreshWorkspace();
    const current = fresh.aiJobs.find((item) => item.id === jobId);
    if (!current) throw new Error('AI job not found.');
    try {
      const generated = completeAiJobWithFakeProvider(fresh, jobId);
      await transitionAiJobCommand({ artifact: generated.artifact, expectedRevision: current.revision, jobId, status: 'candidate' });
    } catch (error) {
      recordClientEvent({ context: { stage: 'candidate_generation' }, kind: 'ai_job' });
      failAiJob(fresh, jobId, 'candidate_generation_failed');
      await transitionAiJobCommand({ errorCode: 'candidate_generation_failed', expectedRevision: current.revision, jobId, status: 'failed' });
      throw error;
    }
    await requireFreshWorkspace();
  });
  const retry = (jobId: string) => run(jobId, async () => {
    await requireFreshWorkspace();
    await commitWorkspaceAsync((current) => retryAiJob(current, jobId, currentActorId).state, { skipAutoLedger: true });
  });
  const accept = (artifactId: string, selectedFieldKeys: string[], decisionNote: string) => run(artifactId, async () => {
    const fresh = await requireFreshWorkspace();
    if (fresh.conflicts.some((item) => item.garmentId === garmentId && item.resolution === 'pending')) throw new Error('Resolve garment conflicts before AI acceptance.');
    const artifact = fresh.aiArtifacts.find((item) => item.id === artifactId);
    if (!artifact) throw new Error('AI artifact not found.');
    const operationId = stableAcceptanceOperationId(artifactId, selectedFieldKeys, decisionNote);
    const result = acceptAiArtifact(fresh, { actorId: currentActorId, actorRole: 'owner', artifactId, decisionNote, online: true, operationId, selectedFieldKeys });
    const domainOnly = {
      ...result.state,
      aiAcceptanceCommands: fresh.aiAcceptanceCommands,
      aiAcceptances: fresh.aiAcceptances,
      aiArtifacts: fresh.aiArtifacts,
      aiJobs: fresh.aiJobs,
      changeEvents: fresh.changeEvents,
    };
    let eventIds: string[];
    if (artifact.artifactType === 'tech_pack_validation') {
      const runRecord = result.state.validationRuns.find((item) => !fresh.validationRuns.some((current) => current.id === item.id));
      if (!runRecord) throw new Error('AI validation acceptance did not produce a validation run.');
      const validationReceipt = await recordAiValidationCandidateCommand({ artifactId, operationId, run: runRecord });
      eventIds = [String(validationReceipt.eventId)];
    } else {
      const commitResult = await commitWorkspaceAsync(() => domainOnly, {
        excludeEntities: ['ai_jobs'],
        operationId,
        origin: 'ai_acceptance',
        skipAutoLedger: true,
      });
      if (!commitResult || commitResult.status === 'conflict' || !commitResult.eventIds.length) {
        throw new Error('AI acceptance domain commands did not produce server change receipts.');
      }
      eventIds = commitResult.eventIds;
    }
    const commandType = acceptanceCommandType(artifact.artifactType);
    await acceptAiArtifactCommand({
      acceptedPayloadChecksum: result.acceptance.acceptedPayloadChecksum,
      artifactId,
      commandReceipts: selectedFieldKeys.map((fieldKey, index) => ({
        changeEventId: eventIds[Math.min(index, eventIds.length - 1)],
        commandType,
        fieldKey,
      })),
      decisionNote,
      expectedSourceChecksum: artifact.sourceChecksum,
      operationId,
    });
    await requireFreshWorkspace();
    setNotice(`Accepted ${selectedFieldKeys.length} candidate field${selectedFieldKeys.length === 1 ? '' : 's'} through ${eventIds.length} normal server command receipt${eventIds.length === 1 ? '' : 's'}.`);
  });
  const reject = (artifactId: string, decisionNote: string) => run(artifactId, async () => {
    const fresh = await requireFreshWorkspace();
    rejectAiArtifact(fresh, { actorId: currentActorId, actorRole: 'owner', artifactId, decisionNote });
    await rejectAiArtifactCommand(artifactId, decisionNote);
    await requireFreshWorkspace();
  });

  async function run(id: string, action: () => void | Promise<void>) { setBusyId(id); setNotice(''); try { await action(); } catch (error) { recordClientEvent({ context: { stage: 'ai_command' }, kind: 'ai_job' }); setNotice(message(error)); } finally { setBusyId(''); } }

  return <section className="space-y-5">
    <MobilePageHeader badge="AI Jobs" kicker="Private candidates, human decisions" title="Governed AI" />
    <PageHeader badge="WP9 · designer authority" description="Generate private, reviewable candidates; inspect their sources; then accept selected fields through the same commands, validation, permissions, and change ledger as manual work." title="AI Jobs"><Badge variant="teal"><ShieldCheck size={13} /> Candidate-only</Badge></PageHeader>
    {notice ? <div aria-live="polite" className="rounded-xl border border-bronze/28 bg-espresso/35 p-3 text-sm text-stardust/72">{notice}</div> : null}
    {offline ? <div className="flex items-center gap-3 rounded-xl border border-ember/35 bg-ember/10 p-4 text-sm"><WifiOff size={17} className="text-ember" /> Generation evidence remains available, but acceptance requires a fresh connection.</div> : null}
    {conflicts ? <div className="rounded-xl border border-ember/35 bg-ember/10 p-4 text-sm">Resolve {conflicts} garment conflict{conflicts === 1 ? '' : 's'} before committing an AI candidate.</div> : null}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <main className="min-w-0 space-y-5">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-ember">New request</p><h2 className="font-display mt-2 text-2xl">Choose a bounded workflow</h2></div><Bot className="text-ember" size={22} /></div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block"><span className="field-label">Garment</span><select className="field" onChange={(event) => setGarmentId(event.target.value)} value={garmentId}>{state.garments.map((item) => <option key={item.id} value={item.id}>{item.garmentCode} · {item.title}</option>)}</select></label>
            <label className="block"><span className="field-label">Candidate workflow</span><select className="field" onChange={(event) => setWorkflow(event.target.value as AiWorkflow)} value={workflow}>{workflows.map((item) => <option key={item} value={item}>{aiWorkflowLabels[item]}</option>)}</select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-bronze/18 bg-midnight/32 p-4"><div><p className="text-sm font-medium">deterministic-fake-v1</p><p className="mt-1 text-xs text-stardust/45">No paid model call · no raw prompt stored · repeatable test output</p></div><Button disabled={!garmentId || busyId === 'queue'} icon={<Plus size={16} />} onClick={queue} variant="primary">Queue candidate</Button></div>
        </Card>

        {jobs.length ? jobs.map((job) => { const artifact = state.aiArtifacts.find((item) => item.jobId === job.id) ?? null; return <AiCandidatePanel artifact={artifact} busy={busyId === job.id || busyId === artifact?.id} job={job} key={job.id} onAccept={(keys, note) => artifact && accept(artifact.id, keys, note)} onGenerate={() => generate(job.id)} onReject={(note) => artifact && reject(artifact.id, note)} onRetry={() => retry(job.id)} onStart={() => start(job.id)} state={state} />; }) : <Card><div className="py-10 text-center"><Sparkles className="mx-auto text-stardust/24" size={32} /><h2 className="font-display mt-4 text-2xl">No AI jobs for this garment</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stardust/50">Queue a narrow candidate workflow. Nothing can enter measurements, BOM, construction, releases, costs, suppliers, or publications until you explicitly review and accept it.</p></div></Card>}
      </main>

      <aside className="space-y-4">
        <Card><div className="flex items-center gap-2"><LockKeyhole className="text-ember" size={18} /><h2 className="font-display text-xl">Trust boundary</h2></div><ul className="mt-4 space-y-3 text-sm leading-6 text-stardust/58"><li>Jobs, inputs, logs, artifacts, and generated media stay private.</li><li>Candidates have no direct domain-write capability.</li><li>Acceptance reuses normal domain validation and emits attributable change events.</li><li>Portfolio copy still passes the Public Cut privacy gate before anonymous access.</li></ul></Card>
        <Card><p className="text-xs uppercase tracking-[0.14em] text-ember">Decision states</p><div className="mt-4 space-y-2 text-sm text-stardust/58">{['Queued', 'Running', 'Candidate', 'Accepted', 'Rejected', 'Modified after generation'].map((label) => <div className="flex items-center gap-2" key={label}><span className="h-1.5 w-1.5 rounded-full bg-bronze" />{label}</div>)}</div></Card>
      </aside>
    </div>
  </section>;
}

function message(error: unknown) { return error instanceof Error ? error.message : 'The AI workflow could not be completed.'; }

function acceptanceCommandType(workflow: AiWorkflow) {
  const types: Record<AiWorkflow, string> = {
    bom_assistance: 'bom.create-item',
    construction_recommendations: 'construction.add-step',
    editorial_generation: 'editorial.add-block',
    pom_assistance: 'measurement.create-pom',
    portfolio_drafting: 'portfolio.update-project',
    tech_pack_validation: 'technical.run-validation',
    technical_flat_generation: 'technical.register-flat',
  };
  return types[workflow];
}

function stableAcceptanceOperationId(artifactId: string, selectedFieldKeys: string[], decisionNote: string) {
  const input = `${artifactId}:${[...selectedFieldKeys].sort().join(',')}:${decisionNote.trim()}`;
  let a = 0x811c9dc5;
  let b = 0x9e3779b9;
  for (let index = 0; index < input.length; index += 1) {
    a = Math.imul(a ^ input.charCodeAt(index), 0x01000193);
    b = Math.imul(b ^ input.charCodeAt(index), 0x85ebca6b);
  }
  const hex = `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`.repeat(2);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
