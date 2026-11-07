/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress URLs end with "/", keep them identical for SEO and old links.
  trailingSlash: true,
  poweredByHeader: false,
  images: { formats: ['image/avif', 'image/webp'] },
  async redirects() {
    return [
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
