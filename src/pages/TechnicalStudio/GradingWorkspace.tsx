import { Check, Copy, Layers3, Save } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../components/shared/Button';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { Card } from '../../components/shared/Card';
import { createGradeRule, previewGradeRule, type MeasurementUnit } from '../../domains/technical';
import type { CanonicalTechnicalSpec, CanonicalWorkspaceState } from '../../domains/workspace';
import { useMeasurements } from '../../hooks/useMeasurements';
import { useTechnicalStudio } from '../../hooks/useTechnicalStudio';
import { canonicalGarmentCover } from '../../lib/canonicalGarmentPresentation';
import { cn } from '../../lib/classes';
import { convertMeasurement } from '../../domains/technical';
import { displayUnit, formatMeasurementValue, formatMeasurementWithUnit, FRACTION_STEPS, formatInchesFraction, parseMeasurementInput, type MeasurementDisplayFormat } from '../../lib/measurementFormat';

type EntryMode = 'simple' | 'advanced';
type DraftRules = Record<string, number | undefined>;
type SourceValueDecision = 'grade' | 'manual';
const DISPLAY_PREFERENCE_KEY = 'ml-studio:measurements-display-format';

/** A non-destructive grading workbench. Rules are only canonical after Save Grade Rule. */
export function GradingWorkspace({ spec }: { spec: CanonicalTechnicalSpec }) {
  const { commitGrade, createAndCommitGrade, saveGradeRule, state } = useMeasurements();
  const { execute: executeTechnical } = useTechnicalStudio();
  const [entryMode, setEntryMode] = useState<EntryMode>('simple');
  const [displayFormat, setDisplayFormat] = usePersistedDisplayFormat();
  const [ruleId, setRuleId] = useState('');
  const [ruleName, setRuleName] = useState('');
  const [draft, setDraft] = useState<DraftRules>({});
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [sourceValueDecisions, setSourceValueDecisions] = useState<Record<string, SourceValueDecision>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [copiedPattern, setCopiedPattern] = useState<number[] | null>(null);
  const [notice, setNotice] = useState('');
  const [sizeEditorOpen, setSizeEditorOpen] = useState(false);
  const [ruleDirty, setRuleDirty] = useState(false);

  if (!state) return null;
  const garment = state.garments.find((item) => item.id === spec.garmentId);
  const sets = (state.measurementSets ?? []).filter((item) => item.specId === spec.id);
  const baseSet = sets.find((item) => item.sampleType === 'base') ?? sets[0];
  const points = (state.pomPoints ?? []).filter((item) => item.specId === spec.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const rules = (state.gradeRules ?? []).filter((item) => item.specId === spec.id);
  // Older private specs predate garment-level sizeRange. Treat their base size
  // as a one-size range until the user deliberately expands it in this workspace.
  const sizes = Array.isArray(spec.sizeRange) && spec.sizeRange.length ? spec.sizeRange : [spec.baseSize || 'M'];
  const transitions = sizes.slice(1).map((toSize, index) => ({ fromSize: sizes[index], toSize }));

  useEffect(() => {
    if (!ruleId) return;
    const selected = rules.find((rule) => rule.id === ruleId);
    if (!selected) return;
    const initial: DraftRules = {};
    const values = selected ? (state.gradeRuleValues ?? []).filter((value) => value.gradeRuleId === selected.id) : [];
    for (const value of values) initial[key(value.pomPointId, value.fromSize, value.toSize)] = value.delta;
    setDraft(initial);
    setOverrides({});
    setSourceValueDecisions({});
    setExcluded(new Set());
    setRuleName(selected.name);
    setRuleDirty(false);
  }, [ruleId]);

  const virtual = useMemo(() => {
    if (!baseSet || sizes.length < 2) return null;
    const values = points.flatMap((point) => transitions.map(({ fromSize, toSize }) => ({
      pomPointId: point.id,
      fromSize,
      toSize,
      delta: draft[key(point.id, fromSize, toSize)],
    })).filter((value): value is { pomPointId: string; fromSize: string; toSize: string; delta: number } => typeof value.delta === 'number'));
    try {
      const created = createGradeRule(state, { type: 'create_grade_rule', specId: spec.id, name: ruleName || 'Working grade rule', sizeRange: sizes, values });
      return { state: created.state, ruleId: created.rule.id, values };
    } catch { return null; }
  }, [baseSet, draft, points, ruleName, sizes, spec.id, state, transitions]);
  const preview = virtual && baseSet ? previewGradeRule(virtual.state, baseSet.id, virtual.ruleId, overrides) : { rows: [], warnings: [] };
  const previewByValue = new Map(preview.rows.map((row) => [`${row.pomPointId}:${row.size}`, row]));
  const existingSizeValues = baseSet ? preview.rows.flatMap((row) => {
    if (row.size === baseSet.baseSize) return [];
    const current = state.measurementValues.find((value) => value.setId === baseSet.id && value.pomPointId === row.pomPointId && value.size === row.size);
    const sourceKey = `${row.pomPointId}:${row.size}`;
    // Non-base values are often zero placeholders created by tolerance edits.
    // A grade rule remains authoritative until the designer explicitly keeps a value.
    return current && Math.abs(current.target) > .0001 && Math.abs(current.target - row.target) > .0001 && sourceValueDecisions[sourceKey] === undefined ? [{ current, row }] : [];
  }) : [];
  const readyPoints = points.filter((point) => transitions.every(({ fromSize, toSize }) => typeof draft[key(point.id, fromSize, toSize)] === 'number')).length;

  const markRuleDirty = () => setRuleDirty(true);
  const setDelta = (pointId: string, fromSize: string, toSize: string, value: number | undefined) => { markRuleDirty(); setDraft((current) => ({ ...current, [key(pointId, fromSize, toSize)]: value })); };
  const applyAcross = (pointId: string, delta: number | undefined) => {
    if (delta === undefined) return;
    markRuleDirty();
    setDraft((current) => Object.fromEntries([...Object.entries(current), ...transitions.map(({ fromSize, toSize }) => [key(pointId, fromSize, toSize), delta])]));
  };
  const toggleExcluded = (pointId: string) => {
    const next = new Set(excluded);
    if (next.has(pointId)) next.delete(pointId);
    else {
      next.add(pointId);
      markRuleDirty();
      setDraft((current) => Object.fromEntries([...Object.entries(current), ...transitions.map(({ fromSize, toSize }) => [key(pointId, fromSize, toSize), 0])]));
    }
    setExcluded(next);
  };
  const saveRule = () => {
    if (!sizes.length || sizes.length < 2) return setNotice('Add at least two ordered sizes before saving a grade rule.');
    const values = virtual?.values ?? [];
    if (!values.length) return setNotice('Enter at least one POM grade before saving the rule.');
    try {
      const savedRuleId = saveGradeRule({ type: 'create_grade_rule', specId: spec.id, name: ruleName || 'Untitled grade rule', sizeRange: sizes, values });
      setRuleId(savedRuleId);
      setRuleDirty(false);
      setNotice('Grade rule saved to this garment’s canonical technical data.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'The grade rule could not be saved.'); }
  };
  const createSet = () => {
    if (!baseSet || !virtual) return;
    if (preview.warnings.length) return setNotice('Resolve the highlighted grading issues before creating a graded set.');
    try {
      if (ruleId && !ruleDirty) commitGrade(baseSet.id, ruleId, `${baseSet.name} · graded`, overrides);
      else createAndCommitGrade(baseSet.id, { type: 'create_grade_rule', specId: spec.id, name: ruleName || `Graded ${new Date().toISOString().slice(0, 10)}`, sizeRange: sizes, values: virtual.values }, `${baseSet.name} · graded`, overrides);
      setNotice('New graded measurement set created. The base set remains unchanged.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'The graded set could not be created.'); }
  };

  return <section className="space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-[.65rem] font-semibold uppercase tracking-[.2em] text-ember">Technical Studio</p><h1 className="font-display mt-2 text-4xl">Grading</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-stardust/58">Define how each point of measure changes across your size range, preview the result, then create a separate graded measurement set.</p></div>
      <label className="text-xs text-stardust/52">Display format<select aria-label="Grading measurement display format" className="ml-2 rounded-lg border border-bronze/25 bg-midnight px-2 py-1.5 text-stardust" onChange={(event) => setDisplayFormat(event.target.value as MeasurementDisplayFormat)} value={displayFormat}><option value="in-fractions">Inches · Fractions</option><option value="in-decimal">Inches · Decimal</option><option value="cm">Centimeters</option><option value="mm">Millimeters</option></select></label>
    </header>

    <Card className="p-3"><div className="flex flex-wrap items-center gap-3"><div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl"><CanonicalMediaImage alt={garment?.title ?? 'Garment'} asset={garment ? canonicalGarmentCover(state, garment.id) : null} className="h-full w-full" derivatives={state.mediaDerivatives} mode="thumbnail"/></div><div className="min-w-0 flex-1"><strong className="block truncate">{garment?.title ?? 'Garment'}</strong><p className="mt-1 text-xs text-stardust/48">{baseSet?.name ?? 'No measurement set'} · {sizes.join(' · ')}</p></div><div className="flex items-center gap-1 overflow-x-auto text-xs">{sizes.map((size) => <span className={cn('whitespace-nowrap rounded-lg px-2.5 py-1.5', size === spec.baseSize ? 'bg-ember/16 font-semibold text-ember ring-1 ring-ember/35' : 'bg-stardust/[.045] text-stardust/62')} key={size}>{size}{size === spec.baseSize ? ' · BASE' : ''}</span>)}</div><Button onClick={() => setSizeEditorOpen(true)} size="sm" variant="ghost">Manage size range</Button></div></Card>

    {!baseSet ? <Card className="py-12 text-center"><Layers3 aria-hidden="true" className="mx-auto text-ember" size={28}/><h2 className="font-display mt-4 text-3xl">Start with a base measurement set</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stardust/58">Grading derives every size from an approved base value; it never edits that source set.</p></Card> : <>
      <nav aria-label="Grading workflow" className="flex overflow-x-auto rounded-xl border border-bronze/18 bg-[#12110f] p-1">{['1. Size range & base', '2. Grade rules', '3. Preview', '4. Create graded set'].map((item, index) => <span className={cn('whitespace-nowrap rounded-lg px-3 py-2 text-xs', index === 1 ? 'bg-ember/14 text-ember' : 'text-stardust/52')} key={item}>{item}</span>)}</nav>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-5"><Card className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-bronze/16 p-4"><div><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Grade rules</p><h2 className="font-display mt-1 text-2xl">How each POM changes between sizes</h2></div><div className="flex rounded-lg bg-stardust/[.045] p-1"><ModeButton active={entryMode === 'simple'} onClick={() => setEntryMode('simple')}>Simple</ModeButton><ModeButton active={entryMode === 'advanced'} onClick={() => setEntryMode('advanced')}>Advanced</ModeButton></div></div>
            <div className="border-b border-bronze/14 px-4 py-3"><label className="block max-w-sm"><span className="field-label">Grade rule library</span><select className="field" onChange={(event) => { const nextRuleId = event.target.value; setRuleId(nextRuleId); if (!nextRuleId) { setDraft({}); setRuleName(''); setOverrides({}); setSourceValueDecisions({}); setExcluded(new Set()); setRuleDirty(false); } }} value={ruleId}><option value="">New working rule</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{rule.name} · {Array.isArray(rule.sizeRange) ? rule.sizeRange.join(' / ') : 'Size range needs review'}</option>)}</select></label><p className="mt-2 text-xs text-stardust/45">Saved rules are reusable logic. Creating a graded set applies the current preview to this garment only.</p></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[42rem] table-fixed text-left text-sm"><colgroup><col className="w-[13.5rem]"/>{entryMode === 'simple' ? <col className="w-[18rem]"/> : transitions.map(({ fromSize, toSize }) => <col className="w-[8.5rem]" key={`${fromSize}-${toSize}`}/>)}<col className="w-[7.5rem]"/></colgroup><thead className="bg-[#151413] text-[.65rem] uppercase tracking-[.13em] text-stardust/55"><tr><th className="sticky left-0 z-20 w-[13.5rem] bg-[#151413] p-4">POM / method</th>{entryMode === 'simple' ? <th className="w-[18rem] p-4">Uniform adjacent grade</th> : transitions.map(({ fromSize, toSize }) => <th className="w-[8.5rem] p-4 text-center" key={`${fromSize}-${toSize}`}>{fromSize}→{toSize}</th>)}<th className="w-[7.5rem] p-4">Status</th></tr></thead><tbody>{points.map((point) => <GradeRuleRow displayFormat={displayFormat} draft={draft} entryMode={entryMode} excluded={excluded.has(point.id)} key={point.id} onApplyAcross={applyAcross} onCopy={() => setCopiedPattern(transitions.map(({ fromSize, toSize }) => draft[key(point.id, fromSize, toSize)]).filter((delta): delta is number => delta !== undefined))} onExclude={() => toggleExcluded(point.id)} onPaste={() => { if (!copiedPattern?.length) return; markRuleDirty(); setDraft((current) => ({ ...current, ...Object.fromEntries(transitions.map(({ fromSize, toSize }, index) => [key(point.id, fromSize, toSize), copiedPattern[index] ?? copiedPattern.at(-1)])) })); }} onSet={setDelta} point={point} specUnit={spec.unit} transitions={transitions}/>)}</tbody></table></div>{!points.length ? <p className="p-8 text-center text-sm text-stardust/50">Add POM identities before defining grade rules.</p> : null}</Card>
          <PreviewTable baseSet={baseSet} displayFormat={displayFormat} overrides={overrides} previewByValue={previewByValue} points={points} sizes={sizes} spec={spec}/>
        </div>
        <aside className="self-start space-y-4 xl:sticky xl:top-5"><Card><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Grading readiness</p><p className="font-display mt-2 text-3xl">{readyPoints} / {points.length} POMs ready</p><p className="mt-2 text-sm text-stardust/52">{preview.warnings.length ? `${preview.warnings.length} item${preview.warnings.length === 1 ? '' : 's'} need attention.` : ruleDirty ? 'Unsaved grade changes.' : 'Rules are ready to preview.'}</p></Card>
          <Card><label><span className="field-label">Rule name</span><input className="field" onChange={(event) => { markRuleDirty(); setRuleName(event.target.value); }} placeholder="Outerwear regular" value={ruleName}/></label><Button className="mt-3 w-full" icon={<Save size={15}/>} onClick={saveRule}>Save Grade Rule</Button><Button className="mt-2 w-full" disabled={!virtual || preview.warnings.length > 0} icon={<Check size={15}/>} onClick={createSet} variant="primary">Create Graded Set</Button><p className="mt-3 text-xs leading-5 text-stardust/45">Creates a new measurement set. Your source set and its history are unchanged.</p></Card>
          {existingSizeValues.length ? <Card><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Existing size values</p><p className="mt-2 text-xs leading-5 text-stardust/55">The grade rule is used by default. Keep a value only when it is an intentional manual exception.</p><div className="mt-3 space-y-3">{existingSizeValues.map(({ current, row }) => { const point = points.find((item) => item.id === row.pomPointId); const sourceKey = `${row.pomPointId}:${row.size}`; return <div className="border-t border-bronze/15 pt-3 first:border-0 first:pt-0" key={sourceKey}><strong className="text-sm">{point?.code} · {row.size}</strong><p className="mt-1 text-xs text-stardust/55">Existing {formatMeasurementWithUnit(current.target, spec.unit, displayFormat)} · Grade {formatMeasurementWithUnit(row.target, spec.unit, displayFormat)}</p><div className="mt-2 flex gap-2"><Button onClick={() => { setOverrides((value) => ({ ...value, [sourceKey]: current.target })); setSourceValueDecisions((value) => ({ ...value, [sourceKey]: 'manual' })); }} size="sm">Keep manual</Button><Button onClick={() => { setOverrides((value) => { const next = { ...value }; delete next[sourceKey]; return next; }); setSourceValueDecisions((value) => ({ ...value, [sourceKey]: 'grade' })); }} size="sm" variant="ghost">Use grade rule</Button></div></div>; })}</div></Card> : null}
          {Object.keys(overrides).length ? <Card><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Manual overrides</p><div className="mt-3 space-y-3">{Object.entries(overrides).map(([sourceKey, target]) => { const [pointId, size] = sourceKey.split(':'); const point = points.find((item) => item.id === pointId); return <div className="border-t border-bronze/15 pt-3 first:border-0 first:pt-0" key={sourceKey}><strong className="text-sm">{point?.code} · {size}</strong><p className="mt-1 text-xs text-stardust/55">Keeping {formatMeasurementWithUnit(target, spec.unit, displayFormat)} instead of the calculated grade.</p><Button className="mt-2" onClick={() => { setOverrides((value) => { const next = { ...value }; delete next[sourceKey]; return next; }); setSourceValueDecisions((value) => ({ ...value, [sourceKey]: 'grade' })); }} size="sm" variant="ghost">Use grade rule</Button></div>; })}</div></Card> : null}
          {preview.warnings.length ? <Card><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Needs attention</p><ul className="mt-3 space-y-2 text-sm text-stardust/68">{preview.warnings.slice(0, 8).map((warning) => <li key={warning}>• {plainWarning(warning)}</li>)}</ul></Card> : null}
          {notice ? <p aria-live="polite" className="text-sm text-teal">{notice}</p> : null}
        </aside>
      </div>
    </>}
    {sizeEditorOpen ? <SizeRangeEditor onClose={() => setSizeEditorOpen(false)} onSave={(sizeSystem, sizeRange, baseSize) => { executeTechnical({ type: 'update_spec_size_range', specId: spec.id, sizeSystem, sizeRange, baseSize }); setSizeEditorOpen(false); setNotice('Size range and base size updated. Existing measurements were preserved.'); }} spec={spec}/> : null}
  </section>;
}

function GradeRuleRow({ displayFormat, draft, entryMode, excluded, onApplyAcross, onCopy, onExclude, onPaste, onSet, point, specUnit, transitions }: { displayFormat: MeasurementDisplayFormat; draft: DraftRules; entryMode: EntryMode; excluded: boolean; onApplyAcross: (pointId: string, delta: number | undefined) => void; onCopy: () => void; onExclude: () => void; onPaste: () => void; onSet: (pointId: string, fromSize: string, toSize: string, value: number | undefined) => void; point: CanonicalWorkspaceState['pomPoints'][number]; specUnit: MeasurementUnit; transitions: Array<{ fromSize: string; toSize: string }> }) {
  const values = transitions.map(({ fromSize, toSize }) => draft[key(point.id, fromSize, toSize)]);
  const uniform = values.every((value) => value !== undefined && value === values[0]);
  const status = excluded ? 'Excluded' : !values.every((value) => value !== undefined) ? 'Incomplete' : uniform ? 'Uniform' : 'Custom';
  const primary = values.find((value): value is number => value !== undefined);
  return <tr className="border-t border-bronze/15 align-top"><th className="sticky left-0 z-10 w-[13.5rem] bg-[#0f0f0f] p-4 text-left font-normal"><strong className="block break-words">{point.code} · {point.name}</strong><span className="mt-1 block text-xs font-normal leading-5 text-stardust/45">{point.method}</span><div className="mt-3 flex flex-wrap gap-2"><button className="text-xs text-ember/80 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onCopy} type="button"><Copy className="mr-1 inline" size={12}/>Copy</button><button className="text-xs text-ember/80 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onPaste} type="button">Paste pattern</button><button aria-pressed={excluded} className="text-xs text-stardust/52 underline-offset-4 hover:text-stardust hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={onExclude} type="button">{excluded ? 'Include' : 'Exclude'}</button></div></th>{entryMode === 'simple' ? <td className="w-[18rem] p-3"><div className="flex items-center gap-2"><GradeInput ariaLabel={`${point.name} uniform grade`} displayFormat={displayFormat} onCommit={(value) => onSet(point.id, transitions[0]?.fromSize ?? '', transitions[0]?.toSize ?? '', value)} specUnit={specUnit} value={primary}/><Button disabled={primary === undefined} onClick={() => onApplyAcross(point.id, primary)} size="sm" variant="ghost">Apply across</Button></div>{!uniform && primary !== undefined ? <p className="mt-2 text-xs text-ember">Custom values retained—switch to Advanced to edit each transition.</p> : null}</td> : transitions.map(({ fromSize, toSize }) => <td className="w-[8.5rem] p-3" key={`${fromSize}-${toSize}`}><GradeInput ariaLabel={`${point.name} ${fromSize} to ${toSize} grade`} displayFormat={displayFormat} onCommit={(value) => onSet(point.id, fromSize, toSize, value)} specUnit={specUnit} value={draft[key(point.id, fromSize, toSize)]}/></td>)}<td className="w-[7.5rem] p-4"><span className={cn('text-xs', status === 'Incomplete' ? 'text-ember' : 'text-stardust/55')}>{status}</span></td></tr>;
}

function PreviewTable({ baseSet, displayFormat, overrides, points, previewByValue, sizes, spec }: { baseSet: CanonicalWorkspaceState['measurementSets'][number]; displayFormat: MeasurementDisplayFormat; overrides: Record<string, number>; points: CanonicalWorkspaceState['pomPoints']; previewByValue: Map<string, { target: number; sourceSize: string; delta: number }>; sizes: string[]; spec: CanonicalTechnicalSpec }) {
  return <Card className="p-0"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-bronze/16 p-4"><div><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Live preview</p><h2 className="font-display mt-1 text-2xl">Resulting graded size run</h2></div><span className="text-xs text-stardust/46">Source: {baseSet.name} · changes are not saved yet</span></div><div className="overflow-x-auto"><table className="w-full min-w-[42rem] table-fixed text-left text-sm tabular-nums"><colgroup><col className="w-[13.5rem]"/>{sizes.map((size) => <col className="w-[8.5rem]" key={size}/>)}</colgroup><thead className="bg-[#151413] text-[.65rem] uppercase tracking-[.13em] text-stardust/55"><tr><th className="sticky left-0 z-20 w-[13.5rem] bg-[#151413] p-4">POM</th>{sizes.map((size) => <th className={cn('w-[8.5rem] p-4 text-center', size === spec.baseSize && 'bg-ember/[.08] text-ember')} key={size}>{size}{size === spec.baseSize ? ' · BASE' : ''}</th>)}</tr></thead><tbody>{points.map((point) => <tr className="border-t border-bronze/15" key={point.id}><th className="sticky left-0 z-10 w-[13.5rem] bg-[#0f0f0f] p-4 font-normal"><strong className="block break-words">{point.code} · {point.name}</strong></th>{sizes.map((size) => { const row = previewByValue.get(`${point.id}:${size}`); const manual = overrides[`${point.id}:${size}`] !== undefined; return <td className={cn('w-[8.5rem] p-4 text-center', size === spec.baseSize && 'bg-ember/[.035]')} key={size}>{row ? <span title={size === spec.baseSize ? 'Base measurement' : `${row.sourceSize} plus grade ${formatSigned(row.delta, spec.unit, displayFormat)}`}><span>{formatMeasurementValue(row.target, spec.unit, displayFormat)}</span>{manual ? <small className="ml-1 text-[.6rem] uppercase tracking-[.1em] text-ember">Manual</small> : null}</span> : <span className="text-stardust/35">—</span>}</td>; })}</tr>)}</tbody></table></div></Card>;
}

function GradeInput({ ariaLabel, displayFormat, onCommit, specUnit, value }: { ariaLabel: string; displayFormat: MeasurementDisplayFormat; onCommit: (value: number | undefined) => void; specUnit: MeasurementUnit; value: number | undefined }) {
  const [draft, setDraft] = useState(value === undefined ? '' : formatSigned(value, specUnit, displayFormat));
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickerPosition, setPickerPosition] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => { if (!editing) setDraft(value === undefined ? '' : formatSigned(value, specUnit, displayFormat)); }, [displayFormat, editing, specUnit, value]);
  useLayoutEffect(() => {
    if (!editing || displayFormat !== 'in-fractions' || !inputRef.current) { setPickerPosition(null); return; }
    const update = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPickerPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - 224)), top: Math.min(window.innerHeight - 42, rect.bottom + 6) });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [displayFormat, editing]);
  const commit = () => { if (!draft.trim()) { onCommit(undefined); setEditing(false); return; } const parsed = parseGrade(draft, specUnit, displayFormat); if (parsed === null) { setError('Enter a valid grade.'); return; } onCommit(parsed); setDraft(formatSigned(parsed, specUnit, displayFormat)); setError(''); setEditing(false); };
  const chooseFraction = (fraction: number) => {
    const current = parseGrade(draft, specUnit, displayFormat) ?? value ?? 0;
    const inches = convertMeasurement(current, specUnit, 'in');
    const sign = inches < 0 ? -1 : 1;
    const whole = Math.floor(Math.abs(inches) + 1e-8);
    const next = convertMeasurement(sign * (whole + fraction), 'in', specUnit);
    onCommit(next);
    setDraft(formatSigned(next, specUnit, displayFormat));
    setError('');
    setEditing(false);
  };
  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter') { event.preventDefault(); commit(); } if (event.key === 'Escape') { event.preventDefault(); setDraft(value === undefined ? '' : formatSigned(value, specUnit, displayFormat)); setError(''); setEditing(false); } };
  return <div className="relative w-[7.25rem] shrink-0">{editing ? <input aria-invalid={Boolean(error)} aria-label={ariaLabel} autoFocus className="w-full rounded-lg border border-ember/55 bg-midnight px-2 py-1.5 text-right text-sm tabular-nums outline-none ring-2 ring-ember/15" inputMode="decimal" onBlur={commit} onChange={(event) => { setDraft(event.target.value); setError(''); }} onKeyDown={keyDown} ref={inputRef} value={draft}/> : <button aria-label={`${ariaLabel}: ${value === undefined ? 'not set' : formatSigned(value, specUnit, displayFormat)}`} className={cn('min-h-9 w-full rounded-lg px-2 py-1.5 text-right tabular-nums transition hover:bg-stardust/[.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', value === undefined && 'text-stardust/35')} onClick={() => setEditing(true)} type="button">{value === undefined ? '—' : formatSigned(value, specUnit, displayFormat)}</button>}{pickerPosition ? createPortal(<div aria-label="Fraction quick select" className="fixed z-[200] flex w-[13.5rem] flex-wrap gap-1 rounded-xl border border-bronze/30 bg-[#12110f] p-2 shadow-2xl" role="group" style={{ left: pickerPosition.left, top: pickerPosition.top }}>{FRACTION_STEPS.map((fraction) => <button aria-label={`Set grade fraction to ${fraction === 0 ? 'zero' : formatInchesFraction(fraction)}`} className="min-w-9 rounded-md px-2 py-1 text-xs text-stardust transition hover:bg-ember/16 hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" key={fraction} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseFraction(fraction)} type="button">{fraction === 0 ? '0' : formatInchesFraction(fraction)}</button>)}</div>, document.body) : null}{error ? <span className="absolute left-0 top-full z-30 mt-1 whitespace-nowrap rounded bg-[#2a1514] px-2 py-1 text-xs text-ember" role="alert">{error}</span> : null}</div>;
}

function ModeButton({ active, children, onClick }: { active: boolean; children: import('react').ReactNode; onClick: () => void }) { return <button aria-pressed={active} className={cn('rounded-md px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember', active ? 'bg-ember text-midnight' : 'text-stardust/55 hover:text-stardust')} onClick={onClick} type="button">{children}</button>; }
function key(pomId: string, from: string, to: string) { return `${pomId}:${from}:${to}`; }
function parseGrade(input: string, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) { const parsed = parseMeasurementInput(input.replace(/^\+/, '')); return parsed === null ? null : convertMeasurement(parsed, displayUnit(format), canonicalUnit); }
function formatSigned(value: number, canonicalUnit: MeasurementUnit, format: MeasurementDisplayFormat) { return `${value >= 0 ? '+' : '−'}${formatMeasurementValue(Math.abs(value), canonicalUnit, format)}`; }
function plainWarning(value: string) { return value.replace('grade delta', 'grade amount').replace('target', 'measurement'); }
function usePersistedDisplayFormat(): [MeasurementDisplayFormat, (format: MeasurementDisplayFormat) => void] {
  const [format, setFormat] = useState<MeasurementDisplayFormat>(() => { try { const saved = window.localStorage.getItem(DISPLAY_PREFERENCE_KEY); return saved === 'in-fractions' || saved === 'in-decimal' || saved === 'cm' || saved === 'mm' ? saved : 'in-fractions'; } catch { return 'in-fractions'; } });
  const save = (next: MeasurementDisplayFormat) => { setFormat(next); try { window.localStorage.setItem(DISPLAY_PREFERENCE_KEY, next); } catch { /* session-only preference */ } };
  return [format, save];
}

function SizeRangeEditor({ onClose, onSave, spec }: { onClose: () => void; onSave: (sizeSystem: CanonicalTechnicalSpec['sizeSystem'], sizeRange: string[], baseSize: string) => void; spec: CanonicalTechnicalSpec }) {
  const [sizes, setSizes] = useState(Array.isArray(spec.sizeRange) && spec.sizeRange.length ? spec.sizeRange.join(', ') : spec.baseSize || 'M');
  const [baseSize, setBaseSize] = useState(spec.baseSize);
  const [sizeSystem, setSizeSystem] = useState(spec.sizeSystem);
  return <div className="fixed inset-0 z-[140] flex items-end justify-center bg-midnight/80 p-3 backdrop-blur-sm sm:items-center" role="presentation"><section aria-label="Manage grading size range" aria-modal="true" className="w-full max-w-lg rounded-[1.4rem] border border-bronze/30 bg-[#12110f] p-5 shadow-2xl" role="dialog"><p className="text-[.65rem] uppercase tracking-[.16em] text-ember">Size range &amp; base</p><h2 className="font-display mt-1 text-3xl">Manage size range</h2><p className="mt-2 text-sm text-stardust/56">Changing the range keeps existing measurements. Review grading rules before creating a new set.</p><label className="mt-5 block"><span className="field-label">Size system</span><select className="field" onChange={(event) => setSizeSystem(event.target.value as CanonicalTechnicalSpec['sizeSystem'])} value={sizeSystem}><option value="alpha">Alpha</option><option value="numeric">Numeric</option><option value="custom">Custom</option></select></label><label className="mt-3 block"><span className="field-label">Available sizes, in order</span><input className="field" onChange={(event) => setSizes(event.target.value)} value={sizes}/></label><label className="mt-3 block"><span className="field-label">Base size</span><input className="field" onChange={(event) => setBaseSize(event.target.value)} value={baseSize}/></label><div className="mt-5 flex justify-end gap-2"><Button onClick={onClose} variant="ghost">Cancel</Button><Button onClick={() => onSave(sizeSystem, sizes.split(',').map((size) => size.trim()).filter(Boolean), baseSize.trim())} variant="primary">Save size range</Button></div></section></div>;
}
