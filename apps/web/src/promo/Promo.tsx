/**
 * 20-second vertical trailer, rendered from the real game pieces (cards, bullheads, avatars, logo).
 * Everything on screen is a pure function of `t`, and the soundtrack in track.ts is written against
 * the same clock (120 BPM), so every landing, word and impact sits on a beat.
 *
 *   /promo            preview with sound (click to play)
 *   /promo?capture=1  frame-by-frame capture driven by scripts (window.__promo.setT / renderWav)
 *
 * Dev-only: the route is registered behind import.meta.env.DEV.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { makeCard } from '@take6/shared';
import { CardBack, GameCard } from '../components/GameCard';
import { Avatar } from '../components/Avatar';
import { BullMark } from '../art/BullMark';
import { Bullhead } from '../art/icons';
import { DURATION, renderWav, scheduleTrack } from './track';

// ------------------------------------------------------------------ math
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
const outCubic = (p: number) => 1 - (1 - p) ** 3;
const inCubic = (p: number) => p ** 3;
const inOut = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);
const outBack = (p: number, s = 1.9) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2;
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** A hit that decays over `dur` seconds. */
const hit = (t: number, at: number, dur: number) => (t >= at && t < at + dur ? (1 - (t - at) / dur) ** 2 : 0);
/** Pulse on every beat (or subdivision) after `from`. */
const beatPulse = (t: number, from: number, step = 0.5, until = 99) => (t >= from && t < until ? Math.exp(-((t - from) % step) * 9) : 0);

// ------------------------------------------------------------------ layout (stage is 540 × 960, captured at 2×)
const SW = 540;
const SH = 960;
const W = 60;
const H = W * 1.4;
const SEAT_W = 52;
const slot = (r: number, i: number) => ({ x: 78 + i * 68, y: 356 + r * 98 });
const SEAT_X = [78, 206, 334, 462];
const seatCard = (s: number) => ({ x: SEAT_X[s] - SEAT_W / 2, y: 236 });
const PLAYERS = [
  { name: 'YOU', avatar: 'bruno' },
  { name: 'MAYA', avatar: 'daisy' },
  { name: 'LEO', avatar: 'nova' },
  { name: 'SAM', avatar: 'tank' },
];
const YOU = 0;

// ------------------------------------------------------------------ the script
type Key = { t: number; x: number; y: number; w: number; r?: number; o?: number; flip?: number; ease?: (p: number) => number };
type Actor = { id: string; value: number; keys: Key[]; row?: number; z?: number; scramble?: [number, number, number]; glowFrom?: number };

function sample(keys: Key[], t: number) {
  if (t <= keys[0].t) return { ...keys[0], r: keys[0].r ?? 0, o: keys[0].o ?? 1, flip: keys[0].flip ?? 0 };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const p = (b.ease ?? inOut)(prog(t, a.t, b.t));
      return {
        x: lerp(a.x, b.x, p),
        y: lerp(a.y, b.y, p),
        w: lerp(a.w, b.w, p),
        r: lerp(a.r ?? 0, b.r ?? 0, p),
        o: lerp(a.o ?? 1, b.o ?? 1, p),
        flip: lerp(a.flip ?? 0, b.flip ?? 0, p),
      };
    }
  }
  const z = keys[keys.length - 1];
  return { ...z, r: z.r ?? 0, o: z.o ?? 1, flip: z.flip ?? 0 };
}

/** Lands a card from a seat onto a board slot exactly on `at` (the beat), with a squash on impact. */
function flight(from: { x: number; y: number }, fromW: number, to: { x: number; y: number }, at: number, dur = 0.2): Key[] {
  return [
    { t: at - dur, ...from, w: fromW },
    { t: at, ...to, w: W * 1.1, ease: inCubic },
    { t: at + 0.1, ...to, w: W, ease: outCubic },
  ];
}
const centerOn = (p: { x: number; y: number }, w: number) => ({ x: p.x - (w - W) / 2, y: p.y - (w - W) * 0.7 });
const withSquash = (keys: Key[]) =>
  keys.map((k) => (k.w === W * 1.1 ? { ...k, ...centerOn({ x: k.x, y: k.y }, k.w) } : k));

const TAILS = [38, 55, 71, 89];
/** [landing time, card, row, slot, seat] — bar 3 lowest-first, then bar 4 on eighth notes. */
const PLAYS: [number, number, number, number, number][] = [
  [5.0, 42, 0, 1, 1],
  [5.25, 57, 1, 1, 2],
  [5.5, 73, 2, 1, 3],
  [5.75, 91, 3, 1, 0],
  [6.0, 44, 0, 2, 2],
  [6.25, 60, 1, 2, 3],
  [6.5, 75, 2, 2, 1],
  [6.75, 47, 0, 3, 3],
  [7.0, 93, 3, 2, 2],
  [7.25, 62, 1, 3, 1],
  [7.5, 78, 2, 3, 3],
  [7.75, 96, 3, 3, 1],
  [8.0, 49, 0, 4, 2],
];
const SIXTH = 50;
const SIXTH_AT = 10.5;
const TAKE_AT = 12.0;
const TAKEN = [38, 42, 44, 47, 49];
const PENALTY = TAKEN.reduce((n, v) => n + makeCard(v).bullheads, 0);

function buildActors(): Actor[] {
  const actors: Actor[] = [];
  const youChip = { x: SEAT_X[YOU] - 10, y: 188 };
  const sweep = (v: number, i: number, from: { x: number; y: number }): Key[] => [
    { t: TAKE_AT + i * 0.04, ...from, w: W },
    { t: TAKE_AT + i * 0.04 + 0.34, ...youChip, w: 18, r: (i % 2 ? 1 : -1) * 50, o: 0.2, ease: inCubic },
    { t: TAKE_AT + i * 0.04 + 0.36, ...youChip, w: 18, o: 0 },
  ];

  // row starters drop in on sixteenths as the board lands
  TAILS.forEach((v, r) => {
    const land = 4.0 + r * 0.125;
    const p = slot(r, 0);
    const keys: Key[] = withSquash([{ t: land - 0.14, x: p.x, y: p.y - 110, w: W, o: 0 }, { t: land, ...p, w: W * 1.1, ease: inCubic }, { t: land + 0.1, ...p, w: W, ease: outCubic }]);
    if (r === 0) keys.push(...sweep(v, 0, p));
    actors.push({ id: `t${v}`, value: v, keys, row: r });
  });

  // bar 2: everyone picks (face scrambles, then locks face-down); bar 3: all flip at once, lowest first
  PLAYS.slice(0, 4).forEach(([at, v, r, i, s]) => {
    const pick = 2.0 + s * 0.5;
    const seat = seatCard(s);
    const keys: Key[] = [
      { t: pick - 0.01, ...seat, y: seat.y - 30, w: SEAT_W, o: 0 },
      { t: pick + 0.06, ...seat, w: SEAT_W, ease: outCubic },
      { t: pick + 0.35, ...seat, w: SEAT_W },
      { t: pick + 0.45, ...seat, w: SEAT_W, flip: 1, ease: outCubic },
      { t: 4.5 + s * 0.03, ...seat, w: SEAT_W, flip: 1 },
      { t: 4.5 + s * 0.03 + 0.2, ...seat, w: SEAT_W, flip: 0, ease: outBack },
      ...withSquash(flight(seat, SEAT_W, slot(r, i), at, 0.2)),
    ];
    if (r === 0) keys.push(...sweep(v, i, slot(r, i)));
    actors.push({ id: `p${v}`, value: v, keys, row: r, scramble: [pick + 0.05, pick + 0.35, s] });
  });

  // bar 4: cards rain in from the seats
  PLAYS.slice(4).forEach(([at, v, r, i, s]) => {
    const seat = seatCard(s);
    const keys: Key[] = [
      { t: at - 0.3, ...seat, y: seat.y + 10, w: SEAT_W * 0.6, o: 0 },
      { t: at - 0.2, ...seat, w: SEAT_W, ease: outCubic },
      ...withSquash(flight(seat, SEAT_W, slot(r, i), at, 0.2)).slice(1),
    ];
    if (r === 0) keys.push(...sweep(v, i, slot(r, i)));
    actors.push({ id: `p${v}`, value: v, keys, row: r, z: at === 8.0 ? 5 : 0 });
  });

  // the sixth card: dealt face-down to you, flips in dread, hovers, slams
  const you = seatCard(YOU);
  const s5 = slot(0, 5);
  const hover = { x: s5.x - 4, y: s5.y - 74 };
  actors.push({
    id: 'sixth',
    value: SIXTH,
    z: 20,
    glowFrom: 9.0,
    keys: [
      { t: 8.2, ...you, y: you.y - 40, w: SEAT_W, flip: 1, o: 0 },
      { t: 8.3, ...you, w: SEAT_W, flip: 1, ease: outCubic },
      { t: 9.0, ...you, w: SEAT_W, flip: 1 },
      { t: 9.22, ...you, w: SEAT_W, flip: 0, ease: outBack },
      { t: 10.0, ...you, w: SEAT_W },
      { t: 10.34, ...hover, w: W * 1.14, r: 8, ease: outCubic },
      { t: 10.42, ...hover, y: hover.y - 6, w: W * 1.14, r: -6 },
      { t: SIXTH_AT, ...centerOn(s5, W * 1.12), w: W * 1.12, r: 0, ease: inCubic },
      { t: SIXTH_AT + 0.12, ...s5, w: W, ease: outCubic },
      { t: TAKE_AT + 0.1, ...s5, w: W },
      { t: TAKE_AT + 0.42, ...slot(0, 0), w: W, ease: outCubic },
    ],
    row: 0,
  });
  return actors;
}
const ACTORS = buildActors();

/** Which cards sit in a row at time t (for the bullhead counters). */
function rowCards(r: number, t: number) {
  const out: number[] = [];
  if (t >= 4.0 + r * 0.125) out.push(TAILS[r]);
  PLAYS.forEach(([at, v, row]) => row === r && t >= at && out.push(v));
  if (r === 0 && t >= TAKE_AT) return t >= TAKE_AT + 0.42 ? [SIXTH] : [];
  return out;
}

// ------------------------------------------------------------------ captions
type WordSpec = { w: string; at: number; color?: string };
type Caption = { from: number; to: number; y: number; size: number; lines: WordSpec[][]; center?: boolean };
const RED = '#e5484d';
const CAPTIONS: Caption[] = [
  { from: 0, to: 1.85, y: 250, size: 116, lines: [[{ w: 'PICK', at: 0 }], [{ w: 'A', at: 0.25 }, { w: 'CARD.', at: 0.5, color: RED }]] },
  { from: 2.0, to: 3.9, y: 70, size: 50, lines: [[{ w: 'EVERYONE', at: 2.0 }, { w: 'PICKS', at: 2.25 }], [{ w: 'AT', at: 3.0 }, { w: 'ONCE.', at: 3.25, color: RED }]] },
  { from: 5.0, to: 5.95, y: 88, size: 50, lines: [[{ w: 'LOWEST', at: 5.0 }, { w: 'GOES', at: 5.25 }, { w: 'FIRST.', at: 5.5, color: RED }]] },
  { from: 6.0, to: 7.95, y: 88, size: 50, lines: [[{ w: 'FILL', at: 6.0 }, { w: 'THE', at: 6.5 }, { w: 'ROWS.', at: 7.0 }]] },
  { from: 8.0, to: 9.95, y: 64, size: 52, lines: [[{ w: 'FIVE', at: 8.0 }, { w: 'CARDS.', at: 8.25 }], [{ w: "DON'T", at: 9.0, color: RED }, { w: 'BE', at: 9.25, color: RED }, { w: 'SIXTH.', at: 9.5, color: RED }]] },
  { from: SIXTH_AT, to: 11.95, y: 330, size: 124, center: true, lines: [[{ w: '6TH', at: SIXTH_AT, color: RED }], [{ w: 'CARD.', at: 10.75 }]] },
  { from: TAKE_AT, to: 13.9, y: 300, size: 118, center: true, lines: [[{ w: 'TAKE', at: 12.0 }], [{ w: 'THE', at: 12.25 }], [{ w: 'ROW.', at: 12.5, color: RED }]] },
  { from: 14.0, to: 15.95, y: 64, size: 50, lines: [[{ w: 'ONE', at: 14.0 }, { w: 'WRONG', at: 14.25 }, { w: 'CARD', at: 14.5 }], [{ w: "AND IT'S", at: 15.0 }, { w: 'YOURS.', at: 15.5, color: RED }]] },
];

function Captions({ t }: { t: number }) {
  return (
    <>
      {CAPTIONS.filter((c) => t >= c.from - 0.01 && t < c.to).map((c, ci) => {
        const exit = prog(t, c.to - 0.14, c.to);
        return (
          <div
            key={ci}
            className="pointer-events-none absolute inset-x-0 z-40 text-center font-display font-extrabold uppercase"
            style={{ top: c.y, fontSize: c.size, lineHeight: 0.92, letterSpacing: '-0.03em', opacity: 1 - exit, transform: `translateY(${-exit * 30}px) scale(${1 - exit * 0.08})` }}
          >
            {c.lines.map((line, li) => (
              <div key={li} className="flex justify-center gap-[0.22em]">
                {line.map((wd) => {
                  const p = prog(t, wd.at, wd.at + 0.16);
                  const s = t < wd.at ? 0 : lerp(2.4, 1, outBack(p, 2.4)) + hit(t, wd.at, 0.25) * 0.04;
                  return (
                    <span
                      key={wd.w}
                      style={{
                        display: 'inline-block',
                        color: wd.color ?? '#f2ede6',
                        opacity: clamp(p * 5),
                        transform: `scale(${s}) rotate(${(1 - p) * -8}deg)`,
                        textShadow: c.center ? '0 6px 0 rgba(0,0,0,.55), 0 0 40px rgba(229,72,77,.45)' : '0 4px 0 rgba(0,0,0,.5)',
                        WebkitTextStroke: c.center ? '2px rgba(0,0,0,.35)' : undefined,
                      }}
                    >
                      {wd.w}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------------ particles
type Burst = { at: number; x: number; y: number; n: number; seed: number; power: number; life: number; up?: boolean };
const BURSTS: Burst[] = [
  { at: SIXTH_AT, x: slot(0, 5).x + W / 2, y: slot(0, 5).y + H / 2, n: 26, seed: 3, power: 520, life: 0.8 },
  { at: TAKE_AT, x: 270, y: 400, n: 64, seed: 11, power: 980, life: 1.7, up: true },
  { at: 14.0, x: SEAT_X[1], y: 200, n: 14, seed: 21, power: 420, life: 1.0, up: true },
  { at: 14.5, x: SEAT_X[2], y: 200, n: 18, seed: 31, power: 480, life: 1.0, up: true },
  { at: 15.0, x: SEAT_X[3], y: 200, n: 12, seed: 41, power: 420, life: 1.0, up: true },
  { at: 15.5, x: SEAT_X[0], y: 200, n: 18, seed: 51, power: 480, life: 1.0, up: true },
  { at: 16.0, x: 270, y: 300, n: 40, seed: 61, power: 820, life: 1.6, up: true },
];

function Particles({ t }: { t: number }) {
  const bits: ReactNode[] = [];
  BURSTS.forEach((b, bi) => {
    const dt = t - b.at;
    if (dt < 0 || dt > b.life) return;
    for (let i = 0; i < b.n; i++) {
      const r1 = rand(b.seed * 100 + i);
      const r2 = rand(b.seed * 100 + i + 0.5);
      const r3 = rand(b.seed * 100 + i + 0.25);
      const angle = b.up ? -Math.PI * (0.05 + 0.9 * r1) : r1 * Math.PI * 2;
      const speed = b.power * (0.35 + 0.65 * r2);
      const x = b.x + Math.cos(angle) * speed * dt;
      const y = b.y + Math.sin(angle) * speed * dt + 0.5 * 1500 * dt * dt;
      const size = 12 + r3 * 30;
      const o = 1 - prog(dt, b.life * 0.55, b.life);
      const color = r3 > 0.72 ? '#f2ede6' : r3 > 0.62 ? '#f5b942' : RED;
      bits.push(
        <span
          key={`${bi}-${i}`}
          className="absolute"
          style={{ left: x - size / 2, top: y - size / 2, color, opacity: o, transform: `rotate(${(r2 - 0.5) * 720 * dt}deg) scale(${1 - dt * 0.2})` }}
        >
          <Bullhead size={size} />
        </span>,
      );
    }
  });
  return <div className="pointer-events-none absolute inset-0 z-30">{bits}</div>;
}

// ------------------------------------------------------------------ pieces
function CardActor({ a, t }: { a: Actor; t: number }) {
  if (t < a.keys[0].t) return null;
  const k = sample(a.keys, t);
  if (k.o <= 0.01) return null;
  // Rows other than the danger row sink into the dark while the sixth card is in play.
  const dim =
    a.row === undefined || a.row === 0 || t < 8.05 ? 1 : t < TAKE_AT ? lerp(1, 0.28, prog(t, 8.05, 8.3)) : lerp(0.28, 1, prog(t, TAKE_AT, TAKE_AT + 0.3));
  const face = a.scramble && t >= a.scramble[0] && t < a.scramble[1] ? makeCard(1 + Math.floor(rand(a.scramble[2] * 50 + Math.floor(t * 32)) * 104)) : makeCard(a.value);
  const danger = a.id === 'sixth' && t >= 10.0 && t < TAKE_AT;
  const glow = a.glowFrom !== undefined && t >= a.glowFrom && t < TAKE_AT;
  return (
    <div
      className="absolute"
      style={{ left: k.x, top: k.y, zIndex: 10 + (a.z ?? 0), opacity: k.o * Math.min(1, dim), transform: `rotate(${k.r}deg)`, perspective: 700 }}
    >
      <div className="flip" style={{ transform: `rotateY(${k.flip * 180}deg)` }}>
        <div className="face">
          <GameCard
            card={face}
            width={k.w}
            style={
              danger || glow
                ? { boxShadow: `0 0 0 ${danger ? 3 : 2}px ${RED}, 0 0 ${24 + beatPulse(t, 9.0, 0.25) * 30}px rgba(229,72,77,.7), 0 18px 28px -10px rgba(0,0,0,.7)` }
                : undefined
            }
          />
        </div>
        <div className="back">
          <CardBack width={k.w} />
        </div>
      </div>
    </div>
  );
}

function Board({ t }: { t: number }) {
  const dy = t < 3.75 ? 760 : lerp(760, 0, inCubic(prog(t, 3.75, 4.0)));
  const endFade = 1 - prog(t, 16.0, 16.2) * 0.85;
  return (
    <div className="absolute" style={{ left: 24, top: 334 + dy, width: 492, height: 420, opacity: endFade }}>
      <div className="felt absolute inset-0 rounded-[26px]" />
      {[0, 1, 2, 3].map((r) => {
        const cards = rowCards(r, t);
        const pen = cards.reduce((n, v) => n + makeCard(v).bullheads, 0);
        const live = r === 0 && t >= 8.0 && t < TAKE_AT;
        const y = slot(r, 0).y - 334;
        const dim = r !== 0 && t >= 8.05 && t < TAKE_AT ? 0.3 : 1;
        return (
          <div key={r} style={{ opacity: dim }}>
            <div
              className="absolute flex flex-col items-center justify-center rounded-lg font-display font-extrabold tabular"
              style={{
                left: 12,
                top: y + 22,
                width: 34,
                height: 40,
                background: live ? RED : 'transparent',
                color: live ? '#fff' : '#aab1bf',
                transform: `scale(${1 + hit(t, 8.0, 0.3) * (r === 0 ? 0.3 : 0)})`,
              }}
            >
              <Bullhead size={11} />
              <span style={{ fontSize: 15, lineHeight: 1 }}>{pen}</span>
            </div>
            {/* sixth position: a danger zone that breathes on the sixteenths once the row is full */}
            <div
              className="absolute grid place-items-center rounded-xl"
              style={{
                left: slot(r, 5).x - 24,
                top: y,
                width: W,
                height: H,
                background: `radial-gradient(75% 65% at 50% 50%, rgba(229,72,77,${live ? 0.25 + beatPulse(t, 8.0, 0.25) * 0.35 : 0.08}), transparent 80%)`,
                color: live ? RED : 'rgba(229,72,77,.3)',
              }}
            >
              <Bullhead size={16} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Seats({ t }: { t: number }) {
  const score = (s: number) => {
    if (s === YOU) return t < 12.25 ? 0 : t < 15.5 ? Math.round(lerp(0, PENALTY, prog(t, 12.25, 13.0))) : Math.round(lerp(PENALTY, PENALTY + 7, prog(t, 15.5, 15.8)));
    const [at, add] = s === 1 ? [14.0, 5] : s === 2 ? [14.5, 11] : [15.0, 3];
    return Math.round(lerp(0, add, prog(t, at, at + 0.3)));
  };
  const pops: [number, number, string][] = [
    [TAKE_AT + 0.45, YOU, `+${PENALTY}`],
    [14.0, 1, '+5'],
    [14.5, 2, '+11'],
    [15.0, 3, '+3'],
    [15.5, YOU, '+7'],
  ];
  const laughs: [number, number, string][] = [
    [12.6, 1, '😂'],
    [12.85, 2, '🤣'],
    [13.1, 3, '😭'],
  ];
  const endFade = 1 - prog(t, 16.0, 16.2);
  return (
    <div className="absolute inset-x-0 top-0 z-20" style={{ opacity: endFade }}>
      {PLAYERS.map((p, s) => {
        const arrive = 2.0 + s * 0.5;
        if (t < arrive - 0.05) return null;
        const pIn = outBack(prog(t, arrive - 0.05, arrive + 0.12));
        const takeGlow = s === YOU && t >= TAKE_AT && t < 14 ? 1 - prog(t, 13.4, 14) : 0;
        const bump = pops.reduce((m, [at, who]) => (who === s ? Math.max(m, hit(t, at, 0.35)) : m), 0);
        return (
          <div
            key={s}
            className="absolute flex items-center gap-1.5 rounded-2xl border py-1 pl-1 pr-2.5"
            style={{
              left: SEAT_X[s] - 58,
              top: 180,
              width: 116,
              opacity: clamp(pIn * 2),
              transform: `translateY(${(1 - pIn) * -40}px) scale(${1 + bump * 0.18})`,
              borderColor: takeGlow ? RED : 'rgba(255,255,255,.1)',
              background: takeGlow ? 'rgba(229,72,77,.22)' : 'rgba(21,24,29,.9)',
              boxShadow: takeGlow ? `0 0 30px rgba(229,72,77,${0.6 * takeGlow})` : undefined,
            }}
          >
            <Avatar id={p.avatar} size={30} />
            <span className="min-w-0 leading-none">
              <span className="block text-[11px] font-extrabold tracking-wide" style={{ color: s === YOU ? '#fff' : '#d6d9e0' }}>{p.name}</span>
              <span className="mt-1 flex items-center gap-1 font-display text-[17px] font-extrabold tabular text-white">
                <Bullhead size={11} className="text-bull" /> {score(s)}
              </span>
            </span>
          </div>
        );
      })}
      {pops.map(([at, s, label]) => {
        const dt = t - at;
        if (dt < 0 || dt > 0.9) return null;
        const p = outBack(prog(dt, 0, 0.18));
        return (
          <span
            key={`${at}`}
            className="absolute flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[22px] font-extrabold text-white"
            style={{ left: SEAT_X[s] - 30, top: 150 - dt * 40, background: RED, opacity: 1 - prog(dt, 0.6, 0.9), transform: `scale(${p})`, boxShadow: '0 4px 0 #8e1f27' }}
          >
            {label} <Bullhead size={14} />
          </span>
        );
      })}
      {laughs.map(([at, s, e]) => {
        const dt = t - at;
        if (dt < 0 || dt > 1.3) return null;
        return (
          <span key={e} className="absolute text-[34px]" style={{ left: SEAT_X[s] - 17, top: 140 - dt * 70, opacity: 1 - prog(dt, 0.9, 1.3), transform: `scale(${outBack(prog(dt, 0, 0.2))}) rotate(${Math.sin(dt * 12) * 12}deg)` }}>
            {e}
          </span>
        );
      })}
      {/* your face when the row lands on you */}
      {t >= TAKE_AT + 0.3 && t < 14 && (
        <div className="absolute" style={{ left: SEAT_X[YOU] - 36, top: 92, transform: `scale(${outBack(prog(t, TAKE_AT + 0.3, TAKE_AT + 0.5))}) rotate(-8deg)`, opacity: 1 - prog(t, 13.6, 14) }}>
          <BullMark size={72} mood="shock" />
        </div>
      )}
    </div>
  );
}

function Hook({ t }: { t: number }) {
  if (t >= 2.05) return null;
  const out = prog(t, 1.75, 2.0);
  const p = prog(t, 1.0, 1.38);
  const card = makeCard(55);
  return (
    <div className="absolute inset-0" style={{ opacity: 1 - out, transform: `scale(${1 + out * 0.5})` }}>
      {t >= 1.0 && (
        <div
          className="absolute"
          style={{ left: 270 - 72, top: lerp(1000, 560, outBack(p, 1.4)), transform: `rotate(${lerp(-40, -6, outCubic(p))}deg) scale(${1 + beatPulse(t, 1.5, 0.25, 2) * 0.06})`, perspective: 900 }}
        >
          <div className="flip" style={{ transform: `rotateY(${lerp(540, 0, outCubic(p))}deg)` }}>
            <div className="face">
              <GameCard card={card} width={144} style={{ boxShadow: '0 30px 60px -20px rgba(0,0,0,.8), 0 0 60px rgba(229,72,77,.35)' }} />
            </div>
            <div className="back">
              <CardBack width={144} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EndCard({ t }: { t: number }) {
  if (t < 15.98) return null;
  const bg = prog(t, 15.98, 16.12);
  const logo = prog(t, 16.0, 16.22);
  const word = 'BULLHEADS';
  const beat = beatPulse(t, 16.5, 0.5);
  const play = prog(t, 17.5, 17.7);
  return (
    <div className="absolute inset-0 z-50" style={{ opacity: bg }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 45% at 50% 34%, rgba(229,72,77,.28), transparent 70%), #0d0f12' }} />
      {/* drifting bullheads in the background, looping upward */}
      {Array.from({ length: 22 }, (_, i) => {
        const x = rand(i + 900) * SW;
        const speed = 30 + rand(i + 950) * 50;
        const y = SH - ((((t - 16) * speed + rand(i + 990) * SH) % (SH + 60)) - 30);
        return (
          <span key={i} className="absolute text-bull" style={{ left: x, top: y, opacity: 0.1 + rand(i + 1010) * 0.1 }}>
            <Bullhead size={14 + rand(i + 1030) * 26} />
          </span>
        );
      })}
      <div className="absolute" style={{ left: 270 - 95, top: 190, transform: `scale(${lerp(2.6, 1, outBack(logo, 1.6)) + beat * 0.035}) rotate(${lerp(-24, 0, outCubic(logo))}deg)`, opacity: clamp(logo * 4) }}>
        <BullMark size={190} mood="smug" />
      </div>
      <div className="absolute inset-x-0 flex justify-center font-display text-[70px] font-extrabold tracking-tight" style={{ top: 410 }}>
        {[...word].map((ch, i) => {
          const q = prog(t, 16.1 + i * 0.03, 16.26 + i * 0.03);
          return (
            <span key={i} style={{ display: 'inline-block', opacity: clamp(q * 4), transform: `translateY(${(1 - outBack(q)) * 60}px) scale(${lerp(1.8, 1, outBack(q))})` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div className="absolute inset-x-0 text-center text-[13px] font-bold tracking-[0.5em] text-fog" style={{ top: 492, opacity: prog(t, 16.4, 16.6) }}>
        ONLINE
      </div>
      <div className="absolute inset-x-0 text-center text-[22px] font-semibold text-mist" style={{ top: 548, opacity: prog(t, 16.5, 16.7), transform: `translateY(${(1 - outCubic(prog(t, 16.5, 16.7))) * 16}px)` }}>
        The sixth-card party game.
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 612, opacity: prog(t, 17.0, 17.12), transform: `scale(${lerp(1.4, 1, outBack(prog(t, 17.0, 17.18)))})` }}>
        <span className="rounded-2xl border border-white/15 bg-white/[0.05] px-5 py-2.5 font-display text-[26px] font-extrabold tracking-tight">bullheads.vercel.app</span>
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 704, opacity: clamp(play * 4), transform: `scale(${lerp(0.3, 1, outBack(play, 2.2)) + beatPulse(t, 18.0, 0.5) * 0.07})` }}>
        <span className="rounded-[16px] bg-bull px-10 py-4 font-display text-[34px] font-extrabold tracking-tight text-white" style={{ boxShadow: `0 10px 40px -10px rgba(229,72,77,${0.6 + beatPulse(t, 18.0, 0.5) * 0.4})` }}>
          PLAY NOW
        </span>
      </div>
      <div className="absolute inset-x-0 text-center text-[15px] font-semibold text-fog" style={{ top: 820, opacity: prog(t, 18.0, 18.2) }}>
        Free · 2–10 players · No download
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ camera, shake, flashes
const SHAKES: [number, number, number][] = [
  [0, 6, 0.3],
  [0.5, 8, 0.3],
  [4.0, 7, 0.35],
  [8.0, 6, 0.3],
  [SIXTH_AT, 22, 0.55],
  [TAKE_AT, 26, 0.7],
  [14.0, 8, 0.3],
  [14.5, 9, 0.3],
  [15.0, 8, 0.3],
  [15.5, 9, 0.3],
  [16.0, 12, 0.4],
  [19.5, 6, 0.3],
];
function camera(t: number) {
  let s = 1 + prog(t, 0, 1.9) * 0.05;
  if (t >= 2) s = 1;
  const push = inOut(prog(t, 8.0, 10.42));
  const release = outBack(prog(t, TAKE_AT, TAKE_AT + 0.4), 1.4);
  const pushed = t < TAKE_AT ? push : 1 - release;
  s += pushed * 0.2 + hit(t, SIXTH_AT, 0.3) * 0.07 + hit(t, TAKE_AT, 0.35) * 0.05;
  const fx = 270;
  const fy = 390;
  let sx = 0;
  let sy = 0;
  let rot = pushed * -1.2;
  SHAKES.forEach(([at, amp, dur]) => {
    const k = hit(t, at, dur);
    if (!k) return;
    sx += amp * k * Math.sin((t - at) * 83);
    sy += amp * k * Math.cos((t - at) * 71);
    rot += amp * 0.06 * k * Math.sin((t - at) * 57);
  });
  return `translate(${fx * (1 - s) + sx}px, ${fy * (1 - s) + sy}px) scale(${s}) rotate(${rot}deg)`;
}

function Flashes({ t }: { t: number }) {
  const white = Math.max(t >= SIXTH_AT && t < SIXTH_AT + 0.034 ? 1 : 0, hit(t, SIXTH_AT + 0.034, 0.2) * 0.7, hit(t, TAKE_AT, 0.22) * 0.8, hit(t, 16.0, 0.25) * 0.7, hit(t, 4.0, 0.12) * 0.25, hit(t, 0, 0.15) * 0.4);
  const red = Math.max(hit(t, SIXTH_AT, 0.9) * 0.45, hit(t, TAKE_AT, 1.2) * 0.4);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[60]" style={{ background: 'radial-gradient(80% 60% at 50% 45%, transparent 30%, rgba(229,72,77,.9))', opacity: red }} />
      <div className="pointer-events-none absolute inset-0 z-[61] bg-white" style={{ opacity: white }} />
    </>
  );
}

export function PromoStage({ t }: { t: number }) {
  // Impact frame: two frames of negative the instant the sixth card lands.
  const negative = t >= SIXTH_AT + 0.034 && t < SIXTH_AT + 0.1;
  return (
    <div className="relative overflow-hidden" style={{ width: SW, height: SH, background: '#0d0f12' }}>
      <div className="absolute inset-0" style={{ filter: negative ? 'invert(1) hue-rotate(180deg)' : undefined }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(90% 55% at 50% 42%, rgba(229,72,77,${0.08 + prog(t, 8, 10.4) * 0.14 * (t < TAKE_AT ? 1 : 0)}), transparent 70%)` }} />
      <div className="absolute inset-0" style={{ transform: camera(t), transformOrigin: '0 0' }}>
        <Hook t={t} />
        <Board t={t} />
        <Seats t={t} />
        {ACTORS.map((a) => (
          <CardActor key={a.id} a={a} t={t} />
        ))}
        <Particles t={t} />
      </div>
      <Captions t={t} />
      <EndCard t={t} />
      </div>
      <Flashes t={t} />
    </div>
  );
}

// ------------------------------------------------------------------ page
declare global {
  interface Window {
    __promo?: { duration: number; setT: (t: number) => void; wav: () => Promise<string> };
  }
}

export default function Promo() {
  const capture = new URLSearchParams(window.location.search).has('capture');
  const [t, setT] = useState(capture ? 0 : 0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    window.__promo = {
      duration: DURATION,
      setT: (v) => flushSync(() => setT(v)),
      wav: async () => {
        const blob = await renderWav();
        const buf = new Uint8Array(await blob.arrayBuffer());
        let s = '';
        for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        return btoa(s);
      },
    };
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const play = () => {
    const ac = new AudioContext();
    const start = ac.currentTime + 0.15;
    scheduleTrack(ac, start);
    setPlaying(true);
    const tick = () => {
      const now = ac.currentTime - start;
      setT(Math.max(0, now));
      if (now < DURATION) raf.current = requestAnimationFrame(tick);
      else {
        setPlaying(false);
        void ac.close();
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const scale: CSSProperties = capture ? {} : { transform: `scale(${Math.min(window.innerHeight / SH, 1)})`, transformOrigin: 'top center' };
  return (
    <div className="fixed inset-0 z-[100] flex justify-center bg-black" onClick={() => !capture && !playing && play()}>
      <div style={scale}>
        <PromoStage t={t} />
      </div>
      {!capture && !playing && <div className="absolute bottom-6 rounded-full bg-white/10 px-4 py-2 text-sm text-white">Click to play with sound</div>}
    </div>
  );
}
