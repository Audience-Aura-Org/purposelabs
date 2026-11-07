// Email templates (pure functions — easy to test and preview).
import { brand, payments, shipping } from './config.js';
import { money } from './format.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mono = "font-family:'Courier New',monospace;";

function bankBlock(order, html) {
  const b = payments.bank;
  const has = b.accountName && b.bsb && b.accountNumber;
  const total = money(order.totals.total);
  if (!html) {
    return has
      ? `Account name:   ${b.accountName}\nBSB:            ${b.bsb}\nAccount number: ${b.accountNumber}\nAmount:         ${total}\nReference:      ${order.id}\nUse your order number as the payment reference. Your order ships once the transfer clears.`
      : `Please transfer ${total} using reference ${order.id}. Reply to this email if you need our bank details.`;
  }
  return has
    ? `Account name: <strong>${esc(b.accountName)}</strong><br>BSB: <strong>${esc(b.bsb)}</strong><br>Account number: <strong>${esc(b.accountNumber)}</strong><br>Amount: <strong>${total}</strong><br>Reference: <strong>${order.id}</strong><br><span style="color:#66736e;">Use your order number as the payment reference. Your order ships once the transfer clears.</span>`
    : `Please transfer <strong>${total}</strong> using reference <strong>${order.id}</strong>. Reply to this email if you need our bank details.`;
}

const shipLabel = (order) => shipping.methods[order.totals.shippingMethod]?.label || 'Shipping';
const addressLines = (o) => {
  const a = o.shippingAddress;
  return [`${o.billing.first_name} ${o.billing.last_name}`, a.address_1 + (a.address_2 ? `, ${a.address_2}` : ''), `${a.city} ${a.state} ${a.postcode}`];
};

export function orderCustomerEmail(order) {
  const subject = `Your ${brand.name} order #${order.id} has been received`;
  const t = order.totals;
  const row = (l, r, style = '') => `<tr><td style="padding:3px 0;${style}">${l}</td><td align="right" style="padding:3px 0;${mono}${style}">${r}</td></tr>`;
  const html = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Helvetica,Arial,sans-serif;color:#14211d;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fffdf8;border:1px solid #ddd6c7;border-radius:14px;overflow:hidden;">
<tr><td style="background:#123b33;padding:22px 28px;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:22px;">${esc(brand.name)}</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 6px;${mono}font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#a93613;">Order received</p>
<h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:28px;">Thank you, ${esc(order.billing.first_name)}.</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3c4a45;">Your order <strong>#${order.id}</strong> has been placed and is awaiting payment.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbe7df;border:1px solid #edc2b1;border-radius:10px;margin:0 0 24px;"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.6;"><strong style="font-size:16px;">Pay by bank transfer</strong><br>${bankBlock(order, true)}</td></tr></table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-collapse:collapse;">
${order.lines.map((l) => `<tr><td style="padding:10px 0;border-bottom:1px solid #ddd6c7;">${l.qty} × ${esc(l.name)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #ddd6c7;${mono}">${money(l.total)}</td></tr>`).join('')}
${row('Subtotal', money(t.subtotal), 'color:#3c4a45;padding-top:10px;')}
${row('Bank transfer discount', `−${money(t.discount)}`, 'color:#a93613;')}
${row(esc(shipLabel(order)), t.shipping ? money(t.shipping) : 'FREE', 'color:#3c4a45;')}
${row('<strong>Total</strong>', `<strong>${money(t.total)}</strong>`, 'border-top:1px solid #ddd6c7;padding-top:12px;font-size:16px;')}
${row('Includes GST', money(t.gst), 'color:#66736e;font-size:12px;')}
</table>
<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#3c4a45;"><strong style="color:#14211d;">Shipping to</strong><br>${addressLines(order).map(esc).join('<br>')}</p>
<p style="margin:24px 0 0;"><a href="${brand.siteUrl}/track-order/" style="display:inline-block;background:#14211d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;font-size:14px;">Track your order</a></p>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #ddd6c7;font-size:12px;color:#66736e;line-height:1.5;">${esc(brand.researchNotice)}<br>${esc(brand.legalName)} · ${esc(brand.location)}</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Thank you, ${order.billing.first_name}.`, '',
    `Your ${brand.name} order #${order.id} has been placed and is awaiting payment.`, '',
    'PAY BY BANK TRANSFER', bankBlock(order, false), '',
    'ORDER', ...order.lines.map((l) => `${l.qty} x ${l.name}  ${money(l.total)}`),
    `Subtotal: ${money(t.subtotal)}`, `Bank transfer discount: -${money(t.discount)}`,
    `${shipLabel(order)}: ${t.shipping ? money(t.shipping) : 'FREE'}`, `Total: ${money(t.total)} (includes GST ${money(t.gst)})`, '',
    'SHIPPING TO', ...addressLines(order), '',
    `Track your order: ${brand.siteUrl}/track-order/`, '', brand.researchNotice,
  ].join('\n');
  return { subject, html, text };
}

export function orderStoreEmail(order) {
  const t = order.totals;
  const name = `${order.billing.first_name} ${order.billing.last_name}`.trim();
  return {
    subject: `New order #${order.id} — ${money(t.total)} (${name})`,
    text: [
      `New order #${order.id} — awaiting bank transfer`, '',
      `Customer: ${name}`, `Email:    ${order.billing.email}`, `Phone:    ${order.billing.phone}`, '',
      `Ship to (${shipLabel(order)}):`, ...addressLines(order).slice(1), '',
      ...order.lines.map((l) => `${l.qty} x ${l.name} (${l.slug})  ${money(l.total)}`), '',
      `Subtotal: ${money(t.subtotal)}`, `Discount: -${money(t.discount)}`,
      `Shipping: ${t.shipping ? money(t.shipping) : 'FREE'}`, `TOTAL:    ${money(t.total)}`,
      ...(order.notes ? ['', `Notes: ${order.notes}`] : []), '', `Placed: ${order.createdAt}`,
    ].join('\n'),
  };
}

export function contactEmail(msg) {
  return {
    subject: `Contact form: ${msg.topic || 'other'}${msg.order ? ` (order ${msg.order})` : ''} — ${msg.name}`,
    text: [`Name: ${msg.name}`, `Email: ${msg.email}`, `Topic: ${msg.topic}`, `Order: ${msg.order || '-'}`, '', msg.message].join('\n'),
  };
}
