import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as checkoutPost, GET as checkoutGet } from '@/app/api/checkout/route';
import { GET as downloadGet } from '@/app/api/download/route';
import {
  isValidTier,
  isValidEmail,
  createCheckoutSession,
  createMockCheckoutSession,
  PRODUCT_CATALOG
} from '@/lib/stripe';
import {
  getDownloadSigningSecret,
  verifyDownloadToken,
  generateDownloadToken
} from '@/lib/order-store';

describe('M2 & M3 Remediation Adversarial Challenge Probes', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.MOCK_PAYMENTS = 'true';
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Empirical Probe: tierId Prototype Pollution & Property Lookup', () => {
    const protoKeys = ['toString', 'valueOf', 'constructor', '__proto__', 'isPrototypeOf'];

    it.each(protoKeys)('rejects prototype property "%s" in isValidTier', (protoKey) => {
      expect(isValidTier(protoKey)).toBe(false);
    });

    it.each(protoKeys)('rejects prototype property "%s" in createCheckoutSession with HTTP 400', async (protoKey) => {
      await expect(
        createCheckoutSession({ tierId: protoKey, customerEmail: 'seeker@369com.co' })
      ).rejects.toMatchObject({
        message: 'Invalid tier specified',
        status: 400
      });
    });

    it.each(protoKeys)('rejects prototype property "%s" in createMockCheckoutSession with HTTP 400', (protoKey) => {
      expect(() => {
        createMockCheckoutSession({ tierId: protoKey, customerEmail: 'seeker@369com.co' });
      }).toThrowError();

      try {
        createMockCheckoutSession({ tierId: protoKey, customerEmail: 'seeker@369com.co' });
      } catch (err: any) {
        expect(err.message).toBe('Invalid tier specified');
        expect(err.status).toBe(400);
      }
    });

    it.each(protoKeys)('returns HTTP 400 from POST /api/checkout for prototype property "%s"', async (protoKey) => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: protoKey, customerEmail: 'seeker@369com.co' })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid tier specified');
    });

    it.each(protoKeys)('returns HTTP 400 from GET /api/checkout for prototype property "%s"', async (protoKey) => {
      const req = new NextRequest(`http://localhost:3000/api/checkout?tierId=${encodeURIComponent(protoKey)}&customerEmail=seeker@369com.co`);
      const res = await checkoutGet(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid tier specified');
    });
  });

  describe('2. Empirical Probe: customerEmail Invalid Strings & Injection Resistance', () => {
    const invalidEmailStrings = [
      '@missinguser.com',
      'spaces in@email.com',
      'user@domain.com\r\nBcc:attacker@domain.com',
      'user@domain.com\r\nSet-Cookie:malicious=true',
      'user@domain.com\nInjected-Header:val',
      'user@domain.com\rInjected-Header:val',
      'missingatsign.com',
      'plainaddress',
      'user@.com',
      'user@domain',
      '   '
    ];

    it.each(invalidEmailStrings)('rejects invalid email format "%s" in isValidEmail', (email) => {
      expect(isValidEmail(email)).toBe(false);
    });

    it.each(invalidEmailStrings)('rejects invalid email "%s" in createCheckoutSession with HTTP 400', async (email) => {
      await expect(
        createCheckoutSession({ tierId: 'blueprint', customerEmail: email })
      ).rejects.toMatchObject({
        message: 'Invalid customer email format',
        status: 400
      });
    });

    it.each(invalidEmailStrings)('rejects invalid email "%s" in createMockCheckoutSession with HTTP 400', (email) => {
      expect(() => {
        createMockCheckoutSession({ tierId: 'blueprint', customerEmail: email });
      }).toThrowError();

      try {
        createMockCheckoutSession({ tierId: 'blueprint', customerEmail: email });
      } catch (err: any) {
        expect(err.message).toBe('Invalid customer email format');
        expect(err.status).toBe(400);
      }
    });

    it.each(invalidEmailStrings)('returns HTTP 400 from POST /api/checkout for invalid email "%s"', async (email) => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: 'blueprint', customerEmail: email })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid customer email format');
    });

    it.each(invalidEmailStrings)('returns HTTP 400 from GET /api/checkout for invalid email "%s"', async (email) => {
      const req = new NextRequest(`http://localhost:3000/api/checkout?tierId=blueprint&customerEmail=${encodeURIComponent(email)}`);
      const res = await checkoutGet(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Invalid customer email format');
    });

    it('treats empty string or undefined customerEmail as optional in createCheckoutSession and routes', async () => {
      // Optional email should be permitted and fall back to default or hosted checkout
      const mockRes = createMockCheckoutSession({ tierId: 'blueprint', customerEmail: '' });
      expect(mockRes.success).toBe(true);

      const postReq = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: 'blueprint' })
      });
      const postRes = await checkoutPost(postReq);
      expect(postRes.status).toBe(200);

      const getReq = new NextRequest('http://localhost:3000/api/checkout?tierId=blueprint');
      const getRes = await checkoutGet(getReq);
      expect([200, 307]).toContain(getRes.status);
    });

    it('accepts legitimate email variations', async () => {
      const validEmails = [
        'seeker@369com.co',
        'nikola.tesla@resonance.org',
        'user+tag@sub.domain.co'
      ];

      for (const email of validEmails) {
        expect(isValidEmail(email)).toBe(true);
        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tierId: 'blueprint', customerEmail: email })
        });
        const res = await checkoutPost(req);
        expect(res.status).toBe(200);
      }
    });
  });

  describe('3. Empirical Probe: Production Download Signing Secret Guard', () => {
    it('throws fail-safe error in production when secret is missing', () => {
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: '',
          FULFILLMENT_JWT_SECRET: '',
          STRIPE_WEBHOOK_SECRET: ''
        });
      }).toThrow(/Production security guard/);
    });

    it('rejects placeholder secrets in production', () => {
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: 'whsec_placeholder_secret_for_testing'
        });
      }).toThrow(/Production security guard.*non-placeholder/);
    });

    it('rejects hardcoded fallback secret in production', () => {
      expect(() => {
        getDownloadSigningSecret({
          NODE_ENV: 'production',
          DOWNLOAD_SIGNING_SECRET: 'whsec_fulfillment_token_secret_min_32_characters'
        });
      }).toThrow(/Production security guard.*non-placeholder/);
    });

    it('accepts valid >= 32 character non-placeholder secret in production', () => {
      const validKey = 'production_super_secure_signing_secret_key_369_universal';
      const secret = getDownloadSigningSecret({
        NODE_ENV: 'production',
        DOWNLOAD_SIGNING_SECRET: validKey
      });
      expect(secret).toBe(validKey);
    });

    it('permits fallback in production ONLY when ALLOW_MOCK_PAYMENTS_IN_PRODUCTION is explicitly "true"', () => {
      const secret = getDownloadSigningSecret({
        NODE_ENV: 'production',
        ALLOW_MOCK_PAYMENTS_IN_PRODUCTION: 'true'
      });
      expect(secret).toBe('whsec_fulfillment_token_secret_min_32_characters');
    });

    it('returns invalid verification and causes HTTP 500 on download endpoint in unconfigured production', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevSecret = process.env.DOWNLOAD_SIGNING_SECRET;
      const prevMock = process.env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION;

      try {
        process.env.NODE_ENV = 'production';
        delete process.env.DOWNLOAD_SIGNING_SECRET;
        delete process.env.FULFILLMENT_JWT_SECRET;
        delete process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION;

        const verifyResult = verifyDownloadToken('some.fake.token');
        expect(verifyResult.valid).toBe(false);
        expect(verifyResult.error).toContain('Production security guard');

        const req = new NextRequest('http://localhost:3000/api/download?token=some.fake.token');
        const res = await downloadGet(req);
        expect(res.status).toBe(500);
        const data = await res.json();
        expect(data.error).toContain('Production security guard');
      } finally {
        process.env.NODE_ENV = prevEnv;
        if (prevSecret) process.env.DOWNLOAD_SIGNING_SECRET = prevSecret;
        if (prevMock) process.env.ALLOW_MOCK_PAYMENTS_IN_PRODUCTION = prevMock;
      }
    });
  });
});
