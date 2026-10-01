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
