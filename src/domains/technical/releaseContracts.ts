import type {
  CanonicalBomItem,
  CanonicalConstructionDetail,
  CanonicalConstructionStep,
  CanonicalInventoryEntry,
  CanonicalValidationIssue,
} from '../workspace';

export const releaseRulesetVersion = 'wp4-release-v1';
export const quantityUnits: CanonicalInventoryEntry['unit'][] = ['mm', 'cm', 'm', 'in', 'yd', 'g', 'kg', 'oz', 'lb', 'each', 'pair', 'set', 'roll'];
export const componentQuantityUnits: CanonicalInventoryEntry['unit'][] = ['each', 'pair', 'set'];
export const materialQuantityUnits: CanonicalInventoryEntry['unit'][] = ['mm', 'cm', 'm', 'in', 'yd', 'g', 'kg', 'oz', 'lb', 'each', 'roll'];
export const techPackSectionOrder = ['overview', 'flats', 'pom_measurements', 'bom', 'construction', 'grading_files'] as const;

export type TechPackSectionId = typeof techPackSectionOrder[number];

export type BomItemInput = {
  componentVariantId?: string | null;
  costImpact?: number;
  currency?: string;
  description: string;
  intentionalFreeText?: boolean;
  itemType: CanonicalBomItem['itemType'];
  materialVariantId?: string | null;
  placement: string;
  quantity: number;
  shortageQuantity?: number;
  specId: string;
  status?: CanonicalBomItem['status'];
  supplierItemId?: string | null;
  unit: CanonicalInventoryEntry['unit'];
  unitCost?: number;
};

export type ConstructionStepInput = {
  machine?: string;
  machineRequired?: boolean;
  operation: string;
  seamAllowance?: number | null;
  status?: CanonicalConstructionStep['status'];
  stitchRequired?: boolean;
  stitchSpec?: string;
};

export type ConstructionDetailInput = {
  anchor?: CanonicalConstructionDetail['anchor'];
  assetId?: string | null;
  callout: string;
  severity?: CanonicalConstructionDetail['severity'];
};

export type ReleaseWaiverInput = {
  followUpTaskTitle: string;
  reason: string;
  ruleCode: string;
};

export type ReleaseInput = {
  actorId: string;
  checkpointLabel: string;
  specId: string;
  templateId: string;
  waivers: ReleaseWaiverInput[];
};

export type ReleasePreview = {
  blocking: CanonicalValidationIssue[];
  issues: CanonicalValidationIssue[];
  waivable: CanonicalValidationIssue[];
};

export type StructuredTechPackSection = {
  id: TechPackSectionId;
  records: unknown;
  title: string;
};
