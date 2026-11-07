import { getPage } from '@/lib/catalog';
import { buildMetadata } from '@/lib/seo';
import LegacyPage from '@/components/LegacyPage';

const page = getPage('home');

export const metadata = buildMetadata({ title: page.title, description: page.description, path: '/' });

export default function Home() {
  return <LegacyPage page={page} />;
}
