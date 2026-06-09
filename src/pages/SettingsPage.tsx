import { useRef, useState, type ChangeEvent } from 'react';
import {
  AlertTriangle,
  Download,
  RefreshCcw,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Badge } from '../components/shared/Badge';
import { Button } from '../components/shared/Button';
import { Card } from '../components/shared/Card';
import { PageHeader } from '../components/shared/PageHeader';
import { useStudioData } from '../hooks/useStudioData';
import type { ImportPreview } from '../lib/studioStorage';

type ImportCandidate = {
  fileName: string;
  preview: ImportPreview;
  serializedData: string;
};

export function SettingsPage() {
  const { exportData, importData, previewImportData, rawData, resetData } =
    useStudioData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importCandidate, setImportCandidate] =
    useState<ImportCandidate | null>(null);
  const [resetRequested, setResetRequested] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const currentSummary = getBackupSummary(rawData);

  const handleExportData = () => {
    const serializedData = exportData();
    const blob = new Blob([serializedData], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = downloadUrl;
    downloadLink.download = `mystic-lore-studio-backup-${getTimestampSlug()}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);

    setErrorMessage(null);
    setImportCandidate(null);
    setResetRequested(false);
    setStatusMessage('Backup export prepared as a timestamped JSON file.');
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrorMessage('Choose a JSON backup file exported from Mystic Lore Studio.');
      setImportCandidate(null);
      setStatusMessage(null);
      return;
    }

    try {
      const serializedData = await file.text();
      const preview = previewImportData(serializedData);

      setImportCandidate({
        fileName: file.name,
        preview,
        serializedData,
      });
      setErrorMessage(null);
      setResetRequested(false);
      setStatusMessage('Backup file is valid. Review the preview before importing.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'This file could not be read as a Mystic Lore Studio backup.',
      );
      setImportCandidate(null);
      setStatusMessage(null);
    }
  };

  const handleConfirmImport = () => {
    if (!importCandidate) {
      return;
    }

    try {
      importData(importCandidate.serializedData);
      setStatusMessage(
        `Imported ${importCandidate.fileName}. Local studio data has been refreshed.`,
      );
      setImportCandidate(null);
      setErrorMessage(null);
      setResetRequested(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The backup could not be imported.',
      );
    }
  };

  const handleConfirmReset = () => {
    resetData();
    setResetRequested(false);
    setImportCandidate(null);
    setErrorMessage(null);
    setStatusMessage('Local data reset to the Mystic Lore Studio demo dataset.');
  };

  return (
    <section className="space-y-4">
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
          status={`${currentSummary.projects} projects`}
          text={`${currentSummary.fabrics} fabrics, ${currentSummary.tasks} tasks, ${currentSummary.notes} notes, and ${currentSummary.lookbooks} lookbook records are in local data.`}
        />
        <SettingsStatusCard
          label="PWA"
          status="Install ready"
          text="Manifest, theme metadata, icon, and app-shell service worker are configured."
        />
      </div>

      <Card className="border-bronze/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.22),rgba(10,10,10,0.48),rgba(61,43,31,0.36))]" elevated>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <Badge variant="ember">Backup Vault</Badge>
            <h2 className="mt-4 text-2xl font-semibold text-stardust">
              Export, import, or reset browser-local studio data.
            </h2>
            <p className="mt-3 text-sm leading-7 text-stardust/68">
              Backups include projects, fabrics, tasks, notes, linked material
              allocations, lookbooks, app settings, and data version metadata.
            </p>
            <p className="mt-3 rounded-2xl border border-bronze/22 bg-midnight/32 p-4 text-sm leading-6 text-stardust/62">
              {rawData.settings.backupReminderCopy} A good rhythm is every{' '}
              {rawData.settings.backupReminderCadenceDays} days, and always before
              large import or cleanup sessions.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <BackupMetric label="Projects" value={currentSummary.projects} />
              <BackupMetric label="Fabrics" value={currentSummary.fabrics} />
              <BackupMetric label="Tasks" value={currentSummary.tasks} />
              <BackupMetric label="Notes" value={currentSummary.notes} />
              <BackupMetric label="Lookbooks" value={currentSummary.lookbooks} />
              <BackupMetric label="Version" value={currentSummary.version} />
            </div>

            <input
              accept="application/json,.json"
              className="sr-only"
              onChange={handleImportFile}
              ref={fileInputRef}
              type="file"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                icon={<Download aria-hidden="true" size={16} strokeWidth={1.9} />}
                onClick={handleExportData}
                variant="primary"
              >
                Export Data
              </Button>
              <Button
                icon={<Upload aria-hidden="true" size={16} strokeWidth={1.9} />}
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
              >
                Import Data
              </Button>
              <Button
                icon={<RefreshCcw aria-hidden="true" size={16} strokeWidth={1.9} />}
                onClick={() => {
                  setResetRequested(true);
                  setImportCandidate(null);
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                variant="ghost"
              >
                Reset Local Data
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {statusMessage ? (
        <StatusNotice message={statusMessage} tone="success" />
      ) : null}
      {errorMessage ? <StatusNotice message={errorMessage} tone="error" /> : null}
      {importCandidate ? (
        <ImportPreviewCard
          candidate={importCandidate}
          onCancel={() => setImportCandidate(null)}
          onConfirm={handleConfirmImport}
        />
      ) : null}
      {resetRequested ? (
        <ResetConfirmCard
          onCancel={() => setResetRequested(false)}
          onConfirm={handleConfirmReset}
        />
      ) : null}

      <Card className="border-ember/30 bg-[linear-gradient(135deg,rgba(27,58,99,0.24),rgba(61,43,31,0.58))]" elevated>
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

function ImportPreviewCard({
  candidate,
  onCancel,
  onConfirm,
}: {
  candidate: ImportCandidate;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { preview } = candidate;

  return (
    <Card className="border-ember/35 bg-ember/10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Badge variant="ember">Import Preview</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-stardust">
            Replace current data with {candidate.fileName}?
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stardust/68">
            This will replace all current browser-local studio data. Export a
            backup first if you may need to return to the current workspace.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Confirm Import
          </Button>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <BackupMetric label="Projects" value={preview.projects} />
        <BackupMetric label="Fabrics" value={preview.fabrics} />
        <BackupMetric label="Tasks" value={preview.tasks} />
        <BackupMetric label="Notes" value={preview.notes} />
        <BackupMetric label="Lookbooks" value={preview.lookbooks} />
        <BackupMetric label="Version" value={preview.version} />
      </div>
    </Card>
  );
}

function ResetConfirmCard({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Card className="border-ember/35 bg-ember/10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <Badge variant="ember">Reset Confirmation</Badge>
          <h2 className="mt-4 text-2xl font-semibold text-stardust">
            Reset local data to the demo studio dataset?
          </h2>
          <p className="mt-3 text-sm leading-7 text-stardust/68">
            This replaces current projects, fabrics, tasks, notes, linked
            materials, and lookbooks stored in this browser.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Reset Local Data
          </Button>
        </div>
      </div>
    </Card>
  );
}

function StatusNotice({
  message,
  tone,
}: {
  message: string;
  tone: 'error' | 'success';
}) {
  const isError = tone === 'error';

  return (
    <div
      className={`flex gap-3 rounded-2xl border p-4 text-sm leading-6 ${
        isError
          ? 'border-ember/35 bg-ember/10 text-stardust/74'
          : 'border-nebula/40 bg-nebula/15 text-stardust/72'
      }`}
    >
      {isError ? (
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-ember"
          size={18}
          strokeWidth={1.9}
        />
      ) : (
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-ember"
          size={18}
          strokeWidth={1.9}
        />
      )}
      <span>{message}</span>
    </div>
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

function BackupMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-bronze/24 bg-midnight/36 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/42">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-stardust">{value}</p>
    </div>
  );
}

function getBackupSummary(data: ReturnType<typeof useStudioData>['rawData']) {
  return {
    fabrics: data.fabrics.length,
    linkedMaterials: data.linkedMaterials.length,
    lookbooks: data.lookbookPages.length,
    notes: data.notes.length,
    projects: data.projects.length,
    tasks: data.tasks.length,
    version: data.version,
  };
}

function getTimestampSlug() {
  return new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replace(/[:T]/g, '-');
}
