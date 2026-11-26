'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { formatCop } from '@/lib/catalog';

interface ClaimPreview {
  orderId: string;
  tierId: string;
  email: string;
  name: string;
  intention: string;
  transferReference: string;
  amountCop: number;
  createdAt: string;
}

interface ApprovedResult {
  orderId: string;
  tierId: string;
  customerEmail: string;
  successUrl: string;
  downloadUrl: string;
}

function BrebAdminContent() {
  const searchParams = useSearchParams();
  const claimFromUrl = searchParams.get('claim') || '';

  const [claimToken, setClaimToken] = useState(claimFromUrl);
  const [adminKey, setAdminKey] = useState('');
  const [claim, setClaim] = useState<ClaimPreview | null>(null);
  const [approved, setApproved] = useState<ApprovedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('369_breb_admin_key');
      if (saved) setAdminKey(saved);
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  useEffect(() => {
    if (claimFromUrl) {
      setClaimToken(claimFromUrl);
    }
  }, [claimFromUrl]);

  const persistAdminKey = (key: string) => {
    try {
      sessionStorage.setItem('369_breb_admin_key', key);
    } catch {
      // Ignore storage restrictions
    }
  };

  const handlePreview = async () => {
    if (!claimToken.trim() || !adminKey.trim()) {
      setError('Ingresa tu clave de administrador y el token del pedido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: claimToken.trim(),
          adminKey: adminKey.trim(),
          previewOnly: true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.claim) {
        throw new Error(data.error || 'No se pudo validar el token del pedido');
      }
      persistAdminKey(adminKey.trim());
      setClaim(data.claim);
    } catch (err: any) {
      setError(err?.message || 'Error validando solicitud Bre-B');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!claimToken.trim() || !adminKey.trim()) {
      setError('Ingresa tu clave de administrador y el token del pedido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: claimToken.trim(),
          adminKey: adminKey.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error aprobando pedido');
      }
      persistAdminKey(adminKey.trim());
      setApproved(data);
    } catch (err: any) {
      setError(err?.message || 'No se pudo aprobar la orden');
    } finally {
      setLoading(false);
    }
  };

  const copyClientLink = async () => {
    if (!approved?.successUrl) return;
    try {
      await navigator.clipboard.writeText(approved.successUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver a 369com.co</span>
        </Link>
      </div>

      <div className="rounded-3xl border border-amber-500/30 bg-zinc-900/70 p-6 sm:p-8 shadow-glow-gold">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-4">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Bre-B Admin Verification</span>
        </div>

        <h1 className="text-2xl font-black text-zinc-100">
          Aprobar transferencia Bre-B
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Confirma primero en tu app bancaria que el dinero llegó a <strong>@3103298346</strong> antes de generar el enlace de descarga.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Clave de administrador (`BRE_B_ADMIN_KEY`)
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Tu clave privada de aprobación"
                className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Token del pedido (`claim`)
            </label>
            <textarea
              rows={3}
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value)}
              placeholder="Pega aquí el claim token enviado por el cliente"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handlePreview}
              disabled={loading}
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 px-4 text-xs font-bold text-zinc-200 hover:border-zinc-500 disabled:opacity-50 cursor-pointer"
            >
              Ver detalles del pedido
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 px-4 text-xs font-black text-black hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
              <span>Confirmar y generar descarga</span>
            </button>
          </div>
        </div>

        {claim && !approved && (
          <div className="mt-6 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 text-xs space-y-2">
            <div className="font-bold text-amber-300">Resumen del comprobante</div>
            <div className="text-zinc-300">Orden: <span className="font-mono">{claim.orderId}</span></div>
            <div className="text-zinc-300">Plan: <strong className="uppercase">{claim.tierId}</strong> — <strong>{formatCop(claim.amountCop)}</strong></div>
            <div className="text-zinc-300">Cliente: {claim.name} ({claim.email})</div>
            <div className="text-zinc-300">Referencia reportada: <span className="font-mono text-emerald-300">{claim.transferReference}</span></div>
          </div>
        )}

        {approved && (
          <div className="mt-6 p-5 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle className="h-4 w-4" />
              <span>Orden {approved.orderId} aprobada</span>
            </div>
            <p className="text-zinc-300">
              Envía este enlace VIP de descarga a <strong>{approved.customerEmail}</strong>:
            </p>
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-amber-200 break-all">
              {approved.successUrl}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyClientLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 text-black font-bold px-3.5 py-2 hover:bg-emerald-400 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedUrl ? 'Enlace copiado' : 'Copiar enlace VIP'}</span>
              </button>
              <a
                href={approved.successUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2 font-semibold text-zinc-200 hover:border-amber-400"
              >
                <span>Abrir portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrebAdminPage() {
  return (
    <main className="min-h-screen bg-[#090a10] text-zinc-100">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center text-xs text-zinc-400">
            Cargando verificador Bre-B...
          </div>
        }
      >
        <BrebAdminContent />
      </Suspense>
    </main>
  );
}
