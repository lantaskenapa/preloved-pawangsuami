import React, { useState, useMemo } from 'react';
import { Category, Product, ProductStatus } from '../../types';
import { formatIDR } from '../../lib/formatters';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

interface AdminProductTableProps {
  products: Product[];
  categories: Category[];
  onAddNew: () => void;
  onEdit: (product: Product) => void;
  onDeleteRequest: (product: Product) => void;
  onToggleStatus: (productId: string) => Promise<void>;
  onUpdateStatus?: (productId: string, status: ProductStatus) => Promise<void>;
  onBulkUpdateStatus?: (productIds: string[], status: ProductStatus) => Promise<void>;
  onBulkDelete?: (productIds: string[]) => Promise<void>;
}

export const AdminProductTable: React.FC<AdminProductTableProps> = ({
  products,
  categories,
  onAddNew,
  onEdit,
  onDeleteRequest,
  onToggleStatus,
  onUpdateStatus,
  onBulkUpdateStatus,
  onBulkDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showConfirmBulkDelete, setShowConfirmBulkDelete] = useState(false);

  // Filter products by category and search only (status ready/draft filter removed as requested)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchDesc = p.description.toLowerCase().includes(q);
        const matchCat = p.category.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  // Checklist helpers
  const isAllSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedIds.includes(p.id));
  }, [products, selectedIds]);

  const hasSoldSelected = selectedProducts.some((p) => p.status === 'sold');
  const hasAvailableSelected = selectedProducts.some((p) => p.status !== 'sold');

  const handleBulkMarkAsSold = async () => {
    if (selectedIds.length === 0) return;
    if (onBulkUpdateStatus) {
      await onBulkUpdateStatus(selectedIds, 'sold');
      setSelectedIds([]);
    }
  };

  const handleBulkMarkAsAvailable = async () => {
    if (selectedIds.length === 0) return;
    if (onBulkUpdateStatus) {
      await onBulkUpdateStatus(selectedIds, 'published');
      setSelectedIds([]);
    }
  };

  const handleExecuteBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      if (onBulkDelete) {
        await onBulkDelete(selectedIds);
        setSelectedIds([]);
      }
    } finally {
      setIsBulkDeleting(false);
      setShowConfirmBulkDelete(false);
    }
  };

  return (
    <div className="space-y-4">
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

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-neutral-200 text-xs font-semibold bg-neutral-50 text-neutral-700 focus:outline-hidden focus:border-neutral-900 cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id || c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
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

      {/* Floating Bulk Actions Bar (Checklist Options) */}
      {selectedIds.length > 0 && (
        <div className="bg-neutral-900 text-white p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border border-neutral-800 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold text-white">
              {selectedIds.length} produk dipilih dari checklist
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mark as Available (Appears when any sold items are checked) */}
            {hasSoldSelected && (
              <button
                type="button"
                onClick={handleBulkMarkAsAvailable}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tandai Tersedia Kembali</span>
              </button>
            )}

            {/* Mark as Sold (Appears when any ready items are checked) */}
            {hasAvailableSelected && (
              <button
                type="button"
                onClick={handleBulkMarkAsSold}
                className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-98"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Mark as Sold (Tandai Terjual)</span>
              </button>
            )}

            {/* Delete Selected */}
            <button
              type="button"
              onClick={() => setShowConfirmBulkDelete(true)}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-red-900/60 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 active:scale-98"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete (Hapus)</span>
            </button>

            {/* Cancel Selection */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl text-neutral-400 hover:text-white text-xs font-medium transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-neutral-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                {/* Select All Checkbox */}
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    aria-label="Pilih semua produk"
                    className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                  />
                </th>
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
                  const isSold = prod.status === 'sold';
                  const isChecked = selectedIds.includes(prod.id);

                  return (
                    <tr 
                      key={prod.id} 
                      className={`hover:bg-neutral-50/70 transition-colors ${isChecked ? 'bg-neutral-50/90' : ''}`}
                    >
                      {/* Row Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectOne(prod.id)}
                          aria-label={`Pilih ${prod.name}`}
                          className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 cursor-pointer"
                        />
                      </td>

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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-bold block line-clamp-1 ${isSold ? 'line-through text-neutral-400' : 'text-neutral-900'}`}>
                                {prod.name}
                              </span>
                              {isSold && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-red-600 text-white tracking-wider uppercase shrink-0 shadow-2xs">
                                  TERJUAL
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="capitalize font-medium text-neutral-700">
                          {prod.category}
                        </span>
                      </td>

                      {/* Condition & Minus Points */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200">
                          {prod.condition}
                        </span>
                        {prod.minus_points && prod.minus_points.length > 0 ? (
                          <span className="block text-[10px] text-red-600 font-semibold mt-1">
                            {prod.minus_points.length} minus tercatat
                          </span>
                        ) : (
                          <span className="block text-[10px] text-emerald-600 font-medium mt-1">
                            Mulus tanpa minus
                          </span>
                        )}
                      </td>

                      {/* Price & Original Price */}
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 whitespace-nowrap">
                        <div className={isSold ? 'line-through text-neutral-400' : ''}>
                          {formatIDR(prod.price)}
                        </div>
                        {prod.original_price && prod.original_price > prod.price && (
                          <div className="text-[10px] text-neutral-400 line-through font-normal">
                            Baru: {formatIDR(prod.original_price)}
                          </div>
                        )}
                      </td>

                      {/* Simple Status Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isSold ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (onUpdateStatus) {
                                onUpdateStatus(prod.id, 'published');
                              } else {
                                onToggleStatus(prod.id);
                              }
                            }}
                            className="group/status inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-100 text-red-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-red-300 transition-all cursor-pointer shadow-2xs"
                            title="Klik untuk mengubah produk ini menjadi Tersedia Kembali"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 group-hover/status:bg-emerald-600 transition-colors"></span>
                            <span className="group-hover/status:hidden">Terjual (Sold)</span>
                            <span className="hidden group-hover/status:inline font-bold">Ubah: Tersedia</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            Tersedia
                          </span>
                        )}
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
                          <span>Shopee</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => onEdit(prod)}
                            className="p-1.5 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                            title="Edit Produk"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => onDeleteRequest(prod)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Hapus Produk"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-neutral-400">
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
          <span className="text-[11px]">
            Gunakan checklist di samping produk untuk <strong>Mark as Sold</strong> atau <strong>Delete</strong> massal.
          </span>
        </div>
      </div>

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmBulkDelete}
        title="Hapus Produk Terpilih?"
        message={`Apakah Anda yakin ingin menghapus ${selectedIds.length} produk yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel={isBulkDeleting ? 'Menghapus...' : `Ya, Hapus ${selectedIds.length} Produk`}
        onConfirm={handleExecuteBulkDelete}
        onCancel={() => setShowConfirmBulkDelete(false)}
      />
    </div>
  );
};
