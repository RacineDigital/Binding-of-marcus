// Redrawn item icons. Each one is built around a single object you'd recognise at a glance (a magnet,
// a light bulb, a clothes iron, a rubber stamp), fills the 18x18 tile with a bold silhouette and is lit
// from the top left like the rest of the art. They replace the item's own icon where listed.
import type { PixelArt as P } from '../render/pixel';
import { ramp, hex } from '../render/color';

const W = '#ffffff';
const sh = (p: P, x: number, y: number, c = W) => p.set(x, y, c);
/** A small four-point sparkle. */
const spark = (p: P, x: number, y: number, c = '#fff4c0') => { p.set(x, y, W); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c); };
/** A flame with a hot core. */
function flame(p: P, x: number, y: number, s = 1, outer = '#ff8a2a', core = '#ffe070'): void {
  p.ball(x, y + 1 * s, 2.2 * s, 2.6 * s, ramp(outer));
  p.poly([x - 1.6 * s, y, x, y - 4 * s, x + 1.6 * s, y], hex(outer));
  p.ball(x, y + 1.4 * s, 1.1 * s, 1.5 * s, ramp(core));
}
/** A die face (square, rounded, with pips at given grid cells 0..2). */
function die(p: P, color: string, pips: [number, number][], pip = '#2a1a1a', x0 = 3, y0 = 3, s = 12): void {
  const c = ramp(color);
  p.rect(x0 + 1, y0, s - 2, s, c[2]); p.rect(x0, y0 + 1, s, s - 2, c[2]);
  p.rect(x0 + 1, y0, s - 2, 1, c[4]); p.rect(x0, y0 + 1, 1, s - 3, c[3]);
  p.rect(x0 + 1, y0 + s - 1, s - 2, 1, c[0]); p.rect(x0 + s - 1, y0 + 2, 1, s - 3, c[1]);
  for (const [gx, gy] of pips) { const px = x0 + 2 + gx * Math.floor((s - 5) / 2), py = y0 + 2 + gy * Math.floor((s - 5) / 2); p.rect(px, py, 2, 2, hex(pip)); }
}

export const ICONS: Record<string, (p: P) => void> = {
  // ------------------------------------------------------------------ shots & sewing
  triple_seam(p) {
    // a cloth patch with three red seams fanning out from one needle: three shots
    const c = ramp('#d8c8a0'); p.rect(2, 3, 14, 12, c[2]); p.rect(2, 3, 14, 1, c[4]); p.rect(2, 14, 14, 1, c[0]);
    for (let x = 3; x < 16; x += 3) { p.set(x, 15, c[1]); p.set(x + 1, 2, c[3]); }
    for (const [tx, ty] of [[15, 4], [15, 9], [10, 4]]) for (let i = 0; i <= 10; i++) { const x = Math.round(4 + (tx - 4) * i / 10), y = Math.round(13 + (ty - 13) * i / 10); p.set(x, y, i % 2 ? '#e84a4a' : '#9a1a24'); }
    p.line(2, 16, 5, 13, hex('#c8c8d0')); p.set(2, 16, W);
  },
  twin_wick(p) {
    const w = ramp('#efe2c0'); p.rect(4, 10, 10, 7, w[2]); p.rect(4, 10, 10, 1, w[4]); p.rect(4, 10, 2, 7, w[3]); p.rect(12, 11, 2, 6, w[1]);
    p.rect(7, 11, 1, 3, w[4]); p.rect(11, 11, 1, 2, w[4]);
    p.line(6, 8, 6, 10, hex('#2a1a10')); p.line(12, 8, 12, 10, hex('#2a1a10'));
    flame(p, 6, 5, 0.85); flame(p, 12, 5, 0.85);
  },
  tin_boomerang(p) {
    const m = ramp('#b8bcc8'); p.tube(3, 3, 7, 14, 2, m); p.tube(7, 14, 16, 10, 2, m);
    p.line(3, 3, 6, 12, m[4]); sh(p, 3, 2); p.rect(2, 2, 3, 2, hex('#c8283a')); p.rect(15, 9, 2, 3, hex('#c8283a'));
  },
  paper_plane(p) {
    p.poly([1, 9, 17, 2, 7, 16], hex('#f4efe4'));
    p.poly([7, 16, 17, 2, 8, 10], hex('#c8c0b0'));
    p.line(8, 10, 17, 2, hex('#9a9282')); p.poly([1, 9, 8, 10, 7, 16], hex('#e0d8c8'));
    for (const [x, y] of [[1, 13], [2, 15], [4, 16]]) p.set(x, y, '#b8c8e0');
  },
  bellows_lung(p) {
    const wd = ramp('#8a5a32'), lt = ramp('#5a3a2a');
    p.poly([1, 3, 12, 7, 12, 8, 1, 6], wd[2]); p.line(1, 3, 12, 7, wd[4]);
    p.poly([1, 12, 12, 9, 12, 10, 1, 15], wd[1]);
    p.poly([2, 6, 12, 8, 12, 9, 2, 12], lt[2]);
    for (const x of [4, 7, 10]) p.line(x, 7 + (x - 2) * 0.12, x, 11 - (x - 2) * 0.12, lt[0]);
    p.tube(12, 8.5, 16, 8.5, 1.2, ramp('#c89a3a')); p.set(16, 8, '#ffe8a0');
    p.ring(1, 9, 1.5, wd[0]);
  },
  held_breath(p) {
    // a balloon, tied off: a breath held
    const b = ramp('#7ab8e8'); p.ball(9, 7, 5.5, 6, b); p.set(6, 4, W); p.set(7, 3, W); p.set(6, 5, b[4]);
    p.poly([8, 12.5, 10, 12.5, 9, 14], b[1]);
    for (let y = 14; y < 18; y++) p.set(9 + Math.round(Math.sin(y * 1.6)), y, '#c8c0b0');
  },
  copper_filament(p) {
    // a light bulb with a glowing copper coil
    const g = ramp('#e8e0b8'); p.ball(9, 7, 5.5, 5.5, g, { dither: 0.3 });
    for (let i = 0; i < 6; i++) p.set(6 + i, 7 + (i % 2 ? 1 : -1), i % 2 ? '#ff9a3a' : '#ffd060');
    p.line(6, 8, 7, 11, hex('#c87a3a')); p.line(12, 8, 11, 11, hex('#c87a3a'));
    const m = ramp('#9a9aa8'); p.rect(6, 12, 6, 4, m[2]); for (const y of [12, 14]) p.rect(6, y, 6, 1, m[3]); p.rect(8, 16, 2, 1, m[0]);
    sh(p, 6, 4); sh(p, 7, 3);
  },
  bone_folder(p) {
    // a sheet folded in half, and the bone tool that creased it
    p.poly([2, 15, 14, 15, 14, 5], hex('#f0e8d8')); p.poly([2, 15, 14, 5, 5, 7], hex('#d8ccb8'));
    const b = ramp('#e8e0cc'); p.tube(4, 13, 15, 2, 1.8, b); p.line(5, 12, 14, 3, b[4]); p.set(15, 2, b[4]);
  },
  burnt_toast(p) {
    // a slice of toast, golden at the crust and black in the middle, still smoking
    const cr = ramp('#a8682a'), br = ramp('#e0b070');
    p.ball(5, 7, 4, 3.6, cr); p.ball(13, 7, 4, 3.6, cr); p.rect(1, 7, 16, 10, cr[2]); p.rect(1, 16, 16, 1, cr[0]); p.rect(1, 7, 1, 9, cr[3]);
    p.ball(5, 8, 2.6, 2.4, br); p.ball(13, 8, 2.6, 2.4, br); p.rect(3, 8, 12, 7, br[2]);
    p.ball(9, 11, 4.5, 3.2, ramp('#2a1810')); p.ball(6, 13, 1.5, 1.2, ramp('#2a1810'));
    for (let i = 0; i < 4; i++) { p.set(7 + Math.round(Math.sin(i * 1.7)), 3 - i * 0.6 + 2, '#b8b8c0'); p.set(11 + Math.round(Math.sin(i * 1.7 + 1)), 3 - i * 0.6 + 2, '#9a9aa0'); }
  },
  bold_print(p) {
    p.rect(2, 2, 14, 14, hex('#f0e8d8')); p.rect(2, 2, 14, 1, hex('#fffaf0')); p.rect(15, 3, 1, 13, hex('#c8bca8'));
    const k = hex('#14101a');
    p.rect(5, 4, 3, 10, k); p.rect(8, 4, 3, 2, k); p.rect(8, 8, 3, 2, k); p.rect(8, 12, 3, 2, k);
    p.rect(11, 5, 2, 3, k); p.rect(11, 10, 2, 3, k);
    p.rect(4, 15, 10, 1, hex('#c8283a'));
  },
  growing_pains(p) {
    // three shots, each bigger than the last
    const c = ramp('#4a50c8'); p.ball(3, 14, 1.8, 1.8, c); p.ball(8, 10.5, 2.8, 2.8, c); p.ball(13.5, 5, 4, 4, c);
    sh(p, 12, 3); sh(p, 7, 9); sh(p, 2, 13);
    for (const [x, y] of [[5, 12], [10.5, 7.5]] as [number, number][]) p.set(Math.round(x), Math.round(y), '#9aa0ff');
  },
  rocket_nib(p) {
    // a pen nib going up like a rocket, fins at the back and fire behind it
    const g = ramp('#d8a840');
    p.poly([16, 2, 8, 7, 11, 10], g[3]); p.poly([16, 2, 11, 10, 13, 6], g[1]); p.line(16, 2, 10, 8, hex('#3a2a10')); p.set(11, 7, '#3a2a10');
    p.poly([8, 7, 11, 10, 8, 12, 6, 9], hex('#6a6a72'));
    p.poly([6, 9, 4, 7, 7, 7], hex('#c8283a')); p.poly([8, 12, 10, 14, 10, 11], hex('#c8283a'));
    p.ball(4.5, 13.5, 2.2, 2.2, ramp('#ff8a2a')); p.ball(4.5, 13.5, 1.1, 1.1, ramp('#ffe070')); p.set(2, 16, '#ff6a2a'); p.set(1, 17, '#ffb040');
  },
  fine_nib(p) {
    const g = ramp('#c8ccd8'); p.poly([9, 17, 4, 8, 6, 2, 12, 2, 14, 8], g[2]); p.poly([9, 17, 4, 8, 6, 2, 9, 2], g[3]);
    p.line(9, 7, 9, 16, hex('#2a2a3a')); p.ball(9, 7, 1.3, 1.3, ramp('#2a2a3a')); sh(p, 6, 4);
    p.rect(6, 1, 6, 2, hex('#6a5a4a')); p.set(9, 17, '#343a9a');
  },
  lodestone(p) {
    // a horseshoe magnet
    const r = ramp('#d8343a'), m = ramp('#c8ccd8');
    p.ring(9, 8, 6.5, r[2], 4); for (let y = 8; y < 18; y++) for (let x = 0; x < 18; x++) if (y > 8) p.clear(x, y);
    p.rect(2, 8, 4, 5, r[2]); p.rect(12, 8, 4, 5, r[1]); p.rect(2, 8, 1, 5, r[3]);
    p.rect(2, 13, 4, 3, m[3]); p.rect(12, 13, 4, 3, m[2]); p.rect(2, 13, 4, 1, W);
    p.ring(9, 8, 6.5, r[4], 1); for (let y = 6; y < 18; y++) for (let x = 0; x < 18; x++) if (y > 6 && p.get(x, y) === r[4]) p.set(x, y, r[2]);
    spark(p, 9, 15, '#c8e0ff');
  },
  chisel(p) {
    const wd = ramp('#9a6a3a'), st = ramp('#b8bcc8');
    p.tube(2, 16, 7, 11, 2.2, wd); p.rect(6, 10, 3, 3, hex('#6a6a72'));
    p.poly([8, 9, 14, 3, 16, 5, 10, 11], st[2]); p.line(8, 9, 14, 3, st[4]); p.line(14, 3, 16, 5, W);
  },
  iron_filings(p) {
    // a heap of dark iron shavings, glinting
    const m = ramp('#5a5e6a'); p.ball(9, 13, 7, 3.5, m, { dither: 0.8 });
    for (let i = 0; i < 26; i++) { const a = i * 2.39, r = (i % 7) * 0.9; const x = Math.round(9 + Math.cos(a) * r * 1.6), y = Math.round(12 + Math.sin(a) * r * 0.6 - (i % 3)); p.set(x, y, i % 4 ? m[3] : m[4]); p.set(x + 1, y - 1, m[1]); }
    for (const [x, y] of [[5, 6], [12, 5], [9, 3], [14, 8]]) { p.set(x, y, m[3]); p.set(x + 1, y + 1, m[1]); }
    spark(p, 13, 10);
  },
  ricochet_stone(p) {
    const s = ramp('#9a948a'); p.ball(12, 12, 4.5, 4, s); sh(p, 10, 10); p.set(13, 14, s[0]);
    // the path it bounced along
    for (const [x, y] of [[1, 2], [2, 4], [3, 6], [4, 8], [5, 6], [6, 4], [7, 6], [8, 8], [9, 10]]) p.set(x, y, '#e8e0d0');
    spark(p, 4, 9, '#fff0b0'); spark(p, 6, 3, '#fff0b0');
  },
  chalk_line(p) {
    const c = ramp('#e8e4d8'); p.tube(11, 2, 15, 6, 2, c); p.set(11, 2, W);
    for (let i = 0; i < 12; i += 2) p.set(10 - i * 0.7, 7 + i * 0.75, W), p.set(10 - (i + 1) * 0.7, 7 + (i + 1) * 0.75, '#b8b4a8');
    p.line(1, 13, 5, 17, hex('#e8e4d8')); p.line(5, 13, 1, 17, hex('#e8e4d8'));
  },
  golden_thread(p) {
    const wd = ramp('#8a5a32'), gd = ramp('#e8b830');
    p.rect(3, 2, 12, 3, wd[2]); p.rect(3, 13, 12, 3, wd[1]); p.rect(3, 2, 12, 1, wd[4]);
    p.rect(5, 5, 8, 8, gd[2]); for (let y = 5; y < 13; y += 2) p.line(5, y, 12, y + 1, gd[3]); p.rect(5, 5, 2, 8, gd[4]);
    for (let i = 0; i < 6; i++) p.set(13 + Math.round(Math.sin(i) * 1.5), 8 + i * 1.6, gd[3]);
    sh(p, 6, 6);
  },
  // ------------------------------------------------------------------ worn and carried
  dust_jacket(p) {
    const b = ramp('#3a5a7a'), j = ramp('#c8b890');
    p.rect(3, 2, 12, 14, b[1]); p.rect(14, 3, 1, 13, hex('#efe6d0'));
    p.poly([3, 2, 15, 2, 15, 11, 9, 16, 3, 16], j[2]); p.rect(3, 2, 12, 1, j[4]); p.rect(3, 2, 2, 14, j[1]);
    p.poly([15, 11, 9, 16, 15, 16], b[2]);                               // the torn corner shows the cloth
    p.rect(7, 5, 6, 1, hex('#5a3a2a')); p.rect(7, 7, 4, 1, hex('#5a3a2a'));
    for (const [x, y] of [[1, 4], [16, 2], [17, 8], [1, 12]]) p.set(x, y, '#c8c0b0');
  },
  blast_apron(p) {
    const l = ramp('#6a4a32'); p.ring(9, 3, 3, l[1], 1);
    p.poly([5, 5, 13, 5, 15, 17, 3, 17], l[2]); p.rect(5, 5, 8, 1, l[4]); p.line(3, 17, 5, 5, l[3]);
    p.rect(1, 8, 4, 1, l[1]); p.rect(13, 8, 4, 1, l[1]);
    const s = [9, 8, 10, 10, 13, 10, 11, 12, 12, 15, 9, 13, 6, 15, 7, 12, 5, 10, 8, 10];
    p.poly(s, hex('#ff8a2a')); p.ball(9, 11.5, 1.5, 1.5, ramp('#ffe070'));
  },
  extra_pocket(p) {
    const d = ramp('#3a5a9a'); p.poly([3, 4, 15, 4, 15, 13, 9, 16, 3, 13], d[2]); p.rect(3, 4, 12, 2, d[1]); p.rect(3, 4, 12, 1, d[3]);
    for (let x = 4; x < 15; x += 2) p.set(x, 6, '#e8a040');
    for (let y = 7; y < 13; y += 2) { p.set(4, y, '#e8a040'); p.set(14, y, '#e8a040'); }
    p.rect(6, 1, 5, 5, hex('#efe6d0')); p.rect(6, 1, 5, 1, hex('#fffaf0')); p.rect(7, 2, 3, 1, hex('#8a7a6a'));   // a page tucked in
  },
  the_debt(p) {
    const g = ramp('#d8a838'), ch = ramp('#6a6a72');
    p.ball(10, 11, 6, 6, g); p.ring(10, 11, 4.5, g[1]); p.rect(9, 8, 2, 6, g[0]); p.rect(8, 9, 4, 1, g[0]); p.rect(8, 12, 4, 1, g[0]); sh(p, 7, 8);
    for (let i = 0; i < 4; i++) p.ring(2 + i * 2, 2 + i * 2, 1.4, i % 2 ? ch[3] : ch[2], 1);
  },
  choir_voice(p) {
    // two notes of song, glowing
    const w = ramp('#f4ecd8');
    p.ball(5, 14, 2.5, 2, w); p.ball(13, 12, 2.5, 2, w); p.rect(7, 3, 1.5, 11, w[3]); p.rect(15, 1, 1.5, 11, w[3]);
    p.poly([7, 3, 16, 1, 16, 4, 7, 6], w[2]); sh(p, 4, 13); sh(p, 12, 11);
  },
  soot_wings(p) {
    const s = ramp('#2a2224');
    for (const side of [-1, 1]) {
      const cx = 9 + side * 1;
      p.poly([cx, 6, cx + side * 8, 2, cx + side * 7, 8, cx + side * 8, 13, cx + side * 3, 11], s[2]);
      for (const [dx, dy] of [[4, 4], [6, 7], [5, 10]]) p.line(cx, 7, cx + side * dx, dy, s[3]);
      p.set(cx + side * 8, 2, '#ff8a2a'); p.set(cx + side * 7, 8, '#ff6a2a'); p.set(cx + side * 8, 13, '#ffb040');
    }
    p.ball(9, 8, 1.6, 3, ramp('#3a2a2a'));
  },
  skeleton_key(p) {
    // a long brass key with a looped bow
    const b = ramp('#c89a3a'); p.ring(5, 5, 3.8, b[2], 2); p.ring(5, 5, 3.8, b[4], 1); p.tube(8, 8, 15, 15, 1.2, b);
    p.rect(12, 14, 2, 3, b[1]); p.rect(14, 12, 3, 2, b[1]); sh(p, 3, 3);
  },
  ossuary_key(p) {
    // a key carved from bone, with a little skull for a bow
    const b = ramp('#e8e0cc'); p.ball(5, 5, 4, 4, b); p.rect(3, 7, 5, 2, b[2]);
    p.rect(3, 4, 2, 2, hex('#2a1a1a')); p.rect(6, 4, 2, 2, hex('#2a1a1a')); p.set(5, 7, '#2a1a1a');
    p.tube(8, 8, 15, 15, 1.2, b); p.rect(12, 14, 2, 3, b[1]); p.rect(14, 12, 3, 2, b[1]);
  },
  // ------------------------------------------------------------------ the bindery
  blotting_paper(p) {
    const w = ramp('#e8b8c0'); p.poly([2, 10, 16, 10, 15, 15, 3, 15], w[2]); p.rect(3, 10, 13, 1, w[4]);
    const k = ramp('#7a5a3a'); p.rect(4, 6, 10, 4, k[2]); p.rect(4, 6, 10, 1, k[4]); p.ball(9, 4, 2, 2, ramp('#c89a3a'));
    for (const [x, y, r] of [[6, 12, 1.4], [11, 13, 1.1], [13, 11, 0.8]] as [number, number, number][]) p.ball(x, y, r, r, ramp('#2a2a6a'));
  },
  void_page(p) {
    p.rect(3, 1, 12, 16, hex('#e8dcc0')); p.rect(3, 1, 12, 1, hex('#fffaf0')); p.rect(14, 2, 1, 15, hex('#b8ac90'));
    for (const y of [3, 15]) p.rect(5, y, 8, 1, hex('#8a7a6a'));
    p.ball(9, 9, 4.5, 4.5, ramp('#5a2a8a')); p.ball(9, 9, 3, 3, ramp('#0a0614'));
    for (let i = 0; i < 8; i++) { const a = i * 0.8; p.set(Math.round(9 + Math.cos(a) * (2 + i * 0.3)), Math.round(9 + Math.sin(a) * (2 + i * 0.3)), '#b080ff'); }
  },
  printing_plate(p) {
    // a rubber stamp over the mark it just made
    const wd = ramp('#8a5a32'); p.ball(9, 3, 3, 2.5, wd); p.rect(8, 5, 2, 3, wd[1]);
    p.rect(4, 8, 10, 3, wd[2]); p.rect(4, 8, 10, 1, wd[4]); p.rect(4, 11, 10, 2, hex('#2a2a2a'));
    p.rect(3, 15, 12, 2, hex('#c8283a')); p.rect(5, 14, 8, 1, hex('#e84a4a')); sh(p, 7, 2);
  },
  gilt_edge(p) {
    const c = ramp('#6a1a24'), g = ramp('#e8b830');
    p.poly([2, 5, 12, 2, 16, 4, 6, 7], c[3]);                             // top cover
    p.poly([2, 5, 6, 7, 6, 16, 2, 14], c[1]);                             // spine
    p.poly([6, 7, 16, 4, 16, 13, 6, 16], g[2]);                           // the gilded page edge
    for (let i = 0; i < 5; i++) p.line(6, 9 + i * 1.6, 16, 6 + i * 1.6, g[i % 2 ? 1 : 3]);
    p.line(6, 16, 16, 13, c[0]); spark(p, 12, 9);
  },
  creasing_iron(p) {
    // an old flat iron
    const m = ramp('#5a5a66'); p.poly([1, 15, 4, 9, 14, 9, 17, 15], m[2]); p.rect(1, 15, 17, 2, m[0]); p.line(4, 9, 14, 9, m[4]);
    const h = ramp('#2a2228'); p.tube(5, 9, 6, 5, 1, h); p.tube(13, 9, 12, 5, 1, h); p.tube(6, 4, 12, 4, 1.4, ramp('#7a4a2a'));
    sh(p, 5, 10); p.set(8, 4, '#c8946a');
  },
  spilt_inkwell(p) {
    // an inkwell knocked on its side, the ink running out into a puddle with eyes
    const g = ramp('#4a5a6a'); p.ball(6, 7, 4.5, 3.8, g); p.rect(9, 5, 3, 3, hex('#2a2a32')); sh(p, 4, 5); sh(p, 5, 4);
    p.ball(11, 13, 6, 3, ramp('#1a1830')); p.ball(10, 9, 2, 1.6, ramp('#1a1830'));
    p.rect(9, 12, 2, 2, hex('#f2f0ff')); p.rect(13, 12, 2, 2, hex('#f2f0ff')); p.set(10, 13, '#1a1830'); p.set(14, 13, '#1a1830');
  },
  red_thread(p) {
    const r = ramp('#c8283a'); p.ball(10, 10, 6, 6, r);
    for (let i = 0; i < 4; i++) p.line(5 + i * 2, 5 + i, 7 + i * 2, 15 - i, r[i % 2 ? 1 : 3]);
    p.line(4, 12, 16, 9, r[1]); sh(p, 7, 6);
    for (let i = 0; i < 6; i++) p.set(4 - Math.round(Math.sin(i) * 1.5), 10 + i, r[2]);
  },
  sewing_kit(p) {
    // a tomato pincushion bristling with pins
    const t = ramp('#c8283a'); p.ball(9, 11, 7, 5.5, t);
    for (const x of [5, 9, 13]) p.line(x, 7, x, 15, t[1]);
    p.poly([7, 6, 9, 4, 11, 6, 9, 7], hex('#3a8a3a'));
    for (const [x, y, c] of [[4, 3, '#e8c040'], [12, 2, '#4ab0e0'], [15, 6, '#e8e8f0']] as [number, number, string][]) { p.set(x, y, c); p.line(x + (x < 9 ? 1 : -1), y + 1, x + (x < 9 ? 2 : -2), y + 4, hex('#c8c8d0')); }
    sh(p, 5, 8);
  },
  inkpot(p) {
    const g = ramp('#3a4a5a'); p.ball(9, 11, 6.5, 5.5, g); p.rect(6, 3, 6, 3, hex('#2a2a32')); p.rect(6, 3, 6, 1, hex('#4a4a52'));
    p.ball(9, 12, 4.5, 3.5, ramp('#14122a')); sh(p, 5, 9); sh(p, 6, 8);
    p.rect(6, 10, 6, 3, hex('#e8dcc0')); p.rect(7, 11, 4, 1, hex('#2a2a6a'));   // the label
  },
  moth_box(p) {
    const wd = ramp('#7a5a3a'); p.rect(2, 7, 14, 10, wd[2]); p.rect(2, 7, 14, 1, wd[4]); p.rect(2, 16, 14, 1, wd[0]);
    p.poly([1, 5, 17, 5, 16, 7, 2, 7], wd[3]);
    for (const x of [5, 9, 13]) p.set(x, 11, '#1a1010');
    // a moth slipping out under the lid
    p.poly([9, 5, 4, 1, 5, 6], hex('#c8b48a')); p.poly([9, 5, 14, 1, 13, 6], hex('#a8946a')); p.set(9, 4, '#3a2a1a');
  },
  chalk_stick(p) {
    const c = ramp('#ece8dc'); p.tube(4, 14, 13, 5, 2.4, c); p.line(5, 12, 12, 5, W);
    for (const [x, y] of [[2, 16], [4, 17], [1, 14], [6, 16]]) p.set(x, y, '#d8d4c8');
  },
  oil_lantern(p) {
    // a hurricane lantern: wire handle, tall glass, brass base
    const b = ramp('#c89a3a'); p.ring(9, 4, 4, '#6a6a72', 1);
    p.rect(5, 4, 8, 2, b[2]); p.ball(9, 9.5, 4.5, 4, ramp('#e8e0c8'), { dither: 0.2 });
    flame(p, 9, 9, 1); p.rect(4, 13, 10, 3, b[2]); p.rect(4, 13, 10, 1, b[4]); p.rect(3, 16, 12, 1, b[0]); sh(p, 6, 7);
  },
  binders_awl(p) {
    const wd = ramp('#8a5a32'); p.ball(5, 5, 4, 3.5, wd); p.rect(7, 6, 3, 3, hex('#c89a3a'));
    p.tube(9, 8, 16, 16, 1, ramp('#c8ccd8')); p.line(9, 8, 15, 15, W); sh(p, 3, 3);
  },
  locksmith_pick(p) {
    const b = ramp('#c89a3a'); p.ring(8, 6, 4, '#8a8a92', 2); p.rect(3, 7, 10, 9, b[2]); p.rect(3, 7, 10, 1, b[4]); p.rect(3, 15, 10, 1, b[0]);
    p.ball(8, 11, 1.4, 1.4, ramp('#1a1010')); p.rect(8, 12, 1, 2, hex('#1a1010'));
    p.line(8, 11, 17, 14, hex('#d8dce8')); p.set(17, 13, '#d8dce8');
  },
  wrath_candle(p) {
    const r = ramp('#a01a24'); p.rect(5, 8, 8, 9, r[2]); p.rect(5, 8, 8, 1, r[4]); p.rect(5, 8, 2, 9, r[3]); p.rect(11, 9, 2, 8, r[1]);
    p.line(6, 10, 8, 11, hex('#1a0408')); p.line(12, 10, 10, 11, hex('#1a0408')); p.rect(7, 14, 4, 1, hex('#1a0408'));
    flame(p, 9, 4, 1.25, '#ff3a1a', '#ffd060');
  },
  glue_pot(p) {
    const m = ramp('#8a8a6a'); p.rect(3, 8, 12, 8, m[2]); p.rect(3, 8, 12, 1, m[4]); p.rect(3, 15, 12, 1, m[0]);
    p.rect(2, 7, 14, 2, hex('#efe8d8')); p.rect(4, 9, 2, 3, hex('#efe8d8')); p.rect(11, 9, 1, 2, hex('#efe8d8'));
    p.tube(10, 7, 14, 1, 1, ramp('#9a6a3a')); p.rect(9, 6, 3, 2, hex('#d8c8a0'));
  },
  marrow_flute(p) {
    const b = ramp('#e8e0cc'); p.tube(2, 13, 15, 4, 2.4, b); p.ball(2, 13, 2.6, 2.6, b); p.ball(15, 4, 2.6, 2.6, b);
    for (let i = 0; i < 4; i++) p.set(6 + i * 2.2, 10 - i * 1.5, '#3a2a1a');
    p.line(3, 11, 14, 3, b[4]);
  },
  paper_bird(p) {
    // an origami crane
    p.poly([1, 9, 9, 7, 9, 13], hex('#c8c0b0')); p.poly([9, 7, 17, 3, 12, 11], hex('#f4efe4'));
    p.poly([9, 7, 12, 11, 9, 13], hex('#e0d8c8')); p.poly([5, 8, 9, 7, 7, 2], hex('#f8f4ec'));
    p.line(1, 9, 0, 6, hex('#c8c0b0')); p.set(16, 3, '#c8283a');
  },
  bookworm(p) {
    const bk = ramp('#3a6a4a'); p.rect(2, 8, 14, 8, bk[2]); p.rect(2, 8, 14, 1, bk[4]); p.rect(2, 13, 14, 1, hex('#efe6d0'));
    const g = ramp('#8ad06a'); p.tube(6, 9, 10, 4, 2, g); p.ball(11, 4, 3, 2.8, g);
    p.ring(10, 4, 1.4, '#2a2a2a'); p.ring(13, 4, 1.4, '#2a2a2a'); p.set(10, 4, W); p.set(13, 4, W);
  },
  button_jar(p) {
    const g = ramp('#b8d0d8'); p.rect(3, 5, 12, 12, g[1]); p.rect(4, 6, 10, 10, g[2]); p.rect(2, 3, 14, 3, hex('#8a6a4a')); p.rect(2, 3, 14, 1, hex('#b89a70'));
    for (const [x, y, c] of [[6, 13, '#c8283a'], [10, 13, '#3a6ab0'], [8, 10, '#e8c040'], [12, 9, '#4ab05a'], [6, 8, '#b05ad8']] as [number, number, string][]) {
      p.ball(x, y, 1.8, 1.8, ramp(c)); p.set(x, y, '#1a1010');
    }
    sh(p, 4, 7);
  },
  lantern_wisp(p) {
    // a flame with a face, no lantern at all
    flame(p, 9, 8, 2.2, '#ff8a2a', '#ffd870');
    p.rect(7, 10, 1, 2, hex('#3a1a0a')); p.rect(11, 10, 1, 2, hex('#3a1a0a')); p.rect(8, 13, 3, 1, hex('#8a3a0a'));
    for (const [x, y] of [[3, 4], [15, 6], [4, 14]]) p.set(x, y, '#ffb040');
  },
  // ------------------------------------------------------------------ batch 2: look-alikes
  powder_ink(p) {
    // ink that explodes: a round black ink bomb with a lit fuse
    const b = ramp('#2a2440'); p.ball(8, 11, 6, 6, b); p.rect(6, 4, 4, 2, hex('#4a4a52')); sh(p, 5, 8); sh(p, 6, 7);
    p.ball(8, 12, 3.5, 2.6, ramp('#3a3aa0'));
    p.line(9, 4, 12, 2, hex('#8a6a4a')); p.line(12, 2, 13, 3, hex('#8a6a4a')); spark(p, 14, 2, '#ffb040'); p.set(15, 1, '#ff6a2a');
  },
  hex_ink(p) {
    // a tall bottle of purple ink with an eye glowing on its label
    const g = ramp('#4a3a5a'); p.rect(5, 6, 8, 11, g[2]); p.rect(5, 6, 2, 11, g[3]); p.rect(11, 7, 2, 10, g[1]); p.rect(7, 3, 4, 3, g[1]); p.rect(6, 1, 6, 2, hex('#8a6a4a'));
    p.rect(6, 9, 6, 5, hex('#e8dcc0')); p.poly([9, 10, 11, 11.5, 9, 13, 7, 11.5], hex('#9a3ad8')); p.set(9, 11, '#1a0a20');
    for (const [x, y] of [[3, 5], [15, 7], [14, 3]]) p.set(x, y, '#c080ff');
  },
  oil_flask(p) {
    // a tin oil can with a long spout
    const m = ramp('#c89a3a'); p.rect(3, 8, 9, 9, m[2]); p.rect(3, 8, 9, 1, m[4]); p.rect(3, 8, 2, 9, m[3]); p.rect(10, 9, 2, 8, m[1]);
    p.ball(7.5, 8, 4.5, 2, m); p.rect(6, 5, 3, 2, m[1]);
    p.line(11, 9, 17, 3, hex('#9a7a2a')); p.line(11, 10, 17, 4, hex('#c89a3a'));
    p.ball(16, 6, 1, 1.4, ramp('#e8c040'));                                // a drop of oil
    p.ring(4, 12, 2.5, m[0]);
  },
  long_needle(p) {
    // a long needle, eye and all, with a thread trailing
    const m = ramp('#d8dce8'); p.tube(3, 15, 15, 3, 1.2, m); p.line(4, 14, 14, 4, W);
    p.ring(14, 4, 1.7, m[1], 1); p.set(14, 4, '#1a1a24');
    for (let i = 0; i < 7; i++) p.set(15 + Math.round(Math.sin(i) * 1.2), 5 + i * 1.7, '#c8283a');
  },
  ghost_ink(p) {
    // a drop of ink with a little ghost's face, fading at the bottom
    const c = ramp('#b8c8f0'); p.ball(9, 11, 5.5, 5.5, c); p.poly([4.5, 10, 9, 1, 13.5, 10], c[2]); p.set(7, 5, W);
    for (const x of [4, 7, 10, 13]) p.clear(x, 16);
    p.rect(7, 10, 1, 2, hex('#2a2a4a')); p.rect(11, 10, 1, 2, hex('#2a2a4a')); p.ball(9, 13.5, 1, 0.8, ramp('#2a2a4a'));
  },
  belfry_bat(p) {
    // a bat, wings spread, scalloped edges
    const b = ramp('#4a3448');
    for (const side of [-1, 1]) {
      const pts = [9, 6, 9 + side * 8, 2, 9 + side * 8, 10, 9 + side * 6, 9, 9 + side * 5, 12, 9 + side * 3, 10, 9 + side * 2, 13];
      p.poly(pts, side < 0 ? b[2] : b[1]);
      p.line(9, 6, 9 + side * 8, 2, b[4]); p.line(9 + side * 2, 7, 9 + side * 6, 9, b[0]); p.line(9 + side * 2, 7, 9 + side * 5, 11, b[0]);
    }
    p.ball(9, 9, 2.4, 3.2, ramp('#3a2a3a')); p.poly([7, 7, 7.5, 3.5, 9, 6], b[2]); p.poly([9, 6, 10.5, 3.5, 11, 7], b[2]);
    p.set(8, 8, '#ff4040'); p.set(10, 8, '#ff4040'); p.set(8, 11, '#efe6d0'); p.set(10, 11, '#efe6d0');
  },
  lamp_lure(p) {
    // a lantern with moths circling it
    const m = ramp('#3a3434'); p.rect(6, 4, 7, 11, m[2]); p.rect(7, 5, 5, 9, hex('#f0c060')); p.rect(8, 7, 3, 4, hex('#fff8e0')); p.rect(7, 2, 5, 2, m[2]); p.rect(5, 15, 9, 1, m[1]);
    for (const [x, y, f] of [[2, 4, 1], [15, 7, -1], [3, 13, 1]] as [number, number, number][]) { p.poly([x, y, x - 2 * f, y - 2, x - f, y + 1], hex('#c8b48a')); p.poly([x, y, x + 2 * f, y - 2, x + f, y + 1], hex('#a8946a')); p.set(x, y, '#3a2a1a'); }
  },
  // ------------------------------------------------------------------ companions
  shadow_twin(p) {
    const s = ramp('#2a2240'); p.ball(9, 6, 4.5, 4.5, s); p.poly([4, 9, 14, 9, 15, 17, 3, 17], s[1]);
    p.rect(7, 5, 2, 2, hex('#c8a0ff')); p.rect(11, 5, 2, 2, hex('#c8a0ff')); p.set(7, 5, W); p.set(11, 5, W);
  },
  mirror_twin(p) {
    const s = ramp('#2a2240');
    for (const cx of [5, 13]) { p.ball(cx, 6, 3.4, 3.4, s); p.poly([cx - 3.5, 9, cx + 3.5, 9, cx + 4, 17, cx - 4, 17], s[1]); p.set(cx - 1, 6, '#c8a0ff'); p.set(cx + 1, 6, '#c8a0ff'); }
    p.rect(9, 1, 1, 17, hex('#c8e0ff')); p.set(9, 3, W); p.set(9, 9, W);
  },
  choir_mote(p) {
    p.ball(9, 9, 4.5, 4.5, ramp('#ffe8a0')); p.ball(9, 9, 2.5, 2.5, ramp('#ffffff'));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r0 = 6, r1 = i % 2 ? 7.5 : 8.5; p.line(Math.round(9 + Math.cos(a) * r0), Math.round(9 + Math.sin(a) * r0), Math.round(9 + Math.cos(a) * r1), Math.round(9 + Math.sin(a) * r1), hex('#ffe070')); }
  },
  little_wick(p) {
    const w = ramp('#efe2c0'); p.rect(6, 8, 7, 9, w[2]); p.rect(6, 8, 7, 1, w[4]); p.rect(6, 8, 2, 9, w[3]);
    p.rect(8, 11, 1, 2, hex('#2a1a10')); p.rect(11, 11, 1, 2, hex('#2a1a10')); p.set(9, 14, '#c86a4a'); p.set(10, 14, '#c86a4a');
    p.line(9, 6, 9, 8, hex('#2a1a10')); flame(p, 9, 4, 0.9);
  },
  // ------------------------------------------------------------------ dice and fate
  spindown(p) {
    die(p, '#8a8a96', []);
    p.rect(8, 5, 2, 6, hex('#f0f0f8')); p.poly([5, 10, 13, 10, 9, 14], hex('#f0f0f8'));
  },
  d_infinity(p) {
    die(p, '#5a3a9a', []);
    p.ring(6.5, 9, 2.4, '#f0e8ff', 1); p.ring(11.5, 9, 2.4, '#f0e8ff', 1); p.set(9, 9, '#f0e8ff');
  },
  loaded_dice(p) {
    // a red die showing six, with a drop of lead weighing it down
    die(p, '#c8283a', [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]], '#fff4e8', 2, 2, 12);
    p.ball(14, 14, 3, 3, ramp('#6a6a7a')); p.set(13, 13, W);
  },
  t_fate(p) {
    // a die, half black and half white: one pip of each
    die(p, '#e8e4dc', []); p.poly([3, 15, 15, 3, 15, 15], hex('#1a1418')); p.poly([4, 15, 15, 4, 15, 14, 14, 15], hex('#1a1418'));
    p.rect(5, 5, 2, 2, hex('#1a1418')); p.rect(11, 11, 2, 2, hex('#c8283a'));
  },
  t_unravel(p) {
    const wd = ramp('#8a5a32'), t = ramp('#c8283a');
    p.rect(2, 2, 9, 2, wd[2]); p.rect(2, 12, 9, 2, wd[1]); p.rect(4, 4, 5, 8, t[2]); p.rect(4, 4, 1, 8, t[4]);
    for (let i = 0; i < 9; i++) p.set(10 + Math.round(Math.sin(i * 0.9) * 2) + Math.floor(i / 2), 6 + i, t[i % 2 ? 1 : 3]);
  },
  t_swarm(p) {
    for (const [x, y, s] of [[6, 6, 1.3], [13, 7, 1.1], [9, 13, 1.4]] as [number, number, number][]) {
      p.poly([x, y, x - 4 * s, y - 3 * s, x - 3 * s, y + 2 * s], hex('#c8b48a')); p.poly([x, y, x + 4 * s, y - 3 * s, x + 3 * s, y + 2 * s], hex('#a8946a'));
      p.rect(x - 0.5, y - 1, 1, 3, hex('#3a2a1a')); p.set(x - 2 * s, y - 1, '#6a5a3a'); p.set(x + 2 * s, y - 1, '#6a5a3a');
    }
  },
  t_burnout(p) {
    // a lamp burnt black, still burning
    const m = ramp('#3a3034'); p.rect(5, 6, 8, 9, m[1]); p.rect(4, 15, 10, 2, m[2]); p.rect(6, 3, 6, 3, m[2]); p.ring(9, 2, 2, m[3], 1);
    p.rect(6, 7, 6, 7, hex('#2a1a14')); flame(p, 9, 10, 1.1, '#ff5a1a', '#ffd060');
    for (const [x, y] of [[3, 4], [15, 3], [14, 9]]) p.set(x, y, '#ff8a2a');
  },
  t_runaway(p) {
    const s = ramp('#9a948a'); p.ball(12, 7, 3.4, 3, s); p.ball(9, 13, 2.6, 2.4, s); sh(p, 11, 5);
    for (const y of [5, 7, 9]) p.line(1, y, 7, y, hex(y === 7 ? '#e8e0d0' : '#b8b0a0'));
    for (const y of [12, 14]) p.line(1, y, 5, y, hex('#b8b0a0'));
  },
};
