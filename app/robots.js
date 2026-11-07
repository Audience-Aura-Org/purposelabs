import { brand } from '@/lib/config';

export default function robots() {
  return {
    rules: { userAgent: '*', disallow: ['/cart/', '/checkout/', '/my-account/', '/api/'] },
    sitemap: `${brand.siteUrl}/sitemap.xml`,
  };
}
