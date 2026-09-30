import { useId } from 'react';
import { CHARACTERS, type Character } from '@take6/shared';

/**
 * Vector fallback for the character portraits. Every character shares one head
 * rig; palette and accessory make each one distinct. Replaced by generated art
 * (see scripts/generate-art.mjs) when available.
 */
export function BullPortrait({ character, framed = true }: { character: Character; framed?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const { hide, snout, horn, accent } = character.colors;
  const dark = shade(hide, -0.28);
  const eyesHidden = character.accessory === 'visor';

  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" role="img" aria-label={character.name}>
      <defs>
        <radialGradient id={`bg${uid}`} cx="50%" cy="30%" r="75%">
          <stop offset="0" stopColor={shade(accent, 0.35)} />
          <stop offset="1" stopColor={shade(accent, -0.25)} />
        </radialGradient>
        <linearGradient id={`hide${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(hide, 0.12)} />
          <stop offset="1" stopColor={shade(hide, -0.1)} />
        </linearGradient>
        <linearGradient id={`horn${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={horn} />
          <stop offset="1" stopColor={shade(horn, -0.22)} />
        </linearGradient>
        <clipPath id={`clip${uid}`}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>

      <g clipPath={framed ? `url(#clip${uid})` : undefined}>
        {framed && <circle cx="60" cy="60" r="60" fill={`url(#bg${uid})`} />}
        {framed && <circle cx="92" cy="22" r="28" fill="white" opacity=".08" />}

        {character.accessory === 'scarf' && <path d="M26 108c10-8 58-8 68 0v14H26Z" fill={accent} />}

        {/* horns */}
        <path d="M34 42c-14-1-22-11-21-25 6 9 13 13 24 14Z" fill={`url(#horn${uid})`} />
        <path d="M86 42c14-1 22-11 21-25-6 9-13 13-24 14Z" fill={`url(#horn${uid})`} />

        {/* ears */}
        <ellipse cx="24" cy="54" rx="11" ry="6.5" transform="rotate(-24 24 54)" fill={dark} />
        <ellipse cx="96" cy="54" rx="11" ry="6.5" transform="rotate(24 96 54)" fill={dark} />
        <ellipse cx="25" cy="54" rx="6" ry="3" transform="rotate(-24 25 54)" fill={snout} opacity=".7" />
        <ellipse cx="95" cy="54" rx="6" ry="3" transform="rotate(24 95 54)" fill={snout} opacity=".7" />

        {/* head */}
        <path d="M33 44c0-15 54-15 54 0l3 30c1 20-13 34-30 34S29 94 30 74Z" fill={`url(#hide${uid})`} />
        <path d="M50 30c4-5 16-5 20 0-3 5-7 8-10 8s-7-3-10-8Z" fill={dark} />

        {/* face */}
        {!eyesHidden && (
          <g>
            <ellipse cx="47" cy="61" rx="5.2" ry="6" fill="#1a1a22" />
            <ellipse cx="73" cy="61" rx="5.2" ry="6" fill="#1a1a22" />
            <circle cx="48.8" cy="58.8" r="1.9" fill="white" />
            <circle cx="74.8" cy="58.8" r="1.9" fill="white" />
          </g>
        )}
        <ellipse cx="40" cy="73" rx="5" ry="3" fill="#ff8a8a" opacity=".35" />
        <ellipse cx="80" cy="73" rx="5" ry="3" fill="#ff8a8a" opacity=".35" />
        <ellipse cx="60" cy="87" rx="23" ry="15" fill={snout} />
        <ellipse cx="51" cy="86" rx="3.4" ry="4.4" fill={shade(snout, -0.4)} />
        <ellipse cx="69" cy="86" rx="3.4" ry="4.4" fill={shade(snout, -0.4)} />
        <path d="M53 96c4 3 10 3 14 0" stroke={shade(snout, -0.45)} strokeWidth="2" fill="none" strokeLinecap="round" />

        <Accessory kind={character.accessory} accent={accent} uid={uid} />
      </g>
    </svg>
  );
}

function Accessory({ kind, accent, uid }: { kind: Character['accessory']; accent: string; uid: string }) {
  switch (kind) {
    case 'ring':
      return <circle cx="60" cy="99" r="6" fill="none" stroke="#f5c95a" strokeWidth="2.6" />;
    case 'flower':
      return (
        <g transform="translate(88 38)">
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-7" rx="4.2" ry="6.5" fill="white" transform={`rotate(${a})`} />
          ))}
          <circle r="4" fill={accent} />
        </g>
      );
    case 'bandana':
      return (
        <g>
          <path d="M31 42c10-6 48-6 58 0l-1 8c-12-5-44-5-56 0Z" fill={accent} />
          <path d="M86 44l12-4-4 10Z" fill={shade(accent, -0.2)} />
          {[42, 52, 62, 72].map((x) => (
            <circle key={x} cx={x} cy="45" r="1.2" fill="white" opacity=".8" />
          ))}
        </g>
      );
    case 'glasses':
      return (
        <g fill="none" stroke="#f3efe6" strokeWidth="2.4">
          <circle cx="47" cy="61" r="9" />
          <circle cx="73" cy="61" r="9" />
          <path d="M56 61h8" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M44 30l4-14 6 8 6-11 6 11 6-8 4 14Z" fill="#f5c95a" stroke="#b8860b" strokeWidth="1.2" strokeLinejoin="round" />
          <circle cx="60" cy="24" r="2.2" fill="#e5484d" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M26 58c0-30 68-30 68 0" fill="none" stroke="#1f2a44" strokeWidth="5" strokeLinecap="round" />
          <rect x="18" y="52" width="12" height="18" rx="5" fill={accent === '#1F2A44' ? '#e5484d' : accent} />
          <rect x="90" y="52" width="12" height="18" rx="5" fill={accent === '#1F2A44' ? '#e5484d' : accent} />
        </g>
      );
    case 'star':
      return (
        <path
          d="M82 70l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z"
          fill={accent}
          stroke="white"
          strokeWidth="1"
        />
      );
    case 'visor':
      return (
        <g>
          <defs>
            <linearGradient id={`visor${uid}`} x1="0" x2="1">
              <stop offset="0" stopColor="#5ac8fa" />
              <stop offset="1" stopColor={accent} />
            </linearGradient>
          </defs>
          <rect x="33" y="53" width="54" height="15" rx="7.5" fill={`url(#visor${uid})`} />
          <rect x="38" y="56" width="20" height="3" rx="1.5" fill="white" opacity=".6" />
        </g>
      );
    default:
      return null;
  }
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour. */
function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

export const characterById = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
