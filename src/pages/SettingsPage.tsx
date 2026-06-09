import { Badge } from '../components/shared/Badge';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';

export function SettingsPage() {
  return (
    <section>
      <PageHeader
        badge="Settings"
        description="Control panel for app preferences, backups, import/export, and install readiness."
        title="Settings"
      />

      <div className="grid gap-4 md:grid-cols-3">
        <SettingsStatusCard
          label="Preferences"
          status="Studio defaults"
          text="Theme and workspace defaults remain staged for a later milestone."
        />
        <SettingsStatusCard
          label="Backups"
          status="Export and import"
          text="Local data helpers are available; full controls stay scoped to backup hardening."
        />
        <SettingsStatusCard
          label="PWA"
          status="Install ready"
          text="Manifest, theme metadata, icon, and app-shell service worker are configured."
        />
      </div>

      <Card className="mt-4 border-ember/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.24),rgba(61,43,31,0.58))]" elevated>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
          <div>
            <Badge variant="teal">Progressive Web App</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-stardust">
              Mystic Lore Studio can run from an installed app window.
            </h2>
            <p className="mt-3 text-sm leading-7 text-stardust/68">
              The app shell is cached after production load, and browser-local
              project, fabric, image, and lookbook data stays in local storage.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PwaCapability label="Manifest" value="Configured" />
            <PwaCapability label="Offline shell" value="Cached" />
            <PwaCapability label="Local data" value="Offline" />
          </div>
        </div>
      </Card>
    </section>
  );
}

function SettingsStatusCard({
  label,
  status,
  text,
}: {
  label: string;
  status: string;
  text: string;
}) {
  return (
    <Card className="min-h-44">
      <div className="flex h-full flex-col justify-between gap-6">
        <div>
          <Badge variant="bronze">{label}</Badge>
          <p className="mt-5 text-2xl font-semibold leading-tight text-stardust">
            {status}
          </p>
        </div>
        <p className="text-sm leading-6 text-stardust/58">{text}</p>
      </div>
    </Card>
  );
}

function PwaCapability({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-bronze/24 bg-midnight/36 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-3 text-lg font-semibold text-ember">{value}</p>
    </div>
  );
}
