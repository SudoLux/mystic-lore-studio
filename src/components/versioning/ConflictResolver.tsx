import type { CanonicalConflict } from '../../domains/workspace';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

export function ConflictResolver({ conflicts, onResolve }: { conflicts: CanonicalConflict[]; onResolve: (id: string, resolution: CanonicalConflict['resolution']) => void }) {
  if (!conflicts.length) return null;
  return <Card className="border-ember/45" role="alert"><p className="text-xs uppercase tracking-[0.14em] text-ember">Concurrent changes</p><h2 className="font-display mt-2 text-2xl">Resolve field conflicts before restore</h2><div className="mt-4 space-y-3">{conflicts.map((conflict) => <article className="rounded-xl border border-bronze/22 p-3" key={conflict.id}><strong>{conflict.entityType} · {conflict.field}</strong><div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><Value label="Base" value={conflict.baseValue} /><Value label="This device" value={conflict.localValue} /><Value label="Server" value={conflict.remoteValue} /></div><div className="mt-3 flex gap-2"><Button onClick={() => onResolve(conflict.id, 'local')} size="sm">Keep this device</Button><Button onClick={() => onResolve(conflict.id, 'remote')} size="sm">Use server</Button></div></article>)}</div></Card>;
}
function Value({ label, value }: { label: string; value: unknown }) { return <div className="rounded-lg bg-midnight/55 p-2"><span className="text-stardust/38">{label}</span><code className="mt-1 block break-words text-stardust/65">{JSON.stringify(value)}</code></div>; }
