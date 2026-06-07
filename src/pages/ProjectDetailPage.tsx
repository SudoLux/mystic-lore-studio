import { ArrowLeft, CalendarDays, Gauge, Shirt } from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';
import { demoFabrics, demoProjects } from '../data/seedData';

type ProjectDetailPageProps = {
  onBack: () => void;
  projectId: string;
};

const fabricById = new Map(demoFabrics.map((fabric) => [fabric.id, fabric]));

export function ProjectDetailPage({ onBack, projectId }: ProjectDetailPageProps) {
  const project = demoProjects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <section>
        <PageHeader
          badge="Project Detail"
          description="The requested project route could not be matched to demo data."
          title="Project Not Found"
        >
          <Button
            icon={<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} />}
            onClick={onBack}
            size="sm"
            variant="secondary"
          >
            Back to Library
          </Button>
        </PageHeader>
      </section>
    );
  }

  const linkedFabrics = project.linkedMaterials
    .map((material) => ({
      allocation: material,
      fabric: fabricById.get(material.fabricId),
    }))
    .filter((item) => item.fabric);

  return (
    <section className="space-y-5">
      <PageHeader
        badge="Project Detail"
        description={project.designIntent}
        title={project.name}
      >
        <Button
          icon={<ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} />}
          onClick={onBack}
          size="sm"
          variant="secondary"
        >
          Back to Library
        </Button>
      </PageHeader>

      <Card className="overflow-hidden bg-[linear-gradient(135deg,rgba(27,58,99,0.32),rgba(10,10,10,0.55),rgba(61,43,31,0.5))]" elevated>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="teal">{project.status}</Badge>
              <Badge variant="bronze">{project.phase}</Badge>
              <Badge variant="ember">{project.priority} Priority</Badge>
            </div>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-stardust/76">
              {project.summary}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <DetailMetric
                icon={<Shirt aria-hidden="true" size={18} strokeWidth={1.9} />}
                label="Garment"
                value={project.garmentType}
              />
              <DetailMetric
                icon={<CalendarDays aria-hidden="true" size={18} strokeWidth={1.9} />}
                label="Collection"
                value={project.collection}
              />
              <DetailMetric
                icon={<Gauge aria-hidden="true" size={18} strokeWidth={1.9} />}
                label="Progress"
                value={`${project.progress}%`}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-bronze/25 bg-midnight/35 p-5">
            <p className="text-sm font-semibold text-stardust">
              Linked Materials
            </p>
            <div className="mt-4 space-y-3">
              {linkedFabrics.map(({ allocation, fabric }) => (
                <div
                  className="rounded-2xl border border-bronze/20 bg-espresso/25 p-4"
                  key={allocation.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stardust">
                        {fabric?.name}
                      </p>
                      <p className="mt-1 text-xs text-stardust/52">
                        {allocation.use} • {allocation.reservedYards} yd reserved
                      </p>
                    </div>
                    <span className="text-sm font-medium text-ember">
                      {allocation.usedYards} yd used
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="text-lg font-semibold text-stardust">Open Tasks</p>
          <div className="mt-4 space-y-3">
            {project.tasks.map((task) => (
              <div
                className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4"
                key={task.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stardust">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-stardust/52">{task.phase}</p>
                  </div>
                  <Badge variant={task.priority === 'Critical' ? 'ember' : 'blue'}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p className="text-lg font-semibold text-stardust">Studio Notes</p>
          <div className="mt-4 space-y-3">
            {project.notes.map((note) => (
              <div
                className="rounded-2xl border border-bronze/20 bg-midnight/32 p-4"
                key={note.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-stardust">
                    {note.title}
                  </p>
                  <Badge variant="bronze">{note.tone}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-stardust/62">
                  {note.body}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function DetailMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-bronze/20 bg-midnight/35 p-4">
      <div className="flex items-center gap-2 text-ember">{icon}</div>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-stardust">{value}</p>
    </div>
  );
}
