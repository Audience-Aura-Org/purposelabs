// Transactional email via Nodemailer.
//   SMTP_HOST set            -> SMTP delivery
//   MAIL_TRANSPORT=file      -> appended to DATA_DIR/outbox.jsonl (tests / previews)
//   otherwise                -> logged to the console (local development)
// Sending never fails an order or contact submission; errors are logged.
import fs from 'node:fs';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { mail, dataDir } from './config.js';
import { orderCustomerEmail, orderStoreEmail, contactEmail } from './emails.js';

let transport;
function getTransport() {
  if (transport) return transport;
  if (process.env.MAIL_TRANSPORT === 'file') {
    transport = {
      sendMail: async (msg) => {
        fs.mkdirSync(dataDir(), { recursive: true });
        fs.appendFileSync(path.join(dataDir(), 'outbox.jsonl'), JSON.stringify(msg) + '\n');
        return { messageId: 'file' };
      },
    };
  } else if (mail.host) {
    transport = nodemailer.createTransport({
      host: mail.host,
      port: mail.port,
      secure: mail.secure,              // 465 → implicit SSL
      requireTLS: !mail.secure,         // 587 → must upgrade with STARTTLS
      auth: mail.user ? { user: mail.user, pass: mail.pass } : undefined,
      pool: true, maxConnections: 2,    // reuse the connection between sends
      connectionTimeout: 15_000, greetingTimeout: 10_000, socketTimeout: 30_000,
    });
  } else {
    const json = nodemailer.createTransport({ jsonTransport: true });
    transport = {
      sendMail: async (msg) => {
        console.log(`[mail:dev] to=${msg.to} subject="${msg.subject}" — set SMTP_HOST to deliver`);
        return json.sendMail(msg);
      },
    };
  }
  return transport;
}

const quoteName = (n) => `"${String(n).replace(/["\r\n]/g, '')}"`;

async function send(msg) {
  try {
    return await getTransport().sendMail({ from: mail.from, ...msg });
  } catch (err) {
    console.error(`[mail] failed "${msg.subject}" -> ${msg.to}: ${err.message}`);
    return null;
  }
}

export async function sendOrderEmails(order) {
  const name = `${order.billing.first_name} ${order.billing.last_name}`.trim();
  const c = orderCustomerEmail(order);
  const jobs = [send({ to: `${quoteName(name)} <${order.billing.email}>`, replyTo: mail.storeEmail || undefined, ...c })];
  if (mail.storeEmail) jobs.push(send({ to: mail.storeEmail, replyTo: order.billing.email, ...orderStoreEmail(order) }));
  return Promise.all(jobs);
}

/** Checks login to the SMTP server (used by `npm run mail:test`). */
export async function verifyMail() {
  const t = getTransport();
  if (typeof t.verify !== 'function') return { ok: false, reason: 'SMTP is not configured (set SMTP_USER / SMTP_PASS).' };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

export async function sendTestEmail(to) {
  return getTransport().sendMail({
    from: mail.from, to,
    subject: `${mail.fromName} email is working`,
    text: `This is a test message from the Purpose Labs website.\n\nSMTP: ${mail.host}:${mail.port} (${mail.secure ? 'SSL' : 'STARTTLS'})\nFrom: ${mail.from}\nStore notifications go to: ${mail.storeEmail || '(not set)'}\n`,
  });
}

export async function sendContactEmail(msg) {
  if (!mail.storeEmail) return null;
  return send({ to: mail.storeEmail, replyTo: `${quoteName(msg.name)} <${msg.email}>`, ...contactEmail(msg) });
}
