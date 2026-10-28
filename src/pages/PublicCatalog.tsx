import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Category, Product, StoreSettings } from '../types';
import { CategoryFilter } from '../components/public/CategoryFilter';
import { ProductCard } from '../components/public/ProductCard';
import { ProductDetailModal } from '../components/public/ProductDetailModal';
import {
  Search,
  X,
  ArrowUpDown,
  Check,
} from 'lucide-react';

interface PublicCatalogProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  onNavigateToAbout: () => void;
}

const SORT_OPTIONS: { id: 'newest' | 'price-asc' | 'price-desc' | 'name-asc'; label: string }[] = [
  { id: 'newest', label: 'Terbaru' },
  { id: 'price-asc', label: 'Harga: Terendah' },
  { id: 'price-desc', label: 'Harga: Tertinggi' },
  { id: 'name-asc', label: 'Nama: A - Z' },
];

export const PublicCatalog: React.FC<PublicCatalogProps> = ({
  products,
  categories,
  settings,
  selectedCategory,
  setSelectedCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'name-asc'>('newest');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close sort menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setSortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category match
        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false;
        }

        // Search query match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = p.name.toLowerCase().includes(q);
          const matchDesc = p.description.toLowerCase().includes(q);
          const matchStory = p.story ? p.story.toLowerCase().includes(q) : false;
          const matchCat = p.category.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchStory && !matchCat) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
        // Default: newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSortBy('newest');
  };

  const activeSortLabel = SORT_OPTIONS.find((s) => s.id === sortBy)?.label || 'Terbaru';

  return (
    <div className="min-h-screen">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-16">
        
        {/* 1. Category Filter Row */}
        <div className="mb-4">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            categoryCounts={categoryCounts}
            totalProductsCount={products.length}
          />
        </div>

        {/* 2. Search & Sort in 1 Row (Sejajar 1 Baris) */}
        <div className="flex items-center gap-2 mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama barang, konsol, hoodie, atau headphone..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-500 border border-neutral-200 focus:outline-hidden focus:border-neutral-900 shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Icon Button with Popover (Berada di samping search 1 baris) */}
          <div className="relative shrink-0" ref={sortRef}>
            <button
              type="button"
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className={`p-2.5 sm:px-3 sm:py-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                sortBy !== 'newest'
                  ? 'bg-neutral-900 text-white border-neutral-900'
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-300'
              }`}
              title={`Urutkan: ${activeSortLabel}`}
              aria-label="Urutkan produk"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span className="hidden md:inline text-xs font-semibold">{activeSortLabel}</span>
            </button>

            {/* Sort Popover Menu */}
            {sortDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-neutral-200 shadow-lg py-1.5 z-30 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 mb-1">
                  Urutkan Berdasarkan
                </div>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.id);
                      setSortDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                      sortBy === opt.id
                        ? 'bg-neutral-100 font-bold text-neutral-900'
                        : 'text-neutral-700 hover:bg-neutral-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-neutral-900" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Product Grid (2 produk per baris di mobile) */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={(prod) => setActiveProduct(prod)}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-neutral-200 p-12 text-center max-w-lg mx-auto shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900">
              Tidak Ada Barang Yang Sesuai
            </h3>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              Coba ganti kata kunci pencarian atau pilih kategori lain untuk melihat koleksi lainnya.
            </p>
            <button
              onClick={resetFilters}
              className="mt-6 px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-xs"
            >
              Tampilkan Semua Koleksi
            </button>
          </div>
        )}

      </section>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={activeProduct}
        settings={settings}
        onClose={() => setActiveProduct(null)}
      />
    </div>
  );
};
