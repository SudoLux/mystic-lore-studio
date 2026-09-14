import type { StudioData, StoredProject } from '../../lib/studioStorage';
import type { StudioTask } from '../../types/studio';
import type {
  CanonicalMigrationPlan,
  CanonicalMigrationTable,
  CanonicalRowsByTable,
} from './contracts';
import {
  canonicalGarmentPhase,
  canonicalGarmentStatus,
  canonicalTaskPriority,
  canonicalTaskStatus,
  legacyGarmentPhase,
  legacyGarmentStatus,
  legacyTaskPriority,
  legacyTaskStatus,
} from './domainValueMaps';

/**
 * Presents canonical records through the current StudioData vocabulary while
 * legacy-only domains remain readable from the retained aggregate. No route is
 * switched by this adapter; WP3+ can opt into it domain by domain.
 */
export function materializeLegacyReadThrough(
  plan: CanonicalMigrationPlan,
  legacyFallback: StudioData = plan.retention.effectiveData,
) {
  const data = structuredClone(legacyFallback);
  const fallbackProjects = new Map(data.projects.map((project) => [project.id, project]));

  for (const garment of rows(plan, 'garments')) {
    const legacyId = legacyIdFor(plan, 'project', garment.id) ?? garment.id;
    const project = fallbackProjects.get(legacyId);
    if (!project) {
      data.projects.push(createLegacyProject(legacyId, garment));
      continue;
    }

    const next = { ...project };
    if (garment.title !== project.name) next.name = garment.title;
    if (garment.garment_type !== project.garmentType) {
      next.garmentType = garment.garment_type as StoredProject['garmentType'];
    }
    if (garment.status !== canonicalGarmentStatus(project.status)) {
      next.status = legacyGarmentStatus(garment.status);
    }
    if (garment.phase !== canonicalGarmentPhase(project.phase)) {
      next.phase = legacyGarmentPhase(garment.phase);
    }
    const collection = rows(plan, 'collections').find(
      (record) => record.id === garment.collection_id,
    );
    if (collection) {
      if (collection.name !== project.collection) next.collection = collection.name;
      if ((collection.season ?? '') !== project.season) next.season = collection.season ?? '';
    }
    const tagIds = rows(plan, 'garment_tags')
      .filter((record) => record.garment_id === garment.id)
      .map((record) => record.tag_id);
    const canonicalTags = rows(plan, 'tags')
      .filter((record) => tagIds.includes(record.id))
      .map((record) => record.name);
    if (
      [...canonicalTags].sort().join('\u0000') !==
      [...project.tags].sort().join('\u0000')
    ) {
      next.tags = canonicalTags;
    }

    const brief = rows(plan, 'design_briefs').find(
      (record) => record.garment_id === garment.id,
    );
    if (brief) {
      if (brief.intent !== project.designIntent) next.designIntent = brief.intent;
      if (brief.target_wearer !== project.targetWearer) next.targetWearer = brief.target_wearer;
      if (brief.silhouette !== project.silhouette) next.silhouette = brief.silhouette;
      if (brief.color_story !== project.colorStory) next.colorStory = brief.color_story;
      if (JSON.stringify(brief.key_features) !== JSON.stringify(project.keyFeatures)) {
        next.keyFeatures = [...brief.key_features];
      }
    }

    data.projects[data.projects.findIndex((record) => record.id === legacyId)] = next;
  }

  data.tasks = data.tasks.map((task) => readCanonicalTask(plan, task));
  for (const row of rows(plan, 'tasks')) {
    if (legacyIdFor(plan, 'task', row.id)) continue;
    const projectId = row.garment_id
      ? legacyIdFor(plan, 'project', row.garment_id) ?? row.garment_id
      : null;
    const project = projectId
      ? data.projects.find((candidate) => candidate.id === projectId)
      : undefined;
    if (!projectId || !project) continue;
    data.tasks.push({
      category: 'Admin',
      createdAt: row.created_at,
      description: row.description,
      dueDate: row.due_at?.slice(0, 10),
      id: row.id,
      phase: project.phase,
      priority: legacyTaskPriority(row.priority),
      projectId,
      status: legacyTaskStatus(row.status),
      title: row.title,
      updatedAt: row.updated_at,
    });
  }
  data.fabrics = data.fabrics.map((fabric) => {
    const materialId = canonicalIdFor(plan, 'fabric', fabric.id);
    const material = rows(plan, 'materials').find((record) => record.id === materialId);
    const variant = rows(plan, 'material_variants').find(
      (record) => record.material_id === materialId,
    );
    if (!material) return fabric;
    return {
      ...fabric,
      category: material.category === fabric.category ? fabric.category : material.category,
      composition: material.composition === fabric.composition ? fabric.composition : material.composition,
      name: material.name === fabric.name ? fabric.name : material.name,
      primaryColor:
        variant && variant.color_name !== fabric.primaryColor
          ? variant.color_name
          : fabric.primaryColor,
      primaryColorHex:
        variant && variant.color_hex !== (fabric.primaryColorHex ?? null)
          ? variant.color_hex ?? undefined
          : fabric.primaryColorHex,
    };
  });

  data.linkedMaterials = data.linkedMaterials.map((linkedMaterial) => {
    const canonicalId = canonicalIdFor(plan, 'material', linkedMaterial.id);
    const row = rows(plan, 'garment_materials').find((record) => record.id === canonicalId);
    if (!row) return linkedMaterial;
    return {
      ...linkedMaterial,
      neededYards:
        row.required_quantity === linkedMaterial.neededYards
          ? linkedMaterial.neededYards
          : row.required_quantity,
      reservedYards:
        row.reserved_quantity === linkedMaterial.reservedYards
          ? linkedMaterial.reservedYards
          : row.reserved_quantity,
      role: row.role === linkedMaterial.role ? linkedMaterial.role : row.role as typeof linkedMaterial.role,
    };
  });

  const canonicalProfile = rows(plan, 'portfolio_profiles')[0];
  if (canonicalProfile) {
    data.portfolioProfile = {
      ...data.portfolioProfile,
      bio: canonicalProfile.bio,
      headline: canonicalProfile.headline,
      usernameSlug: canonicalProfile.username_slug,
    };
  }

  for (const row of rows(plan, 'portfolio_projects')) {
    const legacyId = legacyIdFor(plan, 'project', row.garment_id);
    if (!legacyId) continue;
    const project = data.projects.find((record) => record.id === legacyId);
    if (!project) continue;
    const storedSettings = row.case_study_json.legacyPortfolioSettings;
    if (storedSettings && typeof storedSettings === 'object') {
      project.portfolio = structuredClone(storedSettings) as StoredProject['portfolio'];
    }
  }

  // Notes, device settings, and legacy lookbook pages deliberately remain on
  // the fallback side of the adapter until their later work packages cut over.
  return data;
}

function readCanonicalTask(plan: CanonicalMigrationPlan, task: StudioTask) {
  const canonicalId = canonicalIdFor(plan, 'task', task.id);
  const row = rows(plan, 'tasks').find((record) => record.id === canonicalId);
  if (!row) return task;
  return {
    ...task,
    description: row.description,
    dueDate: row.due_at ? row.due_at.slice(0, 10) : undefined,
    priority:
      row.priority === canonicalTaskPriority(task.priority)
        ? task.priority
        : legacyTaskPriority(row.priority),
    status:
      row.status === canonicalTaskStatus(task.status)
        ? task.status
        : legacyTaskStatus(row.status),
    title: row.title,
  };
}

function createLegacyProject(
  id: string,
  garment: CanonicalRowsByTable['garments'][number],
): StoredProject {
  return {
    collection: '',
    colorStory: '',
    designIntent: '',
    difficulty: 'Moderate',
    editorialImages: [],
    galleryImages: [],
    garmentType: garment.garment_type as StoredProject['garmentType'],
    generalNotes: '',
    id,
    keyFeatures: [],
    name: garment.title,
    phase: legacyGarmentPhase(garment.phase),
    priority: 'Medium',
    progress: 0,
    season: '',
    silhouette: '',
    startDate: garment.created_at.slice(0, 10),
    status: legacyGarmentStatus(garment.status),
    summary: '',
    tags: [],
    targetWearer: '',
    updatedAt: garment.updated_at,
  };
}

export function canonicalIdFor(
  plan: CanonicalMigrationPlan,
  legacyEntity: string,
  legacyId: string,
) {
  return plan.report.idMappings.find(
    (mapping) => mapping.legacyEntity === legacyEntity && mapping.legacyId === legacyId,
  )?.canonicalId;
}

export function legacyIdFor(
  plan: CanonicalMigrationPlan,
  legacyEntity: string,
  canonicalId: string,
) {
  return plan.report.idMappings.find(
    (mapping) =>
      mapping.legacyEntity === legacyEntity && mapping.canonicalId === canonicalId,
  )?.legacyId;
}

export function rows<TTable extends CanonicalMigrationTable>(
  plan: CanonicalMigrationPlan,
  table: TTable,
): CanonicalRowsByTable[TTable] {
  const batch = plan.batches.find((candidate) => candidate.table === table);
  return (batch?.rows ?? []) as CanonicalRowsByTable[TTable];
}
