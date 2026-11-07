// Layout audit: full-page screenshots at desktop/tablet/mobile + geometry checks
// (overflow, off-centre containers, sections not full-width, text past edge).
//   npm run build && npm run audit -- <output-dir>
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { startServer } from './server.js';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
const PAGES = ['/', '/shop/', '/product/bpc-157-10mg/', '/bpc-157/', '/research/', '/about-us/', '/our-testing/',
  '/reconstitution-calculator/', '/rewards/', '/affiliate-program/', '/contact/', '/privacy-policy/', '/research-peptides-australia/', '/my-account/', '/cart/', '/nope/'];
const VPS = [{ n: 'd', width: 1440, height: 900 }, { n: 't', width: 820, height: 1100 }, { n: 'm', width: 390, height: 844, isMobile: true }];

const srv = await startServer();
const b = await chromium.launch({ channel: 'chrome' });
const report = [];
for (const vp of VPS) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.isMobile });
  const p = await ctx.newPage();
  for (const u of PAGES) {
    await p.goto(srv.base + u, { waitUntil: 'networkidle' });
    const issues = await p.evaluate(() => {
      const out = [];
      const vw = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth > vw + 1) out.push(`h-overflow ${document.documentElement.scrollWidth - vw}px`);
      // sections inside main that don't span the viewport
      for (const s of document.querySelectorAll('main section, main > div > div > section')) {
        const r = s.getBoundingClientRect();
        if (r.width && Math.abs(r.width - vw) > 2 && !s.closest('.legal-page, article')) out.push(`section not full-bleed: .${(s.className || '').split(' ')[0]} w=${Math.round(r.width)}`);
      }
      // containers not centred
      for (const c of document.querySelectorAll('main .wrap, main .container')) {
        const r = c.getBoundingClientRect();
        if (!r.width) continue;
        const l = r.left, rr = vw - r.right;
        if (Math.abs(l - rr) > 2) out.push(`container off-centre: .${(c.parentElement.className || '').split(' ')[0]} L${Math.round(l)} R${Math.round(rr)}`);
      }
      // text blocks running past the container on the right
      for (const el of document.querySelectorAll('main h1, main h2, main h3, main p, main table')) {
        const r = el.getBoundingClientRect();
        if (r.width && r.right > vw + 1 && !el.closest('.product-grid--rail, .hero-shelf, [class*=table-wrapper], .chips')) out.push(`text past edge: ${el.tagName} "${el.textContent.trim().slice(0, 30)}"`);
      }
      return [...new Set(out)];
    });
    if (issues.length) report.push(`[${vp.n}] ${u}\n   ` + issues.slice(0, 12).join('\n   '));
    await p.screenshot({ path: path.join(OUT, `${vp.n}${u.replace(/\//g, '_')}.png`), fullPage: true });
  }
  await ctx.close();
}
await b.close();
await srv.stop();
console.log(report.join('\n') || 'no geometry issues');
