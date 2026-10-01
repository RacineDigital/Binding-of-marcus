// Reusable AI building blocks: flow-field pathing, steering, aiming and bullet patterns.
import type { World } from '../game/world';
import type { Enemy } from './enemy';
import { TILE, HURT_TOP, HURT_BOT } from '../core/constants';
import { solidCell, lineClear } from '../rooms/collide';
import { TAU, angleTo, dist, clamp } from '../core/math';

/** BFS distance field toward the player over walkable cells. Rebuilt a few times per second. */
export class FlowField {
  cols = 0; rows = 0; d: Int16Array = new Int16Array(0); t = 0; pc = -1; pr = -1;
  build(w: World): void {
    const room = w.room; this.cols = room.cols; this.rows = room.rows;
    const n = this.cols * this.rows;
    if (this.d.length !== n) this.d = new Int16Array(n);
    this.d.fill(-1);
    const [pc, pr] = room.cellAt(w.player.x, w.player.y);
    const sc = clamp(pc, 0, this.cols - 1), sr = clamp(pr, 0, this.rows - 1);
    this.pc = sc; this.pr = sr;
    const q = new Int32Array(n); let qh = 0, qt = 0;
    q[qt++] = sr * this.cols + sc; this.d[sr * this.cols + sc] = 0;
    while (qh < qt) {
      const i = q[qh++]; const c = i % this.cols, r = (i / this.cols) | 0;
      const nd = this.d[i] + 1;
      for (let k = 0; k < 4; k++) {
        const nc = c + (k === 0 ? 1 : k === 1 ? -1 : 0), nr = r + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        const j = nr * this.cols + nc;
        if (this.d[j] >= 0 || solidCell(room, nc, nr, 'walk')) continue;
        this.d[j] = nd; q[qt++] = j;
      }
    }
  }
  at(c: number, r: number): number { if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return -1; return this.d[r * this.cols + c]; }
}

/** Steer toward the player, using the flow field when there is no clear line. Returns move angle. */
export function chase(e: Enemy, w: World, speed: number, dt: number, tx = w.player.x, ty = w.player.y): number {
  let a = angleTo(e.x, e.y, tx, ty);
  if (e.mode === 'walk' && !lineClear(w.room, e.x, e.y, tx, ty, 'walk')) {
    const room = w.room;
    const [c, r] = room.cellAt(e.x, e.y);
    const ff = w.flow;
    let best = ff.at(c, r), bc = c, br = r;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const v = ff.at(c + dc, r + dr);
      if (v < 0) continue;
      if (dc && dr && (ff.at(c + dc, r) < 0 || ff.at(c, r + dr) < 0)) continue;
      if (best < 0 || v < best) { best = v; bc = c + dc; br = r + dr; }
    }
    if (bc !== c || br !== r) { const cc = room.cellCenter(bc, br); a = angleTo(e.x, e.y, cc.x, cc.y); }
  }
  if (e.fear > 0) a += Math.PI;
  if (e.confuse > 0) a += Math.sin(e.t * 3 + e.id) * 2;
  const s = speed * e.spd();
  e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
  if (Math.abs(Math.cos(a)) > 0.2) e.flip = Math.cos(a) < 0;
  return a;
}

/** Wander with occasional direction changes; bounce off walls. */
export function wander(e: Enemy, w: World, speed: number, dt: number, turnEvery = 1.2): void {
  if (e.data.wa === undefined || e.data.wt === undefined) { e.data.wa = Math.random() * TAU; e.data.wt = Math.random() * turnEvery; }
  e.data.wt -= dt;
  if (e.data.wt <= 0) { e.data.wa = Math.random() * TAU; e.data.wt = turnEvery * (0.6 + Math.random() * 0.8); }
  const s = speed * e.spd();
  const h = e.move(w, Math.cos(e.data.wa) * s * dt, Math.sin(e.data.wa) * s * dt);
  if (h.hx || h.hy) e.data.wa = Math.random() * TAU;
  if (Math.abs(Math.cos(e.data.wa)) > 0.2) e.flip = Math.cos(e.data.wa) < 0;
}

/** Erratic insect flight biased toward the player. */
export function buzz(e: Enemy, w: World, speed: number, dt: number, bias = 0.6): void {
  const a = angleTo(e.x, e.y, w.player.x, w.player.y) + (e.fear > 0 ? Math.PI : 0);
  e.data.jx = (e.data.jx ?? 0) * 0.9 + (Math.random() - 0.5) * 60;
  e.data.jy = (e.data.jy ?? 0) * 0.9 + (Math.random() - 0.5) * 60;
  const s = speed * e.spd();
  e.vx += (Math.cos(a) * s * bias + e.data.jx - e.vx) * Math.min(1, dt * 4);
  e.vy += (Math.sin(a) * s * bias + e.data.jy - e.vy) * Math.min(1, dt * 4);
  const h = e.move(w, e.vx * dt, e.vy * dt);
  if (h.hx) e.vx = -e.vx; if (h.hy) e.vy = -e.vy;
  e.flip = e.vx < 0;
}

/** Keep between min and max distance from the player, strafing. */
export function keepDistance(e: Enemy, w: World, min: number, max: number, speed: number, dt: number): void {
  const d = dist(e.x, e.y, w.player.x, w.player.y);
  const a = angleTo(e.x, e.y, w.player.x, w.player.y);
  let mv = 0;
  if (d < min) mv = -1; else if (d > max) mv = 1;
  const side = (e.data.strafe ??= Math.random() < 0.5 ? 1 : -1);
  const s = speed * e.spd();
  const ax = Math.cos(a) * mv + Math.cos(a + Math.PI / 2) * side * 0.6;
  const ay = Math.sin(a) * mv + Math.sin(a + Math.PI / 2) * side * 0.6;
  const h = e.move(w, ax * s * dt, ay * s * dt);
  if (h.hx || h.hy) e.data.strafe = -side;
  if (Math.random() < dt * 0.4) e.data.strafe = -side;
  e.flip = w.player.x < e.x;
}

export function aimAngle(e: Enemy, w: World, lead = 0, spd = 150): number {
  const p = w.player;
  const d = dist(e.x, e.y, p.x, p.y);
  const t = lead > 0 ? (d / spd) * lead : 0;
  // aim the shot's shadow so the shot, drawn at its height, crosses the middle of Marcus's body
  const z = e.hitY * 0.8 + e.z;
  return angleTo(e.x, e.y, p.x + p.vx * t, p.y - (HURT_TOP + HURT_BOT) / 2 + z + p.vy * t);
}

export function shoot(e: Enemy, w: World, ang: number, speed: number, o: Parameters<World['proj']['enemy']>[4] = {}): void {
  // the shadow starts under the enemy; the shot itself leaves from its body
  w.proj.enemy(e.x + Math.cos(ang) * e.r * 0.6, e.y + Math.sin(ang) * e.r * 0.4, ang, speed, { z: e.hitY * 0.8 + e.z, ...o });
}
export function ringShot(e: Enemy, w: World, n: number, speed: number, off = 0, o: Parameters<World['proj']['enemy']>[4] = {}): void {
  for (let i = 0; i < n; i++) shoot(e, w, off + (i / n) * TAU, speed, o);
}
export function spreadShot(e: Enemy, w: World, n: number, ang: number, arc: number, speed: number, o: Parameters<World['proj']['enemy']>[4] = {}): void {
  for (let i = 0; i < n; i++) shoot(e, w, ang + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc), speed, o);
}
export function hasLOS(e: Enemy, w: World): boolean { return lineClear(w.room, e.x, e.y - 4, w.player.x, w.player.y - 4, 'shot'); }
/** If the player is roughly in a cardinal line, returns the angle; else null. */
export function aligned(e: Enemy, w: World, tol = 10): number | null {
  const dx = w.player.x - e.x, dy = w.player.y - e.y;
  if (Math.abs(dy) < tol && Math.abs(dx) < 220) return dx > 0 ? 0 : Math.PI;
  if (Math.abs(dx) < tol && Math.abs(dy) < 180) return dy > 0 ? Math.PI / 2 : -Math.PI / 2;
  return null;
}
export function distToPlayer(e: Enemy, w: World): number { return dist(e.x, e.y, w.player.x, w.player.y); }
/** A random walkable point in the room, optionally at least minD from the player. */
export function randomFloorPoint(w: World, minD = 0): { x: number; y: number } {
  const room = w.room;
  for (let i = 0; i < 60; i++) {
    const c = Math.floor(Math.random() * room.cols), r = Math.floor(Math.random() * room.rows);
    if (solidCell(room, c, r, 'walk')) continue;
    const p = room.cellCenter(c, r);
    if (dist(p.x, p.y, w.player.x, w.player.y) < minD) continue;
    return p;
  }
  return room.center();
}
export const T = TILE;
