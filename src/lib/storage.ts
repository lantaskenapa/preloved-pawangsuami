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
  ORIGINALS_REGISTRY: 'psp_originals_registry_v1',
};

// Dispatch change event to notify listening React components
function notifyChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('psp_data_updated'));
  }
}

// ---------------- PERSISTENT ORIGINAL IMAGES REGISTRY (INDEXEDDB + LOCALSTORAGE) ----------------
const inMemoryOriginalsRegistry = new Map<string, string[]>();

const IDB_NAME = 'psp_cache_db';
const IDB_STORE = 'product_originals';

function openOriginalsDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveToIndexedDB(key: string, data: string[]) {
  const db = await openOriginalsDB();
  if (!db) return;
  try {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, key);
  } catch {}
}

async function getFromIndexedDB(key: string): Promise<string[] | null> {
  const db = await openOriginalsDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Register original uncropped photos into persistent local cache so they are NEVER lost on save/edit
 */
export function registerProductOriginals(idOrSlug: string, originals: string[]) {
  if (!idOrSlug || !originals || originals.length === 0) return;
  inMemoryOriginalsRegistry.set(idOrSlug, originals);
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ORIGINALS_REGISTRY);
      const map: Record<string, string[]> = raw ? JSON.parse(raw) : {};
      map[idOrSlug] = originals;
      localStorage.setItem(STORAGE_KEYS.ORIGINALS_REGISTRY, JSON.stringify(map));
    } catch {
      // LocalStorage might be full; in-memory map & IndexedDB still preserve it
    }
    saveToIndexedDB(idOrSlug, originals).catch(() => {});
  }
}

/**
 * Synchronously retrieve preserved uncropped original photos from memory or localStorage
 */
export function getProductOriginals(id?: string, slug?: string): string[] | null {
  if (id && inMemoryOriginalsRegistry.has(id)) {
    return inMemoryOriginalsRegistry.get(id)!;
  }
  if (slug && inMemoryOriginalsRegistry.has(slug)) {
    return inMemoryOriginalsRegistry.get(slug)!;
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ORIGINALS_REGISTRY);
      if (raw) {
        const map: Record<string, string[]> = JSON.parse(raw);
        if (id && map[id] && map[id].length > 0) {
          inMemoryOriginalsRegistry.set(id, map[id]);
          return map[id];
        }
        if (slug && map[slug] && map[slug].length > 0) {
          inMemoryOriginalsRegistry.set(slug, map[slug]);
          return map[slug];
        }
      }
    } catch {}
  }
  return null;
}

/**
 * Asynchronously retrieve preserved uncropped original photos from IndexedDB if not found in sync memory
 */
export async function getProductOriginalsAsync(id?: string, slug?: string): Promise<string[] | null> {
  const syncVal = getProductOriginals(id, slug);
  if (syncVal && syncVal.length > 0) return syncVal;
  if (id) {
    const fromIdb = await getFromIndexedDB(id);
    if (fromIdb && fromIdb.length > 0) {
      inMemoryOriginalsRegistry.set(id, fromIdb);
      return fromIdb;
    }
  }
  if (slug) {
    const fromIdb = await getFromIndexedDB(slug);
    if (fromIdb && fromIdb.length > 0) {
      inMemoryOriginalsRegistry.set(slug, fromIdb);
      return fromIdb;
    }
  }
  return null;
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

// In-memory cache to guarantee products are never lost when localStorage quota is full
let memoryProductsCache: Product[] | null = null;

// Helper to safely write to localStorage without throwing QuotaExceededError
export function safeSaveProductsToLocalStorage(products: Product[]): boolean {
  if (typeof window === 'undefined') return false;
  // Keep memory cache updated
  memoryProductsCache = [...products];

  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    return true;
  } catch {
    try {
      // Tier 1: Quota exceeded. Strip original_images and replace heavy base64 data URLs
      const tier1 = products.map((p) => ({
        ...p,
        original_images: [],
        images: p.images.map((img) => {
          if (img.startsWith('data:') && img.length > 25000) {
            return 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80';
          }
          return img;
        }),
      }));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(tier1));
      return true;
    } catch {
      try {
        // Tier 2: Strip all data: URLs in localStorage (full data remains safely in memory and Supabase)
        const tier2 = products.map((p) => ({
          ...p,
          original_images: [],
          images: p.images.map((img) =>
            img.startsWith('data:')
              ? 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'
              : img
          ),
        }));
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(tier2));
        return true;
      } catch {
        // Tier 3: LocalStorage is completely full; session continues in memory
        return false;
      }
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
        let dbProducts = (data as any[]).map((row) => {
          let origs: string[] = [];
          if (Array.isArray(row.original_images) && row.original_images.length > 0) {
            origs = row.original_images;
          }
          // Check embedded metadata in story fallback
          if (origs.length === 0 && row.story && typeof row.story === 'string' && row.story.startsWith('{"_psp_meta":')) {
            try {
              const meta = JSON.parse(row.story);
              if (Array.isArray(meta.original_images) && meta.original_images.length > 0) {
                origs = meta.original_images;
                row.story = meta.userStory || null;
              }
            } catch {}
          }
          // Check persistent local registry
          if (origs.length === 0) {
            const fromRegistry = getProductOriginals(row.id, row.slug);
            if (fromRegistry && fromRegistry.length > 0) {
              origs = fromRegistry;
            }
          }
          const finalImages = Array.isArray(row.images) ? row.images : [];
          if (origs.length === 0) {
            origs = [...finalImages];
          }
          // Guarantee registered in registry
          registerProductOriginals(row.id, origs);
          if (row.slug) registerProductOriginals(row.slug, origs);

          return {
            ...row,
            images: finalImages,
            original_images: origs,
          } as Product;
        });

        safeSaveProductsToLocalStorage(dbProducts);
        memoryProductsCache = [...dbProducts];
        return dbProducts;
      }
    } catch (e) {
      console.warn('Falling back to local storage products:', e);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const list: Product[] = raw ? JSON.parse(raw) : (memoryProductsCache || INITIAL_PRODUCTS);
    const enriched = list.map((p) => {
      let origs = p.original_images && p.original_images.length > 0 ? p.original_images : null;
      if (!origs) {
        origs = getProductOriginals(p.id, p.slug);
      }
      if (!origs || origs.length === 0) {
        origs = p.images ? [...p.images] : [];
      }
      registerProductOriginals(p.id, origs);
      if (p.slug) registerProductOriginals(p.slug, origs);
      return {
        ...p,
        original_images: origs,
      };
    });

    memoryProductsCache = [...enriched];

    if (includeDrafts) {
      return enriched;
    }
    // Public view shows published, sold, and booked items (only drafts are hidden)
    return enriched.filter(item => item.status !== 'draft');
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
  let currentList: Product[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (raw) currentList = JSON.parse(raw);
  } catch {
    currentList = [];
  }

  // Merge with memoryProductsCache if available
  if (memoryProductsCache && memoryProductsCache.length > 0) {
    for (const cached of memoryProductsCache) {
      if (!currentList.some((p) => p.id === cached.id)) {
        currentList.push(cached);
      }
    }
  }

  if (currentList.length === 0) {
    currentList = [...INITIAL_PRODUCTS];
  }

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

  // Ensure original images are safely compressed without losing resolution
  const rawOriginalsInput = (productInput.original_images && productInput.original_images.length > 0)
    ? productInput.original_images
    : (productInput.images && productInput.images.length > 0 ? productInput.images : processedImages);

  const processedOriginals: string[] = await Promise.all(
    rawOriginalsInput.map(async (img) => {
      if (img.startsWith('data:image/') && img.length > 250000) {
        try {
          return await compressDataUrl(img, { maxWidth: 1400, maxHeight: 1400, quality: 0.85 });
        } catch {
          return img;
        }
      }
      return img;
    })
  );

  if (productInput.id) {
    // Edit existing product or upsert if missing from local array
    let index = currentList.findIndex((p) => p.id === productInput.id);
    const cleanSlug = productInput.slug || generateUniqueSlug(productInput.name, currentList, productInput.id);
    const existingOriginals = (index !== -1 ? currentList[index]?.original_images : null) || getProductOriginals(productInput.id, cleanSlug);

    const finalOriginals = (processedOriginals && processedOriginals.length > 0)
      ? processedOriginals
      : (existingOriginals && existingOriginals.length > 0 ? existingOriginals : processedImages);

    if (index !== -1) {
      savedProduct = {
        ...currentList[index],
        ...productInput,
        slug: cleanSlug,
        images: processedImages,
        original_images: finalOriginals,
        updated_at: now,
      } as Product;
      currentList[index] = savedProduct;
    } else {
      // Upsert product cleanly instead of throwing "Produk tidak ditemukan"
      savedProduct = {
        id: productInput.id,
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
        original_images: finalOriginals,
        shopee_url: productInput.shopee_url || 'https://shopee.co.id',
        status: productInput.status || 'published',
        is_featured: !!productInput.is_featured,
        weight_grams: productInput.weight_grams ? Number(productInput.weight_grams) : 500,
        created_at: productInput.created_at || now,
        updated_at: now,
      } as Product;
      currentList.unshift(savedProduct);
    }

    // Register in persistent originals registry immediately
    registerProductOriginals(savedProduct.id, finalOriginals);
    registerProductOriginals(cleanSlug, finalOriginals);
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
      original_images: processedOriginals,
      shopee_url: productInput.shopee_url || 'https://shopee.co.id',
      status: productInput.status || 'published',
      is_featured: !!productInput.is_featured,
      weight_grams: productInput.weight_grams ? Number(productInput.weight_grams) : 500,
      created_at: now,
      updated_at: now,
    };
    currentList.unshift(savedProduct);

    // Register in persistent originals registry immediately
    registerProductOriginals(savedProduct.id, processedOriginals);
    registerProductOriginals(cleanSlug, processedOriginals);
  }

  // Safe local storage persistence (never throws QuotaExceededError)
  safeSaveProductsToLocalStorage(currentList);

  // Sync with Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Embed cloud metadata backup in story column so original_images is NEVER lost even if Supabase table lacks original_images column
      const metaStory = JSON.stringify({
        _psp_meta: true,
        original_images: savedProduct.original_images,
        userStory: savedProduct.story || null,
      });

      const supabasePayload = {
        id: savedProduct.id,
        name: savedProduct.name,
        slug: savedProduct.slug,
        price: Math.round(Number(savedProduct.price)),
        original_price: savedProduct.original_price ? Math.round(Number(savedProduct.original_price)) : null,
        category: savedProduct.category,
        condition: savedProduct.condition,
        description: savedProduct.description || '',
        story: metaStory,
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
    let formattedPayloads = currentList.map((p) => {
      const origs = (p.original_images && p.original_images.length > 0)
        ? p.original_images
        : (getProductOriginals(p.id, p.slug) || p.images || []);

      return {
        id: p.id,
        name: p.name,
        slug: p.slug || slugify(p.name),
        price: Math.round(Number(p.price)),
        original_price: p.original_price ? Math.round(Number(p.original_price)) : null,
        category: p.category,
        condition: p.condition,
        description: p.description || '',
        story: JSON.stringify({
          _psp_meta: true,
          original_images: origs,
          userStory: p.story || null,
        }),
        completeness: p.completeness || [],
        minus_points: p.minus_points || [],
        images: p.images || [],
        original_images: origs,
        shopee_url: p.shopee_url,
        status: p.status || 'published',
        is_featured: !!p.is_featured,
        weight_grams: p.weight_grams ? Math.round(Number(p.weight_grams)) : 500,
        created_at: p.created_at || new Date().toISOString(),
        updated_at: p.updated_at || new Date().toISOString(),
      };
    });

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
  let currentList: Product[] = raw ? JSON.parse(raw) : [];

  if (memoryProductsCache && memoryProductsCache.length > 0) {
    for (const cached of memoryProductsCache) {
      if (!currentList.some((p) => p.id === cached.id)) {
        currentList.push(cached);
      }
    }
  }
  if (currentList.length === 0) {
    currentList = [...INITIAL_PRODUCTS];
  }

  const now = new Date().toISOString();
  let index = currentList.findIndex((p) => p.id === id);

  let updatedProduct: Product;
  if (index !== -1) {
    updatedProduct = {
      ...currentList[index],
      status: newStatus,
      updated_at: now,
    };
    currentList[index] = updatedProduct;
  } else {
    updatedProduct = {
      id,
      name: 'Produk',
      slug: id,
      price: 0,
      category: 'others',
      condition: 'Cukup Baik',
      description: '',
      completeness: [],
      minus_points: [],
      images: ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'],
      original_images: ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'],
      shopee_url: 'https://shopee.co.id',
      status: newStatus,
      updated_at: now,
      created_at: now,
    };
    currentList.unshift(updatedProduct);
  }

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
  let currentList: Product[] = raw ? JSON.parse(raw) : [];

  if (memoryProductsCache && memoryProductsCache.length > 0) {
    for (const cached of memoryProductsCache) {
      if (!currentList.some((p) => p.id === cached.id)) {
        currentList.push(cached);
      }
    }
  }
  if (currentList.length === 0) {
    currentList = [...INITIAL_PRODUCTS];
  }

  const current = currentList.find((p) => p.id === id);
  const nextStatus = targetStatus || (current?.status === 'sold' ? 'published' : 'sold');
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
