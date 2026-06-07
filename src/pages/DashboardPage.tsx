import { Badge } from '../components/shared/Badge';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';

const studioSignals = [
  {
    label: 'Projects',
    value: 'Project library shell',
    detail: 'Garment dossiers will surface here.',
  },
  {
    label: 'Workflow',
    value: 'Kanban shell',
    detail: 'Global production stages will connect here.',
  },
  {
    label: 'Materials',
    value: 'Fabric vault shell',
    detail: 'Yardage and fabric links will settle here.',
  },
];

export function DashboardPage() {
  return (
    <section>
      <PageHeader
        badge="Dashboard"
        description="A dark editorial control center for garment projects, fabric inventory, and presentation work."
        title="Studio Overview"
      />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <Card
          className="min-h-[24rem] bg-[linear-gradient(145deg,rgba(27,58,99,0.34),rgba(45,92,107,0.18)_48%,rgba(61,43,31,0.58))]"
          elevated
        >
          <div className="flex h-full flex-col justify-between gap-10">
            <div>
              <Badge variant="ember">Mystic Lore Studio</Badge>
              <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight text-stardust sm:text-4xl">
                Apparel project operations, shaped for a fashion studio.
              </h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-stardust/68 sm:text-base">
                The app shell is ready for project tracking, fabric workflows,
                lookbook presentation, and studio analytics.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {studioSignals.map((signal) => (
                <div
                  className="rounded-2xl border border-bronze/25 bg-midnight/35 p-4"
                  key={signal.label}
                >
                  <p className="text-xs font-medium text-ember">
                    {signal.label}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-stardust">
                    {signal.value}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-stardust/55">
                    {signal.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card className="min-h-[24rem]">
          <div className="flex h-full flex-col justify-between">
            <div>
              <Badge variant="teal">Atelier Status</Badge>
              <h2 className="mt-5 text-2xl font-semibold text-stardust">
                Foundation layer
              </h2>
              <p className="mt-4 text-sm leading-7 text-stardust/64">
                The studio frame is set for project, material, lookbook, and
                signal workspaces.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              {['Studio frame', 'Sidebar workspace', 'Pocket navigation'].map(
                (item) => (
                  <div
                    className="flex items-center justify-between rounded-xl border border-bronze/20 bg-espresso/28 px-4 py-3"
                    key={item}
                  >
                    <span className="text-sm text-stardust/74">{item}</span>
                    <span className="text-sm font-medium text-ember">Ready</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
