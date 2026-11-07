'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Mark from './Mark';
import { useCart } from './CartProvider';

const NAV = [
  { href: '/shop/', label: 'Shop', match: (p) => p.startsWith('/shop') || p.startsWith('/product') },
  { href: '/research/', label: 'Research Library' },
  { href: '/our-testing/', label: 'Our Testing' },
  { href: '/reconstitution-calculator/', label: 'Calculator' },
  { href: '/rewards/', label: 'Rewards' },
];
const MOBILE_EXTRA = [
  { href: '/track-order/', label: 'Track Order' },
  { href: '/contact/', label: 'Contact Us' },
  { href: '/my-account/', label: 'Login / Signup' },
  { href: '/affiliate-program/', label: 'Affiliate Program' },
];

export default function Header({ brandName }) {
  const pathname = usePathname();
  const { cart, openDrawer, refresh, bump } = useCart();
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const countRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setNavOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle('nav-open', navOpen);
    if (navOpen && headerRef.current) {
      document.documentElement.style.setProperty('--header-bottom', `${headerRef.current.getBoundingClientRect().bottom}px`);
    }
    const onKey = (e) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  useEffect(() => {
    const el = countRef.current;
    if (!el || !bump) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }, [bump]);

  const current = (item) => (item.match ? item.match(pathname) : pathname === item.href);

  const onCartClick = async (e) => {
    if (pathname.startsWith('/cart') || pathname.startsWith('/checkout')) return;
    e.preventDefault();
    await refresh();
    openDrawer();
  };

  return (
    <>
      <div className="announce" role="region" aria-label="Store information">
        <div className="wrap announce__inner">
          <span>Free express shipping on orders over $200</span>
          <span className="announce__dot" aria-hidden="true" />
          <span>Same-day dispatch before 12pm</span>
          <span className="announce__dot" aria-hidden="true" />
          <span>10% off with bank transfer</span>
        </div>
      </div>
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}`} ref={headerRef}>
        <div className="wrap site-header__inner">
          <Link className="wordmark" href="/" aria-label={`${brandName} home`}>
            <Mark />
            <span className="wordmark__text">{brandName}</span>
          </Link>

          <nav className={`primary-nav${navOpen ? ' is-open' : ''}`} id="primary-nav" aria-label="Primary">
            <form className="header-search nav-search" action="/shop/" method="get" role="search">
              <label className="sr-only" htmlFor="nav-q">Search products</label>
              <input id="nav-q" name="q" type="search" placeholder="Search products" autoComplete="off" />
              <button type="submit" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </button>
            </form>
            <ul>
              {NAV.map((item) => (
                <li key={item.href}><Link href={item.href} aria-current={current(item) ? 'page' : undefined}>{item.label}</Link></li>
              ))}
              {MOBILE_EXTRA.map((item) => (
                <li key={item.href} className="primary-nav__mobile-only"><Link href={item.href}>{item.label}</Link></li>
              ))}
            </ul>
          </nav>

          <div className="header-tools">
            <form className="header-search" action="/shop/" method="get" role="search">
              <label className="sr-only" htmlFor="header-q">Search products</label>
              <input id="header-q" name="q" type="search" placeholder="Search products" autoComplete="off" />
              <button type="submit" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </button>
            </form>
            <Link className="tool-link hide-sm" href="/track-order/">Track order</Link>
            <Link className="tool-link hide-sm" href="/my-account/">Account</Link>
            <a className="cart-link" href="/cart/" onClick={onCartClick} aria-label={`Cart, ${cart.count} items`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></svg>
              <span className="cart-link__count" data-cart-count data-zero={cart.count === 0} ref={countRef}>{cart.count}</span>
            </a>
            <button className="nav-toggle" type="button" aria-controls="primary-nav" aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)} data-nav-toggle>
              <span className="sr-only">Menu</span><span className="nav-toggle__bars" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
