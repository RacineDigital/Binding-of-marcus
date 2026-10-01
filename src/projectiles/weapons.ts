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
  enemyBeam = false; warmup = 0; rot = 0; baseWidth = 0; phase = Math.random() * TAU; sweep = 0;
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
      if (pointSegDist2(e.x, e.y - e.hitY - e.z, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) < rr) { onHit(e); break; }
    }
  }
}

export function enemyBeam(w: World, x: number, y: number, ang: number, dur: number, warmup = 0.6, width = 8, rot = 0): Beam {
  const b = new Beam(null as unknown as AttackProfile);
  b.enemyBeam = true; b.x = x; b.y = y; b.ang = ang; b.dur = dur + warmup; b.warmup = warmup; b.width = width; b.rot = rot; b.followPlayer = false;
  w.beams.push(b);
  return b;
}

export function updateBeams(w: World, dt: number): void {
  for (let i = w.beams.length - 1; i >= 0; i--) {
    const b = w.beams[i];
    b.t += dt;
    if (b.enemyBeam) { updateEnemyBeam(w, b, dt); if (b.t >= b.dur) w.beams.splice(i, 1); continue; }
    const pl = w.player;
    if (b.followPlayer) { b.x = pl.x; b.y = pl.y - 11; }
    const prof = b.prof;
    // shot-movement modifiers bend the beam: wiggle sways it, spiral spins it, grow widens it
    if (!b.baseWidth) b.baseWidth = b.width;
    if (!b.laser) {
      if (prof.spiral) b.sweep += dt * 3.2;
      if (prof.boomerang) b.sweep = Math.sin(b.t * 7) * 0.45;
      if (prof.grow) b.width = b.baseWidth * Math.min(2.4, 1 + prof.grow * b.t * 2.2);
    }
    const a = b.ang + b.offset + b.sweep + (prof.wiggle && !b.laser ? Math.sin(b.t * 14 + b.phase) * 0.12 * Math.min(2, prof.wiggle) : 0);
    b.pts = traceBeam(w, b.x + Math.cos(a) * 6, b.y + Math.sin(a) * 4, a, prof, b.laser ? Math.max(120, pl.stats.range * 1.3) : 900);
    const half = b.width / 2;
    const pathFx = () => alongBeam(b.pts, 10, (x, y) => {
      if (prof.magnet) w.cancelEnemyShotsNear(x, y, half + 6);
      if (prof.pull) w.pullPickups(x, y, 30);
      if (prof.shatter) { const [c, r] = w.room.cellAt(x, y); if (w.room.inGrid(c, r)) w.hitObstacle(c, r, b.dmg, true, x, y); }
    });
    if (b.laser) {
      if (b.t <= dt * 1.5) {
        beamHits(w, b, half, (e) => { if (!b.hitOnce.has(e.id)) { b.hitOnce.add(e.id); beamDamage(w, b, e, b.dmg); } });
        beamObstacles(w, b, b.dmg);
        pathFx();
        const ex = b.pts[b.pts.length - 2], ey = b.pts[b.pts.length - 1];
        if (prof.creep) w.addCreep(ex, ey, 8, 'player', b.dmg * 0.35, 1.8);
      }
    } else {
      b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = 0.055;
        beamHits(w, b, half, (e) => beamDamage(w, b, e, b.dmg));
        // obstacles along the path take damage too
        beamObstacles(w, b, b.dmg * 0.5);
        pathFx();
        const ex = b.pts[b.pts.length - 2], ey = b.pts[b.pts.length - 1];
        if (prof.explode > 0 && Math.random() < 0.25) w.explode(ex, ey, prof.explode, Math.max(4, b.dmg * 2), { friendly: true, small: true });
        if (prof.creep && Math.random() < 0.3) w.addCreep(ex, ey, 9, 'player', b.dmg * 0.6, 2);
        w.fx.spray(ex, ey, 6, b.ang + Math.PI, 1.5, 2, b.color, 80, 0.3);
      }
    }
    if (b.t >= b.dur) w.beams.splice(i, 1);
  }
}

/**
 * Fires, kegs, heaps and urns along a player beam take damage, once per cell per tick. The beam is
 * drawn at chest height, so the cells are sampled a little lower, where the obstacles stand.
 */
function beamObstacles(w: World, b: Beam, dmg: number): void {
  const seen = new Set<number>();
  alongBeam(b.pts, 6, (x, y) => {
    for (const oy of [4, 11]) {
      const [c, r] = w.room.cellAt(x, y + oy);
      if (!w.room.inGrid(c, r)) continue;
      const i = w.room.idx(c, r);
      if (seen.has(i)) continue;
      seen.add(i); w.damageObstacleAt(x, y + oy, dmg);
    }
  });
}

const RAINBOW = ['burn', 'slow', 'poison', 'fear', 'confuse'];

/** Damage from a player beam or laser. Every shot effect applies; continuous beams roll procs at a lower rate per tick. */
function beamDamage(w: World, b: Beam, e: Enemy, dmg: number): void {
  const prof = b.prof, luck = w.player.stats.luck;
  const tick = !b.laser;
  const crit = prof.crit > 0 && Math.random() < luckChance(prof.crit, luck) * (tick ? 0.3 : 1);
  const d = dmg * (crit ? 3 : 1);
  const status = prof.rainbow && Math.random() < (tick ? 0.12 : 1) ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : null;
  w.damageEnemy(e, d, { ang: b.ang, knock: (tick ? 0.25 : 1) * prof.knock * (crit ? 2 : 1), source: 'beam', prof, crit, status, procMul: tick ? 0.35 : 1 });
  if (prof.chain > 0 && Math.random() < luckChance(prof.chainChance * (tick ? 0.35 : 1), luck)) w.chainLightning(e, prof.chain, dmg * 1.5, prof);
  if (prof.explode > 0 && Math.random() < (tick ? 0.1 : 1)) w.explode(e.x, e.y, prof.explode, Math.max(4, d * (tick ? 2 : 1.4)), { friendly: true, small: true });
  if (prof.lifesteal > 0 && Math.random() < prof.lifesteal * 0.05 * (tick ? 0.15 : 1)) w.player.healRed(1, true);
  if (prof.creep && Math.random() < (tick ? 0.08 : 0.6)) w.addCreep(e.x, e.y, 8, 'player', dmg * 0.35, 1.8);
  if (prof.split > 0 && Math.random() < (tick ? 0.08 : 0.4)) {
    for (let k = 0; k < Math.min(4, prof.split); k++) w.proj.player(w, prof, e.x, e.y - 6, 8, Math.random() * TAU, w.player.stats.damage * 0.5, 220, 90, 0.7, 1);
  }
}

/** Walk a beam polyline in fixed steps. */
export function alongBeam(pts: number[], step: number, fn: (x: number, y: number) => void): void {
  for (let i = 0; i + 3 < pts.length; i += 2) {
    const x0 = pts[i], y0 = pts[i + 1], dx = pts[i + 2] - x0, dy = pts[i + 3] - y0;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) fn(x0 + (dx * k) / n, y0 + (dy * k) / n);
  }
}

function updateEnemyBeam(w: World, b: Beam, dt: number): void {
  b.ang += b.rot * dt;
  if (b.warmup > 0 && b.t < b.warmup) { b.pts = traceBeam(w, b.x, b.y, b.ang, null, 900, true); return; }
  b.pts = traceBeam(w, b.x, b.y, b.ang, null, 900, true);
  const pl = w.player;
  const c = pl.hurtCapsule(), half = b.width / 2 * 0.85 + c.r;
  hit: for (let i = 0; i + 3 < b.pts.length; i += 2) {
    for (let k = 0; k <= 4; k++) {
      if (pointSegDist2(c.x, c.y0 + (c.y1 - c.y0) * k / 4, b.pts[i], b.pts[i + 1], b.pts[i + 2], b.pts[i + 3]) < half * half) { w.hurtPlayer(1, 'beam'); break hit; }
    }
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
export interface Swing { t: number; dur: number; ang: number; arc: number; radius: number; big: boolean; centers: number[] }

export function meleeSwing(w: World, prof: AttackProfile, st: FinalStats, x: number, y: number, ang: number, charged: boolean): Swing {
  const radius = (26 + (st.size - 1) * 16) * (charged ? 1.35 : 1) + (prof.shots - 1) * 3;
  let arc = charged ? TAU : Math.min(TAU, (Math.PI * 0.7) + (prof.shots - 1) * 0.35);
  // rear / side shots become extra blades behind and beside
  const centers = [ang];
  if (prof.rear) centers.push(ang + Math.PI);
  if (prof.sides) centers.push(ang + Math.PI / 2, ang - Math.PI / 2);
  if (centers.length >= 3) arc = Math.max(arc, Math.PI * 0.9);
  const inArc = (a: number) => arc >= TAU - 0.01 || centers.some((c) => Math.abs(angleDiff(c, a)) <= arc / 2 + 0.2);
  const luck = st.luck;
  const dmg = st.damage * (charged ? 4 : 2.2);
  const hitSet = new Set<number>();
  let shards = 0;
  for (const e of w.enemies) {
    if (e.dead || e.hidden || e.spawnT > 0 || e.friendly) continue;
    const dx = e.x - x, dy = e.y - e.hitY - e.z - y;
    const d = Math.hypot(dx, dy);
    if (d > radius + e.r) continue;
    if (!inArc(Math.atan2(dy, dx))) continue;
    hitSet.add(e.id);
    const crit = prof.crit > 0 && Math.random() < luckChance(prof.crit, luck);
    const status = prof.rainbow ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : null;
    w.damageEnemy(e, dmg * (crit ? 3 : 1), { ang: Math.atan2(dy, dx), knock: 2.2 * prof.knock * (crit ? 1.5 : 1), source: 'melee', prof, crit, status });
    if (prof.explode > 0) w.explode(e.x, e.y, prof.explode, dmg * 0.8, { friendly: true, small: true });
    if (prof.chain > 0 && Math.random() < prof.chainChance + 0.2) w.chainLightning(e, prof.chain, dmg * 0.5, prof);
    if (prof.lifesteal > 0 && Math.random() < prof.lifesteal * 0.08) w.player.healRed(1, true);
    if (prof.creep) w.addCreep(e.x, e.y, 9, 'player', st.damage * 0.5, 2);
    if (prof.split > 0 && shards < 2) {
      shards++;
      for (let k = 0; k < Math.min(4, prof.split); k++) w.proj.player(w, prof, e.x, e.y - 6, 8, Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.6, st.damage * 0.6, 220, 100, 0.7, 1);
    }
  }
  if (prof.pull) w.pullPickups(x, y, radius * 1.6);
  // swat enemy projectiles out of the air
  for (const p of w.proj.list) {
    if (!p.active || p.team !== Team.Enemy) continue;
    const dx = p.x - x, dy = p.y - y; const d = Math.hypot(dx, dy);
    if (d > radius + 4 + (prof.magnet ? 14 : 0)) continue;
    if (!inArc(Math.atan2(dy, dx))) continue;
    w.fx.sparks(p.x, p.y - p.z, 4, '#ffe0a0', 90);
    w.proj.kill(p);
  }
  // obstacles in reach
  for (const c0 of centers) for (let k = 0; k < 5; k++) {
    const a = c0 + (k / 4 - 0.5) * Math.min(arc, Math.PI);
    const ox = x + Math.cos(a) * radius * 0.8, oy = y + Math.sin(a) * radius * 0.8 + 6;
    if (prof.shatter) { const [c, r] = w.room.cellAt(ox, oy); if (w.room.inGrid(c, r)) w.hitObstacle(c, r, dmg * 0.5, true, ox, oy); }
    else w.damageObstacleAt(ox, oy, dmg * 0.5);
  }
  // charged swing throws a wave carrying the full profile
  if (charged) volley(w, prof, st, x, y + 6, 10, ang, { dmgMul: 1.5, sizeMul: 1.4 });
  return { t: 0, dur: charged ? 0.3 : 0.16, ang, arc, radius, big: charged, centers };
}
