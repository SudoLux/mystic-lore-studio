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
    description: 'A cinematic garment story balancing atmosphere, process, and final imagery.',
    label: 'Fashion Editorial',
    value: 'fashion-editorial',
  },
  {
    description: 'A polished lineup designed to present a complete collection and its key looks.',
    label: 'Collection Lookbook',
    value: 'collection-lookbook',
  },
  {
    description: 'A process-led narrative from concept and research through the final garment.',
    label: 'Design Journey',
    value: 'design-journey',
  },
  {
    description: 'A precise presentation of materials, construction, specifications, and fit.',
    label: 'Technical Presentation',
    value: 'technical-presentation',
  },
  {
    description: 'A campaign-ready sequence for art direction, hero imagery, looks, and credits.',
    label: 'Campaign',
    value: 'campaign',
  },
  {
    description: 'A clear client-facing narrative for direction, materials, timeline, and approval.',
    label: 'Client Presentation',
    value: 'client-presentation',
  },
  {
    description: 'A clean cover and open structure ready for scenes of your own.',
    label: 'Blank Collection',
    value: 'blank-collection',
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
  'blank-collection': [['Cover', 'cover', 'introduction']],
  campaign: [
    ['Cover', 'cover', 'introduction'],
    ['Campaign Direction', 'opening', 'context'],
    ['Hero Story', 'gallery', 'development'],
    ['Look One', 'gallery', 'highlight'],
    ['Look Two', 'gallery', 'highlight'],
    ['Detail Frames', 'gallery', 'resolution'],
    ['Credits', 'closing', 'closing'],
  ],
  'client-presentation': [
    ['Cover', 'cover', 'introduction'],
    ['Project Brief', 'opening', 'context'],
    ['Design Direction', 'story', 'development'],
    ['Materials', 'fabric-story', 'supporting'],
    ['Proposed Looks', 'gallery', 'highlight'],
    ['Timeline & Deliverables', 'technical', 'resolution'],
    ['Approval', 'closing', 'closing'],
  ],
  'collection-lookbook': [
    ['Cover', 'cover', 'introduction'],
    ['Collection Statement', 'story', 'context'],
    ['The Lineup', 'gallery', 'development'],
    ['Key Looks', 'gallery', 'highlight'],
    ['Detail Study', 'gallery', 'resolution'],
    ['Styling Notes', 'story', 'supporting'],
    ['Credits', 'closing', 'closing'],
  ],
  'collection-lineup': [
    ['Cover', 'cover', 'introduction'],
    ['The Lineup', 'look', 'context'],
    ['Signature Looks', 'look', 'highlight'],
    ['Detail Study', 'detail', 'development'],
    ['Credits', 'credits', 'closing'],
  ],
  custom: [['Cover', 'cover', 'introduction']],
  'design-journey': [
    ['Cover', 'cover', 'introduction'],
    ['Concept', 'opening', 'context'],
    ['Research', 'story', 'development'],
    ['Materials', 'fabric-story', 'supporting'],
    ['Development', 'construction', 'development'],
    ['Fitting', 'construction', 'highlight'],
    ['Final Garment', 'gallery', 'resolution'],
    ['Reflection', 'closing', 'closing'],
  ],
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
  'fashion-editorial': [
    ['Cover', 'cover', 'introduction'],
    ['Inspiration', 'opening', 'context'],
    ['Materials', 'fabric-story', 'supporting'],
    ['Construction', 'construction', 'development'],
    ['Final Editorial', 'gallery', 'highlight'],
    ['Details', 'gallery', 'resolution'],
    ['Reflection', 'closing', 'closing'],
  ],
  'technical-presentation': [
    ['Cover', 'cover', 'introduction'],
    ['Design Overview', 'technical', 'context'],
    ['Materials', 'fabric-story', 'supporting'],
    ['Pattern & Construction', 'construction', 'development'],
    ['Specifications', 'technical', 'highlight'],
    ['Fit Notes', 'technical', 'resolution'],
    ['Final Build', 'closing', 'closing'],
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
  return editorialTemplateOptions.find((option) => option.value === normalizeEditorialTemplateType(templateType))?.label
    ?? 'Blank Collection';
}

export function normalizeEditorialTemplateType(
  templateType?: EditorialTemplateType,
): EditorialTemplateType {
  const legacyMap: Partial<Record<EditorialTemplateType, EditorialTemplateType>> = {
    'collection-lineup': 'collection-lookbook',
    custom: 'blank-collection',
    'development-story': 'design-journey',
    'editorial-story': 'fashion-editorial',
    'technical-showcase': 'technical-presentation',
  };

  return legacyMap[templateType ?? 'fashion-editorial']
    ?? templateType
    ?? 'fashion-editorial';
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
