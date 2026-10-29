import React from 'react';
import { Category } from '../../types';
import { getCategoryIcon } from '../../lib/icons';
import { Layers } from 'lucide-react';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string; // 'all' or category slug
  onSelectCategory: (slug: string) => void;
  categoryCounts: Record<string, number>;
  totalProductsCount: number;
}

interface CategoryColorConfig {
  iconColor: string;
  activeBtn: string;
  activeBadge: string;
}

function getCategoryColorConfig(key: string): CategoryColorConfig {
  const norm = (key || '').toLowerCase().trim();

  switch (norm) {
    case 'all':
      return {
        iconColor: 'text-blue-500',
        activeBtn: 'bg-blue-600 text-white border-blue-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'games':
    case 'gamepad2':
    case 'gamepad':
      return {
        iconColor: 'text-violet-500',
        activeBtn: 'bg-violet-600 text-white border-violet-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'shirts':
    case 'shirt':
    case 'clothes':
      return {
        iconColor: 'text-amber-500',
        activeBtn: 'bg-amber-600 text-white border-amber-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'electronics':
    case 'tv':
    case 'headphones':
      return {
        iconColor: 'text-emerald-500',
        activeBtn: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'accessories':
    case 'watch':
      return {
        iconColor: 'text-rose-500',
        activeBtn: 'bg-rose-600 text-white border-rose-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'gadgets':
    case 'gadget':
    case 'smartphone':
    case 'laptop':
      return {
        iconColor: 'text-sky-500',
        activeBtn: 'bg-sky-600 text-white border-sky-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'camera':
      return {
        iconColor: 'text-indigo-500',
        activeBtn: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    case 'package':
    case 'others':
      return {
        iconColor: 'text-teal-500',
        activeBtn: 'bg-teal-600 text-white border-teal-600 shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
    default:
      return {
        iconColor: 'text-[#EE4D2D]',
        activeBtn: 'bg-[#EE4D2D] text-white border-[#EE4D2D] shadow-xs',
        activeBadge: 'bg-white/25 text-white',
      };
  }
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalProductsCount,
}) => {
  const allColor = getCategoryColorConfig('all');

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
        {/* All Categories Option */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
            selectedCategory === 'all'
              ? allColor.activeBtn
              : 'bg-white text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 border-neutral-200/90 shadow-2xs'
          }`}
        >
          <Layers className={`w-4 h-4 ${selectedCategory === 'all' ? 'text-white' : allColor.iconColor}`} />
          <span>Semua</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${
              selectedCategory === 'all'
                ? allColor.activeBadge
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {totalProductsCount}
          </span>
        </button>

        {/* Dynamic Category List */}
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          const count = categoryCounts[cat.slug] || 0;
          const colorConfig = getCategoryColorConfig(cat.icon || cat.slug);

          return (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                isSelected
                  ? colorConfig.activeBtn
                  : 'bg-white text-neutral-700 hover:text-neutral-950 hover:bg-neutral-50 border-neutral-200/90 shadow-2xs'
              }`}
            >
              {getCategoryIcon(
                cat.icon || cat.slug,
                `w-4 h-4 ${isSelected ? 'text-white' : colorConfig.iconColor}`
              )}
              <span>{cat.name}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${
                  isSelected
                    ? colorConfig.activeBadge
                    : 'bg-neutral-100 text-neutral-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
