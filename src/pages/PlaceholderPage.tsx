import { Badge } from '../components/shared/Badge';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';

type Metric = {
  label: string;
  value: string;
};

type PlaceholderPageProps = {
  badge: string;
  description: string;
  metrics: Metric[];
  title: string;
};

export function PlaceholderPage({
  badge,
  description,
  metrics,
  title,
}: PlaceholderPageProps) {
  return (
    <section>
      <PageHeader badge={badge} description={description} title={title} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card className="min-h-36" key={metric.label}>
            <div className="flex h-full flex-col justify-between gap-6">
              <Badge variant="bronze">{metric.label}</Badge>
              <p className="text-2xl font-semibold leading-tight text-stardust">
                {metric.value}
              </p>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4 border-ember/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.24),rgba(61,43,31,0.58))]" elevated>
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-ember">Module Canvas</p>
          <p className="mt-3 text-sm leading-7 text-stardust/68">
            Studio data will populate this space during its dedicated build
            phase.
          </p>
        </div>
      </Card>
    </section>
  );
}
