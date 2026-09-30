/**
 * The trailer's soundtrack: 120 BPM, so one beat = 0.5 s and one bar = 2 s. Every hit here has a
 * visual twin in Promo.tsx at the same timestamp. Works on a live AudioContext (preview) or an
 * OfflineAudioContext (render to WAV for the final video).
 */
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 12.6;

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
  const BARS = ['C', 'G', 'Am', 'F', 'C', 'C', 'C'];
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

  // ---------------------------------------------------------------- 0–1.5 · close-up: "can't lose"
  drums(0, 2.5, { halfTime: true });
  bassline(0, 2.5, 0.55);
  loop(0, 2.5, BEAT, (s, i) => pluck(s, CH[chordAt(s)][i % 3] + 12, 0.8));
  kick(0.25, 1.1);
  kick(0.5, 1.1);
  clap(0.5, 1.1);
  // ---------------------------------------------------------------- 1.5–2.5 · pull back, the projection lands third
  whoosh(1.5, 0.25);
  loop(1.75, 2.0, 1 / 32, (s, i) => pluck(s, [76, 79, 81, 84, 86, 88, 91, 93][i % 8], 0.55));
  pluck(2.0, 91, 1.2);
  thock(2.25, 8);
  // ---------------------------------------------------------------- 2.5–4.75 · the friends turn their cards over
  [2.5, 2.625, 2.75].forEach((s, i) => thock(s, i));
  crash(2.5, 0.4);
  osc(T(2.5), 3.0, 'sawtooth', hz(33), hz(33), 0.05, 0.4, 400);
  drums(2.5, 4.0, { claps: false, kickK: 0.9 });
  loop(2.5, 4.0, BEAT / 2, (s) => bass(s, 45, 0.2, 0.75));
  [3.0, 3.5].forEach((s, i) => {
    whoosh(s - 0.14, 0.14, true);
    kick(s, 1.15);
    snare(s, 0.7 + i * 0.1);
    stab(s, CH.Am, 0.25, 1.2 + i * 0.3);
    pluck(s + 0.04, 84 + i * 3, 1.3);
  });
  // 49: the reveal goes wrong — hit, glitch, sour chord; then the cut to your eyes
  whoosh(3.86, 0.14, true);
  kick(4.0, 1.3);
  snare(4.0, 1);
  crash(4.0, 0.7);
  loop(4.0, 4.12, 0.02, (s, i) => noise(T(s), 0.018, 0.3, 'bandpass', 1200 + i * 900, 3));
  stab(4.02, [58, 61, 65], 0.5, 1.6);
  osc(T(4.25), 0.45, 'sawtooth', hz(33), hz(31), 0.4, 0.004, 500);
  kick(4.25, 1.1);
  [4.5, 4.58].forEach((s, i) => kick(s, i ? 0.5 : 0.8));
  // ---------------------------------------------------------------- 4.75–6 · cards rush in, the sixth hangs, a dropped beat
  [4.75, 4.875, 5.0].forEach((s, i) => {
    thock(s, 3 + i);
    snare(s, 0.55);
  });
  whoosh(5.0, 0.35, true);
  loop(5.0, 5.5, BEAT / 4, (s, i) => tick(s, 1 + i * 0.2));
  riser(5.0, 0.5, 1);
  // 5.5–6.0: nothing.
  // ---------------------------------------------------------------- 6 · slam; the row smacks into you and buries you
  boom(6.0, 1.3);
  kick(6.0, 1.3);
  [0, 1, 2, 3, 4].forEach((c) => {
    thock(6.45 + c * 0.06, 5 + c);
    snare(6.45 + c * 0.06, 0.45);
  });
  for (let k = 0; k < 9; k++) coin(6.55 + k * 0.05, k);
  snare(7.0, 1);
  crash(7.0);
  moo(7.05);
  drums(7.0, 8.5, { hats16: true });
  bassline(7.0, 8.5, 1.05);
  stabs(7.0, 8.5);
  [7.5, 7.75, 8.0].forEach((s, i) => [0, 0.06, 0.12].forEach((d, j) => pluck(s + d, 88 - i * 2 - j * 3, 1.1)));
  riser(8.1, 0.4, 0.8);
  // ---------------------------------------------------------------- 8.5–12.6 · horns burst out → logo, play free
  kick(8.5, 1.2);
  crash(8.5, 0.7);
  whoosh(8.5, 0.45);
  boom(9.0, 1.1);
  stab(9.0, [60, 64, 67, 72], 1.1, 1.6);
  drums(9.5, 12.0, { kickK: 0.85 });
  bassline(9.5, 12.0, 0.7);
  loop(9.5, 12.0, BEAT, (s, i) => pluck(s, CH.C[i % 3] + 12, 0.7));
  clap(10.0, 1.2);
  boom(12.0, 0.6);
  stab(12.0, [60, 64, 67, 72], 0.5, 1.3);
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
