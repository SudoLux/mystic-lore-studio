import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../../lib/classes';
import { resolveProjectEditorialImage } from '../../../lib/editorialAssets';
import { editorialFrameAspectClass, editorialImageDisplay, galleryLayoutForCount } from '../../../lib/editorialMedia';
import type { EditorialImageContent, EditorialJsonObject } from '../../../types/editorial';
import type { LocalImageAsset } from '../../../types/studio';
import { AdaptiveProjectImage } from '../../projects/AdaptiveProjectImage';
import { contentArray, contentNumber, contentString, isContentRecord } from './blockContent';
import type { EditorialBlockRendererProps } from './types';

export function ImageBlock({ block, project }: EditorialBlockRendererProps) {
  const assetId = contentString(block.content, 'assetId');
  const assetName = contentString(block.content, 'assetName', 'Project image');
  const asset = resolveProjectEditorialImage(project, assetId);
  const url = contentString(block.content, 'url', typeof block.content === 'string' ? block.content : '');
  const caption = contentString(block.content, 'caption');
  const alt = contentString(block.content, 'alt', caption || assetName || 'Editorial image');
  const content = (isContentRecord(block.content) ? block.content : {}) as EditorialJsonObject;
  const fit = contentString(block.content, 'fitMode', contentString(block.content, 'fit')) === 'contain' ? 'contain' : contentString(block.content, 'fitMode', contentString(block.content, 'fit')) === 'cover' ? 'cover' : undefined;
  const presentationAsset = asset ? editorialImageDisplay(asset, content as EditorialImageContent) : undefined;
  const compositionId = contentString(block.content, 'compositionId');
  return (
    <figure className={cn('editorial-theme-card overflow-hidden border', compositionId === 'full-bleed' ? 'w-full max-w-none' : 'max-w-5xl')}>
      <EditorialMedia
        alt={alt}
        asset={presentationAsset}
        className={cn('w-full', editorialFrameAspectClass(contentString(block.content, 'frame') as EditorialImageContent['frame'], asset))}
        fit={fit}
        missingLabel={assetId ? `${assetName} is no longer available` : undefined}
        url={url}
      />
      {caption ? <figcaption className="border-t border-stardust/10 px-4 py-3 text-xs leading-5 text-stardust/48">{caption}</figcaption> : null}
    </figure>
  );
}

export function GalleryBlock({ block, project }: EditorialBlockRendererProps) {
  const rawImages = contentArray(block.content, 'images');
  const images: ResolvedGalleryImage[] = rawImages.flatMap<ResolvedGalleryImage>((item, index) => {
    if (typeof item === 'string') return [{ alt: `Editorial image ${index + 1}`, asset: undefined, assetId: '', assetName: '', caption: '', url: item }];
    if (!isContentRecord(item)) return [];
    const assetId = typeof item.assetId === 'string' ? item.assetId : '';
    const assetName = typeof item.assetName === 'string' ? item.assetName : `Project image ${index + 1}`;
    const url = typeof item.url === 'string' ? item.url : '';
    return [{
      alt: typeof item.alt === 'string' ? item.alt : assetName,
      asset: resolveProjectEditorialImage(project, assetId),
      assetId,
      assetName,
      caption: typeof item.caption === 'string' ? item.caption : '',
      presentation: item,
      url,
    }];
  });
  const requestedColumns = contentNumber(block.content, 'columns', 0);
  const columns = requestedColumns || Math.min(Math.max(images.length, 1), 3);
  const layout = galleryLayoutForCount(contentString(block.content, 'layout', 'auto'), images.length);
  const compositionId = contentString(block.content, 'compositionId');
  const visibleImages: ResolvedGalleryImage[] = images.length > 0
    ? images
    : Array.from({ length: Math.max(columns, 1) }, (_, index) => ({ alt: `Gallery placeholder ${index + 1}`, asset: undefined, assetId: '', assetName: '', caption: '', url: '' }));

  return (
    <div className={cn('grid w-full gap-2 sm:gap-3', compositionId === 'full-bleed' ? 'max-w-none' : 'max-w-6xl', galleryLayoutClass(layout, columns, compositionId))}>
      {visibleImages.map((image, index) => (
        <figure className={cn('editorial-theme-card overflow-hidden border', layout === 'feature' && index > 0 ? 'hidden' : '', layout === 'mosaic' && index === 0 ? 'col-span-2 row-span-2' : '')} key={`${image.assetId || image.url || 'empty'}-${index}`}>
          <EditorialMedia
            alt={image.alt}
            asset={image.asset && image.presentation ? editorialImageDisplay(image.asset, image.presentation as EditorialImageContent) : image.asset}
            className={cn('w-full', editorialFrameAspectClass(image.presentation ? contentString(image.presentation, 'frame') as EditorialImageContent['frame'] : undefined, image.asset))}
            fit={isContentRecord(image.presentation) ? contentString(image.presentation, 'fitMode', contentString(image.presentation, 'fit')) === 'contain' ? 'contain' : 'cover' : 'cover'}
            missingLabel={image.assetId ? `${image.assetName} is no longer available` : undefined}
            url={image.url}
          />
          {image.caption ? <figcaption className="px-3 py-2 text-xs text-stardust/45">{image.caption}</figcaption> : null}
        </figure>
      ))}
    </div>
  );
}

type ResolvedGalleryImage = {
  alt: string;
  asset?: LocalImageAsset;
  assetId: string;
  assetName: string;
  caption: string;
  presentation?: EditorialJsonObject;
  url: string;
};

function EditorialMedia({
  alt,
  asset,
  className,
  fit,
  missingLabel,
  url,
}: {
  alt: string;
  asset?: LocalImageAsset;
  className: string;
  fit?: 'contain' | 'cover';
  missingLabel?: string;
  url: string;
}) {
  if (asset) {
    return <AdaptiveProjectImage asset={asset} className={className} displayFit={fit} mode={fit === 'contain' ? 'primary' : 'compact'} />;
  }
  return <SafeImage alt={alt} className={className} fit={fit} missingLabel={missingLabel} url={url} />;
}

function SafeImage({ alt, className, fit = 'cover', missingLabel, url }: { alt: string; className: string; fit?: 'contain' | 'cover'; missingLabel?: string; url: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (!url || failed) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 bg-[radial-gradient(circle_at_30%_20%,rgba(200,155,60,.17),transparent_28%),linear-gradient(145deg,rgba(27,58,99,.34),rgba(10,10,10,.88))] px-4 text-center', className)}>
        <ImageOff className="text-stardust/24" size={22} />
        {missingLabel ? <span className="max-w-48 text-[0.62rem] leading-4 text-stardust/36">{missingLabel}</span> : null}
      </div>
    );
  }
  return <img alt={alt} className={cn(className, fit === 'contain' ? 'object-contain' : 'object-cover')} onError={() => setFailed(true)} src={url} />;
}

function galleryLayoutClass(layout: string, columns: number, compositionId: string) {
  if (compositionId === 'stacked-pair') return 'grid-cols-1';
  if (compositionId === 'lead-detail') return 'grid-cols-2 [&>figure:first-child]:row-span-2';
  if (compositionId === 'editorial-feature-grid') return 'grid-cols-2 md:grid-cols-3 [&>figure:first-child]:col-span-2 [&>figure:first-child]:row-span-2';
  if (compositionId === 'contact-sheet') return 'grid-cols-2 lg:grid-cols-3';
  if (compositionId === 'hero-sequence') return 'grid-cols-2 md:grid-cols-3 [&>figure:first-child]:col-span-2';
  if (layout === 'feature') return 'grid-cols-1';
  if (layout === 'diptych') return 'grid-cols-1 sm:grid-cols-2';
  if (layout === 'mosaic') return 'grid-cols-2 md:grid-cols-3';
  return columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';
}
