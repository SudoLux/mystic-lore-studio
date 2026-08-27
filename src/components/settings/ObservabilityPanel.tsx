import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clearClientEvents, getClientEvents, subscribeToClientEvents, type ObservabilityEvent } from '../../lib/observability';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

const labels: Record<ObservabilityEvent['kind'], string> = {
  ai_job: 'AI job', client_error: 'Client error', export_failure: 'Export failure', migration_warning: 'Migration warning', publication_failure: 'Publication failure', sync_failure: 'Sync failure',
};

export function ObservabilityPanel() {
  const [events, setEvents] = useState<ObservabilityEvent[]>(() => getClientEvents());
  useEffect(() => subscribeToClientEvents(() => setEvents(getClientEvents())), []);
  return <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,.16),rgba(10,10,10,.7))]">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.14em] text-ember">Private diagnostics</p><h2 className="mt-2 text-xl font-semibold">Reliability signals</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/62">Operational status only. This device never stores prompt text, source records, media, or error messages in diagnostics.</p></div>{events.length ? <Button icon={<Trash2 aria-hidden="true" size={15} />} onClick={() => { clearClientEvents(); setEvents([]); }} size="sm" variant="ghost">Clear device log</Button> : null}</div>
    {events.length ? <ul aria-live="polite" className="mt-5 space-y-2">{events.slice(0, 8).map((event) => <li className="flex items-start gap-3 rounded-xl border border-bronze/18 bg-midnight/35 p-3" key={event.id}>{event.severity === 'error' ? <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0 text-ember" size={17} /> : <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-teal" size={17} />}<div className="min-w-0"><p className="text-sm font-medium">{labels[event.kind]}</p><p className="mt-1 text-xs text-stardust/48">{new Date(event.at).toLocaleString()} {Object.keys(event.context).length ? `· ${Object.entries(event.context).map(([key, value]) => `${key}: ${value}`).join(' · ')}` : ''}</p></div></li>)}</ul> : <p className="mt-5 rounded-xl border border-dashed border-bronze/25 p-4 text-sm text-stardust/55">No diagnostic events have been recorded on this device.</p>}
  </Card>;
}
