import { lazy, Suspense, type ComponentType } from 'react';
import { StudioSkeleton } from '../components/shared/StudioSkeleton';
import type { AppRoute } from '../lib/appRoutes';
import type { PageId } from '../types/navigation';

const TodayPage = lazyNamed(() => import('../pages/Today'), 'TodayPage');
const GarmentLibraryPage = lazyNamed(() => import('../pages/GarmentLibrary'), 'GarmentLibraryPage');
const CanonicalGarmentWorkspacePage = lazyNamed(() => import('../pages/GarmentWorkspace'), 'CanonicalGarmentWorkspacePage');
const LibraryVaultPage = lazyNamed(() => import('../pages/LibraryVault'), 'LibraryVaultPage');
const PlanPage = lazyNamed(() => import('../pages/Plan'), 'PlanPage');
const EditorialStudioPage = lazyNamed(() => import('../pages/EditorialStudio'), 'EditorialStudioPage');
const PortfolioStudioPage = lazyNamed(() => import('../pages/PortfolioStudio'), 'PortfolioStudioPage');
const SettingsPage = lazyNamed(() => import('../pages/Settings'), 'SettingsPage');
const StatsPage = lazyNamed(() => import('../pages/Stats'), 'StatsPage');
const TechnicalStudioPage = lazyNamed(() => import('../pages/TechnicalStudio'), 'TechnicalStudioPage');
const VersionsPage = lazyNamed(() => import('../pages/Versions'), 'VersionsPage');
const ProductionPage = lazyNamed(() => import('../pages/Production'), 'ProductionPage');
const AiStudioPage = lazyNamed(() => import('../pages/AiStudio'), 'AiStudioPage');

export type StudioPageRouterProps = {
  onNavigate: (pageId: PageId) => void;
  onOpenProject: (garmentId: string) => void;
  onOpenTechnicalGarment: (garmentId: string) => void;
  onOpenProductionGarment: (garmentId: string) => void;
  route: AppRoute;
};

/** Each Studio area is a separate route chunk; all private screens read the canonical provider. */
export function StudioPageRouter(props: StudioPageRouterProps) {
  return <Suspense fallback={<RouteLoading />}><div className="atelier-route" key={routeKey(props.route)}><StudioPage {...props} /></div></Suspense>;
}

function StudioPage({
  onNavigate,
  onOpenProject,
  onOpenTechnicalGarment,
  onOpenProductionGarment,
  route,
}: StudioPageRouterProps) {
  if (route.page === 'dashboard') return <TodayPage onNavigate={onNavigate} onOpenGarment={onOpenProject} />;

  if (route.page === 'projects') {
    return route.projectId
      ? <CanonicalGarmentWorkspacePage garmentId={route.projectId} onBack={() => onNavigate('projects')} />
      : <GarmentLibraryPage onOpenGarment={onOpenProject} />;
  }

  if (route.page === 'fabrics') return <LibraryVaultPage />;
  if (route.page === 'technical') return <TechnicalStudioPage garmentId={route.technicalGarmentId} onOpenGarment={onOpenTechnicalGarment} />;
  if (route.page === 'production') return <ProductionPage garmentId={route.productionGarmentId} onOpenGarment={onOpenProductionGarment} />;
  if (route.page === 'versions') return <VersionsPage />;
  if (route.page === 'ai') return <AiStudioPage />;
  if (route.page === 'kanban') return <PlanPage />;
  if (route.page === 'lookbooks') return <EditorialStudioPage />;
  if (route.page === 'portfolio') return <PortfolioStudioPage />;
  if (route.page === 'stats') return <StatsPage />;
  return <SettingsPage />;
}

function RouteLoading() {
  return <StudioSkeleton />;
}

function routeKey(route: AppRoute) {
  return [route.page, route.projectId, route.technicalGarmentId, route.productionGarmentId].filter(Boolean).join(':');
}

function lazyNamed<TModule extends Record<string, unknown>, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
) {
  return lazy(async () => ({ default: (await loader())[key] as ComponentType<any> }));
}
