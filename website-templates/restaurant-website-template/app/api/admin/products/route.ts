import { NextRequest, NextResponse } from 'next/server';
import { getProducts, upsertProduct, deleteProduct } from '@/lib/db';
import { requireAdmin } from '@/lib/adminAuth';
import { isValidAdminImageDataUrl } from '@/lib/adminImageUpload';

export async function GET(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const products = await getProducts();
    return NextResponse.json({ success: true, products });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const product = await req.json();
    if (
      !product ||
      typeof product !== 'object' ||
      typeof product.id !== 'string' ||
      !product.id ||
      typeof product.nameEn !== 'string' ||
      !product.nameEn ||
      typeof product.price !== 'number' ||
      !Number.isFinite(product.price) ||
      typeof product.image !== 'string'
    ) {
      return NextResponse.json({ success: false, error: 'Missing required product fields' }, { status: 400 });
    }
    if (
      product.image.startsWith('data:') &&
      !isValidAdminImageDataUrl(product.image)
    ) {
      return NextResponse.json({ success: false, error: 'Uploaded image is invalid or too large' }, { status: 400 });
    }

    const saved = await upsertProduct(product);
    return NextResponse.json({ success: true, product: saved });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to save product' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdmin(req);
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Product ID required' }, { status: 400 });
    }

    const deleted = await deleteProduct(id);
    return NextResponse.json({ success: deleted });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
