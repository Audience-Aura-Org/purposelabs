// Pure pricing logic: no Next.js imports, so it is unit-testable in plain Node.
import { getProduct } from './catalog.js';
import { shipping, payments } from './config.js';

export function clampQty(product, qty) {
  const q = Math.floor(Number(qty));
  if (!Number.isFinite(q) || q < 0) return 0;
  return Math.min(q, product.stock || 999);
}

/** Drop unknown/out-of-stock lines and clamp quantities. */
export function sanitizeCart(obj) {
  const out = {};
  if (!obj || typeof obj !== 'object') return out;
  for (const [slug, qty] of Object.entries(obj)) {
    const p = getProduct(slug);
    if (!p || !p.inStock) continue;
    const q = clampQty(p, qty);
    if (q > 0) out[slug] = q;
  }
  return out;
}

export function summarize(cart, { shippingMethod = 'express', paymentMethod = 'bank' } = {}) {
  const lines = [];
  for (const [slug, qty] of Object.entries(cart)) {
    const p = getProduct(slug);
    if (!p) continue;
    lines.push({ slug, name: p.name, image: p.image, qty, unit: p.price, total: p.price * qty, stock: p.stock });
  }
  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const freeExpress = subtotal >= shipping.freeExpressThreshold;
  const method = shipping.methods[shippingMethod] ? shippingMethod : 'express';
  const shippingCost = !lines.length ? 0 : method === 'express' && freeExpress ? 0 : shipping.methods[method].cost;
  const discount = paymentMethod === 'bank' ? Math.round(subtotal * payments.bankTransferDiscount) : 0;
  const total = subtotal - discount + shippingCost;
  return {
    lines, count, subtotal, discount, shippingMethod: method, shippingCost, total,
    gst: Math.round(total / 11), // prices are GST-inclusive
    freeExpress, toFreeExpress: Math.max(0, shipping.freeExpressThreshold - subtotal),
  };
}

const PO_BOX = /\b(p\.?\s*o\.?\s*box|post\s*office\s*box|parcel\s*locker)\b/i;

/** Validate checkout input. Returns { values, errors }. */
export function validateCheckout(input, states) {
  const s = (k, max) => String(input[k] ?? '').trim().slice(0, max);
  const v = {
    email: s('email', 200), phone: s('phone', 30),
    first_name: s('first_name', 80), last_name: s('last_name', 80),
    address_1: s('address_1', 160), address_2: s('address_2', 160),
    city: s('city', 80), state: s('state', 3), postcode: s('postcode', 4),
    shipping_method: input.shipping_method === 'standard' ? 'standard' : 'express',
    notes: s('notes', 1000),
    terms: input.terms === 'on' || input.terms === '1' || input.terms === true,
  };
  const errors = [];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.push('Enter a valid email address.');
  if (!/^[0-9 +()-]{8,}$/.test(v.phone)) errors.push('Enter a valid phone number.');
  if (!v.first_name || !v.last_name) errors.push('Enter your first and last name.');
  if (!v.address_1 || !v.city) errors.push('Enter your street address and suburb.');
  if (!states.includes(v.state)) errors.push('Choose your state or territory.');
  if (!/^\d{4}$/.test(v.postcode)) errors.push('Enter a 4-digit Australian postcode.');
  if (v.shipping_method === 'express' && PO_BOX.test(`${v.address_1} ${v.address_2}`)) {
    errors.push('Express Post cannot be delivered to PO Boxes. Choose Standard Shipping or use a street address.');
  }
  if (!v.terms) errors.push('Please confirm you have read the terms and that products are for research use only.');
  return { values: v, errors };
}
