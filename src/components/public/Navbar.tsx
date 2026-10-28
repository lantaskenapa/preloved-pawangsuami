import React from 'react';
import { StoreSettings } from '../../types';
import { ShoppingBag, Lock } from 'lucide-react';

import { BrandLogo } from '../ui/BrandLogo';

interface NavbarProps {
  settings: StoreSettings;
  onNavigateToCatalog: () => void;
  onNavigateToAbout?: () => void;
  onNavigateToAdmin: () => void;
  currentView?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onNavigateToCatalog,
  onNavigateToAdmin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand Identity (Pawang Suami \n Preloved) */}
          <div 
            onClick={onNavigateToCatalog}
            className="cursor-pointer flex items-center gap-2.5 sm:gap-3 group select-none"
          >
            <BrandLogo className="w-10 h-10 sm:w-11 sm:h-11 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col leading-none">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-neutral-900">
                Pawang Suami
              </span>
              <span className="font-bold text-xs sm:text-sm tracking-tight text-neutral-500 mt-0.5">
                Preloved
              </span>
            </div>
          </div>

          {/* Actions di Kanan: Tombol Shopee & Admin Login */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={settings.shopee_store_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs sm:text-sm font-bold transition-all shadow-xs active:scale-95"
              title="Kunjungi Toko Shopee"
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Toko Shopee</span>
            </a>

            <button
              onClick={onNavigateToAdmin}
              title="Akses Login Admin"
              className="p-2 sm:p-2.5 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              aria-label="Login Admin"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
