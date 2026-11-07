import { seeOther } from '@/lib/http';

// Login / register / affiliate forms from the old site: accounts are not
// migrated yet, so point people to support.
export async function POST(req) {
  const from = new URL(req.url).searchParams.get('from') === 'affiliate-area' ? 'affiliate-area' : 'my-account';
  return seeOther(req, `/${from}/?notice=accounts`);
}
