import type {
  EditorialCollection,
  EditorialPlaybackSettings,
  EditorialSceneDurationMs,
} from '../types/editorial';

export const editorialSceneDurations: EditorialSceneDurationMs[] = [5000, 8000, 12000];

export function normalizeEditorialPlayback(
  collection?: Pick<EditorialCollection, 'autoPlay' | 'sceneDurationMs'>,
): EditorialPlaybackSettings {
  const duration = editorialSceneDurations.includes(collection?.sceneDurationMs as EditorialSceneDurationMs)
    ? collection?.sceneDurationMs as EditorialSceneDurationMs
    : 8000;
  return {
    autoPlay: collection?.autoPlay === true,
    sceneDurationMs: duration,
  };
}
