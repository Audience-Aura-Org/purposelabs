'use client';

import { useSearchParams } from 'next/navigation';
import { NOTICES } from '@/lib/notices';

/** Shows a fixed notice selected by ?notice=key (keeps the page static). */
export default function Notice() {
  const key = useSearchParams().get('notice');
  const n = key && NOTICES[key];
  if (!n) return null;
  return (
    <div className="wrap">
      <div className={`notice notice--${n.type}`} role={n.type === 'error' ? 'alert' : 'status'}>{n.text}</div>
    </div>
  );
}
