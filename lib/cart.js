// Cart stored in an HMAC-signed cookie: { [slug]: qty }. Prices always come
// from the catalog on the server.
import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { cookieSecret } from './config.js';
import { sanitizeCart, summarize } from './pricing.js';

const NAME = 'cart';

const sign = (v) => crypto.createHmac('sha256', cookieSecret()).update(v).digest('base64url');

export function decodeCart(raw) {
  if (!raw) return {};
  const i = raw.lastIndexOf('.');
  if (i < 1) return {};
  const body = raw.slice(0, i), mac = raw.slice(i + 1);
  const expected = sign(body);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return {};
  try {
    return sanitizeCart(JSON.parse(Buffer.from(body, 'base64url').toString('utf8')));
  } catch {
    return {};
  }
}

export function encodeCart(cart) {
  const body = Buffer.from(JSON.stringify(cart)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export async function readCart() {
  return decodeCart((await cookies()).get(NAME)?.value);
}

/** Only callable from Server Actions / Route Handlers. */
export async function writeCart(cart) {
  const jar = await cookies();
  const clean = sanitizeCart(cart);
  if (!Object.keys(clean).length) return jar.delete(NAME);
  jar.set(NAME, encodeCart(clean), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
  });
}

export async function cartSummary(opts) {
  return summarize(await readCart(), opts);
}
