import { brand } from '@/lib/config';

export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Transactional and API routes; search/sort variants are noindex via meta robots.
      // /my-account/ and /affiliate-area/ are deliberately NOT disallowed: they are
      // static notice pages (no user data) with <meta name="robots" content="noindex">,
      // and crawlers can only honour that noindex if they are allowed to fetch the page.
      // Their form endpoint lives under /api/, which stays disallowed.
      disallow: ['/cart/', '/checkout/', '/api/'],
    }],
    sitemap: `${brand.siteUrl}/sitemap.xml`,
    host: brand.siteUrl,
  };
}
