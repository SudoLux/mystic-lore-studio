/** Plain JSON values keep editorial records safe for localStorage and backups. */
export type EditorialJsonValue =
  | boolean
  | null
  | number
  | string
  | EditorialJsonValue[]
  | { [key: string]: EditorialJsonValue };

export type EditorialJsonObject = {
  [key: string]: EditorialJsonValue;
};

export type EditorialTemplateType =
  | 'editorial-story'
  | 'technical-showcase'
  | 'development-story'
  | 'collection-lineup'
  | 'custom';

export type EditorialSceneType =
  | 'cover'
  | 'opening'
  | 'story'
  | 'look'
  | 'detail'
  | 'materials'
  | 'process'
  | 'technical'
  | 'credits'
  | 'custom';

export type EditorialNarrativeRole =
  | 'introduction'
  | 'context'
  | 'development'
  | 'highlight'
  | 'resolution'
  | 'closing'
  | 'supporting';

export type EditorialBlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'gallery'
  | 'quote'
  | 'specifications'
  | 'materials'
  | 'divider'
  | 'spacer'
  | 'credits'
  | 'custom';

export type EditorialTransitionType =
  | 'none'
  | 'fade'
  | 'crossfade'
  | 'slide'
  | 'reveal';

export interface EditorialTransition {
  type: EditorialTransitionType;
  durationMs?: number;
  direction?: 'up' | 'right' | 'down' | 'left';
  settings?: EditorialJsonObject;
}

export interface EditorialBackground {
  type: 'color' | 'gradient' | 'image' | 'transparent';
  value?: string;
  imageId?: string;
  imageUrl?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  settings?: EditorialJsonObject;
}

export interface EditorialBlock {
  id: string;
  sceneId: string;
  type: EditorialBlockType;
  order: number;
  content: EditorialJsonValue;
  settings: EditorialJsonObject;
}

export interface EditorialScene {
  id: string;
  collectionId: string;
  title: string;
  sceneType: EditorialSceneType;
  narrativeRole: EditorialNarrativeRole;
  order: number;
  blocks: EditorialBlock[];
  transition: EditorialTransition;
  background: EditorialBackground;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialCollection {
  id: string;
  projectId: string;
  title: string;
  subtitle: string;
  description: string;
  coverImageId?: string;
  coverImageUrl?: string;
  templateType: EditorialTemplateType;
  themeId: string;
  scenes: EditorialScene[];
  createdAt: string;
  updatedAt: string;
}

export interface EditorialTheme {
  id: string;
  name: string;
  description?: string;
  colors: {
    background: string;
    surface: string;
    text: string;
    mutedText: string;
    accent: string;
    border: string;
  };
  typography: {
    displayFont: string;
    bodyFont: string;
    displayWeight?: number;
    bodyWeight?: number;
  };
  settings: EditorialJsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface EditorialCollectionTemplate {
  id: string;
  name: string;
  description: string;
  templateType: EditorialTemplateType;
  defaultThemeId?: string;
  sceneTypes: EditorialSceneType[];
  settings: EditorialJsonObject;
  createdAt: string;
  updatedAt: string;
}
