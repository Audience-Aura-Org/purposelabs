import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, sanitizeCart, validateCheckout } from '../lib/pricing.js';
import { orderCustomerEmail, orderStoreEmail, contactEmail } from '../lib/emails.js';
import { signToken, readToken } from '../lib/token.js';
import { renderLegacy, cardHtml } from '../lib/cards.js';
import { getProduct, pages } from '../lib/catalog.js';
import { AU_STATES } from '../lib/config.js';

const valid = {
  email: 'a@b.co', phone: '0412 345 678', first_name: 'A', last_name: 'B', address_1: '1 George St',
  city: 'Sydney', state: 'NSW', postcode: '2000', shipping_method: 'express', terms: 'on',
};

test('totals: bank discount, express/standard, free express from $200, GST', () => {
  let s = summarize({ 'bacteriostatic-water': 1 }, { shippingMethod: 'standard' });
  assert.deepEqual([s.subtotal, s.discount, s.shippingCost, s.total], [2300, 230, 1000, 3070]);
  s = summarize({ 'bacteriostatic-water': 1 }, { shippingMethod: 'express' });
  assert.equal(s.total, 2300 - 230 + 1500);
  s = summarize({ 'bpc-157-10mg': 3 }); // 239.97 >= 200
  assert.deepEqual([s.subtotal, s.discount, s.shippingCost, s.total], [23997, 2400, 0, 21597]);
  assert.equal(s.gst, Math.round(21597 / 11));
  assert.equal(summarize({ 'bpc-157-10mg': 3 }, { shippingMethod: 'standard' }).shippingCost, 1000, 'free shipping is express only');
  assert.equal(summarize({}).total, 0);
});

test('cart sanitising drops unknown/out-of-stock and clamps to stock', () => {
  const c = sanitizeCart({ 'pt-141-10mg': 1, nope: 2, 'ahk-cu-100mg': 999, 'bpc-157-10mg': -3, 'tb-500-10mg': '2' });
  assert.deepEqual(c, { 'ahk-cu-100mg': getProduct('ahk-cu-100mg').stock, 'tb-500-10mg': 2 });
  assert.deepEqual(sanitizeCart('junk'), {});
});

test('checkout validation', () => {
  assert.deepEqual(validateCheckout(valid, AU_STATES).errors, []);
  const bad = validateCheckout({ ...valid, postcode: '20', state: 'XX', terms: '' }, AU_STATES).errors.join(' ');
  assert.match(bad, /4-digit/);
  assert.match(bad, /state/);
  assert.match(bad, /research use only/);
  assert.match(validateCheckout({ ...valid, address_1: 'PO Box 12' }, AU_STATES).errors.join(), /PO Boxes/);
  assert.deepEqual(validateCheckout({ ...valid, address_1: 'PO Box 12', shipping_method: 'standard' }, AU_STATES).errors, []);
});

const order = {
  id: 5001, createdAt: '2026-11-07T00:00:00Z', notes: 'Leave at door',
  billing: { email: 'x@y.co', phone: '0400', first_name: '<b>Al</b>', last_name: 'Lee' },
  shippingAddress: { address_1: '1 St', address_2: '', city: 'Sydney', state: 'NSW', postcode: '2000' },
  lines: [{ slug: 'bpc-157-10mg', name: 'BPC-157 10mg', qty: 2, unit: 7999, total: 15998 }],
  totals: { subtotal: 15998, discount: 1600, shipping: 1500, shippingMethod: 'express', total: 15898, gst: 1445 },
};

test('order emails contain totals and escape customer input', () => {
  const c = orderCustomerEmail(order);
  assert.match(c.subject, /#5001/);
  assert.match(c.html, /\$158\.98/);
  assert.match(c.html, /&lt;b&gt;Al&lt;\/b&gt;/);
  assert.doesNotMatch(c.html, /<b>Al<\/b>/);
  assert.match(c.text, /Total: \$158\.98/);
  assert.match(c.text, /reference 5001/);
  const s = orderStoreEmail(order);
  assert.match(s.text, /Notes: Leave at door/);
  assert.match(s.subject, /New order #5001/);
  assert.match(contactEmail({ name: 'Sam', email: 's@x.co', topic: 'order', order: '12', message: 'hi' }).subject, /order 12/);
});

test('signed tokens reject tampering and expiry', () => {
  const t = signToken({ id: 1 });
  assert.equal(readToken(t).id, 1);
  assert.equal(readToken(t.slice(0, -2) + 'xx'), null);
  assert.equal(readToken(signToken({ id: 1 }, -1)), null);
  assert.equal(readToken('garbage'), null);
});

test('legacy content keeps copy and gets live product cards', () => {
  const home = pages.find((p) => p.slug === 'home');
  const html = renderLegacy(home.html);
  assert.doesNotMatch(html, /data-product-grid=/);
  assert.match(html, /Research Peptides Shouldn't Be a Gamble/);
  assert.match(html, /action="\/api\/cart\/add\/"/);
  assert.doesNotMatch(cardHtml(getProduct('pt-141-10mg')), /data-add-to-cart/, 'out-of-stock card has no add button');
});
