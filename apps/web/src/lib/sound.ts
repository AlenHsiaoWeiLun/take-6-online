import { storage } from './storage';

/**
 * All audio is synthesised with WebAudio — no files to host or license.
 * Two buses (sfx, music) feed a compressor so nothing clips when a row gets swallowed mid-melody.
 */
export type SoundName =
  | 'tap'
  | 'select'
  | 'play'
  | 'deal'
  | 'flip'
  | 'place'
  | 'danger'
  | 'take'
  | 'moo'
  | 'turn'
  | 'tick'
  | 'win'
  | 'lose'
  | 'pop'
  | 'coin';

let ctx: AudioContext | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let muted = storage.get('take6.muted', false);
let musicOn = storage.get('take6.music', true);
const listeners = new Set<() => void>();

function audio() {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = muted ? 0 : 0.9;
    sfxBus.connect(comp);
    musicBus = ctx.createGain();
    musicBus.gain.value = musicOn ? 0.55 : 0;
    musicBus.connect(comp);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  at?: number;
  slide?: number;
  attack?: number;
  filter?: number;
  bus?: 'sfx' | 'music';
}

function tone(freq: number, dur: number, o: ToneOpts = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (o.at ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.15, t + (o.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc.connect(g);
  if (o.filter) {
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter;
    node = g.connect(f);
  }
  node.connect(o.bus === 'music' ? musicBus! : sfxBus!);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur: number, o: { gain?: number; at?: number; freq?: number; q?: number; bus?: 'sfx' | 'music'; sweep?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (o.at ?? 0);
  const buffer = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = o.q ?? 1;
  filter.frequency.setValueAtTime(o.freq ?? 1800, t);
  if (o.sweep) filter.frequency.exponentialRampToValueAtTime(o.sweep, t + dur);
  const g = a.createGain();
  g.gain.value = o.gain ?? 0.2;
  src.connect(filter).connect(g).connect(o.bus === 'music' ? musicBus! : sfxBus!);
  src.start(t);
}

/** A cartoon moo: sawtooth through a sweeping formant filter with vibrato. */
function moo(at = 0, pitch = 1) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const osc = a.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150 * pitch, t);
  osc.frequency.linearRampToValueAtTime(175 * pitch, t + 0.18);
  osc.frequency.exponentialRampToValueAtTime(95 * pitch, t + 0.75);
  const lfo = a.createOscillator();
  lfo.frequency.value = 6;
  const lfoGain = a.createGain();
  lfoGain.gain.value = 4;
  lfo.connect(lfoGain).connect(osc.frequency);
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 3;
  f.frequency.setValueAtTime(500, t);
  f.frequency.linearRampToValueAtTime(900, t + 0.2);
  f.frequency.linearRampToValueAtTime(420, t + 0.75);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.06);
  g.gain.setValueAtTime(0.5, t + 0.45);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  osc.connect(f).connect(g).connect(sfxBus!);
  osc.start(t);
  lfo.start(t);
  osc.stop(t + 0.85);
  lfo.stop(t + 0.85);
}

const recipes: Record<SoundName, (v: number) => void> = {
  tap: () => tone(880, 0.05, { type: 'triangle', gain: 0.05 }),
  select: (v) => {
    tone(520 + v * 6, 0.07, { type: 'triangle', gain: 0.09 });
    tone(1040 + v * 12, 0.05, { type: 'sine', gain: 0.04, at: 0.02 });
  },
  play: () => {
    noise(0.12, { gain: 0.35, freq: 900, sweep: 4000 });
    tone(330, 0.12, { type: 'triangle', gain: 0.08, slide: 660 });
  },
  deal: (v) => noise(0.05, { gain: 0.22, freq: 2600 + v * 80, q: 2 }),
  flip: (v) => {
    noise(0.06, { gain: 0.25, freq: 3200, q: 1.5 });
    tone(600 + v * 40, 0.06, { type: 'triangle', gain: 0.05 });
  },
  // Pitch climbs as a row fills: slot 1 low, slot 5 high and tense.
  place: (slot) => {
    noise(0.06, { gain: 0.3, freq: 700, q: 1.2 });
    tone([196, 247, 294, 349, 440][Math.min(4, Math.max(0, slot - 1))], 0.12, { type: 'triangle', gain: 0.12 });
  },
  danger: () => [0, 0.09, 0.18].forEach((at, i) => tone(660 + i * 110, 0.08, { type: 'square', gain: 0.04, at, filter: 2400 })),
  take: (penalty) => {
    tone(220, 0.45, { type: 'sawtooth', gain: 0.08, slide: 60, filter: 1400 });
    noise(0.35, { gain: 0.3, freq: 400, sweep: 120 });
    for (let i = 0; i < Math.min(penalty, 8); i++) tone(700 + i * 90, 0.05, { type: 'square', gain: 0.03, at: 0.12 + i * 0.045, filter: 3000 });
  },
  moo: (p) => moo(0, p || 1),
  turn: () => {
    tone(784, 0.1, { type: 'triangle', gain: 0.08 });
    tone(1175, 0.16, { type: 'triangle', gain: 0.07, at: 0.08 });
  },
  tick: (s) => tone(s <= 3 ? 1400 : 1100, 0.035, { type: 'square', gain: 0.03, filter: 3000 }),
  win: () => {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.35, { type: 'triangle', gain: 0.1, at: i * 0.09 }));
    [1047, 1319, 1568].forEach((f) => tone(f, 0.9, { type: 'sine', gain: 0.05, at: 0.5 }));
  },
  lose: () => {
    [392, 370, 349, 262].forEach((f, i) => tone(f, 0.32, { type: 'triangle', gain: 0.08, at: i * 0.18 }));
    moo(0.75, 0.8);
  },
  pop: () => {
    tone(600, 0.08, { type: 'sine', gain: 0.1, slide: 1500 });
    noise(0.03, { gain: 0.1, freq: 4000 });
  },
  coin: () => {
    tone(988, 0.07, { type: 'square', gain: 0.04, filter: 4000 });
    tone(1319, 0.2, { type: 'square', gain: 0.04, at: 0.07, filter: 4000 });
  },
};

// ------------------------------------------------------------------ music

/**
 * A bouncy 8-bar loop (I–vi–IV–V in C, 116 bpm): walking bass, off-beat chord stabs,
 * a marimba melody improvised on the pentatonic scale, and a light shaker.
 * Scheduled with a small look-ahead so timing stays tight even when React is busy.
 */
const BPM = 116;
const STEP = 60 / BPM / 2; // eighth notes
const CHORDS = [
  [60, 64, 67],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
];
const PENTA = [0, 2, 4, 7, 9];
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

let musicTimer: number | null = null;
let nextTime = 0;
let step = 0;
let melody: (number | null)[] = [];

function composeMelody() {
  // 64 eighth-note steps; mostly on-beat notes, some rests, stepwise motion.
  const notes: (number | null)[] = [];
  let degree = 5;
  for (let i = 0; i < 64; i++) {
    const strong = i % 2 === 0;
    if (Math.random() < (strong ? 0.25 : 0.6)) {
      notes.push(null);
      continue;
    }
    degree = Math.max(0, Math.min(9, degree + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
    notes.push(72 + PENTA[degree % 5] + 12 * Math.floor(degree / 5) - 12);
  }
  return notes;
}

function marimba(midi: number, at: number, gain: number) {
  const a = ctx!;
  const t = at;
  [1, 4].forEach((mult, k) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = hz(midi) * mult;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * (k ? 0.18 : 1), t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (k ? 0.08 : 0.45));
    o.connect(g).connect(musicBus!);
    o.start(t);
    o.stop(t + 0.5);
  });
}

function scheduleStep(s: number, t: number) {
  const a = ctx!;
  const bar = Math.floor(s / 8) % 8;
  const chord = CHORDS[bar % 4];
  const beat = s % 8;
  const offset = t - a.currentTime;

  // bass: root on 1 and 3, fifth pickup on the "and" of 4
  if (beat === 0 || beat === 4) tone(hz(chord[0] - 24), 0.28, { type: 'triangle', gain: 0.22, at: offset, bus: 'music' });
  if (beat === 7) tone(hz(chord[2] - 24), 0.14, { type: 'triangle', gain: 0.14, at: offset, bus: 'music' });
  // off-beat chord stabs
  if (beat % 2 === 1 && beat !== 7)
    chord.forEach((n) => tone(hz(n), 0.12, { type: 'square', gain: 0.018, at: offset, filter: 1600, bus: 'music' }));
  // shaker
  noise(0.04, { gain: beat % 2 ? 0.05 : 0.025, freq: 7000, q: 0.8, at: offset, bus: 'music' });
  if (beat === 4) noise(0.09, { gain: 0.06, freq: 1800, q: 0.6, at: offset, bus: 'music' });
  // melody
  const note = melody[s % 64];
  if (note !== null && note !== undefined) marimba(note, t, 0.09);
}

function startMusic() {
  const a = audio();
  if (!a || musicTimer !== null) return;
  melody = composeMelody();
  nextTime = a.currentTime + 0.1;
  step = 0;
  musicTimer = window.setInterval(() => {
    while (nextTime < a.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step += 1;
      if (step % 64 === 0) melody = composeMelody();
    }
  }, 30);
}

function stopMusic() {
  if (musicTimer !== null) window.clearInterval(musicTimer);
  musicTimer = null;
}

// Browsers only allow audio after a gesture, so music starts on the first tap anywhere.
if (typeof window !== 'undefined') {
  const unlock = () => {
    audio();
    if (musicOn) startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
}

export const sound = {
  play(name: SoundName, value = 0) {
    if (muted) return;
    try {
      if (!audio()) return;
      recipes[name](value);
    } catch {
      /* audio unavailable */
    }
  },
  get muted() {
    return muted;
  },
  get music() {
    return musicOn;
  },
  setMuted(value: boolean) {
    muted = value;
    storage.set('take6.muted', value);
    if (sfxBus) sfxBus.gain.value = value ? 0 : 0.9;
    listeners.forEach((l) => l());
  },
  setMusic(value: boolean) {
    musicOn = value;
    storage.set('take6.music', value);
    audio();
    if (musicBus) musicBus.gain.value = value ? 0.55 : 0;
    if (value) startMusic();
    else stopMusic();
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};

/** Short haptic taps on phones that support it. */
export const haptic = (pattern: number | number[]) => {
  try {
    if (!muted) navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
};
