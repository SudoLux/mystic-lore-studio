import {
  BookOpen,
  FileText,
  NotebookTabs,
  Package,
  Search,
  Shirt,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { cn } from '../../lib/classes';
import { getEditorialDisplayLabel } from '../../lib/editorialLabels';
import type { ApparelProject, Fabric } from '../../types/studio';

type SearchResultType = 'Projects' | 'Fabrics' | 'Tasks' | 'Notes' | 'Editorial Collections';

type SearchResult = {
  description: string;
  id: string;
  meta: string;
  projectId?: string;
  targetId: string;
  title: string;
  type: SearchResultType;
};

type SearchIndexEntry = SearchResult & {
  searchText: string;
};

type GlobalSearchProps = {
  fabrics: Fabric[];
  onOpenFabric: (fabricId: string) => void;
  onOpenProject: (projectId: string) => void;
  projects: ApparelProject[];
};

const resultTypes: SearchResultType[] = [
  'Projects',
  'Fabrics',
  'Tasks',
  'Notes',
  'Editorial Collections',
];

const typeIcons: Record<SearchResultType, typeof Shirt> = {
  Fabrics: Package,
  'Editorial Collections': BookOpen,
  Notes: NotebookTabs,
  Projects: Shirt,
  Tasks: FileText,
};

export function GlobalSearch({
  fabrics,
  onOpenFabric,
  onOpenProject,
  projects,
}: GlobalSearchProps) {
  const [query, setQuery] = useState(() => getInitialSearchQuery());
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchIndex = useMemo(
    () => buildSearchIndex(projects, fabrics),
    [fabrics, projects],
  );
  const results = useMemo(
    () => getSearchResults(query, searchIndex),
    [query, searchIndex],
  );
  const hasQuery = query.trim().length > 0;
  const totalResults = results.reduce((total, group) => total + group.results.length, 0);

  const openResult = (result: SearchResult) => {
    if (result.type === 'Fabrics') {
      onOpenFabric(result.targetId);
    } else {
      onOpenProject(result.projectId ?? result.targetId);
    }

    setQuery('');
    setMobileOpen(false);
  };

  return (
    <section className="relative z-30 mb-4 sm:mb-5">
      <button
        className="mb-1 flex min-h-11 w-full items-center gap-3 rounded-2xl border border-bronze/24 bg-midnight/42 px-4 text-left text-sm text-stardust/50 shadow-[0_12px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden"
        onClick={() => setMobileOpen(true)}
        type="button"
      >
        <Search
          aria-hidden="true"
          className="shrink-0 text-ember"
          size={17}
          strokeWidth={1.9}
        />
        <span className="min-w-0 flex-1 truncate">Search studio records</span>
      </button>

      <div className="hidden rounded-3xl border border-bronze/28 bg-[linear-gradient(145deg,rgba(10,10,10,0.58),rgba(61,43,31,0.16))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(237,227,207,0.035)] backdrop-blur-xl lg:block">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-bronze/28 bg-stardust/[0.06] px-4 transition focus-within:border-ember/60 focus-within:bg-stardust/[0.08]">
          <Search
            aria-hidden="true"
            className="shrink-0 text-ember"
            size={18}
            strokeWidth={1.9}
          />
          <span className="sr-only">Global search</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-stardust outline-none placeholder:text-stardust/38"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects, fabrics, tasks, notes, editorial collections..."
            value={query}
          />
          {hasQuery ? (
            <button
              aria-label="Clear search"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-transparent text-stardust/52 transition hover:border-bronze/30 hover:text-stardust"
              onClick={() => setQuery('')}
              type="button"
            >
              <X aria-hidden="true" size={15} strokeWidth={1.9} />
            </button>
          ) : null}
        </label>
      </div>

      {hasQuery || mobileOpen ? (
        <div className="studio-scrollbar fixed inset-0 z-50 max-h-dvh overflow-y-auto bg-[linear-gradient(135deg,rgba(27,58,99,0.28),rgba(10,10,10,0.99),rgba(61,43,31,0.62))] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(237,227,207,0.05)] backdrop-blur-2xl lg:absolute lg:inset-auto lg:left-0 lg:right-0 lg:top-[calc(100%+0.5rem)] lg:max-h-[70vh] lg:rounded-3xl lg:border lg:border-bronze/32">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="teal">Global Search</Badge>
              <p className="mt-2 text-sm text-stardust/56">
                {hasQuery
                  ? `${totalResults} ${totalResults === 1 ? 'result' : 'results'} for "${query.trim()}"`
                  : 'Find projects, fabrics, tasks, notes, and editorial collections.'}
              </p>
            </div>
            <Button
              onClick={() => {
                setQuery('');
                setMobileOpen(false);
              }}
              size="sm"
              variant="ghost"
            >
              Close
            </Button>
          </div>

          <label className="mb-4 flex min-h-12 items-center gap-3 rounded-2xl border border-bronze/28 bg-stardust/[0.06] px-4 transition focus-within:border-ember/60 focus-within:bg-stardust/[0.08] lg:hidden">
            <Search
              aria-hidden="true"
              className="shrink-0 text-ember"
              size={18}
              strokeWidth={1.9}
            />
            <span className="sr-only">Global search</span>
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-stardust outline-none placeholder:text-stardust/38"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search studio..."
              value={query}
            />
          </label>

          {hasQuery && totalResults > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {results.map((group) =>
                group.results.length > 0 ? (
                  <SearchGroup
                    key={group.type}
                    onOpenResult={openResult}
                    results={group.results}
                    type={group.type}
                  />
                ) : null,
              )}
            </div>
          ) : hasQuery ? (
            <div className="rounded-2xl border border-dashed border-bronze/28 bg-midnight/28 p-6 text-center">
              <Search
                aria-hidden="true"
                className="mx-auto text-ember"
                size={26}
                strokeWidth={1.8}
              />
              <p className="mt-4 text-lg font-semibold text-stardust">
                No studio records found
              </p>
              <p className="mt-2 text-sm leading-6 text-stardust/58">
                Try a project title, material color, task category, note phrase,
                or editorial collection headline.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-bronze/28 bg-midnight/28 p-6 text-center">
              <Search
                aria-hidden="true"
                className="mx-auto text-ember"
                size={26}
                strokeWidth={1.8}
              />
              <p className="mt-4 text-lg font-semibold text-stardust">
                Start with a studio cue
              </p>
              <p className="mt-2 text-sm leading-6 text-stardust/58">
                Try a garment name, fabric color, task status, or note phrase.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function SearchGroup({
  onOpenResult,
  results,
  type,
}: {
  onOpenResult: (result: SearchResult) => void;
  results: SearchResult[];
  type: SearchResultType;
}) {
  const Icon = typeIcons[type];

  return (
    <section className="rounded-2xl border border-bronze/22 bg-midnight/34 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-bronze/24 bg-espresso/45 text-ember">
            <Icon aria-hidden="true" size={17} strokeWidth={1.9} />
          </span>
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stardust/58">
            {type}
          </h3>
        </div>
        <span className="text-sm font-medium text-ember">{results.length}</span>
      </div>
      <div className="space-y-2">
        {results.map((result) => (
          <button
            className={cn(
              'group block w-full rounded-2xl border border-bronze/18 bg-stardust/[0.045] p-3 text-left transition duration-200',
              'hover:border-ember/45 hover:bg-stardust/[0.075]',
            )}
            key={`${result.type}-${result.id}`}
            onClick={() => onOpenResult(result)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-stardust">
                  {result.title}
                </p>
                <p className="mt-1 text-xs text-stardust/45">{result.meta}</p>
              </div>
              <span className="shrink-0 rounded-full border border-bronze/25 px-2 py-0.5 text-[0.65rem] text-stardust/48 transition group-hover:border-ember/40 group-hover:text-ember">
                Open
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-xs leading-5 text-stardust/56">
              {result.description}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function buildSearchIndex(
  projects: ApparelProject[],
  fabrics: Fabric[],
): SearchIndexEntry[] {
  const projectResults = projects.map<SearchIndexEntry>((project) => ({
    description: project.summary || project.designIntent,
    id: project.id,
    meta: `${project.garmentType} / ${project.collection} / ${project.season}`,
    projectId: project.id,
    targetId: project.id,
    title: project.name,
    type: 'Projects',
    searchText: joinSearchText([
      project.name,
      project.garmentType,
      project.collection,
      project.season,
      project.summary,
      project.designIntent,
      project.colorStory,
      project.generalNotes,
      ...project.keyFeatures,
      ...project.tags,
    ]),
  }));

  const fabricResults = fabrics.map<SearchIndexEntry>((fabric) => ({
    description: fabric.loreNote || fabric.notes,
    id: fabric.id,
    meta: `${fabric.category} / ${fabric.colorFamily}`,
    targetId: fabric.id,
    title: fabric.name,
    type: 'Fabrics',
    searchText: joinSearchText([
      fabric.name,
      fabric.category,
      fabric.colorFamily,
      fabric.composition,
      fabric.primaryColor,
      fabric.loreNote,
      fabric.notes,
      ...fabric.bestUses,
      ...fabric.moodTags,
      ...fabric.tags,
    ]),
  }));

  const taskResults = projects.flatMap((project) =>
    project.tasks.map<SearchIndexEntry>((task) => ({
      description: task.description || task.notes || project.name,
      id: task.id,
      meta: `${project.name} / ${getEditorialDisplayLabel(task.category)} / ${task.status}`,
      projectId: project.id,
      targetId: project.id,
      title: task.title,
      type: 'Tasks',
      searchText: joinSearchText([
        task.title,
        task.description,
        task.category,
        task.status,
        task.notes,
        project.name,
      ]),
    })),
  );

  const noteResults = projects.flatMap((project) =>
    project.notes.map<SearchIndexEntry>((note) => ({
      description: note.body,
      id: note.id,
      meta: `${project.name} / ${note.category}`,
      projectId: project.id,
      targetId: project.id,
      title: note.title,
      type: 'Notes',
      searchText: joinSearchText([
        note.title,
        note.category,
        note.body,
        project.name,
      ]),
    })),
  );

  const lookbookResults = projects.flatMap((project) =>
    project.lookbookPages.map<SearchIndexEntry>((page) => ({
      description: page.garmentStory || page.body || page.layoutHint,
      id: page.id,
      meta: `${project.name} / ${page.template ?? page.pageType}`,
      projectId: project.id,
      targetId: project.id,
      title: page.headline || page.title,
      type: 'Editorial Collections',
      searchText: joinSearchText([
        page.headline,
        page.subheadline,
        page.garmentStory,
        page.body,
        page.title,
        ...maybeArray(page.designNotes),
        ...maybeArray(page.materialNotes),
        project.name,
      ]),
    })),
  );

  return [
    ...projectResults,
    ...fabricResults,
    ...taskResults,
    ...noteResults,
    ...lookbookResults,
  ];
}

function getSearchResults(query: string, searchIndex: SearchIndexEntry[]) {
  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const matchedResults =
    terms.length === 0
      ? []
      : searchIndex
          .filter((result) =>
            terms.every((term) => result.searchText.includes(term)),
          )
          .slice(0, 40);

  return resultTypes.map((type) => ({
    results: matchedResults.filter((result) => result.type === type).slice(0, 6),
    type,
  }));
}

function joinSearchText(values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ').toLowerCase();
}

function maybeArray(values?: string[]) {
  return values ?? [];
}

function getInitialSearchQuery() {
  if (typeof window === 'undefined') {
    return '';
  }

  return new URLSearchParams(window.location.search).get('studioSearch') ?? '';
}
