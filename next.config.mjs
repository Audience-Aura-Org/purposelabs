// Canonical host. Hard-coded (not read from SITE_URL) so a mis-set env var can
// never turn this into a self-redirect. Only requests whose Host is exactly the
// www name are redirected; the primary host never matches.
const PRIMARY_HOST = 'centralpurposelab.com';
const WWW_HOST = `www.${PRIMARY_HOST}`;
const hostIs = (h) => [{ type: 'host', value: h.replace(/\./g, '\\.') }];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress URLs end with "/", keep them identical for SEO and old links.
  trailingSlash: true,
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async redirects() {
    return [
      // www → primary host: 301, path, trailing slash and query string preserved
      // (Next appends the query itself). Three rules because `:path*` drops the
      // trailing slash, which would add a second hop. Keep these first so www
      // requests for legacy URLs reach the primary host in one hop.
      // Only the Host header is matched, never X-Forwarded-Host: a client could
      // send that to the primary host and get a redirect cached for it.
      { source: '/', has: hostIs(WWW_HOST), destination: `https://${PRIMARY_HOST}/`, statusCode: 301 },
      { source: '/:path+/', has: hostIs(WWW_HOST), destination: `https://${PRIMARY_HOST}/:path+/`, statusCode: 301 },
      { source: '/:path+', has: hostIs(WWW_HOST), destination: `https://${PRIMARY_HOST}/:path+`, statusCode: 301 },
      // Old WooCommerce account links; accounts are not migrated.
      { source: '/my-account/:rest+/', destination: '/my-account/?notice=accounts', permanent: false },
      // Old WordPress search URLs.
      { source: '/', has: [{ type: 'query', key: 's', value: '(?<term>.*)' }], destination: '/shop/?q=:term', permanent: false },
      // Old WordPress/WooCommerce URLs that may still be indexed → closest live page (301).
      { source: '/feed/', destination: '/', permanent: true },
      { source: '/comments/feed/', destination: '/', permanent: true },
      { source: '/shop/page/:n/', destination: '/shop/', permanent: true },
      { source: '/product-category/:slug/page/:n/', destination: '/product-category/:slug/', permanent: true },
      { source: '/product-tag/:tag/', destination: '/shop/', permanent: true },
      { source: '/product/:slug/feed/', destination: '/product/:slug/', permanent: true },
      { source: '/wp-login.php', destination: '/my-account/', permanent: true },
      { source: '/wp-admin/:path*', destination: '/my-account/', permanent: true },
    ];
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
export default nextConfig;
