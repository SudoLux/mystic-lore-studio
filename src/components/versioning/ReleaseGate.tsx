import { CheckCircle2, CloudOff, RefreshCw, ShieldAlert } from 'lucide-react';
import { Card } from '../shared/Card';

export function ReleaseGate({ conflicts, currentRevision, expectedRevision, online }: { conflicts: number; currentRevision: number; expectedRevision: number; online: boolean }) {
  const checks = [{ good: online, label: online ? 'Online server commit available' : 'Connection required', icon: online ? CheckCircle2 : CloudOff }, { good: conflicts === 0, label: conflicts ? `${conflicts} conflicts require review` : 'No unresolved conflicts', icon: conflicts ? ShieldAlert : CheckCircle2 }, { good: currentRevision === expectedRevision, label: currentRevision === expectedRevision ? `Fresh revision ${currentRevision}` : 'Working state changed; refresh preview', icon: currentRevision === expectedRevision ? CheckCircle2 : RefreshCw }];
  return <Card><p className="text-xs uppercase tracking-[0.14em] text-ember">Fresh-state gate</p><ul className="mt-4 space-y-3">{checks.map(({ good, icon: Icon, label }) => <li className={good ? 'flex items-center gap-3 text-sm text-teal' : 'flex items-center gap-3 text-sm text-ember'} key={label}><Icon size={16} /><span>{label}</span></li>)}</ul><p className="mt-4 text-xs leading-5 text-stardust/42">Release, publish, and restore are never queued blindly while offline.</p></Card>;
}
