/**
 * The trailer's soundtrack: 120 BPM, so one beat = 0.5 s and one bar = 2 s. Every hit here has a
 * visual twin in Promo.tsx at the same timestamp. Works on a live AudioContext (preview) or an
 * OfflineAudioContext (render to WAV for the final video).
 */
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 18.3;

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

export function scheduleTrack(ac: BaseAudioContext, t0 = 0) {
  const master = ac.createGain();
  master.gain.value = 0.9;
  const comp = ac.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.12;
  master.connect(comp).connect(ac.destination);

  const noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const data = noiseBuf.getChannelData(0);
  let seed = 7;
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }

  const env = (g: GainNode, at: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  };
  const noise = (at: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 0.7, freqTo?: number) => {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, at);
    if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, at + dur);
    f.Q.value = q;
    const g = ac.createGain();
    env(g, at, gain, 0.002, dur);
    s.connect(f).connect(g).connect(master);
    s.start(at, (at * 7.919) % 1.5);
    s.stop(at + dur + 0.05);
  };
  const osc = (at: number, dur: number, type: OscillatorType, f0: number, f1: number | null, gain: number, attack = 0.003, lp?: number) => {
    const o = ac.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, at);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    const g = ac.createGain();
    env(g, at, gain, attack, dur);
    let node: AudioNode = o;
    if (lp) {
      const f = ac.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      o.connect(f);
      node = f;
    }
    node.connect(g).connect(master);
    o.start(at);
    o.stop(at + attack + dur + 0.05);
  };

  const T = (s: number) => t0 + s;
  const kick = (s: number, k = 1) => {
    osc(T(s), 0.34, 'sine', 170, 42, 1.0 * k);
    noise(T(s), 0.02, 0.35 * k, 'highpass', 3000);
  };
  const clap = (s: number, k = 1) => [0, 0.011, 0.022].forEach((d) => noise(T(s + d), 0.16, 0.42 * k, 'bandpass', 1400, 1.2));
  const hat = (s: number, k = 1, open = false) => noise(T(s), open ? 0.16 : 0.035, 0.16 * k, 'highpass', 8500);
  const snare = (s: number, k = 1) => {
    noise(T(s), 0.12, 0.38 * k, 'bandpass', 2200, 0.9);
    osc(T(s), 0.08, 'triangle', 220, 160, 0.25 * k);
  };
  const crash = (s: number, k = 1) => noise(T(s), 1.3, 0.3 * k, 'highpass', 5200);
  const boom = (s: number, k = 1) => {
    osc(T(s), 1.5, 'sine', 70, 28, 1.25 * k, 0.004);
    noise(T(s), 0.55, 0.7 * k, 'lowpass', 1400);
    crash(s, k);
  };
  const thock = (s: number, pitch = 0) => {
    noise(T(s), 0.06, 0.32, 'lowpass', 2600 + pitch * 180);
    osc(T(s), 0.07, 'sine', 240 + pitch * 30, 130, 0.35);
  };
  const whoosh = (s: number, dur = 0.3, up = false) => noise(T(s), dur, 0.28, 'bandpass', up ? 500 : 4000, 1.4, up ? 5000 : 450);
  const tick = (s: number, k = 1) => osc(T(s), 0.03, 'square', 1900, null, 0.08 * k, 0.001, 5000);
  const coin = (s: number, n: number) => osc(T(s), 0.09, 'square', hz(84 + (n % 5)), null, 0.07, 0.002, 6000);
  const bass = (s: number, midi: number, dur = 0.2, k = 1) => osc(T(s), dur, 'sawtooth', hz(midi), null, 0.28 * k, 0.005, 700);
  const stab = (s: number, chord: number[], dur = 0.16, k = 1) =>
    chord.forEach((m, i) => osc(T(s), dur, 'sawtooth', hz(m) * (1 + (i - 1) * 0.004), null, 0.07 * k, 0.004, 2600));
  const pluck = (s: number, midi: number, k = 1) => osc(T(s), 0.18, 'square', hz(midi), null, 0.06 * k, 0.002, 3200);
  const moo = (s: number) => {
    const at = T(s);
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(190, at);
    o.frequency.linearRampToValueAtTime(150, at + 0.35);
    o.frequency.linearRampToValueAtTime(105, at + 0.8);
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(900, at);
    f.frequency.linearRampToValueAtTime(520, at + 0.8);
    f.Q.value = 2.2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(0.5, at + 0.08);
    g.gain.linearRampToValueAtTime(0.35, at + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    o.connect(f).connect(g).connect(master);
    o.start(at);
    o.stop(at + 1);
  };
  const riser = (s: number, dur: number, k = 1) => {
    const at = T(s);
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.6;
    f.frequency.setValueAtTime(300, at);
    f.frequency.exponentialRampToValueAtTime(9000, at + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(0.32 * k, at + dur);
    g.gain.setValueAtTime(0.0001, at + dur + 0.01);
    src.connect(f).connect(g).connect(master);
    src.start(at);
    src.stop(at + dur + 0.05);
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(hz(45), at);
    o.frequency.exponentialRampToValueAtTime(hz(69), at + dur);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, at);
    og.gain.exponentialRampToValueAtTime(0.06 * k, at + dur);
    og.gain.setValueAtTime(0.0001, at + dur + 0.01);
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    o.connect(lp).connect(og).connect(master);
    o.start(at);
    o.stop(at + dur + 0.05);
  };

  // One chord per 2 s bar: confident major at first, minor once the friends show their cards.
  const CH: Record<string, number[]> = { C: [60, 64, 67], G: [59, 62, 67], Am: [57, 60, 64], F: [57, 60, 65] };
  const ROOT: Record<string, number> = { C: 48, G: 43, Am: 45, F: 41 };
  const BARS = ['C', 'G', 'Am', 'F', 'Am', 'Am', 'F', 'G', 'C', 'C'];
  const chordAt = (s: number) => BARS[Math.min(BARS.length - 1, Math.floor(s / 2 + 1e-6))];
  const loop = (from: number, to: number, step: number, fn: (s: number, i: number) => void) => {
    for (let i = 0, s = from; s < to - 1e-6; i++, s = from + i * step) fn(Math.round(s * 1000) / 1000, i);
  };
  const drums = (from: number, to: number, { hats16 = false, claps = true, kickK = 1, halfTime = false } = {}) => {
    loop(from, to, halfTime ? BEAT * 2 : BEAT, (s) => kick(s, kickK));
    if (claps) loop(from, to, BEAT, (s) => Math.round(s / BEAT) % 2 === 1 && clap(s, halfTime ? 0.55 : 1));
    loop(from, to, hats16 ? BEAT / 4 : BEAT / 2, (s, i) => {
      if (hats16) hat(s, i % 4 === 2 ? 1.2 : 0.75);
      else if (i % 2 === 1) hat(s, halfTime ? 0.55 : 0.85);
    });
  };
  const bassline = (from: number, to: number, k = 1) => loop(from, to, BEAT / 2, (s, i) => bass(s, ROOT[chordAt(s)] + (i % 2 ? 12 : 0), 0.2, k));
  const stabs = (from: number, to: number) => loop(from, to, BEAT / 2, (s, i) => i % 2 === 1 && stab(s, CH[chordAt(s)]));

  // ---------------------------------------------------------------- 0–5 · "nailed it": relaxed, major, tidy
  drums(0, 5, { halfTime: true });
  bassline(0, 5, 0.55);
  loop(0, 5, BEAT, (s, i) => pluck(s, CH[chordAt(s)][i % 3] + 12, 0.8));
  kick(0.5, 1.1);
  clap(0.5, 1.1);
  osc(T(1.0), 0.18, 'square', hz(72), hz(84), 0.06, 0.003, 3000);
  loop(2.0, 3.0, 1 / 14, (s, i) => pluck(s, [72, 74, 76, 79, 81, 84, 86][i % 7] + (i >= 7 ? 12 : 0), 0.55));
  [3.0, 3.5].forEach((s) => pluck(s, 88, 1.1));
  tick(3.5, 0.8);
  tick(4.0, 2.2);
  thock(4.0, 8);
  whoosh(4.02, 0.26, true);
  [4.5, 4.625, 4.75].forEach((s, i) => thock(s, i));

  // ---------------------------------------------------------------- 5–9.5 · "your friends:" minor, closer, tighter
  crash(5.0, 0.5);
  drums(5.0, 7.0, { claps: false, kickK: 0.9 });
  osc(T(5.0), 4.4, 'sawtooth', hz(33), hz(33), 0.05, 0.6, 400);
  loop(5.0, 7.0, BEAT / 2, (s) => bass(s, 45, 0.2, 0.75));
  [6.0, 6.5, 7.0].forEach((s, i) => {
    whoosh(s - 0.14, 0.14, true);
    kick(s, 1.15);
    snare(s, 0.7 + i * 0.1);
    stab(s, CH.Am.map((m) => m + 12 * (i === 2 ? 1 : 0)), 0.3, 1.2 + i * 0.3);
  });
  // the reveal goes wrong: glitch + a sour chord
  loop(7.0, 7.12, 0.02, (s, i) => noise(T(s), 0.018, 0.3, 'bandpass', 1200 + i * 900, 3));
  stab(7.02, [58, 61, 65], 0.5, 1.5);
  [7.25, 7.33, 7.75, 7.83].forEach((s, i) => kick(s, i % 2 ? 0.5 : 0.8));
  [8.0, 8.25, 8.5].forEach((s, i) => {
    kick(s, 1);
    snare(s, 0.6);
    thock(s, 3 + i);
  });
  whoosh(8.62, 0.3, true);
  loop(8.75, 9.5, BEAT / 2, (s) => tick(s, 1.3));
  riser(8.75, 0.75, 1);
  // 9.5–10.0: the dropped beat. Nothing.

  // ---------------------------------------------------------------- 10 · slam, vacuum, +9
  boom(10.0, 1.3);
  kick(10.0, 1.3);
  noise(T(10.2), 0.5, 0.32, 'bandpass', 5000, 1.2, 350);
  [0, 1, 2, 3, 4].forEach((c) => thock(10.2 + c * 0.045 + 0.35, 5 + c));
  for (let k = 0; k < 9; k++) coin(10.55 + k * 0.05, k);
  snare(11.0, 1);
  crash(11.0);
  moo(11.05);
  drums(11.0, 15.0, { hats16: true });
  bassline(11.0, 15.0, 1.05);
  stabs(11.0, 15.0);
  // friends laughing, then the pile of cards lands on you
  [13.0, 13.25, 13.5].forEach((s, i) => [0, 0.06, 0.12].forEach((d, j) => pluck(s + d, 88 - i * 2 - j * 3, 1.1)));
  loop(13.5, 14.0, 1 / 16, (s, i) => thock(s, i));

  // ---------------------------------------------------------------- 15–18.3 · logo, one more round
  boom(15.0, 1.1);
  stab(15.0, [60, 64, 67, 72], 1.1, 1.6);
  drums(15.5, 17.5, { kickK: 0.85 });
  bassline(15.5, 17.5, 0.7);
  loop(15.5, 17.5, BEAT, (s, i) => pluck(s, CH.C[i % 3] + 12, 0.7));
  boom(17.5, 0.6);
  stab(17.5, [60, 64, 67, 72], 0.8, 1.3);
}

/** Renders the whole soundtrack offline and returns a 16-bit stereo WAV. */
export async function renderWav(sampleRate = 48000): Promise<Blob> {
  const ac = new OfflineAudioContext(2, Math.ceil(DURATION * sampleRate), sampleRate);
  scheduleTrack(ac, 0);
  const buf = await ac.startRendering();
  const n = buf.length;
  const out = new DataView(new ArrayBuffer(44 + n * 4));
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  out.setUint32(4, 36 + n * 4, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  out.setUint32(16, 16, true);
  out.setUint16(20, 1, true);
  out.setUint16(22, 2, true);
  out.setUint32(24, sampleRate, true);
  out.setUint32(28, sampleRate * 4, true);
  out.setUint16(32, 4, true);
  out.setUint16(34, 16, true);
  w(36, 'data');
  out.setUint32(40, n * 4, true);
  const L = buf.getChannelData(0);
  const R = buf.getChannelData(1);
  for (let i = 0; i < n; i++) {
    out.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 0x7fff, true);
    out.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 0x7fff, true);
  }
  return new Blob([out.buffer], { type: 'audio/wav' });
}
