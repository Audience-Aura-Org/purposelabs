export default function manifest() {
  return {
    name: 'Purpose Labs Australia',
    short_name: 'Purpose Labs',
    description: 'Australian lab-tested research peptides. ≥99% purity, same-day Sydney dispatch.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/assets/brand/mark.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/brand-logo.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon/', sizes: '180x180', type: 'image/png' },
    ],
  };
}
