import { DashboardPage } from '../pages/Dashboard';
import { FabricVaultPage } from '../pages/FabricVault';
import { KanbanPage } from '../pages/Kanban';
import { LookbooksPage } from '../pages/Lookbooks';
import { PortfolioPage } from '../pages/Portfolio';
import { ProjectsPage } from '../pages/Projects';
import { SettingsPage } from '../pages/Settings';
import { StatsPage } from '../pages/Stats';
import type { AppRoute } from '../lib/appRoutes';
import type { PageId } from '../types/navigation';
import type { ApparelProject, Fabric } from '../types/studio';
import { GarmentWorkspaceRoute } from './garments/GarmentWorkspaceRoute';

export type StudioPageRouterProps = {
  onAddFabric: () => void;
  onDeleteFabric: (fabric: Fabric) => void;
  onDeleteProject: (project: ApparelProject) => void;
  onEditFabric: (fabric: Fabric) => void;
  onEditProject: (project: ApparelProject) => void;
  onNavigate: (pageId: PageId) => void;
  onNewProject: () => void;
  onOpenFabric: (fabricId: string) => void;
  onOpenProject: (projectId: string) => void;
  route: AppRoute;
};

/**
 * The legacy feature pages are intentionally routed through one boundary.
 * This keeps page behavior stable while later work swaps individual domains
 * behind their 2.0 workspace contracts.
 */
export function StudioPageRouter({
  onAddFabric,
  onDeleteFabric,
  onDeleteProject,
  onEditFabric,
  onEditProject,
  onNavigate,
  onNewProject,
  onOpenFabric,
  onOpenProject,
  route,
}: StudioPageRouterProps) {
  if (route.page === 'dashboard') {
    return (
      <DashboardPage
        onAddFabric={onAddFabric}
        onNavigate={onNavigate}
        onNewProject={onNewProject}
        onOpenProject={onOpenProject}
      />
    );
  }

  if (route.page === 'projects') {
    return route.projectId ? (
      <GarmentWorkspaceRoute
        onBack={() => onNavigate('projects')}
        onDeleteProject={onDeleteProject}
        onEditProject={onEditProject}
        projectId={route.projectId}
      />
    ) : (
      <ProjectsPage onNewProject={onNewProject} onOpenProject={onOpenProject} />
    );
  }

  if (route.page === 'fabrics') {
    return (
      <FabricVaultPage
        fabricId={route.fabricId}
        onBack={() => onNavigate('fabrics')}
        onDeleteFabric={onDeleteFabric}
        onEditFabric={onEditFabric}
        onNewFabric={onAddFabric}
        onOpenFabric={onOpenFabric}
      />
    );
  }

  if (route.page === 'kanban') return <KanbanPage />;
  if (route.page === 'lookbooks') return <LookbooksPage />;
  if (route.page === 'portfolio') return <PortfolioPage />;
  if (route.page === 'stats') return <StatsPage />;
  return <SettingsPage />;
}
