import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.generated';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

type SupabaseConfigStatus = {
  anonKey: string;
  isConfigured: boolean;
  issues: string[];
  message: string;
  url: string;
};

export function isValidSupabaseUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === 'https:'
      || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname));
  } catch {
    return false;
  }
}

function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const issues: string[] = [];

  if (!supabaseUrl) {
    issues.push('VITE_SUPABASE_URL is missing.');
  } else if (!isValidSupabaseUrl(supabaseUrl)) {
    issues.push('VITE_SUPABASE_URL must use https://, except for a local Supabase development URL.');
  }

  if (!supabaseAnonKey) {
    issues.push('VITE_SUPABASE_ANON_KEY is missing.');
  }

  return {
    anonKey: supabaseAnonKey,
    isConfigured: issues.length === 0,
    issues,
    message:
      issues.length === 0
        ? 'Supabase is configured.'
        : 'Supabase cloud sync is not configured yet. Local browser storage remains active.',
    url: supabaseUrl,
  };
}

export const supabaseConfigStatus = getSupabaseConfigStatus();

/** Canonical schemas use the checked-in generated Database contract. */
export const canonicalSupabase: SupabaseClient<Database> | null = supabaseConfigStatus.isConfigured
  ? createClient<Database>(supabaseConfigStatus.url, supabaseConfigStatus.anonKey)
  : null;

/**
 * Creates the short-lived client used for a signed-in workspace request.
 *
 * The auth singleton above continues to own sign-in, refresh, and persisted
 * browser sessions. Workspace data requests receive the active React session
 * explicitly, which prevents a startup race from falling back to the
 * publishable-key (anonymous) role while the auth store is hydrating.
 */
export function createRequestBoundCanonicalSupabase(accessToken: string): SupabaseClient<Database> | null {
  if (!supabaseConfigStatus.isConfigured || !accessToken) return null;
  return createClient<Database>(supabaseConfigStatus.url, supabaseConfigStatus.anonKey, {
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

/**
 * Compatibility client for the legacy migration/recovery boundary. It remains
 * intentionally unparameterized until that adapter is removed after beta.
 */
export const supabase: SupabaseClient | null = canonicalSupabase as SupabaseClient | null;
