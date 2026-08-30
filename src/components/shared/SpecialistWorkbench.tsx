import type { ReactNode } from 'react';
import { ArrowUpRight, Shirt } from 'lucide-react';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { canonicalGarmentCover, recommendedGarmentAction } from '../../lib/canonicalGarmentPresentation';
import { cn } from '../../lib/classes';
import { CanonicalMediaImage } from './CanonicalMediaImage';

export function SpecialistWorkbench({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('specialist-workbench min-w-0 space-y-6 lg:space-y-8', className)}>{children}</section>;
}

export function GarmentWorkbenchContext({
  actions,
  garmentId,
  label,
}: {
  actions?: ReactNode;
  garmentId: string;
  label: string;
}) {
  const { state, syncState } = useCanonicalWorkspace();
  const garment = state?.garments.find((item) => item.id === garmentId);
  if (!state || !garment) return null;
  const collection = state.collections.find((item) => item.id === garment.collectionId);
  const cover = canonicalGarmentCover(state, garment.id);
  const next = recommendedGarmentAction(garment);

  return <aside aria-label={`${label} garment context`} className="workbench-garment-context" data-testid="specialist-garment-context">
    <div className="h-20 w-20 shrink-0 sm:h-24 sm:w-24">
      <CanonicalMediaImage alt={`${garment.title} workbench context`} asset={cover} className="h-full w-full rounded-xl border-0" derivatives={state.mediaDerivatives} fit="cover" mode="thumbnail" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2 text-[0.62rem] uppercase tracking-[0.16em] text-ember/72"><span>{label}</span><span aria-hidden="true" className="text-stardust/20">/</span><span className="text-stardust/40">{garment.phase}</span><span className="normal-case tracking-normal text-stardust/32">{syncState === 'ready' ? 'Saved' : syncState}</span></div>
      <h2 className="font-display mt-1 truncate text-xl leading-tight text-stardust sm:text-2xl">{garment.title}</h2>
      <p className="mt-1 truncate text-xs text-stardust/42">{collection?.name ?? 'Independent piece'} · {garment.garmentType}</p>
      <p className="mt-2 hidden text-xs text-stardust/48 sm:block"><span className="text-stardust/30">Next:</span> {next.label}</p>
    </div>
    <div className="flex shrink-0 flex-wrap justify-end gap-2">
      {actions}
      <a className="workbench-quick-action" href={`#/projects/${garment.id}`}><Shirt aria-hidden="true" size={15}/> Garment <ArrowUpRight aria-hidden="true" size={13}/></a>
    </div>
  </aside>;
}

export function WorkbenchTabs<T extends string>({
  active,
  ariaLabel,
  items,
  onChange,
}: {
  active: T;
  ariaLabel: string;
  items: ReadonlyArray<{ id: T; label: string }>;
  onChange: (id: T) => void;
}) {
  return <nav aria-label={ariaLabel} className="workbench-tabs overflow-x-auto">{items.map((item) => <button aria-current={active === item.id ? 'page' : undefined} className={active === item.id ? 'workbench-tab workbench-tab--active' : 'workbench-tab'} key={item.id} onClick={() => onChange(item.id)} type="button">{item.label}</button>)}</nav>;
}
