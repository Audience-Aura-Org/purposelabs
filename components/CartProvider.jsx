'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { money, thumb } from '@/lib/format';

const CartCtx = createContext(null);
export const useCart = () => useContext(CartCtx);

const EMPTY = { count: 0, subtotal: 0, toFreeExpress: 20000, lines: [] };

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toast, setToast] = useState('');
  const [bump, setBump] = useState(0);
  const lastFocus = useRef(null);
  const panelRef = useRef(null);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/cart/', { cache: 'no-store', headers: { Accept: 'application/json' } });
      if (r.ok) setCart(await r.json());
    } catch { /* offline: keep last known */ }
  }, []);

  // Re-sync after every navigation (cart page / checkout change it server-side).
  useEffect(() => { refresh(); }, [pathname, refresh]);

  const update = useCallback((data) => { setCart(data); setBump((b) => b + 1); }, []);

  const openDrawer = useCallback(() => {
    lastFocus.current = document.activeElement;
    setMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
  }, []);
  const closeDrawer = useCallback(() => {
    setOpen(false);
    setTimeout(() => setMounted(false), 300);
    lastFocus.current?.focus?.();
  }, []);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, [mounted, closeDrawer]);

  useEffect(() => { if (mounted) closeDrawer(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <CartCtx.Provider value={{ cart, refresh, update, openDrawer, closeDrawer, notify, bump }}>
      {children}

      {mounted && (
        <div className={`drawer${open ? ' is-open' : ''}`} data-drawer>
          <div className="drawer__scrim" onClick={closeDrawer} />
          <aside className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="drawer-title" tabIndex={-1} ref={panelRef}>
            <header className="drawer__head">
              <h2 id="drawer-title">Your cart</h2>
              <button type="button" className="icon-btn" onClick={closeDrawer} aria-label="Close cart" data-drawer-close>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </header>
            {cart.lines.length > 0 && (
              <div className="drawer__ship">
                {cart.toFreeExpress > 0
                  ? <>Add <strong>{money(cart.toFreeExpress)}</strong> for free express shipping</>
                  : <strong>✓ Free express shipping unlocked</strong>}
              </div>
            )}
            <ul className="drawer__lines">
              {cart.lines.length === 0 && <li className="drawer__empty">Your cart is empty.</li>}
              {cart.lines.map((l) => (
                <li key={l.slug}>
                  <img src={thumb(l.image)} alt="" width="56" height="56" />
                  <span><Link href={`/product/${l.slug}/`}>{l.name}</Link><small>{l.qty} × {money(l.unit)}</small></span>
                  <strong className="mono">{money(l.total)}</strong>
                </li>
              ))}
            </ul>
            <footer className="drawer__foot">
              <div className="drawer__subtotal"><span>Subtotal</span><strong data-drawer-subtotal>{money(cart.subtotal)}</strong></div>
              <Link className="btn btn--signal btn--block" href="/checkout/">Checkout</Link>
              <Link className="btn btn--ghost btn--block" href="/cart/">View full cart</Link>
            </footer>
          </aside>
        </div>
      )}
      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </CartCtx.Provider>
  );
}
