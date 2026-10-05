import React from 'react';
import { X, Sparkles, ShoppingBag, Star, CheckCircle, Shield, Droplets } from 'lucide-react';
import { Product } from '../types';

interface ProductQuickViewProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onAskAI: (product: Product) => void;
}

export const ProductQuickView: React.FC<ProductQuickViewProps> = ({
  product,
  onClose,
  onAddToCart,
  onAskAI
}) => {
  if (!product) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 relative animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center shadow-md transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Visual Side */}
          <div className={`p-8 bg-gradient-to-b ${product.imageBg} flex flex-col items-center justify-center text-center relative border-b md:border-b-0 md:border-r border-slate-100`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              {product.brand} • {product.category}
            </span>

            {/* Stylized cosmetic graphic */}
            <div className="w-36 h-48 rounded-2xl bg-white/90 shadow-xl border border-white p-4 flex flex-col items-center justify-between my-4 backdrop-blur-xs">
              <div className="w-10 h-2.5 rounded-t-sm bg-slate-300"></div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                  {product.brand}
                </span>
                <div 
                  className="font-extrabold text-sm uppercase px-1 leading-tight"
                  style={{ color: product.accentColor }}
                >
                  {product.name}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  {product.volume}
                </span>
              </div>
              <div className="w-16 h-1 rounded-full bg-slate-200"></div>
            </div>

            <div className="flex items-center gap-1 text-amber-500 text-xs font-bold mt-2">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
              <span className="text-slate-400">({product.reviewCount} verified reviews)</span>
            </div>
          </div>

          {/* Details Side */}
          <div className="p-6 md:p-8 flex flex-col justify-between space-y-4">
            <div>
              <span className="text-xs font-bold text-[#E31837] uppercase tracking-wider block mb-1">
                {product.badge}
              </span>
              <h2 className="text-lg font-black text-slate-900 leading-snug">
                {product.name}
              </h2>
              <p className="text-xs text-slate-400 font-arabic mt-0.5">
                {product.arabicName}
              </p>

              <div className="text-xl font-black text-[#0D2040] mt-3">
                {product.price.toFixed(2)} SAR
                {product.originalPrice && (
                  <span className="text-xs text-slate-400 line-through font-normal ml-2">
                    {product.originalPrice.toFixed(2)} SAR
                  </span>
                )}
              </div>

              {/* Skin type & highlights */}
              <div className="mt-3 space-y-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <span className="text-slate-400 font-bold block text-[10px] uppercase">Best For:</span>
                  <span className="text-slate-700 font-semibold">{product.skinType}</span>
                </div>

                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase block mb-1">Active Formula:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {product.activeIngredients.map((item, idx) => (
                      <span key={idx} className="bg-rose-50 text-[#E31837] text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200/60">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-slate-600 text-xs leading-relaxed pt-1">
                  {product.description}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className="w-full bg-[#0D2040] hover:bg-[#1A365D] text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Basket ({product.price.toFixed(2)} SAR)</span>
              </button>

              <button
                onClick={() => {
                  onAskAI(product);
                  onClose();
                }}
                className="w-full bg-rose-50 hover:bg-[#E31837] hover:text-white text-[#E31837] border border-rose-200 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer group"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-200" />
                <span>Ask AI If Safe For Sensitive Skin</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
