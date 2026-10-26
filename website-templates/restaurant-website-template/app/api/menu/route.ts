import { getDeals, getProducts } from '@/lib/db';

export async function GET() {
  try {
    const [products, deals] = await Promise.all([getProducts(), getDeals()]);
    return Response.json({
      success: true,
      products: products.filter((product) => product.isAvailable),
      deals: deals.filter((deal) => deal.isAvailable),
    });
  } catch {
    return Response.json({ success: false, error: 'Failed to load menu' }, { status: 500 });
  }
}
