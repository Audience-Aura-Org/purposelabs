// One-off migration: reads the HTTrack mirror of the WordPress site and
// writes clean JSON content + copies images. Content text is preserved
// verbatim; only markup plumbing (scripts, WP nonces, links, image paths)
// is rewritten.
//
//   npm run extract            (mirror at ../purposelabsau.com)
//   MIRROR_DIR=/path npm run extract

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');
const MIRROR = path.resolve(process.env.MIRROR_DIR || path.join(ROOT, '_original-mirror', 'purposelabsau.com'));
const OUT_DATA = path.join(ROOT, 'content');
const OUT_UPLOADS = path.join(ROOT, 'public', 'uploads');
const OUT_LEGACY = path.join(ROOT, 'public', 'assets', 'legacy');

const SKIP_DIRS = new Set(['product', 'product-category', 'shop', 'cart', 'checkout', 'feed', 'comments',
  'wp-admin', 'wp-content', 'wp-includes', 'wp-json']);

const report = { warnings: [], forms: [] };
const warn = (m) => report.warnings.push(m);

// ---------- helpers ----------
const read = (rel) => fs.readFileSync(path.join(MIRROR, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(MIRROR, rel));

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (/\.(jpe?g|png|webp|gif|svg)$/i.test(e.name)) fs.copyFileSync(s, d);
  }
}

// Map any WP size variant (foo-768x768.jpg) to a variant we actually have.
function resolveUpload(relUnderUploads) {
  const clean = relUnderUploads.split(/[?#]/)[0];
  if (fs.existsSync(path.join(MIRROR, 'wp-content/uploads', clean))) return '/uploads/' + clean;
  const m = clean.match(/^(.*?)(-\d+x\d+|-scaled)?\.(jpe?g|png|webp)$/i);
  if (m) {
    for (const suffix of ['-600x600', '-scaled', '-300x300', '']) {
      const cand = `${m[1]}${suffix}.${m[3]}`;
      if (fs.existsSync(path.join(MIRROR, 'wp-content/uploads', cand))) return '/uploads/' + cand;
    }
  }
  warn(`missing image: ${clean}`);
  return '/uploads/' + clean;
}

function resolveAsset(url, fromFile) {
  if (!url || /^(data:|#|mailto:|tel:)/.test(url)) return url;
  let p = url;
  if (/^https?:\/\/(www\.)?purposelabsau\.com/.test(p)) p = p.replace(/^https?:\/\/(www\.)?purposelabsau\.com\/?/, '');
  else if (/^https?:/.test(p)) return url;
  else p = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), p));
  p = p.replace(/^\/+/, '');
  const up = p.match(/wp-content\/uploads\/(.*)$/);
  if (up) return resolveUpload(up[1]);
  const theme = p.match(/wp-content\/themes\/[^/]+\/assets\/images\/([^?#]*)/);
  if (theme) return '/assets/legacy/' + theme[1];
  return url;
}

// Convert a mirror-relative or absolute site link to a clean route.
function cleanHref(href, fromFile) {
  if (!href) return href;
  if (/^(#|mailto:|tel:|javascript:)/.test(href)) return href;
  let p;
  if (/^https?:\/\/(www\.)?purposelabsau\.com/.test(href)) {
    p = href.replace(/^https?:\/\/(www\.)?purposelabsau\.com/, '');
  } else if (/^https?:|^\/\//.test(href)) {
    return href;
  } else {
    const [pathPart, rest = ''] = href.split(/(?=[?#])/);
    p = '/' + path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), pathPart)) + rest;
  }
  const hash = p.includes('#') ? p.slice(p.indexOf('#')) : '';
  p = p.replace(/#.*$/, '');
  if (/add-to-cart=/.test(p)) return null; // legacy GET add-to-cart links
  p = p.replace(/\?.*$/, '');
  p = p.replace(/index[0-9a-f]*\.html$/, '').replace(/\.html$/, '/');
  p = p.replace(/\/+/g, '/');
  if (p === '' || p === '/.') p = '/';
  if (!p.endsWith('/')) p += '/';
  if (p.startsWith('/wp-content/uploads/')) return resolveUpload(p.replace('/wp-content/uploads/', '').replace(/\/$/, ''));
  return p + hash;
}

function sanitizeFragment($, $root, fromFile) {
  $root.find('script, style, noscript, link, meta, .cf-turnstile, .screen-reader-text').remove();
  $root.find('input[type=hidden]').remove();
  $root.find('[id^="pl-contact-verification"]').remove();
  $root.find('a[href]').each((_, el) => {
    const v = cleanHref($(el).attr('href'), fromFile);
    if (v === null) $(el).removeAttr('href'); else $(el).attr('href', v);
  });
  $root.find('img').each((_, el) => {
    const $el = $(el);
    $el.attr('src', resolveAsset($el.attr('data-src') || $el.attr('src'), fromFile));
    $el.removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('decoding');
    $el.attr('loading', 'lazy');
  });
  $root.find('[style]').each((_, el) => {
    const s = $(el).attr('style').replace(/url\(([^)]+)\)/g, (_m, u) => `url(${resolveAsset(u.replace(/['"]/g, ''), fromFile)})`);
    $(el).attr('style', s);
  });
  $root.find('form').each((_, el) => {
    const $f = $(el);
    const cls = $f.attr('class') || '';
    if (/track-order-form/.test(cls)) $f.attr('action', '/api/track-order/');
    else if (/contact-form/.test(cls)) $f.attr('action', '/api/contact/');
    else if (/woocommerce-form/.test(cls)) $f.attr('action', '/api/account-notice/?from=my-account').attr('method', 'post');
    else if (/affwp-form/.test(cls)) $f.attr('action', '/api/account-notice/?from=affiliate-area').attr('method', 'post');
    $root.find('.g-recaptcha').remove();
    report.forms.push(`${fromFile}: form.${cls} -> ${$f.attr('action')}`);
  });
  // remove WP comments
  $root.contents().filter((_, n) => n.type === 'comment').remove();
}

const priceOf = (s) => Math.round(parseFloat(String(s).replace(/[^0-9.]/g, '')) * 100);

function ldjson($) {
  const graphs = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).text());
      graphs.push(...(j['@graph'] || [j]));
    } catch { /* ignore */ }
  });
  return graphs;
}

function meta($) {
  return {
    title: $('title').first().text().trim(),
    description: $('meta[name=description]').attr('content') || '',
  };
}

function slugFromHref(href) {
  const m = href && href.match(/\/product\/([^/]+)\//);
  return m ? m[1] : null;
}

// Replace product card grids with a marker the templates render.
function replaceProductGrids($, $root, fromFile) {
  $root.find('.products-grid, ul.products').each((_, el) => {
    const $g = $(el);
    const slugs = [];
    $g.find('a[href]').each((_, a) => {
      const s = slugFromHref(cleanHref($(a).attr('href'), fromFile));
      if (s && !slugs.includes(s)) slugs.push(s);
    });
    // carousel arrows are part of the old widget
    $g.parent('.products-carousel').find('.carousel-arrow').remove();
    $g.replaceWith(`<div data-product-grid="${slugs.join(',')}"></div>`);
  });
}

// ---------- products ----------
function extractProducts() {
  const products = [];
  for (const slug of fs.readdirSync(path.join(MIRROR, 'product'))) {
    const rel = `product/${slug}/index.html`;
    if (!exists(rel)) continue;
    const $ = cheerio.load(read(rel));
    const ld = ldjson($).find((g) => g['@type'] === 'Product');
    if (!ld) { warn(`no Product schema: ${slug}`); continue; }
    const offer = (ld.offers || [])[0] || {};
    const $sum = $('.summary').first();
    const $short = $sum.find('.woocommerce-product-details__short-description').clone();
    const $acc = $sum.find('.pdp-accordion').clone();
    const $desc = $('#tab-description').clone();
    $desc.find('h2').first().remove();
    for (const $x of [$short, $acc, $desc]) sanitizeFragment($, $x, rel);

    const categories = [];
    $('.posted_in a, .product_meta a[rel=tag]').each((_, a) => {
      const m = (cleanHref($(a).attr('href'), rel) || '').match(/product-category\/([^/]+)/);
      if (m && !categories.includes(m[1])) categories.push(m[1]);
    });
    const related = [];
    $('section.related a[href]').each((_, a) => {
      const s = slugFromHref(cleanHref($(a).attr('href'), rel));
      if (s && s !== slug && !related.includes(s)) related.push(s);
    });
    const gallery = [];
    $('.woocommerce-product-gallery__image').each((_, el) => {
      const src = $(el).attr('data-thumb') || $(el).find('img').attr('src');
      if (src) gallery.push(resolveAsset(src.replace(/-100x100\./, '-600x600.'), rel));
    });
    const image = ld.image ? resolveAsset(String(ld.image), rel) : gallery[0] || null;
    const qtyMax = parseInt($sum.find('input.qty').attr('max') || '0', 10) || null;
    const salePriceTxt = $sum.find('p.price ins .amount').first().text();
    const imgAlt = $('.woocommerce-product-gallery__image').first().attr('data-thumb-alt') || ld.name;

    products.push({
      id: parseInt($sum.find('[name=add-to-cart]').attr('value') || '0', 10) || null,
      slug,
      sku: ld.sku || '',
      name: ld.name,
      price: priceOf(offer.price || offer.priceSpecification?.[0]?.price),
      bankPrice: salePriceTxt ? priceOf(salePriceTxt) : null,
      inStock: /InStock/.test(offer.availability || ''),
      stock: qtyMax,
      image,
      imageAlt: imgAlt,
      gallery: [...new Set(gallery.length ? gallery : [image].filter(Boolean))],
      summary: ld.description || '',
      shortHtml: $short.html()?.trim() || '',
      faqHtml: $acc.html()?.trim() || '',
      descriptionHtml: $desc.html()?.trim() || '',
      categories,
      related,
      metaTitle: meta($).title,
      metaDescription: meta($).description,
    });
  }
  return products;
}

// ---------- categories + shop ordering ----------
function extractCategories() {
  const cats = [];
  for (const slug of fs.readdirSync(path.join(MIRROR, 'product-category'))) {
    const rel = `product-category/${slug}/index.html`;
    if (!exists(rel)) continue;
    const $ = cheerio.load(read(rel));
    const products = [];
    $('ul.products a[href]').each((_, a) => {
      const s = slugFromHref(cleanHref($(a).attr('href'), rel));
      if (s && !products.includes(s)) products.push(s);
    });
    const $descr = $('.term-description, .woocommerce-products-header .page-description').first().clone();
    sanitizeFragment($, $descr, rel);
    // content after the product list (category guides, FAQ etc.)
    const $after = $('<div></div>');
    let n = $('ul.products').first().parent().children('ul.products').nextAll();
    n.each((_, el) => { if (!$(el).is('nav.woocommerce-pagination')) $after.append($(el).clone()); });
    sanitizeFragment($, $after, rel);
    cats.push({
      slug,
      name: $('h1').first().text().trim(),
      descriptionHtml: $descr.html()?.trim() || '',
      afterHtml: $after.html()?.trim() || '',
      products,
      ...meta($),
    });
  }
  return cats;
}

function extractShop() {
  const rel = 'shop/index.html';
  const $ = cheerio.load(read(rel));
  const order = [];
  $('ul.products a[href], .products-grid a[href]').each((_, a) => {
    const s = slugFromHref(cleanHref($(a).attr('href'), rel));
    if (s && !order.includes(s)) order.push(s);
  });
  const $main = $('main').first().clone();
  const $intro = $('<div></div>');
  const $outro = $('<div></div>');
  // Keep any editorial text the shop page carries, before/after the grid.
  const $container = $main.find('ul.products').first().parent();
  let seen = false;
  $container.children().each((_, el) => {
    const $el = $(el);
    if ($el.is('ul.products')) { seen = true; return; }
    if ($el.is('.woocommerce-result-count, .woocommerce-ordering, .woocommerce-notices-wrapper, nav.woocommerce-pagination, header.woocommerce-products-header')) return;
    (seen ? $outro : $intro).append($el.clone());
  });
  sanitizeFragment($, $intro, rel);
  sanitizeFragment($, $outro, rel);
  return {
    title: $('h1').first().text().trim() || 'Shop',
    order,
    introHtml: $intro.html()?.trim() || '',
    outroHtml: $outro.html()?.trim() || '',
    ...meta($),
  };
}

// ---------- content pages ----------
function extractPage(rel, slug) {
  const $ = cheerio.load(read(rel));
  const $main = $('main').first();
  if (!$main.length) { warn(`no <main>: ${rel}`); return null; }
  const $c = $main.clone();
  replaceProductGrids($, $c, rel);
  sanitizeFragment($, $c, rel);
  const ld = ldjson($);
  const faq = ld.find((g) => g['@type'] === 'FAQPage');
  return {
    slug,
    mainClass: ($main.attr('class') || '').replace(/\bsite-main\b/, '').trim(),
    html: $c.html().trim(),
    faqSchema: faq || null,
    ...meta($),
  };
}

function extractPages() {
  const pages = [];
  const home = extractPage('index.html', 'home');
  if (home) pages.push(home);
  for (const d of fs.readdirSync(MIRROR, { withFileTypes: true })) {
    if (!d.isDirectory() || SKIP_DIRS.has(d.name)) continue;
    const rel = `${d.name}/index.html`;
    if (!exists(rel)) continue;
    const p = extractPage(rel, d.name);
    if (p) pages.push(p);
  }
  return pages;
}

// ---------- run ----------
fs.mkdirSync(OUT_DATA, { recursive: true });
copyDir(path.join(MIRROR, 'wp-content/uploads'), OUT_UPLOADS);
copyDir(path.join(MIRROR, 'wp-content/themes/purposelabs/assets/images'), OUT_LEGACY);

const products = extractProducts();
const categories = extractCategories();
const shop = extractShop();
const pages = extractPages();

const known = new Set(products.map((p) => p.slug));
for (const p of products) p.related = p.related.filter((s) => known.has(s));
for (const c of categories) c.products = c.products.filter((s) => known.has(s));
shop.order = shop.order.filter((s) => known.has(s));
for (const p of products) if (!shop.order.includes(p.slug)) shop.order.push(p.slug);
// backfill product.categories from category listings
for (const c of categories) for (const s of c.products) {
  const p = products.find((x) => x.slug === s);
  if (p && !p.categories.includes(c.slug)) p.categories.push(c.slug);
}

const write = (f, d) => fs.writeFileSync(path.join(OUT_DATA, f), JSON.stringify(d, null, 2));
write('products.json', products);
write('categories.json', categories);
write('shop.json', shop);
write('pages.json', pages);

console.log(`products: ${products.length}, categories: ${categories.length}, pages: ${pages.length}, shop order: ${shop.order.length}`);
console.log(`pages: ${pages.map((p) => p.slug).join(', ')}`);
console.log('forms:\n  ' + report.forms.join('\n  '));
const uniq = [...new Set(report.warnings)];
console.log(`warnings (${uniq.length}):\n  ` + uniq.slice(0, 40).join('\n  '));
