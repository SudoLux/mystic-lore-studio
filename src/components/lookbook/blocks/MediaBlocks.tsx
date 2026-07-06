import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '../../../lib/classes';
import { contentArray, contentNumber, contentString, isContentRecord } from './blockContent';
import type { EditorialBlockRendererProps } from './types';

export function ImageBlock({ block }: EditorialBlockRendererProps) {
  const url = contentString(block.content, 'url', typeof block.content === 'string' ? block.content : '');
  const caption = contentString(block.content, 'caption');
  const alt = contentString(block.content, 'alt', caption || 'Editorial image');
  const fit = contentString(block.content, 'fit') === 'contain' ? 'contain' : 'cover';
  return (
    <figure className="editorial-theme-card max-w-5xl overflow-hidden border">
      <SafeImage alt={alt} className="aspect-[4/3] w-full" fit={fit} url={url} />
      {caption ? <figcaption className="border-t border-stardust/10 px-4 py-3 text-xs leading-5 text-stardust/48">{caption}</figcaption> : null}
    </figure>
  );
}

export function GalleryBlock({ block }: EditorialBlockRendererProps) {
  const rawImages = contentArray(block.content, 'images');
  const images = rawImages.flatMap((item, index) => {
    if (typeof item === 'string') return [{ alt: `Editorial image ${index + 1}`, url: item }];
    if (!isContentRecord(item)) return [];
    const url = typeof item.url === 'string' ? item.url : '';
    if (!url) return [];
    return [{
      alt: typeof item.alt === 'string' ? item.alt : `Editorial image ${index + 1}`,
      caption: typeof item.caption === 'string' ? item.caption : '',
      url,
    }];
  });
  const requestedColumns = contentNumber(block.content, 'columns', 0);
  const columns = requestedColumns || Math.min(Math.max(images.length, 1), 3);
  return (
    <div
      className={cn(
        'grid max-w-6xl gap-2 sm:gap-3',
        columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3',
      )}
    >
      {(images.length > 0 ? images : Array.from({ length: Math.max(columns, 1) }, (_, index) => ({ alt: `Gallery placeholder ${index + 1}`, url: '' }))).map((image, index) => (
        <figure className={cn('editorial-theme-card overflow-hidden border', index === 0 && images.length === 3 ? 'row-span-2 lg:row-span-1' : '')} key={`${image.url}-${index}`}>
          <SafeImage alt={image.alt} className="aspect-[3/4] w-full lg:aspect-[4/5]" fit="cover" url={image.url} />
          {'caption' in image && typeof image.caption === 'string' && image.caption ? (
            <figcaption className="px-3 py-2 text-xs text-stardust/45">
              {image.caption}
            </figcaption>
          ) : null}
        </figure>
      ))}
    </div>
  );
}

function SafeImage({
  alt,
  className,
  fit,
  url,
}: {
  alt: string;
  className: string;
  fit: 'contain' | 'cover';
  url: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className={cn('flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(200,155,60,.17),transparent_28%),linear-gradient(145deg,rgba(27,58,99,.34),rgba(10,10,10,.88))]', className)}>
        <ImageOff className="text-stardust/24" size={22} />
      </div>
    );
  }
  return (
    <img
      alt={alt}
      className={cn(className, fit === 'contain' ? 'object-contain' : 'object-cover')}
      onError={() => setFailed(true)}
      src={url}
    />
  );
}
