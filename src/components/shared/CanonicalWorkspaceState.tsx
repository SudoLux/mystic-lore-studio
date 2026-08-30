import { AlertTriangle, CloudOff, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { StudioSkeleton } from './StudioSkeleton';

export function CanonicalWorkspaceState({ children }: { children: ReactNode }) {
  const { error, isReady, retry, syncState } = useCanonicalWorkspace();
  if (!isReady && syncState === 'loading') return <StudioSkeleton compact label="Preparing your garment workspace" />;
  if (!isReady || syncState === 'error') return <Card role="alert" className="border-ember/45"><div className="flex gap-3"><AlertTriangle aria-hidden="true" className="shrink-0 text-ember" /><div><h2 className="font-semibold">Workspace unavailable</h2><p className="mt-2 text-sm leading-6 text-stardust/65">{error ?? 'Your Studio workspace could not be loaded.'}</p><Button className="mt-4" icon={<RotateCw aria-hidden="true" size={15} />} onClick={retry} size="sm">Try again</Button></div></div></Card>;
  return <>{syncState === 'offline' ? <div aria-live="polite" className="flex items-center gap-2 rounded-xl border border-teal/35 bg-teal/10 px-3 py-2 text-sm text-stardust/75"><CloudOff aria-hidden="true" size={16} />Saved on this device. Your changes will sync when you reconnect.</div> : null}{syncState === 'conflict' ? <div aria-live="assertive" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-ember/50 bg-ember/10 p-3 text-sm text-stardust/80"><span>A newer edit needs your review before you continue.</span><Button icon={<RotateCw aria-hidden="true" size={15} />} onClick={retry} size="sm">Review changes</Button></div> : null}{children}</>;
}
