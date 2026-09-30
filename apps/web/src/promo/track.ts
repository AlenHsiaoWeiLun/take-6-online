/**
 * The trailer's soundtrack: 120 BPM, so one beat = 0.5 s and one bar = 2 s. Every hit here has a
 * visual twin in Promo.tsx at the same timestamp. Works on a live AudioContext (preview) or an
 * OfflineAudioContext (render to WAV for the final video).
 */
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 20.5;

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

  // A minor loop: Am · F · C · G, one chord per bar.
  const CHORDS = [
    [57, 60, 64],
    [53, 57, 60],
    [55, 60, 64],
    [55, 59, 62],
  ];
  const ROOTS = [45, 41, 48, 43];
  const groove = (bar: number, { hats16 = false, stabs = true, clapK = 1, bassK = 1 } = {}) => {
    const s0 = bar * 2;
    const ci = bar % 4;
    for (let b = 0; b < 4; b++) kick(s0 + b * BEAT);
    clap(s0 + BEAT, clapK);
    clap(s0 + 3 * BEAT, clapK);
    for (let e = 0; e < (hats16 ? 16 : 8); e++) {
      const step = hats16 ? BEAT / 4 : BEAT / 2;
      if (!hats16 && e % 2 === 0) continue;
      hat(s0 + e * step, hats16 && e % 4 === 2 ? 1.2 : 0.8, !hats16 && e === 7);
    }
    for (let e = 0; e < 8; e++) bass(s0 + e * (BEAT / 2), ROOTS[ci] + (e % 2 ? 12 : 0), 0.2, bassK);
    if (stabs) [1, 3, 5, 7].forEach((e) => stab(s0 + e * (BEAT / 2), CHORDS[ci]));
  };

  // ---------------------------------------------------------------- bar 1 · hook (0–2)
  boom(0, 0.8);
  kick(0.25, 0.9);
  kick(0.5);
  clap(0.5);
  whoosh(1.0, 0.35, true);
  kick(1.5);
  kick(1.75, 0.8);
  [69, 72, 76, 79].forEach((m, i) => pluck(1.0 + i * 0.125, m));

  // ---------------------------------------------------------------- bar 2 · everyone picks (2–4)
  groove(1, { stabs: false });
  [2.0, 2.5, 3.0, 3.5].forEach((s, i) => {
    for (let k = 0; k < 6; k++) tick(s + 0.05 + k * 0.05, 0.7);
    thock(s + 0.35, i);
  });

  // ---------------------------------------------------------------- bar 3 · reveal, lowest first (4–6)
  crash(4.0, 0.7);
  groove(2);
  [4.0, 4.125, 4.25, 4.375].forEach((s, i) => thock(s, i));
  whoosh(4.5, 0.25);
  [5.0, 5.25, 5.5, 5.75].forEach((s, i) => thock(s, 2 + i));

  // ---------------------------------------------------------------- bar 4 · cards rain into rows (6–8)
  groove(3, { hats16: true });
  for (let i = 0; i < 8; i++) thock(6.0 + i * 0.25, i);

  // ---------------------------------------------------------------- bar 5 · tension (8–10)
  kick(8.0, 1.2);
  crash(8.0, 0.5);
  thock(8.0, 8);
  for (let b = 1; b < 4; b++) kick(8.0 + b * BEAT, 0.9);
  kick(9.5, 0.9);
  for (let i = 0; i < 8; i++) snare(8.0 + i * 0.125, 0.35 + i * 0.03);
  for (let i = 0; i < 16; i++) snare(9.0 + i * 0.0625, 0.55 + i * 0.03);
  riser(8.0, 2.0, 1);
  for (let e = 0; e < 8; e++) bass(8.0 + e * 0.25, 45, 0.2, 0.8);

  // ---------------------------------------------------------------- bar 6 · the sixth card (10–12)
  tick(10.0, 1.4);
  tick(10.25, 1.4);
  whoosh(10.1, 0.32, true);
  boom(10.5, 1.3);
  kick(10.5, 1.3);
  osc(T(10.5), 1.4, 'sine', 55, 40, 0.5, 0.01);
  riser(11.25, 0.75, 0.8);

  // ---------------------------------------------------------------- bar 7–8 · TAKE THE ROW (12–16)
  boom(12.0, 1.2);
  moo(12.12);
  groove(6, { hats16: true, clapK: 1.1, bassK: 1.1 });
  for (let n = 0; n < 9; n++) coin(12.25 + n * 0.083, n);
  groove(7, { hats16: true, clapK: 1.1, bassK: 1.1 });
  [14.0, 14.5, 15.0, 15.5].forEach((s) => {
    snare(s, 0.8);
    thock(s, 6);
  });
  riser(15.5, 0.5, 0.7);

  // ---------------------------------------------------------------- bar 9–10 · logo, play now (16–20)
  boom(16.0, 1.1);
  stab(16.0, [57, 60, 64, 69], 0.9, 1.6);
  groove(8, { stabs: false, bassK: 0.8 });
  clap(17.5, 1.2);
  groove(9, { stabs: false, bassK: 0.7, clapK: 0.8 });
  boom(19.5, 0.7);
  stab(19.5, [57, 60, 64, 69], 1.0, 1.4);
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
