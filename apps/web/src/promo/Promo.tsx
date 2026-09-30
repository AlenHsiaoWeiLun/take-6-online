/**
 * 12.6-second vertical trailer: "Can't lose. Then your friends played."
 * Three shot sizes carry the story: confident close-up (your 50 and your bull) → the 49 flips in
 * extreme close-up and cuts to your eyes → wide shot as the whole row smacks into you and buries
 * you; your horns burst out of the pile and become the logo. Everything is a pure function of `t`,
 * and track.ts is scored against the same 120 BPM clock.
 *
 *   /promo                 preview with sound (click)      · add ?lang=zh for the Chinese cut
 *   /promo?capture=1       frame-by-frame capture driven by scripts (window.__promo)
 *
 * Dev-only: the route is registered behind import.meta.env.DEV.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
const hit = (t: number, at: number, dur: number) => (t >= at && t < at + dur ? (1 - (t - at) / dur) ** 2 : 0);
const beatPulse = (t: number, from: number, step = 0.5, until = 99) => (t >= from && t < until ? Math.exp(-((t - from) % step) * 9) : 0);
type Pt = { x: number; y: number };
const bez = (a: Pt, c: Pt, b: Pt, p: number): Pt => ({ x: (1 - p) ** 2 * a.x + 2 * (1 - p) * p * c.x + p * p * b.x, y: (1 - p) ** 2 * a.y + 2 * (1 - p) * p * c.y + p * p * b.y });

// ------------------------------------------------------------------ copy (EN / 中文)
const LANG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('lang') === 'zh' ? 'zh' : 'en';
const COPY = {
  en: {
    safe: ["CAN'T", 'LOSE.'],
    friends: ['YOUR', 'FRIENDS:'],
    math: ['YOU WERE', 'SAYING?'],
    slots: ['3RD ✓', '4TH', '5TH', '6TH'],
    you: 'YOU',
    again: 'ONE MORE ROUND.',
    sure: 'THIS TIME, FOR SURE.',
    cta: 'PLAY FREE',
    small: 'No download · Play with friends in your browser',
  },
  zh: {
    safe: ['穩贏。'],
    friends: ['你的朋友：'],
    math: ['你剛說', '穩贏？'],
    slots: ['第 3 張 ✓', '第 4 張', '第 5 張', '第 6 張'],
    you: '你',
    again: '再一局。',
    sure: '這次一定。',
    cta: '免費開玩',
    small: '免下載・開瀏覽器就能揪朋友',
  },
}[LANG];

// ------------------------------------------------------------------ layout (stage 540 × 960, captured at 2×)
const SW = 540;
const SH = 960;
const RED = '#e5484d';
const GREEN = '#4ade9b';
const W = 70;
const slotC = (i: number): Pt => ({ x: 65 + i * 82, y: 470 });
const HAND: Pt = { x: 334, y: 742 };
const STAGED: Pt = { x: 334, y: 640 };
const HOVER: Pt = { x: 452, y: 336 };
const FRIEND_X = [120, 270, 420];
const friendC = (k: number): Pt => ({ x: FRIEND_X[k], y: 256 });
const BULL: Pt = { x: 150, y: 740 };
const BULL_SIZE = 108;
const LOGO: Pt = { x: 270, y: 236 };
/** Opening close-up composition (its own layout, not a zoom of the table). */
const CU_BULL: Pt = { x: 178, y: 560 };
const CU_BULL_SCALE = 1.8;
const CU_CARD: Pt = { x: 372, y: 572 };
const cuMix = (t: number) => 1 - inOut(prog(t, 1.5, 1.78));
const LOGO_SIZE = 176;
const FRIENDS = [
  { name: 'MAYA', avatar: 'daisy', card: 44, flip: 3.0, land: 4.75, slot: 2 },
  { name: 'LEO', avatar: 'nova', card: 47, flip: 3.5, land: 4.875, slot: 3 },
  { name: 'SAM', avatar: 'tank', card: 49, flip: 4.0, land: 5.0, slot: 4 },
];
const SLAM = 6.0;
const ROW = [38, 42, 44, 47, 49];
/** The row flies at you: each card smacks into your bull and stays on the pile. */
const hitAt = (i: number) => 6.45 + i * 0.06;
const PILE: Pose[] = ROW.map((_, i) => ({ x: BULL.x - 38 + i * 19, y: BULL.y + 36 - (i % 2) * 6, w: W, r: (rand(i + 5) - 0.5) * 60 }));
const HEADS = ROW.flatMap((v, i) => Array.from({ length: makeCard(v).bullheads }, () => i));
const headArrive = (k: number) => 6.55 + k * 0.05;
const PENALTY = HEADS.length;
const BURST = 8.5;
const LOGO_AT = 9.0;
/** Where the marker says your 50 will land, pushed right by each friend's card. */
const predictedSlot = (t: number) => (t < 3.0 ? 2 : t < 3.5 ? 3 : t < 4.0 ? 4 : 5);
const SLOT_COLORS = [GREEN, '#f5b942', '#e8913a', RED];

// ------------------------------------------------------------------ cards
type Pose = { x: number; y: number; w: number; r?: number; flip?: number; o?: number; sq?: number; glow?: string };
type Key = Pose & { t: number; ease?: (p: number) => number };
function sample(keys: Key[], t: number): Pose {
  if (t <= keys[0].t) return keys[0];
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
        flip: lerp(a.flip ?? 0, b.flip ?? 0, p),
        o: lerp(a.o ?? 1, b.o ?? 1, p),
        sq: lerp(a.sq ?? 0, b.sq ?? 0, p),
      };
    }
  }
  return keys[keys.length - 1];
}

function CardView({ pose, value, z = 0, ghost = false }: { pose: Pose; value: number; z?: number; ghost?: boolean }) {
  const { x, y, w, r = 0, flip = 0, o = 1, sq = 0, glow } = pose;
  if (o <= 0.01 || w <= 1) return null;
  const h = w * 1.4;
  return (
    <div
      className="absolute"
      style={{ left: x - w / 2, top: y - h / 2, zIndex: 10 + z, opacity: o, transform: `rotate(${r}deg) scale(${1 + sq}, ${1 - sq})`, transformOrigin: '50% 100%', perspective: 800 }}
    >
      <div className="flip" style={{ transform: `rotateY(${flip * 180}deg)` }}>
        <div className="face">
          <GameCard card={makeCard(value)} width={w} style={glow ? { boxShadow: glow } : undefined} className={ghost ? 'grayscale-[.2]' : undefined} />
        </div>
        <div className="back">
          <CardBack width={w} />
        </div>
      </div>
    </div>
  );
}

/** The row's five cards: on the table, then flung at your bull, piled on it, then blown off by the horns. */
function rowCard(i: number, t: number): Pose {
  const from = i < 2 ? slotC(i) : slotC(i);
  const start = hitAt(i) - 0.28;
  if (t < start) return { ...from, w: W };
  const pile = PILE[i];
  if (t < hitAt(i)) {
    const p = inCubic(prog(t, start, hitAt(i)));
    const pt = bez(from, { x: from.x + 40, y: BULL.y - 180 }, pile, p);
    return { ...pt, w: lerp(W, W * 1.08, p), r: lerp(0, pile.r ?? 0, p) + p * 360 };
  }
  if (t < BURST) return { ...pile, sq: hit(t, hitAt(i), 0.12) * 0.12 };
  const p = prog(t, BURST, BURST + 0.45);
  const dir = (i - 2) * 160 + (rand(i + 20) - 0.5) * 120;
  return { x: pile.x + dir * outCubic(p), y: pile.y - 900 * outCubic(p) + 400 * p * p, w: W, r: (pile.r ?? 0) + p * (i % 2 ? 540 : -540), o: 1 - prog(p, 0.75, 1) };
}

function friendCard(k: number, t: number): Pose | null {
  const f = FRIENDS[k];
  const drop = 2.5 + k * 0.125;
  if (t < drop - 0.12) return null;
  const c = friendC(k);
  if (t >= hitAt(f.slot) - 0.28) return rowCard(f.slot, t);
  return sample(
    [
      { t: drop - 0.12, x: c.x, y: c.y - 90, w: 76, flip: 1, o: 0, r: -12 },
      { t: drop, ...c, w: 76, flip: 1, sq: 0.12, ease: inCubic },
      { t: drop + 0.12, ...c, w: 76, flip: 1, ease: outCubic },
      { t: f.flip - 0.16, ...c, w: 76, flip: 1 },
      { t: f.flip, ...c, w: 86, flip: 0, ease: inOut },
      { t: f.flip + 0.14, ...c, w: 76, flip: 0, ease: outBack },
      { t: f.land - 0.14, ...c, w: 76 },
      { t: f.land, ...slotC(f.slot), w: W * 1.06, sq: 0.14, ease: inCubic },
      { t: f.land + 0.1, ...slotC(f.slot), w: W, ease: outCubic },
    ],
    t,
  );
}

function yourCard(t: number): Pose {
  const bob = t < 1.5 ? Math.sin(t * Math.PI * 2) * 3 : 0;
  const keys: Key[] = [
    { t: 0, ...CU_CARD, w: 168, r: -4 },
    { t: 1.5, ...CU_CARD, w: 168, r: -4 },
    { t: 1.78, ...HAND, w: 104, r: -3, ease: inOut },
    { t: 2.1, ...HAND, w: 104, r: -3 },
    { t: 2.35, ...STAGED, w: 84, r: -5, ease: outBack },
    { t: 5.0, ...STAGED, w: 84, r: -5 },
    { t: 5.4, ...HOVER, w: 86, r: 7, ease: outCubic },
    { t: 5.72, ...HOVER, w: 86, r: 3 },
    { t: 5.9, x: HOVER.x + 4, y: HOVER.y - 26, w: 90, r: -6, ease: outCubic },
    { t: SLAM, ...slotC(5), w: W, r: 0, sq: 0.2, ease: inCubic },
    { t: SLAM + 0.08, ...slotC(5), w: W, sq: -0.07, ease: outCubic },
    { t: SLAM + 0.18, ...slotC(5), w: W, sq: 0, ease: outCubic },
    { t: 6.7, ...slotC(5), w: W },
    { t: 7.0, ...slotC(0), w: W, ease: outCubic },
  ];
  const p = sample(keys, t);
  const wobble = t >= 5.4 && t < 5.72 ? Math.sin(t * 30) * 4 : 0;
  const danger = t >= 4.0 && t < SLAM + 0.2;
  const glow = danger
    ? `0 0 0 3px ${RED}, 0 0 ${28 + beatPulse(t, 5.0, 0.125, 5.5) * 26}px rgba(229,72,77,.75), 0 18px 30px -10px rgba(0,0,0,.7)`
    : `0 0 0 2px rgba(74,222,155,${t < 4 ? 0.85 : 0}), 0 18px 30px -10px rgba(0,0,0,.7)`;
  return { ...p, y: p.y + bob, r: (p.r ?? 0) + wobble, glow, o: 1 - prog(t, BURST, BURST + 0.2) };
}

// ------------------------------------------------------------------ the projection: a ghost 50 that keeps getting pushed right
function Projection({ t, from }: { t: number; from: Pt }) {
  if (t < 1.72 || t > 4.95) return null;
  const idx = predictedSlot(t);
  const step = idx - 2;
  const color = SLOT_COLORS[step];
  const target = slotC(idx);
  const stepAt = [1.95, 3.0, 3.5, 4.0][step];
  const jump = outBack(prog(t, stepAt, stepAt + 0.16), 2.2);
  const prev = slotC(Math.max(2, idx - 1));
  const gx = step === 0 ? target.x : lerp(prev.x, target.x, outCubic(prog(t, stepAt, stepAt + 0.14)));
  const drawn = prog(t, 1.72, 1.95);
  const fade = 1 - prog(t, 4.75, 4.95);
  const glitch = t >= 4.0 && t < 4.12;
  const dots = 14;
  const ctrl = { x: (from.x + gx) / 2 + (step === 3 ? 70 : -30), y: Math.min(from.y, target.y) - 30 };
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[9]"
      style={{ opacity: fade * (glitch ? (Math.floor(t * 60) % 2 ? 0.3 : 1) : 1), transform: glitch ? `translateX(${(rand(Math.floor(t * 60)) - 0.5) * 18}px)` : undefined }}
    >
      {Array.from({ length: dots }, (_, i) => {
        const p = i / dots + ((t * 0.6) % (1 / dots));
        if (p > drawn || p > 0.9) return null;
        const pt = bez({ x: from.x, y: from.y - 60 }, ctrl, { x: gx, y: target.y + 52 }, p);
        return <span key={i} className="absolute size-[7px] rounded-full" style={{ left: pt.x - 3.5, top: pt.y - 3.5, background: color, boxShadow: `0 0 10px ${color}` }} />;
      })}
      {/* the ghost of your 50 where you think it lands */}
      <div className="absolute rounded-[10px]" style={{ left: gx - W / 2 - 3, top: target.y - W * 0.7 - 3, width: W + 6, height: W * 1.4 + 6, border: `2px dashed ${color}`, boxShadow: `0 0 26px ${color}66`, transform: `scale(${step === 0 ? outBack(prog(t, 1.95, 2.1)) : 0.9 + jump * 0.1})` }}>
        <div className="absolute inset-[3px] opacity-40">
          <GameCard card={makeCard(50)} width={W} />
        </div>
      </div>
      <span
        className="absolute whitespace-nowrap rounded-full px-2.5 py-0.5 font-display text-[15px] font-extrabold text-ink-950"
        style={{ left: gx - 36, top: target.y - W * 0.7 - 34, background: color, opacity: prog(t, 1.95, 2.02), transform: `scale(${0.6 + jump * 0.4 + hit(t, stepAt, 0.2) * 0.2})` }}
      >
        {COPY.slots[step]}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ captions
type Cap = { from: number; to: number; y: number; size: number; words: { w: string; at: number; color?: string }[]; stack?: boolean; cam?: boolean };
const CAPS: Cap[] = [
  { from: 0.25, to: 1.5, y: 64, size: LANG === 'zh' ? 120 : 86, words: COPY.safe.map((w, i) => ({ w, at: 0.25 + i * 0.25, color: i === COPY.safe.length - 1 ? GREEN : undefined })) },
  { from: 2.5, to: 3.84, y: 322, size: 50, cam: true, words: COPY.friends.map((w, i) => ({ w, at: 2.5 + i * 0.125 })) },
  { from: 7.0, to: 8.45, y: 214, size: LANG === 'zh' ? 88 : 74, stack: true, words: COPY.math.map((w, i) => ({ w, at: 7.0 + i * 0.25, color: i === COPY.math.length - 1 ? RED : undefined })) },
];
function Captions({ t, cam = false }: { t: number; cam?: boolean }) {
  return (
    <>
      {CAPS.filter((c) => !!c.cam === cam && t >= c.from - 0.01 && t < c.to).map((c, ci) => {
        const exit = prog(t, c.to - 0.12, c.to);
        return (
          <div
            key={ci}
            className={`pointer-events-none absolute inset-x-0 z-40 flex justify-center gap-x-[0.22em] font-display font-extrabold uppercase ${c.stack ? 'flex-col items-center' : 'flex-wrap'}`}
            style={{ top: c.y, fontSize: c.size, lineHeight: 0.95, letterSpacing: '-0.03em', opacity: 1 - exit, transform: `translateY(${-exit * 26}px)` }}
          >
            {c.words.map((wd) => {
              const p = prog(t, wd.at, wd.at + 0.16);
              const s = t < wd.at ? 0 : lerp(2.3, 1, outBack(p, 2.4));
              return (
                <span
                  key={wd.w}
                  style={{ display: 'inline-block', color: wd.color ?? '#f2ede6', opacity: clamp(p * 5), transform: `scale(${s}) rotate(${(1 - p) * -8}deg)`, textShadow: '0 5px 0 rgba(0,0,0,.55)' }}
                >
                  {wd.w}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ------------------------------------------------------------------ you, the friends, the score
function You({ t }: { t: number }) {
  if (t >= BURST + 0.15) return null;
  const mood = t < 4.25 ? 'smug' : 'shock';
  const nod = t < 4 ? beatPulse(t, 0, 0.5, 4) * 0.06 : 0;
  // eyes on the sixth slot while the 50 hangs over it
  const look = prog(t, 5.1, 5.3) * (1 - prog(t, 5.95, 6.05));
  const hits = ROW.reduce((m, _, i) => Math.max(m, hit(t, hitAt(i), 0.2)), 0);
  const landed = ROW.filter((_, i) => t >= hitAt(i)).length;
  const sink = landed * 2;
  const wiggle = t >= 7.4 && t < BURST ? Math.sin(t * 40) * 5 : 0;
  // the horns push the pile open
  const pop = t >= BURST ? outBack(prog(t, BURST, BURST + 0.15), 2.4) : 0;
  const score = HEADS.filter((_, k) => t >= headArrive(k)).length;
  const scorePop = HEADS.reduce((m, _, k) => Math.max(m, hit(t, headArrive(k), 0.12)), 0);
  const cu = cuMix(t);
  const at = { x: lerp(BULL.x, CU_BULL.x, cu), y: lerp(BULL.y, CU_BULL.y, cu) };
  const big = lerp(1, CU_BULL_SCALE, cu);
  return (
    <div className="absolute inset-0 z-20">
      <div
        className="absolute"
        style={{
          left: at.x - BULL_SIZE / 2,
          top: at.y - BULL_SIZE / 2 + sink - pop * 40,
          transform: `translateX(${look * 8}px) rotate(${look * 14 + wiggle + hits * -8}deg) scale(${big * (1 + nod + hits * 0.1 + pop * 0.25)}, ${big * (1 + nod - hits * 0.14 + pop * 0.25)})`,
          transformOrigin: '50% 90%',
        }}
      >
        <BullMark size={BULL_SIZE} mood={t >= BURST ? 'smug' : mood} />
      </div>
      <div
        className="absolute z-[45] flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[20px] font-extrabold tabular"
        style={{
          left: BULL.x - 52,
          top: BULL.y + 64,
          borderColor: t >= 6.5 ? RED : 'rgba(255,255,255,.12)',
          background: t >= 6.5 ? 'rgba(229,72,77,.22)' : 'rgba(21,24,29,.92)',
          opacity: (1 - prog(t, BURST, BURST + 0.15)) * (1 - cu),
          transform: `scale(${1 + scorePop * 0.18 + hit(t, 7.0, 0.3) * 0.35})`,
        }}
      >
        <span className="text-[12px] tracking-wide text-mist">{COPY.you}</span>
        <Bullhead size={15} className="text-bull" />
        {score}
      </div>
      {t >= 7.0 && t < 8.4 && (
        <span
          className="absolute z-[46] flex items-center gap-1 rounded-full px-3 py-0.5 font-display text-[40px] font-extrabold text-white"
          style={{ left: BULL.x + 50, top: BULL.y - 120 - (t - 7) * 20, background: RED, boxShadow: '0 5px 0 #8e1f27', transform: `scale(${outBack(prog(t, 7.0, 7.18), 2.6)}) rotate(-6deg)`, opacity: 1 - prog(t, 8.1, 8.4) }}
        >
          +{PENALTY} <Bullhead size={26} />
        </span>
      )}
    </div>
  );
}

function HeadStream({ t }: { t: number }) {
  if (t < hitAt(0) || t > 7.05) return null;
  const to = { x: BULL.x + 22, y: BULL.y + 78 };
  return (
    <div className="pointer-events-none absolute inset-0 z-[44]">
      {HEADS.map((c, k) => {
        const start = hitAt(c);
        const end = headArrive(k);
        if (t < start || t > end) return null;
        const p = outCubic(prog(t, start, end));
        const from = PILE[c];
        const pt = bez(from, { x: from.x + 90 - k * 8, y: from.y - 120 }, to, p);
        return (
          <span key={k} className="absolute text-bull" style={{ left: pt.x - 12, top: pt.y - 12, transform: `scale(${lerp(1.5, 0.7, p)}) rotate(${p * 360}deg)`, filter: 'drop-shadow(0 0 6px rgba(229,72,77,.8))' }}>
            <Bullhead size={24} />
          </span>
        );
      })}
    </div>
  );
}

function Friends({ t }: { t: number }) {
  if (t < 2.4 || t >= BURST + 0.3) return null;
  const laughs = ['😂', '🤣', '😆'];
  return (
    <div className="absolute inset-0 z-20" style={{ opacity: 1 - prog(t, BURST, BURST + 0.3) }}>
      {FRIENDS.map((f, k) => {
        const inP = outBack(prog(t, 2.5 + k * 0.125 - 0.1, 2.5 + k * 0.125 + 0.1));
        const laugh = t >= 7.25 ? Math.abs(Math.sin((t - 7.25) * Math.PI * 2 + k)) * 18 : 0;
        const e = 7.5 + k * 0.25;
        return (
          <div key={f.name}>
            <div
              className="absolute flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900/90 py-0.5 pl-0.5 pr-2.5"
              style={{ left: FRIEND_X[k] - 46, top: 168 - laugh, opacity: clamp(inP), transform: `scale(${inP})` }}
            >
              <Avatar id={f.avatar} size={26} />
              <span className="text-[12px] font-extrabold tracking-wide">{f.name}</span>
            </div>
            {t >= e && (
              <span className="absolute text-[40px]" style={{ left: FRIEND_X[k] - 20, top: 116 - (t - e) * 40 - laugh, transform: `scale(${outBack(prog(t, e, e + 0.2))}) rotate(${Math.sin((t - e) * 14) * 14}deg)` }}>
                {laughs[k]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ the two reveal close-ups (own compositions)
function overlayShake(t: number) {
  let x = 0;
  let y = 0;
  SHAKES.forEach(([at, amp, dur]) => {
    const k = hit(t, at, dur);
    if (k) {
      x += amp * k * Math.sin((t - at) * 83);
      y += amp * k * Math.cos((t - at) * 71);
    }
  });
  return `translate(${x}px, ${y}px)`;
}

function CloseUps({ t }: { t: number }) {
  if (t < 3.84 || t >= 4.75) return null;
  const bg = 'radial-gradient(70% 50% at 50% 45%, rgba(229,72,77,.22), transparent 70%), #0d0f12';
  if (t < 4.25) {
    // 1 · only the 49 and what it does to your card
    const flip = 1 - inOut(prog(t, 3.84, 4.0));
    const push = 1 + prog(t, 3.84, 4.25) * 0.05 + hit(t, 4.0, 0.2) * 0.08;
    const after = t >= 4.0;
    const jump = outBack(prog(t, 4.0, 4.16), 2.4);
    return (
      <div className="absolute inset-0 z-[55]" style={{ background: bg }}>
        <div className="absolute inset-0" style={{ transform: overlayShake(t) }}>
          <div className="absolute inset-x-0 flex justify-center" style={{ top: 150 }}>
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-ink-900/90 py-1 pl-1 pr-4">
              <Avatar id={FRIENDS[2].avatar} size={34} />
              <span className="text-[17px] font-extrabold tracking-wide">{FRIENDS[2].name}</span>
            </span>
          </div>
          <div className="absolute" style={{ left: 270, top: 395, transform: `translate(-50%, -50%) scale(${push})` }}>
            <CardView pose={{ x: 110, y: 154, w: 220, flip }} value={49} />
            <div style={{ width: 220, height: 308 }} />
          </div>
          <div className="absolute inset-x-0 flex items-center justify-center gap-4 font-display font-extrabold" style={{ top: 612 }}>
            <span className="rounded-full px-4 py-1 text-[34px] text-ink-950" style={{ background: SLOT_COLORS[2], opacity: after ? 0.35 : 1, transform: `scale(${after ? 0.8 : 1})` }}>
              {COPY.slots[2]}
            </span>
            {after && (
              <>
                <span className="text-[34px] text-mist" style={{ opacity: jump }}>→</span>
                <span className="rounded-full px-5 py-1.5 text-[46px] text-white" style={{ background: RED, transform: `scale(${jump})`, boxShadow: '0 0 40px rgba(229,72,77,.7)' }}>
                  {COPY.slots[3]}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
  // 2 · your face, nothing else
  const k = prog(t, 4.25, 4.75);
  return (
    <div className="absolute inset-0 z-[55]" style={{ background: bg }}>
      <div className="absolute" style={{ left: 270, top: 470, transform: `${overlayShake(t)} translate(-50%, -50%) scale(${1 + k * 0.07}) rotate(${Math.sin(t * 50) * 1.5}deg)` }}>
        <BullMark size={330} mood="shock" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ end card: your bull flies up and becomes the logo
function EndCard({ t }: { t: number }) {
  if (t < BURST + 0.1) return null;
  const bg = prog(t, BURST + 0.1, BURST + 0.4);
  const fly = inOut(prog(t, BURST + 0.15, LOGO_AT));
  const land = prog(t, LOGO_AT, LOGO_AT + 0.2);
  const from = { x: BULL.x, y: BULL.y - 40 };
  const pos = bez(from, { x: from.x + 40, y: from.y - 420 }, LOGO, fly);
  const size = lerp(BULL_SIZE * 1.25, LOGO_SIZE, fly) * (t < LOGO_AT ? 1 : 1 + hit(t, LOGO_AT, 0.25) * 0.18 + beatPulse(t, 9.5, 0.5) * 0.03);
  const word = 'BULLHEADS';
  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 45% at 50% 30%, rgba(229,72,77,.3), transparent 70%), #0d0f12', opacity: bg }} />
      {Array.from({ length: 20 }, (_, i) => {
        const x = rand(i + 900) * SW;
        const speed = 30 + rand(i + 950) * 50;
        const y = SH - ((((t - 9) * speed + rand(i + 990) * SH) % (SH + 60)) - 30);
        return (
          <span key={i} className="absolute text-bull" style={{ left: x, top: y, opacity: (0.08 + rand(i + 1010) * 0.1) * bg }}>
            <Bullhead size={14 + rand(i + 1030) * 24} />
          </span>
        );
      })}
      <div className="absolute" style={{ left: pos.x - size / 2, top: pos.y - size / 2, transform: `rotate(${Math.sin(fly * Math.PI) * -18}deg)` }}>
        <BullMark size={size} mood="smug" />
      </div>
      <div className="absolute inset-x-0 flex justify-center font-display text-[68px] font-extrabold tracking-tight" style={{ top: 340 }}>
        {[...word].map((ch, i) => {
          const q = prog(t, 9.1 + i * 0.025, 9.26 + i * 0.025);
          return (
            <span key={i} style={{ display: 'inline-block', opacity: clamp(q * 4), transform: `translateY(${(1 - outBack(q)) * 50}px) scale(${lerp(1.8, 1, outBack(q))})` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div className="absolute inset-x-0 text-center font-display font-extrabold uppercase" style={{ top: 444, fontSize: LANG === 'zh' ? 42 : 32, lineHeight: 1.12 }}>
        <div style={{ opacity: prog(t, 9.3, 9.4), transform: `scale(${lerp(1.6, 1, outBack(prog(t, 9.3, 9.46)))})` }}>{COPY.again}</div>
        <div className="text-bull" style={{ opacity: prog(t, 9.55, 9.65), transform: `scale(${lerp(1.6, 1, outBack(prog(t, 9.55, 9.71)))})` }}>
          {COPY.sure}
        </div>
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 572, opacity: prog(t, 9.8, 9.9), transform: `scale(${lerp(1.4, 1, outBack(prog(t, 9.8, 9.98)))})` }}>
        <span className="rounded-2xl border border-white/15 bg-white/[0.05] px-6 py-2.5 font-display text-[34px] font-extrabold tracking-tight">bullheads.vercel.app</span>
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 664, opacity: clamp(prog(t, 10.0, 10.1) * 4), transform: `scale(${lerp(0.4, 1, outBack(prog(t, 10.0, 10.18), 2.2)) + beatPulse(t, 10.5, 0.5) * 0.06})` }}>
        <span className="rounded-[16px] bg-bull px-10 py-3.5 font-display text-[34px] font-extrabold tracking-tight text-white" style={{ boxShadow: `0 10px 40px -10px rgba(229,72,77,${0.6 + beatPulse(t, 10.5, 0.5) * 0.4})` }}>
          {COPY.cta}
        </span>
      </div>
      <div className="absolute inset-x-0 text-center text-[19px] font-bold text-mist" style={{ top: 770, opacity: prog(t, 10.25, 10.4) }}>
        {COPY.small}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ camera: close-up → wide → extreme close-up cuts → wide
const SHAKES: [number, number, number][] = [
  [0.5, 4, 0.2],
  [3.0, 6, 0.25],
  [3.5, 7, 0.25],
  [4.0, 10, 0.3],
  [4.25, 8, 0.3],
  [4.75, 4, 0.15],
  [4.875, 4, 0.15],
  [5.0, 5, 0.15],
  [SLAM, 24, 0.5],
  ...ROW.map((_, i): [number, number, number] => [hitAt(i), 7, 0.15]),
  [7.0, 9, 0.3],
  [BURST, 12, 0.35],
  [LOGO_AT, 10, 0.3],
];
function camera(t: number) {
  let s = 1;
  let f: Pt = { x: 270, y: 560 };
  if (t < 3.84) {
    s = 1 + outBack(prog(t, 3.0, 3.16), 1.6) * 0.04 + outBack(prog(t, 3.5, 3.66), 1.6) * 0.04;
    f = { x: 300, y: 540 };
  } else if (t < 4.75) {
    s = 1.08;
    f = { x: 300, y: 540 };
  } else if (t < SLAM + 0.15) {
    // hard cut back to wide, drifting toward the hanging card
    s = 1 + inOut(prog(t, 5.0, 5.9)) * 0.08 + hit(t, SLAM, 0.3) * 0.06;
    f = { x: 380, y: 470 };
  } else if (t < BURST) {
    // wide: the row flies at you
    s = lerp(1.08, 1, outCubic(prog(t, SLAM + 0.15, 6.4))) + inOut(prog(t, 7.3, 8.4)) * 0.12;
    f = { x: t < 7.3 ? 380 : lerp(380, BULL.x + 40, inOut(prog(t, 7.3, 8.4))), y: t < 7.3 ? 470 : lerp(470, BULL.y - 20, inOut(prog(t, 7.3, 8.4))) };
  } else {
    s = lerp(1.12, 1, outCubic(prog(t, BURST, BURST + 0.3)));
    f = { x: BULL.x + 40, y: BULL.y - 20 };
  }
  let sx = 0;
  let sy = 0;
  let rot = 0;
  SHAKES.forEach(([at, amp, dur]) => {
    const k = hit(t, at, dur);
    if (!k) return;
    sx += amp * k * Math.sin((t - at) * 83);
    sy += amp * k * Math.cos((t - at) * 71);
    rot += amp * 0.05 * k * Math.sin((t - at) * 57);
  });
  return `translate(${f.x * (1 - s) + sx}px, ${f.y * (1 - s) + sy}px) scale(${s}) rotate(${rot}deg)`;
}

function Flashes({ t }: { t: number }) {
  const white = Math.max(t >= SLAM && t < SLAM + 0.034 ? 0.75 : 0, hit(t, SLAM + 0.034, 0.12) * 0.35, hit(t, LOGO_AT, 0.2) * 0.5, t >= 3.84 && t < 3.86 ? 0.5 : 0, t >= 4.25 && t < 4.267 ? 0.5 : 0);
  const red = Math.max(hit(t, SLAM, 1.0) * 0.5, t >= 4.0 && t < 4.12 ? 0.4 : 0, t >= 4.0 && t < SLAM ? 0.14 + beatPulse(t, 4.0, 0.25) * 0.08 : 0);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[60]" style={{ background: 'radial-gradient(80% 60% at 50% 45%, transparent 35%, rgba(229,72,77,.9))', opacity: red }} />
      <div className="pointer-events-none absolute inset-0 z-[61] bg-white" style={{ opacity: white }} />
    </>
  );
}

export function PromoStage({ t }: { t: number }) {
  const mine = yourCard(t);
  const calmBg = t < 4 ? 'rgba(74,222,155,.08)' : `rgba(229,72,77,${0.12 + prog(t, 4, 6) * 0.12})`;
  const tableFade = 1 - prog(t, BURST, BURST + 0.3);
  const cu = cuMix(t);
  return (
    <div className="relative overflow-hidden" style={{ width: SW, height: SH, background: '#0d0f12' }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(90% 55% at 50% 50%, ${calmBg}, transparent 70%)` }} />
      <div className="absolute inset-0" style={{ transform: camera(t), transformOrigin: '0 0' }}>
        <div style={cu > 0 ? { opacity: lerp(1, 0.28, cu), filter: `blur(${cu * 3}px)` } : undefined}>
          <div className="felt absolute rounded-[26px]" style={{ left: 14, top: 400, width: 512, height: 140, opacity: tableFade }} />
          {[2, 3, 4, 5].map((i) => (
            <div key={i} className="absolute rounded-[10px] border border-dashed border-white/[0.06]" style={{ left: slotC(i).x - W / 2, top: slotC(i).y - W * 0.7, width: W, height: W * 1.4, opacity: tableFade }} />
          ))}
          {[0, 1].map((i) => (
            <CardView key={i} pose={rowCard(i, t)} value={ROW[i]} z={30 + i} />
          ))}
        </div>
        <Projection t={t} from={mine} />
        <You t={t} />
        {FRIENDS.map((f, k) => {
          const pose = friendCard(k, t);
          return pose && <CardView key={f.card} pose={pose} value={f.card} z={t >= hitAt(f.slot) - 0.28 ? 30 + f.slot : 2 + k} />;
        })}
        <CardView pose={mine} value={50} z={20} />
        <HeadStream t={t} />
        <Friends t={t} />
        <Captions t={t} cam />
      </div>
      <CloseUps t={t} />
      <Captions t={t} />
      <EndCard t={t} />
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
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  useEffect(() => {
    window.__promo = {
      duration: DURATION,
      setT: (v) => flushSync(() => setT(v)),
      wav: async () => {
        const buf = new Uint8Array(await (await renderWav()).arrayBuffer());
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
