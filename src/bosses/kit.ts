// The boss feature kit: the faces and flesh every boss is built from, so the roster shares one
// hand. Big wet jaws with uneven fangs, bloodshot eyes the rig animates, heavy brows, gashes,
// boils, torn hems, clawed hands. Everything is drawn into a PixelArt at native resolution.
import { PixelArt } from '../render/pixel';
import { ramp, hex } from '../render/color';
import type { Pose, EyeMark } from './rig';

const TAU = Math.PI * 2;
export const h01 = (i: number, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
export { ramp, hex, TAU };

/**
 * A wet, toothy mouth. open 0..1. Gums, a black gullet, a tongue, uneven yellowed teeth with two
 * long fangs, lip shading and strings of drool once it's open.
 */
export function jaws(p: PixelArt, cx: number, cy: number, w: number, h: number, open: number, o: { gum?: string; lip?: string; tooth?: string; tongue?: string; fangs?: number; drool?: string | null; seed?: number; grin?: number } = {}): void {
  const hh = Math.max(2, h * (0.25 + 0.75 * open));
  const lip = ramp(o.lip ?? '#7a2a34'), gum = o.gum ?? '#a83a4a', tooth = o.tooth ?? '#efe2c0', toothSh = '#b8a47a';
  const grin = o.grin ?? 0.25, seed = o.seed ?? 3;
  // lips: a curved band, corners pulled up (grin) or down (negative)
  for (let x = -w / 2; x <= w / 2; x++) {
    const u = x / (w / 2), curve = -grin * (u * u) * h * 0.6;
    const top = cy - hh / 2 + curve * 0.5, bot = cy + hh / 2 + curve;
    for (let y = Math.floor(top - 1); y <= Math.ceil(bot + 1); y++) {
      const inside = y >= top && y <= bot;
      p.set(cx + x, y, inside ? (y < top + 1.2 || y > bot - 1.2 ? gum : '#1a0508') : lip[1]);
    }
    // teeth hang from the top lip and stand on the bottom one, uneven
    const tl = 1 + Math.floor(h01(seed, x + 40) * 2.2) + (open > 0.5 ? 1 : 0);
    const bl = 1 + Math.floor(h01(seed + 1, x + 40) * 1.8);
    if (Math.abs(x) < w / 2 - 0.5 && (Math.round(x) + seed) % 3 !== 0) {
      for (let j = 0; j < tl; j++) p.set(cx + x, Math.round(top) + 1 + j, j === tl - 1 ? toothSh : tooth);
      if (open > 0.2) for (let j = 0; j < bl; j++) p.set(cx + x, Math.round(bot) - 1 - j, j === bl - 1 ? toothSh : tooth);
    }
  }
  // the gullet and tongue
  if (open > 0.35) { p.ball(cx + w * 0.08, cy + hh * 0.22, w * 0.22, Math.max(1, hh * 0.18), ramp(o.tongue ?? '#c84a5a')); }
  // fangs: long canines either side
  const nf = o.fangs ?? 2;
  for (let i = 0; i < nf; i++) {
    const fx = cx + (i % 2 ? 1 : -1) * (w * 0.28 + Math.floor(i / 2) * 2), len = 2 + Math.round(h * 0.28 * (0.6 + open * 0.6));
    const top = cy - hh / 2 - grin * 0.1;
    for (let j = 0; j < len; j++) { p.set(fx, Math.round(top) + j, j > len - 2 ? toothSh : tooth); if (j < len - 2) p.set(fx + (i % 2 ? -1 : 1), Math.round(top) + j, toothSh); }
  }
  if (o.drool !== null && open > 0.45) {
    const dr = o.drool ?? '#cfe0c8';
    for (const dx of [-w * 0.18, w * 0.22]) { const l = 2 + Math.round(open * 4 + h01(seed, dx) * 3); for (let j = 0; j < l; j++) p.set(cx + dx, cy + hh / 2 + j, dr); p.set(cx + dx, cy + hh / 2 + l, '#ffffff'); }
  }
}

/**
 * An eye the rig animates: a dark socket, a bloodshot sclera (painted here), and the iris/pupil drawn
 * live looking at the player. lid 0..1 closes it from the top; anger slants the lid inward.
 * side -1 (left eye) / 1 (right eye) decides which way the slant runs.
 */
export function eyeball(p: PixelArt, s: Pose, x: number, y: number, r: number, iris: string, o: { lid?: number; anger?: number; side?: number; sclera?: string; socket?: string; veins?: number; slit?: boolean; pupil?: string } = {}): void {
  const lid = Math.max(o.lid ?? 0, s.hurt * 0.85, s.death * 0.9);
  const sock = o.socket ?? '#2a0e14';
  p.ellipse(x, y, r + 1, r + 1, sock);
  p.ball(x, y, r, r, ramp(o.sclera ?? '#f2e6d4'), { dither: 0.15 });
  for (let i = 0; i < (o.veins ?? 3); i++) {
    const a = h01(i, r * 7 + x) * TAU;
    p.line(x + Math.cos(a) * r, y + Math.sin(a) * r, x + Math.cos(a + 0.4) * r * 0.45, y + Math.sin(a + 0.4) * r * 0.45, '#c8404a');
  }
  // the lid: closes from the top; anger tips it down toward the nose
  const anger = o.anger ?? 0, side = o.side ?? 1;
  for (let xx = Math.floor(x - r - 1); xx <= x + r + 1; xx++) {
    const u = (xx - x) / (r + 1);
    const lidY = y - r - 1 + (2 * r + 2) * lid + anger * r * 0.9 * (0.5 - u * side * 0.5);
    for (let yy = Math.floor(y - r - 1); yy <= lidY; yy++) if ((xx - x) ** 2 + (yy - y) ** 2 <= (r + 1) ** 2) p.set(xx, yy, sock);
  }
  // eyes that are open enough get a live iris
  if (lid < 0.7 && r >= 1.5) s.eyes.push({ x, y: y + lid * r * 0.6, r: r * (1 - lid * 0.4), iris, slit: o.slit, pupil: o.pupil } as EyeMark);
}

/** A heavy brow ridge over an eye, slanted down toward the nose for anger. */
export function brow(p: PixelArt, x: number, y: number, w: number, slant: number, c: string, th = 2): void {
  for (let i = 0; i <= w; i++) { const u = i / w; for (let j = 0; j < th; j++) p.set(x + i, Math.round(y + slant * u) + j, j === 0 ? ramp(c)[3] : c); }
}

/** A raw gash with stitches across it. */
export function gash(p: PixelArt, x0: number, y0: number, x1: number, y1: number, o: { stitch?: string; blood?: string; open?: number } = {}): void {
  p.line(x0, y0, x1, y1, '#3a0610', 2); p.line(x0, y0, x1, y1, o.blood ?? '#b8202e');
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 3)), a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
  if (o.stitch !== '') for (let i = 1; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
    p.line(x - Math.cos(a) * 2, y - Math.sin(a) * 2, x + Math.cos(a) * 2, y + Math.sin(a) * 2, o.stitch ?? '#1a1414');
  }
  if ((o.open ?? 0) > 0) for (let i = 0; i < 3; i++) p.set(x1 + i % 2, y1 + 1 + i, '#b8202e');
}

/** Glossy boils / tumours. */
export function boils(p: PixelArt, pts: [number, number, number][], col: string): void {
  const c = ramp(col);
  for (const [x, y, r] of pts) { p.ball(x, y, r, r * 0.9, c, { dither: 0.3 }); p.set(Math.round(x - r * 0.4), Math.round(y - r * 0.4), '#ffffff'); if (r > 1.8) p.set(Math.round(x + r * 0.3), Math.round(y + r * 0.5), c[0]); }
}

/** A torn hem: ragged strips hanging from y, swaying with sway (-1..1). */
export function tatters(p: PixelArt, x0: number, x1: number, y: number, len: number, col: string, seed: number, sway = 0): void {
  const c = ramp(col);
  for (let x = x0; x <= x1; x++) {
    const l = Math.round(len * (0.35 + h01(seed, x) * 0.65));
    for (let j = 0; j < l; j++) {
      const dx = Math.round(sway * (j / len) * 2);
      if (h01(seed + 3, x * 31 + j) < 0.06) continue;   // holes
      p.set(x + dx, y + j, j > l - 2 ? c[1] : x % 3 === 0 ? c[1] : c[2]);
    }
  }
}

/** A clawed hand at (x, y): palm and curled fingers, opening as spread goes 0..1. */
export function claw(p: PixelArt, x: number, y: number, ang: number, spread: number, col: string, nail = '#e8dcc0', n = 4, len = 5): void {
  const c = ramp(col);
  p.ball(x, y, 2.6, 2.2, c);
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * (0.25 + spread * 0.35);
    const mx = x + Math.cos(a) * len * 0.55, my = y + Math.sin(a) * len * 0.55;
    const ex = x + Math.cos(a + 0.35 * (1 - spread)) * len, ey = y + Math.sin(a + 0.35 * (1 - spread)) * len;
    p.line(x, y, mx, my, c[2]); p.line(mx, my, ex, ey, c[1]);
    p.set(ex + Math.cos(a), ey + Math.sin(a), nail);
  }
}

/** Purple veins wandering over flesh (only where there's already paint). */
export function veins(p: PixelArt, x: number, y: number, len: number, col: string, seed: number, dir = Math.PI / 2): void {
  let a = dir;
  for (let i = 0; i < len; i++) {
    if (p.opaque(x, y)) p.paint(Math.round(x), Math.round(y), col);
    a += (h01(seed, i) - 0.5) * 1.1; x += Math.cos(a); y += Math.sin(a);
    if (i === Math.floor(len / 2)) veins(p, x, y, Math.floor(len / 2.5), col, seed + 7, a + 0.9);
  }
}

/** Drips running down from (x, y): blood, ink, wax, slime. */
export function dribble(p: PixelArt, x: number, y: number, len: number, col: string, hi = '#ffffff'): void {
  for (let j = 0; j < len; j++) p.set(x, y + j, col);
  p.set(x - 1, y + len, col); p.set(x, y + len, col); p.set(x + 1, y + len, col); p.set(x, y + len + 1, col); p.set(x - 1, y + len - 1, hi);
}

/** Shading helper: a lit-from-top-left ball with a strong dark terminator, for volume. */
export function mass(p: PixelArt, x: number, y: number, rx: number, ry: number, col: string, dither = 0.4): void {
  p.ball(x, y, rx, ry, ramp(col), { dither });
}

/**
 * Death: as k goes 0..1 the body sags and spreads into a heap (rows sink toward the floor, the top
 * falls in faster), darkening, with a pool of the creature's blood spreading under it.
 */
export function melt(p: PixelArt, k: number, floorY: number, seed: number, blood = '#5a0a14'): void {
  if (k <= 0) return;
  const src = p.clone();
  p.map(() => 0);
  const cx = p.w / 2, sq = 1 - k * 0.72, spread = 1 + k * 0.35;
  // the pool first, under everything
  const pr = p.w * 0.18 + k * p.w * 0.28;
  p.ellipse(cx, floorY, pr, 1.5 + k * 2.5, blood);
  p.ellipse(cx - pr * 0.3, floorY - 1, pr * 0.4, 1, '#8a1a24');
  // each column of the heap samples the column of the body it spread from (no gaps as it widens);
  // rows only ever squash together, so they map forward
  for (let nx = 0; nx < p.w; nx++) {
    const x = Math.round(cx + (nx - cx) / spread); if (x < 0 || x >= src.w) continue;
    const fall = sq * (1 - k * 0.15 * h01(seed, x));
    for (let y = 0; y < src.h; y++) {
      const c = src.get(x, y); if (!c) continue;
      p.set(nx, Math.round(floorY - (floorY - y) * fall), c);
    }
  }
  // darken as it dies
  if (k > 0.3) p.map((c, x, y) => (c && h01(x * 7 + seed, y) < (k - 0.3) * 0.8 ? ((c & 0xff000000) | ((c >> 1) & 0x7f7f7f)) >>> 0 : c));
}
