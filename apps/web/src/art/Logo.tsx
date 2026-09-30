import { BRAND } from '../brand';
import { Art } from './Art';

/** Logo mark: a cream playing card carrying a red bull head, with the "6" corner index. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Art
      id="logo-mark"
      alt=""
      className="size-full object-contain"
      fallback={
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
          <defs>
            <linearGradient id="lm-card" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#FFF9EF" />
              <stop offset="1" stopColor="#F2E6D2" />
            </linearGradient>
          </defs>
          <rect x="7" y="3" width="30" height="40" rx="6" fill="#E5484D" transform="rotate(-10 22 23)" opacity=".9" />
          <rect x="11" y="4" width="30" height="40" rx="6" fill="url(#lm-card)" transform="rotate(6 26 24)" />
          <g transform="rotate(6 26 24) translate(26 25.5)">
            <path
              d="M-11.5-9c.6 4.3 3.2 7 7 7.6-.4 1-.6 2.2-.6 3.4 0 5.8 2.3 9.4 5.1 9.4s5.1-3.6 5.1-9.4c0-1.2-.2-2.4-.6-3.4 3.8-.6 6.4-3.3 7-7.6-2.7 2.1-5.5 3-8.4 3.1C1.9-6.6.9-6.9 0-6.9s-1.9.3-2.7.9c-2.9-.1-5.7-1-8.8-3Z"
              fill="#E5484D"
            />
            <circle cx="-2.2" cy="0.6" r="1.2" fill="#FFF7EA" />
            <circle cx="2.2" cy="0.6" r="1.2" fill="#FFF7EA" />
          </g>
          <text x="15.5" y="14.5" transform="rotate(6 26 24)" fontFamily="Bricolage Grotesque, Inter, sans-serif" fontWeight="800" fontSize="8" fill="#1F2330">6</text>
        </svg>
      }
    />
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center">
        <LogoMark />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[1.15rem] font-extrabold tracking-tight">{BRAND.short}</span>
          <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.28em] text-fog">Online</span>
        </span>
      )}
    </span>
  );
}
