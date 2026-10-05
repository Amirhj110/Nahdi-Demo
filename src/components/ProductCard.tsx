import React from 'react';
import { Sparkles, ShoppingBag, Star, Heart, Eye } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onAskAI: (product: Product) => void;
  onQuickView: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  isWishlisted?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onAskAI,
  onQuickView,
  onToggleWishlist,
  isWishlisted = false
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col overflow-hidden group">
      
      {/* Product Image & Badges Banner */}
      <div className={`relative h-64 bg-gradient-to-b ${product.imageBg} p-4 flex flex-col items-center justify-center border-b border-slate-100 overflow-hidden`}>
        
        {/* Floating Badges */}
        <div className="absolute top-3.5 left-3.5 flex flex-col gap-1.5 z-10">
          <span className={`${product.badgeColor || 'bg-[#0D2040]'} text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1`}>
            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
            {product.badge}
          </span>
          <span className="bg-white/90 backdrop-blur-xs text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-slate-200/80 shadow-xs">
            {product.volume}
          </span>
        </div>

        {/* Wishlist & Quick View Buttons */}
        <div className="absolute top-3.5 right-3.5 flex flex-col gap-2 z-10">
          <button 
            onClick={() => onToggleWishlist && onToggleWishlist(product)}
            aria-label="Wishlist"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white text-slate-400 hover:text-[#E31837] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#E31837] text-[#E31837]' : ''}`} />
          </button>
          
          <button 
            onClick={() => onQuickView(product)}
            aria-label="Quick View"
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white text-slate-500 hover:text-[#0D2040] flex items-center justify-center shadow-xs transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Real Crisp Product Photograph */}
        <div 
          onClick={() => onQuickView(product)}
          className="cursor-pointer relative z-0 w-full h-full flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-300"
        >
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-h-48 max-w-full object-contain drop-shadow-md rounded-xl"
            loading="lazy"
          />
        </div>

        {/* Active ingredients chip at bottom of image area */}
        <div className="absolute bottom-2 inset-x-3 flex justify-center">
          <span className="text-[10px] text-slate-600 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-slate-200/80 truncate max-w-full shadow-2xs font-medium">
            {product.activeIngredients.slice(0, 2).join(' • ')}
          </span>
        </div>
      </div>

      {/* Product Details */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Brand & Rating */}
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">
              {product.brand}
            </span>
            <div className="flex items-center gap-1 text-amber-500 text-[11px] font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
              <span className="text-slate-400 text-[10px]">({product.reviewCount})</span>
            </div>
          </div>

          {/* Product Name (English & Arabic) */}
          <h3 
            onClick={() => onQuickView(product)}
            className="font-bold text-slate-900 text-sm leading-snug group-hover:text-[#E31837] transition-colors cursor-pointer line-clamp-2"
          >
            {product.name}
          </h3>
          <p className="text-[11px] text-slate-400 font-arabic mt-0.5 truncate">
            {product.arabicName}
          </p>

          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {product.tagline}
          </p>
        </div>

        {/* Price & Action Buttons */}
        <div className="pt-3 border-t border-slate-100 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-lg font-black text-[#0D2040]">
                {product.price.toFixed(2)} SAR
              </span>
              {product.originalPrice && (
                <span className="text-xs text-slate-400 line-through ml-2">
                  {product.originalPrice.toFixed(2)} SAR
                </span>
              )}
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              2H Express
            </span>
          </div>

          {/* Product Card Actions */}
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => onAddToCart(product)}
              className="w-full bg-[#0D2040] hover:bg-[#1A365D] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Add to Basket</span>
            </button>

            {/* "Ask AI About This Product" button */}
            <button
              onClick={() => onAskAI(product)}
              title={`Ask AI about ${product.name}`}
              className="w-full bg-gradient-to-r from-rose-50 to-rose-100/60 hover:from-[#E31837] hover:to-rose-600 text-[#E31837] hover:text-white border border-rose-200/90 hover:border-transparent py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer shadow-xs group/btn"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover/btn:text-amber-300 group-hover/btn:rotate-12 transition-transform" />
              <span>Ask AI About This Product</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
