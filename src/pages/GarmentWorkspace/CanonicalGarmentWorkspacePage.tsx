import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Camera, ImagePlus, Palette, Trash2 } from 'lucide-react';
import { Badge } from '../../components/shared/Badge';
import { Button } from '../../components/shared/Button';
import { CanonicalMediaImage } from '../../components/shared/CanonicalMediaImage';
import { CanonicalMediaLightbox } from '../../components/shared/CanonicalMediaLightbox';
import { CanonicalWorkspaceState } from '../../components/shared/CanonicalWorkspaceState';
import { Card } from '../../components/shared/Card';
import { RelationshipPicker } from '../../components/shared/RelationshipPicker';
import { useCanonicalWorkspace } from '../../hooks/useCanonicalWorkspace';
import { garmentLenses, type GarmentLens } from '../../domains/garments/contracts';
import { cn } from '../../lib/classes';
import { canonicalGarmentCover, canonicalGarmentSwatches, canonicalInspirationReferences, recommendedGarmentAction, type CanonicalInspirationReference } from '../../lib/canonicalGarmentPresentation';
import { MAX_INSPIRATION_FIELD_IMAGES } from '../../domains/workspace';

export function CanonicalGarmentWorkspacePage({ garmentId, onBack }: { garmentId: string; onBack: () => void }) {
  const { deleteGarment, removeInspirationReference, state, syncState, uploadGarmentMedia, uploadInspirationMedia } = useCanonicalWorkspace();
  const [lens, setLens] = useState<GarmentLens>('overview');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [referenceToRemove, setReferenceToRemove] = useState<CanonicalInspirationReference | null>(null);
  const [viewerAssetId, setViewerAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const inspirationTriggerRef = useRef<HTMLElement | null>(null);
  const uploadRoleRef = useRef<'hero' | 'reference'>('hero');
  const garment = state?.garments.find((item) => item.id === garmentId);
  const collection = state?.collections.find((item) => item.id === garment?.collectionId);

  if (!garment || !state) return <CanonicalWorkspaceState><Card><h1 className="font-display text-3xl">Garment not found</h1><p className="mt-3 text-sm text-stardust/65">It may have been removed in another session.</p><Button className="mt-4" icon={<ArrowLeft aria-hidden="true" size={16}/>} onClick={onBack}>Return to garment library</Button></Card></CanonicalWorkspaceState>;

  const brief = state.designBriefs.find((item) => item.garmentId === garmentId);
  const cover = canonicalGarmentCover(state, garmentId);
  const swatches = canonicalGarmentSwatches(state, garmentId, 6);
  const inspirationReferences = canonicalInspirationReferences(state, garmentId);
  const referenceAssets = inspirationReferences.map((reference) => reference.asset).slice(0, MAX_INSPIRATION_FIELD_IMAGES);
  const nextAction = recommendedGarmentAction(garment);
  const remove = () => { deleteGarment(garment.id); onBack(); };
  const beginUpload = (role: 'hero' | 'reference') => { uploadRoleRef.current = role; setUploadNotice(null); uploadInputRef.current?.click(); };
  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const role = uploadRoleRef.current;
    setUploading(true);
    setUploadNotice(`Preparing ${file.name}…`);
    try {
      if (role === 'reference' && inspirationReferences.length >= MAX_INSPIRATION_FIELD_IMAGES) {
        throw new Error(`The Inspiration Field holds up to ${MAX_INSPIRATION_FIELD_IMAGES} images. Remove one before adding another.`);
      }
      await (role === 'reference'
        ? uploadInspirationMedia(garmentId, file)
        : uploadGarmentMedia(garmentId, file, cover ? 'gallery' : 'hero'));
      setUploadNotice(role === 'hero' ? 'Garment image added.' : 'Reference added to the inspiration field.');
    } catch (error) {
      setUploadNotice(error instanceof Error ? error.message : 'The image could not be added.');
    } finally {
      setUploading(false);
    }
  };
  const confirmReferenceRemoval = () => {
    if (!referenceToRemove) return;
    removeInspirationReference(garmentId, referenceToRemove.item.id);
    if (viewerAssetId === referenceToRemove.asset.id) setViewerAssetId(null);
    setReferenceToRemove(null);
    setUploadNotice('Reference removed from this garment. The original private file remains safe in the Studio.');
  };
  const continueIntoPhase = () => setLens(({ brief: 'design', design: 'design', materials: 'design', technical: 'technical', sampling: 'production', production: 'production', story: 'editorial', portfolio: 'portfolio' } as Record<string, GarmentLens>)[garment.phase] ?? 'overview');

  return <CanonicalWorkspaceState><section className="min-w-0 space-y-7 overflow-x-hidden lg:space-y-9">
    <input accept="image/*" aria-label="Upload garment image" className="sr-only" onChange={(event) => void upload(event)} ref={uploadInputRef} type="file" />
    <article className="relative isolate overflow-hidden rounded-[1.7rem] border border-bronze/24 bg-midnight/62 shadow-[0_28px_80px_rgba(0,0,0,0.28)]" data-testid="garment-inspiration-hero">
      <div className="grid min-w-0 lg:min-h-[35rem] lg:grid-cols-[1.2fr_0.8fr]">
        <div className="relative min-h-[19rem] sm:min-h-[27rem] lg:min-h-full">
          <CanonicalMediaImage alt={`${garment.title} hero`} asset={cover} className="absolute inset-0 rounded-none border-0" derivatives={state.mediaDerivatives} mode="hero" priority />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.08),transparent_45%,rgba(10,10,10,0.62))] lg:bg-[linear-gradient(90deg,transparent_56%,rgba(10,10,10,0.7))]" />
          <div className="absolute left-4 top-4 flex gap-2 sm:left-6 sm:top-6"><Button className="bg-midnight/72 backdrop-blur-md" icon={<ArrowLeft aria-hidden="true" size={16}/>} onClick={onBack} size="sm" variant="secondary">Library</Button></div>
          <Button className="absolute bottom-5 left-5 bg-midnight/74 backdrop-blur-md sm:bottom-6 sm:left-6" disabled={uploading} icon={<Camera aria-hidden="true" size={16}/>} onClick={() => beginUpload('hero')} size="sm" variant="secondary">{cover ? 'Add another view' : 'Add garment image'}</Button>
        </div>
        <div className="flex min-w-0 max-w-full flex-col justify-between overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><PhasePill phase={garment.phase} />{garment.status === 'on_hold' ? <Badge variant="ember">On hold</Badge> : null}<span className="text-xs text-stardust/38">{syncState === 'ready' ? 'Saved' : syncState}</span></div><p className="mt-8 text-[0.66rem] uppercase tracking-[0.2em] text-ember/74">{collection?.name ?? 'Independent piece'}</p><h1 aria-label={garment.title} className="font-display mt-3 flex max-w-full flex-wrap gap-x-[0.28em] text-[2.15rem] leading-[1.02] text-stardust sm:text-5xl xl:text-6xl">{garment.title.split(/\s+/).map((word, index) => <span aria-hidden="true" className="basis-full sm:basis-auto" key={`${word}-${index}`}>{word}</span>)}</h1><p className="mt-5 max-w-xl text-base leading-7 text-stardust/64">{brief?.intent || 'Describe what this garment should make someone feel, how it should move, and the world it belongs to.'}</p></div>
          <div className="mt-9"><MaterialStrip swatches={swatches} /><div className="mt-7 border-t border-bronze/18 pt-6"><p className="text-[0.64rem] uppercase tracking-[0.18em] text-stardust/38">Next move</p><h2 className="mt-2 text-xl font-semibold text-stardust">{nextAction.label}</h2><p className="mt-2 text-sm leading-6 text-stardust/52">{nextAction.detail}</p><Button className="mt-5 w-full sm:w-auto" icon={<ArrowRight aria-hidden="true" size={16}/>} onClick={continueIntoPhase} variant="primary">{nextAction.label}</Button></div></div>
        </div>
      </div>
    </article>
    {uploadNotice ? <p aria-live="polite" className={cn('rounded-xl px-4 py-3 text-sm', uploadNotice.includes('could not') || uploadNotice.includes('Choose') ? 'bg-ember/10 text-ember' : 'bg-teal/10 text-teal')}>{uploadNotice}</p> : null}

    <InspirationField
      garmentTitle={garment.title}
      onOpen={(assetId, trigger) => { inspirationTriggerRef.current = trigger; setViewerAssetId(assetId); }}
      onRemove={setReferenceToRemove}
      onUpload={() => beginUpload('reference')}
      references={inspirationReferences.slice(0, MAX_INSPIRATION_FIELD_IMAGES)}
      state={state}
      uploading={uploading}
    />

    <nav aria-label="Garment workspace" className="atelier-tablist">{garmentLenses.map((item) => <button aria-current={lens === item ? 'page' : undefined} className={cn('min-h-11 shrink-0 rounded-xl px-4 text-sm capitalize transition focus:outline-none focus:ring-2 focus:ring-ember/60', lens === item ? 'bg-ember text-midnight' : 'text-stardust/58 hover:bg-stardust/[0.05] hover:text-stardust')} key={item} onClick={() => setLens(item)} type="button">{designerLensLabel(item)}</button>)}</nav>
    {lens === 'overview' ? <Overview garmentId={garment.id} /> : null}
    {lens === 'design' ? <DesignStudio garmentId={garment.id} onUploadReference={() => beginUpload('reference')} uploading={uploading} /> : null}
    {lens === 'technical' ? <TechnicalLens garmentId={garment.id} /> : null}
    {lens === 'production' || lens === 'editorial' || lens === 'portfolio' ? <DeferredLens lens={lens} /> : null}

    <details className="rounded-2xl border border-bronze/16 bg-stardust/[0.018] p-4"><summary className="cursor-pointer text-sm text-stardust/48">Garment record and workspace options</summary><div className="mt-5 grid gap-5 border-t border-bronze/14 pt-5 sm:grid-cols-3"><Info label="Garment code" value={garment.garmentCode}/><Info label="Revision" value={String(garment.revision)}/><Info label="Collection" value={collection?.name ?? 'Unassigned'}/></div>{confirmDelete ? <div className="mt-6 rounded-xl border border-ember/50 bg-ember/10 p-3"><p className="text-sm leading-5">Delete this garment and its design/material links? This cannot be undone from the workspace.</p><div className="mt-3 flex gap-2"><Button onClick={remove} size="sm" variant="primary">Delete garment</Button><Button onClick={() => setConfirmDelete(false)} size="sm">Cancel</Button></div></div> : <Button className="mt-6" icon={<Trash2 aria-hidden="true" size={15}/>} onClick={() => setConfirmDelete(true)} size="sm" variant="ghost">Delete garment</Button>}</details>
    {viewerAssetId ? <CanonicalMediaLightbox assets={referenceAssets} derivatives={state.mediaDerivatives} initialAssetId={viewerAssetId} label={garment.title} onClose={() => setViewerAssetId(null)} returnFocusTo={inspirationTriggerRef.current} /> : null}
    {referenceToRemove ? <RemoveInspirationReferenceDialog onCancel={() => setReferenceToRemove(null)} onConfirm={confirmReferenceRemoval} reference={referenceToRemove} /> : null}
  </section></CanonicalWorkspaceState>;
}

function InspirationField({ garmentTitle, onOpen, onRemove, onUpload, references, state, uploading }: { garmentTitle: string; onOpen: (assetId: string, trigger: HTMLElement) => void; onRemove: (reference: CanonicalInspirationReference) => void; onUpload: () => void; references: CanonicalInspirationReference[]; state: NonNullable<ReturnType<typeof useCanonicalWorkspace>['state']>; uploading: boolean }) {
  const isFull = references.length >= MAX_INSPIRATION_FIELD_IMAGES;
  return <section aria-labelledby="inspiration-field-heading" data-testid="inspiration-field"><div className="mb-4 flex flex-wrap items-end justify-between gap-4"><div><p className="text-[0.65rem] uppercase tracking-[0.2em] text-ember/70">Visual language</p><h2 className="font-display mt-2 text-3xl text-stardust" id="inspiration-field-heading">Inspiration field</h2><p className="mt-2 text-sm text-stardust/46">Reference imagery and moodboard fragments that keep the creative intention visible.</p><p aria-live="polite" className="mt-2 text-xs text-stardust/42">{references.length} of {MAX_INSPIRATION_FIELD_IMAGES} references{isFull ? ' · Remove one to add another.' : ''}</p></div><Button disabled={uploading || isFull} icon={<ImagePlus aria-hidden="true" size={16}/>} onClick={onUpload} size="sm" variant="ghost">{isFull ? 'Inspiration field full' : 'Add reference'}</Button></div>{references.length ? <div className="grid auto-rows-[10rem] grid-cols-2 gap-3 sm:auto-rows-[13rem] md:grid-cols-4">{references.map((reference, index) => <InspirationImageTile alt={`${garmentTitle} reference ${index + 1}`} className={index === 0 ? 'col-span-2 row-span-2' : 'h-full w-full'} derivatives={state.mediaDerivatives} key={reference.item.id} onOpen={onOpen} onRemove={onRemove} reference={reference} />)}</div> : <button className="atelier-empty-state flex min-h-[15rem] w-full flex-col items-center justify-center transition hover:border-ember/45 hover:bg-stardust/[0.025]" disabled={uploading} onClick={onUpload} type="button"><ImagePlus aria-hidden="true" className="text-ember/58" size={30}/><span className="mt-4 text-sm font-medium text-stardust/72">Build the visual world</span><span className="mt-2 max-w-md text-sm leading-6 text-stardust/42">Add silhouette references, color moments, details, and atmosphere. Your files stay private in the Studio.</span></button>}</section>;
}

function InspirationImageTile({ alt, className, derivatives, onOpen, onRemove, reference }: { alt: string; className: string; derivatives: NonNullable<ReturnType<typeof useCanonicalWorkspace>['state']>['mediaDerivatives']; onOpen: (assetId: string, trigger: HTMLElement) => void; onRemove: (reference: CanonicalInspirationReference) => void; reference: CanonicalInspirationReference }) {
  return <div className={cn('group relative isolate min-h-0 overflow-hidden rounded-2xl border border-bronze/20 bg-midnight/60 shadow-[0_14px_35px_rgba(0,0,0,0.2)] transition duration-200 hover:-translate-y-0.5 hover:border-ember/45 hover:shadow-[0_20px_45px_rgba(0,0,0,0.3)] motion-reduce:transform-none motion-reduce:transition-none', className)}><CanonicalMediaImage alt={alt} asset={reference.asset} className="absolute inset-0 h-full w-full border-0 transition duration-300 group-hover:scale-[1.015] motion-reduce:transform-none motion-reduce:transition-none" derivatives={derivatives} fit="cover" interactiveClassName="absolute inset-0 z-10 overflow-hidden rounded-[inherit]" mode="thumbnail" onActivate={(event) => onOpen(reference.asset.id, event.currentTarget)} /><span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-midnight/58 via-transparent to-transparent opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"><span className="absolute bottom-3 left-3 rounded-full border border-stardust/18 bg-midnight/72 px-3 py-1.5 text-xs font-medium text-stardust shadow-lg backdrop-blur-xl">View full image</span></span><button aria-label={`Remove ${alt} from this garment`} className="absolute right-3 top-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stardust/18 bg-midnight/74 text-stardust/78 opacity-0 shadow-lg backdrop-blur-xl transition hover:border-ember/65 hover:bg-ember/16 hover:text-stardust focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember group-hover:opacity-100 motion-reduce:transition-none" onClick={() => onRemove(reference)} type="button"><Trash2 aria-hidden="true" size={17}/></button></div>;
}

function RemoveInspirationReferenceDialog({ onCancel, onConfirm, reference }: { onCancel: () => void; onConfirm: () => void; reference: CanonicalInspirationReference }) {
  return <div aria-describedby="remove-inspiration-description" aria-labelledby="remove-inspiration-title" aria-modal="true" className="fixed inset-0 z-[145] flex items-end justify-center bg-midnight/82 p-4 backdrop-blur-xl sm:items-center" role="dialog"><div className="w-full max-w-md rounded-[1.5rem] border border-bronze/30 bg-[#11100f] p-5 shadow-2xl sm:p-7"><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember">Inspiration field</p><h2 className="font-display mt-2 text-3xl" id="remove-inspiration-title">Remove this reference?</h2><p className="mt-4 text-sm leading-6 text-stardust/62" id="remove-inspiration-description"><span className="font-medium text-stardust">{reference.asset.name}</span> will be removed from this garment’s Inspiration Field. Its original private file stays safe in the Studio and any other use remains unchanged.</p><div className="mt-7 flex flex-wrap justify-end gap-3"><Button onClick={onCancel} type="button" variant="ghost">Keep reference</Button><Button icon={<Trash2 aria-hidden="true" size={16}/>} onClick={onConfirm} type="button">Remove from garment</Button></div></div></div>;
}

function Overview({ garmentId }: { garmentId: string }) { const { state } = useCanonicalWorkspace(); const garment = state!.garments.find((item) => item.id === garmentId)!; const brief = state!.designBriefs.find((item) => item.garmentId === garmentId); const materials = state!.garmentMaterials.filter((item) => item.garmentId === garmentId); return <section className="space-y-5" aria-labelledby="creative-direction-heading"><div className="grid gap-5 xl:grid-cols-[1fr_0.72fr]"><div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember/70">Creative direction</p><h2 className="font-display mt-2 text-3xl" id="creative-direction-heading">The idea behind the piece</h2><p className="mt-4 max-w-3xl text-base leading-7 text-stardust/58">{brief?.intent || 'The creative direction is still open. Move into Design to describe the feeling, silhouette, wearer, and color story.'}</p>{brief?.keyFeatures.length ? <div className="mt-5 flex flex-wrap gap-2">{brief.keyFeatures.map((feature) => <span className="rounded-full bg-stardust/[0.05] px-3 py-2 text-xs text-stardust/66" key={feature}>{feature}</span>)}</div> : null}</div><div className="rounded-[1.25rem] bg-stardust/[0.025] p-5"><p className="text-sm font-medium text-stardust/72">At a glance</p><dl className="mt-4 grid grid-cols-2 gap-4"><Info label="Silhouette" value={brief?.silhouette || 'Open'}/><Info label="Color story" value={brief?.colorStory || 'Open'}/><Info label="Wearer" value={brief?.targetWearer || 'Open'}/><Info label="Materials" value={`${materials.length} selected`}/></dl></div></div><div className="border-t border-bronze/14 pt-5"><p className="text-xs text-stardust/36">Technical records, revisions, production evidence, and publishing controls remain available through the workspace tabs above. Garment {garment.garmentCode} · revision {garment.revision}.</p></div></section>; }

function DesignStudio({ garmentId, onUploadReference, uploading }: { garmentId: string; onUploadReference: () => void; uploading: boolean }) {
  const { addComponent, addMaterial, attachComponent, attachInspirationReference, attachMaterial, relationshipOptions, state, updateBrief } = useCanonicalWorkspace();
  const brief = state!.designBriefs.find((item) => item.garmentId === garmentId); const boards = state!.moodboards.filter((item) => item.garmentId === garmentId); const [showMaterialCreate, setShowMaterialCreate] = useState(false); const [showComponentCreate, setShowComponentCreate] = useState(false);
  const saveBrief = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); updateBrief(garmentId, { colorStory: String(form.get('colorStory') ?? ''), intent: String(form.get('intent') ?? ''), keyFeatures: String(form.get('features') ?? '').split(',').map((value) => value.trim()).filter(Boolean), silhouette: String(form.get('silhouette') ?? ''), targetWearer: String(form.get('targetWearer') ?? '') }); };
  const inspirationCount = canonicalInspirationReferences(state!, garmentId).length;
  const inspirationFull = inspirationCount >= MAX_INSPIRATION_FIELD_IMAGES;
  const imageOptions = relationshipOptions('asset').filter((option) => state!.mediaAssets.some((asset) => asset.id === option.id && asset.mimeType.startsWith('image/')));
  return <div className="grid gap-5 xl:grid-cols-[1fr_20rem]"><Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember/70">Design</p><h2 className="font-display mt-2 text-3xl">Shape the garment story</h2></div><Button disabled={uploading || inspirationFull} icon={<Palette aria-hidden="true" size={16}/>} onClick={onUploadReference} size="sm">{inspirationFull ? 'Inspiration field full' : 'Add inspiration'}</Button></div><form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={saveBrief}><Field defaultValue={brief?.intent} label="Creative description" name="intent" required/><Field defaultValue={brief?.targetWearer} label="Who is it for?" name="targetWearer"/><Field defaultValue={brief?.silhouette} label="Silhouette" name="silhouette"/><Field defaultValue={brief?.colorStory} label="Color story" name="colorStory"/><label className="md:col-span-2"><span className="field-label">Signature details</span><input className="field" defaultValue={brief?.keyFeatures.join(', ')} name="features" placeholder="Articulated sleeve, collar stand, …"/></label><div className="md:col-span-2"><Button type="submit" variant="primary">Save creative direction</Button></div></form></Card><Card><p className="text-xs uppercase tracking-[0.12em] text-ember/80">Moodboard</p><p className="mt-3 text-sm leading-6 text-stardust/62">{boards.length ? `${boards.length} board · ${inspirationCount} of ${MAX_INSPIRATION_FIELD_IMAGES} references` : 'No moodboard yet. Add inspiration to begin the visual field.'}</p></Card><div className="grid gap-4 xl:col-span-2 xl:grid-cols-2"><RelationshipPicker emptyLabel="No material variants yet. Create a reusable material inline." label="Choose a material" onCreateInline={() => setShowMaterialCreate(true)} onSelect={(id) => attachMaterial(garmentId, id, 'Shell Fabric')} options={relationshipOptions('material')} /><RelationshipPicker emptyLabel="No component variants yet. Create a reusable component inline." label="Choose a component" onCreateInline={() => setShowComponentCreate(true)} onSelect={(id) => attachComponent(garmentId, id)} options={relationshipOptions('component')} /></div><div className="xl:col-span-2"><RelationshipPicker disabled={inspirationFull} disabledMessage={`The Inspiration Field is full. Remove one of its ${MAX_INSPIRATION_FIELD_IMAGES} references before adding an existing Studio image.`} emptyLabel="No canonical imagery is available yet. Upload a private reference above." label="Use an image already in the Studio" onSelect={(id) => attachInspirationReference(garmentId, id)} options={imageOptions} /></div>{showMaterialCreate ? <InlineMaterial onCancel={() => setShowMaterialCreate(false)} onCreate={(name) => { const result = addMaterial({ category: 'Fabric', composition: '', name }); attachMaterial(garmentId, result.variantId, 'Shell Fabric'); setShowMaterialCreate(false); }}/> : null}{showComponentCreate ? <InlineComponent onCancel={() => setShowComponentCreate(false)} onCreate={(name) => { const result = addComponent({ category: 'Trim', name }); attachComponent(garmentId, result.variantId); setShowComponentCreate(false); }}/> : null}</div>;
}

function TechnicalLens({ garmentId }: { garmentId: string }) { return <Card><Badge variant="bronze">Technical Studio</Badge><h2 className="font-display mt-3 text-3xl">Turn the idea into instructions</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/65">Build flats, measurements, construction details, and release evidence without losing the garment’s visual direction.</p><a className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-ember px-4 text-sm font-semibold text-midnight" href={`#/technical/${garmentId}`}>Open Technical Studio</a></Card>; }
function DeferredLens({ lens }: { lens: GarmentLens }) { const copy = { production: ['Make the garment', 'Samples, fittings, costing, and production decisions stay connected to this piece.'], editorial: ['Tell the story', 'Compose the approved imagery and garment facts into an editorial world.'], portfolio: ['Present the work', 'Curate this garment into a focused case study and public presentation.'] } as const; const value = copy[lens as keyof typeof copy]; return <Card><p className="text-[0.65rem] uppercase tracking-[0.18em] text-ember/70">{designerLensLabel(lens)}</p><h2 className="font-display mt-2 text-3xl">{value?.[0] ?? 'Continue the garment'}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-stardust/65">{value?.[1]}</p></Card>; }
function MaterialStrip({ swatches }: { swatches: ReturnType<typeof canonicalGarmentSwatches> }) { return <div><p className="text-[0.64rem] uppercase tracking-[0.18em] text-stardust/38">Material story</p>{swatches.length ? <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{swatches.map((swatch) => <div className="min-w-[7.5rem] rounded-xl bg-stardust/[0.035] p-2" key={swatch.id}><span className="block h-12 rounded-lg ring-1 ring-inset ring-stardust/10" style={{ background: swatch.colorHex ?? 'linear-gradient(135deg,#9a6c3c,#1b3a63)' }} /><span className="mt-2 block truncate text-xs text-stardust/66">{swatch.materialName}</span><span className="mt-0.5 block truncate text-[0.65rem] text-stardust/36">{swatch.colorName}</span></div>)}</div> : <p className="mt-2 text-sm text-stardust/40">Materials are still open.</p>}</div>; }
function PhasePill({ phase }: { phase: string }) { return <span className="inline-flex min-h-7 items-center rounded-full bg-midnight/68 px-2.5 text-[0.64rem] font-medium uppercase tracking-[0.13em] text-ember ring-1 ring-bronze/28">{phase}</span>; }
function designerLensLabel(lens: GarmentLens) { return ({ overview: 'Story', design: 'Design', technical: 'Technical', production: 'Make', editorial: 'Editorial', portfolio: 'Portfolio' } as Record<GarmentLens, string>)[lens]; }
function InlineMaterial({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name') ?? '').trim(); if (value) onCreate(value); }; return <Card className="xl:col-span-2"><form className="flex flex-wrap gap-3" onSubmit={submit}><input autoFocus className="field min-w-52 flex-1" name="name" placeholder="Material name" required/><Button type="submit" variant="primary">Create and use</Button><Button onClick={onCancel}>Cancel</Button></form></Card>; }
function InlineComponent({ onCancel, onCreate }: { onCancel: () => void; onCreate: (name: string) => void }) { const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const value = String(new FormData(event.currentTarget).get('name') ?? '').trim(); if (value) onCreate(value); }; return <Card className="xl:col-span-2"><form className="flex flex-wrap gap-3" onSubmit={submit}><input autoFocus className="field min-w-52 flex-1" name="name" placeholder="Component name" required/><Button type="submit" variant="primary">Create and use</Button><Button onClick={onCancel}>Cancel</Button></form></Card>; }
function Field({ defaultValue, label, name, required }: { defaultValue?: string; label: string; name: string; required?: boolean }) { return <label><span className="field-label">{label}</span><input className="field" defaultValue={defaultValue} name={name} required={required}/></label>; }
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs uppercase tracking-[0.12em] text-stardust/38">{label}</dt><dd className="mt-1 text-sm text-stardust/76">{value}</dd></div>; }
