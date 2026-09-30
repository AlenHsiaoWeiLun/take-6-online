/**
 * 18-second vertical trailer: "You did the math. Then your friends played."
 * The first half is calm and precise (green path, tidy easing); once the friends' cards turn over the
 * order breaks (red path, glitch, shakes). Everything is a pure function of `t`, and track.ts is
 * scored against the same 120 BPM clock, so every landing, flip and word sits on a beat.
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
    safe: ['NAILED', 'IT.'],
    friends: ['YOUR', 'FRIENDS:'],
    math: ['SO MUCH', 'FOR MATH.'],
    third: '3RD',
    sixth: '6TH',
    play: 'PLAY 50',
    you: 'YOU',
    again: 'ONE MORE ROUND.',
    sure: 'THIS TIME, FOR SURE.',
    small: 'Free · No download · Play with friends',
  },
  zh: {
    safe: ['穩了。'],
    friends: ['你的朋友：'],
    math: ['算到', '自己了。'],
    third: '第 3 張',
    sixth: '第 6 張',
    play: '出牌 50',
    you: '你',
    again: '再一局。',
    sure: '這次一定。',
    small: '免下載・揪朋友開一局',
  },
}[LANG];

// ------------------------------------------------------------------ layout (stage 540 × 960, captured at 2×)
const SW = 540;
const SH = 960;
const RED = '#e5484d';
const GREEN = '#4ade9b';
const W = 70;
const slotC = (i: number): Pt => ({ x: 65 + i * 82, y: 470 });
const HAND: Pt = { x: 330, y: 742 };
const STAGED: Pt = { x: 330, y: 632 };
const HOVER: Pt = { x: 452, y: 332 };
const FRIEND_X = [120, 270, 420];
const friendC = (k: number): Pt => ({ x: FRIEND_X[k], y: 256 });
const BULL: Pt = { x: 112, y: 736 };
const FRIENDS = [
  { name: 'MAYA', avatar: 'daisy', card: 44, flip: 6.0, land: 8.0, slot: 2 },
  { name: 'LEO', avatar: 'nova', card: 47, flip: 6.5, land: 8.25, slot: 3 },
  { name: 'SAM', avatar: 'tank', card: 49, flip: 7.0, land: 8.5, slot: 4 },
];
const SLAM = 10.0;
const VAC = 10.2;
/** Row order before the take: 38, 42, then the friends' 44, 47, 49. */
const ROW = [38, 42, 44, 47, 49];
const vacStart = (i: number) => VAC + i * 0.045;
const VAC_DUR = 0.35;
/** Each bullhead on the swallowed cards flies into your score; the last lands on the 11.0 beat. */
const HEADS = ROW.flatMap((v, i) => Array.from({ length: makeCard(v).bullheads }, () => i));
const headArrive = (k: number) => 10.55 + k * 0.05;
const PENALTY = HEADS.length;

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
/** Swallowed by the vacuum: spirals into your bull, shrinking and spinning. */
function vacuum(from: Pt, t: number, start: number): Pose | null {
  if (t < start) return null;
  const p = prog(t, start, start + VAC_DUR);
  if (p >= 1) return { x: BULL.x, y: BULL.y, w: 0, o: 0 };
  const e = inCubic(p);
  const base = bez(from, { x: from.x - 30, y: BULL.y + 40 }, BULL, e);
  const a = p * Math.PI * 3;
  const rad = (1 - e) * 36;
  return { x: base.x + Math.cos(a) * rad, y: base.y + Math.sin(a) * rad, w: lerp(W, 14, e), r: p * 540, o: 1 - prog(p, 0.8, 1) };
}

function CardView({ pose, value, z = 0, face = true }: { pose: Pose; value: number; z?: number; face?: boolean }) {
  const { x, y, w, r = 0, flip = 0, o = 1, sq = 0, glow } = pose;
  if (o <= 0.01 || w <= 1) return null;
  const h = w * 1.4;
  return (
    <div
      className="absolute"
      style={{ left: x - w / 2, top: y - h / 2, zIndex: 10 + z, opacity: o, transform: `rotate(${r}deg) scale(${1 + sq}, ${1 - sq})`, transformOrigin: '50% 100%', perspective: 800 }}
    >
      <div className="flip" style={{ transform: `rotateY(${flip * 180}deg)` }}>
        <div className="face">{face && <GameCard card={makeCard(value)} width={w} style={glow ? { boxShadow: glow } : undefined} />}</div>
        <div className="back">
          <CardBack width={w} />
        </div>
      </div>
    </div>
  );
}

function yourCard(t: number): Pose {
  const bob = t < 4 ? Math.sin(t * Math.PI) * 4 : 0;
  const glowRed = `0 0 0 3px ${RED}, 0 0 ${28 + beatPulse(t, 8.75, 0.25) * 26}px rgba(229,72,77,.75), 0 18px 30px -10px rgba(0,0,0,.7)`;
  const keys: Key[] = [
    { t: 0, ...HAND, w: 104, r: -3 },
    { t: 4.0, ...HAND, w: 104, r: -3 },
    { t: 4.3, ...STAGED, w: 84, r: -5, ease: outBack },
    { t: 8.6, ...STAGED, w: 84, r: -5 },
    { t: 8.95, ...HOVER, w: 84, r: 7, ease: outCubic },
    { t: 9.78, ...HOVER, w: 84, r: 4 },
    { t: 9.92, x: HOVER.x + 4, y: HOVER.y - 24, w: 88, r: -6, ease: outCubic },
    { t: SLAM, ...slotC(5), w: W, r: 0, sq: 0.2, ease: inCubic },
    { t: SLAM + 0.08, ...slotC(5), w: W, sq: -0.07, ease: outCubic },
    { t: SLAM + 0.18, ...slotC(5), w: W, sq: 0, ease: outCubic },
    { t: 10.6, ...slotC(5), w: W },
    { t: 10.9, ...slotC(0), w: W, ease: outCubic },
    { t: 14.9, ...slotC(0), w: W },
  ];
  const p = sample(keys, t);
  const wobble = t >= 8.95 && t < 9.78 ? Math.sin(t * 24) * 4 : 0;
  const glow = t >= 7.0 && t < SLAM + 0.2 ? glowRed : t < 7 ? `0 0 0 2px rgba(74,222,155,${t >= 2 ? 0.8 : 0}), 0 18px 30px -10px rgba(0,0,0,.7)` : undefined;
  return { ...p, y: p.y + bob, r: (p.r ?? 0) + wobble, glow, o: 1 - prog(t, 14.9, 15.0) };
}

function friendCard(k: number, t: number): Pose {
  const f = FRIENDS[k];
  const drop = 4.5 + k * 0.125;
  const c = friendC(k);
  const target = slotC(f.slot);
  const vac = vacuum(target, t, vacStart(f.slot));
  if (vac) return vac;
  return sample(
    [
      { t: drop - 0.12, x: c.x, y: c.y - 90, w: 76, flip: 1, o: 0, r: -12 },
      { t: drop, ...c, w: 76, flip: 1, sq: 0.12, ease: inCubic },
      { t: drop + 0.12, ...c, w: 76, flip: 1, ease: outCubic },
      { t: f.flip - 0.16, ...c, w: 76, flip: 1 },
      { t: f.flip, ...c, w: 84, flip: 0, ease: inOut },
      { t: f.flip + 0.14, ...c, w: 76, flip: 0, ease: outBack },
      { t: f.land - 0.2, ...c, w: 76 },
      { t: f.land, ...target, w: W * 1.06, sq: 0.14, ease: inCubic },
      { t: f.land + 0.12, ...target, w: W, ease: outCubic },
    ],
    t,
  );
}

function rowCard(i: number, t: number): Pose {
  const p = slotC(i);
  return vacuum(p, t, vacStart(i)) ?? { ...p, w: W };
}

// ------------------------------------------------------------------ the prediction: path + ghost slot
function Prediction({ t, from }: { t: number; from: Pt }) {
  if (t < 2.0 || t > 8.25) return null;
  const red = t >= 7.0;
  const target = red ? slotC(5) : slotC(2);
  const color = red ? RED : GREEN;
  const glitch = t >= 7.0 && t < 7.12;
  const fade = 1 - prog(t, 8.0, 8.25);
  const draw = prog(t, 2.0, 3.0);
  const ctrl = { x: (from.x + target.x) / 2 + (red ? 60 : -40), y: Math.min(from.y, target.y) - 20 };
  const dots = 16;
  const march = (t * 0.6) % (1 / dots);
  const gIn = outBack(prog(t, 2.3, 2.5));
  const jump = red ? outBack(prog(t, 7.0, 7.18)) : 1;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[9]"
      style={{ opacity: fade * (glitch ? (Math.floor(t * 60) % 2 ? 0.3 : 1) : 1), transform: glitch ? `translateX(${(rand(Math.floor(t * 60)) - 0.5) * 18}px)` : undefined }}
    >
      {Array.from({ length: dots }, (_, i) => {
        const p = i / dots + march;
        if (p > draw || p > 0.94) return null;
        const pt = bez({ x: from.x, y: from.y - 60 }, ctrl, { x: target.x, y: target.y + 52 }, p);
        return <span key={i} className="absolute size-[7px] rounded-full" style={{ left: pt.x - 3.5, top: pt.y - 3.5, background: color, boxShadow: `0 0 10px ${color}` }} />;
      })}
      <div
        className="absolute rounded-[10px] border-2 border-dashed"
        style={{
          left: target.x - W / 2,
          top: target.y - W * 0.7,
          width: W,
          height: W * 1.4,
          borderColor: color,
          background: red ? `rgba(229,72,77,${0.12 + beatPulse(t, 7.0, 0.25) * 0.2})` : `rgba(74,222,155,${0.08 + beatPulse(t, 3.0, 0.5, 4.0) * 0.18})`,
          transform: `scale(${gIn * jump})`,
          boxShadow: `0 0 24px ${red ? 'rgba(229,72,77,.5)' : 'rgba(74,222,155,.35)'}`,
        }}
      />
      <span
        className="absolute whitespace-nowrap rounded-full px-2.5 py-0.5 font-display text-[15px] font-extrabold text-ink-950"
        style={{ left: target.x - 34, top: target.y - W * 0.7 - 30, background: color, opacity: prog(t, 2.5, 2.62), transform: `scale(${red ? jump : outBack(prog(t, 2.5, 2.68))})` }}
      >
        {red ? COPY.sixth : `${COPY.third} ✓`}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ captions
type Cap = { from: number; to: number; y: number; size: number; words: { w: string; at: number; color?: string }[]; stack?: boolean; cam?: boolean };
const CAPS: Cap[] = [
  { from: 0.5, to: 1.95, y: 104, size: LANG === 'zh' ? 118 : 104, words: COPY.safe.map((w, i) => ({ w, at: 0.5 + i * 0.25, color: i === COPY.safe.length - 1 ? GREEN : undefined })) },
  { from: 5.0, to: 7.95, y: 322, size: 50, cam: true, words: COPY.friends.map((w, i) => ({ w, at: 5.0 + i * 0.25 })) },
  { from: 10.5, to: 12.95, y: 226, size: LANG === 'zh' ? 88 : 74, stack: true, words: COPY.math.map((w, i) => ({ w, at: 10.5 + i * 0.25, color: i === COPY.math.length - 1 ? RED : undefined })) },
];
function Captions({ t, cam = false }: { t: number; cam?: boolean }) {
  return (
    <>
      {CAPS.filter((c) => !!c.cam === cam && t >= c.from - 0.01 && t < c.to).map((c, ci) => {
        const exit = prog(t, c.to - 0.14, c.to);
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
  if (t < 0.95) return null;
  const pop = outBack(prog(t, 1.0, 1.2), 2.4);
  const mood = t < 7.0 ? 'smug' : t < 9.25 ? 'neutral' : 'shock';
  const nod = t < 7 ? beatPulse(t, 1.5, 0.5, 7) * 0.05 : 0;
  const gulp = hit(t, 7.0, 0.3) * 6 * Math.sin((t - 7) * 60);
  const hits = [0, 1, 2, 3, 4].reduce((m, i) => Math.max(m, hit(t, vacStart(i) + VAC_DUR, 0.18)), 0);
  const score = HEADS.filter((_, k) => t >= headArrive(k)).length;
  const scorePop = HEADS.reduce((m, _, k) => Math.max(m, hit(t, headArrive(k), 0.12)), 0);
  const fade = 1 - prog(t, 14.9, 15.0);
  return (
    <div className="absolute inset-0 z-20" style={{ opacity: fade }}>
      <div className="absolute" style={{ left: BULL.x - 54, top: BULL.y - 54, transform: `translateX(${gulp}px) scale(${pop * (1 + nod + hits * 0.12)}) rotate(${hits * -6}deg)` }}>
        <BullMark size={108} mood={mood} />
      </div>
      <div
        className="absolute flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[20px] font-extrabold tabular"
        style={{
          left: BULL.x - 50,
          top: BULL.y + 60,
          opacity: clamp(pop),
          borderColor: t >= 10.5 ? RED : 'rgba(255,255,255,.12)',
          background: t >= 10.5 ? 'rgba(229,72,77,.2)' : 'rgba(21,24,29,.92)',
          transform: `scale(${1 + scorePop * 0.18 + hit(t, 11.0, 0.3) * 0.35})`,
        }}
      >
        <span className="text-[12px] tracking-wide text-mist">{COPY.you}</span>
        <Bullhead size={15} className="text-bull" />
        {score}
      </div>
      {t >= 11.0 && t < 12.6 && (
        <span
          className="absolute flex items-center gap-1 rounded-full px-3 py-0.5 font-display text-[40px] font-extrabold text-white"
          style={{ left: BULL.x + 40, top: BULL.y - 110 - (t - 11) * 20, background: RED, boxShadow: '0 5px 0 #8e1f27', transform: `scale(${outBack(prog(t, 11.0, 11.18), 2.6)}) rotate(-6deg)`, opacity: 1 - prog(t, 12.3, 12.6) }}
        >
          +{PENALTY} <Bullhead size={26} />
        </span>
      )}
    </div>
  );
}

function Friends({ t }: { t: number }) {
  if (t < 4.4) return null;
  const fade = 1 - prog(t, 14.9, 15.0);
  const laughs = ['😂', '🤣', '😆'];
  return (
    <div className="absolute inset-0 z-20" style={{ opacity: fade }}>
      {FRIENDS.map((f, k) => {
        const inP = outBack(prog(t, 4.5 + k * 0.125 - 0.1, 4.5 + k * 0.125 + 0.1));
        const laugh = t >= 13.0 && t < 15 ? Math.abs(Math.sin((t - 13) * Math.PI * 2 + k)) * 16 : 0;
        const e = 13.0 + k * 0.25;
        return (
          <div key={f.name}>
            <div
              className="absolute flex items-center gap-1.5 rounded-full border border-white/10 bg-ink-900/90 py-0.5 pl-0.5 pr-2.5"
              style={{ left: FRIEND_X[k] - 46, top: 168 - laugh, opacity: clamp(inP), transform: `scale(${inP})` }}
            >
              <Avatar id={f.avatar} size={26} />
              <span className="text-[12px] font-extrabold tracking-wide">{f.name}</span>
            </div>
            {t >= e && t < e + 1.6 && (
              <span
                className="absolute text-[38px]"
                style={{ left: FRIEND_X[k] - 19, top: 120 - (t - e) * 40 - laugh, transform: `scale(${outBack(prog(t, e, e + 0.2))}) rotate(${Math.sin((t - e) * 14) * 14}deg)`, opacity: 1 - prog(t, e + 1.2, e + 1.6) }}
              >
                {laughs[k]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PlayButton({ t }: { t: number }) {
  if (t < 3.5 || t > 4.3) return null;
  const inP = outBack(prog(t, 3.5, 3.68));
  const press = t >= 4.0 ? 1 - hit(t, 4.0, 0.12) * 0.12 : 1;
  return (
    <div className="absolute inset-x-0 z-30 flex justify-center" style={{ top: 838, opacity: 1 - prog(t, 4.1, 4.3) }}>
      <span className="rounded-[14px] bg-bull px-7 py-3 font-display text-[22px] font-extrabold text-white" style={{ marginLeft: 120, transform: `scale(${inP * press})`, boxShadow: '0 8px 24px -8px rgba(229,72,77,.7)' }}>
        {COPY.play}
      </span>
    </div>
  );
}

/** Swallowed bullheads fly off each card and drop into your score, one per head. */
function HeadStream({ t }: { t: number }) {
  if (t < VAC || t > 11.1) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {HEADS.map((c, k) => {
        const start = vacStart(c) + 0.05;
        const end = headArrive(k);
        if (t < start || t > end) return null;
        const p = inCubic(prog(t, start, end));
        const from = slotC(c);
        const scoreAt = { x: BULL.x + 20, y: BULL.y + 74 };
        const pt = bez({ x: from.x, y: from.y - 40 }, { x: from.x - 80 + k * 6, y: 300 + k * 10 }, scoreAt, p);
        return (
          <span key={k} className="absolute text-bull" style={{ left: pt.x - 13, top: pt.y - 13, transform: `scale(${lerp(1.4, 0.7, p)}) rotate(${p * 360}deg)`, filter: 'drop-shadow(0 0 6px rgba(229,72,77,.8))' }}>
            <Bullhead size={26} />
          </span>
        );
      })}
    </div>
  );
}

/** The gag: a pile of cards buries you, only the horns stick out. Then it bursts open into the logo. */
function Pile({ t }: { t: number }) {
  if (t < 13.35 || t > 15.5) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[25]">
      {Array.from({ length: 9 }, (_, j) => {
        const at = 13.5 + j * 0.0625;
        if (t < at - 0.12) return null;
        const land = { x: BULL.x - 40 + rand(j + 3) * 80, y: BULL.y + 2 + (j % 3) * 14 - Math.floor(j / 3) * 10 };
        const r = (rand(j + 7) - 0.5) * 70;
        let pose: Pose;
        if (t < 15.0) {
          const p = prog(t, at - 0.12, at);
          pose = { x: land.x, y: lerp(land.y - 260, land.y, inCubic(p)), w: 64, r, flip: 1, sq: hit(t, at, 0.1) * 0.12 };
        } else {
          const p = prog(t, 15.0, 15.45);
          pose = { x: land.x + (rand(j + 11) - 0.5) * 500 * p, y: land.y - 1100 * outCubic(p), w: 64, r: r + p * (rand(j) - 0.5) * 900, flip: 1, o: 1 - prog(p, 0.7, 1) };
        }
        return <CardView key={j} pose={pose} value={1} face={false} z={30 + j} />;
      })}
    </div>
  );
}

// ------------------------------------------------------------------ end card
function EndCard({ t }: { t: number }) {
  if (t < 14.98) return null;
  const logo = prog(t, 15.0, 15.22);
  const word = 'BULLHEADS';
  return (
    <div className="absolute inset-0 z-50">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 45% at 50% 32%, rgba(229,72,77,.3), transparent 70%), #0d0f12', opacity: prog(t, 14.98, 15.05) }} />
      {Array.from({ length: 20 }, (_, i) => {
        const x = rand(i + 900) * SW;
        const speed = 30 + rand(i + 950) * 50;
        const y = SH - ((((t - 15) * speed + rand(i + 990) * SH) % (SH + 60)) - 30);
        return (
          <span key={i} className="absolute text-bull" style={{ left: x, top: y, opacity: 0.08 + rand(i + 1010) * 0.1 }}>
            <Bullhead size={14 + rand(i + 1030) * 24} />
          </span>
        );
      })}
      <div className="absolute" style={{ left: 270 - 88, top: 150, transform: `scale(${lerp(2.4, 1, outBack(logo, 1.6)) + beatPulse(t, 15.5, 0.5) * 0.03}) rotate(${lerp(-22, 0, outCubic(logo))}deg)`, opacity: clamp(logo * 4) }}>
        <BullMark size={176} mood="smug" />
      </div>
      <div className="absolute inset-x-0 flex justify-center font-display text-[68px] font-extrabold tracking-tight" style={{ top: 352 }}>
        {[...word].map((ch, i) => {
          const q = prog(t, 15.12 + i * 0.025, 15.28 + i * 0.025);
          return (
            <span key={i} style={{ display: 'inline-block', opacity: clamp(q * 4), transform: `translateY(${(1 - outBack(q)) * 50}px) scale(${lerp(1.8, 1, outBack(q))})` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div className="absolute inset-x-0 text-center font-display font-extrabold uppercase" style={{ top: 460, fontSize: LANG === 'zh' ? 44 : 34, lineHeight: 1.12 }}>
        <div style={{ opacity: prog(t, 15.3, 15.4), transform: `scale(${lerp(1.6, 1, outBack(prog(t, 15.3, 15.46)))})` }}>{COPY.again}</div>
        <div className="text-bull" style={{ opacity: prog(t, 15.55, 15.65), transform: `scale(${lerp(1.6, 1, outBack(prog(t, 15.55, 15.71)))})` }}>
          {COPY.sure}
        </div>
      </div>
      <div className="absolute inset-x-0 flex justify-center" style={{ top: 600, opacity: prog(t, 15.8, 15.9), transform: `scale(${lerp(1.4, 1, outBack(prog(t, 15.8, 15.98))) + beatPulse(t, 16.0, 0.5) * 0.03})` }}>
        <span className="rounded-2xl border-2 border-bull/70 bg-bull/10 px-6 py-3 font-display text-[34px] font-extrabold tracking-tight">bullheads.vercel.app</span>
      </div>
      <div className="absolute inset-x-0 text-center text-[21px] font-bold text-mist" style={{ top: 700, opacity: prog(t, 16.0, 16.15) }}>
        {COPY.small}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ camera, shakes, flashes
const SHAKES: [number, number, number][] = [
  [0.5, 5, 0.25],
  [4.0, 3, 0.2],
  [6.0, 6, 0.25],
  [6.5, 7, 0.25],
  [7.0, 11, 0.35],
  [8.0, 5, 0.2],
  [8.25, 5, 0.2],
  [8.5, 6, 0.2],
  [SLAM, 24, 0.55],
  [11.0, 10, 0.3],
  [13.5, 5, 0.5],
  [15.0, 12, 0.35],
];
function camera(t: number) {
  // close-up → pull back; a step closer on each friend's flip; follow the hanging card; then the pile.
  let s = 1;
  let f: Pt = { x: 270, y: 560 };
  if (t < 2) {
    s = lerp(1.3, 1, inOut(prog(t, 1.4, 2.0)));
    f = { x: 110, y: 610 };
  } else if (t < 6) s = 1 + prog(t, 2, 6) * 0.03;
  else if (t < 8.0) {
    const steps = [6.0, 6.5, 7.0].reduce((n, at) => n + outBack(prog(t, at, at + 0.16), 1.6) * 0.03, 0);
    s = 1.03 + steps;
    f = { x: 300, y: 560 };
  } else if (t < 8.75) {
    s = lerp(1.12, 1, outCubic(prog(t, 8.0, 8.3)));
    f = { x: 300, y: 560 };
  } else if (t < SLAM + 0.2) {
    s = 1 + inOut(prog(t, 8.75, 9.9)) * 0.16 + hit(t, SLAM, 0.3) * 0.06;
    f = { x: 430, y: 420 };
  } else if (t < 13.4) {
    s = lerp(1.16, 1, outBack(prog(t, SLAM + 0.2, SLAM + 0.5), 1.3)) + hit(t, 11.0, 0.3) * 0.04;
    f = { x: 430, y: 420 };
  } else if (t < 15) {
    s = 1 + inOut(prog(t, 13.4, 14.6)) * 0.22;
    f = { x: BULL.x + 30, y: BULL.y };
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
  const white = Math.max(t >= SLAM && t < SLAM + 0.034 ? 0.75 : 0, hit(t, SLAM + 0.034, 0.12) * 0.35, hit(t, 15.0, 0.22) * 0.75, hit(t, 0.5, 0.1) * 0.15);
  const red = Math.max(hit(t, SLAM, 1.0) * 0.5, t >= 7.0 && t < 7.12 ? 0.35 : 0, t >= 7.0 && t < SLAM ? 0.12 + beatPulse(t, 7.0, 0.5) * 0.08 : 0);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[60]" style={{ background: 'radial-gradient(80% 60% at 50% 45%, transparent 35%, rgba(229,72,77,.9))', opacity: red }} />
      <div className="pointer-events-none absolute inset-0 z-[61] bg-white" style={{ opacity: white }} />
    </>
  );
}

export function PromoStage({ t }: { t: number }) {
  const mine = yourCard(t);
  const calmBg = t < 7 ? 'rgba(74,222,155,.07)' : `rgba(229,72,77,${0.1 + prog(t, 7, 10) * 0.12})`;
  const endFade = 1 - prog(t, 14.9, 15.0);
  return (
    <div className="relative overflow-hidden" style={{ width: SW, height: SH, background: '#0d0f12' }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(90% 55% at 50% 50%, ${calmBg}, transparent 70%)` }} />
      <div className="absolute inset-0" style={{ transform: camera(t), transformOrigin: '0 0' }}>
        {/* the one row that matters */}
        <div className="felt absolute rounded-[26px]" style={{ left: 14, top: 400, width: 512, height: 140, opacity: endFade }} />
        {[2, 3, 4, 5].map((i) => (
          <div key={i} className="absolute rounded-[10px] border border-dashed border-white/[0.06]" style={{ left: slotC(i).x - W / 2, top: slotC(i).y - W * 0.7, width: W, height: W * 1.4, opacity: endFade }} />
        ))}
        <Prediction t={t} from={mine} />
        {[0, 1].map((i) => (
          <CardView key={i} pose={rowCard(i, t)} value={ROW[i]} />
        ))}
        {FRIENDS.map((f, k) => t >= 4.35 && <CardView key={f.card} pose={friendCard(k, t)} value={f.card} z={2 + k} />)}
        <CardView pose={mine} value={50} z={20} />
        <You t={t} />
        <Friends t={t} />
        <PlayButton t={t} />
        <HeadStream t={t} />
        <Pile t={t} />
        <Captions t={t} cam />
      </div>
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
