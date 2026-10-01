// Procedural adaptive music: per-floor compositions with a calm layer and a combat layer.
import { mtof, noiseBuffer, dist } from './dsp';

export const SCALES: Record<string, number[]> = {
  aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10], ionian: [0, 2, 4, 5, 7, 9, 11],
};
type Inst = 'bell' | 'lead' | 'pluck' | 'choir';
export interface Track {
  bpm: number; root: number; scale: string; prog: number[];
  kick: string; snare: string; hat: string; clank?: string; bass: string;
  drive: number; cut: number; pad: 'saw' | 'tri' | 'choir' | 'organ'; motif: (number | null)[]; inst: Inst;
  combatInst?: Inst; drone?: boolean; calmPerc?: boolean; combatOnly?: boolean; calmOnly?: boolean; swing?: number;
}
const N = null;
export const TRACKS: Record<string, Track> = {
  menu: { bpm: 64, root: 50, scale: 'aeolian', prog: [0, 5, 3, 4], kick: '', snare: '', hat: '', bass: '', drive: 1, cut: 600, pad: 'tri', inst: 'bell', drone: true, calmOnly: true,
    motif: [4, N, N, N, 3, N, 2, N, N, N, 0, N, N, N, N, N, 4, N, N, N, 7, N, 6, N, 4, N, 3, N, N, N, N, N] },
  cellar: { bpm: 90, root: 50, scale: 'aeolian', prog: [0, 5, 3, 4], kick: 'x.......x.....x.', snare: '....x.......x...', hat: '..x...x...x...x.', bass: 'x.x...x.x...x.o.',
    drive: 3, cut: 900, pad: 'tri', inst: 'bell', combatInst: 'lead', drone: true,
    motif: [4, N, N, 3, N, N, 2, N, N, N, 0, N, 1, N, N, N, 4, N, 7, N, 6, N, N, 4, 3, N, N, 2, N, N, N, N] },
  boiler: { bpm: 112, root: 52, scale: 'phrygian', prog: [0, 0, 1, 0], kick: 'x..x....x..x....', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.', clank: 'x..x..x...x..x..', bass: 'xx.x.xx.xx.x.x.x',
    drive: 8, cut: 1400, pad: 'saw', inst: 'pluck', combatInst: 'lead', drone: true, calmPerc: true,
    motif: [0, N, 1, N, 0, N, N, 4, N, 3, N, 1, 0, N, N, N, 0, N, 1, N, 3, N, N, 4, 5, N, 4, N, 3, N, 1, N] },
  underworks: { bpm: 100, root: 48, scale: 'dorian', prog: [0, 3, 6, 4], kick: 'x.....x...x.....', snare: '....x.......x.x.', hat: '.x.x.x.x.x.x.x.x', bass: 'x...x.x.x...x.x.',
    drive: 2.5, cut: 1000, pad: 'tri', inst: 'pluck', combatInst: 'lead', drone: true,
    motif: [7, N, 4, N, 2, N, 4, N, 5, N, 2, N, 0, N, N, N, 7, N, 8, N, 7, N, 4, N, 3, N, 2, N, 0, N, N, N] },
  ward: { bpm: 80, root: 54, scale: 'harmonic', prog: [0, 3, 4, 0], kick: 'x...........x...', snare: '........x.......', hat: '...x...x...x...x', bass: 'x.......x...x...',
    drive: 1.5, cut: 700, pad: 'tri', inst: 'bell', combatInst: 'bell', drone: true,
    motif: [0, N, 2, N, 4, N, 6, N, 7, N, N, N, 6, N, 4, N, 3, N, 2, N, 1, N, 2, N, 4, N, N, N, N, N, N, N] },
  depths: { bpm: 118, root: 47, scale: 'phrygian', prog: [0, 1, 0, 6], kick: 'x.x...x.x.x...x.', snare: '....x.......x...', hat: 'x...x...x...x...', clank: '......x.......x.', bass: 'x..xx..xx..x.x.x',
    drive: 9, cut: 1100, pad: 'saw', inst: 'lead', combatInst: 'lead', drone: true,
    motif: [0, N, N, 1, N, N, 0, N, 7, N, N, 6, N, N, 4, N, 0, N, N, 1, N, N, 3, N, 1, N, N, 0, N, N, N, N] },
  chapel: { bpm: 74, root: 45, scale: 'harmonic', prog: [0, 5, 3, 4], kick: 'x.......x.......', snare: '....x.......x...', hat: '', bass: 'x.......x.......',
    drive: 2, cut: 800, pad: 'choir', inst: 'bell', combatInst: 'choir', drone: true,
    motif: [7, N, N, N, 6, N, N, N, 4, N, N, N, 5, N, N, N, 4, N, N, N, 3, N, N, N, 2, N, N, N, 1, N, N, N] },
  hollow: { bpm: 104, root: 44, scale: 'locrian', prog: [0, 1, 4, 1], kick: 'x....x..x......x', snare: '....x...x...x...', hat: 'x..x.x..x.xx.x..', bass: 'x.x..x.x..x.x..x',
    drive: 10, cut: 1300, pad: 'saw', inst: 'bell', combatInst: 'lead', drone: true, swing: 0.1,
    motif: [0, N, 4, N, N, 1, N, N, 0, N, N, 6, N, N, 4, N, 3, N, 1, N, N, 0, N, N, 7, N, N, 6, N, 4, N, N] },
  binding: { bpm: 128, root: 50, scale: 'harmonic', prog: [0, 5, 6, 4], kick: 'x...x...x...x..x', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', clank: '..x.......x.....', bass: 'x.xxx.xxx.xxx.x.',
    drive: 8, cut: 1500, pad: 'organ', inst: 'lead', combatInst: 'lead', drone: true,
    motif: [4, N, 7, N, 6, N, 4, N, 3, N, 4, N, 2, N, N, N, 4, N, 7, N, 9, N, 8, N, 7, N, 6, N, 4, N, N, N] },
  boss: { bpm: 140, root: 40, scale: 'aeolian', prog: [0, 0, 5, 6], kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', clank: '......x.......x.', bass: 'x.xxx.xxx.xxx.x.',
    drive: 10, cut: 1800, pad: 'saw', inst: 'lead', combatInst: 'lead', combatOnly: true,
    motif: [7, N, 7, 6, 7, N, 4, N, 5, N, 4, N, 3, N, 2, N, 7, N, 7, 6, 7, N, 9, N, 8, N, 7, N, 6, N, 4, N] },
  boss2: { bpm: 150, root: 37, scale: 'phrygian', prog: [0, 1, 0, 4], kick: 'x.x.x...x.x.x...', snare: '....x.......x.xx', hat: 'xxxxxxxxxxxxxxxx', clank: 'x.....x.....x...', bass: 'xxx.xxx.xxx.xxxx',
    drive: 12, cut: 1700, pad: 'saw', inst: 'lead', combatInst: 'lead', combatOnly: true,
    motif: [0, N, 1, N, 0, N, 7, 6, 4, N, 3, N, 1, N, 0, N, 0, N, 1, N, 3, N, 4, N, 5, N, 4, N, 1, N, 0, N] },
  bossFinal: { bpm: 160, root: 38, scale: 'harmonic', prog: [0, 5, 1, 4], kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', hat: 'x.xxx.xxx.xxx.xx', clank: '..x...x...x...x.', bass: 'xxxxxxxxxxxxxxxx',
    drive: 14, cut: 2000, pad: 'organ', inst: 'lead', combatInst: 'lead', combatOnly: true,
    motif: [7, 6, 7, 4, 7, 6, 7, 3, 7, 6, 7, 2, 6, 4, 3, 2, 7, 6, 7, 4, 9, 8, 7, 6, 8, 7, 6, 4, 6, 4, 3, 1] },
  death: { bpm: 56, root: 45, scale: 'aeolian', prog: [0, 3, 5, 4], kick: '', snare: '', hat: '', bass: '', drive: 1, cut: 500, pad: 'tri', inst: 'bell', drone: true, calmOnly: true,
    motif: [4, N, N, N, 3, N, N, N, 2, N, N, N, 1, N, N, N, 0, N, N, N, N, N, N, N, N, N, N, N, N, N, N, N] },
  ending: { bpm: 70, root: 50, scale: 'ionian', prog: [0, 4, 5, 3], kick: '', snare: '', hat: '', bass: '', drive: 1, cut: 900, pad: 'choir', inst: 'bell', calmOnly: true,
    motif: [4, N, 5, N, 7, N, N, N, 6, N, 4, N, 2, N, N, N, 4, N, 5, N, 7, N, 9, N, 8, N, 7, N, N, N, N, N] },
};

export class Music {
  ctx: AudioContext; out: GainNode;
  calm: GainNode; combat: GainNode; drone: GainNode;
  track: Track | null = null; name: string | null = null;
  step = 0; next = 0; intensity = 0; target = 0;
  droneNodes: AudioScheduledSourceNode[] = [];
  reverb: AudioNode;
  constructor(ctx: AudioContext, out: GainNode, reverb: AudioNode) {
    this.ctx = ctx; this.out = out; this.reverb = reverb;
    this.calm = ctx.createGain(); this.combat = ctx.createGain(); this.drone = ctx.createGain();
    for (const g of [this.calm, this.combat, this.drone]) { g.connect(out); }
    const send = ctx.createGain(); send.gain.value = 0.35; this.calm.connect(send); send.connect(reverb);
    const send2 = ctx.createGain(); send2.gain.value = 0.15; this.combat.connect(send2); send2.connect(reverb);
    this.combat.gain.value = 0;
  }
  setTrack(name: string | null): void {
    if (name === this.name) return;
    this.name = name;
    const t = this.ctx.currentTime;
    // fade out drones
    for (const n of this.droneNodes) { try { n.stop(t + 1.2); } catch { /* */ } }
    this.droneNodes = [];
    this.drone.gain.cancelScheduledValues(t); this.drone.gain.setTargetAtTime(0, t, 0.3);
    this.track = name ? TRACKS[name] ?? null : null;
    if (!this.track) return;
    this.step = 0; this.next = t + 0.15;
    if (this.track.drone) this.startDrone(this.track);
    this.drone.gain.setTargetAtTime(this.track.calmOnly ? 0.5 : 0.35, t + 0.5, 1);
  }
  private startDrone(tr: Track): void {
    const c = this.ctx, t = c.currentTime;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 2; lp.connect(this.drone);
    const lfo = c.createOscillator(); lfo.frequency.value = 0.07; const lg = c.createGain(); lg.gain.value = 180; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
    for (const [m, det] of [[tr.root - 12, -6], [tr.root - 12, 7], [tr.root - 5, 0]] as [number, number][]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      const g = c.createGain(); g.gain.value = 0.05; o.connect(g); g.connect(lp); o.start(t); this.droneNodes.push(o);
    }
    // a whisper of filtered noise air
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c); n.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 0.6;
    const ng = c.createGain(); ng.gain.value = 0.025; n.connect(bp); bp.connect(ng); ng.connect(this.drone); n.start(t);
    this.droneNodes.push(n, lfo);
  }
  setIntensity(i: number): void { this.target = i; }
  update(dt: number): void {
    const tr = this.track; if (!tr) return;
    const c = this.ctx;
    const want = tr.calmOnly ? 0 : tr.combatOnly ? 1 : this.target;
    this.intensity += (want - this.intensity) * Math.min(1, dt * 1.5);
    const t = c.currentTime;
    this.combat.gain.setTargetAtTime(this.intensity, t, 0.1);
    this.calm.gain.setTargetAtTime(tr.combatOnly ? 0.6 : 1 - this.intensity * 0.35, t, 0.1);
    const spb = 60 / tr.bpm / 4; // seconds per 16th
    if (this.next < t - 0.5) this.next = t + 0.05;
    while (this.next < t + 0.12) {
      const sw = tr.swing && this.step % 2 === 1 ? spb * tr.swing : 0;
      this.schedule(tr, this.step, this.next + sw, spb);
      this.next += spb; this.step++;
    }
  }
  private chord(tr: Track, bar: number): number[] {
    const sc = SCALES[tr.scale];
    const d = tr.prog[bar % tr.prog.length];
    return [0, 2, 4].map((k) => { const i = d + k; return tr.root + sc[i % 7] + 12 * Math.floor(i / 7); });
  }
  private degree(tr: Track, deg: number, base: number): number {
    const sc = SCALES[tr.scale]; const o = Math.floor(deg / 7); return base + sc[((deg % 7) + 7) % 7] + 12 * o;
  }
  private schedule(tr: Track, step: number, t: number, spb: number): void {
    const s = step % 16, bar = Math.floor(step / 16);
    const ch = this.chord(tr, bar);
    // ---- calm layer: pad on bar start, motif
    if (s === 0) this.pad(t, ch.map((m) => m + 12), spb * 16, tr.pad, this.calm);
    const mi = step % 32;
    const md = tr.motif[mi];
    if (md !== null && md !== undefined && !tr.combatOnly) this.voice(tr.inst, t, this.degree(tr, md, tr.root + 24), spb * 3, 0.16, this.calm);
    if (tr.calmPerc && s % 4 === 0) this.hat(t, 0.04, this.calm);
    if (tr.calmOnly) return;
    // ---- combat layer
    const g = this.combat;
    if (tr.kick[s] === 'x') this.kick(t, 0.9, tr.drive, g);
    if (tr.snare[s] === 'x') this.snare(t, 0.45, g);
    if (tr.hat[s] === 'x') this.hat(t, s % 4 === 2 ? 0.12 : 0.07, g);
    if (tr.clank && tr.clank[s] === 'x') this.clank(t, 0.22, tr.root + 24, g);
    const b = tr.bass[s];
    if (b && b !== '.') {
      const root = ch[0] - 12;
      const m = b === 'o' ? root + 12 : b === '5' ? root + 7 : root;
      this.bass(t, m, spb * 1.8, 0.35, tr.drive, tr.cut, g);
    }
    if (md !== null && md !== undefined && (bar % 4 >= 2 || tr.combatOnly)) this.voice(tr.combatInst ?? tr.inst, t, this.degree(tr, md, tr.root + 24), spb * 2, 0.13, g);
    if (s === 0 && bar % 4 === 0 && tr.combatOnly) this.crash(t, 0.15, g);
  }
  // ------------------------------------------------------------ voices
  private kick(t: number, v: number, drive: number, out: AudioNode): void {
    const c = this.ctx;
    const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    const d = dist(c, Math.max(1, drive * 0.4)); o.connect(g); g.connect(d); d.connect(out); o.start(t); o.stop(t + 0.4);
  }
  private snare(t: number, v: number, out: AudioNode): void {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c);
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(bp); bp.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + 0.2);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    const og = c.createGain(); og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.12);
  }
  private hat(t: number, v: number, out: AudioNode): void {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7500;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + 0.06);
  }
  private crash(t: number, v: number, out: AudioNode): void {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = noiseBuffer(c);
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    n.connect(hp); hp.connect(g); g.connect(out); n.start(t, Math.random()); n.stop(t + 1.5);
  }
  private clank(t: number, v: number, m: number, out: AudioNode): void {
    const c = this.ctx; const f = mtof(m + 12);
    const car = c.createOscillator(); car.frequency.value = f;
    const mod = c.createOscillator(); mod.frequency.value = f * 1.41;
    const mg = c.createGain(); mg.gain.setValueAtTime(f * 3, t); mg.gain.exponentialRampToValueAtTime(1, t + 0.2);
    mod.connect(mg); mg.connect(car.frequency);
    const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    car.connect(g); g.connect(out); car.start(t); mod.start(t); car.stop(t + 0.3); mod.stop(t + 0.3);
  }
  private bass(t: number, m: number, dur: number, v: number, drive: number, cut: number, out: AudioNode): void {
    const c = this.ctx;
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m);
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = mtof(m - 12);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(cut * 2, t); lp.frequency.exponentialRampToValueAtTime(cut * 0.4, t + dur);
    const d = dist(c, drive);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.setTargetAtTime(0.0001, t + dur * 0.6, dur * 0.3);
    const g2 = c.createGain(); g2.gain.value = 0.5;
    o.connect(d); o2.connect(g2); g2.connect(d); d.connect(lp); lp.connect(g); g.connect(out);
    o.start(t); o2.start(t); o.stop(t + dur + 0.3); o2.stop(t + dur + 0.3);
  }
  private pad(t: number, ms: number[], dur: number, kind: Track['pad'], out: AudioNode): void {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'organ' ? 2200 : kind === 'choir' ? 1400 : 900; lp.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + dur * 0.3); g.gain.setTargetAtTime(0.0001, t + dur * 0.75, dur * 0.2);
    lp.connect(g);
    if (kind === 'choir') {
      const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 700; f1.Q.value = 5;
      const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 7;
      f1.connect(g); f2.connect(g);
      for (const m of ms) for (const det of [-8, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det; o.connect(f1); o.connect(f2); o.start(t); o.stop(t + dur + 0.5); }
      g.gain.value = 0; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + dur * 0.3); g.gain.setTargetAtTime(0.0001, t + dur * 0.75, dur * 0.2);
    } else {
      for (const m of ms) for (const det of [-7, 7]) {
        const o = c.createOscillator(); o.type = kind === 'tri' ? 'triangle' : kind === 'organ' ? 'square' : 'sawtooth';
        o.frequency.value = mtof(m - (kind === 'organ' ? 12 : 0)); o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.5);
      }
    }
    g.connect(out);
  }
  private voice(inst: Inst, t: number, m: number, dur: number, v: number, out: AudioNode): void {
    const c = this.ctx;
    if (inst === 'bell' || inst === 'pluck') {
      const f = mtof(m + (inst === 'bell' ? 12 : 0));
      const car = c.createOscillator(); car.frequency.value = f;
      const mod = c.createOscillator(); mod.frequency.value = f * (inst === 'bell' ? 3.5 : 2);
      const mg = c.createGain(); mg.gain.setValueAtTime(f * (inst === 'bell' ? 1.2 : 2.5), t); mg.gain.exponentialRampToValueAtTime(1, t + (inst === 'bell' ? 1.2 : 0.25));
      mod.connect(mg); mg.connect(car.frequency);
      const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + (inst === 'bell' ? 1.8 : 0.5));
      car.connect(g); g.connect(out); car.start(t); mod.start(t); car.stop(t + 2); mod.stop(t + 2);
      return;
    }
    if (inst === 'choir') { this.pad(t, [m], dur * 2, 'choir', out); return; }
    // lead: detuned square with vibrato through a resonant filter
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = 3;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.8, t + 0.01); g.gain.setTargetAtTime(0.0001, t + dur * 0.7, dur * 0.25);
    const vib = c.createOscillator(); vib.frequency.value = 5.5; const vg = c.createGain(); vg.gain.value = 6; vib.connect(vg);
    for (const det of [-9, 9]) { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = mtof(m); o.detune.value = det; vg.connect(o.detune); o.connect(lp); o.start(t); o.stop(t + dur + 0.3); }
    vib.start(t); vib.stop(t + dur + 0.3);
    lp.connect(g); g.connect(out);
  }
}
