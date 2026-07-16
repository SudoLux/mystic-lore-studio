import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '../../lib/classes';
import {
  getImageDisplay,
  type ImageDisplaySettings,
} from '../../lib/imageAssets';
import { refreshSignedImageUrl } from '../../lib/supabaseStudio';
import { getImageBlob } from '../../lib/imageBlobStore';
import type { LocalImageAsset } from '../../types/studio';

export type ImageDeliveryQuality = 'thumbnail' | 'display' | 'master';

type StoredImageProps = {
  alt?: string;
  asset: LocalImageAsset;
  className?: string;
  decorative?: boolean;
  displayOverride?: Partial<ImageDisplaySettings>;
  priority?: boolean;
  quality?: ImageDeliveryQuality;
  sizes?: string;
};

export function StoredImage({
  alt,
  asset,
  className,
  decorative = false,
  displayOverride,
  priority = false,
  quality = 'display',
  sizes,
}: StoredImageProps) {
  const [hasError, setHasError] = useState(false);
  const [responsiveFailed, setResponsiveFailed] = useState(false);
  const delivery = getDeliverySource(asset, quality);
  const [source, setSource] = useState(delivery.source);
  const refreshAttempted = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  const display = { ...getImageDisplay(asset), ...displayOverride };
  const responsiveSources = !responsiveFailed && source?.startsWith('http')
    ? buildResponsiveSources(asset)
    : undefined;

  useEffect(() => {
    let active = true;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setSource(delivery.source);
    setHasError(false);
    setResponsiveFailed(false);
    refreshAttempted.current = false;

    if (delivery.blobKey) {
      void getImageBlob(delivery.blobKey).then((blob) => {
        if (!active || !blob) return;
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setSource(objectUrl);
      }).catch(() => undefined);
    }

    return () => {
      active = false;
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, [delivery.blobKey, delivery.source]);

  if (hasError || !source) {
    return null;
  }

  return (
    <img
      alt={decorative ? '' : (alt ?? asset.name)}
      aria-hidden={decorative || undefined}
      className={cn(
        'h-full w-full object-cover [transform:scale(var(--image-zoom))]',
        className,
      )}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      key={source}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => {
        setResponsiveFailed(true);
        if (
          delivery.storagePath &&
          source !== asset.dataUrl &&
          !refreshAttempted.current
        ) {
          refreshAttempted.current = true;
          void refreshSignedImageUrl(delivery.storagePath, { force: true })
            .then((url) => {
              setSource(url);
              setHasError(false);
            })
            .catch(() => {
              if (delivery.fallback) setSource(delivery.fallback);
              else setHasError(true);
            });
          return;
        }
        setHasError(true);
      }}
      sizes={sizes ?? defaultImageSizes(quality)}
      src={source}
      srcSet={responsiveSources}
      style={
        {
          '--image-zoom': display.zoom,
          objectFit: display.objectFit,
          objectPosition: `${display.objectPositionX}% ${display.objectPositionY}%`,
          transformOrigin: `${display.objectPositionX}% ${display.objectPositionY}%`,
        } as CSSProperties
      }
    />
  );
}

function buildResponsiveSources(asset: LocalImageAsset) {
  const sources = [
    asset.thumbnailRemoteUrl
      ? `${asset.thumbnailRemoteUrl} 480w`
      : undefined,
    asset.displayRemoteUrl
      ? `${asset.displayRemoteUrl} ${asset.displayWidth ?? 1280}w`
      : undefined,
    asset.remoteUrl
      ? `${asset.remoteUrl} ${asset.width ?? 2400}w`
      : undefined,
  ].filter((source): source is string => Boolean(source));
  return sources.length > 1 ? sources.join(', ') : undefined;
}

function defaultImageSizes(quality: ImageDeliveryQuality) {
  if (quality === 'thumbnail') return '160px';
  if (quality === 'display') return '(max-width: 768px) 100vw, 50vw';
  return '100vw';
}

function getDeliverySource(
  asset: LocalImageAsset,
  quality: ImageDeliveryQuality,
) {
  if (quality === 'thumbnail') {
    const source =
      asset.dataUrl ??
      asset.thumbnailRemoteUrl ??
      asset.displayRemoteUrl ??
      asset.remoteUrl;
    return {
      blobKey: asset.dataUrl ? undefined : asset.previewBlobKey,
      fallback: asset.displayRemoteUrl ?? asset.remoteUrl,
      source,
      storagePath: asset.dataUrl
        ? undefined
        : asset.thumbnailRemoteUrl
        ? asset.thumbnailStoragePath
        : asset.displayRemoteUrl
          ? asset.displayStoragePath
          : asset.storagePath,
    };
  }

  if (quality === 'master') {
    return {
      blobKey: asset.remoteUrl ? undefined : asset.blobKey,
      fallback: asset.displayRemoteUrl ?? asset.dataUrl,
      source: asset.remoteUrl ?? asset.displayRemoteUrl ?? asset.dataUrl,
      storagePath: asset.remoteUrl
        ? asset.storagePath
        : asset.displayRemoteUrl
          ? asset.displayStoragePath
          : undefined,
    };
  }

  return {
    blobKey: asset.displayRemoteUrl ? undefined : asset.displayBlobKey,
    fallback: asset.displayRemoteUrl
      ? asset.remoteUrl ?? asset.dataUrl
      : asset.dataUrl,
    source: asset.displayRemoteUrl ?? asset.remoteUrl ?? asset.dataUrl,
    storagePath: asset.displayRemoteUrl
      ? asset.displayStoragePath
      : asset.remoteUrl
        ? asset.storagePath
        : undefined,
  };
}
