import { storage } from './storage';

/** Tiny WebAudio synth — no audio files to host or license. */
type SoundName = 'tap' | 'play' | 'reveal' | 'place' | 'take' | 'turn' | 'tick' | 'win' | 'lose' | 'emote';

let ctx: AudioContext | null = null;
let muted = storage.get('take6.muted', false);
const listeners = new Set<(m: boolean) => void>();

const audio = () => {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; at?: number; slide?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (opts.at ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.15, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur: number, opts: { gain?: number; at?: number; freq?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (opts.at ?? 0);
  const buffer = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = opts.freq ?? 1800;
  const g = a.createGain();
  g.gain.value = opts.gain ?? 0.2;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

const recipes: Record<SoundName, () => void> = {
  tap: () => tone(660, 0.06, { type: 'triangle', gain: 0.06 }),
  play: () => { noise(0.08, { gain: 0.25, freq: 2400 }); tone(420, 0.08, { type: 'triangle', gain: 0.06 }); },
  reveal: () => [0, 0.06, 0.12].forEach((at) => noise(0.06, { at, gain: 0.18, freq: 3000 })),
  place: () => { noise(0.07, { gain: 0.22, freq: 1500 }); tone(240, 0.09, { gain: 0.06 }); },
  take: () => { tone(180, 0.35, { type: 'sawtooth', gain: 0.07, slide: 70 }); noise(0.25, { gain: 0.15, freq: 600 }); },
  turn: () => { tone(880, 0.1, { type: 'triangle', gain: 0.08 }); tone(1320, 0.14, { type: 'triangle', gain: 0.06, at: 0.08 }); },
  tick: () => tone(1200, 0.03, { type: 'square', gain: 0.025 }),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.28, { type: 'triangle', gain: 0.1, at: i * 0.11 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.3, { type: 'triangle', gain: 0.08, at: i * 0.14 })),
  emote: () => tone(990, 0.08, { type: 'sine', gain: 0.06, slide: 1400 }),
};

export const sound = {
  play(name: SoundName) {
    if (muted) return;
    try {
      recipes[name]();
    } catch {
      /* audio not available */
    }
  },
  get muted() {
    return muted;
  },
  setMuted(value: boolean) {
    muted = value;
    storage.set('take6.muted', value);
    listeners.forEach((l) => l(value));
  },
  subscribe(listener: (m: boolean) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
