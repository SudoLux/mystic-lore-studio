import { Camera, ChevronRight, WifiOff } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

export function FieldModePanel({ captureLabel, description, moves, onCapture, title }: { captureLabel: string; description: string; moves: Array<{ detail: string; label: string; onSelect: () => void }>; onCapture?: () => void; title: string }) {
  return <Card className="border-teal/35 bg-[linear-gradient(135deg,rgba(45,92,107,.25),rgba(10,10,10,.82))] md:hidden">
    <div className="flex items-start gap-3"><Camera aria-hidden="true" className="mt-0.5 shrink-0 text-ember" size={19} /><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-ember">Field mode</p><h2 className="mt-1 text-xl font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-stardust/65">{description}</p></div></div>
    {onCapture ? <Button className="mt-4 w-full" icon={<Camera aria-hidden="true" size={16} />} onClick={onCapture} variant="primary">{captureLabel}</Button> : null}
    <ul className="mt-4 divide-y divide-bronze/18 border-y border-bronze/18">{moves.map((move) => <li key={move.label}><button className="flex min-h-14 w-full items-center gap-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={move.onSelect} type="button"><span className="min-w-0 flex-1"><strong className="block text-sm">{move.label}</strong><span className="mt-0.5 block text-xs text-stardust/52">{move.detail}</span></span><ChevronRight aria-hidden="true" className="shrink-0 text-ember" size={17} /></button></li>)}</ul>
    <p className="mt-4 flex items-center gap-2 text-xs text-stardust/55"><WifiOff aria-hidden="true" size={14} />Capture and review work stays on this device until sync can resume.</p>
  </Card>;
}
