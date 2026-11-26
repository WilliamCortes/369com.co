import Stripe from 'stripe';
import { createHmac, timingSafeEqual } from 'crypto';
import { orderStore, generateDownloadToken } from './order-store';
import {
  PRODUCT_CATALOG,
  EMAIL_REGEX,
  isValidTier,
  isValidEmail,
  type PricingTier,
  type CheckoutRequest,
  type CheckoutResponse
} from './catalog';
import { hasValidPolarToken, createPolarCheckoutSession } from './polar';

export {
  PRODUCT_CATALOG,
  EMAIL_REGEX,
  isValidTier,
  isValidEmail,
  type PricingTier,
  type CheckoutRequest,
  type CheckoutResponse
};

export interface GatewayGuardResult {
  allowed: boolean;
  mode: 'live' | 'mock' | 'blocked';
  provider?: 'polar' | 'stripe' | 'mock';
  status: 200 | 503;
  error?: string;
}

let stripeClientInstance: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClientInstance) {
    return stripeClientInstance;
  }
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('Payment gateway configuration required: STRIPE_SECRET_KEY is not defined');
  }
  stripeClientInstance = new Stripe(key, {
    apiVersion: '2024-12-18.acacia' as any,
    typescript: true,
    appInfo: {
      name: '369com.co Resonance Engine',
      version: '1.0.0',
      url: 'https://369com.co'
    }
  });
  return stripeClientInstance;
}

export function evaluateGatewayGuard(env: Record<string, string | undefined> = process.env): GatewayGuardResult {
  const isProd = env.NODE_ENV === 'production';
  const mockPayments = env.MOCK_PAYMENTS === 'true';
  const allowMockInProd = env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION === 'true';
  const requestedProvider = env.PAYMENT_PROVIDER?.trim().toLowerCase();
  const stripeSecretKey = env.STRIPE_SECRET_KEY?.trim();
  const hasValidStripeKey = Boolean(
    stripeSecretKey &&
    !stripeSecretKey.includes('placeholder') &&
    (stripeSecretKey.startsWith('sk_live_') || stripeSecretKey.startsWith('sk_test_'))
  );
  const hasValidPolar = hasValidPolarToken(env);

  if (isProd) {
    if (mockPayments) {
      if (allowMockInProd) {
        return { allowed: true, mode: 'mock', provider: 'mock', status: 200 };
      }
      return {
        allowed: false,
        mode: 'blocked',
        status: 503,
        error: 'Payment gateway configuration required: MOCK_PAYMENTS is disabled in production'
      };
    }

    if (requestedProvider === 'polar') {
      if (!hasValidPolar) {
        return {
          allowed: false,
          mode: 'blocked',
          status: 503,
          error: 'Payment gateway configuration required: POLAR_ACCESS_TOKEN missing in production environment'
        };
      }
      return { allowed: true, mode: 'live', provider: 'polar', status: 200 };
    }

    if (requestedProvider === 'stripe') {
      if (!hasValidStripeKey) {
        return {
          allowed: false,
          mode: 'blocked',
          status: 503,
          error: 'Payment gateway configuration required: STRIPE_SECRET_KEY missing in production environment'
        };
      }
      return { allowed: true, mode: 'live', provider: 'stripe', status: 200 };
    }

    if (hasValidPolar) {
      return { allowed: true, mode: 'live', provider: 'polar', status: 200 };
    }

    if (!hasValidStripeKey) {
      return {
        allowed: false,
        mode: 'blocked',
        status: 503,
        error: 'Payment gateway configuration required: STRIPE_SECRET_KEY missing in production environment'
      };
    }

    return { allowed: true, mode: 'live', provider: 'stripe', status: 200 };
  }

  // Non-production (development, test, CI)
  if (mockPayments) {
    return { allowed: true, mode: 'mock', provider: 'mock', status: 200 };
  }

  if (requestedProvider === 'polar' && hasValidPolar) {
    return { allowed: true, mode: 'live', provider: 'polar', status: 200 };
  }

  if (hasValidStripeKey && requestedProvider !== 'polar') {
    return { allowed: true, mode: 'live', provider: 'stripe', status: 200 };
  }

  if (hasValidPolar && requestedProvider !== 'stripe') {
    return { allowed: true, mode: 'live', provider: 'polar', status: 200 };
  }

  return { allowed: true, mode: 'mock', provider: 'mock', status: 200 };
}

export function isMockPaymentsEnabled(): boolean {
  const guard = evaluateGatewayGuard();
  return guard.mode === 'mock';
}

export function createMockCheckoutSession(
  req: CheckoutRequest,
  origin: string = ''
): CheckoutResponse {
  if (!isValidTier(req.tierId)) {
    const error = new Error('Invalid tier specified');
    (error as any).status = 400;
    throw error;
  }

  if (req.customerEmail && !isValidEmail(req.customerEmail)) {
    const error = new Error('Invalid customer email format');
    (error as any).status = 400;
    throw error;
  }

  const sessionId = `mock_cs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const cleanOrigin = origin ? origin.replace(/\/+$/, '') : '';
  const url = `${cleanOrigin}/success?session_id=${sessionId}&mock=true`;

  // Auto-fulfill in mock mode so post-checkout download is immediately ready
  const customerEmail = req.customerEmail || 'seeker@369com.co';
  const token = generateDownloadToken({
    sessionId,
    tierId: req.tierId,
    email: customerEmail,
    name: req.customerName || 'Cosmic Seeker',
    intention: req.intention || ''
  });

  orderStore.saveOrder({
    orderId: `ord_${sessionId}`,
    sessionId,
    tierId: req.tierId,
    customerEmail,
    customerName: req.customerName,
    intention: req.intention,
    status: 'fulfilled',
    createdAt: new Date().toISOString(),
    downloadToken: token,
    numerologyData: req.numerologyData
  });

  return {
    success: true,
    sessionId,
    url,
    mock: true
  };
}

export async function createCheckoutSession(
  req: CheckoutRequest,
  origin: string = ''
): Promise<CheckoutResponse> {
  if (!isValidTier(req.tierId)) {
    const error = new Error('Invalid tier specified');
    (error as any).status = 400;
    throw error;
  }

  if (req.customerEmail && !isValidEmail(req.customerEmail)) {
    const error = new Error('Invalid customer email format');
    (error as any).status = 400;
    throw error;
  }

  const guard = evaluateGatewayGuard();
  if (!guard.allowed) {
    const error = new Error(guard.error || 'Payment gateway configuration required');
    (error as any).status = guard.status;
    throw error;
  }

  if (guard.mode === 'mock') {
    return createMockCheckoutSession(req, origin);
  }

  if (guard.provider === 'polar') {
    return createPolarCheckoutSession(req, origin);
  }

  const stripe = getStripeClient();
  const tier = PRODUCT_CATALOG[req.tierId];
  const cleanOrigin = origin ? origin.replace(/\/+$/, '') : 'https://369com.co';

  const clampedIntention = (req.intention || '').slice(0, 500);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: tier.cents,
          product_data: {
            name: tier.name,
            description: tier.features.join(' • ')
          }
        },
        quantity: 1
      }
    ],
    mode: 'payment',
    customer_email: req.customerEmail || undefined,
    success_url: `${cleanOrigin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cleanOrigin}/#pricing`,
    metadata: {
      tierId: req.tierId,
      customerEmail: req.customerEmail || '',
      customerName: req.customerName || '',
      intention: clampedIntention,
      lifePath: req.numerologyData?.lifePath ? String(req.numerologyData.lifePath) : '',
      resonanceScore: req.numerologyData?.resonance369Score ? String(req.numerologyData.resonance369Score) : ''
    }
  });

  return {
    success: true,
    sessionId: session.id,
    url: session.url || ''
  };
}

// -----------------------------------------------------------------------------
// Webhook Cryptographic Verification Utilities
// -----------------------------------------------------------------------------

export function generateStripeSignature(
  rawBody: string,
  secret: string,
  timestamp: number = Math.floor(Date.now() / 1000)
): string {
  const signaturePayload = `${timestamp}.${rawBody}`;
  const hmac = createHmac('sha256', secret).update(signaturePayload).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

export function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  toleranceSec = 300
): { valid: boolean; error?: string } {
  if (!signatureHeader || signatureHeader.trim().length === 0) {
    return { valid: false, error: 'Missing stripe-signature header' };
  }

  const parts = signatureHeader.split(',').reduce<Record<string, string>>((acc, item) => {
    const [k, v] = item.split('=');
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const t = parseInt(parts['t'] || '0', 10);
  const v1 = parts['v1'];

  if (!t || !v1) {
    return { valid: false, error: 'Malformed stripe-signature header scheme' };
  }

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - t) > toleranceSec) {
    return {
      valid: false,
      error: 'Webhook signature verification failed: Timestamp outside the tolerance zone'
    };
  }

  const expectedHmac = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');

  const v1Buf = Buffer.from(v1, 'hex');
  const expBuf = Buffer.from(expectedHmac, 'hex');

  if (v1Buf.length !== expBuf.length || !timingSafeEqual(v1Buf, expBuf)) {
    return {
      valid: false,
      error: 'Webhook signature verification failed: Signature mismatch'
    };
  }

  return { valid: true };
}

export interface SimulateWebhookOptions {
  sessionId?: string;
  tierId?: string;
  customerEmail?: string;
  customerName?: string;
  intention?: string;
  secret?: string;
  timestamp?: number;
  tamperPayload?: boolean;
}

export function simulateWebhookEvent(options: SimulateWebhookOptions = {}) {
  const sessionId = options.sessionId || `mock_cs_${Date.now()}_test`;
  const tierId = options.tierId || 'blueprint';
  const tier = (options.tierId && isValidTier(options.tierId)) ? PRODUCT_CATALOG[options.tierId] : PRODUCT_CATALOG.blueprint;
  const customerEmail = options.customerEmail || 'seeker@369com.co';
  const intention = options.intention || 'Universal alignment and prosperity';
  const secret = options.secret || process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_test_secret_32_characters';
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000);

  const eventObject = {
    id: `evt_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    object: 'event',
    api_version: '2024-12-18.acacia',
    created: timestamp,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        amount_total: tier.cents,
        currency: 'usd',
        customer_email: customerEmail,
        payment_status: 'paid',
        status: 'complete',
        metadata: {
          tierId,
          customerEmail,
          customerName: options.customerName || 'Cosmic Seeker',
          intention: intention.slice(0, 500)
        }
      }
    }
  };

  let rawBody = JSON.stringify(eventObject);
  const signatureHeader = generateStripeSignature(rawBody, secret, timestamp);

  if (options.tamperPayload) {
    rawBody = JSON.stringify({ ...eventObject, tampered: true });
  }

  return {
    event: eventObject,
    rawBody,
    signatureHeader
  };
}
