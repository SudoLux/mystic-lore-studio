import { ImageSlot } from './ImageSlot';
import type { LocalImageAsset } from '../../types/studio';

type LocalImageUploaderProps = {
  compact?: boolean;
  description?: string;
  label: string;
  onRemove: () => void;
  onSave: (image: LocalImageAsset) => void;
  value?: LocalImageAsset;
};

export function LocalImageUploader({
  compact,
  description,
  label,
  onRemove,
  onSave,
  value,
}: LocalImageUploaderProps) {
  return (
    <ImageSlot
      aspectClassName={compact ? 'aspect-[16/9]' : 'aspect-[5/3]'}
      className={compact ? 'rounded-2xl' : 'rounded-3xl'}
      compact={compact}
      label={label}
      onRemove={onRemove}
      onSave={onSave}
      placeholderText={description ?? 'Add an image directly to this slot.'}
      value={value}
    />
  );
}
