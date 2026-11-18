import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, Sparkles, ArrowRight, ShieldCheck, Truck } from 'lucide-react';
import { CartItem } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onAskAICompatibility: (items: CartItem[]) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onAskAICompatibility
}) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const freeShippingThreshold = 100.0;
  const isFreeShipping = subtotal >= freeShippingThreshold;
  const amountToFreeShipping = Math.max(0, freeShippingThreshold - subtotal);
  const progressPct = Math.min(100, (subtotal / freeShippingThreshold) * 100);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Slide-over Drawer */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="bg-[#0D2040] p-4 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#E31837]" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight">Beauty Basket</h3>
              <span className="text-[10px] text-slate-300">
                {totalItems} {totalItems === 1 ? 'luxury product' : 'luxury products'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Express Shipping Progress */}
        <div className="bg-rose-50/70 p-3.5 border-b border-rose-100 text-xs shrink-0">
          <div className="flex items-center justify-between font-bold text-[#0D2040] mb-1.5 text-[11px]">
            <span className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#E31837]" />
              {isFreeShipping ? (
                <span className="text-emerald-700 font-extrabold">You unlocked FREE 2-Hour Delivery in KSA!</span>
              ) : (
                <span>Add <strong className="text-[#E31837]">{amountToFreeShipping.toFixed(2)} SAR</strong> for FREE 2-Hour Delivery</span>
              )}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isFreeShipping ? 'bg-emerald-500' : 'bg-[#E31837]'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
          {items.length === 0 ? (
            <div className="text-center py-16 space-y-3 text-slate-400">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 mx-auto flex items-center justify-center text-slate-300">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="font-bold text-slate-700 text-sm">Your beauty basket is empty</div>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Discover our luxury skincare and cosmetics line, or ask our AI Beauty Advisor for recommendations.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="pt-3 first:pt-0 flex items-center gap-3">
                {/* Product Icon / Thumbnail */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-b ${item.product.imageBg} border border-slate-200/80 flex items-center justify-center shrink-0 p-1`}>
                  <div className="w-8 h-10 rounded-md bg-white/90 shadow-2xs flex flex-col items-center justify-center text-[8px] font-black text-slate-600">
                    {item.product.brand.slice(0, 3)}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {item.product.brand}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {item.product.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-black text-[#0D2040]">
                      {(item.product.price * item.quantity).toFixed(2)} SAR
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({item.product.price.toFixed(2)} SAR each)
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                  <button
                    onClick={() => onUpdateQty(item.product.id, -1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs text-slate-800">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQty(item.product.id, 1)}
                    className="w-6 h-6 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => onRemoveItem(item.product.id)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-[#E31837] flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer & Checkout */}
        {items.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 shrink-0">
            {/* AI Routine Compatibility Trigger */}
            <button
              onClick={() => onAskAICompatibility(items)}
              className="w-full bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-[#0D2040] border border-rose-200 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer group shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#E31837] group-hover:rotate-12 transition-transform" />
              <span>AI Routine Compatibility Check</span>
            </button>

            {/* Pricing Summary */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-900">{subtotal.toFixed(2)} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>Express 2-Hour Delivery</span>
                <span className={isFreeShipping ? 'font-bold text-emerald-600 uppercase' : 'font-bold text-slate-800'}>
                  {isFreeShipping ? 'FREE' : '15.00 SAR'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>15% Saudi VAT</span>
                <span>Included in all prices</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-[#0D2040]">
                <span>Total Due</span>
                <span className="text-[#E31837] text-base">
                  {(subtotal + (isFreeShipping ? 0 : 15.0)).toFixed(2)} SAR
                </span>
              </div>
            </div>

            {/* Checkout Action */}
            <button
              onClick={() => alert(`Proceeding to checkout with ${totalItems} luxury beauty items! Total: ${(subtotal + (isFreeShipping ? 0 : 15.0)).toFixed(2)} SAR.`)}
              className="w-full bg-[#E31837] hover:bg-[#D71921] text-white py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Checkout Securely (Mada / Apple Pay)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <div className="text-center text-[10px] text-slate-400">
              Free 14-day returns for unopened cosmetics across 1,100+ stores
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
