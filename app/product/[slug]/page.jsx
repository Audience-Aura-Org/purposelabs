import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { products, getProduct, getCategory, productsFor, money, large } from '@/lib/catalog';
import { gridHtml } from '@/lib/cards';
import { buildMetadata, productLd, breadcrumbLd } from '@/lib/seo';
import JsonLd from '@/components/JsonLd';
import AddedNotice from './AddedNotice';

export const dynamicParams = false;
export const generateStaticParams = () => products.map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return buildMetadata({
    title: p.metaTitle || `${p.name} | Purpose Labs Australia`,
    description: p.metaDescription || p.summary,
    path: `/product/${slug}/`,
    image: { url: large(p.image), width: 600, height: 600, alt: p.imageAlt },
  });
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const cats = p.categories.map(getCategory).filter(Boolean);
  const related = productsFor(p.related).slice(0, 4);
  const crumbs = [['Shop', '/shop/'], ...(cats[0] ? [[cats[0].name, `/product-category/${cats[0].slug}/`]] : []), [p.name, `/product/${p.slug}/`]];
  const jsonLd = [productLd(p, cats[0]?.name), breadcrumbLd(crumbs)];

  return (
    <>
      <section className="pdp">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/shop/">Shop</Link>
            {cats[0] && <><span aria-hidden="true">/</span><Link href={`/product-category/${cats[0].slug}/`}>{cats[0].name}</Link></>}
          </nav>

          <Suspense fallback={null}><AddedNotice name={p.name} /></Suspense>

          <div className="pdp__grid">
            <div className="pdp__gallery">
              <div className="pdp__frame">
                <Image src={large(p.gallery[0] || p.image)} alt={p.imageAlt} width={600} height={600} priority sizes="(max-width: 860px) 100vw, 600px" />
              </div>
              <dl className="spec-strip">
                <div><dt>SKU</dt><dd>{p.sku}</dd></div>
                <div><dt>Form</dt><dd>Lyophilised</dd></div>
                <div><dt>Use</dt><dd>RUO</dd></div>
              </dl>
            </div>

            <div className="pdp__summary">
              {cats.length > 0 && <p className="eyebrow">{cats.map((c) => c.name).join(' · ')}</p>}
              <h1 className="display pdp__title">{p.name}</h1>

              <div className="pdp__price">
                <div className="price-block">
                  <span className="price-block__label">Card</span>
                  <span className="price-block__amt">{money(p.price)}</span>
                </div>
                {p.bankPrice && (
                  <div className="price-block price-block--signal">
                    <span className="price-block__label">Bank transfer</span>
                    <span className="price-block__amt">{money(p.bankPrice)}</span>
                    <span className="price-block__note">10% off</span>
                  </div>
                )}
                <span className="pdp__gst">inc. GST</span>
              </div>

              <div className="prose pdp__short" dangerouslySetInnerHTML={{ __html: p.shortHtml }} />

              {p.inStock ? (
                <>
                  <form className="pdp__buy" action="/api/cart/add/" method="post" data-add-to-cart>
                    <input type="hidden" name="product" value={p.slug} />
                    <div className="qty" data-qty>
                      <button type="button" className="qty__btn" data-step="-1" aria-label="Decrease quantity">−</button>
                      <label className="sr-only" htmlFor="qty">Quantity</label>
                      <input id="qty" name="qty" type="number" inputMode="numeric" min="1" max={p.stock || 99} defaultValue="1" />
                      <button type="button" className="qty__btn" data-step="1" aria-label="Increase quantity">+</button>
                    </div>
                    <button className="btn btn--signal btn--lg" type="submit">Add to Cart<span className="pdp__buy-price" aria-hidden="true"> · {money(p.price)}</span></button>
                  </form>
                  {p.stock && p.stock <= 10
                    ? <p className="stock stock--low">Only {p.stock} left in stock</p>
                    : <p className="stock">In stock · ships from Sydney</p>}
                </>
              ) : (
                <>
                  <p className="stock stock--out">Out of stock</p>
                  <Link className="btn btn--ghost" href="/contact/">Ask about restock</Link>
                </>
              )}

              {p.faqHtml && <div className="pdp__faq" dangerouslySetInnerHTML={{ __html: p.faqHtml }} />}
            </div>
          </div>
        </div>
      </section>

      {p.descriptionHtml && (
        <section className="pdp-desc content">
          <div className="wrap pdp-desc__inner">
            <h2 className="section-label">Description</h2>
            <div className="prose" dangerouslySetInnerHTML={{ __html: p.descriptionHtml }} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="related">
          <div className="wrap">
            <h2 className="h2">Related products</h2>
            <div dangerouslySetInnerHTML={{ __html: gridHtml(related, 'product-grid product-grid--4') }} />
          </div>
        </section>
      )}

      <JsonLd data={jsonLd} />
    </>
  );
}
