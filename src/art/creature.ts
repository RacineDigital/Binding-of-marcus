// Shared helpers for painting creatures.
import { PixelArt } from '../render/pixel';
import { ramp, hex, Col } from '../render/color';
import { Sprite } from '../render/sprite';

export { PixelArt, ramp, hex };
export { pack } from '../render/color';
export type Painter = (p: PixelArt, f: number, n: number) => void;

/** Build n frames of size w x h from a painter, pivot at bottom centre (feet). */
export function frames(w: number, h: number, n: number, painter: Painter, oy?: number, outline = true): Sprite[] {
  const out: Sprite[] = [];
  for (let f = 0; f < n; f++) {
    const p = new PixelArt(w, h);
    painter(p, f, n);
    p.polish();
    if (outline) p.outline(undefined, false, 0.86);
    out.push(new Sprite(p, Math.floor(w / 2), oy ?? h - 1));
  }
  return out;
}

export function eye(p: PixelArt, x: number, y: number, r: number, lookX = 0, lookY = 0, iris: string = '#1a1020', sclera = '#f0ece0'): void {
  if (r <= 1) { p.set(x, y, iris); return; }
  p.ellipse(x, y, r, r, sclera);
  p.ellipse(x + lookX * r * 0.35, y + lookY * r * 0.35, Math.max(0.8, r * 0.55), Math.max(0.8, r * 0.55), iris);
  p.set(Math.floor(x - r * 0.4), Math.floor(y - r * 0.4), '#ffffff');
}
export function glowEye(p: PixelArt, x: number, y: number, c: string): void {
  p.set(x, y, c); p.set(x + 1, y, c); p.set(x, y - 1, '#ffffff');
}
export function teeth(p: PixelArt, x: number, y: number, w: number, h: number, open = 1): void {
  p.rect(x, y, w, Math.max(1, Math.round(h * open)), '#1a0a10');
  for (let i = 0; i < w; i += 2) { p.set(x + i, y, '#e8e0d0'); if (open > 0.4) p.set(x + i + 1, y + Math.max(1, Math.round(h * open)) - 1, '#e8e0d0'); }
}
export function legs(p: PixelArt, cx: number, cy: number, n: number, spread: number, len: number, phase: number, c: Col): void {
  for (let i = 0; i < n; i++) {
    const side = i % 2 ? 1 : -1;
    const k = Math.floor(i / 2);
    const a = (k - (n / 2 - 1) / 2) * spread + Math.sin(phase + i * 1.7) * 0.35;
    const x1 = cx + side * Math.cos(a) * len, y1 = cy + Math.sin(a) * len * 0.6 + 2;
    const xm = cx + side * Math.cos(a) * len * 0.55, ym = cy + Math.sin(a) * len * 0.3 - 2;
    p.line(cx, cy, xm, ym, c); p.line(xm, ym, x1, y1, c);
  }
}
export function sprinkle(p: PixelArt, c: string, n: number, seed: number, x0 = 0, y0 = 0, w = p.w, h = p.h): void {
  let s = seed * 9301 + 49297;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280; const x = x0 + Math.floor((s / 233280) * w);
    s = (s * 9301 + 49297) % 233280; const y = y0 + Math.floor((s / 233280) * h);
    p.paint(x, y, c);
  }
}

// ------------------------------------------------------------------ hand-drawn grids
import { grid, Palette } from './grid';
/** Sprites from hand-drawn grids (already outlined; no polish pass). Pivot at the bottom centre. */
export function gridFrames(list: string[][], pal: Palette, oy?: number): Sprite[] {
  return list.map((rows) => { const p = grid(rows, pal); return new Sprite(p, Math.floor(p.w / 2), oy ?? p.h - 1); });
}
/** Nearest-neighbour squash / stretch of a hand-drawn grid about its bottom centre (same canvas size). */
export function scaledFrames(rows: string[], pal: Palette, scales: [number, number][], oy?: number): Sprite[] {
  const src = grid(rows, pal);
  return scales.map(([sx, sy]) => {
    const p = new PixelArt(src.w, src.h);
    const cx = src.w / 2, by = src.h;
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const ux = Math.floor(cx + (x + 0.5 - cx) / sx), uy = Math.floor(by - (by - (y + 0.5)) / sy);
      const v = src.get(ux, uy); if (v) p.set(x, y, v);
    }
    return new Sprite(p, Math.floor(p.w / 2), oy ?? p.h - 1);
  });
}

// ------------------------------------------------------------------ detail kit (boss art)
const h01 = (i: number, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
/** A jagged crack / wrinkle wandering from (x, y). */
export function crack(p: PixelArt, x: number, y: number, len: number, c: string | number, seed: number, dir = Math.PI / 2, wob = 0.9): void {
  let a = dir;
  for (let i = 0; i < len; i++) {
    p.paint(Math.round(x), Math.round(y), c);
    a += (h01(seed, i) - 0.5) * wob; x += Math.cos(a); y += Math.sin(a);
    if (i > 2 && h01(seed + 9, i) < 0.12) crack(p, x, y, Math.floor(len / 3), c, seed * 3 + i, a + (h01(seed, i + 50) < 0.5 ? 0.9 : -0.9), wob);
  }
}
/** Drips hanging from a ledge between x0 and x1 at y, that lengthen with phase f (0..1). */
export function drips(p: PixelArt, x0: number, x1: number, y: number, c: string | number, hi: string | number | null, f: number, seed: number, maxLen = 6): void {
  for (let x = x0; x < x1; x++) {
    if (h01(seed, x) > 0.35) continue;
    const l = Math.round(1 + ((h01(seed + 1, x) + f) % 1) * maxLen);
    for (let j = 0; j < l; j++) p.set(x, y + j, c);
    p.set(x, y + l, c); if (l > 2) { p.set(x - 1, y + l, c); p.set(x + 1, y + l, c); }
    if (hi) p.set(x, y + l, hi);
  }
}
/** A fat, glossy eye: sclera with red veins, coloured iris, pupil, specular glint. */
export function bigEye(p: PixelArt, x: number, y: number, r: number, lookX: number, lookY: number, iris: string, opts: { sclera?: string; pupil?: string; veins?: string; slit?: boolean; lid?: number } = {}): void {
  const sc = opts.sclera ?? '#f0e8d8';
  p.ball(x, y, r, r, ramp(sc), { dither: 0.2 });
  if (opts.veins !== '') for (let i = 0; i < Math.max(2, Math.round(r)); i++) {
    const a = h01(i, r) * TAU, l = r * 0.6;
    p.line(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, x + Math.cos(a + 0.3) * (r - l), y + Math.sin(a + 0.3) * (r - l), opts.veins ?? '#c84a4a');
  }
  const ix = x + lookX * r * 0.35, iy = y + lookY * r * 0.35, ir = Math.max(1, r * 0.58);
  p.ball(ix, iy, ir, ir, ramp(iris), { dither: 0.3 });
  if (opts.slit) p.rect(Math.round(ix), Math.round(iy - ir * 0.8), 1, Math.max(1, Math.round(ir * 1.6)), opts.pupil ?? '#0a0408');
  else p.ellipse(ix, iy, Math.max(0.6, ir * 0.5), Math.max(0.6, ir * 0.5), opts.pupil ?? '#0a0408');
  p.set(Math.round(ix - ir * 0.45), Math.round(iy - ir * 0.5), '#ffffff');
  if (opts.lid) { const lid = ramp('#000000'); void lid; for (let yy = Math.floor(y - r); yy < y - r + r * 2 * opts.lid; yy++) for (let xx = Math.floor(x - r); xx <= x + r; xx++) if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r) p.paint(xx, yy, '#2a1a1a'); }
}
/** A ragged maw: dark gullet, gums, uneven teeth top and bottom, a tongue and a string of drool. */
export function maw(p: PixelArt, x: number, y: number, w: number, h: number, open: number, o: { gum?: string; tooth?: string; tongue?: string; drool?: string } = {}): void {
  const hh = Math.max(2, Math.round(h * (0.35 + open * 0.65)));
  p.ball(x + w / 2, y + hh / 2, w / 2 + 0.5, hh / 2 + 0.5, ramp(o.gum ?? '#8a2a3a'));
  p.ball(x + w / 2, y + hh / 2, w / 2 - 1, hh / 2 - 0.5, ramp('#1a0408'));
  if (open > 0.3) p.ball(x + w / 2, y + hh - 2, w / 4, 1.6, ramp(o.tongue ?? '#c84a5a'));
  const t = o.tooth ?? '#f0ead8';
  for (let i = 1; i < w - 1; i += 2) {
    const l = 1 + Math.round(h01(i, w) * 2 * (0.5 + open));
    for (let j = 0; j < l; j++) { p.set(x + i, y + 1 + j, t); p.set(x + i + (i % 4 === 1 ? 1 : 0), y + hh - 1 - j, t); }
  }
  if (o.drool !== '' && open > 0.4) { const dx = x + Math.round(w * 0.65); for (let j = 0; j < 2 + open * 4; j++) p.set(dx, y + hh + j, o.drool ?? '#cfe8d8'); }
}
/** Stitches across a seam. */
export function stitches(p: PixelArt, x0: number, y0: number, x1: number, y1: number, c: string | number, step = 3): void {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    p.set(x - 1, y - 1, c); p.set(x + 1, y + 1, c); p.set(x, y, c);
  }
}
/** Grain lines over a rect of wood (only on painted pixels). */
export function grain(p: PixelArt, x: number, y: number, w: number, h: number, c: string | number, seed: number, vertical = true): void {
  for (let i = 0; i < (vertical ? w : h); i += 3) {
    let off = 0;
    for (let j = 0; j < (vertical ? h : w); j++) {
      if (h01(seed + i, j) < 0.08) off += h01(i, j) < 0.5 ? -1 : 1;
      const px = vertical ? x + i + off : x + j, py = vertical ? y + j : y + i + off;
      if (p.opaque(px, py) && h01(seed, i * 99 + j) < 0.75) p.paint(px, py, c);
    }
  }
}
/** Rivets along a line. */
export function rivets(p: PixelArt, x0: number, y0: number, x1: number, y1: number, n: number, c: string | number, hi: string | number): void {
  for (let i = 0; i < n; i++) { const k = n === 1 ? 0.5 : i / (n - 1); const x = Math.round(x0 + (x1 - x0) * k), y = Math.round(y0 + (y1 - y0) * k); p.set(x, y, c); p.set(x - 1, y - 1, hi); }
}
export const rand01 = h01;
const TAU = Math.PI * 2;
