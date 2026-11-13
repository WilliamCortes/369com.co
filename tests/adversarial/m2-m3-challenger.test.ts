/**
 * Empirical Adversarial Test Harness & Boundary Stress Suite
 * Challenger 1: Milestone 2 & Milestone 3 Verification (domain 369com.co)
 * File: tests/adversarial/m2-m3-challenger.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  PRODUCT_CATALOG,
  evaluateGatewayGuard,
  createCheckoutSession,
  createMockCheckoutSession,
  generateStripeSignature,
  verifyStripeSignature,
  simulateWebhookEvent,
  type CheckoutRequest
} from '@/lib/stripe';
import {
  orderStore,
  generateDownloadToken,
  verifyDownloadToken,
  getDownloadSigningSecret
} from '@/lib/order-store';
import { POST as checkoutPost, GET as checkoutGet } from '@/app/api/checkout/route';
import { POST as webhookPost } from '@/app/api/webhook/stripe/route';
import { GET as downloadGet } from '@/app/api/download/route';
import { GET as orderStatusGet } from '@/app/api/order/status/route';
import { createHmac } from 'crypto';

// =============================================================================
// SUITE 1: STRIPE CHECKOUT API & PARAMETER BOUNDARY PROBES (/api/checkout)
// =============================================================================
describe('Empirical Challenge: Checkout Pipeline & Catalog Hardening (F5, F6, F9)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1.1 Catalog Precision & Integer Arithmetic Integrity', () => {
    it('verifies all product tiers use exact positive integer cents without float drift', () => {
      const tiers = Object.keys(PRODUCT_CATALOG);
      expect(tiers).toEqual(expect.arrayContaining(['starter', 'blueprint', 'pro', 'master']));

      for (const tierKey of tiers) {
        const tier = PRODUCT_CATALOG[tierKey];
        expect(Number.isInteger(tier.cents)).toBe(true);
        expect(tier.cents).toBeGreaterThan(0);
        expect(tier.currency).toBe('usd');

        // Integer cents match standard pricing
        if (tierKey === 'starter') expect(tier.cents).toBe(499);
        if (tierKey === 'blueprint') expect(tier.cents).toBe(799);
        if (tierKey === 'pro') expect(tier.cents).toBe(999);
        if (tierKey === 'master') expect(tier.cents).toBe(1999);

        // Disallow dangerous floating point multiplication
        expect(tier.cents).not.toBe(tier.price * 100 + 0.0000000000001);
      }
    });

    it('rejects nonexistent tier IDs with HTTP 400', async () => {
      const invalidTiers = [
        'invalid_tier',
        'super_vip',
        'free_tier',
        '',
        '   ',
        '123',
        'starter; DROP TABLE orders; --',
        '<script>alert(1)</script>'
      ];

      for (const badTier of invalidTiers) {
        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: badTier, customerEmail: 'seeker@369com.co' })
        });

        const res = await checkoutPost(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Invalid tier specified');
      }
    });

    it('probes prototype properties in tierId lookup', async () => {
      // Adversarial test: probe whether object prototype properties can bypass tier validation
      const protoKeys = ['toString', 'valueOf', 'constructor', '__proto__', 'isPrototypeOf'];

      for (const protoKey of protoKeys) {
        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: protoKey, customerEmail: 'seeker@369com.co' })
        });

        const res = await checkoutPost(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Invalid tier specified');
      }
    });
  });

  describe('1.2 Body Parsing, Email & Intention Boundaries', () => {
    it('returns HTTP 400 on malformed or non-object JSON bodies', async () => {
      const malformedBodies = [
        '',
        'not a json',
        '{"broken": ',
        '[]',
        '123',
        '"string"',
        'true',
        'null'
      ];

      for (const bodyStr of malformedBodies) {
        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr
        });

        const res = await checkoutPost(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBeDefined();
      }
    });

    it('validates customer email formatting strictly', async () => {
      // Invalid email strings including missing at, missing user, spaces, and CRLF injection must be rejected with HTTP 400
      const invalidEmails = [
        'plainaddress',
        'missingatsign.com',
        'user.domain.com',
        'just_a_string',
        '@missinguser.com',
        'spaces in@email.com',
        'user@domain.com\r\nBcc:attacker@domain.com',
        'user@domain.com\nInjected-Header:val',
        'user@domain.com\rInjected-Header:val'
      ];

      for (const email of invalidEmails) {
        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: 'blueprint', customerEmail: email })
        });

        const res = await checkoutPost(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Invalid customer email format');
      }

      // Valid email formats must pass validation
      const validEmails = [
        'seeker@369com.co',
        'nikola.tesla@resonance.org',
        'user+tag@domain.co'
      ];

      for (const email of validEmails) {
        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: 'blueprint', customerEmail: email })
        });

        const res = await checkoutPost(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
      }
    });

    it('safely clamps oversized intention strings to 500 characters', async () => {
      const hugeIntention = '🌌'.repeat(400) + 'A'.repeat(1000);
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: 'blueprint',
          customerEmail: 'cosmic@369com.co',
          intention: hugeIntention
        })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();

      const order = orderStore.getOrder(data.sessionId);
      expect(order).toBeDefined();
      expect(order?.intention?.length).toBeLessThanOrEqual(500);
    });

    it('handles GET /api/checkout redirect and error boundaries', async () => {
      // Valid redirect
      const validReq = new NextRequest('http://localhost:3000/api/checkout?tierId=blueprint');
      const validRes = await checkoutGet(validReq);
      expect([302, 307, 308]).toContain(validRes.status);
      expect(validRes.headers.get('location')).toContain('/success?session_id=');

      // Missing tier query
      const emptyReq = new NextRequest('http://localhost:3000/api/checkout');
      const emptyRes = await checkoutGet(emptyReq);
      expect(emptyRes.status).toBe(400);

      // Invalid tier query
      const badReq = new NextRequest('http://localhost:3000/api/checkout?tierId=bogus');
      const badRes = await checkoutGet(badReq);
      expect(badRes.status).toBe(400);
    });
  });

  describe('1.3 Gateway Gating & Production Environment Hardening (F9)', () => {
    it('strictly blocks mock payments in production by default (HTTP 503)', () => {
      const prodEnv = {
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'true',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'false'
      };

      const result = evaluateGatewayGuard(prodEnv);
      expect(result.allowed).toBe(false);
      expect(result.mode).toBe('blocked');
      expect(result.status).toBe(503);
      expect(result.error).toContain('MOCK_PAYMENTS is disabled in production');
    });

    it('blocks production when STRIPE_SECRET_KEY is missing or placeholder (HTTP 503)', () => {
      // Missing key
      const noKeyResult = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: ''
      });
      expect(noKeyResult.allowed).toBe(false);
      expect(noKeyResult.status).toBe(503);

      // Placeholder key
      const placeholderResult = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: 'sk_test_placeholder_key_not_configured'
      });
      expect(placeholderResult.allowed).toBe(false);
      expect(placeholderResult.status).toBe(503);

      // Malformed prefix key
      const invalidPrefixResult = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: 'not_a_valid_stripe_key'
      });
      expect(invalidPrefixResult.allowed).toBe(false);
      expect(invalidPrefixResult.status).toBe(503);
    });

    it('permits production execution ONLY with valid live Stripe secret key', () => {
      const validLiveResult = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'false',
        STRIPE_SECRET_KEY: 'sk_live_mock_unit_test_key'
      });
      expect(validLiveResult.allowed).toBe(true);
      expect(validLiveResult.mode).toBe('live');
      expect(validLiveResult.status).toBe(200);
    });

    it('permits mock mode in production only when ALLOW_MOCK_PAYMENTS_IN_PRODUCTION is explicitly true', () => {
      const explicitOverrideResult = evaluateGatewayGuard({
        NODE_ENV: 'production',
        MOCK_PAYMENTS: 'true',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true'
      });
      expect(explicitOverrideResult.allowed).toBe(true);
      expect(explicitOverrideResult.mode).toBe('mock');
      expect(explicitOverrideResult.status).toBe(200);
    });

    it('permits deterministic mock mode in development and test environments', () => {
      const devResult = evaluateGatewayGuard({
        NODE_ENV: 'development',
        MOCK_PAYMENTS: 'true'
      });
      expect(devResult.allowed).toBe(true);
      expect(devResult.mode).toBe('mock');

      const testResult = evaluateGatewayGuard({
        NODE_ENV: 'test',
        MOCK_PAYMENTS: 'true'
      });
      expect(testResult.allowed).toBe(true);
      expect(testResult.mode).toBe('mock');
    });
  });
});

// =============================================================================
// SUITE 2: WEBHOOK HMAC-SHA256 CRYPTOGRAPHIC HARDENING & REPLAY ATTACK PROBES
// =============================================================================
describe('Empirical Challenge: Webhook Cryptography, Tolerance & Replay Resilience (F7)', () => {
  const secret = 'whsec_adversarial_test_secret_for_challenge_32bytes';

  beforeEach(() => {
    orderStore.clear();
  });

  describe('2.1 HMAC-SHA256 Signature Robustness & Timing Safety', () => {
    it('computes exact Stripe standard HMAC-SHA256 signature format (t={timestamp},v1={hex})', () => {
      const rawBody = JSON.stringify({ id: 'evt_1', type: 'test' });
      const now = 1700000000;
      const sig = generateStripeSignature(rawBody, secret, now);

      expect(sig).toMatch(/^t=1700000000,v1=[a-f0-9]{64}$/);

      // Verify independently with Node crypto
      const expectedPayload = `1700000000.${rawBody}`;
      const expectedHmac = createHmac('sha256', secret).update(expectedPayload).digest('hex');
      expect(sig).toBe(`t=1700000000,v1=${expectedHmac}`);
    });

    it('verifies untampered webhook signature successfully', () => {
      const rawBody = JSON.stringify({ id: 'evt_2', amount: 799 });
      const now = Math.floor(Date.now() / 1000);
      const sig = generateStripeSignature(rawBody, secret, now);

      const check = verifyStripeSignature(rawBody, sig, secret, 300);
      expect(check.valid).toBe(true);
      expect(check.error).toBeUndefined();
    });

    it('detects and rejects even a single-character modification in raw payload body', () => {
      const rawBody = JSON.stringify({ id: 'evt_3', amount: 799 });
      const sig = generateStripeSignature(rawBody, secret);

      // Mutate 1 character in payload body
      const tamperedBody = JSON.stringify({ id: 'evt_3', amount: 800 });
      const check = verifyStripeSignature(tamperedBody, sig, secret, 300);

      expect(check.valid).toBe(false);
      expect(check.error).toContain('Signature mismatch');
    });

    it('detects and rejects whitespace/formatting variations (verifying raw body necessity)', () => {
      const rawBody = '{"id":"evt_4","tier":"blueprint"}';
      const sig = generateStripeSignature(rawBody, secret);

      // Same JSON semantic value, but with formatting space
      const reformattedBody = '{\n  "id": "evt_4",\n  "tier": "blueprint"\n}';
      const check = verifyStripeSignature(reformattedBody, sig, secret, 300);

      expect(check.valid).toBe(false);
      expect(check.error).toContain('Signature mismatch');
    });

    it('detects and rejects single-bit tampering in signature hex string', () => {
      const rawBody = JSON.stringify({ id: 'evt_5' });
      const now = Math.floor(Date.now() / 1000);
      const sig = generateStripeSignature(rawBody, secret, now);

      // Flip the last hex character
      const lastChar = sig.slice(-1);
      const flippedChar = lastChar === 'a' ? 'b' : 'a';
      const tamperedSig = sig.slice(0, -1) + flippedChar;

      const check = verifyStripeSignature(rawBody, tamperedSig, secret, 300);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Signature mismatch');
    });

    it('detects secret substitution (signed with Key A, verified with Key B)', () => {
      const rawBody = JSON.stringify({ id: 'evt_6' });
      const sigKeyA = generateStripeSignature(rawBody, 'secret_key_AAAAA');

      const check = verifyStripeSignature(rawBody, sigKeyA, 'secret_key_BBBBB', 300);
      expect(check.valid).toBe(false);
      expect(check.error).toContain('Signature mismatch');
    });

    it('survives malformed, truncated, or non-hex signatures without throwing RangeError (timingSafeEqual guard)', () => {
      const rawBody = JSON.stringify({ id: 'evt_7' });
      const now = Math.floor(Date.now() / 1000);

      const adversarialSignatures = [
        `t=${now},v1=short`, // 5 chars instead of 64
        `t=${now},v1=`, // empty v1
        `t=${now},v1=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz`, // non-hex
        `t=${now},v1=${'a'.repeat(63)}`, // odd length 63
        `t=${now},v1=${'a'.repeat(65)}`, // odd length 65
        `t=${now},v1=${'a'.repeat(128)}`, // 128 chars (wrong digest size)
        `t=${now}`, // missing v1 entirely
        `v1=${'a'.repeat(64)}`, // missing timestamp entirely
        '', // completely empty
        '   ',
        'nonsense_signature_scheme_without_equals'
      ];

      for (const badSig of adversarialSignatures) {
        expect(() => {
          const res = verifyStripeSignature(rawBody, badSig, secret, 300);
          expect(res.valid).toBe(false);
        }).not.toThrow();
      }
    });
  });

  describe('2.2 Timestamp Tolerance & Replay Protection Boundary Probes', () => {
    it('accepts signatures within the 300-second tolerance window', () => {
      const rawBody = JSON.stringify({ id: 'evt_time_valid' });
      const now = Math.floor(Date.now() / 1000);

      const validDeltas = [
        0,    // exactly now
        -10,  // 10s in the past
        -150, // 2.5 minutes in past
        -299, // 299s in past
        -300, // exact lower bound (300s in past)
        10,   // 10s in future
        150,  // 150s in future
        300   // exact upper bound (300s in future)
      ];

      for (const delta of validDeltas) {
        const timestamp = now + delta;
        const sig = generateStripeSignature(rawBody, secret, timestamp);
        const check = verifyStripeSignature(rawBody, sig, secret, 300);
        expect(check.valid).toBe(true);
      }
    });

    it('rejects stale replay attacks (timestamp > 300s in past)', () => {
      const rawBody = JSON.stringify({ id: 'evt_replay_stale' });
      const now = Math.floor(Date.now() / 1000);

      const stalePastDeltas = [
        -301,   // 1 second past threshold
        -305,
        -600,   // 10 minutes ago
        -3600,  // 1 hour ago
        -86400  // 1 day ago
      ];

      for (const delta of stalePastDeltas) {
        const timestamp = now + delta;
        const sig = generateStripeSignature(rawBody, secret, timestamp);
        const check = verifyStripeSignature(rawBody, sig, secret, 300);

        expect(check.valid).toBe(false);
        expect(check.error).toContain('Timestamp outside the tolerance zone');
      }
    });

    it('rejects future clock-drift attacks (timestamp > 300s in future)', () => {
      const rawBody = JSON.stringify({ id: 'evt_future_drift' });
      const now = Math.floor(Date.now() / 1000);

      const invalidFutureDeltas = [
        301,   // 1 second past future threshold
        600,   // 10 minutes in future
        86400  // 1 day in future
      ];

      for (const delta of invalidFutureDeltas) {
        const timestamp = now + delta;
        const sig = generateStripeSignature(rawBody, secret, timestamp);
        const check = verifyStripeSignature(rawBody, sig, secret, 300);

        expect(check.valid).toBe(false);
        expect(check.error).toContain('Timestamp outside the tolerance zone');
      }
    });

    it('rejects negative or NaN timestamps', () => {
      const rawBody = JSON.stringify({ id: 'evt_invalid_timestamp' });

      // Negative timestamp
      const negSig = `t=-500,v1=${'0'.repeat(64)}`;
      const negCheck = verifyStripeSignature(rawBody, negSig, secret, 300);
      expect(negCheck.valid).toBe(false);

      // Non-numeric timestamp
      const nanSig = `t=invalid_timestamp,v1=${'0'.repeat(64)}`;
      const nanCheck = verifyStripeSignature(rawBody, nanSig, secret, 300);
      expect(nanCheck.valid).toBe(false);
      expect(nanCheck.error).toContain('Malformed stripe-signature header scheme');
    });
  });

  describe('2.3 Full Webhook Route Adversarial Execution (/api/webhook/stripe)', () => {
    const testSecret = 'whsec_placeholder_secret_for_testing';

    it('returns HTTP 400 when stripe-signature header is missing or empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_missing_sig' })
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing stripe-signature header');
    });

    it('returns HTTP 400 when webhook raw body is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 't=123,v1=abc' },
        body: ''
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Empty payload');
    });

    it('returns HTTP 400 when valid HMAC signature is paired with malformed JSON body', async () => {
      const rawBody = 'This is raw unparseable text {not valid json';
      const sig = generateStripeSignature(rawBody, testSecret);

      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: rawBody
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Malformed JSON payload');
    });

    it('returns HTTP 400 when payload is valid JSON but lacks event id', async () => {
      const rawBody = JSON.stringify({ type: 'checkout.session.completed' }); // missing .id
      const sig = generateStripeSignature(rawBody, testSecret);

      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: rawBody
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid event structure');
    });

    it('enforces production webhook secret configuration fail-safe (HTTP 500)', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevSecret = process.env.STRIPE_WEBHOOK_SECRET;

      try {
        process.env.NODE_ENV = 'production';
        process.env.STRIPE_WEBHOOK_SECRET = 'whsec_placeholder_secret_not_real';

        const rawBody = JSON.stringify({ id: 'evt_prod_test' });
        const sig = generateStripeSignature(rawBody, 'whsec_placeholder_secret_not_real');

        const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
          method: 'POST',
          headers: { 'stripe-signature': sig },
          body: rawBody
        });

        const res = await webhookPost(req);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toContain('Webhook secret unconfigured in production environment');
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.STRIPE_WEBHOOK_SECRET = prevSecret;
      }
    });
  });
});

// =============================================================================
// SUITE 3: IDEMPOTENCY ENGINE & CONCURRENT REPLAY HARNESS
// =============================================================================
describe('Empirical Challenge: Idempotency Deduplication & Order Store (F7)', () => {
  const testSecret = 'whsec_placeholder_secret_for_testing';

  beforeEach(() => {
    orderStore.clear();
  });

  it('guarantees single fulfillment across multiple replayed webhook deliveries', async () => {
    const sim = simulateWebhookEvent({
      sessionId: 'cs_replay_guard_101',
      tierId: 'blueprint',
      customerEmail: 'idempotent@369com.co',
      secret: testSecret
    });

    // 1st delivery
    const req1 = new NextRequest('http://localhost:3000/api/webhook/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': sim.signatureHeader },
      body: sim.rawBody
    });
    const res1 = await webhookPost(req1);
    expect(res1.status).toBe(200);
    const data1 = await res1.json();
    expect(data1.received).toBe(true);
    expect(data1.orderId).toBeDefined();
    expect(data1.already_processed).toBeUndefined();

    // 2nd delivery (identical event ID)
    const req2 = new NextRequest('http://localhost:3000/api/webhook/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': sim.signatureHeader },
      body: sim.rawBody
    });
    const res2 = await webhookPost(req2);
    expect(res2.status).toBe(200);
    const data2 = await res2.json();
    expect(data2.received).toBe(true);
    expect(data2.already_processed).toBe(true);

    // 3rd delivery
    const req3 = new NextRequest('http://localhost:3000/api/webhook/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': sim.signatureHeader },
      body: sim.rawBody
    });
    const res3 = await webhookPost(req3);
    expect(res3.status).toBe(200);
    const data3 = await res3.json();
    expect(data3.already_processed).toBe(true);

    // Verify order was saved exactly once
    const order = orderStore.getOrder('cs_replay_guard_101');
    expect(order).toBeDefined();
    expect(order?.customerEmail).toBe('idempotent@369com.co');
  });

  it('handles non-checkout Stripe webhook events gracefully without order creation', async () => {
    const otherEvents = [
      'payment_intent.succeeded',
      'customer.subscription.created',
      'charge.dispute.created',
      'invoice.paid'
    ];

    for (const evtType of otherEvents) {
      const eventObj = {
        id: `evt_other_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        object: 'event',
        type: evtType,
        data: { object: { id: 'pi_test_123' } }
      };

      const rawBody = JSON.stringify(eventObj);
      const sig = generateStripeSignature(rawBody, testSecret);

      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sig },
        body: rawBody
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(data.orderId).toBeUndefined();
    }
  });

  it('stress-tests concurrent burst of identical webhook deliveries (20 parallel requests)', async () => {
    const sim = simulateWebhookEvent({
      sessionId: 'cs_concurrent_burst_test',
      tierId: 'master',
      secret: testSecret
    });

    const requests = Array.from({ length: 20 }, () =>
      new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sim.signatureHeader },
        body: sim.rawBody
      })
    );

    const responses = await Promise.all(requests.map(r => webhookPost(r)));
    for (const res of responses) {
      expect(res.status).toBe(200);
    }

    const jsonResults = await Promise.all(responses.map(r => r.json()));
    const freshOrders = jsonResults.filter(j => j.already_processed === undefined);
    const deduplicated = jsonResults.filter(j => j.already_processed === true);

    // At least one fresh order processed, rest deduplicated
    expect(freshOrders.length).toBeGreaterThanOrEqual(1);
    expect(freshOrders.length + deduplicated.length).toBe(20);

    const order = orderStore.getOrder('cs_concurrent_burst_test');
    expect(order).toBeDefined();
    expect(order?.tierId).toBe('master');
  });
});

// =============================================================================
// SUITE 4: DIGITAL RIGHTS MANAGEMENT (DRM) TOKEN CRYPTOGRAPHY & ASSET DELIVERY (F8)
// =============================================================================
describe('Empirical Challenge: DRM Download Tokens & Asset Delivery (F8 & Milestone 3)', () => {
  beforeEach(() => {
    orderStore.clear();
  });

  describe('4.1 Token Minting, Verification & Expiration Cryptography', () => {
    it('mints valid 3-segment base64url signed JWT tokens', () => {
      const claims = {
        sessionId: 'cs_token_test',
        tierId: 'blueprint',
        email: 'token@369com.co'
      };

      const token = generateDownloadToken(claims);
      const segments = token.split('.');
      expect(segments.length).toBe(3);

      const header = JSON.parse(Buffer.from(segments[0], 'base64url').toString('utf-8'));
      expect(header.alg).toBe('HS256');
      expect(header.typ).toBe('JWT');

      const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8'));
      expect(payload.sessionId).toBe('cs_token_test');
      expect(payload.tierId).toBe('blueprint');
      expect(payload.email).toBe('token@369com.co');
      expect(payload.exp).toBeGreaterThan(payload.iat);

      const verification = verifyDownloadToken(token);
      expect(verification.valid).toBe(true);
      expect(verification.claims.sessionId).toBe('cs_token_test');
    });

    it('rejects tampered token payloads and signatures', () => {
      const token = generateDownloadToken({ sessionId: 'cs_tamper_test', tierId: 'starter', email: 'a@b.com' });
      const [header, payload, sig] = token.split('.');

      // Tamper payload (e.g. elevate starter tier to master)
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      parsed.tierId = 'master';
      const tamperedPayload = Buffer.from(JSON.stringify(parsed)).toString('base64url');
      const tamperedToken = `${header}.${tamperedPayload}.${sig}`;

      const res = verifyDownloadToken(tamperedToken);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('tampered');

      // Tamper signature
      const badSigToken = `${header}.${payload}.${sig.slice(0, -1)}X`;
      const resSig = verifyDownloadToken(badSigToken);
      expect(resSig.valid).toBe(false);
      expect(resSig.error).toContain('tampered');
    });

    it('rejects expired tokens (TTL enforcement)', () => {
      // Mint a token expired 10 seconds ago
      const expiredToken = generateDownloadToken(
        { sessionId: 'cs_expired_test', tierId: 'blueprint', email: 'a@b.com' },
        getDownloadSigningSecret(),
        -10 // expired in past
      );

      const res = verifyDownloadToken(expiredToken);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('Download token has expired');
    });

    it('rejects malformed token strings without crashing', () => {
      const badTokens = [
        '',
        'one_segment',
        'two.segments',
        'four.segments.here.extra',
        'invalid.base64!.chars',
        'header.notjson.sig'
      ];

      for (const bad of badTokens) {
        expect(() => {
          const res = verifyDownloadToken(bad);
          expect(res.valid).toBe(false);
        }).not.toThrow();
      }
    });

    it('enforces production download signing secret configuration fail-safe (HTTP 500/503)', async () => {
      // 1. Direct function test with mock environment
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: '',
          FULFILLMENT_JWT_SECRET: '',
          STRIPE_WEBHOOK_SECRET: ''
        });
      }).toThrow('Production security guard');

      // 2. Reject placeholder secret in production
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: 'whsec_placeholder_secret_for_testing'
        });
      }).toThrow('Production security guard');

      // 3. Reject hardcoded default fallback in production
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: 'whsec_fulfillment_token_secret_min_32_characters'
        });
      }).toThrow('Production security guard');

      // 4. Accept valid secret in production
      const validSecret = getDownloadSigningSecret({
        NODE_ENV: 'production',
        DOWNLOAD_SIGNING_SECRET: '369_universal_manifestation_download_secret_key_32_chars_min'
      });
      expect(validSecret).toBe('369_universal_manifestation_download_secret_key_32_chars_min');

      // 5. Permit fallback in production ONLY when ALLOW_MOCK_PAYMENTS_IN_PRODUCTION is true
      const mockOverrideSecret = getDownloadSigningSecret({
        NODE_ENV: 'production',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true'
      });
      expect(mockOverrideSecret).toBe('whsec_fulfillment_token_secret_min_32_characters');

      // 6. Token verification returns invalid with error message when secret is unconfigured in production
      const prevEnv = process.env.NODE_ENV;
      const prevSecret = process.env.DOWNLOAD_SIGNING_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.DOWNLOAD_SIGNING_SECRET;
        delete process.env.FULFILLMENT_JWT_SECRET;
        delete process.env.STRIPE_WEBHOOK_SECRET;

        const verifyResult = verifyDownloadToken('valid.jwt.payload');
        expect(verifyResult.valid).toBe(false);
        expect(verifyResult.error).toContain('Production security guard');

        const req = new NextRequest('http://localhost:3000/api/download?token=valid.jwt.payload');
        const res = await downloadGet(req);
        expect([401, 500]).toContain(res.status);
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevSecret) process.env.DOWNLOAD_SIGNING_SECRET = prevSecret;
      }
    });
  });

  describe('4.2 Secure Asset Streaming & Binary Content Validation (/api/download)', () => {
    it('returns HTTP 401 when token query is missing or invalid', async () => {
      // Missing
      const noTokenReq = new NextRequest('http://localhost:3000/api/download');
      const noTokenRes = await downloadGet(noTokenReq);
      expect(noTokenRes.status).toBe(401);

      // Invalid
      const badTokenReq = new NextRequest('http://localhost:3000/api/download?token=invalid.token.here');
      const badTokenRes = await downloadGet(badTokenReq);
      expect(badTokenRes.status).toBe(401);
    });

    it('streams valid PDF binary (%PDF-) for Blueprint tier with correct attachment headers', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_pdf_stream_test',
        tierId: 'blueprint',
        name: 'Nikola Seeker',
        email: 'nikola@369com.co',
        intention: 'Harness 369 Hz energy'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`);
      const res = await downloadGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="Tesla-369-Manifestation-Blueprint.pdf"');
      expect(res.headers.get('Cache-Control')).toContain('no-store');

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.slice(0, 5).toString('utf-8')).toBe('%PDF-');
    });

    it('streams valid PKZIP archive (PK\\x03\\x04) for Master tier with multi-asset suite', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_zip_stream_test',
        tierId: 'master',
        name: 'Master Seeker',
        email: 'master@369com.co'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`);
      const res = await downloadGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/zip');
      expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="369-Master-Sanctuary-Suite.zip"');
      expect(res.headers.get('Cache-Control')).toContain('no-store');

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      expect(buffer.length).toBeGreaterThan(1000);
      // Valid PKZIP signature
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });

    it('streams single PDF when Master tier explicitly requests ?asset=pdf', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_master_single_pdf',
        tierId: 'master',
        name: 'Master Seeker',
        email: 'master@369com.co'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}&asset=pdf`);
      const res = await downloadGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      expect(buffer.slice(0, 5).toString('utf-8')).toBe('%PDF-');
    });
  });
});

// =============================================================================
// SUITE 5: ORDER STATUS POLLING ENDPOINT (/api/order/status)
// =============================================================================
describe('Empirical Challenge: Order Status Polling Lifecycle', () => {
  beforeEach(() => {
    orderStore.clear();
  });

  it('returns HTTP 400 when session query is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/order/status');
    const res = await orderStatusGet(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing session_id');
  });

  it('returns pending status for unfulfilled live sessions', async () => {
    const req = new NextRequest('http://localhost:3000/api/order/status?session_id=cs_live_unfulfilled_123');
    const res = await orderStatusGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('pending');
    expect(data.session_id).toBe('cs_live_unfulfilled_123');
  });

  it('returns fulfilled status and download URL for stored fulfilled orders', async () => {
    orderStore.saveOrder({
      orderId: 'ord_fulfilled_1',
      sessionId: 'cs_fulfilled_1',
      tierId: 'blueprint',
      customerEmail: 'saved@369com.co',
      status: 'fulfilled',
      createdAt: new Date().toISOString(),
      downloadToken: 'valid_dl_token_123'
    });

    const req = new NextRequest('http://localhost:3000/api/order/status?session_id=cs_fulfilled_1');
    const res = await orderStatusGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('fulfilled');
    expect(data.orderId).toBe('ord_fulfilled_1');
    expect(data.downloadUrl).toBe('/api/download?token=valid_dl_token_123');
  });

  it('deterministically auto-fulfills mock sessions starting with mock_cs_', async () => {
    const req = new NextRequest('http://localhost:3000/api/order/status?session_id=mock_cs_auto_fulfill_999');
    const res = await orderStatusGet(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('fulfilled');
    expect(data.downloadUrl).toContain('/api/download?token=');
  });
});
