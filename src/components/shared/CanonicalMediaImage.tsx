import { ImageIcon, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CanonicalMediaAsset, CanonicalMediaDerivative } from '../../domains/workspace';
import { loadCanonicalStoredBlob } from '../../domains/persistence/canonicalMedia';
import { cn } from '../../lib/classes';
import type { LocalImageAsset } from '../../types/studio';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { AtelierImageFrame } from './AtelierImageFrame';

type CanonicalMediaImageProps = {
  alt: string;
  asset: CanonicalMediaAsset | null;
  className?: string;
  derivatives?: CanonicalMediaDerivative[];
  fit?: 'cover' | 'contain';
  mode?: 'hero' | 'library' | 'thumbnail';
  priority?: boolean;
};

/**
 * Adapts canonical Storage bytes to the proven V1 responsive image renderer.
 * No legacy path or browser-local project record is introduced.
 */
export function CanonicalMediaImage({
  alt,
  asset,
  className,
  derivatives = [],
  fit,
  mode = 'library',
  priority = false,
}: CanonicalMediaImageProps) {
  const [source, setSource] = useState<string | null>(null);
  const [status, setStatus] = useState<'empty' | 'loading' | 'ready' | 'error'>(asset ? 'loading' : 'empty');
  const delivery = useMemo(() => selectDelivery(asset, derivatives, mode), [asset, derivatives, mode]);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    const master = asset;
    if (!delivery || !master) {
      setSource(null);
      setStatus('empty');
      return;
    }
    setSource(null);
    setStatus('loading');
    void loadCanonicalStoredBlob(delivery)
      .catch((error) => {
        if (delivery.id === master.id) throw error;
        return loadCanonicalStoredBlob(master);
      })
      .then((blob) => {
        if (!active) return;
        if (!blob) {
          setStatus('empty');
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [delivery]);

  if (!asset || !delivery || !source || status !== 'ready') {
    return (
      <AtelierImageFrame
        aria-label={status === 'error' ? `${alt} image unavailable` : `${alt} image placeholder`}
        className={cn('atelier-image-pending flex items-center justify-center', className)}
        emphasis={mode}
        role="img"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(200,155,60,0.15),transparent_30%),linear-gradient(145deg,rgba(27,58,99,0.36),rgba(10,10,10,0.84),rgba(61,43,31,0.38))]" />
        <div className="relative flex max-w-[14rem] flex-col items-center px-5 text-center text-stardust/42">
          {status === 'loading' ? <LoaderCircle aria-hidden="true" className="animate-spin text-ember/70" size={24} /> : <ImageIcon aria-hidden="true" className="text-ember/55" size={28} />}
          <span className="mt-3 text-[0.68rem] font-medium uppercase tracking-[0.2em]">{status === 'error' ? 'Image unavailable' : status === 'loading' ? 'Preparing image' : 'Awaiting garment imagery'}</span>
        </div>
      </AtelierImageFrame>
    );
  }

  const localAsset: LocalImageAsset = {
    height: delivery.height ?? asset.height ?? undefined,
    id: delivery.id,
    mimeType: delivery.mimeType,
    name: asset.name,
    objectFit: fit ?? (mode === 'hero' && (asset.height ?? 0) > (asset.width ?? 0) ? 'contain' : 'cover'),
    remoteUrl: source,
    size: delivery.sizeBytes,
    updatedAt: asset.updatedAt,
    width: delivery.width ?? asset.width ?? undefined,
  };

  return (
    <AdaptiveProjectImage
      alt={alt}
      asset={localAsset}
      className={cn('atelier-image-ready', className)}
      displayFit={fit}
      mode={mode === 'hero' ? 'primary' : mode === 'thumbnail' ? 'thumbnail' : 'compact'}
      priority={priority}
    />
  );
}

function selectDelivery(
  asset: CanonicalMediaAsset | null,
  derivatives: CanonicalMediaDerivative[],
  mode: CanonicalMediaImageProps['mode'],
) {
  if (!asset) return null;
  const preferred = mode === 'thumbnail' ? ['thumbnail', 'display'] : mode === 'library' ? ['display', 'thumbnail'] : ['display'];
  const derivative = preferred
    .map((variant) => derivatives.find((item) => item.assetId === asset.id && item.variant === variant))
    .find(Boolean);
  return derivative ?? asset;
}
