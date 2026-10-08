// Floor ambience: a looping room tone (filtered noise, slow swells, mains hum) plus sparse one-off
// details (drips, creaks, distant pipes, monitor beeps, a clock) on their own bus with its own
// volume setting. Everything is synthesised live from a few cached noise buffers, so it costs no
// assets and a handful of nodes. Fights pull the ambience down so combat sounds stay on top.
import type { FloorTheme } from '../data/floors';
import { familyOf } from '../data/floors';

export type AmbientEvent = 'drip' | 'creak' | 'crackle' | 'clang' | 'chime' | 'rustle' | 'groan' | 'bubble' | 'beep' | 'gust' | 'flutter' | 'hiss';

export interface Soundscape {
  /** Bed colour: brown is a low rumble, pink an airy hiss. */
  noise: 'brown' | 'pink';
  /** Low-pass cutoff of the bed (Hz) and its level. */
  lp: number; level: number;
  /** Slow swell of the bed: depth (0..1) and rate (Hz). */
  swell: number; swellHz: number;
  /** Steady tones: [frequency, level]. */
  hum?: [number, number][];
  /** One-off details and how many fire per minute on average. */
  events: [AmbientEvent, number][];
  /** A clock: ticks per second (tick-tock alternates). */
  clock?: number;
}

export const SOUNDSCAPES: Record<string, Soundscape> = {
  cellar: { noise: 'brown', lp: 480, level: 0.32, swell: 0.3, swellHz: 0.07, events: [['drip', 7], ['creak', 4], ['flutter', 2]] },
  boiler: { noise: 'brown', lp: 300, level: 0.36, swell: 0.2, swellHz: 0.11, hum: [[55, 0.05], [110, 0.018]], events: [['crackle', 10], ['clang', 4], ['hiss', 3]] },
  underworks: { noise: 'pink', lp: 900, level: 0.1, swell: 0.25, swellHz: 0.05, events: [['drip', 18], ['clang', 3], ['bubble', 4]] },
  ward: { noise: 'pink', lp: 2400, level: 0.07, swell: 0.1, swellHz: 0.03, hum: [[60, 0.014], [120, 0.007]], events: [['beep', 3], ['creak', 2]] },
  depths: { noise: 'brown', lp: 220, level: 0.48, swell: 0.5, swellHz: 0.05, events: [['groan', 4], ['crackle', 3], ['gust', 2]] },
  chapel: { noise: 'pink', lp: 700, level: 0.08, swell: 0.45, swellHz: 0.04, events: [['chime', 4], ['gust', 3], ['flutter', 1]] },
  hollow: { noise: 'brown', lp: 340, level: 0.34, swell: 0.35, swellHz: 0.06, events: [['bubble', 10], ['groan', 3], ['rustle', 2]] },
  binding: { noise: 'pink', lp: 1200, level: 0.08, swell: 0.3, swellHz: 0.05, events: [['rustle', 10], ['flutter', 3], ['groan', 1]] },
  attic: { noise: 'pink', lp: 1000, level: 0.07, swell: 0.6, swellHz: 0.06, events: [['creak', 8], ['gust', 3], ['flutter', 3]] },
  greenhouse: { noise: 'pink', lp: 1800, level: 0.1, swell: 0.3, swellHz: 0.08, events: [['drip', 9], ['rustle', 5], ['hiss', 1]] },
  printshop: { noise: 'brown', lp: 420, level: 0.24, swell: 0.15, swellHz: 0.1, hum: [[50, 0.03]], events: [['clang', 5], ['rustle', 6], ['hiss', 2]] },
  cistern: { noise: 'pink', lp: 600, level: 0.09, swell: 0.4, swellHz: 0.04, events: [['drip', 14], ['chime', 2], ['bubble', 3]] },
  clocktower: { noise: 'pink', lp: 900, level: 0.1, swell: 0.4, swellHz: 0.05, events: [['gust', 4], ['creak', 3], ['chime', 1]], clock: 1 },
  stacks: { noise: 'pink', lp: 1400, level: 0.09, swell: 0.2, swellHz: 0.04, events: [['rustle', 12], ['creak', 2]] },
  margins: { noise: 'brown', lp: 260, level: 0.4, swell: 0.6, swellHz: 0.03, events: [['bubble', 6], ['rustle', 6], ['groan', 2]] },
  hospital: { noise: 'pink', lp: 2600, level: 0.06, swell: 0.1, swellHz: 0.03, hum: [[60, 0.016], [180, 0.004]], events: [['beep', 7], ['hiss', 1]] },
  home: { noise: 'pink', lp: 800, level: 0.06, swell: 0.2, swellHz: 0.05, events: [['creak', 2]], clock: 1 },
};
const ALIAS: Record<string, string> = {
  lastpage: 'binding', foreword: 'binding', dedication: 'binding',
  waiting: 'hospital', nightward: 'hospital', icu: 'hospital', room4: 'hospital',
};
/** The soundscape a floor plays: its own, its family's, or one matching its visual ambience. */
export function soundscapeFor(th: FloorTheme): string {
  if (SOUNDSCAPES[th.id]) return th.id;
  if (ALIAS[th.id]) return ALIAS[th.id];
  const fam = familyOf(th);
  if (SOUNDSCAPES[fam]) return fam;
  return ({ dust: 'cellar', embers: 'boiler', drips: 'underworks', motes: 'ward', ash: 'depths', glass: 'chapel', ink: 'hollow', pages: 'binding' } as Record<string, string>)[th.ambience] ?? 'cellar';
}

const LOOP_S = 6;

/** Seamless looping noise: the tail is crossfaded into the head. */
function noiseBuffer(c: BaseAudioContext, kind: 'brown' | 'pink' | 'white'): AudioBuffer {
  const sr = c.sampleRate, n = Math.floor(LOOP_S * sr), fade = Math.floor(0.5 * sr);
  const raw = new Float32Array(n + fade);
  let last = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < raw.length; i++) {
    const w = Math.random() * 2 - 1;
    if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; raw[i] = last * 3.5; }
    else if (kind === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; raw[i] = (b0 + b1 + b2 + w * 0.05) * 2.2; }
    else raw[i] = w;
  }
  const buf = c.createBuffer(1, n, sr), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = raw[i];
  for (let i = 0; i < fade; i++) { const t = i / fade; d[i] = raw[i] * t + raw[n + i] * (1 - t); }
  return buf;
}

interface Bed { nodes: AudioScheduledSourceNode[]; out: GainNode }

export class Ambience {
  private bus: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private bed: Bed | null = null;
  private scape: Soundscape | null = null;
  current: string | null = null;
  private clockT = 0; private tock = false;
  private fight = 0;
  /** One-offs fired so far (for tests). */
  fired = 0;

  constructor(private c: AudioContext, out: AudioNode, private reverbIn: AudioNode) {
    this.bus = c.createGain(); this.bus.gain.value = 1; this.bus.connect(out);
  }
  private noise(kind: 'brown' | 'pink' | 'white'): AudioBuffer {
    let b = this.buffers.get(kind);
    if (!b) { b = noiseBuffer(this.c, kind); this.buffers.set(kind, b); }
    return b;
  }

  set(id: string | null): void {
    if (id === this.current) return;
    this.current = id;
    const c = this.c, now = c.currentTime;
    if (this.bed) {
      const old = this.bed; old.out.gain.cancelScheduledValues(now); old.out.gain.setTargetAtTime(0, now, 0.4);
      setTimeout(() => { for (const n of old.nodes) { try { n.stop(); } catch { /* already stopped */ } } old.out.disconnect(); }, 2500);
      this.bed = null;
    }
    this.scape = id ? SOUNDSCAPES[id] ?? null : null;
    const s = this.scape; if (!s) return;
    const out = c.createGain(); out.gain.value = 0; out.connect(this.bus);
    out.gain.setTargetAtTime(1, now, 0.6);
    const nodes: AudioScheduledSourceNode[] = [];
    const src = c.createBufferSource(); src.buffer = this.noise(s.noise); src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = s.lp; lp.Q.value = 0.4;
    const g = c.createGain(); g.gain.value = s.level;
    // the swell: an LFO on the bed's level and, more gently, its brightness
    const lfo = c.createOscillator(); lfo.frequency.value = s.swellHz;
    const depth = c.createGain(); depth.gain.value = s.level * s.swell; lfo.connect(depth); depth.connect(g.gain);
    const bright = c.createGain(); bright.gain.value = s.lp * 0.25 * s.swell; lfo.connect(bright); bright.connect(lp.frequency);
    src.connect(lp); lp.connect(g); g.connect(out);
    src.start(now, Math.random() * LOOP_S); lfo.start(now);
    nodes.push(src, lfo);
    for (const [f, lvl] of s.hum ?? []) {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const hg = c.createGain(); hg.gain.value = lvl; o.connect(hg); hg.connect(out); o.start(now); nodes.push(o);
    }
    this.bed = { nodes, out };
  }

  /** 0 exploring, 1 fighting: fights pull the room tone down. */
  setIntensity(i: number): void {
    const v = i > 0.5 ? 1 : 0; if (v === this.fight) return;
    this.fight = v;
    this.bus.gain.setTargetAtTime(v ? 0.45 : 1, this.c.currentTime, 0.8);
  }

  update(dt: number): void {
    const s = this.scape; if (!s || dt <= 0) return;
    for (const [kind, perMin] of s.events) if (Math.random() < (perMin / 60) * dt) this.event(kind);
    if (s.clock) {
      this.clockT += dt;
      if (this.clockT >= 1 / s.clock) { this.clockT -= 1 / s.clock; this.tick(this.tock = !this.tock); }
    }
  }

  private voice(pan: number, vol: number, wet: number): GainNode {
    const c = this.c, g = c.createGain(); g.gain.value = 0;
    const p = c.createStereoPanner(); p.pan.value = pan;
    const v = c.createGain(); v.gain.value = vol;
    g.connect(v); v.connect(p); p.connect(this.bus);
    const send = c.createGain(); send.gain.value = wet; v.connect(send); send.connect(this.reverbIn);
    return g;
  }
  private env(g: GainNode, t: number, a: number, d: number, peak = 1): void {
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  private noiseShot(at: number, dur: number, type: BiquadFilterType, f: number, q: number, out: AudioNode): AudioBufferSourceNode {
    const c = this.c, s = c.createBufferSource(); s.buffer = this.noise('white');
    const bp = c.createBiquadFilter(); bp.type = type; bp.frequency.value = f; bp.Q.value = q;
    s.connect(bp); bp.connect(out); s.start(at, Math.random() * (LOOP_S - dur - 0.1)); s.stop(at + dur + 0.05);
    return s;
  }

  private tick(tock: boolean): void {
    const c = this.c, t = c.currentTime, g = this.voice(0, 0.05, 0.3);
    const o = c.createOscillator(); o.type = 'square'; o.frequency.value = tock ? 1500 : 1900;
    const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = tock ? 1500 : 1900; hp.Q.value = 6;
    o.connect(hp); hp.connect(g); this.env(g, t, 0.001, 0.03); o.start(t); o.stop(t + 0.06);
  }

  /** Fire one ambient detail now (public for tests). */
  event(kind: AmbientEvent): void {
    const c = this.c, t = c.currentTime + 0.01, R = Math.random, pan = (R() * 2 - 1) * 0.8;
    this.fired++;
    switch (kind) {
      case 'drip': {
        const g = this.voice(pan, 0.12, 0.6), o = c.createOscillator(); o.type = 'sine';
        const f = 900 + R() * 900; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.07);
        o.connect(g); this.env(g, t, 0.002, 0.12); o.start(t); o.stop(t + 0.2); break;
      }
      case 'creak': {
        const g = this.voice(pan, 0.05, 0.4), o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70 + R() * 70;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 9;
        const f0 = 300 + R() * 200; bp.frequency.setValueAtTime(f0, t); bp.frequency.linearRampToValueAtTime(f0 * (1.5 + R()), t + 0.7);
        o.connect(bp); bp.connect(g); this.env(g, t, 0.15, 0.6); o.start(t); o.stop(t + 0.9); break;
      }
      case 'crackle': {
        const g = this.voice(pan, 0.08, 0.15); g.gain.value = 1;
        for (let i = 0, n = 3 + Math.floor(R() * 6); i < n; i++) {
          const at = t + R() * 0.4, cg = c.createGain(); cg.connect(g);
          this.env(cg, at, 0.001, 0.015 + R() * 0.02); this.noiseShot(at, 0.05, 'highpass', 1800 + R() * 2500, 0.7, cg);
        }
        break;
      }
      case 'clang': {
        const g = this.voice(pan, 0.05, 0.8), lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(g);
        const base = 160 + R() * 120;
        for (const m of [1, 2.76, 5.4]) { const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = base * m; const og = c.createGain(); og.gain.value = 1 / m; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 1.6); }
        this.env(g, t, 0.003, 1.4); break;
      }
      case 'chime': {
        const g = this.voice(pan, 0.035, 0.9), base = [988, 1175, 1319, 1568][Math.floor(R() * 4)];
        for (const m of [1, 2.01, 3.03]) { const o = c.createOscillator(); o.frequency.value = base * m; const og = c.createGain(); og.gain.value = 0.6 / m; o.connect(og); og.connect(g); o.start(t); o.stop(t + 2.6); }
        this.env(g, t, 0.004, 2.4); break;
      }
      case 'rustle': {
        const g = this.voice(pan, 0.07, 0.25); this.env(g, t, 0.05, 0.25 + R() * 0.2);
        this.noiseShot(t, 0.6, 'bandpass', 2500 + R() * 2000, 1.2, g); break;
      }
      case 'groan': {
        const g = this.voice(pan * 0.5, 0.14, 0.5), o = c.createOscillator(); o.type = 'sine';
        const f = 38 + R() * 22; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * (0.8 + R() * 0.4), t + 2.2);
        const o2 = c.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 1.5; const g2 = c.createGain(); g2.gain.value = 0.3; o2.connect(g2); g2.connect(g);
        o.connect(g); this.env(g, t, 0.8, 1.6); o.start(t); o2.start(t); o.stop(t + 2.6); o2.stop(t + 2.6); break;
      }
      case 'bubble': {
        const g = this.voice(pan, 0.06, 0.4); g.gain.value = 1;
        for (let i = 0, n = 1 + Math.floor(R() * 3); i < n; i++) {
          const at = t + i * (0.08 + R() * 0.1), o = c.createOscillator(), og = c.createGain(); og.connect(g);
          const f = 180 + R() * 220; o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * 2.6, at + 0.06);
          o.connect(og); this.env(og, at, 0.004, 0.07); o.start(at); o.stop(at + 0.12);
        }
        break;
      }
      case 'beep': {
        const g = this.voice(pan, 0.025, 0.7); g.gain.value = 1;
        for (let i = 0; i < 2; i++) { const at = t + i * 0.5, o = c.createOscillator(), og = c.createGain(); o.frequency.value = 880; o.connect(og); og.connect(g); this.env(og, at, 0.005, 0.12); o.start(at); o.stop(at + 0.2); }
        break;
      }
      case 'gust': {
        const g = this.voice(pan * 0.5, 0.14, 0.3), lp = c.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.setValueAtTime(250, t); lp.frequency.linearRampToValueAtTime(900, t + 1.4); lp.frequency.linearRampToValueAtTime(250, t + 3);
        lp.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.2); g.gain.linearRampToValueAtTime(0, t + 3);
        const s = c.createBufferSource(); s.buffer = this.noise('pink'); s.connect(lp); s.start(t, R() * 2); s.stop(t + 3.1); break;
      }
      case 'flutter': {
        const g = this.voice(pan, 0.05, 0.2);
        const am = c.createOscillator(); am.frequency.value = 22 + R() * 10; const amg = c.createGain(); amg.gain.value = 0.5; am.connect(amg); amg.connect(g.gain);
        g.gain.setValueAtTime(0.5, t); g.gain.linearRampToValueAtTime(0, t + 0.45); am.start(t); am.stop(t + 0.5);
        this.noiseShot(t, 0.5, 'bandpass', 1400, 1.5, g); break;
      }
      case 'hiss': {
        const g = this.voice(pan, 0.05, 0.2); this.env(g, t, 0.2, 1.2);
        this.noiseShot(t, 1.5, 'highpass', 3500, 0.5, g); break;
      }
    }
  }
}
