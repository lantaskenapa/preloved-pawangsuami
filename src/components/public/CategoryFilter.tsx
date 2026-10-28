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

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  categoryCounts,
  totalProductsCount,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none select-none">
        {/* All Categories Option */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            selectedCategory === 'all'
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200/80'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Semua</span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${
              selectedCategory === 'all'
                ? 'bg-neutral-800 text-neutral-300'
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

          return (
            <button
              key={cat.id || cat.slug}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200/80'
              }`}
            >
              {getCategoryIcon(cat.icon || cat.slug, 'w-4 h-4')}
              <span>{cat.name}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded-md font-mono ${
                  isSelected
                    ? 'bg-neutral-800 text-neutral-300'
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
