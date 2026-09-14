import { BarChart3, BookOpen, CheckCircle2, Clock3, Factory, Package, Shirt } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '../../components/shared/Card';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { MobileSummaryStrip } from '../../components/shared/MobileSummaryStrip';
import { PageHeader } from '../../components/shared/PageHeader';
import type { CanonicalWorkspaceState } from '../../domains/workspace';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';

type CountRow = { label: string; value: number };

export function StatsPage() {
  const { state } = useCanonicalWorkspace();
  if (!state) return null;
  const openTasks = state.releaseTasks.filter((task) => !['done', 'cancelled'].includes(task.status));
  const activeGarments = state.garments.filter((garment) => !['archived', 'cancelled'].includes(garment.status));
  const releasedSpecs = state.technicalSpecs.filter((spec) => spec.status === 'released');
  const inventoryBalance = state.inventoryEntries.reduce((total, entry) => total + signedInventory(entry.entryType, entry.quantity), 0);

  return (
    <section className="space-y-5">
      <MobilePageHeader badge="Stats" kicker={`${activeGarments.length} active · ${openTasks.length} open tasks`} title="Studio Signals" />
      <PageHeader badge="Stats" description="A quiet overview of momentum across garments, materials, production, and stories." title="Studio Signals" />
      <MobileSummaryStrip items={[
        { icon: <Shirt aria-hidden="true" size={15} />, label: 'Garments', value: String(state.garments.length) },
        { icon: <Clock3 aria-hidden="true" size={15} />, label: 'Open tasks', value: String(openTasks.length) },
        { icon: <Package aria-hidden="true" size={15} />, label: 'Inventory', value: formatNumber(inventoryBalance) },
      ]} />

      <div className="hidden gap-4 sm:grid md:grid-cols-2 xl:grid-cols-5">
        <Metric icon={<Shirt size={18} />} label="Garments" value={state.garments.length} />
        <Metric icon={<CheckCircle2 size={18} />} label="Released specs" value={releasedSpecs.length} />
        <Metric icon={<BarChart3 size={18} />} label="Open tasks" value={openTasks.length} />
        <Metric icon={<BookOpen size={18} />} label="Editorials" value={state.editorialCollections.length} />
        <Metric icon={<Factory size={18} />} label="Production orders" value={state.productionOrders.length} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SignalCard description="Stable garment relationships grouped by current workflow phase." rows={countBy(state.garments, 'phase')} title="Garments by phase" />
        <SignalCard description="Studio tasks grouped by their current status." rows={countBy(state.releaseTasks, 'status')} title="Task board health" />
        <SignalCard description="Reusable material and component records, not duplicated project fields." rows={[
          { label: 'Materials', value: state.materials.length },
          { label: 'Material variants', value: state.materialVariants.length },
          { label: 'Components', value: state.components.length },
          { label: 'Component variants', value: state.componentVariants.length },
        ]} title="Reusable libraries" />
        <SignalCard description="Version-pinned production, editorial, portfolio, and publication evidence." rows={[
          { label: 'Sample rounds', value: state.sampleRounds.length },
          { label: 'Fit sessions', value: state.fitSessions.length },
          { label: 'QC inspections', value: state.qcInspections.length },
          { label: 'Editorial collections', value: state.editorialCollections.length },
          { label: 'Portfolio projects', value: state.portfolioProjects.length },
          { label: 'Current public snapshots', value: state.publications.filter((item) => item.isCurrent && item.isPublic).length },
        ]} title="Downstream evidence" />
      </div>

      <Card className="border-teal/24 bg-[linear-gradient(135deg,rgba(45,92,107,.16),rgba(10,10,10,.66))]">
        <p className="text-xs font-medium uppercase tracking-[.14em] text-teal">Integrity signal</p>
        <h2 className="mt-3 text-xl font-semibold">{state.garmentVersions.length} Freeze Frames · {state.changeEvents.length} ledger events · {state.aiAcceptances.length} AI acceptance receipts</h2>
        <p className="mt-2 text-sm leading-6 text-stardust/58">Your shared Studio keeps these milestones connected to the garment decisions that created them.</p>
      </Card>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <Card><span aria-hidden="true" className="text-ember">{icon}</span><p className="mt-4 text-2xl font-semibold tabular-nums">{value}</p><p className="mt-1 text-sm text-stardust/52">{label}</p></Card>;
}

function SignalCard({ description, rows, title }: { description: string; rows: CountRow[]; title: string }) {
  const maximum = Math.max(1, ...rows.map((row) => row.value));
  return <Card><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-stardust/52">{description}</p><div className="mt-5 space-y-3">{rows.length ? rows.map((row) => <div key={row.label}><div className="flex items-center justify-between gap-3 text-sm"><span className="capitalize text-stardust/68">{row.label.replaceAll('_', ' ')}</span><strong className="tabular-nums">{row.value}</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-stardust/8"><div className="h-full rounded-full bg-[linear-gradient(90deg,#9a6c3c,#c89b3c,#2d5c6b)]" style={{ width: `${(row.value / maximum) * 100}%` }} /></div></div>) : <p className="rounded-xl border border-dashed border-bronze/24 p-4 text-sm text-stardust/48">Nothing to show here yet.</p>}</div></Card>;
}

function countBy<T extends Record<K, PropertyKey>, K extends keyof T>(items: T[], key: K): CountRow[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(String(item[key]), (counts.get(String(item[key])) ?? 0) + 1);
  return [...counts].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
}

function signedInventory(type: CanonicalWorkspaceState['inventoryEntries'][number]['entryType'], quantity: number) {
  return ['receive', 'return', 'release', 'adjust'].includes(type) ? quantity : -quantity;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}
