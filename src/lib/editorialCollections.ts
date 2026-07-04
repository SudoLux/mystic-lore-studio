import type {
  EditorialCollection,
  EditorialNarrativeRole,
  EditorialScene,
  EditorialSceneType,
  EditorialTemplateType,
} from '../types/editorial';

export const editorialTemplateOptions: Array<{
  description: string;
  label: string;
  value: EditorialTemplateType;
}> = [
  {
    description: 'A campaign-led garment story with detail and credits scenes.',
    label: 'Editorial Story',
    value: 'editorial-story',
  },
  {
    description: 'A precise presentation of materials, construction, and finish.',
    label: 'Technical Showcase',
    value: 'technical-showcase',
  },
  {
    description: 'A visual record from first concept through final garment.',
    label: 'Development Story',
    value: 'development-story',
  },
  {
    description: 'A sequence built for multiple looks and collection rhythm.',
    label: 'Collection Lineup',
    value: 'collection-lineup',
  },
  {
    description: 'A minimal cover ready for a scene structure of your own.',
    label: 'Custom',
    value: 'custom',
  },
];

export const editorialThemeOptions = [
  { label: 'Midnight Atelier', value: 'midnight-atelier' },
  { label: 'Celestial Archive', value: 'celestial-archive' },
  { label: 'Stardust Paper', value: 'stardust-paper' },
] as const;

const sceneBlueprints: Record<
  EditorialTemplateType,
  Array<[string, EditorialSceneType, EditorialNarrativeRole]>
> = {
  'collection-lineup': [
    ['Cover', 'cover', 'introduction'],
    ['The Lineup', 'look', 'context'],
    ['Signature Looks', 'look', 'highlight'],
    ['Detail Study', 'detail', 'development'],
    ['Credits', 'credits', 'closing'],
  ],
  custom: [['Cover', 'cover', 'introduction']],
  'development-story': [
    ['Cover', 'cover', 'introduction'],
    ['Concept', 'opening', 'context'],
    ['Development', 'process', 'development'],
    ['Fitting', 'process', 'highlight'],
    ['Final Garment', 'look', 'resolution'],
    ['Credits', 'credits', 'closing'],
  ],
  'editorial-story': [
    ['Cover', 'cover', 'introduction'],
    ['Garment Story', 'story', 'context'],
    ['Detail Study', 'detail', 'highlight'],
    ['Credits', 'credits', 'closing'],
  ],
  'technical-showcase': [
    ['Cover', 'cover', 'introduction'],
    ['Technical Overview', 'technical', 'context'],
    ['Materials', 'materials', 'development'],
    ['Construction Details', 'detail', 'highlight'],
    ['Credits', 'credits', 'closing'],
  ],
};

export function editorialTemplateLabel(templateType: EditorialTemplateType) {
  return editorialTemplateOptions.find((option) => option.value === templateType)?.label
    ?? 'Custom';
}

export function createEditorialScenes(
  collectionId: string,
  templateType: EditorialTemplateType,
  timestamp = new Date().toISOString(),
): EditorialScene[] {
  return sceneBlueprints[templateType].map(([title, sceneType, narrativeRole], order) => ({
    background: {
      type: order === 0 ? 'gradient' : 'color',
      value: order === 0 ? 'mystic-editorial' : '#0A0A0A',
    },
    blocks: [],
    collectionId,
    createdAt: timestamp,
    id: `editorial-scene-${crypto.randomUUID()}`,
    narrativeRole,
    order,
    sceneType,
    title,
    transition: { durationMs: 600, type: order === 0 ? 'none' : 'fade' },
    updatedAt: timestamp,
  }));
}

export function duplicateEditorialCollection(
  collection: EditorialCollection,
): EditorialCollection {
  const timestamp = new Date().toISOString();
  const collectionId = `editorial-collection-${crypto.randomUUID()}`;

  return {
    ...collection,
    createdAt: timestamp,
    id: collectionId,
    scenes: collection.scenes.map((scene) => {
      const sceneId = `editorial-scene-${crypto.randomUUID()}`;
      return {
        ...scene,
        blocks: scene.blocks.map((block) => ({
          ...block,
          id: `editorial-block-${crypto.randomUUID()}`,
          sceneId,
        })),
        collectionId,
        createdAt: timestamp,
        id: sceneId,
        updatedAt: timestamp,
      };
    }),
    subtitle: collection.subtitle,
    title: `${collection.title} Copy`,
    updatedAt: timestamp,
  };
}
