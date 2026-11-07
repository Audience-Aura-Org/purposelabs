import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findOrder } from '@/lib/store';
import { money } from '@/lib/format';
import { payments, shipping } from '@/lib/config';

export const metadata = { title: 'Order received | Purpose Labs', robots: { index: false } };

export default async function OrderReceived({ params, searchParams }) {
  const { id } = await params;
  const { key } = await searchParams;
  const order = findOrder(id, { key: String(key || '').slice(0, 64) });
  if (!order) notFound();
  const b = payments.bank;
  const hasBank = b.accountName && b.bsb && b.accountNumber;
  const t = order.totals;
  const a = order.shippingAddress;

  return (
    <section className="flow">
      <div className="wrap wrap--narrow">
        <div className="receipt">
          <p className="eyebrow">Order received</p>
          <h1 className="display">Thank you, {order.billing.first_name}.</h1>
          <p className="lead">Your order <strong className="mono">#{order.id}</strong> has been placed and is awaiting payment. A confirmation has been emailed to <strong>{order.billing.email}</strong>.</p>

          <div className="panel panel--signal">
            <h2 className="h3">Pay by bank transfer</h2>
            {hasBank ? (
              <>
                <dl className="kv">
                  <div><dt>Account name</dt><dd>{b.accountName}</dd></div>
                  <div><dt>BSB</dt><dd className="mono">{b.bsb}</dd></div>
                  <div><dt>Account number</dt><dd className="mono">{b.accountNumber}</dd></div>
                  <div><dt>Amount</dt><dd className="mono">{money(t.total)}</dd></div>
                  <div><dt>Reference</dt><dd className="mono">{order.id}</dd></div>
                </dl>
                <p className="field-hint">Use your order number as the payment reference. Your order ships once the transfer clears.</p>
              </>
            ) : (
              <p>Please transfer <strong className="mono">{money(t.total)}</strong> using reference <strong className="mono">{order.id}</strong>. Our bank details are in your confirmation email.</p>
            )}
          </div>

          <div className="panel">
            <h2 className="h3">Order details</h2>
            <ul className="mini-lines">
              {order.lines.map((l) => (
                <li key={l.slug}><span className="mini-lines__qty">{l.qty}</span><span className="mini-lines__name">{l.name}</span><span>{money(l.total)}</span></li>
              ))}
            </ul>
            <dl className="totals">
              <div><dt>Subtotal</dt><dd>{money(t.subtotal)}</dd></div>
              <div className="totals__signal"><dt>Bank transfer discount</dt><dd>−{money(t.discount)}</dd></div>
              <div><dt>{shipping.methods[t.shippingMethod]?.label}</dt><dd>{t.shipping ? money(t.shipping) : 'FREE'}</dd></div>
              <div className="totals__grand"><dt>Total</dt><dd>{money(t.total)}</dd></div>
              <div className="totals__gst"><dt>Includes GST</dt><dd>{money(t.gst)}</dd></div>
            </dl>
            <p className="field-hint">Shipping to {a.address_1}{a.address_2 ? `, ${a.address_2}` : ''}, {a.city} {a.state} {a.postcode}</p>
          </div>
          <p><Link className="btn btn--ghost" href="/track-order/">Track this order</Link> <Link className="link" href="/shop/">Continue shopping →</Link></p>
        </div>
      </div>
    </section>
  );
}
