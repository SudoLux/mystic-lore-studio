import { useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { navigationItems } from './data/navigation';
import { DashboardPage } from './pages/DashboardPage';
import { FabricVaultPage } from './pages/FabricVaultPage';
import { KanbanPage } from './pages/KanbanPage';
import { LookbooksPage } from './pages/LookbooksPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import type { PageId } from './types/navigation';

const pages: Record<PageId, React.ReactNode> = {
  dashboard: <DashboardPage />,
  projects: <ProjectsPage />,
  kanban: <KanbanPage />,
  lookbooks: <LookbooksPage />,
  fabrics: <FabricVaultPage />,
  stats: <StatsPage />,
  settings: <SettingsPage />,
};

function App() {
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const currentPage = useMemo(() => pages[activePage], [activePage]);

  return (
    <AppShell
      activePage={activePage}
      navItems={navigationItems}
      onNavigate={setActivePage}
    >
      {currentPage}
    </AppShell>
  );
}

export default App;
