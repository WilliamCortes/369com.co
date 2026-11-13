'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Calculator,
  Compass,
  Radio,
  Flame,
  Award,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import {
  calculateNumerology,
  NumerologyResult,
  normalizeName
} from '@/lib/numerology';

export interface NumerologyCalculatorProps {
  onCalculate?: (result: NumerologyResult) => void;
  onSelectFrequency?: (hz: number) => void;
  onCheckoutInitiate?: (result: NumerologyResult, tier: 'blueprint' | 'master') => void;
  className?: string;
}

export default function NumerologyCalculator({
  onCalculate,
  onSelectFrequency,
  onCheckoutInitiate,
  className = ''
}: NumerologyCalculatorProps) {
  const [fullName, setFullName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  const handleCalculate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const clean = normalizeName(fullName);
    if (!clean || clean.length < 1) {
      setError('Please enter your full name (at least one alphabetic character).');
      return;
    }

    const digits = birthDate.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Please enter a valid birth date (YYYY-MM-DD format).');
      return;
    }

    setIsCalculating(true);

    try {
      const calc = calculateNumerology(fullName, birthDate);
      setResult(calc);
      if (onCalculate) {
        onCalculate(calc);
      }
    } catch (err: any) {
      setError(err?.message || 'Error calculating numerology numbers.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleTuneFrequency = () => {
    if (!result) return;
    if (onSelectFrequency) {
      onSelectFrequency(result.solfeggioFrequencyHz);
    }
    const synthElement = document.getElementById('synthesizer');
    if (synthElement) {
      synthElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCheckout = (tier: 'blueprint' | 'master') => {
    if (result && onCheckoutInitiate) {
      onCheckoutInitiate(result, tier);
    } else {
      const pricingSection = document.getElementById('pricing');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl ${className}`}
      id="numerology"
    >
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />

      {/* Header */}
      <div className="border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-amber-400" />
          <h3 className="text-2xl font-bold tracking-tight text-zinc-100">
            Pythagorean & Tesla Numerology Engine
          </h3>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Algorithmic calculation of Life Path, Destiny Number, and Tesla 3-6-9 Vortex Resonance Score
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleCalculate} className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block mb-1.5">
            Full Birth Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="e.g. Nikola Tesla or Jane Doe"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block mb-1.5">
            Date of Birth
          </label>
          <input
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900/90 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isCalculating}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-black uppercase tracking-wider shadow-glow-gold hover:from-amber-400 hover:to-amber-500 transition-all focus:outline-none"
          >
            <Sparkles className="h-4 w-4" />
            <span>{isCalculating ? 'Computing Resonance Matrix...' : 'Calculate My 3-6-9 Matrix'}</span>
          </button>
        </div>
      </form>

      {/* Error message */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-8 pt-6 border-t border-zinc-800 space-y-6 animate-fadeIn">
          {/* Radial Alignment Gauge & Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* 369 Resonance Score Gauge */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-b from-amber-950/30 to-zinc-900/50 p-5 text-center flex flex-col items-center justify-center shadow-glow-gold">
              <div className="relative flex items-center justify-center mb-2">
                <svg className="h-28 w-28 -rotate-90 transform">
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-zinc-800"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="46"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 46}
                    strokeDashoffset={2 * Math.PI * 46 * (1 - result.resonance369Score / 100)}
                    strokeLinecap="round"
                    className="text-amber-400"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute text-center">
                  <div className="text-2xl font-black font-mono text-amber-300">
                    {result.resonance369Score}%
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-zinc-400">Resonance</div>
                </div>
              </div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Tesla Vortex Index
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Proximity to the universal 3-6-9 creation triad
              </p>
            </div>

            {/* Life Path Card */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Life Path Number</span>
                {result.isMasterNumber && [11, 22, 33].includes(result.lifePath) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Master Number
                  </span>
                )}
              </div>
              <div className="text-3xl font-black font-mono text-zinc-100">{result.lifePath}</div>
              <div className="text-sm font-semibold text-amber-300 mt-1">{result.lifePathTitle}</div>
              <div className="text-xs text-zinc-400 mt-2">
                Dominant Element: <span className="text-zinc-200 font-medium">{result.dominantElement}</span>
              </div>
            </div>

            {/* Destiny & Tesla Triad Node Card */}
            <div className="rounded-xl border border-purple-500/30 bg-zinc-900/60 p-5 shadow-glow-violet">
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                <span>Destiny Number</span>
                {result.isMasterNumber && [11, 22, 33].includes(result.destinyNumber) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Master Number
                  </span>
                )}
              </div>
              <div className="text-3xl font-black font-mono text-zinc-100">{result.destinyNumber}</div>
              <div className="text-sm font-semibold text-purple-300 mt-1">{result.destinyTitle}</div>
              <div className="text-xs text-zinc-400 mt-2">
                Tesla Triad Node:{' '}
                <span className="text-amber-400 font-bold font-mono">
                  Node {result.teslaTriadNode}
                </span>
              </div>
            </div>
          </div>

          {/* Harmonic Audio Trigger Banner */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Your Resonant Frequency: {result.solfeggioFrequencyHz} Hz
                </div>
                <div className="text-xs text-zinc-400">
                  Recommended power intention: {result.powerIntention}
                </div>
              </div>
            </div>

            <button
              onClick={handleTuneFrequency}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <span>Play My Frequency ({result.solfeggioFrequencyHz}Hz)</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Upsell Teaser for Personalized Blueprint ($7.99) */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-zinc-900 to-purple-950/40 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-glow-gold">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Personalized Dossier Ready</span>
              </div>
              <h4 className="text-lg font-bold text-zinc-100">
                Unlock Your 15+ Page Nikola Tesla 369 Manifestation Blueprint
              </h4>
              <p className="text-xs text-zinc-400 max-w-xl">
                Deep dive into your Soul Urge ({result.soulUrgeNumber}), Personality Matrix ({result.personalityNumber}),
                and 33-day vortex scripting blueprint customized strictly to your name and birth date.
              </p>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleCheckout('blueprint')}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 text-xs font-bold text-black uppercase tracking-wider shadow-lg hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                <span>Unlock Blueprint ($7.99)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
