import type {
  CanonicalMediaAsset,
  CanonicalPortfolioEditorial,
  CanonicalPortfolioProfile,
  CanonicalPortfolioProject,
  CanonicalPortfolioTechnicalExcerpt,
  CanonicalPublication,
  CanonicalPublicationAssetManifest,
  CanonicalRecord,
  CanonicalWorkspaceState,
  PortfolioVisibility,
} from '../workspace';
import { sha256Hex, stableStringify } from '../migration/stableIdentity';
import type {
  PortfolioEditorialSnapshot,
  PortfolioHomepageSnapshot,
  PortfolioImageSnapshot,
  PortfolioProjectSnapshot,
} from '../../utils/portfolioSnapshot';
import type { EditorialJsonValue } from '../../types/editorial';

const PRIVATE_KEYS = new Set([
  'actorid', 'aiartifacts', 'aijobs', 'bomitems', 'constructiondetails', 'constructionsteps',
  'costitems', 'costs', 'costsheets', 'factoryid', 'factories', 'fitissues', 'fitnotes',
  'inputrefs', 'modelprofile', 'notes', 'owneruserid', 'patternfiles', 'privatefiles',
  'privatenotes', 'prompt', 'prompts', 'pompoints', 'rawaiinputs', 'supplierid', 'supplieritems',
  'suppliers', 'tasks', 'technicalfiles', 'technicalspecs', 'unitcost',
]);
const ROOT_KEYS = new Set(['editorials', 'generatedAt', 'profile', 'projects']);
const PUBLIC_KEYS = new Set([
  ...ROOT_KEYS, 'accentColor', 'align', 'alignment', 'alt', 'approvedAt', 'approvedVersionId',
  'attribution', 'avatar', 'background', 'bio', 'blocks', 'body', 'caption', 'caseStudy',
  'challenge', 'collection', 'colorHex', 'colorStory', 'columns', 'composition', 'content',
  'cover', 'coverImage', 'description', 'designIntent', 'displayName', 'downloadUrl', 'downloads',
  'editorials', 'email', 'eyebrow', 'featured', 'featuredImages', 'fit', 'gallery', 'garmentType',
  'generatedAt', 'heading', 'headline', 'height', 'image', 'imageReference', 'images', 'items',
  'key', 'label', 'layout', 'location', 'materials', 'name', 'narrativeRole', 'order', 'outcome',
  'overview', 'overlayColor', 'overlayOpacity', 'phase', 'positionX', 'positionY', 'process',
  'processSummary', 'profile', 'progress', 'projects', 'quote', 'reference', 'resumeUrl', 'role',
  'rows', 'sceneType', 'scenes', 'season', 'silhouette', 'size', 'skills', 'slug', 'solution',
  'sortOrder', 'src', 'style', 'subtitle', 'summary', 'targetWearer', 'templateType', 'text',
  'themeId', 'title', 'tone', 'tools', 'transition', 'type', 'updatedAt', 'usage', 'usernameSlug',
  'value', 'values', 'visibleSections', 'width', 'zoom',
]);
const PUBLIC_EDITORIAL_BLOCK_TYPES = new Set(['heading', 'paragraph', 'text', 'quote', 'image', 'gallery', 'divider', 'spacer', 'fabricSwatch', 'materials', 'callout']);

export type PrivacyFinding = { key: string; path: string; reason: string };
export type PublicCutPreview = {
  checksum: string;
  findings: PrivacyFinding[];
  isStale: boolean;
  manifest: CanonicalPublicationAssetManifest[];
  snapshot: PortfolioHomepageSnapshot;
  sourceVersions: Array<{ entityId: string; label: string; versionId: string }>;
  warnings: string[];
};

type ProjectInput = Partial<CanonicalPortfolioProject['caseStudy']> & {
  featured?: boolean;
  selectedAssetIds?: string[];
  slug?: string;
  visibility?: PortfolioVisibility;
};

export function createPortfolioProfile(
  state: CanonicalWorkspaceState,
  input: Partial<Pick<CanonicalPortfolioProfile, 'bio' | 'displayName' | 'email' | 'headline' | 'location' | 'resumePublicUrl' | 'status' | 'usernameSlug'>> = {},
) {
  const existing = state.portfolioProfiles[0];
  if (existing) return { profile: existing, state };
  const profile: CanonicalPortfolioProfile = {
    ...newRecord(state.studioId),
    avatarAssetId: null,
    bio: input.bio ?? '',
    displayName: input.displayName?.trim() || 'Mystic Lore Portfolio',
    email: input.email ?? '',
    headline: input.headline ?? 'Independent fashion design and garment development',
    location: input.location ?? '',
    resumePublicUrl: input.resumePublicUrl ?? '',
    status: input.status ?? 'draft',
    usernameSlug: slugify(input.usernameSlug || `designer-${state.studioId.slice(0, 8)}`),
  };
  return { profile, state: { ...state, portfolioProfiles: [...state.portfolioProfiles, profile] } };
}

export function updatePortfolioProfile(
  state: CanonicalWorkspaceState,
  profileId: string,
  patch: Partial<Pick<CanonicalPortfolioProfile, 'avatarAssetId' | 'bio' | 'displayName' | 'email' | 'headline' | 'location' | 'resumePublicUrl' | 'status' | 'usernameSlug'>>,
) {
  const profile = required(state.portfolioProfiles.find((item) => item.id === profileId), 'Portfolio profile');
  const next = touch({ ...profile, ...patch, usernameSlug: patch.usernameSlug ? slugify(patch.usernameSlug) : profile.usernameSlug });
  return { ...state, portfolioProfiles: state.portfolioProfiles.map((item) => item.id === profileId ? next : item) };
}

export function selectPortfolioProject(state: CanonicalWorkspaceState, profileId: string, garmentId: string, input: ProjectInput = {}) {
  const garment = required(state.garments.find((item) => item.id === garmentId), 'Garment');
  required(state.portfolioProfiles.find((item) => item.id === profileId), 'Portfolio profile');
  const existing = state.portfolioProjects.find((item) => item.profileId === profileId && item.garmentId === garmentId);
  const latestVersion = latestGarmentVersion(state, garmentId);
  const record: CanonicalPortfolioProject = touch(existing ? {
    ...existing,
    caseStudy: { ...existing.caseStudy, ...caseStudyPatch(input) },
    featured: input.featured ?? existing.featured,
    selectedAssetIds: input.selectedAssetIds ?? existing.selectedAssetIds,
    slug: input.slug ? slugify(input.slug) : existing.slug,
    visibility: input.visibility ?? existing.visibility,
  } : {
    ...newRecord(state.studioId),
    caseStudy: { challenge: '', outcome: '', overview: '', processSummary: '', role: '', skills: [], solution: '', tools: [], ...caseStudyPatch(input) },
    featured: input.featured ?? false,
    garmentId,
    includeTechnicalExcerpt: false,
    profileId,
    selectedAssetIds: input.selectedAssetIds ?? [],
    slug: slugify(input.slug || garment.title),
    sortOrder: state.portfolioProjects.filter((item) => item.profileId === profileId).length,
    sourceVersionId: latestVersion?.id ?? null,
    visibility: input.visibility ?? 'ready',
  });
  return { record, state: { ...state, portfolioProjects: existing ? state.portfolioProjects.map((item) => item.id === existing.id ? record : item) : [...state.portfolioProjects, record] } };
}

export function updatePortfolioProject(
  state: CanonicalWorkspaceState,
  projectId: string,
  patch: Partial<Omit<CanonicalPortfolioProject, keyof CanonicalRecord | 'caseStudy'>> & { caseStudy?: Partial<CanonicalPortfolioProject['caseStudy']> },
) {
  const current = required(state.portfolioProjects.find((item) => item.id === projectId), 'Portfolio project');
  const record = touch({ ...current, ...patch, caseStudy: { ...current.caseStudy, ...patch.caseStudy }, ...(patch.slug ? { slug: slugify(patch.slug) } : {}) });
  return { record, state: { ...state, portfolioProjects: state.portfolioProjects.map((item) => item.id === projectId ? record : item) } };
}

export function selectPortfolioEditorial(state: CanonicalWorkspaceState, profileId: string, collectionId: string) {
  const collection = required(state.editorialCollections.find((item) => item.id === collectionId), 'Editorial collection');
  if (!['approved', 'published'].includes(collection.status)) throw new Error('Only an approved Editorial Collection can enter a Public Cut.');
  const existing = state.portfolioEditorials.find((item) => item.profileId === profileId && item.collectionId === collectionId);
  if (existing) return { record: existing, state };
  const assets = state.editorialAssets.filter((item) => item.collectionId === collectionId).map((item) => item.assetId);
  const record: CanonicalPortfolioEditorial = {
    ...newRecord(state.studioId), collectionId, profileId, selectedAssetIds: assets,
    selectedSceneIds: state.editorialScenes.filter((item) => item.collectionId === collectionId).map((item) => item.id),
    slug: slugify(collection.title), sortOrder: state.portfolioEditorials.filter((item) => item.profileId === profileId).length,
    sourceVersionId: collection.primaryGarmentVersionId ?? latestGarmentVersion(state, collection.primaryGarmentId)?.id ?? null,
    visibility: 'ready',
  };
  return { record, state: { ...state, portfolioEditorials: [...state.portfolioEditorials, record] } };
}

export function updatePortfolioEditorial(
  state: CanonicalWorkspaceState,
  selectionId: string,
  patch: Partial<Pick<CanonicalPortfolioEditorial, 'selectedAssetIds' | 'selectedSceneIds' | 'slug' | 'sourceVersionId' | 'visibility'>>,
) {
  const current = required(state.portfolioEditorials.find((item) => item.id === selectionId), 'Portfolio editorial');
  const record = touch({ ...current, ...patch, ...(patch.slug ? { slug: slugify(patch.slug) } : {}) });
  return { record, state: { ...state, portfolioEditorials: state.portfolioEditorials.map((item) => item.id === selectionId ? record : item) } };
}

export function movePortfolioItem<T extends { id: string; sortOrder: number }>(rows: readonly T[], id: string, direction: 'up' | 'down') {
  const ordered = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const from = ordered.findIndex((item) => item.id === id);
  const to = direction === 'up' ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ordered.length) return ordered;
  [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
  return ordered.map((item, sortOrder) => ({ ...item, sortOrder }));
}

export function createTechnicalExcerpt(state: CanonicalWorkspaceState, projectId: string, input: { summary: string; title: string; publicDownloadAssetId?: string | null }) {
  const project = required(state.portfolioProjects.find((item) => item.id === projectId), 'Portfolio project');
  const versionId = required(project.sourceVersionId, 'An approved garment version');
  const spec = state.technicalSpecs.find((item) => item.garmentId === project.garmentId && item.releaseVersionId === versionId && item.status === 'released');
  if (!spec) throw new Error('Technical excerpts require a released Technical Studio spec pinned to the selected garment version.');
  const existing = state.portfolioTechnicalExcerpts.find((item) => item.projectId === projectId);
  const excerpt: CanonicalPortfolioTechnicalExcerpt = touch(existing ? { ...existing, ...input, publicDownloadAssetId: input.publicDownloadAssetId ?? existing.publicDownloadAssetId } : {
    ...newRecord(state.studioId), approvedAt: new Date().toISOString(), garmentVersionId: versionId, profileId: project.profileId,
    projectId, publicDownloadAssetId: input.publicDownloadAssetId ?? null, summary: input.summary.trim(), title: input.title.trim(), visible: true,
  });
  return { excerpt, state: { ...state, portfolioProjects: state.portfolioProjects.map((item) => item.id === projectId ? touch({ ...item, includeTechnicalExcerpt: true }) : item), portfolioTechnicalExcerpts: existing ? state.portfolioTechnicalExcerpts.map((item) => item.id === existing.id ? excerpt : item) : [...state.portfolioTechnicalExcerpts, excerpt] } };
}

export async function buildPublicCutPreview(state: CanonicalWorkspaceState, profileId: string): Promise<PublicCutPreview> {
  const profile = required(state.portfolioProfiles.find((item) => item.id === profileId), 'Portfolio profile');
  const publicationSeed = profile.id;
  const selectedProjects = state.portfolioProjects.filter((item) => item.profileId === profileId && item.visibility !== 'private').sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedEditorials = state.portfolioEditorials.filter((item) => item.profileId === profileId && item.visibility !== 'private').sort((a, b) => a.sortOrder - b.sortOrder);
  const allAssetIds = new Set<string>([
    ...(profile.avatarAssetId ? [profile.avatarAssetId] : []),
    ...selectedProjects.flatMap((item) => item.selectedAssetIds),
    ...selectedEditorials.flatMap((item) => item.selectedAssetIds),
    ...state.portfolioTechnicalExcerpts.filter((item) => item.visible).flatMap((item) => item.publicDownloadAssetId ? [item.publicDownloadAssetId] : []),
  ]);
  const manifest = buildMediaManifest(state, [...allAssetIds], publicationSeed);
  const publicImages = new Map(manifest.map((item) => [item.sourceAssetId, imageFromManifest(item)]));
  const projectSnapshots = selectedProjects.map((item) => projectSnapshot(state, item, publicImages));
  const editorialSnapshots = selectedEditorials.map((item) => editorialSnapshot(state, item, publicImages));
  const generatedAt = latestTimestamp([profile, ...selectedProjects, ...selectedEditorials]);
  const snapshot = {
    editorials: editorialSnapshots,
    generatedAt,
    profile: {
      ...(profile.avatarAssetId && publicImages.get(profile.avatarAssetId) ? { avatar: publicImages.get(profile.avatarAssetId) } : {}),
      bio: profile.bio, displayName: profile.displayName, ...(profile.email ? { email: profile.email } : {}), headline: profile.headline,
      ...(profile.location ? { location: profile.location } : {}), ...(profile.resumePublicUrl ? { resumeUrl: profile.resumePublicUrl } : {}), usernameSlug: profile.usernameSlug,
    },
    projects: projectSnapshots,
  } as PortfolioHomepageSnapshot;
  const findings = privacyScanPublicCut(snapshot);
  const sourceVersions = [
    ...selectedProjects.map((item) => ({ entityId: item.id, label: state.garments.find((garment) => garment.id === item.garmentId)?.title ?? item.slug, versionId: item.sourceVersionId ?? '' })),
    ...selectedEditorials.map((item) => ({ entityId: item.id, label: state.editorialCollections.find((collection) => collection.id === item.collectionId)?.title ?? item.slug, versionId: item.sourceVersionId ?? '' })),
  ];
  const warnings = [
    ...sourceVersions.filter((item) => !item.versionId).map((item) => `${item.label} needs an approved source version.`),
    ...allAssetIds.size !== manifest.length ? ['One or more selected assets lack rights-cleared portfolio derivatives.'] : [],
    ...selectedProjects.length === 0 ? ['Select at least one public project.'] : [],
  ];
  const isStale = selectedProjects.some((item) => item.sourceVersionId !== latestGarmentVersion(state, item.garmentId)?.id)
    || selectedEditorials.some((item) => {
      const collection = state.editorialCollections.find((candidate) => candidate.id === item.collectionId);
      return Boolean(collection && item.sourceVersionId !== (collection.primaryGarmentVersionId ?? latestGarmentVersion(state, collection.primaryGarmentId)?.id));
    });
  return { checksum: await sha256Hex({ manifest: manifest.map(({ checksum, copiedFromChecksum, role, sourceAssetId }) => ({ checksum, copiedFromChecksum, role, sourceAssetId })), snapshot }), findings, isStale, manifest, snapshot, sourceVersions, warnings };
}

export async function publishPublicCut(state: CanonicalWorkspaceState, profileId: string, actorId: string, online = true) {
  if (!online) throw new Error('Publishing requires a fresh server connection.');
  const preview = await buildPublicCutPreview(state, profileId);
  if (preview.findings.length) throw new Error('The Public Cut failed its privacy scan.');
  if (preview.isStale) throw new Error('Refresh stale source versions before publishing.');
  if (preview.warnings.length) throw new Error(preview.warnings[0]);
  const profile = required(state.portfolioProfiles.find((item) => item.id === profileId), 'Portfolio profile');
  const publishedAt = new Date().toISOString();
  const next = state.publications.map((item) => item.profileId === profileId && item.isCurrent ? { ...item, isCurrent: false, isPublic: false, unpublishedAt: publishedAt } : item);
  const sources: Array<{ id: string; path: string; revision: number; type: CanonicalPublication['publicationType']; versionId: string | null }> = [
    { id: profile.id, path: `/portfolio/${profile.usernameSlug}`, revision: profile.revision, type: 'profile', versionId: null },
    ...state.portfolioProjects.filter((item) => item.profileId === profileId && item.visibility !== 'private').map((item) => ({ id: item.id, path: `/portfolio/${profile.usernameSlug}/${item.slug}`, revision: item.revision, type: 'project' as const, versionId: item.sourceVersionId })),
    ...state.portfolioEditorials.filter((item) => item.profileId === profileId && item.visibility !== 'private').map((item) => ({ id: item.collectionId, path: `/portfolio/${profile.usernameSlug}/editorials/${item.slug}`, revision: item.revision, type: 'editorial' as const, versionId: item.sourceVersionId })),
  ];
  const publications = await Promise.all(sources.map(async (source) => {
    const record: CanonicalPublication = {
      ...newRecord(state.studioId), checksum: preview.checksum, createdBy: actorId, isCurrent: true, isPublic: true,
      mediaManifest: preview.manifest, profileId, publicPath: source.path, publicationType: source.type, publishedAt,
      snapshot: preview.snapshot as unknown as Record<string, unknown>, sourceId: source.id, sourceRevision: source.revision,
      sourceVersionId: source.versionId, unpublishedAt: null,
    };
    return record;
  }));
  return { preview, publications, state: { ...state, portfolioProjects: state.portfolioProjects.map((item): CanonicalPortfolioProject => item.profileId === profileId && item.visibility !== 'private' ? touch({ ...item, visibility: 'published' }) : item), portfolioEditorials: state.portfolioEditorials.map((item): CanonicalPortfolioEditorial => item.profileId === profileId && item.visibility !== 'private' ? touch({ ...item, visibility: 'published' }) : item), publications: [...next, ...publications] } };
}

export function unpublishPublicCut(state: CanonicalWorkspaceState, profileId: string, online = true) {
  if (!online) throw new Error('Unpublishing requires a fresh server connection.');
  const unpublishedAt = new Date().toISOString();
  return { ...state, publications: state.publications.map((item) => item.profileId === profileId && item.isCurrent ? { ...item, isCurrent: false, isPublic: false, unpublishedAt } : item) };
}

export function publicationHistory(state: CanonicalWorkspaceState, profileId: string) {
  return state.publications.filter((item) => item.profileId === profileId).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function privacyScanPublicCut(payload: unknown): PrivacyFinding[] {
  const findings: PrivacyFinding[] = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return [{ key: '$', path: '$', reason: 'A Public Cut must be an object.' }];
  for (const key of Object.keys(payload)) if (!ROOT_KEYS.has(key)) findings.push({ key, path: `$.${key}`, reason: 'The root key is not on the publication allowlist.' });
  visit(payload, '$', findings);
  return findings;
}

function visit(value: unknown, path: string, findings: PrivacyFinding[]) {
  if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${path}[${index}]`, findings));
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
    if (!PUBLIC_KEYS.has(key)) findings.push({ key, path: `${path}.${key}`, reason: 'The nested key is not on the Public Cut allowlist.' });
    if (PRIVATE_KEYS.has(normalized)) findings.push({ key, path: `${path}.${key}`, reason: 'Private Studio data is blocked from Public Cuts.' });
    if ((key === 'src' || key.toLowerCase().includes('path')) && typeof item === 'string' && (/^(studios|users)\//.test(item) || item.includes('/private/'))) findings.push({ key, path: `${path}.${key}`, reason: 'Private storage references cannot be published.' });
    visit(item, `${path}.${key}`, findings);
  }
}

function projectSnapshot(state: CanonicalWorkspaceState, project: CanonicalPortfolioProject, images: Map<string, PortfolioImageSnapshot>): PortfolioProjectSnapshot {
  const garment = required(state.garments.find((item) => item.id === project.garmentId), 'Garment');
  const brief = state.designBriefs.find((item) => item.garmentId === garment.id);
  const selectedImages = project.selectedAssetIds.map((id) => images.get(id)).filter((item): item is PortfolioImageSnapshot => Boolean(item));
  const excerpt = project.includeTechnicalExcerpt ? state.portfolioTechnicalExcerpts.find((item) => item.projectId === project.id && item.visible) : undefined;
  return {
    caseStudy: { ...project.caseStudy }, coverImage: selectedImages[0], description: project.caseStudy.overview || garment.title,
    editorials: [], featured: project.featured, featuredImages: selectedImages.slice(1), generatedAt: latestTimestamp([project, garment]), materials: [],
    overview: { collection: state.collections.find((item) => item.id === garment.collectionId)?.name ?? '', colorStory: brief?.colorStory ?? '', designIntent: brief?.intent ?? '', garmentType: garment.garmentType, season: state.collections.find((item) => item.id === garment.collectionId)?.season ?? '', silhouette: brief?.silhouette ?? '', targetWearer: brief?.targetWearer ?? '' },
    process: project.caseStudy.processSummary ? { phase: 'Approved process', progress: 100 } : undefined,
    skills: [...project.caseStudy.skills], slug: project.slug, sortOrder: project.sortOrder, title: garment.title, updatedAt: garment.updatedAt,
    visibleSections: { overview: true, gallery: selectedImages.length > 1, materials: false, skills: true, process: Boolean(project.caseStudy.processSummary), editorials: false, downloads: Boolean(excerpt) } as PortfolioProjectSnapshot['visibleSections'],
    ...(excerpt ? { technicalExcerpt: { approvedAt: excerpt.approvedAt, approvedVersionId: excerpt.garmentVersionId, downloadUrl: excerpt.publicDownloadAssetId ? images.get(excerpt.publicDownloadAssetId)?.src : undefined, summary: excerpt.summary, title: excerpt.title } } : {}),
  } as unknown as PortfolioProjectSnapshot;
}

function editorialSnapshot(state: CanonicalWorkspaceState, selection: CanonicalPortfolioEditorial, images: Map<string, PortfolioImageSnapshot>): PortfolioEditorialSnapshot {
  const collection = required(state.editorialCollections.find((item) => item.id === selection.collectionId), 'Editorial collection');
  const scenes = state.editorialScenes.filter((item) => item.collectionId === collection.id && selection.selectedSceneIds.includes(item.id)).sort((a, b) => a.sortOrder - b.sortOrder).map((scene, index) => ({
    background: { type: 'color' as const, value: String(scene.background.color ?? '#111111') },
    blocks: state.editorialBlocks.filter((item) => item.sceneId === scene.id && PUBLIC_EDITORIAL_BLOCK_TYPES.has(item.blockType)).sort((a, b) => a.sortOrder - b.sortOrder).map((block, blockIndex) => ({ content: sanitizePublicEditorialContent(block.content, images), key: `block-${block.id}`, order: blockIndex, type: block.blockType as never })),
    description: scene.description, key: `scene-${scene.id}`, narrativeRole: scene.narrativeRole as never, order: index, sceneType: scene.sceneType as never,
    subtitle: scene.subtitle, title: scene.title, transition: { type: String(scene.transition.type ?? 'fade') as never },
  }));
  const selectedImages = selection.selectedAssetIds.map((id) => images.get(id)).filter((item): item is PortfolioImageSnapshot => Boolean(item));
  return { cover: { fit: 'cover', image: selectedImages[0] }, description: collection.description, generatedAt: latestTimestamp([selection, collection]), images: selectedImages, key: `editorial:${selection.id}`, scenes, slug: selection.slug, subtitle: collection.subtitle, templateType: collection.templateType as never, themeId: collection.themeId ?? 'mystic-lore', title: collection.title };
}

const EDITORIAL_CONTENT_KEYS = new Set([
  'align', 'alignment', 'alt', 'attribution', 'body', 'caption', 'colorHex',
  'columns', 'composition', 'eyebrow', 'heading', 'images', 'items', 'label', 'layout', 'name',
  'quote', 'rows', 'size', 'style', 'subtitle', 'text', 'title', 'tone', 'value', 'values',
]);

/** Copies editorial presentation data through a nested allowlist and rewrites selected asset IDs to public references. */
export function sanitizePublicEditorialContent(value: unknown, images: ReadonlyMap<string, PortfolioImageSnapshot>): EditorialJsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizePublicEditorialContent(item, images));
  if (typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const output: Record<string, EditorialJsonValue> = {};
  for (const key of ['assetId', 'imageId', 'sourceAssetId']) {
    const assetId = source[key];
    const image = typeof assetId === 'string' ? images.get(assetId) : undefined;
    if (image) output.imageReference = image.reference;
  }
  for (const [key, item] of Object.entries(source)) {
    if (!EDITORIAL_CONTENT_KEYS.has(key)) continue;
    output[key] = sanitizePublicEditorialContent(item, images);
  }
  if (typeof source.imageReference === 'string' && [...images.values()].some((image) => image.reference === source.imageReference)) output.imageReference = source.imageReference;
  return output;
}

function buildMediaManifest(state: CanonicalWorkspaceState, assetIds: string[], publicationId: string) {
  return assetIds.flatMap((assetId, index): CanonicalPublicationAssetManifest[] => {
    const asset = state.mediaAssets.find((item) => item.id === assetId);
    const derivative = state.mediaDerivatives.find((item) => item.assetId === assetId && ['portfolio', 'export'].includes(item.variant));
    if (!asset || !derivative || !hasPublicRights(asset)) return [];
    const publicationAssetId = derivative.id;
    const extension = asset.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
    return [{ altText: asset.name, checksum: derivative.checksum, copiedFromChecksum: derivative.checksum, mimeType: asset.mimeType, publicationAssetId, publicStoragePath: `publications/${publicationId}/${publicationAssetId}/asset-${index + 1}.${extension}`, role: index === 0 ? 'cover' : 'gallery', sourceAssetId: asset.id, sourceDerivativeId: derivative.id }];
  });
}

function imageFromManifest(item: CanonicalPublicationAssetManifest): PortfolioImageSnapshot {
  return { alt: item.altText, fit: 'cover', positionX: 50, positionY: 50, reference: `publication-asset:${item.publicationAssetId}`, src: `/storage/v1/object/public/portfolio-assets/${item.publicStoragePath}`, usage: [item.role], zoom: 1 };
}

function hasPublicRights(asset: CanonicalMediaAsset) { return Boolean(asset.rights.license?.trim()) && (!asset.rights.expiresAt || new Date(asset.rights.expiresAt).getTime() > Date.now()); }
function latestGarmentVersion(state: CanonicalWorkspaceState, garmentId: string) { return [...state.garmentVersions].filter((item) => item.garmentId === garmentId).sort((a, b) => b.versionNo - a.versionNo)[0]; }
function latestTimestamp(rows: Array<Pick<CanonicalRecord, 'updatedAt'>>) { return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.updatedAt ?? new Date(0).toISOString(); }
function caseStudyPatch(input: ProjectInput) { const { featured: _featured, selectedAssetIds: _assets, slug: _slug, visibility: _visibility, ...copy } = input; return copy; }
function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'portfolio'; }
function required<T>(value: T | null | undefined, label: string): T { if (value == null) throw new Error(`${label} is required.`); return value; }
function newRecord(studioId: string): CanonicalRecord { const now = new Date().toISOString(); return { createdAt: now, id: crypto.randomUUID(), revision: 1, studioId, updatedAt: now }; }
function touch<T extends CanonicalRecord>(record: T): T { return { ...record, revision: record.revision + 1, updatedAt: new Date().toISOString() }; }

export function publicCutFingerprint(preview: PublicCutPreview) { return stableStringify({ checksum: preview.checksum, manifest: preview.manifest, snapshot: preview.snapshot }); }
