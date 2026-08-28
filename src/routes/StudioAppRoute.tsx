import { useEffect, useState } from 'react';
import { Card } from '../components/shared/Card';
import { useAuth } from '../hooks/useAuth';
import { useCanonicalWorkspace } from '../hooks/useCanonicalWorkspace';
import { getInitialRoute, type AppRoute } from '../lib/appRoutes';
import type { PageId } from '../types/navigation';
import { AuthenticatedStudioShell } from './AuthenticatedStudioShell';
import { SupabaseEnvWarning } from './StudioModalLayer';
import { StudioPageRouter } from './StudioPageRouter';

/** Authenticated route boundary. Browser-local legacy data is never a normal screen authority here. */
export function StudioAppRoute() {
  const {
    error,
    isReady,
    pendingCount,
    persistenceMode,
    refresh,
    retry,
    state,
    syncState,
  } = useCanonicalWorkspace();
  const { signOut, user } = useAuth();
  const [route, setRoute] = useState<AppRoute>(getInitialRoute);
  const [authActionError, setAuthActionError] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => setRoute(getInitialRoute());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [route.page, route.productionGarmentId, route.projectId, route.technicalGarmentId]);

  const navigateToPage = (page: PageId) => {
    window.history.pushState(null, '', page === 'dashboard' ? '#' : `#/${page}`);
    setRoute({ page });
  };

  const openProject = (garmentId: string) => {
    window.history.pushState(null, '', `#/projects/${garmentId}`);
    setRoute({ page: 'projects', projectId: garmentId });
  };

  const openTechnicalGarment = (garmentId: string) => {
    window.history.pushState(null, '', `#/technical/${garmentId}`);
    setRoute({ page: 'technical', technicalGarmentId: garmentId });
  };

  const openProductionGarment = (garmentId: string) => {
    window.history.pushState(null, '', `#/production/${garmentId}`);
    setRoute({ page: 'production', productionGarmentId: garmentId });
  };

  const handleSignOut = async () => {
    setAuthActionError(null);
    try {
      await signOut();
    } catch (reason) {
      setAuthActionError(reason instanceof Error ? reason.message : 'Unable to sign out. Please try again.');
    }
  };

  if (!isReady || !state) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <Card aria-busy={syncState === 'loading'} className="w-full border-bronze/28" role="status">
          <p className="text-lg font-semibold text-stardust">Preparing the canonical Studio…</p>
          <p className="mt-2 text-sm leading-6 text-stardust/58">Loading the persisted workspace, offline outbox, and recovery boundary.</p>
          {error ? (
            <div className="mt-4 rounded-xl border border-ember/32 bg-ember/10 p-4 text-sm text-stardust/72">
              <p>{error}</p>
              <button className="mt-3 min-h-11 rounded-xl border border-ember/36 px-4" onClick={retry} type="button">Try again</button>
            </div>
          ) : null}
        </Card>
      </main>
    );
  }

  return (
    <AuthenticatedStudioShell
      email={user?.email}
      localCacheWarning={persistenceMode === 'cloud' ? null : `${persistenceMode} rollout mode`}
      onNavigate={navigateToPage}
      onOpenProject={openProject}
      onSignOut={() => void handleSignOut()}
      onSyncDetails={() => { navigateToPage('settings'); void refresh(); }}
      pendingCount={pendingCount}
      route={route}
      state={state}
      syncError={error}
      syncStatus={syncState}
    >
      {authActionError ? <section className="mb-4 rounded-3xl border border-ember/30 bg-ember/10 p-4 text-sm leading-6 text-stardust/72">{authActionError}</section> : null}
      <SupabaseEnvWarning />
      <StudioPageRouter
        onNavigate={navigateToPage}
        onOpenProject={openProject}
        onOpenTechnicalGarment={openTechnicalGarment}
        onOpenProductionGarment={openProductionGarment}
        route={route}
      />
    </AuthenticatedStudioShell>
  );
}
