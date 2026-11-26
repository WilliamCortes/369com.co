import { NextRequest, NextResponse } from 'next/server';
import { createPendingBrebOrder } from '@/lib/breb';

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

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body required' }, { status: 400 });
    }

    const origin =
      req.headers.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://369com.co';

    const result = createPendingBrebOrder(
      {
        tierId: body.tierId,
        customerEmail: body.customerEmail,
        customerName: body.customerName,
        intention: body.intention,
        transferReference: body.transferReference,
        numerologyData: body.numerologyData
      },
      origin
    );

    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to register Bre-B transfer' },
      { status: err?.status || 500 }
    );
  }
}
