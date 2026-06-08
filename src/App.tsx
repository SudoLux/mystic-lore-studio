import { useEffect, useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { navigationItems } from './data/navigation';
import { DashboardPage } from './pages/DashboardPage';
import { FabricVaultPage } from './pages/FabricVaultPage';
import { KanbanPage } from './pages/KanbanPage';
import { LookbooksPage } from './pages/LookbooksPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import type { PageId } from './types/navigation';

type AppRoute = {
  fabricId?: string;
  page: PageId;
  projectId?: string;
};

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
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);

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
    window.history.pushState(null, '', '#');
    setRoute({ page: 'projects' });
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
    const pages: Record<PageId, React.ReactNode> = {
      dashboard: <DashboardPage onNavigate={navigateToPage} />,
      projects: route.projectId ? (
        <ProjectDetailPage
          onBack={closeProject}
          projectId={route.projectId}
        />
      ) : (
        <ProjectsPage onOpenProject={openProject} />
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
  }, [route]);

  return (
    <AppShell
      activePage={route.page}
      navItems={navigationItems}
      onNavigate={navigateToPage}
    >
      {currentPage}
    </AppShell>
  );
}

export default App;
