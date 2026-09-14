import type { CanonicalFlatAnnotation, TechnicalFlatView } from '../workspace';

export const requiredFlatViews: TechnicalFlatView[] = ['front', 'back'];
export const flatViewOptions: TechnicalFlatView[] = ['front', 'back', 'left', 'right', 'inside', 'detail'];
export const technicalRulesetVersion = 'wp4-flats-v1';

export type TechnicalCommand =
  | { type: 'create_spec'; garmentId: string; baseSize: string; unit: 'mm' | 'cm' | 'in' }
  | { type: 'update_spec_size_range'; specId: string; baseSize: string; sizeSystem: 'alpha' | 'numeric' | 'custom'; sizeRange: string[] }
  | { type: 'register_flat'; specId: string; assetId: string; view: TechnicalFlatView; versionLabel: string }
  | { type: 'add_annotation'; flatId: string; anchor: CanonicalFlatAnnotation['anchor']; label: string; detail?: string; severity: CanonicalFlatAnnotation['severity'] }
  | { type: 'set_annotation_status'; annotationId: string; status: CanonicalFlatAnnotation['status'] }
  | { type: 'approve_flat'; flatId: string; approvedBy?: string | null }
  | { type: 'run_validation'; specId: string };

export type FlatComparison = {
  current: { assetId: string; checksum: string; flatId: string; revisionLabel: string };
  previous: { assetId: string; checksum: string; flatId: string; revisionLabel: string } | null;
  view: TechnicalFlatView;
};
