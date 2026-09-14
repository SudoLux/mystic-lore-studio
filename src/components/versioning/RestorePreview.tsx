import { AlertTriangle, Archive, RotateCcw } from 'lucide-react';
import type { RestorePreviewResult } from '../../domains/versioning';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

export function RestorePreview({ busy, onCancel, onCommit, preview, reason, setReason }: { busy: boolean; onCancel: () => void; onCommit: () => void; preview: RestorePreviewResult; reason: string; setReason: (value: string) => void }) {
  return <Card elevated><div className="flex items-start gap-3"><RotateCcw className="mt-1 shrink-0 text-ember" size={20} /><div><p className="text-xs uppercase tracking-[0.14em] text-ember">Restore preview</p><h2 className="font-display mt-2 text-2xl">Create a new checkpoint from {preview.affected.length} selections</h2><p className="mt-2 text-sm leading-6 text-stardust/58">The working state changes; earlier history and pinned public or production artifacts remain untouched.</p></div></div>
    {preview.warnings.length ? <ul className="mt-4 space-y-2">{preview.warnings.map((warning) => <li className="flex gap-2 rounded-xl border border-ember/22 bg-ember/8 p-3 text-sm text-stardust/70" key={warning}><AlertTriangle className="shrink-0 text-ember" size={16} />{warning}</li>)}</ul> : null}
    {preview.dependencies.length ? <div className="mt-4"><p className="flex items-center gap-2 text-sm font-semibold"><Archive size={15} />Pinned evidence</p><ul className="mt-2 text-xs text-stardust/52">{preview.dependencies.map((item) => <li key={`${item.kind}-${item.artifactId}`}>{item.kind} · {item.label}</li>)}</ul></div> : null}
    <label className="mt-5 block"><span className="field-label">Restore reason</span><textarea className="field min-h-24" onChange={(event) => setReason(event.target.value)} placeholder="Explain why this scope should return to the selected state." value={reason} /></label>
    <p className="mt-2 font-mono text-[0.68rem] text-stardust/30">Preview {preview.previewChecksum.slice(0, 20)}</p>
    <div className="mt-5 flex justify-end gap-2"><Button disabled={busy} onClick={onCancel} variant="ghost">Cancel</Button><Button disabled={busy || reason.trim().length < 8} icon={<RotateCcw size={16} />} onClick={onCommit} variant="primary">{busy ? 'Restoring…' : 'Commit as new version'}</Button></div>
  </Card>;
}
