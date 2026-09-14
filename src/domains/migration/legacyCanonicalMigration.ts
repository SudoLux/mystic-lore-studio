import type { StudioData } from '../../lib/studioStorage';
import type { EditorialCollection } from '../../types/editorial';
import type {
  LocalImageAsset,
  LookbookPage,
  YardageEntry,
} from '../../types/studio';
import type {
  CanonicalMigrationBatch,
  CanonicalMigrationPlan,
  CanonicalMigrationTable,
  CanonicalRowsByTable,
  LegacyMigrationInput,
  MigrationIdMapping,
  MigrationNotice,
  MigrationReport,
} from './contracts';
import { LegacyMigrationValidationError } from './contracts';
import {
  canonicalGarmentPhase,
  canonicalGarmentStatus,
  canonicalTaskPriority,
  canonicalTaskStatus,
} from './domainValueMaps';
import { replayLegacyQueue } from './offlineQueueAdapter';
import { materializeLegacyReadThrough } from './readThroughAdapter';
import { sha256Hex, stableStringify, stableUuid } from './stableIdentity';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type MediaOccurrence = {
  image: LocalImageAsset;
  ownerType: 'fabric' | 'lookbook' | 'project';
  projectId?: string;
  role: 'design' | 'editorial' | 'gallery' | 'hero' | 'material' | 'lookbook';
  sortOrder: number;
};

export async function buildLegacyCanonicalMigrationPlan(
  input: LegacyMigrationInput,
): Promise<CanonicalMigrationPlan> {
  validateInput(input);

  const originalData = structuredClone(input.data);
  const replay = replayLegacyQueue(
    input.data,
    input.queuedWrites,
    input.tombstones,
  );
  const data = replay.data;
  const warnings = [...replay.warnings];
  const skippedRecords = [...replay.skippedRecords];
  const rows = emptyRows();
  const idMappings: MigrationIdMapping[] = [];
  const mappingKeys = new Set<string>();
  const studioId = input.studioId ?? await stableUuid(
    `studio:${input.ownerUserId}:${input.sourceId}`,
  );

  if (!UUID_PATTERN.test(studioId)) {
    throw new LegacyMigrationValidationError(['studioId must be a UUID.']);
  }

  const registerMapping = (
    legacyEntity: string,
    legacyId: string,
    canonicalTable: CanonicalMigrationTable,
    canonicalId: string,
  ) => {
    const key = `${legacyEntity}:${legacyId}:${canonicalTable}`;
    if (mappingKeys.has(key)) return canonicalId;
    mappingKeys.add(key);
    idMappings.push({ canonicalId, canonicalTable, legacyEntity, legacyId });
    return canonicalId;
  };
  const mappedId = async (
    legacyEntity: string,
    legacyId: string,
    canonicalTable: CanonicalMigrationTable,
  ) => registerMapping(
    legacyEntity,
    legacyId,
    canonicalTable,
    await stableUuid(`${studioId}:${canonicalTable}:${legacyEntity}:${legacyId}`),
  );

  const rootCreatedAt = safeTimestamp(
    data.portfolioProfile.updatedAt,
    input.generatedAt,
    warnings,
    'portfolio-profile',
    'portfolioProfile',
  );
  const profileId = await mappedId('profile', 'portfolio-profile', 'profiles');
  const memberId = await mappedId('studio-member', input.ownerUserId, 'studio_members');
  const portfolioProfileId = await mappedId(
    'portfolio-profile',
    data.portfolioProfile.usernameSlug,
    'portfolio_profiles',
  );

  rows.profiles.push({
    created_at: rootCreatedAt,
    display_name: data.portfolioProfile.displayName,
    id: profileId,
    locale: 'en-US',
    updated_at: rootCreatedAt,
    user_id: input.ownerUserId,
  });
  rows.studios.push({
    created_at: rootCreatedAt,
    id: studioId,
    name: input.studioName,
    owner_user_id: input.ownerUserId,
    slug: input.studioSlug,
    timezone: input.timezone ?? 'UTC',
    updated_at: rootCreatedAt,
  });
  rows.studio_members.push({
    created_at: rootCreatedAt,
    id: memberId,
    joined_at: rootCreatedAt,
    role: 'owner',
    status: 'active',
    studio_id: studioId,
    updated_at: rootCreatedAt,
    user_id: input.ownerUserId,
  });
  rows.studio_settings.push({
    ai_policy: {},
    created_at: rootCreatedAt,
    currency: input.currency ?? 'USD',
    studio_id: studioId,
    units: input.units ?? 'in',
    updated_at: rootCreatedAt,
    version_policy: {},
  });

  const collectionIdByKey = new Map<string, string>();
  const garmentIdByLegacyProjectId = new Map<string, string>();
  for (const project of data.projects) {
    const createdAt = safeTimestamp(
      project.createdAt,
      project.updatedAt ?? input.generatedAt,
      warnings,
      'project',
      project.id,
    );
    const updatedAt = safeTimestamp(
      project.updatedAt,
      createdAt,
      warnings,
      'project',
      project.id,
    );
    const collectionKey = `${project.collection.trim()}\u0000${project.season.trim()}`;
    let collectionId: string | null = null;
    if (project.collection.trim()) {
      collectionId = collectionIdByKey.get(collectionKey) ?? null;
      if (!collectionId) {
        collectionId = await mappedId(
          'collection',
          collectionKey,
          'collections',
        );
        collectionIdByKey.set(collectionKey, collectionId);
        rows.collections.push({
          created_at: createdAt,
          id: collectionId,
          name: project.collection.trim(),
          season: project.season.trim() || null,
          sort_order: rows.collections.length,
          status: project.status === 'Archived' ? 'archived' : 'active',
          studio_id: studioId,
          updated_at: updatedAt,
        });
      }
    }

    const garmentId = await mappedId('project', project.id, 'garments');
    garmentIdByLegacyProjectId.set(project.id, garmentId);
    rows.garments.push({
      collection_id: collectionId,
      created_at: createdAt,
      garment_code: garmentCode(garmentId),
      garment_type: project.garmentType,
      id: garmentId,
      phase: canonicalGarmentPhase(project.phase),
      status: canonicalGarmentStatus(project.status),
      studio_id: studioId,
      title: project.name,
      updated_at: updatedAt,
    });
    rows.design_briefs.push({
      color_story: project.colorStory,
      created_at: createdAt,
      garment_id: garmentId,
      id: await mappedId('design-brief', project.id, 'design_briefs'),
      intent: project.designIntent,
      key_features: [...project.keyFeatures],
      silhouette: project.silhouette,
      studio_id: studioId,
      target_wearer: project.targetWearer,
      updated_at: updatedAt,
    });

    for (const tag of [...new Set(project.tags.map((value) => value.trim()).filter(Boolean))]) {
      const normalizedTag = tag.toLocaleLowerCase();
      let tagRow = rows.tags.find((record) => record.name.toLocaleLowerCase() === normalizedTag);
      if (!tagRow) {
        tagRow = {
          color: null,
          created_at: createdAt,
          id: await mappedId('tag', normalizedTag, 'tags'),
          name: tag,
          scope: 'garment',
          studio_id: studioId,
          updated_at: updatedAt,
        };
        rows.tags.push(tagRow);
      }
      rows.garment_tags.push({
        created_at: createdAt,
        garment_id: garmentId,
        studio_id: studioId,
        tag_id: tagRow.id,
      });
    }
  }

  const mediaOccurrences = collectMedia(data);
  const assetIdByLegacyImageId = new Map<string, string>();
  const assetIdByChecksum = new Map<string, string>();
  const garmentMediaKeys = new Set<string>();
  for (const occurrence of mediaOccurrences) {
    const explicitChecksum = (occurrence.image as LocalImageAsset & { checksum?: string }).checksum;
    const checksum = explicitChecksum && SHA256_PATTERN.test(explicitChecksum)
      ? explicitChecksum
      : await sha256Hex({
          height: occurrence.image.height ?? null,
          mimeType: occurrence.image.mimeType,
          name: occurrence.image.name,
          size: occurrence.image.size,
          storagePath: occurrence.image.storagePath ?? null,
          width: occurrence.image.width ?? null,
        });
    if (!explicitChecksum || !SHA256_PATTERN.test(explicitChecksum)) {
      warnings.push({
        code: 'provisional-media-checksum',
        entity: 'media',
        legacyId: occurrence.image.id,
        message: 'No source-byte checksum was available; the dry run used a deterministic metadata checksum and retained the legacy path for copy verification.',
      });
    }

    let assetId = assetIdByChecksum.get(checksum);
    if (!assetId) {
      assetId = await stableUuid(`${studioId}:media_assets:checksum:${checksum}`);
      assetIdByChecksum.set(checksum, assetId);
      const createdAt = safeTimestamp(
        occurrence.image.updatedAt,
        input.generatedAt,
        warnings,
        'media',
        occurrence.image.id,
      );
      rows.media_assets.push({
        checksum,
        created_at: createdAt,
        created_by: input.ownerUserId,
        height: positiveNumberOrNull(occurrence.image.height),
        id: assetId,
        mime_type: occurrence.image.mimeType,
        original_filename: occurrence.image.name,
        rights_json: {
          checksumBasis: explicitChecksum ? 'source-bytes' : 'legacy-metadata-v1',
          legacySourcePath: occurrence.image.storagePath ?? null,
          migrationSource: input.sourceId,
        },
        size_bytes: Math.max(0, occurrence.image.size),
        storage_path: canonicalAssetPath(studioId, assetId, occurrence.image.name),
        studio_id: studioId,
        updated_at: createdAt,
        width: positiveNumberOrNull(occurrence.image.width),
      });
    } else {
      warnings.push({
        code: 'media-deduplicated',
        entity: 'media',
        legacyId: occurrence.image.id,
        message: 'Media content matched an existing checksum; one canonical asset keeps separate usage relationships.',
      });
    }
    assetIdByLegacyImageId.set(occurrence.image.id, assetId);
    registerMapping('media', occurrence.image.id, 'media_assets', assetId);

    if (occurrence.ownerType !== 'project' || !occurrence.projectId) continue;
    const garmentId = idMappings.find(
      (mapping) => mapping.legacyEntity === 'project' && mapping.legacyId === occurrence.projectId,
    )?.canonicalId;
    if (!garmentId) continue;
    const role = occurrence.role === 'lookbook' || occurrence.role === 'material'
      ? 'editorial'
      : occurrence.role;
    const relationshipKey = `${garmentId}:${assetId}:${role}`;
    if (garmentMediaKeys.has(relationshipKey)) continue;
    garmentMediaKeys.add(relationshipKey);
    const updatedAt = safeTimestamp(
      occurrence.image.updatedAt,
      input.generatedAt,
      warnings,
      'media',
      occurrence.image.id,
    );
    rows.garment_media.push({
      asset_id: assetId,
      created_at: updatedAt,
      framing_json: framingJson(occurrence.image),
      garment_id: garmentId,
      id: await mappedId(
        'garment-media',
        `${occurrence.projectId}:${occurrence.image.id}:${role}`,
        'garment_media',
      ),
      role,
      sort_order: occurrence.sortOrder,
      studio_id: studioId,
      updated_at: updatedAt,
    });
  }

  const variantIdByFabricId = new Map<string, string>();
  for (const fabric of data.fabrics) {
    const updatedAt = safeTimestamp(
      fabric.updatedAt,
      input.generatedAt,
      warnings,
      'fabric',
      fabric.id,
    );
    const createdAt = safeTimestamp(
      fabric.createdAt,
      fabric.purchaseDate || updatedAt,
      warnings,
      'fabric',
      fabric.id,
    );
    const materialId = await mappedId('fabric', fabric.id, 'materials');
    const variantId = await mappedId('fabric-variant', fabric.id, 'material_variants');
    variantIdByFabricId.set(fabric.id, variantId);
    rows.materials.push({
      category: fabric.category || 'fabric',
      composition: fabric.composition,
      created_at: createdAt,
      id: materialId,
      material_code: `MAT-${materialId.slice(0, 8).toUpperCase()}`,
      name: fabric.name,
      status: fabric.archiveStatus === 'Archived' ? 'archived' : 'active',
      studio_id: studioId,
      updated_at: updatedAt,
    });
    rows.material_variants.push({
      color_hex: validColor(fabric.primaryColorHex),
      color_name: fabric.primaryColor,
      created_at: createdAt,
      id: variantId,
      material_id: materialId,
      sku: `LEGACY-${variantId.slice(0, 12).toUpperCase()}`,
      status: fabric.archiveStatus === 'Archived' ? 'archived' : 'active',
      studio_id: studioId,
      updated_at: updatedAt,
      weight_gsm: positiveNumberOrNull(fabric.weightGsm),
      width: positiveNumberOrNull(fabric.widthInches),
      width_unit: positiveNumberOrNull(fabric.widthInches) ? 'in' : null,
    });
    if (fabric.totalYards > 0) {
      rows.inventory_entries.push({
        actor_id: input.ownerUserId,
        created_at: createdAt,
        entry_type: 'receive',
        id: await mappedId('fabric-opening-balance', fabric.id, 'inventory_entries'),
        note: 'Legacy opening inventory balance.',
        occurred_at: createdAt,
        quantity: fabric.totalYards,
        studio_id: studioId,
        unit: 'yd',
        variant_id: variantId,
      });
    }
  }

  const linkedMaterialById = new Map(
    data.linkedMaterials.map((material) => [material.id, material]),
  );
  for (const linkedMaterial of data.linkedMaterials) {
    const garmentId = idMappings.find(
      (mapping) => mapping.legacyEntity === 'project' && mapping.legacyId === linkedMaterial.projectId,
    )?.canonicalId;
    const variantId = linkedMaterial.fabricId
      ? variantIdByFabricId.get(linkedMaterial.fabricId)
      : undefined;
    if (!garmentId || !variantId) {
      skippedRecords.push({
        code: 'missing-material-relationship',
        entity: 'material',
        legacyId: linkedMaterial.id,
        message: 'The linked material stayed in the legacy recovery fixture because its project or fabric relationship is missing.',
      });
      continue;
    }
    const updatedAt = safeTimestamp(
      linkedMaterial.updatedAt,
      input.generatedAt,
      warnings,
      'material',
      linkedMaterial.id,
    );
    const createdAt = safeTimestamp(
      linkedMaterial.createdAt,
      updatedAt,
      warnings,
      'material',
      linkedMaterial.id,
    );
    const requiredQuantity = Math.max(
      0,
      linkedMaterial.neededYards,
      linkedMaterial.reservedYards,
    );
    if (requiredQuantity !== linkedMaterial.neededYards) {
      warnings.push({
        code: 'required-quantity-raised',
        entity: 'material',
        legacyId: linkedMaterial.id,
        message: 'Required quantity was raised to the reserved quantity to satisfy the canonical invariant; both legacy values remain in recovery data.',
      });
    }
    rows.garment_materials.push({
      created_at: createdAt,
      garment_id: garmentId,
      id: await mappedId('material', linkedMaterial.id, 'garment_materials'),
      placement: linkedMaterial.notes ?? null,
      required_quantity: requiredQuantity,
      reserved_quantity: Math.max(0, linkedMaterial.reservedYards),
      role: linkedMaterial.role,
      status: canonicalMaterialStatus(linkedMaterial.status),
      studio_id: studioId,
      unit: 'yd',
      updated_at: updatedAt,
      variant_id: variantId,
    });
  }

  for (const entry of data.yardageEntries) {
    const linkedMaterial = entry.materialId
      ? linkedMaterialById.get(entry.materialId)
      : undefined;
    const variantId = variantIdByFabricId.get(entry.fabricId);
    if (!variantId) {
      skippedRecords.push({
        code: 'missing-yardage-fabric',
        entity: 'yardage',
        legacyId: entry.id,
        message: 'Yardage event stayed in legacy recovery data because its fabric is missing.',
      });
      continue;
    }
    const inferredType = entry.type ?? (linkedMaterial ? 'Reserved' : 'Adjusted');
    const inferredQuantity = finitePositive(entry.yards)
      ? entry.yards
      : Math.max(
          linkedMaterial?.reservedYards ?? 0,
          linkedMaterial?.usedYards ?? 0,
          0,
        );
    if (!entry.type || !finitePositive(entry.yards)) {
      warnings.push({
        code: 'legacy-yardage-fields-inferred',
        entity: 'yardage',
        legacyId: entry.id,
        message: 'The v5 yardage record lacked a modern type or quantity; the dry run inferred it from the linked material and retained the original fixture.',
      });
    }
    if (!finitePositive(inferredQuantity)) {
      skippedRecords.push({
        code: 'nonpositive-yardage-event',
        entity: 'yardage',
        legacyId: entry.id,
        message: 'Canonical inventory requires a positive event quantity; the original event remains in recovery data.',
      });
      continue;
    }
    const occurredAt = safeTimestamp(
      entry.occurredAt,
      input.generatedAt,
      warnings,
      'yardage',
      entry.id,
    );
    rows.inventory_entries.push({
      actor_id: input.ownerUserId,
      created_at: safeTimestamp(entry.createdAt, occurredAt, warnings, 'yardage', entry.id),
      entry_type: canonicalInventoryType(inferredType),
      id: await mappedId('yardage', entry.id, 'inventory_entries'),
      note: entry.notes ?? null,
      occurred_at: occurredAt,
      quantity: inferredQuantity,
      studio_id: studioId,
      unit: 'yd',
      variant_id: variantId,
    });
  }

  for (const [sortOrder, task] of data.tasks.entries()) {
    const garmentId = idMappings.find(
      (mapping) => mapping.legacyEntity === 'project' && mapping.legacyId === task.projectId,
    )?.canonicalId;
    if (!garmentId) {
      skippedRecords.push({
        code: 'missing-task-garment',
        entity: 'task',
        legacyId: task.id,
        message: 'Task stayed in legacy recovery data because its project relationship is missing.',
      });
      continue;
    }
    const updatedAt = safeTimestamp(
      task.updatedAt,
      input.generatedAt,
      warnings,
      'task',
      task.id,
    );
    rows.tasks.push({
      created_at: safeTimestamp(task.createdAt, updatedAt, warnings, 'task', task.id),
      description: task.description,
      due_at: task.dueDate ? safeTimestamp(task.dueDate, updatedAt, warnings, 'task', task.id) : null,
      garment_id: garmentId,
      id: await mappedId('task', task.id, 'tasks'),
      priority: canonicalTaskPriority(task.priority),
      sort_order: sortOrder,
      status: canonicalTaskStatus(task.status),
      studio_id: studioId,
      title: task.title,
      updated_at: updatedAt,
    });
  }

  const editorialCanonicalIdByLegacyId = new Map<string, string>();
  for (const collection of data.editorialCollections) {
    await addEditorialCollection({
      assetIdByLegacyImageId,
      collection,
      input,
      mappedId,
      projectIdByLegacyId: garmentIdByLegacyProjectId,
      rows,
      skippedRecords,
      studioId,
      warnings,
    });
    const canonicalId = idMappings.find(
      (mapping) => mapping.legacyEntity === 'editorial' && mapping.legacyId === collection.id,
    )?.canonicalId;
    if (canonicalId) editorialCanonicalIdByLegacyId.set(collection.id, canonicalId);
  }

  const editorialLookbookOverlaps: MigrationReport['editorialLookbookOverlaps'] = [];
  for (const page of data.lookbookPages) {
    const canonicalId = await addLookbookEditorial({
      assetIdByLegacyImageId,
      input,
      mappedId,
      page,
      projectIdByLegacyId: garmentIdByLegacyProjectId,
      rows,
      skippedRecords,
      studioId,
      warnings,
    });
    if (!canonicalId) continue;
    editorialCanonicalIdByLegacyId.set(page.id, canonicalId);
    const overlapping = data.editorialCollections.find(
      (collection) =>
        collection.projectId === page.projectId &&
        normalizeTitle(collection.title) === normalizeTitle(page.title),
    );
    if (overlapping) {
      editorialLookbookOverlaps.push({
        editorialCollectionId: overlapping.id,
        lookbookPageId: page.id,
        policy: 'preserve-both-until-wp7',
      });
    }
  }

  rows.portfolio_profiles.push({
    bio: data.portfolioProfile.bio,
    created_at: rootCreatedAt,
    headline: data.portfolioProfile.headline,
    id: portfolioProfileId,
    status: data.portfolioProfile.displayName.trim() ? 'ready' : 'draft',
    studio_id: studioId,
    updated_at: rootCreatedAt,
    username_slug: safeSlug(data.portfolioProfile.usernameSlug, 'designer'),
  });
  for (const [sortOrder, project] of data.projects.entries()) {
    if (!project.portfolio) continue;
    const garmentId = idMappings.find(
      (mapping) => mapping.legacyEntity === 'project' && mapping.legacyId === project.id,
    )?.canonicalId;
    if (!garmentId) continue;
    const updatedAt = safeTimestamp(
      project.portfolio.updatedAt,
      project.updatedAt ?? input.generatedAt,
      warnings,
      'portfolio-project',
      project.id,
    );
    rows.portfolio_projects.push({
      case_study_json: {
        legacyPortfolioSettings: jsonObject(project.portfolio),
        sourceProjectUpdatedAt: project.updatedAt ?? null,
      },
      created_at: updatedAt,
      garment_id: garmentId,
      id: await mappedId('portfolio-project', project.id, 'portfolio_projects'),
      profile_id: portfolioProfileId,
      slug: safeSlug(project.portfolio.portfolioSlug, `garment-${garmentId.slice(0, 8)}`),
      sort_order: project.portfolio.sortOrder ?? sortOrder,
      studio_id: studioId,
      updated_at: updatedAt,
      visibility: project.portfolio.isPublic
        ? project.portfolio.publishedAt ? 'published' : 'ready'
        : 'private',
    });
    for (const [editorialSortOrder, editorialId] of project.portfolio.attachedEditorialCollectionIds.entries()) {
      const collectionId = editorialCanonicalIdByLegacyId.get(editorialId);
      if (!collectionId) {
        skippedRecords.push({
          code: 'missing-portfolio-editorial',
          entity: 'portfolio-editorial',
          legacyId: editorialId,
          message: 'Portfolio attachment stayed in recovery data because the Editorial Collection is missing.',
        });
        continue;
      }
      rows.portfolio_editorials.push({
        collection_id: collectionId,
        created_at: updatedAt,
        profile_id: portfolioProfileId,
        slug: safeSlug(`${project.portfolio.portfolioSlug}-${editorialId}`, `editorial-${collectionId.slice(0, 8)}`),
        sort_order: editorialSortOrder,
        studio_id: studioId,
        updated_at: updatedAt,
        visibility: project.portfolio.isPublic ? 'ready' : 'private',
      });
    }
  }

  for (const tombstone of replay.tombstones) {
    const canonicalEntity = canonicalTombstoneEntity(tombstone.entity);
    rows.sync_tombstones.push({
      client_id: tombstone.clientId,
      created_at: tombstone.deletedAt,
      deleted_at: tombstone.deletedAt,
      entity_type: canonicalEntity,
      id: await mappedId(
        'tombstone',
        `${tombstone.entity}:${tombstone.clientId}`,
        'sync_tombstones',
      ),
      studio_id: studioId,
      updated_at: tombstone.deletedAt,
      user_id: input.ownerUserId,
    });
  }

  for (const operation of input.queuedWrites ?? []) {
    const entityId = await stableUuid(
      `${studioId}:change-event-entity:${operation.entity}:${operation.clientId}`,
    );
    const projectId = queuedProjectId(operation.payload, operation.ownerId);
    const garmentId = projectId
      ? idMappings.find(
          (mapping) => mapping.legacyEntity === 'project' && mapping.legacyId === projectId,
        )?.canonicalId ?? null
      : null;
    rows.change_events.push({
      actor_id: input.ownerUserId,
      created_at: operation.queuedAt,
      entity_id: entityId,
      entity_type: canonicalTombstoneEntity(operation.entity),
      garment_id: garmentId,
      id: await mappedId('change-event', operation.id, 'change_events'),
      inverse_patch: [],
      json_patch: [],
      occurred_at: operation.queuedAt,
      operation: operation.action === 'delete' ? 'delete' : 'update',
      operation_id: UUID_PATTERN.test(operation.id)
        ? operation.id
        : await stableUuid(`${studioId}:operation:${operation.id}`),
      origin: 'migration',
      studio_id: studioId,
    });
  }

  warnings.push(
    {
      code: 'legacy-notes-retained',
      entity: 'notes',
      message: `${data.notes.length} private note record(s) remain in the verified legacy fixture until a canonical journal/fit-note owner is introduced.`,
    },
    {
      code: 'device-settings-retained',
      entity: 'settings',
      message: 'Backup reminder cadence and copy remain device-local; only unit and currency policy enter canonical studio_settings.',
    },
    {
      code: 'public-cut-not-created',
      entity: 'portfolio',
      message: 'The dry run creates private portfolio curation only; no anonymous publication snapshot is created or changed.',
    },
  );
  if (data.lookbookPages.length > 0) {
    warnings.push({
      code: 'lookbook-bridge-retained',
      entity: 'lookbook',
      message: 'Legacy lookbook pages receive parallel canonical editorial rows, but the original pages stay authoritative until WP7.',
    });
  }

  sortRows(rows);
  idMappings.sort((left, right) =>
    `${left.legacyEntity}:${left.legacyId}:${left.canonicalTable}`.localeCompare(
      `${right.legacyEntity}:${right.legacyId}:${right.canonicalTable}`,
    ),
  );
  const batches = createBatches(rows);
  const sourceChecksum = await sha256Hex(originalData);
  const canonicalPlanChecksum = await sha256Hex(
    batches.map(({ access, onConflict, rows: batchRows, table }) => ({
      access,
      onConflict,
      rows: batchRows,
      table,
      writeMode: table === 'change_events' || table === 'inventory_entries' || table === 'studios'
        ? 'insert-ignore'
        : 'upsert',
    })),
  );
  const report: MigrationReport = {
    checksums: {
      canonicalPlan: canonicalPlanChecksum,
      roundTrip: '',
      source: sourceChecksum,
    },
    conflicts: replay.conflicts,
    editorialLookbookOverlaps,
    idMappings,
    recovery: {
      deterministicIds: true,
      idempotentUpserts: true,
      legacyFixtureRetained: true,
      retryMode: 'resume-by-stable-upsert',
    },
    roundTrip: {
      exact: false,
      intentionalDifferences: (input.queuedWrites?.length ?? 0) > 0
        ? ['Queued offline writes were replayed into the effective migration view.']
        : [],
      unexplainedDataLoss: 0,
    },
    rowCounts: {
      canonical: Object.fromEntries(
        Object.entries(rows).map(([table, tableRows]) => [table, tableRows.length]),
      ),
      legacy: legacyRowCounts(originalData),
    },
    schemaVersion: 'ml-studio-wp2-migration-report-v1',
    settingsPolicy: {
      canonicalStudioPolicy: ['units', 'currency', 'version_policy', 'ai_policy'],
      deviceOnlyLegacyFields: ['backupReminderCadenceDays', 'backupReminderCopy', 'updatedAt'],
    },
    skippedRecords: deduplicateNotices(skippedRecords),
    source: {
      checksum: sourceChecksum,
      id: input.sourceId,
      version: originalData.version,
    },
    target: {
      ownerUserId: input.ownerUserId,
      schema: 'ml_private',
      studioId,
    },
    warnings: deduplicateNotices(warnings),
  };
  const plan: CanonicalMigrationPlan = {
    batches,
    report,
    retention: {
      effectiveData: data,
      originalData,
    },
  };
  const roundTrip = materializeLegacyReadThrough(plan);
  const effectiveChecksum = await sha256Hex(data);
  const roundTripChecksum = await sha256Hex(roundTrip);
  report.checksums.roundTrip = roundTripChecksum;
  report.roundTrip.exact = effectiveChecksum === roundTripChecksum;
  report.roundTrip.unexplainedDataLoss = report.roundTrip.exact ? 0 : 1;
  return plan;
}

type EditorialContext = {
  assetIdByLegacyImageId: Map<string, string>;
  input: LegacyMigrationInput;
  mappedId: (
    legacyEntity: string,
    legacyId: string,
    table: CanonicalMigrationTable,
  ) => Promise<string>;
  projectIdByLegacyId: Map<string, string>;
  rows: CanonicalRowsByTable;
  skippedRecords: MigrationNotice[];
  studioId: string;
  warnings: MigrationNotice[];
};

async function addEditorialCollection(
  context: EditorialContext & { collection: EditorialCollection },
) {
  const { collection } = context;
  const garmentId = canonicalProjectId(context, collection.projectId);
  if (!garmentId) {
    context.skippedRecords.push({
      code: 'missing-editorial-garment',
      entity: 'editorial',
      legacyId: collection.id,
      message: 'Editorial Collection stayed in legacy recovery data because its project is missing.',
    });
    return;
  }
  const collectionId = await context.mappedId('editorial', collection.id, 'editorial_collections');
  const createdAt = safeTimestamp(
    collection.createdAt,
    context.input.generatedAt,
    context.warnings,
    'editorial',
    collection.id,
  );
  const updatedAt = safeTimestamp(
    collection.updatedAt,
    createdAt,
    context.warnings,
    'editorial',
    collection.id,
  );
  context.rows.editorial_collections.push({
    created_at: createdAt,
    garment_id: garmentId,
    id: collectionId,
    status: 'draft',
    studio_id: context.studioId,
    template_type: collection.templateType,
    theme_id: collection.themeId || null,
    title: collection.title,
    updated_at: updatedAt,
  });
  for (const scene of collection.scenes) {
    const sceneId = await context.mappedId('editorial-scene', scene.id, 'editorial_scenes');
    context.rows.editorial_scenes.push({
      collection_id: collectionId,
      created_at: safeTimestamp(scene.createdAt, createdAt, context.warnings, 'editorial-scene', scene.id),
      id: sceneId,
      scene_type: scene.sceneType,
      sort_order: scene.order,
      studio_id: context.studioId,
      title: scene.title || null,
      transition_json: {
        background: jsonObject(scene.background),
        description: scene.description ?? null,
        fabricFallbacks: scene.fabricFallbacks ?? [],
        fabricIds: scene.fabricIds ?? [],
        layout: scene.layout ? jsonObject(scene.layout) : null,
        narrativeRole: scene.narrativeRole,
        subtitle: scene.subtitle ?? null,
        transition: jsonObject(scene.transition),
      },
      updated_at: safeTimestamp(scene.updatedAt, updatedAt, context.warnings, 'editorial-scene', scene.id),
    });
    for (const block of scene.blocks) {
      context.rows.editorial_blocks.push({
        block_type: block.type,
        content_json: { value: jsonValue(block.content) },
        created_at: createdAt,
        id: await context.mappedId('editorial-block', block.id, 'editorial_blocks'),
        scene_id: sceneId,
        settings_json: jsonObject(block.settings),
        sort_order: block.order,
        studio_id: context.studioId,
        updated_at: updatedAt,
      });
      for (const assetId of collectAssetIds(block.content)) {
        await addEditorialAsset(context, collectionId, assetId, block.id, block.order);
      }
    }
  }
  if (collection.coverImageId) {
    await addEditorialAsset(context, collectionId, collection.coverImageId, 'cover', 0);
  }
}

async function addLookbookEditorial(
  context: EditorialContext & { page: LookbookPage },
) {
  const { page } = context;
  const garmentId = canonicalProjectId(context, page.projectId);
  if (!garmentId) {
    context.skippedRecords.push({
      code: 'missing-lookbook-garment',
      entity: 'lookbook',
      legacyId: page.id,
      message: 'Lookbook page stayed in legacy recovery data because its project is missing.',
    });
    return null;
  }
  const collectionId = await context.mappedId('lookbook', page.id, 'editorial_collections');
  const updatedAt = safeTimestamp(
    page.updatedAt,
    context.input.generatedAt,
    context.warnings,
    'lookbook',
    page.id,
  );
  const createdAt = safeTimestamp(page.createdAt, updatedAt, context.warnings, 'lookbook', page.id);
  const sceneId = await context.mappedId('lookbook-scene', page.id, 'editorial_scenes');
  context.rows.editorial_collections.push({
    created_at: createdAt,
    garment_id: garmentId,
    id: collectionId,
    status: 'draft',
    studio_id: context.studioId,
    template_type: page.template ?? `legacy-${page.pageType.toLocaleLowerCase().replaceAll(' ', '-')}`,
    theme_id: null,
    title: page.title,
    updated_at: updatedAt,
  });
  context.rows.editorial_scenes.push({
    collection_id: collectionId,
    created_at: createdAt,
    id: sceneId,
    scene_type: page.pageType.toLocaleLowerCase().replaceAll(' ', '-'),
    sort_order: 0,
    studio_id: context.studioId,
    title: page.title,
    transition_json: {
      legacyLayoutHint: page.layoutHint,
      sourceType: 'lookbook-page',
    },
    updated_at: updatedAt,
  });
  for (const [sortOrder, block] of [
    { content: { text: page.headline }, id: 'heading', type: 'heading' },
    { content: { text: page.body }, id: 'body', type: 'paragraph' },
  ].entries()) {
    context.rows.editorial_blocks.push({
      block_type: block.type,
      content_json: block.content,
      created_at: createdAt,
      id: await context.mappedId('lookbook-block', `${page.id}:${block.id}`, 'editorial_blocks'),
      scene_id: sceneId,
      settings_json: {},
      sort_order: sortOrder,
      studio_id: context.studioId,
      updated_at: updatedAt,
    });
  }
  if (page.heroImage) {
    await addEditorialAsset(context, collectionId, page.heroImage.id, 'hero', 0);
  }
  return collectionId;
}

async function addEditorialAsset(
  context: EditorialContext,
  collectionId: string,
  legacyAssetId: string,
  role: string,
  sortOrder: number,
) {
  const assetId = context.assetIdByLegacyImageId.get(legacyAssetId);
  if (!assetId) return;
  const key = `${collectionId}:${assetId}:${role}`;
  if (context.rows.editorial_assets.some(
    (record) => `${record.collection_id}:${record.asset_id}:${record.role}` === key,
  )) return;
  context.rows.editorial_assets.push({
    asset_id: assetId,
    collection_id: collectionId,
    created_at: context.input.generatedAt,
    id: await context.mappedId('editorial-asset', key, 'editorial_assets'),
    role,
    sort_order: sortOrder,
    studio_id: context.studioId,
    updated_at: context.input.generatedAt,
    usage_json: { legacyAssetId },
  });
}

function canonicalProjectId(context: EditorialContext, projectId: string) {
  return context.projectIdByLegacyId.get(projectId);
}

function collectMedia(data: StudioData) {
  const occurrences: MediaOccurrence[] = [];
  data.projects.forEach((project) => {
    if (project.heroImage) occurrences.push({ image: project.heroImage, ownerType: 'project', projectId: project.id, role: 'hero', sortOrder: 0 });
    project.galleryImages?.forEach((image, sortOrder) => occurrences.push({ image, ownerType: 'project', projectId: project.id, role: 'gallery', sortOrder }));
    project.editorialImages?.forEach((image, sortOrder) => occurrences.push({ image, ownerType: 'project', projectId: project.id, role: 'editorial', sortOrder }));
  });
  data.fabrics.forEach((fabric) => {
    if (fabric.image) occurrences.push({ image: fabric.image, ownerType: 'fabric', role: 'material', sortOrder: 0 });
  });
  data.lookbookPages.forEach((page) => {
    if (page.heroImage) occurrences.push({ image: page.heroImage, ownerType: 'lookbook', projectId: page.projectId, role: 'lookbook', sortOrder: 0 });
  });
  return occurrences;
}

function createBatches(rows: CanonicalRowsByTable) {
  const order: CanonicalMigrationTable[] = [
    'profiles', 'studios', 'studio_members', 'studio_settings', 'collections',
    'garments', 'tags', 'garment_tags', 'design_briefs', 'media_assets',
    'garment_media', 'materials', 'material_variants', 'inventory_entries',
    'garment_materials', 'editorial_collections', 'editorial_scenes',
    'editorial_blocks', 'editorial_assets', 'portfolio_profiles',
    'portfolio_projects', 'portfolio_editorials', 'tasks', 'sync_tombstones',
    'change_events',
  ];
  return order.map((table) => ({
    access: table === 'change_events' ? 'server' : 'client',
    onConflict: table === 'studio_settings'
      ? 'studio_id'
      : table === 'studio_members'
        ? 'studio_id,user_id'
      : table === 'garment_tags'
        ? 'garment_id,tag_id'
        : table === 'portfolio_editorials'
          ? 'profile_id,collection_id'
          : 'id',
    rows: rows[table],
    table,
    writeMode: table === 'change_events' || table === 'inventory_entries' || table === 'studios'
      ? 'insert-ignore'
      : 'upsert',
  } as CanonicalMigrationBatch));
}

function emptyRows(): CanonicalRowsByTable {
  return {
    change_events: [],
    collections: [],
    design_briefs: [],
    editorial_assets: [],
    editorial_blocks: [],
    editorial_collections: [],
    editorial_scenes: [],
    garment_materials: [],
    garment_media: [],
    garment_tags: [],
    garments: [],
    inventory_entries: [],
    material_variants: [],
    materials: [],
    media_assets: [],
    portfolio_editorials: [],
    portfolio_profiles: [],
    portfolio_projects: [],
    profiles: [],
    studio_members: [],
    studio_settings: [],
    studios: [],
    sync_tombstones: [],
    tags: [],
    tasks: [],
  };
}

function sortRows(rows: CanonicalRowsByTable) {
  for (const tableRows of Object.values(rows)) {
    tableRows.sort((left, right) => stableRowKey(left).localeCompare(stableRowKey(right)));
  }
  // Editorial asset IDs depend on the final stable relationship key so async
  // identifier generation is not required inside the synchronous helper above.
  for (const row of rows.editorial_assets) {
    if (!row.id) {
      throw new LegacyMigrationValidationError([
        `Editorial asset ${row.collection_id}:${row.asset_id}:${row.role} is missing a stable ID.`,
      ]);
    }
  }
}

function stableRowKey(row: object) {
  const value = row as Record<string, unknown>;
  if (value.id !== undefined) return String(value.id);
  if (value.profile_id !== undefined || value.collection_id !== undefined) {
    return `${String(value.profile_id ?? '')}:${String(value.collection_id ?? '')}`;
  }
  return stableStringify(row);
}

function validateInput(input: LegacyMigrationInput) {
  const issues: string[] = [];
  if (!UUID_PATTERN.test(input.ownerUserId)) issues.push('ownerUserId must be a UUID.');
  if (input.studioId && !UUID_PATTERN.test(input.studioId)) issues.push('studioId must be a UUID.');
  if (!SLUG_PATTERN.test(input.studioSlug)) issues.push('studioSlug must be a lowercase kebab-case slug.');
  if (!Number.isFinite(Date.parse(input.generatedAt))) issues.push('generatedAt must be an ISO timestamp.');
  if (!/^[A-Z]{3}$/.test(input.currency ?? 'USD')) issues.push('currency must be an ISO 4217 code.');
  if (!input.sourceId.trim()) issues.push('sourceId is required.');
  if (!input.studioName.trim()) issues.push('studioName is required.');

  for (const [name, records] of Object.entries({
    editorialCollections: input.data.editorialCollections,
    fabrics: input.data.fabrics,
    linkedMaterials: input.data.linkedMaterials,
    lookbookPages: input.data.lookbookPages,
    notes: input.data.notes,
    projects: input.data.projects,
    tasks: input.data.tasks,
    yardageEntries: input.data.yardageEntries,
  })) {
    if (!Array.isArray(records)) {
      issues.push(`${name} must be an array.`);
      continue;
    }
    const ids = records.map((record) => record.id);
    if (new Set(ids).size !== ids.length) issues.push(`${name} contains duplicate IDs.`);
  }

  if (issues.length > 0) throw new LegacyMigrationValidationError(issues);
}

function safeTimestamp(
  value: string | undefined,
  fallback: string,
  warnings: MigrationNotice[],
  entity: string,
  legacyId: string,
) {
  const candidate = value && Number.isFinite(Date.parse(value)) ? value : fallback;
  if (value && !Number.isFinite(Date.parse(value))) {
    warnings.push({
      code: 'invalid-timestamp-defaulted',
      entity,
      legacyId,
      message: 'An invalid legacy timestamp was replaced by its deterministic migration fallback.',
    });
  }
  const date = new Date(candidate);
  if (!Number.isFinite(date.getTime())) return '1970-01-01T00:00:00.000Z';
  return date.toISOString();
}

function canonicalMaterialStatus(status: string): CanonicalRowsByTable['garment_materials'][number]['status'] {
  if (status === 'Reserved') return 'reserved';
  if (status === 'Cut') return 'issued';
  if (status === 'Used') return 'consumed';
  return 'planned';
}

function canonicalInventoryType(type: YardageEntry['type']) {
  const values: Record<YardageEntry['type'], CanonicalRowsByTable['inventory_entries'][number]['entry_type']> = {
    Adjusted: 'adjust',
    Released: 'release',
    Reserved: 'reserve',
    Used: 'consume',
  };
  return values[type];
}

function canonicalTombstoneEntity(entity: string) {
  const values: Record<string, string> = {
    fabric: 'material',
    fabric_image: 'media_asset',
    lookbook: 'editorial_collection',
    material: 'garment_material',
    note: 'legacy_note',
    profile: 'portfolio_profile',
    project: 'garment',
    project_image: 'media_asset',
    task: 'task',
    yardage: 'inventory_entry',
  };
  return values[entity] ?? `legacy_${entity}`;
}

function legacyRowCounts(data: StudioData) {
  return {
    editorialCollections: data.editorialCollections.length,
    fabrics: data.fabrics.length,
    linkedMaterials: data.linkedMaterials.length,
    lookbookPages: data.lookbookPages.length,
    notes: data.notes.length,
    portfolioProfiles: 1,
    projects: data.projects.length,
    settings: 1,
    tasks: data.tasks.length,
    yardageEntries: data.yardageEntries.length,
  };
}

function deduplicateNotices(notices: MigrationNotice[]) {
  const byKey = new Map<string, MigrationNotice>();
  for (const notice of notices) {
    byKey.set(`${notice.code}:${notice.entity ?? ''}:${notice.legacyId ?? ''}`, notice);
  }
  return [...byKey.values()].sort((left, right) =>
    `${left.code}:${left.entity ?? ''}:${left.legacyId ?? ''}`.localeCompare(
      `${right.code}:${right.entity ?? ''}:${right.legacyId ?? ''}`,
    ),
  );
}

function collectAssetIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectAssetIds);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  return [
    typeof record.assetId === 'string' ? record.assetId : null,
    ...Object.values(record).flatMap(collectAssetIds),
  ].filter((assetId): assetId is string => Boolean(assetId));
}

function jsonObject(value: object) {
  return JSON.parse(stableStringify(value)) as Record<string, unknown>;
}

function jsonValue(value: unknown) {
  return JSON.parse(stableStringify(value)) as unknown;
}

function framingJson(image: LocalImageAsset) {
  return {
    objectFit: image.objectFit ?? 'cover',
    objectPositionX: image.objectPositionX ?? 50,
    objectPositionY: image.objectPositionY ?? 50,
    overlayIntensity: image.overlayIntensity ?? 'auto',
    zoom: image.zoom ?? 1,
  };
}

function canonicalAssetPath(studioId: string, assetId: string, filename: string) {
  const safeFilename = filename
    .toLocaleLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'asset.bin';
  return `studios/${studioId}/migration/${assetId}/${safeFilename}`;
}

function garmentCode(garmentId: string) {
  return `MLS-${garmentId.slice(0, 8).toUpperCase()}`;
}

function normalizeTitle(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function safeSlug(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return SLUG_PATTERN.test(normalized) ? normalized : fallback;
}

function validColor(value: string | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : null;
}

function positiveNumberOrNull(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function finitePositive(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function queuedProjectId(payload: unknown, ownerId?: string) {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (typeof record.projectId === 'string') return record.projectId;
    if (typeof record.id === 'string' && 'garmentType' in record) return record.id;
  }
  return ownerId;
}
