import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';
import { evaluateGatewayGuard } from '@/lib/stripe';
import {
  createPolarCheckoutSession,
  syncPolarCheckoutStatus,
  hasValidPolarToken
} from '@/lib/polar';
import { POST as polarWebhookPost } from '@/app/api/webhook/polar/route';
import { GET as orderStatusGet } from '@/app/api/order/status/route';
import { GET as downloadGet } from '@/app/api/download/route';
import { orderStore } from '@/lib/order-store';

function signStandardWebhook(
  body: string,
  secret: string,
  webhookId: string = `msg_${Date.now()}`,
  timestamp: number = Math.floor(Date.now() / 1000)
) {
  const keyBytes = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret, 'utf-8');
  const sig = createHmac('sha256', keyBytes)
    .update(`${webhookId}.${timestamp}.${body}`)
    .digest('base64');
  return {
    'webhook-id': webhookId,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `v1,${sig}`
  };
}

describe('Polar.sh Payment Gateway & Webhook Integration', () => {
  const originalEnv = { ...process.env };
  const testWebhookSecret = 'whsec_MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=';

  beforeEach(() => {
    orderStore.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('routes evaluateGatewayGuard to Polar when POLAR_ACCESS_TOKEN is valid in production', () => {
    const res = evaluateGatewayGuard({
      NODE_ENV: 'production',
      PAYMENT_PROVIDER: 'polar',
      MOCK_PAYMENTS: 'false',
      POLAR_ACCESS_TOKEN: 'polar_oat_unit_test_mock_token_value'
    });
    expect(res.allowed).toBe(true);
    expect(res.mode).toBe('live');
    expect(res.provider).toBe('polar');
    expect(res.status).toBe(200);
  });

  it('blocks production when PAYMENT_PROVIDER=polar without POLAR_ACCESS_TOKEN', () => {
    const res = evaluateGatewayGuard({
      NODE_ENV: 'production',
      PAYMENT_PROVIDER: 'polar',
      MOCK_PAYMENTS: 'false',
      POLAR_ACCESS_TOKEN: ''
    });
    expect(res.allowed).toBe(false);
    expect(res.mode).toBe('blocked');
    expect(res.status).toBe(503);
    expect(hasValidPolarToken({ POLAR_ACCESS_TOKEN: 'polar_oat_placeholder' })).toBe(false);
  });

  it('creates Polar checkout session with {CHECKOUT_ID} return URL and flattened numerology metadata', async () => {
    const createMock = vi.fn().mockResolvedValue({
      id: 'chk_polar_unit_123',
      url: 'https://buy.polar.sh/polar_cl_unit_123'
    });

    const mockClient = {
      checkouts: { create: createMock },
      products: { list: vi.fn(), create: vi.fn() }
    } as any;

    const result = await createPolarCheckoutSession(
      {
        tierId: 'pro',
        customerEmail: 'creator@369com.co',
        customerName: 'Nikola Tesla',
        intention: 'Quantum abundance',
        numerologyData: {
          birthDate: '1990-03-06',
          lifePath: 9,
          lifePathTitle: 'The Humanitarian Visionary',
          teslaNode: 369,
          resonance369Score: 96,
          dominantElement: 'Ether'
        }
      },
      'https://369com.co/',
      { POLAR_PRODUCT_ID_PRO: 'prod_polar_pro_unit_id' },
      mockClient
    );

    expect(result.success).toBe(true);
    expect(result.sessionId).toBe('chk_polar_unit_123');
    expect(result.url).toBe('https://buy.polar.sh/polar_cl_unit_123');
    expect(result.provider).toBe('polar');

    expect(createMock).toHaveBeenCalledTimes(1);
    const payload = createMock.mock.calls[0][0];
    expect(payload.products).toEqual(['prod_polar_pro_unit_id']);
    expect(payload.success_url).toBe('https://369com.co/success?session_id={CHECKOUT_ID}');
    expect(payload.return_url).toBe('https://369com.co/#pricing');
    expect(payload.customer_email).toBe('creator@369com.co');
    expect(payload.metadata).toMatchObject({
      tierId: 'pro',
      customerName: 'Nikola Tesla',
      intention: 'Quantum abundance',
      birthDate: '1990-03-06',
      lifePath: 9,
      teslaNode: 369,
      resonanceScore: 96
    });
  });

  it('verifies Polar order.paid Standard Webhook, fulfills order idempotently, and serves stateless PDF', async () => {
    process.env.NODE_ENV = 'production';
    process.env.POLAR_WEBHOOK_SECRET = testWebhookSecret;
    process.env.DOWNLOAD_SIGNING_SECRET = 'polar_download_signing_secret_minimum_32_characters';

    const eventPayload = {
      type: 'order.paid',
      timestamp: new Date().toISOString(),
      api_version: '2027-01',
      event_id: 'evt_polar_paid_001',
      data: {
        id: 'ord_polar_001',
        checkout_id: 'chk_polar_session_001',
        product_id: 'prod_master_001',
        paid: true,
        status: 'paid',
        created_at: new Date().toISOString(),
        customer: {
          email: 'buyer@369com.co',
          name: 'Elena Vance'
        },
        metadata: {
          tierId: 'blueprint',
          customerName: 'Elena Vance',
          intention: 'Clarity and focused creation',
          birthDate: '1988-09-09',
          lifePath: 8,
          lifePathTitle: 'The Infinite Architect',
          teslaNode: 9,
          resonanceScore: 93,
          dominantElement: 'Solar'
        }
      }
    };

    const rawBody = JSON.stringify(eventPayload);
    const headers = signStandardWebhook(rawBody, testWebhookSecret, 'msg_polar_001');

    const req1 = new NextRequest('http://localhost:3000/api/webhook/polar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: rawBody
    });

    const res1 = await polarWebhookPost(req1);
    expect(res1.status).toBe(200);
    const body1 = await res1.json();
    expect(body1.received).toBe(true);
    expect(body1.orderId).toBe('ord_polar_001');

    // Duplicate delivery returns idempotent response
    const req2 = new NextRequest('http://localhost:3000/api/webhook/polar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: rawBody
    });
    const res2 = await polarWebhookPost(req2);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.already_processed).toBe(true);

    // Order status exposes signed download URL
    const statusReq = new NextRequest(
      'http://localhost:3000/api/order/status?session_id=chk_polar_session_001'
    );
    const statusRes = await orderStatusGet(statusReq);
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.status).toBe('fulfilled');
    expect(statusJson.tierId).toBe('blueprint');
    expect(statusJson.downloadUrl).toContain('/api/download?token=');

    // Clear memory store to simulate hitting a separate serverless instance on /api/download
    orderStore.clear();

    const dlReq = new NextRequest(`http://localhost:3000${statusJson.downloadUrl}`);
    const dlRes = await downloadGet(dlReq);
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get('content-type')).toBe('application/pdf');
    const pdfBuffer = Buffer.from(await dlRes.arrayBuffer());
    expect(pdfBuffer.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });

  it('rejects Polar webhooks with invalid signatures (HTTP 403) and marks refunds', async () => {
    process.env.NODE_ENV = 'production';
    process.env.POLAR_WEBHOOK_SECRET = testWebhookSecret;
    process.env.DOWNLOAD_SIGNING_SECRET = 'polar_download_signing_secret_minimum_32_characters';

    const paidBody = JSON.stringify({
      type: 'order.paid',
      timestamp: new Date().toISOString(),
      api_version: '2027-01',
      data: {
        id: 'ord_polar_refund_test',
        checkout_id: 'chk_refund_test',
        paid: true,
        status: 'paid',
        created_at: new Date().toISOString(),
        customer: { email: 'refund@369com.co', name: 'Test User' },
        metadata: { tierId: 'starter' }
      }
    });

    const badReq = new NextRequest('http://localhost:3000/api/webhook/polar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'webhook-id': 'msg_bad_sig',
        'webhook-timestamp': String(Math.floor(Date.now() / 1000)),
        'webhook-signature': 'v1,aW52YWxpZHNpZ25hdHVyZQ=='
      },
      body: paidBody
    });
    const badRes = await polarWebhookPost(badReq);
    expect(badRes.status).toBe(403);

    // Fulfill legitimately then refund
    const paidHeaders = signStandardWebhook(paidBody, testWebhookSecret, 'msg_paid_for_refund');
    const paidRes = await polarWebhookPost(
      new NextRequest('http://localhost:3000/api/webhook/polar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...paidHeaders },
        body: paidBody
      })
    );
    expect(paidRes.status).toBe(200);

    const refundBody = JSON.stringify({
      type: 'order.refunded',
      timestamp: new Date().toISOString(),
      api_version: '2027-01',
      data: {
        id: 'ord_polar_refund_test',
        checkout_id: 'chk_refund_test',
        status: 'refunded'
      }
    });
    const refundHeaders = signStandardWebhook(refundBody, testWebhookSecret, 'msg_refund_001');
    const refundRes = await polarWebhookPost(
      new NextRequest('http://localhost:3000/api/webhook/polar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...refundHeaders },
        body: refundBody
      })
    );
    expect(refundRes.status).toBe(200);

    const statusRes = await orderStatusGet(
      new NextRequest('http://localhost:3000/api/order/status?session_id=chk_refund_test')
    );
    const statusJson = await statusRes.json();
    expect(statusJson.status).toBe('refunded');
    expect(statusJson.downloadUrl).toBeNull();
  });

  it('syncs succeeded Polar checkout on cold-start /api/order/status lookup', async () => {
    const getMock = vi.fn().mockResolvedValue({
      id: 'chk_cold_start_999',
      status: 'succeeded',
      product_id: 'prod_polar_master_999',
      created_at: new Date().toISOString(),
      customer_email: 'coldstart@369com.co',
      customer_name: 'Cold Start',
      metadata: {
        tierId: 'master',
        intention: 'Sync across lambdas'
      }
    });

    const synced = await syncPolarCheckoutStatus(
      'chk_cold_start_999',
      { POLAR_ACCESS_TOKEN: 'polar_oat_unit_test_mock_token_value' },
      { checkouts: { get: getMock } } as any
    );

    expect(synced.status).toBe('fulfilled');
    expect(synced.order?.tierId).toBe('master');
    expect(synced.order?.downloadToken).toBeTruthy();
    expect(getMock).toHaveBeenCalledWith('chk_cold_start_999');
    expect(orderStore.getOrder('chk_cold_start_999')?.status).toBe('fulfilled');
  });
});
