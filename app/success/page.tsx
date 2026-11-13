'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  Download,
  Sparkles,
  Zap,
  Radio,
  ArrowRight,
  ShieldCheck,
  Loader2,
  FileText,
  Volume2,
  Package
} from 'lucide-react';
import { PRODUCT_CATALOG } from '@/lib/stripe';

interface OrderStatusResponse {
  status: 'pending' | 'fulfilled' | 'refunded';
  orderId?: string;
  tierId?: string;
  customerEmail?: string;
  customerName?: string;
  intention?: string;
  downloadUrl?: string;
  createdAt?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId') || '';
  const isMock = searchParams.get('mock') === 'true';

  const [order, setOrder] = useState<OrderStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<boolean>(false);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      setError('No session ID provided. Please access via your checkout confirmation link.');
      return;
    }

    let isMounted = true;
    let pollCount = 0;
    const maxPolls = 15;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/order/status?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
          throw new Error('Failed to retrieve order status');
        }
        const data: OrderStatusResponse = await res.json();

        if (isMounted) {
          if (data.status === 'fulfilled') {
            setOrder(data);
            setLoading(false);

            // Persist VIP access token and order in browser localStorage
            try {
              if (typeof window !== 'undefined') {
                localStorage.setItem(
                  '369_vip_order',
                  JSON.stringify({
                    sessionId,
                    tierId: data.tierId,
                    orderId: data.orderId,
                    downloadUrl: data.downloadUrl,
                    fulfilledAt: new Date().toISOString()
                  })
                );
              }
            } catch {
              // Ignore localStorage quota or private browsing errors
            }
          } else if (data.status === 'pending') {
            pollCount++;
            if (pollCount < maxPolls) {
              setTimeout(fetchStatus, 1500);
            } else {
              setLoading(false);
              setError('Payment is being confirmed. Please refresh in a few moments.');
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setLoading(false);
          setError(err?.message || 'Error loading order details');
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  const tierId = order?.tierId || (sessionId.includes('master') ? 'master' : 'blueprint');
  const tier = PRODUCT_CATALOG[tierId] || PRODUCT_CATALOG.blueprint;

  const downloadToken = order?.downloadUrl?.split('token=')[1] || '';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      {/* Celebration Header */}
      <div className="text-center mb-10">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-2xl shadow-glow-gold mb-4 animate-bounce">
          <CheckCircle className="h-9 w-9 text-black" />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-300 uppercase tracking-widest mb-3">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Payment Confirmed & Fulfillment Autonomous</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-zinc-100 tracking-tight">
          Your Sacred 369 Blueprint is Ready
        </h1>
        <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto mt-3">
          Nikola Tesla’s harmonic universal matrix has been personalized for you. Instant download
          access is unlocked below with zero delay.
        </p>
      </div>

      {loading && (
        <div className="p-12 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-300">
            Synthesizing personalized dossier with pdf-lib...
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Applying sacred Pythagorean root reductions and vortex calibrations
          </p>
        </div>
      )}

      {error && !order && (
        <div className="p-6 text-center rounded-2xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-sm">
          <p className="font-bold">{error}</p>
          <div className="mt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
            >
              Return to 369com.co Home
            </Link>
          </div>
        </div>
      )}

      {order && (
        <div className="space-y-8">
          {/* Order Snapshot Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-6 sm:p-8 shadow-glow-gold">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {tier.name}
                </div>
                <h2 className="text-2xl font-black text-zinc-100 mt-1">
                  Digital Asset Delivery Center
                </h2>
                <div className="text-xs text-zinc-400 mt-1">
                  Recipient: <span className="text-zinc-200 font-semibold">{order.customerEmail || 'Authenticated Seeker'}</span>
                  {order.customerName && (
                    <> • Name: <span className="text-zinc-200 font-semibold">{order.customerName}</span></>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-zinc-400">Order Reference</div>
                <div className="font-mono text-xs font-bold text-amber-300">
                  {order.orderId || `ord_${sessionId.slice(0, 16)}`}
                </div>
                {isMock && (
                  <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40">
                    SANDBOX VERIFIED
                  </span>
                )}
              </div>
            </div>

            {/* Download Buttons Section */}
            <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primary PDF Download */}
              <a
                href={order.downloadUrl || `/api/download?token=${downloadToken}&asset=pdf`}
                download="Tesla-369-Manifestation-Blueprint.pdf"
                className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-all shadow-glow-gold group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                      Personalized 369 Blueprint
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Dynamically generated PDF (Ready)
                    </div>
                  </div>
                </div>
                <Download className="h-5 w-5 text-amber-400 group-hover:translate-y-0.5 transition-transform" />
              </a>

              {/* Master Audio Archive (or Solfeggio Audio Access) */}
              {tierId === 'master' ? (
                <a
                  href={`/api/download?token=${downloadToken}&asset=suite`}
                  download="369-Master-Sanctuary-Suite.zip"
                  className="flex items-center justify-between p-4 rounded-xl border border-purple-500/60 bg-purple-950/20 hover:bg-purple-950/40 transition-all shadow-glow-violet group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-zinc-100 group-hover:text-purple-300 transition-colors">
                        Solfeggio Master Suite
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Complete 9 Frequencies + Guide (ZIP)
                      </div>
                    </div>
                  </div>
                  <Download className="h-5 w-5 text-purple-400 group-hover:translate-y-0.5 transition-transform" />
                </a>
              ) : (
                <Link
                  href="/#synthesizer"
                  className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-amber-400/40 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400">
                      <Volume2 className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-zinc-100 group-hover:text-amber-300 transition-colors">
                        Launch 369Hz Synthesizer
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Stream Pure Harmonic In-Browser
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </div>

            {/* Quick Ritual Instructions */}
            <div className="mt-8 pt-6 border-t border-zinc-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                How to Begin Your 33-Day Manifestation Cycle:
              </h3>
              <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside">
                <li>
                  <strong className="text-zinc-100">Open your PDF:</strong> Print or keep your
                  personalized blueprint open on your tablet or journal.
                </li>
                <li>
                  <strong className="text-zinc-100">Morning (3x):</strong> Upon waking, write your
                  core intention 3 times while listening to the 369Hz Solfeggio frequency.
                </li>
                <li>
                  <strong className="text-zinc-100">Midday (6x):</strong> Amplify emotional gratitude
                  at midday by writing the intention 6 times.
                </li>
                <li>
                  <strong className="text-zinc-100">Evening (9x):</strong> Before sleep, write 9
                  repetitions to release the intention to universal consciousness.
                </li>
              </ol>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Lifetime DRM License Authenticated to {sessionId.slice(0, 16)}</span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/#chamber"
                className="inline-flex items-center gap-1.5 font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>Open 369 Chamber</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className="min-h-screen relative flex flex-col bg-[#090a10] text-zinc-100 overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-gradient-to-b from-amber-500/10 via-purple-600/5 to-transparent blur-3xl opacity-60" />
        <div className="absolute top-[500px] -right-[150px] w-[500px] h-[500px] bg-purple-600/10 blur-[140px] rounded-full" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-10 w-full border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-lg shadow-glow-gold">
              369
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-zinc-100 text-base">
                369COM<span className="text-amber-400">.CO</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono tracking-widest text-zinc-400 border-l border-zinc-700 pl-2">
                Fulfillment Center
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-amber-300 transition-colors"
          >
            ← Return to Chamber
          </Link>
        </div>
      </header>

      {/* Main Content wrapped in Suspense for App Router */}
      <div className="relative z-10 flex-1">
        <Suspense
          fallback={
            <div className="max-w-4xl mx-auto px-4 py-20 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">Loading fulfillment session...</p>
            </div>
          }
        >
          <SuccessContent />
        </Suspense>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-zinc-800 bg-zinc-950/90 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-300">369COM.CO</span>
            <span>• Resonance Lab & Manifestation Engine</span>
          </div>
          <div className="text-[11px] text-zinc-400">
            Automated Serverless Digital Delivery System • Zero COGS Architecture
          </div>
        </div>
      </footer>
    </main>
  );
}
