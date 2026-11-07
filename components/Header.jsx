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
const ICON = {
  truck: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  share: <><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>,
};
const MOBILE_EXTRA = [
  { href: '/track-order/', label: 'Track Order', icon: 'truck' },
  { href: '/contact/', label: 'Contact Us', icon: 'chat' },
  { href: '/my-account/', label: 'Login / Signup', icon: 'user' },
  { href: '/affiliate-program/', label: 'Affiliate Program', icon: 'share' },
];

export default function Header({ brandName }) {
  const pathname = usePathname();
  const { cart, openDrawer, refresh, bump } = useCart();
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef(null);
  const countRef = useRef(null);
  const navRef = useRef(null);
  const toggleRef = useRef(null);

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
    if (!navOpen) return undefined;
    // Move focus into the panel (not the search box: that would pop the keyboard).
    navRef.current?.querySelector('ul a')?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') { setNavOpen(false); toggleRef.current?.focus(); return; }
      if (e.key !== 'Tab') return;
      // Keep keyboard focus inside the open menu (+ its toggle button).
      const items = [toggleRef.current, ...navRef.current.querySelectorAll('a, button, input')].filter((el) => el && el.offsetParent !== null);
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
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
      <header className={`site-header${scrolled ? ' is-scrolled' : ''}${navOpen ? ' is-menu-open' : ''}`} ref={headerRef}>
        <div className="wrap site-header__inner">
          <Link className="wordmark" href="/" aria-label={`${brandName} home`}>
            <Mark />
            <span className="wordmark__text">{brandName}</span>
          </Link>

          <nav className={`primary-nav${navOpen ? ' is-open' : ''}`} id="primary-nav" aria-label="Primary" ref={navRef}>
            <form className="header-search nav-search" action="/shop/" method="get" role="search">
              <label className="sr-only" htmlFor="nav-q">Search products</label>
              <input id="nav-q" name="q" type="search" placeholder="Search products" autoComplete="off" />
              <button type="submit" aria-label="Search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              </button>
            </form>
            <ul>
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} aria-current={current(item) ? 'page' : undefined}>
                    {item.label}
                    <svg className="nav-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="nav-panel__more primary-nav__mobile-only">
              <p className="nav-panel__label">Help &amp; account</p>
              <div className="nav-tiles">
                {MOBILE_EXTRA.map((item) => (
                  <Link key={item.href} className="nav-tile" href={item.href} aria-current={pathname === item.href ? 'page' : undefined}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[item.icon]}</svg>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="nav-panel__foot primary-nav__mobile-only">
              <Link className="btn btn--signal btn--block btn--lg" href="/shop/">Shop all peptides</Link>
              <p>Free express shipping on orders over $200</p>
            </div>
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
            <button className="nav-toggle" type="button" aria-controls="primary-nav" aria-expanded={navOpen} onClick={() => setNavOpen((v) => !v)} data-nav-toggle ref={toggleRef}>
              <span className="sr-only">{navOpen ? 'Close menu' : 'Menu'}</span><span className="nav-toggle__bars" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
