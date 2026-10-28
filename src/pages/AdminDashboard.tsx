import React, { useState } from 'react';
import { Category, Product, StoreSettings } from '../types';
import { formatIDR } from '../lib/formatters';
import { logoutAdmin } from '../lib/auth';
import { AdminProductTable } from '../components/admin/AdminProductTable';
import { ProductFormModal } from '../components/admin/ProductFormModal';
import { CategoryManager } from '../components/admin/CategoryManager';
import { StoreSettingsForm } from '../components/admin/StoreSettingsForm';
import { ConfirmDialog } from '../components/admin/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import {
  Package,
  Layers,
  Settings,
  LogOut,
  ExternalLink,
  Eye,
  EyeOff,
  ShoppingBag,
  DollarSign,
  Plus,
  ShieldCheck,
} from 'lucide-react';

interface AdminDashboardProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  onSaveProduct: (prod: Partial<Product> & { name: string; price: number; category: string }) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onToggleStatus: (id: string) => Promise<void>;
  onUpdateStatus?: (id: string, status: any) => Promise<void>;
  onBulkUpdateStatus?: (ids: string[], status: any) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onSaveCategory: (cat: Partial<Category> & { name: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onSaveSettings: (set: Partial<StoreSettings>) => Promise<void>;
  onExportData: () => void;
  onImportData: (json: string) => void;
  onResetDefaults: () => void;
  onBackToCatalog: () => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  categories,
  settings,
  onSaveProduct,
  onDeleteProduct,
  onToggleStatus,
  onUpdateStatus,
  onBulkUpdateStatus,
  onBulkDelete,
  onSaveCategory,
  onDeleteCategory,
  onSaveSettings,
  onExportData,
  onImportData,
  onResetDefaults,
  onBackToCatalog,
  onLogout,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  // Confirm dialogs
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Computations for KPI cards
  const publishedCount = products.filter((p) => p.status === 'published').length;
  const soldCount = products.filter((p) => p.status === 'sold').length;
  const bookedCount = products.filter((p) => p.status === 'booked').length;
  const draftCount = products.filter((p) => p.status === 'draft').length;
  const soldRevenue = products.filter((p) => p.status === 'sold').reduce((acc, p) => acc + (p.price || 0), 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + (p.price || 0), 0);

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setProductToEdit(prod);
    setIsProductModalOpen(true);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await onDeleteProduct(productToDelete.id);
      showToast(`Produk "${productToDelete.name}" berhasil dihapus`, 'success');
    } catch {
      showToast('Gagal menghapus produk', 'error');
    } finally {
      setProductToDelete(null);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      await onDeleteCategory(categoryToDelete.id);
      showToast(`Kategori "${categoryToDelete.name}" berhasil dihapus`, 'success');
    } catch {
      showToast('Gagal menghapus kategori', 'error');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleConfirmReset = () => {
    onResetDefaults();
    setConfirmResetOpen(false);
    showToast('Seluruh data berhasil dikembalikan ke default demo!', 'info');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      
      {/* Admin Top Navbar */}
      <header className="sticky top-0 z-40 bg-neutral-900 text-white border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Title / Identity */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white text-neutral-900 font-extrabold flex items-center justify-center text-sm">
                PS
              </div>
              <div>
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                  Dashboard Admin
                </span>
                <span className="text-[11px] text-neutral-400 block sm:inline sm:ml-2">
                  {settings.store_name}
                </span>
              </div>
            </div>

            {/* Top Right Quick Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToCatalog}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                <span>Lihat Web Publik</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  logoutAdmin();
                  onLogout();
                  showToast('Anda telah keluar dari dashboard.', 'info');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-semibold transition-colors"
                title="Keluar / Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Stats Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Produk</span>
              <Package className="w-4 h-4 text-neutral-700" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono">
              {products.length}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 flex flex-wrap items-center gap-1">
              <span>{publishedCount} ready</span>
              <span>•</span>
              <span>{soldCount} laku</span>
              <span>•</span>
              <span>{draftCount} draf</span>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Tersedia (Ready)</span>
              <Eye className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
              {publishedCount}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Aktif dijual & siap kirim di Shopee
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Terjual (Sold)</span>
              <ShoppingBag className="w-4 h-4 text-red-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 font-mono">
              {soldCount}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 truncate">
              Laku: <strong>{formatIDR(soldRevenue)}</strong>
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Nilai Inventaris</span>
              <DollarSign className="w-4 h-4 text-neutral-700" />
            </div>
            <div className="text-lg sm:text-xl font-extrabold text-neutral-900 font-mono tracking-tight truncate">
              {formatIDR(totalInventoryValue)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Estimasi total harga seluruh barang
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'products'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Manajemen Produk ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'categories'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Kategori ({categories.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'settings'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-white text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan Toko & DB</span>
          </button>
        </div>

        {/* Tab 1: Products */}
        {activeTab === 'products' && (
          <AdminProductTable
            products={products}
            categories={categories}
            onAddNew={handleOpenNewProduct}
            onEdit={handleOpenEditProduct}
            onDeleteRequest={(prod) => setProductToDelete(prod)}
            onToggleStatus={onToggleStatus}
            onUpdateStatus={onUpdateStatus}
            onBulkUpdateStatus={onBulkUpdateStatus}
            onBulkDelete={onBulkDelete}
          />
        )}

        {/* Tab 2: Categories */}
        {activeTab === 'categories' && (
          <CategoryManager
            categories={categories}
            products={products}
            onSaveCategory={onSaveCategory}
            onDeleteCategoryRequest={(cat) => setCategoryToDelete(cat)}
          />
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <StoreSettingsForm
            settings={settings}
            onSave={onSaveSettings}
            onExport={onExportData}
            onImport={onImportData}
            onResetDefaults={() => setConfirmResetOpen(true)}
          />
        )}

      </main>

      {/* Product Form Modal (Add / Edit) */}
      <ProductFormModal
        isOpen={isProductModalOpen}
        productToEdit={productToEdit}
        categories={categories}
        existingProducts={products}
        onClose={() => setIsProductModalOpen(false)}
        onSave={onSaveProduct}
      />

      {/* Confirm Delete Product Dialog */}
      <ConfirmDialog
        isOpen={!!productToDelete}
        title="Hapus Produk Preloved?"
        message={`Apakah Anda yakin ingin menghapus produk "${productToDelete?.name}"? Tindakan ini akan menghapus data produk secara permanen.`}
        confirmLabel="Ya, Hapus Produk"
        onConfirm={handleConfirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />

      {/* Confirm Delete Category Dialog */}
      <ConfirmDialog
        isOpen={!!categoryToDelete}
        title="Hapus Kategori?"
        message={`Apakah Anda yakin ingin menghapus kategori "${categoryToDelete?.name}"? Pastikan tidak ada produk yang masih menggunakan kategori ini.`}
        confirmLabel="Ya, Hapus Kategori"
        onConfirm={handleConfirmDeleteCategory}
        onCancel={() => setCategoryToDelete(null)}
      />

      {/* Confirm Reset Data Dialog */}
      <ConfirmDialog
        isOpen={confirmResetOpen}
        title="Reset ke Data Awal Demo?"
        message="Tindakan ini akan mengembalikan seluruh produk, kategori, dan pengaturan toko ke data demo default Pawang Suami Preloved."
        confirmLabel="Ya, Reset Data"
        onConfirm={handleConfirmReset}
        onCancel={() => setConfirmResetOpen(false)}
      />

    </div>
  );
};
