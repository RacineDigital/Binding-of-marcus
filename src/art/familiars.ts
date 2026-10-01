// Familiar sprites (2 frames each).
import { PixelArt } from '../render/pixel';
import { ramp, hex } from '../render/color';
import { Sprite } from '../render/sprite';

type Painter = (p: PixelArt, f: number) => void;
const eyes = (p: PixelArt, x: number, y: number, gap: number, c = '#1a1020') => { p.set(x, y, c); p.set(x + gap, y, c); };

const PAINT: Record<string, Painter> = {
  narcissist: (p, f) => {
    const g = ramp('#c8b070'), m = ramp('#a8c0d8');
    p.ball(8, 7, 5, 5.5, g); p.ball(8, 7, 3.8, 4.3, m); p.rect(7, 12, 2, 4, g[2]); p.rect(6, 15, 4, 1, g[1]);
    p.set(6, 5, '#ffffff'); p.set(7, 4, '#ffffff');
    p.rect(6, 6 + f, 1, 2, '#2a2034'); p.rect(9, 6 + f, 1, 2, '#2a2034'); p.set(8, 9, '#c83a4a');
  },
  pocket_pet: (p, f) => {
    const s = ramp('#f0a0c0');
    p.ball(8, 9, 5.5, 6.5, s); p.rect(5, 6, 6, 5, hex('#a8c890')); p.rect(5, 6, 6, 1, hex('#88a870'));
    p.set(7, 8, '#2a3a20'); p.set(9, 8, '#2a3a20'); p.set(8, 9 + f, '#2a3a20');
    p.ball(6, 13, 0.9, 0.9, ramp('#e8e0f0')); p.ball(8, 14, 0.9, 0.9, ramp('#e8e0f0')); p.ball(10, 13, 0.9, 0.9, ramp('#e8e0f0'));
  },
  inkling: (p, f) => { const c = ramp('#2a2e70'); p.ball(8, 9 - f, 4.5, 4, c); p.set(5, 13, c[1]); p.set(11, 13 - f, c[1]); p.set(8, 13, c[1]); p.rect(6, 8 - f, 1, 2, '#ffffff'); p.rect(9, 8 - f, 1, 2, '#ffffff'); },
  paper_bird: (p, f) => { const c = ramp('#e8e0cc'); p.poly([2, 9, 8, 6, 14, 9, 8, 11], c[3]); p.poly([8, 7, 5, f ? 1 : 4, 10, 7], c[2]); p.poly([8, 7, 12, f ? 2 : 5, 10, 8], c[1]); p.poly([14, 9, 16, 7, 15, 10], c[2]); p.set(13, 8, '#2a2020'); },
  tin_soldier: (p, f) => { const r = ramp('#b03030'), b = ramp('#2a3a6a'); p.rect(6, 3, 4, 3, b[2]); p.rect(6, 2, 4, 1, b[3]); p.ball(8, 7, 2.2, 2, ramp('#e8c8a0')); p.rect(6, 9, 4, 4, r[2]); p.rect(6, 13, 1, 2 + f, b[1]); p.rect(9, 13, 1, 3 - f, b[1]); p.line(11, 5, 11, 12, hex('#8a8a92')); eyes(p, 7, 7, 2); },
  moth_friend: (p, f) => { const w = ramp('#c8b48a'); p.ball(4, 8, 3.5, f ? 4.5 : 3, w); p.ball(12, 8, 3.5, f ? 4.5 : 3, w); p.ball(8, 8, 2, 4, ramp('#8a6a4a')); p.set(3, 7, '#6a4a8a'); p.set(13, 7, '#6a4a8a'); p.line(7, 4, 5, 1, w[1]); p.line(9, 4, 11, 1, w[1]); },
  ghost_cat: (p, f) => { const c = ramp('#c8d8e8'); p.ball(8, 10, 5, 4.5, c); p.poly([4, 7, 5, 2, 7, 6], c[3]); p.poly([12, 7, 11, 2, 9, 6], c[3]); p.line(12, 12, 15, 9 - f, c[2]); eyes(p, 6, 9, 3, '#3a6a8a'); p.set(7, 11, '#8a6a8a'); },
  toffee: (p, f) => {
    // a brown tabby kitten: stripes on the back, head and tail, green eyes, pink nose
    const fur = ramp('#a8743a'), dk = '#5a3414', belly = '#ecc89a';
    p.ball(9, 11, 5.2, 3.6, fur, { dither: 0.3 });
    p.rect(6, 13, 6, 1, hex(belly));
    for (const x of [8, 10, 12]) { p.set(x, 8, dk); p.set(x, 9, dk); p.set(x + (f ? 0 : 1), 10, dk); }
    p.line(13, 11, 15, 8 - f, fur[2]); p.set(15, 7 - f, fur[2]); p.set(14, 9 - f, dk); p.set(15, 8 - f, dk);
    p.rect(5, 13, 1, 3 - f, fur[1]); p.rect(8, 13, 1, 2 + f, fur[1]); p.rect(11, 13, 1, 3 - f, fur[1]); p.rect(13, 13, 1, 2 + f, fur[1]);
    p.ball(5, 7, 3.8, 3.4, fur, { dither: 0.3 });
    p.poly([2, 5, 2, 1, 5, 4], fur[3]); p.poly([6, 4, 8, 1, 8, 5], fur[3]); p.set(3, 3, '#e89aa0'); p.set(7, 3, '#e89aa0');
    p.set(4, 4, dk); p.set(5, 4, dk); p.set(6, 4, dk); p.set(5, 5, dk);
    p.set(3, 7, '#7ad040'); p.set(6, 7, '#7ad040'); p.set(3, 6, '#ffffff');
    p.set(4, 8, '#e86a7a'); p.set(5, 9, belly); p.set(4, 9, belly);
    p.set(1, 8, '#e8e0d0'); p.set(8, 8, '#e8e0d0');
  },
  thimble: (p) => { const c = ramp('#b8b8c0'); p.ball(8, 9, 4.5, 5, c); for (let y = 6; y < 13; y += 2) for (let x = 5; x < 12; x += 2) p.paint(x, y, c[1]); p.rect(3, 13, 10, 2, c[3]); },
  bookworm: (p, f) => { const c = ramp('#8ab05a'); for (let i = 0; i < 4; i++) p.ball(3 + i * 3, 10 + (i % 2 === f ? 1 : 0), 2.4, 2.4, c); p.ball(14, 9, 2.6, 2.6, c); p.set(15, 8, '#1a1020'); p.rect(12, 11, 3, 1, hex('#e8dcc0')); },
  button_jar: (p) => { const g = ramp('#9ab8c8'); p.rect(4, 5, 9, 10, g[1]); p.rect(5, 6, 7, 8, g[2]); p.rect(4, 3, 9, 2, hex('#8a6a4a')); p.set(6, 11, '#b87a44'); p.set(9, 9, '#c8c8d8'); p.set(8, 12, '#b87a44'); p.set(10, 12, '#e8c040'); p.set(5, 7, '#ffffff'); },
  lantern_wisp: (p, f) => { const c = ramp('#f0a040'); p.rect(5, 4, 7, 9, hex('#3a3434')); p.rect(6, 5, 5, 7, c[f ? 3 : 2]); p.rect(7, 7, 3, 3, c[4]); p.rect(7, 2, 3, 2, hex('#3a3434')); p.rect(4, 13, 9, 1, hex('#3a3434')); },
  shadow_twin: (p, f) => { const c = ramp('#1e1a34'); p.ball(8, 6, 5, 4.5, c); p.ball(8, 12, 4, 3.5, c); p.rect(6, 5, 1, 2, '#e0e0ff'); p.rect(9, 5, 1, 2, '#e0e0ff'); p.set(3, 3 - f, c[3]); },
  stitch_spider: (p, f) => { const c = ramp('#4a3a5a'); p.ball(8, 9, 4, 3.5, c); for (let i = 0; i < 4; i++) { p.line(5, 9, 1, 6 + i * 2 + f, c[1]); p.line(11, 9, 15, 6 + i * 2 - f, c[1]); } p.set(6, 8, '#e04040'); p.set(9, 8, '#e04040'); p.line(8, 12, 8, 15, hex('#e0e0e0')); },
  wax_angel: (p, f) => { const c = ramp('#efe6d0'); p.ball(8, 10, 3.5, 4, c); p.ball(8, 5, 3, 3, ramp('#f0d8b8')); p.poly([4, 9, 0, f ? 5 : 8, 4, 12], c[3]); p.poly([12, 9, 16, f ? 5 : 8, 12, 12], c[3]); p.ring(8, 2, 2.5, '#f0d040'); eyes(p, 7, 5, 2); },
  moth_jar: (p, f) => { const g = ramp('#8aa0a8'); p.rect(4, 5, 9, 10, g[1]); p.rect(5, 6, 7, 8, g[2]); p.rect(4, 3, 9, 2, hex('#5a4a3a')); p.set(6 + f, 9, '#c8b48a'); p.set(9 - f, 11, '#c8b48a'); p.set(8, 7 + f, '#c8b48a'); },
  clink_mouse: (p, f) => { const c = ramp('#9a8a8a'); p.ball(8, 10, 4.5, 3.5, c); p.ball(12, 8, 2.5, 2.4, c); p.ball(11, 5, 1.6, 1.6, ramp('#d8a0a0')); p.set(13, 8, '#1a1020'); p.line(4, 11, 1, 9 - f, hex('#d8a0a0')); p.ring(6, 13, 1.8, '#b8b4a8'); },
  glass_eye: (p, f) => { const w = ramp('#e8e8f0'); p.ball(8, 8, 5.5, 5.5, w); p.ball(8 + f, 8, 2.8, 2.8, ramp('#3a8ad0')); p.ball(8 + f, 8, 1.3, 1.3, ramp('#0a0a14')); p.set(6, 6, '#ffffff'); p.line(8, 13, 8, 16, hex('#a03030')); },
  belfry_bat: (p, f) => { const c = ramp('#3a2a3a'); p.ball(8, 8, 3, 3, c); p.poly([5, 8, 0, f ? 3 : 10, 3, 11], c[2]); p.poly([11, 8, 16, f ? 3 : 10, 13, 11], c[2]); p.set(7, 7, '#e04040'); p.set(9, 7, '#e04040'); p.set(6, 5, c[3]); p.set(10, 5, c[3]); },
  scraps: (p, f) => { const b = ramp('#d8ccb0'); p.ball(7, 10, 5, 3.5, b); p.ball(12, 7, 3, 3, b); p.set(13, 6, '#1a1010'); p.rect(3, 13, 1, 2 + f, b[1]); p.rect(9, 13, 1, 3 - f, b[1]); p.line(2, 9, 0, 6 - f, b[2]); p.set(14, 8, b[1]); },
  little_wick: (p, f) => { const w = ramp('#e8dcc0'); p.rect(6, 7, 5, 8, w[2]); p.rect(6, 7, 5, 1, w[4]); p.set(7, 10, '#1a1010'); p.set(9, 10, '#1a1010'); const fl = ramp('#f0a040'); p.ball(8.5, 4 - f, 1.8, 2.8, fl); p.set(8, 3 - f, fl[4]); },
  choir_mote: (p, f) => { const c = ramp('#d8e8ff'); p.ball(8, 8, 3 + f * 0.5, 3 + f * 0.5, c); p.set(7, 7, '#ffffff'); },
};

const cache = new Map<string, Sprite[]>();
export function familiarSprites(id: string): Sprite[] {
  let s = cache.get(id);
  if (!s) {
    const painter = PAINT[id] ?? PAINT.inkling;
    s = [0, 1].map((f) => { const p = new PixelArt(17, 17); painter(p, f); p.polish().outline(undefined, false, 0.85); return new Sprite(p, 8, 15); });
    cache.set(id, s);
  }
  return s;
}
export function familiarIcon(id: string): (p: PixelArt) => void {
  return (p) => { const painter = PAINT[id] ?? PAINT.inkling; painter(p, 0); };
}
