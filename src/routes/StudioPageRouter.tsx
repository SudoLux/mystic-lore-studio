import { DashboardPage } from '../pages/Dashboard';
import { GarmentLibraryPage } from '../pages/GarmentLibrary';
import { CanonicalGarmentWorkspacePage } from '../pages/GarmentWorkspace';
import { LibraryVaultPage } from '../pages/LibraryVault';
import { KanbanPage } from '../pages/Kanban';
import { EditorialStudioPage } from '../pages/EditorialStudio';
import { PortfolioStudioPage } from '../pages/PortfolioStudio';
import { SettingsPage } from '../pages/Settings';
import { StatsPage } from '../pages/Stats';
import { TechnicalStudioPage } from '../pages/TechnicalStudio';
import { VersionsPage } from '../pages/Versions';
import { ProductionPage } from '../pages/Production';
import type { AppRoute } from '../lib/appRoutes';
import type { PageId } from '../types/navigation';
import type { ApparelProject, Fabric } from '../types/studio';

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
  onOpenTechnicalGarment: (garmentId: string) => void;
  onOpenProductionGarment: (garmentId: string) => void;
  route: AppRoute;
};

/**
 * The legacy feature pages are intentionally routed through one boundary.
 * This keeps page behavior stable while later work swaps individual domains
 * behind their 2.0 workspace contracts.
 */
export function StudioPageRouter({
  onAddFabric,
  onNavigate,
  onNewProject,
  onOpenProject,
  onOpenTechnicalGarment,
  onOpenProductionGarment,
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
      <CanonicalGarmentWorkspacePage
        onBack={() => onNavigate('projects')}
        garmentId={route.projectId}
      />
    ) : (
      <GarmentLibraryPage onOpenGarment={onOpenProject} />
    );
  }

  if (route.page === 'fabrics') {
    return <LibraryVaultPage />;
  }

  if (route.page === 'technical') {
    return <TechnicalStudioPage garmentId={route.technicalGarmentId} onOpenGarment={onOpenTechnicalGarment} />;
  }

  if (route.page === 'production') return <ProductionPage garmentId={route.productionGarmentId} onOpenGarment={onOpenProductionGarment} />;

  if (route.page === 'versions') return <VersionsPage />;

  if (route.page === 'kanban') return <KanbanPage />;
  if (route.page === 'lookbooks') return <EditorialStudioPage />;
  if (route.page === 'portfolio') return <PortfolioStudioPage />;
  if (route.page === 'stats') return <StatsPage />;
  return <SettingsPage />;
}
