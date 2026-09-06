import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('unimap_supabase_url') || '';
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('unimap_supabase_anon_key') || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; key: string; isConfigured: boolean } {
  const url = localStorage.getItem('unimap_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('unimap_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem('unimap_supabase_url', url.trim());
  localStorage.setItem('unimap_supabase_anon_key', key.trim());
  supabaseInstance = null; // Reset client instance
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'unimap_auth_token',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
