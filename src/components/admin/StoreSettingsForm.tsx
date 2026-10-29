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
  Sparkles,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Trash2,
  Layers,
  Cpu,
  Cloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import {
  getStoredRemoveBgApiKeys,
  saveStoredRemoveBgApiKeys,
  getStoredMagicThumbnailEngine,
  saveStoredMagicThumbnailEngine,
} from '../../lib/magicThumbnail';

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

  // Multiple Remove.bg API Keys Pool
  const initialKeys = getStoredRemoveBgApiKeys();
  const [removeBgKeys, setRemoveBgKeys] = useState<string[]>(
    initialKeys.length > 0
      ? initialKeys
      : settings.removebg_api_key
        ? [settings.removebg_api_key]
        : ['']
  );
  // Magic Thumbnail Engine Toggle ('imgly' vs 'removebg')
  const [thumbnailEngine, setThumbnailEngine] = useState<'imgly' | 'removebg'>(
    settings.magic_thumbnail_engine || getStoredMagicThumbnailEngine() || 'imgly'
  );
  const [showRemoveBgConfig, setShowRemoveBgConfig] = useState(
    (settings.magic_thumbnail_engine || getStoredMagicThumbnailEngine()) === 'removebg' ||
    removeBgKeys.some((k) => k.trim().length > 0)
  );
  const [showKeyMap, setShowKeyMap] = useState<Record<number, boolean>>({});
  const [testingKeyIndex, setTestingKeyIndex] = useState<number | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [keyCredits, setKeyCredits] = useState<
    Record<number, { success: boolean; total: number; free: number; message: string }>
  >({});

  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingProducts, setSyncingProducts] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [connectedState, setConnectedState] = useState(isSupabaseConnected());
  const [copiedSql, setCopiedSql] = useState(false);

  const handleKeyChange = (index: number, val: string) => {
    setRemoveBgKeys((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
    setKeyCredits((prev) => {
      const copy = { ...prev };
      delete copy[index];
      return copy;
    });
  };

  const handleAddKey = () => {
    setRemoveBgKeys((prev) => [...prev, '']);
  };

  const handleRemoveKey = (index: number) => {
    if (removeBgKeys.length <= 1) {
      setRemoveBgKeys(['']);
      setKeyCredits({});
      return;
    }
    setRemoveBgKeys((prev) => prev.filter((_, i) => i !== index));
    setKeyCredits((prev) => {
      const updated: Record<number, any> = {};
      Object.keys(prev).forEach((k) => {
        const num = Number(k);
        if (num < index) updated[num] = prev[num];
        else if (num > index) updated[num - 1] = prev[num];
      });
      return updated;
    });
  };

  const checkSingleKeyCredits = async (
    key: string
  ): Promise<{ success: boolean; total: number; free: number; message: string }> => {
    const cleanKey = key.trim();
    if (!cleanKey) {
      return { success: false, total: 0, free: 0, message: 'API key kosong' };
    }
    try {
      const rbgRes = await fetch('https://api.remove.bg/v1.0/account', {
        headers: { 'X-Api-Key': cleanKey },
      });
      const data = await rbgRes.json().catch(() => null);
      if (rbgRes.ok) {
        const total = data?.data?.attributes?.credits?.total ?? 0;
        const free = data?.data?.attributes?.credits?.free ?? 0;
        return {
          success: true,
          total,
          free,
          message: `${total} kredit (${free} free)`,
        };
      }
      const errDetail = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || '';
      return {
        success: false,
        total: 0,
        free: 0,
        message: rbgRes.status === 401 ? 'Key Tidak Valid' : errDetail || `Status ${rbgRes.status}`,
      };
    } catch {
      // Proxy fallback via server
      try {
        const proxyRes = await fetch('/api/removebg/test-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: cleanKey }),
        });
        const proxyData = await proxyRes.json();
        if (proxyRes.ok && proxyData.success) {
          const tot = proxyData.credits?.total ?? 50;
          const fr = proxyData.credits?.free ?? 50;
          return { success: true, total: tot, free: fr, message: `${tot} kredit` };
        }
      } catch {
        // Ignored
      }
      return { success: false, total: 0, free: 0, message: 'Gagal menghubungi Remove.bg' };
    }
  };

  const handleTestKeyIndex = async (index: number) => {
    const key = removeBgKeys[index]?.trim();
    if (!key) {
      showToast(`Masukkan API Key #${index + 1} terlebih dahulu`, 'error');
      return;
    }
    setTestingKeyIndex(index);
    const res = await checkSingleKeyCredits(key);
    setKeyCredits((prev) => ({ ...prev, [index]: res }));
    setTestingKeyIndex(null);
    if (res.success) {
      showToast(`Key #${index + 1} valid! Saldo: ${res.total} kredit.`, 'success');
    } else {
      showToast(`Key #${index + 1} gagal: ${res.message}`, 'error');
    }
  };

  const handleTestAllKeys = async () => {
    const nonEmpties = removeBgKeys.filter((k) => k.trim());
    if (nonEmpties.length === 0) {
      showToast('Masukkan minimal 1 API Key Remove.bg', 'error');
      return;
    }
    setIsTestingAll(true);
    let totalPool = 0;
    let validCount = 0;

    for (let i = 0; i < removeBgKeys.length; i++) {
      const k = removeBgKeys[i]?.trim();
      if (!k) continue;
      const res = await checkSingleKeyCredits(k);
      setKeyCredits((prev) => ({ ...prev, [i]: res }));
      if (res.success) {
        totalPool += res.total;
        validCount++;
      }
    }
    setIsTestingAll(false);
    showToast(`Pemeriksaan selesai: ${validCount} key aktif dengan total ${totalPool} kredit pool!`, 'success');
  };

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

      // 1b. Save Remove.bg API Keys Pool & Magic Thumbnail Engine
      const cleanKeys = removeBgKeys.map((k) => k.trim()).filter(Boolean);
      saveStoredRemoveBgApiKeys(cleanKeys);
      saveStoredMagicThumbnailEngine(thumbnailEngine);

      if (cleanKeys.length > 0) {
        await fetch('/api/removebg-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: cleanKeys[0] }),
        }).catch(() => {});
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
        removebg_api_key: cleanKeys[0] || '',
        removebg_api_keys: cleanKeys,
        magic_thumbnail_engine: thumbnailEngine,
      });
      showToast(
        `Pengaturan toko berhasil disimpan! Mesin Magic Thumbnail: ${thumbnailEngine === 'imgly' ? 'Imgly AI (Gratis Browser)' : 'Remove.bg API'}`,
        'success'
      );
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

        {/* Section 2: Magic Thumbnail AI Engine & Key Settings */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/90 shadow-2xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-neutral-100 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
                  Magic Thumbnail AI - Pilihan Mesin Cutout
                </h3>
                <p className="text-[11px] text-neutral-500">
                  Pilih mesin pemotong background produk dan auto-center canvas
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                thumbnailEngine === 'imgly'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}>
                <span className={`w-2 h-2 rounded-full ${thumbnailEngine === 'imgly' ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`}></span>
                <span>{thumbnailEngine === 'imgly' ? 'Imgly AI (Aktif - Tanpa Key)' : 'Remove.bg API (Aktif)'}</span>
              </span>
            </div>
          </div>

          {/* Dual Engine Selector Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card 1: Imgly AI Browser */}
            <div
              onClick={() => {
                setThumbnailEngine('imgly');
                saveStoredMagicThumbnailEngine('imgly');
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                thumbnailEngine === 'imgly'
                  ? 'border-emerald-600 bg-emerald-50/40 shadow-xs'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-neutral-900">
                      Imgly AI Browser
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-600 text-white">
                    Gratis & Unlimited
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed pt-1">
                  Model AI ISNet dijalankan langsung di browser Anda menggunakan WebAssembly. <strong>100% Gratis & tanpa API Key</strong>, tanpa batas kuota akun, dan gambar otomatis di-center di canvas persegi.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-xs">
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Bawaan Sistem (Rekomendasi)
                </span>
                <input
                  type="radio"
                  name="thumbnailEngine"
                  checked={thumbnailEngine === 'imgly'}
                  onChange={() => {
                    setThumbnailEngine('imgly');
                    saveStoredMagicThumbnailEngine('imgly');
                  }}
                  className="w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Card 2: Remove.bg Cloud API */}
            <div
              onClick={() => {
                setThumbnailEngine('removebg');
                setShowRemoveBgConfig(true);
                saveStoredMagicThumbnailEngine('removebg');
              }}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                thumbnailEngine === 'removebg'
                  ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-neutral-900">
                      Remove.bg Cloud API
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-neutral-200 text-neutral-800">
                    Gunakan API Key
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed pt-1">
                  Memproses cutout via server cloud Remove.bg resmi. Mendukung multi-key failover otomatis (50 kredit free per akun). Jika kuota habis, otomatis dialihkan ke Imgly AI.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200/60 text-xs">
                <span className="text-[11px] font-medium text-neutral-500">
                  {removeBgKeys.filter(k => k.trim()).length > 0
                    ? `${removeBgKeys.filter(k => k.trim()).length} Key Terdaftar`
                    : 'Input key diperlukan'}
                </span>
                <input
                  type="radio"
                  name="thumbnailEngine"
                  checked={thumbnailEngine === 'removebg'}
                  onChange={() => {
                    setThumbnailEngine('removebg');
                    setShowRemoveBgConfig(true);
                    saveStoredMagicThumbnailEngine('removebg');
                  }}
                  className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quick Toggle Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-neutral-800">
                Mode Aktif Saat Ini: {thumbnailEngine === 'imgly' ? 'Imgly AI (Browser Lokal)' : 'Remove.bg Cloud API'}
              </span>
              <p className="text-[11px] text-neutral-500">
                {thumbnailEngine === 'imgly'
                  ? 'Magic Thumbnail berjalan gratis tanpa API key saat input produk. Kunci Remove.bg opsional sebagai cadangan.'
                  : 'Magic Thumbnail memanggil Remove.bg terlebih dahulu, dengan failover otomatis ke Imgly jika kuota habis.'}
              </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  const nextEngine = thumbnailEngine === 'imgly' ? 'removebg' : 'imgly';
                  setThumbnailEngine(nextEngine);
                  if (nextEngine === 'removebg') setShowRemoveBgConfig(true);
                  saveStoredMagicThumbnailEngine(nextEngine);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 ${
                  thumbnailEngine === 'removebg'
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                <span>Ganti ke {thumbnailEngine === 'imgly' ? 'Remove.bg API' : 'Imgly AI Browser'}</span>
              </button>

              {thumbnailEngine === 'imgly' && (
                <button
                  type="button"
                  onClick={() => setShowRemoveBgConfig(prev => !prev)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{showRemoveBgConfig ? 'Sembunyikan Kunci' : 'Kelola Kunci Remove.bg'}</span>
                  {showRemoveBgConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>

          {/* Remove.bg API Keys Pool Section (Shown if Remove.bg is active or expanded) */}
          {(thumbnailEngine === 'removebg' || showRemoveBgConfig) && (
            <div className="space-y-4 pt-2 border-t border-neutral-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Daftar API Key Remove.bg {thumbnailEngine === 'imgly' ? '(Sebagai Cadangan)' : '(Mesin Utama)'}
                  </h4>
                </div>

                <div className="flex items-center gap-2">
                  {(() => {
                    const nonEmpties = removeBgKeys.filter((k) => k.trim());
                    const testedList = Object.values(keyCredits).filter((c) => c.success);
                    const totalPoolCredits = testedList.reduce((acc, c) => acc + c.total, 0);

                    if (testedList.length > 0) {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Total Pool: {totalPoolCredits} Kredit ({testedList.length} Key)</span>
                        </span>
                      );
                    }

                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        nonEmpties.length > 0
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${nonEmpties.length > 0 ? 'bg-emerald-500' : 'bg-neutral-400'}`}></span>
                        {nonEmpties.length > 0 ? `${nonEmpties.length} Key Terpasang` : 'Belum Ada Key'}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Info Banner on Multi-Key Quota */}
              <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-indigo-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-indigo-900 leading-snug">
                    Tips Kuota Melimpah (Gratis 50 Kredit / Akun Remove.bg):
                  </p>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Anda dapat mendaftarkan beberapa akun di <strong>remove.bg</strong> (masing-masing akun mendapat 50 free credits). Masukkan semua API key-nya di sini. Sistem akan otomatis memakai <strong>Key #1</strong>, dan jika kuotanya habis (402), otomatis langsung beralih ke <strong>Key #2</strong>, <strong>#3</strong>, dst. tanpa kendala!
                  </p>
                </div>
              </div>

              {/* Keys List */}
              <div className="space-y-3.5">
                {removeBgKeys.map((key, index) => {
                  const isFirst = index === 0;
                  const isShowing = !!showKeyMap[index];
                  const isChecking = testingKeyIndex === index;
                  const creditInfo = keyCredits[index];

                  return (
                    <div
                      key={index}
                      className="p-3.5 sm:p-4 rounded-xl border border-neutral-200 bg-neutral-50/40 space-y-2.5 transition-all hover:border-neutral-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[10px] font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-neutral-800">
                            {isFirst ? 'API Key Utama (#1)' : `API Key Cadangan (#${index + 1})`}
                          </span>
                          {isFirst && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
                              PRIORITAS 1
                            </span>
                          )}
                        </div>

                        {/* Credit Status Badge */}
                        {creditInfo && (
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                            creditInfo.success
                              ? creditInfo.total > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {creditInfo.success ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{creditInfo.total > 0 ? `${creditInfo.total} Kredit Tersedia` : '0 Kredit (Habis)'}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3 text-red-600" />
                                <span>{creditInfo.message}</span>
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                            <Key className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type={isShowing ? 'text' : 'password'}
                            value={key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            placeholder={`Masukkan API key Remove.bg #${index + 1}...`}
                            className="w-full pl-9 pr-10 py-2 rounded-xl border border-neutral-300 text-xs text-neutral-900 font-mono focus:outline-hidden focus:border-indigo-600 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKeyMap((prev) => ({ ...prev, [index]: !prev[index] }))}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors"
                            title={isShowing ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {isShowing ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Check single balance */}
                          <button
                            type="button"
                            disabled={isChecking || !key.trim()}
                            onClick={() => handleTestKeyIndex(index)}
                            className="px-3 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-98 shadow-2xs"
                            title="Cek keaktifan key dan sisa kredit akun ini"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                            <span>{isChecking ? 'Mengecek...' : 'Cek Saldo'}</span>
                          </button>

                          {/* Remove Key button */}
                          {removeBgKeys.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveKey(index)}
                              className="p-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs transition-colors cursor-pointer"
                              title="Hapus API key ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Row: Add Key & Check All Balance */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-100">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAddKey}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all active:scale-98 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah API Key Cadangan</span>
                  </button>

                  <button
                    type="button"
                    disabled={isTestingAll || removeBgKeys.filter((k) => k.trim()).length === 0}
                    onClick={handleTestAllKeys}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all active:scale-98 disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingAll ? 'animate-spin' : ''}`} />
                    <span>{isTestingAll ? 'Mengecek Semua...' : 'Cek Saldo Semua Key'}</span>
                  </button>
                </div>

                <a
                  href="https://www.remove.bg/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 hover:underline"
                >
                  <span>Dapatkan 50 Kredit Gratis di remove.bg/api</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
            >
              <span>Dapatkan 50 Kredit Gratis di remove.bg/api</span>
              <ExternalLink className="w-3 h-3" />
            </a>
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
