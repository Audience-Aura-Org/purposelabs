import fs from 'node:fs';
import path from 'node:path';

const load = (f) => JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', f), 'utf8'));

export const products = load('products.json');
export const categories = load('categories.json');
export const shop = load('shop.json');
export const pages = load('pages.json');

const bySlug = new Map(products.map((p) => [p.slug, p]));
const catBySlug = new Map(categories.map((c) => [c.slug, c]));
const pageBySlug = new Map(pages.map((p) => [p.slug, p]));

export const getProduct = (slug) => bySlug.get(slug) || null;
export const getCategory = (slug) => catBySlug.get(slug) || null;
export const getPage = (slug) => pageBySlug.get(slug) || null;
export const productsFor = (slugs) => slugs.map(getProduct).filter(Boolean);
export const shopProducts = () => productsFor(shop.order);

export const filterCategories = () =>
  categories.filter((c) => c.slug !== 'peptides' && c.products.length).sort((a, b) => a.name.localeCompare(b.name));

export function searchProducts(q) {
  const terms = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return shopProducts();
  return shopProducts().filter((p) => {
    const hay = `${p.name} ${p.sku} ${p.summary}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

export function sortProducts(list, sort) {
  const l = [...list];
  if (sort === 'price') l.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') l.sort((a, b) => b.price - a.price);
  else if (sort === 'name') l.sort((a, b) => a.name.localeCompare(b.name));
  return l;
}

export { money, thumb, large } from './format.js';
