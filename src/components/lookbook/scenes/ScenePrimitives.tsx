import type { CSSProperties, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import type {
  EditorialBlock,
  EditorialCollection,
  EditorialScene,
  EditorialTheme,
} from '../../../types/editorial';
import type { ApparelProject, LocalImageAsset } from '../../../types/studio';
import { EditorialBlockList } from '../blocks/EditorialBlockRenderer';
import { EditorialCollectionCover } from '../EditorialCollectionCover';

export function EditorialStage({
  children,
  collection,
  project,
  theme,
}: {
  children: ReactNode;
  collection: EditorialCollection;
  project?: ApparelProject;
  theme: EditorialTheme;
}) {
  return (
    <section
      className="relative flex h-full items-center overflow-y-auto px-5 pb-28 pt-28 sm:px-9 sm:pb-32 lg:px-[7vw]"
      style={themeStyle(theme)}
    >
      <div className="absolute inset-0 opacity-35">
        <EditorialCollectionCover collection={collection} project={project} />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,color-mix(in_srgb,var(--editorial-accent)_18%,transparent),transparent_28%),linear-gradient(120deg,rgba(5,5,5,.78),rgba(5,5,5,.9)_58%,rgba(35,23,15,.82))] backdrop-blur-xl" />
      <div className="relative z-10 mx-auto w-full">{children}</div>
    </section>
  );
}

export function BlockContent({
  blocks,
  prominent = false,
  theme,
}: {
  blocks: EditorialBlock[];
  prominent?: boolean;
  theme: EditorialTheme;
}) {
  return <EditorialBlockList blocks={blocks} prominent={prominent} theme={theme} />;
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
  const images = [project.heroImage, ...(project.galleryImages ?? [])]
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
    '--editorial-surface': theme.colors.surface,
    '--editorial-text': theme.colors.text,
  } as CSSProperties;
}
