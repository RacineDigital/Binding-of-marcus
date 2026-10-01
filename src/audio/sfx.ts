// Sound effect recipes. Each is rendered offline into buffers (with variants) at startup.
import { Ctx, noise, osc, filter, sweep, dist, fm, env, mtof } from './dsp';

export interface Recipe { dur: number; variants?: number; vol?: number; render: (c: Ctx, out: AudioNode, v: number) => void; limit?: number }
const R = (x: number) => x * (0.92 + Math.random() * 0.16);

function thump(c: Ctx, out: AudioNode, f0: number, f1: number, d: number, g = 1): void { osc(c, 'sine', f0, f1, 0, d, out, g, 0.001, 0.5); }
function hiss(c: Ctx, out: AudioNode, type: BiquadFilterType, f: number, q: number, d: number, g = 1, a = 0.002): BiquadFilterNode {
  const fl = filter(c, type, f, q, out); noise(c, 0, d, fl, g, a); return fl;
}
function chord(c: Ctx, out: AudioNode, notes: number[], type: OscillatorType, d: number, g: number, a = 0.05, t = 0, spread = 0): void {
  notes.forEach((n, i) => { const o = osc(c, type, mtof(n), mtof(n), t + i * spread, d, out, g / notes.length, a); o.detune.value = (Math.random() - 0.5) * 12; });
}
function formantVoice(c: Ctx, out: AudioNode, f0: number, f1: number, d: number, g: number, vowel: [number, number], a = 0.01): void {
  const b1 = filter(c, 'bandpass', vowel[0], 6, out), b2 = filter(c, 'bandpass', vowel[1], 8, out);
  const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, 0); o.frequency.exponentialRampToValueAtTime(f1, d);
  const gn = c.createGain(); env(gn.gain, 0, a, d, g);
  o.connect(gn); gn.connect(b1); gn.connect(b2); o.start(0); o.stop(d + 0.1);
}
function clicks(c: Ctx, out: AudioNode, n: number, spread: number, f: number, g: number): void {
  for (let i = 0; i < n; i++) { const t = Math.random() * spread; const fl = filter(c, 'bandpass', R(f), 3, out); noise(c, t, 0.02, fl, g * (0.5 + Math.random() * 0.5)); }
}

export const RECIPES: Record<string, Recipe> = {
  shoot: { dur: 0.18, variants: 4, vol: 0.55, limit: 3, render: (c, o) => {
    const bp = filter(c, 'bandpass', R(1900), 1.4, o); sweep(bp.frequency, 0, R(2400), 900, 0.07); noise(c, 0, 0.06, bp, 0.5);
    osc(c, 'sine', R(560), 240, 0, 0.09, o, 0.7, 0.001, 0.5); osc(c, 'triangle', R(280), 140, 0.005, 0.06, o, 0.25);
  } },
  splat: { dur: 0.22, variants: 4, vol: 0.5, limit: 4, render: (c, o) => {
    const lp = filter(c, 'lowpass', R(1600), 2, o); sweep(lp.frequency, 0, 2200, 400, 0.12); noise(c, 0, 0.12, lp, 0.7);
    thump(c, o, R(220), 80, 0.1, 0.6); clicks(c, o, 3, 0.05, 2500, 0.2);
  } },
  hit: { dur: 0.2, variants: 4, vol: 0.6, limit: 4, render: (c, o) => {
    const d = dist(c, 3, o); thump(c, d, R(170), 55, 0.09, 0.9);
    const bp = filter(c, 'bandpass', R(1100), 1.2, o); noise(c, 0, 0.05, bp, 0.6); clicks(c, o, 2, 0.03, 3000, 0.25);
  } },
  tink: { dur: 0.25, variants: 3, vol: 0.4, render: (c, o) => { fm(c, R(1900), 2.41, 1.2, 0, 0.18, o, 0.4); fm(c, R(2700), 1.7, 0.6, 0.01, 0.1, o, 0.15); } },
  crit: { dur: 0.5, variants: 2, vol: 0.6, render: (c, o) => { const d = dist(c, 6, o); thump(c, d, 220, 40, 0.18, 1); fm(c, 1320, 3.01, 2, 0.01, 0.4, o, 0.3); hiss(c, o, 'highpass', 3000, 1, 0.08, 0.5); } },
  death: { dur: 0.45, variants: 4, vol: 0.65, limit: 3, render: (c, o) => {
    const d = dist(c, 4, o); const lp = filter(c, 'lowpass', 2200, 3, d); sweep(lp.frequency, 0, R(2600), 260, 0.28); noise(c, 0, 0.3, lp, 0.9, 0.003, 2.2);
    thump(c, d, R(200), 40, 0.22, 0.8); clicks(c, o, 6, 0.15, 1800, 0.3);
  } },
  deathBig: { dur: 0.8, variants: 3, vol: 0.75, render: (c, o) => {
    const d = dist(c, 5, o); const lp = filter(c, 'lowpass', 1800, 2, d); sweep(lp.frequency, 0, 2200, 160, 0.5); noise(c, 0, 0.55, lp, 1, 0.003, 2);
    thump(c, d, R(140), 30, 0.45, 1); clicks(c, o, 12, 0.3, 1200, 0.3); formantVoice(c, o, R(160), 70, 0.4, 0.4, [500, 900]);
  } },
  hurt: { dur: 0.45, variants: 3, vol: 0.75, render: (c, o) => {
    formantVoice(c, o, R(330), 210, 0.22, 0.9, [650, 1150], 0.005);
    const d = dist(c, 3, o); thump(c, d, 160, 50, 0.15, 0.9); hiss(c, o, 'bandpass', 1500, 1, 0.08, 0.4);
  } },
  brass: { dur: 0.7, variants: 2, vol: 0.6, render: (c, o) => { fm(c, R(620), 2.7, 3, 0, 0.55, o, 0.5); fm(c, R(930), 1.4, 1, 0, 0.35, o, 0.2); thump(c, o, 140, 70, 0.1, 0.5); } },
  inkBurst: { dur: 1.0, vol: 0.7, render: (c, o) => { const d = dist(c, 3, o); thump(c, d, 90, 25, 0.8, 1); const lp = filter(c, 'lowpass', 900, 4, o); sweep(lp.frequency, 0, 200, 2400, 0.3); noise(c, 0, 0.7, lp, 0.8, 0.02, 2); } },
  zap: { dur: 0.22, variants: 3, vol: 0.45, limit: 2, render: (c, o) => {
    const hp = filter(c, 'highpass', 1500, 1, o); const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = R(900);
    const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 70; const lg = c.createGain(); lg.gain.value = 600; lfo.connect(lg); lg.connect(s.frequency);
    const g = c.createGain(); env(g.gain, 0, 0.001, 0.18, 0.5); s.connect(g); g.connect(hp); s.start(0); lfo.start(0); s.stop(0.25); lfo.stop(0.25);
    noise(c, 0, 0.12, hp, 0.4);
  } },
  boom: { dur: 1.4, variants: 3, vol: 0.9, render: (c, o) => {
    const d = dist(c, 6, o); thump(c, d, R(90), 28, 0.9, 1.1);
    const lp = filter(c, 'lowpass', 3000, 1, d); sweep(lp.frequency, 0, 4000, 180, 0.9); noise(c, 0, 1.1, lp, 1.2, 0.002, 2.5);
    clicks(c, o, 20, 0.8, 900, 0.25); hiss(c, o, 'highpass', 5000, 1, 0.15, 0.3);
  } },
  boomSmall: { dur: 0.6, variants: 3, vol: 0.55, limit: 3, render: (c, o) => {
    const d = dist(c, 4, o); thump(c, d, R(130), 45, 0.35, 0.9);
    const lp = filter(c, 'lowpass', 2500, 1, d); sweep(lp.frequency, 0, 3000, 300, 0.4); noise(c, 0, 0.4, lp, 0.8, 0.002, 2.5);
  } },
  rockBreak: { dur: 0.6, variants: 3, vol: 0.65, render: (c, o) => { thump(c, o, 110, 50, 0.2, 0.8); clicks(c, o, 16, 0.25, 800, 0.5); hiss(c, o, 'lowpass', 700, 1, 0.35, 0.5); } },
  heapBreak: { dur: 0.5, variants: 3, vol: 0.5, render: (c, o) => { clicks(c, o, 14, 0.3, 3500, 0.35); hiss(c, o, 'bandpass', 2600, 0.8, 0.3, 0.4, 0.02); thump(c, o, 120, 70, 0.1, 0.4); } },
  extinguish: { dur: 0.7, variants: 2, vol: 0.5, render: (c, o) => { hiss(c, o, 'highpass', 3500, 0.7, 0.55, 0.6, 0.01); thump(c, o, 90, 60, 0.15, 0.3); } },
  sizzle: { dur: 0.25, variants: 3, vol: 0.3, limit: 2, render: (c, o) => { hiss(c, o, 'highpass', 4500, 1, 0.18, 0.5); } },
  urnBreak: { dur: 0.6, variants: 3, vol: 0.6, render: (c, o) => { for (let i = 0; i < 5; i++) fm(c, R(1400 + i * 300), 1.9, 0.8, i * 0.03, 0.15, o, 0.15); hiss(c, o, 'bandpass', 2000, 1, 0.2, 0.4); thump(c, o, 160, 80, 0.1, 0.4); } },
  thud: { dur: 0.25, variants: 3, vol: 0.5, limit: 3, render: (c, o) => { thump(c, o, R(110), 45, 0.15, 0.9); hiss(c, o, 'lowpass', 500, 1, 0.08, 0.4); } },
  fireSpit: { dur: 0.4, variants: 3, vol: 0.45, render: (c, o) => { const bp = filter(c, 'bandpass', 600, 1, o); sweep(bp.frequency, 0, 500, 2500, 0.25); noise(c, 0, 0.3, bp, 0.7, 0.03); hiss(c, o, 'highpass', 5000, 1, 0.2, 0.2); } },
  beam: { dur: 0.9, vol: 0.6, render: (c, o) => {
    const d = dist(c, 5, o); const lp = filter(c, 'lowpass', 400, 6, d); sweep(lp.frequency, 0, 300, 3000, 0.2);
    for (const f of [110, 165, 221]) osc(c, 'sawtooth', f, f * 0.98, 0, 0.75, lp, 0.35, 0.02);
    hiss(c, o, 'bandpass', 3000, 2, 0.6, 0.3, 0.02);
  } },
  laser: { dur: 0.2, variants: 3, vol: 0.4, limit: 3, render: (c, o) => { osc(c, 'square', R(1500), 500, 0, 0.12, filter(c, 'lowpass', 4000, 1, o), 0.35); osc(c, 'sine', R(2200), 900, 0, 0.1, o, 0.2); } },
  swing: { dur: 0.25, variants: 3, vol: 0.5, render: (c, o) => { const bp = filter(c, 'bandpass', 500, 2, o); sweep(bp.frequency, 0, 400, 2600, 0.15); noise(c, 0, 0.18, bp, 0.9, 0.03); } },
  bigshot: { dur: 0.45, variants: 2, vol: 0.65, render: (c, o) => { const d = dist(c, 3, o); thump(c, d, 300, 60, 0.25, 0.9); const bp = filter(c, 'bandpass', 1200, 1, o); sweep(bp.frequency, 0, 2000, 500, 0.2); noise(c, 0, 0.2, bp, 0.6); } },
  coin: { dur: 0.45, variants: 3, vol: 0.45, render: (c, o) => { fm(c, R(1568), 2, 0.6, 0, 0.12, o, 0.4); fm(c, R(2093), 2, 0.6, 0.06, 0.3, o, 0.4); clicks(c, o, 2, 0.03, 4000, 0.2); } },
  coinBig: { dur: 0.6, variants: 2, vol: 0.5, render: (c, o) => { [1568, 1976, 2349].forEach((f, i) => fm(c, f, 2, 0.6, i * 0.06, 0.3, o, 0.35)); } },
  coinDrop: { dur: 0.15, variants: 3, vol: 0.25, limit: 3, render: (c, o) => { fm(c, R(2600), 1.5, 0.5, 0, 0.06, o, 0.3); } },
  key: { dur: 0.5, variants: 2, vol: 0.45, render: (c, o) => { for (let i = 0; i < 4; i++) fm(c, R(2200 + Math.random() * 900), 2.3, 0.9, i * 0.045, 0.1, o, 0.25); } },
  bombPickup: { dur: 0.4, variants: 2, vol: 0.5, render: (c, o) => { thump(c, o, 180, 90, 0.15, 0.7); hiss(c, o, 'highpass', 4000, 1, 0.25, 0.25, 0.04); } },
  bombPlace: { dur: 0.4, vol: 0.45, render: (c, o) => { thump(c, o, 120, 70, 0.12, 0.7); hiss(c, o, 'bandpass', 5000, 2, 0.3, 0.3, 0.05); } },
  heal: { dur: 0.7, vol: 0.45, render: (c, o) => { [72, 76, 79, 84].forEach((n, i) => osc(c, 'sine', mtof(n), mtof(n), i * 0.06, 0.4, o, 0.3, 0.01)); } },
  waxHeart: { dur: 0.9, vol: 0.4, render: (c, o) => { chord(c, o, [79, 83, 86, 91], 'triangle', 0.7, 0.7, 0.03, 0, 0.04); hiss(c, o, 'highpass', 7000, 1, 0.5, 0.1, 0.1); } },
  inkHeart: { dur: 0.9, vol: 0.45, render: (c, o) => { chord(c, filter(c, 'lowpass', 1200, 1, o), [50, 53, 57, 62], 'sawtooth', 0.7, 0.7, 0.02, 0, 0.05); } },
  charged: { dur: 0.6, vol: 0.45, render: (c, o) => { osc(c, 'sine', 400, 1600, 0, 0.25, o, 0.3, 0.01, 1); fm(c, 1760, 2, 1, 0.22, 0.35, o, 0.35); } },
  pageGet: { dur: 0.45, variants: 2, vol: 0.45, render: (c, o) => { for (let i = 0; i < 3; i++) hiss(c, o, 'bandpass', R(3000), 1.5, 0.05, 0.4); fm(c, 1318, 2, 0.5, 0.1, 0.3, o, 0.25); } },
  pageUse: { dur: 0.9, vol: 0.55, render: (c, o) => { for (let i = 0; i < 8; i++) { const t = i * 0.025; const bp = filter(c, 'bandpass', R(2500), 1, o); noise(c, t, 0.03, bp, 0.6); } chord(c, o, [76, 80, 83, 88], 'sine', 0.7, 0.6, 0.02, 0.1, 0.05); } },
  charm: { dur: 0.7, vol: 0.45, render: (c, o) => { [88, 91, 95].forEach((n, i) => fm(c, mtof(n), 3.01, 0.8, i * 0.07, 0.4, o, 0.25)); } },
  chestOpen: { dur: 0.9, vol: 0.55, render: (c, o) => { formantVoice(c, o, 90, 70, 0.35, 0.4, [400, 900], 0.05); clicks(c, o, 4, 0.2, 1500, 0.4); chord(c, o, [79, 83, 86], 'triangle', 0.5, 0.5, 0.01, 0.3, 0.05); } },
  buy: { dur: 0.6, vol: 0.5, render: (c, o) => { fm(c, 1568, 2, 0.6, 0, 0.12, o, 0.3); fm(c, 2093, 2, 0.6, 0.07, 0.4, o, 0.35); chord(c, o, [79, 84], 'sine', 0.4, 0.3, 0.01, 0.12, 0.03); } },
  deny: { dur: 0.3, vol: 0.35, render: (c, o) => { osc(c, 'square', 110, 100, 0, 0.08, filter(c, 'lowpass', 900, 1, o), 0.3); osc(c, 'square', 98, 90, 0.11, 0.1, filter(c, 'lowpass', 900, 1, o), 0.3); } },
  coinSpend: { dur: 0.3, vol: 0.4, render: (c, o) => { fm(c, 1200, 1.5, 0.6, 0, 0.1, o, 0.3); clicks(c, o, 3, 0.08, 3000, 0.25); } },
  itemGet: { dur: 1.8, vol: 0.55, render: (c, o) => {
    const notes = [62, 66, 69, 74]; notes.forEach((n, i) => formantVoice(c, o, mtof(n), mtof(n), 1.4, 0.35, i % 2 ? [800, 1200] : [600, 1000], 0.12));
    fm(c, mtof(86), 3.01, 0.7, 0.1, 1.2, o, 0.2); fm(c, mtof(90), 3.01, 0.7, 0.25, 1.0, o, 0.15);
  } },
  itemGetBig: { dur: 2.4, vol: 0.6, render: (c, o) => {
    const notes = [57, 62, 66, 69, 74, 78]; notes.forEach((n, i) => formantVoice(c, o, mtof(n), mtof(n), 2, 0.3, i % 2 ? [800, 1200] : [600, 1000], 0.2));
    [86, 90, 93, 98].forEach((n, i) => fm(c, mtof(n), 3.01, 0.7, 0.1 + i * 0.12, 1.4, o, 0.15));
    thump(c, o, 80, 40, 0.6, 0.5);
  } },
  door: { dur: 0.5, variants: 2, vol: 0.45, render: (c, o) => { const lp = filter(c, 'lowpass', 600, 2, o); noise(c, 0, 0.3, lp, 0.5, 0.06); thump(c, o, 100, 60, 0.12, 0.5); } },
  doorSlam: { dur: 0.6, variants: 2, vol: 0.6, render: (c, o) => { const d = dist(c, 3, o); thump(c, d, 120, 40, 0.3, 1); clicks(c, o, 6, 0.2, 1200, 0.3); hiss(c, o, 'lowpass', 800, 1, 0.2, 0.5); } },
  roomClear: { dur: 1.0, vol: 0.5, render: (c, o) => { const lp = filter(c, 'lowpass', 500, 3, o); sweep(lp.frequency, 0, 300, 900, 0.6); noise(c, 0, 0.7, lp, 0.5, 0.1); thump(c, o, 90, 60, 0.15, 0.5); chord(c, o, [62, 69], 'triangle', 0.6, 0.25, 0.05, 0.3); } },
  unlock: { dur: 0.6, vol: 0.5, render: (c, o) => { clicks(c, o, 3, 0.12, 2500, 0.5); thump(c, o, 200, 100, 0.08, 0.4); fm(c, 880, 2, 1, 0.2, 0.3, o, 0.3); } },
  secret: { dur: 2.2, vol: 0.55, render: (c, o) => { [62, 65, 69, 72, 76, 79].forEach((n, i) => fm(c, mtof(n + 12), 3.5, 0.9, i * 0.09, 1.2, o, 0.18)); chord(c, filter(c, 'lowpass', 1500, 1, o), [50, 57], 'sawtooth', 1.6, 0.3, 0.2); } },
  trapdoor: { dur: 1.2, vol: 0.6, render: (c, o) => { formantVoice(c, o, 70, 55, 0.6, 0.4, [350, 800], 0.1); thump(c, o, 60, 30, 0.9, 0.8); clicks(c, o, 8, 0.5, 900, 0.3); } },
  fall: { dur: 1.0, vol: 0.55, render: (c, o) => { const bp = filter(c, 'bandpass', 2000, 1, o); sweep(bp.frequency, 0, 2500, 200, 0.9); noise(c, 0, 0.9, bp, 0.6, 0.1); osc(c, 'sine', 600, 80, 0, 0.9, o, 0.3, 0.01, 1); } },
  teleport: { dur: 1.0, vol: 0.5, render: (c, o) => { for (let i = 0; i < 6; i++) fm(c, 400 * Math.pow(1.4, i), 2.5, 1, i * 0.05, 0.4, o, 0.15); hiss(c, o, 'highpass', 6000, 1, 0.6, 0.2, 0.2); } },
  activeUse: { dur: 0.7, vol: 0.5, render: (c, o) => { const d = dist(c, 2, o); osc(c, 'sine', 200, 600, 0, 0.3, d, 0.6, 0.01, 1); fm(c, 880, 2.01, 1.5, 0.05, 0.5, o, 0.25); } },
  reroll: { dur: 0.8, vol: 0.55, render: (c, o) => { clicks(c, o, 14, 0.4, 1800, 0.5); fm(c, 1320, 2, 0.8, 0.45, 0.3, o, 0.3); } },
  playerDeath: { dur: 2.5, vol: 0.7, render: (c, o) => { const lp = filter(c, 'lowpass', 1400, 1, o); chord(c, lp, [50, 53, 56, 61], 'sawtooth', 2.2, 0.8, 0.02); [62, 61, 58, 55, 50].forEach((n, i) => osc(c, 'triangle', mtof(n), mtof(n), i * 0.25, 0.4, o, 0.3)); const d = dist(c, 4, o); thump(c, d, 100, 25, 0.8, 0.9); } },
  revive: { dur: 1.6, vol: 0.6, render: (c, o) => { chord(c, o, [62, 66, 69, 74, 78], 'triangle', 1.3, 0.8, 0.02, 0, 0.08); hiss(c, o, 'highpass', 6000, 1, 1, 0.2, 0.3); } },
  spit: { dur: 0.3, variants: 3, vol: 0.5, limit: 3, render: (c, o) => { const bp = filter(c, 'bandpass', R(1400), 2, o); noise(c, 0, 0.08, bp, 0.8); osc(c, 'sine', R(420), 160, 0.01, 0.1, o, 0.6); } },
  hop: { dur: 0.25, variants: 3, vol: 0.35, limit: 2, render: (c, o) => { osc(c, 'sine', R(180), 420, 0, 0.12, o, 0.5, 0.005, 1); } },
  chitter: { dur: 0.4, variants: 2, vol: 0.4, render: (c, o) => { clicks(c, o, 10, 0.3, 3500, 0.5); osc(c, 'square', 900, 700, 0, 0.2, filter(c, 'bandpass', 2000, 4, o), 0.1); } },
  hatch: { dur: 0.4, variants: 3, vol: 0.45, render: (c, o) => { const lp = filter(c, 'lowpass', 900, 3, o); noise(c, 0, 0.25, lp, 0.7, 0.03); osc(c, 'sine', R(300), 150, 0, 0.2, o, 0.4); } },
  needle: { dur: 0.25, variants: 3, vol: 0.4, limit: 2, render: (c, o) => { osc(c, 'sine', R(2600), 1800, 0, 0.12, o, 0.3); hiss(c, o, 'highpass', 6000, 1, 0.08, 0.3); } },
  burrow: { dur: 0.8, vol: 0.55, render: (c, o) => { hiss(c, o, 'lowpass', 400, 1, 0.7, 0.8, 0.1); clicks(c, o, 10, 0.6, 600, 0.4); } },
  rumble: { dur: 0.8, vol: 0.55, render: (c, o) => { hiss(c, o, 'lowpass', 220, 2, 0.7, 1, 0.2); thump(c, o, 50, 35, 0.6, 0.6); } },
  erupt: { dur: 0.9, vol: 0.75, render: (c, o) => { const d = dist(c, 5, o); thump(c, d, 110, 30, 0.6, 1); clicks(c, o, 18, 0.5, 700, 0.45); hiss(c, o, 'lowpass', 1200, 1, 0.5, 0.7); } },
  bossSpit: { dur: 0.5, variants: 2, vol: 0.6, render: (c, o) => { const d = dist(c, 3, o); const bp = filter(c, 'bandpass', 900, 1.5, d); noise(c, 0, 0.25, bp, 0.9, 0.01); thump(c, d, 200, 70, 0.2, 0.7); formantVoice(c, o, 120, 90, 0.3, 0.3, [500, 900]); } },
  slam: { dur: 0.8, variants: 2, vol: 0.75, render: (c, o) => { const d = dist(c, 5, o); thump(c, d, 90, 28, 0.5, 1.1); clicks(c, o, 14, 0.4, 900, 0.4); hiss(c, o, 'lowpass', 900, 1, 0.3, 0.6); } },
  creak: { dur: 0.8, variants: 2, vol: 0.5, render: (c, o) => {
    const s = c.createOscillator(); s.type = 'sawtooth'; s.frequency.value = R(85); const lfo = c.createOscillator(); lfo.frequency.value = 23; const lg = c.createGain(); lg.gain.value = 30; lfo.connect(lg); lg.connect(s.frequency);
    const bp = filter(c, 'bandpass', 900, 5, o); const g = c.createGain(); env(g.gain, 0, 0.1, 0.6, 0.5); s.connect(g); g.connect(bp); s.start(0); lfo.start(0); s.stop(0.8); lfo.stop(0.8);
  } },
  snip: { dur: 0.3, variants: 3, vol: 0.5, render: (c, o) => { fm(c, R(3200), 1.41, 1.5, 0, 0.05, o, 0.4); fm(c, R(2800), 1.41, 1.5, 0.07, 0.06, o, 0.4); hiss(c, o, 'highpass', 5000, 1, 0.1, 0.3); } },
  bossRoar: { dur: 1.4, variants: 2, vol: 0.8, render: (c, o) => { const d = dist(c, 6, o); formantVoice(c, d, R(90), 55, 1.1, 0.8, [450, 850], 0.08); formantVoice(c, d, R(135), 80, 1.0, 0.4, [600, 1100], 0.1); hiss(c, o, 'lowpass', 600, 1, 1, 0.4, 0.1); } },
  bossDie: { dur: 2.5, vol: 0.85, render: (c, o) => { const d = dist(c, 6, o); formantVoice(c, d, 110, 40, 1.8, 0.7, [500, 900], 0.05); thump(c, d, 80, 20, 1.5, 1); const lp = filter(c, 'lowpass', 3000, 1, d); sweep(lp.frequency, 0.2, 3000, 150, 1.6); noise(c, 0.2, 1.8, lp, 1, 0.01, 2); } },
  sweetGood: { dur: 0.6, vol: 0.45, render: (c, o) => { [76, 83].forEach((n, i) => osc(c, 'triangle', mtof(n), mtof(n), i * 0.12, 0.3, o, 0.4)); } },
  sweetBad: { dur: 0.6, vol: 0.45, render: (c, o) => { [70, 63].forEach((n, i) => osc(c, 'square', mtof(n), mtof(n) * 0.97, i * 0.15, 0.3, filter(c, 'lowpass', 1500, 1, o), 0.3)); } },
  splash: { dur: 0.5, variants: 2, vol: 0.45, render: (c, o) => { const bp = filter(c, 'bandpass', 1400, 0.8, o); sweep(bp.frequency, 0, 2500, 600, 0.3); noise(c, 0, 0.35, bp, 0.7, 0.005); } },
  fortune: { dur: 1.4, vol: 0.45, render: (c, o) => { [69, 72, 76, 81].forEach((n, i) => fm(c, mtof(n), 3.5, 0.7, i * 0.1, 0.8, o, 0.2)); } },
  slotWin: { dur: 0.8, vol: 0.45, render: (c, o) => { [72, 76, 79, 84].forEach((n, i) => osc(c, 'square', mtof(n), mtof(n), i * 0.08, 0.15, filter(c, 'lowpass', 3000, 1, o), 0.25)); } },
  slotLose: { dur: 0.5, vol: 0.35, render: (c, o) => { osc(c, 'square', 220, 150, 0, 0.35, filter(c, 'lowpass', 1200, 1, o), 0.25, 0.005, 1); } },
  stitch: { dur: 0.4, vol: 0.4, render: (c, o) => { for (let i = 0; i < 3; i++) { const bp = filter(c, 'bandpass', 3000 + i * 400, 3, o); noise(c, i * 0.08, 0.06, bp, 0.5); } } },
  chime: { dur: 2.0, vol: 0.5, render: (c, o) => { fm(c, mtof(72), 3.5, 1.2, 0, 1.6, o, 0.4); fm(c, mtof(79), 3.5, 1, 0.3, 1.4, o, 0.3); } },
  bell: { dur: 2.2, vol: 0.55, render: (c, o) => { fm(c, mtof(67), 1.4, 3, 0, 2, o, 0.5); fm(c, mtof(79), 2.76, 1, 0, 1.2, o, 0.2); } },
  fork: { dur: 1.6, vol: 0.45, render: (c, o) => { osc(c, 'sine', 880, 880, 0, 1.4, o, 0.4); osc(c, 'sine', 1760, 1760, 0, 0.9, o, 0.15); thump(c, o, 200, 80, 0.15, 0.4); } },
  choir: { dur: 2.0, vol: 0.5, render: (c, o) => { [69, 73, 76, 81].forEach((n, i) => formantVoice(c, o, mtof(n), mtof(n), 1.6, 0.35, i % 2 ? [800, 1200] : [650, 1100], 0.3)); } },
  flute: { dur: 0.6, variants: 3, vol: 0.4, render: (c, o) => { const f = mtof(72 + Math.floor(Math.random() * 3) * 3); osc(c, 'sine', f, f * 1.01, 0, 0.45, o, 0.4, 0.04); hiss(c, o, 'bandpass', f * 2, 4, 0.4, 0.2, 0.05); } },
  dealPay: { dur: 1.4, vol: 0.55, render: (c, o) => { const lp = filter(c, 'lowpass', 900, 2, o); chord(c, lp, [38, 45, 49, 52], 'sawtooth', 1.1, 0.9, 0.05); thump(c, o, 70, 30, 0.6, 0.6); } },
  pincushion: { dur: 0.5, vol: 0.5, render: (c, o) => { fm(c, 2400, 1.7, 1, 0, 0.1, o, 0.3); osc(c, 'sine', 140, 90, 0.05, 0.3, o, 0.4); } },
};

export const STINGERS: Record<string, Recipe> = {
  bossIntro: { dur: 2.6, vol: 0.75, render: (c, o) => { const d = dist(c, 5, o); const lp = filter(c, 'lowpass', 300, 3, d); sweep(lp.frequency, 0, 200, 2200, 1.4); chord(c, lp, [28, 35, 40, 43], 'sawtooth', 2.2, 1.2, 0.4); thump(c, d, 90, 25, 1, 1); noise(c, 0, 1.5, filter(c, 'highpass', 3000, 1, o), 0.15, 1.2, 1.5); } },
  bossDeath: { dur: 3.0, vol: 0.7, render: (c, o) => { const d = dist(c, 4, o); thump(c, d, 70, 20, 1.5, 1); [62, 66, 69, 74, 78].forEach((n, i) => formantVoice(c, o, mtof(n), mtof(n), 2.4, 0.25, [700, 1150], 0.4 + i * 0.05)); } },
  deal: { dur: 3.0, vol: 0.6, render: (c, o) => { const lp = filter(c, 'lowpass', 1100, 1, o); chord(c, lp, [37, 44, 49, 52, 56], 'sawtooth', 2.6, 0.9, 0.4); fm(c, mtof(73), 1.41, 2, 0.3, 2, o, 0.2); } },
  blessing: { dur: 3.0, vol: 0.55, render: (c, o) => { [66, 70, 73, 78, 82].forEach((n, i) => formantVoice(c, o, mtof(n), mtof(n), 2.5, 0.25, [750, 1200], 0.4 + i * 0.08)); hiss(c, o, 'highpass', 7000, 1, 2, 0.1, 1); } },
  // a counter bell, then a music box turning over
  lostfound: { dur: 3.0, vol: 0.55, render: (c, o) => { fm(c, mtof(88), 3.5, 2, 0, 1.2, o, 0.35); [76, 79, 83, 81, 76, 71].forEach((n, i) => fm(c, mtof(n), 4.01, 1.2, 0.35 + i * 0.22, 0.9, o, 0.18)); chord(c, filter(c, 'lowpass', 900, 1, o), [52, 59, 64], 'triangle', 2.4, 0.6, 0.4); } },
  challenge: { dur: 2.0, vol: 0.6, render: (c, o) => { fm(c, mtof(45), 1.41, 4, 0, 1.8, o, 0.5); thump(c, o, 80, 30, 0.6, 0.7); } },
  transform: { dur: 2.4, vol: 0.6, render: (c, o) => { [62, 69, 74, 78, 81, 86].forEach((n, i) => fm(c, mtof(n), 2.01, 1, i * 0.1, 1.4, o, 0.15)); chord(c, o, [50, 57, 62], 'triangle', 2, 0.5, 0.3); } },
  unlock: { dur: 1.8, vol: 0.5, render: (c, o) => { [72, 76, 79, 84, 88].forEach((n, i) => fm(c, mtof(n), 3.01, 0.8, i * 0.09, 1, o, 0.2)); } },
};
