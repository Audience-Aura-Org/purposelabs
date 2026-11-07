// Client-safe helpers (no Node APIs).
export const money = (cents) => `$${(cents / 100).toFixed(2)}`;
export const thumb = (src) => (src || '').replace('-scaled.', '-300x300.').replace('-600x600.', '-300x300.');
export const large = (src) => (src || '').replace('-scaled.', '-600x600.');

/** URL through Next's image optimiser (resized + WebP/AVIF). w must be one of next.config sizes. */
export const optimized = (src, w, q = 75) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=${q}`;
export const srcSet = (src, widths) => widths.map((w) => `${optimized(src, w)} ${w}w`).join(', ');
