export function getEditorialDisplayLabel(value: string) {
  if (value === 'Lookbook Ready') return 'Editorial Ready';
  if (value === 'Lookbook') return 'Editorial Collection';
  if (value === 'Lookbooks') return 'Editorial Collections';
  return value;
}
