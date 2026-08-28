import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigStatus } from '../lib/supabase';

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
  signUp: (email: string, password: string) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(supabaseConfigStatus.isConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [requiresStudioSetup, setRequiresStudioSetup] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      setSession(null);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          setLastError(error.message);
        }

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

    return () => {
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
        setLastError(null);
        const userId = session.user.id;
        const profile = await supabase.schema('ml_private').from('profiles').upsert({
          display_name: name.trim(),
          id: userId,
          locale: navigator.language || 'en-US',
          user_id: userId,
        } as never, { onConflict: 'user_id' });
        if (profile.error) throw profile.error;

        const existing = await supabase.schema('ml_private').from('studios')
          .select('id').eq('owner_user_id', userId).limit(1).maybeSingle();
        if (existing.error) throw existing.error;
        const studioId = (existing.data as { id?: string } | null)?.id ?? crypto.randomUUID();
        if (!existing.data) {
          const studio = await supabase.schema('ml_private').from('studios').insert({
            id: studioId,
            name: name.trim(),
            owner_user_id: userId,
            slug: `${slugify(name)}-${userId.slice(0, 8)}`,
            timezone,
          } as never);
          if (studio.error) throw studio.error;
        }
        const settings = await supabase.schema('ml_private').from('studio_settings')
          .upsert({ currency, studio_id: studioId, units } as never, { onConflict: 'studio_id' });
        if (settings.error) throw settings.error;
        setRequiresStudioSetup(false);
      },
      configIssues: supabaseConfigStatus.issues,
      isConfigured: supabaseConfigStatus.isConfigured,
      isLoading,
      isPasswordRecovery,
      lastError,
      requestPasswordReset: async (email) => {
        if (!supabase) throw new Error('Supabase is not configured.');
        setLastError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname}`,
        });
        if (error) {
          setLastError(error.message);
          throw error;
        }
      },
      requiresStudioSetup,
      session,
      signIn: (email, password) =>
        authenticate('signin', email, password, setLastError),
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
    setLastError(response.error.message);
    throw response.error;
  }
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

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'studio';
}
