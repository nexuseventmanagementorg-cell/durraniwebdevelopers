import { NextRequest, NextResponse } from 'next/server';
import { getDiningTables, upsertDiningTable, deleteDiningTable } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const tables = await getDiningTables();
    return NextResponse.json({ success: true, tables });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load tables' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const table = await req.json();
    if (!table.id || !table.label) {
      return NextResponse.json({ success: false, error: 'Table ID and label required' }, { status: 400 });
    }

    const saved = await upsertDiningTable(table);
    return NextResponse.json({ success: true, table: saved });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save table' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Table ID required' }, { status: 400 });
    }

    const deleted = await deleteDiningTable(id);
    return NextResponse.json({ success: deleted });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete table' }, { status: 500 });
  }
}
