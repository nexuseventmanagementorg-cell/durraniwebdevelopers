import { NextRequest, NextResponse } from 'next/server';
import { serverValidateAndCreateOrder, getOrders } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { order, whatsappUrl } = await serverValidateAndCreateOrder({
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      orderType: body.orderType,
      tableNumber: body.tableNumber,
      deliveryAddress: body.deliveryAddress,
      specialInstructions: body.specialInstructions,
      items: body.items,
    });

    return NextResponse.json({
      success: true,
      order,
      whatsappUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');

    let orders = await getOrders();
    if (table) {
      orders = orders.filter((o) => o.tableNumber?.toUpperCase() === table.toUpperCase());
    }

    return NextResponse.json({ success: true, orders });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
