import { useEffect, useState } from 'react';
import { cn } from '../../lib/classes';
import { resolveEditorialTheme } from '../../lib/editorialThemes';
import type { EditorialCollection } from '../../types/editorial';
import type { ApparelProject } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';

type EditorialCollectionCoverProps = {
  className?: string;
  collection: EditorialCollection;
  project?: ApparelProject;
};

export function EditorialCollectionCover({
  className,
  collection,
  project,
}: EditorialCollectionCoverProps) {
  const [urlFailed, setUrlFailed] = useState(false);
  const projectImages = [project?.heroImage, ...(project?.galleryImages ?? []), ...(project?.editorialImages ?? [])]
    .filter((image) => Boolean(image));
  const projectImage = collection.coverImageId
    ? projectImages.find((image) => image?.id === collection.coverImageId)
    : project?.heroImage;
  const theme = resolveEditorialTheme(collection.themeId);
  const imageFit = collection.coverImageFit ?? 'cover';

  useEffect(() => setUrlFailed(false), [collection.coverImageUrl]);

  return (
    <div
      className={cn(
        'h-full w-full overflow-hidden',
        !className && 'relative',
        className,
      )}
      data-editorial-theme={theme.id}
      style={{ backgroundColor: theme.colors.background, backgroundImage: theme.backgroundTreatment.backgroundImage }}
    >
      {collection.coverImageUrl && !urlFailed ? (
        <img
          alt=""
          className={cn(
            'absolute inset-0 h-full w-full',
            imageFit === 'contain' ? 'object-contain' : 'object-cover',
          )}
          onError={() => setUrlFailed(true)}
          src={collection.coverImageUrl}
        />
      ) : projectImage ? (
        <AdaptiveProjectImage
          asset={projectImage}
          className="absolute inset-0"
          displayFit={imageFit}
          mode={imageFit === 'contain' ? 'primary' : 'compact'}
        />
      ) : null}
      <div className="absolute inset-0" style={{ background: theme.backgroundTreatment.coverScrim }} />
      <div className="absolute inset-0 opacity-[0.18] [background-size:32px_32px]" style={{ backgroundImage: `linear-gradient(${theme.backgroundTreatment.gridColor} 1px,transparent 1px),linear-gradient(90deg,${theme.backgroundTreatment.gridColor} 1px,transparent 1px)` }} />
    </div>
  );
}
