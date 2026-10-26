import { getDiningTables } from '@/lib/db';

export async function GET() {
  try {
    const tables = await getDiningTables();
    return Response.json({ success: true, tables: tables.filter((table) => table.isActive) });
  } catch {
    return Response.json({ success: false, error: 'Failed to load tables' }, { status: 500 });
  }
}
