import type { CSSProperties, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import type {
  EditorialBlock,
  EditorialCollection,
  EditorialScene,
  EditorialTheme,
} from '../../../types/editorial';
import type { ApparelProject, Fabric, LocalImageAsset } from '../../../types/studio';
import { resolveProjectEditorialImage } from '../../../lib/editorialAssets';
import { AdaptiveProjectImage } from '../../projects/AdaptiveProjectImage';
import { EditorialBlockList } from '../blocks/EditorialBlockRenderer';
import { EditorialCollectionCover } from '../EditorialCollectionCover';

export function EditorialStage({
  children,
  collection,
  project,
  scene,
  theme,
}: {
  children: ReactNode;
  collection: EditorialCollection;
  project?: ApparelProject;
  scene?: EditorialScene;
  theme: EditorialTheme;
}) {
  const sceneImage = resolveProjectEditorialImage(project, scene?.background.imageId);
  return (
    <section
      className="editorial-theme-surface editorial-scene-frame relative flex h-full items-center overflow-y-auto"
      data-editorial-theme={theme.id}
      style={themeStyle(theme)}
    >
      <div className="absolute inset-0 opacity-35">
        {sceneImage ? <AdaptiveProjectImage asset={sceneImage} className="absolute inset-0" mode="primary" /> : <EditorialCollectionCover collection={collection} project={project} />}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,color-mix(in_srgb,var(--editorial-accent)_18%,transparent),transparent_28%),linear-gradient(120deg,color-mix(in_srgb,var(--editorial-background)_78%,transparent),color-mix(in_srgb,var(--editorial-background)_92%,transparent)_58%,color-mix(in_srgb,var(--editorial-surface)_86%,transparent))] backdrop-blur-xl" />
      <div className="editorial-theme-content relative z-10 mx-auto w-full">{children}</div>
    </section>
  );
}

export function BlockContent({
  authoring,
  blocks,
  fabrics,
  prominent = false,
  project,
  theme,
}: {
  authoring?: {
    onSelectBlock: (blockId: string) => void;
    selectedBlockId?: string;
  };
  blocks: EditorialBlock[];
  fabrics?: Fabric[];
  prominent?: boolean;
  project?: ApparelProject;
  theme: EditorialTheme;
}) {
  return <EditorialBlockList authoring={authoring} blocks={blocks} fabrics={fabrics} prominent={prominent} project={project} theme={theme} />;
}

export function SceneLabel({ label }: { label: string }) {
  return (
    <p className="mt-3 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[var(--editorial-accent)] sm:text-xs">
      {label}
    </p>
  );
}

export function ScenePlaceholder({ label }: { label: string }) {
  return (
    <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stardust/12 bg-midnight/34 px-3 py-2 text-xs text-stardust/38 backdrop-blur-xl">
      <Sparkles className="text-[var(--editorial-accent)] opacity-70" size={13} />
      {label}
    </div>
  );
}

export function SceneNarrative({
  centered = false,
  scene,
}: {
  centered?: boolean;
  scene: EditorialScene;
}) {
  if (!scene.subtitle && !scene.description) return null;
  return (
    <div className={centered ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {scene.subtitle ? <p className="mt-3 text-sm font-semibold text-stardust/72 sm:text-base">{scene.subtitle}</p> : null}
      {scene.description ? <p className="mt-2 text-sm leading-6 text-stardust/48 sm:leading-7">{scene.description}</p> : null}
    </div>
  );
}

export function projectImages(
  project: ApparelProject | undefined,
  collection: EditorialCollection,
) {
  if (!project) return [];
  const images = [project.heroImage, ...(project.galleryImages ?? []), ...(project.editorialImages ?? [])]
    .filter((image): image is LocalImageAsset => Boolean(image));
  const unique = images.filter(
    (image, index) => images.findIndex((candidate) => candidate.id === image.id) === index,
  );
  return [...unique].sort((a, b) => {
    if (a.id === collection.coverImageId) return -1;
    if (b.id === collection.coverImageId) return 1;
    return 0;
  });
}

export function themeStyle(theme: EditorialTheme) {
  return {
    '--editorial-accent': theme.colors.accent,
    '--editorial-background': theme.colors.background,
    '--editorial-border': theme.colors.border,
    '--editorial-card-background': theme.cardTreatment.background,
    '--editorial-card-border': theme.cardTreatment.border,
    '--editorial-card-blur': theme.cardTreatment.backdropBlur,
    '--editorial-card-radius': theme.cardTreatment.borderRadius,
    '--editorial-card-shadow': theme.cardTreatment.shadow,
    '--editorial-content-gap': theme.sceneSpacing.contentGap,
    '--editorial-content-max-width': theme.sceneSpacing.maxWidth,
    '--editorial-display-font': theme.typography.displayFont,
    '--editorial-body-font': theme.typography.bodyFont,
    '--editorial-muted-text': theme.colors.mutedText,
    '--editorial-scene-block': theme.sceneSpacing.block,
    '--editorial-scene-inline': theme.sceneSpacing.inline,
    '--editorial-surface': theme.colors.surface,
    '--editorial-text': theme.colors.text,
  } as CSSProperties;
}
