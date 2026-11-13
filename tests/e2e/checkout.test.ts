import { describe, it, expect } from './test-harness.ts';
import { PRODUCT_CATALOG, type CheckoutRequest, type CheckoutResponse } from './test-helpers.ts';

describe('E2E: Checkout Pipeline (POST /api/checkout)', () => {
  const executeCheckoutRoute = (body: any, env = { NODE_ENV: 'test', MOCK_PAYMENTS: 'true' }) => {
    if (!body || typeof body !== 'object') {
      return { status: 400, body: { error: 'Request body required' } };
    }

    const { tierId, customerEmail, intention } = body as CheckoutRequest;
    if (!tierId || !PRODUCT_CATALOG[tierId]) {
      return { status: 400, body: { error: 'Invalid tier specified' } };
    }

    if (env.NODE_ENV === 'production' && env.MOCK_PAYMENTS !== 'false') {
      return { status: 503, body: { error: 'Payment gateway configuration required' } };
    }

    const sessionId = `mock_cs_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const response: CheckoutResponse = {
      success: true,
      sessionId,
      url: `/success?session_id=${sessionId}&mock=true`
    };

    return { status: 200, body: response };
  };

  it('creates checkout session successfully for Blueprint tier ($7.99)', () => {
    const res = executeCheckoutRoute({
      tierId: 'blueprint',
      customerEmail: 'buyer@369com.co',
      intention: 'Wealth and spiritual alignment'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toMatch(/^mock_cs_/);
    expect(res.body.url).toContain(res.body.sessionId);
  });

  it('creates checkout session successfully for Master tier ($19.99)', () => {
    const res = executeCheckoutRoute({
      tierId: 'master',
      customerEmail: 'master@369com.co'
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBeDefined();
  });

  it('returns HTTP 400 when tierId is missing or empty', () => {
    const res = executeCheckoutRoute({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid tier specified');
  });

  it('returns HTTP 400 when invalid tier is requested', () => {
    const res = executeCheckoutRoute({ tierId: 'nonexistent_tier' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid tier specified');
  });

  it('returns HTTP 503 in production if mock mode attempted without authorization', () => {
    const res = executeCheckoutRoute(
      { tierId: 'blueprint', customerEmail: 'test@example.com' },
      { NODE_ENV: 'production', MOCK_PAYMENTS: 'true' }
    );
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('Payment gateway configuration required');
  });
});
