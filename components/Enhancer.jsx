'use client';

// Progressive enhancement for server-rendered + legacy content markup.
// Every form here works without JavaScript; this only upgrades UX.
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { initCalculator } from './calculator';

export default function Enhancer() {
  const router = useRouter();
  const pathname = usePathname();
  const { update, openDrawer, notify } = useCart();

  // Document-level delegation: survives client navigations.
  useEffect(() => {
    const onSubmit = async (e) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.matches('[data-add-to-cart]')) {
        e.preventDefault();
        const btn = form.querySelector('button[type=submit]');
        if (btn) btn.disabled = true;
        try {
          const r = await fetch(form.action, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            body: new FormData(form),
          });
          const data = await r.json();
          if (!r.ok || !data.ok) throw new Error(data.error || 'Could not add to cart');
          update(data);
          openDrawer();
        } catch (err) {
          notify(err.message || 'Something went wrong — please try again.');
        } finally {
          if (btn) btn.disabled = false;
        }
      }
    };

    const onClick = (e) => {
      const step = e.target.closest?.('[data-step]');
      if (step) {
        const input = step.closest('[data-qty]')?.querySelector('input');
        if (input) {
          const min = Number(input.min || 0), max = Number(input.max || 999);
          input.value = String(Math.min(max, Math.max(min, (Number(input.value) || 0) + Number(step.dataset.step))));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
      }
      // Client-side navigation for internal links inside legacy HTML content.
      const a = e.target.closest?.('.content a[href^="/"]');
      if (a && !a.target && !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
        && !/\.(jpe?g|png|webp|svg|pdf)$/i.test(a.pathname)) {
        e.preventDefault();
        router.push(a.getAttribute('href'));
      }
    };

    let autoT;
    const onChange = (e) => {
      const el = e.target;
      if (el.matches?.('input[data-autoupdate]')) {
        clearTimeout(autoT);
        autoT = setTimeout(() => el.form?.requestSubmit(), 450);
      } else if (el.matches?.('form[data-autosubmit] select')) {
        el.form.requestSubmit();
      } else if (el.id === 'pl-contact-topic') {
        syncContactHints();
      }
    };

    document.addEventListener('submit', onSubmit);
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    return () => {
      document.removeEventListener('submit', onSubmit);
      document.removeEventListener('click', onClick);
      document.removeEventListener('change', onChange);
    };
  }, [router, update, openDrawer, notify]);

  // Per-page initialisation.
  useEffect(() => {
    syncContactHints();
    const cleanup = initCalculator(document.querySelector('.calculator-wrapper'));
    document.querySelector('[data-focus]')?.focus();
    return cleanup;
  }, [pathname]);

  return null;
}

function syncContactHints() {
  const topic = document.getElementById('pl-contact-topic');
  if (!topic) return;
  document.querySelectorAll('.contact-form-hint[data-topic]').forEach((h) => { h.hidden = h.dataset.topic !== topic.value; });
}
