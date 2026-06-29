import type {
  Fabric,
  FabricDrape,
  FabricWeight,
} from '../types/studio';

export const OUNCES_TO_GSM = 33.9057;

export const fabricColorPresets = [
  { hex: '#B43A3A', label: 'Red' },
  { hex: '#C86B2D', label: 'Orange' },
  { hex: '#D5AD36', label: 'Yellow' },
  { hex: '#477A4E', label: 'Green' },
  { hex: '#2D6F72', label: 'Teal' },
  { hex: '#315D94', label: 'Blue' },
  { hex: '#273B6D', label: 'Indigo' },
  { hex: '#704A82', label: 'Violet' },
  { hex: '#C46B82', label: 'Pink' },
  { hex: '#111111', label: 'Black' },
  { hex: '#F4F1E8', label: 'White' },
  { hex: '#EDE3CF', label: 'Ivory' },
  { hex: '#77746F', label: 'Gray' },
  { hex: '#C3A36C', label: 'Tan' },
  { hex: '#654433', label: 'Brown' },
] as const;

export const fabricTypes = [
  'Denim',
  'Twill',
  'Canvas',
  'Poplin',
  'Broadcloth',
  'Oxford',
  'Chambray',
  'Linen',
  'Wool',
  'Suiting',
  'Silk',
  'Satin',
  'Velvet',
  'Corduroy',
  'Jersey',
  'Rib Knit',
  'Ponte',
  'Fleece',
  'Chiffon',
  'Organza',
  'Lace',
  'Mesh',
  'Leather',
  'Faux Leather',
  'Other',
] as const;

export const fabricDrapes: FabricDrape[] = [
  'Fluid',
  'Soft',
  'Balanced',
  'Crisp',
  'Structured',
];

export const fabricWeights: FabricWeight[] = [
  'Light',
  'Medium',
  'Medium-heavy',
  'Heavy',
];

export const handFeelPresets = [
  'Smooth',
  'Sleek',
  'Silky',
  'Soft',
  'Crisp',
  'Stiff',
  'Dry',
  'Fuzzy',
  'Rough',
  'Plush',
  'Furry',
  'Nubby',
  'Spongy',
  'Stretchy',
  'Custom',
] as const;

export const fiberPresets = [
  'Cotton',
  'Linen',
  'Wool',
  'Silk',
  'Rayon/Viscose',
  'Polyester',
  'Nylon',
  'Spandex/Elastane',
  'Acrylic',
  'Modal',
  'Lyocell/Tencel',
  'Other',
] as const;

export function ouncesToGsm(ounces: number) {
  return ounces * OUNCES_TO_GSM;
}

export function gsmToOunces(gsm: number) {
  return gsm / OUNCES_TO_GSM;
}

export function getFabricWeightCategory(
  gsm: number | undefined,
  fallback: FabricWeight = 'Medium',
): FabricWeight {
  if (!gsm || !Number.isFinite(gsm) || gsm <= 0) return fallback;
  if (gsm < 150) return 'Light';
  if (gsm < 250) return 'Medium';
  if (gsm < 350) return 'Medium-heavy';
  return 'Heavy';
}

export function normalizeFabricDrape(value: unknown): FabricDrape {
  if (value === 'Stretch') return 'Soft';
  return fabricDrapes.includes(value as FabricDrape)
    ? (value as FabricDrape)
    : 'Balanced';
}

export function normalizeWovenKnit(value: unknown): '' | 'Knit' | 'Woven' {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  const normalized = value.toLowerCase();
  return /knit|jersey|rib|interlock|ponte|tricot|fleece|terry/.test(normalized)
    ? 'Knit'
    : 'Woven';
}

export function getFabricColorHex(
  fabric: Pick<Fabric, 'colorFamily' | 'primaryColor' | 'primaryColorHex'>,
) {
  if (isHexColor(fabric.primaryColorHex)) return fabric.primaryColorHex;
  const searchValues = [fabric.primaryColor, fabric.colorFamily].map((value) =>
    value.toLowerCase(),
  );
  const preset = fabricColorPresets.find(({ label }) =>
    searchValues.some((value) => value.includes(label.toLowerCase())),
  );
  return preset?.hex ?? '#C89B3C';
}

export function getFabricDisplayColorName(
  fabric: Pick<Fabric, 'colorFamily' | 'primaryColor'>,
) {
  return fabric.primaryColor.trim() || fabric.colorFamily;
}

export function getFabricFallbackBackground(
  fabric: Pick<Fabric, 'colorFamily' | 'primaryColor' | 'primaryColorHex'>,
) {
  const hex = getFabricColorHex(fabric);
  return `radial-gradient(circle at 18% 14%, rgba(237,227,207,0.18), transparent 28%), linear-gradient(135deg, ${shadeHex(hex, -42)}, #0A0A0A 58%, ${shadeHex(hex, 8)})`;
}

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function shadeHex(hex: string, amount: number) {
  const number = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.min(255, Math.max(0, ((number >> shift) & 0xff) + amount));
  return `#${[channel(16), channel(8), channel(0)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')}`;
}
