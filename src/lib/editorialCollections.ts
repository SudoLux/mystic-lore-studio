import type {
  EditorialBlock,
  EditorialCollection,
  EditorialScene,
  EditorialSceneType,
  EditorialTemplateType,
} from '../types/editorial';
import { editorialTemplateBlueprints } from '../data/editorialTemplates';

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

export function editorialTemplateLabel(templateType: EditorialTemplateType) {
  return editorialTemplateOptions.find((option) => option.value === normalizeEditorialTemplateType(templateType))?.label
    ?? 'Blank Collection';
}

export function editorialTemplateStructure(templateType: EditorialTemplateType) {
  const normalizedTemplate = normalizeEditorialTemplateType(templateType);
  const scenes = editorialTemplateBlueprints[
    normalizedTemplate as keyof typeof editorialTemplateBlueprints
  ] ?? editorialTemplateBlueprints['blank-collection'];
  return {
    blockCount: scenes.reduce((total, sceneBlueprint) => total + sceneBlueprint.blocks.length, 0),
    sceneCount: scenes.length,
  };
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
  const normalizedTemplate = normalizeEditorialTemplateType(templateType);
  const blueprints = editorialTemplateBlueprints[
    normalizedTemplate as keyof typeof editorialTemplateBlueprints
  ] ?? editorialTemplateBlueprints['blank-collection'];

  return blueprints.map((blueprint, order) => {
    const sceneId = `editorial-scene-${crypto.randomUUID()}`;
    return {
      background: {
        type: order === 0 ? 'gradient' : 'color',
        value: order === 0 ? 'mystic-editorial' : '#0A0A0A',
      },
      blocks: blueprint.blocks.map((block, blockOrder): EditorialBlock => ({
        content: structuredClone(block.content),
        id: `editorial-block-${crypto.randomUUID()}`,
        order: blockOrder,
        sceneId,
        settings: block.settings ? structuredClone(block.settings) : {},
        type: block.type,
      })),
      collectionId,
      createdAt: timestamp,
      description: blueprint.description ?? '',
      id: sceneId,
      narrativeRole: blueprint.narrativeRole,
      order,
      sceneType: blueprint.sceneType,
      subtitle: blueprint.subtitle ?? '',
      title: blueprint.title,
      transition: { durationMs: 600, type: order === 0 ? 'none' : 'fade' },
      updatedAt: timestamp,
    };
  });
}

export const editorialSceneTypeOptions: Array<{
  description: string;
  label: string;
  value: EditorialSceneType;
}> = [
  { description: 'A cinematic opening title and campaign image.', label: 'Cover', value: 'cover' },
  { description: 'Narrative copy, inspiration, and design direction.', label: 'Story', value: 'story' },
  { description: 'A visual sequence drawn from project photography.', label: 'Gallery', value: 'gallery' },
  { description: 'Textile choices, color, and material character.', label: 'Fabric Story', value: 'fabric-story' },
  { description: 'Pattern, sewing, fitting, and process milestones.', label: 'Construction', value: 'construction' },
  { description: 'Measurements, specifications, and project signals.', label: 'Technical', value: 'technical' },
  { description: 'A final reflection, credit, or campaign sign-off.', label: 'Closing', value: 'closing' },
];

export function editorialSceneTypeLabel(sceneType: EditorialSceneType) {
  return editorialSceneTypeOptions.find((option) => option.value === sceneType)?.label
    ?? sceneType.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function createEditorialScene(
  collectionId: string,
  order: number,
  sceneType: EditorialSceneType = 'story',
  timestamp = new Date().toISOString(),
): EditorialScene {
  return {
    background: { type: 'color', value: '#0A0A0A' },
    blocks: [],
    collectionId,
    createdAt: timestamp,
    description: '',
    id: `editorial-scene-${crypto.randomUUID()}`,
    narrativeRole: 'supporting',
    order,
    sceneType,
    subtitle: '',
    title: editorialSceneTypeLabel(sceneType),
    transition: { durationMs: 600, type: 'fade' },
    updatedAt: timestamp,
  };
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
