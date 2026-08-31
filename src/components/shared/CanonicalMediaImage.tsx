import { ImageIcon, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { CanonicalMediaAsset, CanonicalMediaDerivative } from '../../domains/workspace';
import {
  clearCanonicalMediaUrl,
  loadCachedCanonicalMediaBlob,
  resolveCanonicalMediaUrl,
} from '../../domains/persistence/canonicalMedia';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/classes';
import { createRequestBoundCanonicalSupabase } from '../../lib/supabase';
import type { LocalImageAsset } from '../../types/studio';
import type { CanonicalMaterialImageFraming } from '../../lib/canonicalMaterialPresentation';
import { AdaptiveProjectImage } from '../projects/AdaptiveProjectImage';
import { AtelierImageFrame } from './AtelierImageFrame';

type CanonicalMediaImageProps = {
  alt: string;
  asset: CanonicalMediaAsset | null;
  className?: string;
  derivatives?: CanonicalMediaDerivative[];
  fit?: 'cover' | 'contain';
  framing?: Partial<CanonicalMaterialImageFraming>;
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
  framing,
  mode = 'library',
  priority = false,
}: CanonicalMediaImageProps) {
  const { session } = useAuth();
  const [source, setSource] = useState<string | null>(null);
  const [status, setStatus] = useState<'empty' | 'loading' | 'ready' | 'error'>(asset ? 'loading' : 'empty');
  const [retryToken, setRetryToken] = useState(0);
  const delivery = useMemo(() => selectDelivery(asset, derivatives, mode), [asset, derivatives, mode]);
  const mediaClient = useMemo(
    () => createRequestBoundCanonicalSupabase(session?.access_token ?? ''),
    [session?.access_token],
  );

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
    void loadCachedCanonicalMediaBlob(delivery)
      .then((cached) => {
        if (!cached) return resolveCanonicalMediaUrl(delivery, mediaClient);
        objectUrl = URL.createObjectURL(cached);
        return objectUrl;
      })
      .catch((error) => {
        if (delivery.id === master.id) throw error;
        return resolveCanonicalMediaUrl(master, mediaClient);
      })
      .then((url) => {
        if (!active) return;
        if (!url) {
          setStatus('empty');
          return;
        }
        setSource(url);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [delivery, mediaClient, retryToken]);

  const retry = () => {
    if (delivery) clearCanonicalMediaUrl(delivery.storagePath);
    setStatus('loading');
    setRetryToken((value) => value + 1);
  };

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
          {status === 'error' ? <button className="mt-3 rounded-full border border-ember/45 px-3 py-1.5 text-xs text-stardust/76 transition hover:bg-ember/12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember" onClick={retry} type="button">Try image again</button> : null}
        </div>
      </AtelierImageFrame>
    );
  }

  const localAsset: LocalImageAsset = {
    height: delivery.height ?? asset.height ?? undefined,
    id: delivery.id,
    mimeType: delivery.mimeType,
    name: asset.name,
    objectFit: fit ?? framing?.objectFit ?? (mode === 'hero' && (asset.height ?? 0) > (asset.width ?? 0) ? 'contain' : 'cover'),
    objectPositionX: framing?.objectPositionX ?? 50,
    objectPositionY: framing?.objectPositionY ?? 50,
    remoteUrl: source,
    size: delivery.sizeBytes,
    updatedAt: asset.updatedAt,
    width: delivery.width ?? asset.width ?? undefined,
    zoom: framing?.zoom ?? 1,
  };

  return (
    <AdaptiveProjectImage
      alt={alt}
      asset={localAsset}
      className={cn('atelier-image-ready', className)}
      displayFit={fit}
      mode={mode === 'hero' ? 'primary' : mode === 'thumbnail' ? 'thumbnail' : 'compact'}
      onFinalError={() => setStatus('error')}
      priority={priority}
      refreshSource={() => resolveCanonicalMediaUrl(delivery, mediaClient, { force: true })}
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
