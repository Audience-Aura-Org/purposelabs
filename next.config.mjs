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
