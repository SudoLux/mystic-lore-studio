import type { ReactNode } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { GlobalSearch } from '../components/layout/GlobalSearch';
import { SyncStatusIndicator } from '../components/layout/SyncStatusIndicator';
import { navigationItems } from '../data/navigation';
import type { AppRoute } from '../lib/appRoutes';
import type { SyncStatus } from '../lib/studioSyncStorage';
import type { PageId } from '../types/navigation';
import type { Fabric, ApparelProject } from '../types/studio';

type AuthenticatedStudioShellProps = {
  children: ReactNode;
  email?: string;
  fabrics: Fabric[];
  localCacheWarning: string | null;
  onNavigate: (page: PageId) => void;
  onOpenFabric: (fabricId: string) => void;
  onOpenProject: (projectId: string) => void;
  onSignOut: () => void;
  onSyncDetails: () => void;
  pendingCount: number;
  projects: ApparelProject[];
  route: AppRoute;
  syncError: string | null;
  syncStatus: SyncStatus;
};

/** The private shell owns only chrome; page and dialog ownership stays in route modules. */
export function AuthenticatedStudioShell({
  children,
  email,
  fabrics,
  localCacheWarning,
  onNavigate,
  onOpenFabric,
  onOpenProject,
  onSignOut,
  onSyncDetails,
  pendingCount,
  projects,
  route,
  syncError,
  syncStatus,
}: AuthenticatedStudioShellProps) {
  return (
    <AppShell
      activePage={route.page}
      globalSearch={
        <GlobalSearch
          fabrics={fabrics}
          onOpenFabric={onOpenFabric}
          onOpenProject={onOpenProject}
          projects={projects}
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
          status={syncStatus}
          warning={localCacheWarning}
        />
      }
      userEmail={email}
    >
      {children}
    </AppShell>
  );
}
