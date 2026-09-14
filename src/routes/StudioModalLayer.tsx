import { CloudOff } from 'lucide-react';
import { FabricFormModal } from '../components/fabrics/FabricFormModal';
import { ProjectFormModal } from '../components/projects/ProjectFormModal';
import { Button } from '../components/shared/Button';
import { CloudMigrationModal } from '../components/settings/CloudMigrationModal';
import { SyncDetailsPanel, SyncProgressToast } from '../components/settings/SyncDetailsPanel';
import { supabaseConfigStatus } from '../lib/supabase';
import type { SyncPhase, SyncStatus } from '../lib/studioSyncStorage';
import type { StudioData } from '../lib/studioStorage';
import type { StoredProject } from '../lib/studioStorage';
import type { ApparelProject, Fabric, FabricDetailsInput, ProjectDetailsInput, ProjectHeroImageIntent } from '../types/studio';
import type { FabricFormState, ProjectFormState } from './studioModalTypes';

type StudioModalLayerProps = {
  acceptCloudMigration: () => Promise<void>;
  cancelSync: () => void;
  createFabric: (fabric: Fabric) => void;
  createProject: (project: StoredProject) => void;
  deleteFabric: (fabricId: string) => void;
  deleteFabricCandidate: Fabric | null;
  deleteProject: (projectId: string) => void;
  deleteProjectCandidate: ApparelProject | null;
  dismissCloudMigration: () => void;
  exportBackup: () => void;
  fabricForm: FabricFormState | null;
  migrationAvailable: boolean;
  migrationInProgress: boolean;
  onCloseFabricForm: () => void;
  onCloseFabricRoute: () => void;
  onCloseProjectForm: () => void;
  onCloseProjectRoute: () => void;
  onCloseSyncDetails: () => void;
  onDeleteFabricCandidateChange: (fabric: Fabric | null) => void;
  onDeleteProjectCandidateChange: (project: ApparelProject | null) => void;
  onOpenFabric: (fabricId: string) => void;
  onOpenProject: (projectId: string) => void;
  onOpenSyncDetails: () => void;
  pendingCount: number;
  projectForm: ProjectFormState | null;
  projects: ApparelProject[];
  rawData: StudioData;
  retrySync: () => Promise<void>;
  syncDetailsOpen: boolean;
  syncError: string | null;
  syncNotice: string | null;
  syncPhase: SyncPhase;
  syncProgress: { completed: number; total: number };
  syncStatus: SyncStatus;
  updateFabricDetails: (id: string, details: FabricDetailsInput) => void;
  updateProjectDetails: (id: string, details: ProjectDetailsInput, intent?: ProjectHeroImageIntent) => void;
  failedOperationCount: number;
  lastSyncedAt: string | null;
  localCacheWarning: string | null;
};

/** Modal orchestration is isolated from page routing and private shell chrome. */
export function StudioModalLayer({
  acceptCloudMigration,
  cancelSync,
  createFabric,
  createProject,
  deleteFabric,
  deleteFabricCandidate,
  deleteProject,
  deleteProjectCandidate,
  dismissCloudMigration,
  exportBackup,
  fabricForm,
  failedOperationCount,
  lastSyncedAt,
  localCacheWarning,
  migrationAvailable,
  migrationInProgress,
  onCloseFabricForm,
  onCloseFabricRoute,
  onCloseProjectForm,
  onCloseProjectRoute,
  onCloseSyncDetails,
  onDeleteFabricCandidateChange,
  onDeleteProjectCandidateChange,
  onOpenFabric,
  onOpenProject,
  onOpenSyncDetails,
  pendingCount,
  projectForm,
  projects,
  rawData,
  retrySync,
  syncDetailsOpen,
  syncError,
  syncNotice,
  syncPhase,
  syncProgress,
  syncStatus,
  updateFabricDetails,
  updateProjectDetails,
}: StudioModalLayerProps) {
  return (
    <>
      {migrationAvailable ? (
        <CloudMigrationModal
          data={rawData}
          isMigrating={migrationInProgress}
          onAccept={() => void acceptCloudMigration()}
          onDismiss={dismissCloudMigration}
        />
      ) : null}
      {syncStatus === 'syncing' && pendingCount > 0 ? (
        <SyncProgressToast
          onOpen={onOpenSyncDetails}
          pendingCount={pendingCount}
          phase={syncPhase}
          progress={syncProgress}
        />
      ) : null}
      <SyncDetailsPanel
        error={syncError}
        failedCount={failedOperationCount}
        isOpen={syncDetailsOpen}
        lastSyncedAt={lastSyncedAt}
        localCacheWarning={localCacheWarning}
        onCancel={cancelSync}
        onClose={onCloseSyncDetails}
        onExport={exportBackup}
        onRetry={() => void retrySync()}
        pendingCount={pendingCount}
        phase={syncPhase}
        progress={syncProgress}
        status={syncStatus}
        syncNotice={syncNotice}
      />
      {projectForm ? (
        <ProjectFormModal
          mode={projectForm.mode}
          onClose={onCloseProjectForm}
          onSubmit={({ details, heroImageIntent, id }) => {
            if (projectForm.mode === 'create') {
              createProject({
                ...details,
                heroImage: heroImageIntent.type === 'set' ? heroImageIntent.image : undefined,
                id,
              });
              onCloseProjectForm();
              onOpenProject(id);
              return;
            }

            updateProjectDetails(id, details, heroImageIntent);
            onCloseProjectForm();
          }}
          project={projectForm.project}
          projects={projects}
        />
      ) : null}
      {fabricForm ? (
        <FabricFormModal
          fabric={fabricForm.fabric}
          mode={fabricForm.mode}
          onClose={onCloseFabricForm}
          onSubmit={({ details, id }) => {
            if (fabricForm.mode === 'create') {
              createFabric({ ...details, id });
              onCloseFabricForm();
              onOpenFabric(id);
              return;
            }

            updateFabricDetails(id, details);
            onCloseFabricForm();
          }}
        />
      ) : null}
      {deleteFabricCandidate ? (
        <DeleteFabricDialog
          fabric={deleteFabricCandidate}
          onCancel={() => onDeleteFabricCandidateChange(null)}
          onConfirm={() => {
            deleteFabric(deleteFabricCandidate.id);
            onDeleteFabricCandidateChange(null);
            onCloseFabricRoute();
          }}
        />
      ) : null}
      {deleteProjectCandidate ? (
        <DeleteProjectDialog
          onCancel={() => onDeleteProjectCandidateChange(null)}
          onConfirm={() => {
            deleteProject(deleteProjectCandidate.id);
            onDeleteProjectCandidateChange(null);
            onCloseProjectRoute();
          }}
          project={deleteProjectCandidate}
        />
      ) : null}
    </>
  );
}

export function SupabaseEnvWarning() {
  if (supabaseConfigStatus.isConfigured) return null;

  return (
    <section className="mb-4 rounded-3xl border border-ember/30 bg-[linear-gradient(135deg,rgba(200,155,60,0.11),rgba(10,10,10,0.82),rgba(45,92,107,0.14))] p-4 text-stardust shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.045)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ember/32 bg-midnight/48 text-ember">
          <CloudOff aria-hidden="true" size={18} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stardust">Supabase cloud sync is waiting for configuration.</p>
          <p className="mt-1 text-sm leading-6 text-stardust/62">Local browser storage is still active. Add <code className="rounded-lg border border-bronze/22 bg-midnight/45 px-1.5 py-0.5 text-xs text-ember">VITE_SUPABASE_URL</code> and <code className="rounded-lg border border-bronze/22 bg-midnight/45 px-1.5 py-0.5 text-xs text-ember">VITE_SUPABASE_ANON_KEY</code> to enable the cloud sync foundation.</p>
          <ul className="mt-2 list-inside list-disc text-xs leading-5 text-stardust/52">
            {supabaseConfigStatus.issues.map((issue) => <li key={issue}>{issue}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function DeleteFabricDialog({ fabric, onCancel, onConfirm }: { fabric: Fabric; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(45,92,107,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">Delete Fabric</p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">Delete {fabric.name}?</h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">This removes the fabric from the vault. Existing project material records will keep their material names and handle the missing fabric link as an unlinked material.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button onClick={onCancel} variant="ghost">Cancel</Button><Button onClick={onConfirm} variant="primary">Delete Fabric</Button></div>
      </section>
    </div>
  );
}

function DeleteProjectDialog({ onCancel, onConfirm, project }: { onCancel: () => void; onConfirm: () => void; project: ApparelProject }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(27,58,99,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">Delete Project</p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">Delete {project.name}?</h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">This will remove the project and its linked tasks, notes, materials, and editorial collection pages from local studio data.</p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button onClick={onCancel} variant="ghost">Cancel</Button><Button onClick={onConfirm} variant="primary">Delete Project</Button></div>
      </section>
    </div>
  );
}
