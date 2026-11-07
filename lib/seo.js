// SEO: one metadata builder for every route + schema.org JSON-LD helpers.
// Visible page copy is never changed here; only <head> metadata.
import { brand, shipping } from './config.js';
import { large } from './format.js';

const abs = (p) => (p?.startsWith('http') ? p : brand.siteUrl + p);
const clip = (s, n) => {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : `${t.slice(0, n - 1).replace(/\s+\S*$/, '')}…`;
};

export const DEFAULT_OG = '/opengraph-image/'; // trailing slash: no redirect for crawlers

/**
 * Next.js Metadata for a route.
 * @param {{title:string, description?:string, path:string, image?:string|{url,width,height,alt}, type?:string, noindex?:boolean}} o
 */
export function buildMetadata({ title, description = '', path, image, type = 'website', noindex = false }) {
  const desc = clip(description, 160);
  const img = typeof image === 'string' ? { url: image } : image;
  const images = [img || { url: DEFAULT_OG, width: 1200, height: 630, alt: brand.name }];
  return {
    title,
    description: desc || undefined,
    alternates: { canonical: path, languages: { 'en-AU': path } },
    openGraph: { type, url: path, title, description: desc || undefined, siteName: brand.name, locale: 'en_AU', images },
    twitter: { card: 'summary_large_image', title, description: desc || undefined, images: images.map((i) => i.url) },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  };
}

// ---- metadata the old site was missing (titles/descriptions only) ----

const CATEGORY_TITLES = {
  peptides: 'Research Peptides Range | Purpose Labs Australia',
};

export function categoryMeta(c, productNames) {
  const title = CATEGORY_TITLES[c.slug] || `Buy ${c.name} Australia | Purpose Labs`;
  const list = productNames.slice(0, 4).join(', ');
  const description = c.description
    || `Shop ${c.name.toLowerCase()} for laboratory research in Australia${list ? `: ${list}` : ''}. University-verified ≥99% purity, same-day Sydney dispatch.`;
  return { title, description };
}

export const PAGE_OVERRIDES = {
  rewards: {
    title: 'Rewards Program – Earn 5% Back | Purpose Labs',
    description: 'Earn 5 points for every $1 you spend and turn 1,000 points into $10 off your next order. Free to join, nothing to keep track of.',
  },
  'affiliate-program': {
    title: 'Affiliate Program – Earn 20% Commission | Purpose Labs',
    description: 'Earn 20% on every successful referral. Partner with an Australian research-peptide supplier built around verified testing, clear product information and dependable support.',
  },
  'my-account': { title: 'My Account | Purpose Labs', description: 'Sign in to your Purpose Labs account.' },
  'affiliate-area': { title: 'Affiliate Area | Purpose Labs', description: 'Purpose Partner Program affiliate area.' },
};

export function pageMeta(page) {
  const o = PAGE_OVERRIDES[page.slug] || {};
  return { title: o.title || page.title, description: page.description || o.description || '' };
}

// ---- JSON-LD ----

export const organizationLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${brand.siteUrl}/#organization`,
  name: 'Purpose Labs Australia',
  alternateName: [brand.name, brand.legalName],
  url: `${brand.siteUrl}/`,
  logo: { '@type': 'ImageObject', url: abs('/brand-logo.png'), width: 512, height: 512 },
  address: { '@type': 'PostalAddress', addressLocality: 'Double Bay', addressRegion: 'NSW', postalCode: '2028', addressCountry: 'AU' },
  areaServed: { '@type': 'Country', name: 'Australia' },
});

export const websiteLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${brand.siteUrl}/#website`,
  name: 'Purpose Labs Australia',
  alternateName: brand.name,
  url: `${brand.siteUrl}/`,
  inLanguage: 'en-AU',
  publisher: { '@id': `${brand.siteUrl}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${brand.siteUrl}/shop/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

/** items: [[name, path], ...] — Home is added automatically. */
export const breadcrumbLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [['Home', '/'], ...items].map(([name, path], i) => ({
    '@type': 'ListItem', position: i + 1, name, item: abs(path),
  })),
});

const priceValidUntil = () => `${new Date().getFullYear() + 1}-12-31`;

const shippingDetails = () => [
  ['Express Shipping', shipping.methods.express.cost, 1, 3],
  ['Standard Shipping', shipping.methods.standard.cost, 3, 7],
].map(([name, cost, min, max]) => ({
  '@type': 'OfferShippingDetails',
  name,
  shippingRate: { '@type': 'MonetaryAmount', value: (cost / 100).toFixed(2), currency: 'AUD' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'AU' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: min, maxValue: max, unitCode: 'DAY' },
  },
}));

export const productLd = (p, categoryName) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  '@id': `${brand.siteUrl}/product/${p.slug}/#product`,
  name: p.name,
  sku: p.sku,
  mpn: p.sku,
  description: p.summary,
  image: [abs(large(p.image))],
  url: `${brand.siteUrl}/product/${p.slug}/`,
  brand: { '@type': 'Brand', name: 'Purpose Labs' },
  ...(categoryName ? { category: categoryName } : {}),
  offers: {
    '@type': 'Offer',
    url: `${brand.siteUrl}/product/${p.slug}/`,
    price: (p.price / 100).toFixed(2),
    priceCurrency: 'AUD',
    priceValidUntil: priceValidUntil(),
    itemCondition: 'https://schema.org/NewCondition',
    availability: p.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    seller: { '@id': `${brand.siteUrl}/#organization` },
    shippingDetails: shippingDetails(),
  },
});

export const itemListLd = (products, name) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name,
  numberOfItems: products.length,
  itemListElement: products.map((p, i) => ({
    '@type': 'ListItem', position: i + 1, url: `${brand.siteUrl}/product/${p.slug}/`, name: p.name,
  })),
});

export const articleLd = (page) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: clip((page.title || '').split('|')[0], 110),
  description: page.description,
  url: `${brand.siteUrl}/${page.slug}/`,
  mainEntityOfPage: `${brand.siteUrl}/${page.slug}/`,
  inLanguage: 'en-AU',
  author: { '@id': `${brand.siteUrl}/#organization` },
  publisher: { '@id': `${brand.siteUrl}/#organization` },
});
