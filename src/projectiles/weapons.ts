// Attack delivery: volleys, charge shots, bursts, beams, lasers and melee swings.
// Everything reads the same AttackProfile so modifiers carry across attack modes.
import type { World } from '../game/world';
import { AttackProfile, luckChance } from './profile';
import type { FinalStats } from '../player/stats';
import { TAU, angleDiff, clamp, dist2, pointSegDist2 } from '../core/math';
import { pointBlocked } from '../rooms/collide';
import { Team } from './projectiles';
import type { Enemy } from '../enemies/enemy';

export const SHOT_PX = 290;

export interface VolleyOpts { dmgMul?: number; sizeMul?: number; fam?: boolean; rangeMul?: number; speedMul?: number; inherit?: { vx: number; vy: number } }

/** Fire one volley of projectiles along `ang` using the profile. */
export function volley(w: World, prof: AttackProfile, st: FinalStats, x: number, y: number, z: number, ang: number, o: VolleyOpts = {}): void {
  const n = Math.max(1, Math.min(16, prof.shots));
  const dmg = st.damage * (o.dmgMul ?? 1);
  const spd = SHOT_PX * st.shotSpeed * (o.speedMul ?? 1);
  const range = st.range * (o.rangeMul ?? 1);
  const size = st.size * (o.sizeMul ?? 1);
  const dirs: number[] = [];
  if (n === 1) dirs.push(0);
  else if (n === 2) dirs.push(-0.035, 0.035);
  else {
    const step = (Math.min(prof.spread, 70 / (n - 1) + 4) * Math.PI) / 180;
    for (let i = 0; i < n; i++) dirs.push((i - (n - 1) / 2) * step);
  }
  const px = -Math.sin(ang), py = Math.cos(ang);
  const extra: number[] = [];
  if (prof.rear) extra.push(Math.PI);
  if (prof.sides) extra.push(Math.PI / 2, -Math.PI / 2);
  const all = dirs.concat(extra);
  for (let i = 0; i < all.length; i++) {
    const d = all[i];
    const off = n === 2 && i < 2 ? (i === 0 ? -4 : 4) : 0;
    const a = ang + d;
    const p = w.proj.player(w, prof, x + px * off, y + py * off, z, a, dmg, spd, range, size, 0, !!o.fam);
    if (p && o.inherit) { p.vx += o.inherit.vx * 0.28; p.vy += o.inherit.vy * 0.28; p.bx = p.x; p.by = p.y; p.spd = Math.hypot(p.vx, p.vy); }
  }
}

// ------------------------------------------------------------------ beams
export class Beam {
  active = true; t = 0; dur = 0.5; ang = 0; width = 7; dmg = 1; tick = 0; prof: AttackProfile; offset = 0;
  pts: number[] = []; followPlayer = true; x = 0; y = 0; laser = false; hitOnce = new Set<number>(); color = '#6a58ff';
  enemyBeam = false; warmup = 0;
  constructor(prof: AttackProfile) { this.prof = prof; }
}

/** Trace a beam path from (x,y) along ang with bounces and homing bends. */
export function traceBeam(w: World, x: number, y: number, ang: number, prof: AttackProfile | null, maxLen = 900, spectral = true): number[] {
  const pts = [x, y];
  let a = ang, cx = x, cy = y, len = 0;
  let bounces = prof?.bounce ?? 0;
  const homing = prof?.homing ?? 0;
  const step = 4;
  let target: Enemy | null = null;
  if (homing > 0) target = w.nearestEnemy(x + Math.cos(ang) * 60, y + Math.sin(ang) * 60, 260);
  let sinceLast = 0;
  while (len < maxLen) {
    if (target && !target.dead) {
      const want = Math.atan2(target.y - 6 - cy, target.x - cx);
      a += clamp(angleDiff(a, want), -0.06 * homing, 0.06 * homing);
      if (dist2(cx, cy, target.x, target.y - 6) < 100) target = null;
    }
    const nx = cx + Math.cos(a) * step, ny = cy + Math.sin(a) * step;
    const blocked = pointBlocked(w.room, nx, ny, spectral ? 'ghost' : 'shot');
    if (blocked) {
      if (bounces > 0) {
        bounces--;
        const bx = pointBlocked(w.room, nx, cy, spectral ? 'ghost' : 'shot'), by = pointBlocked(w.room, cx, ny, spectral ? 'ghost' : 'shot');
        if (bx || !by) a = Math.PI - a;
        if (by || !bx) a = -a;
        pts.push(cx, cy); sinceLast = 0;
        continue;
      }
      pts.push(cx, cy);
      return pts;
    }
    cx = nx; cy = ny; len += step; sinceLast += step;
    if (homing > 0 && sinceLast >= 12) { pts.push(cx, cy); sinceLast = 0; }
  }
  pts.push(cx, cy);
  return pts;
}

export function beamHits(w: World, b: Beam, half: number, onHit: (e: Enemy) => void): void {
  const pts = b.pts;
  for (const e of w.enemies) {
    if (e.dead || e.hidden || e.spawnT > 0 || e.friendly) continue;
    const rr = (half + e.r) * (half + e.r);
    for (let i = 0; i + 3 < pts.length; i += 2) {
      if (pointSegDist2(e.x, e.y - e.hitY, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) < rr) { onHit(e); break; }
    }
  }
}

export function updateBeams(w: World, dt: number): void {
  for (let i = w.beams.length - 1; i >= 0; i--) {
    const b = w.beams[i];
    b.t += dt;
    if (b.enemyBeam) { updateEnemyBeam(w, b, dt); if (b.t >= b.dur) w.beams.splice(i, 1); continue; }
    const pl = w.player;
    if (b.followPlayer) { b.x = pl.x; b.y = pl.y - 11; }
    const a = b.ang + b.offset;
    b.pts = traceBeam(w, b.x + Math.cos(a) * 6, b.y + Math.sin(a) * 4, a, b.prof, b.laser ? Math.max(120, pl.stats.range * 1.3) : 900);
    const half = b.width / 2;
    if (b.laser) {
      if (b.t <= dt * 1.5) beamHits(w, b, half, (e) => { if (!b.hitOnce.has(e.id)) { b.hitOnce.add(e.id); beamDamage(w, b, e, b.dmg); } });
    } else {
      b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = 0.055;
        beamHits(w, b, half, (e) => beamDamage(w, b, e, b.dmg));
        // obstacles along the path take damage too
        for (let k = 0; k + 1 < b.pts.length; k += 2) w.damageObstacleAt(b.pts[k], b.pts[k + 1], b.dmg * 0.5);
        const ex = b.pts[b.pts.length - 2], ey = b.pts[b.pts.length - 1];
        if (b.prof.explode > 0 && Math.random() < 0.25) w.explode(ex, ey, b.prof.explode, Math.max(4, b.dmg * 2), { friendly: true, small: true });
        w.fx.spray(ex, ey, 6, b.ang + Math.PI, 1.5, 2, b.color, 80, 0.3);
      }
    }
    if (b.t >= b.dur) w.beams.splice(i, 1);
  }
}

function beamDamage(w: World, b: Beam, e: Enemy, dmg: number): void {
  const prof = b.prof;
  w.damageEnemy(e, dmg, { ang: b.ang, knock: 0.25, source: 'beam', prof });
  if (prof.chain > 0 && Math.random() < luckChance(prof.chainChance * 0.35, w.player.stats.luck)) w.chainLightning(e, prof.chain, dmg * 1.5, prof);
  if (prof.split > 0 && Math.random() < 0.08) {
    for (let k = 0; k < Math.min(4, prof.split); k++) w.proj.player(w, prof, e.x, e.y - 6, 8, Math.random() * TAU, w.player.stats.damage * 0.5, 220, 90, 0.7, 1);
  }
}

function updateEnemyBeam(w: World, b: Beam, dt: number): void {
  if (b.warmup > 0 && b.t < b.warmup) { b.pts = traceBeam(w, b.x, b.y, b.ang, null, 900, true); return; }
  b.pts = traceBeam(w, b.x, b.y, b.ang, null, 900, true);
  const pl = w.player;
  const half = b.width / 2 + pl.hitR;
  for (let i = 0; i + 3 < b.pts.length; i += 2) {
    if (pointSegDist2(pl.x, pl.y - 6, b.pts[i], b.pts[i + 1], b.pts[i + 2], b.pts[i + 3]) < half * half) { w.hurtPlayer(1, 'beam'); break; }
  }
  void dt;
}

export function renderBeams(w: World, ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  for (const b of w.beams) {
    const pts = b.pts; if (pts.length < 4) continue;
    const warm = b.enemyBeam && b.warmup > 0 && b.t < b.warmup;
    const k = b.laser ? 1 - b.t / b.dur : Math.min(1, b.t / 0.06) * Math.min(1, (b.dur - b.t) / 0.1);
    const wid = warm ? 1 : b.width * (0.75 + 0.25 * Math.sin(b.t * 60)) * k;
    const layers: [number, string, number][] = b.enemyBeam
      ? [[wid + 4, 'rgba(160,20,40,0.35)', 1], [wid, warm ? 'rgba(255,80,80,0.6)' : '#d8324a', 1], [Math.max(1, wid * 0.4), '#ffd0d0', 1]]
      : [[wid + 4, hexA(b.color, 0.3), 1], [wid, b.color, 1], [Math.max(1, wid * 0.35), '#e8e4ff', 1]];
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [lw, c] of layers) {
      if (warm && lw > 2) continue;
      ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, lw);
      ctx.beginPath(); ctx.moveTo(pts[0] - camX, pts[1] - camY);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] - camX, pts[i + 1] - camY);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    if (!warm) for (let i = 0; i < pts.length; i += 2) w.r.addGlow(pts[i] - camX, pts[i + 1] - camY, 18 + b.width, b.enemyBeam ? '#ff3050' : b.color, 0.35);
    if (!warm) { w.r.addLight(pts[0] - camX, pts[1] - camY, 50, 0.6); w.r.addLight(pts[pts.length - 2] - camX, pts[pts.length - 1] - camY, 40, 0.6); }
  }
}
function hexA(h: string, a: number): string {
  const s = h.replace('#', '');
  return `rgba(${parseInt(s.slice(0, 2), 16)},${parseInt(s.slice(2, 4), 16)},${parseInt(s.slice(4, 6), 16)},${a})`;
}

// ------------------------------------------------------------------ melee
export interface Swing { t: number; dur: number; ang: number; arc: number; radius: number; big: boolean }

export function meleeSwing(w: World, prof: AttackProfile, st: FinalStats, x: number, y: number, ang: number, charged: boolean): Swing {
  const radius = (26 + (st.size - 1) * 16) * (charged ? 1.35 : 1) + (prof.shots - 1) * 3;
  const arc = charged ? TAU : Math.min(TAU, (Math.PI * 0.7) + (prof.shots - 1) * 0.35);
  const dmg = st.damage * (charged ? 4 : 2.2);
  const hitSet = new Set<number>();
  for (const e of w.enemies) {
    if (e.dead || e.hidden || e.spawnT > 0 || e.friendly) continue;
    const dx = e.x - x, dy = e.y - e.hitY - y;
    const d = Math.hypot(dx, dy);
    if (d > radius + e.r) continue;
    if (arc < TAU - 0.01 && Math.abs(angleDiff(ang, Math.atan2(dy, dx))) > arc / 2 + 0.2) continue;
    hitSet.add(e.id);
    w.damageEnemy(e, dmg, { ang: Math.atan2(dy, dx), knock: 2.2, source: 'melee', prof });
    if (prof.explode > 0) w.explode(e.x, e.y, prof.explode, dmg * 0.8, { friendly: true, small: true });
    if (prof.chain > 0 && Math.random() < prof.chainChance + 0.2) w.chainLightning(e, prof.chain, dmg * 0.5, prof);
  }
  // swat enemy projectiles out of the air
  for (const p of w.proj.list) {
    if (!p.active || p.team !== Team.Enemy) continue;
    const dx = p.x - x, dy = p.y - y; const d = Math.hypot(dx, dy);
    if (d > radius + 4) continue;
    if (arc < TAU - 0.01 && Math.abs(angleDiff(ang, Math.atan2(dy, dx))) > arc / 2 + 0.2) continue;
    w.fx.sparks(p.x, p.y - p.z, 4, '#ffe0a0', 90);
    w.proj.kill(p);
  }
  // obstacles in reach
  for (let k = 0; k < 5; k++) {
    const a = ang + (k / 4 - 0.5) * Math.min(arc, Math.PI);
    w.damageObstacleAt(x + Math.cos(a) * radius * 0.8, y + Math.sin(a) * radius * 0.8 + 6, dmg * 0.5);
  }
  // charged swing throws a wave carrying the full profile
  if (charged) volley(w, prof, st, x, y + 6, 10, ang, { dmgMul: 1.5, sizeMul: 1.4 });
  return { t: 0, dur: charged ? 0.3 : 0.16, ang, arc, radius, big: charged };
}
