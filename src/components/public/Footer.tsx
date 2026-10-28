import React from 'react';
import { StoreSettings } from '../../types';
import { ShoppingBag, ArrowUpRight, ShieldCheck, MapPin, Clock, Lock, Sparkles } from 'lucide-react';

interface FooterProps {
  settings: StoreSettings;
  onNavigateToAdmin: () => void;
  onNavigateToCatalog: () => void;
  onSelectCategory: (cat: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  settings,
  onNavigateToAdmin,
  onNavigateToCatalog,
  onSelectCategory,
}) => {
  return (
    <footer className="bg-neutral-900 text-neutral-300 pt-16 pb-12 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-neutral-800">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-neutral-950 font-extrabold flex items-center justify-center text-base">
                PS
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-base font-extrabold text-white tracking-tight">Pawang</span>
                <span className="text-xs font-bold text-neutral-400 tracking-tight mt-0.5">Suami Preloved</span>
              </div>
            </div>

            <p className="text-sm text-neutral-400 leading-relaxed max-w-md">
              {settings.bio}
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={settings.shopee_store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs font-bold transition-all shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Buka Toko Resmi Shopee</span>
                <ArrowUpRight className="w-3.5 h-3.5 opacity-80" />
              </a>

              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Shopee Buyer Protection</span>
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Kategori Favorit
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => {
                    onNavigateToCatalog();
                    onSelectCategory('games');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Konsol & Game
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateToCatalog();
                    onSelectCategory('shirts');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Kaos & Flannel
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateToCatalog();
                    onSelectCategory('electronics');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Audio & Elektronik
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateToCatalog();
                    onSelectCategory('gadgets');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Tablet & Gadget
                </button>
              </li>
              <li>
                <button
                  onClick={() => {
                    onNavigateToCatalog();
                    onSelectCategory('accessories');
                  }}
                  className="hover:text-white transition-colors"
                >
                  Jam Tangan & Aksesoris
                </button>
              </li>
            </ul>
          </div>

          {/* Pengiriman & Operasional */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Lokasi & Pengiriman
            </h4>
            <div className="space-y-3 text-xs text-neutral-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span>Asal Pengiriman: <strong>{settings.shipping_origin}</strong></span>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                <span>{settings.operational_hours}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-neutral-400 pt-1">
                {settings.shipping_policy}
              </p>
            </div>
          </div>

        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <p>© {new Date().getFullYear()} {settings.store_name}. Seluruh hak cipta dilindungi.</p>
          
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
              <span>Barang Lama, Cerita Baru.</span>
            </span>
            <span className="text-neutral-700">•</span>
            <button
              onClick={onNavigateToAdmin}
              className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
            >
              <Lock className="w-3 h-3" />
              <span>Portal Admin</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
