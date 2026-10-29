import React from 'react';
import { StoreSettings } from '../../types';

interface FooterProps {
  settings: StoreSettings;
  onNavigateToAdmin?: () => void;
  onNavigateToCatalog?: () => void;
  onSelectCategory?: (cat: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  return (
    <footer className="bg-neutral-100 border-t border-neutral-300/80 py-5 text-xs text-neutral-500 font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-center gap-3 sm:gap-4">
        {/* Logo di kiri */}
        <img
          src="/assets/aistudio/logopawang-01_d93a2394.png"
          alt={settings.store_name}
          className="h-7 sm:h-8 w-auto shrink-0 object-contain opacity-90 hover:opacity-100 transition-opacity"
        />
        
        <span className="text-neutral-300 hidden sm:inline">•</span>

        {/* Tulisan di kanan (2 baris di mobile, 1 baris di sm ke atas) */}
        <div className="text-left text-[11px] sm:text-xs text-neutral-500 font-medium leading-tight sm:leading-normal">
          <p className="sm:hidden">
            © {new Date().getFullYear()} {settings.store_name}.<br />
            <span className="text-neutral-400">Seluruh hak cipta dilindungi.</span>
          </p>
          <p className="hidden sm:block whitespace-nowrap">
            © {new Date().getFullYear()} {settings.store_name}. Seluruh hak cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
};
