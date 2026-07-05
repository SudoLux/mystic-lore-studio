import { useState } from 'react';
import { cn } from '../../lib/classes';
import type { EditorialCollection } from '../../types/editorial';
import type { ApparelProject } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';

type EditorialCollectionCoverProps = {
  className?: string;
  collection: EditorialCollection;
  project?: ApparelProject;
};

const themeGradients: Record<string, string> = {
  'celestial-archive':
    'bg-[radial-gradient(circle_at_68%_22%,rgba(45,92,107,0.72),transparent_31%),radial-gradient(circle_at_22%_78%,rgba(200,155,60,0.34),transparent_34%),linear-gradient(145deg,#111b27,#07090b_66%,#24170e)]',
  'midnight-atelier':
    'bg-[radial-gradient(circle_at_26%_24%,rgba(200,155,60,0.3),transparent_30%),radial-gradient(circle_at_78%_72%,rgba(27,58,99,0.58),transparent_34%),linear-gradient(145deg,#15110d,#080808_58%,#10242b)]',
  'stardust-paper':
    'bg-[radial-gradient(circle_at_30%_20%,rgba(237,227,207,0.28),transparent_27%),radial-gradient(circle_at_75%_70%,rgba(154,108,60,0.4),transparent_37%),linear-gradient(145deg,#28221c,#0d0c0b_58%,#15232a)]',
};

export function EditorialCollectionCover({
  className,
  collection,
  project,
}: EditorialCollectionCoverProps) {
  const [urlFailed, setUrlFailed] = useState(false);
  const projectImages = [project?.heroImage, ...(project?.galleryImages ?? [])]
    .filter((image) => Boolean(image));
  const projectImage = collection.coverImageId
    ? projectImages.find((image) => image?.id === collection.coverImageId)
    : project?.heroImage;

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden bg-midnight',
        themeGradients[collection.themeId] ?? themeGradients['midnight-atelier'],
        className,
      )}
    >
      {collection.coverImageUrl && !urlFailed ? (
        <img
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setUrlFailed(true)}
          src={collection.coverImageUrl}
        />
      ) : projectImage ? (
        <AdaptiveProjectImage
          asset={projectImage}
          className="absolute inset-0"
          mode="compact"
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,0.16),rgba(5,5,5,0.04)_35%,rgba(5,5,5,0.92)_100%)]" />
      <div className="absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(237,227,207,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(237,227,207,.09)_1px,transparent_1px)] [background-size:32px_32px]" />
    </div>
  );
}
