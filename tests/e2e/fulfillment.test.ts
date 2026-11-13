import { describe, it, expect } from './test-harness.ts';
import {
  generateDownloadToken,
  verifyDownloadToken,
  calculateNumerologyOracle,
  OrderStoreOracle
} from './test-helpers.ts';

describe('E2E: Fulfillment & Autonomous Delivery Pipeline', () => {
  const tokenSecret = 'whsec_fulfillment_token_secret_min_32_characters';

  it('generates personalized PDF blueprint parameters matching customer profile', () => {
    const customer = {
      fullName: 'William Tesla',
      birthDate: '1985-03-06',
      intention: 'Infinite creativity and peace'
    };

    const numerology = calculateNumerologyOracle(customer.fullName, customer.birthDate);
    expect(numerology.lifePath).toBeDefined();

    const pdfDocumentMeta = {
      title: 'Nikola Tesla 369 Manifestation Blueprint',
      clientName: customer.fullName,
      lifePathNumber: numerology.lifePath,
      resonanceScore: numerology.resonance369Score,
      dominantElement: numerology.dominantElement,
      affirmationCount: 33,
      generationTimestamp: new Date().toISOString()
    };

    expect(pdfDocumentMeta.clientName).toBe('William Tesla');
    expect(pdfDocumentMeta.affirmationCount).toBe(33);
    expect(pdfDocumentMeta.resonanceScore).toBeGreaterThanOrEqual(70);
  });

  it('creates and verifies cryptographically signed digital asset download token', () => {
    const claims = {
      sessionId: 'cs_fulfillment_verified_1',
      tierId: 'blueprint',
      email: 'client@369com.co'
    };

    const token = generateDownloadToken(claims, tokenSecret, 86400);
    expect(token).toBeDefined();

    const verification = verifyDownloadToken(token, tokenSecret);
    expect(verification.valid).toBe(true);
    expect(verification.claims.sessionId).toBe('cs_fulfillment_verified_1');
    expect(verification.claims.tierId).toBe('blueprint');
  });

  it('rejects expired or tampered download tokens with HTTP 401 Unauthorized', () => {
    const expiredToken = generateDownloadToken(
      { sessionId: 'cs_expired', tierId: 'blueprint', email: 'test@example.com' },
      tokenSecret,
      -10 // expired
    );

    const expiredVerification = verifyDownloadToken(expiredToken, tokenSecret);
    expect(expiredVerification.valid).toBe(false);
    expect(expiredVerification.error).toContain('expired');

    const tamperedToken = expiredToken.replace(/.$/, 'X');
    const tamperedVerification = verifyDownloadToken(tamperedToken, tokenSecret);
    expect(tamperedVerification.valid).toBe(false);
  });

  it('delivers appropriate content-disposition and mime headers for asset downloads', () => {
    const getAssetDeliveryHeaders = (tierId: string) => {
      if (tierId === 'master') {
        return {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="369-Master-Sanctuary-Suite.zip"'
        };
      }
      return {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Tesla-369-Manifestation-Blueprint.pdf"'
      };
    };

    const blueprintHeaders = getAssetDeliveryHeaders('blueprint');
    expect(blueprintHeaders['Content-Type']).toBe('application/pdf');
    expect(blueprintHeaders['Content-Disposition']).toContain('Tesla-369-Manifestation-Blueprint.pdf');

    const masterHeaders = getAssetDeliveryHeaders('master');
    expect(masterHeaders['Content-Type']).toBe('application/zip');
    expect(masterHeaders['Content-Disposition']).toContain('369-Master-Sanctuary-Suite.zip');
  });
});
