import type { SVGProps } from 'react';

/**
 * Bullheads icon set — 24px grid, 1.8px strokes, rounded joins.
 * Game-specific glyphs (bullhead, row-take, low-card) are drawn to match the generic UI ones.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const Base = ({ size = 20, children, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

/** Filled bull head used as the penalty pip on cards. Reads clearly down to 6px. */
export const Bullhead = ({ size = 14, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...rest}>
    <path
      fillRule="evenodd"
      d="M2.5 3.5c.4 3 2.2 5 4.9 5.6-.3.8-.4 1.6-.4 2.5 0 5 2.3 9.4 5 9.4s5-4.4 5-9.4c0-.9-.1-1.7-.4-2.5 2.7-.6 4.5-2.6 4.9-5.6-1.9 1.5-3.9 2.2-5.9 2.2A6 6 0 0 0 12 4.9c-1.3 0-2.6.3-3.6.8-2 0-4-.7-5.9-2.2ZM9.6 11.6a1.1 1.1 0 1 0 0 .01ZM14.4 11.6a1.1 1.1 0 1 0 0 .01ZM10.4 17.2a1 1 0 1 0 0 .01ZM13.6 17.2a1 1 0 1 0 0 .01Z"
    />
  </svg>
);

export const IconPlay = (p: IconProps) => (
  <Base {...p}>
    <path d="M7 5.5v13l11-6.5-11-6.5Z" fill="currentColor" stroke="none" />
  </Base>
);
export const IconUsers = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8.5" r="3.2" />
    <path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8" />
    <path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.6c1.6.6 2.7 2.1 3 4.4" />
  </Base>
);
export const IconBot = (p: IconProps) => (
  <Base {...p}>
    <rect x="4.5" y="8" width="15" height="11" rx="3.5" />
    <path d="M12 4.5V8M9.5 13h.01M14.5 13h.01M9.5 16.2h5" />
    <circle cx="12" cy="4" r="1" fill="currentColor" />
  </Base>
);
export const IconLock = (p: IconProps) => (
  <Base {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);
export const IconGlobe = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.4 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.4-3.5-8.5S9.6 6.1 12 3.5Z" />
  </Base>
);
export const IconCrown = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 17.5 3 7.5l5 4 4-6 4 6 5-4-1 10H4Z" fill="currentColor" fillOpacity=".18" />
    <path d="M4.5 20.5h15" />
  </Base>
);
export const IconTrophy = (p: IconProps) => (
  <Base {...p}>
    <path d="M7.5 4.5h9v5a4.5 4.5 0 0 1-9 0v-5Z" />
    <path d="M7.5 6.5H4.5c0 2.6 1.4 4.3 3.4 4.6M16.5 6.5h3c0 2.6-1.4 4.3-3.4 4.6M12 14v3.5M8.5 20h7M9.5 17.5h5" />
  </Base>
);
export const IconTimer = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 10v3.5l2.3 1.6M9.5 3.5h5M18.5 7.2l1.3-1.3" />
  </Base>
);
export const IconCopy = (p: IconProps) => (
  <Base {...p}>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </Base>
);
export const IconShare = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 15V4M8 7.5 12 3.5l4 4M6 11.5v6.5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6.5" />
  </Base>
);
export const IconCheck = (p: IconProps) => (
  <Base {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Base>
);
export const IconClose = (p: IconProps) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);
export const IconPlus = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);
export const IconSparkle = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3.5c.6 4.3 2.4 6.3 6.5 7-4.1.7-5.9 2.7-6.5 7-.6-4.3-2.4-6.3-6.5-7 4.1-.7 5.9-2.7 6.5-7Z" fill="currentColor" fillOpacity=".2" />
    <path d="M19 3v3M17.5 4.5h3" />
  </Base>
);
export const IconVolume = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3v-5Z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Base>
);
export const IconMute = (p: IconProps) => (
  <Base {...p}>
    <path d="M4.5 9.5h3l4.5-4v13l-4.5-4h-3v-5Z" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Base>
);
export const IconLogOut = (p: IconProps) => (
  <Base {...p}>
    <path d="M14 4.5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h7M10.5 12H20M16.5 8.5 20 12l-3.5 3.5" />
  </Base>
);
export const IconArrowRight = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 12h14M13.5 6.5 19 12l-5.5 5.5" />
  </Base>
);
export const IconChat = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v6.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 2.5Z" />
    <path d="M9 9.5h6M9 12.5h3.5" />
  </Base>
);
export const IconBook = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 5.5A2 2 0 0 1 7 3.5h11.5v14H7a2 2 0 0 0-2 2v-14Z" />
    <path d="M5 19.5a2 2 0 0 0 2 2h11.5v-4" />
  </Base>
);
export const IconChart = (p: IconProps) => (
  <Base {...p}>
    <path d="M5 19.5v-6M10 19.5v-11M15 19.5v-8M20 19.5V5" />
  </Base>
);
export const IconUser = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.5 20c.9-3.6 3.9-5.8 7.5-5.8s6.6 2.2 7.5 5.8" />
  </Base>
);
/** A stack of cards sliding off a row — "take the row". */
export const IconTakeRow = (p: IconProps) => (
  <Base {...p}>
    <rect x="3.5" y="6" width="6" height="8.5" rx="1.4" />
    <rect x="7.5" y="5" width="6" height="8.5" rx="1.4" />
    <path d="M13 17.5h7.5M17.5 14.5l3 3-3 3" />
  </Base>
);
/** A small card dipping below a line — "your card is lower than every row". */
export const IconLowCard = (p: IconProps) => (
  <Base {...p}>
    <path d="M3.5 8.5h17" strokeDasharray="2 2.5" />
    <rect x="8.5" y="11" width="7" height="9.5" rx="1.5" />
    <path d="M12 3.5v4M10 5.5l2 2 2-2" />
  </Base>
);
export const IconGoogle = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="currentColor" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.6 2.3 12S6.6 21.8 12 21.8c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.7H12Z" />
  </svg>
);
export const IconMusic = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 18V5.5l10-2v12.5" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </Base>
);
export const IconMusicOff = (p: IconProps) => (
  <Base {...p}>
    <path d="M9 18V9M9 5.5l10-2v9" />
    <circle cx="6.5" cy="18" r="2.5" />
    <path d="M3.5 3.5l17 17" />
  </Base>
);
export const IconSmile = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M9 9.5h.01M15 9.5h.01" />
  </Base>
);
export const IconSettings = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="10" cy="17" r="2.2" />
  </Base>
);

export const IconPencil = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Base>
);
