import { PlaceholderPage } from './PlaceholderPage';

export function FabricVaultPage() {
  return (
    <PlaceholderPage
      badge="Fabric Vault"
      description="A future materials archive for fabric records, project links, yardage reservations, and usage."
      metrics={[
        { label: 'Inventory', value: 'Fabric records' },
        { label: 'Links', value: 'Project allocation' },
        { label: 'Yardage', value: 'Reserve and use' },
      ]}
      title="Fabric Vault"
    />
  );
}
