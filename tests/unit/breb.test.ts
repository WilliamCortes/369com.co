import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as brebOrderPost } from '@/app/api/breb/order/route';
import { POST as brebApprovePost } from '@/app/api/breb/approve/route';
import { GET as orderStatusGet } from '@/app/api/order/status/route';
import { GET as downloadGet } from '@/app/api/download/route';
import { getCopAmountForTier, formatCop } from '@/lib/catalog';
import { getBrebKey, getBrebWhatsappNumber } from '@/lib/breb';
import { orderStore } from '@/lib/order-store';

describe('Colombia Bre-B (@3103298346) Transfer & Admin Approval Flow', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    orderStore.clear();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to @3103298346 key, 573103298346 WhatsApp, and rounds COP amounts cleanly', () => {
    expect(getBrebKey({})).toBe('@3103298346');
    expect(getBrebWhatsappNumber({})).toBe('573103298346');
    expect(getCopAmountForTier('starter', 4200)).toBe(21000);
    expect(getCopAmountForTier('blueprint', 4200)).toBe(33600);
    expect(getCopAmountForTier('master', 4200)).toBe(84000);
    expect(formatCop(33600)).toContain('33');
  });

  it('validates email and transfer reference on POST /api/breb/order', async () => {
    const badEmailReq = new NextRequest('https://369com.co/api/breb/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId: 'blueprint',
        customerEmail: 'invalid-email',
        transferReference: 'NEQ12345'
      })
    });
    const badEmailRes = await brebOrderPost(badEmailReq);
    expect(badEmailRes.status).toBe(400);

    const shortRefReq = new NextRequest('https://369com.co/api/breb/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId: 'blueprint',
        customerEmail: 'cliente@369com.co',
        transferReference: '12'
      })
    });
    const shortRefRes = await brebOrderPost(shortRefReq);
    expect(shortRefRes.status).toBe(400);
  });

  it('registers pending Bre-B order without granting download access until admin approves', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DOWNLOAD_SIGNING_SECRET = 'breb_test_signing_secret_at_least_32_characters_long';
    process.env.BRE_B_ADMIN_KEY = 'super_secret_breb_admin_key_test';

    const createReq = new NextRequest('https://369com.co/api/breb/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'https://369com.co' },
      body: JSON.stringify({
        tierId: 'blueprint',
        customerEmail: 'colombia@369com.co',
        customerName: 'Sofía Mora',
        intention: 'Claridad y enfoque',
        transferReference: 'M4829104',
        numerologyData: {
          birthDate: '1993-06-09',
          lifePath: 6,
          lifePathTitle: 'The Cosmic Nurturer',
          teslaNode: 6,
          resonance369Score: 91,
          dominantElement: 'Resonance'
        }
      })
    });

    const createRes = await brebOrderPost(createReq);
    expect(createRes.status).toBe(201);
    const created = await createRes.json();
    expect(created.success).toBe(true);
    expect(created.brebKey).toBe('@3103298346');
    expect(created.whatsappUrl).toContain('https://wa.me/573103298346');
    expect(created.claimToken).toBeTruthy();

    // Order must stay pending and must NOT expose a download URL prior to approval
    const pendingRes = await orderStatusGet(
      new NextRequest(`https://369com.co/api/order/status?session_id=${created.sessionId}`)
    );
    const pendingJson = await pendingRes.json();
    expect(pendingJson.status).toBe('pending');
    expect(pendingJson.downloadUrl).toBeNull();

    // Wrong admin key is rejected
    const wrongAdminRes = await brebApprovePost(
      new NextRequest('https://369com.co/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: created.claimToken,
          adminKey: 'wrong_key'
        })
      })
    );
    expect(wrongAdminRes.status).toBe(401);

    // Tampered claim token is rejected even with valid admin key
    const tamperedRes = await brebApprovePost(
      new NextRequest('https://369com.co/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: `${created.claimToken}tamper`,
          adminKey: 'super_secret_breb_admin_key_test'
        })
      })
    );
    expect(tamperedRes.status).toBe(400);

    // Preview succeeds with valid admin key
    const previewRes = await brebApprovePost(
      new NextRequest('https://369com.co/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimToken: created.claimToken,
          adminKey: 'super_secret_breb_admin_key_test',
          previewOnly: true
        })
      })
    );
    expect(previewRes.status).toBe(200);
    const previewJson = await previewRes.json();
    expect(previewJson.claim.transferReference).toBe('M4829104');

    // Valid approval mints VIP successUrl & downloadToken
    const approveRes = await brebApprovePost(
      new NextRequest('https://369com.co/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: 'https://369com.co' },
        body: JSON.stringify({
          claimToken: created.claimToken,
          adminKey: 'super_secret_breb_admin_key_test'
        })
      })
    );
    expect(approveRes.status).toBe(200);
    const approved = await approveRes.json();
    expect(approved.success).toBe(true);
    expect(approved.successUrl).toContain('https://369com.co/success?token=');

    // Clear in-memory store to prove stateless serverless token status & PDF download work
    orderStore.clear();

    const statusRes = await orderStatusGet(
      new NextRequest(
        `https://369com.co/api/order/status?token=${encodeURIComponent(approved.downloadToken)}`
      )
    );
    expect(statusRes.status).toBe(200);
    const statusJson = await statusRes.json();
    expect(statusJson.status).toBe('fulfilled');
    expect(statusJson.tierId).toBe('blueprint');

    const dlRes = await downloadGet(
      new NextRequest(`https://369com.co/api/download?token=${encodeURIComponent(approved.downloadToken)}`)
    );
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers.get('content-type')).toBe('application/pdf');
    const pdfBuf = Buffer.from(await dlRes.arrayBuffer());
    expect(pdfBuf.subarray(0, 5).toString('utf-8')).toBe('%PDF-');
  });

  it('fails closed in production when BRE_B_ADMIN_KEY is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.BRE_B_ADMIN_KEY;

    const res = await brebApprovePost(
      new NextRequest('https://369com.co/api/breb/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimToken: 'abc', adminKey: 'anything' })
      })
    );
    expect(res.status).toBe(500);
  });
});
