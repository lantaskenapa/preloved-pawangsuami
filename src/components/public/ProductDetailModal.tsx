import React, { useState } from 'react';
import { Product, StoreSettings } from '../../types';
import { formatIDR } from '../../lib/formatters';
import {
  X,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  Truck,
  Share2,
  MessageCircle,
  CheckCircle2,
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface ProductDetailModalProps {
  product: Product | null;
  settings: StoreSettings;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  settings,
  onClose,
}) => {
  const { showToast } = useToast();
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) return null;

  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=1000&q=80'];

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Tautan produk berhasil disalin!', 'success');
    }
  };

  const getConditionStyle = (cond: string) => {
    if (cond.includes('Like New')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
    if (cond.includes('Sangat Baik')) {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    }
    if (cond.includes('Baik')) {
      return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
    return 'bg-amber-50 text-amber-900 border-amber-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div 
        className="relative bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-neutral-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white text-neutral-600 hover:text-neutral-900 shadow-sm border border-neutral-200 transition-colors"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left Column: Image Gallery */}
          <div className="p-4 sm:p-6 bg-neutral-50/60 border-b md:border-b-0 md:border-r border-neutral-200 flex flex-col justify-between">
            <div>
              {/* Main Image */}
              <div className="relative aspect-4/3 sm:aspect-square w-full rounded-2xl overflow-hidden bg-neutral-200 border border-neutral-200/80 shadow-xs">
                <img
                  src={images[activeImageIndex]}
                  alt={`${product.name} - foto ${activeImageIndex + 1}`}
                  className="w-full h-full object-cover object-center"
                />

                {/* Condition pill */}
                <div className="absolute top-3 left-3">
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-xs ${getConditionStyle(product.condition)}`}>
                    {product.condition}
                  </span>
                </div>
              </div>

              {/* Thumbnails if > 1 */}
              {images.length > 1 && (
                <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                        activeImageIndex === idx
                          ? 'border-neutral-900 ring-2 ring-neutral-900/10'
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Shopee Buyer Protection Box */}
            <div className="mt-5 p-3.5 rounded-xl bg-white border border-neutral-200 shadow-2xs">
              <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                <ShieldCheck className="w-4 h-4 text-[#EE4D2D]" />
                <span>Transaksi Resmi Shopee Garansi</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500 leading-normal">
                Uang Anda aman di rekening bersama Shopee sampai pesanan Anda terima dan konfirmasi sesuai.
              </p>
            </div>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="p-5 sm:p-8 flex flex-col justify-between max-h-[80vh] md:max-h-[85vh] overflow-y-auto">
            <div>
              {/* Category & Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  {product.category}
                </span>
                {product.status === 'sold' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                    Sudah Terjual (Sold Out)
                  </span>
                ) : product.status === 'booked' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                    Sedang Dibooking
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Siap Kirim
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-neutral-900 leading-snug">
                {product.name}
              </h2>

              {/* Status Alert Banner if Sold / Booked */}
              {product.status === 'sold' && (
                <div className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-900 leading-relaxed">
                    <strong>Barang Ini Sudah Laku Terjual:</strong> Telah berhasil di-checkout dan terkirim ke pemilik baru via Shopee. Tetap kami tampilkan sebagai bukti rekam jejak koleksi preloved berkualitas di toko kami.
                  </div>
                </div>
              )}

              {product.status === 'booked' && (
                <div className="mt-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950 leading-relaxed">
                    <strong>Sedang Dalam Proses Booking:</strong> Calon pembeli sedang menyelesaikan transaksi pembayaran. Apabila transaksi batal, status barang akan otomatis kembali tersedia untuk umum.
                  </div>
                </div>
              )}

              {/* Price & Original Price */}
              <div className="mt-4 pb-4 border-b border-neutral-200">
                {product.original_price && product.original_price > product.price && (
                  <div className="text-xs text-neutral-400 mb-1">
                    Harga Baru: <span className="line-through">{formatIDR(product.original_price)}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                      product.status === 'sold' ? 'text-neutral-500 line-through' : 'text-neutral-950'
                    }`}>
                      {formatIDR(product.price)}
                    </span>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {product.status === 'sold'
                        ? 'Harga laku terjual via Shopee'
                        : 'Harga preloved via Shopee (Bisa klaim Gratis Ongkir & Voucher Diskon)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Poin-Poin Minus (Format List) */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                  Poin-Poin Minus
                </h4>
                {product.minus_points && product.minus_points.length > 0 ? (
                  <ul className="space-y-1.5 pl-4 list-disc text-xs sm:text-sm text-neutral-700">
                    {product.minus_points.map((pt, i) => (
                      <li key={i} className="leading-relaxed">{pt}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Kondisi mulus tanpa minus</span>
                  </div>
                )}
              </div>

              {/* Deskripsi Barang */}
              <div className="mt-5">
                <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                  Deskripsi & Spesifikasi
                </h4>
                <p className="mt-2 text-xs sm:text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Kelengkapan */}
              {product.completeness && product.completeness.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-2">
                    Kelengkapan Yang Didapat
                  </h4>
                  <ul className="space-y-1.5">
                    {product.completeness.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                        <CheckCircle className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>

            {/* Bottom Actions */}
            <div className="mt-8 pt-5 border-t border-neutral-200 flex flex-col gap-3">
              {/* PRIMARY SHOPEE BUTTON */}
              {product.status === 'sold' ? (
                <a
                  href={product.shopee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-6 rounded-2xl bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-sm sm:text-base transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-neutral-400" />
                  <span>Lihat Riwayat Transaksi di Shopee</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-70" />
                </a>
              ) : product.status === 'booked' ? (
                <div className="w-full py-3.5 px-6 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 font-bold text-sm sm:text-base flex items-center justify-center gap-2">
                  <span>Sedang Dibooking (Menunggu Pembayaran)</span>
                </div>
              ) : (
                <a
                  href={product.shopee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 px-6 rounded-2xl bg-[#EE4D2D] hover:bg-[#D73211] text-white font-extrabold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 active:scale-98"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span>Beli di Shopee Sekarang</span>
                  <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                </a>
              )}

              {/* Share button */}
              <button
                type="button"
                onClick={handleShare}
                className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan Produk</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
