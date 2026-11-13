/**
 * Unit Test Suite for Dynamic PDF Generator (lib/pdf-generator.ts)
 */

import { describe, it, expect } from 'vitest';
import { generatePersonalizedBlueprintPdf } from '@/lib/pdf-generator';

describe('Dynamic PDF Blueprint Generator (F8 & Milestone 3)', () => {
  it('generates genuine PDF binary starting with %PDF- header', async () => {
    const pdfBytes = await generatePersonalizedBlueprintPdf({
      clientName: 'Nikola Tesla',
      birthDate: '1856-07-10',
      intention: 'Universal resonance and peace',
      lifePathNumber: 3,
      lifePathTitle: 'The Radiant Creator',
      teslaTriadNode: 3,
      resonanceScore: 94,
      affirmationCount: 33
    });

    expect(pdfBytes).toBeDefined();
    expect(pdfBytes.length).toBeGreaterThan(1000);

    // Verify PDF header magic bytes "%PDF-"
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
  });

  it('handles missing birthDate gracefully with fallback calculations', async () => {
    const pdfBytes = await generatePersonalizedBlueprintPdf({
      clientName: 'Alexander Vortex',
      intention: 'Financial sovereignty'
    });

    expect(pdfBytes.length).toBeGreaterThan(1000);
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
  });

  it('handles empty customer name gracefully with default recipient name', async () => {
    const pdfBytes = await generatePersonalizedBlueprintPdf({
      clientName: ''
    });

    expect(pdfBytes.length).toBeGreaterThan(1000);
    const header = Buffer.from(pdfBytes.slice(0, 5)).toString('utf-8');
    expect(header).toBe('%PDF-');
  });
});
