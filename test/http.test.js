import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { startServer, client } from './server.js';
import { pages, categories, products, getProduct } from '../lib/catalog.js';

let srv;
before(async () => { srv = await startServer(); });
after(async () => { await srv?.stop(); });

test('every page renders (content, shop, categories, products)', async () => {
  const r = client(srv.base);
  const urls = ['/', '/shop/', ...pages.filter((p) => p.slug !== 'home').map((p) => `/${p.slug}/`),
    ...categories.map((c) => `/product-category/${c.slug}/`), ...products.map((p) => `/product/${p.slug}/`)];
  for (const u of urls) {
    const res = await r(u);
    assert.equal(res.status, 200, `${u} -> ${res.status}`);
    assert.match(res.text, /<main id="main">/, u);
  }
});

test('original copy and prices are preserved', async () => {
  const r = client(srv.base);
  const home = (await r('/')).text;
  for (const s of ['Research Peptides Australia', 'Every Batch Tested for Purity', 'Quality product. Full transparency.']) assert.ok(home.includes(s), s);
  const pdp = (await r('/product/bpc-157-10mg/')).text;
  assert.ok(pdp.includes('pentadecapeptide for tissue repair research in Australia'));
  assert.ok(pdp.includes('$79.99') && pdp.includes('$71.99'));
  assert.ok((await r('/shipping-policy/')).text.includes('Orders totalling $200 or more automatically qualify for free express shipping'));
});

test('every internal link and image resolves', async () => {
  const r = client(srv.base);
  const seen = new Set();
  const queue = ['/'];
  const broken = [];
  while (queue.length) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    seen.add(u);
    const res = await r(u);
    if (res.status >= 400) { broken.push(`${u} (${res.status})`); continue; }
    if (res.status >= 300) { if (res.location) queue.push(new URL(res.location, srv.base).pathname + new URL(res.location, srv.base).search); continue; }
    if (!/^\s*<!DOCTYPE html/i.test(res.text)) continue;
    for (const m of res.text.matchAll(/(?:href|src)="(\/[^"#]*)"/g)) {
      let link = m[1].replace(/&amp;/g, '&');
      // optimised images: verify the source file behind /_next/image
      if (link.startsWith('/_next/image?')) link = decodeURIComponent(new URL(link, srv.base).searchParams.get('url') || '');
      if (link.startsWith('//') || link.startsWith('/_next/') || link.startsWith('/api/')) continue;
      if (/\.(jpe?g|png|svg|webp|gif|ico)(\?|$)/.test(link)) {
        if (!seen.has(link)) { seen.add(link); const a = await r(link); if (a.status !== 200) broken.push(`${link} (${a.status}) on ${u}`); }
      } else if (!seen.has(link)) queue.push(link);
    }
  }
  assert.deepEqual(broken, [], broken.join('\n'));
  assert.ok(seen.size > 130, `crawled ${seen.size}`);
});

test('cart route handlers: add (no-JS + JSON), update, remove, tamper-proof', async () => {
  const r = client(srv.base);
  let res = await r('/api/cart/add/', { method: 'POST', form: { product: 'bpc-157-10mg', qty: '2' } });
  assert.equal(res.status, 303);
  assert.match(res.location, /\/product\/bpc-157-10mg\/\?added=1$/);
  res = await r('/api/cart/add/', { method: 'POST', form: { product: 'tb-500-10mg' }, json: true });
  assert.equal(res.json().count, 3);
  assert.equal(res.json().subtotal, 7999 * 2 + 9999);

  res = await r('/cart/');
  assert.match(res.text, /BPC-157 10mg/);
  assert.match(res.text, /for free express shipping/);

  await r('/api/cart/update/', { method: 'POST', form: { 'qty[bpc-157-10mg]': '3', 'qty[tb-500-10mg]': '0' } });
  let cart = (await r('/api/cart/')).json();
  assert.deepEqual(cart.lines.map((l) => [l.slug, l.qty]), [['bpc-157-10mg', 3]]);
  await r('/api/cart/remove/', { method: 'POST', form: { product: 'bpc-157-10mg' } });
  assert.equal((await r('/api/cart/')).json().count, 0);

  assert.equal((await r('/api/cart/add/', { method: 'POST', form: { product: 'pt-141-10mg' }, json: true })).status, 400);
  res = await r('/api/cart/add/', { method: 'POST', form: { product: 'ahk-cu-100mg', qty: '999' }, json: true });
  assert.equal(res.json().count, getProduct('ahk-cu-100mg').stock);
  // cross-site POST rejected
  assert.equal((await r('/api/cart/add/', { method: 'POST', form: { product: 'bpc-157-10mg' }, headers: { origin: 'https://evil.example' } })).status, 403);
  // forged cookie ignored
  const forged = await fetch(`${srv.base}/api/cart/`, { headers: { cookie: 'cart=eyJicGMtMTU3LTEwbWciOjV9.forged' } });
  assert.equal((await forged.json()).count, 0);
  // empty cart cannot reach checkout
  const fresh = client(srv.base);
  assert.match((await fresh('/checkout/')).location || '', /\/cart\/$/);
});

test('contact form: saves, emails the store, honeypot dropped, validation', async () => {
  const r = client(srv.base);
  let res = await r('/api/contact/', { method: 'POST', form: { pl_contact_name: 'Sam', pl_contact_email: 'sam@example.com', pl_contact_topic: 'order', pl_contact_message: 'Hello there' } });
  assert.equal(res.status, 303);
  assert.match(res.location, /\/contact\/\?notice=sent/);
  await r('/api/contact/', { method: 'POST', form: { pl_contact_website: 'spam', pl_contact_name: 'Bot', pl_contact_email: 'b@b.co', pl_contact_message: 'x' } });
  res = await r('/api/contact/', { method: 'POST', form: { pl_contact_name: '', pl_contact_email: 'bad', pl_contact_message: '' } });
  assert.match(res.location, /notice=invalid/);
  const msgs = JSON.parse(fs.readFileSync(path.join(srv.dataDir, 'messages.json'), 'utf8'));
  assert.equal(msgs.length, 1);
  await new Promise((r2) => setTimeout(r2, 300));
  const mail = srv.outbox().find((m) => /Contact form/.test(m.subject));
  assert.ok(mail, 'contact email sent');
  assert.equal(mail.to, 'orders@store.test');
  assert.match(mail.replyTo, /sam@example\.com/);
});

test('track order: finds by number + email, rejects wrong email, no PII in URL', async () => {
  fs.writeFileSync(path.join(srv.dataDir, 'orders.json'), JSON.stringify([{
    id: 5050, key: 'k', status: 'on-hold', createdAt: new Date().toISOString(), billing: { email: 'Jo@Example.com' },
    totals: { total: 12345 },
  }]));
  const r = client(srv.base);
  let res = await r('/api/track-order/', { method: 'POST', form: { pl_track_order_id: '#5050', pl_track_email: 'jo@example.com' } });
  assert.equal(res.status, 303);
  assert.doesNotMatch(res.location, /example/i);
  res = await r(new URL(res.location, srv.base).pathname + new URL(res.location, srv.base).search);
  assert.match(res.text, /Order #<!-- -->5050<!-- --> — <!-- -->Awaiting bank transfer|Order #5050 — Awaiting bank transfer/);
  assert.match(res.text, /\$123\.45/);
  res = await r('/api/track-order/', { method: 'POST', form: { pl_track_order_id: '5050', pl_track_email: 'no@example.com' } });
  assert.match(res.location, /notice=notfound/);
});

test('SEO: unique titles, descriptions, one h1, canonical, OG/Twitter, valid JSON-LD', async () => {
  const r = client(srv.base);
  const urls = ['/', '/shop/', ...pages.filter((p) => !['home', 'my-account', 'affiliate-area'].includes(p.slug)).map((p) => `/${p.slug}/`),
    ...categories.map((c) => `/product-category/${c.slug}/`), ...products.map((p) => `/product/${p.slug}/`)];
  const titles = new Map();
  const problems = [];
  for (const u of urls) {
    const html = (await r(u)).text;
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    if (!title) problems.push(`${u}: no title`);
    else if (titles.has(title)) problems.push(`${u}: duplicate title with ${titles.get(title)}`);
    else titles.set(title, u);
    if (!desc || desc.length < 50) problems.push(`${u}: description missing/short`);
    const h1s = (html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) problems.push(`${u}: ${h1s} h1`);
    if (!html.includes(`<link rel="canonical" href="https://centralpurposelab.com${u}"`)) problems.push(`${u}: canonical`);
    if (!/<meta property="og:image"/.test(html)) problems.push(`${u}: og:image`);
    if (!/<meta name="twitter:card" content="summary_large_image"/.test(html)) problems.push(`${u}: twitter card`);
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      try { JSON.parse(m[1]); } catch { problems.push(`${u}: invalid JSON-LD`); }
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));

  const home = (await r('/')).text;
  assert.match(home, /"@type":"Organization"/);
  assert.match(home, /"@type":"WebSite"[\s\S]*SearchAction/);
  const pdp = (await r('/product/bpc-157-10mg/')).text;
  assert.match(pdp, /"@type":"Product"[\s\S]*"brand"[\s\S]*"shippingDetails"/);
  assert.match(pdp, /"@type":"BreadcrumbList"/);
  assert.match((await r('/product-category/healing-peptides/')).text, /"@type":"ItemList"/);
  assert.match((await r('/bpc-157/')).text, /"@type":"FAQPage"/);
  assert.match((await r('/shop/?q=bpc')).text, /<meta name="robots" content="noindex/);
  assert.match(home, /<meta property="og:image" content="https:\/\/centralpurposelab\.com\/opengraph-image\/"/);
  assert.match(home, /<link rel="apple-touch-icon" href="\/apple-icon\/"/);
  for (const u of ['/opengraph-image/', '/brand-logo.png', '/apple-icon/', '/manifest.webmanifest']) {
    assert.equal((await r(u)).status, 200, u);
  }
  assert.match((await r('/sitemap.xml')).text, /<image:loc>/);
  assert.equal((await r('/feed/')).status, 308);
  assert.equal((await r('/shop/page/2/')).status, 308);
});

test('legacy URLs, search, sort, SEO', async () => {
  const r = client(srv.base);
  assert.equal((await r('/bpc-157')).status, 308);
  let res = await r('/?s=semax');
  assert.match(res.location, /\/shop\/\?.*\bq=semax/);
  res = await r('/shop/?q=ghk');
  assert.match(res.text, /GHK-Cu 100mg/);
  assert.doesNotMatch(res.text, />BPC-157 10mg</);
  res = await r('/shop/?sort=price');
  const prices = [...res.text.matchAll(/class="pcard__now">\$([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(prices.length > 40);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  res = await r('/product/bpc-157-10mg/');
  assert.match(res.text, /<link rel="canonical" href="https:\/\/centralpurposelab\.com\/product\/bpc-157-10mg\/"/);
  assert.match(res.text, /"@type":"Product"/);
  assert.match((await r('/sitemap.xml')).text, /https:\/\/centralpurposelab\.com\/shop\//);
  assert.equal((await r('/does-not-exist/')).status, 404);
  assert.match((await r('/my-account/lost-password/')).location || '', /notice=accounts/);
  res = await r('/api/account-notice/?from=affiliate-area', { method: 'POST', form: {} });
  assert.match(res.location, /\/affiliate-area\/\?notice=accounts/);
});

// ---- technical SEO: robots.txt, sitemap, canonical/link consistency ----

const SITE = 'https://centralpurposelab.com';
const PRIVATE_NOINDEX = ['/my-account/', '/affiliate-area/'];
// Linked from pages but intentionally outside the sitemap.
const NOT_IN_SITEMAP = new Set(['/cart/', '/checkout/', ...PRIVATE_NOINDEX]);

const sitemapLocs = (xml) => [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

test('robots.txt: blocks transactional/API routes, lets crawlers see noindex pages', async () => {
  const r = client(srv.base);
  const txt = (await r('/robots.txt')).text;
  const disallow = [...txt.matchAll(/^Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  for (const p of ['/cart/', '/checkout/', '/api/']) assert.ok(disallow.includes(p), `missing Disallow ${p}`);
  for (const p of PRIVATE_NOINDEX) assert.ok(!disallow.includes(p), `${p} must be crawlable so its noindex is seen`);
  assert.match(txt, new RegExp(`^Sitemap: ${SITE}/sitemap\\.xml$`, 'm'));
  // The pages robots.txt no longer blocks must carry noindex, with or without the notice query.
  for (const u of [...PRIVATE_NOINDEX, '/my-account/?notice=accounts', '/affiliate-area/?notice=accounts']) {
    const res = await r(u);
    assert.equal(res.status, 200, u);
    assert.match(res.text, /<meta name="robots" content="noindex/, `${u} must be noindex`);
  }
});

test('sitemap: no build-time lastmod, unique primary-domain URLs, all indexable and self-canonical', async () => {
  const r = client(srv.base);
  const xml = (await r('/sitemap.xml')).text;
  assert.doesNotMatch(xml, /<lastmod>/, 'lastmod must come from real modification dates, not the build time');
  const locs = sitemapLocs(xml);
  const expected = 2 + categories.length + products.length + pages.filter((p) => !['home', 'my-account', 'affiliate-area'].includes(p.slug)).length;
  assert.equal(locs.length, expected);
  assert.equal(new Set(locs).size, locs.length, 'duplicate sitemap URLs');
  const problems = [];
  for (const loc of locs) {
    if (!loc.startsWith(`${SITE}/`) || !loc.endsWith('/')) { problems.push(`${loc}: not a primary-domain trailing-slash URL`); continue; }
    const res = await r(loc.slice(SITE.length));
    if (res.status !== 200) { problems.push(`${loc}: ${res.status}`); continue; }
    if (!res.text.includes(`<link rel="canonical" href="${loc}"`)) problems.push(`${loc}: canonical differs`);
    if (/<meta name="robots" content="noindex/.test(res.text)) problems.push(`${loc}: noindex page in sitemap`);
  }
  for (const p of PRIVATE_NOINDEX) if (locs.includes(SITE + p)) problems.push(`${p}: noindex page in sitemap`);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('internal page links point at sitemap URLs; no absolute links to other hosts of this site', async () => {
  const r = client(srv.base);
  const locs = new Set(sitemapLocs((await r('/sitemap.xml')).text).map((l) => l.slice(SITE.length)));
  const problems = [];
  for (const path of locs) {
    const html = (await r(path)).text;
    for (const m of html.matchAll(/<a\b[^>]*?\shref="([^"#]*)"/g)) {
      const href = m[1].replace(/&amp;/g, '&');
      if (/^https?:\/\/(www\.)?(centralpurposelab|purposelabsau)\.com/i.test(href) && !href.startsWith(`${SITE}/`)) {
        problems.push(`${path}: link to non-primary host ${href}`);
        continue;
      }
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('/_next/') || href.startsWith('/api/')) continue;
      const target = href.split('?')[0];
      if (/\.[a-z0-9]+$/i.test(target)) continue; // assets
      if (!locs.has(target) && !NOT_IN_SITEMAP.has(target)) problems.push(`${path}: links to ${target}, which is not in the sitemap`);
    }
  }
  assert.deepEqual([...new Set(problems)], [], [...new Set(problems)].join('\n'));
});

// ---- www → primary host redirect (next.config.mjs) ----

const WWW = 'www.centralpurposelab.com';
const PRIMARY = 'centralpurposelab.com';

// fetch() cannot set the Host header, so talk HTTP directly.
const hostGet = (host, p) => new Promise((resolve, reject) => {
  const { port } = new URL(srv.base);
  http.get({ host: '127.0.0.1', port, path: p, headers: { host } }, (res) => {
    res.resume();
    resolve({ status: res.statusCode, location: res.headers.location });
  }).on('error', reject);
});

const WWW_CASES = [
  '/', '/shop/', '/shop/?sort=price&q=bpc', '/?s=semax', '/product/bpc-157-10mg/',
  '/product-category/healing-peptides/', '/bpc-157/', '/privacy-policy/', '/track-order/',
  '/robots.txt', '/sitemap.xml', '/a%20b/?x=%2F&y=1',
];

test('www host: 301 to the primary host, path + trailing slash + query preserved, one hop', async () => {
  for (const p of WWW_CASES) {
    const res = await hostGet(WWW, p);
    assert.equal(res.status, 301, `${p} -> ${res.status}`);
    assert.equal(res.location, `https://${PRIMARY}${p}`, p);
  }
  // Host matching is case-insensitive and ignores the port.
  for (const h of ['WWW.CentralPurposeLab.com', `${WWW}:443`]) {
    const res = await hostGet(h, '/shop/');
    assert.equal(res.status, 301, h);
    assert.equal(res.location, `https://${PRIMARY}/shop/`, h);
  }
  // Every sitemap page lands on a 200 on the primary host in a single hop.
  const locs = sitemapLocs((await client(srv.base)('/sitemap.xml')).text);
  for (const loc of locs) {
    const p = loc.slice(SITE.length);
    const res = await hostGet(WWW, p);
    assert.equal(res.status, 301, `www ${p}`);
    assert.equal(res.location, loc, `www ${p}`);
    assert.equal((await hostGet(PRIMARY, p)).status, 200, `primary ${p} after redirect`);
  }
});

test('primary and look-alike hosts are never redirected to the primary host', async () => {
  const locs = sitemapLocs((await client(srv.base)('/sitemap.xml')).text);
  for (const loc of locs) {
    const res = await hostGet(PRIMARY, loc.slice(SITE.length));
    assert.equal(res.status, 200, `${loc} -> ${res.status} ${res.location || ''}`);
  }
  for (const p of ['/shop/?sort=price&q=bpc', '/robots.txt', '/sitemap.xml']) assert.equal((await hostGet(PRIMARY, p)).status, 200, p);
  // Existing legacy redirects on the primary host stay relative (same host), never cross-host.
  const legacy = await hostGet(PRIMARY, '/feed/');
  assert.equal(legacy.status, 308);
  assert.equal(legacy.location, '/');
  for (const h of [`evil.${WWW}`, `${WWW}.evil.test`, `x${WWW}`]) {
    const res = await hostGet(h, '/');
    assert.notEqual(res.status, 301, `${h} must not match the www rule`);
    assert.ok(!res.location?.includes(PRIMARY), `${h} must not redirect to the primary host`);
  }
});
