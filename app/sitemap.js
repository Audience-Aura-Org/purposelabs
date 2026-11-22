import { brand } from '@/lib/config';
import { pages, categories, products } from '@/lib/catalog';
import { large } from '@/lib/format';

const NOINDEX = new Set(['home', 'my-account', 'affiliate-area']);
const isGuide = (p) => /peptide-info-page/.test(p.mainClass);

// No <lastmod>: the content files carry no per-item modification dates, and the
// build timestamp would mark every URL as changed on every deploy, which teaches
// Google to ignore lastmod. Add `lastModified` per entry only from a real date.
export default function sitemap() {
  const u = (path) => brand.siteUrl + path;
  return [
    { url: u('/'), changeFrequency: 'weekly', priority: 1 },
    { url: u('/shop/'), changeFrequency: 'daily', priority: 0.9 },
    ...categories.map((c) => ({ url: u(`/product-category/${c.slug}/`), changeFrequency: 'weekly', priority: 0.8 })),
    ...products.map((p) => ({
      url: u(`/product/${p.slug}/`), changeFrequency: 'weekly', priority: p.inStock ? 0.8 : 0.5,
      images: [u(large(p.image))],
    })),
    ...pages.filter((p) => !NOINDEX.has(p.slug)).map((p) => ({
      url: u(`/${p.slug}/`),
      changeFrequency: isGuide(p) ? 'monthly' : 'yearly',
      priority: isGuide(p) || p.slug === 'research' ? 0.7 : 0.4,
    })),
  ];
}
