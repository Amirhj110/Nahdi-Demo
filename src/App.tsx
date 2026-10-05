import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Droplets, 
  Flame,
  Check
} from 'lucide-react';
import { Product, CartItem } from './types';
import { BEAUTY_PRODUCTS } from './data/products';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { ProductQuickView } from './components/ProductQuickView';
import { CartDrawer } from './components/CartDrawer';
import { BeautyAIChatWidget } from './components/BeautyAIChatWidget';
import { Footer } from './components/Footer';

export default function App() {
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      product: BEAUTY_PRODUCTS[0], // CeraVe Hydrating Cleanser
      quantity: 1
    },
    {
      product: BEAUTY_PRODUCTS[2], // The Ordinary Niacinamide
      quantity: 1
    }
  ]);
  const [wishlist, setWishlist] = useState<string[]>([BEAUTY_PRODUCTS[1].id]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [chatInitialQuery, setChatInitialQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3000);
  };

  // Add to cart
  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    showToast(`Added "${product.name}" to your beauty basket!`);
  };

  // Update quantity
  const handleUpdateQty = (productId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  // Remove from cart
  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from basket');
  };

  // Wishlist toggle
  const handleToggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      if (prev.includes(product.id)) {
        showToast(`Removed from wishlist: ${product.name}`);
        return prev.filter((id) => id !== product.id);
      } else {
        showToast(`Saved to wishlist: ${product.name}`);
        return [...prev, product.id];
      }
    });
  };

  // Trigger AI with custom question
  const handleOpenAIWithQuery = (query?: string) => {
    if (query) {
      setChatInitialQuery(query);
    }
    setIsChatOpen(true);
  };

  // Product card "Ask AI About This Product" action
  const handleAskAIAboutProduct = (product: Product) => {
    const question = `Can you tell me if ${product.name} is safe for sensitive skin, and how to best use it in a skincare routine?`;
    handleOpenAIWithQuery(question);
  };

  // Basket Routine Compatibility check
  const handleAskAICompatibility = (items: CartItem[]) => {
    setIsCartOpen(false);
    const itemNames = items.map((i) => i.product.name).join(', ');
    const query = `Can you check the routine compatibility of these beauty products I have in my basket: ${itemNames}? Do any ingredients conflict, and in what order should I apply them?`;
    handleOpenAIWithQuery(query);
  };

  // Filter products
  const filteredProducts = BEAUTY_PRODUCTS.filter((product) => {
    if (selectedCategory === 'All') return true;
    if (selectedCategory === 'Skincare') return product.category === 'Skincare' || product.category === 'Hydration';
    if (selectedCategory === 'Sunscreen') return product.category === 'Sunscreen';
    if (selectedCategory === 'Serums') return product.category === 'Serums';
    if (selectedCategory === 'Hydration') return product.category === 'Hydration';
    if (selectedCategory === 'Cleansers') return product.category === 'Cleansers';
    if (selectedCategory === 'Cosmetics') return product.category === 'Cosmetics';
    return true;
  });

  const cartTotalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-800 selection:bg-[#E31837] selection:text-white">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-[#0D2040] text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-2xl border border-white/10 animate-fade-in flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-full bg-[#E31837] text-white flex items-center justify-center text-[10px]">
            <Check className="w-3 h-3 text-white" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation */}
      <Navbar
        cartItemCount={cartTotalItems}
        wishlistCount={wishlist.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAI={handleOpenAIWithQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <main className="flex-1">
        
        {/* Luxury Hero Banner */}
        <Hero
          onOpenAI={handleOpenAIWithQuery}
          onExploreProducts={() => {
            const elem = document.getElementById('luxury-catalog');
            elem?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Beauty Routine Step Banner */}
        <section className="bg-white border-b border-slate-200 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-[#E31837]">
                  The Dermatologist 4-Step Routine
                </span>
                <h3 className="text-base font-extrabold text-[#0D2040]">
                  Cleanse → Treat → Hydrate → Protect
                </h3>
              </div>

              {/* 4 Interactive Steps */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
                <button
                  onClick={() => handleOpenAIWithQuery("What is the best way to double cleanse with Bioderma and CeraVe?")}
                  className="bg-slate-50 hover:bg-rose-50 border border-slate-200/80 p-2.5 rounded-2xl text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-slate-400 block">Step 01</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#E31837]">Gentle Cleanse</span>
                </button>

                <button
                  onClick={() => handleOpenAIWithQuery("How should I use The Ordinary Niacinamide 10% serum?")}
                  className="bg-slate-50 hover:bg-rose-50 border border-slate-200/80 p-2.5 rounded-2xl text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-slate-400 block">Step 02</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#E31837]">Active Serum</span>
                </button>

                <button
                  onClick={() => handleOpenAIWithQuery("Why is Vichy Mineral 89 recommended for barrier hydration?")}
                  className="bg-slate-50 hover:bg-rose-50 border border-slate-200/80 p-2.5 rounded-2xl text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-slate-400 block">Step 03</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#E31837]">Barrier Hydration</span>
                </button>

                <button
                  onClick={() => handleOpenAIWithQuery("Why is daily SPF50+ sunscreen like Anthelios essential in Saudi Arabia?")}
                  className="bg-slate-50 hover:bg-rose-50 border border-slate-200/80 p-2.5 rounded-2xl text-left transition-colors cursor-pointer group"
                >
                  <span className="text-[10px] font-bold text-slate-400 block">Step 04</span>
                  <span className="text-xs font-bold text-slate-800 group-hover:text-[#E31837]">Broad SPF50+</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PRODUCT CATALOG SECTION (COSMETICS & BEAUTY) ================= */}
        <section id="luxury-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#E31837] mb-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Luxury Skincare &amp; Cosmetics Collection</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0D2040] tracking-tight">
                Dermatologist Recommended Top Sellers
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-xl">
                Explore our curated luxury beauty line. Click <strong className="text-[#E31837]">"Ask AI About This Product"</strong> on any item to receive tailored ingredient analysis and skin sensitivity advice.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {['All', 'Skincare', 'Sunscreen', 'Serums', 'Hydration', 'Cleansers', 'Cosmetics'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-[#0D2040] text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat === 'All' ? 'All (6 Items)' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* 6 Luxury Cosmetics Products Grid with Real Photos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onAskAI={handleAskAIAboutProduct}
                onQuickView={(p) => setQuickViewProduct(p)}
                onToggleWishlist={handleToggleWishlist}
                isWishlisted={wishlist.includes(product.id)}
              />
            ))}
          </div>

        </section>

        {/* ================= INGREDIENT INTELLIGENCE SPOTLIGHT ================= */}
        <section className="bg-gradient-to-r from-rose-50/60 via-pink-50/40 to-slate-50 border-y border-rose-100/80 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="bg-[#E31837]/10 text-[#E31837] text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
                Clinical Dermatology
              </span>
              <h3 className="text-2xl font-black text-[#0D2040] mt-2">
                Decoded by Nahdi AI: What Powers Your Skin?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Our AI model is pre-trained with clinical dermatology research to guide you on formulations, concentration thresholds, and daily layering.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div 
                onClick={() => handleOpenAIWithQuery("What are Ceramides 1, 3, and 6-II in CeraVe, and why are they vital for the moisture barrier?")}
                className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-[#0D2040] group-hover:text-[#E31837] transition-colors">
                  Essential Ceramides
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Lipids that make up 50% of skin composition to lock in hydration and prevent trans-epidermal water loss.
                </p>
                <span className="text-[11px] text-[#E31837] font-bold mt-3 block group-hover:underline">
                  Ask AI About Ceramides →
                </span>
              </div>

              <div 
                onClick={() => handleOpenAIWithQuery("How does Mexoryl 400 protect against ultra-long UVA rays in La Roche-Posay Anthelios?")}
                className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm mb-3">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-[#0D2040] group-hover:text-[#E31837] transition-colors">
                  Mexoryl 400 UV Filter
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Breakthrough photostable filter defending against insidious 380–400nm ultra-long UVA rays responsible for premature aging.
                </p>
                <span className="text-[11px] text-[#E31837] font-bold mt-3 block group-hover:underline">
                  Ask AI About Mexoryl 400 →
                </span>
              </div>

              <div 
                onClick={() => handleOpenAIWithQuery("What is Niacinamide 10% with Zinc 1% good for, and does it cause purging?")}
                className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm mb-3">
                  <Flame className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-[#0D2040] group-hover:text-[#E31837] transition-colors">
                  Niacinamide (Vit B3)
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Multitasking vitamin that refines enlarged pores, regulates oil, and calms redness while boosting ceramide synthesis.
                </p>
                <span className="text-[11px] text-[#E31837] font-bold mt-3 block group-hover:underline">
                  Ask AI About Niacinamide →
                </span>
              </div>

              <div 
                onClick={() => handleOpenAIWithQuery("How does Hyaluronic Acid in Vichy Mineral 89 plump dehydrated skin?")}
                className="bg-white p-5 rounded-3xl border border-rose-100 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold text-sm mb-3">
                  <Droplets className="w-5 h-5" />
                </div>
                <h4 className="font-extrabold text-sm text-[#0D2040] group-hover:text-[#E31837] transition-colors">
                  Volcanic Hyaluronic Acid
                </h4>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  Holds up to 1,000 times its molecular weight in water, restoring bouncy plumpness and moisture balance.
                </p>
                <span className="text-[11px] text-[#E31837] font-bold mt-3 block group-hover:underline">
                  Ask AI About Hyaluronic Acid →
                </span>
              </div>

            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <Footer onOpenAI={handleOpenAIWithQuery} />

      {/* ================= NAHDI BEAUTY AI CHATBOT WIDGET (HYBRID TEXT & VOICE) ================= */}
      <BeautyAIChatWidget
        isOpen={isChatOpen}
        onToggle={(open) => setIsChatOpen(open !== undefined ? open : !isChatOpen)}
        initialQuery={chatInitialQuery}
        onClearInitialQuery={() => setChatInitialQuery('')}
      />

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onAskAICompatibility={handleAskAICompatibility}
      />

      {/* Product Quick View Modal */}
      <ProductQuickView
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onAskAI={handleAskAIAboutProduct}
      />

    </div>
  );
}
