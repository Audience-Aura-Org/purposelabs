import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/catalog';
import { readCart, writeCart } from '@/lib/cart';
import { clampQty } from '@/lib/pricing';
import { formOf, seeOther, sameOrigin } from '@/lib/http';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const f = await formOf(req);
  const cart = await readCart();
  for (const [k, v] of Object.entries(f)) {
    const m = k.match(/^qty\[(.+)\]$/);
    if (!m || !(m[1] in cart)) continue;
    const p = getProduct(m[1]);
    const q = p ? clampQty(p, v) : 0;
    if (q > 0) cart[m[1]] = q; else delete cart[m[1]];
  }
  await writeCart(cart);
  return seeOther(req, '/cart/');
}
