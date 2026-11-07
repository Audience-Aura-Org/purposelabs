import { NextResponse } from 'next/server';

export const wantsJson = (req) => (req.headers.get('accept') || '').includes('application/json');

/**
 * 303 redirect to a same-origin path (POST -> GET). Uses a relative Location
 * so the browser stays on the host it used (req.url in route handlers can be
 * the internal host, e.g. behind a proxy).
 */
export function seeOther(_req, path) {
  if (!path.startsWith('/') || path.startsWith('//')) path = '/';
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}

export async function formOf(req) {
  try {
    return Object.fromEntries((await req.formData()).entries());
  } catch {
    return {};
  }
}

export const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);

/** Basic CSRF guard for cookie-mutating POSTs: same-origin only. */
export function sameOrigin(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // non-browser clients / old browsers; SameSite=Lax still applies
  try {
    return new URL(origin).host === (req.headers.get('x-forwarded-host') || req.headers.get('host'));
  } catch {
    return false;
  }
}
