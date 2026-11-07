import Link from 'next/link';

export const metadata = { title: 'Page not found | Purpose Labs', robots: { index: false } };

export default function NotFound() {
  return (
    <section className="flow">
      <div className="wrap wrap--narrow empty empty--page">
        <p className="eyebrow mono">404</p>
        <h1 className="display">Page not found</h1>
        <p className="lead">The page you were looking for doesn’t exist or has moved.</p>
        <form className="header-search header-search--lg" action="/shop/" method="get" role="search">
          <label className="sr-only" htmlFor="nf-q">Search products</label>
          <input id="nf-q" name="q" type="search" placeholder="Search products" />
          <button type="submit" className="btn btn--ink btn--sm">Search</button>
        </form>
        <p><Link className="btn btn--signal" href="/shop/">Go to shop</Link></p>
      </div>
    </section>
  );
}
