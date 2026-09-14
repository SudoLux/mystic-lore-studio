import { Component, lazy, Suspense, type ComponentType, type ReactNode } from 'react';
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
  return <RouteErrorBoundary><Suspense fallback={<RouteLoading />}><div className="atelier-route" key={routeKey(props.route)}><StudioPage {...props} /></div></Suspense></RouteErrorBoundary>;
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

  if (route.page === 'fabrics') return <LibraryVaultPage fabricId={route.fabricId} onBack={() => onNavigate('fabrics')} onOpenGarment={onOpenProject} />;
  if (route.page === 'technical') return <TechnicalStudioPage garmentId={route.technicalGarmentId} onOpenGarment={onOpenTechnicalGarment} />;
  if (route.page === 'production') return <ProductionPage garmentId={route.productionGarmentId} onOpenGarment={onOpenProductionGarment} />;
  if (route.page === 'versions') return <VersionsPage />;
  if (route.page === 'ai') return <AiStudioPage />;
  if (route.page === 'kanban') return <PlanPage onOpenGarment={onOpenProject} />;
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
  return lazy(async () => {
    try {
      const module = await loader();
      // A matching chunk has loaded, so a future deploy mismatch may recover once.
      window.sessionStorage.removeItem(chunkRecoveryKey);
      return { default: module[key] as ComponentType<any> };
    } catch (error) {
      // Netlify can briefly serve a cached entry file while the old hashed
      // route chunk has been retired. One controlled reload obtains matching
      // assets; repeated failures surface a usable recovery state instead.
      if (shouldRecoverStaleChunk(error)) {
        window.sessionStorage.setItem(chunkRecoveryKey, '1');
        reloadWithFreshEntry();
        return new Promise<never>(() => undefined);
      }
      throw error;
    }
  });
}

const chunkRecoveryKey = 'ml-studio:chunk-recovery';

/**
 * Netlify deploys hashed route chunks. A query-busted entry request avoids a
 * browser or edge cache pairing an older HTML entry with a retired chunk while
 * preserving the current hash route.
 */
function reloadWithFreshEntry() {
  const url = new URL(window.location.href);
  url.searchParams.set('ml-reload', String(Date.now()));
  window.location.replace(url.toString());
}

function shouldRecoverStaleChunk(error: unknown) {
  if (typeof window === 'undefined' || window.sessionStorage.getItem(chunkRecoveryKey)) return false;
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|failed to fetch|importing a module script/i.test(message);
}

class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { window.sessionStorage.removeItem(chunkRecoveryKey); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <section className="atelier-panel mx-auto max-w-xl rounded-[1.5rem] p-6 text-center"><p className="text-[0.65rem] uppercase tracking-[.18em] text-ember">Studio recovery</p><h1 className="font-display mt-3 text-3xl">This workspace needs a fresh load</h1><p className="mt-3 text-sm leading-6 text-stardust/60">A newer Studio build is available, but this tab still has an older page entry. Your saved work remains intact.</p><button className="atelier-button mt-6 rounded-xl border border-ember/70 bg-[#d5ab51] px-4 py-3 text-sm font-medium text-midnight" onClick={reloadWithFreshEntry} type="button">Reload current Studio</button></section>;
  }
}
