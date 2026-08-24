import { useEffect, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { supabaseConfigStatus } from '../lib/supabase';
import {
  fetchPublishedEditorial,
  fetchPublishedPortfolioProject,
  fetchPublicPortfolio,
} from '../lib/publicPortfolioPublication';
import { PublicPortfolioPage } from '../pages/PublicPortfolio';
import type { PublicPortfolioRoute as PublicPortfolioRouteValue } from '../lib/appRoutes';
import {
  loadPublicPortfolioSnapshot,
  savePublicPortfolioSnapshot,
} from '../utils/publicPortfolioCache';

export function PublicPortfolioRoute({ route }: { route: PublicPortfolioRouteValue }) {
  const [snapshot, setSnapshot] = useState(() => loadPublicPortfolioSnapshot(route.usernameSlug));
  const [isLoadingPublication, setIsLoadingPublication] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setSnapshot(loadPublicPortfolioSnapshot(route.usernameSlug));
    setIsLoadingPublication(true);
    setLoadError(null);

    const loadPublication = route.projectSlug
      ? fetchPublishedPortfolioProject(route.usernameSlug, route.projectSlug)
      : route.editorialSlug
        ? fetchPublishedEditorial(route.usernameSlug, route.editorialSlug)
        : fetchPublicPortfolio(route.usernameSlug);

    void loadPublication
      .then((publishedSnapshot) => {
        if (!active) return;
        if (!publishedSnapshot) {
          if (supabaseConfigStatus.isConfigured) setSnapshot(null);
          return;
        }
        savePublicPortfolioSnapshot(publishedSnapshot);
        setSnapshot(publishedSnapshot);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'The public portfolio could not be reached.',
          );
        }
      })
      .finally(() => {
        if (active) setIsLoadingPublication(false);
      });

    return () => {
      active = false;
    };
  }, [route.editorialSlug, route.projectSlug, route.usernameSlug]);

  if (!snapshot && isLoadingPublication) {
    return <PublicPortfolioLoading />;
  }

  if (!snapshot) {
    if (loadError) return <PublicPortfolioLoadError profileSlug={route.usernameSlug} />;

    return (
      <PublicPortfolioPage
        editorialProjectSlug={route.editorialProjectSlug}
        editorialSlug={route.editorialSlug}
        isPublished={false}
        projectSlug={route.projectSlug}
        snapshot={{
          editorials: [],
          generatedAt: new Date(0).toISOString(),
          profile: { bio: '', displayName: '', headline: '', usernameSlug: route.usernameSlug },
          projects: [],
        }}
      />
    );
  }

  return (
    <PublicPortfolioPage
      editorialProjectSlug={route.editorialProjectSlug}
      editorialSlug={route.editorialSlug}
      isPublished={snapshot.profile.usernameSlug === route.usernameSlug}
      projectSlug={route.projectSlug}
      snapshot={snapshot}
    />
  );
}

function PublicPortfolioLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#080909] px-5 text-stardust">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border border-ember/25 border-t-ember" />
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-stardust/42">Opening portfolio</p>
      </div>
    </div>
  );
}

function PublicPortfolioLoadError({ profileSlug }: { profileSlug: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#080909] px-5 text-stardust">
      <section className="max-w-lg text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-bronze/30 bg-charcoal text-ember">
          <CloudOff aria-hidden="true" size={23} />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-ember">Portfolio temporarily unavailable</p>
        <h1 className="font-display mt-4 text-4xl leading-tight">This portfolio could not be loaded.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-stardust/54">Please check your connection and try again. No private Studio information is shown when a public snapshot cannot be reached.</p>
        <a className="mt-7 inline-flex min-h-11 items-center rounded-md border border-bronze/34 px-4 text-sm text-stardust transition hover:border-ember/50 hover:text-ember" href={`/portfolio/${profileSlug}`}>Return to portfolio</a>
      </section>
    </div>
  );
}
