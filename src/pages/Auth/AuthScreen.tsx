import { useState, type FormEvent } from 'react';
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
    <main className="min-h-screen bg-midnight text-stardust">
      <div className="min-h-screen bg-[radial-gradient(circle_at_16%_12%,rgba(200,155,60,0.14),transparent_24rem),radial-gradient(circle_at_85%_18%,rgba(45,92,107,0.18),transparent_24rem),linear-gradient(135deg,rgba(10,10,10,0.96),rgba(61,43,31,0.36),rgba(10,10,10,0.98))] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col justify-center gap-6 lg:grid lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="space-y-7">
            <BrandLockup
              className="max-w-sm"
              size="sidebar"
              subtitle="Cloud-ready apparel project studio"
            />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-ember">
                Secure atelier access
              </p>
              <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-[1.04] text-stardust sm:text-5xl lg:text-6xl">
                Sign in to Mystic Lore Studio.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-stardust/62">
                Keep the local studio workflow intact while preparing projects,
                fabrics, notes, and lookbooks for Supabase cloud sync.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {['Local data stays active', 'Private by default', 'Cloud sync foundation'].map(
                (item) => (
                  <div
                    className="rounded-2xl border border-bronze/24 bg-midnight/36 p-4 text-sm font-medium text-stardust/74 shadow-[inset_0_1px_0_rgba(237,227,207,0.04)]"
                    key={item}
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-ember/34 bg-[linear-gradient(145deg,rgba(237,227,207,0.08),rgba(27,58,99,0.14),rgba(61,43,31,0.24))] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(237,227,207,0.06)] backdrop-blur-xl sm:p-6">
            <div className="rounded-[1.35rem] border border-bronze/22 bg-midnight/58 p-4 sm:p-5">
              <div className="flex rounded-2xl border border-bronze/24 bg-midnight/48 p-1">
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
                <div className="mt-5 rounded-2xl border border-ember/32 bg-ember/10 p-4">
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
                        signing in. The existing localStorage data layer has
                        not been removed.
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

              <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/48">
                    Email
                  </span>
                  <span className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-bronze/24 bg-midnight/44 px-3 transition focus-within:border-ember/48">
                    <Mail
                      aria-hidden="true"
                      className="shrink-0 text-ember/78"
                      size={17}
                      strokeWidth={1.9}
                    />
                    <input
                      autoComplete="email"
                      className="min-h-12 w-full bg-transparent text-base text-stardust outline-none placeholder:text-stardust/32"
                      disabled={!isConfigured || isSubmitting}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="atelier@example.com"
                      type="email"
                      value={email}
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-stardust/48">
                    Password
                  </span>
                  <span className="mt-2 flex min-h-12 items-center gap-3 rounded-2xl border border-bronze/24 bg-midnight/44 px-3 transition focus-within:border-ember/48">
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
                      className="min-h-12 w-full bg-transparent text-base text-stardust outline-none placeholder:text-stardust/32"
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
                  className="w-full"
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
      </div>
    </main>
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
        'min-h-11 flex-1 rounded-xl px-4 text-sm font-medium transition',
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
