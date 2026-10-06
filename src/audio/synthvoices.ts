// Sample-level synth voices for the music renderer (anti-aliased oscillators + state-variable
// filters). Rendering these in JS and caching repeated notes is far cheaper than building a Web
// Audio node graph per note with automated filters.
import { SR } from './inst';

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const cache = new Map<string, Float32Array>();
/** Release generated voices between offline soundtrack exports. */
export function clearVoiceCache(): void { cache.clear(); }
function cached(key: string, make: () => Float32Array): Float32Array {
  let b = cache.get(key); if (!b) { b = make(); cache.set(key, b); } return b;
}

function blep(t: number, dt: number): number {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
/** Band-limited oscillator bank: adds `gain * wave` into out. freqAt may vary over time (vibrato / glide). */
function oscInto(out: Float32Array, wave: 'saw' | 'square' | 'tri' | 'sine', freqAt: (i: number) => number, gain: number, phase0 = 0): void {
  let ph = phase0, tri = 0;
  for (let i = 0; i < out.length; i++) {
    const f = freqAt(i), dt = f / SR;
    let v: number;
    if (wave === 'sine') v = Math.sin(ph * 2 * Math.PI);
    else if (wave === 'saw') v = 2 * ph - 1 - blep(ph, dt);
    else {
      v = (ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt);
      if (wave === 'tri') { tri = dt * 4 * v + (1 - dt * 4) * tri; v = tri; }
    }
    out[i] += v * gain;
    ph += dt; if (ph >= 1) ph -= 1;
  }
}
/** TPT state-variable filter in place; cutoff may change over time (updated every 8 samples). */
function svf(d: Float32Array, mode: 'lp' | 'bp' | 'hp', cutAt: (i: number) => number, q: number): void {
  let ic1 = 0, ic2 = 0, a1 = 0, a2 = 0, a3 = 0;
  const k = 1 / q;
  for (let i = 0; i < d.length; i++) {
    if ((i & 7) === 0) {
      const fc = Math.min(SR * 0.45, Math.max(20, cutAt(i)));
      const g = Math.tan((Math.PI * fc) / SR);
      a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2;
    }
    const x = d[i];
    const v3 = x - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    d[i] = mode === 'lp' ? v2 : mode === 'bp' ? v1 : x - k * v1 - v2;
  }
}
function adsr(d: Float32Array, a: number, dec: number, sus: number, hold: number, rel: number): void {
  const A = Math.max(1, a * SR), D = Math.max(1, dec * SR), H = hold * SR, R = Math.max(1, rel * SR);
  let lvl = 0;
  for (let i = 0; i < d.length; i++) {
    let e: number;
    if (i < H) { e = i < A ? i / A : i < A + D ? 1 - (1 - sus) * ((i - A) / D) : sus; lvl = e; }
    else e = Math.max(0, lvl * (1 - (i - H) / R));
    d[i] *= e;
  }
}
function normalize(d: Float32Array, peak: number): Float32Array {
  let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) { const k = peak / m; for (let i = 0; i < d.length; i++) d[i] *= k; }
  return d;
}
const len = (s: number) => new Float32Array(Math.max(1, Math.floor(SR * s)));
const q3 = (x: number) => Math.round(x * 1000) / 1000;

/** Short filtered saw/square pluck (synthwave arps). */
export function pluck(midi: number, dur: number, cut: number, wave: 'saw' | 'square'): Float32Array {
  dur = q3(dur);
  return cached(`pl:${midi}:${dur}:${cut}:${wave}`, () => {
    const d = len(dur + 0.25), f = mtof(midi);
    oscInto(d, wave, () => f * 0.998, 0.5, 0.1); oscInto(d, wave, () => f * 1.002, 0.5, 0.6);
    const dec = Math.max(0.08, dur * 0.7) * SR;
    svf(d, 'lp', (i) => cut * 0.4 + cut * 2.6 * Math.exp(-i / dec * 3), 1.6);
    adsr(d, 0.003, Math.max(0.1, dur * 0.9), 0, dur, 0.15);
    return normalize(d, 0.8);
  });
}
/** Synth bass: saw + square sub, filter envelope and drive. */
export function synthBass(midi: number, dur: number, cut: number, grit: number): Float32Array {
  dur = q3(dur);
  return cached(`sb:${midi}:${dur}:${cut}:${grit}`, () => {
    const d = len(dur + 0.06), f = mtof(midi);
    oscInto(d, 'saw', () => f, 0.6); oscInto(d, 'square', () => f / 2, 0.4, 0.25);
    const dec = Math.max(0.05, dur * 0.8) * SR;
    svf(d, 'lp', (i) => cut * 0.6 + cut * 2 * Math.exp(-i / dec * 3), 2.2);
    if (grit > 0) { const g = 1 + grit * 5; for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * g); }
    adsr(d, 0.004, 0.05, 0.85, dur, 0.04);
    return normalize(d, 0.85);
  });
}
/** Lead synth with delayed vibrato and optional glide from the previous note. */
export function lead(midi: number, dur: number, wave: 'saw' | 'square', from: number | null): Float32Array {
  dur = q3(dur);
  return cached(`ld:${midi}:${dur}:${wave}:${from}`, () => {
    const d = len(dur + 0.15), f = mtof(midi), f0 = from !== null ? mtof(from) : f;
    const glide = 0.06 * SR, vibOn = Math.min(0.5, dur) * SR;
    const fa = (det: number) => (i: number) => {
      const base = i < glide && from !== null ? f0 * Math.pow(f / f0, i / glide) : f;
      const vib = Math.min(1, i / vibOn) * 0.009 * Math.sin((2 * Math.PI * 5.6 * i) / SR);
      return base * (1 + vib) * det;
    };
    oscInto(d, wave, fa(0.9945), 0.5, 0.2); oscInto(d, wave, fa(1.0055), 0.5, 0.7);
    svf(d, 'lp', (i) => 1700 + 2500 * Math.exp(-i / (SR * Math.max(0.1, dur))), 1.4);
    adsr(d, 0.012, 0.15, 0.8, dur, 0.12);
    return normalize(d, 0.75);
  });
}
/**
 * The chip lead: an NES-style 25% pulse, but clean. Band-limited (no aliasing fizz), two voices a
 * hair apart for width, a gentle low-pass to take the edge off, and a vibrato that comes in late on
 * long notes, so it sings like an 8-bit melody without sounding crunchy.
 */
function pulseInto(out: Float32Array, freqAt: (i: number) => number, duty: number, gain: number, phase0 = 0): void {
  let ph = phase0;
  for (let i = 0; i < out.length; i++) {
    const dt = freqAt(i) / SR;
    let v = ph < duty ? 1 : -1;
    v += blep(ph, dt); v -= blep((ph + 1 - duty) % 1, dt);
    out[i] += (v + (1 - 2 * duty)) * gain;
    ph += dt; if (ph >= 1) ph -= 1;
  }
}
export function chip(midi: number, dur: number, from: number | null, duty = 0.25): Float32Array {
  dur = q3(dur);
  return cached(`ch:${midi}:${dur}:${from}:${duty}`, () => {
    const d = len(dur + 0.1), f = mtof(midi), f0 = from !== null ? mtof(from) : f;
    const glide = 0.035 * SR, vibOn = 0.18 * SR, vibFull = 0.45 * SR;
    const fa = (det: number) => (i: number) => {
      const base = i < glide && from !== null ? f0 * Math.pow(f / f0, i / glide) : f;
      const k = i < vibOn ? 0 : Math.min(1, (i - vibOn) / vibFull);
      return base * (1 + k * 0.012 * Math.sin((2 * Math.PI * 6.2 * i) / SR)) * det;
    };
    pulseInto(d, fa(0.9985), duty, 0.5, 0.1); pulseInto(d, fa(1.0015), duty, 0.42, 0.55);
    oscInto(d, 'tri', fa(0.5), 0.18);   // a little body an octave down
    svf(d, 'lp', () => 4800, 0.7);
    adsr(d, 0.006, 0.12, 0.8, dur, 0.09);
    return normalize(d, 0.7);
  });
}
/** Short chip arpeggio blip (50% square, fast decay). */
export function chipBlip(midi: number, dur: number): Float32Array {
  dur = q3(dur);
  return cached(`cb:${midi}:${dur}`, () => {
    const d = len(dur + 0.05), f = mtof(midi);
    pulseInto(d, () => f, 0.5, 0.6);
    svf(d, 'lp', () => 5200, 0.7);
    adsr(d, 0.002, Math.max(0.05, dur * 0.8), 0.25, dur, 0.04);
    return normalize(d, 0.6);
  });
}
/** FM bell. */
export function bell(midi: number, dur: number): Float32Array {
  dur = q3(Math.max(0.8, dur));
  return cached(`bl:${midi}:${dur}`, () => {
    const d = len(dur + 0.2), f = mtof(midi);
    for (let i = 0; i < d.length; i++) {
      const t = i / SR, idx = 2.2 * Math.exp(-t * 3);
      d[i] = Math.sin(2 * Math.PI * f * t + idx * Math.sin(2 * Math.PI * f * 3.5 * t)) * Math.exp(-t * (2.4 / dur));
    }
    return normalize(d, 0.6);
  });
}
/**
 * Sustained chord pads: 'supersaw', 'strings', 'organ', 'choir', 'warm'. `seed` decorrelates
 * the left/right renders so pads are wide.
 */
export function pad(sound: string, notes: number[], dur: number, cut: number | undefined, seed: number): Float32Array {
  dur = q3(dur);
  return cached(`pd:${sound}:${notes.join(',')}:${dur}:${cut}:${seed}`, () => {
    const d = len(dur + 0.9);
    const n = notes.length;
    if (sound === 'organ') {
      for (const m of notes) for (const [mul, a] of [[0.5, 0.5], [1, 1], [2, 0.55], [3, 0.35], [4, 0.28], [6, 0.12]] as [number, number][]) {
        const f = mtof(m) * mul; oscInto(d, 'sine', () => f, a / n, seed * 0.13 + mul * 0.07);
      }
      for (let i = 0; i < d.length; i++) d[i] *= 1 + 0.08 * Math.sin((2 * Math.PI * 5.8 * i) / SR + seed);
      svf(d, 'lp', () => cut ?? 3200, 0.7);
      adsr(d, 0.03, 0.1, 1, dur, 0.3);
    } else if (sound === 'choir') {
      const raw = len(dur + 0.9);
      for (const m of notes) for (const det of [-0.006, 0, 0.006]) {
        const f = mtof(m) * (1 + det + seed * 0.0007);
        oscInto(raw, 'saw', (i) => f * (1 + 0.0065 * Math.sin((2 * Math.PI * (4.6 + det * 40) * i) / SR + seed)), 1 / (n * 3), seed * 0.3 + det * 50);
      }
      for (const [fc, q, a] of [[700, 6, 1], [1150, 8, 0.6], [2600, 10, 0.25]] as [number, number, number][]) {
        const b = raw.slice(); svf(b, 'bp', () => fc, q);
        for (let i = 0; i < d.length; i++) d[i] += b[i] * a;
      }
      adsr(d, 0.45, 0.2, 1, dur, 0.7);
    } else if (sound === 'strings') {
      for (const m of notes) for (const det of [-0.007, -0.0023, 0.0029, 0.0075]) {
        const f = mtof(m) * (1 + det);
        oscInto(d, 'saw', (i) => f * (1 + 0.004 * Math.sin((2 * Math.PI * (5.2 + det * 30) * i) / SR + seed * 2)), 1 / (n * 2), seed * 0.2 + det * 70);
      }
      svf(d, 'hp', () => 180, 0.7); svf(d, 'lp', () => cut ?? 3600, 0.7);
      adsr(d, 0.35, 0.2, 1, dur, 0.5);
    } else if (sound === 'warm') {
      for (const m of notes) for (const det of [-0.0035, 0.0035]) { const f = mtof(m) * (1 + det); oscInto(d, 'tri', () => f, 1 / (n * 2), seed * 0.2 + det * 30); }
      svf(d, 'lp', () => cut ?? 1100, 0.8);
      adsr(d, 0.4, 0.2, 1, dur, 0.5);
    } else { // supersaw
      const c = cut ?? 2600, sweep = dur * 0.5 * SR;
      for (const m of notes) for (const det of [-0.0105, -0.0052, 0, 0.0052, 0.0105]) { const f = mtof(m) * (1 + det * (1 + seed * 0.05)); oscInto(d, 'saw', () => f, 1 / (n * 3), (seed * 0.37 + det * 91) % 1); }
      svf(d, 'lp', (i) => c * (0.5 + 0.5 * Math.min(1, i / sweep)), 0.9);
      adsr(d, 0.08, 0.2, 1, dur, 0.5);
    }
    return normalize(d, 0.7);
  });
}
/** Short string stab / ostinato note. */
export function stab(midi: number, dur: number): Float32Array {
  dur = q3(dur);
  return cached(`st:${midi}:${dur}`, () => {
    const d = len(dur + 0.12), f = mtof(midi);
    for (const det of [-0.006, 0, 0.006]) oscInto(d, 'saw', () => f * (1 + det), 1 / 3, det * 77 + 0.3);
    svf(d, 'lp', () => 3200, 0.8);
    adsr(d, 0.006, dur * 0.5, 0.6, dur * 0.7, 0.08);
    return normalize(d, 0.7);
  });
}
