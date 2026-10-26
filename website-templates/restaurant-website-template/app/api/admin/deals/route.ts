import { NextRequest, NextResponse } from 'next/server';
import { getDeals, upsertDeal, deleteDeal } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { isValidAdminImageDataUrl } from '@/lib/adminImageUpload';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const deals = await getDeals();
    return NextResponse.json({ success: true, deals });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load deals' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const deal = await req.json();
    if (
      !deal ||
      typeof deal.id !== 'string' ||
      !deal.id.trim() ||
      typeof deal.nameEn !== 'string' ||
      !deal.nameEn.trim() ||
      typeof deal.nameUr !== 'string' ||
      !deal.nameUr.trim() ||
      !Number.isInteger(deal.dealNumber) ||
      deal.dealNumber < 1 ||
      typeof deal.price !== 'number' ||
      !Number.isFinite(deal.price) ||
      deal.price < 0 ||
      typeof deal.image !== 'string' ||
      (deal.image.startsWith('data:') && !isValidAdminImageDataUrl(deal.image)) ||
      typeof deal.descriptionEn !== 'string' ||
      !Array.isArray(deal.components) ||
      deal.components.length === 0 ||
      !deal.components.every(
        (component: unknown) =>
          typeof component === 'object' &&
          component !== null &&
          'nameEn' in component &&
          typeof component.nameEn === 'string' &&
          component.nameEn.trim() !== '' &&
          'nameUr' in component &&
          typeof component.nameUr === 'string' &&
          'quantity' in component &&
          typeof component.quantity === 'number' &&
          Number.isInteger(component.quantity) &&
          component.quantity > 0
      )
    ) {
      return NextResponse.json({ success: false, error: 'Missing required deal fields' }, { status: 400 });
    }

    const saved = await upsertDeal(deal);
    return NextResponse.json({ success: true, deal: saved });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save deal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Deal ID required' }, { status: 400 });
    }

    const deleted = await deleteDeal(id);
    return NextResponse.json({ success: deleted });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete deal' }, { status: 500 });
  }
}
