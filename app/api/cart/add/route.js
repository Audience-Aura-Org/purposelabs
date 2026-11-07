import { NextResponse } from 'next/server';
import { getProduct } from '@/lib/catalog';
import { readCart, writeCart } from '@/lib/cart';
import { clampQty, summarize } from '@/lib/pricing';
import { formOf, seeOther, wantsJson, str, sameOrigin } from '@/lib/http';

export async function POST(req) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'Bad origin' }, { status: 403 });
  const f = await formOf(req);
  const p = getProduct(str(f.product, 120));
  if (!p || !p.inStock) {
    return wantsJson(req) ? NextResponse.json({ ok: false, error: 'This product is not available.' }, { status: 400 }) : seeOther(req, '/shop/');
  }
  const cart = await readCart();
  cart[p.slug] = clampQty(p, (cart[p.slug] || 0) + Math.max(1, Number(f.qty) || 1));
  await writeCart(cart);
  if (wantsJson(req)) {
    const s = summarize(cart);
    return NextResponse.json({ ok: true, count: s.count, subtotal: s.subtotal, toFreeExpress: s.toFreeExpress, lines: s.lines });
  }
  return seeOther(req, f.return === 'cart' ? '/cart/' : `/product/${p.slug}/?added=1`);
}
