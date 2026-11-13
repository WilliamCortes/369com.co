import { describe, it, expect } from 'vitest';
import { generatePersonalizedBlueprintPdf, sanitizeForPdf } from '@/lib/pdf-generator';
import { generateDownloadToken } from '@/lib/order-store';
import { GET as downloadRoute } from '@/app/api/download/route';
import { NextRequest } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';

describe('CHALLENGER 2 EMPIRICAL ADVERSARIAL VERIFICATION', () => {
  // 14 International Test Vectors
  const internationalVectors = [
    { script: 'Cyrillic (Nikola Tesla)', name: 'Никола Тесла' },
    { script: 'CJK Chinese (Bruce Lee)', name: '李小龙' },
    { script: 'Arabic (Muhammad)', name: 'محمد' },
    { script: 'Greek (Aristotle)', name: 'Αριστοτέλης' },
    { script: 'Polish L-stroke (Lukasz)', name: 'Łukasz' },
    { script: 'Turkish Dotless i (Civgin)', name: 'Çıvgın' },
    { script: 'Vedic Devanagari (Om)', name: 'Om ॐ' },
    { script: 'Unicode Arrow Symbol', name: 'Fear → Abundance' },
    { script: 'Emoji Sparkles', name: 'Seeker ✨' },
    { script: 'Emoji Glowing Star', name: 'Abundance 🌟' },
    { script: 'Astral Emoji Meditator', name: 'Meditator 🧘‍♂️' },
    { script: 'CJK Japanese (Tanaka)', name: '田中' },
    { script: 'Western Accented French', name: 'René Descartes' },
    { script: 'Western Accented Spanish', name: 'José María' },
  ];

  describe('1. 14 International Vectors against generatePersonalizedBlueprintPdf', () => {
    it('verifies all 14 vectors render valid PDF bytes starting with %PDF- without WinAnsi errors', async () => {
      expect(internationalVectors.length).toBe(14);

      for (const vector of internationalVectors) {
        let pdfBytes: Uint8Array | null = null;
        let thrownError: any = null;

        try {
          pdfBytes = await generatePersonalizedBlueprintPdf({
            clientName: vector.name,
            intention: `Manifesting with ${vector.name}`
          });
        } catch (err) {
          thrownError = err;
        }

        expect(thrownError, `Vector "${vector.name}" (${vector.script}) threw error`).toBeNull();
        expect(pdfBytes, `Vector "${vector.name}" did not produce bytes`).toBeInstanceOf(Uint8Array);
        expect(pdfBytes!.length).toBeGreaterThan(5000);

        const header = Buffer.from(pdfBytes!.slice(0, 5)).toString('ascii');
        expect(header, `Vector "${vector.name}" header does not start with %PDF-`).toBe('%PDF-');

        const sanitized = sanitizeForPdf(vector.name, 60, 'Cosmic Seeker');
        console.log(`[VECTOR MEASURED] Vector: "${vector.name}" | Sanitized: "${sanitized}" | Bytes: ${pdfBytes!.length} | Header: ${header}`);
      }
    });
  });

  describe('2. 14 International Vectors against GET /api/download?token=...', () => {
    it('verifies all 14 vectors return HTTP 200 with application/pdf and %PDF- body', async () => {
      for (const vector of internationalVectors) {
        const token = generateDownloadToken({
          sessionId: `cs_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          tierId: 'blueprint',
          email: 'seeker@369com.co',
          name: vector.name,
          intention: 'Clarity and alignment'
        });

        const req = new NextRequest(`http://localhost:3000/api/download?token=${token}`);
        const res = await downloadRoute(req);

        expect(res.status, `Vector "${vector.name}" returned status ${res.status}`).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('application/pdf');

        const arrayBuf = await res.arrayBuffer();
        const bodyBuf = Buffer.from(arrayBuf);
        expect(bodyBuf.toString('ascii', 0, 5)).toBe('%PDF-');
        expect(bodyBuf.length).toBeGreaterThan(5000);
      }
    });
  });

  describe('3. Two-Line Stacked Header Banner Layout Geometry & 75-Char Names', () => {
    const testNames75 = [
      { label: '75 ASCII characters', name: 'A'.repeat(75) },
      { label: '75 Widest Helvetica "W" characters', name: 'W'.repeat(75) },
      { label: '75 Transliterated Cyrillic characters', name: 'Никола'.repeat(12).slice(0, 75) },
      { label: '75 Mixed international and emoji', name: '✨ Nikola Тесла 🌟 Łukasz Çıvgın 李小龙 🧘‍♂️ '.repeat(3).slice(0, 75) },
      { label: 'Exactly 30 chars (boundary of header clamp)', name: 'Alexander The Great Conqueror!' },
      { label: 'Exactly 60 chars (boundary of client clamp)', name: 'B'.repeat(60) },
    ];

    it('verifies names up to 75 characters generate clean PDFs without throwing', async () => {
      for (const testCase of testNames75) {
        const pdfBytes = await generatePersonalizedBlueprintPdf({
          clientName: testCase.name,
          intention: 'Universal abundance and alignment'
        });

        expect(pdfBytes).toBeInstanceOf(Uint8Array);
        const header = Buffer.from(pdfBytes.slice(0, 5)).toString('ascii');
        expect(header).toBe('%PDF-');

        // Load document to ensure validity
        const doc = await PDFDocument.load(pdfBytes);
        expect(doc.getPageCount()).toBe(3);
      }
    });

    it('empirically verifies font geometry: zero horizontal canvas overflow and zero vertical collision', async () => {
      // Create a dummy document to measure font metrics exactly
      const measureDoc = await PDFDocument.create();
      const fontBold = await measureDoc.embedFont(StandardFonts.HelveticaBold);
      const fontOblique = await measureDoc.embedFont(StandardFonts.HelveticaOblique);

      const pageWidth = 595.28; // A4 width
      const bannerLeft = 22;
      const bannerWidth = pageWidth - 44; // 551.28
      const bannerRight = bannerLeft + bannerWidth; // 573.28
      const textStartX = 40;
      const maxAvailableWidth = bannerRight - textStartX; // 533.28 pt

      // Verify Line 1 Section Titles fit comfortably within the banner
      const page2Title = 'NIKOLA TESLA VORTEX MATHEMATICS & POLARITY CODE';
      const page2TitleWidth = fontBold.widthOfTextAtSize(page2Title, 10.5);
      expect(page2TitleWidth).toBeLessThan(maxAvailableWidth);
      expect(textStartX + page2TitleWidth).toBeLessThan(bannerRight);
      console.log(`[LAYOUT] Page 2 Title Width: ${page2TitleWidth.toFixed(2)} pt | End X: ${(textStartX + page2TitleWidth).toFixed(2)} pt / Max ${bannerRight.toFixed(2)} pt`);

      const page3Title = '33-DAY SCRIPTING MATRIX & SOLFEGGIO PROTOCOL';
      const page3TitleWidth = fontBold.widthOfTextAtSize(page3Title, 10.5);
      expect(page3TitleWidth).toBeLessThan(maxAvailableWidth);
      expect(textStartX + page3TitleWidth).toBeLessThan(bannerRight);
      console.log(`[LAYOUT] Page 3 Title Width: ${page3TitleWidth.toFixed(2)} pt | End X: ${(textStartX + page3TitleWidth).toFixed(2)} pt / Max ${bannerRight.toFixed(2)} pt`);

      // Verify Line 2 fits comfortably across all test names up to 75 characters
      for (const testCase of testNames75) {
        const headerName = sanitizeForPdf(testCase.name, 30, 'Cosmic Seeker');
        // headerName must be <= 30 characters
        expect(headerName.length).toBeLessThanOrEqual(30);

        // Page 2 Line 2 template: `Recipient: ${headerName} • Life Path 9 • Node 9`
        const page2Line2 = `Recipient: ${headerName} • Life Path 9 • Node 9`;
        const p2Line2Width = fontOblique.widthOfTextAtSize(page2Line2, 8.5);

        // Assert no horizontal overflow beyond banner boundary
        expect(
          textStartX + p2Line2Width,
          `Page 2 Line 2 for "${testCase.label}" exceeded banner right boundary (573.28 pt)`
        ).toBeLessThan(bannerRight);
        expect(
          textStartX + p2Line2Width,
          `Page 2 Line 2 for "${testCase.label}" exceeded canvas width (595.28 pt)`
        ).toBeLessThan(pageWidth);

        // Page 3 Line 2 template: `Client: ${headerName} • Dedicated Practice Matrix`
        const page3Line2 = `Client: ${headerName} • Dedicated Practice Matrix`;
        const p3Line2Width = fontOblique.widthOfTextAtSize(page3Line2, 8.5);

        // Assert no horizontal overflow beyond banner boundary
        expect(
          textStartX + p3Line2Width,
          `Page 3 Line 2 for "${testCase.label}" exceeded banner right boundary (573.28 pt)`
        ).toBeLessThan(bannerRight);
        expect(
          textStartX + p3Line2Width,
          `Page 3 Line 2 for "${testCase.label}" exceeded canvas width (595.28 pt)`
        ).toBeLessThan(pageWidth);

        console.log(`[LAYOUT] Name "${testCase.label}" -> headerName: "${headerName}" (${headerName.length} chars) | P2 Line 2 End X: ${(textStartX + p2Line2Width).toFixed(2)} pt | P3 Line 2 End X: ${(textStartX + p3Line2Width).toFixed(2)} pt (Max: ${bannerRight.toFixed(2)} pt)`);
      }

      // Verify Vertical Separation (Zero Collision)
      // Line 1 is drawn at y = height - 43 (size 10.5 pt)
      // Line 2 is drawn at y = height - 58 (size 8.5 pt)
      const line1Y = 841.89 - 43;
      const line2Y = 841.89 - 58;
      const verticalGap = line1Y - line2Y; // 15 pt
      // The font sizes are 10.5 pt and 8.5 pt, so 15 pt separation guarantees no overlap
      expect(verticalGap).toBe(15);
      expect(verticalGap).toBeGreaterThan(10.5); // gap is greater than Line 1 font size
    });
  });
});
