import { PlaceholderPage } from './PlaceholderPage';

export function SettingsPage() {
  return (
    <PlaceholderPage
      badge="Settings"
      description="A future control panel for app preferences, backups, import/export, and PWA configuration."
      metrics={[
        { label: 'Preferences', value: 'Studio defaults' },
        { label: 'Backups', value: 'Export and import' },
        { label: 'PWA', value: 'Install support' },
      ]}
      title="Settings"
    />
  );
}
