import { notFound } from 'next/navigation';
import { pages, getPage } from '@/lib/catalog';
import LegacyPage from '@/components/LegacyPage';

// Pages with their own route folder.
const OWN_ROUTE = new Set(['home', 'track-order']);
const NOINDEX = new Set(['my-account', 'affiliate-area']);

export const dynamicParams = false;

export function generateStaticParams() {
  return pages.filter((p) => !OWN_ROUTE.has(p.slug)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page) return {};
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/${slug}/` },
    robots: NOINDEX.has(slug) ? { index: false } : undefined,
  };
}

export default async function ContentPage({ params }) {
  const { slug } = await params;
  const page = getPage(slug);
  if (!page || OWN_ROUTE.has(slug)) notFound();
  return <LegacyPage page={page} />;
}
