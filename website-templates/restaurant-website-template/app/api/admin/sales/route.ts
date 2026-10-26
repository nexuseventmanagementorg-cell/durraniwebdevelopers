import { NextRequest, NextResponse } from 'next/server';
import { addDailyExpense, deleteDailyExpense, getDailySalesReport } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const selectedDate = searchParams.get('day');
  if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return NextResponse.json(
      { success: false, error: 'A valid month in YYYY-MM format is required.' },
      { status: 400 }
    );
  }
  if (selectedDate && (!/^\d{4}-\d{2}-\d{2}$/.test(selectedDate) || !selectedDate.startsWith(`${month}-`))) {
    return NextResponse.json(
      { success: false, error: 'The selected day must belong to the requested month.' },
      { status: 400 }
    );
  }

  try {
    const report = await getDailySalesReport(month, selectedDate ?? '');
    return NextResponse.json({ success: true, month, ...report });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to calculate daily sales.' },
      { status: 500 }
    );
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
      !('date' in body) ||
      typeof body.date !== 'string' ||
      !('description' in body) ||
      typeof body.description !== 'string' ||
      !('amount' in body) ||
      typeof body.amount !== 'number'
    ) {
      return NextResponse.json(
        { success: false, error: 'Purchase date, description, and amount are required.' },
        { status: 400 }
      );
    }

    const expense = await addDailyExpense(body.date, body.description, body.amount);
    return NextResponse.json({ success: true, expense }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record purchase.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;

  const id = new URL(req.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'Purchase entry ID is required.' }, { status: 400 });
  }

  try {
    const deleted = await deleteDailyExpense(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Purchase entry was not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete purchase entry.' }, { status: 500 });
  }
}
