import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Star } from 'lucide-react';

interface HeroProps {
  onOpenAI: (query?: string) => void;
  onExploreProducts: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAI, onExploreProducts }) => {
  return (
    <section className="relative bg-gradient-to-br from-[#0D2040] via-[#142C52] to-[#0A1830] text-white py-12 lg:py-16 overflow-hidden">
      
      {/* Decorative luxury gradient blurs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#E31837]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Editorial Copy */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pill Header */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 text-xs text-rose-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-extrabold uppercase tracking-wider text-white">Nahdi Beauty AI Advisor</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300 font-medium">Text &amp; Live Voice Consultation</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Luxury Dermocosmetics &amp; Skincare, <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-200 to-rose-200">Guided by AI</span>
            </h1>

            {/* Subtext */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
              Elevate your daily beauty ritual. Explore 100% authentic international skincare, clinical serums, and luxury cosmetics curated by Nahdi dermatologists. Consult our 24/7 smart assistant via live text chat or real-time voice streaming.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenAI("Can you help recommend a complete morning and evening skincare routine based on my skin type?")}
                className="bg-[#E31837] hover:bg-[#D71921] text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xl shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                <span>Talk to Nahdi Beauty AI</span>
              </button>

              <button
                onClick={onExploreProducts}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-xs hover:border-white/40 transition-all cursor-pointer"
              >
                <span>Browse Luxury Collection</span>
                <ArrowRight className="w-4 h-4 text-rose-300" />
              </button>
            </div>

            {/* Trust badges strip */}
            <div className="flex flex-wrap items-center gap-6 pt-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% SFDA Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Over 10,000+ 5-Star Reviews</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span>2-Hour Express Delivery</span>
              </div>
            </div>

          </div>

          {/* Right Column: Hero Visual Showcase with High-Res Beauty Photography */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/20 group">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&auto=format&fit=crop&q=80"
                alt="Luxury Skincare and Beauty"
                className="w-full h-[420px] object-cover object-center group-hover:scale-105 transition-transform duration-700"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/40 to-transparent flex flex-col justify-end p-6">
                <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-2xl p-4 space-y-2 text-white shadow-xl">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold flex items-center gap-1.5 text-rose-200">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Live AI Consultation Ready
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                      Hybrid Text &amp; Voice
                    </span>
                  </div>
                  <p className="text-xs text-slate-100 leading-relaxed font-light">
                    "Can you tell me if La Roche-Posay Anthelios SPF50+ and The Ordinary Niacinamide can be layered together?"
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[11px] text-amber-300 font-semibold">
                    <span>Nahdi AI Expert Advice</span>
                    <button
                      onClick={() => onOpenAI("Can I layer The Ordinary Niacinamide 10% under La Roche-Posay Anthelios SPF50+?")}
                      className="underline hover:text-white"
                    >
                      Ask Now →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
