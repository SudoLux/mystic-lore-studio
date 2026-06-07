import { PlaceholderPage } from './PlaceholderPage';

export function ProjectsPage() {
  return (
    <PlaceholderPage
      badge="Project Library"
      description="A future home for garment dossiers, seasons, project status, categories, and studio notes."
      metrics={[
        { label: 'Library', value: 'Garment index' },
        { label: 'Filters', value: 'Season and status' },
        { label: 'Detail', value: 'Project pages' },
      ]}
      title="Projects"
    />
  );
}
