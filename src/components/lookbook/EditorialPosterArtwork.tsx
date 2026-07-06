import type { CSSProperties, ReactNode } from 'react';
import { cn } from '../../lib/classes';
import { editorialTemplateLabel } from '../../lib/editorialCollections';
import { resolveEditorialTheme } from '../../lib/editorialThemes';
import type { EditorialCollection } from '../../types/editorial';
import type { ApparelProject } from '../../types/studio';
import { EditorialCollectionCover } from './EditorialCollectionCover';

type EditorialPosterArtworkProps = {
  children?: ReactNode;
  className?: string;
  collection: EditorialCollection;
  project?: ApparelProject;
  variant?: 'card' | 'preview' | 'viewer';
};

export function EditorialPosterArtwork({
  children,
  className,
  collection,
  project,
  variant = 'card',
}: EditorialPosterArtworkProps) {
  const theme = resolveEditorialTheme(collection.themeId);
  const accent = validAccent(collection.coverAccentColor) ?? theme.colors.accent;
  const label = collection.coverLabel?.trim() || editorialTemplateLabel(collection.templateType);
  const isViewer = variant === 'viewer';

  const style = {
    '--poster-accent': accent,
    '--poster-muted': theme.colors.mutedText,
    '--poster-text': theme.colors.text,
    fontFamily: theme.typography.bodyFont,
  } as CSSProperties;

  return (
    <div
      className={cn(
        'relative flex h-full w-full items-end overflow-hidden',
        className,
      )}
      data-editorial-theme={theme.id}
      style={style}
    >
      <EditorialCollectionCover className="absolute inset-0" collection={collection} project={project} />
      <div
        className={cn(
          'relative z-10 w-full',
          isViewer
            ? 'px-[var(--editorial-space-inline,clamp(1.25rem,7vw,7rem))] pb-[var(--editorial-space-block,clamp(5rem,10vh,8rem))]'
            : 'p-4 sm:p-5',
        )}
      >
        <div className="mb-3 h-px w-12 bg-[var(--poster-accent)] shadow-[0_0_18px_color-mix(in_srgb,var(--poster-accent)_55%,transparent)]" />
        <p className={cn(
          'font-semibold uppercase text-[var(--poster-accent)]',
          isViewer ? 'text-[0.68rem] tracking-[0.32em] sm:text-xs' : 'text-[0.6rem] tracking-[0.22em]',
        )}>
          {label}
        </p>
        <h2
          className={cn(
            'mt-3 break-words text-[var(--poster-text)] [text-shadow:0_6px_30px_rgba(0,0,0,.62)]',
            isViewer
              ? 'max-w-5xl text-[clamp(2.45rem,8vw,7rem)] leading-[0.98]'
              : variant === 'preview' ? 'text-3xl leading-[1.05]' : 'text-[1.35rem] leading-[1.15] sm:text-[1.55rem]',
          )}
          style={{ fontFamily: theme.typography.displayFont, fontWeight: theme.typography.displayWeight }}
        >
          {collection.title}
        </h2>
        <p className={cn(
          'mt-2 text-[var(--poster-text)]/80',
          isViewer ? 'max-w-3xl text-base leading-7 sm:text-xl sm:leading-8' : 'line-clamp-2 text-sm leading-5',
        )}>
          {collection.subtitle || project?.name}
        </p>
        {collection.description ? (
          <p className={cn(
            'mt-3 text-[var(--poster-muted)]',
            isViewer ? 'max-w-2xl text-sm leading-6 sm:text-base sm:leading-7' : 'line-clamp-2 text-xs leading-5',
          )}>
            {collection.description}
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}

function validAccent(value?: string) {
  const normalized = value?.trim();
  return normalized && /^#[0-9a-f]{6}$/i.test(normalized) ? normalized : undefined;
}
