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
  Zap,
  Copy,
  Smartphone,
  ExternalLink,
  X
} from 'lucide-react';
import {
  PRODUCT_CATALOG,
  getPublicBrebKey,
  getCopAmountForTier,
  formatCop
} from '@/lib/catalog';
import { NumerologyResult } from '@/lib/numerology';

export interface PricingTiersProps {
  numerologyData?: NumerologyResult | null;
  activeIntention?: string;
  className?: string;
}

interface BrebSubmittedOrder {
  orderId: string;
  brebKey: string;
  amountCopFormatted: string;
  whatsappUrl: string;
}

export default function PricingTiers({
  numerologyData,
  activeIntention = '',
  className = ''
}: PricingTiersProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customIntention, setCustomIntention] = useState<string>(activeIntention);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bre-B immediate transfer state
  const [brebTier, setBrebTier] = useState<string | null>(null);
  const [transferReference, setTransferReference] = useState<string>('');
  const [brebSubmitting, setBrebSubmitting] = useState<boolean>(false);
  const [brebError, setBrebError] = useState<string | null>(null);
  const [copiedBrebKey, setCopiedBrebKey] = useState<boolean>(false);
  const [brebSuccess, setBrebSuccess] = useState<BrebSubmittedOrder | null>(null);

  const brebKey = getPublicBrebKey();

  const handleCheckout = async (tierId: string) => {
    setLoadingTier(tierId);
    setErrorMessage(null);

    try {
      const payload = {
        tierId,
        customerEmail: email.trim() ? email.trim() : undefined,
        customerName: customerName.trim() ? customerName.trim() : undefined,
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

      window.location.href = data.url;
    } catch (err: any) {
      setErrorMessage(err?.message || 'Checkout failed. Please check your connection and retry.');
      setLoadingTier(null);
    }
  };

  const openBrebCheckout = (tierId: string) => {
    setBrebTier(tierId);
    setBrebError(null);
    setBrebSuccess(null);
  };

  const copyBrebKey = async () => {
    try {
      await navigator.clipboard.writeText(brebKey);
      setCopiedBrebKey(true);
      setTimeout(() => setCopiedBrebKey(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleBrebSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brebTier) return;

    setBrebSubmitting(true);
    setBrebError(null);

    try {
      const res = await fetch('/api/breb/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: brebTier,
          customerEmail: email.trim(),
          customerName: customerName.trim() || undefined,
          transferReference: transferReference.trim(),
          intention: (customIntention || activeIntention || '').trim() || undefined,
          numerologyData: numerologyData || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'No se pudo registrar tu transferencia Bre-B.');
      }

      setBrebSuccess({
        orderId: data.orderId,
        brebKey: data.brebKey,
        amountCopFormatted: data.amountCopFormatted,
        whatsappUrl: data.whatsappUrl
      });
    } catch (err: any) {
      setBrebError(err?.message || 'Error al registrar el comprobante Bre-B.');
    } finally {
      setBrebSubmitting(false);
    }
  };

  return (
    <section id="pricing" className={`pt-8 ${className}`}>
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">
          <Zap className="h-3.5 w-3.5" />
          <span>Autonomous Delivery Pipeline</span>
        </div>
        <h3 className="text-3xl sm:text-4xl font-black text-zinc-100 tracking-tight">
          Personalized Tesla 369 Blueprints &amp; Master Soundscapes
        </h3>
        <p className="text-xs sm:text-sm text-zinc-400 mt-2">
          Instant digital checkout &amp; Bre-B Colombia ({brebKey}) with dynamic personalized PDF synthesis.
        </p>

        {/* Bre-B Quick Key Callout */}
        <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-200">
          <Smartphone className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>
            Pagos inmediatos en Colombia con <strong>Bre-B</strong> — Llave:{' '}
            <code className="font-mono font-bold text-emerald-300">{brebKey}</code>
          </span>
          <button
            type="button"
            onClick={copyBrebKey}
            className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
          >
            <Copy className="h-3 w-3" />
            <span>{copiedBrebKey ? 'Copiada' : 'Copiar llave'}</span>
          </button>
        </div>

        {/* Personalized Context Banner */}
        {numerologyData && (
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 shadow-glow-gold animate-fadeIn">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              Calibrated for: Life Path {numerologyData.lifePath} ({numerologyData.lifePathTitle}) •
              Tesla Triad Node {numerologyData.teslaNode} • {numerologyData.resonance369Score}% Resonance Index
            </span>
          </div>
        )}
      </div>

      {/* Optional Email & Intention Field */}
      <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email (for receipt & PDF)"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Your Name (optional)"
              maxLength={120}
              className="w-full px-3 py-2 text-xs rounded-xl bg-zinc-950/80 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>
          <div>
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

      {/* Bre-B Direct Transfer Drawer */}
      {brebTier && (
        <div className="max-w-2xl mx-auto mb-10 rounded-3xl border border-emerald-500/50 bg-zinc-900/90 p-6 shadow-glow-gold">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Bre-B Colombia (Transferencia Inmediata)
              </span>
              <h4 className="text-lg font-black text-zinc-100 mt-2">
                {PRODUCT_CATALOG[brebTier]?.name}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                Valor a transferir:{' '}
                <strong className="text-emerald-300 font-mono">
                  {formatCop(getCopAmountForTier(brebTier))}
                </strong>{' '}
                (${PRODUCT_CATALOG[brebTier]?.price.toFixed(2)} USD)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBrebTier(null)}
              aria-label="Cerrar pago Bre-B"
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5 text-xs">
            <div>
              <div className="text-zinc-400">1. Transfiere desde Nequi, Bancolombia o tu banco a la llave:</div>
              <div className="mt-1 font-mono text-base font-black text-amber-300">{brebKey}</div>
            </div>
            <button
              type="button"
              onClick={copyBrebKey}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-2 text-xs font-bold text-emerald-200 hover:bg-emerald-500/30 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copiedBrebKey ? 'Llave copiada' : `Copiar ${brebKey}`}</span>
            </button>
          </div>

          {!brebSuccess ? (
            <form onSubmit={handleBrebSubmit} className="mt-4 space-y-3">
              <div className="text-xs text-zinc-300">
                2. Registra tu correo y el número de comprobante / referencia de tu transferencia:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Tu correo para entrega del PDF *"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-400"
                />
                <input
                  type="text"
                  required
                  minLength={4}
                  maxLength={120}
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="Nro. comprobante o referencia Bre-B *"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-emerald-400"
                />
              </div>

              {brebError && (
                <div className="p-2.5 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{brebError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={brebSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-xs font-black uppercase tracking-wider text-black hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 cursor-pointer"
              >
                {brebSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Registrando transferencia...</span>
                  </>
                ) : (
                  <>
                    <span>Registrar comprobante y abrir WhatsApp</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-4 p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/30 space-y-3 text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-300">
                <CheckCircle className="h-4 w-4" />
                <span>Orden registrada: {brebSuccess.orderId}</span>
              </div>
              <p className="text-zinc-300">
                Envíanos el mensaje por WhatsApp para validar tu transferencia ({brebSuccess.amountCopFormatted} a{' '}
                <strong>{brebSuccess.brebKey}</strong>) y recibir de inmediato tu enlace VIP de descarga.
              </p>
              <a
                href={brebSuccess.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-black hover:bg-emerald-400"
              >
                <span>Enviar comprobante por WhatsApp</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tier: Starter ($4.99) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Starter Tier</div>
            <h4 className="text-xl font-bold text-zinc-100 mt-1">369 Starter Blueprint</h4>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-zinc-100">$4.99</span>
              <span className="text-xs text-zinc-400">USD • {formatCop(getCopAmountForTier('starter'))}</span>
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

          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={() => openBrebCheckout('starter')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/90 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Pagar con Bre-B ({brebKey})</span>
            </button>
            <button
              type="button"
              onClick={() => handleCheckout('starter')}
              disabled={Boolean(loadingTier)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 text-[11px] font-bold uppercase tracking-wider text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingTier === 'starter' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
                  <span>Preparing Checkout...</span>
                </>
              ) : (
                <span>Card Checkout ($4.99)</span>
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
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-amber-400">$7.99</span>
              <span className="text-xs text-zinc-300">USD • {formatCop(getCopAmountForTier('blueprint'))}</span>
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

          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={() => openBrebCheckout('blueprint')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-xs font-black uppercase tracking-wider text-black shadow-glow-gold hover:from-amber-300 hover:to-amber-400 transition-all cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Pagar con Bre-B ({brebKey})</span>
            </button>
            <button
              type="button"
              onClick={() => handleCheckout('blueprint')}
              disabled={Boolean(loadingTier)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-zinc-900/80 py-2.5 text-[11px] font-bold uppercase tracking-wider text-amber-200 hover:border-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingTier === 'blueprint' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
                  <span>Generating Session...</span>
                </>
              ) : (
                <>
                  <span>Card Checkout ($7.99)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
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
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-purple-300">$19.99</span>
              <span className="text-xs text-zinc-400">USD • {formatCop(getCopAmountForTier('master'))}</span>
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

          <div className="mt-8 space-y-2">
            <button
              type="button"
              onClick={() => openBrebCheckout('master')}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500/90 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition-colors cursor-pointer"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Pagar con Bre-B ({brebKey})</span>
            </button>
            <button
              type="button"
              onClick={() => handleCheckout('master')}
              disabled={Boolean(loadingTier)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-purple-500/60 bg-purple-900/30 py-2.5 text-[11px] font-bold uppercase tracking-wider text-purple-200 hover:bg-purple-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingTier === 'master' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-purple-200" />
                  <span>Preparing Master Sanctuary...</span>
                </>
              ) : (
                <span>Card Checkout ($19.99)</span>
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
