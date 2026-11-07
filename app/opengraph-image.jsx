import { ImageResponse } from 'next/og';
import { MarkSvg } from '@/components/brandArt';

export const alt = 'Purpose Labs — Research Peptides Australia. Australian lab tested, ≥99% purity.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Default social share card (pages without their own image use this).
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(180deg,#f7f9fc 0%,#ffffff 100%)', padding: 72, fontFamily: 'sans-serif', color: '#0f172a' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <MarkSvg size={72} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Purpose Labs</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#2563eb', letterSpacing: 3 }}>AUSTRALIAN-TESTED. PURITY VERIFIED.</div>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -3, lineHeight: 1.05 }}>Research Peptides Australia</div>
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 26, color: '#334155' }}>
          {['≥99% HPLC verified', 'Same-day Sydney dispatch', 'Free express over $200'].map((t) => (
            <div key={t} style={{ display: 'flex', padding: '12px 22px', borderRadius: 999, background: '#eef4ff', color: '#1d4ed8' }}>{t}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
