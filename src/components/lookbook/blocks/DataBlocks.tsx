import { Ruler, SwatchBook } from 'lucide-react';
import { getFabricColorHex } from '../../../lib/fabricMetadata';
import { FabricColorOrb } from '../../fabrics/FabricColorOrb';
import { contentArray, contentString, isContentRecord } from './blockContent';
import type { EditorialBlockRendererProps } from './types';

export function FabricSwatchBlock({ block, fabrics = [] }: EditorialBlockRendererProps) {
  const fabricId = contentString(block.content, 'fabricId');
  const fabric = fabrics.find((item) => item.id === fabricId);
  const name = fabric?.name ?? contentString(block.content, 'name', 'Fabric swatch');
  const color = fabric ? getFabricColorHex(fabric) : contentString(block.content, 'colorHex', '#9a6c3c');
  const composition = fabric?.composition ?? contentString(block.content, 'composition');
  const notes = fabric?.loreNote || fabric?.notes || contentString(block.content, 'notes');
  const orbFabric = fabric ?? { colorFamily: name, primaryColor: name, primaryColorHex: color };
  const unavailable = Boolean(fabricId) && !fabric;
  return (
    <article className="editorial-theme-card flex max-w-xl items-center gap-4 border p-4">
      <FabricColorOrb className="h-16 w-16" fabric={orbFabric} label={`${name} color`} />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[var(--editorial-accent)]">
          <SwatchBook size={14} />
          <span className="text-[0.58rem] uppercase tracking-[0.16em]">Fabric Story</span>
        </div>
        <h4 className="mt-2 truncate text-base font-semibold text-stardust">{name}</h4>
        {composition ? <p className="mt-1 text-xs text-stardust/52">{composition}</p> : null}
        {notes ? <p className="mt-2 text-xs leading-5 text-stardust/42">{notes}</p> : null}
        {unavailable ? <p className="mt-2 text-[0.58rem] uppercase tracking-[0.14em] text-amber-200/62">Source unavailable</p> : null}
      </div>
    </article>
  );
}

export function MeasurementTableBlock({ block }: EditorialBlockRendererProps) {
  const title = contentString(block.content, 'title', 'Measurements');
  const columns = contentArray(block.content, 'columns').filter((item): item is string => typeof item === 'string');
  const rows = contentArray(block.content, 'rows').flatMap((item) => {
    if (!isContentRecord(item)) return [];
    const label = typeof item.label === 'string' ? item.label : '';
    const values = Array.isArray(item.values)
      ? item.values.filter((value): value is string => typeof value === 'string')
      : [];
    return label ? [{ label, values }] : [];
  });
  return (
    <section className="editorial-theme-card max-w-4xl overflow-hidden border">
      <header className="flex items-center gap-2 border-b border-stardust/12 px-4 py-3 text-[var(--editorial-accent)]">
        <Ruler size={15} />
        <h4 className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</h4>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="text-[0.62rem] uppercase tracking-[0.12em] text-stardust/42">
              <th className="px-4 py-3 font-medium">Point</th>
              {columns.map((column) => <th className="px-4 py-3 font-medium" key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {(rows.length > 0 ? rows : [{ label: 'No measurements yet', values: columns.map(() => '—') }]).map((row) => (
              <tr className="border-t border-stardust/9 text-stardust/68" key={row.label}>
                <th className="px-4 py-3 font-medium text-stardust">{row.label}</th>
                {columns.map((column, index) => <td className="px-4 py-3" key={`${row.label}-${column}`}>{row.values[index] ?? '—'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
