import { useState, type CSSProperties, type FormEvent } from 'react';
import { ArrowRight, CloudOff, Loader2, LockKeyhole, Mail } from 'lucide-react';
import { BrandLockup } from '../../components/layout/BrandLockup';
import { Button } from '../../components/shared/Button';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/classes';

type AuthMode = 'signin' | 'signup';

export function AuthScreen() {
  const {
    clearError,
    configIssues,
    isConfigured,
    isLoading,
    lastError,
    signIn,
    signUp,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [mode, setMode] = useState<AuthMode>('signin');
  const [password, setPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canSubmit = isConfigured && email.trim() && password.length >= 6;

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setSubmitError(null);
    setSuccessMessage(null);
    clearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      setSubmitError('Enter an email and a password with at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setSuccessMessage(
          'Account created. Check your email if your Supabase project requires confirmation.',
        );
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Authentication failed. Check your details and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-midnight text-stardust">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(200,155,60,0.2),transparent_22rem),radial-gradient(circle_at_82%_18%,rgba(45,92,107,0.22),transparent_24rem),radial-gradient(circle_at_50%_96%,rgba(154,108,60,0.16),transparent_20rem),linear-gradient(145deg,rgba(10,10,10,0.98),rgba(61,43,31,0.34),rgba(10,10,10,0.96))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,0.62),transparent_35%,rgba(10,10,10,0.46)),radial-gradient(circle_at_50%_50%,transparent_0%,rgba(10,10,10,0.34)_72%)]" />
      <FireflyField />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col justify-center gap-6 px-5 pb-[calc(env(safe-area-inset-bottom)+1.7rem)] pt-[calc(env(safe-area-inset-top)+2rem)] sm:gap-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[0.88fr_1fr] lg:items-center lg:gap-12 xl:gap-16">
        <section className="auth-panel-rise text-center lg:text-left">
          <div className="mx-auto max-w-sm sm:hidden">
            <BrandLockup
              className="justify-center"
              showText={false}
              size="settings"
            />
            <h1 className="mt-4 text-[2.25rem] font-semibold leading-[0.98] text-stardust">
              Mystic Lore Studio
            </h1>
            <p className="mx-auto mt-3 max-w-[16rem] text-base leading-6 text-stardust/62">
              Private garment workspace
            </p>
            <div className="auth-mobile-promise mx-auto mt-7 max-w-[18.5rem] rounded-full border border-bronze/18 bg-midnight/24 px-4 py-3 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)] backdrop-blur-md">
              <p className="text-[0.64rem] font-medium uppercase tracking-[0.24em] text-ember/78">
                Studio ritual
              </p>
              <p className="mt-1 text-sm leading-5 text-stardust/68">
                Plan the garment. Track the cloth. Shape the story.
              </p>
            </div>
          </div>

          <div className="hidden sm:block">
            <BrandLockup
              className="mx-auto justify-center lg:mx-0 lg:justify-start"
              size="sidebar"
              subtitle="Private garment workspace"
            />
          </div>

          <div className="hidden sm:mt-8 sm:block">
            <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-ember sm:block">
              Secure atelier access
            </p>
            <h1 className="mt-3 text-3xl font-semibold leading-[1.02] text-stardust sm:mt-4 sm:max-w-xl sm:text-5xl lg:text-6xl">
              Enter the Studio.
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stardust/62 sm:mt-5 sm:max-w-xl sm:text-base sm:leading-8 lg:mx-0">
              Manage garments, materials, and lookbook stories from one private
              Mystic Lore workspace.
            </p>
          </div>
          <p className="mx-auto mt-4 hidden max-w-md rounded-full border border-bronze/24 bg-midnight/34 px-4 py-2 text-sm text-stardust/60 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)] backdrop-blur-xl sm:inline-flex lg:mx-0">
            Private studio access for projects, fabrics, notes, and lookbooks.
          </p>
        </section>

        <section className="auth-panel-rise mx-auto w-full max-w-[23rem] rounded-[2rem] border border-ember/28 bg-[linear-gradient(145deg,rgba(237,227,207,0.07),rgba(27,58,99,0.12),rgba(61,43,31,0.22))] p-[1px] shadow-[0_28px_90px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(237,227,207,0.06)] backdrop-blur-xl sm:max-w-none sm:rounded-[1.75rem] sm:border-ember/34 sm:p-5 lg:p-6">
          <div className="rounded-[1.85rem] border border-bronze/14 bg-midnight/66 p-4 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)] sm:rounded-[1.35rem] sm:border-bronze/22 sm:bg-midnight/62 sm:p-5">
            <p className="mb-3 text-center text-[0.64rem] font-medium uppercase tracking-[0.22em] text-stardust/42 sm:hidden">
              Atelier access
            </p>
            <div className="flex rounded-[1.35rem] border border-bronze/22 bg-midnight/42 p-1 sm:rounded-2xl sm:border-bronze/24 sm:bg-midnight/48">
                <ModeButton
                  active={mode === 'signin'}
                  onClick={() => handleModeChange('signin')}
                >
                  Sign In
                </ModeButton>
                <ModeButton
                  active={mode === 'signup'}
                  onClick={() => handleModeChange('signup')}
                >
                  Sign Up
                </ModeButton>
              </div>

            {!isConfigured ? (
              <div className="mt-4 rounded-2xl border border-ember/32 bg-ember/10 p-3 sm:mt-5 sm:p-4">
                <div className="flex gap-3">
                  <CloudOff
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-ember"
                    size={18}
                    strokeWidth={1.9}
                  />
                  <div>
                    <p className="text-sm font-semibold text-stardust">
                      Supabase auth is not configured yet.
                    </p>
                    <p className="mt-1 text-sm leading-6 text-stardust/62">
                      Add the Vite Supabase environment variables before
                      signing in.
                    </p>
                    <ul className="mt-2 list-inside list-disc text-xs leading-5 text-stardust/52">
                      {configIssues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            <form className="mt-4 space-y-3 sm:mt-5 sm:space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/48 sm:text-xs">
                  Email
                </span>
                <span className="mt-1.5 flex min-h-11 items-center gap-3 rounded-2xl border border-bronze/24 bg-midnight/44 px-3 transition duration-200 focus-within:border-ember/60 focus-within:bg-stardust/[0.045] focus-within:shadow-[0_0_28px_rgba(200,155,60,0.08)] sm:mt-2 sm:min-h-12">
                    <Mail
                      aria-hidden="true"
                      className="shrink-0 text-ember/78"
                      size={17}
                      strokeWidth={1.9}
                    />
                    <input
                      autoComplete="email"
                      className="min-h-11 w-full bg-transparent text-sm text-stardust outline-none placeholder:text-stardust/32 sm:min-h-12 sm:text-base"
                      disabled={!isConfigured || isSubmitting}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="atelier@example.com"
                      type="email"
                      value={email}
                    />
                </span>
              </label>

              <label className="block">
                <span className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-stardust/48 sm:text-xs">
                  Password
                </span>
                <span className="mt-1.5 flex min-h-11 items-center gap-3 rounded-2xl border border-bronze/24 bg-midnight/44 px-3 transition duration-200 focus-within:border-ember/60 focus-within:bg-stardust/[0.045] focus-within:shadow-[0_0_28px_rgba(200,155,60,0.08)] sm:mt-2 sm:min-h-12">
                    <LockKeyhole
                      aria-hidden="true"
                      className="shrink-0 text-ember/78"
                      size={17}
                      strokeWidth={1.9}
                    />
                    <input
                      autoComplete={
                        mode === 'signin' ? 'current-password' : 'new-password'
                      }
                      className="min-h-11 w-full bg-transparent text-sm text-stardust outline-none placeholder:text-stardust/32 sm:min-h-12 sm:text-base"
                      disabled={!isConfigured || isSubmitting}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 6 characters"
                      type="password"
                      value={password}
                    />
                </span>
              </label>

              {submitError || lastError ? (
                <p className="rounded-2xl border border-ember/34 bg-ember/10 px-4 py-3 text-sm leading-6 text-stardust/76">
                  {submitError ?? lastError}
                </p>
              ) : null}

              {successMessage ? (
                <p className="rounded-2xl border border-teal/34 bg-teal/12 px-4 py-3 text-sm leading-6 text-stardust/76">
                  {successMessage}
                </p>
              ) : null}

              <Button
                className="min-h-11 w-full shadow-[0_18px_44px_rgba(200,155,60,0.18)] sm:min-h-12"
                disabled={!canSubmit || isSubmitting}
                icon={
                  isSubmitting ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      size={17}
                      strokeWidth={1.9}
                    />
                  ) : (
                    <ArrowRight aria-hidden="true" size={17} strokeWidth={1.9} />
                  )
                }
                type="submit"
                variant="primary"
              >
                {isSubmitting
                  ? 'Checking access...'
                  : mode === 'signin'
                    ? 'Sign In'
                    : 'Create Account'}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function FireflyField() {
  const fireflies = Array.from({ length: 16 }, (_, index) => index);

  return (
    <div aria-hidden="true" className="auth-firefly-field pointer-events-none absolute inset-0 overflow-hidden">
      {fireflies.map((index) => (
        <span
          className="auth-firefly"
          key={index}
          style={{
            '--auth-firefly-delay': `${(index % 8) * -1.7}s`,
            '--auth-firefly-duration': `${14 + (index % 6) * 2.4}s`,
            '--auth-firefly-left': `${8 + ((index * 19) % 86)}%`,
            '--auth-firefly-size': `${2 + (index % 4)}px`,
            '--auth-firefly-top': `${12 + ((index * 23) % 76)}%`,
            '--auth-firefly-x': `${index % 2 === 0 ? 24 : -28}px`,
            '--auth-firefly-y': `${index % 3 === 0 ? -42 : 36}px`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-midnight px-4 text-stardust">
      <div className="rounded-3xl border border-bronze/26 bg-midnight/58 p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
        <Loader2
          aria-hidden="true"
          className="mx-auto animate-spin text-ember"
          size={24}
          strokeWidth={1.9}
        />
        <p className="mt-4 text-sm font-medium text-stardust">
          Checking studio access...
        </p>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'min-h-10 flex-1 rounded-[1.05rem] px-3 text-sm font-medium transition duration-300 sm:min-h-11 sm:rounded-xl sm:px-4',
        active
          ? 'bg-ember text-midnight shadow-[0_12px_30px_rgba(200,155,60,0.18)]'
          : 'text-stardust/58 hover:bg-stardust/[0.07] hover:text-stardust',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
