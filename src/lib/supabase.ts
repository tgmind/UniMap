import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gbuexacsjnidajviejqp.supabase.co';
const DEFAULT_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidWV4YWNzam5pZGFqdmllanFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MDMzMTgsImV4cCI6MjEwNDI3OTMxOH0.IgeCG3JOPVPb1qrpsY8ZAPP5RVkNhv5u1jo_4gZs6eM';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; key: string; isConfigured: boolean } {
  const url = import.meta.env.VITE_SUPABASE_URL || localStorage.getItem('unimap_supabase_url') || DEFAULT_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || localStorage.getItem('unimap_supabase_anon_key') || DEFAULT_KEY;
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
