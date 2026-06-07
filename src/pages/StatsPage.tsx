import { PlaceholderPage } from './PlaceholderPage';

export function StatsPage() {
  return (
    <PlaceholderPage
      badge="Stats"
      description="A future analytics view for project progress, material usage, workflow balance, and studio signals."
      metrics={[
        { label: 'Progress', value: 'Project counts' },
        { label: 'Materials', value: 'Fabric usage' },
        { label: 'Velocity', value: 'Workflow trends' },
      ]}
      title="Stats"
    />
  );
}
