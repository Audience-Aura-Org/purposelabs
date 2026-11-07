import { brand } from '@/lib/config';
import { pages, categories, products } from '@/lib/catalog';
import { large } from '@/lib/format';

const NOINDEX = new Set(['home', 'my-account', 'affiliate-area']);
const isGuide = (p) => /peptide-info-page/.test(p.mainClass);

export default function sitemap() {
  const now = new Date();
  const u = (path) => brand.siteUrl + path;
  return [
    { url: u('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: u('/shop/'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({ url: u(`/product-category/${c.slug}/`), lastModified: now, changeFrequency: 'weekly', priority: 0.8 })),
    ...products.map((p) => ({
      url: u(`/product/${p.slug}/`), lastModified: now, changeFrequency: 'weekly', priority: p.inStock ? 0.8 : 0.5,
      images: [u(large(p.image))],
    })),
    ...pages.filter((p) => !NOINDEX.has(p.slug)).map((p) => ({
      url: u(`/${p.slug}/`), lastModified: now,
      changeFrequency: isGuide(p) ? 'monthly' : 'yearly',
      priority: isGuide(p) || p.slug === 'research' ? 0.7 : 0.4,
    })),
  ];
}
