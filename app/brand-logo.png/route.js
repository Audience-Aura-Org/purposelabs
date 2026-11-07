import { ImageResponse } from 'next/og';
import { MarkSvg } from '@/components/brandArt';

// 512px PNG logo for schema.org Organization (Google requires a raster logo).
export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <MarkSvg size={432} radius={96} />
      </div>
    ),
    { width: 512, height: 512 },
  );
}
