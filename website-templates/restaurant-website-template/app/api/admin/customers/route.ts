import { NextRequest, NextResponse } from 'next/server';
import { addCustomerCreditPayment, getCustomerLeads, setMonthlyCreditAccount } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

function getCurrentPakistanMonth(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}`;
}

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const month = new URL(req.url).searchParams.get('month') ?? getCurrentPakistanMonth();
  try {
    const customers = await getCustomerLeads(month);
    return NextResponse.json({ success: true, month, customers });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load customer records.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('phone' in body) ||
      typeof body.phone !== 'string' ||
      !('enabled' in body) ||
      typeof body.enabled !== 'boolean'
    ) {
      return NextResponse.json({ success: false, error: 'Customer phone and monthly account status are required.' }, { status: 400 });
    }

    await setMonthlyCreditAccount(body.phone, body.enabled);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update monthly account.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body: unknown = await req.json();
    if (
      !body ||
      typeof body !== 'object' ||
      !('phone' in body) ||
      typeof body.phone !== 'string' ||
      !('amount' in body) ||
      typeof body.amount !== 'number' ||
      !('date' in body) ||
      typeof body.date !== 'string' ||
      ('notes' in body && typeof body.notes !== 'string')
    ) {
      return NextResponse.json({ success: false, error: 'Customer phone, payment date, and amount are required.' }, { status: 400 });
    }

    let notes: string | undefined;
    if ('notes' in body) {
      if (typeof body.notes !== 'string') {
        return NextResponse.json({ success: false, error: 'Payment note must be text.' }, { status: 400 });
      }
      notes = body.notes;
    }
    const payment = await addCustomerCreditPayment(
      body.phone,
      body.amount,
      body.date,
      notes
    );
    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record customer payment.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
