import { notFound } from 'next/navigation';
import { pages, getPage } from '@/lib/catalog';
import { buildMetadata, pageMeta, breadcrumbLd, articleLd } from '@/lib/seo';
import LegacyPage from '@/components/LegacyPage';
import JsonLd from '@/components/JsonLd';

// Pages with their own route folder.
const OWN_ROUTE = new Set(['home', 'track-order']);
const NOINDEX = new Set(['my-account', 'affiliate-area']);

export const dynamicParams = false;

export function generateStaticParams() {
  return pages.filter((p) => !OWN_ROUTE.has(p.slug)).map((p) => ({ slug: p.slug }));
}

const isGuide = (page) => /peptide-info-page/.test(page.mainClass);

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) return {};
  const m = pageMeta(page);
  return buildMetadata({ ...m, path: `/${slug}/`, type: isGuide(page) ? 'article' : 'website', noindex: NOINDEX.has(slug) });
}

export default async function ContentPage({ params }) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page || OWN_ROUTE.has(slug)) notFound();
  const name = pageMeta(page).title.split('|')[0].trim();
  const crumbs = isGuide(page) ? [['Research Library', '/research/'], [name, `/${slug}/`]] : [[name, `/${slug}/`]];
  return (
    <>
      <LegacyPage page={page} />
      <JsonLd data={[breadcrumbLd(crumbs), isGuide(page) ? articleLd(page) : null]} />
    </>
  );
}
