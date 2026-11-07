import { getPage, money } from '@/lib/catalog';
import { readToken } from '@/lib/token';
import { buildMetadata } from '@/lib/seo';
import LegacyPage from '@/components/LegacyPage';

const page = getPage('track-order');

export const metadata = buildMetadata({ title: page.title, description: page.description, path: '/track-order/' });

export default async function TrackOrderPage({ searchParams }) {
  const { t } = await searchParams;
  const r = t ? readToken(t) : null;
  const result = r && (
    <div className="wrap">
      <div className="notice notice--info" role="status">
        Order #{r.id} — {r.status}. Placed {new Date(r.placed).toLocaleDateString('en-AU')}, total {money(r.total)}.
        {r.tracking ? ` Tracking number: ${r.tracking}.` : ''}
      </div>
    </div>
  );
  return <LegacyPage page={page} before={result} />;
}
