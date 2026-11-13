import { NextRequest, NextResponse } from 'next/server';
import {
  PRODUCT_CATALOG,
  createCheckoutSession,
  evaluateGatewayGuard,
  isValidTier,
  isValidEmail,
  type CheckoutRequest
} from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Request body required' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body required' },
        { status: 400 }
      );
    }

    const { tierId, customerEmail, customerName, intention, numerologyData } = body;

    if (!isValidTier(tierId)) {
      return NextResponse.json(
        { error: 'Invalid tier specified' },
        { status: 400 }
      );
    }

    if (customerEmail && !isValidEmail(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid customer email format' },
        { status: 400 }
      );
    }

    const guard = evaluateGatewayGuard();
    if (!guard.allowed) {
      return NextResponse.json(
        { error: guard.error || 'Payment gateway configuration required' },
        { status: guard.status }
      );
    }

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://369com.co';

    const clampedIntention =
      typeof intention === 'string' ? intention.slice(0, 500) : undefined;

    const checkoutReq: CheckoutRequest = {
      tierId,
      customerEmail: customerEmail?.trim(),
      customerName: customerName?.trim(),
      intention: clampedIntention,
      numerologyData
    };

    const session = await createCheckoutSession(checkoutReq, origin);

    return NextResponse.json(
      {
        success: true,
        sessionId: session.sessionId,
        url: session.url
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize checkout session' },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tierId = searchParams.get('tierId');
  const customerEmail = searchParams.get('customerEmail');
  const intention = searchParams.get('intention');

  if (!isValidTier(tierId)) {
    return NextResponse.json(
      { error: 'Invalid tier specified' },
      { status: 400 }
    );
  }

  if (customerEmail && !isValidEmail(customerEmail)) {
    return NextResponse.json(
      { error: 'Invalid customer email format' },
      { status: 400 }
    );
  }

  const guard = evaluateGatewayGuard();
  if (!guard.allowed) {
    return NextResponse.json(
      { error: guard.error || 'Payment gateway configuration required' },
      { status: guard.status }
    );
  }

  const origin =
    req.headers.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://369com.co';

  try {
    const session = await createCheckoutSession(
      {
        tierId,
        customerEmail: customerEmail || undefined,
        intention: intention || undefined
      },
      origin
    );

    return NextResponse.redirect(new URL(session.url, origin));
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize checkout session' },
      { status: err?.status || 500 }
    );
  }
}
