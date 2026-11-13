'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Mail,
  Zap
} from 'lucide-react';
import { PRODUCT_CATALOG } from '@/lib/stripe';
import { NumerologyResult } from '@/lib/numerology';

export interface PricingTiersProps {
  numerologyData?: NumerologyResult | null;
  activeIntention?: string;
  className?: string;
}

export default function PricingTiers({
  numerologyData,
  activeIntention = '',
  className = ''
}: PricingTiersProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [customIntention, setCustomIntention] = useState<string>(activeIntention);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async (tierId: string) => {
    setLoadingTier(tierId);
    setErrorMessage(null);

    try {
      const payload = {
        tierId,
        customerEmail: email.trim() ? email.trim() : undefined,
        intention: (customIntention || activeIntention || '').trim() || undefined,
        numerologyData: numerologyData || undefined
      };

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Failed to initialize checkout session. Please try again.');
      }

      // Redirect user to Stripe hosted checkout or instant sandbox fulfillment
      window.location.href = data.url;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Checkout failed. Please check your connection and retry.');
      setLoadingTier(null);
    }
  };

  return (
    <section id="pricing" className={`pt-8 ${className}`}>
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">
          <Zap className="h-3.5 w-3.5" />
          <span>Autonomous Delivery Pipeline</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-zinc-100 tracking-tight">
          Personalized Tesla 369 Blueprints & Master Soundscapes
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Instant 1-click checkout and automated dynamic PDF synthesis. Zero manual intervention.
        </p>

        {/* Personalized Context Banner */}
        {numerologyData && (
          <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 shadow-glow-gold animate-fadeIn">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Calibrated for: Life Path {numerologyData.lifePath} ({numerologyData.lifePathTitle}) •
              Tesla Triad Node {numerologyData.teslaNode} • {numerologyData.resonance369Score}% Resonance Index
            </span>
          </div>
        )}
      </div>

      {/* Optional Email & Intention Field */}
      <div className="max-w-xl mx-auto mb-8 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (for receipt & PDF download)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={customIntention}
              onChange={(e) => setCustomIntention(e.target.value)}
              placeholder="Primary Intention (e.g. Abundance)"
              maxLength={500}
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="max-w-xl mx-auto mb-6 p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier: Starter ($4.99) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Starter Tier</div>
            <h4 className="text-xl font-bold text-zinc-100 mt-1">369 Starter Blueprint</h4>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-zinc-100">$4.99</span>
              <span className="text-xs text-zinc-400">USD (One-time)</span>
            </div>
            <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-800 pt-3">
              Essential stepping stones into the Tesla 3-6-9 frequency habit.
            </p>
            <ul className="mt-4 space-y-2.5 text-xs text-zinc-300">
              {PRODUCT_CATALOG.starter.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout('starter')}
              disabled={Boolean(loadingTier)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-3 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:border-zinc-500 hover:bg-zinc-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingTier === 'starter' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
                  <span>Preparing Checkout...</span>
                </>
              ) : (
                <span>Select Starter ($4.99)</span>
              )}
            </button>
          </div>
        </div>

        {/* Tier 1: Blueprint ($7.99) - FEATURED SIGNATURE */}
        <div className="relative rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-950/30 to-zinc-900/80 p-6 flex flex-col justify-between shadow-glow-gold scale-[1.02]">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
            Most Popular
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-400">Tier 1 Signature</div>
            <h4 className="text-xl font-bold text-zinc-100 mt-1">Personalized Tesla Blueprint</h4>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-amber-400">$7.99</span>
              <span className="text-xs text-zinc-400">USD (One-time)</span>
            </div>
            <p className="text-xs text-zinc-300 mt-3 border-t border-zinc-800/80 pt-3">
              Dynamically synthesized PDF report customized strictly to your name and birth date.
            </p>
            <ul className="mt-4 space-y-2.5 text-xs text-zinc-200">
              {PRODUCT_CATALOG.blueprint.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout('blueprint')}
              disabled={Boolean(loadingTier)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-xs font-bold uppercase tracking-wider text-black shadow-glow-gold hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingTier === 'blueprint' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Generating Session...</span>
                </>
              ) : (
                <>
                  <span>Unlock My Blueprint ($7.99)</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tier 2: Master ($19.99) */}
        <div className="rounded-2xl border border-purple-500/40 bg-zinc-900/60 p-6 flex flex-col justify-between shadow-glow-violet">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-purple-400">Tier 2 Master</div>
            <h4 className="text-xl font-bold text-zinc-100 mt-1">369 Master Sanctuary Kit</h4>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-black font-mono text-purple-300">$19.99</span>
              <span className="text-xs text-zinc-400">USD (One-time)</span>
            </div>
            <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-800 pt-3">
              The complete Solfeggio soundscape library and master tactile geometry workbook.
            </p>
            <ul className="mt-4 space-y-2.5 text-xs text-zinc-300">
              {PRODUCT_CATALOG.master.features.map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-purple-400 shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <button
              onClick={() => handleCheckout('master')}
              disabled={Boolean(loadingTier)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/60 bg-purple-900/30 py-3 text-xs font-bold uppercase tracking-wider text-purple-200 hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingTier === 'master' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-purple-200" />
                  <span>Preparing Master Sanctuary...</span>
                </>
              ) : (
                <span>Get Master Sanctuary ($19.99)</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Security Guarantee Notice */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-amber-400" />
          <span>256-Bit SSL Encrypted Checkout</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>Instant Autonomous Delivery (Zero Waiting)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>30-Day Resonance Guarantee</span>
        </div>
      </div>
    </section>
  );
}
