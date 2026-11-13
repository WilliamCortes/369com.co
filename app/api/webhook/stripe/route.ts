import { NextRequest, NextResponse } from 'next/server';
import { verifyStripeSignature } from '@/lib/stripe';
import { orderStore, generateDownloadToken } from '@/lib/order-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json(
        { error: 'Empty payload' },
        { status: 400 }
      );
    }

    const secret =
      process.env.STRIPE_WEBHOOK_SECRET ||
      (process.env.NODE_ENV !== 'production'
        ? 'whsec_placeholder_secret_for_testing'
        : '');

    if (process.env.NODE_ENV === 'production' && (!secret || secret.includes('placeholder'))) {
      return NextResponse.json(
        { error: 'Webhook secret unconfigured in production environment' },
        { status: 500 }
      );
    }

    const auth = verifyStripeSignature(rawBody, signature, secret);
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error || 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Malformed JSON payload' },
        { status: 400 }
      );
    }

    if (!event || !event.id) {
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }

    // Idempotency: skip processing if event has already been recorded
    if (orderStore.hasEvent(event.id)) {
      return NextResponse.json(
        { received: true, already_processed: true },
        { status: 200 }
      );
    }

    orderStore.recordEvent(event.id);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object || {};
      const sessionId = session.id;
      const customerEmail =
        session.customer_email ||
        session.customer_details?.email ||
        session.metadata?.customerEmail ||
        'seeker@369com.co';
      const customerName =
        session.customer_details?.name ||
        session.metadata?.customerName ||
        'Cosmic Seeker';
      const tierId = session.metadata?.tierId || 'blueprint';
      const intention = session.metadata?.intention;

      const orderId = session.metadata?.orderId || `ord_${event.id}`;
      const token = generateDownloadToken({
        sessionId,
        tierId,
        email: customerEmail,
        name: customerName,
        intention
      });

      orderStore.saveOrder({
        orderId,
        sessionId,
        tierId,
        customerEmail,
        customerName,
        intention,
        status: 'fulfilled',
        createdAt: new Date().toISOString(),
        downloadToken: token
      });

      return NextResponse.json(
        { received: true, orderId },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { received: true },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error processing webhook' },
      { status: 500 }
    );
  }
}
