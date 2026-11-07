import { NextResponse } from 'next/server';
import { cartSummary } from '@/lib/cart';

export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await cartSummary();
  return NextResponse.json(
    { count: s.count, subtotal: s.subtotal, toFreeExpress: s.toFreeExpress, lines: s.lines },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
