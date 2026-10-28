import React from 'react';
import { StoreSettings } from '../types';
import { ShieldCheck, Truck, Sparkles, HeartHandshake, ShoppingBag, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AboutViewProps {
  settings: StoreSettings;
  onBackToCatalog: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ settings, onBackToCatalog }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={onBackToCatalog}
        className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kembali ke Katalog</span>
      </button>

      {/* Hero Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-neutral-200/90 shadow-xs mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-xs font-bold text-neutral-700 uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tentang Kami</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
          Pawang Suami Preloved
        </h1>
        <p className="mt-2 text-lg text-neutral-500 font-medium italic">
          “{settings.tagline}”
        </p>

        <p className="mt-6 text-base text-neutral-700 leading-relaxed">
          {settings.bio}
        </p>

        <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-wrap items-center gap-4">
          <a
            href={settings.shopee_store_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#EE4D2D] hover:bg-[#D73211] text-white font-bold text-sm transition-all shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Kunjungi Toko Shopee Resmi</span>
          </a>
        </div>
      </div>

      {/* 3 Pillars of Trust */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Transparansi Kondisi</h3>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
            Tidak ada cacat yang disembunyikan. Foto diambil dari berbagai sudut pencahayaan asli dan riwayat pemakaian diceritakan apa adanya.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-[#EE4D2D]/10 text-[#EE4D2D] flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Garansi Shopee 100%</h3>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
            Seluruh transaksi checkout diarahkan ke aplikasi Shopee. Dana Anda terlindungi secara resmi dan dapat diretur jika terjadi ketidaksesuaian.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">Packing Ekstra Aman</h3>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
            Gratis double bubble wrap tebal dan kardus pelindung. Barang elektronik sensitif dikemas secara khusus untuk keamanan pengiriman.
          </p>
        </div>
      </div>

      {/* Ketentuan & Tanya Jawab */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200 space-y-6 shadow-2xs">
        <h3 className="text-lg font-bold text-neutral-900">
          Prosedur Pembelian & Pengiriman
        </h3>

        <div className="space-y-4 text-sm text-neutral-700">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-900">Pilih Barang di Katalog:</strong>
              <p className="text-neutral-600 text-xs mt-0.5">
                Cari barang yang Anda inginkan lalu klik tombol <em>“Beli di Shopee”</em>. Anda akan langsung dialihkan ke etalase Shopee produk bersangkutan.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-900">Voucher & Gratis Ongkir Shopee:</strong>
              <p className="text-neutral-600 text-xs mt-0.5">
                Anda dapat menggunakan voucher diskon toko, cashback koin, dan gratis ongkir yang tersedia di akun Shopee Anda saat checkout.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-neutral-900">Perlindungan Pembeli:</strong>
              <p className="text-neutral-600 text-xs mt-0.5">
                Semua transaksi dilindungi sistem Shopee Garansi 100%. Dana Anda aman sampai barang tiba sesuai foto dan deskripsi yang dicantumkan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
