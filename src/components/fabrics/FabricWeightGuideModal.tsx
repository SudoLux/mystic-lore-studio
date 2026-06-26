import { useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRightLeft,
  Calculator,
  Info,
  Ruler,
  Scale,
  Shirt,
  X,
} from 'lucide-react';
import { Button } from '../shared/Button';

type FabricWeightGuideModalProps = {
  onClose: () => void;
};

const OZ_PER_GSM = 1 / 33.9057;
const GSM_PER_OZ = 33.9057;
const GSM_TABLE_VALUES = [
  50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400,
  450, 500,
];

const weightBands = [
  {
    label: 'Lightweight',
    range: '< 150 gsm / < 4.4 oz',
    guidance: 'Shirting, voile, lawn, lining, soft layers, airy summer pieces.',
  },
  {
    label: 'Medium',
    range: '150-250 gsm / 4.4-7.4 oz',
    guidance: 'Everyday shirting, light pants, dresses, relaxed tops, mid layers.',
  },
  {
    label: 'Medium-heavy',
    range: '250-350 gsm / 7.4-10.3 oz',
    guidance: 'Chino, workwear shirts, structured skirts, overshirts, soft jackets.',
  },
  {
    label: 'Heavyweight',
    range: '350+ gsm / 10.3+ oz',
    guidance: 'Denim, coats, structured jackets, canvas, utility garments.',
  },
];

export function FabricWeightGuideModal({ onClose }: FabricWeightGuideModalProps) {
  const [gsmInput, setGsmInput] = useState('');
  const [ozInput, setOzInput] = useState('');
  const [pieceGsm, setPieceGsm] = useState('');
  const [pieceWidth, setPieceWidth] = useState('58');
  const [pieceYards, setPieceYards] = useState('');

  const estimatedWeight = useMemo(() => {
    const gsm = parsePositiveNumber(pieceGsm);
    const widthInches = parsePositiveNumber(pieceWidth);
    const yards = parsePositiveNumber(pieceYards);

    if (!gsm || !widthInches || !yards) {
      return null;
    }

    const squareMeters = widthInches * 0.0254 * yards * 0.9144;
    const grams = gsm * squareMeters;
    const pounds = grams / 453.59237;

    return {
      grams,
      pounds,
      squareMeters,
    };
  }, [pieceGsm, pieceWidth, pieceYards]);

  const updateGsm = (value: string) => {
    setGsmInput(value);
    const gsm = parsePositiveNumber(value);
    setOzInput(gsm ? formatDecimal(gsmToOz(gsm), 2) : '');
  };

  const updateOz = (value: string) => {
    setOzInput(value);
    const oz = parsePositiveNumber(value);
    setGsmInput(oz ? formatDecimal(ozToGsm(oz), 2) : '');
  };

  const clearConversions = () => {
    setGsmInput('');
    setOzInput('');
  };

  return (
    <div className="studio-scrollbar fixed inset-0 z-50 overflow-y-auto bg-midnight/84 px-3 py-4 backdrop-blur-xl sm:px-5 sm:py-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-bronze/30 bg-[linear-gradient(135deg,rgba(45,92,107,0.24),rgba(10,10,10,0.96),rgba(61,43,31,0.58))] shadow-[0_30px_100px_rgba(0,0,0,0.46)]">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-bronze/24 bg-midnight/92 p-4 backdrop-blur-xl sm:p-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-ember">
              Fabric weight guide
            </p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stardust sm:text-3xl">
              GSM to OZ converter
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stardust/62">
              Convert grams per square meter to ounces per square yard, estimate
              piece weight, and scan practical garment weight ranges.
            </p>
          </div>
          <button
            aria-label="Close fabric weight guide"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-bronze/30 bg-midnight/65 text-stardust/72 transition hover:border-ember/45 hover:text-stardust"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} strokeWidth={1.9} />
          </button>
        </div>

        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="space-y-5">
            <GuidePanel
              icon={<ArrowRightLeft aria-hidden="true" size={18} strokeWidth={1.9} />}
              kicker="Live converter"
              title="Convert either direction"
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                <NumberField
                  label="GSM (g/m2)"
                  onChange={updateGsm}
                  placeholder="Enter GSM"
                  value={gsmInput}
                />
                <div className="hidden h-12 w-12 items-center justify-center rounded-2xl border border-bronze/24 bg-midnight/46 text-ember sm:flex">
                  <ArrowRightLeft aria-hidden="true" size={18} strokeWidth={1.9} />
                </div>
                <NumberField
                  label="OZ (oz/yd2)"
                  onChange={updateOz}
                  placeholder="Enter OZ"
                  value={ozInput}
                />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button onClick={clearConversions} size="sm" variant="secondary">
                  Clear
                </Button>
                <p className="text-xs leading-5 text-stardust/50">
                  Results round to two decimals for studio planning.
                </p>
              </div>
            </GuidePanel>

            <GuidePanel
              icon={<Calculator aria-hidden="true" size={18} strokeWidth={1.9} />}
              kicker="Equation"
              title="Formula"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <FormulaCard label="GSM to OZ" value="oz/yd2 = gsm / 33.9057" />
                <FormulaCard label="OZ to GSM" value="gsm = oz/yd2 x 33.9057" />
              </div>
              <p className="mt-4 text-sm leading-6 text-stardust/58">
                Use these as fabric weight equivalents. Hand feel still depends
                on fiber, weave or knit, finish, stretch, and structure.
              </p>
            </GuidePanel>

            <GuidePanel
              icon={<Scale aria-hidden="true" size={18} strokeWidth={1.9} />}
              kicker="Piece estimate"
              title="How heavy is this cut?"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label="GSM"
                  onChange={setPieceGsm}
                  placeholder="250"
                  value={pieceGsm}
                />
                <NumberField
                  label="Width inches"
                  onChange={setPieceWidth}
                  placeholder="58"
                  value={pieceWidth}
                />
                <NumberField
                  label="Yards"
                  onChange={setPieceYards}
                  placeholder="3"
                  value={pieceYards}
                />
              </div>
              <div className="mt-4 rounded-2xl border border-bronze/22 bg-midnight/42 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-stardust/44">
                  Estimated piece weight
                </p>
                <p className="mt-2 text-2xl font-semibold text-stardust">
                  {estimatedWeight
                    ? `${formatDecimal(estimatedWeight.pounds, 2)} lb`
                    : 'Enter values'}
                </p>
                <p className="mt-2 text-sm leading-6 text-stardust/56">
                  {estimatedWeight
                    ? `${formatDecimal(estimatedWeight.grams, 0)} g across ${formatDecimal(
                        estimatedWeight.squareMeters,
                        2,
                      )} m2`
                    : 'A quick planning estimate for carry weight, shipping, or garment heft.'}
                </p>
              </div>
            </GuidePanel>
          </div>

          <div className="space-y-5">
            <GuidePanel
              icon={<Ruler aria-hidden="true" size={18} strokeWidth={1.9} />}
              kicker="Reference table"
              title="GSM to OZ quick chart"
            >
              <div className="overflow-hidden rounded-2xl border border-bronze/24">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[linear-gradient(90deg,rgba(200,155,60,0.32),rgba(45,92,107,0.26))] text-stardust">
                    <tr>
                      <th className="px-4 py-3 font-semibold">GSM</th>
                      <th className="px-4 py-3 font-semibold">OZ / yd2</th>
                      <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                        Signal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-bronze/16 bg-midnight/34">
                    {GSM_TABLE_VALUES.map((gsm) => (
                      <tr key={gsm}>
                        <td className="px-4 py-3 font-medium text-stardust">
                          {gsm} gsm
                        </td>
                        <td className="px-4 py-3 text-stardust/72">
                          {formatDecimal(gsmToOz(gsm), 2)} oz
                        </td>
                        <td className="hidden px-4 py-3 text-stardust/52 sm:table-cell">
                          {getWeightSignal(gsm)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GuidePanel>

            <GuidePanel
              icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
              kicker="Garment planning"
              title="Weight bands"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {weightBands.map((band) => (
                  <div
                    className="rounded-2xl border border-bronze/22 bg-midnight/38 p-4"
                    key={band.label}
                  >
                    <p className="text-sm font-semibold text-stardust">
                      {band.label}
                    </p>
                    <p className="mt-1 text-xs font-medium text-ember/86">
                      {band.range}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-stardust/58">
                      {band.guidance}
                    </p>
                  </div>
                ))}
              </div>
            </GuidePanel>

            <GuidePanel
              icon={<Info aria-hidden="true" size={18} strokeWidth={1.9} />}
              kicker="Studio notes"
              title="Useful reminders"
            >
              <ul className="space-y-3 text-sm leading-6 text-stardust/62">
                <li>
                  Knits often feel heavier than the number suggests because of
                  stretch, recovery, and density.
                </li>
                <li>
                  Twills, denim, canvas, and coating can read structured even at
                  similar weights to softer plain weaves.
                </li>
                <li>
                  Width changes the total piece weight, but not GSM or OZ per
                  square yard.
                </li>
              </ul>
            </GuidePanel>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuidePanel({
  children,
  icon,
  kicker,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  kicker: string;
  title: string;
}) {
  return (
    <section className="rounded-3xl border border-bronze/24 bg-[linear-gradient(145deg,rgba(10,10,10,0.46),rgba(61,43,31,0.2))] p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.035)] sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-bronze/26 bg-midnight/48 text-ember">
          {icon}
        </span>
        <div>
          <p className="text-[0.66rem] font-medium uppercase tracking-[0.18em] text-ember/78">
            {kicker}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-stardust">{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function FormulaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/22 bg-midnight/42 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-stardust/44">
        {label}
      </p>
      <p className="mt-2 font-mono text-sm text-stardust/80">{value}</p>
    </div>
  );
}

function NumberField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/48">
        {label}
      </span>
      <input
        className="mt-2 min-h-12 w-full rounded-2xl border border-bronze/28 bg-midnight/55 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60"
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="number"
        value={value}
      />
    </label>
  );
}

function gsmToOz(gsm: number) {
  return gsm * OZ_PER_GSM;
}

function ozToGsm(oz: number) {
  return oz * GSM_PER_OZ;
}

function formatDecimal(value: number, digits: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getWeightSignal(gsm: number) {
  if (gsm < 150) {
    return 'Lightweight';
  }

  if (gsm < 250) {
    return 'Medium';
  }

  if (gsm < 350) {
    return 'Medium-heavy';
  }

  return 'Heavyweight';
}
