import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuth';
import { serverValidateAndCreateOrder } from '@/lib/db';
import { OrderType } from '@/types';

const orderTypes: OrderType[] = ['dine_in', 'takeaway', 'delivery'];

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid order details.' }, { status: 400 });
    }

    const order = body as Record<string, unknown>;
    if (
      typeof order.customerName !== 'string' ||
      typeof order.customerPhone !== 'string' ||
      typeof order.orderType !== 'string' ||
      !orderTypes.includes(order.orderType as OrderType) ||
      !Array.isArray(order.items) ||
      !order.items.every(
        (item: unknown) =>
          !!item &&
          typeof item === 'object' &&
          'itemType' in item &&
          (item.itemType === 'product' || item.itemType === 'deal') &&
          'itemId' in item &&
          typeof item.itemId === 'string' &&
          'quantity' in item &&
          typeof item.quantity === 'number' &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0
      ) ||
      (order.tableNumber !== undefined && typeof order.tableNumber !== 'string') ||
      (order.deliveryAddress !== undefined && typeof order.deliveryAddress !== 'string') ||
      (order.specialInstructions !== undefined && typeof order.specialInstructions !== 'string') ||
      (order.monthlyCredit !== undefined && typeof order.monthlyCredit !== 'boolean')
    ) {
      return NextResponse.json({ success: false, error: 'Please complete all required order details.' }, { status: 400 });
    }

    const { order: createdOrder } = await serverValidateAndCreateOrder(
      {
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderType: order.orderType as OrderType,
        tableNumber: order.tableNumber as string | undefined,
        deliveryAddress: order.deliveryAddress as string | undefined,
        specialInstructions: order.specialInstructions as string | undefined,
        items: order.items,
      },
      {
        source: 'phone',
        initialStatus: 'pending',
        statusNotes: 'Phone order entered by staff.',
        paymentMethod: order.monthlyCredit === true ? 'monthly_credit' : 'cash',
      }
    );

    return NextResponse.json({ success: true, order: createdOrder }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create phone order.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
