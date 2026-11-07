'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Shown after a no-JavaScript add-to-cart (the form redirects with ?added=1).
export default function AddedNotice({ name }) {
  if (useSearchParams().get('added') !== '1') return null;
  return (
    <div className="notice notice--success" role="status">
      {name} was added to your cart. <Link href="/cart/">View cart</Link>
    </div>
  );
}
