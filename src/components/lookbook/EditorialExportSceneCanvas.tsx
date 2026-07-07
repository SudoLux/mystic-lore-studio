import type { EditorialExportSceneSnapshot, EditorialExportSnapshot } from '../../lib/editorialExport';
import type { EditorialCollection, EditorialScene, EditorialTheme } from '../../types/editorial';
import type { ApparelProject, Fabric } from '../../types/studio';
import { EditorialSceneRenderer } from './scenes/EditorialSceneRenderer';

export type EditorialExportRenderContext = Readonly<{
  collection: EditorialCollection;
  fabrics: Fabric[];
  project?: ApparelProject;
  scenes: ReadonlyMap<string, EditorialScene>;
  snapshot: EditorialExportSnapshot;
  theme: EditorialTheme;
}>;

export function EditorialExportSceneCanvas({
  context,
  scene,
}: {
  context: EditorialExportRenderContext;
  scene: EditorialExportSceneSnapshot;
}) {
  const renderScene = context.scenes.get(scene.sceneId);
  if (!renderScene) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] p-16 text-center text-[#ede3cf]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#c89b3c]">Editorial Collection</p>
          <h2 className="font-display mt-5 text-5xl">Scene unavailable</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden">
      <EditorialSceneRenderer
        collection={context.collection}
        fabrics={context.fabrics}
        project={context.project}
        scene={renderScene}
        theme={context.theme}
      />
    </div>
  );
}
