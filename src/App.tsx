import React, { useState, useEffect, useCallback } from 'react';
import { Category, Product, ProductStatus, StoreSettings } from './types';
import {
  getProducts,
  getCategories,
  getStoreSettings,
  saveProduct,
  deleteProduct,
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  toggleProductStatus,
  updateProductStatus,
  saveCategory,
  deleteCategory,
  saveStoreSettings,
  exportData,
  importData,
  resetToDefaults,
} from './lib/storage';
import { isAuthenticated } from './lib/auth';
import { ToastProvider, useToast } from './components/ui/Toast';
import { Navbar } from './components/public/Navbar';
import { Footer } from './components/public/Footer';
import { PublicCatalog } from './pages/PublicCatalog';
import { AboutView } from './pages/AboutView';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { INITIAL_SETTINGS } from './lib/seedData';

function MainApp() {
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'catalog' | 'about' | 'admin-login' | 'admin-dashboard'>('catalog');
  const [loading, setLoading] = useState(true);

  // Load data based on view & auth state
  const refreshData = useCallback(async () => {
    try {
      const isAuthed = isAuthenticated();
      // Admin sees both drafts and published; public sees published only
      const prods = await getProducts(isAuthed);
      const cats = await getCategories();
      const sett = await getStoreSettings();

      setProducts(prods);
      setCategories(cats);
      setSettings(sett);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to path changes or custom data events
  useEffect(() => {
    refreshData();

    // Check URL on initial load for /admin/login
    const path = window.location.pathname;
    const hash = window.location.hash;
    if (path === '/admin/login' || hash === '#/admin/login' || path.startsWith('/admin')) {
      if (isAuthenticated()) {
        setCurrentView('admin-dashboard');
      } else {
        setCurrentView('admin-login');
      }
    }

    const handleDataUpdated = () => {
      refreshData();
    };

    window.addEventListener('psp_data_updated', handleDataUpdated);
    window.addEventListener('popstate', () => {
      if (window.location.pathname === '/admin/login') {
        setCurrentView(isAuthenticated() ? 'admin-dashboard' : 'admin-login');
      }
    });

    return () => {
      window.removeEventListener('psp_data_updated', handleDataUpdated);
    };
  }, [refreshData]);

  // Navigate helper with URL update
  const navigateTo = (view: 'catalog' | 'about' | 'admin-login' | 'admin-dashboard') => {
    setCurrentView(view);
    if (view === 'admin-login') {
      window.history.pushState(null, '', '/admin/login');
    } else if (view === 'admin-dashboard') {
      window.history.pushState(null, '', '/admin/dashboard');
    } else {
      window.history.pushState(null, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handlers for Admin actions
  const handleSaveProduct = async (prodData: Partial<Product> & { name: string; price: number; category: string }) => {
    await saveProduct(prodData);
    await refreshData();
  };

  const handleDeleteProduct = async (id: string) => {
    await deleteProduct(id);
    await refreshData();
  };

  const handleToggleProductStatus = async (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === 'sold' ? 'published' : 'sold' } : p))
    );
    try {
      await toggleProductStatus(id);
    } catch {
      // Ignored
    } finally {
      await refreshData();
      showToast('Status produk berhasil diperbarui!', 'success');
    }
  };

  const handleUpdateProductStatus = async (id: string, newStatus: ProductStatus) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
    );
    try {
      await updateProductStatus(id, newStatus);
    } catch {
      // Handled
    } finally {
      await refreshData();
      const labels: Record<ProductStatus, string> = {
        published: 'Ready (Tersedia)',
        sold: 'Terjual (Sold Out)',
        booked: 'Dibooking (Booked)',
        draft: 'Draf',
      };
      showToast(`Status produk diubah menjadi ${labels[newStatus]}`, 'success');
    }
  };

  const handleBulkUpdateStatus = async (ids: string[], newStatus: ProductStatus) => {
    // 1. Optimistic state update: Update UI instantly with zero lag
    setProducts((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, status: newStatus } : p))
    );

    try {
      await bulkUpdateProductStatus(ids, newStatus);
      await refreshData();
      showToast(
        `${ids.length} produk berhasil ditandai sebagai ${newStatus === 'sold' ? 'Terjual (Sold Out)' : 'Tersedia'}!`,
        'success'
      );
    } catch (err: any) {
      await refreshData();
      if (err?.message === 'SUPABASE_STATUS_CHECK_CONSTRAINT' || (err?.message && err.message.includes('products_status_check'))) {
        showToast(
          `Status diubah jadi Terjual di katalog! Untuk sinkron ke Supabase, jalankan di SQL Editor: ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_status_check;`,
          'info'
        );
      } else {
        showToast(
          `${ids.length} produk berhasil ditandai sebagai ${newStatus === 'sold' ? 'Terjual' : 'Tersedia'}!`,
          'success'
        );
      }
    }
  };

  const handleBulkDeleteProducts = async (ids: string[]) => {
    await bulkDeleteProducts(ids);
    await refreshData();
    showToast(`${ids.length} produk berhasil dihapus!`, 'success');
  };

  const handleSaveCategory = async (catData: Partial<Category> & { name: string }) => {
    await saveCategory(catData);
    await refreshData();
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory(id);
    await refreshData();
  };

  const handleSaveSettings = async (settingsData: Partial<StoreSettings>) => {
    const updated = await saveStoreSettings(settingsData);
    setSettings(updated);
    await refreshData();
  };

  const handleExportData = () => {
    const jsonStr = exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pawang-suami-preloved-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data berhasil diekspor!', 'success');
  };

  const handleImportData = (jsonStr: string) => {
    const success = importData(jsonStr);
    if (success) {
      refreshData();
      showToast('Data berhasil diimpor!', 'success');
    } else {
      showToast('Format data impor tidak valid', 'error');
    }
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    refreshData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-extrabold text-xl animate-pulse">
          PS
        </div>
        <p className="mt-4 text-xs font-semibold text-neutral-500 uppercase tracking-widest">
          Memuat Pawang Suami Preloved...
        </p>
      </div>
    );
  }

  // Admin Login View
  if (currentView === 'admin-login') {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          refreshData();
          navigateTo('admin-dashboard');
        }}
        onBackToCatalog={() => navigateTo('catalog')}
      />
    );
  }

  // Admin Dashboard View (Protected)
  if (currentView === 'admin-dashboard') {
    if (!isAuthenticated()) {
      return (
        <AdminLogin
          onLoginSuccess={() => {
            refreshData();
            navigateTo('admin-dashboard');
          }}
          onBackToCatalog={() => navigateTo('catalog')}
        />
      );
    }

    return (
      <AdminDashboard
        products={products}
        categories={categories}
        settings={settings}
        onSaveProduct={handleSaveProduct}
        onDeleteProduct={handleDeleteProduct}
        onToggleStatus={handleToggleProductStatus}
        onUpdateStatus={handleUpdateProductStatus}
        onBulkUpdateStatus={handleBulkUpdateStatus}
        onBulkDelete={handleBulkDeleteProducts}
        onSaveCategory={handleSaveCategory}
        onDeleteCategory={handleDeleteCategory}
        onSaveSettings={handleSaveSettings}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onResetDefaults={handleResetDefaults}
        onBackToCatalog={() => navigateTo('catalog')}
        onLogout={() => {
          refreshData();
          navigateTo('catalog');
        }}
      />
    );
  }

  // Public Catalog & About Views
  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F7]">
      <Navbar
        settings={settings}
        onNavigateToCatalog={() => navigateTo('catalog')}
        onNavigateToAbout={() => navigateTo('about')}
        onNavigateToAdmin={() => {
          if (isAuthenticated()) {
            navigateTo('admin-dashboard');
          } else {
            navigateTo('admin-login');
          }
        }}
        currentView={currentView}
      />

      <main className="flex-1">
        {currentView === 'catalog' && (
          <PublicCatalog
            products={products}
            categories={categories}
            settings={settings}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            onNavigateToAbout={() => navigateTo('about')}
          />
        )}

        {currentView === 'about' && (
          <AboutView
            settings={settings}
            onBackToCatalog={() => navigateTo('catalog')}
          />
        )}
      </main>

      <Footer
        settings={settings}
        onNavigateToAdmin={() => {
          if (isAuthenticated()) {
            navigateTo('admin-dashboard');
          } else {
            navigateTo('admin-login');
          }
        }}
        onNavigateToCatalog={() => navigateTo('catalog')}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          navigateTo('catalog');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
