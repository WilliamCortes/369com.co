/**
 * Empirical Adversarial Test Harness & Boundary Stress Suite
 * Challenger 2: Milestone 5 Tier 5 Adversarial Stress & Concurrency Verification
 * Target: domain 369com.co (Autonomous Revenue Engine)
 * File: tests/adversarial/m5-tier5-stress-challenger2.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import {
  PRODUCT_CATALOG,
  evaluateGatewayGuard,
  createCheckoutSession,
  createMockCheckoutSession,
  generateStripeSignature,
  verifyStripeSignature,
  simulateWebhookEvent,
  isValidTier,
  isValidEmail,
  type CheckoutRequest
} from '@/lib/stripe';
import {
  orderStore,
  generateDownloadToken,
  verifyDownloadToken,
  getDownloadSigningSecret,
  type OrderRecord
} from '@/lib/order-store';
import { createZipArchive, crc32, type ZipEntry } from '@/lib/zip';
import {
  generatePersonalizedBlueprintPdf,
  sanitizeForPdf,
  isWinAnsiCodePoint
} from '@/lib/pdf-generator';
import { POST as checkoutPost } from '@/app/api/checkout/route';
import { POST as webhookPost } from '@/app/api/webhook/stripe/route';
import { GET as downloadGet } from '@/app/api/download/route';
import { GET as orderStatusGet } from '@/app/api/order/status/route';

// =============================================================================
// SUITE 1: HIGH-CONCURRENCY & RACE CONDITION STRESS HARNESS
// =============================================================================
describe('Tier 5 Suite 1: High-Concurrency & Race Condition Stress Harness', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
    process.env = { ...originalEnv };
    process.env.MOCK_PAYMENTS = 'true';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('1.1: executes 100 concurrent checkout sessions without ID collisions or data race corruption', async () => {
    const CONCURRENCY_COUNT = 100;
    const checkoutPromises = Array.from({ length: CONCURRENCY_COUNT }, (_, i) => {
      const tierKeys = Object.keys(PRODUCT_CATALOG);
      const tierId = tierKeys[i % tierKeys.length];
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin: 'https://369com.co'
        },
        body: JSON.stringify({
          tierId,
          customerEmail: `seeker_${i}@369com.co`,
          customerName: `Cosmic Seeker ${i}`,
          intention: `Manifestation intention ${i} for sovereign abundance`
        })
      });
      return checkoutPost(req);
    });

    const responses = await Promise.all(checkoutPromises);

    // Verify all returned HTTP 200
    for (const res of responses) {
      expect(res.status).toBe(200);
    }

    const jsonResults = await Promise.all(responses.map(r => r.json()));
    const sessionIds = new Set<string>();

    for (let i = 0; i < CONCURRENCY_COUNT; i++) {
      const result = jsonResults[i];
      expect(result.success).toBe(true);
      expect(result.sessionId).toMatch(/^mock_cs_\d+_[a-z0-9]+$/);
      expect(result.url).toContain(result.sessionId);

      // Verify zero session ID collisions
      expect(sessionIds.has(result.sessionId)).toBe(false);
      sessionIds.add(result.sessionId);

      // Verify order record in store preserves exact individual user data
      const stored = orderStore.getOrder(result.sessionId);
      expect(stored).toBeDefined();
      expect(stored?.customerEmail).toBe(`seeker_${i}@369com.co`);
      expect(stored?.customerName).toBe(`Cosmic Seeker ${i}`);
      expect(stored?.intention).toContain(`Manifestation intention ${i}`);
      expect(stored?.status).toBe('fulfilled');
    }

    expect(sessionIds.size).toBe(CONCURRENCY_COUNT);
  });

  it('1.2: enforces strict webhook idempotency under 50 simultaneous duplicate event deliveries', async () => {
    const DUPLICATE_COUNT = 50;
    const testSecret = 'whsec_concurrent_idempotency_test_secret_32chars';
    process.env.STRIPE_WEBHOOK_SECRET = testSecret;

    const { rawBody, signatureHeader, event } = simulateWebhookEvent({
      sessionId: 'cs_race_duplicate_event_session',
      tierId: 'master',
      customerEmail: 'race_test@369com.co',
      customerName: 'Hermes Trismegistus',
      secret: testSecret
    });

    // Fire 50 concurrent requests with the EXACT same rawBody and signature
    const webhookPromises = Array.from({ length: DUPLICATE_COUNT }, () => {
      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': signatureHeader
        },
        body: rawBody
      });
      return webhookPost(req);
    });

    const responses = await Promise.all(webhookPromises);
    const jsonBodies = await Promise.all(responses.map(r => r.json()));

    let freshFulfillments = 0;
    let alreadyProcessedCount = 0;

    for (let i = 0; i < DUPLICATE_COUNT; i++) {
      const res = responses[i];
      const body = jsonBodies[i];

      expect(res.status).toBe(200);

      if (body.already_processed === true) {
        alreadyProcessedCount++;
        expect(body.received).toBe(true);
      } else {
        freshFulfillments++;
        expect(body.received).toBe(true);
        expect(body.orderId).toBe(`ord_${event.id}`);
      }
    }

    // Exactly 1 request must perform fresh fulfillment, 49 must report already_processed
    expect(freshFulfillments).toBe(1);
    expect(alreadyProcessedCount).toBe(DUPLICATE_COUNT - 1);

    // Verify the single stored order is intact and fulfilled
    const order = orderStore.getOrder('cs_race_duplicate_event_session');
    expect(order).toBeDefined();
    expect(order?.customerEmail).toBe('race_test@369com.co');
    expect(order?.customerName).toBe('Hermes Trismegistus');
    expect(order?.status).toBe('fulfilled');
    expect(order?.tierId).toBe('master');
  });

  it('1.3: verifies race-free lifecycle across concurrent checkout, status polling, and webhook arrival', async () => {
    const testSecret = 'whsec_interleaved_race_secret_32_characters';
    process.env.STRIPE_WEBHOOK_SECRET = testSecret;

    const targetSessionId = 'cs_interleaved_lifecycle_session_999';

    // 1. Initial status poll before checkout or webhook exists
    const initialPollReq = new NextRequest(
      `http://localhost:3000/api/order/status?session_id=${targetSessionId}`
    );
    const initialPollRes = await orderStatusGet(initialPollReq);
    expect(initialPollRes.status).toBe(200);
    const initialPollJson = await initialPollRes.json();
    expect(initialPollJson.status).toBe('pending');

    // 2. Simulate simultaneous arrival of 10 status polls and 1 webhook fulfillment
    const { rawBody, signatureHeader } = simulateWebhookEvent({
      sessionId: targetSessionId,
      tierId: 'blueprint',
      customerEmail: 'interleaved@369com.co',
      customerName: 'Nikola Harmonic',
      secret: testSecret
    });

    const concurrentActions = [
      ...Array.from({ length: 10 }, () => {
        const req = new NextRequest(
          `http://localhost:3000/api/order/status?session_id=${targetSessionId}`
        );
        return orderStatusGet(req);
      }),
      (() => {
        const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': signatureHeader
          },
          body: rawBody
        });
        return webhookPost(req);
      })()
    ];

    const results = await Promise.all(concurrentActions);

    // Webhook must succeed
    const webhookRes = results[10];
    expect(webhookRes.status).toBe(200);

    // Final status poll after all operations complete
    const finalPollReq = new NextRequest(
      `http://localhost:3000/api/order/status?session_id=${targetSessionId}`
    );
    const finalPollRes = await orderStatusGet(finalPollReq);
    expect(finalPollRes.status).toBe(200);
    const finalPollJson = await finalPollRes.json();

    expect(finalPollJson.status).toBe('fulfilled');
    expect(finalPollJson.customerEmail).toBe('interleaved@369com.co');
    expect(finalPollJson.customerName).toBe('Nikola Harmonic');
    expect(finalPollJson.downloadUrl).toContain('/api/download?token=');
  });

  it('1.4: streams digital assets across 30 parallel requests with zero buffer overrun or corruption', async () => {
    const PARALLEL_DOWNLOADS = 30;
    const token = generateDownloadToken({
      sessionId: 'cs_concurrent_download_token_session',
      tierId: 'master',
      email: 'parallel_seeker@369com.co',
      name: 'Vortex Adept',
      intention: 'Parallel stream validation and harmonic stability'
    });

    orderStore.saveOrder({
      orderId: 'ord_parallel_download_test',
      sessionId: 'cs_concurrent_download_token_session',
      tierId: 'master',
      customerEmail: 'parallel_seeker@369com.co',
      customerName: 'Vortex Adept',
      intention: 'Parallel stream validation and harmonic stability',
      status: 'fulfilled',
      createdAt: new Date().toISOString(),
      downloadToken: token
    });

    const downloadPromises = Array.from({ length: PARALLEL_DOWNLOADS }, () => {
      const req = new NextRequest(
        `http://localhost:3000/api/download?token=${encodeURIComponent(token)}`
      );
      return downloadGet(req);
    });

    const responses = await Promise.all(downloadPromises);

    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/zip');
      expect(res.headers.get('content-disposition')).toContain('369-Master-Sanctuary-Suite.zip');

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      // Verify PKZIP magic bytes (PK\x03\x04)
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4b);
      expect(buf[2]).toBe(0x03);
      expect(buf[3]).toBe(0x04);
      expect(buf.length).toBeGreaterThan(5000);
    }
  });

  it('1.5: verifies multi-user catalog isolation under concurrent cross-tier checkout', async () => {
    const tiers = ['starter', 'blueprint', 'pro', 'master'];
    const requests = tiers.map((tierId, index) => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId,
          customerEmail: `user_${tierId}_${index}@369com.co`,
          customerName: `Customer ${tierId}`,
          intention: `Intention for tier ${tierId}`
        })
      });
      return checkoutPost(req);
    });

    const responses = await Promise.all(requests);
    const results = await Promise.all(responses.map(r => r.json()));

    for (let i = 0; i < tiers.length; i++) {
      const tierId = tiers[i];
      const result = results[i];
      expect(result.success).toBe(true);

      const order = orderStore.getOrder(result.sessionId);
      expect(order).toBeDefined();
      expect(order?.tierId).toBe(tierId);
      expect(order?.customerEmail).toBe(`user_${tierId}_${i}@369com.co`);
      expect(order?.customerName).toBe(`Customer ${tierId}`);
      expect(order?.intention).toBe(`Intention for tier ${tierId}`);
    }
  });

  it('1.6: verifies order store singleton memory integrity across 500 rapid sequential operations', () => {
    const TOTAL_RECORDS = 500;

    for (let i = 0; i < TOTAL_RECORDS; i++) {
      const order: OrderRecord = {
        orderId: `ord_seq_${i}`,
        sessionId: `cs_seq_${i}`,
        tierId: i % 2 === 0 ? 'blueprint' : 'master',
        customerEmail: `seeker_seq_${i}@369com.co`,
        customerName: `Sequential Seeker ${i}`,
        intention: `Intention ${i}`,
        status: 'fulfilled',
        createdAt: new Date().toISOString()
      };
      orderStore.saveOrder(order);
      orderStore.recordEvent(`evt_seq_${i}`);
    }

    // Verify lookup by sessionId and orderId for random sampling and boundaries
    const checkIndices = [0, 1, 49, 100, 249, 369, 499];
    for (const idx of checkIndices) {
      const bySession = orderStore.getOrder(`cs_seq_${idx}`);
      expect(bySession).toBeDefined();
      expect(bySession?.customerEmail).toBe(`seeker_seq_${idx}@369com.co`);
      expect(bySession?.orderId).toBe(`ord_seq_${idx}`);

      const byOrderId = orderStore.getOrderByOrderId(`ord_seq_${idx}`);
      expect(byOrderId).toBeDefined();
      expect(byOrderId?.sessionId).toBe(`cs_seq_${idx}`);

      expect(orderStore.hasEvent(`evt_seq_${idx}`)).toBe(true);
    }

    expect(orderStore.hasEvent('evt_nonexistent')).toBe(false);
    expect(orderStore.getOrder('cs_nonexistent')).toBeUndefined();
    expect(orderStore.getOrderByOrderId('ord_nonexistent')).toBeUndefined();

    // Verify prototype properties do not return false positives
    const protoProps = ['toString', 'valueOf', 'constructor', '__proto__'];
    for (const prop of protoProps) {
      expect(orderStore.getOrder(prop)).toBeUndefined();
      expect(orderStore.getOrderByOrderId(prop)).toBeUndefined();
      expect(orderStore.hasEvent(prop)).toBe(false);
    }
  });
});

// =============================================================================
// SUITE 2: CRYPTOGRAPHIC TAMPERING, BIT-FLIP & BOUNDS FUZZING
// =============================================================================
describe('Tier 5 Suite 2: Cryptographic Tampering, Bit-Flip & Bounds Fuzzing', () => {
  const originalEnv = { ...process.env };
  const secret = 'whsec_empirical_crypto_stress_secret_key_32_bytes!';

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('2.1: rejects 100% of bit-flipped Stripe webhook signature hex characters', () => {
    const rawBody = JSON.stringify({ id: 'evt_bitflip_test', type: 'test' });
    const now = Math.floor(Date.now() / 1000);
    const validHeader = generateStripeSignature(rawBody, secret, now);

    const parts = validHeader.split(',');
    const tPart = parts[0]; // t=...
    const v1Hex = parts[1].replace('v1=', ''); // 64-char hex

    expect(v1Hex.length).toBe(64);

    // Systematically flip bits across hex indices: 0, 1, 7, 15, 31, 47, 63
    const testIndices = [0, 1, 7, 15, 31, 47, 62, 63];
    for (const idx of testIndices) {
      const origChar = v1Hex[idx];
      // Flip hex character (if '0' -> '1', else '0')
      const flippedChar = origChar === '0' ? '1' : '0';
      const tamperedHex =
        v1Hex.substring(0, idx) + flippedChar + v1Hex.substring(idx + 1);
      const tamperedHeader = `${tPart},v1=${tamperedHex}`;

      const result = verifyStripeSignature(rawBody, tamperedHeader, secret);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature mismatch');
    }
  });

  it('2.2: enforces strict +/- 300s clock skew tolerance boundaries on webhook timestamps', () => {
    const rawBody = JSON.stringify({ id: 'evt_clock_skew_test' });
    const now = Math.floor(Date.now() / 1000);

    const skewScenarios = [
      { offset: -301, expectedValid: false, desc: '301 seconds past (outside tolerance)' },
      { offset: -300, expectedValid: true, desc: '300 seconds past (exact boundary)' },
      { offset: -299, expectedValid: true, desc: '299 seconds past (within tolerance)' },
      { offset: 0, expectedValid: true, desc: 'exact current timestamp' },
      { offset: 299, expectedValid: true, desc: '299 seconds future (within tolerance)' },
      { offset: 300, expectedValid: true, desc: '300 seconds future (exact boundary)' },
      { offset: 301, expectedValid: false, desc: '301 seconds future (outside tolerance)' }
    ];

    for (const sc of skewScenarios) {
      const ts = now + sc.offset;
      const sig = generateStripeSignature(rawBody, secret, ts);
      const res = verifyStripeSignature(rawBody, sig, secret, 300);

      expect(res.valid).toBe(sc.expectedValid);
      if (!sc.expectedValid) {
        expect(res.error).toContain('Timestamp outside the tolerance zone');
      }
    }

    // Degenerate timestamps
    const corruptTimestamps = [
      't=0,v1=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      't=NaN,v1=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      't=9999999999,v1=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
      't=-5000,v1=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
    ];

    for (const badHeader of corruptTimestamps) {
      const res = verifyStripeSignature(rawBody, badHeader, secret, 300);
      expect(res.valid).toBe(false);
    }
  });

  it('2.3: fuzzes malformed Stripe signature headers without crashing or throwing unhandled errors', () => {
    const rawBody = '{"id":"evt_fuzz"}';
    const malformedHeaders = [
      '',
      '   ',
      'invalid_header_scheme',
      't=',
      'v1=',
      't=12345',
      'v1=abcd',
      't=12345,v1=',
      't=,v1=12345',
      ',,,',
      '===',
      't=12345,v0=abcdef',
      't=12345,v1=not_hex_characters_here_at_all_which_is_clearly_invalid_hmac!',
      't=12345,v1=oddlengthhex12345',
      't=12345,v1=a',
      't=12345,v1=null',
      't=12345,v1=undefined',
      't=12345,v1=\x00\x01\x02',
      't=12345,v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    ];

    for (const badHeader of malformedHeaders) {
      const res = verifyStripeSignature(rawBody, badHeader, secret);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    }
  });

  it('2.4: rejects bit-flipped and character-tampered download DRM JWT tokens', () => {
    const validToken = generateDownloadToken(
      { sessionId: 'cs_token_tamper', tierId: 'blueprint', email: 'seeker@369com.co' },
      secret
    );

    const [header, payload, signature] = validToken.split('.');
    expect(header).toBeDefined();
    expect(payload).toBeDefined();
    expect(signature).toBeDefined();

    // 1. Bit-flip in signature segment
    const tamperedSig =
      signature.slice(0, -1) + (signature.slice(-1) === 'A' ? 'B' : 'A');
    const tokenWithTamperedSig = `${header}.${payload}.${tamperedSig}`;
    const resSig = verifyDownloadToken(tokenWithTamperedSig, secret);
    expect(resSig.valid).toBe(false);
    expect(resSig.error).toContain('Download token invalid or tampered');

    // 2. Tampered payload claim (privilege escalation: blueprint -> master)
    const decodedPayload = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf-8')
    );
    decodedPayload.tierId = 'master';
    const tamperedPayloadB64 = Buffer.from(
      JSON.stringify(decodedPayload)
    ).toString('base64url');
    const escalatedToken = `${header}.${tamperedPayloadB64}.${signature}`;
    const resPayload = verifyDownloadToken(escalatedToken, secret);
    expect(resPayload.valid).toBe(false);
    expect(resPayload.error).toContain('Download token invalid or tampered');

    // 3. Tampered header segment
    const tamperedHeaderB64 = Buffer.from(
      JSON.stringify({ alg: 'HS512', typ: 'JWT' })
    ).toString('base64url');
    const headerTamperedToken = `${tamperedHeaderB64}.${payload}.${signature}`;
    const resHeader = verifyDownloadToken(headerTamperedToken, secret);
    expect(resHeader.valid).toBe(false);
    expect(resHeader.error).toContain('Download token invalid or tampered');
  });

  it('2.5: defends against timingSafeEqual length mismatch crash on variable-length signatures', () => {
    const validToken = generateDownloadToken(
      { sessionId: 'cs_timing_safe_test', tierId: 'blueprint', email: 'seeker@369com.co' },
      secret
    );
    const [header, payload] = validToken.split('.');

    // Standard base64url HMAC-SHA256 signature is 43 characters long
    // If timingSafeEqual is called with mismatched buffer lengths in Node, it throws RangeError!
    // verifyDownloadToken MUST handle length mismatch safely without throwing.
    const signatureLengths = [0, 1, 5, 10, 20, 42, 44, 45, 64, 128, 512];

    for (const len of signatureLengths) {
      const dummySig = 'x'.repeat(len);
      const testToken = `${header}.${payload}.${dummySig}`;

      expect(() => {
        const res = verifyDownloadToken(testToken, secret);
        expect(res.valid).toBe(false);
        expect(res.error).toBe('Download token invalid or tampered');
      }).not.toThrow();
    }
  });

  it('2.6: enforces strict token expiration and handles future timestamps', () => {
    const now = Math.floor(Date.now() / 1000);

    // 1. Expired token (1 second in past)
    const expiredToken1s = generateDownloadToken(
      { sessionId: 'cs_expired_1s', tierId: 'blueprint', email: 'seeker@369com.co' },
      secret,
      -1
    );
    const res1s = verifyDownloadToken(expiredToken1s, secret);
    expect(res1s.valid).toBe(false);
    expect(res1s.error).toBe('Download token has expired');

    // 2. Expired token (1 year in past)
    const expiredToken1yr = generateDownloadToken(
      { sessionId: 'cs_expired_1yr', tierId: 'blueprint', email: 'seeker@369com.co' },
      secret,
      -31536000
    );
    const res1yr = verifyDownloadToken(expiredToken1yr, secret);
    expect(res1yr.valid).toBe(false);
    expect(res1yr.error).toBe('Download token has expired');

    // 3. Valid future expiration (+7 days default)
    const validToken = generateDownloadToken(
      { sessionId: 'cs_valid_7d', tierId: 'blueprint', email: 'seeker@369com.co' },
      secret,
      86400 * 7
    );
    const resValid = verifyDownloadToken(validToken, secret);
    expect(resValid.valid).toBe(true);
    expect(resValid.claims?.sessionId).toBe('cs_valid_7d');
    expect(resValid.claims?.exp).toBeGreaterThan(now);
  });

  it('2.7: repels JWT algorithm confusion attack vectors (alg: none, alg: RS256)', () => {
    // Attack scenario: Attacker attempts "alg: none" bypass
    const headerNone = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' })
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        sessionId: 'cs_alg_none_attack',
        tierId: 'master',
        email: 'attacker@evil.com',
        exp: Math.floor(Date.now() / 1000) + 3600
      })
    ).toString('base64url');

    // alg: none with empty signature
    const attackTokenEmptySig = `${headerNone}.${payload}.`;
    const res1 = verifyDownloadToken(attackTokenEmptySig, secret);
    expect(res1.valid).toBe(false);
    expect(res1.error).toContain('Download token invalid or tampered');

    // alg: none with arbitrary signature
    const attackTokenArbitrarySig = `${headerNone}.${payload}.unsigned_signature`;
    const res2 = verifyDownloadToken(attackTokenArbitrarySig, secret);
    expect(res2.valid).toBe(false);
    expect(res2.error).toContain('Download token invalid or tampered');
  });

  it('2.8: validates secret boundary and production security guard', () => {
    const tokenSecretA = generateDownloadToken(
      { sessionId: 'cs_secret_a', tierId: 'blueprint', email: 'seeker@369com.co' },
      'secret_key_aaaaa_32_characters_minimum!'
    );

    // Verify token signed with Secret A is rejected by Secret B
    const resSecretB = verifyDownloadToken(
      tokenSecretA,
      'secret_key_bbbbb_32_characters_minimum!'
    );
    expect(resSecretB.valid).toBe(false);
    expect(resSecretB.error).toContain('Download token invalid or tampered');

    // Test production security guard when secret is unset or contains placeholder
    const prodEnv: Record<string, string | undefined> = {
      NODE_ENV: 'production',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder_secret_for_testing'
    };

    expect(() => getDownloadSigningSecret(prodEnv)).toThrow(
      /Production security guard/
    );

    // If ALLOW_MOCK_PAYMENTS_IN_PRODUCTION is true, returns mock fallback safely
    const prodWithMockEnv: Record<string, string | undefined> = {
      NODE_ENV: 'production',
      ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true',
      STRIPE_WEBHOOK_SECRET: 'whsec_placeholder_secret_for_testing'
    };
    expect(getDownloadSigningSecret(prodWithMockEnv)).toBe(
      'whsec_fulfillment_token_secret_min_32_characters'
    );
  });
});

// =============================================================================
// SUITE 3: MALFORMED PAYLOADS, GIANT STRINGS & RESOURCE EXHAUSTION
// =============================================================================
describe('Tier 5 Suite 3: Malformed Payloads, Giant Strings & Resource Exhaustion', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
    process.env = { ...originalEnv };
    process.env.MOCK_PAYMENTS = 'true';
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('3.1: safely clamps giant intention strings (100KB) in checkout POST without OOM', async () => {
    const giantIntention = '369_ABUNDANCE_'.repeat(7000); // ~98 KB
    expect(giantIntention.length).toBeGreaterThan(90000);

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId: 'starter',
        customerEmail: 'giant_string@369com.co',
        customerName: 'Nikola Giant',
        intention: giantIntention
      })
    });

    const res = await checkoutPost(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);

    const saved = orderStore.getOrder(json.sessionId);
    expect(saved).toBeDefined();
    // Verify intention was clamped to exactly 500 characters
    expect(saved?.intention?.length).toBe(500);
    expect(saved?.intention).toBe(giantIntention.slice(0, 500));
  });

  it('3.2: verifies ReDoS resistance on 100,000-character malicious email payload', () => {
    // Craft non-matching email with catastrophic backtracking potential
    const maliciousEmailNoAt = 'a'.repeat(100000) + '.domain.com';
    const maliciousEmailNoDot = 'a'.repeat(100000) + '@domain';
    const maliciousEmailWithSpaces = 'a'.repeat(50000) + ' ' + 'b'.repeat(50000) + '@domain.com';

    const startTime = performance.now();
    expect(isValidEmail(maliciousEmailNoAt)).toBe(false);
    expect(isValidEmail(maliciousEmailNoDot)).toBe(false);
    expect(isValidEmail(maliciousEmailWithSpaces)).toBe(false);
    const durationMs = performance.now() - startTime;

    // Must complete in under 50ms without freezing the event loop
    expect(durationMs).toBeLessThan(50);
  });

  it('3.3: rejects all degenerate JSON payloads in POST /api/checkout with HTTP 400', async () => {
    const degeneratePayloads = [
      '',
      '   ',
      'null',
      'true',
      'false',
      '12345',
      '"just a string"',
      '[]',
      '[{"tierId": "starter"}]',
      '{"tierId": "starter", unclosed_json: true',
      '{"tierId": null}',
      '{"tierId": 12345}'
    ];

    for (const badBody of degeneratePayloads) {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: badBody
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    }
  });

  it('3.4: handles deeply nested JSON payloads without call stack exhaustion', async () => {
    let deeplyNested: any = { tierId: 'starter', customerEmail: 'seeker@369com.co' };
    for (let depth = 0; depth < 50; depth++) {
      deeplyNested = { child: deeplyNested };
    }

    const req = new NextRequest('http://localhost:3000/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deeplyNested)
    });

    const res = await checkoutPost(req);
    // Missing top-level tierId because it is nested 50 levels deep
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid tier specified');
  });

  it('3.5: sanitizes adversarial unicode strings (zalgo, combining, RTL, astral emojis, lone surrogates)', () => {
    const adversarialVectors = [
      {
        input: 'N̵i̶k̸o̸l̶a̸ ̵T̶e̸s̵l̶a̸',
        expectedSubset: 'Nikola Tesla',
        desc: 'Zalgo combining diacritics'
      },
      {
        input: '\u202Ereversed_manifestation\u202C',
        desc: 'Right-to-left override character'
      },
      {
        input: '✨🌟🧘‍♂️💎⚡️🌈🕊️🔥',
        fallback: 'Cosmic Seeker',
        desc: 'Pure astral plane emoji string'
      },
      {
        input: 'Client\x00Name\x08With\x1bControl\x7fChars',
        desc: 'ASCII control characters and null byte'
      },
      {
        input: 'A'.repeat(50000),
        desc: '50,000-character name string'
      }
    ];

    for (const vec of adversarialVectors) {
      const sanitized = sanitizeForPdf(vec.input, 60, vec.fallback || 'Cosmic Seeker');

      // Clamped to max length
      expect(sanitized.length).toBeLessThanOrEqual(60);
      expect(sanitized.length).toBeGreaterThan(0);

      // Every character must strictly satisfy WinAnsi encoding for Helvetica safety
      for (let i = 0; i < sanitized.length; i++) {
        const cp = sanitized.codePointAt(i);
        expect(cp).toBeDefined();
        if (cp) {
          expect(isWinAnsiCodePoint(cp)).toBe(true);
        }
      }
    }
  });

  it('3.6: returns HTTP 400 on valid webhook signature over malformed / missing event structure', async () => {
    const testSecret = 'whsec_malformed_event_test_secret_32_chars';
    process.env.STRIPE_WEBHOOK_SECRET = testSecret;

    // 1. Valid signature over truncated JSON
    const malformedJson = '{"id": "evt_broken", "type": "checkout.session.completed", "data":';
    const sigMalformed = generateStripeSignature(malformedJson, testSecret);

    const reqMalformed = new NextRequest('http://localhost:3000/api/webhook/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sigMalformed
      },
      body: malformedJson
    });

    const resMalformed = await webhookPost(reqMalformed);
    expect(resMalformed.status).toBe(400);
    const jsonMalformed = await resMalformed.json();
    expect(jsonMalformed.error).toContain('Malformed JSON payload');

    // 2. Valid signature over JSON without event.id
    const missingIdJson = JSON.stringify({ type: 'checkout.session.completed', data: {} });
    const sigMissingId = generateStripeSignature(missingIdJson, testSecret);

    const reqMissingId = new NextRequest('http://localhost:3000/api/webhook/stripe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': sigMissingId
      },
      body: missingIdJson
    });

    const resMissingId = await webhookPost(reqMissingId);
    expect(resMissingId.status).toBe(400);
    const jsonMissingId = await resMissingId.json();
    expect(jsonMissingId.error).toContain('Invalid event structure');
  });

  it('3.7: verifies strict HTTP method restriction across API route handler exports', async () => {
    // Import route modules dynamically to verify exported HTTP method handlers
    const checkoutModule = await import('@/app/api/checkout/route');
    const webhookModule = await import('@/app/api/webhook/stripe/route');
    const downloadModule = await import('@/app/api/download/route');
    const statusModule = await import('@/app/api/order/status/route');

    // 1. Checkout route: exports POST and GET only (no PUT, DELETE, PATCH, HEAD)
    expect(typeof checkoutModule.POST).toBe('function');
    expect(typeof checkoutModule.GET).toBe('function');
    expect((checkoutModule as any).PUT).toBeUndefined();
    expect((checkoutModule as any).DELETE).toBeUndefined();
    expect((checkoutModule as any).PATCH).toBeUndefined();

    // 2. Webhook route: exports POST only (no GET, PUT, DELETE, PATCH)
    expect(typeof webhookModule.POST).toBe('function');
    expect((webhookModule as any).GET).toBeUndefined();
    expect((webhookModule as any).PUT).toBeUndefined();
    expect((webhookModule as any).DELETE).toBeUndefined();

    // 3. Download route: exports GET only (no POST, PUT, DELETE)
    expect(typeof downloadModule.GET).toBe('function');
    expect((downloadModule as any).POST).toBeUndefined();
    expect((downloadModule as any).PUT).toBeUndefined();

    // 4. Status route: exports GET only (no POST, PUT, DELETE)
    expect(typeof statusModule.GET).toBe('function');
    expect((statusModule as any).POST).toBeUndefined();
    expect((statusModule as any).PUT).toBeUndefined();
  });

  it('3.8: probes origin header spoofing in checkout session generation', async () => {
    // Probe with malicious or spoofed origin headers
    const origins = [
      'https://attacker-domain.evil.com',
      'http://localhost:3000',
      'https://369com.co',
      'https://369com.co/' // trailing slash normalization check
    ];

    for (const origin of origins) {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          origin
        },
        body: JSON.stringify({
          tierId: 'blueprint',
          customerEmail: 'origin_probe@369com.co'
        })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify no double-slash in path /success
      const cleanOrigin = origin.replace(/\/+$/, '');
      expect(json.url).toBe(`${cleanOrigin}/success?session_id=${json.sessionId}&mock=true`);
      expect(json.url).not.toContain('//success');
    }
  });
});

// =============================================================================
// SUITE 4: MEMORY SAFETY & UNCOMPRESSED PKZIP 2.0 HARDENING
// =============================================================================
describe('Tier 5 Suite 4: Memory Safety & Uncompressed PKZIP 2.0 Hardening', () => {
  it('4.1: produces valid 22-byte End of Central Directory record on empty archive', () => {
    const emptyZipBytes = createZipArchive([]);

    // PKZIP 2.0 empty archive consists strictly of the 22-byte EOCD record
    expect(emptyZipBytes.length).toBe(22);
    const buf = Buffer.from(emptyZipBytes);

    // EOCD Signature: 0x06054b50 (PK\x05\x06)
    expect(buf.readUInt32LE(0)).toBe(0x06054b50);
    expect(buf.readUInt16LE(4)).toBe(0); // disk number
    expect(buf.readUInt16LE(6)).toBe(0); // disk start
    expect(buf.readUInt16LE(8)).toBe(0); // central dir records on this disk
    expect(buf.readUInt16LE(10)).toBe(0); // total central dir records
    expect(buf.readUInt32LE(12)).toBe(0); // central dir size
    expect(buf.readUInt32LE(16)).toBe(0); // central dir offset
    expect(buf.readUInt16LE(20)).toBe(0); // comment length
  });

  it('4.2: packs single zero-byte entry with accurate CRC32 and PKZIP headers', () => {
    const zeroByteEntry: ZipEntry = {
      filename: 'empty-resonance.txt',
      data: new Uint8Array(0)
    };

    const zipBytes = createZipArchive([zeroByteEntry]);
    const buf = Buffer.from(zipBytes);
    const filenameBuf = Buffer.from(zeroByteEntry.filename, 'utf-8');

    // Local Header (30 bytes + filename length) + 0 bytes data
    expect(buf.readUInt32LE(0)).toBe(0x04034b50); // Local Header signature
    expect(buf.readUInt16LE(8)).toBe(0); // Compression method = 0 (stored)
    expect(buf.readUInt32LE(14)).toBe(0); // CRC32 of 0 bytes is 0
    expect(buf.readUInt32LE(18)).toBe(0); // Compressed size
    expect(buf.readUInt32LE(22)).toBe(0); // Uncompressed size
    expect(buf.readUInt16LE(26)).toBe(filenameBuf.length);

    // Verify Central Directory Header signature dynamically at correct offset
    const centralDirOffset = 30 + filenameBuf.length;
    expect(buf.readUInt32LE(centralDirOffset)).toBe(0x02014b50);

    // Verify EOCD record
    const eocdOffset = buf.length - 22;
    expect(buf.readUInt32LE(eocdOffset)).toBe(0x06054b50);
    expect(buf.readUInt16LE(eocdOffset + 8)).toBe(1); // 1 entry
    expect(buf.readUInt16LE(eocdOffset + 10)).toBe(1); // 1 total entry
  });

  it('4.3: validates CRC32 accuracy against IEEE 802.3 standard test vectors', () => {
    // Standard test vector: "123456789" ASCII -> 0xcbf43926
    const standardVector = Buffer.from('123456789');
    expect(crc32(standardVector)).toBe(0xcbf43926);

    // Empty vector -> 0x00000000
    expect(crc32(new Uint8Array(0))).toBe(0);

    // Single byte 0x00 -> 0xd202ef8d
    expect(crc32(new Uint8Array([0x00]))).toBe(0xd202ef8d);

    // Single byte 'a' -> 0xe8b7be43
    expect(crc32(Buffer.from('a'))).toBe(0xe8b7be43);

    // High entropy 64KB buffer
    const largeBuffer = Buffer.alloc(65536);
    for (let i = 0; i < 65536; i++) {
      largeBuffer[i] = (i * 31 + 17) & 0xff;
    }
    const crcLarge = crc32(largeBuffer);
    expect(typeof crcLarge).toBe('number');
    expect(crcLarge).toBeGreaterThan(0);
    // Deterministic repeatability
    expect(crc32(largeBuffer)).toBe(crcLarge);
  });

  it('4.4: parses multi-entry archive (10 files) verifying all offsets, signatures, and directory bounds', () => {
    const ENTRY_COUNT = 10;
    const entries: ZipEntry[] = Array.from({ length: ENTRY_COUNT }, (_, i) => ({
      filename: `vortex_node_${i + 1}.dat`,
      data: Buffer.from(`Resonance frequency data for node ${i + 1}: ${'369'.repeat(i * 50 + 10)}`)
    }));

    const zipBytes = createZipArchive(entries);
    const buf = Buffer.from(zipBytes);

    // Verify EOCD record at tail
    const eocdOffset = buf.length - 22;
    expect(buf.readUInt32LE(eocdOffset)).toBe(0x06054b50);
    expect(buf.readUInt16LE(eocdOffset + 8)).toBe(ENTRY_COUNT);
    expect(buf.readUInt16LE(eocdOffset + 10)).toBe(ENTRY_COUNT);

    const centralDirSize = buf.readUInt32LE(eocdOffset + 12);
    const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);
    expect(centralDirOffset + centralDirSize).toBe(eocdOffset);

    // Walk Central Directory headers
    let currentCdOffset = centralDirOffset;
    for (let i = 0; i < ENTRY_COUNT; i++) {
      expect(buf.readUInt32LE(currentCdOffset)).toBe(0x02014b50); // Central Header signature
      const expectedFilename = entries[i].filename;
      const fnLength = buf.readUInt16LE(currentCdOffset + 28);
      expect(fnLength).toBe(Buffer.from(expectedFilename).length);

      const entryCrc = buf.readUInt32LE(currentCdOffset + 16);
      expect(entryCrc).toBe(crc32(entries[i].data));

      const entrySize = buf.readUInt32LE(currentCdOffset + 20);
      expect(entrySize).toBe(entries[i].data.length);

      const localHeaderOffset = buf.readUInt32LE(currentCdOffset + 42);

      // Verify corresponding Local Header
      expect(buf.readUInt32LE(localHeaderOffset)).toBe(0x04034b50);
      expect(buf.readUInt32LE(localHeaderOffset + 14)).toBe(entryCrc);
      expect(buf.readUInt32LE(localHeaderOffset + 18)).toBe(entrySize);

      currentCdOffset += 46 + fnLength;
    }

    expect(currentCdOffset).toBe(eocdOffset);
  });

  it('4.5: preserves entry boundaries with adversarial filenames (path traversal, unicode, nulls)', () => {
    const adversarialEntries: ZipEntry[] = [
      {
        filename: '../../../../etc/shadow',
        data: Buffer.from('Blocked path traversal attempt')
      },
      {
        filename: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
        data: Buffer.from('Windows directory traversal attempt')
      },
      {
        filename: 'Никола_Тесла_Архив_369.pdf',
        data: Buffer.from('%PDF-1.4 Mock Cyrillic Entry')
      },
      {
        filename: 'Harmonic\x00Sanctuary.txt',
        data: Buffer.from('Null byte in filename')
      }
    ];

    const zipBytes = createZipArchive(adversarialEntries);
    expect(zipBytes.length).toBeGreaterThan(100);
    const buf = Buffer.from(zipBytes);

    // Archive builds cleanly with valid EOCD
    const eocdOffset = buf.length - 22;
    expect(buf.readUInt32LE(eocdOffset)).toBe(0x06054b50);
    expect(buf.readUInt16LE(eocdOffset + 8)).toBe(adversarialEntries.length);
  });

  it('4.6: generates 25 dynamic Blueprint PDFs in parallel with binary integrity (%PDF-, %%EOF)', async () => {
    const PARALLEL_PDFS = 25;
    const pdfPromises = Array.from({ length: PARALLEL_PDFS }, (_, i) => {
      return generatePersonalizedBlueprintPdf({
        clientName: `Cosmic Seeker ${i}`,
        birthDate: '1985-07-10',
        intention: `Manifestation intention for test iteration ${i}`,
        tierId: 'master'
      });
    });

    const results = await Promise.all(pdfPromises);

    for (let i = 0; i < PARALLEL_PDFS; i++) {
      const pdfBytes = results[i];
      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(5000);

      const pdfHeader = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
      expect(pdfHeader).toBe('%PDF-');

      const pdfTail = Buffer.from(pdfBytes.slice(-30)).toString('ascii');
      expect(pdfTail).toContain('%%EOF');
    }
  });

  it('4.7: downloads Master Suite ZIP with embedded Blueprint PDF and Solfeggio guide', async () => {
    const token = generateDownloadToken({
      sessionId: 'cs_master_zip_verification',
      tierId: 'master',
      email: 'master_sanctuary@369com.co',
      name: 'Tesla Sanctuary Seeker',
      intention: 'Universal abundance through Solfeggio 9-frequency resonance'
    });

    const req = new NextRequest(
      `http://localhost:3000/api/download?token=${encodeURIComponent(token)}`
    );

    const res = await downloadGet(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/zip');
    expect(res.headers.get('content-disposition')).toContain('369-Master-Sanctuary-Suite.zip');

    const zipBuffer = Buffer.from(await res.arrayBuffer());
    expect(zipBuffer.length).toBeGreaterThan(8000);

    // Verify ZIP magic
    expect(zipBuffer.readUInt32LE(0)).toBe(0x04034b50);

    // EOCD check
    const eocdOffset = zipBuffer.length - 22;
    expect(zipBuffer.readUInt32LE(eocdOffset)).toBe(0x06054b50);
    // Exactly 2 files: Blueprint PDF and Solfeggio Guide text
    expect(zipBuffer.readUInt16LE(eocdOffset + 8)).toBe(2);
    expect(zipBuffer.readUInt16LE(eocdOffset + 10)).toBe(2);

    // If explicit asset='pdf' requested on master tier, delivers single PDF instead of ZIP
    const reqPdfOnly = new NextRequest(
      `http://localhost:3000/api/download?token=${encodeURIComponent(token)}&asset=pdf`
    );
    const resPdfOnly = await downloadGet(reqPdfOnly);
    expect(resPdfOnly.status).toBe(200);
    expect(resPdfOnly.headers.get('content-type')).toBe('application/pdf');
    expect(resPdfOnly.headers.get('content-disposition')).toContain('Tesla-369-Manifestation-Blueprint.pdf');
  });
});
