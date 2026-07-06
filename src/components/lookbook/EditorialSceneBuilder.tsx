import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  Layers3,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import {
  createEditorialScene,
  editorialSceneTypeLabel,
  editorialSceneTypeOptions,
} from '../../lib/editorialCollections';
import { resolveEditorialTheme } from '../../lib/editorialThemes';
import { fabricEditorialFallback, projectLinkedEditorialFabrics } from '../../lib/editorialAssets';
import type { EditorialCollection, EditorialScene, EditorialSceneType } from '../../types/editorial';
import type { ApparelProject, Fabric } from '../../types/studio';
import { cn } from '../../lib/classes';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { EditorialCollectionViewer } from './EditorialCollectionViewer';
import { EditorialBlockInspector } from './EditorialBlockInspector';
import { EditorialSceneRenderer } from './scenes/EditorialSceneRenderer';
import { FabricColorOrb } from '../fabrics/FabricColorOrb';

type EditorialSceneBuilderProps = {
  collection: EditorialCollection;
  fabrics?: Fabric[];
  onClose: () => void;
  onSave: (collection: EditorialCollection) => void;
  project?: ApparelProject;
};

export function EditorialSceneBuilder({
  collection,
  fabrics = [],
  onClose,
  onSave,
  project,
}: EditorialSceneBuilderProps) {
  const [scenes, setScenes] = useState(() => orderedScenes(collection.scenes));
  const [activeSceneId, setActiveSceneId] = useState(collection.scenes[0]?.id ?? '');
  const [savedSignature, setSavedSignature] = useState(() => sceneSignature(collection.scenes));
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const theme = useMemo(() => resolveEditorialTheme(collection.themeId), [collection.themeId]);
  const activeScene = scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  const isDirty = sceneSignature(scenes) !== savedSignature;
  const draftCollection = useMemo<EditorialCollection>(() => ({
    ...collection,
    scenes: orderedScenes(scenes),
  }), [collection, scenes]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    setDeleteArmed(false);
  }, [activeSceneId]);

  const requestClose = () => {
    if (isDirty) setIsDiscarding(true);
    else onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPresenting) requestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  const updateActiveScene = (updates: Partial<EditorialScene>) => {
    if (!activeScene) return;
    const timestamp = new Date().toISOString();
    setScenes((current) => current.map((scene) =>
      scene.id === activeScene.id ? { ...scene, ...updates, updatedAt: timestamp } : scene,
    ));
  };

  const addScene = () => {
    const nextScene = createEditorialScene(collection.id, scenes.length);
    setScenes((current) => [...current, nextScene]);
    setActiveSceneId(nextScene.id);
  };

  const moveScene = (direction: -1 | 1) => {
    if (!activeScene) return;
    const currentIndex = scenes.findIndex((scene) => scene.id === activeScene.id);
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= scenes.length) return;
    const reordered = [...scenes];
    [reordered[currentIndex], reordered[nextIndex]] = [reordered[nextIndex], reordered[currentIndex]];
    setScenes(reordered.map((scene, order) => ({ ...scene, order })));
  };

  const deleteScene = () => {
    if (!activeScene) return;
    const currentIndex = scenes.findIndex((scene) => scene.id === activeScene.id);
    const remaining = scenes
      .filter((scene) => scene.id !== activeScene.id)
      .map((scene, order) => ({ ...scene, order }));
    setScenes(remaining);
    setActiveSceneId(remaining[Math.min(currentIndex, remaining.length - 1)]?.id ?? '');
    setDeleteArmed(false);
  };

  const saveChanges = () => {
    const timestamp = new Date().toISOString();
    const savedScenes = orderedScenes(scenes).map((scene, order) => ({ ...scene, order }));
    const savedCollection = { ...collection, scenes: savedScenes, updatedAt: timestamp };
    onSave(savedCollection);
    setScenes(savedScenes);
    setSavedSignature(sceneSignature(savedScenes));
  };

  return createPortal(
    <div className="fixed inset-0 z-[160] bg-[#050505] text-stardust">
      <section aria-label={`Edit scenes for ${collection.title}`} aria-modal="true" className="flex h-dvh flex-col" role="dialog">
        <header className="flex shrink-0 items-center gap-3 border-b border-bronze/24 bg-midnight/92 px-3 py-3 backdrop-blur-xl sm:px-5">
          <button
            aria-label="Close scene builder"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-bronze/28 text-stardust/62 transition hover:border-ember/52 hover:text-stardust"
            onClick={requestClose}
            type="button"
          >
            <X size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="bronze">Scene Builder</Badge>
              <span className={cn('text-[0.62rem] uppercase tracking-[0.14em]', isDirty ? 'text-ember' : 'text-teal-200/65')}>
                {isDirty ? 'Unsaved' : 'Saved'}
              </span>
            </div>
            <h1 className="mt-1 truncate text-sm font-semibold sm:text-base">{collection.title}</h1>
          </div>
          <Button className="hidden sm:inline-flex" icon={<Play size={16} />} onClick={() => setIsPresenting(true)} size="sm" variant="secondary">
            Present
          </Button>
          <Button disabled={!isDirty} icon={<Save size={16} />} onClick={saveChanges} size="sm" variant="primary">
            <span className="hidden sm:inline">Save Changes</span>
            <span className="sm:hidden">Save</span>
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(20rem,52vh)_minmax(0,1fr)] md:grid-cols-[13rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_minmax(15rem,auto)] lg:grid-cols-[15rem_minmax(0,1fr)_21rem] lg:grid-rows-1 xl:grid-cols-[15rem_minmax(0,1fr)_23rem]">
          <SceneList
            activeSceneId={activeScene?.id}
            onAdd={addScene}
            onMove={moveScene}
            onSelect={setActiveSceneId}
            scenes={scenes}
          />

          <main className="min-h-0 border-b border-bronze/20 bg-[radial-gradient(circle_at_50%_42%,rgba(45,92,107,.14),transparent_34%),#080808] p-3 sm:p-4 md:border-l lg:border-b-0 lg:border-r">
            <div className="mx-auto flex h-full max-w-5xl flex-col">
              <div className="mb-2 flex shrink-0 items-center justify-between gap-3 text-[0.62rem] uppercase tracking-[0.16em] text-stardust/38">
                <span>Live scene preview</span>
                <span>{activeScene ? editorialSceneTypeLabel(activeScene.sceneType) : 'No scene selected'}</span>
              </div>
              <div className="editorial-builder-preview relative min-h-0 flex-1 overflow-hidden rounded-xl border border-bronze/32 bg-midnight shadow-[0_22px_70px_rgba(0,0,0,.46)] [&_h1]:!text-[clamp(2rem,5vw,4rem)] [&_h2]:!text-[clamp(1.8rem,4vw,3.5rem)]">
                {activeScene ? (
                  <EditorialSceneRenderer collection={draftCollection} fabrics={fabrics} project={project} scene={activeScene} theme={theme} />
                ) : (
                  <div className="flex h-full items-center justify-center p-8 text-center">
                    <div>
                      <Layers3 className="mx-auto text-ember" size={24} />
                      <p className="mt-4 text-sm text-stardust/52">Add a scene to begin shaping this collection.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          <SceneInspector
            deleteArmed={deleteArmed}
            fabrics={fabrics}
            onArmDelete={() => setDeleteArmed(true)}
            onCancelDelete={() => setDeleteArmed(false)}
            onDelete={deleteScene}
            onPresent={() => setIsPresenting(true)}
            onUpdate={updateActiveScene}
            project={project}
            scene={activeScene}
          />
        </div>
      </section>

      {isPresenting ? (
        <EditorialCollectionViewer collection={draftCollection} fabrics={fabrics} onClose={() => setIsPresenting(false)} project={project} />
      ) : null}

      {isDiscarding ? (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-midnight/82 p-4 backdrop-blur-xl">
          <section aria-modal="true" className="w-full max-w-md rounded-xl border border-bronze/36 bg-[linear-gradient(145deg,#15191c,#0a0a0a_56%,#23170f)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.72)]" role="alertdialog">
            <h2 className="font-display text-xl">Discard scene changes?</h2>
            <p className="mt-3 text-sm leading-6 text-stardust/58">The collection will return to its last saved scene order and settings.</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setIsDiscarding(false)} variant="ghost">Keep Editing</Button>
              <Button className="border-red-300/28 bg-red-300/10 text-red-100" onClick={onClose}>Discard</Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function SceneList({
  activeSceneId,
  onAdd,
  onMove,
  onSelect,
  scenes,
}: {
  activeSceneId?: string;
  onAdd: () => void;
  onMove: (direction: -1 | 1) => void;
  onSelect: (sceneId: string) => void;
  scenes: EditorialScene[];
}) {
  const activeIndex = scenes.findIndex((scene) => scene.id === activeSceneId);
  return (
    <aside className="min-w-0 border-b border-bronze/20 bg-[#090a0a] p-3 md:row-span-2 md:flex md:min-h-0 md:flex-col md:border-b-0 lg:row-span-1">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ember">Scenes</p>
          <p className="mt-1 text-xs text-stardust/38">{scenes.length} total</p>
        </div>
        <button aria-label="Add scene" className="flex h-10 w-10 items-center justify-center rounded-xl border border-ember/34 bg-ember/8 text-ember transition hover:bg-ember/14" onClick={onAdd} type="button">
          <Plus size={17} />
        </button>
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:min-h-0 md:flex-1 md:flex-col md:overflow-y-auto md:pb-0">
        {scenes.map((scene, index) => (
          <button
            className={cn(
              'min-w-40 rounded-xl border p-3 text-left transition md:min-w-0',
              scene.id === activeSceneId
                ? 'border-ember/58 bg-[linear-gradient(135deg,rgba(200,155,60,.14),rgba(45,92,107,.08))] shadow-[inset_3px_0_0_rgba(200,155,60,.8)]'
                : 'border-stardust/9 bg-stardust/[0.025] hover:border-bronze/34 hover:bg-stardust/[0.045]',
            )}
            key={scene.id}
            onClick={() => onSelect(scene.id)}
            type="button"
          >
            <span className="text-[0.58rem] uppercase tracking-[0.14em] text-stardust/34">Scene {String(index + 1).padStart(2, '0')}</span>
            <span className="mt-1.5 block truncate text-sm font-semibold text-stardust">{scene.title || 'Untitled Scene'}</span>
            <span className="mt-1 block truncate text-[0.68rem] text-stardust/38">{editorialSceneTypeLabel(scene.sceneType)}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 hidden grid-cols-2 gap-2 md:grid">
        <button aria-label="Move selected scene up" className="flex h-10 items-center justify-center rounded-xl border border-bronze/22 text-stardust/52 transition hover:text-stardust disabled:opacity-25" disabled={activeIndex <= 0} onClick={() => onMove(-1)} type="button"><ChevronUp size={17} /></button>
        <button aria-label="Move selected scene down" className="flex h-10 items-center justify-center rounded-xl border border-bronze/22 text-stardust/52 transition hover:text-stardust disabled:opacity-25" disabled={activeIndex < 0 || activeIndex >= scenes.length - 1} onClick={() => onMove(1)} type="button"><ChevronDown size={17} /></button>
      </div>
    </aside>
  );
}

function SceneInspector({
  deleteArmed,
  fabrics,
  onArmDelete,
  onCancelDelete,
  onDelete,
  onPresent,
  onUpdate,
  project,
  scene,
}: {
  deleteArmed: boolean;
  fabrics: Fabric[];
  onArmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onPresent: () => void;
  onUpdate: (updates: Partial<EditorialScene>) => void;
  project?: ApparelProject;
  scene?: EditorialScene;
}) {
  return (
    <aside className="min-h-0 overflow-y-auto bg-[linear-gradient(180deg,#10100f,#090909)] p-4 md:col-start-2 lg:col-start-3 lg:row-start-1">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-ember">Inspector</p>
          <p className="mt-1 text-xs text-stardust/38">Scene settings</p>
        </div>
        <button aria-label="Preview collection" className="flex h-10 w-10 items-center justify-center rounded-xl border border-bronze/28 text-stardust/58 sm:hidden" onClick={onPresent} type="button"><Play size={16} /></button>
      </div>

      {scene ? (
        <div className="mt-5 space-y-5">
          <InspectorField label="Scene title">
            <input className={inputClassName} maxLength={80} onChange={(event) => onUpdate({ title: event.target.value })} placeholder="Untitled Scene" value={scene.title} />
          </InspectorField>
          <InspectorField label="Scene type">
            <select className={inputClassName} onChange={(event) => onUpdate({ sceneType: event.target.value as EditorialSceneType })} value={scene.sceneType}>
              {!editorialSceneTypeOptions.some((option) => option.value === scene.sceneType) ? <option value={scene.sceneType}>{editorialSceneTypeLabel(scene.sceneType)}</option> : null}
              {editorialSceneTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <p className="mt-2 text-xs leading-5 text-stardust/38">{editorialSceneTypeOptions.find((option) => option.value === scene.sceneType)?.description ?? 'This legacy scene type remains fully supported.'}</p>
          </InspectorField>
          <InspectorField label="Subtitle (optional)">
            <input className={inputClassName} maxLength={120} onChange={(event) => onUpdate({ subtitle: event.target.value })} placeholder="A short editorial cue" value={scene.subtitle ?? ''} />
          </InspectorField>
          <InspectorField label="Description (optional)">
            <textarea className="min-h-28 w-full resize-y rounded-xl border border-bronze/28 bg-midnight/64 px-3 py-3 text-sm leading-6 text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/58" maxLength={420} onChange={(event) => onUpdate({ description: event.target.value })} placeholder="Set the intention or narrative for this scene." value={scene.description ?? ''} />
          </InspectorField>
          {['fabric-story', 'materials'].includes(scene.sceneType) ? (
            <SceneFabricPicker fabrics={fabrics} onUpdate={onUpdate} project={project} scene={scene} />
          ) : null}
          <EditorialBlockInspector
            blocks={scene.blocks}
            fabrics={fabrics}
            onChange={(blocks) => onUpdate({ blocks })}
            project={project}
            sceneId={scene.id}
          />
          <div className="border-t border-bronze/18 pt-5">
            {deleteArmed ? (
              <div className="rounded-xl border border-red-300/24 bg-red-300/[0.06] p-3">
                <p className="text-sm font-semibold text-red-100">Delete “{scene.title || 'Untitled Scene'}”?</p>
                <p className="mt-1 text-xs leading-5 text-stardust/44">This removes the scene and all of its blocks when you save.</p>
                <div className="mt-3 flex gap-2">
                  <Button className="flex-1" onClick={onCancelDelete} size="sm" variant="ghost">Cancel</Button>
                  <Button className="flex-1 border-red-300/28 bg-red-300/10 text-red-100" onClick={onDelete} size="sm">Delete</Button>
                </div>
              </div>
            ) : (
              <Button className="w-full justify-center text-red-200/68 hover:text-red-100" icon={<Trash2 size={15} />} onClick={onArmDelete} size="sm" variant="ghost">Delete Scene</Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-bronze/22 p-5 text-center text-sm text-stardust/42">Add a scene to reveal its settings.</div>
      )}
    </aside>
  );
}

function SceneFabricPicker({
  fabrics,
  onUpdate,
  project,
  scene,
}: {
  fabrics: Fabric[];
  onUpdate: (updates: Partial<EditorialScene>) => void;
  project?: ApparelProject;
  scene: EditorialScene;
}) {
  const linkedFabrics = projectLinkedEditorialFabrics(project, fabrics);
  const selectedIds = scene.fabricIds ?? [];
  const missingIds = selectedIds.filter((fabricId) => !linkedFabrics.some(({ fabric }) => fabric.id === fabricId));
  const toggleFabric = (fabricId: string) => {
    const selected = selectedIds.includes(fabricId);
    if (!selected && selectedIds.length >= 4) return;
    const nextIds = selected ? selectedIds.filter((id) => id !== fabricId) : [...selectedIds, fabricId];
    const linked = linkedFabrics.find(({ fabric }) => fabric.id === fabricId);
    const retainedFallbacks = (scene.fabricFallbacks ?? []).filter((item) => nextIds.includes(item.fabricId));
    const nextFallbacks = !selected && linked
      ? [...retainedFallbacks, fabricEditorialFallback(linked.fabric, linked.material)]
      : retainedFallbacks;
    onUpdate({ fabricFallbacks: nextFallbacks, fabricIds: nextIds });
  };

  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-stardust/42">Scene fabrics</p>
          <p className="mt-1 text-xs text-stardust/34">Choose up to four linked records.</p>
        </div>
        <span className="text-xs tabular-nums text-ember/72">{selectedIds.length}/4</span>
      </div>
      {linkedFabrics.length > 0 ? (
        <div className="mt-3 space-y-2">
          {linkedFabrics.map(({ fabric, material }) => {
            const selected = selectedIds.includes(fabric.id);
            const disabled = !selected && selectedIds.length >= 4;
            return (
              <button
                aria-pressed={selected}
                className={cn('flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-35', selected ? 'border-ember/54 bg-ember/9' : 'border-bronze/20 bg-midnight/34 hover:border-bronze/44')}
                disabled={disabled}
                key={fabric.id}
                onClick={() => toggleFabric(fabric.id)}
                type="button"
              >
                <FabricColorOrb className="h-8 w-8" fabric={fabric} />
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{fabric.name}</span><span className="mt-1 block truncate text-[0.62rem] text-stardust/40">{material.role} · {fabric.composition}</span></span>
                <span className={selected ? 'text-ember' : 'text-stardust/24'}>{selected ? '✓' : '+'}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-bronze/22 p-4 text-center text-xs leading-5 text-stardust/38">Link a Fabric Vault record in Project Materials to feature it here.</div>
      )}
      {missingIds.length > 0 ? (
        <div className="mt-2 space-y-2">
          {missingIds.map((fabricId) => {
            const fallback = scene.fabricFallbacks?.find((item) => item.fabricId === fabricId);
            return (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200/18 bg-amber-200/[0.04] p-3" key={fabricId}>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs text-stardust/62">{fallback?.name ?? 'Missing fabric record'}</span><span className="mt-1 block text-[0.58rem] uppercase tracking-[0.12em] text-amber-200/52">Source unavailable</span></span>
                <button className="rounded-lg px-2 py-1 text-xs text-stardust/48 transition hover:text-red-200" onClick={() => toggleFabric(fabricId)} type="button">Remove</button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function InspectorField({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-stardust/42">{label}</span>
      {children}
    </label>
  );
}

const inputClassName = 'h-12 w-full rounded-xl border border-bronze/28 bg-midnight/64 px-3 text-sm text-stardust outline-none transition placeholder:text-stardust/24 focus:border-ember/58';

function orderedScenes(scenes: EditorialScene[]) {
  return [...scenes].sort((a, b) => a.order - b.order).map((scene, order) => ({ ...scene, order }));
}

function sceneSignature(scenes: EditorialScene[]) {
  return JSON.stringify(orderedScenes(scenes));
}
