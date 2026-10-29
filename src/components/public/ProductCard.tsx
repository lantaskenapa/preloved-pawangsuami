import React from 'react';
import { Product } from '../../types';
import { formatIDR } from '../../lib/formatters';
import { ShoppingBag, Sparkles, ImageOff, CheckCircle2, Clock, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const primaryImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const hasMultipleImages = product.images && product.images.length > 1;

  const isSold = product.status === 'sold';
  const isBooked = product.status === 'booked';

  // Condition color accents
  const getConditionStyle = (cond: string) => {
    if (cond.includes('Like New')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    }
    if (cond.includes('Sangat Baik')) {
      return 'bg-blue-50 text-blue-700 border-blue-200/80';
    }
    if (cond.includes('Baik')) {
      return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
    return 'bg-amber-50 text-amber-800 border-amber-200/80';
  };

  return (
    <div className={`group bg-white rounded-xl sm:rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
      isSold 
        ? 'border-neutral-200/70 shadow-xs bg-white' 
        : isBooked 
          ? 'border-amber-200/80 shadow-[0_2px_10px_rgba(245,158,11,0.06)] bg-white' 
          : 'border-neutral-200/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] hover:border-neutral-300 bg-white'
    } overflow-hidden`}>
      <div>
        {/* Image Container */}
        <div 
          onClick={() => onSelect(product)}
          className="relative aspect-square w-full bg-neutral-100 overflow-hidden cursor-pointer border-b border-neutral-100/80"
        >
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className={`w-full h-full object-cover object-center transition-transform duration-500 ease-out ${
                isSold 
                  ? 'grayscale-[30%] opacity-85 group-hover:scale-105' 
                  : 'group-hover:scale-105'
              }`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
              <ImageOff className="w-6 h-6 sm:w-8 sm:h-8 mb-1" />
              <span className="text-[10px] sm:text-xs">Foto tidak tersedia</span>
            </div>
          )}

          {/* Condition Tag on Image */}
          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 z-10">
            <span className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md sm:rounded-lg text-[10px] sm:text-[11px] font-semibold border backdrop-blur-md shadow-2xs ${getConditionStyle(product.condition)}`}>
              {product.condition}
            </span>
          </div>

          {/* Sold Out / Booked Stamp Overlay */}
          {isSold && (
            <div className="absolute inset-0 bg-neutral-950/25 flex items-center justify-center pointer-events-none p-3 z-10">
              <div className="px-3 py-1.5 rounded-lg bg-red-600/95 text-white font-extrabold text-[11px] sm:text-xs tracking-wider uppercase border border-red-400/80 shadow-lg backdrop-blur-xs flex items-center gap-1.5 transform -rotate-2">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Terjual di Shopee</span>
              </div>
            </div>
          )}

          {isBooked && (
            <div className="absolute inset-0 bg-amber-950/20 flex items-center justify-center pointer-events-none p-3 z-10">
              <div className="px-3 py-1.5 rounded-lg bg-amber-500/95 text-neutral-950 font-extrabold text-[11px] sm:text-xs tracking-wider uppercase border border-amber-300 shadow-lg backdrop-blur-xs flex items-center gap-1.5 transform -rotate-1">
                <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Sedang Dibooking</span>
              </div>
            </div>
          )}

          {/* Multiple images indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 px-1.5 py-0.5 rounded-md bg-neutral-900/70 text-white text-[9px] sm:text-[10px] font-medium backdrop-blur-xs z-10">
              +{product.images.length - 1} foto
            </div>
          )}

          {/* Featured Ribbon if applicable */}
          {product.is_featured && !isSold && (
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-neutral-900 text-white px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-xs z-10">
              <Sparkles className="w-2.5 h-2.5" />
              <span className="hidden sm:inline">Unggulan</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4">
          {/* Title */}
          <h3 
            onClick={() => onSelect(product)}
            className={`text-xs sm:text-sm font-medium leading-snug line-clamp-2 cursor-pointer transition-colors h-8 sm:h-10 ${
              isSold ? 'text-neutral-500 hover:text-neutral-800' : 'text-neutral-600 hover:text-neutral-950'
            }`}
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Price & Category in 1 Row (Sebaris: Harga di Kiri, Kategori di Kanan) */}
          <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className={`text-sm sm:text-base font-extrabold tracking-tight font-mono ${
                isSold ? 'text-neutral-500 line-through' : 'text-neutral-950'
              }`}>
                {formatIDR(product.price)}
              </span>
              {isSold && (
                <span className="text-[10px] font-semibold text-neutral-400 italic shrink-0">
                  (Laku)
                </span>
              )}
            </div>

            {/* Keterangan Kategori di sebelah kanan harga */}
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-400 shrink-0 text-right truncate max-w-[45%]">
              {product.category}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-3 sm:p-4 pt-0 mt-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
        {/* Conditional Primary Action */}
        {isSold ? (
          <a
            href={product.shopee_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-600 text-[11px] sm:text-xs font-semibold transition-all flex items-center justify-center gap-1 text-center border border-neutral-200/80"
            title="Lihat riwayat produk di Shopee"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate">Terjual di Shopee</span>
          </a>
        ) : isBooked ? (
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="w-full sm:flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-amber-50 text-amber-900 border border-amber-200/90 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 text-center"
            title="Barang sedang dibooking oleh calon pembeli"
          >
            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span className="truncate">Sedang Dibooking</span>
          </button>
        ) : (
          <a
            href={product.shopee_url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:flex-1 py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl bg-[#EE4D2D] hover:bg-[#D73211] text-white text-[11px] sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-98 text-center"
            title={`Beli ${product.name} di Shopee`}
          >
            <ShoppingBag className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">Beli di Shopee</span>
          </a>
        )}

        {/* Detail Button */}
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="w-full sm:flex-1 py-1.5 sm:py-2.5 px-2 sm:px-3 rounded-lg sm:rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-[11px] sm:text-sm font-semibold text-neutral-700 transition-colors text-center"
        >
          Detail
        </button>
      </div>
    </div>
  );
};
