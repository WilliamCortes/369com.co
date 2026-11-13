/**
 * Integration Test Suite for Next.js App Router API Handlers
 * tests/unit/api-routes.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as checkoutPost, GET as checkoutGet } from '@/app/api/checkout/route';
import { POST as webhookPost } from '@/app/api/webhook/stripe/route';
import { GET as downloadGet } from '@/app/api/download/route';
import { GET as orderStatusGet } from '@/app/api/order/status/route';
import { simulateWebhookEvent } from '@/lib/stripe';
import { generateDownloadToken, orderStore } from '@/lib/order-store';

describe('App Router API Route Handlers Integration', () => {
  beforeEach(() => {
    orderStore.clear();
  });

  describe('POST /api/checkout', () => {
    it('creates checkout session successfully for Blueprint tier ($7.99)', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: 'blueprint',
          customerEmail: 'test@369com.co',
          intention: 'Wealth and spiritual alignment'
        })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toMatch(/^mock_cs_/);
      expect(data.url).toContain(data.sessionId);
    });

    it('creates checkout session successfully for Master tier ($19.99)', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: 'master',
          customerEmail: 'master@369com.co'
        })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.sessionId).toBeDefined();
    });

    it('returns HTTP 400 when tierId is missing or empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid tier specified');
    });

    it('returns HTTP 400 when invalid tier is requested', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: 'nonexistent_tier' })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid tier specified');
    });

    it('returns HTTP 400 when email format is invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tierId: 'blueprint', customerEmail: 'notanemail' })
      });

      const res = await checkoutPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Invalid customer email format');
    });
  });

  describe('GET /api/checkout', () => {
    it('redirects to session URL when valid tierId query is supplied', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout?tierId=starter');
      const res = await checkoutGet(req);
      // Next.js redirect status is 307 or 308 or location header present
      expect([302, 307, 308]).toContain(res.status);
      expect(res.headers.get('location')).toContain('/success?session_id=');
    });

    it('returns HTTP 400 when tierId query is missing or invalid', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout?tierId=invalid');
      const res = await checkoutGet(req);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/webhook/stripe', () => {
    const testSecret = 'whsec_placeholder_secret_for_testing';

    it('returns HTTP 400 when stripe-signature header is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_1' })
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing stripe-signature header');
    });

    it('rejects tampered or mismatched payload signature with HTTP 400', async () => {
      const sim = simulateWebhookEvent({
        secret: testSecret,
        tamperPayload: true
      });

      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sim.signatureHeader },
        body: sim.rawBody
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Signature mismatch');
    });

    it('processes checkout.session.completed and fulfills order', async () => {
      const sim = simulateWebhookEvent({
        sessionId: 'cs_live_test_123',
        tierId: 'blueprint',
        customerEmail: 'customer@369com.co',
        secret: testSecret
      });

      const req = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sim.signatureHeader },
        body: sim.rawBody
      });

      const res = await webhookPost(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.received).toBe(true);
      expect(data.orderId).toBeDefined();

      // Verify order was stored
      const order = orderStore.getOrder('cs_live_test_123');
      expect(order).toBeDefined();
      expect(order?.status).toBe('fulfilled');
      expect(order?.downloadToken).toBeDefined();
    });

    it('prevents duplicate fulfillment on replayed webhook events (Idempotency)', async () => {
      const sim = simulateWebhookEvent({
        sessionId: 'cs_replay_test',
        secret: testSecret
      });

      const req1 = new NextRequest('http://localhost:3000/api/webhook/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': sim.signatureHeader },
        body: sim.rawBody
      });

      const res1 = await webhookPost(req1);
      expect(res1.status).toBe(200);
      const data1 = await res1.json();
      expect(data1.already_processed).toBeUndefined();

      // Second identical request
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
    });
  });

  describe('GET /api/order/status', () => {
    it('returns HTTP 400 when session_id query is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status');
      const res = await orderStatusGet(req);
      expect(res.status).toBe(400);
    });

    it('auto-fulfills mock sessions deterministically', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status?session_id=mock_cs_status_check');
      const res = await orderStatusGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('fulfilled');
      expect(data.downloadUrl).toContain('/api/download?token=');
    });

    it('returns pending for unknown live sessions', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status?session_id=cs_unknown_pending');
      const res = await orderStatusGet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('pending');
    });
  });

  describe('GET /api/download', () => {
    it('returns HTTP 401 when token query is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/download');
      const res = await downloadGet(req);
      expect(res.status).toBe(401);
    });

    it('returns HTTP 401 when token is tampered', async () => {
      const token = generateDownloadToken({ sessionId: 'cs_1', tierId: 'blueprint', email: 'a@b.com' });
      const tampered = token.replace(/.$/, 'X');
      const req = new NextRequest(`http://localhost:3000/api/download?token=${tampered}`);
      const res = await downloadGet(req);
      expect(res.status).toBe(401);
    });

    it('delivers personalized PDF with attachment disposition for Blueprint tier', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_valid_dl',
        tierId: 'blueprint',
        email: 'seeker@369com.co',
        name: 'Alexander Tesla'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`);
      const res = await downloadGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('Tesla-369-Manifestation-Blueprint.pdf');

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.slice(0, 5).toString('utf-8')).toBe('%PDF-');
    });

    it('delivers master suite zip archive with attachment disposition for Master tier', async () => {
      const token = generateDownloadToken({
        sessionId: 'cs_master_dl',
        tierId: 'master',
        email: 'master@369com.co',
        name: 'Master Seeker'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`);
      const res = await downloadGet(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/zip');
      expect(res.headers.get('Content-Disposition')).toContain('369-Master-Sanctuary-Suite.zip');

      const arrayBuf = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      expect(buffer.length).toBeGreaterThan(1000);
      // PK signature check for valid zip
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'
      expect(buffer[2]).toBe(0x03);
      expect(buffer[3]).toBe(0x04);
    });
  });
});
