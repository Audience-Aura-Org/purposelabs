import Link from 'next/link';
import { filterCategories } from '@/lib/catalog';
import { gridHtml } from '@/lib/cards';

export default function ShopListing({ heading, intro, outro, products, q = '', sort = '', activeCategory = null }) {
  const filters = filterCategories();
  return (
    <>
      <section className="shop-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span>
            {activeCategory
              ? <><Link href="/shop/">Shop</Link><span aria-hidden="true">/</span><span aria-current="page">{heading}</span></>
              : <span aria-current="page">Shop</span>}
          </nav>
          <h1 className="display">{heading}</h1>
          {intro ? <div className="prose shop-head__intro" dangerouslySetInnerHTML={{ __html: intro }} /> : null}
        </div>
      </section>

      <section className="shop-body">
        <div className="wrap">
          <div className="shop-bar">
            <nav className="chips" aria-label="Categories">
              <Link className="chip" href="/shop/" aria-current={!activeCategory ? 'page' : undefined}>All</Link>
              {filters.map((c) => (
                <Link key={c.slug} className="chip" href={`/product-category/${c.slug}/`} aria-current={activeCategory === c.slug ? 'page' : undefined}>{c.name}</Link>
              ))}
            </nav>
            <form className="sort" method="get" data-autosubmit>
              {q ? <input type="hidden" name="q" value={q} /> : null}
              <label htmlFor="sort">Sort</label>
              <select id="sort" name="sort" defaultValue={sort}>
                <option value="">Featured</option>
                <option value="price">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name A–Z</option>
              </select>
              <noscript><button className="btn btn--sm btn--ghost" type="submit">Apply</button></noscript>
            </form>
          </div>
          <p className="shop-count" role="status">{products.length} {products.length === 1 ? 'product' : 'products'}</p>
          {products.length
            ? <div dangerouslySetInnerHTML={{ __html: gridHtml(products) }} />
            : (
              <div className="empty">
                <p>No products match “{q}”.</p>
                <Link className="btn btn--ink" href="/shop/">Browse all products</Link>
              </div>
            )}
        </div>
      </section>
      {outro ? <section className="shop-outro"><div className="wrap prose" dangerouslySetInnerHTML={{ __html: outro }} /></section> : null}
    </>
  );
}
