// Sample-level instrument synthesis for the music renderer. Each function returns a mono
// Float32Array one-shot at the given sample rate; results are cached by their parameters.
// Distorted guitars are Karplus-Strong strings summed into a power chord, then driven through
// a two-stage clipper (the cabinet EQ is applied later on the guitar bus).

export const SR = 44100;
const cache = new Map<string, Float32Array>();
function cached(key: string, make: () => Float32Array): Float32Array {
  let b = cache.get(key);
  if (!b) { b = make(); cache.set(key, b); }
  return b;
}
export function clearInstCache(): void { cache.clear(); }

/** Deterministic noise so renders are reproducible. */
function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s / 4294967296) * 2 - 1; };
}
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** One-pole filters (in place). */
function lowpass(d: Float32Array, hz: number): void {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0;
  for (let i = 0; i < d.length; i++) { y += a * (d[i] - y); d[i] = y; }
}
function highpass(d: Float32Array, hz: number): void {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0;
  for (let i = 0; i < d.length; i++) { y += a * (d[i] - y); d[i] = d[i] - y; }
}
function normalize(d: Float32Array, peak = 0.9): Float32Array {
  let m = 0; for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]));
  if (m > 0) { const k = peak / m; for (let i = 0; i < d.length; i++) d[i] *= k; }
  return d;
}
function fadeOut(d: Float32Array, ms = 8): void {
  const n = Math.min(d.length, Math.floor((SR * ms) / 1000));
  for (let i = 0; i < n; i++) d[d.length - 1 - i] *= i / n;
}

// ------------------------------------------------------------------ strings
/** Karplus-Strong plucked string. `damp` < 1 shortens sustain (palm mute), `bright` 0..1. */
function ksString(freq: number, dur: number, damp: number, bright: number, seed: number, pickPos = 0.18): Float32Array {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const N = Math.max(2, Math.round(SR / freq));
  const buf = new Float32Array(N);
  const r = rng(seed);
  // excitation: noise shaped by pick position (comb) and brightness
  let lp = 0;
  for (let i = 0; i < N; i++) { lp += (r() - lp) * (0.25 + bright * 0.75); buf[i] = lp; }
  const pk = Math.max(1, Math.floor(N * pickPos));
  for (let i = N - 1; i >= pk; i--) buf[i] -= buf[i - pk] * 0.9;
  let idx = 0, prev = 0;
  const loss = 0.5 * damp;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const nxt = (cur + prev) * loss; // averaging low-pass in the loop
    prev = cur;
    buf[idx] = nxt;
    out[i] = cur;
    idx = (idx + 1) % N;
  }
  return out;
}

export interface GuitarOpts { mute?: boolean; dur?: number; gain?: number; take?: number; voicing?: 'power' | 'root' | 'oct' | 'fifth' | 'single' | 'dyad3' }
/**
 * Distorted guitar hit: a power chord (root + fifth + octave) on low strings.
 * `take` selects a slightly different performance for double tracking.
 */
export function guitar(midi: number, o: GuitarOpts = {}): Float32Array {
  const mute = !!o.mute, take = o.take ?? 0, voicing = o.voicing ?? (mute ? 'root' : 'power');
  const dur = o.dur ?? (mute ? 0.22 : 1.2);
  const key = `gtr:${midi}:${mute}:${dur.toFixed(3)}:${take}:${voicing}:${o.gain ?? 1}`;
  return cached(key, () => {
    const n = Math.floor(SR * (dur + 0.05));
    const sum = new Float32Array(n);
    const ints = voicing === 'power' ? [0, 7, 12] : voicing === 'oct' ? [0, 12] : voicing === 'fifth' ? [0, 7] : voicing === 'dyad3' ? [0, 3, 7] : [0];
    ints.forEach((iv, k) => {
      // tiny strum offset and detune per string/take for a human, double-tracked feel
      const off = Math.floor(SR * (0.0015 * k + take * 0.0022));
      const det = 1 + (take ? 0.0018 : -0.0012) * (k + 1);
      const s = ksString(mtof(midi + iv) * det, dur + 0.05, mute ? 0.986 : 0.9993, mute ? 0.45 : 0.8, midi * 31 + k * 7 + take * 101 + (mute ? 5 : 0));
      for (let i = 0; i + off < n; i++) sum[i + off] += s[i] * (k === 0 ? 1 : 0.8);
    });
    // amp: tighten lows before the clipper, two gain stages, then smooth the fizz
    highpass(sum, mute ? 140 : 90);
    const g1 = (mute ? 22 : 16) * (o.gain ?? 1), g2 = 3.2;
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = Math.tanh(sum[i] * g1);
    highpass(a, 60);
    for (let i = 0; i < n; i++) a[i] = Math.tanh(a[i] * g2);
    lowpass(a, mute ? 3400 : 5200);
    // palm-mute envelope keeps the chug tight
    if (mute) for (let i = 0; i < n; i++) { const t = i / SR; a[i] *= Math.exp(-t * 9) * 0.85 + 0.15 * Math.exp(-t * 30); }
    // natural release at the end of the note
    const rel = Math.floor(SR * 0.03);
    for (let i = 0; i < rel && i < n; i++) a[n - 1 - i] *= i / rel;
    return normalize(a, 0.8);
  });
}

// ------------------------------------------------------------------ the "real" guitar
/**
 * Karplus-Strong with a fractional, modulatable delay: the string can be bent, slid and vibrato'd,
 * and is tuned exactly (no integer-delay detuning).
 */
function ksReal(freqAt: (i: number) => number, dur: number, loss: number, bright: number, seed: number, pickPos = 0.16, amp = 1): Float32Array {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const f0 = freqAt(0), MAX = Math.ceil(SR / 40) + 4;
  const buf = new Float32Array(MAX);
  const r = rng(seed);
  // excitation: a pick-shaped burst one period long
  const N0 = SR / f0;
  let lp = 0;
  for (let i = 0; i < N0; i++) { lp += (r() - lp) * (0.2 + bright * 0.8); buf[i] = lp * amp; }
  const pk = Math.max(1, Math.floor(N0 * pickPos));
  for (let i = Math.floor(N0) - 1; i >= pk; i--) buf[i] -= buf[i - pk] * 0.85;
  let w = Math.floor(N0) % MAX, y1 = 0;
  const g = Math.min(0.9995, loss);
  for (let i = 0; i < n; i++) {
    const P = SR / freqAt(i);
    let rp = w - P; while (rp < 0) rp += MAX;
    const i0 = Math.floor(rp), fr = rp - i0, a = buf[i0 % MAX], b = buf[(i0 + 1) % MAX];
    const v = a + (b - a) * fr;
    // loop filter: a gentle low-pass that dulls the string as it rings
    const y = g * (v * (0.5 + bright * 0.25) + y1 * (0.5 - bright * 0.25));
    y1 = y;
    buf[w] = y; w = (w + 1) % MAX;
    out[i] = v;
  }
  return out;
}
/** Oversampled, asymmetric (tube-ish) overdrive: smoother and less fizzy than a plain tanh. */
function tubeDrive(d: Float32Array, gain: number): void {
  let prev = 0;
  for (let i = 0; i < d.length; i++) {
    const x = d[i];
    let acc = 0;
    for (const t of [0.25, 0.75]) {     // 2x oversampling by interpolation
      const s = (prev + (x - prev) * t) * gain;
      acc += s > 0 ? Math.tanh(s) : Math.tanh(s * 0.82) / 0.9;
    }
    prev = x; d[i] = acc * 0.5;
  }
}
export interface RealOpts { mute?: boolean; dur?: number; take?: number; rr?: number; vel?: number; voicing?: 'power' | 'root' | 'oct' | 'fifth' | 'single' | 'dyad3'; gain?: number }
/** A played rhythm-guitar hit: strummed strings, a pick click, a tube amp. `rr` picks one of several performances. */
export function realGuitar(midi: number, o: RealOpts = {}): Float32Array {
  const mute = !!o.mute, take = o.take ?? 0, rr = o.rr ?? 0, vel = o.vel ?? 1, voicing = o.voicing ?? (mute ? 'root' : 'power');
  const dur = o.dur ?? (mute ? 0.22 : 1.2);
  const key = `rg:${midi}:${mute}:${dur.toFixed(3)}:${take}:${rr}:${vel}:${voicing}:${o.gain ?? 1}`;
  return cached(key, () => {
    const n = Math.floor(SR * (dur + 0.06));
    const sum = new Float32Array(n);
    const r = rng(midi * 97 + rr * 1013 + take * 7919 + (mute ? 3 : 0));
    const ints = voicing === 'power' ? [0, 7, 12] : voicing === 'oct' ? [0, 12] : voicing === 'fifth' ? [0, 7] : voicing === 'dyad3' ? [0, 3, 7] : [0];
    ints.forEach((iv, k) => {
      // a downstroke: strings a few ms apart, each a few cents off
      const off = Math.floor(SR * (0.0025 * k * (0.7 + 0.6 * Math.abs(r())) + Math.abs(r()) * 0.002));
      const cents = r() * 4 + (take ? 2 : -2);
      const f = mtof(midi + iv) * Math.pow(2, cents / 1200);
      const s = ksReal(() => f, dur + 0.06, mute ? 0.986 : 0.9985, (mute ? 0.35 : 0.65) * (0.8 + vel * 0.2), midi * 31 + k * 7 + take * 101 + rr * 389, 0.13 + Math.abs(r()) * 0.08, vel);
      for (let i = 0; i + off < n; i++) sum[i + off] += s[i] * (k === 0 ? 1 : 0.75);
    });
    // the pick's click
    const pr = rng(rr * 17 + midi + take * 3);
    for (let i = 0; i < Math.floor(SR * 0.004); i++) sum[i] += pr() * 0.25 * vel * (1 - i / (SR * 0.004));
    highpass(sum, mute ? 130 : 95);
    tubeDrive(sum, (mute ? 18 : 12) * (o.gain ?? 1) * (0.85 + vel * 0.15));
    highpass(sum, 70);
    tubeDrive(sum, 2.4);
    lowpass(sum, mute ? 4200 : 6500);
    if (mute) for (let i = 0; i < n; i++) { const t = i / SR; sum[i] *= Math.exp(-t * 8) * 0.85 + 0.15 * Math.exp(-t * 26); }
    const rel = Math.floor(SR * 0.035);
    for (let i = 0; i < rel && i < n; i++) sum[n - 1 - i] *= i / rel;
    return normalize(sum, 0.8 * (0.85 + vel * 0.15));
  });
}
/**
 * A sung lead-guitar note: slides in from the previous note (or bends up into long ones), with a
 * finger vibrato that comes in after a moment, through a smooth high-gain amp.
 */
export function realLead(midi: number, dur: number, from: number | null, rr = 0): Float32Array {
  const q = Math.round(dur * 1000) / 1000;
  return cached(`rl:${midi}:${q}:${from}:${rr}`, () => {
    const f = mtof(midi), f0 = from !== null ? mtof(from) : f;
    const slide = from !== null && Math.abs(from - midi) <= 5 ? 0.045 * SR : 0;
    const bend = from === null && q > 0.3 ? 0.06 * SR : 0;   // bend up a semitone into long notes
    const vibOn = Math.min(0.22, q * 0.4) * SR, vibRise = 0.25 * SR;
    const vibRate = 5.2 + (rr % 3) * 0.35;
    const fa = (i: number) => {
      let base = f;
      if (slide && i < slide) base = f0 * Math.pow(f / f0, i / slide);
      else if (bend && i < bend) base = f * Math.pow(2, (-1 + i / bend) / 12);
      const k = i < vibOn ? 0 : Math.min(1, (i - vibOn) / vibRise);
      return base * Math.pow(2, (k * 0.32 * Math.sin((2 * Math.PI * vibRate * i) / SR)) / 12);
    };
    const s = ksReal(fa, q + 0.25, 0.9993, 0.6, midi * 53 + rr * 211, 0.12, 1);
    const pr = rng(midi + rr * 5);
    for (let i = 0; i < Math.floor(SR * 0.003); i++) s[i] += pr() * 0.2;
    highpass(s, 140);
    tubeDrive(s, 26);
    highpass(s, 90);
    tubeDrive(s, 2);
    lowpass(s, 5600);
    const n = s.length, rel = Math.floor(SR * 0.06);
    for (let i = 0; i < rel && i < n; i++) s[n - 1 - i] *= i / rel;
    return normalize(s, 0.75);
  });
}

/** Clean picked note (arpeggiated clean guitar / chamber pluck), slightly chorused. */
export function cleanPluck(midi: number, dur = 1.6, bright = 0.6): Float32Array {
  return cached(`pluck:${midi}:${dur}:${bright}`, () => {
    const a = ksString(mtof(midi), dur, 0.9985, bright, midi * 13 + 3, 0.12);
    const b = ksString(mtof(midi) * 1.003, dur, 0.9985, bright, midi * 17 + 9, 0.2);
    const o = new Float32Array(a.length);
    for (let i = 0; i < o.length; i++) o[i] = a[i] * 0.6 + b[i] * 0.4;
    highpass(o, 120); fadeOut(o, 20);
    return normalize(o, 0.7);
  });
}

/** Picked electric bass with grit (metal) or round tone. */
export function bassNote(midi: number, dur: number, grit = 0.5): Float32Array {
  return cached(`bass:${midi}:${dur.toFixed(3)}:${grit}`, () => {
    const s = ksString(mtof(midi), dur + 0.03, 0.9975, 0.55, midi * 7 + 1, 0.25);
    const n = s.length;
    // add a sine sub for weight
    for (let i = 0; i < n; i++) s[i] = s[i] * 0.8 + Math.sin((2 * Math.PI * mtof(midi) * i) / SR) * 0.35 * Math.exp(-i / SR * 2);
    if (grit > 0) { const g = 2 + grit * 8; for (let i = 0; i < n; i++) s[i] = Math.tanh(s[i] * g) / Math.tanh(g) * (0.6 + 0.4 * (1 - grit)) + s[i] * 0.4 * (1 - grit); }
    lowpass(s, 2200 + grit * 1200);
    highpass(s, 30);
    const rel = Math.floor(SR * 0.025);
    for (let i = 0; i < rel; i++) s[n - 1 - i] *= i / rel;
    return normalize(s, 0.85);
  });
}

// ------------------------------------------------------------------ drums
export function kick(kind: 'metal' | 'synth' | 'industrial' = 'metal'): Float32Array {
  return cached('kick:' + kind, () => {
    const dur = kind === 'synth' ? 0.55 : 0.32;
    const n = Math.floor(SR * dur), d = new Float32Array(n), r = rng(11);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = kind === 'synth' ? 45 + 140 * Math.exp(-t * 28) : 52 + 190 * Math.exp(-t * 45);
      ph += (2 * Math.PI * f) / SR;
      const body = Math.sin(ph) * Math.exp(-t * (kind === 'synth' ? 5.5 : 11));
      const click = (kind === 'metal' ? 0.9 : 0.4) * r() * Math.exp(-t * 900) + (kind === 'metal' ? Math.sin(2 * Math.PI * 3100 * t) * 0.35 * Math.exp(-t * 300) : 0);
      d[i] = body + click;
    }
    if (kind === 'industrial') for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * 3.5);
    else for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * 1.4);
    return normalize(d, 0.95);
  });
}
export function snare(kind: 'rock' | 'gated' | 'industrial' = 'rock', ghost = false): Float32Array {
  return cached(`snare:${kind}:${ghost}`, () => {
    const dur = kind === 'gated' ? 0.42 : 0.3;
    const n = Math.floor(SR * dur), d = new Float32Array(n), r = rng(23);
    const nz = new Float32Array(n);
    for (let i = 0; i < n; i++) nz[i] = r();
    highpass(nz, 1200); lowpass(nz, 9000);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const body = (Math.sin(2 * Math.PI * 185 * t) * 0.8 + Math.sin(2 * Math.PI * 330 * t) * 0.45) * Math.exp(-t * 28);
      let env = Math.exp(-t * (kind === 'gated' ? 6 : 16));
      if (kind === 'gated' && t > 0.24) env *= Math.max(0, 1 - (t - 0.24) / 0.03);
      d[i] = body + nz[i] * env * (kind === 'industrial' ? 1.3 : 1.05);
    }
    if (kind === 'industrial') for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * 3) * 0.8;
    normalize(d, ghost ? 0.3 : 0.9);
    return d;
  });
}
/** Metallic cymbals built from inharmonic square partials (closed/open hat, ride, crash, china). */
export function cymbal(kind: 'hat' | 'open' | 'ride' | 'crash' | 'china'): Float32Array {
  return cached('cym:' + kind, () => {
    const dur = kind === 'hat' ? 0.06 : kind === 'open' ? 0.35 : kind === 'ride' ? 0.9 : 1.8;
    const n = Math.floor(SR * dur), d = new Float32Array(n), r = rng(kind.length * 97);
    const parts = [263, 400, 421, 474, 587, 845].map((f) => f * (kind === 'ride' ? 1.9 : kind === 'china' ? 1.25 : 2.4));
    const ph = parts.map(() => 0);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let m = 0;
      for (let k = 0; k < parts.length; k++) { ph[k] += parts[k] / SR; m += (ph[k] % 1) < 0.5 ? 1 : -1; }
      const decay = kind === 'hat' ? 70 : kind === 'open' ? 9 : kind === 'ride' ? 3.5 : kind === 'china' ? 2.6 : 2.2;
      const nz = r() * (kind === 'crash' || kind === 'china' ? 0.9 : 0.45);
      d[i] = (m / parts.length * (kind === 'ride' ? 0.9 : 0.55) + nz) * Math.exp(-t * decay) * (kind === 'ride' ? 1 + 0.6 * Math.exp(-t * 40) : 1);
    }
    highpass(d, kind === 'ride' ? 2500 : kind === 'china' ? 2200 : 6000);
    highpass(d, kind === 'ride' ? 2500 : 5000);
    if (kind === 'china') for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * 2.5);
    return normalize(d, kind === 'hat' ? 0.5 : kind === 'ride' ? 0.45 : 0.75);
  });
}
export function tom(midi: number): Float32Array {
  return cached('tom:' + midi, () => {
    const n = Math.floor(SR * 0.5), d = new Float32Array(n), r = rng(midi);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = mtof(midi) * (1 + 0.6 * Math.exp(-t * 30));
      ph += (2 * Math.PI * f) / SR;
      d[i] = Math.sin(ph) * Math.exp(-t * 7) + r() * 0.3 * Math.exp(-t * 60);
    }
    return normalize(d, 0.85);
  });
}
/** Industrial metal percussion: anvil / pipe / sheet hits. */
export function clang(kind: 'anvil' | 'pipe' | 'sheet', midi = 72): Float32Array {
  return cached(`clang:${kind}:${midi}`, () => {
    const dur = kind === 'sheet' ? 0.9 : 0.6;
    const n = Math.floor(SR * dur), d = new Float32Array(n), r = rng(midi * 3 + kind.length);
    const f0 = mtof(midi);
    const ratios = kind === 'anvil' ? [1, 2.76, 5.4, 8.93] : kind === 'pipe' ? [1, 2.0, 3.01, 5.2] : [1, 1.47, 2.09, 2.56, 3.3];
    for (let i = 0; i < n; i++) {
      const t = i / SR; let s = 0;
      ratios.forEach((q, k) => { s += Math.sin(2 * Math.PI * f0 * q * t) * Math.exp(-t * (kind === 'sheet' ? 3 + k : 6 + k * 4)) / (k + 1); });
      d[i] = s + r() * Math.exp(-t * 80) * 0.8 + (kind === 'sheet' ? r() * 0.3 * Math.exp(-t * 5) : 0);
    }
    for (let i = 0; i < n; i++) d[i] = Math.tanh(d[i] * 1.8);
    return normalize(d, 0.7);
  });
}
/** Reverse swell (noise riser) used for transitions. */
export function riser(dur: number): Float32Array {
  return cached('riser:' + dur, () => {
    const n = Math.floor(SR * dur), d = new Float32Array(n), r = rng(5);
    for (let i = 0; i < n; i++) d[i] = r() * Math.pow(i / n, 2.5);
    highpass(d, 1500);
    return normalize(d, 0.5);
  });
}

/** Reverb impulse response: decorrelated stereo noise with a smooth exponential tail. */
export function reverbIR(seconds: number, damp: number, seed = 1): [Float32Array, Float32Array] {
  const n = Math.floor(SR * seconds);
  const out: [Float32Array, Float32Array] = [new Float32Array(n), new Float32Array(n)];
  for (let ch = 0; ch < 2; ch++) {
    const r = rng(seed * 7 + ch * 1000 + 3), d = out[ch];
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      lp += (r() - lp) * (0.9 - damp * 0.7 * t);
      d[i] = lp * Math.pow(1 - t, 2.2) * (i < 400 ? i / 400 : 1);
    }
    // early reflections
    for (const [ms, g] of [[11, 0.5], [17, 0.35], [29, 0.3], [41, 0.22]]) { const k = Math.floor((SR * ms) / 1000) + ch * 37; if (k < n) d[k] += g; }
  }
  return out;
}
