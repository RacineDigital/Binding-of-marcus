// Boss "life": the animation layered over a boss sprite every frame. Sprites are baked loops; this
// is what keeps a boss moving between them (embers off the furnace, moths round the Moth Mother,
// pages drifting off the Unbound, glowing eyes, steam, drips, snow) and makes it read as alive.
// Everything is a pure function of time, so it costs nothing to keep and never piles up.
import type { Enemy } from '../enemies/enemy';
import { snap } from '../render/snap';
import type { World } from '../game/world';
import { TAU } from '../core/math';

export interface Life {
  ctx: CanvasRenderingContext2D; w: World; e: Enemy;
  /** top-left of the sprite on screen, its size, and whether it is mirrored */
  x0: number; y0: number; W: number; H: number; flip: boolean;
  t: number;
}
type LifeFn = (L: Life) => void;

const hash = (i: number, k = 0) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Sprite-local x to screen x (respecting the mirror). */
const X = (L: Life, x: number) => L.x0 + (L.flip ? L.W - x : x);
const Y = (L: Life, y: number) => L.y0 + y;

function px(L: Life, x: number, y: number, c: string, s = 1, a = 1): void {
  const ctx = L.ctx; ctx.globalAlpha = a; ctx.fillStyle = c;
  ctx.fillRect(snap(X(L, x) - s / 2), snap(Y(L, y) - s / 2), s, s);
}
function glow(L: Life, x: number, y: number, r: number, c: string, a: number): void { L.w.r.addGlow(X(L, x), Y(L, y), r, c, a); }

interface Motes { n: number; x: number; y: number; w: number; rise: number; speed: number; colors: string[]; size?: number; sway?: number; fall?: boolean; glowR?: number; seed?: number }
/** Particles drifting up (or falling) from a strip of the sprite. */
function motes(L: Life, m: Motes): void {
  for (let i = 0; i < m.n; i++) {
    const s = (m.seed ?? 0) + i;
    const k = (L.t * m.speed * (0.7 + hash(s, 1) * 0.6) + hash(s, 2)) % 1;
    const x = m.x + hash(s, 3) * m.w + Math.sin(L.t * 2 + s * 1.7) * (m.sway ?? 2) * k;
    const y = m.fall ? m.y + k * k * m.rise : m.y - k * m.rise;
    const c = m.colors[i % m.colors.length];
    const a = Math.min(1, k * 6) * (1 - k);
    px(L, x, y, c, m.size ?? 1, a);
    if (m.glowR && i % 2 === 0) glow(L, x, y, m.glowR, c, 0.12 * a);
  }
}
/** Things circling a point: flies, moths, glyphs. */
function orbit(L: Life, cx: number, cy: number, rx: number, ry: number, n: number, speed: number, c: string, size = 1, wob = 2): void {
  for (let i = 0; i < n; i++) {
    const a = L.t * speed * (0.8 + hash(i, 5) * 0.4) + (i / n) * TAU;
    px(L, cx + Math.cos(a) * rx + Math.sin(L.t * 9 + i) * wob, cy + Math.sin(a) * ry + Math.cos(L.t * 7 + i * 2) * wob, c, size, 0.9);
  }
}
/** A pair of eyes that glow, and blink now and then. */
function eyes(L: Life, pts: [number, number][], c: string, r = 9, a = 0.35): void {
  const blink = (L.t * 0.37 + L.e.id * 0.13) % 1 > 0.97;
  if (blink) return;
  for (const [x, y] of pts) { glow(L, x, y, r, c, a); px(L, x, y, c, 1, 0.9); }
}
/** A slow puff of steam or smoke. */
function puffs(L: Life, x: number, y: number, n: number, rise: number, c: string, size = 3, speed = 0.5): void {
  const ctx = L.ctx;
  for (let i = 0; i < n; i++) {
    const k = (L.t * speed + i / n) % 1;
    ctx.globalAlpha = 0.35 * (1 - k) * Math.min(1, k * 5); ctx.fillStyle = c;
    const r = size * (0.6 + k * 1.4);
    ctx.beginPath(); ctx.arc(X(L, x + Math.sin(L.t + i * 2) * 3 * k), Y(L, y - k * rise), r, 0, TAU); ctx.fill();
  }
}

export const BOSS_LIFE: Record<string, LifeFn> = {};
/** Register life for one or more bosses. */
export function life(ids: string | string[], fn: LifeFn): void { for (const id of Array.isArray(ids) ? ids : [ids]) BOSS_LIFE[id] = fn; }
export const L_ = { px, glow, motes, orbit, eyes, puffs, X, Y, hash };

/** Draw a boss's life layer over its sprite. */
export function drawBossLife(w: World, ctx: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number): void {
  const fn = BOSS_LIFE[e.def.id]; if (!fn || e.hidden || e.dead) return;
  const set = e.sprites[e.anim] ?? e.sprites.idle ?? Object.values(e.sprites)[0];
  const spr = set?.[e.frame % set.length]; if (!spr) return;
  const L: Life = { ctx, w, e, x0: sx - spr.ox, y0: sy - e.z - spr.oy, W: spr.w, H: spr.h, flip: !!e.flip, t: w.time };
  ctx.save();
  try { fn(L); } finally { ctx.restore(); }
}

/**
 * Animations a boss loops on its own, whatever its brain is doing (frames per second). These are
 * the long idle loops (a breathing body, a swinging pendulum); poses a brain picks frame by frame
 * aren't listed, so it stays in control of those.
 */
export const BOSS_LOOPS: Record<string, Record<string, number>> = {};
export function loops(ids: string | string[], m: Record<string, number>): void { for (const id of Array.isArray(ids) ? ids : [ids]) BOSS_LOOPS[id] = m; }
export function loopBossFrames(e: Enemy, dt: number): void {
  const m = BOSS_LOOPS[e.def.id]; if (!m) return;
  const fps = m[e.anim]; if (!fps) return;
  const n = e.sprites[e.anim]?.length ?? 1;
  e.data.loopT = (e.data.loopT ?? e.id * 0.37) + dt;
  e.frame = Math.floor(e.data.loopT * fps) % n;
}
