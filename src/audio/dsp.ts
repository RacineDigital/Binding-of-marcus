// Small DSP helpers shared by the SFX renderer and the realtime music voices.
export type Ctx = BaseAudioContext;

const noiseCache = new WeakMap<Ctx, AudioBuffer>();
export function noiseBuffer(ctx: Ctx): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}
export function noise(ctx: Ctx, t: number, dur: number, out: AudioNode, gain = 1, a = 0.002, decayCurve = 3): GainNode {
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const g = ctx.createGain(); env(g.gain, t, a, dur, gain, decayCurve);
  src.connect(g); g.connect(out);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  return g;
}
/** Exponential-ish attack/decay envelope on an AudioParam. */
export function env(p: AudioParam, t: number, a: number, d: number, peak: number, curve = 3): void {
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + Math.max(0.001, a));
  // approximate exponential decay with setTargetAtTime
  p.setTargetAtTime(0.0001, t + a, Math.max(0.005, d / curve));
}
export function osc(ctx: Ctx, type: OscillatorType, f0: number, f1: number, t: number, dur: number, out: AudioNode, gain = 1, a = 0.002, sweep = 0.6): OscillatorNode {
  const o = ctx.createOscillator(); o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur * sweep);
  const g = ctx.createGain(); env(g.gain, t, a, dur, gain);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.1);
  return o;
}
export function filter(ctx: Ctx, type: BiquadFilterType, f: number, q = 1, out?: AudioNode): BiquadFilterNode {
  const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q;
  if (out) b.connect(out);
  return b;
}
export function sweep(p: AudioParam, t: number, v0: number, v1: number, dur: number): void {
  p.setValueAtTime(v0, t); p.exponentialRampToValueAtTime(Math.max(1, v1), t + dur);
}
const curves = new Map<number, Float32Array>();
export function dist(ctx: Ctx, amount: number, out?: AudioNode): WaveShaperNode {
  const w = ctx.createWaveShaper();
  let c = curves.get(amount);
  if (!c) {
    c = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    curves.set(amount, c);
  }
  w.curve = c as any; w.oversample = '2x';
  if (out) w.connect(out);
  return w;
}
/** FM bell / metallic voice. */
export function fm(ctx: Ctx, f: number, ratio: number, index: number, t: number, dur: number, out: AudioNode, gain = 1, a = 0.002): void {
  const car = ctx.createOscillator(); car.frequency.value = f;
  const mod = ctx.createOscillator(); mod.frequency.value = f * ratio;
  const mg = ctx.createGain(); env(mg.gain, t, 0.001, dur * 0.8, f * index);
  mod.connect(mg); mg.connect(car.frequency);
  const g = ctx.createGain(); env(g.gain, t, a, dur, gain);
  car.connect(g); g.connect(out);
  car.start(t); mod.start(t); car.stop(t + dur + 0.1); mod.stop(t + dur + 0.1);
}
export function impulse(ctx: Ctx, seconds: number, decay: number, bright = 0.5): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const n = Math.random() * 2 - 1;
      lp = lp + (n - lp) * bright;
      d[i] = lp * Math.pow(1 - i / len, decay) * (i < 200 ? i / 200 : 1);
    }
  }
  return b;
}
export const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
