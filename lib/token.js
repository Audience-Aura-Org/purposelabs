// Small signed tokens for passing server results through a redirect URL.
import crypto from 'node:crypto';
import { cookieSecret } from './config.js';

const mac = (b) => crypto.createHmac('sha256', cookieSecret()).update(b).digest('base64url').slice(0, 22);

export function signToken(data, ttlSeconds = 900) {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + ttlSeconds * 1000 })).toString('base64url');
  return `${body}.${mac(body)}`;
}

export function readToken(token) {
  if (typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const body = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expected = mac(body);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}
