import type { CanonicalGradeRuleValue, CanonicalPomPoint } from '../workspace';

export type MeasurementUnit = 'mm' | 'cm' | 'in';
export type MeasurementCommand =
  | { type: 'create_pom'; specId: string; code: string; name: string; method: string; anchor: CanonicalPomPoint['diagramAnchor'] }
  | { type: 'update_pom'; pomPointId: string; patch: Partial<Pick<CanonicalPomPoint, 'name' | 'method' | 'diagramAnchor'>>; expectedRevision?: number }
  | { type: 'create_measurement_set'; specId: string; name: string; sampleType?: string | null }
  | { type: 'upsert_measurement'; setId: string; pomPointId: string; size: string; target: number; tolerancePlus: number; toleranceMinus: number; expectedRevision?: number }
  | { type: 'create_sample_round'; garmentId: string; sampleType: string }
  | { type: 'record_fit_actual'; sampleRoundId: string; setId: string; pomPointId: string; size: string; actual: number; expectedRevision?: number }
  | { type: 'create_grade_rule'; specId: string; name: string; sizeRange: string[]; values: Array<Omit<CanonicalGradeRuleValue, 'createdAt' | 'id' | 'revision' | 'studioId' | 'updatedAt' | 'gradeRuleId'>> };

export type CsvImportError = { column: string; message: string; row: number };
export type MeasurementCsvRow = { code: string; name: string; method: string; x: number; y: number; size: string; target: number; tolerancePlus: number; toleranceMinus: number };
export type GradePreviewRow = { pomPointId: string; size: string; target: number; sourceSize: string; delta: number };
export type GradePreview = { rows: GradePreviewRow[]; warnings: string[] };
export type StructuralMeasurementDiff = { key: string; kind: 'added' | 'changed' | 'removed'; entity: 'pom' | 'measurement'; before: unknown; after: unknown };
export type MeasurementSetIssue = { code: 'missing_pom' | 'missing_base_target' | 'incomplete_graded_sizes' | 'duplicate_row'; message: string; pomPointId?: string; severity: 'error' | 'warning' };
