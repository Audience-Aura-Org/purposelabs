import { shop, searchProducts, sortProducts } from '@/lib/catalog';
import ShopListing from '@/components/ShopListing';

export async function generateMetadata({ searchParams }) {
  const { q } = await searchParams;
  return {
    title: shop.title,
    description: shop.description,
    alternates: { canonical: '/shop/' },
    robots: q ? { index: false } : undefined,
  };
}

export default async function ShopPage({ searchParams }) {
  const sp = await searchParams;
  const q = String(sp.q || '').trim().slice(0, 100);
  const sort = String(sp.sort || '').slice(0, 20);
  return (
    <ShopListing
      heading={q ? `Results for “${q}”` : 'Shop all peptides'}
      intro={shop.introHtml}
      outro={shop.outroHtml}
      products={sortProducts(searchProducts(q), sort)}
      q={q}
      sort={sort}
    />
  );
}
