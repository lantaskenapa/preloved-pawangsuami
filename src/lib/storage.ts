import { Category, Product, ProductCondition, ProductStatus, StoreSettings } from '../types';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS, INITIAL_SETTINGS } from './seedData';
import { getSupabaseClient } from './supabaseClient';
import { slugify } from './formatters';
import { compressDataUrl } from './imageCompressor';

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

// Generate valid UUID compatible with Supabase UUID and TEXT primary keys
export function generateProductId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Helper to safely write to localStorage without throwing QuotaExceededError
export function safeSaveProductsToLocalStorage(products: Product[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return true;
  } catch (err: any) {
    console.warn('LocalStorage quota warning, creating lightweight storage cache:', err);
    try {
      // If quota exceeded, trim secondary high-res base64 images from localStorage copy
      const lightweight = products.map((p) => ({
        ...p,
        images: p.images.map((img, idx) => {
          if (idx === 0) return img; // keep primary cover
          if (img.startsWith('data:') && img.length > 50000) {
            return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80';
          }
          return img;
        }),
      }));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(lightweight));
      return true;
    } catch (e2) {
      console.warn('LocalStorage completely full, proceeding without local caching:', e2);
      return false;
    }
  }
}

// Helper to normalize condition strings to the new simplified types
export function normalizeCondition(rawCond?: string): ProductCondition {
  if (!rawCond) return 'Like New';
  const c = rawCond.trim();
  if (c === 'Like New' || c.startsWith('Like New')) {
    return 'Like New';
  }
  if (c.includes('Sangat Baik') || c.includes('Cukup Baik') || c.includes('Baik')) {
    return 'Cukup Baik';
  }
  if (c.includes('Layak') || c.includes('Minus')) {
    return 'Masih Layak';
  }
  return 'Cukup Baik';
}

// Helper to ensure slug is unique across products
function generateUniqueSlug(baseName: string, existingList: Product[], currentId?: string): string {
  const baseSlug = slugify(baseName) || 'produk';
  let candidate = baseSlug;
  let counter = 1;

  while (existingList.some((p) => p.slug === candidate && p.id !== currentId)) {
    counter++;
    candidate = `${baseSlug}-${counter}`;
  }
  return candidate;
}

// Initialize LocalStorage with seed data if empty
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.CATEGORIES)) {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
  }
  
  const existingProdsRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  if (!existingProdsRaw) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
  } else {
    // If existing products lack minus_points or original_price, merge from seed
    try {
      const parsed: Product[] = JSON.parse(existingProdsRaw);
      let needsUpdate = false;
      const updated = parsed.map((p) => {
        const seedMatch = INITIAL_PRODUCTS.find((sp) => sp.id === p.id);
        if (seedMatch) {
          if (!p.minus_points || p.minus_points.length === 0) {
            p.minus_points = seedMatch.minus_points;
            needsUpdate = true;
          }
          if (!p.original_price && seedMatch.original_price) {
            p.original_price = seedMatch.original_price;
            needsUpdate = true;
          }
        }
        const normalized = normalizeCondition(p.condition);
        if (p.condition !== normalized) {
          p.condition = normalized;
          needsUpdate = true;
        }
        return p;
      });
      if (needsUpdate) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
      }
    } catch {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
  }

  if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
  }
}

// ---------------- PRODUCTS ----------------

export async function getProducts(includeDrafts = false): Promise<Product[]> {
  initializeStorage();

  // Read local products first
  let localList: Product[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    localList = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
  } catch {
    localList = INITIAL_PRODUCTS;
  }
  
  // Try Supabase first if available
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!includeDrafts) {
        query = query.neq('status', 'draft');
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        let dbProducts = data as Product[];
        safeSaveProductsToLocalStorage(dbProducts);
        return dbProducts;
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
    // Public view shows published, sold, and booked items (only drafts are hidden)
    return list.filter(item => item.status !== 'draft');
  } catch (err) {
    console.error('Error reading products:', err);
    return INITIAL_PRODUCTS.filter(p => includeDrafts || p.status !== 'draft');
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

  // Ensure any base64 images passed are compressed safely
  let processedImages: string[] = [];
  if (productInput.images && productInput.images.length > 0) {
    processedImages = await Promise.all(
      productInput.images.map(async (img) => {
        if (img.startsWith('data:image/') && img.length > 150000) {
          try {
            return await compressDataUrl(img, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
          } catch {
            return img;
          }
        }
        return img;
      })
    );
  } else {
    processedImages = ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'];
  }

  if (productInput.id) {
    // Edit existing product
    const index = currentList.findIndex((p) => p.id === productInput.id);
    if (index === -1) throw new Error('Produk tidak ditemukan');

    const cleanSlug = productInput.slug || generateUniqueSlug(productInput.name, currentList, productInput.id);
    const rawOriginals = productInput.original_images && productInput.original_images.length > 0
      ? productInput.original_images
      : (currentList[index]?.original_images || processedImages);

    savedProduct = {
      ...currentList[index],
      ...productInput,
      slug: cleanSlug,
      images: processedImages,
      original_images: rawOriginals,
      updated_at: now,
    } as Product;
    currentList[index] = savedProduct;
  } else {
    // Create new product with valid UUID
    const newId = generateProductId();
    const cleanSlug = generateUniqueSlug(productInput.name, currentList);

    savedProduct = {
      id: newId,
      name: productInput.name.trim(),
      slug: cleanSlug,
      price: Number(productInput.price) || 0,
      original_price: productInput.original_price ? Number(productInput.original_price) : undefined,
      category: productInput.category || 'others',
      condition: normalizeCondition(productInput.condition),
      description: productInput.description || '',
      story: productInput.story || '',
      completeness: productInput.completeness || [],
      minus_points: productInput.minus_points || [],
      images: processedImages,
      original_images: productInput.original_images && productInput.original_images.length > 0 ? productInput.original_images : processedImages,
      shopee_url: productInput.shopee_url || 'https://shopee.co.id',
      status: productInput.status || 'published',
      is_featured: !!productInput.is_featured,
      weight_grams: productInput.weight_grams ? Number(productInput.weight_grams) : 500,
      created_at: now,
      updated_at: now,
    };
    currentList.unshift(savedProduct);
  }

  // Safe local storage persistence (never throws QuotaExceededError)
  safeSaveProductsToLocalStorage(currentList);

  // Sync with Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const supabasePayload = {
        id: savedProduct.id,
        name: savedProduct.name,
        slug: savedProduct.slug,
        price: Math.round(Number(savedProduct.price)),
        original_price: savedProduct.original_price ? Math.round(Number(savedProduct.original_price)) : null,
        category: savedProduct.category,
        condition: savedProduct.condition,
        description: savedProduct.description || '',
        story: savedProduct.story || null,
        completeness: savedProduct.completeness || [],
        minus_points: savedProduct.minus_points || [],
        images: savedProduct.images || [],
        original_images: savedProduct.original_images || savedProduct.images || [],
        shopee_url: savedProduct.shopee_url,
        status: savedProduct.status || 'published',
        is_featured: !!savedProduct.is_featured,
        weight_grams: savedProduct.weight_grams ? Math.round(Number(savedProduct.weight_grams)) : 500,
        created_at: savedProduct.created_at,
        updated_at: savedProduct.updated_at,
      };

      // Try upserting, automatically handling missing optional columns in Supabase schema cache
      let currentPayload: any = { ...supabasePayload };
      let upsertError: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase.from('products').upsert(currentPayload);
        if (!error) {
          upsertError = null;
          break;
        }

        upsertError = error;
        // Detect missing column error from PostgREST schema cache
        const match = error.message && error.message.match(/Could not find the '([a-zA-Z0-9_]+)' column/);
        if (match && match[1] && match[1] in currentPayload) {
          console.warn(`Column '${match[1]}' does not exist in Supabase products table. Retrying upsert without it...`);
          delete currentPayload[match[1]];
        } else {
          break;
        }
      }

      if (upsertError) {
        console.error('Supabase product upsert error:', upsertError);
        throw new Error(`Supabase: ${upsertError.message} (${upsertError.hint || upsertError.details || 'Cek tabel products'})`);
      }
    } catch (e: any) {
      console.error('Could not sync product to Supabase:', e);
      throw e;
    }
  }

  notifyChange();
  return savedProduct;
}

// Function to bulk sync all local products to Supabase
export async function syncAllProductsToSupabase(): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, count: 0, error: 'Supabase belum terhubung. Harap isi URL dan Anon Key terlebih dahulu.' };
  }

  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];

  try {
    let formattedPayloads = currentList.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug || slugify(p.name),
      price: Math.round(Number(p.price)),
      original_price: p.original_price ? Math.round(Number(p.original_price)) : null,
      category: p.category,
      condition: p.condition,
      description: p.description || '',
      story: p.story || null,
      completeness: p.completeness || [],
      minus_points: p.minus_points || [],
      images: p.images || [],
      shopee_url: p.shopee_url,
      status: p.status || 'published',
      is_featured: !!p.is_featured,
      weight_grams: p.weight_grams ? Math.round(Number(p.weight_grams)) : 500,
      created_at: p.created_at || new Date().toISOString(),
      updated_at: p.updated_at || new Date().toISOString(),
    }));

    let lastError: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const { error } = await supabase.from('products').upsert(formattedPayloads);
      if (!error) {
        lastError = null;
        break;
      }

      lastError = error;
      const match = error.message && error.message.match(/Could not find the '([a-zA-Z0-9_]+)' column/);
      if (match && match[1]) {
        const missingCol = match[1];
        console.warn(`Column '${missingCol}' missing during bulk sync. Retrying without it...`);
        formattedPayloads = formattedPayloads.map((item) => {
          const copy: any = { ...item };
          delete copy[missingCol];
          return copy;
        });
      } else {
        break;
      }
    }

    if (lastError) {
      return { success: false, count: 0, error: `${lastError.message} (${lastError.hint || lastError.details || ''})` };
    }
    return { success: true, count: formattedPayloads.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message || 'Gagal sinkronisasi data ke Supabase.' };
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  const filtered = currentList.filter(p => p.id !== id);
  safeSaveProductsToLocalStorage(filtered);

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

export async function bulkDeleteProducts(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  const filtered = currentList.filter(p => !ids.includes(p.id));
  safeSaveProductsToLocalStorage(filtered);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('products').delete().in('id', ids);
    } catch (e) {
      console.warn('Supabase bulk delete error:', e);
    }
  }

  notifyChange();
  return true;
}

export async function bulkUpdateProductStatus(ids: string[], newStatus: ProductStatus): Promise<boolean> {
  if (ids.length === 0) return true;
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  const now = new Date().toISOString();

  const updated = currentList.map((p) => {
    if (ids.includes(p.id)) {
      return { ...p, status: newStatus, updated_at: now };
    }
    return p;
  });
  safeSaveProductsToLocalStorage(updated);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('products').update({ status: newStatus, updated_at: now }).in('id', ids);
      if (error) {
        console.warn('Supabase bulk status update error:', error);
        if (error.code === '23514' || (error.message && error.message.includes('products_status_check'))) {
          throw new Error('SUPABASE_STATUS_CHECK_CONSTRAINT');
        }
      }
    } catch (e: any) {
      if (e?.message === 'SUPABASE_STATUS_CHECK_CONSTRAINT' || e?.code === '23514') {
        throw e;
      }
      console.warn('Supabase bulk status update error:', e);
    }
  }

  notifyChange();
  return true;
}

export async function updateProductStatus(id: string, newStatus: ProductStatus): Promise<Product> {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  const now = new Date().toISOString();

  const index = currentList.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error('Produk tidak ditemukan');
  }

  const updatedProduct: Product = {
    ...currentList[index],
    status: newStatus,
    updated_at: now,
  };
  currentList[index] = updatedProduct;
  safeSaveProductsToLocalStorage(currentList);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: now })
        .eq('id', id);
      if (error) {
        console.warn('Supabase status update error:', error);
      }
    } catch (e) {
      console.warn('Supabase status update error:', e);
    }
  }

  notifyChange();
  return updatedProduct;
}

export async function toggleProductStatus(id: string, targetStatus?: ProductStatus): Promise<Product> {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
  const currentList: Product[] = raw ? JSON.parse(raw) : [...INITIAL_PRODUCTS];
  const current = currentList.find((p) => p.id === id);
  if (!current) throw new Error('Produk tidak ditemukan');

  const nextStatus = targetStatus || (current.status === 'sold' ? 'published' : 'sold');
  return updateProductStatus(id, nextStatus);
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

  const supabase = getSupabaseClient(settingsInput.supabase_url, settingsInput.supabase_anon_key);
  if (supabase) {
    try {
      const { error } = await supabase.from('store_settings').upsert({
        ...updated,
        id: 'primary',
      });
      if (error) {
        console.error('Supabase store settings upsert error:', error);
      }
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
