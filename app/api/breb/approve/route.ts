import { NextRequest, NextResponse } from 'next/server';
import {
  approveBrebClaim,
  verifyBrebAdminKey,
  verifyBrebClaimToken
} from '@/lib/breb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 });
    }

    const adminKey =
      (typeof body?.adminKey === 'string' && body.adminKey) ||
      req.headers.get('x-breb-admin-key') ||
      '';
    const claimToken = typeof body?.claimToken === 'string' ? body.claimToken.trim() : '';

    if (body?.previewOnly) {
      const adminCheck = verifyBrebAdminKey(adminKey);
      if (!adminCheck.valid) {
        return NextResponse.json(
          { error: adminCheck.error || 'Unauthorized' },
          { status: adminCheck.status || 401 }
        );
      }
      const verified = verifyBrebClaimToken(claimToken);
      if (!verified.valid || !verified.claim) {
        return NextResponse.json(
          { error: verified.error || 'Invalid claim token' },
          { status: 400 }
        );
      }
      return NextResponse.json({ valid: true, claim: verified.claim }, { status: 200 });
    }

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://369com.co';

    const approved = approveBrebClaim(claimToken, adminKey, origin);

    return NextResponse.json(
      {
        success: true,
        orderId: approved.order.orderId,
        tierId: approved.order.tierId,
        customerEmail: approved.order.customerEmail,
        customerName: approved.order.customerName,
        downloadToken: approved.downloadToken,
        successUrl: approved.successUrl,
        downloadUrl: approved.downloadUrl
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to verify Bre-B claim' },
      { status: err?.status || 500 }
    );
  }
}
