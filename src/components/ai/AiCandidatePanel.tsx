import { AlertTriangle, Bot, Check, ChevronRight, Clock3, FileSearch, RefreshCw, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { aiCandidatePanelState, aiCommitConsequences, aiWorkflowLabels, inspectAiSources } from '../../domains/ai';
import type { CanonicalAiArtifact, CanonicalAiJob, CanonicalWorkspaceState } from '../../domains/workspace';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

type Props = {
  artifact: CanonicalAiArtifact | null;
  busy: boolean;
  job: CanonicalAiJob;
  onAccept: (fieldKeys: string[], decisionNote: string) => void;
  onGenerate: () => void;
  onReject: (decisionNote: string) => void;
  onRetry: () => void;
  onStart: () => void;
  state: CanonicalWorkspaceState;
};

export function AiCandidatePanel({ artifact, busy, job, onAccept, onGenerate, onReject, onRetry, onStart, state }: Props) {
  const panelState = aiCandidatePanelState(state, job, artifact);
  const sources = inspectAiSources(state, job);
  const [selected, setSelected] = useState<string[]>([]);
  const [decisionNote, setDecisionNote] = useState('');
  const wholeCandidateOnly = Boolean(artifact?.fields.some((item) => !item.safeForPartialAcceptance));
  useEffect(() => { setSelected(artifact?.fields.map((item) => item.key) ?? []); setDecisionNote(''); }, [artifact?.id]);
  const selectedCount = selected.length;
  const canDecide = panelState === 'candidate' && Boolean(artifact) && selectedCount > 0 && decisionNote.trim().length >= 8;
  const confidence = useMemo(() => Object.entries(artifact?.confidence ?? {}), [artifact]);

  return (
    <Card className="overflow-hidden p-0">
      <article aria-labelledby={`ai-job-${job.id}`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-bronze/18 p-5 sm:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={panelState === 'accepted' ? 'teal' : panelState === 'modified_after_generation' || panelState === 'failed' ? 'ember' : 'bronze'}>{statusLabel(panelState)}</Badge>
              <span className="text-xs text-stardust/38">Attempt {job.attemptNo}</span>
            </div>
            <h2 className="font-display mt-3 text-2xl" id={`ai-job-${job.id}`}>{aiWorkflowLabels[job.jobType]}</h2>
            <p className="mt-2 text-sm text-stardust/52">{job.selectedModel} · template {job.promptTemplateVersion}</p>
          </div>
          <Bot aria-hidden="true" className="text-ember" size={24} strokeWidth={1.6} />
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {panelState === 'queued' ? <StateMessage icon={<Clock3 size={18} />} title="Queued" copy="The request is private and has not produced an artifact yet."><Button disabled={busy} onClick={onStart} size="sm">Start job</Button></StateMessage> : null}
          {panelState === 'running' ? <StateMessage icon={<Sparkles size={18} />} title="Running" copy="The deterministic provider is ready to produce a testable candidate without a paid model call."><Button disabled={busy} onClick={onGenerate} size="sm" variant="primary">Generate candidate</Button></StateMessage> : null}
          {panelState === 'failed' ? <StateMessage icon={<AlertTriangle size={18} />} title="Provider failed" copy={`No domain data changed. Error: ${job.errorCode ?? 'unknown'}.`}><Button disabled={busy} icon={<RefreshCw size={15} />} onClick={onRetry} size="sm">Retry safely</Button></StateMessage> : null}
          {panelState === 'cancelled' ? <StateMessage icon={<X size={18} />} title="Cancelled" copy="The request ended without creating or changing a domain record."><Button disabled={busy} icon={<RefreshCw size={15} />} onClick={onRetry} size="sm">Create retry</Button></StateMessage> : null}
          {panelState === 'modified_after_generation' ? <StateMessage icon={<AlertTriangle size={18} />} title="Modified after generation" copy="One or more source revisions changed. Acceptance is blocked until a new candidate is generated from fresh inputs."><Button disabled={busy} icon={<RefreshCw size={15} />} onClick={onRetry} size="sm" variant="primary">Generate from current sources</Button></StateMessage> : null}

          {artifact ? (
            <>
              <details className="group rounded-xl border border-bronze/20 bg-midnight/35 p-4">
                <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-sm font-medium"><FileSearch size={16} className="text-ember" /> Inspect sources <ChevronRight className="ml-auto transition group-open:rotate-90" size={15} /></summary>
                <div className="mt-4 space-y-2 border-t border-bronze/14 pt-4">
                  {sources.map((source) => <div className="grid gap-1 rounded-lg bg-charcoal/55 p-3 text-xs sm:grid-cols-[10rem_1fr]" key={source.id}><span className="text-stardust/48">{source.entityType.replace(/_/g, ' ')}</span><span className="break-all font-mono text-stardust/70">{source.entityId} · r{source.entityRevision}{source.fieldPath ? ` · ${source.fieldPath}` : ''}</span></div>)}
                  <p className="break-all pt-2 font-mono text-[0.65rem] text-stardust/34">Source checksum {artifact.sourceChecksum}</p>
                </div>
              </details>

              <section aria-labelledby={`candidate-fields-${artifact.id}`}>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-xs uppercase tracking-[0.14em] text-ember">Reviewable artifact</p><h3 className="font-display mt-2 text-xl" id={`candidate-fields-${artifact.id}`}>Candidate fields</h3></div>
                  <span className="text-xs text-stardust/42">{selectedCount} of {artifact.fields.length} selected</span>
                </div>
                {wholeCandidateOnly ? (
                  <label className="mt-4 flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-bronze/22 bg-charcoal/45 p-4"><input checked={selectedCount === artifact.fields.length} className="mt-1 accent-ember" disabled={panelState !== 'candidate'} onChange={(event) => setSelected(event.target.checked ? artifact.fields.map((item) => item.key) : [])} type="checkbox" /><span><span className="block text-sm font-semibold">Select complete validated candidate</span><span className="mt-1 block text-xs leading-5 text-stardust/50">These findings share one deterministic ruleset run and cannot be partially committed.</span></span></label>
                ) : null}
                <fieldset className="mt-4 grid gap-3 md:grid-cols-2" disabled={panelState !== 'candidate'}>
                  <legend className="sr-only">Candidate field selection</legend>
                  {artifact.fields.map((field) => (
                    <label className="flex min-h-24 cursor-pointer items-start gap-3 rounded-xl border border-bronze/20 bg-charcoal/38 p-4 has-[:checked]:border-ember/45 has-[:checked]:bg-ember/8" key={field.key}>
                      {!wholeCandidateOnly ? <input checked={selected.includes(field.key)} className="mt-1 accent-ember" onChange={(event) => setSelected((current) => event.target.checked ? [...current, field.key] : current.filter((key) => key !== field.key))} type="checkbox" /> : <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-ember" size={17} />}
                      <span><span className="block text-sm font-semibold">{field.label}</span><span className="mt-1 block text-xs leading-5 text-stardust/52">{field.summary}</span><span className="mt-2 block font-mono text-[0.64rem] text-stardust/30">{field.path}</span></span>
                    </label>
                  ))}
                </fieldset>
              </section>

              {confidence.length ? <section><p className="text-xs uppercase tracking-[0.14em] text-ember">Contextual confidence—not a truth score</p><div className="mt-3 grid gap-3 md:grid-cols-2">{confidence.map(([key, item]) => <div className="rounded-xl border border-bronze/18 bg-midnight/30 p-3" key={key}><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1')}</span><Badge variant="bronze">{item.level}</Badge></div><p className="mt-2 text-xs leading-5 text-stardust/48">{item.context}</p></div>)}</div></section> : null}

              <section className="rounded-xl border border-ember/24 bg-ember/7 p-4"><p className="text-xs uppercase tracking-[0.14em] text-ember">Commit consequence</p><p className="mt-2 text-sm leading-6 text-stardust/68">{aiCommitConsequences[job.jobType]}</p></section>

              {panelState === 'candidate' ? <div className="space-y-3"><label className="block"><span className="field-label">Decision note</span><textarea className="field min-h-24 resize-y" onChange={(event) => setDecisionNote(event.target.value)} placeholder="Record what you reviewed and why this candidate should or should not enter the garment record." value={decisionNote} /></label><div className="flex flex-wrap justify-end gap-2"><Button disabled={busy || decisionNote.trim().length < 8} icon={<X size={15} />} onClick={() => onReject(decisionNote)} size="sm">Reject candidate</Button><Button disabled={busy || !canDecide} icon={<Check size={15} />} onClick={() => onAccept(selected, decisionNote)} size="sm" variant="primary">Accept selected through domain commands</Button></div></div> : null}
              {panelState === 'accepted' || panelState === 'rejected' ? <div className="rounded-xl border border-bronze/18 bg-midnight/32 p-4"><p className="text-sm font-semibold">Designer decision: {panelState}</p><p className="mt-2 text-sm leading-6 text-stardust/56">{artifact.decisionReason}</p>{artifact.acceptanceOperationId ? <p className="mt-3 break-all font-mono text-[0.65rem] text-stardust/32">Operation {artifact.acceptanceOperationId}</p> : null}</div> : null}
            </>
          ) : null}
        </div>
      </article>
    </Card>
  );
}

function StateMessage({ children, copy, icon, title }: { children?: React.ReactNode; copy: string; icon: React.ReactNode; title: string }) { return <div className="flex flex-wrap items-center gap-4 rounded-xl border border-bronze/20 bg-charcoal/40 p-4"><span className="text-ember">{icon}</span><div className="min-w-[12rem] flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-stardust/52">{copy}</p></div>{children}</div>; }
function statusLabel(value: ReturnType<typeof aiCandidatePanelState>) { return value.replace(/_/g, ' '); }
