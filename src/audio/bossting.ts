// Boss stings: every boss gets its own short motif, played over its title card. The boss's id seeds
// the key, mode, motif and colour, so a boss always sounds the same and no two sound alike. The hit
// lands on the name slam (0.38 s in); ending bosses get choir and organ, echoes sound drowned, and
// champions get a brighter brass fanfare.
import { Ctx, noise, osc, filter, sweep, dist, fm, env, mtof } from './dsp';
import type { Recipe } from './sfx';

export type StingKind = 'chapter' | 'final' | 'echo' | 'champion';
/** When the hit lands, in seconds after the card appears (the HUD slams the name on this beat). */
export const STING_HIT = 0.38;

function hashOf(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number): () => number { let s = seed || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const MODES = { phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], aeolian: [0, 2, 3, 5, 7, 8, 10], locrian: [0, 1, 3, 5, 6, 8, 10] };
/** Motif shapes as scale degrees: rising threats, falling dread, a turn. */
const SHAPES = [[0, 2, 4, 7], [7, 4, 2, 0], [0, 4, 3, 7], [0, -1, 0, 4], [4, 2, 1, 0], [0, 3, 5, 4], [0, 1, 0, 6], [2, 0, 4, 7]];
const RHYTHMS = [[0, 0.22, 0.44, 0.7], [0, 0.32, 0.48, 0.64], [0, 0.16, 0.32, 0.6], [0, 0.4, 0.56, 0.72]];

function brass(c: Ctx, out: AudioNode, m: number, t: number, d: number, g: number): void {
  const lp = filter(c, 'lowpass', 600, 2, out); sweep(lp.frequency, t, 600, 2600, 0.08);
  osc(c, 'sawtooth', mtof(m), mtof(m), t, d, lp, g * 0.5, 0.02, 1); osc(c, 'sawtooth', mtof(m) * 1.004, mtof(m) * 1.004, t, d, lp, g * 0.4, 0.025, 1);
  fm(c, mtof(m), 1, 1.6, t, d * 0.7, out, g * 0.25);
}
function choir(c: Ctx, out: AudioNode, m: number, t: number, d: number, g: number): void {
  for (const det of [0.997, 1.003]) {
    const b1 = filter(c, 'bandpass', 700, 5, out), b2 = filter(c, 'bandpass', 1150, 7, out);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m) * det;
    const vib = c.createOscillator(); vib.frequency.value = 5.2; const vg = c.createGain(); vg.gain.value = mtof(m) * 0.006; vib.connect(vg); vg.connect(o.frequency);
    const gn = c.createGain(); env(gn.gain, t, 0.25, d, g, 2.2);
    o.connect(gn); gn.connect(b1); gn.connect(b2); o.start(t); vib.start(t); o.stop(t + d + 0.2); vib.stop(t + d + 0.2);
  }
}
function organ(c: Ctx, out: AudioNode, notes: number[], t: number, d: number, g: number): void {
  for (const m of notes) for (const [mul, k] of [[1, 1], [2, 0.5], [4, 0.25]] as const) osc(c, 'sine', mtof(m) * mul, mtof(m) * mul, t, d, out, g * k / notes.length, 0.04, 1);
}
function bell(c: Ctx, out: AudioNode, m: number, t: number, d: number, g: number): void { fm(c, mtof(m), 3.5, 2.4, t, d, out, g); }

export function bossStingRecipe(id: string, kind: StingKind): Recipe {
  const seed = hashOf(id + ':' + kind), r = rng(seed);
  const modeNames = Object.keys(MODES) as (keyof typeof MODES)[];
  const mode = MODES[kind === 'final' ? 'harmonic' : kind === 'echo' ? 'locrian' : modeNames[Math.floor(r() * modeNames.length)]];
  const root = 38 + Math.floor(r() * 7);                   // D2 .. G#2
  const shape = SHAPES[Math.floor(r() * SHAPES.length)], rhythm = RHYTHMS[Math.floor(r() * RHYTHMS.length)];
  const lead = r() < 0.5 ? 'brass' : 'bell';
  const deg = (d: number, oct: number) => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return root + 12 * (oct + o) + mode[i]; };
  const dur = kind === 'final' ? 3.8 : 3.0;
  return {
    dur, vol: kind === 'final' ? 0.85 : 0.75,
    render: (c, out) => {
      const H = STING_HIT;
      const bus = c.createGain(); bus.gain.value = 1;
      // echoes sound drowned: everything through a closing low-pass
      if (kind === 'echo') { const lp = filter(c, 'lowpass', 2400, 1.5, out); sweep(lp.frequency, 0, 3200, 700, 2.4); bus.connect(lp); } else bus.connect(out);
      // the riser into the hit
      const hp = filter(c, 'bandpass', 400, 1.2, bus); sweep(hp.frequency, 0, 300, 5000, H); noise(c, 0, H, hp, 0.5, H * 0.9, 1);
      osc(c, 'sawtooth', mtof(root + 12), mtof(root + 24), 0, H, filter(c, 'lowpass', 1200, 1, bus), 0.15, H * 0.8, 1);
      // the hit: a body blow, a power chord and a crash
      const d = dist(c, kind === 'final' ? 7 : 5, bus);
      osc(c, 'sine', 110, 32, H, 0.9, d, 1.1, 0.002, 0.4);
      for (const iv of [0, 7, 12]) osc(c, 'sawtooth', mtof(root + iv), mtof(root + iv), H, 1.1, filter(c, 'lowpass', 1400, 1, d), 0.22, 0.004, 1);
      const cr = filter(c, 'highpass', 4500, 0.7, bus); noise(c, H, 2.2, cr, 0.35, 0.002, 4);
      // the boss's own motif
      const step = kind === 'final' ? 0.34 : 0.3, start = H + 0.32;
      shape.forEach((sd, i) => {
        const t = start + rhythm[i] * step * 3, m = deg(sd, 2), last = i === shape.length - 1, ln = last ? 1.3 : 0.32;
        if (kind === 'final') { choir(c, bus, m, t, ln + 0.4, 0.22); brass(c, bus, m - 12, t, ln, 0.3); }
        else if (kind === 'echo') { bell(c, bus, m + 12, t, ln + 1, 0.25); choir(c, bus, m, t, ln + 0.6, 0.12); }
        else if (lead === 'brass' || kind === 'champion') brass(c, bus, kind === 'champion' ? m + 12 : m, t, ln, 0.32);
        else { bell(c, bus, m + 12, t, ln + 0.8, 0.3); brass(c, bus, m - 12, t, ln, 0.18); }
        if (!last) osc(c, 'sine', 80, 40, t, 0.15, d, 0.4, 0.002, 0.5);   // a timpani-ish kick under each note
      });
      // the closing chord, held under the card
      const endT = start + rhythm[3] * step * 3, chord = [deg(0, 2), deg(2, 2), deg(4, 2)];
      if (kind === 'final') organ(c, bus, [deg(0, 1), ...chord, deg(0, 3)], endT, dur - endT - 0.1, 0.5);
      else osc(c, 'triangle', mtof(root), mtof(root), H, dur - H - 0.1, bus, 0.25, 0.3, 1);   // low drone
      if (kind === 'champion') for (const m of chord) bell(c, bus, m + 24, endT, 1.2, 0.08);
    },
  };
}
