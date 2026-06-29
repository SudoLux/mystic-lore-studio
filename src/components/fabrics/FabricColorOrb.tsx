import type { CSSProperties } from 'react';
import { cn } from '../../lib/classes';
import { getFabricColorHex } from '../../lib/fabricMetadata';
import type { Fabric } from '../../types/studio';

type FabricColorOrbProps = {
  animated?: boolean;
  className?: string;
  fabric: Pick<Fabric, 'colorFamily' | 'primaryColor' | 'primaryColorHex'>;
  label?: string;
};

export function FabricColorOrb({
  animated = false,
  className,
  fabric,
  label,
}: FabricColorOrbProps) {
  const color = getFabricColorHex(fabric);

  return (
    <span
      aria-label={label}
      className={cn(
        'fabric-color-orb inline-flex shrink-0 rounded-full',
        animated && 'fabric-color-orb--animated',
        className,
      )}
      role={label ? 'img' : undefined}
      style={{ '--fabric-orb-color': color } as CSSProperties}
      title={label}
    />
  );
}
