// The real audio engine: offline-rendered SFX with variants, stereo panning, voice limiting,
// a shared reverb and the adaptive music sequencer.
import { AudioEngine, PlayOpts } from './audio';
import { RECIPES, STINGERS, Recipe } from './sfx';
import { impulse } from './dsp';
import { Music } from './music';

export class SynthAudio extends AudioEngine {
  ctx: AudioContext | null = null;
  master!: GainNode; sfx!: GainNode; musicBus!: GainNode; reverb!: ConvolverNode; reverbIn!: GainNode;
  music: Music | null = null;
  buffers = new Map<string, AudioBuffer[]>();
  recent = new Map<string, number[]>();
  musicVol = 0.7; sfxVol = 0.8;
  pendingTrack: string | null = null; pendingIntensity = 0;
  listenerX = 240;
  private rendering = false;
  private duckUntil = 0;

  unlock(): void {
    if (!this.ctx) {
      try { this.ctx = new AudioContext({ latencyHint: 'interactive' }); } catch { return; }
      const c = this.ctx;
      this.master = c.createGain(); this.master.gain.value = 0.9;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
      this.master.connect(comp); comp.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.gain.value = this.sfxVol; this.sfx.connect(this.master);
      this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicVol * 0.55; this.musicBus.connect(this.master);
      this.reverb = c.createConvolver(); this.reverb.buffer = impulse(c, 2.4, 3.2, 0.35);
      this.reverbIn = c.createGain(); this.reverbIn.gain.value = 1;
      const rvOut = c.createGain(); rvOut.gain.value = 0.32;
      this.reverbIn.connect(this.reverb); this.reverb.connect(rvOut); rvOut.connect(this.master);
      this.music = new Music(c, this.musicBus, this.reverbIn);
      if (this.pendingTrack) this.music.setTrack(this.pendingTrack);
      for (const t of this.pendingPrepare) this.music.prepare(t);
      this.music.setIntensity(this.pendingIntensity);
      this.renderAll();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  private async renderAll(): Promise<void> {
    if (this.rendering) return;
    this.rendering = true;
    const all: [string, Recipe][] = [...Object.entries(RECIPES), ...Object.entries(STINGERS).map(([k, v]) => ['st_' + k, v] as [string, Recipe])];
    // most common sounds first
    const prio = ['shoot', 'splat', 'hit', 'death', 'hurt', 'door', 'doorSlam', 'coin', 'roomClear', 'boomSmall', 'boom'];
    all.sort((a, b) => (prio.includes(b[0]) ? 1 : 0) - (prio.includes(a[0]) ? 1 : 0));
    for (const [name, r] of all) {
      const n = r.variants ?? 1;
      const out: AudioBuffer[] = [];
      for (let v = 0; v < n; v++) {
        try {
          const oc = new OfflineAudioContext(1, Math.ceil(44100 * r.dur), 44100);
          const g = oc.createGain(); g.gain.value = 1; g.connect(oc.destination);
          r.render(oc, g, v);
          const buf = await oc.startRendering();
          const d = buf.getChannelData(0); let pk = 0;
          for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > pk) pk = a; }
          const k = pk > 0.95 ? 0.95 / pk : pk > 0 && pk < 0.3 ? 0.3 / pk : 1;
          if (k !== 1) for (let i = 0; i < d.length; i++) d[i] *= k;
          out.push(buf);
        } catch (e) { console.warn('sfx render failed', name, e); }
      }
      this.buffers.set(name, out);
    }
  }

  play(name: string, o: PlayOpts = {}): void {
    const c = this.ctx; if (!c) return;
    const bufs = this.buffers.get(name); if (!bufs || !bufs.length) return;
    const r = RECIPES[name];
    const now = c.currentTime;
    const lim = r?.limit ?? 5;
    const rec = (this.recent.get(name) ?? []).filter((t) => now - t < 0.06);
    if (rec.length >= lim) return;
    rec.push(now); this.recent.set(name, rec);
    const src = c.createBufferSource();
    src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
    src.playbackRate.value = (o.pitch ?? 1) * (0.95 + Math.random() * 0.1);
    const g = c.createGain(); g.gain.value = (r?.vol ?? 0.5) * (o.vol ?? 1);
    const pan = c.createStereoPanner();
    pan.pan.value = o.x !== undefined ? Math.max(-0.7, Math.min(0.7, (o.x - this.listenerX) / 300)) : 0;
    src.connect(g); g.connect(pan); pan.connect(this.sfx);
    const send = c.createGain(); send.gain.value = 0.18; g.connect(send); send.connect(this.reverbIn);
    src.start(now);
  }
  stinger(name: string): void {
    const c = this.ctx; if (!c) return;
    const bufs = this.buffers.get('st_' + name); if (!bufs?.length) return;
    const src = c.createBufferSource(); src.buffer = bufs[0];
    const g = c.createGain(); g.gain.value = STINGERS[name]?.vol ?? 0.6;
    src.connect(g); g.connect(this.sfx);
    const send = c.createGain(); send.gain.value = 0.35; g.connect(send); send.connect(this.reverbIn);
    src.start();
    this.duck(0.35, (STINGERS[name]?.dur ?? 1.5) * 0.8);
  }
  setMusic(t: string | null): void { this.pendingTrack = t; this.music?.setTrack(t); }
  prepareMusic(t: string): void { if (this.music) this.music.prepare(t); else this.pendingPrepare.push(t); }
  private pendingPrepare: string[] = [];
  setIntensity(i: number): void { this.pendingIntensity = i; this.music?.setIntensity(i); }
  setVolumes(m: number, s: number): void {
    this.musicVol = m; this.sfxVol = s;
    if (this.ctx) { this.musicBus.gain.setTargetAtTime(m * 0.55, this.ctx.currentTime, 0.05); this.sfx.gain.setTargetAtTime(s, this.ctx.currentTime, 0.05); }
  }
  duck(amt: number, t: number): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.duckUntil = now + t;
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.55 * amt, now, 0.05);
    this.musicBus.gain.setTargetAtTime(this.musicVol * 0.55, now + t, 0.4);
  }
  update(dt: number): void { this.music?.update(dt); }
}
