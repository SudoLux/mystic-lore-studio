import { supabase } from '../../lib/supabase';
import { sha256Hex } from '../migration/stableIdentity';
import type { CanonicalPublication, CanonicalPublicationAssetManifest, CanonicalWorkspaceState } from '../workspace';

/** Commits already-sanitized Public Cut drafts, copied bytes, and publish RPCs. */
export async function commitPublicCutToSupabase(state: CanonicalWorkspaceState, publications: readonly CanonicalPublication[]) {
  if (!supabase) return { mode: 'local' as const, publishedIds: publications.map((item) => item.id) };
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Sign in again before publishing a Public Cut.');
  const publishedIds: string[] = [];
  for (const publication of publications) {
    const manifest = publication.mediaManifest.map((item) => withPublicationPath(item, publication.id));
    const snapshot = replacePublicationPaths(publication.snapshot, publication.profileId, publication.id);
    const checksum = await sha256Hex({ manifest: manifest.map(({ checksum: value, copiedFromChecksum, role, sourceAssetId }) => ({ checksum: value, copiedFromChecksum, role, sourceAssetId })), snapshot });
    const projectId = publication.publicationType === 'project' ? publication.sourceId : null;
    const editorialId = publication.publicationType === 'editorial' ? publication.sourceId : null;
    const { error: insertError } = await supabase.schema('ml_public').from('publications').insert({
      checksum, created_by: authData.user.id, id: publication.id, is_current: false, is_public: false,
      media_manifest: manifest.map(manifestRow), portfolio_editorial_collection_id: editorialId,
      portfolio_project_id: projectId, profile_id: publication.profileId, public_path: publication.publicPath,
      publication_type: publication.publicationType, snapshot_json: snapshot, source_id: publication.sourceId,
      source_revision: publication.sourceRevision, source_version_id: publication.sourceVersionId, studio_id: publication.studioId,
    });
    if (insertError) throw new Error(`Could not stage ${publication.publicationType} Public Cut: ${insertError.message}`);
    try {
      for (const item of manifest) await copyPublicationAsset(state, publication, item);
      const { error: publishError } = await supabase.schema('ml_private').rpc('publish_publication', { p_publication_id: publication.id });
      if (publishError) throw publishError;
      publishedIds.push(publication.id);
    } catch (error) {
      await removeDraftArtifacts(publication.id, manifest);
      throw new Error(error instanceof Error ? error.message : `Could not publish ${publication.publicationType} Public Cut.`);
    }
  }
  return { mode: 'cloud' as const, publishedIds };
}

export async function unpublishPublicCutFromSupabase(profileId: string) {
  if (!supabase) return { mode: 'local' as const, unpublishedIds: [] as string[] };
  const { data, error } = await supabase.schema('ml_public').from('publications').select('id').eq('profile_id', profileId).eq('is_current', true);
  if (error) throw new Error(`Could not load current Public Cuts: ${error.message}`);
  const unpublishedIds: string[] = [];
  for (const row of data ?? []) {
    const publicationId = String(row.id);
    const { data: assets, error: assetError } = await supabase.schema('ml_public').from('publication_assets').select('storage_path').eq('publication_id', publicationId);
    if (assetError) throw new Error(`Could not load copied public media: ${assetError.message}`);
    const paths = (assets ?? []).map((item) => String(item.storage_path));
    if (paths.length) {
      const { error: removeError } = await supabase.storage.from('portfolio-assets').remove(paths);
      if (removeError) throw new Error(`Could not remove copied public media: ${removeError.message}`);
    }
    const { error: rpcError } = await supabase.schema('ml_private').rpc('unpublish_publication', { p_publication_id: publicationId });
    if (rpcError) throw new Error(`Could not unpublish Public Cut: ${rpcError.message}`);
    unpublishedIds.push(publicationId);
  }
  return { mode: 'cloud' as const, unpublishedIds };
}

async function copyPublicationAsset(state: CanonicalWorkspaceState, publication: CanonicalPublication, item: CanonicalPublicationAssetManifest) {
  const source = state.mediaDerivatives.find((candidate) => candidate.id === item.sourceDerivativeId && candidate.assetId === item.sourceAssetId);
  if (!source) throw new Error(`Selected media derivative ${item.sourceDerivativeId} is missing.`);
  const { data: bytes, error: downloadError } = await supabase!.storage.from('studio-assets').download(source.storagePath);
  if (downloadError || !bytes) throw new Error(`Could not read private derivative: ${downloadError?.message ?? 'missing object'}`);
  const asset = state.mediaAssets.find((candidate) => candidate.id === item.sourceAssetId);
  const { error: rowError } = await supabase!.schema('ml_public').from('publication_assets').insert({
    alt_text: item.altText, checksum: item.checksum, copied_from_checksum: item.copiedFromChecksum,
    height: asset?.height ?? null, id: item.publicationAssetId, mime_type: item.mimeType, publication_id: publication.id,
    rights_checked_at: new Date().toISOString(), role: item.role, size_bytes: asset?.sizeBytes ?? bytes.size,
    sort_order: publication.mediaManifest.findIndex((candidate) => candidate.sourceAssetId === item.sourceAssetId),
    source_asset_id: item.sourceAssetId, source_derivative_id: item.sourceDerivativeId, storage_path: item.publicStoragePath,
    studio_id: publication.studioId, width: asset?.width ?? null,
  });
  if (rowError) throw new Error(`Could not record copied derivative: ${rowError.message}`);
  const { error: uploadError } = await supabase!.storage.from('portfolio-assets').upload(item.publicStoragePath, bytes, { contentType: item.mimeType, upsert: false });
  if (uploadError) throw new Error(`Could not copy public derivative: ${uploadError.message}`);
}

async function removeDraftArtifacts(publicationId: string, manifest: readonly CanonicalPublicationAssetManifest[]) {
  const paths = manifest.map((item) => item.publicStoragePath);
  if (paths.length) await supabase!.storage.from('portfolio-assets').remove(paths);
  await supabase!.schema('ml_public').from('publication_assets').delete().eq('publication_id', publicationId);
  await supabase!.schema('ml_public').from('publications').delete().eq('id', publicationId).is('published_at', null);
}

function withPublicationPath(item: CanonicalPublicationAssetManifest, publicationId: string): CanonicalPublicationAssetManifest {
  const publicationAssetId = crypto.randomUUID();
  const parts = item.publicStoragePath.split('/');
  return { ...item, publicationAssetId, publicStoragePath: ['publications', publicationId, publicationAssetId, ...parts.slice(3)].join('/') };
}
function manifestRow(item: CanonicalPublicationAssetManifest) {
  return { altText: item.altText, checksum: item.checksum, copiedFromChecksum: item.copiedFromChecksum, mimeType: item.mimeType, publicationAssetId: item.publicationAssetId, publicStoragePath: item.publicStoragePath, role: item.role, sourceAssetId: item.sourceAssetId, sourceDerivativeId: item.sourceDerivativeId };
}
function replacePublicationPaths(snapshot: Record<string, unknown>, fromId: string, toId: string) {
  return JSON.parse(JSON.stringify(snapshot).replaceAll(`/publications/${fromId}/`, `/publications/${toId}/`)) as Record<string, unknown>;
}
