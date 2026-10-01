// Offline music renderer: turns a Song into two seamlessly looping stereo stems (calm, combat).
// Heavy sounds (guitars, drums, bass) are synthesized sample-by-sample in inst.ts; synth voices
// use Web Audio nodes inside an OfflineAudioContext. Rendering happens in the background.
import { Song, Part, SCALES, Layer, GuitarPart } from './score';
import * as I from './inst';
import * as SV from './synthvoices';

const SR = I.SR;
const yieldFrame = () => new Promise<void>((r) => setTimeout(r, 0));

export interface Stems { calm: AudioBuffer; combat: AudioBuffer; loop: number }

interface Ctx {
  oc: OfflineAudioContext; song: Song; spb: number; // seconds per 16th
  buses: { gtrL: AudioNode; gtrR: AudioNode; drums: AudioNode; synth: AudioNode; bass: AudioNode; rev: AudioNode };
  bufs: Map<Float32Array, AudioBuffer>;
}

function toBuffer(c: Ctx, d: Float32Array): AudioBuffer {
  let b = c.bufs.get(d);
  if (!b) { b = c.oc.createBuffer(1, d.length, SR); b.getChannelData(0).set(d); c.bufs.set(d, b); }
  return b;
}
/** Shared routing node per (destination, pan, reverb send) so notes do not each build a panner. */
const routes = new WeakMap<AudioNode, Map<string, AudioNode>>();
function route(c: Ctx, out: AudioNode, pan: number, send: number): AudioNode {
  if (!pan && !send) return out;
  let m = routes.get(out); if (!m) { m = new Map(); routes.set(out, m); }
  const key = pan.toFixed(2) + ':' + send.toFixed(2);
  let n = m.get(key);
  if (!n) {
    const g = c.oc.createGain();
    let node: AudioNode = g;
    if (pan) { const p = c.oc.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    node.connect(out);
    if (send) { const sg = c.oc.createGain(); sg.gain.value = send; node.connect(sg); sg.connect(c.buses.rev); }
    m.set(key, g); n = g;
  }
  return n;
}
function play(c: Ctx, d: Float32Array, t: number, vol: number, out: AudioNode, opts: { dur?: number; pan?: number; rate?: number; send?: number } = {}): void {
  const s = c.oc.createBufferSource(); s.buffer = toBuffer(c, d);
  if (opts.rate) s.playbackRate.value = opts.rate;
  const g = c.oc.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(route(c, out, opts.pan ?? 0, opts.send ?? 0));
  if (opts.dur !== undefined && opts.dur < d.length / SR - 0.01) {
    g.gain.setValueAtTime(vol, t + Math.max(0.01, opts.dur - 0.02));
    g.gain.linearRampToValueAtTime(0, t + opts.dur);
    s.start(t); s.stop(t + opts.dur + 0.01);
  } else s.start(t);
}

// --------------------------------------------------------------------------- music theory
function scaleNote(song: Song, deg: number, base: number): number {
  const sc = SCALES[song.scale];
  const o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
  return base + sc[i] + 12 * o;
}
/** Chord tones (root, third, fifth, seventh, octave...) for a bar. */
function chordTones(song: Song, bar: number, base: number, seventh = false): number[] {
  const d = song.chords[bar % song.chords.length];
  const tones = [0, 2, 4].concat(seventh ? [6] : []).map((k) => scaleNote(song, d + k, base));
  return tones.concat(tones.map((m) => m + 12), tones.map((m) => m + 24));
}
function chordRoot(song: Song, bar: number, base: number): number { return scaleNote(song, song.chords[bar % song.chords.length], base); }

function active(p: Part, layer: 'calm' | 'combat'): boolean {
  const l: Layer = p.layer;
  return l === 'both' || l === layer;
}
/** MIDI note of the key root in a given octave (octave 2 -> the C2..B2 range). */
function keyBase(song: Song, octave: number): number { return (song.key % 12) + (octave + 1) * 12; }
function barActive(p: Part, bar: number): boolean { return (p.from === undefined || bar >= p.from) && (p.to === undefined || bar < p.to); }
function stepTime(c: Ctx, step: number): number {
  const sw = c.song.swing && step % 2 === 1 ? c.spb * c.song.swing : 0;
  return step * c.spb + sw;
}

// --------------------------------------------------------------------------- guitars
interface GtrEvent { step: number; midi: number; mute: boolean; len: number }
function guitarEvents(song: Song, p: GuitarPart): GtrEvent[] {
  const total = song.bars * 16;
  const evs: GtrEvent[] = [];
  const notes = p.notes ?? [0, 3, 5, 7, 10, 12, 1, 6, 8, 2];
  for (let s = 0; s < total; s++) {
    const bar = Math.floor(s / 16);
    if (!barActive(p, bar)) continue;
    const ch = p.cycle ? p.cycle[s % p.cycle.length] : p.riff ? p.riff[bar % p.riff.length][s % 16] : '.';
    if (!ch || ch === '.' || ch === '-') continue;
    const root = chordRoot(song, bar, p.low);
    let midi = 0, mute = true;
    if (ch === 'x') { midi = p.low; }
    else if (ch === 'X') { midi = root; mute = false; }
    else if (ch >= '0' && ch <= '9') { midi = root + notes[ch.charCodeAt(0) - 48]; }
    else if (ch >= 'A' && ch <= 'J') { midi = root + notes[ch.charCodeAt(0) - 65]; mute = false; }
    else continue;
    evs.push({ step: s, midi, mute, len: 1 });
  }
  // note lengths: until the next event or a rest; '-' extends
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i];
    let len = 1;
    for (let s = e.step + 1; s < e.step + 32 && s < total; s++) {
      const bar = Math.floor(s / 16);
      const ch = p.cycle ? p.cycle[s % p.cycle.length] : p.riff ? p.riff[bar % p.riff.length][s % 16] : '.';
      if (ch === '-') len++; else break;
    }
    e.len = len;
  }
  return evs;
}

async function renderGuitar(c: Ctx, p: GuitarPart): Promise<number[]> {
  const evs = guitarEvents(c.song, p);
  const kicks: number[] = [];
  let n = 0;
  for (const e of evs) {
    const t = stepTime(c, e.step);
    const dur = e.mute ? Math.min(e.len * c.spb + 0.05, 0.3) : e.len * c.spb + 0.04;
    for (const take of [0, 1]) {
      const d = I.guitar(e.midi, { mute: e.mute, dur: e.mute ? 0.26 : Math.min(2.4, Math.max(0.2, dur + 0.1)), take, voicing: e.mute ? 'root' : p.voicing ?? 'power', gain: p.gain });
      play(c, d, t + take * 0.004, p.vol * (e.mute ? 0.95 : 0.8), take ? c.buses.gtrR : c.buses.gtrL, { dur });
    }
    if (e.mute || e.len <= 2) kicks.push(e.step);
    if (++n % 40 === 0) await yieldFrame();
  }
  return kicks;
}

// --------------------------------------------------------------------------- synth voices
function panned(c: Ctx, out: AudioNode, pan: number, send: number): AudioNode {
  const p = c.oc.createStereoPanner(); p.pan.value = pan; p.connect(out);
  if (send > 0) { const s = c.oc.createGain(); s.gain.value = send; p.connect(s); s.connect(c.buses.rev); }
  return p;
}

function voicePad(c: Ctx, sound: string, notes: number[], t: number, dur: number, vol: number, out: AudioNode, cut?: number): void {
  if (sound === 'glass') { for (const m of notes) play(c, SV.bell(m + 12, Math.min(dur, 2.5)), t, vol * 0.5, out); return; }
  const k = sound === 'choir' ? 0.8 : sound === 'organ' ? 0.7 : sound === 'strings' ? 0.7 : sound === 'warm' ? 0.75 : 0.6;
  // two decorrelated renders panned apart for width
  play(c, SV.pad(sound, notes, dur, cut, 1), t, vol * k, out, { pan: -0.45 });
  play(c, SV.pad(sound, notes, dur, cut, 2), t, vol * k, out, { pan: 0.45 });
}

function voiceLead(c: Ctx, sound: string, m: number, t: number, dur: number, vol: number, out: AudioNode, prev: number | null, glide: boolean): void {
  if (sound === 'guitar') {
    const d = I.guitar(m, { dur: Math.min(2.5, dur + 0.25), voicing: 'single', gain: 1.6, take: 0 });
    play(c, d, t, vol * 0.75, out, { dur: dur + 0.08 });
    return;
  }
  if (sound === 'clean') { play(c, I.cleanPluck(m, Math.max(0.5, dur + 0.6), 0.7), t, vol * 0.8, out); return; }
  if (sound === 'bell') { play(c, SV.bell(m, dur * 1.5), t, vol * 0.7, out); return; }
  if (sound === 'choir' || sound === 'strings' || sound === 'organ') { play(c, SV.pad(sound, [m], dur, undefined, 3), t, vol * 0.9, out); return; }
  play(c, SV.lead(m, dur, sound === 'square' ? 'square' : 'saw', glide ? prev : null), t, vol * 0.55, out);
}

function voiceSynthBass(c: Ctx, m: number, t: number, dur: number, vol: number, out: AudioNode, cut: number, grit: number): void {
  play(c, SV.synthBass(m, dur, cut, grit), t, vol * 0.75, out);
}

function voicePluck(c: Ctx, sound: string, m: number, t: number, dur: number, vol: number, out: AudioNode, cut: number): void {
  if (sound === 'clean' || sound === 'harp') { play(c, I.cleanPluck(m, Math.max(0.6, dur + (sound === 'harp' ? 1.2 : 0.4)), sound === 'harp' ? 0.85 : 0.6), t, vol, out); return; }
  if (sound === 'bell') { play(c, SV.bell(m, Math.max(0.8, dur * 2)), t, vol * 0.7, out); return; }
  play(c, SV.pluck(m, dur, cut, sound === 'saw' ? 'saw' : 'square'), t, vol * 0.6, out);
}

// --------------------------------------------------------------------------- melody parsing
function parseMelody(song: Song, src: string, base: number): { step: number; midi: number | null; len: number }[] {
  const out: { step: number; midi: number | null; len: number }[] = [];
  let s = 0;
  for (const tok of src.replace(/\|/g, ' ').trim().split(/\s+/)) {
    const [d, l] = tok.split(':');
    const len = Number(l || 1);
    if (d === 'r') { out.push({ step: s, midi: null, len }); s += len; continue; }
    let acc = 0, ds = d;
    if (ds.endsWith('+')) { acc = 1; ds = ds.slice(0, -1); } else if (ds.endsWith('b')) { acc = -1; ds = ds.slice(0, -1); }
    out.push({ step: s, midi: scaleNote(song, Number(ds), base) + acc, len });
    s += len;
  }
  return out;
}

// --------------------------------------------------------------------------- song renderer
async function renderStem(song: Song, layer: 'calm' | 'combat', tail: number): Promise<AudioBuffer> {
  const tStart = performance.now();
  const spb = 60 / song.bpm / 4;
  const loop = song.bars * 16 * spb;
  const oc = new OfflineAudioContext(2, Math.ceil((loop + tail) * SR), SR);
  // master chain: glue compressor -> limiter
  const master = oc.createGain(); master.gain.value = 0.9;
  const comp = oc.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3.5; comp.attack.value = 0.008; comp.release.value = 0.18; comp.knee.value = 8;
  const lim = oc.createDynamicsCompressor(); lim.threshold.value = -3; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08; lim.knee.value = 0;
  master.connect(comp); comp.connect(lim); lim.connect(oc.destination);
  // reverb
  const rv = oc.createConvolver(); rv.normalize = true;
  const [irL, irR] = I.reverbIR(song.reverb.seconds, song.reverb.damp, song.bpm);
  const irb = oc.createBuffer(2, irL.length, SR); irb.getChannelData(0).set(irL); irb.getChannelData(1).set(irR); if (!(globalThis as any).__noConv) rv.buffer = irb;
  const rvIn = oc.createGain(); rvIn.gain.value = 1;
  const rvHp = oc.createBiquadFilter(); rvHp.type = 'highpass'; rvHp.frequency.value = 220;
  const rvOut = oc.createGain(); rvOut.gain.value = song.reverb.mix;
  rvIn.connect(rvHp); rvHp.connect(rv); rv.connect(rvOut); rvOut.connect(master);
  // guitar cabinet: tighten lows, scoop low mids, presence bump, roll off fizz
  const cab = (pan: number): AudioNode => {
    const hp = oc.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85; hp.Q.value = 0.7;
    const scoop = oc.createBiquadFilter(); scoop.type = 'peaking'; scoop.frequency.value = 420; scoop.Q.value = 1.1; scoop.gain.value = -4;
    const pres = oc.createBiquadFilter(); pres.type = 'peaking'; pres.frequency.value = 2300; pres.Q.value = 0.9; pres.gain.value = 3.5;
    const fz = oc.createBiquadFilter(); fz.type = 'lowpass'; fz.frequency.value = 6200; fz.Q.value = 0.6;
    const p = oc.createStereoPanner(); p.pan.value = pan;
    hp.connect(scoop); scoop.connect(pres); pres.connect(fz); fz.connect(p); p.connect(master);
    const s = oc.createGain(); s.gain.value = 0.08; p.connect(s); s.connect(rvIn);
    return hp;
  };
  const drums = oc.createGain(); drums.gain.value = 1;
  const dcomp = oc.createDynamicsCompressor(); dcomp.threshold.value = -12; dcomp.ratio.value = 3; dcomp.attack.value = 0.003; dcomp.release.value = 0.12;
  drums.connect(dcomp); dcomp.connect(master);
  const synth = oc.createGain(); synth.connect(master);
  const bass = oc.createGain(); const bhp = oc.createBiquadFilter(); bhp.type = 'highpass'; bhp.frequency.value = 32; bass.connect(bhp); bhp.connect(master);
  const c: Ctx = { oc, song, spb, buses: { gtrL: cab(-0.75), gtrR: cab(0.75), drums, synth, bass, rev: rvIn }, bufs: new Map() };

  const total = song.bars * 16;
  const parts = song.parts.filter((p) => active(p, layer));
  // guitars first so drums / bass can follow them
  let gtrSteps: number[] = [];
  let gtrEvents: GtrEvent[] = [];
  for (const p of parts) if (p.kind === 'guitar') {
    gtrSteps = gtrSteps.concat(await renderGuitar(c, p));
    gtrEvents = gtrEvents.concat(guitarEvents(song, p));
  }
  for (const p of parts) {
    const vol = p.vol, rev = p.rev ?? 0.2, pan = p.pan ?? 0;
    switch (p.kind) {
      case 'drums': {
        const kk = I.kick(p.style === 'synth' ? 'synth' : p.style === 'industrial' ? 'industrial' : 'metal');
        const sn = I.snare(p.style === 'synth' ? 'gated' : p.style === 'industrial' ? 'industrial' : 'rock');
        const gh = I.snare('rock', true);
        const kickSteps = new Set<number>();
        if (p.kickFollows) for (const s of gtrSteps) kickSteps.add(s);
        for (let s = 0; s < total; s++) {
          const bar = Math.floor(s / 16), i = s % 16;
          if (!barActive(p, bar)) continue;
          const t = stepTime(c, s);
          const at = (arr?: string[]) => (arr ? arr[bar % arr.length][i] ?? '.' : '.');
          if (at(p.kick) === 'x') kickSteps.add(s);
          const sc = at(p.snare);
          if (sc === 'x') play(c, sn, t, vol * 0.9, drums, { send: p.style === 'synth' ? 0.35 : 0.12 });
          if (sc === 'g') play(c, gh, t, vol * 0.5, drums, { send: 0.05 });
          const hc = at(p.hat);
          if (hc === 'x') play(c, I.cymbal('hat'), t, vol * (i % 4 === 0 ? 0.55 : 0.4), drums, { pan: 0.3 });
          if (hc === 'o') play(c, I.cymbal('open'), t, vol * 0.45, drums, { pan: 0.3, send: 0.05 });
          if (hc === 'r') play(c, I.cymbal('ride'), t, vol * (i % 4 === 0 ? 0.5 : 0.38), drums, { pan: 0.4, send: 0.05 });
          const cc = at(p.cym);
          if (cc === 'c') play(c, I.cymbal('crash'), t, vol * 0.6, drums, { pan: -0.35, send: 0.15 });
          if (cc === 'h') play(c, I.cymbal('china'), t, vol * 0.5, drums, { pan: 0.45, send: 0.1 });
          if (cc === 'r') play(c, I.cymbal('ride'), t, vol * 0.45, drums, { pan: 0.4, send: 0.05 });
          const tc = at(p.toms);
          if (tc === '1' || tc === '2' || tc === '3') play(c, I.tom(tc === '1' ? 50 : tc === '2' ? 45 : 38), t, vol * 0.8, drums, { pan: tc === '1' ? 0.3 : tc === '2' ? 0 : -0.3, send: 0.12 });
        }
        for (const s of kickSteps) if (barActive(p, Math.floor(s / 16))) play(c, kk, stepTime(c, s), vol, drums);
        break;
      }
      case 'bass': case 'synthbass': {
        const out = panned(c, bass, pan, 0);
        const evs: { step: number; midi: number; len: number }[] = [];
        if (p.followGuitar) {
          for (const e of gtrEvents) {
            const bar = Math.floor(e.step / 16);
            if (!barActive(p, bar)) continue;
            const pc = ((e.midi % 12) + 12) % 12, kb = keyBase(song, p.octave);
            let m = kb - (kb % 12) + pc; if (m < kb) m += 12; if (m > kb + 9) m -= 12;
            evs.push({ step: e.step, midi: m, len: Math.max(1, e.len) });
          }
        } else if (p.pat) {
          for (let s = 0; s < total; s++) {
            const bar = Math.floor(s / 16); if (!barActive(p, bar)) continue;
            const ch = p.pat[bar % p.pat.length][s % 16];
            if (!ch || ch === '.' || ch === '-') continue;
            const root = chordRoot(song, bar, keyBase(song, p.octave));
            const m = ch === 'o' ? root + 12 : ch === '5' ? root + 7 : ch === 'k' ? keyBase(song, p.octave) : root;
            let len = 1; for (let k = s + 1; k < total && p.pat[Math.floor(k / 16) % p.pat.length][k % 16] === '-'; k++) len++;
            evs.push({ step: s, midi: m, len });
          }
        }
        for (const e of evs) {
          const t = stepTime(c, e.step), dur = e.len * spb;
          if (p.kind === 'bass') play(c, I.bassNote(e.midi, Math.min(2, dur + 0.05), p.grit ?? 0.5), t, vol, out, { dur: dur + 0.02 });
          else voiceSynthBass(c, e.midi, t, dur, vol, out, p.cut ?? 600, p.grit ?? 0.3);
        }
        break;
      }
      case 'arp': {
        const out = panned(c, synth, pan, rev);
        let echo: AudioNode = out;
        if (p.echo) {
          const dl = oc.createDelay(2); dl.delayTime.value = spb * 3; const fb = oc.createGain(); fb.gain.value = 0.38; const dlp = oc.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2400;
          const mix = oc.createGain(); mix.gain.value = 1; mix.connect(out); mix.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); const wet = oc.createStereoPanner(); wet.pan.value = -pan || 0.5; dlp.connect(wet); wet.connect(out);
          echo = mix;
        }
        const len = p.len ?? p.rate;
        let k = 0;
        for (let s = 0; s < total; s += p.rate) {
          const bar = Math.floor(s / 16); if (!barActive(p, bar)) { k++; continue; }
          const tones = chordTones(song, bar, keyBase(song, p.octave));
          const idx = p.seq[k % p.seq.length]; k++;
          if (idx < 0) continue;
          voicePluck(c, p.sound, tones[idx], stepTime(c, s), len * spb, vol, echo, p.cut ?? 1400);
        }
        break;
      }
      case 'pad': {
        const out = panned(c, synth, pan, rev);
        let bar = 0;
        while (bar < song.bars) {
          if (!barActive(p, bar)) { bar++; continue; }
          const d = song.chords[bar % song.chords.length];
          let n = 1; while (bar + n < song.bars && song.chords[(bar + n) % song.chords.length] === d && barActive(p, bar + n) && n < 4) n++;
          const tones = chordTones(song, bar, keyBase(song, p.octave), p.seventh).slice(0, p.seventh ? 4 : 3);
          voicePad(c, p.sound, tones, bar * 16 * spb, n * 16 * spb - 0.05, vol, out, p.cut);
          bar += n;
          if (bar % 4 === 0) await yieldFrame();
        }
        break;
      }
      case 'lead': {
        const out = p.sound === 'guitar' ? (pan <= 0 ? c.buses.gtrL : c.buses.gtrR) : panned(c, synth, pan, rev);
        const mel = parseMelody(song, p.melody, keyBase(song, p.octave));
        const cyc = mel.reduce((a, e) => a + e.len, 0) || 16;
        let prev: number | null = null;
        for (let s0 = 0; s0 < total; s0 += cyc) {
          for (const e of mel) {
            const s = s0 + e.step; if (s >= total) break;
            if (!barActive(p, Math.floor(s / 16)) || e.midi === null) { prev = null; continue; }
            voiceLead(c, p.sound, e.midi, stepTime(c, s), e.len * spb, vol, out, prev, !!p.glide);
            prev = e.midi;
          }
          await yieldFrame();
        }
        break;
      }
      case 'stacc': {
        const out = panned(c, synth, pan, rev);
        for (let s = 0; s < total; s++) {
          const bar = Math.floor(s / 16); if (!barActive(p, bar)) continue;
          const ch = p.pat[bar % p.pat.length][s % 16];
          if (!ch || ch === '.') continue;
          const tones = chordTones(song, bar, keyBase(song, p.octave));
          const m = tones[Number(ch)] ?? tones[0];
          const t = stepTime(c, s);
          if (p.sound === 'pluck') play(c, I.cleanPluck(m, 0.5, 0.9), t, vol, out);
          else if (p.sound === 'organ') voicePad(c, 'organ', [m], t, spb * 0.8, vol, out);
          else play(c, SV.stab(m, spb * 0.9), t, vol * 0.6, out);
        }
        break;
      }
      case 'perc': {
        const out = panned(c, drums, pan, rev);
        for (let s = 0; s < total; s++) {
          const bar = Math.floor(s / 16); if (!barActive(p, bar)) continue;
          if (p.pat[bar % p.pat.length][s % 16] !== 'x') continue;
          const d = p.sound === 'riser' ? I.riser(spb * 16) : I.clang(p.sound, p.midi);
          play(c, d, stepTime(c, s), vol, out);
        }
        break;
      }
    }
  }
  const tSched = performance.now();
  const buf = await oc.startRendering();
  if ((globalThis as any).__musicProfile) console.log(`music ${song.title} ${layer}: schedule ${Math.round(tSched - tStart)}ms, render ${Math.round(performance.now() - tSched)}ms`);
  // wrap the tail (reverb / ringing notes) around to the start so the loop is seamless
  const L = Math.round(loop * SR);
  const out = new AudioBuffer({ numberOfChannels: 2, length: L, sampleRate: SR });
  for (let ch = 0; ch < 2; ch++) {
    const src = buf.getChannelData(ch), dst = out.getChannelData(ch);
    dst.set(src.subarray(0, L));
    for (let i = L; i < src.length; i++) dst[(i - L) % L] += src[i];
  }
  return out;
}

const cache = new Map<string, Promise<Stems>>();
// Renders run one at a time (they are CPU heavy); urgent requests jump the queue.
const queue: { id: string; song: Song; resolve: (s: Stems) => void; reject: (e: unknown) => void }[] = [];
let busy = false;
async function pump(): Promise<void> {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift()!;
    try { job.resolve(await renderBoth(job.song)); } catch (e) { job.reject(e); }
  }
  busy = false;
}
async function renderBoth(song: Song): Promise<Stems> {
  const tail = song.reverb.seconds + 0.6;
  const combat = song.only === 'calm' ? null : await renderStem(song, 'combat', tail);
  const calm = song.only === 'combat' ? null : await renderStem(song, 'calm', tail);
  // one gain for both stems so crossfades keep the same loudness balance
  let pk = 0;
  for (const b of [combat, calm]) if (b) for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }
  const k = pk > 0 ? 0.92 / pk : 1;
  for (const b of [combat, calm]) if (b) for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] *= k; }
  const any = (combat ?? calm)!;
  return { calm: calm ?? combat!, combat: combat ?? calm!, loop: any.duration };
}
/** Render (or fetch the cached render of) a song's calm and combat stems. `urgent` jumps the queue. */
export function renderSong(id: string, song: Song, urgent = false): Promise<Stems> {
  let p = cache.get(id);
  if (p) {
    if (urgent) { const i = queue.findIndex((j) => j.id === id); if (i > 0) queue.unshift(...queue.splice(i, 1)); }
    return p;
  }
  p = new Promise<Stems>((resolve, reject) => {
    const job = { id, song, resolve, reject };
    if (urgent) queue.unshift(job); else queue.push(job);
  });
  cache.set(id, p);
  void pump();
  return p;
}
