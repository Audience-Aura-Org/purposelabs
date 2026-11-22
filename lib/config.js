import path from 'node:path';

const env = process.env;

export const brand = {
  name: env.BRAND_NAME || 'Purpose Labs',
  legalName: 'PurposeLabs',
  tagline: 'Research Peptides Australia',
  location: 'Double Bay NSW 2028',
  siteUrl: (env.SITE_URL || 'https://centralpurposelab.com').replace(/\/$/, ''),
  researchNotice: 'For research purposes only. Not for human or animal consumption.',
};

// Rules from the published Shipping Policy.
export const shipping = {
  methods: {
    express: { id: 'express', label: 'Express Shipping', cost: 1500, eta: '1-3 business days' },
    standard: { id: 'standard', label: 'Standard Shipping', cost: 1000, eta: '3-7 business days' },
  },
  freeExpressThreshold: 20000, // cents
};

export const AU_STATES = ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'];

export const payments = {
  bankTransferDiscount: 0.1,
  bank: {
    accountName: env.BANK_ACCOUNT_NAME || '',
    bsb: env.BANK_BSB || '',
    accountNumber: env.BANK_ACCOUNT_NUMBER || '',
  },
};

// Email: Titan (titan.email) SMTP by default.
// Titan only accepts mail whose From address is the authenticated mailbox,
// so MAIL_FROM defaults to SMTP_USER. Port 465 = SSL, 587 = STARTTLS.
const smtpPort = Number(env.SMTP_PORT) || 465;
export const mail = {
  host: env.SMTP_USER ? (env.SMTP_HOST || 'smtp.titan.email') : (env.SMTP_HOST || ''),
  port: smtpPort,
  secure: env.SMTP_SECURE ? env.SMTP_SECURE === 'true' : smtpPort === 465,
  user: env.SMTP_USER || '',
  pass: env.SMTP_PASS || '',
  fromName: env.MAIL_FROM_NAME || 'Purpose Labs',
  get from() {
    if (env.MAIL_FROM) return env.MAIL_FROM;
    return `"${this.fromName}" <${this.user || 'no-reply@purposelabsau.com'}>`;
  },
  storeEmail: env.STORE_EMAIL || env.SMTP_USER || '',
};

export function cookieSecret() {
  const s = env.COOKIE_SECRET;
  if (!s && env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('COOKIE_SECRET must be set in production');
  }
  return s || 'dev-only-change-me';
}

export const dataDir = () => env.DATA_DIR || path.join(process.cwd(), 'data');
