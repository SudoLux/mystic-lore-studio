import { useEffect, useState } from 'react';
import {
  Check,
  FileText,
  Globe2,
  Mail,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { slugifyPortfolioValue } from '../../lib/portfolio';
import { cn } from '../../lib/classes';
import type { PortfolioProfile } from '../../types/portfolio';
import type { ApparelProject, LocalImageAsset } from '../../types/studio';
import { Badge } from '../shared/Badge';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { StoredImage } from '../shared/StoredImage';

type PortfolioProfileEditorProps = {
  imageAssets: LocalImageAsset[];
  onSave: (profile: PortfolioProfile) => void;
  profile: PortfolioProfile;
  projects: ApparelProject[];
};

export function PortfolioProfileEditor({
  imageAssets,
  onSave,
  profile,
  projects,
}: PortfolioProfileEditorProps) {
  const [draft, setDraft] = useState(profile);
  const [saveAttempted, setSaveAttempted] = useState(false);

  useEffect(() => {
    setDraft(profile);
    setSaveAttempted(false);
  }, [profile]);

  const previewSlug = draft.usernameSlug.trim()
    ? slugifyPortfolioValue(draft.usernameSlug)
    : '';
  const emailWarning = getEmailWarning(draft.email);
  const resumeWarning = urlWarning(draft.resumeUrl);
  const profileDirty = JSON.stringify(draft) !== JSON.stringify(profile);
  const displayNameMissing = !draft.displayName.trim();
  const usernameMissing = !previewSlug;
  const formIsValid = !displayNameMissing && !usernameMissing && !emailWarning && !resumeWarning;
  const selectedAvatar = imageAssets.find(
    (asset) => asset.id === draft.avatarImageId,
  );

  const updateDisplayName = (displayName: string) => {
    setDraft((current) => ({
      ...current,
      displayName,
      usernameSlug: current.usernameSlug.trim()
        ? current.usernameSlug
        : displayName.trim()
          ? slugifyPortfolioValue(displayName)
          : '',
    }));
  };

  const save = () => {
    setSaveAttempted(true);
    if (!formIsValid) return;
    onSave({
      ...draft,
      displayName: draft.displayName.trim(),
      usernameSlug: previewSlug,
    });
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.7fr)]">
      <Card className="min-w-0" elevated>
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ember/30 bg-ember/10 text-ember">
            <UserRound aria-hidden="true" size={19} />
          </span>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ember">
              Portfolio Profile
            </p>
            <h2 className="mt-1 text-lg font-semibold text-stardust">
              The person behind the work
            </h2>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ProfileField
            error={saveAttempted && displayNameMissing ? 'Add a display name for recruiter preview.' : undefined}
            label="Display Name"
            onChange={updateDisplayName}
            required
            value={draft.displayName}
          />
          <ProfileField
            error={saveAttempted && usernameMissing ? 'Choose a portfolio username.' : undefined}
            label="Username Slug"
            onBlur={() => {
              if (draft.usernameSlug.trim()) {
                setDraft((current) => ({
                  ...current,
                  usernameSlug: slugifyPortfolioValue(current.usernameSlug),
                }));
              }
            }}
            onChange={(usernameSlug) => setDraft((current) => ({ ...current, usernameSlug }))}
            prefix="/portfolio/"
            required
            value={draft.usernameSlug}
          />
          <ProfileField
            className="sm:col-span-2"
            label="Headline"
            onChange={(headline) => setDraft((current) => ({ ...current, headline }))}
            value={draft.headline}
          />
          <ProfileField
            className="sm:col-span-2"
            label="Bio"
            multiline
            onChange={(bio) => setDraft((current) => ({ ...current, bio }))}
            value={draft.bio}
          />
          <ProfileField
            label="Location"
            onChange={(location) => setDraft((current) => ({ ...current, location: location || undefined }))}
            value={draft.location ?? ''}
          />
          <ProfileField
            error={emailWarning}
            label="Email"
            onChange={(email) => setDraft((current) => ({ ...current, email: email || undefined }))}
            type="email"
            value={draft.email ?? ''}
          />
          <ProfileField
            className="sm:col-span-2"
            error={resumeWarning}
            hint="Use a full https:// link to a resume or portfolio document."
            label="Resume URL"
            onChange={(resumeUrl) => setDraft((current) => ({ ...current, resumeUrl: resumeUrl || undefined }))}
            type="url"
            value={draft.resumeUrl ?? ''}
          />
        </div>

        {imageAssets.length ? (
          <AvatarSelector
            assets={imageAssets}
            onSelect={(avatarImageId) => setDraft((current) => ({
              ...current,
              avatarImageId,
            }))}
            selectedId={draft.avatarImageId}
          />
        ) : null}

        <div className="mt-5 rounded-2xl border border-bronze/20 bg-midnight/28 px-4 py-3">
          <p className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-stardust/38">
            Preview URL
          </p>
          <p className="mt-1 break-all text-sm text-stardust/72">
            /portfolio/{previewSlug || 'your-name'}
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-bronze/18 pt-5">
          <p className="max-w-md text-xs leading-5 text-stardust/45">
            Display name and username are required before this profile can be used in a public preview.
          </p>
          <Button disabled={!profileDirty} onClick={save} variant="primary">
            Save Profile
          </Button>
        </div>
      </Card>

      <Card className="min-w-0 overflow-hidden p-0 xl:sticky xl:top-5 xl:self-start">
        <PortfolioProfilePreview
          avatar={selectedAvatar}
          profile={draft}
          projectCount={projects.length}
          resumeIsValid={!resumeWarning}
        />
      </Card>
    </div>
  );
}

function AvatarSelector({
  assets,
  onSelect,
  selectedId,
}: {
  assets: LocalImageAsset[];
  onSelect: (assetId?: string) => void;
  selectedId?: string;
}) {
  return (
    <fieldset className="mt-5 min-w-0 max-w-full border-t border-bronze/18 pt-5">
      <legend className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stardust/46">
        Avatar Image
      </legend>
      <p className="mt-2 text-xs leading-5 text-stardust/42">
        Choose from imagery already stored with your projects.
      </p>
      <div className="mt-3 flex w-full max-w-full gap-2 overflow-x-auto pb-2 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          aria-label="Use initials instead of an avatar image"
          aria-pressed={!selectedId}
          className={cn(
            'relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-xl border bg-midnight/42 text-stardust/42 transition hover:border-ember/45 hover:text-ember sm:w-16',
            !selectedId && 'border-ember/65 ring-2 ring-ember/12',
          )}
          onClick={() => onSelect(undefined)}
          type="button"
        >
          <UserRound aria-hidden="true" className="mx-auto" size={21} />
          {!selectedId ? <SelectionMark /> : null}
        </button>
        {assets.map((asset) => {
          const selected = asset.id === selectedId;
          return (
            <button
              aria-label={`Use ${asset.name} as portfolio avatar`}
              aria-pressed={selected}
              className={cn(
                'relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-xl border border-bronze/24 bg-midnight/42 transition hover:border-ember/45 sm:w-16',
                selected && 'border-ember/65 ring-2 ring-ember/12',
              )}
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              title={asset.name}
              type="button"
            >
              <StoredImage
                alt=""
                asset={asset}
                className="h-full w-full object-cover"
                decorative
                displayOverride={{ objectFit: 'cover', zoom: 1 }}
              />
              {selected ? <SelectionMark /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function SelectionMark() {
  return (
    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-midnight shadow-lg">
      <Check aria-hidden="true" size={13} strokeWidth={2.4} />
    </span>
  );
}

function PortfolioProfilePreview({
  avatar,
  profile,
  projectCount,
  resumeIsValid,
}: {
  avatar?: LocalImageAsset;
  profile: PortfolioProfile;
  projectCount: number;
  resumeIsValid: boolean;
}) {
  const initials = getInitials(profile.displayName);
  return (
    <div className="relative flex min-h-[28rem] flex-col overflow-hidden bg-[radial-gradient(circle_at_75%_18%,rgba(45,92,107,0.28),transparent_28%),linear-gradient(145deg,#11151a,#0a0a0a_52%,#241a14)] p-6 sm:min-h-[30rem] sm:p-7">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(200,155,60,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(200,155,60,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="relative flex items-center justify-between">
        <Badge variant="ember">Live Recruiter Preview</Badge>
        <Globe2 aria-hidden="true" className="text-stardust/34" size={19} />
      </div>

      <div className="relative mt-auto">
        <div className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-ember/42 bg-ember/12 text-xl font-semibold text-ember shadow-[0_18px_50px_rgba(0,0,0,0.3)]">
          {avatar ? (
            <StoredImage alt={`${profile.displayName || 'Portfolio'} avatar`} asset={avatar} displayOverride={{ objectFit: 'cover', zoom: 1 }} />
          ) : initials ? initials : <UserRound aria-hidden="true" size={26} />}
        </div>
        <Sparkles aria-hidden="true" className="mb-4 text-ember" size={22} />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ember">
          Independent garment studio
        </p>
        <h2 className="font-display mt-3 break-words text-3xl leading-tight text-stardust sm:text-4xl">
          {profile.displayName || 'Your name'}
        </h2>
        <p className="mt-3 text-base leading-7 text-stardust/72">
          {profile.headline || 'Designer, maker, and visual storyteller.'}
        </p>
        {profile.bio ? (
          <p className="mt-4 line-clamp-4 text-sm leading-6 text-stardust/54">
            {profile.bio}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {profile.email ? (
            <a className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-bronze/36 bg-midnight/42 px-3 text-sm text-stardust/72 transition hover:border-ember/48 hover:text-stardust" href={`mailto:${profile.email}`}>
              <Mail aria-hidden="true" size={15} /> Contact
            </a>
          ) : null}
          {profile.resumeUrl && resumeIsValid ? (
            <a className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-bronze/36 bg-midnight/42 px-3 text-sm text-stardust/72 transition hover:border-ember/48 hover:text-stardust" href={profile.resumeUrl} rel="noreferrer" target="_blank">
              <FileText aria-hidden="true" size={15} /> Resume
            </a>
          ) : null}
        </div>
        <div className="mt-6 flex items-center gap-3 border-t border-bronze/22 pt-4 text-xs text-stardust/46">
          <span>{projectCount} selected project{projectCount === 1 ? '' : 's'}</span>
          <span aria-hidden="true">·</span>
          <span>{profile.location || 'Location open'}</span>
        </div>
      </div>
    </div>
  );
}

function ProfileField({
  className,
  error,
  hint,
  label,
  multiline = false,
  onBlur,
  onChange,
  prefix,
  required = false,
  type = 'text',
  value,
}: {
  className?: string;
  error?: string;
  hint?: string;
  label: string;
  multiline?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  prefix?: string;
  required?: boolean;
  type?: string;
  value: string;
}) {
  const controlClass = cn(
    'min-h-[3.25rem] w-full rounded-xl border bg-midnight/42 px-3.5 text-sm text-stardust outline-none transition placeholder:text-stardust/26 focus:ring-2',
    error
      ? 'border-ember/60 focus:border-ember focus:ring-ember/12'
      : 'border-bronze/26 focus:border-ember/56 focus:ring-ember/10',
  );
  return (
    <label className={className}>
      <span className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-stardust/46">
        {label}{required ? <span className="ml-1 text-ember">*</span> : null}
      </span>
      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-stardust/32">
            {prefix}
          </span>
        ) : null}
        {multiline ? (
          <textarea
            aria-invalid={Boolean(error)}
            className={cn(controlClass, 'min-h-28 resize-none py-3')}
            onChange={(event) => onChange(event.target.value)}
            value={value}
          />
        ) : (
          <input
            aria-invalid={Boolean(error)}
            className={cn(controlClass, prefix && 'pl-[5.7rem]')}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            type={type}
            value={value}
          />
        )}
      </div>
      {error ? (
        <p className="mt-2 text-xs leading-5 text-ember">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-xs leading-5 text-stardust/38">{hint}</p>
      ) : null}
    </label>
  );
}

function urlWarning(value?: string) {
  if (!value?.trim()) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? undefined
      : 'Use a web address beginning with https://.';
  } catch {
    return 'This resume link does not look complete yet.';
  }
}

function getEmailWarning(value?: string) {
  if (!value?.trim()) return undefined;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ? undefined
    : 'This email address looks incomplete.';
}

function getInitials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
