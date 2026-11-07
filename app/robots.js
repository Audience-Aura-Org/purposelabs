import { brand } from '@/lib/config';

export default function robots() {
  return {
    rules: [{
      userAgent: '*',
      allow: '/',
      // Transactional and API routes; search/sort variants are noindex via meta robots.
      disallow: ['/cart/', '/checkout/', '/my-account/', '/affiliate-area/', '/api/'],
    }],
    sitemap: `${brand.siteUrl}/sitemap.xml`,
    host: brand.siteUrl,
  };
}
