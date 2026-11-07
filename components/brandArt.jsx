// Shared artwork for generated images (OG card, logo, icons). Rendered by next/og.
export function MarkSvg({ size = 64, bg = '#0f172a', fg = '#ffffff', dot = '#3b82f6', radius = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx={radius / (size / 32)} fill={bg} />
      <path d="M16 5.5 25.1 10.75v10.5L16 26.5 6.9 21.25v-10.5Z" fill="none" stroke={fg} strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 10.5v6.6l5.2 3" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="16" cy="17.1" r="2.3" fill={dot} />
    </svg>
  );
}
