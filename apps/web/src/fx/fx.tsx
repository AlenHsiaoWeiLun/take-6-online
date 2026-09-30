import { useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '@take6/shared';
import { GameCard } from '../components/GameCard';
import { Bullhead } from '../art/icons';
import { Starburst } from '../art/BullMark';

/**
 * One overlay for every transient effect (flying cards, bursts, particles, emoji).
 * Components describe *where* things happen with DOM rects; the layer animates clones
 * above everything, so effects can cross layout boundaries freely.
 */

export const anchors = {
  /** Player chip elements by public player id. */
  players: new Map<string, HTMLElement>(),
  /** Card rects per board row: `prev` is the frame before the latest render. */
  rows: { prev: new Map<number, RectCard[]>(), cur: new Map<number, RectCard[]>() },
};

export interface RectCard {
  card: Card;
  rect: DOMRect;
}

type Effect =
  | { id: number; kind: 'cards'; cards: RectCard[]; to: DOMRect; theme: string }
  | { id: number; kind: 'token'; from: DOMRect; to: DOMRect; text: string; big: boolean }
  | { id: number; kind: 'burst'; x: number; y: number; text: string; color: string; big: boolean }
  | { id: number; kind: 'particles'; x: number; y: number; colors: string[]; count: number; spread: number; shape: 'dot' | 'bull' | 'star' }
  | { id: number; kind: 'emoji'; x: number; y: number; emoji: string; image: string | null };

let effects: Effect[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

type NewEffect = Effect extends infer E ? (E extends Effect ? Omit<E, 'id'> : never) : never;

function add(effect: NewEffect, ttl: number, delay = 0) {
  const run = () => {
    const id = nextId++;
    effects = [...effects, { ...effect, id } as Effect];
    emit();
    setTimeout(() => {
      effects = effects.filter((e) => e.id !== id);
      emit();
    }, ttl);
  };
  if (delay) setTimeout(run, delay);
  else run();
}

const center = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const fx = {
  /** Swept cards travel into a player's chip — the whole row physically goes to whoever took it. */
  flyCards(cards: RectCard[], to: DOMRect, theme: string) {
    if (!cards.length || reduced()) return;
    add({ kind: 'cards', cards, to, theme }, 1400);
  },
  /** The penalty count rides from the row to the player's score. */
  token(from: DOMRect, to: DOMRect, text: string, big = false, delay = 0) {
    add({ kind: 'token', from, to, text, big }, 1300, delay);
  },
  burst(at: DOMRect, text: string, color: string, big = false, delay = 0) {
    const c = center(at);
    add({ kind: 'burst', x: c.x, y: at.top, text, color, big }, 1500, delay);
  },
  particles(at: DOMRect, opts: { colors: string[]; count?: number; spread?: number; shape?: 'dot' | 'bull' | 'star'; delay?: number }) {
    if (reduced()) return;
    const c = center(at);
    add({ kind: 'particles', x: c.x, y: c.y, colors: opts.colors, count: opts.count ?? 12, spread: opts.spread ?? 90, shape: opts.shape ?? 'dot' }, 1300, opts.delay);
  },
  emoji(at: DOMRect, emoji: string, image: string | null = null) {
    const c = center(at);
    add({ kind: 'emoji', x: c.x, y: at.top, emoji, image }, 2200);
  },
  shake(strength: 'soft' | 'hard' = 'soft') {
    if (reduced()) return;
    const el = document.getElementById('shake-root');
    if (!el) return;
    el.classList.remove('shake-soft', 'shake-hard');
    void el.offsetWidth; // restart the animation
    el.classList.add(strength === 'hard' ? 'shake-hard' : 'shake-soft');
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export function FxLayer() {
  const list = useSyncExternalStore(subscribe, () => effects, () => effects);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      {list.map((e) => {
        switch (e.kind) {
          case 'cards':
            return <FlyingCards key={e.id} effect={e} />;
          case 'token':
            return <Token key={e.id} effect={e} />;
          case 'burst':
            return <Burst key={e.id} effect={e} />;
          case 'particles':
            return <Particles key={e.id} effect={e} />;
          case 'emoji':
            return <FloatingEmoji key={e.id} effect={e} />;
        }
      })}
    </div>
  );
}

function FlyingCards({ effect }: { effect: Extract<Effect, { kind: 'cards' }> }) {
  const target = center(effect.to);
  return (
    <>
      {effect.cards.map(({ card, rect }, i) => {
        const from = center(rect);
        const spin = (i % 2 ? 1 : -1) * (20 + i * 9);
        return (
          <motion.div
            key={card.value}
            className="absolute"
            style={{ left: rect.left, top: rect.top, width: rect.width, filter: 'drop-shadow(0 10px 12px rgb(0 0 0 / .45))' }}
            initial={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            animate={{
              x: [0, (target.x - from.x) * 0.35, target.x - from.x],
              y: [0, -60 - i * 8, target.y - from.y],
              scale: [1, 1.08, 0.22],
              rotate: [0, spin * 0.4, spin],
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.7, delay: i * 0.06, ease: [0.5, 0, 0.75, 0.3], times: [0, 0.35, 1] }}
          >
            <GameCard card={card} theme={effect.theme} width={rect.width} />
          </motion.div>
        );
      })}
    </>
  );
}

function Token({ effect }: { effect: Extract<Effect, { kind: 'token' }> }) {
  const from = center(effect.from);
  const to = center(effect.to);
  return (
    <motion.div
      className="absolute"
      style={{ left: from.x, top: from.y }}
      initial={{ x: '-50%', y: '-50%', scale: 0.6, opacity: 0 }}
      animate={{
        x: ['-50%', `calc(-50% + ${(to.x - from.x) * 0.5}px)`, `calc(-50% + ${to.x - from.x}px)`],
        y: ['-50%', `calc(-50% + ${(to.y - from.y) * 0.5 - 70}px)`, `calc(-50% + ${to.y - from.y}px)`],
        scale: [0.6, effect.big ? 1.45 : 1.2, 0.7],
        opacity: [0, 1, 1],
      }}
      transition={{ duration: 0.8, ease: [0.45, 0, 0.55, 1], times: [0, 0.45, 1] }}
    >
      <span
        className="flex items-center gap-1 whitespace-nowrap rounded-full bg-bull px-3 py-1 font-display font-extrabold text-white"
        style={{ fontSize: effect.big ? 24 : 18, boxShadow: '0 4px 0 #8e1f27, 0 12px 20px -8px rgb(0 0 0 / .6)' }}
      >
        {effect.text} <Bullhead size={effect.big ? 20 : 15} />
      </span>
    </motion.div>
  );
}

function Burst({ effect }: { effect: Extract<Effect, { kind: 'burst' }> }) {
  return (
    <motion.div
      className="absolute -translate-x-1/2 whitespace-nowrap"
      style={{ left: effect.x, top: effect.y }}
      initial={{ y: 0, scale: 0.3, opacity: 0 }}
      animate={{ y: effect.big ? -70 : -48, scale: [0.3, effect.big ? 1.6 : 1.25, 1], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.3, times: [0, 0.2, 0.75, 1], ease: 'easeOut' }}
    >
      {effect.big && (
        <motion.span
          className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
          initial={{ rotate: -30, scale: 0.4 }}
          animate={{ rotate: 20, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        >
          <Starburst size={130} color="#E5484D" />
        </motion.span>
      )}
      <span
        className="flex items-center gap-1 rounded-full px-3 py-1 font-display font-extrabold text-white shadow-xl"
        style={{
          background: effect.color,
          fontSize: effect.big ? 26 : 18,
          boxShadow: `0 6px 0 rgb(0 0 0 / .25), 0 0 24px ${effect.color}`,
        }}
      >
        {effect.text} <Bullhead size={effect.big ? 22 : 16} />
      </span>
    </motion.div>
  );
}

function Particles({ effect }: { effect: Extract<Effect, { kind: 'particles' }> }) {
  return (
    <>
      {Array.from({ length: effect.count }, (_, i) => {
        const angle = (i / effect.count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = effect.spread * (0.55 + Math.random() * 0.6);
        const color = effect.colors[i % effect.colors.length];
        const size = effect.shape === 'dot' ? 5 + Math.random() * 6 : 12 + Math.random() * 8;
        return (
          <motion.span
            key={i}
            className="absolute"
            style={{ left: effect.x, top: effect.y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, color }}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 }}
            animate={{
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist + 30,
              scale: [0.4, 1.2, 0.6],
              opacity: [1, 1, 0],
              rotate: (Math.random() - 0.5) * 360,
            }}
            transition={{ duration: 0.8 + Math.random() * 0.4, ease: 'easeOut' }}
          >
            {effect.shape === 'bull' ? (
              <Bullhead size={size} />
            ) : effect.shape === 'star' ? (
              <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor"><path d="M12 2l2.9 6.5 7.1.7-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.7Z" /></svg>
            ) : (
              <span className="block size-full rounded-full" style={{ background: color }} />
            )}
          </motion.span>
        );
      })}
    </>
  );
}

function FloatingEmoji({ effect }: { effect: Extract<Effect, { kind: 'emoji' }> }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute select-none"
          style={{ left: effect.x, top: effect.y, fontSize: i === 0 ? 44 : 24, marginLeft: i === 0 ? -22 : -12 }}
          initial={{ y: 0, x: 0, scale: 0.3, opacity: 0 }}
          animate={{
            y: i === 0 ? -130 : -90 - i * 20,
            x: i === 0 ? [0, -10, 10, 0] : (i === 1 ? -1 : 1) * 36,
            scale: i === 0 ? [0.3, 1.4, 1.1, 1] : [0.3, 1, 0.8],
            opacity: [0, 1, 1, 0],
            rotate: i === 0 ? [0, -12, 12, 0] : 0,
          }}
          transition={{ duration: i === 0 ? 1.9 : 1.4, delay: i * 0.12, ease: 'easeOut' }}
        >
          {effect.image ? <img src={effect.image} alt="" className="block" style={{ width: i === 0 ? 64 : 34 }} draggable={false} /> : effect.emoji}
        </motion.span>
      ))}
    </>
  );
}
