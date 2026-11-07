import { shop, searchProducts, sortProducts } from '@/lib/catalog';
import { buildMetadata, breadcrumbLd, itemListLd } from '@/lib/seo';
import ShopListing from '@/components/ShopListing';
import JsonLd from '@/components/JsonLd';

export async function generateMetadata({ searchParams }) {
  const { q, sort } = await searchParams;
  // Search results and re-sorted views are not separate pages for Google.
  return buildMetadata({ title: shop.title, description: shop.description, path: '/shop/', noindex: Boolean(q || sort) });
}

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || '').trim().slice(0, 100);
  const sort = String(sp.sort || '').slice(0, 20);
  const products = sortProducts(searchProducts(q), sort);
  return (
    <>
      <ShopListing
        heading={q ? `Results for “${q}”` : 'Shop all peptides'}
        intro={shop.introHtml}
        outro={shop.outroHtml}
        products={products}
        q={q}
        sort={sort}
      />
      {!q && <JsonLd data={[breadcrumbLd([['Shop', '/shop/']]), itemListLd(products, 'Research peptides')]} />}
    </>
  );
}
