import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generatePersonalizedBlueprintPdf } from '@/lib/pdf-generator';
import {
  generateDownloadToken,
  verifyDownloadToken,
  getDownloadSigningSecret,
  orderStore
} from '@/lib/order-store';
import { createZipArchive, crc32 } from '@/lib/zip';
import { GET as downloadRoute } from '@/app/api/download/route';
import { GET as statusRoute } from '@/app/api/order/status/route';
import { NextRequest } from 'next/server';
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

describe('CHALLENGER 2: ADVERSARIAL STRESS TEST HARNESS', () => {
  // =========================================================================
  // 1. DYNAMIC PDF GENERATOR ADVERSARIAL PROBES
  // =========================================================================
  describe('1. PDF Generator Boundary & Vulnerability Probes', () => {
    it('PROBE 1.1: Unicode & Non-WinAnsi Names (Cyrillic, CJK, Arabic, Greek)', async () => {
      // Nikola Tesla in Serbian Cyrillic, Chinese, Arabic, Greek
      const internationalNames = [
        { script: 'Cyrillic', name: 'Никола Тесла' },
        { script: 'Chinese', name: '李小龙' },
        { script: 'Arabic', name: 'محمد' },
        { script: 'Greek', name: 'Αριστοτέλης' },
        { script: 'Japanese', name: '田中' },
        { script: 'Polish', name: 'Łukasz' },
        { script: 'Turkish', name: 'Çıvgın' },
      ];

      for (const item of internationalNames) {
        // Post-fix: International names must generate valid PDFs without throwing
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: item.name,
          intention: 'Peace and Prosperity'
        });
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBeGreaterThan(5000);
      }
    });

    it('PROBE 1.2: Emojis and Special Astral Code Points', async () => {
      const emojiInputs = [
        'Seeker ✨',
        'Abundance 🌟 Manifest',
        'Meditator 🧘‍♂️',
        'Cosmic 🔮 Energy',
        'Sacred ॐ Symbol'
      ];

      for (const input of emojiInputs) {
        // Post-fix: Inputs with emojis must generate valid PDFs without throwing
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: input,
          intention: 'Universal alignment'
        });
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBeGreaterThan(5000);
      }
    });

    it('PROBE 1.3: Western European Accented Names (Latin-1/WinAnsi compatible)', async () => {
      // These characters ARE within WinAnsi encoding (0x00-0xFF subset)
      const validNames = ['René Descartes', 'José María', 'Frédéric Chopin', 'Müller'];

      for (const name of validNames) {
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: name,
          intention: 'Clarity and wisdom'
        });

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBeGreaterThan(5000);
        // Header verification: %PDF-1.7
        const header = Buffer.from(bytes.slice(0, 5)).toString('ascii');
        expect(header).toBe('%PDF-');
      }
    });

    it('PROBE 1.4: 10,000-Character Long Strings (Stress & Buffer Overflow)', async () => {
      const longName = 'A'.repeat(10000);
      const longIntention = 'Manifesting infinite universal abundance '.repeat(250);

      const startTime = Date.now();
      const pdfBytes = await generatePersonalizedBlueprintPdf({
        clientName: longName,
        intention: longIntention
      });
      const duration = Date.now() - startTime;

      expect(pdfBytes).toBeInstanceOf(Uint8Array);
      expect(pdfBytes.length).toBeGreaterThan(1000);
      expect(duration).toBeLessThan(1000); // Must complete within 1 second without OOM
    });

    it('PROBE 1.5: XSS and HTML / Script Payloads in Inputs', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '"><svg onload=alert(document.cookie)>',
        '{{constructor.constructor("alert(1)")()}}',
        'javascript:alert(1)'
      ];

      for (const payload of xssPayloads) {
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: payload,
          intention: payload
        });

        expect(bytes).toBeInstanceOf(Uint8Array);
        // Check valid PDF output structure
        const pdfString = Buffer.from(bytes).toString('latin1');
        expect(pdfString).toContain('%PDF-');
        expect(pdfString).toContain('%%EOF');
      }
    });

    it('PROBE 1.6: Boundary and Extreme Numerology Numeric Parameters', async () => {
      // Negative numbers, zero, large numbers, floating point numbers
      const extremeParams = [
        { lifePathNumber: -1, teslaTriadNode: -9, resonanceScore: -50 },
        { lifePathNumber: 0, teslaTriadNode: 0, resonanceScore: 0 },
        { lifePathNumber: 999999, teslaTriadNode: 333333, resonanceScore: 10000 },
        { lifePathNumber: 3.14159, teslaTriadNode: 6.28, resonanceScore: 88.888 },
        { lifePathNumber: NaN, teslaTriadNode: NaN, resonanceScore: NaN }
      ];

      for (const p of extremeParams) {
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: 'Harmonic Tester',
          ...p
        });
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBeGreaterThan(5000);
      }
    });

    it('PROBE 1.7: Affirmation Count Extremes', async () => {
      // 0 affirmations, 1 affirmation, negative count, huge count
      for (const count of [0, 1, -10, 100, 33]) {
        const bytes = await generatePersonalizedBlueprintPdf({
          clientName: 'Affirmation Seeker',
          affirmationCount: count
        });
        expect(bytes).toBeInstanceOf(Uint8Array);
      }
    });

    it('PROBE 1.8: Missing and Undefined Optional Parameters', async () => {
      // Minimal possible input
      const bytes = await generatePersonalizedBlueprintPdf({
        clientName: ''
      });
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(5000);
    });
  });

  // =========================================================================
  // 2. DRM DOWNLOAD TOKEN SIGNING, TAMPERING & EXPIRATION PROBES
  // =========================================================================
  describe('2. DRM Download Token Cryptographic Probes', () => {
    const secret = 'test_secret_key_369_super_secure_32_characters';

    it('PROBE 2.1: Valid Token Generation and Verification Cycle', () => {
      const claims = {
        sessionId: 'cs_test_valid_123',
        tierId: 'blueprint',
        email: 'user@example.com',
        name: 'John Doe'
      };

      const token = generateDownloadToken(claims, secret, 3600);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);

      const result = verifyDownloadToken(token, secret);
      expect(result.valid).toBe(true);
      expect(result.claims.sessionId).toBe(claims.sessionId);
      expect(result.claims.tierId).toBe(claims.tierId);
      expect(result.claims.email).toBe(claims.email);
      expect(result.claims.name).toBe(claims.name);
      expect(result.claims.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('PROBE 2.2: Rejection of Tampered Payload (Privilege Escalation Attack)', () => {
      const claims = {
        sessionId: 'cs_test_tier1_normal',
        tierId: 'blueprint',
        email: 'user@example.com'
      };
      const token = generateDownloadToken(claims, secret, 3600);
      const [header, payload, sig] = token.split('.');

      // Attacker decodes payload, changes tierId from 'blueprint' to 'master', re-encodes
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
      decoded.tierId = 'master';
      const tamperedPayload = Buffer.from(JSON.stringify(decoded)).toString('base64url');

      const tamperedToken = `${header}.${tamperedPayload}.${sig}`;
      const result = verifyDownloadToken(tamperedToken, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Download token invalid or tampered');
    });

    it('PROBE 2.3: Rejection of Tampered Signature (Single Bit Flip)', () => {
      const token = generateDownloadToken({ sessionId: 'cs_1', tierId: 'pro', email: 'a@b.com' }, secret);
      const [header, payload, sig] = token.split('.');

      // Flip the last character of the signature
      const lastChar = sig.slice(-1);
      const replacement = lastChar === 'a' ? 'b' : 'a';
      const forgedSig = sig.slice(0, -1) + replacement;

      const tamperedToken = `${header}.${payload}.${forgedSig}`;
      const result = verifyDownloadToken(tamperedToken, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Download token invalid or tampered');
    });

    it('PROBE 2.4: Rejection of Algorithm Confusion (alg: "none" Attack)', () => {
      const headerNone = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({ sessionId: 'cs_forged', tierId: 'master', exp: 9999999999 })
      ).toString('base64url');

      // Attempt 1: Empty signature
      const noneToken1 = `${headerNone}.${payload}.`;
      const res1 = verifyDownloadToken(noneToken1, secret);
      expect(res1.valid).toBe(false);

      // Attempt 2: Signature = 'none'
      const noneToken2 = `${headerNone}.${payload}.none`;
      const res2 = verifyDownloadToken(noneToken2, secret);
      expect(res2.valid).toBe(false);
    });

    it('PROBE 2.5: Expired Token Rejection (Temporal Boundary)', () => {
      // Token that expired 10 seconds ago
      const expiredToken = generateDownloadToken(
        { sessionId: 'cs_expired', tierId: 'blueprint', email: 'expired@369.com' },
        secret,
        -10
      );

      const result = verifyDownloadToken(expiredToken, secret);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Download token has expired');
    });

    it('PROBE 2.6: Rejection of Wrong Secret Key (HMAC Isolation)', () => {
      const token = generateDownloadToken(
        { sessionId: 'cs_key_iso', tierId: 'blueprint', email: 'test@369.com' },
        'correct_secret_key_369_min_32_characters'
      );

      const result = verifyDownloadToken(token, 'attacker_wrong_secret_key_12345678');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Download token invalid or tampered');
    });

    it('PROBE 2.7: Malformed and Non-String Tokens', () => {
      const malformedInputs = [
        '',
        null as any,
        undefined as any,
        12345 as any,
        'only_one_part',
        'part1.part2',
        'part1.part2.part3.part4',
        '..',
        'a.b.c'
      ];

      for (const input of malformedInputs) {
        const result = verifyDownloadToken(input, secret);
        expect(result.valid).toBe(false);
      }
    });

    it('PROBE 2.8: Invalid Base64 / Non-JSON Payload', () => {
      // 3 segments, but payload is valid base64url of non-JSON bytes
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
      const badPayload = Buffer.from('NOT_VALID_JSON_!!!').toString('base64url');
      // Create valid HMAC over the bad payload
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', secret).update(`${header}.${badPayload}`).digest('base64url');

      const token = `${header}.${badPayload}.${sig}`;
      const result = verifyDownloadToken(token, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to decode token payload JSON');
    });
  });

  // =========================================================================
  // 3. PKZIP ARCHIVE PACKAGING PROBES
  // =========================================================================
  describe('3. ZIP Packaging & PKZIP Specification Compliance', () => {
    it('PROBE 3.1: CRC-32 Checksum Conformance with Known Standards', () => {
      // Standard IEEE 802.3 CRC-32 test vectors
      const vEmpty = crc32(new Uint8Array(0));
      expect(vEmpty).toBe(0x00000000);

      const v123 = crc32(Buffer.from('123456789', 'ascii'));
      expect(v123).toBe(0xcbf43926);

      const vFox = crc32(Buffer.from('The quick brown fox jumps over the lazy dog', 'ascii'));
      expect(vFox).toBe(0x414fa339);
    });

    it('PROBE 3.2: PKZIP 2.0 Magic Signatures (Local, Central, EOCD)', () => {
      const entries = [
        { filename: 'file1.txt', data: Buffer.from('Hello 369', 'utf-8') },
        { filename: 'nested/file2.txt', data: Buffer.from('Vortex math', 'utf-8') }
      ];

      const zipBytes = createZipArchive(entries);
      const buf = Buffer.from(zipBytes);

      // 1. Local file header signature: 0x04034b50 ("PK\x03\x04")
      expect(buf.readUInt32LE(0)).toBe(0x04034b50);

      // 2. End of Central Directory signature at the end: 0x06054b50 ("PK\x05\x06")
      const eocdOffset = buf.length - 22;
      expect(buf.readUInt32LE(eocdOffset)).toBe(0x06054b50);

      // Total records in EOCD
      expect(buf.readUInt16LE(eocdOffset + 8)).toBe(2);
      expect(buf.readUInt16LE(eocdOffset + 10)).toBe(2);
    });

    it('PROBE 3.3: System Unzip Compatibility & Verification', () => {
      const pdfMock = Buffer.alloc(1024, 0x5a); // 1KB pseudo PDF
      const guideMock = Buffer.from('Solfeggio Frequency Stems Guide Content', 'utf-8');

      const zipBytes = createZipArchive([
        { filename: 'Tesla-369-Manifestation-Blueprint.pdf', data: pdfMock },
        { filename: 'Solfeggio-Frequency-Master-Guide.txt', data: guideMock }
      ]);

      const tmpZipPath = path.join('/tmp', `challenger_test_${Date.now()}.zip`);
      fs.writeFileSync(tmpZipPath, zipBytes);

      try {
        // Run macOS / Linux system unzip -t (test archive integrity)
        const checkResult = execSync(`unzip -t "${tmpZipPath}"`).toString();
        expect(checkResult).toContain('No errors detected in compressed data');
        expect(checkResult).toContain('Tesla-369-Manifestation-Blueprint.pdf');
        expect(checkResult).toContain('Solfeggio-Frequency-Master-Guide.txt');
      } finally {
        if (fs.existsSync(tmpZipPath)) {
          fs.unlinkSync(tmpZipPath);
        }
      }
    });

    it('PROBE 3.4: Edge Case: 0-Byte Entry and Multi-Megabyte Entry', () => {
      const zeroData = new Uint8Array(0);
      const multiMbData = Buffer.alloc(2 * 1024 * 1024, 0x61); // 2MB

      const zipBytes = createZipArchive([
        { filename: 'empty.dat', data: zeroData },
        { filename: 'large.dat', data: multiMbData }
      ]);

      const tmpZipPath = path.join('/tmp', `challenger_edge_${Date.now()}.zip`);
      fs.writeFileSync(tmpZipPath, zipBytes);

      try {
        const checkResult = execSync(`unzip -t "${tmpZipPath}"`).toString();
        expect(checkResult).toContain('No errors detected');
        expect(checkResult).toContain('empty.dat');
        expect(checkResult).toContain('large.dat');
      } finally {
        if (fs.existsSync(tmpZipPath)) {
          fs.unlinkSync(tmpZipPath);
        }
      }
    });
  });

  // =========================================================================
  // 4. API ROUTE ADVERSARIAL INTEGRATION PROBES
  // =========================================================================
  describe('4. API Routes Integration & Invalidation Probes', () => {
    it('PROBE 4.1: /api/download Rejection of Missing or Invalid Tokens', async () => {
      // 1. Missing token
      const reqNoToken = new NextRequest('http://localhost:3000/api/download');
      const resNoToken = await downloadRoute(reqNoToken);
      expect(resNoToken.status).toBe(401);
      const bodyNoToken = await resNoToken.json();
      expect(bodyNoToken.error).toContain('missing token');

      // 2. Tampered token
      const validToken = generateDownloadToken({ sessionId: 'cs_1', tierId: 'blueprint', email: 'test@369.com' });
      const tamperedToken = validToken.slice(0, -4) + 'XXXX';
      const reqTampered = new NextRequest(`http://localhost:3000/api/download?token=${tamperedToken}`);
      const resTampered = await downloadRoute(reqTampered);
      expect(resTampered.status).toBe(401);
      const bodyTampered = await resTampered.json();
      expect(bodyTampered.error).toContain('tampered');
    });

    it('PROBE 4.2: /api/download Master Tier Delivers ZIP Archive by Default', async () => {
      const validToken = generateDownloadToken({
        sessionId: 'cs_master_999',
        tierId: 'master',
        email: 'master@369.com',
        name: 'Master Seeker'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${validToken}`);
      const res = await downloadRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/zip');
      expect(res.headers.get('Content-Disposition')).toContain('369-Master-Sanctuary-Suite.zip');

      const arrayBuf = await res.arrayBuffer();
      const zipBytes = Buffer.from(arrayBuf);
      expect(zipBytes.readUInt32LE(0)).toBe(0x04034b50); // PKZIP magic
    });

    it('PROBE 4.3: /api/download Master Tier with asset=pdf Delivers Single PDF', async () => {
      const validToken = generateDownloadToken({
        sessionId: 'cs_master_999',
        tierId: 'master',
        email: 'master@369.com',
        name: 'Master Seeker'
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${validToken}&asset=pdf`);
      const res = await downloadRoute(req);

      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      expect(res.headers.get('Content-Disposition')).toContain('Tesla-369-Manifestation-Blueprint.pdf');

      const arrayBuf = await res.arrayBuffer();
      const pdfBytes = Buffer.from(arrayBuf);
      expect(pdfBytes.toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('PROBE 4.4: Clean Digital Fulfillment for International Customer Names with HTTP 200', async () => {
      // Generate a legitimate token containing a Cyrillic name
      const token = generateDownloadToken({
        sessionId: 'cs_unicode_test',
        tierId: 'blueprint',
        email: 'nikola@serbia.com',
        name: 'Никола Тесла' // Cyrillic name
      });

      const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`);
      const res = await downloadRoute(req);

      // Verify that endpoint returns HTTP 200 with valid PDF for international customer names
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('application/pdf');
      const arrayBuf = await res.arrayBuffer();
      expect(Buffer.from(arrayBuf).toString('ascii', 0, 5)).toBe('%PDF-');
    });

    it('PROBE 4.5: /api/order/status Sandbox Mock Auto-Fulfillment', async () => {
      // Mock session ID should be fulfilled deterministically
      const req = new NextRequest('http://localhost:3000/api/order/status?session_id=mock_cs_auto_123');
      const res = await statusRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.status).toBe('fulfilled');
      expect(data.downloadUrl).toMatch(/^\/api\/download\?token=/);

      // Verify the generated token works on download endpoint
      const token = data.downloadUrl.split('token=')[1];
      const verifyRes = verifyDownloadToken(token);
      expect(verifyRes.valid).toBe(true);
    });

    it('PROBE 4.6: /api/order/status Validation of Missing Session ID', async () => {
      const req = new NextRequest('http://localhost:3000/api/order/status');
      const res = await statusRoute(req);

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Missing session_id');
    });
  });
});
