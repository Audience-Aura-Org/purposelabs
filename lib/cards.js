// One source of truth for product-card markup. Used by React pages (via
// dangerouslySetInnerHTML) and to fill product-grid markers in legacy content.
import { getProduct, productsFor } from './catalog.js';
import { money, thumb, large, optimized, srcSet } from './format.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function cardHtml(p) {
  const url = `/product/${p.slug}/`;
  const action = p.inStock
    ? `<form class="pcard__add" action="/api/cart/add/" method="post" data-add-to-cart><input type="hidden" name="product" value="${esc(p.slug)}"><input type="hidden" name="qty" value="1"><button class="btn btn--sm btn--ink" type="submit">Add to Cart<span class="sr-only">: ${esc(p.name)}</span></button></form>`
    : `<a class="btn btn--sm btn--ghost pcard__add" href="${url}">View</a>`;
  return `<article class="pcard${p.inStock ? '' : ' pcard--out'}">`
    // Resized WebP/AVIF from the 600px source: ~384px on phones, 640px on retina desktop.
    + `<a class="pcard__media" href="${url}" tabindex="-1" aria-hidden="true"><img src="${esc(optimized(large(p.image), 384))}" srcset="${esc(srcSet(large(p.image), [256, 384, 640]))}" sizes="(max-width: 560px) 46vw, 260px" alt="" width="300" height="300" loading="lazy" decoding="async">${p.inStock ? '' : '<span class="pcard__flag">Out of stock</span>'}</a>`
    + `<div class="pcard__body"><h3 class="pcard__name"><a href="${url}">${esc(p.name)}</a></h3>`
    + `<p class="pcard__price"><span class="pcard__now">${money(p.price)}</span>${p.bankPrice ? `<span class="pcard__bank">${money(p.bankPrice)} with bank transfer</span>` : ''}</p></div>`
    + action + '</article>';
}

export const gridHtml = (list, cls = 'product-grid') => `<div class="${cls}">${list.map(cardHtml).join('')}</div>`;

/** Every page needs exactly one <h1> (SEO); promote the first <h2> when the old page had none. */
function ensureH1(html) {
  if (/<h1[\s>]/.test(html)) return html;
  return html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/, (_m, attrs = '', inner) => {
    const a = /class="/.test(attrs) ? attrs.replace('class="', 'class="h1-promoted ') : `${attrs} class="h1-promoted"`;
    return `<h1${a}>${inner}</h1>`;
  });
}

/** Replace extractor markers with live product cards; serve content images responsively. */
export function renderLegacy(html) {
  return ensureH1(html)
    .replace(/<div data-product-grid="([^"]*)"><\/div>/g, (_m, list) =>
      gridHtml(productsFor(list.split(',').filter(Boolean)), 'product-grid product-grid--rail'))
    .replace(/<img([^>]*?)\ssrc="(\/(?:uploads|assets\/legacy)\/[^"]+\.(?:jpe?g|png|webp))"([^>]*)>/g, (_m, pre, src, post) =>
      `<img${pre} src="${esc(optimized(src, 828))}" srcset="${esc(srcSet(src, [384, 640, 828, 1200, 1920]))}" sizes="(max-width: 860px) 100vw, 50vw"${post}>`);
}

export { getProduct };
