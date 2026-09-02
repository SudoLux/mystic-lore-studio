import type {
  CanonicalFitMeasurement,
  CanonicalGradeRule,
  CanonicalGradeRuleValue,
  CanonicalMeasurementSet,
  CanonicalMeasurementValue,
  CanonicalPomPoint,
  CanonicalRestoreOperation,
  CanonicalSampleRound,
  CanonicalWorkspaceState,
} from '../workspace';
import type { CsvImportError, GradePreview, MeasurementCommand, MeasurementCsvRow, MeasurementSetIssue, MeasurementUnit, StructuralMeasurementDiff } from './measurementContracts';

const CSV_HEADERS = ['code', 'name', 'method', 'x', 'y', 'size', 'target', 'tolerance_plus', 'tolerance_minus'] as const;

export function executeMeasurementCommand(state: CanonicalWorkspaceState, command: MeasurementCommand) {
  if (command.type === 'create_pom') return createPomPoint(state, command).state;
  if (command.type === 'update_pom') return updatePomPoint(state, command.pomPointId, command.patch, command.expectedRevision);
  if (command.type === 'create_measurement_set') return createMeasurementSet(state, command.specId, command.name, command.sampleType ?? null).state;
  if (command.type === 'upsert_measurement') return upsertMeasurementValue(state, command).state;
  if (command.type === 'create_sample_round') return createSampleRound(state, command.garmentId, command.sampleType).state;
  if (command.type === 'record_fit_actual') return recordFitActual(state, command).state;
  return createGradeRule(state, command).state;
}

export function convertMeasurement(value: number, from: MeasurementUnit, to: MeasurementUnit) {
  if (!Number.isFinite(value)) throw new Error('Measurement must be a finite decimal.');
  const millimeters = from === 'mm' ? value : from === 'cm' ? value * 10 : value * 25.4;
  const converted = to === 'mm' ? millimeters : to === 'cm' ? millimeters / 10 : millimeters / 25.4;
  return round4(converted);
}

export function measurementWithinTolerance(actual: number, target: number, tolerancePlus: number, toleranceMinus: number) {
  const variance = round4(actual - target);
  const status = variance > tolerancePlus ? 'high' : variance < -toleranceMinus ? 'low' : 'pass';
  return { variance, status } as const;
}

export function validateMeasurementSet(state: CanonicalWorkspaceState, setId: string): MeasurementSetIssue[] {
  const set = state.measurementSets.find((item) => item.id === setId);
  if (!set) return [{ code: 'missing_pom', message: 'Measurement set not found.', severity: 'error' }];
  const points = state.pomPoints.filter((item) => item.specId === set.specId);
  if (!points.length) return [{ code: 'missing_pom', message: 'Define at least one stable POM point.', severity: 'error' }];
  const rows = state.measurementValues.filter((item) => item.setId === setId);
  const issues: MeasurementSetIssue[] = [];
  for (const point of points) {
    const pointRows = rows.filter((item) => item.pomPointId === point.id);
    if (!pointRows.some((item) => item.size === set.baseSize)) issues.push({ code: 'missing_base_target', message: `${point.code} needs a ${set.baseSize} target.`, pomPointId: point.id, severity: 'error' });
    if (set.sampleType === 'graded' && new Set(pointRows.map((item) => item.size)).size < 2) issues.push({ code: 'incomplete_graded_sizes', message: `${point.code} needs at least two graded sizes.`, pomPointId: point.id, severity: 'error' });
  }
  const keys = new Set<string>();
  for (const row of rows) { const key = `${row.pomPointId}:${row.size}`; if (keys.has(key)) issues.push({ code: 'duplicate_row', message: `Duplicate measurement row: ${key}.`, pomPointId: row.pomPointId, severity: 'error' }); keys.add(key); }
  return issues;
}

export function createPomPoint(state: CanonicalWorkspaceState, input: Extract<MeasurementCommand, { type: 'create_pom' }>) {
  if (!state.technicalSpecs.some((item) => item.id === input.specId)) throw new Error('Technical specification not found.');
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(code)) throw new Error('POM code must use letters, numbers, dots, underscores, or hyphens.');
  if (state.pomPoints.some((item) => item.specId === input.specId && item.code === code)) throw new Error(`POM code ${code} already exists.`);
  validateAnchor(input.anchor);
  if (!input.name.trim() || !input.method.trim()) throw new Error('POM name and method are required.');
  const point: CanonicalPomPoint = { ...record(state.studioId), specId: input.specId, code, name: input.name.trim(), method: input.method.trim(), diagramAnchor: input.anchor, sortOrder: state.pomPoints.filter((item) => item.specId === input.specId).length };
  return { point, state: { ...state, pomPoints: [...state.pomPoints, point] } };
}

export function updatePomPoint(state: CanonicalWorkspaceState, id: string, patch: Partial<Pick<CanonicalPomPoint, 'name' | 'method' | 'diagramAnchor'>>, expectedRevision?: number) {
  const current = state.pomPoints.find((item) => item.id === id);
  if (!current) throw new Error('POM point not found.');
  if (expectedRevision !== undefined && current.revision !== expectedRevision) throw new Error('POM point changed elsewhere. Review the conflict before saving.');
  if (patch.diagramAnchor) validateAnchor(patch.diagramAnchor);
  if (patch.name !== undefined && !patch.name.trim()) throw new Error('POM name is required.');
  if (patch.method !== undefined && !patch.method.trim()) throw new Error('POM method is required.');
  return { ...state, pomPoints: state.pomPoints.map((item) => item.id === id ? touch({ ...item, ...patch, name: patch.name?.trim() ?? item.name, method: patch.method?.trim() ?? item.method }) : item) };
}

export function createMeasurementSet(state: CanonicalWorkspaceState, specId: string, name: string, sampleType: string | null = null) {
  const spec = state.technicalSpecs.find((item) => item.id === specId);
  if (!spec) throw new Error('Technical specification not found.');
  const existing = state.measurementSets.find((item) => item.specId === specId && item.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return { set: existing, state };
  const set: CanonicalMeasurementSet = { ...record(state.studioId), specId, name: name.trim() || 'Base', sampleType, baseSize: spec.baseSize, status: 'draft' };
  return { set, state: { ...state, measurementSets: [...state.measurementSets, set] } };
}

export function upsertMeasurementValue(state: CanonicalWorkspaceState, input: Extract<MeasurementCommand, { type: 'upsert_measurement' }>) {
  const set = state.measurementSets.find((item) => item.id === input.setId);
  const point = state.pomPoints.find((item) => item.id === input.pomPointId);
  if (!set || !point || set.specId !== point.specId) throw new Error('Measurement set and POM must belong to the same specification.');
  validateMeasurement(input.target, input.tolerancePlus, input.toleranceMinus);
  const size = input.size.trim();
  if (!size) throw new Error('Measurement size is required.');
  const current = state.measurementValues.find((item) => item.setId === input.setId && item.pomPointId === input.pomPointId && item.size === size);
  if (current && input.expectedRevision !== undefined && current.revision !== input.expectedRevision) throw new Error('Measurement changed elsewhere. Review the conflict before saving.');
  const value: CanonicalMeasurementValue = current
    ? touch({ ...current, target: round4(input.target), tolerancePlus: round4(input.tolerancePlus), toleranceMinus: round4(input.toleranceMinus) })
    : { ...record(state.studioId), setId: input.setId, pomPointId: input.pomPointId, size, target: round4(input.target), tolerancePlus: round4(input.tolerancePlus), toleranceMinus: round4(input.toleranceMinus) };
  return { value, state: { ...state, measurementValues: [...state.measurementValues.filter((item) => item.id !== value.id), value] } };
}

export function createSampleRound(state: CanonicalWorkspaceState, garmentId: string, sampleType: string) {
  if (!state.garments.some((item) => item.id === garmentId)) throw new Error('Garment not found.');
  const roundNo = state.sampleRounds.filter((item) => item.garmentId === garmentId).reduce((max, item) => Math.max(max, item.roundNo), 0) + 1;
  const sampleRound: CanonicalSampleRound = { ...record(state.studioId), factoryId: null, garmentId, garmentVersionId: state.garmentVersions.filter((item) => item.garmentId === garmentId).sort((a, b) => b.versionNo - a.versionNo)[0]?.id ?? null, notes: '', requestedAt: null, roundNo, sampleType: sampleType.trim() || `Sample ${roundNo}`, status: 'received', receivedAt: new Date().toISOString() };
  return { sampleRound, state: { ...state, sampleRounds: [...state.sampleRounds, sampleRound] } };
}

export function recordFitActual(state: CanonicalWorkspaceState, input: Extract<MeasurementCommand, { type: 'record_fit_actual' }>) {
  if (!Number.isFinite(input.actual) || input.actual < 0) throw new Error('Sample actual must be a non-negative decimal.');
  const sample = state.sampleRounds.find((item) => item.id === input.sampleRoundId);
  const target = state.measurementValues.find((item) => item.setId === input.setId && item.pomPointId === input.pomPointId && item.size === input.size);
  if (!sample || !target) throw new Error('Sample actual requires an existing target row.');
  const current = state.fitMeasurements.find((item) => item.sampleRoundId === input.sampleRoundId && item.pomPointId === input.pomPointId && item.size === input.size);
  if (current && input.expectedRevision !== undefined && current.revision !== input.expectedRevision) throw new Error('Sample actual changed elsewhere. Review the conflict before saving.');
  const variance = round4(input.actual - target.target);
  const fit: CanonicalFitMeasurement = current
    ? touch({ ...current, actual: round4(input.actual), variance })
    : { ...record(state.studioId), fitSessionId: null, garmentVersionId: sample.garmentVersionId, sampleRoundId: sample.id, pomPointId: input.pomPointId, size: input.size, actual: round4(input.actual), variance };
  return { fit, state: { ...state, fitMeasurements: [...state.fitMeasurements.filter((item) => item.id !== fit.id), fit] } };
}

export function createGradeRule(state: CanonicalWorkspaceState, input: Extract<MeasurementCommand, { type: 'create_grade_rule' }>) {
  const sizes = input.sizeRange.map((item) => item.trim()).filter(Boolean);
  if (sizes.length < 2 || new Set(sizes).size !== sizes.length) throw new Error('Grade range needs at least two unique ordered sizes.');
  const rule: CanonicalGradeRule = { ...record(state.studioId), specId: input.specId, name: input.name.trim() || 'Standard grade', sizeRange: sizes, status: 'draft' };
  const values: CanonicalGradeRuleValue[] = input.values.map((value) => {
    if (!Number.isFinite(value.delta) || value.fromSize === value.toSize || !sizes.includes(value.fromSize) || !sizes.includes(value.toSize)) throw new Error('Every grade delta needs valid adjacent sizes and a decimal delta.');
    if (!state.pomPoints.some((point) => point.id === value.pomPointId && point.specId === input.specId)) throw new Error('Grade POM does not belong to this specification.');
    return { ...record(state.studioId), gradeRuleId: rule.id, pomPointId: value.pomPointId, fromSize: value.fromSize, toSize: value.toSize, delta: round4(value.delta) };
  });
  return { rule, values, state: { ...state, gradeRules: [...state.gradeRules, rule], gradeRuleValues: [...state.gradeRuleValues, ...values] } };
}

export function previewGradeRule(state: CanonicalWorkspaceState, setId: string, gradeRuleId: string): GradePreview {
  const set = state.measurementSets.find((item) => item.id === setId);
  const rule = state.gradeRules.find((item) => item.id === gradeRuleId);
  if (!set || !rule || set.specId !== rule.specId) return { rows: [], warnings: ['Select a compatible base set and grade rule.'] };
  const rows: GradePreview['rows'] = [];
  const warnings: string[] = [];
  const ruleValues = state.gradeRuleValues.filter((item) => item.gradeRuleId === rule.id);
  for (const point of state.pomPoints.filter((item) => item.specId === set.specId)) {
    const base = state.measurementValues.find((item) => item.setId === set.id && item.pomPointId === point.id && item.size === set.baseSize);
    if (!base) { warnings.push(`${point.code} has no ${set.baseSize} base target.`); continue; }
    const targets = new Map<string, number>([[set.baseSize, base.target]]);
    const baseIndex = rule.sizeRange.indexOf(set.baseSize);
    if (baseIndex < 0) { warnings.push(`Base size ${set.baseSize} is outside the grade range.`); continue; }
    for (let index = baseIndex + 1; index < rule.sizeRange.length; index += 1) applyGradeStep(point.id, rule.sizeRange[index - 1], rule.sizeRange[index], targets, ruleValues, rows, warnings);
    for (let index = baseIndex - 1; index >= 0; index -= 1) applyGradeStep(point.id, rule.sizeRange[index + 1], rule.sizeRange[index], targets, ruleValues, rows, warnings);
    rows.push({ pomPointId: point.id, size: set.baseSize, target: base.target, sourceSize: set.baseSize, delta: 0 });
  }
  return { rows: rows.sort((a, b) => a.pomPointId.localeCompare(b.pomPointId) || rule.sizeRange.indexOf(a.size) - rule.sizeRange.indexOf(b.size)), warnings };
}

export function commitGradePreview(state: CanonicalWorkspaceState, sourceSetId: string, gradeRuleId: string, name = 'Graded set') {
  const source = state.measurementSets.find((item) => item.id === sourceSetId);
  if (!source) throw new Error('Base measurement set not found.');
  const preview = previewGradeRule(state, sourceSetId, gradeRuleId);
  if (preview.warnings.length) throw new Error(preview.warnings[0]);
  const created = createMeasurementSet(state, source.specId, name, 'graded');
  let next = created.state;
  for (const row of preview.rows) {
    const base = state.measurementValues.find((item) => item.setId === sourceSetId && item.pomPointId === row.pomPointId && item.size === source.baseSize)!;
    next = upsertMeasurementValue(next, { type: 'upsert_measurement', setId: created.set.id, pomPointId: row.pomPointId, size: row.size, target: row.target, tolerancePlus: base.tolerancePlus, toleranceMinus: base.toleranceMinus }).state;
  }
  return { set: created.set, preview, state: next };
}

export function parseMeasurementCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const errors: CsvImportError[] = [];
  if (!lines.length) return { errors: [{ row: 1, column: 'file', message: 'CSV is empty.' }], rows: [] as MeasurementCsvRow[] };
  const headers = parseCsvLine(lines[0]).map((value) => value.trim().toLowerCase());
  for (const header of CSV_HEADERS) if (!headers.includes(header)) errors.push({ row: 1, column: header, message: `Missing required column: ${header}.` });
  if (errors.length) return { errors, rows: [] as MeasurementCsvRow[] };
  const seen = new Set<string>();
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line); const rowNo = index + 2;
    if (unclosedCsvQuote(line)) errors.push({ row: rowNo, column: 'row', message: 'Unclosed quoted field.' });
    if (values.length !== headers.length) errors.push({ row: rowNo, column: 'row', message: `Expected ${headers.length} columns but received ${values.length}.` });
    const get = (name: typeof CSV_HEADERS[number]) => values[headers.indexOf(name)]?.trim() ?? '';
    const row = { code: get('code').toUpperCase(), name: get('name'), method: get('method'), x: Number(get('x')), y: Number(get('y')), size: get('size'), target: Number(get('target')), tolerancePlus: Number(get('tolerance_plus')), toleranceMinus: Number(get('tolerance_minus')) };
    if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(row.code)) errors.push({ row: rowNo, column: 'code', message: 'Invalid POM code.' });
    if (!row.name) errors.push({ row: rowNo, column: 'name', message: 'Name is required.' });
    if (!row.method) errors.push({ row: rowNo, column: 'method', message: 'Method is required.' });
    if (!row.size) errors.push({ row: rowNo, column: 'size', message: 'Size is required.' });
    if (![row.x, row.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) errors.push({ row: rowNo, column: 'x/y', message: 'Anchors must be decimals from 0 through 1.' });
    if (![row.target, row.tolerancePlus, row.toleranceMinus].every((value) => Number.isFinite(value) && value >= 0)) errors.push({ row: rowNo, column: 'measurements', message: 'Targets and tolerances must be non-negative decimals.' });
    for (const column of ['target', 'tolerance_plus', 'tolerance_minus'] as const) if (decimalPlaces(get(column)) > 4) errors.push({ row: rowNo, column, message: 'Use no more than four decimal places.' });
    const key = `${row.code}:${row.size}`; if (seen.has(key)) errors.push({ row: rowNo, column: 'code/size', message: 'Duplicate POM and size row.' }); seen.add(key);
    return row;
  });
  return { errors, rows };
}

export function applyMeasurementCsv(state: CanonicalWorkspaceState, specId: string, setId: string, text: string) {
  const parsed = parseMeasurementCsv(text);
  if (parsed.errors.length) return { ...parsed, state };
  let next = state;
  for (const row of parsed.rows) {
    let point = next.pomPoints.find((item) => item.specId === specId && item.code === row.code);
    if (!point) { const created = createPomPoint(next, { type: 'create_pom', specId, code: row.code, name: row.name, method: row.method, anchor: { x: row.x, y: row.y } }); next = created.state; point = created.point; }
    next = upsertMeasurementValue(next, { type: 'upsert_measurement', setId, pomPointId: point.id, size: row.size, target: row.target, tolerancePlus: row.tolerancePlus, toleranceMinus: row.toleranceMinus }).state;
  }
  return { ...parsed, state: next };
}

export function compareMeasurementVersion(state: CanonicalWorkspaceState, versionId: string, specId: string): StructuralMeasurementDiff[] {
  const version = state.garmentVersions.find((item) => item.id === versionId);
  const snapshot = version?.snapshot as { pomPoints?: CanonicalPomPoint[]; measurementValues?: CanonicalMeasurementValue[] } | undefined;
  if (!snapshot) return [];
  return [...diffEntities(snapshot.pomPoints ?? [], state.pomPoints.filter((item) => item.specId === specId), 'pom', (item) => item.id), ...diffEntities(snapshot.measurementValues ?? [], state.measurementValues.filter((item) => state.measurementSets.some((set) => set.id === item.setId && set.specId === specId)), 'measurement', measurementKey)];
}

export function restoreMeasurementSelection(state: CanonicalWorkspaceState, sourceVersionId: string, resultVersionId: string, specId: string, selection: { pomPointIds: string[]; measurementKeys: string[] }, reason: string) {
  const source = state.garmentVersions.find((item) => item.id === sourceVersionId);
  const spec = state.technicalSpecs.find((item) => item.id === specId);
  if (!source || !spec) throw new Error('Restore source or technical specification not found.');
  const snapshot = source.snapshot as { pomPoints?: CanonicalPomPoint[]; measurementValues?: CanonicalMeasurementValue[] };
  const selectedPom = (snapshot.pomPoints ?? []).filter((item) => selection.pomPointIds.includes(item.id));
  const selectedValues = (snapshot.measurementValues ?? []).filter((item) => selection.measurementKeys.includes(measurementKey(item)));
  let pomPoints = [...state.pomPoints]; let measurementValues = [...state.measurementValues];
  for (const sourcePoint of selectedPom) { const current = pomPoints.find((item) => item.id === sourcePoint.id); const restored = current ? touch({ ...current, name: sourcePoint.name, method: sourcePoint.method, diagramAnchor: sourcePoint.diagramAnchor, sortOrder: sourcePoint.sortOrder }) : { ...sourcePoint, revision: sourcePoint.revision + 1, updatedAt: new Date().toISOString() }; pomPoints = [...pomPoints.filter((item) => item.id !== restored.id), restored]; }
  for (const sourceValue of selectedValues) { const current = measurementValues.find((item) => measurementKey(item) === measurementKey(sourceValue)); const restored = current ? touch({ ...current, target: sourceValue.target, tolerancePlus: sourceValue.tolerancePlus, toleranceMinus: sourceValue.toleranceMinus }) : { ...sourceValue, revision: sourceValue.revision + 1, updatedAt: new Date().toISOString() }; measurementValues = [...measurementValues.filter((item) => measurementKey(item) !== measurementKey(restored)), restored]; }
  const garment = state.garments.find((item) => item.id === spec.garmentId);
  const selectedKeys = [...selection.pomPointIds.map((id) => `technical:pomPoints:${id}:$record`), ...selection.measurementKeys.map((id) => `technical:measurementValues:${id}:$record`)];
  const operation: CanonicalRestoreOperation = {
    ...record(state.studioId),
    actorId: null,
    baseRevision: garment?.revision ?? 1,
    dependencies: [],
    garmentId: spec.garmentId,
    inversePatch: [],
    previewChecksum: source.checksum,
    reason: reason.trim() || 'Restore selected technical rows',
    replayPatch: [],
    resultRevision: garment?.revision ?? 1,
    resultVersionId,
    scope: 'technical',
    selectedKeys,
    selectedMeasurementKeys: selection.measurementKeys,
    selectedPomPointIds: selection.pomPointIds,
    sourceVersionId,
  };
  return { operation, state: { ...state, pomPoints, measurementValues, restoreOperations: [...state.restoreOperations, operation] } };
}

export function measurementKey(value: Pick<CanonicalMeasurementValue, 'setId' | 'pomPointId' | 'size'>) { return `${value.setId}:${value.pomPointId}:${value.size}`; }
function validateAnchor(anchor: { x: number; y: number; view?: 'front' | 'back' }) { if (![anchor.x, anchor.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) throw new Error('POM anchors must be normalized from 0 through 1.'); if (anchor.view !== undefined && anchor.view !== 'front' && anchor.view !== 'back') throw new Error('POM anchors may reference the Front or Back flat.'); }
function validateMeasurement(target: number, plus: number, minus: number) { if (![target, plus, minus].every((value) => Number.isFinite(value) && value >= 0)) throw new Error('Targets and tolerances must be non-negative decimals.'); }
function applyGradeStep(pomPointId: string, fromSize: string, toSize: string, targets: Map<string, number>, values: CanonicalGradeRuleValue[], rows: GradePreview['rows'], warnings: string[]) { const direct = values.find((item) => item.pomPointId === pomPointId && item.fromSize === fromSize && item.toSize === toSize); const reverse = values.find((item) => item.pomPointId === pomPointId && item.fromSize === toSize && item.toSize === fromSize); const delta = direct?.delta ?? (reverse ? -reverse.delta : null); const source = targets.get(fromSize); if (delta === null || source === undefined) { warnings.push(`Missing ${fromSize} → ${toSize} grade delta.`); return; } const target = round4(source + delta); if (target < 0) { warnings.push(`${toSize} produces a negative target.`); return; } targets.set(toSize, target); rows.push({ pomPointId, size: toSize, target, sourceSize: fromSize, delta }); }
function diffEntities<T>(before: T[], after: T[], entity: 'pom' | 'measurement', key: (item: T) => string): StructuralMeasurementDiff[] { const result: StructuralMeasurementDiff[] = []; const beforeMap = new Map(before.map((item) => [key(item), item])); const afterMap = new Map(after.map((item) => [key(item), item])); for (const [id, value] of beforeMap) { const current = afterMap.get(id); if (!current) result.push({ key: id, kind: 'removed', entity, before: value, after: null }); else if (JSON.stringify(stripMeta(value)) !== JSON.stringify(stripMeta(current))) result.push({ key: id, kind: 'changed', entity, before: value, after: current }); } for (const [id, value] of afterMap) if (!beforeMap.has(id)) result.push({ key: id, kind: 'added', entity, before: null, after: value }); return result; }
function stripMeta(value: unknown) { if (!value || typeof value !== 'object') return value; const { revision: _revision, updatedAt: _updatedAt, ...rest } = value as Record<string, unknown>; return rest; }
function parseCsvLine(line: string) { const values: string[] = []; let current = ''; let quoted = false; for (let index = 0; index < line.length; index += 1) { const char = line[index]; if (char === '"' && quoted && line[index + 1] === '"') { current += '"'; index += 1; } else if (char === '"') quoted = !quoted; else if (char === ',' && !quoted) { values.push(current); current = ''; } else current += char; } values.push(current); return values; }
function unclosedCsvQuote(line: string) { let quoted = false; for (let index = 0; index < line.length; index += 1) if (line[index] === '"') { if (quoted && line[index + 1] === '"') index += 1; else quoted = !quoted; } return quoted; }
function decimalPlaces(value: string) { const normalized = value.toLowerCase(); if (normalized.includes('e')) return 5; return normalized.includes('.') ? normalized.split('.')[1].length : 0; }
function record(studioId: string) { const now = new Date().toISOString(); return { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now }; }
function touch<T extends { revision: number; updatedAt: string }>(value: T): T { return { ...value, revision: value.revision + 1, updatedAt: new Date().toISOString() }; }
function round4(value: number) { return Math.round((value + Number.EPSILON) * 10000) / 10000; }
