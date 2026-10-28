import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable accessor
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

let clientInstance: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

/**
 * Normalizes user-input Supabase URLs.
 * Handles common mistakes like:
 * - Pasting dashboard URL: https://supabase.com/dashboard/project/abcdefgh...
 * - Adding trailing slashes: https://abcdef.supabase.co/
 * - Adding rest endpoint: https://abcdef.supabase.co/rest/v1/
 * - Pasting postgres pooler link: postgresql://...
 */
export function normalizeSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  // Strip quotes
  url = url.replace(/^["']|["']$/g, '');

  // 1. If user copied the dashboard browser address: https://supabase.com/dashboard/project/<project_id>/...
  const dashboardMatch = url.match(/supabase\.com\/dashboard\/project\/([a-zA-Z0-9_-]+)/);
  if (dashboardMatch && dashboardMatch[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  // 2. If user copied database connection string from "Connect" modal
  const poolerMatch = url.match(/aws-[0-9]-[a-z0-9-]+\.pooler\.supabase\.com/) || url.match(/db\.([a-zA-Z0-9_-]+)\.supabase\.co/);
  if (poolerMatch && poolerMatch[1]) {
    return `https://${poolerMatch[1]}.supabase.co`;
  }

  // 3. If user pasted bare project ID (e.g. 20-character string like "qwrtyuiopasdfghjklzx")
  if (/^[a-zA-Z0-9_-]{18,30}$/.test(url) && !url.includes('.')) {
    return `https://${url}.supabase.co`;
  }

  // 4. Clean trailing slashes and /rest/v1 suffixes
  url = url.replace(/\/rest\/v1\/?$/i, '');
  url = url.replace(/\/+$/, '');

  // 5. If user pasted full path after .supabase.co
  const coMatch = url.match(/^(https?:\/\/[a-zA-Z0-9_-]+\.supabase\.co)(\/.*)?$/);
  if (coMatch && coMatch[1]) {
    return coMatch[1];
  }

  // 6. If user entered xxx.supabase.co without https://
  if (/^[a-zA-Z0-9_-]+\.supabase\.co$/i.test(url)) {
    return `https://${url}`;
  }

  // 7. Ensure https:// protocol if domain contains dot
  if (!/^https?:\/\//i.test(url) && url.includes('.')) {
    url = `https://${url}`;
  }

  return url;
}

export function normalizeSupabaseKey(rawKey: string): string {
  let key = (rawKey || '').trim();
  key = key.replace(/^["']|["']$/g, '');
  // Remove accidental label prefixes if copied like "anon public: eyJ..." or "apiKey: eyJ..."
  key = key.replace(/^(anon\s*public|anon|apiKey|Bearer)\s*:\s*/i, '');
  return key;
}

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const rawUrl = customUrl || (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_url') : '') || envUrl || '';
  const rawKey = customKey || (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_anon_key') : '') || envKey || '';

  const url = normalizeSupabaseUrl(rawUrl);
  const key = normalizeSupabaseKey(rawKey);

  if (!url || !key) {
    clientInstance = null;
    cachedUrl = '';
    cachedKey = '';
    return null;
  }

  try {
    if (!clientInstance || cachedUrl !== url || cachedKey !== key) {
      cachedUrl = url;
      cachedKey = key;
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

export function resetSupabaseClient(): void {
  clientInstance = null;
  cachedUrl = '';
  cachedKey = '';
}

export function isSupabaseConnected(): boolean {
  return !!getSupabaseClient();
}

export async function testSupabaseConnection(
  customUrl?: string,
  customKey?: string
): Promise<{ success: boolean; message: string; details?: any }> {
  const normalizedUrl = normalizeSupabaseUrl(customUrl || '');
  const normalizedKey = normalizeSupabaseKey(customKey || '');

  if (!normalizedUrl || !normalizedKey) {
    return {
      success: false,
      message: 'Project URL atau Anon Key Supabase belum diisi.',
    };
  }

  // Check if URL looks like a valid Supabase API URL
  if (!normalizedUrl.includes('.supabase.co')) {
    return {
      success: false,
      message: `Project URL "${normalizedUrl}" tidak valid. Format yang benar harus berakhiran ".supabase.co" (contoh: https://xyzcompany.supabase.co). Pastikan BUKAN URL dashboard browser (supabase.com/dashboard/...).`,
    };
  }

  const client = getSupabaseClient(normalizedUrl, normalizedKey);
  if (!client) {
    return {
      success: false,
      message: 'Gagal membuat Supabase client dengan kredensial yang diberikan.',
    };
  }

  try {
    // 1. Test read from products table
    const { data: readData, error: readError } = await client.from('products').select('id').limit(1);
    if (readError) {
      if (readError.message.includes('relation "public.products" does not exist') || readError.code === '42P01') {
        return {
          success: false,
          message: 'Tabel "products" belum ditemukan di database Supabase Anda. Buka menu SQL Editor di Supabase dan jalankan seluruh isi file "supabase/schema.sql".',
          details: readError,
        };
      }
      return {
        success: false,
        message: `Gagal membaca tabel Supabase: ${readError.message}`,
        details: readError,
      };
    }

    // 2. Test write permission on store_settings
    const testSettings = {
      id: 'primary',
      store_name: 'Pawang Suami Preloved',
      tagline: 'Barang Lama, Cerita Baru.',
      updated_at: new Date().toISOString(),
    };
    const { error: writeError } = await client.from('store_settings').upsert(testSettings);
    if (writeError) {
      if (writeError.message.includes('row-level security') || writeError.code === '42501') {
        return {
          success: false,
          message: 'Terhubung, tapi akses tulis dicekal oleh Row Level Security (RLS). Jalankan query perbaikan RLS di SQL Editor Supabase.',
          details: writeError,
        };
      }
      return {
        success: false,
        message: `Gagal menyimpan data ke Supabase: ${writeError.message}`,
        details: writeError,
      };
    }

    return {
      success: true,
      message: `Koneksi ke Supabase Berhasil! Endpoint: ${normalizedUrl}`,
      details: readData,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal menghubungi server Supabase. Pastikan Project URL dan Anon Key valid.',
      details: err,
    };
  }
}
