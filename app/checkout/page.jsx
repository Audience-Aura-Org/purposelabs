import { redirect } from 'next/navigation';
import { cartSummary } from '@/lib/cart';
import { AU_STATES, shipping, brand } from '@/lib/config';
import CheckoutForm from './CheckoutForm';

export const metadata = { title: 'Checkout | Purpose Labs', robots: { index: false } };

export default async function CheckoutPage() {
  const s = await cartSummary({ shippingMethod: 'express', paymentMethod: 'bank' });
  if (!s.lines.length) redirect('/cart/');
  return (
    <section className="flow">
      <div className="wrap">
        <h1 className="display">Checkout</h1>
        <CheckoutForm summary={s} states={AU_STATES} shipping={shipping} notice={brand.researchNotice} />
      </div>
    </section>
  );
}
