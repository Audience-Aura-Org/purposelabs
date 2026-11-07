'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { AU_STATES } from '@/lib/config';
import { readCart, writeCart } from '@/lib/cart';
import { summarize, validateCheckout } from '@/lib/pricing';
import { createOrder } from '@/lib/store';
import { sendOrderEmails } from '@/lib/mail';

export async function placeOrder(_prev, formData) {
  const cart = await readCart();
  if (!Object.keys(cart).length) redirect('/cart/');

  const { values, errors } = validateCheckout(Object.fromEntries(formData.entries()), AU_STATES);
  if (errors.length) return { errors, values, at: Date.now() };

  const s = summarize(cart, { shippingMethod: values.shipping_method, paymentMethod: 'bank' });
  const order = await createOrder({
    paymentMethod: 'bank',
    billing: { email: values.email, phone: values.phone, first_name: values.first_name, last_name: values.last_name },
    shippingAddress: {
      address_1: values.address_1, address_2: values.address_2, city: values.city,
      state: values.state, postcode: values.postcode, country: 'AU',
    },
    notes: values.notes,
    lines: s.lines.map(({ slug, name, qty, unit, total }) => ({ slug, name, qty, unit, total })),
    totals: {
      subtotal: s.subtotal, discount: s.discount, shipping: s.shippingCost,
      shippingMethod: s.shippingMethod, total: s.total, gst: s.gst,
    },
  });

  await writeCart({});
  // Email after the response is sent so SMTP latency never slows checkout.
  after(() => sendOrderEmails(order));
  redirect(`/checkout/order-received/${order.id}/?key=${order.key}`);
}
