import { Suspense } from 'react';
import { renderLegacy } from '@/lib/cards';
import Notice from './Notice';

/** Renders a page carried over from the old site, with live product cards. */
export default function LegacyPage({ page, before = null }) {
  const isHome = page.slug === 'home';
  return (
    <div className={`content ${page.mainClass} ${isHome ? 'is-home' : `page-${page.slug}`}`}>
      <Suspense fallback={null}><Notice /></Suspense>
      {before}
      <div dangerouslySetInnerHTML={{ __html: renderLegacy(page.html) }} />
      {page.faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({ '@context': 'https://schema.org', ...page.faqSchema }).replace(/</g, '\\u003c') }}
        />
      )}
    </div>
  );
}
