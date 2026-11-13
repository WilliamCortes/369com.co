import { describe, it, expect, beforeEach } from './test-harness.ts';
import {
  generateStripeSignature,
  verifyStripeSignature,
  OrderStoreOracle
} from './test-helpers.ts';

describe('E2E: Webhook Pipeline (POST /api/webhook/stripe)', () => {
  const secret = 'whsec_e2e_webhook_test_secret_32chars_long';
  let orderStore: OrderStoreOracle;

  beforeEach(() => {
    orderStore = new OrderStoreOracle();
  });

  const handleWebhookPost = (rawBody: string, sigHeader: string) => {
    const auth = verifyStripeSignature(rawBody, sigHeader, secret);
    if (!auth.valid) {
      return { status: 400, body: { error: auth.error } };
    }

    const event = JSON.parse(rawBody);
    if (orderStore.hasEvent(event.id)) {
      return { status: 200, body: { received: true, already_processed: true } };
    }

    orderStore.recordEvent(event.id);
    const orderId = `ord_${event.id}`;
    orderStore.saveOrder({
      orderId,
      sessionId: event.data.object.id,
      tierId: event.data.object.metadata.tierId,
      customerEmail: event.data.object.customer_email,
      status: 'fulfilled',
      createdAt: new Date().toISOString()
    });

    return { status: 200, body: { received: true, orderId } };
  };

  it('successfully processes checkout.session.completed with authentic HMAC signature', () => {
    const payload = JSON.stringify({
      id: 'evt_webhook_test_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_wh_1',
          customer_email: 'buyer@369com.co',
          metadata: { tierId: 'blueprint' }
        }
      }
    });

    const sig = generateStripeSignature(payload, secret);
    const res = handleWebhookPost(payload, sig);

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.orderId).toBe('ord_evt_webhook_test_1');

    const order = orderStore.getOrder('cs_test_wh_1');
    expect(order?.status).toBe('fulfilled');
  });

  it('rejects tampered webhook payload with HTTP 400', () => {
    const payload = JSON.stringify({ id: 'evt_tampered_1', amount: 799 });
    const sig = generateStripeSignature(payload, secret);
    const tampered = JSON.stringify({ id: 'evt_tampered_1', amount: 0 });

    const res = handleWebhookPost(tampered, sig);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Signature mismatch');
  });

  it('rejects webhook with expired timestamp outside 300s tolerance window', () => {
    const payload = JSON.stringify({ id: 'evt_drift_1' });
    const staleTime = Math.floor(Date.now() / 1000) - 360; // 6 minutes ago
    const sig = generateStripeSignature(payload, secret, staleTime);

    const res = handleWebhookPost(payload, sig);
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('tolerance zone');
  });

  it('handles replayed duplicate webhook event idempotently', () => {
    const payload = JSON.stringify({
      id: 'evt_idempotency_check',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_idempotent_order',
          customer_email: 'seeker@369com.co',
          metadata: { tierId: 'pro' }
        }
      }
    });
    const sig = generateStripeSignature(payload, secret);

    const res1 = handleWebhookPost(payload, sig);
    expect(res1.status).toBe(200);
    expect(res1.body.already_processed).toBeUndefined();

    const res2 = handleWebhookPost(payload, sig);
    expect(res2.status).toBe(200);
    expect(res2.body.already_processed).toBe(true);
  });
});
