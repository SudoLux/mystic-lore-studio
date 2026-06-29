import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Archive,
  DollarSign,
  Link2,
  MapPin,
  Package,
  PackagePlus,
  Pencil,
  Ruler,
  Scale,
  Search,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { Card } from '../../components/shared/Card';
import { FabricWeightGuideModal } from '../../components/fabrics/FabricWeightGuideModal';
import { FilterSheet } from '../../components/shared/FilterSheet';
import { ImageSlot } from '../../components/shared/ImageSlot';
import { ImageReadabilityOverlay } from '../../components/shared/ImageReadabilityOverlay';
import { MobileCardRow } from '../../components/shared/MobileCardRow';
import { MobilePageHeader } from '../../components/shared/MobilePageHeader';
import { MobileSummaryStrip } from '../../components/shared/MobileSummaryStrip';
import { PageHeader } from '../../components/shared/PageHeader';
import { StoredImage } from '../../components/shared/StoredImage';
import { useStudioData } from '../../hooks/useStudioData';
import { cn } from '../../lib/classes';
import {
  formatStudioDate,
  studioDateTimestamp,
} from '../../lib/dates';
import { getFabricImage } from '../../lib/imageAssets';
import {
  LOW_YARDAGE_THRESHOLD,
  calculateFabricYardage,
  getDerivedFabricStatus,
  isLowYardage as hasLowAvailableYardage,
} from '../../lib/yardage';
import type { ApparelProject, Fabric, LinkedMaterial } from '../../types/studio';

type FabricVaultPageProps = {
  fabricId?: string;
  onBack: () => void;
  onDeleteFabric: (fabric: Fabric) => void;
  onEditFabric: (fabric: Fabric) => void;
  onNewFabric: () => void;
  onOpenFabric: (fabricId: string) => void;
};

type FabricSort =
  | 'Recently updated'
  | 'Name A-Z'
  | 'Yardage high to low'
  | 'Yardage low to high';

const allValue = 'All';

export function FabricVaultPage({
  fabricId,
  onBack,
  onDeleteFabric,
  onEditFabric,
  onNewFabric,
  onOpenFabric,
}: FabricVaultPageProps) {
  const {
    data: { fabrics, linkedMaterials: allLinkedMaterials, projects },
    updateFabric,
  } = useStudioData();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(allValue);
  const [colorFilter, setColorFilter] = useState(allValue);
  const [archiveFilter, setArchiveFilter] = useState(allValue);
  const [rarityFilter, setRarityFilter] = useState(allValue);
  const [weightFilter, setWeightFilter] = useState(allValue);
  const [drapeFilter, setDrapeFilter] = useState(allValue);
  const [sortMode, setSortMode] = useState<FabricSort>('Recently updated');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [weightGuideOpen, setWeightGuideOpen] = useState(false);

  const selectedFabric = fabricId
    ? fabrics.find((fabric) => fabric.id === fabricId)
    : undefined;

  const filterOptions = useMemo(
    () => ({
      archiveStatuses: getUniqueValues(fabrics, 'archiveStatus'),
      colors: getUniqueValues(fabrics, 'colorFamily'),
      drapes: getUniqueValues(fabrics, 'drape'),
      rarities: getUniqueValues(fabrics, 'rarity'),
      types: getUniqueValues(fabrics, 'category'),
      weights: getUniqueValues(fabrics, 'weight'),
    }),
    [fabrics],
  );

  const visibleFabrics = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...fabrics]
      .filter((fabric) => {
        const searchableText = [
          fabric.name,
          fabric.category,
          fabric.colorFamily,
          fabric.composition,
          fabric.notes,
          ...fabric.bestUses,
          ...fabric.moodTags,
          ...fabric.tags,
        ]
          .join(' ')
          .toLowerCase();

        const matchesSearch = !query || searchableText.includes(query);
        const matchesType =
          typeFilter === allValue || fabric.category === typeFilter;
        const matchesColor =
          colorFilter === allValue || fabric.colorFamily === colorFilter;
        const matchesArchive =
          archiveFilter === allValue || fabric.archiveStatus === archiveFilter;
        const matchesRarity =
          rarityFilter === allValue || fabric.rarity === rarityFilter;
        const matchesWeight =
          weightFilter === allValue || fabric.weight === weightFilter;
        const matchesDrape =
          drapeFilter === allValue || fabric.drape === drapeFilter;

        return (
          matchesSearch &&
          matchesType &&
          matchesColor &&
          matchesArchive &&
          matchesRarity &&
          matchesWeight &&
          matchesDrape
        );
      })
      .sort((a, b) => sortFabrics(a, b, sortMode, allLinkedMaterials, projects));
  }, [
    allLinkedMaterials,
    archiveFilter,
    colorFilter,
    drapeFilter,
    fabrics,
    rarityFilter,
    search,
    sortMode,
    typeFilter,
    weightFilter,
    projects,
  ]);

  const totalRemaining = fabrics.reduce(
    (total, fabric) =>
      total +
      calculateFabricYardage(fabric, allLinkedMaterials, projects).remainingYards,
    0,
  );
  const lowYardageCount = fabrics.filter((fabric) =>
    isLowYardage(fabric, allLinkedMaterials, projects),
  ).length;

  if (fabricId) {
    return (
      <FabricDetailPage
        fabric={selectedFabric}
        onBack={onBack}
        onDeleteFabric={onDeleteFabric}
        onEditFabric={onEditFabric}
        onUpdateFabric={updateFabric}
        linkedMaterials={allLinkedMaterials}
        projects={projects}
      />
    );
  }

  const hasFilters =
    search ||
    typeFilter !== allValue ||
    colorFilter !== allValue ||
    archiveFilter !== allValue ||
    rarityFilter !== allValue ||
    weightFilter !== allValue ||
    drapeFilter !== allValue;
  const activeFilterCount = [
    typeFilter,
    colorFilter,
    archiveFilter,
    rarityFilter,
    weightFilter,
    drapeFilter,
  ].filter((value) => value !== allValue).length;
  const resetFilters = () => {
    setSearch('');
    setTypeFilter(allValue);
    setColorFilter(allValue);
    setArchiveFilter(allValue);
    setRarityFilter(allValue);
    setWeightFilter(allValue);
    setDrapeFilter(allValue);
    setSortMode('Recently updated');
  };

  return (
    <section className="space-y-5">
      <MobilePageHeader
        action={
          <div className="flex items-center gap-2">
            <Button
              icon={<Scale aria-hidden="true" size={15} strokeWidth={1.9} />}
              onClick={() => setWeightGuideOpen(true)}
              size="sm"
              variant="secondary"
            >
              Guide
            </Button>
            <Button
              icon={<PackagePlus aria-hidden="true" size={15} strokeWidth={1.9} />}
              onClick={onNewFabric}
              size="sm"
              variant="primary"
            >
              Add
            </Button>
          </div>
        }
        badge="Fabric"
        kicker={`${visibleFabrics.length} of ${fabrics.length} materials`}
        title="Fabric Vault"
      />

      <PageHeader
        badge="Fabric Vault"
        description="Search the material archive by fabric story, inventory signal, mood, and garment use."
        title="Fabric Vault"
      >
        <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">
          <Button
            icon={<Scale aria-hidden="true" size={16} strokeWidth={1.9} />}
            onClick={() => setWeightGuideOpen(true)}
            size="sm"
            variant="secondary"
          >
            Weight Guide
          </Button>
          <Button
            icon={<PackagePlus aria-hidden="true" size={16} strokeWidth={1.9} />}
            onClick={onNewFabric}
            size="sm"
            variant="primary"
          >
            Add Fabric
          </Button>
        </div>
      </PageHeader>

      {weightGuideOpen ? (
        <FabricWeightGuideModal onClose={() => setWeightGuideOpen(false)} />
      ) : null}

      <MobileSummaryStrip
        items={[
          {
            icon: <Archive aria-hidden="true" size={15} strokeWidth={1.9} />,
            label: 'Records',
            value: fabrics.length.toString(),
          },
          {
            icon: <Ruler aria-hidden="true" size={15} strokeWidth={1.9} />,
            label: 'Yardage',
            value: `${formatNumber(totalRemaining)} yd`,
          },
          {
            icon: <AlertTriangle aria-hidden="true" size={15} strokeWidth={1.9} />,
            label: 'Low',
            value: lowYardageCount.toString(),
          },
        ]}
      />

      <div className="hidden gap-4 lg:grid lg:grid-cols-3">
        <VaultMetric
          icon={<Archive aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Fabric Records"
          value={fabrics.length.toString()}
        />
        <VaultMetric
          icon={<Ruler aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Remaining Yardage"
          value={`${formatNumber(totalRemaining)} yd`}
        />
        <VaultMetric
          icon={<AlertTriangle aria-hidden="true" size={18} strokeWidth={1.9} />}
          label="Low Yardage"
          value={lowYardageCount.toString()}
        />
      </div>

      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.5),rgba(61,43,31,0.34))]">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
              <Search aria-hidden="true" size={14} strokeWidth={1.9} />
              Search Vault
            </span>
            <input
              className="h-11 w-full rounded-2xl border border-bronze/28 bg-midnight/45 px-4 text-sm text-stardust outline-none transition placeholder:text-stardust/32 focus:border-ember/60"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, fiber, color, uses, notes..."
              type="search"
              value={search}
            />
          </label>

          <div className="hidden lg:block">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
              <SlidersHorizontal aria-hidden="true" size={14} strokeWidth={1.9} />
              Filters
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <VaultSelect
                label="Type"
                onChange={setTypeFilter}
                options={filterOptions.types}
                value={typeFilter}
              />
              <VaultSelect
                label="Color"
                onChange={setColorFilter}
                options={filterOptions.colors}
                value={colorFilter}
              />
              <VaultSelect
                label="Archive"
                onChange={setArchiveFilter}
                options={filterOptions.archiveStatuses}
                value={archiveFilter}
              />
              <VaultSelect
                label="Rarity"
                onChange={setRarityFilter}
                options={filterOptions.rarities}
                value={rarityFilter}
              />
              <VaultSelect
                label="Weight"
                onChange={setWeightFilter}
                options={filterOptions.weights}
                value={weightFilter}
              />
              <VaultSelect
                label="Drape"
                onChange={setDrapeFilter}
                options={filterOptions.drapes}
                value={drapeFilter}
              />
              <VaultSelect
                includeAll={false}
                label="Sort"
                onChange={(value) => setSortMode(value as FabricSort)}
                options={[
                  'Recently updated',
                  'Name A-Z',
                  'Yardage high to low',
                  'Yardage low to high',
                ]}
                value={sortMode}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex gap-2 lg:hidden">
          <Button
            className="flex-1"
            icon={<SlidersHorizontal aria-hidden="true" size={15} strokeWidth={1.9} />}
            onClick={() => setFiltersOpen(true)}
            size="sm"
            variant="secondary"
          >
            Filters {activeFilterCount ? `(${activeFilterCount})` : ''}
          </Button>
          <Button className="flex-1" onClick={resetFilters} size="sm" variant="ghost">
            Reset
          </Button>
        </div>
      </Card>

      <FilterSheet
        activeCount={activeFilterCount}
        isOpen={filtersOpen}
        onApply={() => setFiltersOpen(false)}
        onClear={resetFilters}
        onClose={() => setFiltersOpen(false)}
        title="Refine fabrics"
      >
        <VaultSelect
          label="Type"
          onChange={setTypeFilter}
          options={filterOptions.types}
          value={typeFilter}
        />
        <VaultSelect
          label="Color"
          onChange={setColorFilter}
          options={filterOptions.colors}
          value={colorFilter}
        />
        <VaultSelect
          label="Archive"
          onChange={setArchiveFilter}
          options={filterOptions.archiveStatuses}
          value={archiveFilter}
        />
        <VaultSelect
          label="Rarity"
          onChange={setRarityFilter}
          options={filterOptions.rarities}
          value={rarityFilter}
        />
        <VaultSelect
          label="Weight"
          onChange={setWeightFilter}
          options={filterOptions.weights}
          value={weightFilter}
        />
        <VaultSelect
          label="Drape"
          onChange={setDrapeFilter}
          options={filterOptions.drapes}
          value={drapeFilter}
        />
        <VaultSelect
          includeAll={false}
          label="Sort"
          onChange={(value) => setSortMode(value as FabricSort)}
          options={[
            'Recently updated',
            'Name A-Z',
            'Yardage high to low',
            'Yardage low to high',
          ]}
          value={sortMode}
        />
      </FilterSheet>

      {fabrics.length === 0 ? (
        <FabricEmptyState
          description="Fabric records will appear here once the vault has materials to index."
          title="No fabrics in the vault yet"
        />
      ) : null}

      {fabrics.length > 0 && visibleFabrics.length === 0 ? (
        <FabricEmptyState
          description={
            hasFilters
              ? 'Try clearing one filter or searching with a broader fabric cue.'
              : 'No fabric records are available for this view.'
          }
          title="No fabric results"
        />
      ) : null}

      {visibleFabrics.length > 0 ? (
        <>
        <div className="grid gap-3 sm:hidden">
          {visibleFabrics.map((fabric) => {
            const fabricImage = getFabricImage(fabric);
            const yardage = calculateFabricYardage(
              fabric,
              allLinkedMaterials,
              projects,
            );
            const lowYardage = isLowYardage(
              fabric,
              allLinkedMaterials,
              projects,
            );

            return (
              <MobileCardRow
                badge={
                  <>
                    <Badge variant={lowYardage ? 'ember' : 'teal'}>
                      {lowYardage ? 'Low' : fabric.archiveStatus}
                    </Badge>
                    <Badge variant="bronze">{fabric.category}</Badge>
                  </>
                }
                image={
                  <>
                    {fabricImage ? (
                      <StoredImage
                        asset={fabricImage}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    <ImageReadabilityOverlay asset={fabricImage} variant="card" />
                  </>
                }
                key={fabric.id}
                meta={`${fabric.colorFamily} / ${fabric.composition}`}
                onClick={() => onOpenFabric(fabric.id)}
                signal={
                  <p className={cn('text-xs font-medium', lowYardage ? 'text-ember' : 'text-stardust/62')}>
                    {formatNumber(yardage.availableYards)} yd available
                  </p>
                }
                title={fabric.name}
              />
            );
          })}
        </div>
        <div className="hidden gap-4 sm:grid md:grid-cols-2 lg:max-xl:grid-cols-3 xl:grid-cols-3">
          {visibleFabrics.map((fabric, index) => (
            <FabricCard
              fabric={fabric}
              key={fabric.id}
              linkedMaterials={allLinkedMaterials}
              onOpenFabric={onOpenFabric}
              projects={projects}
              style={{ animationDelay: `${index * 45}ms` }}
            />
          ))}
        </div>
        </>
      ) : null}
    </section>
  );
}

function FabricCard({
  fabric,
  linkedMaterials,
  onOpenFabric,
  projects,
  style,
}: {
  fabric: Fabric;
  linkedMaterials: LinkedMaterial[];
  onOpenFabric: (fabricId: string) => void;
  projects: ApparelProject[];
  style: React.CSSProperties;
}) {
  const yardage = calculateFabricYardage(fabric, linkedMaterials, projects);
  const lowYardage = isLowYardage(fabric, linkedMaterials, projects);
  const fabricImage = getFabricImage(fabric);

  return (
    <button
      className="studio-project-card group min-h-[35rem] overflow-hidden rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(237,227,207,0.068),rgba(10,10,10,0.24))] text-left text-stardust shadow-[0_26px_80px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(237,227,207,0.045)] backdrop-blur-xl transition duration-300 hover:-translate-y-1.5 hover:border-ember/60 hover:bg-stardust/[0.08] hover:shadow-[0_30px_96px_rgba(200,155,60,0.14),0_18px_70px_rgba(0,0,0,0.34)]"
      onClick={() => onOpenFabric(fabric.id)}
      style={style}
      type="button"
    >
      <div
        className={cn(
          'relative h-44 overflow-hidden border-b border-bronze/24 p-4 shadow-[inset_0_-1px_0_rgba(237,227,207,0.05)]',
          getFabricVisualClass(fabric),
        )}
      >
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(237,227,207,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(237,227,207,0.07)_1px,transparent_1px)] [background-size:18px_18px]" />
        {fabricImage ? (
          <StoredImage
            asset={fabricImage}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <ImageReadabilityOverlay asset={fabricImage} variant="card" />
        <div className="relative z-10 flex items-start justify-between gap-3 [text-shadow:0_2px_12px_rgba(0,0,0,0.95)]">
          <Badge
            className="bg-midnight/72 backdrop-blur-xl"
            variant={fabric.archiveStatus === 'Archived' ? 'bronze' : 'teal'}
          >
            {fabric.archiveStatus}
          </Badge>
          <span className="rounded-full border border-stardust/18 bg-midnight/72 px-3 py-1 text-xs font-medium text-stardust/86 shadow-[0_8px_24px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            {formatDate(fabric.updatedAt)}
          </span>
        </div>
        <div className="relative z-10 mt-14 flex items-end justify-between gap-4 [text-shadow:0_2px_14px_rgba(0,0,0,0.96)]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/58">
              {fabric.category}
            </p>
            <p className="mt-1 text-2xl font-semibold text-stardust">
              {fabric.colorFamily}
            </p>
          </div>
          {lowYardage ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-ember/45 bg-ember/16 px-3 py-1 text-xs font-medium text-ember">
              <AlertTriangle aria-hidden="true" size={13} strokeWidth={1.9} />
              Low
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-stardust">
              {fabric.name}
            </h2>
            <p className="mt-1 text-sm text-stardust/52">
              {fabric.composition}
            </p>
          </div>
          <ArrowRight
            aria-hidden="true"
            className="mt-1 shrink-0 text-ember opacity-55 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100"
            size={20}
            strokeWidth={1.9}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <FabricDatum
            label="Available"
            value={`${formatNumber(yardage.availableYards)} yd`}
          />
          <FabricDatum label="Weight" value={fabric.weight} />
          <FabricDatum label="Drape" value={fabric.drape} />
          <FabricDatum label="Rarity" value={fabric.rarity} />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-stardust/52">Yardage available</span>
            <span className={cn('font-medium', lowYardage ? 'text-ember' : 'text-stardust/72')}>
              {formatNumber(yardage.availableYards)} of {formatNumber(fabric.totalYards)} yd
            </span>
          </div>
          <div className="studio-progress-track">
            <div
              className={cn(
                'h-full rounded-full shadow-[0_0_18px_rgba(200,155,60,0.28)] transition-all duration-500',
                lowYardage
                  ? 'bg-[linear-gradient(90deg,#C89B3C,#9A6C3C)]'
                  : 'bg-[linear-gradient(90deg,#2D5C6B,#C89B3C,#EDE3CF)]',
              )}
              style={{
                width: `${Math.max(
                  4,
                  (Math.max(0, yardage.availableYards) / fabric.totalYards) * 100,
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-5 border-t border-bronze/20 pt-4">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
            Best Uses
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fabric.bestUses.map((use) => (
              <span
                className="rounded-full border border-bronze/28 bg-midnight/34 px-2.5 py-1 text-xs text-stardust/62"
                key={use}
              >
                {use}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-4 line-clamp-2 text-sm leading-6 text-stardust/58">
          {fabric.notes}
        </p>
      </div>
    </button>
  );
}

function FabricDetailPage({
  fabric,
  linkedMaterials,
  onBack,
  onDeleteFabric,
  onEditFabric,
  onUpdateFabric,
  projects,
}: {
  fabric?: Fabric;
  linkedMaterials: LinkedMaterial[];
  onBack: () => void;
  onDeleteFabric: (fabric: Fabric) => void;
  onEditFabric: (fabric: Fabric) => void;
  onUpdateFabric: (fabric: Fabric) => void;
  projects: ApparelProject[];
}) {
  if (!fabric) {
    return (
      <section>
        <MobilePageHeader
          action={
            <Button
              icon={<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} />}
              onClick={onBack}
              size="sm"
            >
              Back
            </Button>
          }
          badge="Fabric"
          title="Fabric Not Found"
        />
        <PageHeader
          badge="Fabric Detail"
          description="The requested fabric route could not be matched to demo data."
          title="Fabric Not Found"
        >
          <Button
            icon={<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} />}
            onClick={onBack}
            size="sm"
          >
            Back to Vault
          </Button>
        </PageHeader>
      </section>
    );
  }

  const yardage = calculateFabricYardage(fabric, linkedMaterials, projects);
  const lowYardage = isLowYardage(fabric, linkedMaterials, projects);
  const linkedProjects = getLinkedProjects(fabric, projects);
  const totalCost = fabric.totalYards * fabric.costPerYard;
  const updateManualStatus = (archiveStatus: Fabric['archiveStatus']) => {
    const storageStatus =
      archiveStatus === 'Depleted'
        ? 'Depleted'
        : archiveStatus === 'Low Yardage'
          ? 'Low Yardage'
          : fabric.storageStatus;

    onUpdateFabric({
      ...fabric,
      archiveStatus,
      status: getDerivedFabricStatus(yardage, storageStatus),
      storageStatus,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <section className="space-y-5">
      <MobilePageHeader
        action={
          <Button
            icon={<ArrowLeft aria-hidden="true" size={15} strokeWidth={1.9} />}
            onClick={onBack}
            size="sm"
            variant="secondary"
          >
            Vault
          </Button>
        }
        badge="Fabric"
        kicker={`${formatNumber(yardage.availableYards)} yd available`}
        title={fabric.name}
      />
      <div className="hidden sm:flex sm:items-center sm:justify-between">
        <Button
          icon={<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} />}
          onClick={onBack}
          size="sm"
          variant="ghost"
        >
          Back to Vault
        </Button>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-stardust/38">
          Fabric Detail
        </p>
      </div>
      <Card className="overflow-hidden p-0" elevated>
        <div className="grid min-h-[34rem] lg:grid-cols-[0.92fr_1.08fr]">
          <ImageSlot
            actionClassName="right-4 top-4 sm:right-5 sm:top-5"
            adaptivePresentation
            aspectClassName="aspect-[4/5] sm:aspect-[4/3] lg:aspect-auto"
            className="min-h-80 rounded-none border-0 border-b border-bronze/20 lg:min-h-[34rem] lg:border-b-0 lg:border-r"
            contentMode="overlay"
            controlsMode="menu"
            label="Fabric Image"
            onRemove={() => onUpdateFabric({ ...fabric, image: undefined })}
            onSave={(image) => onUpdateFabric({ ...fabric, image })}
            placeholderClassName={getFabricVisualClass(fabric)}
            placeholderText="Add a fabric image."
            readabilityVariant="hero"
            showLabel={false}
            value={fabric.image}
          >
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(90deg,rgba(237,227,207,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(237,227,207,0.07)_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative flex h-full min-h-80 flex-col justify-end p-5 pr-16 sm:p-7 sm:pr-20">
              <div className="max-w-xl">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="teal">{fabric.archiveStatus}</Badge>
                  <Badge variant="bronze">{fabric.rarity}</Badge>
                  {lowYardage ? (
                    <Badge variant="ember">Low Yardage</Badge>
                  ) : null}
                </div>
                <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-stardust/58">
                  {fabric.category} / {fabric.weaveOrKnit}
                </p>
                <h1 className="font-display mt-3 max-w-xl text-4xl leading-[1.12] text-stardust sm:text-5xl">
                  {fabric.name}
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-6 text-stardust/68">
                  {fabric.loreNote}
                </p>
              </div>
            </div>
          </ImageSlot>

          <div className="flex flex-col justify-between gap-8 p-5 sm:p-7 lg:p-8">
            <div>
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-stardust/42">
                    Fabric Detail
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold text-stardust">
                    Material profile
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/62">
                    Technical inventory, sourcing, storage, and garment linkage
                    for this vault record.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    icon={<Pencil aria-hidden="true" size={15} strokeWidth={1.9} />}
                    onClick={() => onEditFabric(fabric)}
                    size="sm"
                    variant="primary"
                  >
                    Edit Fabric
                  </Button>
                  <Button
                    icon={<Trash2 aria-hidden="true" size={15} strokeWidth={1.9} />}
                    onClick={() => onDeleteFabric(fabric)}
                    size="sm"
                    variant="ghost"
                  >
                    Delete Fabric
                  </Button>
                  <Button
                    icon={<Link2 aria-hidden="true" size={15} strokeWidth={1.9} />}
                    size="sm"
                  >
                    Reserve for Project
                  </Button>
                  <Button
                    icon={<AlertTriangle aria-hidden="true" size={15} strokeWidth={1.9} />}
                    onClick={() => updateManualStatus('Low Yardage')}
                    size="sm"
                    variant="ghost"
                  >
                    Mark Low Yardage
                  </Button>
                  <Button
                    icon={<Archive aria-hidden="true" size={15} strokeWidth={1.9} />}
                    onClick={() => updateManualStatus('Depleted')}
                    size="sm"
                    variant="ghost"
                  >
                    Mark Depleted
                  </Button>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <FabricDatum label="Total" value={`${formatNumber(fabric.totalYards)} yd`} />
                <FabricDatum label="Reserved" value={`${formatNumber(yardage.reservedYards)} yd`} />
                <FabricDatum label="Used" value={`${formatNumber(yardage.usedYards)} yd`} />
                <FabricDatum label="Remaining" value={`${formatNumber(yardage.remainingYards)} yd`} />
                <FabricDatum label="Available" value={`${formatNumber(yardage.availableYards)} yd`} />
              </div>
              {lowYardage ? (
                <div className="mt-5 flex gap-3 rounded-2xl border border-ember/35 bg-ember/10 p-4 text-sm leading-6 text-stardust/72">
                  <AlertTriangle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-ember"
                    size={18}
                    strokeWidth={1.9}
                  />
                  <span>
                    Available yardage is below the {LOW_YARDAGE_THRESHOLD} yd low
                    threshold. This fabric is automatically treated as{' '}
                    {yardage.availableYards <= 0 ? 'depleted' : 'low yardage'}.
                  </span>
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-stardust/52">
                    Total - reserved - used = available
                  </span>
                  <span className="font-medium text-ember">
                    {formatNumber(yardage.availableYards)} yd available
                  </span>
                </div>
                <div className="grid h-3 overflow-hidden rounded-full bg-stardust/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#2D5C6B,#C89B3C,#EDE3CF)]"
                    style={{
                      width: `${Math.max(
                        4,
                        (Math.max(0, yardage.availableYards) / fabric.totalYards) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-stardust/48">
                  {formatNumber(yardage.totalYards)} yd total -{' '}
                  {formatNumber(yardage.reservedYards)} yd reserved -{' '}
                  {formatNumber(yardage.usedYards)} yd used ={' '}
                  {formatNumber(yardage.availableYards)} yd available.
                  Remaining yardage is total minus used:{' '}
                  {formatNumber(yardage.remainingYards)} yd.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DetailCallout
                icon={<PaletteSwatch fabric={fabric} />}
                label="Primary Color"
                value={fabric.primaryColor}
              />
              <DetailCallout
                icon={<Package aria-hidden="true" size={18} strokeWidth={1.9} />}
                label="Archive Status"
                value={fabric.archiveStatus}
              />
              <DetailCallout
                icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
                label="Rarity"
                value={fabric.rarity}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(20rem,0.65fr)]">
        <div className="space-y-5">
          <DetailSection
            icon={<Package aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Material Specifications"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailDatum label="Fabric Type" value={fabric.category} />
              <DetailDatum label="Fiber Content" value={fabric.composition} />
              <DetailDatum label="Weave / Knit" value={fabric.weaveOrKnit} />
              <DetailDatum label="Weight" value={fabric.weight} />
              <DetailDatum label="Width" value={`${fabric.widthInches} in`} />
              <DetailDatum label="Stretch" value={fabric.stretch} />
              <DetailDatum label="Opacity" value={fabric.opacity} />
              <DetailDatum label="Drape" value={fabric.drape} />
              <DetailDatum label="Hand Feel" value={fabric.handFeel} />
              <DetailDatum label="Texture" value={fabric.texture} />
              <DetailDatum label="Structure" value={fabric.structure} />
              <DetailDatum label="Storage Status" value={fabric.storageStatus} />
            </div>
          </DetailSection>

          <DetailSection
            icon={<MapPin aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Source and Storage"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailDatum label="Supplier / Source" value={fabric.supplier} />
              <DetailDatum label="Purchase Date" value={formatDate(fabric.purchaseDate)} />
              <DetailDatum label="Cost / Yard" value={formatCurrency(fabric.costPerYard)} />
              <DetailDatum label="Total Cost" value={formatCurrency(totalCost)} />
              <DetailDatum label="Storage Location" value={fabric.storageLocation} />
              <DetailDatum label="Bin Number" value={fabric.binNumber} />
              <DetailDatum label="Shelf" value={fabric.shelf} />
            </div>
          </DetailSection>

          <DetailSection
            icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Linked Projects"
          >
            {linkedProjects.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {linkedProjects.map(({ allocation, project }) => (
                  <LinkedProjectCard
                    allocation={allocation}
                    key={`${project.id}-${allocation.id}`}
                    project={project}
                  />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-bronze/25 bg-midnight/24 p-5 text-sm leading-6 text-stardust/54">
                This fabric is not linked to any garment projects yet.
              </p>
            )}
          </DetailSection>
        </div>

        <div className="space-y-5">
          <DetailSection
            icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Color Story"
          >
            <div className="space-y-4">
              <DetailDatum label="Color Family" value={fabric.colorFamily} />
              <DetailDatum label="Primary Color" value={fabric.primaryColor} />
              {fabric.secondaryColors.length > 0 ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/38">
                    Secondary Colors
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {fabric.secondaryColors.map((color) => (
                      <span
                        className="rounded-full border border-bronze/28 bg-midnight/34 px-3 py-1 text-xs text-stardust/68"
                        key={color}
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </DetailSection>

          <DetailSection
            icon={<Ruler aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Best Uses"
          >
            <div className="flex flex-wrap gap-2">
              {fabric.bestUses.map((use) => (
                <span
                  className="rounded-full border border-bronze/28 bg-midnight/34 px-3 py-1 text-xs text-stardust/68"
                  key={use}
                >
                  {use}
                </span>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            icon={<Sparkles aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Mood Tags"
          >
            <div className="flex flex-wrap gap-2">
              {fabric.moodTags.map((tag) => (
                <span
                  className="rounded-full border border-nebula/38 bg-nebula/14 px-3 py-1 text-xs text-stardust/72"
                  key={tag}
                >
                  {tag}
                </span>
              ))}
            </div>
          </DetailSection>

          <DetailSection
            icon={<AlertTriangle aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Care Notes"
          >
            <p className="text-sm leading-6 text-stardust/62">{fabric.careNotes}</p>
          </DetailSection>

          <DetailSection
            icon={<DollarSign aria-hidden="true" size={18} strokeWidth={1.9} />}
            title="Lore Note"
          >
            <p className="text-sm leading-6 text-stardust/66">{fabric.loreNote}</p>
          </DetailSection>
        </div>
      </div>
    </section>
  );
}

function DetailCallout({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-bronze/22 bg-midnight/34 p-4">
      <div className="flex items-center gap-2 text-ember">{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-stardust/38">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stardust">{value}</p>
    </div>
  );
}

function PaletteSwatch({ fabric }: { fabric: Fabric }) {
  return (
    <span
      className={cn(
        'block h-5 w-5 rounded-full border border-stardust/24 shadow-[0_0_24px_rgba(237,227,207,0.16)]',
        getFabricVisualClass(fabric),
      )}
    />
  );
}

function DetailSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Card className="transition duration-300 hover:border-ember/35">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-bronze/25 bg-midnight/45 text-ember">
          {icon}
        </span>
        <h2 className="text-lg font-semibold text-stardust">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function DetailDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/18 bg-midnight/28 p-4">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/38">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-5 text-stardust">{value}</p>
    </div>
  );
}

function LinkedProjectCard({
  allocation,
  project,
}: {
  allocation: LinkedMaterial;
  project: ApparelProject;
}) {
  return (
    <article className="rounded-2xl border border-bronze/22 bg-midnight/30 p-4 transition duration-300 hover:border-ember/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-stardust">
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-stardust/48">
            {project.garmentType} / {project.collection}
          </p>
        </div>
        <Badge variant={project.status === 'Blocked' ? 'ember' : 'teal'}>
          {project.status}
        </Badge>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="bronze">{allocation.role}</Badge>
        <Badge variant="blue">{allocation.status}</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <FabricDatum
          label="Needed"
          value={formatYardage(allocation.neededYards)}
        />
        <FabricDatum
          label="Reserved"
          value={formatYardage(allocation.reservedYards)}
        />
        <FabricDatum label="Used" value={formatYardage(allocation.usedYards)} />
      </div>
      {allocation.notes ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-stardust/56">
          {allocation.notes}
        </p>
      ) : null}
    </article>
  );
}

function VaultMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="transition duration-300 hover:border-ember/45">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-stardust">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-bronze/25 bg-midnight/45 text-ember">
          {icon}
        </span>
      </div>
    </Card>
  );
}

function VaultSelect({
  includeAll = true,
  label,
  onChange,
  options,
  value,
}: {
  includeAll?: boolean;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        className="h-11 w-full rounded-2xl border border-bronze/28 bg-midnight/45 px-3 text-sm text-stardust outline-none transition focus:border-ember/60"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {includeAll ? <option value={allValue}>All {label}</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function FabricDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/32 p-3">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/38">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stardust">{value}</p>
    </div>
  );
}

function FabricEmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <Card className="flex min-h-72 items-center justify-center text-center">
      <div className="max-w-md">
        <Sparkles
          aria-hidden="true"
          className="mx-auto text-ember"
          size={28}
          strokeWidth={1.8}
        />
        <h2 className="mt-4 text-2xl font-semibold text-stardust">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-stardust/58">{description}</p>
      </div>
    </Card>
  );
}

function getLinkedProjects(fabric: Fabric, projects: ApparelProject[]) {
  return projects.flatMap((project) =>
    project.linkedMaterials
      .filter((allocation) => allocation.fabricId === fabric.id)
      .map((allocation) => ({ allocation, project })),
  );
}

function isLowYardage(
  fabric: Fabric,
  linkedMaterials: LinkedMaterial[],
  projects: ApparelProject[],
) {
  const summary = calculateFabricYardage(fabric, linkedMaterials, projects);

  return summary.availableYards <= 0 || hasLowAvailableYardage(summary);
}

function sortFabrics(
  a: Fabric,
  b: Fabric,
  sortMode: FabricSort,
  linkedMaterials: LinkedMaterial[],
  projects: ApparelProject[],
) {
  if (sortMode === 'Name A-Z') {
    return a.name.localeCompare(b.name);
  }

  if (sortMode === 'Yardage high to low') {
    return (
      calculateFabricYardage(b, linkedMaterials, projects).remainingYards -
      calculateFabricYardage(a, linkedMaterials, projects).remainingYards
    );
  }

  if (sortMode === 'Yardage low to high') {
    return (
      calculateFabricYardage(a, linkedMaterials, projects).remainingYards -
      calculateFabricYardage(b, linkedMaterials, projects).remainingYards
    );
  }

  return studioDateTimestamp(b.updatedAt) - studioDateTimestamp(a.updatedAt);
}

function getUniqueValues<T extends keyof Fabric>(fabrics: Fabric[], key: T) {
  return Array.from(new Set(fabrics.map((fabric) => String(fabric[key])))).sort(
    (a, b) => a.localeCompare(b),
  );
}

function getFabricVisualClass(fabric: Fabric) {
  const category = fabric.category.toLowerCase();
  const color = fabric.colorFamily.toLowerCase();

  if (category.includes('denim') || color.includes('indigo')) {
    return 'bg-[radial-gradient(circle_at_18%_12%,rgba(237,227,207,0.16),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(45,92,107,0.42),transparent_34%),linear-gradient(135deg,rgba(27,58,99,0.9),rgba(10,10,10,0.72),rgba(27,58,99,0.72))]';
  }

  if (color.includes('golden') || category.includes('printed')) {
    return 'bg-[radial-gradient(circle_at_18%_16%,rgba(237,227,207,0.24),transparent_26%),radial-gradient(circle_at_84%_22%,rgba(200,155,60,0.52),transparent_34%),linear-gradient(135deg,rgba(154,108,60,0.88),rgba(10,10,10,0.72),rgba(200,155,60,0.7))]';
  }

  if (color.includes('espresso') || category.includes('twill')) {
    return 'bg-[radial-gradient(circle_at_22%_18%,rgba(200,155,60,0.2),transparent_30%),linear-gradient(135deg,rgba(61,43,31,0.95),rgba(10,10,10,0.76),rgba(154,108,60,0.62))]';
  }

  if (color.includes('ivory') || category.includes('lining')) {
    return 'bg-[radial-gradient(circle_at_18%_14%,rgba(237,227,207,0.72),transparent_34%),linear-gradient(135deg,rgba(237,227,207,0.7),rgba(45,92,107,0.34),rgba(10,10,10,0.62))]';
  }

  if (color.includes('teal') || category.includes('rib')) {
    return 'bg-[radial-gradient(circle_at_84%_18%,rgba(237,227,207,0.18),transparent_28%),linear-gradient(135deg,rgba(45,92,107,0.92),rgba(10,10,10,0.72),rgba(27,58,99,0.62))]';
  }

  return 'bg-[radial-gradient(circle_at_20%_10%,rgba(200,155,60,0.26),transparent_30%),linear-gradient(135deg,rgba(27,58,99,0.74),rgba(10,10,10,0.72),rgba(61,43,31,0.82))]';
}

function formatDate(date: string) {
  return formatStudioDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatYardage(value: number) {
  if (value === 0) {
    return 'N/A';
  }

  return `${formatNumber(value)} yd`;
}
