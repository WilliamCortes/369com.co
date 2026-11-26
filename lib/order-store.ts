import { createHmac, timingSafeEqual } from 'crypto';

export interface OrderRecord {
  orderId: string;
  sessionId: string;
  tierId: string;
  customerEmail: string;
  customerName?: string;
  intention?: string;
  status: 'pending' | 'fulfilled' | 'refunded';
  createdAt: string;
  downloadToken?: string;
  numerologyData?: any;
}

export interface IOrderStore {
  hasEvent(eventId: string): boolean | Promise<boolean>;
  recordEvent(eventId: string): void | Promise<void>;
  saveOrder(order: OrderRecord): void | Promise<void>;
  getOrder(sessionId: string): OrderRecord | undefined | Promise<OrderRecord | undefined>;
  getOrderByOrderId(orderId: string): OrderRecord | undefined | Promise<OrderRecord | undefined>;
  clear(): void;
}

export class InMemoryOrderStore implements IOrderStore {
  private ordersBySession: Map<string, OrderRecord> = new Map();
  private ordersById: Map<string, OrderRecord> = new Map();
  private processedEvents: Set<string> = new Set();

  hasEvent(eventId: string): boolean {
    return this.processedEvents.has(eventId);
  }

  recordEvent(eventId: string): void {
    this.processedEvents.add(eventId);
  }

  saveOrder(order: OrderRecord): void {
    this.ordersBySession.set(order.sessionId, order);
    this.ordersById.set(order.orderId, order);
  }

  getOrder(sessionId: string): OrderRecord | undefined {
    return this.ordersBySession.get(sessionId);
  }

  getOrderByOrderId(orderId: string): OrderRecord | undefined {
    return this.ordersById.get(orderId);
  }

  markOrderRefunded(orderIdOrSessionId: string): boolean {
    const order =
      this.ordersById.get(orderIdOrSessionId) || this.ordersBySession.get(orderIdOrSessionId);
    if (!order) return false;
    order.status = 'refunded';
    return true;
  }

  clear(): void {
    this.ordersBySession.clear();
    this.ordersById.clear();
    this.processedEvents.clear();
  }
}

// Global singleton for serverless warm instance memory preservation
declare global {
  // eslint-disable-next-line no-var
  var __369_order_store: InMemoryOrderStore | undefined;
}

export const orderStore: InMemoryOrderStore =
  globalThis.__369_order_store || (globalThis.__369_order_store = new InMemoryOrderStore());

// -----------------------------------------------------------------------------
// Digital Rights Management (DRM) Download Token Utilities
// -----------------------------------------------------------------------------

export function getDownloadSigningSecret(env: Record<string, string | undefined> = process.env): string {
  const secret = (
    env.DOWNLOAD_SIGNING_SECRET ||
    env.FULFILLMENT_JWT_SECRET ||
    env.POLAR_WEBHOOK_SECRET ||
    env.STRIPE_WEBHOOK_SECRET ||
    ''
  ).trim();

  const isProd = env.NODE_ENV === 'production';
  const allowMockInProd = env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION === 'true';

  const isPlaceholderOrUnset =
    !secret ||
    secret.includes('placeholder') ||
    secret === 'whsec_fulfillment_token_secret_min_32_characters';

  if (isProd) {
    if (isPlaceholderOrUnset) {
      if (allowMockInProd) {
        return 'whsec_fulfillment_token_secret_min_32_characters';
      }
      throw new Error(
        'Production security guard: DOWNLOAD_SIGNING_SECRET, FULFILLMENT_JWT_SECRET, or STRIPE_WEBHOOK_SECRET must be configured with a non-placeholder secret in production environment.'
      );
    }
    return secret;
  }

  // Non-production fallback (development, test, CI)
  return secret || 'whsec_fulfillment_token_secret_min_32_characters';
}

export function generateDownloadToken(
  claims: { sessionId: string; tierId: string; email: string; [key: string]: any },
  secret?: string,
  expiresInSec: number = 86400 * 7 // 7 days default
): string {
  const signingSecret = secret || getDownloadSigningSecret();
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      ...claims,
      iat: now,
      exp: now + expiresInSec
    })
  ).toString('base64url');

  const signature = createHmac('sha256', signingSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyDownloadToken(
  token: string,
  secret?: string
): { valid: boolean; claims?: any; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Invalid or missing token string' };
  }

  const segments = token.split('.');
  if (segments.length !== 3) {
    return { valid: false, error: 'Malformed token structure' };
  }

  let signingSecret: string;
  try {
    signingSecret = secret || getDownloadSigningSecret();
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Download signing secret unconfigured in production environment'
    };
  }

  const [header, payload, signature] = segments;
  const expectedSig = createHmac('sha256', signingSecret).update(`${header}.${payload}`).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: 'Download token invalid or tampered' };
  }

  try {
    const parsedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    const now = Math.floor(Date.now() / 1000);
    if (parsedPayload.exp && parsedPayload.exp < now) {
      return { valid: false, error: 'Download token has expired' };
    }
    return { valid: true, claims: parsedPayload };
  } catch {
    return { valid: false, error: 'Failed to decode token payload JSON' };
  }
}
