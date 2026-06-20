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
  clearError: () => void;
  configIssues: string[];
  isConfigured: boolean;
  isLoading: boolean;
  lastError: string | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(supabaseConfigStatus.isConfigured);
  const [lastError, setLastError] = useState<string | null>(null);
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

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      clearError: () => setLastError(null),
      configIssues: supabaseConfigStatus.issues,
      isConfigured: supabaseConfigStatus.isConfigured,
      isLoading,
      lastError,
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
      },
      signUp: (email, password) =>
        authenticate('signup', email, password, setLastError),
      user: session?.user ?? null,
    }),
    [isLoading, lastError, session],
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
      : await supabase.auth.signUp({ email, password });

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
