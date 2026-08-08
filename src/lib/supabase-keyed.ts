import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Stable per-browser identity used for ownership checks on anonymous content. */
export function getUserKey(): string {
  let key = localStorage.getItem('user_key');
  if (!key) {
    key = `uk_${crypto.randomUUID()}`;
    localStorage.setItem('user_key', key);
  }
  return key;
}

/**
 * Supabase client that forwards the browser's user key so row-level security
 * can verify ownership of anonymous community content.
 */
export const supabaseKeyed = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
  global: {
    headers: { 'x-user-key': getUserKey() },
  },
});
