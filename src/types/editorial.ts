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
  | 'fashion-editorial'
  | 'collection-lookbook'
  | 'design-journey'
  | 'technical-presentation'
  | 'campaign'
  | 'client-presentation'
  | 'blank-collection'
  // Legacy values remain readable for existing local backups.
  | 'editorial-story'
  | 'technical-showcase'
  | 'development-story'
  | 'collection-lineup'
  | 'custom';

export type EditorialSceneType =
  | 'cover'
  | 'opening'
  | 'story'
  | 'gallery'
  | 'fabric-story'
  | 'construction'
  | 'closing'
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
  | 'paragraph'
  | 'text'
  | 'image'
  | 'gallery'
  | 'quote'
  | 'fabricSwatch'
  | 'measurementTable'
  | 'callout'
  | 'specifications'
  | 'materials'
  | 'divider'
  | 'spacer'
  | 'credits'
  | 'custom';

export type EditorialHeadingContent = {
  align?: 'left' | 'center' | 'right';
  eyebrow?: string;
  level?: 1 | 2 | 3;
  text: string;
};

export type EditorialParagraphContent = {
  align?: 'left' | 'center' | 'right';
  text: string;
};

export type EditorialQuoteContent = {
  attribution?: string;
  text: string;
};

export type EditorialImageContent = {
  alt?: string;
  caption?: string;
  fit?: 'cover' | 'contain';
  url: string;
};

export type EditorialGalleryImage = EditorialImageContent & {
  id?: string;
};

export type EditorialGalleryContent = {
  columns?: 1 | 2 | 3;
  images: EditorialGalleryImage[];
};

export type EditorialDividerContent = {
  label?: string;
  style?: 'solid' | 'gradient' | 'dotted';
};

export type EditorialSpacerContent = {
  size?: 'small' | 'medium' | 'large';
};

export type EditorialFabricSwatchContent = {
  colorHex?: string;
  composition?: string;
  name: string;
  notes?: string;
};

export type EditorialMeasurementRow = {
  label: string;
  values: string[];
};

export type EditorialMeasurementTableContent = {
  columns: string[];
  rows: EditorialMeasurementRow[];
  title?: string;
};

export type EditorialCalloutContent = {
  body: string;
  title?: string;
  tone?: 'note' | 'highlight' | 'warning';
};

export type EditorialBlockContentMap = {
  callout: EditorialCalloutContent;
  divider: EditorialDividerContent;
  fabricSwatch: EditorialFabricSwatchContent;
  gallery: EditorialGalleryContent;
  heading: EditorialHeadingContent;
  image: EditorialImageContent;
  measurementTable: EditorialMeasurementTableContent;
  paragraph: EditorialParagraphContent;
  quote: EditorialQuoteContent;
  spacer: EditorialSpacerContent;
};

export type TypedEditorialBlock<T extends keyof EditorialBlockContentMap> =
  Omit<EditorialBlock, 'content' | 'type'> & {
    content: EditorialBlockContentMap[T];
    type: T;
  };

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
  content: EditorialJsonValue | EditorialBlockContentMap[keyof EditorialBlockContentMap];
  settings: EditorialJsonObject;
}

export interface EditorialScene {
  id: string;
  collectionId: string;
  title: string;
  subtitle?: string;
  description?: string;
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
