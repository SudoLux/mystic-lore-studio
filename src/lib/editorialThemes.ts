import type { EditorialTheme } from '../types/editorial';

const baseTypography: EditorialTheme['typography'] = {
  bodyFont: 'Inter',
  bodyWeight: 400,
  displayFont: 'Cinzel Decorative',
  displayWeight: 700,
};

const themes: Record<string, EditorialTheme> = {
  'celestial-archive': createTheme('celestial-archive', 'Celestial Archive', {
    accent: '#73a5b4',
    background: '#071019',
    border: '#2d5c6b',
    mutedText: '#a9aaa6',
    surface: '#101d27',
    text: '#ede3cf',
  }),
  'midnight-atelier': createTheme('midnight-atelier', 'Midnight Atelier', {
    accent: '#c89b3c',
    background: '#050505',
    border: '#9a6c3c',
    mutedText: '#aaa297',
    surface: '#16120f',
    text: '#ede3cf',
  }),
  'stardust-paper': createTheme('stardust-paper', 'Stardust Paper', {
    accent: '#d9bd78',
    background: '#171411',
    border: '#9a6c3c',
    mutedText: '#b8ada0',
    surface: '#25201b',
    text: '#f4ead8',
  }),
};

export function resolveEditorialTheme(themeId: string) {
  return themes[themeId] ?? themes['midnight-atelier'];
}

function createTheme(
  id: string,
  name: string,
  colors: EditorialTheme['colors'],
): EditorialTheme {
  return {
    colors,
    createdAt: '',
    description: `${name} presentation theme`,
    id,
    name,
    settings: {},
    typography: baseTypography,
    updatedAt: '',
  };
}
