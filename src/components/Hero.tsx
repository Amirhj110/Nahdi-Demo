import React from 'react';
import { Sparkles, ShieldCheck, ArrowRight, Droplets, HeartHandshake, CheckCircle2 } from 'lucide-react';

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
              <span className="font-extrabold uppercase tracking-wider text-white">Idrak AI Beauty Advisor</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300 font-medium">Saudi Arabia Exclusive</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Luxury Dermocosmetics &amp; Skincare, <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-amber-200 to-rose-200">Tailored by Idrak AI</span>
            </h1>

            {/* Subtext */}
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-light">
              Elevate your daily beauty ritual. Explore 100% authentic international skincare, clinical serums, and luxury cosmetics curated by Nahdi dermatologists. Ask our interactive Idrak AI agent for personalized routines, skin sensitivity checks, and ingredient synergy.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onOpenAI("Can you help recommend a complete morning and evening skincare routine based on my skin type?")}
                className="bg-[#E31837] hover:bg-[#D71921] text-white px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 shadow-xl shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
              >
                <Sparkles className="w-4 h-4 text-amber-300 group-hover:rotate-12 transition-transform" />
                <span>Consult Idrak Beauty AI</span>
              </button>

              <button
                onClick={onExploreProducts}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 backdrop-blur-xs hover:border-white/40 transition-all cursor-pointer"
              >
                <span>Browse Luxury Products</span>
                <ArrowRight className="w-4 h-4 text-rose-300" />
              </button>
            </div>

            {/* Quick Prompt Pills */}
            <div className="pt-2">
              <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Popular Beauty Inquiries:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onOpenAI("Recommend a skincare routine for dry skin")}
                  className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-slate-200 transition-colors hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Routine for dry skin</span>
                </button>
                <button
                  onClick={() => onOpenAI("What are your shipping fees in KSA?")}
                  className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-slate-200 transition-colors hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Shipping fees in KSA</span>
                </button>
                <button
                  onClick={() => onOpenAI("What is your return policy for unopened cosmetics?")}
                  className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-slate-200 transition-colors hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Return policy for cosmetics</span>
                </button>
                <button
                  onClick={() => onOpenAI("What is your pricing?")}
                  className="bg-white/10 hover:bg-white/20 border border-white/15 px-3 py-1.5 rounded-xl text-xs text-slate-200 transition-colors hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Pricing &amp; Offers</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: AI Live Routine Preview Card */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
              
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#E31837] to-rose-400 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">Nahdi AI Beauty Consultation</h3>
                    <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      RAG Knowledge Active
                    </span>
                  </div>
                </div>

                <span className="bg-white/10 text-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Idrak v2.4
                </span>
              </div>

              {/* Mock Chat Snippet */}
              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-2 justify-end">
                  <div className="bg-[#002D62] text-white p-3 rounded-2xl rounded-tr-xs max-w-[85%] border border-white/10 shadow-sm leading-relaxed">
                    Can I layer The Ordinary Niacinamide 10% under La Roche-Posay Anthelios SPF50+?
                  </div>
                </div>

                <div className="flex items-start gap-2 justify-start">
                  <div className="w-6 h-6 rounded-lg bg-[#E31837] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-1">
                    AI
                  </div>
                  <div className="bg-white/15 text-slate-100 p-3.5 rounded-2xl rounded-tl-xs max-w-[90%] border border-white/15 leading-relaxed text-xs shadow-sm space-y-1.5">
                    <p className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Yes, an ideal morning pairing!</span>
                    </p>
                    <p className="text-slate-200 text-[11px]">
                      Apply 2-3 drops of <strong>Niacinamide 10%</strong> onto cleansed skin to regulate sebum and minimize pore visibility. Allow 60 seconds to absorb, then apply <strong>Anthelios SPF50+</strong> generously as your final protective step.
                    </p>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-sky-200">
                      <span>Dermatologist Formulated</span>
                      <button
                        onClick={() => onOpenAI("Can I layer The Ordinary Niacinamide 10% under La Roche-Posay Anthelios SPF50+?")}
                        className="underline hover:text-white font-semibold cursor-pointer"
                      >
                        Ask Follow-up →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Input Bar */}
              <div className="pt-2">
                <div className="bg-black/30 rounded-2xl p-1.5 flex items-center gap-2 border border-white/10">
                  <input
                    type="text"
                    id="hero-input"
                    placeholder="Ask about skin type, sensitive formulas..."
                    className="bg-transparent text-white text-xs px-3 py-2 w-full focus:outline-none placeholder-slate-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onOpenAI((e.target as HTMLInputElement).value || "Recommend a skincare routine for sensitive skin");
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('hero-input') as HTMLInputElement;
                      onOpenAI(input?.value || "What skincare routine is best for dry skin?");
                      if (input) input.value = '';
                    }}
                    className="bg-[#E31837] hover:bg-rose-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl shrink-0 transition-colors cursor-pointer"
                  >
                    Ask
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
