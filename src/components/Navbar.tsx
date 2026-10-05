import React, { useState } from 'react';
import { 
  Sparkles, 
  ShoppingBag, 
  Heart, 
  Search, 
  MapPin, 
  ChevronDown, 
  Globe, 
  User, 
  ShieldCheck, 
  Truck,
  Flame
} from 'lucide-react';

interface NavbarProps {
  cartItemCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAI: (query?: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartItemCount,
  wishlistCount,
  onOpenCart,
  onOpenAI,
  selectedCategory,
  onSelectCategory
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [currency, setCurrency] = useState<'SAR' | 'USD'>('SAR');
  const [lang, setLang] = useState<'EN' | 'AR'>('EN');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    onOpenAI(`I am searching for "${searchInput.trim()}". Can you recommend suitable skincare or cosmetic products from Nahdi Beauty?`);
    setSearchInput('');
  };

  const categories = [
    { id: 'All', label: 'All Luxury Beauty' },
    { id: 'Skincare', label: 'Skincare & Dermocare' },
    { id: 'Sunscreen', label: 'Sun Protection' },
    { id: 'Serums', label: 'Serums & Actives' },
    { id: 'Hydration', label: 'Hydration & Boosters' },
    { id: 'Cleansers', label: 'Cleansers & Micellar' },
    { id: 'Cosmetics', label: 'High-End Makeup' }
  ];

  return (
    <header className="sticky top-0 z-30 bg-white shadow-xs">
      {/* ================= 1. LUXURY TOP ANNOUNCEMENT BAR ================= */}
      <div className="bg-[#0D2040] text-white text-[11px] py-2 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          
          <div className="flex items-center gap-3">
            <span className="bg-[#E31837] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-2xs">
              <Truck className="w-3 h-3" /> 2-Hour Express
            </span>
            <span className="hidden sm:inline text-slate-300">
              Free 2-Hour Delivery in Riyadh, Jeddah &amp; Khobar on luxury orders over 100 SAR
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-300 ml-auto font-medium">
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E31837]" />
              <span>100% Authentic Luxury Guarantee</span>
            </span>

            <div className="h-3 w-px bg-white/20"></div>

            <button 
              onClick={() => setCurrency(currency === 'SAR' ? 'USD' : 'SAR')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              {currency} (ر.س)
            </button>

            <div className="h-3 w-px bg-white/20"></div>

            <button 
              onClick={() => setLang(lang === 'EN' ? 'AR' : 'EN')}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{lang === 'EN' ? 'العربية' : 'English'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* ================= 2. MAIN BRAND HEADER ================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* Brand Logo (Nahdi Beauty) */}
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => onSelectCategory('All')}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0D2040] via-[#1A365D] to-[#E31837] flex items-center justify-center text-white shadow-md">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-[#0D2040] uppercase">
                nahdi
              </span>
              <span className="text-xl sm:text-2xl font-serif italic text-[#E31837]">
                beauty
              </span>
              <span className="text-sm font-bold text-slate-400 font-arabic ml-1">
                النهدي بيوتي
              </span>
            </div>
            <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold -mt-0.5">
              Luxury Dermocosmetics &amp; Skincare
            </div>
          </div>
        </div>

        {/* Location Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
          <MapPin className="w-3.5 h-3.5 text-[#E31837]" />
          <div>
            <div className="text-[9px] text-slate-400 font-semibold uppercase">Deliver to</div>
            <div className="font-bold text-slate-900 flex items-center gap-1">
              Riyadh, Al Olaya <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Search Bar with AI Beauty Advisor Badge */}
        <div className="flex-1 max-w-xl mx-2 relative">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search CeraVe, Anthelios, serums or ask AI..."
              className="w-full pl-10 pr-28 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D2040] focus:border-transparent transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
            
            <button
              type="button"
              onClick={() => onOpenAI(searchInput || "Can you recommend the best skincare routine for sensitive dehydrated skin?")}
              className="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-[#0D2040] to-[#E31837] text-white px-3 rounded-full text-[11px] font-bold flex items-center gap-1.5 hover:shadow-md transition-all cursor-pointer group"
            >
              <Sparkles className="w-3 h-3 text-amber-300 group-hover:rotate-12 transition-transform" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>

        {/* Header Actions: AI Skin Advisor, Account, Wishlist, Cart */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Quick AI Skin Consultation Pill */}
          <button
            onClick={() => onOpenAI("Can you help me design an AM and PM skincare routine for glowing skin?")}
            className="hidden md:flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-[#E31837] border border-rose-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E31837]" />
            <span>AI Skin Advisor</span>
          </button>

          {/* User Sign In */}
          <button className="hidden sm:flex items-center gap-1 text-slate-600 hover:text-[#0D2040] p-2 rounded-xl hover:bg-slate-100 transition-colors text-xs font-semibold cursor-pointer">
            <User className="w-4 h-4" />
            <span className="hidden xl:inline">Nahdi Club</span>
          </button>

          {/* Wishlist */}
          <button className="relative p-2.5 text-slate-600 hover:text-[#E31837] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
            <Heart className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#E31837] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {wishlistCount}
              </span>
            )}
          </button>

          {/* Cart Drawer Trigger */}
          <button
            onClick={onOpenCart}
            aria-label="Open Shopping Basket"
            className="relative flex items-center gap-2 bg-[#0D2040] hover:bg-[#1A365D] text-white px-3.5 py-2.5 rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-rose-300" />
            <span className="text-xs font-extrabold">{cartItemCount}</span>
          </button>

        </div>

      </div>

      {/* ================= 3. LUXURY CATEGORY NAVIGATION ================= */}
      <nav className="border-t border-slate-100 bg-white/95 backdrop-blur-xs overflow-x-auto scrollbar-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 sm:gap-4 py-2 text-xs font-semibold whitespace-nowrap">
          <div className="flex items-center gap-1 text-[#E31837] font-bold mr-2">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Trending Beauty</span>
          </div>

          <div className="h-4 w-px bg-slate-200"></div>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#0D2040] text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-[#E31837] hover:bg-slate-100 font-medium'
              }`}
            >
              {cat.label}
            </button>
          ))}

          {/* Right link: Free consultation */}
          <button
            onClick={() => onOpenAI("What are the best ingredients for anti-aging and skin brightening?")}
            className="ml-auto hidden lg:flex items-center gap-1.5 text-xs font-bold text-[#E31837] hover:underline cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Consult Idrak AI Beauty Pharmacist →</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
