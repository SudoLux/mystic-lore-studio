import type { ReactNode } from 'react';
import { garmentLenses, type GarmentLens } from '../../domains/garments/contracts';
import { ProjectDetailPage } from '../../pages/ProjectDetail';
import type { ApparelProject } from '../../types/studio';

export { garmentLenses };
export type { GarmentLens };

export type GarmentWorkspaceRouteProps = {
  onBack: () => void;
  onDeleteProject: (project: ApparelProject) => void;
  onEditProject: (project: ApparelProject) => void;
  projectId: string;
  /** Reserved for the wide-screen Threadline rail introduced in later work. */
  threadline?: ReactNode;
};

/**
 * WP1 keeps the current project detail experience intact behind the canonical
 * garment workspace route. The existing tabs remain a legacy presentation
 * adapter until later domain work replaces their data ownership.
 */
export function GarmentWorkspaceRoute({
  onBack,
  onDeleteProject,
  onEditProject,
  projectId,
}: GarmentWorkspaceRouteProps) {
  return (
    <ProjectDetailPage
      onBack={onBack}
      onDeleteProject={onDeleteProject}
      onEditProject={onEditProject}
      projectId={projectId}
    />
  );
}
