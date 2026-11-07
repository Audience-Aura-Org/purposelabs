import { findOrder, ORDER_STATUS } from '@/lib/store';
import { signToken } from '@/lib/token';
import { formOf, seeOther, str } from '@/lib/http';

export async function POST(req) {
  const f = await formOf(req);
  if (f.pl_track_website) return seeOther(req, '/track-order/?notice=notfound#track-order');
  const id = str(f.pl_track_order_id, 20).replace(/^#/, '');
  const order = findOrder(id, { email: str(f.pl_track_email, 200) });
  if (!order) return seeOther(req, '/track-order/?notice=notfound#track-order');
  // Result travels in a short-lived signed token; no email/PII in the URL.
  const t = signToken({
    id: order.id,
    status: ORDER_STATUS[order.status] || order.status,
    placed: order.createdAt,
    total: order.totals.total,
    tracking: order.tracking || null,
  });
  return seeOther(req, `/track-order/?t=${encodeURIComponent(t)}#track-order`);
}
