import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable accessor
const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
const envKey = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

let clientInstance: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function getSupabaseClient(customUrl?: string, customKey?: string): SupabaseClient | null {
  const url = (customUrl || (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_url') : '') || envUrl || '').trim();
  const key = (customKey || (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_anon_key') : '') || envKey || '').trim();

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
  const client = getSupabaseClient(customUrl, customKey);
  if (!client) {
    return {
      success: false,
      message: 'URL atau Anon Key Supabase belum diisi dengan lengkap.',
    };
  }

  try {
    // 1. Test read from products table
    const { data: readData, error: readError } = await client.from('products').select('id').limit(1);
    if (readError) {
      if (readError.message.includes('relation "public.products" does not exist') || readError.code === '42P01') {
        return {
          success: false,
          message: 'Tabel "products" belum ditemukan di Supabase. Pastikan Anda sudah menjalankan seluruh isi file "supabase/schema.sql" di SQL Editor Supabase.',
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
      message: 'Koneksi ke Supabase Berhasil! Tabel produk dan penyimpanan cloud aktif 100%.',
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
