// Obstacle, prop and door sprites. Cached per floor theme.
import { PixelArt } from '../render/pixel';
import { ramp, hex, darken, lighten, mix, pack, Col } from '../render/color';
import { Sprite } from '../render/sprite';
import { RNG } from '../core/rng';
import { FloorTheme } from '../data/floors';
import { DoorKind } from '../rooms/room';

export interface PropSet {
  rocks: Sprite[]; marked: Sprite[]; block: Sprite; pillar: Sprite; urn: Sprite; urnBroken: Sprite;
  heap: Sprite[][]; // [variant][stage 0..3]
  keg: Sprite; spikes: Sprite; spikesDown: Sprite; spikesMid: Sprite; web: Sprite; button: Sprite; buttonDown: Sprite;
  fire: Sprite[][]; // [variant][frame]
  fireBase: Sprite;
  rubble: Sprite[];
}

function rock(theme: FloorTheme, seed: number, marked: boolean): PixelArt {
  const p = new PixelArt(26, 26);
  const r = new RNG('rock' + seed + theme.id);
  const rc = ramp(theme.pal.rock);
  const kind = seed % 3;
  // base shadow
  p.ellipse(13, 21, 11, 4, pack(0, 0, 0, 0));
  if (kind === 0) { p.ball(12, 15, 10, 8.5, rc, { dither: 0.7 }); p.ball(16, 12, 6.5, 6, rc, { dither: 0.7, bias: 0.05 }); }
  else if (kind === 1) { p.ball(9, 15, 7.5, 7.5, rc, { dither: 0.7 }); p.ball(16, 16, 7.5, 6.5, rc, { dither: 0.7 }); p.ball(12, 10, 6, 5, rc, { bias: 0.08 }); }
  else { p.poly([3, 20, 5, 9, 11, 5, 19, 6, 23, 12, 22, 20], rc[2]); p.shadeV(3, 5, 21, 16, rc, 0.8); p.line(5, 10, 11, 6, rc[4]); p.line(11, 6, 18, 7, rc[3]); }
  // flatten bottom
  for (let x = 0; x < 26; x++) for (let y = 21; y < 26; y++) p.clear(x, y);
  for (let x = 2; x < 24; x++) if (p.opaque(x, 20)) p.set(x, 20, rc[0]);
  // cracks & facets
  for (let i = 0; i < 2; i++) {
    let x = r.int(7, 18), y = r.int(9, 15);
    for (let k = 0; k < 5; k++) { p.paint(x, y, rc[0]); p.paint(x + 1, y, rc[3]); x += r.int(-1, 1); y += 1; }
  }
  p.speckle(rc[1], 0.05, () => r.next());
  p.speckle(rc[3], 0.04, () => r.next());
  if (theme.id === 'underworks' || theme.id === 'cellar') { const m = ramp('#4f6e32'); for (let x = 4; x < 21; x++) if (r.chance(0.5)) { p.paint(x, 8 + Math.round(Math.sin(x) * 1.5), m[2]); p.paint(x, 9 + Math.round(Math.sin(x) * 1.5), m[1]); } }
  if (marked) {
    const ch = hex('#f2eee0');
    p.line(8, 10, 16, 17, ch); p.line(9, 10, 17, 17, ch); p.line(16, 10, 8, 17, ch); p.line(17, 10, 9, 17, ch);
    p.paint(18, 17, lighten(ch, 0.1));
  }
  p.outline(undefined, false, 0.8);
  return p;
}

function heap(theme: FloorTheme, variant: number, stage: number): PixelArt {
  const p = new PixelArt(26, 26);
  const kind = theme.pal.heapKind;
  const sc = 1 - stage * 0.22;
  let base = theme.pal.heap;
  if (variant === 1) base = '#e0b040';
  if (variant === 2) base = '#6f8a4a';
  if (variant === 3) base = '#2a2448';
  const c = ramp(base);
  const cx = 13, by = 21;
  const r = new RNG('heap' + kind + variant);
  switch (kind) {
    case 'paper': case 'pages': {
      // stacked, slightly skewed sheets tied with string
      const n = Math.max(1, Math.round(5 * sc));
      for (let i = 0; i < n; i++) {
        const y = by - 3 - i * 3, sk = r.int(-2, 2), w = 18 - (i % 2) * 2;
        p.rect(cx - w / 2 + sk, y, w, 3, c[2]);
        p.rect(cx - w / 2 + sk, y + 2, w, 1, c[1]);
        p.rect(cx - w / 2 + sk, y, w, 1, c[3]);
        if (kind === 'pages') { p.rect(cx - w / 2 + sk, y, 2, 3, hex(['#6a2a2a', '#2a4a3a', '#3a2e5a'][i % 3])); }
      }
      const top = by - 3 - (n - 1) * 3;
      p.rect(cx - 8, top, 16, 1, c[4]);
      if (n > 2) { p.line(cx - 1, top, cx - 1, by - 1, hex('#8a5a3a')); p.line(cx - 9, by - 5, cx + 8, by - 5, hex('#8a5a3a')); }
      for (let i = 0; i < 8; i++) p.paint(cx + r.int(-7, 7), top + r.int(1, 2), c[1]);
      break;
    }
    case 'coal': case 'refuse': case 'bone': case 'ink': {
      const rr = 9 * sc + 2;
      p.ball(cx, by - rr * 0.55, rr, rr * 0.75, c, { dither: 0.9 });
      for (let i = 0; i < 12 * sc; i++) {
        const x = cx + r.int(-rr + 2, rr - 2), y = by - r.int(2, Math.max(3, Math.floor(rr)));
        if (kind === 'bone') { p.paint(x, y, c[4]); p.paint(x + 1, y, c[3]); p.paint(x + 2, y, c[4]); }
        else if (kind === 'coal') { p.paint(x, y, c[4]); p.paint(x + 1, y + 1, c[0]); }
        else if (kind === 'refuse') { p.paint(x, y, hex(['#8a6a3a', '#5a7a4a', '#9a9a8a'][i % 3])); }
        else { p.paint(x, y, hex('#6a64b8')); }
      }
      if (kind === 'bone' && stage < 2) { p.ball(cx - 2, by - rr - 1, 3.2, 2.8, ramp('#e0d6c0')); p.set(cx - 3, by - rr - 1, '#1a1210'); p.set(cx - 1, by - rr - 1, '#1a1210'); }
      if (kind === 'ink') { p.ball(cx + 2, by - rr - 1, 2, 2, ramp('#2a2448')); }
      break;
    }
    case 'linen': {
      const n = Math.max(1, Math.round(4 * sc));
      for (let i = 0; i < n; i++) { const y = by - 4 - i * 4; p.ball(cx + (i % 2 ? 1 : -1), y + 2, 9 - i, 2.8, c, { dither: 0.6 }); p.line(cx - 7 + i, y + 2, cx + 7 - i, y + 2, c[1]); }
      break;
    }
    case 'wax': {
      // a cluster of fused, guttered candles sitting in their own melted wax
      const h = [12, 9, 6, 3][stage];
      p.ball(cx, by - 2, 10 * sc + 1, 3.2, c, { dither: 0.6 });
      const cs: [number, number, number][] = [[-5, h, 3], [1, h + 4, 3.2], [6, h - 2, 2.6]];
      for (const [dx, hh, w] of cs) {
        if (hh <= 1) continue;
        p.rect(cx + dx - w / 2, by - 2 - hh, w, hh, c[2]);
        p.rect(cx + dx - w / 2, by - 2 - hh, 1, hh, c[3]);
        p.rect(cx + dx + w / 2 - 1, by - 2 - hh, 1, hh, c[1]);
        p.rect(cx + dx - w / 2, by - 2 - hh, w, 1, c[4]);
        p.set(cx + dx, by - 3 - hh, '#2a1a10');
        p.tube(cx + dx + w / 2, by - hh, cx + dx + w / 2, by - hh + 3, 0.8, c);
      }
      break;
    }
  }
  if (variant === 1) p.speckle('#fff4b0', 0.06, () => r.next());
  if (variant === 2) p.speckle('#a8c060', 0.08, () => r.next());
  p.outline(undefined, false, 0.8);
  return p;
}

function fireFrame(variant: number, f: number): PixelArt {
  const p = new PixelArt(24, 30);
  const cols = [
    ['#7a1a0a', '#d0401a', '#f08a28', '#ffd060', '#fff6c8'],
    ['#1a2a7a', '#2a5ad0', '#4aa0f0', '#a0e0ff', '#f0ffff'],
    ['#1a4a0a', '#3a9a1a', '#7ad030', '#c8f070', '#f6ffd8'],
    ['#0a0614', '#2a1a4a', '#5a3a9a', '#9a7ae0', '#e8dcff'],
  ][variant].map((c) => hex(c));
  const cx = 12, by = 26;
  const t = (f / 6) * Math.PI * 2;
  // flame tongues
  const layers = [
    { r: 7, h: 17, c: cols[1] }, { r: 5.2, h: 13, c: cols[2] }, { r: 3.5, h: 9, c: cols[3] }, { r: 1.8, h: 5, c: cols[4] },
  ];
  for (let li = 0; li < layers.length; li++) {
    const L = layers[li];
    for (let y = 0; y < L.h + 6; y++) {
      const k = y / L.h; // 0 bottom .. 1 top
      const sway = Math.sin(t + y * 0.35 + li) * (1 + k * 2.2);
      const w = L.r * Math.pow(Math.max(0, 1 - k), 0.7) * (0.85 + 0.15 * Math.sin(t * 2 + li + y * 0.2));
      for (let x = -Math.ceil(w); x <= Math.ceil(w); x++) {
        if (Math.abs(x) > w) continue;
        p.set(cx + x + sway, by - 3 - y, L.c);
      }
    }
  }
  // detached flicks
  const fy = by - 20 - ((f * 3) % 8);
  p.set(cx + Math.round(Math.sin(t) * 3), fy, cols[2]); p.set(cx + Math.round(Math.sin(t) * 3), fy - 1, cols[3]);
  p.outline(cols[0], false);
  return p;
}
function fireBase(): PixelArt {
  const p = new PixelArt(24, 12);
  const wood = ramp('#5a3a24'), stone = ramp('#5a5250');
  p.ellipse(12, 8, 10, 3.5, stone[1]);
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; p.ball(12 + Math.cos(a) * 9, 8 + Math.sin(a) * 3, 2, 1.6, stone); }
  p.tube(5, 6, 19, 8, 1.7, wood); p.tube(6, 9, 18, 5, 1.7, wood);
  p.set(12, 7, '#f0a040'); p.set(11, 7, '#d04020'); p.set(13, 6, '#ffd060');
  p.outline(undefined, false, 0.8);
  return p;
}

function keg(): PixelArt {
  const p = new PixelArt(22, 26);
  const w = ramp('#7a4a2a'), m = ramp('#5a5a62');
  for (let y = 4; y < 23; y++) {
    const k = (y - 4) / 18, bulge = Math.sin(k * Math.PI) * 2;
    const hw = 7 + bulge;
    for (let x = -Math.round(hw); x <= Math.round(hw); x++) {
      const nx = x / hw;
      const idx = nx < -0.5 ? 3 : nx < 0.1 ? 2 : nx < 0.6 ? 1 : 0;
      let c = w[idx];
      if ((x + 20) % 4 === 0) c = darken(c, 0.2);
      if (y === 7 || y === 8 || y === 18 || y === 19) c = m[Math.min(4, idx + 1)];
      p.set(11 + x, y, c);
    }
  }
  p.ellipse(11, 4.5, 7, 2.2, w[3]); p.ellipse(11, 4.5, 5, 1.3, w[2]);
  // hazard mark
  const red = hex('#c02a1e');
  p.line(8, 11, 13, 16, red); p.line(13, 11, 8, 16, red); p.line(9, 11, 14, 16, red); p.line(14, 11, 9, 16, red);
  p.set(11, 2, '#2a2a2a'); p.set(11, 1, '#d8c060');
  p.outline(undefined, false, 0.8);
  return p;
}
function urn(broken: boolean): PixelArt {
  const p = new PixelArt(20, 22);
  const c = ramp('#a86a44');
  if (broken) {
    p.ellipse(10, 18, 7, 2.5, c[1]);
    p.poly([4, 18, 5, 13, 8, 15, 10, 12, 13, 15, 16, 13, 16, 18], c[2]);
    p.shadeV(4, 12, 13, 7, c);
    p.outline(undefined, false, 0.8);
    return p;
  }
  p.ball(10, 12, 7, 7, c, { dither: 0.5 });
  p.rect(6, 3, 8, 3, c[2]); p.rect(6, 3, 8, 1, c[3]); p.rect(5, 5, 10, 1, c[1]);
  p.line(4, 12, 16, 12, c[1]); p.line(4, 13, 16, 13, hex('#e0c080'));
  for (let x = 5; x < 16; x += 3) p.paint(x, 15, c[0]);
  for (let y = 19; y < 22; y++) for (let x = 0; x < 20; x++) p.clear(x, y);
  p.rect(6, 18, 8, 1, c[0]);
  p.outline(undefined, false, 0.8);
  return p;
}
function block(theme: FloorTheme): PixelArt {
  const p = new PixelArt(24, 26);
  const s = ramp(mix(hex(theme.pal.rock), hex('#5a6070'), 0.5) === 0 ? '#555' : '#4e5260');
  p.rect(1, 2, 22, 20, s[2]);
  p.rect(1, 2, 22, 4, s[3]); p.rect(1, 2, 22, 1, s[4]);
  p.rect(1, 20, 22, 2, s[0]);
  p.rect(1, 6, 1, 14, s[3]); p.rect(22, 6, 1, 14, s[1]);
  const iron = ramp('#3a3a42');
  p.rect(1, 9, 22, 3, iron[2]); p.rect(1, 9, 22, 1, iron[3]);
  for (const x of [4, 12, 19]) { p.set(x, 10, iron[4]); p.set(x, 15, s[4]); p.set(x, 5, s[4]); }
  p.rect(5, 13, 14, 1, s[1]);
  p.outline(undefined, false, 0.8);
  return p;
}
function pillar(theme: FloorTheme): PixelArt {
  const p = new PixelArt(24, 42);
  const s = ramp(theme.pal.wall);
  const l = ramp(lighten(hex(theme.pal.wall), 0.25) ? '#6a6068' : '#666');
  void l;
  p.rect(2, 34, 20, 6, s[1]); p.rect(2, 34, 20, 1, s[3]);
  p.tube(12, 8, 12, 33, 7.5, s, { dither: 0.6 });
  p.rect(1, 3, 22, 6, s[2]); p.rect(1, 3, 22, 1, s[4]); p.rect(1, 8, 22, 1, s[0]);
  for (let y = 12; y < 33; y += 7) p.line(6, y, 18, y, s[1]);
  p.outline(undefined, false, 0.8);
  return p;
}
function spikes(state: 0 | 1 | 2): PixelArt {
  const p = new PixelArt(24, 24);
  const plate = ramp('#4a4448'), metal = ramp('#b8b4c0');
  p.rect(1, 3, 22, 19, plate[1]); p.rect(2, 4, 20, 17, plate[2]); p.rect(2, 4, 20, 1, plate[3]);
  const pts = [[6, 9], [12, 7], [18, 9], [6, 17], [12, 15], [18, 17], [9, 12], [15, 12]];
  for (const [x, y] of pts) {
    if (state === 0) { p.set(x, y + 1, '#141014'); p.set(x + 1, y + 1, '#141014'); continue; }
    const h = state === 1 ? 3 : 7;
    for (let k = 0; k < h; k++) { const w = Math.max(0, Math.floor((h - k) / 2.5)); p.rect(x - w, y + 2 - k, 1 + w * 2, 1, k === h - 1 ? metal[4] : (k % 2 ? metal[2] : metal[3])); }
    p.set(x + 1, y + 2, metal[0]);
  }
  p.outline(undefined, false, 0.8);
  return p;
}
function web(): PixelArt {
  const p = new PixelArt(24, 24);
  const c = pack(225, 225, 235, 170);
  for (let a = 0; a < 8; a++) { const an = (a / 8) * Math.PI * 2 + 0.2; p.line(12, 12, 12 + Math.cos(an) * 12, 12 + Math.sin(an) * 12, c); }
  for (const r of [3, 6, 9, 11]) for (let a = 0; a < 64; a++) { const an = (a / 64) * Math.PI * 2; p.set(12 + Math.cos(an) * r, 12 + Math.sin(an) * r, c); }
  return p;
}
function button(down: boolean): PixelArt {
  const p = new PixelArt(24, 24);
  const b = ramp('#5a5058'), r = ramp(down ? '#4a8a4a' : '#a83a3a');
  p.ellipse(12, 13, 10, 7, b[1]); p.ellipse(12, 12, 9, 6, b[2]);
  p.ball(12, down ? 12 : 10.5, 6, down ? 3.5 : 4.5, r);
  p.outline(undefined, false, 0.8);
  return p;
}
function rubble(theme: FloorTheme, i: number): PixelArt {
  const p = new PixelArt(24, 24);
  const rc = ramp(theme.pal.rock);
  const r = new RNG('rub' + i);
  for (let k = 0; k < 7; k++) { const x = r.int(4, 19), y = r.int(8, 19), s = r.int(1, 2); p.ball(x, y, s + 0.5, s, rc); }
  p.outline(undefined, false, 0.7);
  return p;
}

const cache = new Map<string, PropSet>();
export function propsFor(theme: FloorTheme): PropSet {
  const hit = cache.get(theme.id);
  if (hit) return hit;
  const set: PropSet = {
    rocks: [0, 1, 2, 3, 4, 5].map((i) => new Sprite(rock(theme, i, false), 13, 23)),
    marked: [0, 1].map((i) => new Sprite(rock(theme, i, true), 13, 23)),
    block: new Sprite(block(theme), 12, 24),
    pillar: new Sprite(pillar(theme), 12, 40),
    urn: new Sprite(urn(false), 10, 20),
    urnBroken: new Sprite(urn(true), 10, 20),
    heap: [0, 1, 2, 3].map((v) => [0, 1, 2, 3].map((s) => new Sprite(heap(theme, v, s), 13, 23))),
    keg: new Sprite(keg(), 11, 24),
    spikes: new Sprite(spikes(2), 12, 24), spikesMid: new Sprite(spikes(1), 12, 24), spikesDown: new Sprite(spikes(0), 12, 24),
    web: new Sprite(web(), 12, 24),
    button: new Sprite(button(false), 12, 24), buttonDown: new Sprite(button(true), 12, 24),
    fire: [0, 1, 2, 3].map((v) => [0, 1, 2, 3, 4, 5].map((f) => new Sprite(fireFrame(v, f), 12, 28))),
    fireBase: new Sprite(fireBase(), 12, 10),
    rubble: [0, 1, 2].map((i) => new Sprite(rubble(theme, i), 12, 24)),
  };
  cache.set(theme.id, set);
  return set;
}

// ---------------------------------------------------------------- doors
export interface DoorSprites { frame: Sprite; leaves: Sprite[]; lock: Sprite; hole: Sprite }
const doorCache = new Map<string, DoorSprites>();
const DW = 44, DH = 40;

function frameColors(kind: DoorKind, theme: FloorTheme): { main: string; trim: string } {
  switch (kind) {
    case 'treasure': return { main: '#b8903a', trim: '#f0d070' };
    case 'boss': return { main: '#5a2a2a', trim: '#d8ccb0' };
    case 'shop': return { main: '#6a4a2a', trim: '#c89a4a' };
    case 'challenge': return { main: '#4a4a52', trim: '#9a9aa8' };
    case 'sacrifice': return { main: '#6a2a3a', trim: '#c8c8d0' };
    case 'arcade': return { main: '#5a2a6a', trim: '#f0c050' };
    case 'cursed': return { main: '#3a1a1a', trim: '#8a2a2a' };
    case 'library': return { main: '#4a3020', trim: '#a8804a' };
    case 'miniboss': return { main: '#3a3a2a', trim: '#8a8a6a' };
    case 'event': return { main: '#2a4a4a', trim: '#8ad0c0' };
    case 'deal': return { main: '#141224', trim: '#4a44a0' };
    case 'blessing': return { main: '#c8c0b0', trim: '#fff8e0' };
    default: return { main: theme.pal.wall, trim: lighten(hex(theme.pal.wall), 0.3) ? '#8a8088' : '#888' };
  }
}

function doorFrame(kind: DoorKind, theme: FloorTheme): PixelArt {
  const p = new PixelArt(DW, DH);
  const fc = frameColors(kind, theme);
  const m = ramp(fc.main), t = ramp(fc.trim);
  const cx = DW / 2;
  // outer arch
  if (kind === 'secret' || kind === 'supersecret') {
    const r = new RNG('hole');
    for (let y = 8; y < DH; y++) for (let x = 6; x < DW - 6; x++) {
      const dx = (x - cx) / (15 + r.next() * 2), dy = (y - DH) / (30 + r.next() * 2);
      if (dx * dx + dy * dy < 1) p.set(x, y, hex('#0a0708'));
      else if (dx * dx + dy * dy < 1.25) p.set(x, y, darken(hex(theme.pal.wall), 0.4 + r.next() * 0.2));
    }
    return p;
  }
  // stone frame blocks
  for (let y = 4; y < DH; y++) for (let x = 3; x < DW - 3; x++) {
    const dx = (x + 0.5 - cx), dy = y - 16;
    const inArch = y >= 16 ? Math.abs(dx) < 16 : dx * dx / 256 + dy * dy / 144 < 1;
    if (inArch) p.set(x, y, m[((x + y) % 7 === 0) ? 1 : 2]);
  }
  p.shadeV(3, 4, DW - 6, DH - 4, m, 0.6);
  // opening
  for (let y = 10; y < DH; y++) for (let x = 0; x < DW; x++) {
    const dx = (x + 0.5 - cx), dy = y - 20;
    const inOpen = y >= 20 ? Math.abs(dx) < 11 : dx * dx / 121 + dy * dy / 100 < 1;
    if (inOpen) p.set(x, y, mix(hex('#050304'), hex('#1a1216'), Math.max(0, (y - 10) / 30)));
  }
  // keystone and trim
  p.rect(cx - 3, 3, 6, 6, t[2]); p.rect(cx - 3, 3, 6, 1, t[4]); p.rect(cx - 3, 8, 6, 1, t[0]);
  for (let a = 0; a <= 20; a++) {
    const an = Math.PI + (a / 20) * Math.PI;
    p.set(cx + Math.cos(an) * 13.5, 20 + Math.sin(an) * 12, t[3]);
  }
  p.rect(cx - 15, 20, 2, DH - 20, t[2]); p.rect(cx + 13, 20, 2, DH - 20, t[1]);
  // kind specific adornments
  if (kind === 'boss') {
    const b = ramp('#e0d6c0');
    p.ball(cx, 6, 5, 4.5, b); p.rect(cx - 3, 5, 2, 2, '#1a0a0a'); p.rect(cx + 1, 5, 2, 2, '#1a0a0a'); p.rect(cx - 2, 9, 4, 1, b[1]);
    p.tube(5, 14, 1, 2, 2, b); p.tube(DW - 6, 14, DW - 2, 2, 2, b);
  } else if (kind === 'treasure') {
    p.ball(cx, 6, 3, 3, ramp('#4ab0e0'));
    p.set(cx - 16, 20, t[4]); p.set(cx + 15, 20, t[4]);
  } else if (kind === 'shop') {
    p.rect(cx - 7, 0, 14, 7, hex('#6a4a2a')); p.rect(cx - 6, 1, 12, 5, hex('#c8a060'));
    p.ball(cx, 3.5, 2.5, 2.5, ramp('#c89a4a')); p.set(cx - 1, 3, '#3a2a1a'); p.set(cx + 1, 4, '#3a2a1a');
  } else if (kind === 'cursed' || kind === 'sacrifice') {
    const th = ramp('#3a2a1a');
    for (let i = 0; i < 8; i++) { const x = 4 + i * 5; p.line(x, 12 + (i % 2) * 3, x + 2, 9 + (i % 2) * 3, th[3]); p.set(x + 2, 8 + (i % 2) * 3, '#e0e0e0'); }
  } else if (kind === 'deal') {
    for (let x = 8; x < DW - 8; x += 3) { const len = 2 + ((x * 7) % 5); p.rect(x, 12, 1, len, hex('#0a0814')); p.set(x, 12 + len, hex('#4a44a0')); }
  } else if (kind === 'blessing') {
    p.rect(cx - 1, 0, 2, 6, hex('#fff8e0')); p.set(cx, -1, '#ffd060');
  } else if (kind === 'library') {
    for (let x = 6; x < DW - 6; x += 3) p.rect(x, 11, 2, 5, hex(['#6a2a2a', '#2a4a3a', '#3a2e5a', '#6a5a22'][x % 4]));
  } else if (kind === 'arcade') {
    for (let a = 0; a <= 8; a++) { const an = Math.PI + (a / 8) * Math.PI; p.set(cx + Math.cos(an) * 15, 20 + Math.sin(an) * 14, a % 2 ? '#f0c050' : '#e04a8a'); }
  } else if (kind === 'event') {
    p.rect(cx - 1, 4, 3, 1, t[4]); p.set(cx + 1, 5, t[4]); p.set(cx, 6, t[4]); p.set(cx, 8, t[4]);
  } else if (kind === 'miniboss') {
    for (let i = 0; i < 3; i++) p.line(cx - 12 + i * 3, 14, cx - 8 + i * 3, 24, hex('#1a1414'));
  }
  p.outline(undefined, false, 0.85);
  return p;
}
function doorLeaves(kind: DoorKind, open: number): PixelArt {
  // open 0..1
  const p = new PixelArt(DW, DH);
  const cx = DW / 2;
  if (kind === 'challenge' || kind === 'boss' || kind === 'miniboss') {
    // portcullis bars rise
    const bars = ramp(kind === 'boss' ? '#6a3a3a' : '#5a5a66');
    const lift = Math.round(open * 22);
    for (let x = cx - 10; x <= cx + 9; x += 4) for (let y = 12; y < DH - lift; y++) { p.set(x, y, bars[3]); p.set(x + 1, y, bars[1]); }
    for (const y of [18, 28]) if (y < DH - lift) p.rect(cx - 11, y, 22, 2, bars[2]);
    return p;
  }
  const wood = kind === 'deal' ? ramp('#1a1830') : kind === 'blessing' ? ramp('#e8e0d0') : kind === 'treasure' ? ramp('#7a5a2a') : ramp('#5e3c28');
  const w = Math.round(11 * (1 - open));
  if (w <= 0) return p;
  for (let s = -1; s <= 1; s += 2) {
    for (let y = 10; y < DH; y++) for (let i = 0; i < w; i++) {
      const x = s < 0 ? cx - 11 + i : cx + 10 - i;
      const dx = x + 0.5 - cx, dy = y - 20;
      if (y < 20 && dx * dx / 121 + dy * dy / 100 >= 1) continue;
      let c = wood[2];
      if ((x - (s < 0 ? cx - 11 : 0)) % 4 === 0) c = wood[1];
      if (i === w - 1) c = wood[3];
      if (y === 24 || y === 34) c = hex('#3a3434');
      p.set(x, y, c);
    }
  }
  if (open < 0.2) { p.set(cx - 2, 28, '#c8a050'); p.set(cx + 1, 28, '#c8a050'); }
  return p;
}
function lockSprite(): PixelArt {
  const p = new PixelArt(DW, DH);
  const g = ramp('#c89a3a');
  const cx = DW / 2;
  p.ring(cx, 22, 3.5, g[1], 1.6);
  p.rect(cx - 5, 23, 10, 8, g[2]); p.rect(cx - 5, 23, 10, 1, g[4]); p.rect(cx - 5, 30, 10, 1, g[0]);
  p.set(cx - 1, 26, '#1a1208'); p.set(cx, 26, '#1a1208'); p.rect(cx - 1, 27, 1, 2, '#1a1208');
  // chains
  const ch = ramp('#6a6a72');
  for (let i = 0; i < 6; i++) { p.set(cx - 11 + i * 1.2, 16 + i * 2, ch[3]); p.set(cx + 10 - i * 1.2, 16 + i * 2, ch[3]); }
  p.outline(undefined, false, 0.8);
  return p;
}
export function doorSprites(kind: DoorKind, theme: FloorTheme): DoorSprites {
  const key = kind + theme.id;
  const hit = doorCache.get(key); if (hit) return hit;
  const ds: DoorSprites = {
    frame: new Sprite(doorFrame(kind, theme), DW / 2, DH),
    leaves: [0, 0.25, 0.5, 0.75, 1].map((o) => new Sprite(doorLeaves(kind, o), DW / 2, DH)),
    lock: new Sprite(lockSprite(), DW / 2, DH),
    hole: new Sprite(doorFrame('secret', theme), DW / 2, DH),
  };
  doorCache.set(key, ds);
  return ds;
}
export const DOOR_SPRITE_H = DH;

