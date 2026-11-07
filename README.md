# Purpose Labs — Next.js site

Next.js 16 (App Router) rebuild of purposelabsau.com. All copy, products,
prices and policies come from the original WordPress site unchanged; the
frontend and design system are new.

## Run

```bash
npm install
cp .env.example .env.local   # fill in values
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

See `.env.example` for all settings: cookie secret, bank details, SMTP (Nodemailer), store email.

## How it fits together

| Path | What |
| --- | --- |
| `app/` | routes: home, `[slug]` content pages, shop, categories, products, cart, checkout, order received, track order |
| `app/api/*` | route handlers for cart (add/update/remove/summary), contact, track order, account notice |
| `app/checkout/actions.js` | checkout Server Action: validates, saves the order, emails after the response (`after()`) |
| `lib/` | catalog, pricing rules, signed-cookie cart, JSON order store, Nodemailer + email templates |
| `components/` | header, footer, cart drawer, enhancer for the original page markup, calculator |
| `content/*.json` | content extracted from the old site (`npm run extract` regenerates it) |
| `_original-mirror/` | the HTTrack copy of the old site, kept only as the extraction source |

Content and product pages are statically generated; the cart badge/drawer load
client-side from `/api/cart/`, so pages stay cacheable. All forms work without
JavaScript.

## Store rules (from the published policies)

- Standard $10, Express $15, free Express from $200; no Express to PO Boxes; Australia only
- Bank transfer: 10% off products; prices include GST

## Email (Titan webmail)

Sent with Nodemailer through Titan SMTP (`smtp.titan.email`, port 465 SSL).

- Customer: order confirmation (HTML + text) with bank transfer details
- Store (`STORE_EMAIL`, defaults to the Titan mailbox): new-order notification and contact-form messages (reply goes straight to the customer)

Setup:
1. In Titan, create the mailbox the site will send from (e.g. `orders@purposelabsau.com`).
2. In `.env.local` set `SMTP_USER` to that full address and `SMTP_PASS` to its password (other values are pre-filled in `.env.example`).
3. Run `npm run mail:test` (or `npm run mail:test -- you@example.com`): it checks the login and sends a test email.

Titan only sends "from" the mailbox you log in with, so the From address is that mailbox (display name `MAIL_FROM_NAME`).
If port 465 is blocked by your host, use `SMTP_PORT=587` and `SMTP_SECURE=false` (STARTTLS).
Without SMTP credentials, emails are printed to the console instead of sent.

## Tests

```bash
npm run build
npm test           # unit + HTTP tests against `next start` (pages, link crawl, cart, contact, tracking, emails)
npm run test:e2e   # real Chrome, desktop + mobile: full purchase flow, drawer, calculator, emails
```
