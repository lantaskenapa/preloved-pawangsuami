import React, { useState, useMemo } from 'react';
import { Category, Product } from '../../types';
import { formatIDR } from '../../lib/formatters';
import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface AdminProductTableProps {
  products: Product[];
  categories: Category[];
  onAddNew: () => void;
  onEdit: (product: Product) => void;
  onDeleteRequest: (product: Product) => void;
  onToggleStatus: (productId: string) => Promise<void>;
}

export const AdminProductTable: React.FC<AdminProductTableProps> = ({
  products,
  categories,
  onAddNew,
  onEdit,
  onDeleteRequest,
  onToggleStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'published' | 'draft'>('all');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && p.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [products, selectedCategory, selectedStatus, searchQuery]);

  return (
    <div className="space-y-5">
      {/* Table Toolbar Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari inventaris produk preloved..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-xs sm:text-sm text-neutral-900 focus:bg-white focus:outline-hidden focus:border-neutral-900"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold bg-neutral-50 text-neutral-700"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id || c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-xs font-semibold bg-neutral-50 text-neutral-700"
          >
            <option value="all">Semua Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          {/* Add Product Button */}
          <button
            onClick={onAddNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-2xs active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>

      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Barang</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Kondisi</th>
                <th className="py-3.5 px-4">Harga (IDR)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4">Link Shopee</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((prod) => {
                  const img = prod.images && prod.images.length > 0 ? prod.images[0] : null;
                  const isPub = prod.status === 'published';

                  return (
                    <tr key={prod.id} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Product Name & Photo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 border border-neutral-200/80">
                            {img ? (
                              <img src={img} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-400 text-[10px]">
                                No Pic
                              </div>
                            )}
                          </div>
                          <div className="max-w-xs">
                            <span className="font-bold text-neutral-900 block line-clamp-1">
                              {prod.name}
                            </span>
                            {prod.story && (
                              <span className="text-[11px] text-neutral-500 italic block line-clamp-1">
                                "{prod.story}"
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-neutral-700">
                          {prod.category}
                        </span>
                      </td>

                      {/* Condition */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {prod.condition}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        {formatIDR(prod.price)}
                      </td>

                      {/* Status toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(prod.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                            isPub
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                          title="Klik untuk mengubah status Draft/Published"
                        >
                          {isPub ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{isPub ? 'Published' : 'Draft'}</span>
                        </button>
                      </td>

                      {/* Link Shopee */}
                      <td className="py-3 px-4">
                        <a
                          href={prod.shopee_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#EE4D2D] hover:underline"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Buka Shopee</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(prod)}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(prod)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    Tidak ada produk yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Subfooter */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <span>Menampilkan {filteredProducts.length} dari {products.length} total produk</span>
          <span className="text-[11px] italic">
            Tips: Klik tombol status untuk langsung beralih antara <strong>Published</strong> dan <strong>Draft</strong>.
          </span>
        </div>
      </div>
    </div>
  );
};
