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
  page: PageId;
  projectId?: string;
};

function getInitialRoute(): AppRoute {
  const [, section, projectId] = window.location.hash.split('/');

  if (section === 'projects' && projectId) {
    return { page: 'projects', projectId };
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
      fabrics: <FabricVaultPage />,
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
