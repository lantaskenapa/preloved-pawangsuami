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
    <footer className="bg-neutral-100 border-t border-neutral-300/80 py-6 text-center text-xs text-neutral-500 font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} {settings.store_name}. Seluruh hak cipta dilindungi.</p>
      </div>
    </footer>
  );
};
