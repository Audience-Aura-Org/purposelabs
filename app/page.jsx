import { getPage } from '@/lib/catalog';
import LegacyPage from '@/components/LegacyPage';

const page = getPage('home');

export const metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: '/' },
};

export default function Home() {
  return <LegacyPage page={page} />;
}
