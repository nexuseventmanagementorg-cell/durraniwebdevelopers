import { NextRequest, NextResponse } from 'next/server';
import {
  createWhatsAppOrderUrl,
  deleteOrder,
  getBusinessSettings,
  getOrderById,
  markWhatsAppDeclaredSent,
  updateOrderStatus,
} from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const settings = await getBusinessSettings();
    const whatsappUrl = createWhatsAppOrderUrl(
      settings.whatsappNumberFormatted,
      order.whatsappMessagePrefilled || ''
    );
    return NextResponse.json({ success: true, order, whatsappUrl });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === 'declare_whatsapp_sent') {
      const updated = await markWhatsAppDeclaredSent(id);
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, order: updated });
    }

    const unauthorized = requireAdmin(req);
    if (unauthorized) return unauthorized;

    if (body.status) {
      const updated = await updateOrderStatus(
        id,
        body.status,
        body.statusNotes,
        body.estimatedMinutes
      );
      if (!updated) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, order: updated });
    }

    return NextResponse.json({ success: false, error: 'Invalid update payload' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const deleted = await deleteOrder(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete order' }, { status: 500 });
  }
}
