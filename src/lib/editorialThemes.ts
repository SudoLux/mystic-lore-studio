import type { EditorialTheme } from '../types/editorial';

export type BuiltInEditorialThemeId =
  | 'atelier-paper'
  | 'campaign-glow'
  | 'midnight-editorial'
  | 'stardust-minimal';

export const editorialThemes: Record<BuiltInEditorialThemeId, EditorialTheme> = {
  'midnight-editorial': createTheme({
    backgroundTreatment: {
      backgroundImage: 'radial-gradient(circle at 24% 20%, rgba(200,155,60,.20), transparent 30%), radial-gradient(circle at 78% 72%, rgba(27,58,99,.48), transparent 35%), linear-gradient(145deg,#11100e,#050505 62%,#0c1d22)',
      coverScrim: 'linear-gradient(180deg,rgba(5,5,5,.12),rgba(5,5,5,.04) 35%,rgba(5,5,5,.92) 100%)',
      gridColor: 'rgba(237,227,207,.08)',
    },
    cardTreatment: { backdropBlur: '18px', background: 'rgba(14,13,12,.68)', border: 'rgba(154,108,60,.32)', borderRadius: '0.75rem', shadow: '0 22px 60px rgba(0,0,0,.34)' },
    colors: { accent: '#c89b3c', background: '#050505', border: '#9a6c3c', mutedText: '#aaa297', surface: '#16120f', text: '#ede3cf' },
    description: 'Cinematic black, ivory, and gold with atelier depth.',
    id: 'midnight-editorial',
    name: 'Midnight Editorial',
    sceneSpacing: { block: 'clamp(6.5rem, 12vh, 9rem)', contentGap: '1.5rem', inline: 'clamp(1.25rem, 7vw, 7rem)', maxWidth: '80rem' },
    transitionStyle: { durationMs: 520, easing: 'cubic-bezier(.22,1,.36,1)', type: 'crossfade' },
    typography: { bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif', bodyWeight: 400, displayFont: '"Cinzel Decorative", Georgia, serif', displayWeight: 700 },
  }),
  'stardust-minimal': createTheme({
    backgroundTreatment: {
      backgroundImage: 'radial-gradient(circle at 80% 12%, rgba(237,227,207,.10), transparent 30%), linear-gradient(150deg,#191a1b,#0d0e0f 68%,#141414)',
      coverScrim: 'linear-gradient(180deg,rgba(13,14,15,.10),rgba(13,14,15,.08) 42%,rgba(13,14,15,.88) 100%)',
      gridColor: 'rgba(237,227,207,.055)',
    },
    cardTreatment: { backdropBlur: '8px', background: 'rgba(237,227,207,.035)', border: 'rgba(237,227,207,.16)', borderRadius: '0.35rem', shadow: '0 14px 42px rgba(0,0,0,.20)' },
    colors: { accent: '#d9cda9', background: '#0d0e0f', border: '#67645d', mutedText: '#a6a39c', surface: '#191a1b', text: '#f3eee3' },
    description: 'Quiet charcoal, ivory, and generous gallery-like space.',
    id: 'stardust-minimal',
    name: 'Stardust Minimal',
    sceneSpacing: { block: 'clamp(7.5rem, 14vh, 10rem)', contentGap: '2rem', inline: 'clamp(1.5rem, 9vw, 9rem)', maxWidth: '76rem' },
    transitionStyle: { durationMs: 420, easing: 'ease-out', type: 'fade' },
    typography: { bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif', bodyWeight: 400, displayFont: 'Inter, ui-sans-serif, system-ui, sans-serif', displayWeight: 700 },
  }),
  'atelier-paper': createTheme({
    backgroundTreatment: {
      backgroundImage: 'radial-gradient(circle at 16% 12%, rgba(255,255,255,.72), transparent 28%), linear-gradient(145deg,#f2e8d4,#e5d5ba 62%,#d7c19e)',
      coverScrim: 'linear-gradient(180deg,rgba(244,234,216,.08),rgba(244,234,216,.15) 38%,rgba(229,213,186,.94) 100%)',
      gridColor: 'rgba(61,43,31,.09)',
    },
    cardTreatment: { backdropBlur: '2px', background: 'rgba(255,250,239,.70)', border: 'rgba(122,84,47,.30)', borderRadius: '0.25rem', shadow: '0 16px 38px rgba(61,43,31,.14)' },
    colors: { accent: '#8b5e2f', background: '#e9dcc4', border: '#9a6c3c', mutedText: '#766a5c', surface: '#f6eddd', text: '#3d2b1f' },
    description: 'Warm paper, espresso type, and fine bronze rules.',
    id: 'atelier-paper',
    name: 'Atelier Paper',
    sceneSpacing: { block: 'clamp(5.8rem, 10vh, 7.5rem)', contentGap: '1.25rem', inline: 'clamp(1.25rem, 6vw, 6.5rem)', maxWidth: '74rem' },
    transitionStyle: { durationMs: 480, easing: 'cubic-bezier(.25,.8,.25,1)', type: 'slide' },
    typography: { bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif', bodyWeight: 400, displayFont: 'Georgia, "Times New Roman", serif', displayWeight: 700 },
  }),
  'campaign-glow': createTheme({
    backgroundTreatment: {
      backgroundImage: 'radial-gradient(circle at 76% 22%, rgba(45,92,107,.78), transparent 31%), radial-gradient(circle at 20% 78%, rgba(200,155,60,.34), transparent 35%), linear-gradient(145deg,#0a1b2c,#05080d 62%,#24120d)',
      coverScrim: 'linear-gradient(180deg,rgba(4,10,16,.08),rgba(4,10,16,.02) 36%,rgba(4,10,16,.90) 100%)',
      gridColor: 'rgba(115,198,209,.10)',
    },
    cardTreatment: { backdropBlur: '24px', background: 'rgba(8,24,35,.58)', border: 'rgba(91,184,196,.34)', borderRadius: '1rem', shadow: '0 24px 70px rgba(0,0,0,.42), 0 0 34px rgba(45,92,107,.20)' },
    colors: { accent: '#e4b84e', background: '#06111d', border: '#2d7583', mutedText: '#9bb3ba', surface: '#0d2633', text: '#eef3ed' },
    description: 'Celestial blue, teal glass, and a luminous campaign pulse.',
    id: 'campaign-glow',
    name: 'Campaign Glow',
    sceneSpacing: { block: 'clamp(6.5rem, 12vh, 8.5rem)', contentGap: '1.75rem', inline: 'clamp(1.25rem, 7vw, 7rem)', maxWidth: '84rem' },
    transitionStyle: { durationMs: 560, easing: 'cubic-bezier(.16,1,.3,1)', type: 'reveal' },
    typography: { bodyFont: 'Inter, ui-sans-serif, system-ui, sans-serif', bodyWeight: 400, displayFont: 'Inter, ui-sans-serif, system-ui, sans-serif', displayWeight: 700 },
  }),
};

export const editorialThemeOptions = Object.values(editorialThemes).map((theme) => ({
  accent: theme.colors.accent,
  background: theme.colors.background,
  description: theme.description ?? '',
  label: theme.name,
  spacing: theme.id === 'atelier-paper' ? 'Compact' : theme.id === 'stardust-minimal' ? 'Expansive' : 'Balanced',
  text: theme.colors.text,
  transition: theme.transitionStyle.type,
  value: theme.id as BuiltInEditorialThemeId,
}));

const legacyThemeAliases: Record<string, BuiltInEditorialThemeId> = {
  'celestial-archive': 'campaign-glow',
  'midnight-atelier': 'midnight-editorial',
  'stardust-paper': 'atelier-paper',
};

export function normalizeEditorialThemeId(themeId?: string): BuiltInEditorialThemeId {
  if (themeId && themeId in editorialThemes) return themeId as BuiltInEditorialThemeId;
  return legacyThemeAliases[themeId ?? ''] ?? 'midnight-editorial';
}

export function resolveEditorialTheme(themeId?: string) {
  return editorialThemes[normalizeEditorialThemeId(themeId)];
}

function createTheme(
  theme: Omit<EditorialTheme, 'createdAt' | 'settings' | 'updatedAt'>,
): EditorialTheme {
  return { ...theme, createdAt: '', settings: {}, updatedAt: '' };
}
