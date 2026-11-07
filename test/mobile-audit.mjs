// Mobile audit: real-phone emulation at 320/360/390px.
// Reports overflow, small tap targets, tiny text, zoom-triggering inputs,
// oversized images. Optional screenshots.
//   npm run build && npm run audit:mobile -- [screenshot-dir]
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices } from 'playwright-core';
import { startServer } from './server.js';

const OUT = process.argv[2];
if (OUT) fs.mkdirSync(OUT, { recursive: true });

const PAGES = ['/', '/shop/', '/product-category/healing-peptides/', '/product/bpc-157-10mg/', '/bpc-157/', '/research/',
  '/about-us/', '/our-testing/', '/reconstitution-calculator/', '/rewards/', '/affiliate-program/', '/contact/',
  '/track-order/', '/shipping-policy/', '/research-peptides-australia/', '/my-account/', '/cart/', '/checkout/'];
const WIDTHS = [320, 360, 390];

const srv = await startServer();
const browser = await chromium.launch({ channel: 'chrome' });
const findings = {};
const add = (k, v) => { (findings[k] ||= new Set()).add(v); };

for (const width of WIDTHS) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width, height: 780 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  // put something in the cart so cart/checkout render fully
  await page.goto(srv.base + '/product/bpc-157-10mg/');
  await page.evaluate(() => fetch('/api/cart/add/', { method: 'POST', body: new URLSearchParams({ product: 'bpc-157-10mg', qty: '1' }) }));

  for (const u of PAGES) {
    await page.goto(srv.base + u, { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const vw = window.innerWidth;
      const out = { overflow: [], tap: [], tiny: [], zoom: [], img: [], layout: null };
      out.layout = { iw: window.innerWidth, sw: document.documentElement.scrollWidth };
      const visible = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.visibility !== 'hidden' && s.display !== 'none' && b.width > 0 && b.height > 0 && !el.closest('[hidden], .sr-only, .drawer, .primary-nav:not(.is-open)'); };
      const label = (el) => (el.getAttribute('aria-label') || el.textContent || el.value || el.name || el.className || el.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 40);
      for (const el of document.querySelectorAll('body *')) {
        if (!visible(el)) continue;
        const b = el.getBoundingClientRect();
        if (b.right > vw + 1 && !el.closest('.product-grid--rail, .hero-shelf, [class*=table-wrapper], .chips, .shipping-rates-table, .toast')) out.overflow.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} → ${Math.round(b.right - vw)}px`);
      }
      for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, label.option, label.check')) {
        if (!visible(el)) continue;
        if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) continue; // whole label is the target
        if (el.matches('.pcard__name a')) continue; // ::after overlay makes the whole card the target
        const b = el.getBoundingClientRect();
        if (el.matches('.qty input')) continue; // centre of a 44px+ stepper control
        const inline = el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p, li, td, dd, small, label, .woocommerce-privacy-policy-text');
        if (inline) continue; // links inside running text follow text size (WCAG 2.5.8 exception)
        if (b.height < 40 || b.width < 40) out.tap.push(`${el.tagName.toLowerCase()} "${label(el)}" ${Math.round(b.width)}×${Math.round(b.height)}`);
      }
      const walker = document.createTreeWalker(document.querySelector('main') || document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!visible(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 12) out.tiny.push(`${fs}px "${n.textContent.trim().slice(0, 30)}" (.${String(el.className).split(' ')[0]})`);
      }
      for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea')) {
        if (!visible(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 16) out.zoom.push(`${el.id || el.name} ${fs}px`);
      }
      for (const img of document.querySelectorAll('main img')) {
        if (!visible(img) || !img.naturalWidth) continue;
        const shown = img.getBoundingClientRect().width * devicePixelRatio;
        if (img.naturalWidth > shown * 2.2 && img.naturalWidth > 400) out.img.push(`${img.currentSrc.split('/').pop()} ${img.naturalWidth}px for ${Math.round(shown)}px`);
      }
      return out;
    });
    if (r.layout.iw !== width || r.layout.sw > width + 1) add('LAYOUT VIEWPORT', `${width} ${u} inner=${r.layout.iw} scroll=${r.layout.sw}`);
    r.overflow.forEach((x) => add('OVERFLOW', `${width} ${u} ${x}`));
    r.tap.forEach((x) => add('TAP <40px', `${u} ${x}`));
    r.tiny.forEach((x) => add('TEXT <12px', `${u} ${x}`));
    r.zoom.forEach((x) => add('INPUT <16px (iOS zoom)', `${u} ${x}`));
    r.img.forEach((x) => add('OVERSIZED IMG', `${u} ${x}`));
    if (OUT && width === 360) await page.screenshot({ path: path.join(OUT, `m360${u.replace(/\//g, '_')}.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
await srv.stop();

const keys = Object.keys(findings);
if (!keys.length) console.log('mobile audit: no issues');
for (const k of keys) {
  const list = [...findings[k]];
  console.log(`\n== ${k} (${list.length})\n  ` + list.slice(0, 40).join('\n  ') + (list.length > 40 ? `\n  …+${list.length - 40}` : ''));
}
process.exitCode = keys.length ? 1 : 0;
