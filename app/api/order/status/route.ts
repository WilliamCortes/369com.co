import { NextRequest, NextResponse } from 'next/server';
import { orderStore, generateDownloadToken } from '@/lib/order-store';
import { syncPolarCheckoutStatus } from '@/lib/polar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id') || searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json(
      { error: 'Missing session_id query parameter' },
      { status: 400 }
    );
  }

  let order = orderStore.getOrder(sessionId);

  if (!order && !sessionId.startsWith('mock_cs_')) {
    const polarState = await syncPolarCheckoutStatus(sessionId);
    if (polarState.order) {
      order = polarState.order;
    } else if (polarState.status === 'failed' || polarState.status === 'expired') {
      return NextResponse.json(
        { status: polarState.status, session_id: sessionId },
        { status: 200 }
      );
    }
  }

  if (order) {
    return NextResponse.json(
      {
        status: order.status,
        orderId: order.orderId,
        tierId: order.tierId,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        intention: order.intention,
        downloadUrl:
          order.status === 'fulfilled' && order.downloadToken
            ? `/api/download?token=${order.downloadToken}`
            : null,
        createdAt: order.createdAt
      },
      { status: 200 }
    );
  }

  // If this is a mock payment session in dev/test, auto-fulfill deterministically
  if (sessionId.startsWith('mock_cs_')) {
    const token = generateDownloadToken({
      sessionId,
      tierId: 'blueprint',
      email: 'seeker@369com.co',
      name: 'Cosmic Seeker'
    });

    const newOrder = {
      orderId: `ord_${sessionId}`,
      sessionId,
      tierId: 'blueprint',
      customerEmail: 'seeker@369com.co',
      customerName: 'Cosmic Seeker',
      status: 'fulfilled' as const,
      createdAt: new Date().toISOString(),
      downloadToken: token
    };

    orderStore.saveOrder(newOrder);

    return NextResponse.json(
      {
        status: 'fulfilled',
        orderId: newOrder.orderId,
        tierId: newOrder.tierId,
        customerEmail: newOrder.customerEmail,
        customerName: newOrder.customerName,
        downloadUrl: `/api/download?token=${token}`,
        createdAt: newOrder.createdAt
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { status: 'pending', session_id: sessionId },
    { status: 200 }
  );
}
