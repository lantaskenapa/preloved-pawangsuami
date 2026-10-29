export type ProductCondition = 
  | 'Like New (99%)'
  | 'Sangat Baik (90-95%)'
  | 'Baik (80-89%)'
  | 'Minus Pemakaian (Wajar)';

export type ProductStatus = 'published' | 'draft' | 'sold' | 'booked';

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  original_price?: number; // Harga baru toko / retail asli
  category: string; // matches Category slug or id
  condition: ProductCondition;
  description: string;
  story?: string;
  completeness: string[]; // e.g. ["Box Original", "Kabel Bawaan", "Nota Pembelian"]
  minus_points?: string[]; // Poin-poin minus fisik / pemakaian
  images: string[];
  shopee_url: string;
  status: ProductStatus;
  is_featured?: boolean;
  weight_grams?: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order?: number;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  tagline: string;
  bio: string;
  shopee_store_url: string;
  shipping_origin: string;
  whatsapp_contact: string;
  operational_hours: string;
  shipping_policy: string;
  return_policy: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  gemini_api_key?: string;
  removebg_api_key?: string;
  removebg_api_keys?: string[];
  magic_thumbnail_engine?: 'imgly' | 'removebg';
  updated_at: string;
}

export interface UserSession {
  email: string;
  role: 'admin';
  token: string;
  logged_at: string;
}
