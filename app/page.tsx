'use client';

import React, { useState } from 'react';
import FrequencySynthesizer from '@/components/FrequencySynthesizer';
import ManifestationChamber from '@/components/ManifestationChamber';
import NumerologyCalculator from '@/components/NumerologyCalculator';
import PricingTiers from '@/components/PricingTiers';
import { NumerologyResult } from '@/lib/numerology';
import {
  Sparkles,
  Zap,
  Radio,
  Calculator,
  Flame,
  Shield,
  ArrowRight,
  CheckCircle,
  Headphones,
  Award,
  Layers
} from 'lucide-react';

export default function HomePage() {
  const [numerologyResult, setNumerologyResult] = useState<NumerologyResult | null>(null);

  const handleCheckoutInitiate = (result: NumerologyResult) => {
    setNumerologyResult(result);
    const pricingEl = document.getElementById('pricing');
    if (pricingEl) {
      pricingEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col bg-[#090a10] text-zinc-100 overflow-hidden">
      {/* Dynamic Starfield & Nebula Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-amber-500/10 via-purple-600/5 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-[800px] -left-[200px] w-[600px] h-[600px] bg-purple-600/10 blur-[140px] rounded-full" />
        <div className="absolute top-[1600px] -right-[200px] w-[600px] h-[600px] bg-amber-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-lg shadow-glow-gold">
              369
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-zinc-100 text-base">
                369COM<span className="text-amber-400">.CO</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest text-zinc-400 border-l border-zinc-700 pl-2">
                Resonance Lab
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <a href="#synthesizer" className="hover:text-amber-300 transition-colors">
              Frequency Lab
            </a>
            <a href="#chamber" className="hover:text-amber-300 transition-colors">
              369 Chamber
            </a>
            <a href="#numerology" className="hover:text-amber-300 transition-colors">
              Numerology Matrix
            </a>
            <a href="#pricing" className="hover:text-amber-300 transition-colors">
              Blueprints
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black uppercase tracking-wider shadow-glow-gold hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Get Blueprint</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-16 pb-12 sm:pt-24 sm:pb-20 text-center px-4 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-300 shadow-glow-gold mb-6 animate-fadeIn">
          <Zap className="h-3.5 w-3.5" />
          <span>Nikola Tesla Vortex Mathematics & Sound Matrix</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-zinc-100 leading-[1.1] mb-6">
          Harmonize with the <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-purple-400 bg-clip-text text-transparent">
            3-6-9 Universal Creation Code
          </span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
          &ldquo;If you only knew the magnificence of the 3, 6, and 9, then you would have the key to the universe.&rdquo;
          — Nikola Tesla. Align your subconscious with interactive sound therapy, daily scripting, and algorithmic numerology.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#synthesizer"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-xs font-bold text-black uppercase tracking-wider shadow-glow-gold hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Radio className="h-4 w-4" />
            <span>Launch 369Hz Tone</span>
          </a>
          <a
            href="#chamber"
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-6 py-3.5 text-xs font-bold text-zinc-200 uppercase tracking-wider hover:border-amber-400 hover:text-amber-300 transition-all"
          >
            <Flame className="h-4 w-4 text-amber-400" />
            <span>Enter Daily Chamber</span>
          </a>
          <a
            href="#numerology"
            className="flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/30 px-6 py-3.5 text-xs font-bold text-purple-300 uppercase tracking-wider hover:border-purple-400 transition-all"
          >
            <Calculator className="h-4 w-4" />
            <span>Calculate 369 Matrix</span>
          </a>
        </div>

        {/* Feature Pill Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-14 text-left max-w-4xl mx-auto">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <Radio className="h-4 w-4 text-amber-400 mb-1" />
            <div className="text-xs font-bold text-zinc-200">Zero COGS Web Audio</div>
            <div className="text-[11px] text-zinc-400">Pure 369Hz & Solfeggio tones</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <Flame className="h-4 w-4 text-purple-400 mb-1" />
            <div className="text-xs font-bold text-zinc-200">Daily Scripting Ritual</div>
            <div className="text-[11px] text-zinc-400">3 morning, 6 midday, 9 evening</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <Calculator className="h-4 w-4 text-cyan-400 mb-1" />
            <div className="text-xs font-bold text-zinc-200">Pythagorean Engine</div>
            <div className="text-[11px] text-zinc-400">Life Path & 3-6-9 Vortex Score</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5">
            <Award className="h-4 w-4 text-amber-400 mb-1" />
            <div className="text-xs font-bold text-zinc-200">Autonomous Delivery</div>
            <div className="text-[11px] text-zinc-400">Instant personalized 15+ pg PDF</div>
          </div>
        </div>
      </section>

      {/* Main Core Utilities Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pb-20">
        {/* F3: Frequency Synthesizer Section */}
        <section>
          <FrequencySynthesizer />
        </section>

        {/* F2: 369 Manifestation Chamber Section */}
        <section>
          <ManifestationChamber />
        </section>

        {/* F4: Pythagorean & Tesla Numerology Section */}
        <section>
          <NumerologyCalculator
            onCalculate={setNumerologyResult}
            onCheckoutInitiate={handleCheckoutInitiate}
          />
        </section>

        {/* F5: Pricing Tiers Section (#pricing) */}
        <PricingTiers numerologyData={numerologyResult} />
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-zinc-800 bg-zinc-950/90 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">369COM.CO</span>
            <span>• The 369 Resonance Lab & Manifestation Engine</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Dedicated to Nikola Tesla’s harmonic vision of 3, 6, and 9. For self-mastery and manifestation.
          </div>
        </div>
      </footer>
    </main>
  );
}
