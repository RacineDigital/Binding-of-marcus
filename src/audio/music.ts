// Adaptive music player. Songs (songs.ts) are rendered offline into a calm stem and a combat stem
// (render.ts); both loop in sync and crossfade with fight intensity. Tracks are rendered in the
// background the first time they are needed (and can be pre-rendered with prepare()).
import { SONGS } from './songs';
import { renderSong, Stems } from './render';
import { RECORDINGS } from './recorded';

/** Recorded tracks are named 'rec_<chapter>'; if one can't load, `fallback` plays instead. */
export const recName = (id: string) => 'rec_' + id;
export const RECORDED = new Set(RECORDINGS.map((r) => r.id));
const fallbacks = new Map<string, string>();
/** The track to play for a chapter: its recording when the game ships one, else `old`. */
export function chapterTrack(id: string, old: string): string {
  if (!RECORDED.has(id)) return old;
  fallbacks.set(recName(id), old);
  return recName(id);
}

interface Playing {
  name: string; master: GainNode; calm: GainNode; combat: GainNode;
  srcs: AudioBufferSourceNode[]; only?: 'calm' | 'combat'; recording?: boolean;
}

export class Music {
  ctx: AudioContext; out: GainNode;
  name: string | null = null;
  intensity = 0; target = 0;
  private cur: Playing | null = null;
  /** Decoded recordings: the current one and whatever is being readied next (older ones dropped). */
  private recs = new Map<string, Promise<AudioBuffer>>();
  constructor(ctx: AudioContext, out: GainNode, _reverb: AudioNode) {
    this.ctx = ctx; this.out = out;
  }
  /** Start rendering a track ahead of time so it is ready the moment it is needed. */
  prepare(name: string): void {
    if (name.startsWith('rec_')) { void this.loadRec(name).catch(() => this.prepare(fallbacks.get(name) ?? '')); return; }
    const s = SONGS[name]; if (s) void renderSong(name, s).catch((e) => console.warn('music render failed', name, e));
  }
  private loadRec(name: string): Promise<AudioBuffer> {
    let p = this.recs.get(name);
    if (p) { this.recs.delete(name); this.recs.set(name, p); }   // most recently used goes to the back
    else {
      const url = new URL('music/' + name.slice(4) + '.ogg', document.baseURI).href;
      // XHR rather than fetch: the desktop app runs from disk, and fetch can't read file:// URLs
      p = new Promise<ArrayBuffer>((ok, fail) => {
        const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = 'arraybuffer';
        x.onload = () => (x.status === 200 || (x.status === 0 && x.response?.byteLength) ? ok(x.response) : fail(new Error(x.status + ' ' + url)));
        x.onerror = () => fail(new Error('cannot read ' + url));
        x.send();
      }).then((b) => this.ctx.decodeAudioData(b));
      p.catch(() => this.recs.delete(name));
      this.recs.set(name, p);
      // keep memory down: a decoded track is ~60 MB of samples, so hold on to the two most recently used
      // (a track already playing keeps its own buffer even if it falls out of here)
      while (this.recs.size > 2) this.recs.delete(this.recs.keys().next().value!);
    }
    return p;
  }
  setTrack(name: string | null): void {
    if (name === this.name) return;
    this.name = name;
    this.stopCurrent(1.4);
    if (!name) return;
    if (name.startsWith('rec_')) {
      this.loadRec(name).then((buf) => { if (this.name === name && !this.cur) this.startRec(name, buf); })
        .catch((e) => {
          // no recordings here (e.g. the standalone page opened from disk): play the old track
          console.warn('recording unavailable, using the synth track', name, e);
          const fb = fallbacks.get(name);
          if (this.name === name && fb) { this.name = null; this.setTrack(fb); }
        });
      return;
    }
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
  /**
   * A recording is one full mix, so calm and combat are the same take: exploring hears it through a
   * gentle low-pass (keeps the riff and drums present) and a little quieter; a fight opens it up.
   */
  private startRec(name: string, buf: AudioBuffer): void {
    const c = this.ctx, t = c.currentTime + 0.06;
    const master = c.createGain(); master.gain.setValueAtTime(0, t); master.gain.linearRampToValueAtTime(0.8, t + 1.2); master.connect(this.out);
    const calm = c.createGain(), combat = c.createGain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.5;
    const soft = c.createGain(); soft.gain.value = 0.85;
    lp.connect(soft); soft.connect(calm); calm.connect(master); combat.connect(master);
    const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = 0; s.loopEnd = buf.duration;
    s.connect(lp); s.connect(combat); s.start(t);
    this.cur = { name, master, calm, combat, srcs: [s], recording: true };
    this.applyMix(true);
  }
  setIntensity(i: number): void { this.target = i; }
  private applyMix(immediate = false): void {
    const p = this.cur; if (!p) return;
    const i = p.only === 'calm' ? 0 : p.only === 'combat' ? 1 : this.intensity;
    // Separate stems use equal-power fades; two versions of the same recording are correlated,
    // so a linear fade avoids a volume surge halfway into combat.
    const gc = p.recording ? 1 - i : Math.cos((i * Math.PI) / 2);
    const gx = p.recording ? i : Math.sin((i * Math.PI) / 2);
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
