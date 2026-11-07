import { brand } from '@/lib/config';
import { pages, categories, products } from '@/lib/catalog';

const NOINDEX = new Set(['home', 'my-account', 'affiliate-area']);

export default function sitemap() {
  const paths = [
    '/', '/shop/',
    ...pages.filter((p) => !NOINDEX.has(p.slug)).map((p) => `/${p.slug}/`),
    ...categories.map((c) => `/product-category/${c.slug}/`),
    ...products.map((p) => `/product/${p.slug}/`),
  ];
  return paths.map((p) => ({ url: brand.siteUrl + p }));
}
