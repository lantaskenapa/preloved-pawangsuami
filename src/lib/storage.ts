import { Category, Product, StoreSettings } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SETTINGS } from './seedData';
import { getSupabaseClient } from './supabaseClient';
import { slugify } from './formatters';

const STORAGE_KEYS = {
  PRODUCTS: 'psp_products_v1',
  CATEGORIES: 'psp_categories_v1',
  SETTINGS: 'psp_settings_v1',
  AUTH: 'psp_admin_session_v1',
};

// Dispatch change event to notify listening React components
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('psp_data_updated'));
  }
}

// Initialize LocalStorage with seed data if empty
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  }
}

// ---------------- PRODUCTS ----------------

export async function getProducts(includeDrafts = false): Promise<Product[]> {
  initializeStorage();
  
  // Try Supabase first if available
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!includeDrafts) {
        query = query.eq('status', 'published');
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as Product[];
      }
    } catch (e) {
      console.warn('Falling back to local storage products:', e);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const list: Product[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
    if (includeDrafts) {
      return list;
    }
    return list.filter(item => item.status === 'published');
  } catch (err) {
    console.error('Error reading products:', err);
    return INITIAL_PRODUCTS.filter(p => includeDrafts || p.status === 'published');
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const all = await getProducts(true);
  return all.find(p => p.id === id) || null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getProducts(true);
  return all.find(p => p.slug === slug) || null;
}

export async function saveProduct(productInput: Partial<Product> & { name: string; price: number; category: string }): Promise<Product> {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];

  const now = new Date().toISOString();
  let savedProduct: Product;

  if (productInput.id) {
    // Edit
    const index = currentList.findIndex(p => p.id === productInput.id);
    if (index === -1) throw new Error('Product not found');
    
    savedProduct = {
      ...currentList[index],
      ...productInput,
      slug: productInput.slug || slugify(productInput.name),
      updated_at: now,
    } as Product;
    currentList[index] = savedProduct;
  } else {
    // New
    const newId = 'prod-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    savedProduct = {
      id: newId,
      name: productInput.name,
      slug: productInput.slug || slugify(productInput.name),
      price: productInput.price || 0,
      category: productInput.category || 'others',
      condition: productInput.condition || 'Sangat Baik (90-95%)',
      description: productInput.description || '',
      story: productInput.story || '',
      completeness: productInput.completeness || [],
      images: productInput.images && productInput.images.length > 0 
        ? productInput.images 
        : ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'],
      shopee_url: productInput.shopee_url || 'https://shopee.co.id',
      status: productInput.status || 'published',
      is_featured: !!productInput.is_featured,
      weight_grams: productInput.weight_grams || 500,
      created_at: now,
      updated_at: now,
    };
    currentList.unshift(savedProduct);
  }

  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(currentList));

  // Sync with Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('products').upsert(savedProduct);
    } catch (e) {
      console.warn('Could not sync product to Supabase:', e);
    }
  }

  notifyChange();
  return savedProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  const filtered = currentList.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(filtered));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete error:', e);
    }
  }

  notifyChange();
  return true;
}

export async function toggleProductStatus(id: string): Promise<Product> {
  const product = await getProductById(id);
  if (!product) throw new Error('Product not found');
  const nextStatus = product.status === 'published' ? 'draft' : 'published';
  return saveProduct({ ...product, status: nextStatus });
}

// ---------------- CATEGORIES ----------------

export async function getCategories(): Promise<Category[]> {
  initializeStorage();
  
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
      if (!error && data && data.length > 0) {
        return data as Category[];
      }
    } catch (e) {
      console.warn('Fallback local categories:', e);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return raw ? JSON.parse(raw) : INITIAL_CATEGORIES;
  } catch {
    return INITIAL_CATEGORIES;
  }
}

export async function saveCategory(categoryInput: Partial<Category> & { name: string }): Promise<Category> {
  initializeStorage();
  const current = await getCategories();
  let updatedCategory: Category;

  if (categoryInput.id) {
    const idx = current.findIndex(c => c.id === categoryInput.id);
    if (idx === -1) throw new Error('Category not found');
    updatedCategory = {
      ...current[idx],
      ...categoryInput,
      slug: categoryInput.slug || slugify(categoryInput.name),
    };
    current[idx] = updatedCategory;
  } else {
    const newId = 'cat-' + slugify(categoryInput.name);
    updatedCategory = {
      id: newId,
      name: categoryInput.name,
      slug: categoryInput.slug || slugify(categoryInput.name),
      icon: categoryInput.icon || 'Tag',
      description: categoryInput.description || '',
      display_order: (current.length + 1),
    };
    current.push(updatedCategory);
  }

  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(current));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('categories').upsert(updatedCategory);
    } catch (e) {
      console.warn('Supabase category upsert error:', e);
    }
  }

  notifyChange();
  return updatedCategory;
}

export async function deleteCategory(id: string): Promise<boolean> {
  initializeStorage();
  const current = await getCategories();
  const filtered = current.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('categories').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase category delete error:', e);
    }
  }

  notifyChange();
  return true;
}

// ---------------- STORE SETTINGS ----------------

export async function getStoreSettings(): Promise<StoreSettings> {
  initializeStorage();
  
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('store_settings').select('*').eq('id', 'primary').single();
      if (!error && data) {
        return data as StoreSettings;
      }
    } catch (e) {
      console.warn('Supabase settings fallback:', e);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : INITIAL_SETTINGS;
  } catch {
    return INITIAL_SETTINGS;
  }
}

export async function saveStoreSettings(settingsInput: Partial<StoreSettings>): Promise<StoreSettings> {
  initializeStorage();
  const current = await getStoreSettings();
  const updated: StoreSettings = {
    ...current,
    ...settingsInput,
    updated_at: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));

  // If user provided Supabase keys in settings, save them
  if (settingsInput.supabase_url !== undefined) {
    localStorage.setItem('psp_supabase_url', settingsInput.supabase_url || '');
  }
  if (settingsInput.supabase_anon_key !== undefined) {
    localStorage.setItem('psp_supabase_anon_key', settingsInput.supabase_anon_key || '');
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('store_settings').upsert({
        ...updated,
        id: 'primary',
      });
    } catch (e) {
      console.warn('Supabase store settings error:', e);
    }
  }

  notifyChange();
  return updated;
}

// ---------------- RESET & BACKUP ----------------

export function resetToDefaults() {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  notifyChange();
}

export function exportData(): string {
  initializeStorage();
  return JSON.stringify({
    products: JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]'),
    categories: JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) || '[]'),
    settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}'),
    exported_at: new Date().toISOString(),
    version: '1.0',
  }, null, 2);
}

export function importData(jsonString: string): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.products && Array.isArray(parsed.products)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(parsed.products));
    }
    if (parsed.categories && Array.isArray(parsed.categories)) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(parsed.categories));
    }
    if (parsed.settings && typeof parsed.settings === 'object') {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed.settings));
    }
    notifyChange();
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}
