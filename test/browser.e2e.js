// End-to-end check in a real browser (uses the locally installed Chrome).
//   npm run test:e2e            (SHOTS=dir to also save screenshots)
// Requires `npm run build` first.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { startServer } from './server.js';

const srv = await startServer();
const base = srv.base;
const shots = process.env.SHOTS;
if (shots) fs.mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome' });
const results = [];
const step = async (name, fn) => {
  try { await fn(); results.push(`✔ ${name}`); } catch (e) { results.push(`✖ ${name}\n    ${e.message.split('\n')[0]}`); process.exitCode = 1; }
};

try {
  for (const vp of [{ name: 'desktop', width: 1366, height: 900 }, { name: 'mobile', width: 390, height: 844, isMobile: true }]) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.isMobile });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|status of 422/.test(m.text())) errors.push(m.text()); });
    // On mobile, overflow zooms the page out instead of scrolling, so check both.
    const assertFits = async (u) => {
      const m = await page.evaluate(() => ({ iw: window.innerWidth, sw: document.documentElement.scrollWidth }));
      assert.ok(m.iw === vp.width && m.sw <= vp.width + 1, `${u}: layout ${m.iw}px / scroll ${m.sw}px on a ${vp.width}px screen`);
    };
    const shot = async (n) => shots && page.screenshot({ path: path.join(shots, `${vp.name}-${n}.png`), fullPage: n.endsWith('full') });

    await step(`[${vp.name}] home renders, no horizontal scroll`, async () => {
      await page.goto(base + '/');
      await page.waitForLoadState('networkidle').catch(() => {});
      await assertFits("/");
      assert.equal(await page.locator('.pcard').count() > 10, true);
      await shot('home');
      await shot('home-full');
    });

    if (vp.isMobile) {
      await step('[mobile] nav menu opens and closes', async () => {
        await page.click('[data-nav-toggle]');
        await page.locator('#primary-nav.is-open').waitFor();
        assert.ok(await page.locator('#primary-nav a[href="/track-order/"]').isVisible());
        await shot('nav');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('#primary-nav').classList.contains('is-open'));
      });
    }

    await step(`[${vp.name}] shop filter + sort`, async () => {
      await page.goto(base + '/shop/');
      await page.click('.chip[href="/product-category/healing-peptides/"]');
      await page.waitForURL('**/product-category/healing-peptides/');
      await page.selectOption('#sort', 'price-desc');
      await page.waitForURL(/sort=price-desc/);
      const prices = await page.$$eval('.pcard__now', (els) => els.map((e) => Number(e.textContent.replace(/[^0-9.]/g, ''))));
      assert.deepEqual(prices, [...prices].sort((a, b) => b - a));
      await shot('category');
    });

    await step(`[${vp.name}] add to cart opens drawer and updates badge`, async () => {
      await page.goto(base + '/product/bpc-157-10mg/');
      await shot('product');
      await page.click('.pdp__buy [data-step="1"]');
      assert.equal(await page.inputValue('#qty'), '2');
      await page.click('.pdp__buy button[type=submit]');
      await page.locator('[data-drawer].is-open').waitFor();
      await page.waitForTimeout(400);
      assert.equal((await page.textContent('[data-cart-count]')).trim(), '2');
      assert.match(await page.textContent('[data-drawer-subtotal]'), /\$159\.98/);
      await shot('drawer');
      await page.click('.drawer__head [data-drawer-close]');
      await page.locator('[data-drawer]').waitFor({ state: 'hidden' });
    });

    await step(`[${vp.name}] add from a product card on home`, async () => {
      await page.goto(base + '/');
      await page.locator('.pcard', { hasText: 'TB-500 10mg' }).first().locator('button').click();
      await page.locator('[data-drawer].is-open').waitFor();
      assert.equal((await page.textContent('[data-cart-count]')).trim(), '3');
    });

    await step(`[${vp.name}] cart qty stepper auto-updates totals`, async () => {
      await page.goto(base + '/cart/');
      await shot('cart');
      await page.waitForLoadState('networkidle'); // let React hydrate before interacting
      const line = page.locator('.line', { hasText: 'TB-500 10mg' });
      await line.locator('[data-step="1"]').click();
      await page.waitForFunction(() => [...document.querySelectorAll('.line')].some((l) => l.textContent.includes('TB-500') && l.textContent.includes('$199.98')), null, { timeout: 15000 });
      assert.match(await page.textContent('.summary'), /qualifies for free express shipping/);
    });

    await step(`[${vp.name}] checkout: validation, live shipping totals, order placed`, async () => {
      await page.goto(base + '/checkout/');
      // subtotal 2×79.99 + 2×99.99 = 359.96 ; discount 36.00 ; free express → 323.96
      assert.match(await page.textContent('[data-grand]'), /\$323\.96/);
      await page.check('input[name=shipping_method][value=standard]');
      assert.match(await page.textContent('[data-grand]'), /\$333\.96/);
      await page.click('.checkout button[type=submit]');
      await page.locator('.notice--error').waitFor();
      await shot('checkout-errors');
      await page.fill('#email', 'e2e@example.com');
      await page.fill('#phone', '0400 000 000');
      await page.fill('#first_name', 'Jordan');
      await page.fill('#last_name', 'Ng');
      await page.fill('#address_1', '10 Bay St');
      await page.fill('#city', 'Double Bay');
      await page.selectOption('#state', 'NSW');
      await page.fill('#postcode', '2028');
      await page.check('input[name=terms]');
      await shot('checkout');
      await Promise.all([page.waitForURL(/order-received/), page.click('.checkout button[type=submit]')]);
      assert.match(await page.textContent('.receipt'), /Thank you, Jordan/);
      assert.match(await page.textContent('.receipt'), /\$333\.96/);
      await page.waitForFunction(() => document.querySelector('[data-cart-count]')?.textContent.trim() === '0');
      await shot('order');
    });

    await step(`[${vp.name}] order emails sent to customer and store`, async () => {
      let mails = [];
      for (let i = 0; i < 20 && mails.length < 2; i++) {
        mails = srv.outbox().filter((m) => /order #\d+|New order/.test(m.subject) && /e2e@example\.com/.test(`${m.to} ${m.replyTo}`));
        await page.waitForTimeout(150);
      }
      const customer = mails.find((m) => m.to.includes('e2e@example.com'));
      const store = mails.find((m) => m.to === 'orders@store.test');
      assert.ok(customer, 'customer confirmation email');
      assert.match(customer.html, /Thank you, Jordan/);
      assert.match(customer.html, /\$333\.96/);
      assert.ok(store, 'store notification email');
      assert.match(store.text, /10 Bay St/);
      fs.writeFileSync(path.join(srv.dataDir, 'outbox.jsonl'), ''); // reset for next viewport
      if (shots) fs.writeFileSync(path.join(shots, `${vp.name}-email.html`), customer.html);
    });

    await step(`[${vp.name}] calculator computes 10mg / 2ml / 250mcg = 5 units`, async () => {
      await page.goto(base + '/reconstitution-calculator/');
      assert.equal((await page.textContent('#result-units')).trim(), '5');
      assert.equal((await page.textContent('#concentration')).trim(), '5000');
      await page.click('[data-input="dosage"] .calc-btn[data-value="custom"]');
      await page.fill('#dosage-custom', '3000');
      assert.ok(await page.locator('#result-warning').isVisible(), 'warning shows when dose exceeds syringe');
      await page.click('[data-input="dosage"] .calc-btn[data-value="500"]');
      assert.equal((await page.textContent('#result-units')).trim(), '10');
      await shot('calculator');
    });

    await step(`[${vp.name}] contact topic hint toggles`, async () => {
      await page.goto(base + '/contact/');
      await page.selectOption('#pl-contact-topic', 'shipping');
      assert.ok(await page.locator('#pl-tracking-hint').isVisible());
      await shot('contact');
    });

    await step(`[${vp.name}] guide + legal pages render without overflow`, async () => {
      for (const u of ['/bpc-157/', '/about-us/', '/research/', '/rewards/', '/affiliate-program/', '/privacy-policy/', '/our-testing/', '/my-account/']) {
        await page.goto(base + u);
        await assertFits(u);
        await shot(u.replace(/\//g, '') + '-full');
      }
    });

    await step(`[${vp.name}] no JS errors`, async () => assert.deepEqual(errors, [], errors.join(" | ")));
    await ctx.close();
  }
} finally {
  await browser.close();
  await srv.stop();
  console.log(results.join('\n'));
}
