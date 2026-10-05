import React from 'react';
import { Sparkles, ShieldCheck, Truck, RotateCcw, PhoneCall, Headphones, Heart } from 'lucide-react';

interface FooterProps {
  onOpenAI: (query?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAI }) => {
  return (
    <footer className="bg-[#0D2040] text-slate-300 text-xs pt-12 pb-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Brand Value Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pb-12 border-b border-white/10 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#E31837] shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">2-Hour Express Delivery</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Direct temperature-controlled delivery across Riyadh, Jeddah &amp; Khobar.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">100% Authentic Guarantee</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Certified official distributor for CeraVe, La Roche-Posay, Bioderma &amp; Vichy.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">Idrak AI Beauty Advisor</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">24/7 intelligent skincare routine consultations &amp; ingredient safety analysis.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-300 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white text-xs">14-Day Hassle-Free Returns</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Return unopened cosmetics at any of our 1,100+ branches across Saudi Arabia.</p>
            </div>
          </div>
        </div>

        {/* Footer Links & Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 py-10 border-b border-white/10">
          
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0D2040] via-[#1A365D] to-[#E31837] flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 text-amber-300" />
              </div>
              <div className="text-lg font-black text-white uppercase tracking-tight">
                nahdi <span className="font-serif italic text-[#E31837]">beauty</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              The premier beauty and dermocosmetics destination by Al Nahdi Medical Company. Dedicated to empowering your self-care with verified formulations and AI beauty intelligence.
            </p>
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-white font-semibold">
                CR: 4030119853
              </span>
              <span className="bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 text-white font-semibold">
                SFDA Approved
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] mb-3">Top Beauty Categories</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li><button onClick={() => onOpenAI("Recommend best hydrating cleansers for sensitive skin")} className="hover:text-white transition-colors cursor-pointer">Dermatological Cleansers</button></li>
              <li><button onClick={() => onOpenAI("What are the best broad spectrum sunscreens for Saudi climate?")} className="hover:text-white transition-colors cursor-pointer">Sunscreen &amp; SPF 50+</button></li>
              <li><button onClick={() => onOpenAI("Explain the benefits of Niacinamide serum for acne and pores")} className="hover:text-white transition-colors cursor-pointer">Niacinamide &amp; Zinc Serums</button></li>
              <li><button onClick={() => onOpenAI("How to use Hyaluronic Acid booster correctly?")} className="hover:text-white transition-colors cursor-pointer">Hyaluronic Acid Boosters</button></li>
              <li><button onClick={() => onOpenAI("What makes Bioderma Sensibio micellar water suitable for sensitive eyes?")} className="hover:text-white transition-colors cursor-pointer">Micellar Makeup Removers</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] mb-3">Nahdi Services</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li><button onClick={() => onOpenAI("Can you help me build a complete skincare routine for oily acne-prone skin?")} className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-[#E31837]" /> AI Skincare Matchmaker</button></li>
              <li><a href="#branches" className="hover:text-white transition-colors">1,100+ Nahdi Beauty Stores</a></li>
              <li><a href="#points" className="hover:text-white transition-colors">Nahdi Club Rewards Program</a></li>
              <li><a href="#consultation" className="hover:text-white transition-colors">In-Store Dermo-Consultation</a></li>
              <li><a href="#offers" className="hover:text-white transition-colors">Exclusive Beauty Promotions</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] mb-3">Beauty Concierge</h4>
            <div className="space-y-2.5">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Toll-Free Beauty Care</div>
                <div className="text-sm font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                  <PhoneCall className="w-4 h-4 text-[#E31837]" />
                  <span>800 119 1199</span>
                </div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Online Chat Hours</div>
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>24/7 AI &amp; Pharmacist Support</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Payment Badges */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <div>
            © 2026 Al Nahdi Medical Company. All rights reserved. Authentic luxury beauty distributor in the Kingdom of Saudi Arabia.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">Mada</span>
            <span className="bg-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">Apple Pay</span>
            <span className="bg-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">Visa</span>
            <span className="bg-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">Mastercard</span>
            <span className="bg-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">Tamara</span>
            <span className="bg-white/10 text-white font-bold text-[10px] px-2.5 py-1 rounded-md">Tabby</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
