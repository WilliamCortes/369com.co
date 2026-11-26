import { createHmac, timingSafeEqual } from 'crypto';
import {
  DEFAULT_BREB_KEY,
  PRODUCT_CATALOG,
  isValidTier,
  isValidEmail,
  getCopAmountForTier,
  formatCop,
  type NumerologySnapshot
} from './catalog';
import {
  orderStore,
  getDownloadSigningSecret,
  generateDownloadToken,
  type OrderRecord
} from './order-store';

export interface BrebClaimPayload {
  type: 'breb_claim';
  orderId: string;
  sessionId: string;
  tierId: string;
  email: string;
  name: string;
  intention: string;
  transferReference: string;
  amountCop: number;
  numerologyData?: NumerologySnapshot;
  createdAt: string;
  iat: number;
  exp: number;
}

export function getBrebKey(env: Record<string, string | undefined> = process.env): string {
  return (env.BRE_B_KEY || env.NEXT_PUBLIC_BREB_KEY || DEFAULT_BREB_KEY).trim();
}

export function getBrebWhatsappNumber(
  env: Record<string, string | undefined> = process.env
): string {
  const configured = env.BRE_B_WHATSAPP_NUMBER?.trim();
  if (configured) {
    return configured.replace(/[^\d]/g, '');
  }
  const digits = getBrebKey(env).replace(/[^\d]/g, '');
  if (digits.length === 10) {
    return `57${digits}`;
  }
  return digits || '573103298346';
}

export function getBrebAdminKey(
  env: Record<string, string | undefined> = process.env
): string {
  const configured = env.BRE_B_ADMIN_KEY?.trim() || '';
  const isProd = env.NODE_ENV === 'production';

  if (isProd) {
    if (!configured || configured.includes('placeholder')) {
      throw new Error('Production security guard: BRE_B_ADMIN_KEY must be configured');
    }
    return configured;
  }

  return configured || 'breb_dev_admin_key_local_only';
}

export function verifyBrebAdminKey(
  candidate: string | undefined | null,
  env: Record<string, string | undefined> = process.env
): { valid: boolean; error?: string; status?: 401 | 500 } {
  if (!candidate || typeof candidate !== 'string' || !candidate.trim()) {
    return { valid: false, error: 'Admin verification key required', status: 401 };
  }

  let expected: string;
  try {
    expected = getBrebAdminKey(env);
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Admin key unconfigured', status: 500 };
  }

  const candBuf = Buffer.from(candidate.trim(), 'utf-8');
  const expBuf = Buffer.from(expected, 'utf-8');
  if (candBuf.length !== expBuf.length || !timingSafeEqual(candBuf, expBuf)) {
    return { valid: false, error: 'Invalid Bre-B admin verification key', status: 401 };
  }

  return { valid: true };
}

export function createBrebClaimToken(
  data: {
    orderId: string;
    sessionId: string;
    tierId: string;
    email: string;
    name: string;
    intention?: string;
    transferReference: string;
    amountCop: number;
    numerologyData?: NumerologySnapshot;
    createdAt?: string;
  },
  secret?: string,
  expiresInSec: number = 86400 * 14
): string {
  const signingSecret = secret || getDownloadSigningSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payloadObj: BrebClaimPayload = {
    type: 'breb_claim',
    orderId: data.orderId,
    sessionId: data.sessionId,
    tierId: data.tierId,
    email: data.email,
    name: data.name,
    intention: data.intention || '',
    transferReference: data.transferReference,
    amountCop: data.amountCop,
    numerologyData: data.numerologyData,
    createdAt: data.createdAt || new Date().toISOString(),
    iat: now,
    exp: now + expiresInSec
  };

  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = createHmac('sha256', signingSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export function verifyBrebClaimToken(
  token: string,
  secret?: string
): { valid: boolean; claim?: BrebClaimPayload; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Missing Bre-B claim token' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed Bre-B claim token' };
  }

  let signingSecret: string;
  try {
    signingSecret = secret || getDownloadSigningSecret();
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Signing secret unconfigured' };
  }

  const [header, payload, signature] = parts;
  const expectedSig = createHmac('sha256', signingSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Invalid Bre-B claim signature' };
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as BrebClaimPayload;
    if (parsed.type !== 'breb_claim' || !isValidTier(parsed.tierId)) {
      return { valid: false, error: 'Invalid Bre-B claim payload' };
    }
    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp && parsed.exp < now) {
      return { valid: false, error: 'Bre-B claim token expired' };
    }
    return { valid: true, claim: parsed };
  } catch {
    return { valid: false, error: 'Failed to decode Bre-B claim payload' };
  }
}

export function createPendingBrebOrder(
  input: {
    tierId: string;
    customerEmail: string;
    customerName?: string;
    intention?: string;
    transferReference: string;
    numerologyData?: NumerologySnapshot;
  },
  origin: string = 'https://369com.co',
  env: Record<string, string | undefined> = process.env
) {
  if (!isValidTier(input.tierId)) {
    const err = new Error('Invalid tier specified');
    (err as any).status = 400;
    throw err;
  }
  if (!isValidEmail(input.customerEmail)) {
    const err = new Error('Valid email is required for Bre-B delivery');
    (err as any).status = 400;
    throw err;
  }

  const cleanRef = (input.transferReference || '').trim().slice(0, 120);
  if (cleanRef.length < 4) {
    const err = new Error('Transfer reference or receipt code must be at least 4 characters');
    (err as any).status = 400;
    throw err;
  }

  const email = input.customerEmail.trim();
  const name = (input.customerName || '').trim().slice(0, 120) || 'Cosmic Seeker';
  const intention = (input.intention || '').trim().slice(0, 500);
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderId = `breb_${Date.now()}_${rand}`;
  const sessionId = `breb_cs_${Date.now()}_${rand.toLowerCase()}`;
  const rateRaw = env.BRE_B_USD_TO_COP || env.NEXT_PUBLIC_BREB_USD_TO_COP;
  const rate = rateRaw && Number(rateRaw) > 0 ? Number(rateRaw) : undefined;
  const amountCop = getCopAmountForTier(input.tierId, rate);
  const brebKey = getBrebKey(env);
  const createdAt = new Date().toISOString();

  // Persist pending order without downloadToken until verified by owner
  orderStore.saveOrder({
    orderId,
    sessionId,
    tierId: input.tierId,
    customerEmail: email,
    customerName: name,
    intention,
    status: 'pending',
    createdAt,
    numerologyData: input.numerologyData
  });

  const claimToken = createBrebClaimToken({
    orderId,
    sessionId,
    tierId: input.tierId,
    email,
    name,
    intention,
    transferReference: cleanRef,
    amountCop,
    numerologyData: input.numerologyData,
    createdAt
  });

  const cleanOrigin = (origin || 'https://369com.co').replace(/\/+$/, '');
  const adminVerifyUrl = `${cleanOrigin}/breb-admin?claim=${encodeURIComponent(claimToken)}`;
  const tierName = PRODUCT_CATALOG[input.tierId].name;
  const waPhone = getBrebWhatsappNumber(env);
  const waText = [
    `Hola! Ya transferi por Bre-B a la llave ${brebKey} en 369com.co`,
    `Orden: ${orderId}`,
    `Plan: ${tierName} (${formatCop(amountCop)})`,
    `Correo: ${email}`,
    `Comprobante/Ref: ${cleanRef}`,
    `Aprobar entrega: ${adminVerifyUrl}`
  ].join('\n');

  const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;

  return {
    success: true,
    orderId,
    sessionId,
    brebKey,
    amountCop,
    amountCopFormatted: formatCop(amountCop),
    claimToken,
    whatsappUrl
  };
}

export function approveBrebClaim(
  claimToken: string,
  adminKey: string,
  origin: string = 'https://369com.co',
  env: Record<string, string | undefined> = process.env
): {
  order: OrderRecord;
  downloadToken: string;
  successUrl: string;
  downloadUrl: string;
} {
  const adminCheck = verifyBrebAdminKey(adminKey, env);
  if (!adminCheck.valid) {
    const err = new Error(adminCheck.error || 'Unauthorized');
    (err as any).status = adminCheck.status || 401;
    throw err;
  }

  const verified = verifyBrebClaimToken(claimToken);
  if (!verified.valid || !verified.claim) {
    const err = new Error(verified.error || 'Invalid Bre-B claim token');
    (err as any).status = 400;
    throw err;
  }

  const claim = verified.claim;
  const downloadToken = generateDownloadToken({
    sessionId: claim.sessionId,
    tierId: claim.tierId,
    email: claim.email,
    name: claim.name,
    intention: claim.intention,
    numerologyData: claim.numerologyData
  });

  const order: OrderRecord = {
    orderId: claim.orderId,
    sessionId: claim.sessionId,
    tierId: claim.tierId,
    customerEmail: claim.email,
    customerName: claim.name,
    intention: claim.intention,
    status: 'fulfilled',
    createdAt: claim.createdAt,
    downloadToken,
    numerologyData: claim.numerologyData
  };

  orderStore.saveOrder(order);

  const cleanOrigin = (origin || env.NEXT_PUBLIC_APP_URL || 'https://369com.co').replace(/\/+$/, '');
  return {
    order,
    downloadToken,
    successUrl: `${cleanOrigin}/success?token=${encodeURIComponent(downloadToken)}`,
    downloadUrl: `${cleanOrigin}/api/download?token=${encodeURIComponent(downloadToken)}`
  };
}
