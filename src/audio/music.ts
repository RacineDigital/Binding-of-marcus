// Adaptive music player. Songs (songs.ts) are rendered offline into a calm stem and a combat stem
// (render.ts); both loop in sync and crossfade with fight intensity. Tracks are rendered in the
// background the first time they are needed (and can be pre-rendered with prepare()).
import { SONGS } from './songs';
import { renderSong, Stems } from './render';

interface Playing {
  name: string; master: GainNode; calm: GainNode; combat: GainNode;
  srcs: AudioBufferSourceNode[]; only?: 'calm' | 'combat';
}

export class Music {
  ctx: AudioContext; out: GainNode;
  name: string | null = null;
  intensity = 0; target = 0;
  private cur: Playing | null = null;
  constructor(ctx: AudioContext, out: GainNode, _reverb: AudioNode) {
    this.ctx = ctx; this.out = out;
  }
  /** Start rendering a track ahead of time so it is ready the moment it is needed. */
  prepare(name: string): void {
    const s = SONGS[name]; if (s) void renderSong(name, s).catch((e) => console.warn('music render failed', name, e));
  }
  setTrack(name: string | null): void {
    if (name === this.name) return;
    this.name = name;
    this.stopCurrent(1.4);
    if (!name) return;
    const song = SONGS[name]; if (!song) return;
    renderSong(name, song, true).then((stems) => { if (this.name === name && !this.cur) this.start(name, stems, song.only); })
      .catch((e) => console.warn('music render failed', name, e));
  }
  private stopCurrent(fade: number): void {
    const p = this.cur; if (!p) return;
    this.cur = null;
    const t = this.ctx.currentTime;
    p.master.gain.cancelScheduledValues(t);
    p.master.gain.setValueAtTime(p.master.gain.value, t);
    p.master.gain.linearRampToValueAtTime(0, t + fade);
    for (const s of p.srcs) { try { s.stop(t + fade + 0.05); } catch { /* already stopped */ } }
    setTimeout(() => { try { p.master.disconnect(); } catch { /* */ } }, (fade + 0.3) * 1000);
  }
  private start(name: string, st: Stems, only?: 'calm' | 'combat'): void {
    const c = this.ctx, t = c.currentTime + 0.06;
    const master = c.createGain(); master.gain.setValueAtTime(0, t); master.gain.linearRampToValueAtTime(1, t + 1.2); master.connect(this.out);
    const calm = c.createGain(), combat = c.createGain();
    calm.connect(master); combat.connect(master);
    const srcs: AudioBufferSourceNode[] = [];
    for (const [buf, g] of [[st.calm, calm], [st.combat, combat]] as [AudioBuffer, GainNode][]) {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(g); s.start(t); srcs.push(s);
    }
    this.cur = { name, master, calm, combat, srcs, only };
    this.applyMix(true);
  }
  setIntensity(i: number): void { this.target = i; }
  private applyMix(immediate = false): void {
    const p = this.cur; if (!p) return;
    const i = p.only === 'calm' ? 0 : p.only === 'combat' ? 1 : this.intensity;
    // equal-power crossfade keeps the loudness steady through the blend
    const gc = Math.cos((i * Math.PI) / 2), gx = Math.sin((i * Math.PI) / 2);
    const t = this.ctx.currentTime;
    if (immediate) { p.calm.gain.value = gc; p.combat.gain.value = gx; return; }
    p.calm.gain.setTargetAtTime(gc, t, 0.08); p.combat.gain.setTargetAtTime(gx, t, 0.08);
  }
  update(dt: number): void {
    // ease into combat quickly, back out slowly so the band does not drop the moment a room clears
    const k = this.target > this.intensity ? 2.2 : 0.6;
    this.intensity += (this.target - this.intensity) * Math.min(1, dt * k);
    this.applyMix();
  }
}
