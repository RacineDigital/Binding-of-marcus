// Procedural pixel-art canvas: pixel-exact drawing primitives, ramp shading, selective outlines.
import { Col, hex, darken, A, pack, R, G, B, lighten } from './color';

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16 - 0.5);
const LX = -0.48, LY = -0.62, LZ = 0.62;
const LN = Math.hypot(LX, LY, LZ);
const lx = LX / LN, ly = LY / LN, lz = LZ / LN;

export type C = Col | string;
const col = (c: C): Col => (typeof c === 'string' ? hex(c) : c);

export interface ShadeOpts { dither?: number; rim?: boolean; bias?: number; flatTop?: boolean }

export class PixelArt {
  readonly w: number; readonly h: number;
  data: Uint32Array;
  constructor(w: number, h: number) {
    this.w = w; this.h = h;
    this.data = new Uint32Array(w * h);
  }
  inb(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x: number, y: number, c: C): void {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const v = col(c);
    if (A(v) === 0) { this.data[y * this.w + x] = 0; return; }
    this.data[y * this.w + x] = v;
  }
  /** Set only if the pixel is already opaque (paint inside existing shape). */
  paint(x: number, y: number, c: C): void {
    x = Math.floor(x); y = Math.floor(y);
    if (!this.inb(x, y) || this.data[y * this.w + x] === 0) return;
    this.data[y * this.w + x] = col(c);
  }
  get(x: number, y: number): Col { x = Math.floor(x); y = Math.floor(y); return this.inb(x, y) ? this.data[y * this.w + x] : 0; }
  opaque(x: number, y: number): boolean { return A(this.get(x, y)) > 0; }
  clear(x: number, y: number): void { if (this.inb(x, y)) this.data[Math.floor(y) * this.w + Math.floor(x)] = 0; }

  rect(x: number, y: number, w: number, h: number, c: C): this {
    const v = col(c);
    for (let j = Math.floor(y); j < Math.floor(y + h); j++) for (let i = Math.floor(x); i < Math.floor(x + w); i++) this.set(i, j, v);
    return this;
  }
  /** Filled ellipse centered on (cx,cy) using pixel centers. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: C, onlyPaint = false): this {
    const v = col(c);
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (nx * nx + ny * ny <= 1) onlyPaint ? this.paint(x, y, v) : this.set(x, y, v);
    }
    return this;
  }
  circle(cx: number, cy: number, r: number, c: C): this { return this.ellipse(cx, cy, r, r, c); }
  ring(cx: number, cy: number, r: number, c: C, th = 1): this {
    const v = col(c);
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r && d > r - th) this.set(x, y, v);
    }
    return this;
  }
  /** Ramp-shaded ellipsoid (sphere lighting from the top-left). */
  ball(cx: number, cy: number, rx: number, ry: number, rmp: Col[], o: ShadeOpts = {}): this {
    const dith = o.dither ?? 0.5, bias = o.bias ?? 0;
    const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.ceil(cy + ry + 1);
    const n = rmp.length;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      let lum = nx * lx + ny * ly + nz * lz; // -1..1
      let t = lum * 0.55 + 0.45 + bias;
      if (o.rim && d > 0.72 && nx + ny > 0.6) t += 0.22;
      t += BAYER4[((y & 3) << 2) | (x & 3)] * dith * (1 / n);
      const idx = Math.max(0, Math.min(n - 1, Math.floor(t * n)));
      this.set(x, y, rmp[idx]);
    }
    return this;
  }
  /** Line with optional thickness (square brush). */
  line(x0: number, y0: number, x1: number, y1: number, c: C, th = 1): this {
    const v = col(c);
    const dx = x1 - x0, dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + (dx * i) / steps, y = y0 + (dy * i) / steps;
      if (th <= 1) this.set(Math.round(x), Math.round(y), v);
      else this.ellipse(x, y, th / 2, th / 2, v);
    }
    return this;
  }
  /** Shaded capsule (limb/tube) between two points with radius r. */
  tube(x0: number, y0: number, x1: number, y1: number, r: number, rmp: Col[], o: ShadeOpts = {}): this {
    const dith = o.dither ?? 0.4;
    const dx = x1 - x0, dy = y1 - y0; const l2 = dx * dx + dy * dy || 1;
    const minx = Math.floor(Math.min(x0, x1) - r - 1), maxx = Math.ceil(Math.max(x0, x1) + r + 1);
    const miny = Math.floor(Math.min(y0, y1) - r - 1), maxy = Math.ceil(Math.max(y0, y1) + r + 1);
    const n = rmp.length;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - x0) * dx + (py - y0) * dy) / l2; t = Math.max(0, Math.min(1, t));
      const qx = x0 + dx * t, qy = y0 + dy * t;
      const ex = (px - qx) / r, ey = (py - qy) / r;
      const d = ex * ex + ey * ey;
      if (d > 1) continue;
      const nz = Math.sqrt(1 - d);
      const lum = ex * lx + ey * ly + nz * lz;
      let tt = lum * 0.55 + 0.45 + (o.bias ?? 0) + BAYER4[((y & 3) << 2) | (x & 3)] * dith / n;
      this.set(x, y, rmp[Math.max(0, Math.min(n - 1, Math.floor(tt * n)))]);
    }
    return this;
  }
  /** Filled polygon (even-odd). */
  poly(pts: number[], c: C): this {
    const v = col(c);
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < pts.length; i += 2) { minY = Math.min(minY, pts[i]); maxY = Math.max(maxY, pts[i]); }
    const n = pts.length / 2;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const py = y + 0.5; const xs: number[] = [];
      for (let i = 0; i < n; i++) {
        const ax = pts[i * 2], ay = pts[i * 2 + 1], bx = pts[((i + 1) % n) * 2], by = pts[((i + 1) % n) * 2 + 1];
        if ((ay <= py && by > py) || (by <= py && ay > py)) xs.push(ax + ((py - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.set(x, y, v);
    }
    return this;
  }
  /** Vertical gradient-shade of existing opaque pixels within a rect using a ramp (top=light). */
  shadeV(x: number, y: number, w: number, h: number, rmp: Col[], dith = 0.6, invert = false): this {
    const n = rmp.length;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const px = x + i, py = y + j;
      if (!this.opaque(px, py)) continue;
      let t = 1 - j / Math.max(1, h - 1); if (invert) t = 1 - t;
      t = t * 0.8 + 0.1 + BAYER4[((py & 3) << 2) | (px & 3)] * dith / n;
      this.paint(px, py, rmp[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]);
    }
    return this;
  }
  /** Sprinkle noise pixels of color c on opaque pixels with density p. */
  speckle(c: C, p: number, rnd: () => number, x0 = 0, y0 = 0, w = this.w, h = this.h): this {
    const v = col(c);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (this.opaque(x, y) && rnd() < p) this.paint(x, y, v);
    return this;
  }
  /** Selective outline: transparent pixels next to opaque ones get a darkened neighbour colour (or fixed colour). */
  outline(fixed?: C, diag = false, amt = 0.72): this {
    const out = new Uint32Array(this.data);
    const fc = fixed !== undefined ? col(fixed) : 0;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.data[y * this.w + x] !== 0) continue;
      let nb = 0;
      const ns = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of ns) {
        const v = this.get(x + dx, y + dy);
        if (A(v) > 128) { nb = v; break; }
      }
      if (nb) out[y * this.w + x] = fixed !== undefined ? fc : darken(nb, amt);
    }
    this.data = out;
    return this;
  }
  /** Lighten top-left edge pixels, darken bottom-right edge pixels (subtle form hint). */
  edgeLight(amt = 0.25): this {
    const out = new Uint32Array(this.data);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.data[y * this.w + x]; if (!v) continue;
      if (!this.opaque(x, y - 1) || !this.opaque(x - 1, y)) out[y * this.w + x] = lighten(v, amt);
      else if (!this.opaque(x, y + 1) || !this.opaque(x + 1, y)) out[y * this.w + x] = darken(v, amt);
    }
    this.data = out;
    return this;
  }
  stamp(o: PixelArt, dx: number, dy: number, flip = false): this {
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
      const v = o.data[y * o.w + (flip ? o.w - 1 - x : x)];
      if (v) this.set(dx + x, dy + y, v);
    }
    return this;
  }
  flipX(): PixelArt {
    const p = new PixelArt(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) p.data[y * this.w + x] = this.data[y * this.w + (this.w - 1 - x)];
    return p;
  }
  clone(): PixelArt { const p = new PixelArt(this.w, this.h); p.data.set(this.data); return p; }
  map(fn: (c: Col, x: number, y: number) => Col): this {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = this.data[y * this.w + x]; if (v) this.data[y * this.w + x] = fn(v, x, y);
    }
    return this;
  }
  silhouette(c: C): PixelArt { const v = col(c); return this.clone().map(() => v); }
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const id = ctx.createImageData(this.w, this.h);
    new Uint32Array(id.data.buffer).set(this.data);
    ctx.putImageData(id, 0, 0);
    return cv;
  }
}
export { hex, pack, R, G, B, A };
