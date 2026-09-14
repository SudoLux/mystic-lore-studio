import { describe, expect, it } from 'vitest';
import { isValidSupabaseUrl } from '../src/lib/supabase';

describe('Supabase URL validation', () => {
  it('accepts secure hosted projects and local development endpoints', () => {
    expect(isValidSupabaseUrl('https://project.supabase.co')).toBe(true);
    expect(isValidSupabaseUrl('http://localhost:54321')).toBe(true);
    expect(isValidSupabaseUrl('http://127.0.0.1:54321')).toBe(true);
    expect(isValidSupabaseUrl('http://[::1]:54321')).toBe(true);
  });

  it('rejects insecure remote and malformed endpoints', () => {
    expect(isValidSupabaseUrl('http://project.supabase.co')).toBe(false);
    expect(isValidSupabaseUrl('not-a-url')).toBe(false);
  });
});
