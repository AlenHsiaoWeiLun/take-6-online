import clsx from 'clsx';
import type { CSSProperties } from 'react';
import type { Card } from '@take6/shared';
import { Bullhead } from '../art/icons';
import { artUrl } from '../art/Art';
import { BullMark } from '../art/BullMark';

const cardbackArt = artUrl('texture-cardback');

interface Props {
  card: Card;
  theme?: string;
  width?: number | string;
  className?: string;
  style?: CSSProperties;
}

/** Face of a numbered card. Band colour encodes the penalty: 1 · 2 · 3 · 5 · 7 bullheads. */
export function GameCard({ card, theme = 'classic', width, className, style }: Props) {
  const w = typeof width === 'number' ? `${width}px` : width;
  const pip = card.bullheads >= 5 ? '17cqi' : '19cqi';
  return (
    <div
      className={clsx('card', className)}
      data-bulls={card.bullheads}
      data-theme={theme}
      style={{ ...(w ? ({ '--w': w } as CSSProperties) : {}), ...style }}
      aria-label={`${card.value}, ${card.bullheads} bullhead${card.bullheads > 1 ? 's' : ''}`}
    >
      <div className="band">
        <span className="pips">
          {Array.from({ length: Math.min(card.bullheads, 7) }).map((_, i) => (
            <Bullhead key={i} style={{ width: pip, height: pip, flexShrink: 1, minWidth: 0 }} />
          ))}
        </span>
        {/* Small cards: one head + the count, so the value never needs counting. */}
        <span className="pipcount">
          <Bullhead style={{ width: '22cqi', height: '22cqi' }} />
          {card.bullheads > 1 && <b>{card.bullheads}</b>}
        </span>
      </div>
      <div className="idx">{card.value}</div>
      <div className="num">{card.value}</div>
    </div>
  );
}

export function CardBack({ theme = 'classic', width, className }: { theme?: string; width?: number | string; className?: string }) {
  const w = typeof width === 'number' ? `${width}px` : width;
  return (
    <div className={clsx('card-back grid place-items-center overflow-hidden', className)} data-theme={theme} style={w ? ({ '--w': w } as CSSProperties) : undefined}>
      {theme === 'classic' && cardbackArt ? (
        <img src={cardbackArt} alt="" className="size-full object-cover" draggable={false} />
      ) : (
        <BullMark size="58%" palette={theme === 'midnight' || theme === 'gilded' ? 'ink' : 'mono'} />
      )}
    </div>
  );
}
