/**
 * The brand symbol: a geometric bull head — oversized horns, nose ring, two eyes.
 * `mood` changes only the eyes and brows, so the silhouette stays recognisable at 16px.
 */
export type BullMood = 'neutral' | 'smug' | 'shock';

interface Palette {
  head: string;
  horn: string;
  ear: string;
  snout: string;
  nostril: string;
  eye: string;
  pupil: string;
  ring: string;
  brow: string;
}

export const BULL_PALETTES = {
  brand: { head: '#E5484D', horn: '#FFF1D6', ear: '#B8323A', snout: '#FF9A9D', nostril: '#8E1F27', eye: '#FFFFFF', pupil: '#14161D', ring: '#F5B942', brow: '#14161D' },
  mono: { head: '#FFF7EA', horn: '#FFF7EA', ear: '#FFF7EA', snout: '#FFD9DA', nostril: '#B8323A', eye: '#B8323A', pupil: '#B8323A', ring: '#FFF7EA', brow: '#B8323A' },
  ink: { head: '#14161D', horn: '#F5B942', ear: '#0B0D12', snout: '#2A2F3C', nostril: '#F5B942', eye: '#F5B942', pupil: '#14161D', ring: '#F5B942', brow: '#F5B942' },
} satisfies Record<string, Palette>;

export function BullMark({
  size = 40,
  mood = 'neutral',
  palette = 'brand',
  className,
  title,
}: {
  size?: number | string;
  mood?: BullMood;
  palette?: keyof typeof BULL_PALETTES | Palette;
  className?: string;
  title?: string;
}) {
  const p = typeof palette === 'string' ? BULL_PALETTES[palette] : palette;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {/* horns: wide, swept, a little too proud */}
      <path d="M31 36C14 35 3 23 4 5c7 13 17 20 32 22Z" fill={p.horn} />
      <path d="M69 36C86 35 97 23 96 5c-7 13-17 20-32 22Z" fill={p.horn} />
      {/* ears */}
      <path d="M22 42 8 47l14 8Z" fill={p.ear} />
      <path d="M78 42l14 5-14 8Z" fill={p.ear} />
      {/* head */}
      <path d="M26 28h48l6 34c0 18-13 31-30 31S20 80 20 62Z" fill={p.head} />
      {/* snout + ring */}
      <rect x="30" y="63" width="40" height="22" rx="11" fill={p.snout} />
      <rect x="38" y="70" width="7" height="8" rx="3.5" fill={p.nostril} />
      <rect x="55" y="70" width="7" height="8" rx="3.5" fill={p.nostril} />
      <circle cx="50" cy="88" r="7.5" fill="none" stroke={p.ring} strokeWidth="4" />
      <Eyes mood={mood} p={p} />
    </svg>
  );
}

function Eyes({ mood, p }: { mood: BullMood; p: Palette }) {
  if (mood === 'shock') {
    return (
      <g>
        <circle cx="38" cy="47" r="9" fill={p.eye} />
        <circle cx="62" cy="47" r="9" fill={p.eye} />
        <circle cx="38" cy="47" r="3" fill={p.pupil} />
        <circle cx="62" cy="47" r="3" fill={p.pupil} />
        <path d="M29 34l14 3M71 34l-14 3" stroke={p.brow} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (mood === 'smug') {
    // half-closed lids, pupils sliding sideways, one brow up: "that row is yours now"
    return (
      <g>
        <circle cx="38" cy="49" r="7.5" fill={p.eye} />
        <circle cx="62" cy="49" r="7.5" fill={p.eye} />
        <circle cx="41.5" cy="51" r="3.4" fill={p.pupil} />
        <circle cx="65.5" cy="51" r="3.4" fill={p.pupil} />
        <path d="M29 41.5h18v7H29zM53 41.5h18v7H53z" fill={p.head} />
        <path d="M29.5 48.5h17M53.5 48.5h17" stroke={p.brow} strokeWidth="3" strokeLinecap="round" />
        <path d="M30 38l14 1.5M56 36.5l14-4" stroke={p.brow} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g>
      <circle cx="38" cy="49" r="7.5" fill={p.eye} />
      <circle cx="62" cy="49" r="7.5" fill={p.eye} />
      <circle cx="39" cy="50" r="3.4" fill={p.pupil} />
      <circle cx="61" cy="50" r="3.4" fill={p.pupil} />
      <path d="M30 39l13 3M70 39l-13 3" stroke={p.brow} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

/** Spiky starburst used behind penalty numbers. */
export function Starburst({ size = 120, color = '#E5484D', points = 14, className }: { size?: number | string; color?: string; points?: number; className?: string }) {
  const d = Array.from({ length: points * 2 }, (_, i) => {
    const r = i % 2 ? 34 : 50;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    return `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`;
  }).join('');
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
      <path d={`${d}Z`} fill={color} />
    </svg>
  );
}
