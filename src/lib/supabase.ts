import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

type SupabaseConfigStatus = {
  anonKey: string;
  isConfigured: boolean;
  issues: string[];
  message: string;
  url: string;
};

function isValidUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const issues: string[] = [];

  if (!supabaseUrl) {
    issues.push('VITE_SUPABASE_URL is missing.');
  } else if (!isValidUrl(supabaseUrl)) {
    issues.push('VITE_SUPABASE_URL must be a valid https:// Supabase project URL.');
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

export const supabase: SupabaseClient | null = supabaseConfigStatus.isConfigured
  ? createClient(supabaseConfigStatus.url, supabaseConfigStatus.anonKey)
  : null;
