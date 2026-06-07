import { PlaceholderPage } from './PlaceholderPage';

export function LookbooksPage() {
  return (
    <PlaceholderPage
      badge="Lookbook Builder"
      description="A future presentation space for curated garment stories, project displays, and editorial review."
      metrics={[
        { label: 'Preview', value: 'Lookbook canvas' },
        { label: 'Selections', value: 'Project curation' },
        { label: 'Mode', value: 'Presentation view' },
      ]}
      title="Lookbooks"
    />
  );
}
