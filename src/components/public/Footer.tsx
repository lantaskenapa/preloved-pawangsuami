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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-row items-center justify-center gap-3 sm:gap-4 flex-wrap">
        <img
          src="/assets/aistudio/logopawang-01_d93a2394.png"
          alt={settings.store_name}
          className="h-6 sm:h-7 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
        />
        <span className="text-neutral-300 hidden sm:inline">•</span>
        <p className="whitespace-nowrap">
          © {new Date().getFullYear()} {settings.store_name}. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </footer>
  );
};
