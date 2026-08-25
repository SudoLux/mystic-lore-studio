import { AlertTriangle, CloudOff, LoaderCircle, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';

export function CanonicalWorkspaceState({ children }: { children: ReactNode }) {
  const { error, isReady, retry, syncState } = useCanonicalWorkspace();
  if (!isReady && syncState === 'loading') return <Card className="flex min-h-56 items-center justify-center gap-3"><LoaderCircle aria-hidden="true" className="animate-spin text-ember" /><p className="text-sm text-stardust/65">Preparing your canonical garment workspace…</p></Card>;
  if (!isReady || syncState === 'error') return <Card role="alert" className="border-ember/45"><div className="flex gap-3"><AlertTriangle aria-hidden="true" className="shrink-0 text-ember" /><div><h2 className="font-semibold">Workspace unavailable</h2><p className="mt-2 text-sm leading-6 text-stardust/65">{error ?? 'The canonical workspace could not be loaded.'}</p><Button className="mt-4" icon={<RotateCw aria-hidden="true" size={15} />} onClick={retry} size="sm">Retry</Button></div></div></Card>;
  return <>{syncState === 'offline' ? <div aria-live="polite" className="flex items-center gap-2 rounded-xl border border-teal/35 bg-teal/10 px-3 py-2 text-sm text-stardust/75"><CloudOff aria-hidden="true" size={16} />Saved locally. Changes will need a connection before cloud sync.</div> : null}{syncState === 'conflict' ? <div aria-live="assertive" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-ember/50 bg-ember/10 p-3 text-sm text-stardust/80"><span>A newer canonical change needs a field-by-field review before this screen can commit again.</span><Button icon={<RotateCw aria-hidden="true" size={15} />} onClick={retry} size="sm">Review conflict</Button></div> : null}{children}</>;
}
