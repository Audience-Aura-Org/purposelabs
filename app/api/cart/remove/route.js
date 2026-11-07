import { NextResponse } from 'next/server';
import { readCart, writeCart } from '@/lib/cart';
import { formOf, seeOther, str, sameOrigin } from '@/lib/http';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const f = await formOf(req);
  const cart = await readCart();
  delete cart[str(f.product, 120)];
  await writeCart(cart);
  return seeOther(req, '/cart/');
}
