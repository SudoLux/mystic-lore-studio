import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  FileText,
  Image as ImageIcon,
  Images,
  Layers3,
  MessageSquareText,
  Minus,
  Monitor,
  MoreHorizontal,
  PanelRightOpen,
  Play,
  Plus,
  Quote,
  Redo2,
  Save,
  Settings2,
  Smartphone,
  Sparkles,
  SwatchBook,
  Trash2,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react';
import { cn } from '../../lib/classes';
import { createEditorialBlock, type EditableEditorialBlockType } from '../../lib/editorialBlocks';
import { editorialSceneTypeLabel, editorialSceneTypeOptions } from '../../lib/editorialCollections';
import { resolveEditorialTheme } from '../../lib/editorialThemes';
import { resolveEditorialBookSpread } from '../../lib/editorialViewerMode';
import {
  createSceneFromRecipe,
  editorialCompositionSuggestions,
  editorialProjectSuggestion,
  editorialScenePrompt,
  editorialSceneRecipes,
  editorialVisualCount,
  getEditorialSceneReadiness,
  type EditorialCanvasSelection,
  type EditorialCompositionPreset,
  type EditorialSceneRecipeId,
} from '../../lib/editorialStoryStudio';
import { fabricEditorialFallback, projectLinkedEditorialFabrics } from '../../lib/editorialAssets';
import { MAX_PROJECT_EDITORIAL_IMAGES } from '../../lib/imageAssets';
import { discardLocalImageAsset } from '../../lib/localImages';
import type {
  EditorialBlock,
  EditorialCollection,
  EditorialImageContent,
  EditorialJsonObject,
  EditorialJsonValue,
  EditorialPreviewSurface,
  EditorialScene,
  EditorialSceneType,
} from '../../types/editorial';
import type { ApparelProject, Fabric, LocalImageAsset } from '../../types/studio';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { FabricColorOrb } from '../fabrics/FabricColorOrb';
import { EditorialBlockInspector } from './EditorialBlockInspector';
import { EditorialBookViewer } from './EditorialBookViewer';
import { EditorialCollectionViewer } from './EditorialCollectionViewer';
import { EditorialImageFramingControls } from './EditorialImageFramingControls';
import { EditorialMediaPicker } from './EditorialMediaPicker';
import { EditorialSceneRenderer } from './scenes/EditorialSceneRenderer';

type EditorialSceneBuilderProps = {
  collection: EditorialCollection;
  fabrics?: Fabric[];
  onClose: () => void;
  onSave: (collection: EditorialCollection, editorialImages?: LocalImageAsset[]) => void;
  project?: ApparelProject;
};

type InspectorMode = 'content' | 'more' | 'scene';
type MediaTarget = { blockId: string; kind: 'block' } | { kind: 'background' };
type SceneHistory = { future: EditorialScene[][]; past: EditorialScene[][]; present: EditorialScene[] };

export function EditorialSceneBuilder({ collection, fabrics = [], onClose, onSave, project }: EditorialSceneBuilderProps) {
  const initialScenes = useMemo(() => orderedScenes(collection.scenes), [collection.scenes]);
  const [history, setHistory] = useState<SceneHistory>({ future: [], past: [], present: initialScenes });
  const scenes = history.present;
  const [activeSceneId, setActiveSceneId] = useState(initialScenes[0]?.id ?? '');
  const [selection, setSelection] = useState<EditorialCanvasSelection>({ kind: 'scene' });
  const [inspectorMode, setInspectorMode] = useState<InspectorMode | null>(null);
  const [previewSurface, setPreviewSurface] = useState<EditorialPreviewSurface>('presentation');
  const [savedSignature, setSavedSignature] = useState(() => sceneSignature(initialScenes));
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [isContentMenuOpen, setIsContentMenuOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<MediaTarget | null>(null);
  const [draftEditorialImages, setDraftEditorialImages] = useState<LocalImageAsset[]>(() => project?.editorialImages ?? []);
  const [savedMediaSignature, setSavedMediaSignature] = useState(() => mediaSignature(project?.editorialImages ?? []));
  const stagedAssetIdsRef = useRef(new Set<string>());
  const draftAssetsRef = useRef(draftEditorialImages);
  const theme = useMemo(() => resolveEditorialTheme(collection.themeId), [collection.themeId]);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  const selectedBlockId = selection.kind === 'block' || selection.kind === 'media' ? selection.blockId : undefined;
  const selectedBlock = activeScene?.blocks.find((block) => block.id === selectedBlockId);
  const isDirty = sceneSignature(scenes) !== savedSignature || mediaSignature(draftEditorialImages) !== savedMediaSignature;
  const draftCollection = useMemo<EditorialCollection>(() => ({ ...collection, scenes: orderedScenes(scenes) }), [collection, scenes]);
  const draftProject = useMemo(() => project ? { ...project, editorialImages: draftEditorialImages } : undefined, [draftEditorialImages, project]);

  useEffect(() => { draftAssetsRef.current = draftEditorialImages; }, [draftEditorialImages]);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  useEffect(() => () => {
    const stagedIds = stagedAssetIdsRef.current;
    void Promise.all(draftAssetsRef.current.filter((image) => stagedIds.has(image.id)).map((image) => discardLocalImageAsset(image).catch(() => undefined)));
  }, []);
  useEffect(() => {
    setDeleteArmed(false);
    setSelection({ kind: 'scene' });
    setInspectorMode(null);
  }, [activeSceneId]);

  const commitScenes = (nextScenes: EditorialScene[]) => {
    const normalized = orderedScenes(nextScenes);
    setHistory((current) => ({ future: [], past: [...current.past.slice(-49), current.present], present: normalized }));
  };
  const undo = () => setHistory((current) => current.past.length ? { future: [current.present, ...current.future].slice(0, 50), past: current.past.slice(0, -1), present: current.past[current.past.length - 1] } : current);
  const redo = () => setHistory((current) => current.future.length ? { future: current.future.slice(1), past: [...current.past, current.present].slice(-50), present: current.future[0] } : current);

  const requestClose = () => {
    if (isDirty) setIsDiscarding(true);
    else onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if (event.key !== 'Escape' || isPresenting) return;
      if (mediaTarget) setMediaTarget(null);
      else if (isRecipePickerOpen) setIsRecipePickerOpen(false);
      else if (isContentMenuOpen) setIsContentMenuOpen(false);
      else if (inspectorMode) setInspectorMode(null);
      else requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  const updateActiveScene = (updates: Partial<EditorialScene>) => {
    if (!activeScene) return;
    const timestamp = new Date().toISOString();
    commitScenes(scenes.map((scene) => scene.id === activeScene.id ? { ...scene, ...updates, updatedAt: timestamp } : scene));
  };

  const updateActiveBlocks = (blocks: EditorialBlock[]) => updateActiveScene({ blocks: blocks.map((block, order) => ({ ...block, order })) });

  const addScene = (recipeId: EditorialSceneRecipeId) => {
    const nextScene = createSceneFromRecipe(collection.id, scenes.length, recipeId);
    commitScenes([...scenes, nextScene]);
    setActiveSceneId(nextScene.id);
    setIsRecipePickerOpen(false);
    setSelection({ kind: 'scene' });
    setInspectorMode('scene');
  };

  const moveScene = (direction: -1 | 1) => {
    if (!activeScene) return;
    const currentIndex = scenes.findIndex((scene) => scene.id === activeScene.id);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= scenes.length) return;
    const reordered = [...scenes];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
    commitScenes(reordered);
  };

  const deleteScene = () => {
    if (!activeScene) return;
    const currentIndex = scenes.findIndex((scene) => scene.id === activeScene.id);
    const remaining = scenes.filter((scene) => scene.id !== activeScene.id);
    commitScenes(remaining);
    setActiveSceneId(remaining[Math.min(currentIndex, remaining.length - 1)]?.id ?? '');
    setDeleteArmed(false);
    setInspectorMode(null);
  };

  const addContent = (type: EditableEditorialBlockType) => {
    if (!activeScene) return;
    const block = createEditorialBlock(activeScene.id, type, activeScene.blocks.length);
    updateActiveBlocks([...activeScene.blocks, block]);
    setSelection({ blockId: block.id, kind: type === 'image' || type === 'gallery' ? 'media' : 'block' });
    setIsContentMenuOpen(false);
    if (type === 'image' || type === 'gallery') setMediaTarget({ blockId: block.id, kind: 'block' });
    else setInspectorMode('content');
  };

  const openScenePhotos = () => {
    if (!activeScene) return;
    if (activeScene.sceneType === 'cover') {
      setMediaTarget({ kind: 'background' });
      return;
    }
    const existing = activeScene.blocks.find((block) => block.type === 'gallery');
    if (existing) {
      setSelection({ blockId: existing.id, kind: 'media' });
      setMediaTarget({ blockId: existing.id, kind: 'block' });
      return;
    }
    addContent('gallery');
  };

  const selectBlock = (blockId: string) => {
    const block = activeScene?.blocks.find((item) => item.id === blockId);
    if (!block) return;
    if (block.type === 'image' || block.type === 'gallery') {
      setSelection({ blockId, kind: 'media' });
      setMediaTarget({ blockId, kind: 'block' });
    } else {
      setSelection({ blockId, kind: 'block' });
      setInspectorMode('content');
    }
  };

  const saveChanges = () => {
    const timestamp = new Date().toISOString();
    const savedScenes = orderedScenes(scenes).map((scene, order) => ({ ...scene, order }));
    onSave({ ...collection, scenes: savedScenes, updatedAt: timestamp }, draftEditorialImages);
    setHistory({ future: [], past: [], present: savedScenes });
    setSavedSignature(sceneSignature(savedScenes));
    setSavedMediaSignature(mediaSignature(draftEditorialImages));
    stagedAssetIdsRef.current.clear();
  };

  const stageEditorialAssets = (images: LocalImageAsset[]) => {
    setDraftEditorialImages((current) => {
      const additions = images.filter((image) => !current.some((item) => item.id === image.id)).slice(0, Math.max(0, MAX_PROJECT_EDITORIAL_IMAGES - current.length));
      additions.forEach((image) => stagedAssetIdsRef.current.add(image.id));
      return additions.length ? [...current, ...additions] : current;
    });
  };

  const discardStagedAssets = () => {
    const stagedIds = stagedAssetIdsRef.current;
    const assets = draftAssetsRef.current.filter((image) => stagedIds.has(image.id));
    stagedAssetIdsRef.current.clear();
    void Promise.all(assets.map((image) => discardLocalImageAsset(image).catch(() => undefined)));
  };

  const applyMedia = (items: EditorialJsonObject[], preset: EditorialCompositionPreset, target: MediaTarget) => {
    if (!activeScene) return;
    if (target.kind === 'background') {
      const item = items[0];
      updateActiveScene({
        background: item ? {
          ...activeScene.background,
          imageId: typeof item.assetId === 'string' ? item.assetId : undefined,
          imageUrl: typeof item.url === 'string' ? item.url : undefined,
          settings: item,
          type: 'image',
        } : { type: 'transparent' },
        layout: { ...activeScene.layout, compositionId: preset.id, mediaPlacement: preset.mediaPlacement },
      });
    } else {
      const nextBlocks = activeScene.blocks.map((block) => block.id === target.blockId ? (() => {
        if (block.type === 'gallery') {
          return { ...block, content: { ...record(block.content), columns: preset.layout === 'diptych' ? 2 : preset.layout === 'feature' ? 1 : 3, compositionId: preset.id, images: items, layout: preset.layout, mediaPlacement: preset.mediaPlacement } };
        }
        return { ...block, content: { ...(items[0] ?? { alt: '', assetId: '', assetName: '', caption: '', fitMode: 'smart', frame: 'auto', url: '' }), compositionId: preset.id, mediaPlacement: preset.mediaPlacement } };
      })() : block);
      updateActiveScene({ blocks: nextBlocks, layout: { ...activeScene.layout, compositionId: preset.id, mediaPlacement: preset.mediaPlacement } });
    }
    setMediaTarget(null);
  };

  const mediaBlock = mediaTarget?.kind === 'block' ? activeScene?.blocks.find((block) => block.id === mediaTarget.blockId) : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[160] bg-[#050505] text-stardust">
      <section aria-label={`Edit scenes for ${collection.title}`} aria-modal="true" className="flex h-dvh flex-col" role="dialog">
        <StudioHeader
          canRedo={history.future.length > 0}
          canUndo={history.past.length > 0}
          collectionTitle={collection.title}
          isDirty={isDirty}
          onClose={requestClose}
          onPresent={() => setIsPresenting(true)}
          onRedo={redo}
          onSave={saveChanges}
          onUndo={undo}
        />

        <div className={cn('grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[12.5rem_minmax(0,1fr)] md:grid-rows-1', inspectorMode && 'xl:grid-cols-[12.5rem_minmax(0,1fr)_22rem]')}>
          <SceneTimeline activeSceneId={activeScene?.id} collection={draftCollection} onAdd={() => setIsRecipePickerOpen(true)} onMove={moveScene} onSelect={setActiveSceneId} project={draftProject} scenes={scenes} />

          <main className="relative flex min-h-0 flex-col overflow-hidden border-bronze/20 bg-[radial-gradient(circle_at_50%_38%,rgba(45,92,107,.16),transparent_36%),#080808] md:border-l">
            <CanvasHeader
              onOpenInspector={() => { setSelection({ kind: 'scene' }); setInspectorMode('scene'); }}
              onSurfaceChange={setPreviewSurface}
              surface={previewSurface}
            />
            <div className="min-h-0 flex-1 p-3 sm:p-4 lg:p-5">
              <PreviewCanvas
                activeScene={activeScene}
                collection={draftCollection}
                fabrics={fabrics}
                onAddPhotos={openScenePhotos}
                onEditStory={() => { setSelection({ kind: 'scene' }); setInspectorMode('scene'); }}
                onSelectBlock={selectBlock}
                project={draftProject}
                selectedBlockId={selectedBlockId}
                surface={previewSurface}
                theme={theme}
              />
            </div>
            <CanvasActionBar
              isDirty={isDirty}
              onAddContent={() => setIsContentMenuOpen(true)}
              onAddPhotos={openScenePhotos}
              onEditStory={() => { setSelection({ kind: 'scene' }); setInspectorMode('scene'); }}
              onMore={() => setInspectorMode('more')}
              onPresent={() => setIsPresenting(true)}
              onSave={saveChanges}
            />
          </main>

          {inspectorMode ? (
            <ContextInspector
              activeScene={activeScene}
              editorialImages={draftEditorialImages}
              fabrics={fabrics}
              mode={inspectorMode}
              onArmDelete={() => setDeleteArmed(true)}
              onCancelDelete={() => setDeleteArmed(false)}
              onClose={() => setInspectorMode(null)}
              onDelete={deleteScene}
              onOpenBackground={() => setMediaTarget({ kind: 'background' })}
              onOpenMedia={(block) => { setSelection({ blockId: block.id, kind: 'media' }); setMediaTarget({ blockId: block.id, kind: 'block' }); }}
              onRemoveBackground={() => activeScene && updateActiveScene({ background: { type: 'transparent' } })}
              onSelectBlock={(blockId) => setSelection({ blockId, kind: 'block' })}
              onStageAssets={stageEditorialAssets}
              onUpdateBlocks={updateActiveBlocks}
              onUpdateScene={updateActiveScene}
              project={draftProject}
              selectedBlock={selectedBlock}
              deleteArmed={deleteArmed}
            />
          ) : null}
        </div>
      </section>

      {isRecipePickerOpen ? <SceneRecipePicker onClose={() => setIsRecipePickerOpen(false)} onSelect={addScene} /> : null}
      {isContentMenuOpen ? <AddContentMenu onClose={() => setIsContentMenuOpen(false)} onSelect={addContent} /> : null}
      {mediaTarget ? (
        <MediaComposerDrawer
          block={mediaBlock}
          editorialImages={draftEditorialImages}
          key={`${activeScene?.id}-${mediaTarget.kind === 'block' ? mediaTarget.blockId : 'background'}`}
          onAddAssets={stageEditorialAssets}
          onApply={(items, preset) => applyMedia(items, preset, mediaTarget)}
          onClose={() => setMediaTarget(null)}
          project={draftProject}
          scene={activeScene}
          target={mediaTarget}
        />
      ) : null}

      {isPresenting ? <EditorialCollectionViewer collection={draftCollection} fabrics={fabrics} onClose={() => setIsPresenting(false)} project={draftProject} /> : null}
      {isDiscarding ? (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-midnight/82 p-4 backdrop-blur-xl">
          <section aria-modal="true" className="w-full max-w-md rounded-xl border border-bronze/36 bg-[linear-gradient(145deg,#15191c,#0a0a0a_56%,#23170f)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)]" role="alertdialog">
            <h2 className="font-display text-xl">Discard scene changes?</h2>
            <p className="mt-3 text-sm leading-6 text-stardust/58">Your story, layout choices, and staged photographs will return to the last saved version.</p>
            <div className="mt-6 flex justify-end gap-3"><Button onClick={() => setIsDiscarding(false)} variant="ghost">Keep Editing</Button><Button className="border-red-300/28 bg-red-300/10 text-red-100" onClick={() => { discardStagedAssets(); onClose(); }}>Discard</Button></div>
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function StudioHeader({ canRedo, canUndo, collectionTitle, isDirty, onClose, onPresent, onRedo, onSave, onUndo }: { canRedo: boolean; canUndo: boolean; collectionTitle: string; isDirty: boolean; onClose: () => void; onPresent: () => void; onRedo: () => void; onSave: () => void; onUndo: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-bronze/24 bg-midnight/94 px-3 py-3 backdrop-blur-xl sm:px-5">
      <IconButton label="Close story studio" onClick={onClose}><X size={18} /></IconButton>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Badge variant="bronze">Story Studio</Badge><span className={cn('text-[0.6rem] uppercase tracking-[0.14em]', isDirty ? 'text-ember' : 'text-teal-200/65')}>{isDirty ? 'Unsaved' : 'Saved'}</span></div><h1 className="mt-1 truncate text-sm font-semibold sm:text-base">{collectionTitle}</h1></div>
      <div className="hidden gap-1 sm:flex"><IconButton disabled={!canUndo} label="Undo" onClick={onUndo}><Undo2 size={16} /></IconButton><IconButton disabled={!canRedo} label="Redo" onClick={onRedo}><Redo2 size={16} /></IconButton></div>
      <Button className="hidden md:inline-flex" icon={<Play size={16} />} onClick={onPresent} size="sm" variant="secondary">Present</Button>
      <Button disabled={!isDirty} icon={<Save size={16} />} onClick={onSave} size="sm" variant="primary"><span className="hidden sm:inline">Save Changes</span><span className="sm:hidden">Save</span></Button>
    </header>
  );
}

function SceneTimeline({ activeSceneId, collection, onAdd, onMove, onSelect, project, scenes }: { activeSceneId?: string; collection: EditorialCollection; onAdd: () => void; onMove: (direction: -1 | 1) => void; onSelect: (sceneId: string) => void; project?: ApparelProject; scenes: EditorialScene[] }) {
  const activeIndex = scenes.findIndex((scene) => scene.id === activeSceneId);
  return (
    <aside className="min-w-0 border-b border-bronze/20 bg-[#090a0a] px-3 py-2 md:flex md:min-h-0 md:flex-col md:border-b-0 md:px-3 md:py-4">
      <div className="flex items-center justify-between gap-2"><div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ember">Story timeline</p><p className="mt-1 text-[0.65rem] text-stardust/38">{scenes.length} scenes</p></div><IconButton label="Add a scene" onClick={onAdd}><Plus size={17} /></IconButton></div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:pr-1">
        {scenes.map((scene, index) => {
          const readiness = getEditorialSceneReadiness(scene, { collection, project });
          const readyCount = Number(readiness.message) + Number(readiness.visual) + Number(readiness.supportingDetail);
          return (
            <button className={cn('min-w-44 rounded-lg border px-3 py-2.5 text-left transition md:min-w-0', scene.id === activeSceneId ? 'border-ember/58 bg-[linear-gradient(135deg,rgba(200,155,60,.14),rgba(45,92,107,.08))] shadow-[inset_3px_0_0_rgba(200,155,60,.8)]' : 'border-stardust/9 bg-stardust/[0.025] hover:border-bronze/34')} key={scene.id} onClick={() => onSelect(scene.id)} type="button">
              <span className="flex items-center justify-between gap-2"><span className="text-[0.54rem] uppercase tracking-[0.13em] text-stardust/34">{String(index + 1).padStart(2, '0')} · {editorialSceneTypeLabel(scene.sceneType)}</span><span className={cn('text-[0.52rem] uppercase tracking-[0.1em]', readyCount === 3 ? 'text-teal-200/66' : 'text-ember/62')}>{readyCount}/3</span></span>
              <span className="mt-1 block truncate text-xs font-semibold text-stardust">{scene.title || 'Untitled Scene'}</span>
              <span className="mt-1.5 flex items-center gap-1.5 text-[0.56rem] text-stardust/34"><Images size={11} />{editorialVisualCount(scene, { collection, project })} visuals <ReadinessDots readiness={readiness} /></span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 hidden grid-cols-2 gap-2 md:grid"><IconButton disabled={activeIndex <= 0} label="Move selected scene up" onClick={() => onMove(-1)}><ChevronUp size={16} /></IconButton><IconButton disabled={activeIndex < 0 || activeIndex >= scenes.length - 1} label="Move selected scene down" onClick={() => onMove(1)}><ChevronDown size={16} /></IconButton></div>
    </aside>
  );
}

function ReadinessDots({ readiness }: { readiness: ReturnType<typeof getEditorialSceneReadiness> }) {
  return <span className="ml-auto flex gap-1" title="Message, visual, supporting detail">{[readiness.message, readiness.visual, readiness.supportingDetail].map((ready, index) => <span className={cn('h-1.5 w-1.5 rounded-full', ready ? 'bg-teal-200/68' : 'bg-stardust/14')} key={index} />)}</span>;
}

function CanvasHeader({ onOpenInspector, onSurfaceChange, surface }: { onOpenInspector: () => void; onSurfaceChange: (surface: EditorialPreviewSurface) => void; surface: EditorialPreviewSurface }) {
  const options: Array<{ icon: ReactNode; label: string; value: EditorialPreviewSurface }> = [{ icon: <Monitor size={13} />, label: 'Presentation', value: 'presentation' }, { icon: <BookOpen size={13} />, label: 'Book', value: 'book' }, { icon: <Smartphone size={13} />, label: 'Phone', value: 'phone' }];
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-bronze/16 px-3 py-2 sm:px-4"><div><p className="text-[0.58rem] uppercase tracking-[0.16em] text-stardust/38">Live canvas</p><p className="mt-0.5 hidden text-[0.62rem] text-stardust/28 sm:block">Select scene content to edit it.</p></div><div className="flex items-center gap-2"><div className="flex rounded-lg border border-bronze/20 bg-black/26 p-1">{options.map((option) => <button aria-label={`Preview ${option.label}`} className={cn('flex h-8 items-center gap-1.5 rounded-md px-2 text-[0.58rem] transition', surface === option.value ? 'bg-ember text-midnight' : 'text-stardust/42 hover:text-stardust')} key={option.value} onClick={() => onSurfaceChange(option.value)} type="button">{option.icon}<span className="hidden lg:inline">{option.label}</span></button>)}</div><IconButton label="Open scene inspector" onClick={onOpenInspector}><PanelRightOpen size={16} /></IconButton></div></div>
  );
}

function PreviewCanvas({ activeScene, collection, fabrics, onAddPhotos, onEditStory, onSelectBlock, project, selectedBlockId, surface, theme }: { activeScene?: EditorialScene; collection: EditorialCollection; fabrics: Fabric[]; onAddPhotos: () => void; onEditStory: () => void; onSelectBlock: (blockId: string) => void; project?: ApparelProject; selectedBlockId?: string; surface: EditorialPreviewSurface; theme: ReturnType<typeof resolveEditorialTheme> }) {
  if (!activeScene) return <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-bronze/22"><div className="text-center"><Layers3 className="mx-auto text-ember" size={25} /><p className="mt-4 text-sm text-stardust/48">Add a scene to begin shaping the story.</p></div></div>;
  const readiness = getEditorialSceneReadiness(activeScene, { collection, project });
  const descriptor = resolveEditorialBookSpread(activeScene, activeScene.order);
  return (
    <div className="relative mx-auto flex h-full w-full max-w-6xl items-center justify-center">
      <div className={cn('editorial-builder-preview relative min-h-0 overflow-hidden rounded-xl border border-bronze/32 bg-midnight shadow-[0_22px_70px_rgba(0,0,0,.46)] transition-[width,max-width,aspect-ratio] duration-300 [&_h1]:!text-[clamp(2rem,5vw,4rem)] [&_h2]:!text-[clamp(1.7rem,4vw,3.4rem)]', surface === 'phone' ? 'aspect-[9/16] h-full max-h-full w-auto max-w-[26rem]' : 'h-full w-full')}>
        {surface === 'book' ? <EditorialBookViewer collection={collection} descriptor={descriptor} fabrics={fabrics} isSinglePage={false} pageIndex={0} project={project} theme={theme} /> : <EditorialSceneRenderer authoring={{ onSelectBlock, selectedBlockId }} collection={collection} fabrics={fabrics} project={project} scene={activeScene} theme={theme} />}
        <button className="absolute left-3 top-3 z-30 inline-flex h-9 items-center gap-2 rounded-lg border border-bronze/28 bg-midnight/86 px-3 text-[0.62rem] text-stardust/68 shadow-lg backdrop-blur-xl transition hover:border-ember/52 hover:text-stardust" onClick={onEditStory} type="button"><FileText size={14} />Edit story</button>
        {!readiness.visual ? <button className="absolute bottom-4 left-1/2 z-30 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full border border-ember/48 bg-midnight/90 px-5 text-xs font-semibold text-ember shadow-[0_12px_35px_rgba(0,0,0,.55)] backdrop-blur-xl transition hover:bg-ember hover:text-midnight" onClick={onAddPhotos} type="button"><ImageIcon size={16} />Add photos</button> : null}
      </div>
    </div>
  );
}

function CanvasActionBar({ isDirty, onAddContent, onAddPhotos, onEditStory, onMore, onPresent, onSave }: { isDirty: boolean; onAddContent: () => void; onAddPhotos: () => void; onEditStory: () => void; onMore: () => void; onPresent: () => void; onSave: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-bronze/18 bg-midnight/92 px-3 py-2 backdrop-blur-xl sm:px-4"><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-ember px-3 text-xs font-semibold text-midnight transition hover:bg-stardust" onClick={onAddContent} type="button"><Plus size={15} />Add Content</button><ToolbarButton icon={<ImageIcon size={15} />} label="Photos" onClick={onAddPhotos} /><ToolbarButton icon={<FileText size={15} />} label="Story" onClick={onEditStory} /><ToolbarButton icon={<MoreHorizontal size={15} />} label="More" onClick={onMore} /><div className="ml-auto flex gap-2 md:hidden"><IconButton label="Preview collection" onClick={onPresent}><Play size={16} /></IconButton><Button disabled={!isDirty} icon={<Save size={15} />} onClick={onSave} size="sm">Save</Button></div></div>
  );
}

function ContextInspector({ activeScene, deleteArmed, editorialImages, fabrics, mode, onArmDelete, onCancelDelete, onClose, onDelete, onOpenBackground, onOpenMedia, onRemoveBackground, onSelectBlock, onStageAssets, onUpdateBlocks, onUpdateScene, project, selectedBlock }: { activeScene?: EditorialScene; deleteArmed: boolean; editorialImages: LocalImageAsset[]; fabrics: Fabric[]; mode: InspectorMode; onArmDelete: () => void; onCancelDelete: () => void; onClose: () => void; onDelete: () => void; onOpenBackground: () => void; onOpenMedia: (block: EditorialBlock) => void; onRemoveBackground: () => void; onSelectBlock: (blockId: string) => void; onStageAssets: (images: LocalImageAsset[]) => void; onUpdateBlocks: (blocks: EditorialBlock[]) => void; onUpdateScene: (updates: Partial<EditorialScene>) => void; project?: ApparelProject; selectedBlock?: EditorialBlock }) {
  return (
    <aside className="fixed inset-y-0 right-0 z-[180] flex w-full min-h-0 flex-col border-l border-bronze/24 bg-[linear-gradient(180deg,#11110f,#090909)] shadow-[-24px_0_70px_rgba(0,0,0,.5)] md:max-w-[24rem] xl:static xl:z-auto xl:w-[22rem] xl:max-w-none xl:shadow-none">
      <div className="flex shrink-0 items-center justify-between border-b border-bronze/18 px-4 py-3"><div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-ember">{mode === 'scene' ? 'Story' : mode === 'content' ? 'Content' : 'More options'}</p><p className="mt-1 text-xs text-stardust/36">{activeScene?.title ?? 'No scene selected'}</p></div><IconButton label="Close inspector" onClick={onClose}><X size={17} /></IconButton></div>
      <div className="studio-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {!activeScene ? <p className="text-sm text-stardust/42">Choose a scene to begin.</p> : mode === 'scene' ? (
          <SceneStoryInspector fabrics={fabrics} onUpdate={onUpdateScene} project={project} scene={activeScene} />
        ) : mode === 'content' ? (
          <EditorialBlockInspector activeBlockId={selectedBlock?.id} blocks={activeScene.blocks} editorialImages={editorialImages} fabrics={fabrics} hideAdd onActiveBlockChange={onSelectBlock} onChange={onUpdateBlocks} onEditMedia={onOpenMedia} onStageAssets={onStageAssets} project={project} sceneId={activeScene.id} />
        ) : (
          <MoreOptionsInspector deleteArmed={deleteArmed} onArmDelete={onArmDelete} onCancelDelete={onCancelDelete} onDelete={onDelete} onOpenBackground={onOpenBackground} onRemoveBackground={onRemoveBackground} onUpdate={onUpdateScene} scene={activeScene} />
        )}
      </div>
    </aside>
  );
}

function SceneStoryInspector({ fabrics, onUpdate, project, scene }: { fabrics: Fabric[]; onUpdate: (updates: Partial<EditorialScene>) => void; project?: ApparelProject; scene: EditorialScene }) {
  const readiness = getEditorialSceneReadiness(scene);
  const suggestion = editorialProjectSuggestion(scene, project);
  const insertSuggestion = () => suggestion && onUpdate({ description: scene.description?.trim() ? `${scene.description.trim()}\n\n${suggestion}` : suggestion });
  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-ember/24 bg-[linear-gradient(135deg,rgba(200,155,60,.1),rgba(45,92,107,.08))] p-4"><div className="flex gap-3"><Sparkles className="mt-0.5 shrink-0 text-ember" size={17} /><div><p className="text-xs font-semibold text-stardust">Story prompt</p><p className="mt-2 text-sm leading-6 text-stardust/66">{editorialScenePrompt(scene)}</p></div></div><div className="mt-4 grid grid-cols-3 gap-2"><ReadinessChip label="Message" ready={readiness.message} /><ReadinessChip label="Visual" ready={readiness.visual} /><ReadinessChip label="Detail" ready={readiness.supportingDetail} /></div></section>
      <InspectorField label="Scene title"><input className={inputClassName} maxLength={80} onChange={(event) => onUpdate({ title: event.target.value })} value={scene.title} /></InspectorField>
      <InspectorField label="Scene type"><select className={inputClassName} onChange={(event) => onUpdate({ sceneType: event.target.value as EditorialSceneType })} value={scene.sceneType}>{!editorialSceneTypeOptions.some((option) => option.value === scene.sceneType) ? <option value={scene.sceneType}>{editorialSceneTypeLabel(scene.sceneType)}</option> : null}{editorialSceneTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></InspectorField>
      <InspectorField label="Subtitle"><input className={inputClassName} maxLength={120} onChange={(event) => onUpdate({ subtitle: event.target.value })} placeholder="A short editorial cue" value={scene.subtitle ?? ''} /></InspectorField>
      <InspectorField label="Scene narrative"><textarea className={textAreaClassName} maxLength={600} onChange={(event) => onUpdate({ description: event.target.value })} placeholder="Tell the part of the story only you can tell." value={scene.description ?? ''} /></InspectorField>
      {suggestion ? <section className="rounded-xl border border-teal-200/16 bg-teal-200/[0.04] p-3"><p className="text-[0.58rem] font-semibold uppercase tracking-[0.13em] text-teal-100/64">From project details</p><p className="mt-2 line-clamp-4 text-xs leading-5 text-stardust/48">{suggestion}</p><button className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-100/20 px-2.5 text-[0.62rem] text-teal-100/72 transition hover:bg-teal-100/8" onClick={insertSuggestion} type="button"><Plus size={12} />Insert suggestion</button></section> : null}
      {['fabric-story', 'materials'].includes(scene.sceneType) ? <SceneFabricPicker fabrics={fabrics} onUpdate={onUpdate} project={project} scene={scene} /> : null}
    </div>
  );
}

function MoreOptionsInspector({ deleteArmed, onArmDelete, onCancelDelete, onDelete, onOpenBackground, onRemoveBackground, onUpdate, scene }: { deleteArmed: boolean; onArmDelete: () => void; onCancelDelete: () => void; onDelete: () => void; onOpenBackground: () => void; onRemoveBackground: () => void; onUpdate: (updates: Partial<EditorialScene>) => void; scene: EditorialScene }) {
  return (
    <div className="space-y-6">
      <section><p className="text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-stardust/42">Scene atmosphere</p><p className="mt-2 text-xs leading-5 text-stardust/38">Use a background only when it supports the content rather than competing with it.</p><button className="mt-3 flex min-h-14 w-full items-center justify-between rounded-xl border border-bronze/24 bg-midnight/42 px-4 text-left transition hover:border-ember/44" onClick={onOpenBackground} type="button"><span><span className="block text-xs font-semibold">{scene.background.imageId || scene.background.imageUrl ? 'Change background' : 'Add background'}</span><span className="mt-1 block text-[0.62rem] text-stardust/36">Project or editorial photography</span></span><ImageIcon className="text-ember" size={18} /></button>{scene.background.imageId || scene.background.imageUrl ? <button className="mt-2 text-xs text-stardust/44 transition hover:text-red-200" onClick={onRemoveBackground} type="button">Remove background</button> : null}</section>
      <section className="border-t border-bronze/18 pt-5"><InspectorField label="Transition"><select className={inputClassName} onChange={(event) => onUpdate({ transition: { ...scene.transition, type: event.target.value as EditorialScene['transition']['type'] } })} value={scene.transition.type}><option value="none">None</option><option value="fade">Fade</option><option value="crossfade">Crossfade</option><option value="slide">Slide</option><option value="reveal">Reveal</option></select></InspectorField></section>
      <section className="border-t border-bronze/18 pt-5">{deleteArmed ? <div className="rounded-xl border border-red-300/24 bg-red-300/[0.06] p-3"><p className="text-sm font-semibold text-red-100">Delete this scene?</p><p className="mt-1 text-xs leading-5 text-stardust/44">Its content is removed when you save.</p><div className="mt-3 flex gap-2"><Button className="flex-1" onClick={onCancelDelete} size="sm" variant="ghost">Cancel</Button><Button className="flex-1 border-red-300/28 bg-red-300/10 text-red-100" onClick={onDelete} size="sm">Delete</Button></div></div> : <Button className="w-full justify-center text-red-200/68 hover:text-red-100" icon={<Trash2 size={15} />} onClick={onArmDelete} size="sm" variant="ghost">Delete Scene</Button>}</section>
    </div>
  );
}

function SceneRecipePicker({ onClose, onSelect }: { onClose: () => void; onSelect: (recipeId: EditorialSceneRecipeId) => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-midnight/78 p-0 backdrop-blur-xl sm:items-center sm:p-5"><section aria-modal="true" className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-2xl border border-bronze/34 bg-[linear-gradient(145deg,#141719,#090909_62%,#21150d)] p-4 shadow-[0_30px_100px_rgba(0,0,0,.7)] sm:rounded-2xl sm:p-6" role="dialog"><div className="flex items-start justify-between gap-4"><div><Badge variant="bronze">New Scene</Badge><h2 className="font-display mt-3 text-2xl">What part of the story comes next?</h2><p className="mt-2 text-sm leading-6 text-stardust/48">Choose a starting structure. Everything remains editable.</p></div><IconButton label="Close scene recipes" onClick={onClose}><X size={18} /></IconButton></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{editorialSceneRecipes.map((recipe) => <button className="group min-h-36 rounded-xl border border-bronze/22 bg-midnight/36 p-4 text-left transition hover:-translate-y-0.5 hover:border-ember/56 hover:bg-ember/[0.06]" key={recipe.id} onClick={() => onSelect(recipe.id)} type="button"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-bronze/24 text-ember"><SceneRecipeIcon sceneType={recipe.sceneType} /></span><h3 className="mt-4 text-sm font-semibold">{recipe.title}</h3><p className="mt-2 text-xs leading-5 text-stardust/42">{recipe.description}</p></button>)}</div></section></div>
  );
}

function AddContentMenu({ onClose, onSelect }: { onClose: () => void; onSelect: (type: EditableEditorialBlockType) => void }) {
  const options: Array<{ description: string; icon: ReactNode; label: string; type: EditableEditorialBlockType }> = [
    { description: 'A paragraph or supporting explanation.', icon: <FileText size={18} />, label: 'Text', type: 'paragraph' },
    { description: 'One project or editorial photograph.', icon: <ImageIcon size={18} />, label: 'Photo', type: 'image' },
    { description: 'An assisted arrangement of up to six photos.', icon: <Images size={18} />, label: 'Photo Layout', type: 'gallery' },
    { description: 'A defining statement with attribution.', icon: <Quote size={18} />, label: 'Quote', type: 'quote' },
    { description: 'A linked textile and material note.', icon: <SwatchBook size={18} />, label: 'Fabric', type: 'fabricSwatch' },
    { description: 'A key takeaway or highlighted note.', icon: <MessageSquareText size={18} />, label: 'Callout', type: 'callout' },
    { description: 'A quiet visual break in the story.', icon: <Minus size={18} />, label: 'Divider', type: 'divider' },
  ];
  return <div className="fixed inset-0 z-[200] flex items-end justify-center bg-midnight/76 backdrop-blur-xl sm:items-center sm:p-5"><section aria-modal="true" className="w-full max-w-2xl rounded-t-2xl border border-bronze/32 bg-[#100f0e] p-4 shadow-[0_24px_80px_rgba(0,0,0,.68)] sm:rounded-2xl sm:p-5" role="dialog"><div className="flex items-center justify-between"><div><p className="text-[0.6rem] uppercase tracking-[0.16em] text-ember">Add Content</p><h2 className="mt-1 text-lg font-semibold">What belongs in this scene?</h2></div><IconButton label="Close content menu" onClick={onClose}><X size={17} /></IconButton></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{options.map((option) => <button className="rounded-xl border border-bronze/20 bg-midnight/36 p-3 text-left transition hover:border-ember/48 hover:bg-ember/[0.06]" key={option.type} onClick={() => onSelect(option.type)} type="button"><span className="text-ember">{option.icon}</span><span className="mt-3 block text-xs font-semibold">{option.label}</span><span className="mt-1 block text-[0.62rem] leading-4 text-stardust/38">{option.description}</span></button>)}</div></section></div>;
}

function MediaComposerDrawer({ block, editorialImages, onAddAssets, onApply, onClose, project, scene, target }: { block?: EditorialBlock; editorialImages: LocalImageAsset[]; onAddAssets: (images: LocalImageAsset[]) => void; onApply: (items: EditorialJsonObject[], preset: EditorialCompositionPreset) => void; onClose: () => void; project?: ApparelProject; scene?: EditorialScene; target: MediaTarget }) {
  const projectImages = project ? [project.heroImage, ...(project.galleryImages ?? [])].filter((image): image is LocalImageAsset => Boolean(image)) : [];
  const availableImages = [...projectImages, ...editorialImages];
  const isGallery = block?.type === 'gallery';
  const initialItems = mediaItems(block, scene, target);
  const [items, setItems] = useState<EditorialJsonObject[]>(initialItems);
  const [activeIndex, setActiveIndex] = useState(0);
  const [externalUrl, setExternalUrl] = useState(() => typeof initialItems[0]?.url === 'string' ? initialItems[0].url : '');
  const suggestions = editorialCompositionSuggestions(items.length || (externalUrl ? 1 : 0));
  const [presetId, setPresetId] = useState(suggestions[0].id);
  const selectedIds = items.flatMap((item) => typeof item.assetId === 'string' && item.assetId ? [item.assetId] : []);
  const activeItem = items[activeIndex];
  const activeAsset = availableImages.find((image) => image.id === activeItem?.assetId);
  const toggleImage = (image: LocalImageAsset) => {
    setExternalUrl('');
    setItems((current) => {
      const index = current.findIndex((item) => item.assetId === image.id);
      if (index >= 0) return isGallery ? current.filter((_, itemIndex) => itemIndex !== index) : current;
      const item: EditorialJsonObject = { alt: image.name, assetId: image.id, assetName: image.name, caption: '', fitMode: 'smart', frame: 'auto', objectPositionX: 50, objectPositionY: 50, url: '', zoom: 1 };
      return isGallery ? [...current, item].slice(0, 6) : [item];
    });
  };
  const updateItem = (index: number, updates: Record<string, EditorialJsonValue>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...updates } : item));
  const moveItem = (direction: -1 | 1) => {
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    [next[activeIndex], next[nextIndex]] = [next[nextIndex], next[activeIndex]];
    setItems(next);
    setActiveIndex(nextIndex);
  };
  const apply = () => {
    const finalItems = externalUrl ? [{ alt: activeItem?.alt ?? '', assetId: '', assetName: '', caption: activeItem?.caption ?? '', fitMode: activeItem?.fitMode ?? 'smart', frame: activeItem?.frame ?? 'auto', url: externalUrl, zoom: activeItem?.zoom ?? 1 }] : items;
    onApply(finalItems, suggestions.find((preset) => preset.id === presetId) ?? suggestions[0]);
  };
  return (
    <div className="fixed inset-0 z-[200] flex justify-end bg-midnight/78 backdrop-blur-lg"><section aria-modal="true" className="flex h-full w-full max-w-5xl flex-col border-l border-bronze/30 bg-[linear-gradient(150deg,#121719,#090909_60%,#21150d)] shadow-[-30px_0_100px_rgba(0,0,0,.68)]" role="dialog"><header className="flex shrink-0 items-center gap-3 border-b border-bronze/20 px-4 py-3 sm:px-5"><div className="min-w-0 flex-1"><p className="text-[0.6rem] uppercase tracking-[0.16em] text-ember">Media Composer</p><h2 className="mt-1 truncate text-base font-semibold">{isGallery ? 'Build a photo layout' : target.kind === 'background' ? 'Set the scene atmosphere' : 'Choose a photograph'}</h2></div><IconButton label="Close media composer" onClick={onClose}><X size={18} /></IconButton></header><div className="studio-scrollbar grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(19rem,.85fr)]"><div className="border-b border-bronze/18 p-4 lg:border-b-0 lg:border-r lg:p-5"><EditorialMediaPicker editorialImages={editorialImages} maxSelections={isGallery ? 6 : 1} onAddAssets={onAddAssets} onSelect={toggleImage} projectImages={projectImages} selectUploaded selectedIds={selectedIds} /><label className="mt-4 block"><span className="mb-2 block text-[0.58rem] uppercase tracking-[0.13em] text-stardust/38">Or use an external image URL</span><input className={inputClassName} inputMode="url" onChange={(event) => { setExternalUrl(event.target.value); if (event.target.value) setItems([]); }} placeholder="https://..." type="url" value={externalUrl} /></label>{isGallery && items.length > 0 ? <div className="mt-5"><div className="flex items-end justify-between"><div><p className="text-[0.58rem] uppercase tracking-[0.13em] text-stardust/38">Selected order</p><p className="mt-1 text-xs text-stardust/34">Choose an image to frame or move.</p></div><span className="text-xs text-ember">{items.length}/6</span></div><div className="mt-3 flex gap-2 overflow-x-auto pb-2">{items.map((item, index) => { const asset = availableImages.find((image) => image.id === item.assetId); return <button className={cn('relative h-24 w-20 shrink-0 overflow-hidden rounded-lg border', activeIndex === index ? 'border-ember ring-1 ring-ember/50' : 'border-stardust/12')} key={`${String(item.assetId)}-${index}`} onClick={() => setActiveIndex(index)} type="button">{asset ? <img alt="" className="h-full w-full object-cover" src={asset.remoteUrl || asset.dataUrl} /> : <ImageIcon className="m-auto text-stardust/24" size={18} />}<span className="absolute bottom-1 left-1 rounded bg-midnight/82 px-1.5 py-0.5 text-[0.52rem]">{index + 1}</span></button>; })}</div><div className="flex gap-2"><Button disabled={activeIndex <= 0} icon={<ChevronLeft size={14} />} onClick={() => moveItem(-1)} size="sm" variant="ghost">Move left</Button><Button disabled={activeIndex >= items.length - 1} icon={<ChevronRight size={14} />} onClick={() => moveItem(1)} size="sm" variant="ghost">Move right</Button></div></div> : null}</div><div className="p-4 lg:p-5"><div><p className="text-[0.58rem] uppercase tracking-[0.13em] text-stardust/38">Assisted composition</p><p className="mt-1 text-xs leading-5 text-stardust/36">Choose a polished starting point. Nothing changes until you apply it.</p></div><div className="mt-3 grid gap-2">{suggestions.map((preset) => <button aria-pressed={presetId === preset.id} className={cn('rounded-xl border p-3 text-left transition', presetId === preset.id ? 'border-ember/58 bg-ember/[0.09]' : 'border-bronze/20 bg-midnight/34 hover:border-bronze/44')} key={preset.id} onClick={() => setPresetId(preset.id)} type="button"><span className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{preset.label}</span>{presetId === preset.id ? <Check className="text-ember" size={15} /> : null}</span><span className="mt-1.5 block text-[0.65rem] leading-5 text-stardust/40">{preset.description}</span></button>)}</div>{activeItem && activeAsset ? <div className="mt-5"><EditorialImageFramingControls asset={activeAsset} content={activeItem as EditorialImageContent} onChange={(updates) => updateItem(activeIndex, updates)} /><div className="mt-3 grid gap-3"><InspectorField label="Alt text"><input className={inputClassName} onChange={(event) => updateItem(activeIndex, { alt: event.target.value })} placeholder="Describe the image" value={typeof activeItem.alt === 'string' ? activeItem.alt : ''} /></InspectorField><InspectorField label="Caption"><input className={inputClassName} onChange={(event) => updateItem(activeIndex, { caption: event.target.value })} placeholder="Optional editorial caption" value={typeof activeItem.caption === 'string' ? activeItem.caption : ''} /></InspectorField></div></div> : <div className="mt-5 rounded-xl border border-dashed border-bronze/22 p-6 text-center"><WandSparkles className="mx-auto text-ember/62" size={22} /><p className="mt-3 text-xs leading-5 text-stardust/42">Choose a photograph to reveal framing controls.</p></div>}</div></div><footer className="flex shrink-0 items-center justify-between gap-3 border-t border-bronze/20 bg-midnight/92 px-4 py-3 sm:px-5"><p className="hidden text-xs text-stardust/36 sm:block">{items.length || (externalUrl ? 1 : 0)} selected · {suggestions.find((preset) => preset.id === presetId)?.label}</p><div className="ml-auto flex gap-2"><Button onClick={onClose} variant="ghost">Cancel</Button><Button disabled={!items.length && !externalUrl} icon={<Sparkles size={15} />} onClick={apply}>Apply Layout</Button></div></footer></section></div>
  );
}

function mediaItems(block: EditorialBlock | undefined, scene: EditorialScene | undefined, target: MediaTarget): EditorialJsonObject[] {
  if (target.kind === 'background') {
    if (!scene?.background.imageId && !scene?.background.imageUrl) return [];
    return [{ ...(scene.background.settings ?? {}), assetId: scene.background.imageId ?? '', url: scene.background.imageUrl ?? '' }];
  }
  if (!block) return [];
  const content = record(block.content);
  if (block.type === 'gallery') return Array.isArray(content.images) ? content.images.filter(isRecord) as EditorialJsonObject[] : [];
  return [content];
}

function SceneFabricPicker({ fabrics, onUpdate, project, scene }: { fabrics: Fabric[]; onUpdate: (updates: Partial<EditorialScene>) => void; project?: ApparelProject; scene: EditorialScene }) {
  const linkedFabrics = projectLinkedEditorialFabrics(project, fabrics);
  const selectedIds = scene.fabricIds ?? [];
  const toggleFabric = (fabricId: string) => {
    const selected = selectedIds.includes(fabricId);
    if (!selected && selectedIds.length >= 4) return;
    const nextIds = selected ? selectedIds.filter((id) => id !== fabricId) : [...selectedIds, fabricId];
    const linked = linkedFabrics.find(({ fabric }) => fabric.id === fabricId);
    const retainedFallbacks = (scene.fabricFallbacks ?? []).filter((item) => nextIds.includes(item.fabricId));
    onUpdate({ fabricFallbacks: !selected && linked ? [...retainedFallbacks, fabricEditorialFallback(linked.fabric, linked.material)] : retainedFallbacks, fabricIds: nextIds });
  };
  return <section><div className="flex items-end justify-between"><div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-stardust/42">Scene fabrics</p><p className="mt-1 text-xs text-stardust/34">Choose up to four linked records.</p></div><span className="text-xs text-ember">{selectedIds.length}/4</span></div>{linkedFabrics.length ? <div className="mt-3 space-y-2">{linkedFabrics.map(({ fabric, material }) => { const selected = selectedIds.includes(fabric.id); return <button aria-pressed={selected} className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition', selected ? 'border-ember/54 bg-ember/9' : 'border-bronze/20 bg-midnight/34 hover:border-bronze/44')} disabled={!selected && selectedIds.length >= 4} key={fabric.id} onClick={() => toggleFabric(fabric.id)} type="button"><FabricColorOrb className="h-8 w-8" fabric={fabric} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{fabric.name}</span><span className="mt-1 block truncate text-[0.62rem] text-stardust/40">{material.role} · {fabric.composition}</span></span>{selected ? <Check className="text-ember" size={15} /> : <Plus className="text-stardust/24" size={15} />}</button>; })}</div> : <div className="mt-3 rounded-xl border border-dashed border-bronze/22 p-4 text-center text-xs leading-5 text-stardust/38">Link a Fabric Vault record in Project Materials to feature it here.</div>}</section>;
}

function SceneRecipeIcon({ sceneType }: { sceneType: EditorialSceneType }) {
  if (sceneType === 'gallery') return <Images size={17} />;
  if (sceneType === 'fabric-story') return <SwatchBook size={17} />;
  if (sceneType === 'construction' || sceneType === 'technical') return <Settings2 size={17} />;
  if (sceneType === 'cover' || sceneType === 'closing') return <Sparkles size={17} />;
  return <FileText size={17} />;
}

function ReadinessChip({ label, ready }: { label: string; ready: boolean }) {
  return <span className={cn('flex min-h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-[0.56rem] uppercase tracking-[0.08em]', ready ? 'border-teal-100/18 bg-teal-100/[0.05] text-teal-100/68' : 'border-stardust/8 text-stardust/28')}>{ready ? <Check size={11} /> : <Circle size={9} />}{label}</span>;
}

function InspectorField({ children, label }: { children: ReactNode; label: string }) { return <label className="block"><span className="mb-2 block text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-stardust/42">{label}</span>{children}</label>; }
function ToolbarButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) { return <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-bronze/22 px-3 text-xs text-stardust/54 transition hover:border-ember/42 hover:text-stardust" onClick={onClick} type="button">{icon}<span className="hidden sm:inline">{label}</span></button>; }
function IconButton({ children, disabled = false, label, onClick }: { children: ReactNode; disabled?: boolean; label: string; onClick: () => void }) { return <button aria-label={label} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-bronze/24 text-stardust/54 transition hover:border-ember/48 hover:text-stardust disabled:cursor-not-allowed disabled:opacity-24" disabled={disabled} onClick={onClick} type="button">{children}</button>; }

const inputClassName = 'h-12 w-full rounded-xl border border-bronze/28 bg-midnight/64 px-3 text-sm text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/58';
const textAreaClassName = 'min-h-32 w-full resize-y rounded-xl border border-bronze/28 bg-midnight/64 px-3 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/58';
function orderedScenes(scenes: EditorialScene[]) { return [...scenes].sort((a, b) => a.order - b.order).map((scene, order) => ({ ...scene, order })); }
function sceneSignature(scenes: EditorialScene[]) { return JSON.stringify(orderedScenes(scenes)); }
function mediaSignature(images: LocalImageAsset[]) { return images.map((image) => image.id).join('|'); }
function record(value: EditorialJsonValue): EditorialJsonObject { return isRecord(value) ? value : {}; }
function isRecord(value: unknown): value is EditorialJsonObject { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
