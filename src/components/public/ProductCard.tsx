import React from 'react';
import { Product } from '../../types';
import { formatIDR } from '../../lib/formatters';
import { ShoppingBag, ArrowUpRight, Sparkles, ImageOff } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const primaryImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const hasMultipleImages = product.images && product.images.length > 1;

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
    <div className="group bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.07)] hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Image Container */}
        <div 
          onClick={() => onSelect(product)}
          className="relative aspect-4/3 w-full bg-neutral-100 overflow-hidden cursor-pointer"
        >
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400">
              <ImageOff className="w-8 h-8 mb-1" />
              <span className="text-xs">Foto tidak tersedia</span>
            </div>
          )}

          {/* Condition Tag on Image */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border backdrop-blur-md shadow-2xs ${getConditionStyle(product.condition)}`}>
              {product.condition}
            </span>
          </div>

          {/* Multiple images indicator */}
          {hasMultipleImages && (
            <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-neutral-900/70 text-white text-[10px] font-medium backdrop-blur-xs">
              +{product.images.length - 1} foto
            </div>
          )}

          {/* Featured Ribbon if applicable */}
          {product.is_featured && (
            <div className="absolute top-3 right-3 bg-neutral-900 text-white px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shadow-xs">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Unggulan</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5">
          {/* Category breadcrumb */}
          <div className="text-[11px] uppercase tracking-wider font-semibold text-neutral-600 mb-1">
            {product.category}
          </div>

          {/* Title */}
          <h3 
            onClick={() => onSelect(product)}
            className="font-bold text-neutral-900 text-base leading-snug line-clamp-2 cursor-pointer hover:text-neutral-700 transition-colors"
            title={product.name}
          >
            {product.name}
          </h3>

          {/* Husband's Story Teaser if available */}
          {product.story && (
            <p className="mt-2 text-xs text-neutral-500 line-clamp-2 italic bg-neutral-50 p-2 rounded-lg border border-neutral-100">
              "{product.story}"
            </p>
          )}

          {/* Price */}
          <div className="mt-3.5 flex items-baseline gap-2">
            <span className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight">
              {formatIDR(product.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 sm:p-5 pt-0 mt-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-xs sm:text-sm font-semibold text-neutral-700 transition-colors text-center"
        >
          Lihat Detail
        </button>

        {/* Shopee Buy Button */}
        <a
          href={product.shopee_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#EE4D2D] hover:bg-[#D73211] text-white text-xs sm:text-sm font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-98"
          title={`Beli ${product.name} di Shopee`}
        >
          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
          <span>Beli di Shopee</span>
        </a>
      </div>
    </div>
  );
};
