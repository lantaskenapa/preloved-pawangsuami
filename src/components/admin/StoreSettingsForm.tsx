import React, { useState } from 'react';
import { StoreSettings } from '../../types';
import {
  isSupabaseConnected,
  testSupabaseConnection,
  normalizeSupabaseUrl,
  normalizeSupabaseKey,
  getPermanentSupabaseConfig,
  savePermanentSupabaseConfig,
} from '../../lib/supabaseClient';
import { syncAllProductsToSupabase } from '../../lib/storage';
import {
  Save,
  ShoppingBag,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  CloudUpload,
  Loader2,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface StoreSettingsFormProps {
  settings: StoreSettings;
  onSave: (updated: Partial<StoreSettings>) => Promise<void>;
  onExport: () => void;
  onImport: (jsonStr: string) => void;
  onResetDefaults: () => void;
}

export const StoreSettingsForm: React.FC<StoreSettingsFormProps> = ({
  settings,
  onSave,
  onExport,
  onImport,
  onResetDefaults,
}) => {
  const { showToast } = useToast();

  const [storeName, setStoreName] = useState(settings.store_name);
  const [tagline, setTagline] = useState(settings.tagline);
  const [bio, setBio] = useState(settings.bio);
  const [shopeeUrl, setShopeeUrl] = useState(settings.shopee_store_url);

  // Supabase live & permanent configuration credentials
  const permanentConfig = getPermanentSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(
    (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_url') : '') || permanentConfig.url || ''
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    (typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_anon_key') : '') || permanentConfig.anonKey || ''
  );

  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [connectedState, setConnectedState] = useState(isSupabaseConnected());
  const [copiedSql, setCopiedSql] = useState(false);

  const handleTestConnection = async () => {
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    const cleanKey = normalizeSupabaseKey(supabaseAnonKey);

    if (cleanUrl !== supabaseUrl) setSupabaseUrl(cleanUrl);
    if (cleanKey !== supabaseAnonKey) setSupabaseAnonKey(cleanKey);

    if (!cleanUrl || !cleanKey) {
      showToast('Masukkan Supabase Project URL dan Anon Key terlebih dahulu', 'error');
      return;
    }
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      localStorage.setItem('psp_supabase_url', cleanUrl);
      localStorage.setItem('psp_supabase_anon_key', cleanKey);
      
      // Auto persist permanently to server if valid
      await savePermanentSupabaseConfig(cleanUrl, cleanKey);

      const res = await testSupabaseConnection(cleanUrl, cleanKey);
      setConnectionResult(res);
      setConnectedState(res.success);
      if (res.success) {
        showToast('Koneksi Supabase berhasil & disimpan paten ke server!', 'success');
      } else {
        showToast('Koneksi Supabase gagal. Periksa pesan di bawah.', 'error');
      }
    } catch (err: any) {
      setConnectionResult({
        success: false,
        message: err?.message || 'Gagal menghubungi Supabase.',
      });
      setConnectedState(false);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncToSupabase = async () => {
    setSyncingProducts(true);
    try {
      const res = await syncAllProductsToSupabase();
      if (res.success) {
        showToast(`Berhasil menyinkronkan ${res.count} produk ke Supabase!`, 'success');
      } else {
        showToast(`Gagal sinkronisasi produk: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal sinkronisasi data', 'error');
    } finally {
      setSyncingProducts(false);
    }
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const cleanUrl = normalizeSupabaseUrl(supabaseUrl);
    const cleanKey = normalizeSupabaseKey(supabaseAnonKey);
    if (cleanUrl !== supabaseUrl) setSupabaseUrl(cleanUrl);
    if (cleanKey !== supabaseAnonKey) setSupabaseAnonKey(cleanKey);

    try {
      // 1. Save permanently to server configuration file (src/supabaseConfig.json & .env)
      if (cleanUrl && cleanKey) {
        await savePermanentSupabaseConfig(cleanUrl, cleanKey);
      }

      // 2. Save settings to app storage & Supabase
      await onSave({
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        bio: bio.trim(),
        shopee_store_url: shopeeUrl.trim(),
        shipping_origin: settings.shipping_origin || '',
        whatsapp_contact: settings.whatsapp_contact || '',
        operational_hours: settings.operational_hours || '',
        shipping_policy: settings.shipping_policy || '',
        return_policy: settings.return_policy || '',
        supabase_url: cleanUrl,
        supabase_anon_key: cleanKey,
      });
      showToast('Pengaturan toko & koneksi Supabase paten berhasil disimpan!', 'success');
    } catch {
      showToast('Gagal menyimpan pengaturan toko', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImport(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <form onSubmit={handleSaveAll} className="space-y-6">
        
        {/* Section 1: Toko & Brand */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100">
            Identitas Toko & Tagline
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Nama Toko
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Tagline Toko
              </label>
              <input
                type="text"
                required
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Link Toko Shopee Utama *
            </label>
            <div className="relative">
              <ShoppingBag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EE4D2D]" />
              <input
                type="url"
                required
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                placeholder="https://shopee.co.id/pawangsuamipreloved"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900"
              />
            </div>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Tombol "Kunjungi Toko Shopee" di Navbar dan Footer akan mengarah ke URL ini.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Bio & Deskripsi Toko
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 focus:outline-hidden focus:border-neutral-900 leading-relaxed"
            />
          </div>
        </div>


        {/* Section 3: Supabase Cloud Database Integration */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                Integrasi Database Supabase
              </h3>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              connectedState
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-neutral-100 text-neutral-600 border-neutral-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connectedState ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
              {connectedState ? 'Supabase Terhubung' : 'Penyimpanan Lokal Aktif (Fallback)'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                <strong>Penyimpanan Paten Aktif:</strong> Kredensial Supabase akan disimpan langsung ke server aplikasi (<code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-blue-200">.env</code> & <code className="font-mono text-[11px] bg-white px-1 py-0.5 rounded border border-blue-200">supabaseConfig.json</code>).
              </span>
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200 shrink-0 self-start sm:self-auto">
              Aman dari Clear Cache
            </span>
          </div>

          <p className="text-xs text-neutral-500 leading-relaxed">
            Aplikasi terhubung langsung ke Supabase. Kredensial yang diisi di bawah akan tersimpan paten di server sehingga katalog dan koneksi database tidak akan pernah hilang walaupun browser dibersihkan (*clear cache*):
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
              />
              <p className="mt-1 text-[11px] text-neutral-500 leading-normal">
                Wajib berakhiran <strong>.supabase.co</strong>. Temukan di: <em>Settings (roda gigi) &gt; API &gt; Project URL</em>. <span className="text-amber-800 font-medium">Bukan link address bar browser dashboard.</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Supabase Anon / Public Key
              </label>
              <input
                type="password"
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
              />
              <p className="mt-1 text-[11px] text-neutral-500 leading-normal">
                Key berawalan <strong>eyJ...</strong>. Temukan di: <em>Settings &gt; API &gt; Project API keys &gt; anon public</em>.
              </p>
            </div>
          </div>

          {/* Action: Test Connection & Sync Buttons */}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={testingConnection}
              onClick={handleTestConnection}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-98 disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Menguji Koneksi...' : 'Tes Koneksi Sekarang'}</span>
            </button>

            <button
              type="button"
              disabled={syncingProducts || !connectedState}
              onClick={handleSyncToSupabase}
              className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-98 disabled:opacity-50 shadow-2xs"
              title="Unggah semua data produk yang ada saat ini ke database Supabase"
            >
              {syncingProducts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
              <span>{syncingProducts ? 'Menyinkronkan...' : 'Upload Semua Produk ke Supabase'}</span>
            </button>
            <span className="text-[11px] text-neutral-400">
              Sinkronisasi batch untuk menyimpan semua katalog lokal ke database Supabase
            </span>
          </div>

          {/* Test Connection Result Box */}
          {connectionResult && (
            <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
              connectionResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}>
              {connectionResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-bold">
                  {connectionResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                </div>
                <div className="mt-0.5 text-[11px]">{connectionResult.message}</div>
                {!connectionResult.success && connectionResult.message.includes('RLS') && (
                  <div className="mt-2 p-2 rounded-lg bg-white/80 border border-red-200 font-mono text-[10px] text-neutral-800">
                    <p className="font-sans font-bold text-red-800 mb-1">
                      Solusi: Buka SQL Editor di Supabase dan jalankan 3 baris perintah ini:
                    </p>
                    <code>
                      ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;<br />
                      ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;<br />
                      ALTER TABLE public.store_settings DISABLE ROW LEVEL SECURITY;
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SQL Fix Helper for Mark as Sold & Minus Points */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-950 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold flex items-center gap-1.5 text-amber-900">
                <span>⚡ Perintah SQL Supabase (Penting untuk Status Terjual & Poin Minus)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const sql = `ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;\nALTER TABLE public.products ADD COLUMN IF NOT EXISTS minus_points JSONB DEFAULT '[]'::jsonb;`;
                  navigator.clipboard.writeText(sql);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                  showToast('Perintah SQL berhasil disalin ke clipboard!', 'success');
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 text-[11px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin!' : 'Salin Perintah SQL'}</span>
              </button>
            </div>
            <p className="text-[11px] text-amber-800 leading-normal">
              Jika tombol <em>Mark as Sold (Tandai Terjual)</em> atau penyimpanan minus poin di Supabase memerlukan izin, buka <strong>Supabase Dashboard &gt; SQL Editor</strong> lalu jalankan 2 baris perintah ini:
            </p>
            <pre className="p-2 rounded-lg bg-neutral-900 text-neutral-100 font-mono text-[11px] overflow-x-auto select-all">
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS minus_points JSONB DEFAULT '[]'::jsonb;
            </pre>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 active:scale-98 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
          </button>
        </div>

      </form>

      {/* Backup, Export & Reset Section */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100">
          Cadangan & Manajemen Data
        </h3>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Data (JSON)</span>
          </button>

          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 transition-colors">
            <Upload className="w-4 h-4" />
            <span>Impor Data (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-semibold text-red-700 transition-colors ml-auto"
          >
            <RotateCcw className="w-4 h-4 text-red-600" />
            <span>Reset ke Data Awal</span>
          </button>
        </div>
      </div>
    </div>
  );
};
