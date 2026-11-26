import { NextRequest, NextResponse } from 'next/server';
import { verifyDownloadToken, orderStore } from '@/lib/order-store';
import { generatePersonalizedBlueprintPdf } from '@/lib/pdf-generator';
import { createZipArchive } from '@/lib/zip';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const asset = searchParams.get('asset'); // 'pdf' | 'suite' | 'audio'

  if (!token) {
    return NextResponse.json(
      { error: 'Invalid or missing token string' },
      { status: 401 }
    );
  }

  const verification = verifyDownloadToken(token);
  if (!verification.valid) {
    const isServerMisconfigured = verification.error?.includes('Production security guard');
    return NextResponse.json(
      { error: verification.error || 'Download token invalid or expired' },
      { status: isServerMisconfigured ? 500 : 401 }
    );
  }

  const claims = verification.claims || {};
  const sessionId = claims.sessionId;
  const tierId = claims.tierId || 'blueprint';

  // Retrieve order details if available (fall back to signed claims across serverless instances)
  const order = sessionId ? orderStore.getOrder(sessionId) : undefined;
  const numerologyData = order?.numerologyData || claims.numerologyData;
  const clientName =
    order?.customerName || claims.name || claims.customerName || 'Cosmic Seeker';
  const intention =
    order?.intention || claims.intention || 'Universal alignment and prosperity';

  try {
    // Generate the personalized PDF
    const pdfBytes = await generatePersonalizedBlueprintPdf({
      clientName,
      intention,
      tierId,
      birthDate: numerologyData?.birthDate,
      lifePathNumber: numerologyData?.lifePath,
      lifePathTitle: numerologyData?.lifePathTitle,
      teslaTriadNode: numerologyData?.teslaNode,
      resonanceScore: numerologyData?.resonance369Score,
      dominantElement: numerologyData?.dominantElement
    });

    // Deliver master suite zip if tier is master and not explicitly requesting single pdf
    if (tierId === 'master' && asset !== 'pdf') {
      const audioGuideText = Buffer.from(
        `======================================================================\n` +
          `  369COM.CO - SOLFEGGIO 9-FREQUENCY STUDIO MASTER ARCHIVE\n` +
          `======================================================================\n\n` +
          `Client: ${clientName}\n` +
          `Intention: ${intention}\n` +
          `License: Lifetime VIP Master Access\n\n` +
          `Included Master Solfeggio Audio Frequencies:\n` +
          `  1. 174Hz — Natural Anesthetic & Foundation Frequency\n` +
          `  2. 285Hz — Quantum Cellular Regeneration & Tissue Restoration\n` +
          `  3. 369Hz — Tesla Harmonic Resonance Key (Universal Genesis)\n` +
          `  4. 396Hz — Liberation of Subconscious Guilt & Fear\n` +
          `  5. 417Hz — Undoing Situations & Facilitating Change\n` +
          `  6. 528Hz — Transformation & Miracles (DNA Repair Frequency)\n` +
          `  7. 639Hz — Connecting & Harmonizing Relationships\n` +
          `  8. 741Hz — Awakening Intuition & Cellular Detoxification\n` +
          `  9. 852Hz — Returning to Spiritual Order & Third-Eye Resonance\n` +
          ` 10. 963Hz — Crown Chakra Activation & Divine Universal Consciousness\n\n` +
          `Use the 369com.co in-browser Web Audio Frequency Lab for continuous zero-latency looping.\n`,
        'utf-8'
      );

      const zipBytes = createZipArchive([
        {
          filename: 'Tesla-369-Manifestation-Blueprint.pdf',
          data: pdfBytes
        },
        {
          filename: 'Solfeggio-Frequency-Master-Guide.txt',
          data: audioGuideText
        }
      ]);

      return new NextResponse(Buffer.from(zipBytes), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="369-Master-Sanctuary-Suite.zip"',
          'Content-Length': String(zipBytes.length),
          'Cache-Control': 'private, no-transform, no-store'
        }
      });
    }

    // Default: Deliver Personalized Tesla 369 Manifestation Blueprint PDF
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Tesla-369-Manifestation-Blueprint.pdf"',
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'private, no-transform, no-store'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to render personalized digital assets' },
      { status: 500 }
    );
  }
}
