import { PlaceholderPage } from './PlaceholderPage';

export function KanbanPage() {
  return (
    <PlaceholderPage
      badge="Global Kanban"
      description="A future workflow surface for tracking garment movement from concept through presentation."
      metrics={[
        { label: 'Stages', value: 'Concept to archive' },
        { label: 'Cards', value: 'Garment workflow' },
        { label: 'Focus', value: 'Studio throughput' },
      ]}
      title="Kanban"
    />
  );
}
