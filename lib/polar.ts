import { createPolar, webhooks, type Polar } from '@polar-sh/sdk/2027-01';
import {
  PRODUCT_CATALOG,
  isValidTier,
  extractNumerologyMetadata,
  type CheckoutRequest,
  type CheckoutResponse
} from './catalog';
import { orderStore, generateDownloadToken, type OrderRecord } from './order-store';

export const POLAR_PRODUCT_ENV_KEYS: Record<keyof typeof PRODUCT_CATALOG, string> = {
  starter: 'POLAR_PRODUCT_ID_STARTER',
  blueprint: 'POLAR_PRODUCT_ID_BLUEPRINT',
  pro: 'POLAR_PRODUCT_ID_PRO',
  master: 'POLAR_PRODUCT_ID_MASTER'
};

export function hasValidPolarToken(env: Record<string, string | undefined> = process.env): boolean {
  const token = env.POLAR_ACCESS_TOKEN?.trim();
  return Boolean(
    token &&
      !token.includes('placeholder') &&
      (token.startsWith('polar_oat_') || token.startsWith('polar_uat_'))
  );
}

export function hasValidPolarWebhookSecret(
  env: Record<string, string | undefined> = process.env
): boolean {
  const secret = env.POLAR_WEBHOOK_SECRET?.trim();
  return Boolean(secret && !secret.includes('placeholder'));
}

export function getPolarClient(env: Record<string, string | undefined> = process.env): Polar {
  const accessToken = env.POLAR_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    throw new Error('Payment gateway configuration required: POLAR_ACCESS_TOKEN is not defined');
  }
  const environment = env.POLAR_ENVIRONMENT?.trim() === 'sandbox' ? 'sandbox' : 'production';
  return createPolar({ accessToken, environment });
}

function buildPolarMetadata(req: CheckoutRequest): Record<string, string | number | boolean> {
  const meta: Record<string, string | number | boolean> = {
    tierId: req.tierId
  };

  if (req.customerEmail?.trim()) {
    meta.customerEmail = req.customerEmail.trim().slice(0, 500);
  }
  if (req.customerName?.trim()) {
    meta.customerName = req.customerName.trim().slice(0, 500);
  }
  if (req.intention?.trim()) {
    meta.intention = req.intention.trim().slice(0, 500);
  }

  const num = req.numerologyData;
  if (num) {
    if (typeof num.birthDate === 'string' && num.birthDate.trim()) {
      meta.birthDate = num.birthDate.trim().slice(0, 64);
    }
    if (typeof num.lifePath === 'number' && Number.isFinite(num.lifePath)) {
      meta.lifePath = num.lifePath;
    }
    if (typeof num.lifePathTitle === 'string' && num.lifePathTitle.trim()) {
      meta.lifePathTitle = num.lifePathTitle.trim().slice(0, 120);
    }
    if (typeof num.teslaNode === 'number' && Number.isFinite(num.teslaNode)) {
      meta.teslaNode = num.teslaNode;
    }
    if (typeof num.resonance369Score === 'number' && Number.isFinite(num.resonance369Score)) {
      meta.resonanceScore = num.resonance369Score;
    }
    if (typeof num.dominantElement === 'string' && num.dominantElement.trim()) {
      meta.dominantElement = num.dominantElement.trim().slice(0, 80);
    }
  }

  return meta;
}

/**
 * Resolves the Polar product ID for a catalog tier using env vars first,
 * then remote lookup by metadata/name, creating the product automatically if absent.
 */
export async function resolvePolarProductId(
  tierId: keyof typeof PRODUCT_CATALOG,
  client: Polar = getPolarClient(),
  env: Record<string, string | undefined> = process.env
): Promise<string> {
  const envKey = POLAR_PRODUCT_ENV_KEYS[tierId];
  const configuredId = env[envKey]?.trim();
  if (configuredId && !configuredId.includes('placeholder')) {
    return configuredId;
  }

  const tier = PRODUCT_CATALOG[tierId];
  const list = await client.products.list({ limit: 50 });
  const existing = (list.items || []).find(
    (product) =>
      !product.is_archived &&
      (product.metadata?.tierId === tierId || product.name === tier.name)
  );
  if (existing) {
    return existing.id;
  }

  const created = await client.products.create({
    name: tier.name,
    description: tier.features.join(' • '),
    metadata: { tierId },
    prices: [
      {
        amount_type: 'fixed',
        price_amount: tier.cents,
        price_currency: 'usd'
      }
    ]
  });

  return created.id;
}

export function resolveTierIdFromPolarData(
  metadata?: Record<string, unknown> | null,
  productId?: string | null,
  productMetadata?: Record<string, unknown> | null,
  env: Record<string, string | undefined> = process.env
): string {
  const metaTier = metadata?.tierId ?? productMetadata?.tierId;
  if (isValidTier(metaTier)) {
    return metaTier;
  }

  if (productId) {
    for (const [tierId, envKey] of Object.entries(POLAR_PRODUCT_ENV_KEYS)) {
      if (env[envKey]?.trim() === productId) {
        return tierId;
      }
    }
  }

  return 'blueprint';
}

export async function createPolarCheckoutSession(
  req: CheckoutRequest,
  origin: string = '',
  env: Record<string, string | undefined> = process.env,
  client?: Polar
): Promise<CheckoutResponse> {
  if (!isValidTier(req.tierId)) {
    const error = new Error('Invalid tier specified');
    (error as any).status = 400;
    throw error;
  }

  const polar = client || getPolarClient(env);
  const productId = await resolvePolarProductId(req.tierId, polar, env);
  const cleanOrigin = origin ? origin.replace(/\/+$/, '') : 'https://369com.co';

  const checkout = await polar.checkouts.create({
    products: [productId],
    success_url: `${cleanOrigin}/success?session_id={CHECKOUT_ID}`,
    return_url: `${cleanOrigin}/#pricing`,
    customer_email: req.customerEmail?.trim() || undefined,
    customer_name: req.customerName?.trim() || undefined,
    metadata: buildPolarMetadata(req)
  });

  return {
    success: true,
    sessionId: checkout.id,
    url: checkout.url,
    provider: 'polar'
  };
}

export async function verifyAndParsePolarWebhook(
  rawBody: string | Uint8Array,
  headers: Record<string, string>,
  secret: string
) {
  return webhooks.validateEvent(rawBody, headers, secret);
}

export function createFulfilledOrderRecord(params: {
  orderId: string;
  sessionId: string;
  tierId: string;
  customerEmail: string;
  customerName?: string;
  intention?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}): OrderRecord {
  const numerologyData = extractNumerologyMetadata(params.metadata);
  const token = generateDownloadToken({
    sessionId: params.sessionId,
    tierId: params.tierId,
    email: params.customerEmail,
    name: params.customerName || 'Cosmic Seeker',
    intention: params.intention || '',
    numerologyData
  });

  const record: OrderRecord = {
    orderId: params.orderId,
    sessionId: params.sessionId,
    tierId: params.tierId,
    customerEmail: params.customerEmail,
    customerName: params.customerName,
    intention: params.intention,
    status: 'fulfilled',
    createdAt: params.createdAt || new Date().toISOString(),
    downloadToken: token,
    numerologyData
  };

  orderStore.saveOrder(record);
  return record;
}

export function fulfillPolarOrderFromEvent(
  eventType: string,
  data: any,
  env: Record<string, string | undefined> = process.env
): OrderRecord | null {
  if (!data || typeof data !== 'object') return null;

  if (eventType === 'order.paid' || (eventType === 'order.created' && data.paid === true)) {
    const sessionId = String(data.checkout_id || data.id);
    const orderId = String(data.id);
    const metadata = (data.metadata || {}) as Record<string, unknown>;
    const tierId = resolveTierIdFromPolarData(
      metadata,
      data.product_id,
      data.product?.metadata,
      env
    );
    const customerEmail = String(
      data.customer?.email || metadata.customerEmail || 'seeker@369com.co'
    );
    const customerName = String(
      data.customer?.name || data.billing_name || metadata.customerName || 'Cosmic Seeker'
    );
    const intention =
      typeof metadata.intention === 'string' && metadata.intention.trim()
        ? metadata.intention.trim()
        : undefined;

    return createFulfilledOrderRecord({
      orderId,
      sessionId,
      tierId,
      customerEmail,
      customerName,
      intention,
      metadata,
      createdAt: data.created_at
    });
  }

  if (eventType === 'checkout.updated' && data.status === 'succeeded') {
    const sessionId = String(data.id);
    const existing = orderStore.getOrder(sessionId);
    if (existing && existing.status === 'fulfilled') {
      return existing;
    }

    const metadata = (data.metadata || {}) as Record<string, unknown>;
    const tierId = resolveTierIdFromPolarData(
      metadata,
      data.product_id,
      data.product?.metadata,
      env
    );
    const customerEmail = String(
      data.customer_email || metadata.customerEmail || 'seeker@369com.co'
    );
    const customerName = String(
      data.customer_name || data.customer_billing_name || metadata.customerName || 'Cosmic Seeker'
    );
    const intention =
      typeof metadata.intention === 'string' && metadata.intention.trim()
        ? metadata.intention.trim()
        : undefined;

    return createFulfilledOrderRecord({
      orderId: `ord_polar_${sessionId.slice(0, 18)}`,
      sessionId,
      tierId,
      customerEmail,
      customerName,
      intention,
      metadata,
      createdAt: data.created_at
    });
  }

  return null;
}

/**
 * Fallback verification against Polar API when Vercel serverless invokes /api/order/status
 * on a different instance than the one that received the webhook.
 */
export async function syncPolarCheckoutStatus(
  sessionId: string,
  env: Record<string, string | undefined> = process.env,
  client?: Polar
): Promise<{ status: 'fulfilled' | 'pending' | 'failed' | 'expired'; order?: OrderRecord }> {
  const existing = orderStore.getOrder(sessionId);
  if (existing) {
    return {
      status: existing.status === 'fulfilled' ? 'fulfilled' : 'pending',
      order: existing
    };
  }

  if (!hasValidPolarToken(env)) {
    return { status: 'pending' };
  }

  try {
    const polar = client || getPolarClient(env);
    const checkout = await polar.checkouts.get(sessionId);

    if (checkout.status === 'succeeded') {
      const metadata = (checkout.metadata || {}) as Record<string, unknown>;
      const tierId = resolveTierIdFromPolarData(
        metadata,
        checkout.product_id,
        undefined,
        env
      );
      const customerEmail = String(
        checkout.customer_email || metadata.customerEmail || 'seeker@369com.co'
      );
      const customerName = String(
        checkout.customer_name ||
          checkout.customer_billing_name ||
          metadata.customerName ||
          'Cosmic Seeker'
      );
      const intention =
        typeof metadata.intention === 'string' && metadata.intention.trim()
          ? metadata.intention.trim()
          : undefined;

      const order = createFulfilledOrderRecord({
        orderId: `ord_polar_${checkout.id.slice(0, 18)}`,
        sessionId: checkout.id,
        tierId,
        customerEmail,
        customerName,
        intention,
        metadata,
        createdAt: checkout.created_at
      });

      return { status: 'fulfilled', order };
    }

    if (checkout.status === 'failed' || checkout.status === 'expired') {
      return { status: checkout.status };
    }

    return { status: 'pending' };
  } catch {
    return { status: 'pending' };
  }
}

export { webhooks as polarWebhooks };
