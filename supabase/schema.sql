-- =========================================================================
-- PAWANG SUAMI PRELOVED - SUPABASE DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Tagline: "Barang Lama, Cerita Baru."
-- =========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    price BIGINT NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    condition TEXT NOT NULL,
    description TEXT NOT NULL,
    story TEXT,
    completeness JSONB DEFAULT '[]'::jsonb,
    images JSONB DEFAULT '[]'::jsonb,
    shopee_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
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
-- Anyone can view categories
CREATE POLICY "Public categories are viewable by everyone" 
ON public.categories FOR SELECT 
USING (true);

-- Authenticated admins can insert/update/delete categories
CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Products RLS
-- Public can ONLY view published products
CREATE POLICY "Public can view published products only" 
ON public.products FOR SELECT 
USING (status = 'published');

-- Authenticated admins can view all products (including draft) and manage them
CREATE POLICY "Admins can view and manage all products" 
ON public.products FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Store Settings RLS
-- Public can view store settings
CREATE POLICY "Public can view store settings" 
ON public.store_settings FOR SELECT 
USING (true);

-- Authenticated admins can update store settings
CREATE POLICY "Admins can update store settings" 
ON public.store_settings FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

INSERT INTO public.categories (name, slug, icon, description, display_order)
VALUES
    ('Games', 'games', 'Gamepad2', 'Konsol retro, game fisik PS4/Switch, handheld & aksesoris gaming', 1),
    ('Shirts', 'shirts', 'Shirt', 'Kaos band vintage, flannel, streetwear & jaket koleksi pribadi', 2),
    ('Electronics', 'electronics', 'Tv', 'Audio DAC, headphone audiophile, monitor & periferal audio visual', 3),
    ('Accessories', 'accessories', 'Watch', 'Jam tangan mekanik/g-shock, dompet kulit, kacamata & gantungan kunci', 4),
    ('Gadgets', 'gadgets', 'Smartphone', 'Tablet, smartwatch, kamera digital & charger multiport', 5),
    ('Others', 'others', 'Package', 'Buku artbook, action figure hobi, koleksi unik rumahan', 6)
ON CONFLICT (slug) DO NOTHING;

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
