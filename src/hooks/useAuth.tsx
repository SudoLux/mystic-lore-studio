import { clearCanonicalMediaSessionCaches } from '../domains/persistence/canonicalMedia';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigStatus } from '../lib/supabase';
import { authFailureMessage, isInvalidAuthSession, normalizeAuthEmail, signupGuidance } from '../lib/authIdentity';

type AuthMode = 'signin' | 'signup';

type AuthContextValue = {
  cancelPasswordRecovery: () => Promise<void>;
  clearError: () => void;
  completePasswordRecovery: (password: string) => Promise<void>;
  completeStudioSetup: (input: { currency: string; name: string; timezone: string; units: 'mm' | 'cm' | 'in' }) => Promise<void>;
  configIssues: string[];
  isConfigured: boolean;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  lastError: string | null;
  requestPasswordReset: (email: string) => Promise<void>;
  requiresStudioSetup: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<string>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(supabaseConfigStatus.isConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [requiresStudioSetup, setRequiresStudioSetup] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const setupPromiseRef = useRef<Promise<void> | null>(null);
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      setSession(null);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setLastError(error.message);
        }

        if (data.session && navigator.onLine !== false) {
          const checked = await supabase!.auth.getUser();
          if (isInvalidAuthSession(checked.error) || (!checked.error && !checked.data.user)) {
            await supabase!.auth.signOut({ scope: 'local' });
            setLastError('Your session has ended. Sign in to your Studio again.');
            return;
          }
        }
        if (!isMounted) return;
        setSession(data.session);
        return data.session
          ? studioSetupRequired(data.session.user.id).then(setRequiresStudioSetup)
          : undefined;
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLastError(getAuthErrorMessage(error));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        clearCanonicalMediaSessionCaches();
        setIsPasswordRecovery(false);
      }
      setSession(nextSession);
      if (event === 'SIGNED_IN' && nextSession) {
        setIsLoading(true);
        window.setTimeout(() => {
          void studioSetupRequired(nextSession.user.id)
            .then(setRequiresStudioSetup)
            .catch((error: unknown) => setLastError(getAuthErrorMessage(error)))
            .finally(() => setIsLoading(false));
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

    let validating = false;
    const validateSession = () => {
      if (validating || !sessionRef.current || navigator.onLine === false || document.visibilityState !== 'visible') return;
      validating = true;
      void supabase!.auth.getUser().then(async ({ data, error }) => {
        if (isInvalidAuthSession(error) || (!error && !data.user)) {
          await supabase!.auth.signOut({ scope: 'local' });
          if (isMounted) { setSession(null); setRequiresStudioSetup(false); setLastError('Your session has ended. Sign in to your Studio again.'); }
        }
      }).catch(() => undefined).finally(() => { validating = false; });
    };
    window.addEventListener('focus', validateSession);
    window.addEventListener('online', validateSession);
    document.addEventListener('visibilitychange', validateSession);
    const sessionTimer = window.setInterval(validateSession, 30_000);
    return () => {
      window.clearInterval(sessionTimer);
      window.removeEventListener('focus', validateSession);
      window.removeEventListener('online', validateSession);
      document.removeEventListener('visibilitychange', validateSession);
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      cancelPasswordRecovery: async () => {
        setIsPasswordRecovery(false);
        if (supabase) await supabase.auth.signOut();
      },
      clearError: () => setLastError(null),
      completePasswordRecovery: async (password) => {
        if (!supabase) throw new Error('Supabase is not configured.');
        setLastError(null);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setLastError(error.message);
          throw error;
        }
        setIsPasswordRecovery(false);
      },
      completeStudioSetup: async ({ currency, name, timezone, units }) => {
        if (!supabase || !session?.user) throw new Error('Sign in before creating a studio.');
        if (setupPromiseRef.current) return await setupPromiseRef.current;
        const work = async () => {
          setLastError(null);
          const { data: verified, error: verificationError } = await supabase!.auth.getUser();
          if (verificationError || verified.user?.id !== session.user.id) throw new Error('Sign in again before setting up your Studio.');
          const { error } = await supabase!.schema('ml_private').rpc('complete_studio_setup', {
            p_currency: currency, p_locale: navigator.language || 'en-US',
            p_name: name.trim(), p_timezone: timezone, p_units: units,
          });
          if (error) throw error;
          setRequiresStudioSetup(false);
        };
        setupPromiseRef.current = work();
        try { await setupPromiseRef.current; }
        finally { setupPromiseRef.current = null; }
      },
      configIssues: supabaseConfigStatus.issues,
      isConfigured: supabaseConfigStatus.isConfigured,
      isLoading,
      isPasswordRecovery,
      lastError,
      requestPasswordReset: async (email) => {
        if (!supabase) throw new Error('Supabase is not configured.');
        setLastError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(normalizeAuthEmail(email), {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        });
        if (error) {
          setLastError(error.message);
          throw error;
        }
      },
      requiresStudioSetup,
      session,
      signIn: async (email, password) => {
        await authenticate('signin', email, password, setLastError);
      },
      signOut: async () => {
        if (!supabase) {
          setSession(null);
          return;
        }

        setLastError(null);
        const { error } = await supabase.auth.signOut();

        if (error) {
          setLastError(error.message);
          throw error;
        }

        setSession(null);
        setIsPasswordRecovery(false);
        setRequiresStudioSetup(false);
      },
      signUp: (email, password) =>
        authenticate('signup', email, password, setLastError),
      user: session?.user ?? null,
    }),
    [isLoading, isPasswordRecovery, lastError, requiresStudioSetup, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}

async function authenticate(
  mode: AuthMode,
  email: string,
  password: string,
  setLastError: (message: string | null) => void,
) {
  if (!supabase) {
    const message =
      'Supabase is not configured yet. Add the Vite environment variables to enable authentication.';

    setLastError(message);
    throw new Error(message);
  }

  setLastError(null);
  email = normalizeAuthEmail(email);

  const response =
    mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: {
            // The confirmation link must return to the same deployed Studio
            // that initiated signup, rather than relying on a dashboard default.
            emailRedirectTo: window.location.origin,
          },
        });

  if (response.error) {
    const message = authFailureMessage(response.error);
    setLastError(message);
    throw new Error(message);
  }
  return signupGuidance(Boolean(response.data.session));
}

function getAuthErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Something went wrong while checking authentication.';
}

async function studioSetupRequired(userId: string) {
  if (!supabase) return false;
  const response = await supabase.schema('ml_private').from('studios')
    .select('id').eq('owner_user_id', userId).limit(1);
  if (response.error) throw response.error;
  return (response.data?.length ?? 0) === 0;
}
