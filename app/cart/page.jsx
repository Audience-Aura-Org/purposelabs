import Link from 'next/link';
import { cartSummary } from '@/lib/cart';
import { money, thumb } from '@/lib/format';
import { shipping } from '@/lib/config';

export const metadata = { title: 'Cart | Purpose Labs', robots: { index: false } };

export default async function CartPage() {
  const s = await cartSummary();
  return (
    <section className="flow">
      <div className="wrap">
        <h1 className="display">Cart</h1>
        {!s.lines.length ? (
          <div className="empty">
            <p>Your cart is currently empty.</p>
            <Link className="btn btn--ink" href="/shop/">Return to shop</Link>
          </div>
        ) : (
          <div className="flow__grid">
            <form className="cart-table" action="/api/cart/update/" method="post">
              <ul className="lines">
                {s.lines.map((l) => (
                  <li className="line" key={l.slug}>
                    <img className="line__img" src={thumb(l.image)} alt="" width="72" height="72" />
                    <div className="line__info">
                      <Link className="line__name" href={`/product/${l.slug}/`}>{l.name}</Link>
                      <span className="line__unit">{money(l.unit)} each</span>
                    </div>
                    <div className="qty qty--sm" data-qty>
                      <button type="button" className="qty__btn" data-step="-1" aria-label={`Decrease quantity of ${l.name}`}>−</button>
                      <label className="sr-only" htmlFor={`q-${l.slug}`}>Quantity of {l.name}</label>
                      <input id={`q-${l.slug}`} name={`qty[${l.slug}]`} type="number" min="0" max={l.stock || 99} defaultValue={l.qty} data-autoupdate />
                      <button type="button" className="qty__btn" data-step="1" aria-label={`Increase quantity of ${l.name}`}>+</button>
                    </div>
                    <span className="line__total">{money(l.total)}</span>
                    <button className="line__remove" type="submit" formAction="/api/cart/remove/" name="product" value={l.slug} aria-label={`Remove ${l.name}`}>Remove</button>
                  </li>
                ))}
              </ul>
              <div className="cart-table__actions">
                <Link className="link" href="/shop/">← Continue shopping</Link>
                <button className="btn btn--ghost btn--sm" type="submit">Update cart</button>
              </div>
            </form>

            <aside className="summary" aria-label="Cart totals">
              <h2 className="h3">Summary</h2>
              {s.toFreeExpress > 0 ? (
                <div className="ship-meter" style={{ '--pct': `${Math.min(100, Math.round((s.subtotal / shipping.freeExpressThreshold) * 100))}%` }}>
                  <p>Add <strong>{money(s.toFreeExpress)}</strong> for free express shipping</p>
                  <span className="ship-meter__bar"><span /></span>
                </div>
              ) : (
                <p className="ship-ok">✓ Your order qualifies for free express shipping</p>
              )}
              <dl className="totals">
                <div><dt>Subtotal</dt><dd>{money(s.subtotal)}</dd></div>
                <div className="totals__signal"><dt>Bank transfer discount (10%)</dt><dd>−{money(s.discount)}</dd></div>
                <div><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
              </dl>
              <Link className="btn btn--signal btn--block btn--lg" href="/checkout/">Proceed to checkout</Link>
              <p className="summary__fine">Prices include GST. Ships within Australia only.</p>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}
