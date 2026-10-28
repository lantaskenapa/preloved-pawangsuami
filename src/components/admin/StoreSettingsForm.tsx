import React, { useState } from 'react';
import { StoreSettings } from '../../types';
import { isSupabaseConnected, testSupabaseConnection } from '../../lib/supabaseClient';
import {
  Save,
  ShoppingBag,
  MapPin,
  Clock,
  Phone,
  ShieldAlert,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
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
  const [shippingOrigin, setShippingOrigin] = useState(settings.shipping_origin);
  const [whatsapp, setWhatsapp] = useState(settings.whatsapp_contact || '');
  const [operationalHours, setOperationalHours] = useState(settings.operational_hours);
  const [shippingPolicy, setShippingPolicy] = useState(settings.shipping_policy);
  const [returnPolicy, setReturnPolicy] = useState(settings.return_policy);

  // Supabase live configuration credentials
  const [supabaseUrl, setSupabaseUrl] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_url') || '' : ''
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('psp_supabase_anon_key') || '' : ''
  );

  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [connectedState, setConnectedState] = useState(isSupabaseConnected());

  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      showToast('Masukkan Supabase Project URL dan Anon Key terlebih dahulu', 'error');
      return;
    }
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      // Temporarily save to localStorage for testing
      localStorage.setItem('psp_supabase_url', supabaseUrl.trim());
      localStorage.setItem('psp_supabase_anon_key', supabaseAnonKey.trim());
      const res = await testSupabaseConnection(supabaseUrl.trim(), supabaseAnonKey.trim());
      setConnectionResult(res);
      setConnectedState(res.success);
      if (res.success) {
        showToast('Koneksi Supabase berhasil!', 'success');
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

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        store_name: storeName.trim(),
        tagline: tagline.trim(),
        bio: bio.trim(),
        shopee_store_url: shopeeUrl.trim(),
        shipping_origin: shippingOrigin.trim(),
        whatsapp_contact: whatsapp.trim(),
        operational_hours: operationalHours.trim(),
        shipping_policy: shippingPolicy.trim(),
        return_policy: returnPolicy.trim(),
        supabase_url: supabaseUrl.trim(),
        supabase_anon_key: supabaseAnonKey.trim(),
      });
      showToast('Informasi toko berhasil disimpan!', 'success');
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

        {/* Section 2: Operasional & Pengiriman */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider pb-2 border-b border-neutral-100">
            Lokasi, Kontak & Kebijakan
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Kota Asal Pengiriman
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={shippingOrigin}
                  onChange={(e) => setShippingOrigin(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Jam Operasional
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={operationalHours}
                  onChange={(e) => setOperationalHours(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                WhatsApp Admin
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="081298765432"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Catatan Pengemasan / Pengiriman
            </label>
            <textarea
              rows={2}
              value={shippingPolicy}
              onChange={(e) => setShippingPolicy(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
              Ketentuan Retur & Garansi Shopee
            </label>
            <textarea
              rows={2}
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 leading-relaxed"
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

          <p className="text-xs text-neutral-500 leading-relaxed">
            Aplikasi ini terhubung langsung ke Supabase menggunakan REST API klien. <strong>Tidak perlu klik tombol "Connect" di Supabase</strong>. Cukup masukkan <em>Project URL</em> dan <em>Anon Key</em> Anda di bawah, lalu klik <strong>Tes Koneksi</strong>:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono"
              />
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
            </div>
          </div>

          {/* Action: Test Connection Button */}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={testingConnection}
              onClick={handleTestConnection}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 active:scale-98 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Menguji Koneksi...' : 'Tes Koneksi Sekarang'}</span>
            </button>
            <span className="text-[11px] text-neutral-400">
              Uji apakah tabel database dapat dibaca & ditulis dari browser
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
