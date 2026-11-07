import { notFound } from 'next/navigation';
import { categories, getCategory, productsFor, sortProducts } from '@/lib/catalog';
import ShopListing from '@/components/ShopListing';

export const dynamicParams = false;
export const generateStaticParams = () => categories.map((c) => ({ slug: c.slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = getCategory(slug);
  return c ? { title: c.title, description: c.description, alternates: { canonical: `/product-category/${slug}/` } } : {};
}

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const { sort = '' } = await searchParams;
  const c = getCategory(slug);
  if (!c) notFound();
  return (
    <ShopListing
      heading={c.name}
      intro={c.descriptionHtml}
      outro={c.afterHtml}
      products={sortProducts(productsFor(c.products), String(sort).slice(0, 20))}
      sort={String(sort)}
      activeCategory={c.slug}
    />
  );
}
