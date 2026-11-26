import { NextRequest, NextResponse } from 'next/server';
import { orderStore } from '@/lib/order-store';
import {
  verifyAndParsePolarWebhook,
  fulfillPolarOrderFromEvent,
  polarWebhooks
} from '@/lib/polar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: 'Empty payload' }, { status: 400 });
    }

    const headers = {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? ''
    };

    const secret = process.env.POLAR_WEBHOOK_SECRET?.trim() || '';
    if (!secret || (process.env.NODE_ENV === 'production' && secret.includes('placeholder'))) {
      return NextResponse.json(
        { error: 'Polar webhook secret unconfigured in production environment' },
        { status: 500 }
      );
    }

    let event: Awaited<ReturnType<typeof verifyAndParsePolarWebhook>>;
    try {
      event = await verifyAndParsePolarWebhook(rawBody, headers, secret);
    } catch (error) {
      if (error instanceof polarWebhooks.PolarWebhookVerificationError) {
        return NextResponse.json(
          { error: 'Webhook signature verification failed' },
          { status: 403 }
        );
      }
      if (error instanceof polarWebhooks.PolarWebhookUnknownTypeError) {
        return NextResponse.json({ received: true, ignored: true }, { status: 202 });
      }
      throw error;
    }

    const dataObj = (event.data || {}) as Record<string, any>;
    const eventKey =
      (event as any).event_id ||
      headers['webhook-id'] ||
      `${event.type}:${dataObj.id || 'unknown'}:${event.timestamp}`;

    if (orderStore.hasEvent(eventKey)) {
      return NextResponse.json({ received: true, already_processed: true }, { status: 200 });
    }

    orderStore.recordEvent(eventKey);

    if (
      event.type === 'order.paid' ||
      event.type === 'order.created' ||
      event.type === 'checkout.updated'
    ) {
      const order = fulfillPolarOrderFromEvent(event.type, dataObj);
      return NextResponse.json(
        { received: true, ...(order ? { orderId: order.orderId } : {}) },
        { status: 200 }
      );
    }

    if (event.type === 'order.refunded') {
      const refundedId = String(dataObj.id || '');
      const checkoutId = String(dataObj.checkout_id || '');
      if (refundedId) orderStore.markOrderRefunded(refundedId);
      if (checkoutId) orderStore.markOrderRefunded(checkoutId);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal server error processing Polar webhook' },
      { status: 500 }
    );
  }
}
