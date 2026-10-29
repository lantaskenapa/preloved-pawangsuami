-- =========================================================================
-- PAWANG SUAMI PRELOVED - SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Tagline: "Barang Lama, Cerita Baru."
-- =========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    price BIGINT NOT NULL CHECK (price >= 0),
    original_price BIGINT,
    category TEXT NOT NULL,
    condition TEXT NOT NULL,
    description TEXT NOT NULL,
    story TEXT,
    completeness JSONB DEFAULT '[]'::jsonb,
    minus_points JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    original_images JSONB DEFAULT '[]'::jsonb,
    shopee_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'sold', 'booked')),
    is_featured BOOLEAN DEFAULT false,
    weight_grams INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    store_name TEXT NOT NULL DEFAULT 'Pawang Suami Preloved',
    tagline TEXT NOT NULL DEFAULT 'Barang Lama, Cerita Baru.',
    bio TEXT,
    shopee_store_url TEXT NOT NULL DEFAULT 'https://shopee.co.id',
    shipping_origin TEXT DEFAULT 'Jakarta Selatan',
    whatsapp_contact TEXT,
    operational_hours TEXT DEFAULT 'Senin - Sabtu: 09:00 - 18:00 WIB',
    shipping_policy TEXT,
    return_policy TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Categories RLS
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Allow manage categories" ON public.categories;

CREATE POLICY "Public categories are viewable by everyone" 
ON public.categories FOR SELECT 
USING (true);

CREATE POLICY "Allow manage categories" 
ON public.categories FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Products RLS
DROP POLICY IF EXISTS "Public can view published products only" ON public.products;
DROP POLICY IF EXISTS "Public can view products except draft" ON public.products;
DROP POLICY IF EXISTS "Admins can view and manage all products" ON public.products;
DROP POLICY IF EXISTS "Allow manage products" ON public.products;

CREATE POLICY "Public can view products except draft" 
ON public.products FOR SELECT 
USING (status IN ('published', 'sold', 'booked'));

CREATE POLICY "Allow manage products" 
ON public.products FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Store Settings RLS
DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Allow manage store settings" ON public.store_settings;

CREATE POLICY "Public can view store settings" 
ON public.store_settings FOR SELECT 
USING (true);

CREATE POLICY "Allow manage store settings" 
ON public.store_settings FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

INSERT INTO public.categories (id, name, slug, icon, description, display_order)
VALUES
    ('cat-games', 'Games', 'games', 'Gamepad2', 'Konsol retro, game fisik PS4/Switch, handheld & aksesoris gaming', 1),
    ('cat-shirts', 'Shirts', 'shirts', 'Shirt', 'Kaos band vintage, flannel, streetwear & jaket koleksi pribadi', 2),
    ('cat-electronics', 'Electronics', 'electronics', 'Tv', 'Audio DAC, headphone audiophile, monitor & periferal audio visual', 3),
    ('cat-accessories', 'Accessories', 'accessories', 'Watch', 'Jam tangan mekanik/g-shock, dompet kulit, kacamata & gantungan kunci', 4),
    ('cat-gadgets', 'Gadgets', 'gadgets', 'Smartphone', 'Tablet, smartwatch, kamera digital & charger multiport', 5),
    ('cat-others', 'Others', 'others', 'Package', 'Buku artbook, action figure hobi, koleksi unik rumahan', 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.store_settings (id, store_name, tagline, bio, shopee_store_url, shipping_origin, whatsapp_contact, operational_hours, shipping_policy, return_policy)
VALUES (
    'primary',
    'Pawang Suami Preloved',
    'Barang Lama, Cerita Baru.',
    'Menjual koleksi hobi, gadget, pakaian, dan konsol pribadi milik suami yang dirawat sepenuh hati. Barang dijamin original, kondisi diceritakan apa adanya dengan transparansi 100%. Transaksi aman & resmi via Shopee Garansi.',
    'https://shopee.co.id/pawangsuamipreloved',
    'Jakarta Selatan',
    '081298765432',
    'Senin - Sabtu: 09:00 - 18:00 WIB (Minggu Libur Pengiriman)',
    'Pengiriman menggunakan double bubble wrap + kardus tebal gratis. Barang pecah belah / elektronik di atas 1 juta disarankan asuransi dan packing kayu.',
    'Garansi pengembalian 100% mengikuti syarat dan ketentuan Garansi Shopee jika barang yang diterima tidak sesuai dengan deskripsi/foto.'
)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- SAFE COLUMN MIGRATIONS (Untuk Database yang Sudah Terlanjur Dibuat)
-- =========================================================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS minus_points JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price BIGINT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS story TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS completeness JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_grams INT DEFAULT 500;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_images JSONB DEFAULT '[]'::jsonb;

-- Muat ulang schema cache PostgREST Supabase
NOTIFY pgrst, 'reload schema';
