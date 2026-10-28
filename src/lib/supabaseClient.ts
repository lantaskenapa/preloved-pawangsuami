import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable accessor
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = customUrl || envUrl || (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_url') : '');
  const key = customKey || envKey || (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_anon_key') : '');

  if (!url || !key) {
    return null;
  }

  try {
    if (!clientInstance) {
      clientInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    }
    return clientInstance;
  } catch (error) {
    console.warn('Supabase client failed to initialize:', error);
    return null;
  }
}

export function isSupabaseConnected(): boolean {
  return !!getSupabaseClient();
}
