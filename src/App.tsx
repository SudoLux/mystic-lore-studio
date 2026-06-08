import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ProjectFormModal } from './components/projects/ProjectFormModal';
import { Button } from './components/shared/Button';
import { navigationItems } from './data/navigation';
import { useStudioData } from './hooks/useStudioData';
import { DashboardPage } from './pages/DashboardPage';
import { FabricVaultPage } from './pages/FabricVaultPage';
import { KanbanPage } from './pages/KanbanPage';
import { LookbooksPage } from './pages/LookbooksPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import type { PageId } from './types/navigation';
import type { ApparelProject } from './types/studio';

type AppRoute = {
  fabricId?: string;
  page: PageId;
  projectId?: string;
};

type ProjectFormState =
  | { mode: 'create'; project?: undefined }
  | { mode: 'edit'; project: ApparelProject };

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
  const {
    createProject,
    data: { projects },
    deleteProject,
    updateProject,
  } = useStudioData();
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const [projectForm, setProjectForm] = useState<ProjectFormState | null>(null);
  const [deleteProjectCandidate, setDeleteProjectCandidate] =
    useState<ApparelProject | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(getInitialRoute());

    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
    window.history.pushState(null, '', '#');
    setRoute({ page: 'fabrics' });
  };

  const currentPage = useMemo(() => {
    const pages: Record<PageId, ReactNode> = {
      dashboard: (
        <DashboardPage
          onNavigate={navigateToPage}
          onNewProject={openNewProjectForm}
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
        navItems={navigationItems}
        onNavigate={navigateToPage}
      >
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
