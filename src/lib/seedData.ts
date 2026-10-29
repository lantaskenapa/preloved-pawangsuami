import { Category, Product, StoreSettings } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-games',
    name: 'Games',
    slug: 'games',
    icon: 'Gamepad2',
    description: 'Konsol retro, game fisik PS4/PS5/Switch, handheld & aksesoris gaming',
    display_order: 1,
  },
  {
    id: 'cat-shirts',
    name: 'Shirts',
    slug: 'shirts',
    icon: 'Shirt',
    description: 'Kaos band vintage, flannel heavyweight, streetwear & jaket koleksi pribadi',
    display_order: 2,
  },
  {
    id: 'cat-electronics',
    name: 'Electronics',
    slug: 'electronics',
    icon: 'Tv',
    description: 'Audio DAC, headphone audiophile, monitor & periferal audio visual',
    display_order: 3,
  },
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    icon: 'Watch',
    description: 'Jam tangan mekanik/g-shock, dompet kulit, kacamata & EDC hobi',
    display_order: 4,
  },
  {
    id: 'cat-gadgets',
    name: 'Gadgets',
    slug: 'gadgets',
    icon: 'Smartphone',
    description: 'Tablet, e-reader, kamera digital & periferal kerja WFH',
    display_order: 5,
  },
  {
    id: 'cat-others',
    name: 'Others',
    slug: 'others',
    icon: 'Package',
    description: 'Lego, artbook, action figure & koleksi hobi unik lainnya',
    display_order: 6,
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-switch-oled',
    name: 'Nintendo Switch OLED White Model - Fullset Mulus',
    slug: 'nintendo-switch-oled-white-model-fullset',
    price: 3350000,
    original_price: 4950000,
    category: 'games',
    condition: 'Like New (99%)',
    description: 'Nintendo Switch OLED warna White versi Asia/Reg 3. Layar 7-inch OLED bening tanpa dead pixel, baterai prima 100%, joy-con tidak ada drift sama sekali. Terpasang tempered glass Spigen sejak hari pertama buka segel.',
    minus_points: [
      'Dus luar ada bekas lipatan halus di sudut bawah saat pengiriman',
      'Tempered glass terpasang ada sedikit gelembung mikro di ujung layar luar bezel'
    ],
    completeness: ['Konsol Nintendo Switch OLED', 'Joy-Con White (L & R)', 'Docking Station White', 'Joy-Con Grip', 'Joy-Con Straps', 'AC Adapter Original', 'Kabel HDMI Original', 'Dus & Buku Panduan'],
    images: [
      'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1612287233207-6f81c9819ee1?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182910',
    status: 'published',
    is_featured: true,
    weight_grams: 1400,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-25T14:30:00Z',
  },
  {
    id: 'prod-ps5-dualsense',
    name: 'Sony DualSense Wireless Controller PS5 - Midnight Black',
    slug: 'sony-dualsense-ps5-midnight-black',
    price: 680000,
    original_price: 1100000,
    category: 'games',
    condition: 'Sangat Baik (90-95%)',
    description: 'Controller stick original PS5 warna Midnight Black resmi Sony Indonesia (GDN). Haptic feedback dan adaptive trigger kencang normal. Baterai tahan 7-8 jam gameplay.',
    minus_points: [
      'Kabel USB-C bawaan tidak ada (hanya unit controller stick + dus original)',
      'Baret rambut mikro sangat halus di permukaan glossy tengah'
    ],
    completeness: ['Stick PS5 Midnight Black', 'Box Resmi Sony Indonesia', 'Buku Manual'],
    images: [
      'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1507457379470-08b800bebc67?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182911',
    status: 'published',
    is_featured: true,
    weight_grams: 550,
    created_at: '2026-10-21T11:15:00Z',
    updated_at: '2026-10-24T09:20:00Z',
  },
  {
    id: 'prod-ath-m50x',
    name: 'Audio-Technica ATH-M50x Professional Monitor Headphones',
    slug: 'audio-technica-ath-m50x-monitor-headphones',
    price: 1450000,
    original_price: 2650000,
    category: 'electronics',
    condition: 'Sangat Baik (90-95%)',
    description: 'Headphone legendaris untuk monitoring musik, mixing studio, maupun casual listening. Earpad dan headband kulit masih mulus tidak ada kelupas. Driver 45mm neodymium suara balanced dan bass tight.',
    minus_points: [
      'Kabel straight pendek 1.2m terselip/hilang (tersedia kabel coiled & straight 3m bawaan)',
      'Pouch kulit ada lipatan bekas penyimpanan lemari'
    ],
    completeness: ['Unit Headphone ATH-M50x Black', 'Kabel Coiled 1.2m-3m', 'Kabel Straight 3m', 'Gold-plated 6.3mm Adapter', 'Leather Carrying Pouch Ori'],
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182912',
    status: 'published',
    is_featured: true,
    weight_grams: 800,
    created_at: '2026-10-18T14:40:00Z',
    updated_at: '2026-10-23T18:00:00Z',
  },
  {
    id: 'prod-ipad-mini-6',
    name: 'Apple iPad Mini 6 64GB Wi-Fi - Starlight Edition',
    slug: 'apple-ipad-mini-6-64gb-wifi-starlight',
    price: 6200000,
    original_price: 9499000,
    category: 'gadgets',
    condition: 'Like New (99%)',
    description: 'iPad Mini 6 64GB warna Starlight resmi iBox. Body super mulus no dent atau lecet. Battery Health 98%, Touch ID lancar, layar Liquid Retina tajam anti gores. Bonus flip case magnetic.',
    minus_points: [
      'Masa garansi resmi iBox sudah habis (Desember 2025)',
      'Ada gesekan halus tidak kentara di dekat bezel port charger USB-C'
    ],
    completeness: ['Unit iPad Mini 6', 'Kepala Charger 20W Original', 'Kabel USB-C Original', 'Box Bawaan IMEI Tembus', 'Free Magnetic Case'],
    images: [
      'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1561154464-82e9adf32764?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182913',
    status: 'published',
    is_featured: true,
    weight_grams: 700,
    created_at: '2026-10-15T09:10:00Z',
    updated_at: '2026-10-25T11:00:00Z',
  },
  {
    id: 'prod-keychron-k2',
    name: 'Keychron K2 V2 Wireless Bluetooth Mechanical Keyboard',
    slug: 'keychron-k2-v2-wireless-keyboard-brown-switch',
    price: 890000,
    original_price: 1499000,
    category: 'gadgets',
    condition: 'Sangat Baik (90-95%)',
    description: 'Keyboard mekanik wireless 75% layout dengan Gateron G Pro Brown switch (tactile mantap tidak terlalu berisik). Backlight White LED elegan. Support Mac dan Windows via switch toggle di samping.',
    minus_points: [
      'Keycap tombol spacebar ada sedikit kilau halus bekas pemakaian (shine wajar ABS)',
      'Dus luar ada sedikit sobekan 1 cm pada lid penutup'
    ],
    completeness: ['Keyboard Keychron K2 V2', 'Kabel USB-C Braided L-Shape', 'Keycap Puller', 'Keycaps Pengganti Windows/Mac', 'Box Original'],
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182914',
    status: 'published',
    is_featured: false,
    weight_grams: 950,
    created_at: '2026-10-12T16:20:00Z',
    updated_at: '2026-10-22T13:00:00Z',
  },
  {
    id: 'prod-seiko-5',
    name: 'Seiko 5 Sports Automatic SRPD55K1 Black Dial Diver',
    slug: 'seiko-5-sports-srpd55k1-black-dial',
    price: 2150000,
    original_price: 3750000,
    category: 'accessories',
    condition: 'Baik (80-89%)',
    description: 'Jam tangan automatic ikonik mesin Calibre 4R36 dengan fitur manual winding & hacking second. Kaca Hardlex bening mulus, ada baret rambut halus pemakaian wajar di bagian clasp/rantai bawah.',
    minus_points: [
      'Baret rambut (hairline scratches) pada bagian clasp pengunci rantai bawah',
      'Buku garansi toko sudah habis masa berlakunya'
    ],
    completeness: ['Jam Tangan Seiko 5 SRPD55K1', 'Rantai Stainless Original + Potongan Rantai Cadangan', 'Box Jam Seiko Original', 'Buku Manual'],
    images: [
      'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182915',
    status: 'published',
    is_featured: true,
    weight_grams: 450,
    created_at: '2026-10-10T12:00:00Z',
    updated_at: '2026-10-20T10:15:00Z',
  },
  {
    id: 'prod-uniqlo-kaws',
    name: 'Uniqlo x KAWS UT Graphic Tee - Charcoal Grey (Size L)',
    slug: 'uniqlo-kaws-ut-charcoal-size-l',
    price: 195000,
    original_price: 299000,
    category: 'shirts',
    condition: 'Sangat Baik (90-95%)',
    description: 'Kaos kolaborasi resmi Uniqlo x KAWS warna Charcoal Grey. Bahan 100% cotton combed tebal premium khas Uniqlo UT. Sablon artwork Companion di bagian dada masih utuh tidak pecah.',
    minus_points: [
      'Hangtag kertas toko sudah dilepas',
      'Pernah dicuci 2 kali (warna masih pekat charcoal, tidak belel)'
    ],
    completeness: ['Kaos Uniqlo KAWS Original', 'Plastik pelindung ziplock'],
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182916',
    status: 'booked',
    is_featured: false,
    weight_grams: 300,
    created_at: '2026-10-08T08:30:00Z',
    updated_at: '2026-10-19T14:00:00Z',
  },
  {
    id: 'prod-flannel-heavyweight',
    name: 'Kemeja Flannel Heavyweight Workwear - Forest Green Check (Size XL)',
    slug: 'flannel-heavyweight-forest-green-xl',
    price: 280000,
    original_price: 580000,
    category: 'shirts',
    condition: 'Like New (99%)',
    description: 'Kemeja flannel bermotif kotak rustic forest green/navy. Bahan katun twill tebal hangat dengan kancing resin premium dan double pocket dada. Fit relaxed vintage.',
    minus_points: [
      'Tag kertas sudah dilepas saat mencoba fitting di rumah',
      'Kancing paling bawah jahitan benangnya sedikit longgar tapi utuh'
    ],
    completeness: ['Kemeja Flannel', 'Kancing Cadangan Bawaan'],
    images: [
      'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182917',
    status: 'sold',
    is_featured: false,
    weight_grams: 480,
    created_at: '2026-10-05T13:45:00Z',
    updated_at: '2026-10-18T16:00:00Z',
  },
  {
    id: 'prod-lego-porsche',
    name: 'LEGO Speed Champions Porsche 911 Turbo - Finished Display',
    slug: 'lego-speed-champions-porsche-911-turbo',
    price: 420000,
    original_price: 749000,
    category: 'others',
    condition: 'Like New (99%)',
    description: 'Set LEGO Speed Champions Porsche 911 original. Sudah dirakit dengan presisi rapi, stiker tertempel simetris, part 100% lengkap tidak ada yang hilang, minifigure pembalap & helm ada.',
    minus_points: [
      'Plastik sachet per nomor sudah dibuang saat perakitan',
      'Stiker spion sebelah kiri agak miring 1 milimeter'
    ],
    completeness: ['Mobil LEGO Porsche 911 Turbo', 'Minifigure Pembalap + Helm', 'Box Asli LEGO', 'Buku Panduan Rakit'],
    images: [
      'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182918',
    status: 'published',
    is_featured: false,
    weight_grams: 350,
    created_at: '2026-10-02T15:20:00Z',
    updated_at: '2026-10-17T11:30:00Z',
  },
  {
    id: 'prod-elden-ring-draft',
    name: 'Game Fisik PS5: Elden Ring Shadow of the Erdtree Edition',
    slug: 'elden-ring-ps5-shadow-of-the-erdtree',
    price: 620000,
    original_price: 1049000,
    category: 'games',
    condition: 'Like New (99%)',
    description: 'Disc fisik PS5 Elden Ring. Disc mulus tanpa baret sama sekali. Case plastik bening dan cover art rapi.',
    minus_points: [
      'Kode DLC voucher promosi sudah pernah diklaim',
      'Case plastik mika ada bekas gesekan rak penyimpanan wajar'
    ],
    completeness: ['Case Blu-ray PS5 Original', 'Disc Game Blu-ray', 'Insert Kertas'],
    images: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1000&q=80'
    ],
    shopee_url: 'https://shopee.co.id/product/12849102/2940182919',
    status: 'draft',
    is_featured: false,
    weight_grams: 200,
    created_at: '2026-10-26T09:00:00Z',
    updated_at: '2026-10-26T09:00:00Z',
  }
];

export const INITIAL_SETTINGS: StoreSettings = {
  id: 'primary',
  store_name: 'Pawang Suami Preloved',
  tagline: 'Barang Lama, Cerita Baru.',
  bio: 'Kurasi barang hobi, konsol, gadget, dan pakaian pribadi milik suami yang dirawat dengan penuh kasih sayang. Kondisi diceritakan jujur apa adanya tanpa rekayasa. Transaksi 100% aman dan resmi melalui Shopee.',
  shopee_store_url: 'https://shopee.co.id/pawangsuamipreloved',
  shipping_origin: 'Jakarta Selatan',
  whatsapp_contact: '081298765432',
  operational_hours: 'Senin - Sabtu: 09:00 - 18:00 WIB',
  shipping_policy: 'Pesanan sebelum jam 15:00 WIB dikirim di hari yang sama. Semua pesanan dikemas dengan bubble wrap tebal dan box karton kokoh tanpa biaya tambahan.',
  return_policy: 'Komplain barang harus menyertakan video unboxing utuh tanpa cut sesuai prosedur perlindungan pembeli Shopee Garansi.',
  gemini_api_key: '',
  removebg_api_key: '',
  updated_at: new Date().toISOString(),
};
