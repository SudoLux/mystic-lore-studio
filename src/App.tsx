import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CloudOff } from 'lucide-react';
import { AppShell } from './components/layout/AppShell';
import { FabricFormModal } from './components/fabrics/FabricFormModal';
import { ProjectFormModal } from './components/projects/ProjectFormModal';
import { GlobalSearch } from './components/layout/GlobalSearch';
import { Button } from './components/shared/Button';
import { navigationItems } from './data/navigation';
import { useAuth } from './hooks/useAuth';
import { useStudioData } from './hooks/useStudioData';
import { StudioDataProvider } from './hooks/useStudioData';
import { supabaseConfigStatus } from './lib/supabase';
import { AuthScreen } from './pages/Auth/AuthScreen';
import { DashboardPage } from './pages/Dashboard';
import { FabricVaultPage } from './pages/FabricVault';
import { KanbanPage } from './pages/Kanban';
import { LookbooksPage } from './pages/Lookbooks';
import { ProjectDetailPage } from './pages/ProjectDetail';
import { ProjectsPage } from './pages/Projects';
import { SettingsPage } from './pages/Settings';
import { StatsPage } from './pages/Stats';
import type { PageId } from './types/navigation';
import type { ApparelProject, Fabric } from './types/studio';

type AppRoute = {
  fabricId?: string;
  page: PageId;
  projectId?: string;
};

type ProjectFormState =
  | { mode: 'create'; project?: undefined }
  | { mode: 'edit'; project: ApparelProject };

type FabricFormState =
  | { fabric?: undefined; mode: 'create' }
  | { fabric: Fabric; mode: 'edit' };

function getInitialRoute(): AppRoute {
  const [, section, recordId] = window.location.hash.split('/');

  if (section === 'projects' && recordId) {
    return { page: 'projects', projectId: recordId };
  }

  if (section === 'projects') {
    return { page: 'projects' };
  }

  if (section === 'fabrics') {
    return recordId
      ? { page: 'fabrics', fabricId: recordId }
      : { page: 'fabrics' };
  }

  return { page: 'dashboard' };
}

function App() {
  const { isLoading, session } = useAuth();

  if (isLoading || !session) {
    return <AuthScreen />;
  }

  return (
    <StudioDataProvider>
      <StudioApp />
    </StudioDataProvider>
  );
}

function StudioApp() {
  const {
    createFabric,
    createProject,
    data: { fabrics, projects },
    deleteFabric,
    deleteProject,
    updateFabric,
    updateProject,
  } = useStudioData();
  const { signOut, user } = useAuth();
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const [fabricForm, setFabricForm] = useState<FabricFormState | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState | null>(null);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [deleteFabricCandidate, setDeleteFabricCandidate] =
    useState<Fabric | null>(null);
  const [deleteProjectCandidate, setDeleteProjectCandidate] =
    useState<ApparelProject | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(getInitialRoute());

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [route.fabricId, route.page, route.projectId]);

  const navigateToPage = (page: PageId) => {
    window.history.pushState(null, '', '#');
    setRoute({ page });
  };

  const openProject = (projectId: string) => {
    window.history.pushState(null, '', `#/projects/${projectId}`);
    setRoute({ page: 'projects', projectId });
  };

  const closeProject = () => {
    window.history.pushState(null, '', '#/projects');
    setRoute({ page: 'projects' });
  };

  const openNewProjectForm = () => {
    setProjectForm({ mode: 'create' });
  };

  const openEditProjectForm = (project: ApparelProject) => {
    setProjectForm({ mode: 'edit', project });
  };

  const handleDeleteProject = (project: ApparelProject) => {
    setDeleteProjectCandidate(project);
  };

  const openFabric = (fabricId: string) => {
    window.history.pushState(null, '', `#/fabrics/${fabricId}`);
    setRoute({ page: 'fabrics', fabricId });
  };

  const closeFabric = () => {
    window.history.pushState(null, '', '#/fabrics');
    setRoute({ page: 'fabrics' });
  };

  const openNewFabricForm = () => {
    setFabricForm({ mode: 'create' });
  };

  const openEditFabricForm = (fabric: Fabric) => {
    setFabricForm({ fabric, mode: 'edit' });
  };

  const handleDeleteFabric = (fabric: Fabric) => {
    setDeleteFabricCandidate(fabric);
  };

  const handleSignOut = async () => {
    setAuthActionError(null);

    try {
      await signOut();
    } catch (error) {
      setAuthActionError(
        error instanceof Error
          ? error.message
          : 'Unable to sign out. Please try again.',
      );
    }
  };

  const currentPage = useMemo(() => {
    const pages: Record<PageId, ReactNode> = {
      dashboard: (
        <DashboardPage
          onAddFabric={openNewFabricForm}
          onNavigate={navigateToPage}
          onNewProject={openNewProjectForm}
          onOpenProject={openProject}
        />
      ),
      projects: route.projectId ? (
        <ProjectDetailPage
          onDeleteProject={handleDeleteProject}
          onEditProject={openEditProjectForm}
          onBack={closeProject}
          projectId={route.projectId}
        />
      ) : (
        <ProjectsPage
          onNewProject={openNewProjectForm}
          onOpenProject={openProject}
        />
      ),
      kanban: <KanbanPage />,
      lookbooks: <LookbooksPage />,
      fabrics: (
        <FabricVaultPage
          fabricId={route.fabricId}
          onBack={closeFabric}
          onDeleteFabric={handleDeleteFabric}
          onEditFabric={openEditFabricForm}
          onNewFabric={openNewFabricForm}
          onOpenFabric={openFabric}
        />
      ),
      stats: <StatsPage />,
      settings: <SettingsPage />,
    };

    return pages[route.page];
  }, [route, projects]);

  return (
    <>
      <AppShell
        activePage={route.page}
        globalSearch={
          <GlobalSearch
            fabrics={fabrics}
            onOpenFabric={openFabric}
            onOpenProject={openProject}
            projects={projects}
          />
        }
        navItems={navigationItems}
        onNavigate={navigateToPage}
        onSignOut={handleSignOut}
        userEmail={user?.email}
      >
        {authActionError ? (
          <section className="mb-4 rounded-3xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-stardust/72">
            {authActionError}
          </section>
        ) : null}
        {!supabaseConfigStatus.isConfigured ? <SupabaseEnvWarning /> : null}
        {currentPage}
      </AppShell>
      {projectForm ? (
        <ProjectFormModal
          mode={projectForm.mode}
          onClose={() => setProjectForm(null)}
          onSubmit={(project) => {
            if (projectForm.mode === 'create') {
              createProject(project);
              setProjectForm(null);
              openProject(project.id);
              return;
            }

            updateProject(project);
            setProjectForm(null);
          }}
          project={projectForm.project}
        />
      ) : null}
      {fabricForm ? (
        <FabricFormModal
          fabric={fabricForm.fabric}
          mode={fabricForm.mode}
          onClose={() => setFabricForm(null)}
          onSubmit={(fabric) => {
            if (fabricForm.mode === 'create') {
              createFabric(fabric);
              setFabricForm(null);
              openFabric(fabric.id);
              return;
            }

            updateFabric(fabric);
            setFabricForm(null);
          }}
        />
      ) : null}
      {deleteFabricCandidate ? (
        <DeleteFabricDialog
          fabric={deleteFabricCandidate}
          onCancel={() => setDeleteFabricCandidate(null)}
          onConfirm={() => {
            deleteFabric(deleteFabricCandidate.id);
            setDeleteFabricCandidate(null);
            closeFabric();
          }}
        />
      ) : null}
      {deleteProjectCandidate ? (
        <DeleteProjectDialog
          onCancel={() => setDeleteProjectCandidate(null)}
          onConfirm={() => {
            deleteProject(deleteProjectCandidate.id);
            setDeleteProjectCandidate(null);
            closeProject();
          }}
          project={deleteProjectCandidate}
        />
      ) : null}
    </>
  );
}

function SupabaseEnvWarning() {
  return (
    <section className="mb-4 rounded-3xl border border-ember/30 bg-[linear-gradient(135deg,rgba(200,155,60,0.11),rgba(10,10,10,0.82),rgba(45,92,107,0.14))] p-4 text-stardust shadow-[0_18px_55px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.045)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ember/32 bg-midnight/48 text-ember">
          <CloudOff aria-hidden="true" size={18} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stardust">
            Supabase cloud sync is waiting for configuration.
          </p>
          <p className="mt-1 text-sm leading-6 text-stardust/62">
            Local browser storage is still active. Add{' '}
            <code className="rounded-lg border border-bronze/22 bg-midnight/45 px-1.5 py-0.5 text-xs text-ember">
              VITE_SUPABASE_URL
            </code>{' '}
            and{' '}
            <code className="rounded-lg border border-bronze/22 bg-midnight/45 px-1.5 py-0.5 text-xs text-ember">
              VITE_SUPABASE_ANON_KEY
            </code>{' '}
            to enable the cloud sync foundation.
          </p>
          <ul className="mt-2 list-inside list-disc text-xs leading-5 text-stardust/52">
            {supabaseConfigStatus.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function DeleteFabricDialog({
  fabric,
  onCancel,
  onConfirm,
}: {
  fabric: Fabric;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(45,92,107,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
          Delete Fabric
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">
          Delete {fabric.name}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">
          This removes the fabric from the vault. Existing project material
          records will keep their material names and handle the missing fabric
          link as an unlinked material.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Delete Fabric
          </Button>
        </div>
      </section>
    </div>
  );
}

function DeleteProjectDialog({
  onCancel,
  onConfirm,
  project,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  project: ApparelProject;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-midnight/82 px-4 py-5 backdrop-blur-xl sm:items-center">
      <section className="w-full max-w-lg rounded-3xl border border-ember/40 bg-[linear-gradient(135deg,rgba(61,43,31,0.94),rgba(10,10,10,0.98),rgba(27,58,99,0.36))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.46)] sm:p-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-ember">
          Delete Project
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-stardust">
          Delete {project.name}?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stardust/64">
          This will remove the project and its linked tasks, notes, materials,
          and lookbook pages from local studio data.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={onConfirm} variant="primary">
            Delete Project
          </Button>
        </div>
      </section>
    </div>
  );
}

export default App;
