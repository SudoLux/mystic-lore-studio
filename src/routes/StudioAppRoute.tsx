import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useStudioData } from '../hooks/useStudioData';
import { getInitialRoute, type AppRoute } from '../lib/appRoutes';
import type { PageId } from '../types/navigation';
import type { ApparelProject, Fabric } from '../types/studio';
import { AuthenticatedStudioShell } from './AuthenticatedStudioShell';
import { StudioModalLayer, SupabaseEnvWarning } from './StudioModalLayer';
import { StudioPageRouter } from './StudioPageRouter';
import type { FabricFormState, ProjectFormState } from './studioModalTypes';

/** Authenticated route boundary for all private Studio screens. */
export function StudioAppRoute() {
  const {
    acceptCloudMigration,
    cancelSync,
    createFabric,
    createProject,
    data: { fabrics, projects },
    deleteFabric,
    deleteProject,
    dismissCloudMigration,
    exportData,
    failedOperationCount,
    lastSyncedAt,
    localCacheWarning,
    migrationAvailable,
    migrationInProgress,
    pendingCount,
    rawData,
    retrySync,
    syncError,
    syncNotice,
    syncPhase,
    syncProgress,
    syncStatus,
    updateFabricDetails,
    updateProjectDetails,
  } = useStudioData();
  const { signOut, user } = useAuth();
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const [fabricForm, setFabricForm] = useState<FabricFormState | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState | null>(null);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [syncDetailsOpen, setSyncDetailsOpen] = useState(false);
  const [deleteFabricCandidate, setDeleteFabricCandidate] = useState<Fabric | null>(null);
  const [deleteProjectCandidate, setDeleteProjectCandidate] = useState<ApparelProject | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(getInitialRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [route.fabricId, route.page, route.productionGarmentId, route.projectId, route.technicalGarmentId]);

  const navigateToPage = (page: PageId) => {
    window.history.pushState(null, '', page === 'dashboard' ? '#' : `#/${page}`);
    setRoute({ page });
  };

  const openProject = (projectId: string) => {
    window.history.pushState(null, '', `#/projects/${projectId}`);
    setRoute({ page: 'projects', projectId });
  };

  const openTechnicalGarment = (garmentId: string) => {
    window.history.pushState(null, '', `#/technical/${garmentId}`);
    setRoute({ page: 'technical', technicalGarmentId: garmentId });
  };

  const openProductionGarment = (garmentId: string) => {
    window.history.pushState(null, '', `#/production/${garmentId}`);
    setRoute({ page: 'production', productionGarmentId: garmentId });
  };

  const closeProject = () => navigateToPage('projects');

  const openFabric = (fabricId: string) => {
    window.history.pushState(null, '', `#/fabrics/${fabricId}`);
    setRoute({ page: 'fabrics', fabricId });
  };

  const closeFabric = () => navigateToPage('fabrics');

  const exportBackup = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `mystic-lore-studio-backup-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    setAuthActionError(null);
    try {
      await signOut();
    } catch (error) {
      setAuthActionError(error instanceof Error ? error.message : 'Unable to sign out. Please try again.');
    }
  };

  return (
    <>
      <AuthenticatedStudioShell
        email={user?.email}
        fabrics={fabrics}
        localCacheWarning={localCacheWarning}
        onNavigate={navigateToPage}
        onOpenFabric={openFabric}
        onOpenProject={openProject}
        onSignOut={() => void handleSignOut()}
        onSyncDetails={() => setSyncDetailsOpen(true)}
        pendingCount={pendingCount}
        projects={projects}
        route={route}
        syncError={syncError}
        syncStatus={syncStatus}
      >
        {authActionError ? <section className="mb-4 rounded-3xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-stardust/72">{authActionError}</section> : null}
        <SupabaseEnvWarning />
        <StudioPageRouter
          onAddFabric={() => setFabricForm({ mode: 'create' })}
          onDeleteFabric={setDeleteFabricCandidate}
          onDeleteProject={setDeleteProjectCandidate}
          onEditFabric={(fabric) => setFabricForm({ fabric, mode: 'edit' })}
          onEditProject={(project) => setProjectForm({ mode: 'edit', project })}
          onNavigate={navigateToPage}
          onNewProject={() => setProjectForm({ mode: 'create' })}
          onOpenFabric={openFabric}
          onOpenProject={openProject}
          onOpenTechnicalGarment={openTechnicalGarment}
          onOpenProductionGarment={openProductionGarment}
          route={route}
        />
      </AuthenticatedStudioShell>
      <StudioModalLayer
        acceptCloudMigration={acceptCloudMigration}
        cancelSync={cancelSync}
        createFabric={createFabric}
        createProject={createProject}
        deleteFabric={deleteFabric}
        deleteFabricCandidate={deleteFabricCandidate}
        deleteProject={deleteProject}
        deleteProjectCandidate={deleteProjectCandidate}
        dismissCloudMigration={dismissCloudMigration}
        exportBackup={exportBackup}
        fabricForm={fabricForm}
        failedOperationCount={failedOperationCount}
        lastSyncedAt={lastSyncedAt}
        localCacheWarning={localCacheWarning}
        migrationAvailable={migrationAvailable}
        migrationInProgress={migrationInProgress}
        onCloseFabricForm={() => setFabricForm(null)}
        onCloseFabricRoute={closeFabric}
        onCloseProjectForm={() => setProjectForm(null)}
        onCloseProjectRoute={closeProject}
        onCloseSyncDetails={() => setSyncDetailsOpen(false)}
        onDeleteFabricCandidateChange={setDeleteFabricCandidate}
        onDeleteProjectCandidateChange={setDeleteProjectCandidate}
        onOpenFabric={openFabric}
        onOpenProject={openProject}
        onOpenSyncDetails={() => setSyncDetailsOpen(true)}
        pendingCount={pendingCount}
        projectForm={projectForm}
        projects={projects}
        rawData={rawData}
        retrySync={retrySync}
        syncDetailsOpen={syncDetailsOpen}
        syncError={syncError}
        syncNotice={syncNotice}
        syncPhase={syncPhase}
        syncProgress={syncProgress}
        syncStatus={syncStatus}
        updateFabricDetails={updateFabricDetails}
        updateProjectDetails={updateProjectDetails}
      />
    </>
  );
}
