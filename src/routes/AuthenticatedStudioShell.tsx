import type { ReactNode } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { CanonicalGlobalSearch } from '../components/layout/CanonicalGlobalSearch';
import { SyncStatusIndicator } from '../components/layout/SyncStatusIndicator';
import { navigationItems } from '../data/navigation';
import type { AppRoute } from '../lib/appRoutes';
import type { PageId } from '../types/navigation';
import type { CanonicalWorkspaceState, WorkspaceSyncState } from '../domains/workspace';

type AuthenticatedStudioShellProps = {
  children: ReactNode;
  email?: string;
  localCacheWarning: string | null;
  onNavigate: (page: PageId) => void;
  onOpenProject: (garmentId: string) => void;
  onSignOut: () => void;
  onSyncDetails: () => void;
  pendingCount: number;
  state: CanonicalWorkspaceState;
  route: AppRoute;
  syncError: string | null;
  syncStatus: WorkspaceSyncState;
};

/** The private shell owns only chrome; page and dialog ownership stays in route modules. */
export function AuthenticatedStudioShell({
  children,
  email,
  localCacheWarning,
  onNavigate,
  onOpenProject,
  onSignOut,
  onSyncDetails,
  pendingCount,
  state,
  route,
  syncError,
  syncStatus,
}: AuthenticatedStudioShellProps) {
  return (
    <AppShell
      activePage={route.page}
      globalSearch={
        <CanonicalGlobalSearch
          onNavigate={onNavigate}
          onOpenGarment={onOpenProject}
          state={state}
        />
      }
      navItems={navigationItems}
      onNavigate={onNavigate}
      onSignOut={onSignOut}
      syncStatus={
        <SyncStatusIndicator
          error={syncError}
          onOpen={onSyncDetails}
          pendingCount={pendingCount}
          status={syncStatus === 'ready' ? 'synced' : syncStatus === 'loading' ? 'syncing' : syncStatus === 'offline' ? 'offline' : 'error'}
          warning={localCacheWarning}
        />
      }
      userEmail={email}
    >
      {children}
    </AppShell>
  );
}
