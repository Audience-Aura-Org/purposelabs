import { notFound } from 'next/navigation';
import { categories, getCategory, productsFor, sortProducts } from '@/lib/catalog';
import { buildMetadata, categoryMeta, breadcrumbLd, itemListLd } from '@/lib/seo';
import ShopListing from '@/components/ShopListing';
import JsonLd from '@/components/JsonLd';

export const dynamicParams = false;
export const generateStaticParams = () => categories.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params, searchParams }) {
  const { slug } = await params;
  const { sort } = await searchParams;
  const c = getCategory(slug);
  if (!c) return {};
  const m = categoryMeta(c, productsFor(c.products).map((p) => p.name));
  return buildMetadata({ ...m, path: `/product-category/${slug}/`, noindex: Boolean(sort) });
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const { sort = '' } = await searchParams;
  const c = getCategory(slug);
  if (!c) notFound();
  const products = sortProducts(productsFor(c.products), String(sort).slice(0, 20));
  return (
    <>
      <ShopListing
        heading={c.name}
        intro={c.descriptionHtml}
        outro={c.afterHtml}
        products={products}
        sort={String(sort)}
        activeCategory={c.slug}
      />
      <JsonLd data={[breadcrumbLd([['Shop', '/shop/'], [c.name, `/product-category/${c.slug}/`]]), itemListLd(products, c.name)]} />
    </>
  );
}
