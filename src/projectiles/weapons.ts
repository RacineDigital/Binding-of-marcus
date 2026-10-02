// Attack delivery: volleys, charge shots, bursts, beams, lasers and melee swings.
// Everything reads the same AttackProfile so modifiers carry across attack modes.
import type { World } from '../game/world';
import { snap } from '../render/snap';
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
/**
 * How much your shot size widens a beam or laser (its hitbox as well as how it looks), the same for
 * every one you fire: charged beams, lasers, the beams and lasers familiars copy, the Candle of Wrath.
 */
export function beamScale(size: number): number { return Math.max(0.6, Math.min(3, size)); }
/** Lasers are thin, so size widens them a little faster than beams. */
export function laserScale(size: number): number { return beamScale(size) ** 1.5; }

/**
 * Laser items feed each other. Every one past the first overcharges all your lasers and beams a tier:
 * hotter colour, more damage, wider; tier 1 adds a twin ray, tier 2 sets things alight, tier 3 throws
 * a giant ray every fifth pull.
 */
export const LASER_TIERS: { name: string; color: string | null; perk: string }[] = [
  { name: '', color: null, perk: '' },
  { name: 'Overcharged', color: '#ffa040', perk: 'twin rays, damage +20%' },
  { name: 'Searing', color: '#fff0a0', perk: 'lasers set enemies alight, damage +40%' },
  { name: 'White-hot', color: '#d8f4ff', perk: 'a giant ray every fifth pull, damage +60%' },
];
export function overcharge(prof: AttackProfile | null): number { return prof ? Math.max(0, Math.min(3, prof.lasers - 1)) : 0; }
/** Damage and width multipliers from overcharge. */
export function overchargeMul(prof: AttackProfile | null): { dmg: number; width: number } { const o = overcharge(prof); return { dmg: 1 + 0.2 * o, width: 1 + 0.25 * o }; }
/** A laser's colour: your tint if you have one, else the overcharge tier's, else the base colour. */
export function laserColor(prof: AttackProfile | null, base: string, w?: World): string {
  if (prof?.rainbow && w) return `hsl(${Math.floor((w.time * 240) % 360)},95%,65%)`;
  return prof?.tint ?? LASER_TIERS[overcharge(prof)].color ?? base;
}

/** A laser that starts somewhere other than your hands (a refraction, an arc, a bomb, a boomerang). */
export function childLaser(w: World, prof: AttackProfile, x: number, y: number, ang: number, dmg: number, width: number, maxLen: number, color: string, status: string | null = null): Beam {
  const b = new Beam(prof);
  b.laser = true; b.child = true; b.followPlayer = false; b.x = x; b.y = y; b.ang = ang; b.dur = 0.14;
  b.dmg = dmg; b.width = width; b.maxLen = maxLen; b.color = color; b.status = status;
  w.beams.push(b);
  return b;
}

export class Beam {
  active = true; t = 0; dur = 0.5; ang = 0; width = 7; dmg = 1; tick = 0; prof: AttackProfile; offset = 0;
  pts: number[] = []; followPlayer = true; x = 0; y = 0; laser = false; hitOnce = new Set<number>(); color = '#6a58ff';
  enemyBeam = false; warmup = 0; rot = 0; baseWidth = 0; phase = Math.random() * TAU; sweep = 0;
  /** What a homing beam is locked onto. */
  target: Enemy | null = null;
  /** Spawned off another laser: doesn't refract, arc or return again. */
  child = false; maxLen = 0; status: string | null = null;
  /** Each ray throws one Arc Lamp chain, from the first enemy it hits. */
  arced = false;
  /** Wiggle makes a laser linger and lash side to side; a searchlight sweeps this far each way. */
  lash = 0; sweepSpan = 0;
  constructor(prof: AttackProfile) { this.prof = prof; }
}

/**
 * The enemy a homing beam locks onto: the one nearest the line you're aiming along (inside a
 * forward cone that widens with homing strength), preferring the current target so a held beam
 * doesn't flicker between enemies.
 */
export function homingTarget(w: World, x: number, y: number, ang: number, homing: number, maxLen: number, keep: Enemy | null = null): Enemy | null {
  const cone = Math.min(Math.PI * 0.6, 0.7 + homing * 0.5);
  let best: Enemy | null = null, bestScore = Infinity;
  for (const e of w.enemies) {
    if (e.dead || e.hidden || e.spawnT > 0 || e.friendly || e.invuln) continue;
    const tx = e.x, ty = e.y - e.hitY - e.z;
    const d = Math.hypot(tx - x, ty - y);
    if (d > maxLen * 0.9 || d < 4) continue;
    const off = Math.abs(angleDiff(ang, Math.atan2(ty - y, tx - x)));
    if (off > cone) continue;
    const score = d * (1 + off * 2.2) * (e === keep ? 0.6 : 1);
    if (score < bestScore) { bestScore = score; best = e; }
  }
  return best;
}

/**
 * Trace a beam path from (x,y) along ang with bounces. With homing and a target, the beam bends in
 * a smooth curve that ends exactly on the target's body (so a homing laser never misses), then
 * carries on straight past it.
 */
export function traceBeam(w: World, x: number, y: number, ang: number, prof: AttackProfile | null, maxLen = 900, spectral = true, target: Enemy | null = null): number[] {
  const pts = [x, y];
  let a = ang, cx = x, cy = y, len = 0;
  let bounces = prof?.bounce ?? 0;
  const step = 4;
  const mode = spectral ? 'ghost' : 'shot';
  if (target && !target.dead && (prof?.homing ?? 0) > 0) {
    const tx = target.x, ty = target.y - target.hitY - target.z;
    const d = Math.hypot(tx - x, ty - y);
    // quadratic curve: leaves the barrel along the aim, arrives on the target
    const k = Math.min(d * 0.45, 70), qx = x + Math.cos(ang) * k, qy = y + Math.sin(ang) * k;
    const n = Math.max(4, Math.ceil(d / 10));
    let px = x, py = y;
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      const nx = u * u * x + 2 * u * t * qx + t * t * tx, ny = u * u * y + 2 * u * t * qy + t * t * ty;
      if (!spectral && pointBlocked(w.room, nx, ny, mode)) { pts.push(px, py); return pts; }
      pts.push(nx, ny); px = nx; py = ny;
    }
    // carry on past the target in the direction the curve was heading
    a = Math.atan2(ty - qy, tx - qx); cx = tx; cy = ty; len = d;
  }
  while (len < maxLen) {
    const nx = cx + Math.cos(a) * step, ny = cy + Math.sin(a) * step;
    const blocked = pointBlocked(w.room, nx, ny, mode);
    if (blocked) {
      if (bounces > 0) {
        bounces--;
        const bx = pointBlocked(w.room, nx, cy, mode), by = pointBlocked(w.room, cx, ny, mode);
        if (bx || !by) a = Math.PI - a;
        if (by || !bx) a = -a;
        pts.push(cx, cy);
        continue;
      }
      pts.push(cx, cy);
      return pts;
    }
    cx = nx; cy = ny; len += step;
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
    if (b.followPlayer) { b.x = pl.x; b.y = b.prof.short ? pl.chestY() : pl.y - 11; }
    const prof = b.prof;
    // shot-movement modifiers bend the beam: wiggle sways it, spiral spins it, grow widens it
    if (!b.baseWidth) b.baseWidth = b.width;
    if (!b.laser) {
      if (prof.spiral) b.sweep += dt * 3.2;
      if (prof.boomerang) b.sweep = Math.sin(b.t * 7) * 0.45;
      if (prof.grow) b.width = b.baseWidth * Math.min(2.4, 1 + prof.grow * b.t * 2.2);
    }
    if (b.sweepSpan) b.sweep = -b.sweepSpan + 2 * b.sweepSpan * Math.min(1, b.t / b.dur);
    if (b.lash) b.sweep = Math.sin(b.t * 30 + b.phase) * b.lash;
    const a = b.ang + b.offset + b.sweep + (prof.wiggle && !b.laser ? Math.sin(b.t * 14 + b.phase) * 0.12 * Math.min(2, prof.wiggle) : 0);
    const lead = b.child ? 0 : 1;
    const ox = b.x + Math.cos(a) * (prof.short ? 2 : 6) * lead, oy = b.y + Math.sin(a) * (prof.short ? 1 : 4) * lead;
    const maxLen = b.maxLen || (b.laser ? Math.max(120, pl.stats.range * 1.3) : prof.short ? Math.max(64, pl.stats.range * 0.45) : 900);
    // homing: lock onto the enemy nearest the aim (lasers once, when they fire; beams keep their target)
    if (prof.homing > 0 && !b.child && (!b.laser || b.t <= dt * 1.5)) { b.target = homingTarget(w, ox, oy, a, prof.homing, maxLen, b.target && !b.target.dead ? b.target : null); }
    b.pts = traceBeam(w, ox, oy, a, prof, maxLen, true, b.target);
    const half = b.width / 2;
    const pathFx = () => alongBeam(b.pts, 10, (x, y) => {
      if (prof.magnet) w.cancelEnemyShotsNear(x, y, half + 6);
      if (prof.pull) w.pullPickups(x, y, 30);
      if (prof.shatter) { const [c, r] = w.room.cellAt(x, y); if (w.room.inGrid(c, r)) w.hitObstacle(c, r, b.dmg, true, x, y); }
    });
    if (b.laser) {
      const first = b.t <= dt * 1.5;
      // a lashing laser keeps cutting as it sweeps, but still hits each enemy only once
      if (first || b.lash) {
        beamHits(w, b, half, (e) => { if (!b.hitOnce.has(e.id)) { b.hitOnce.add(e.id); beamDamage(w, b, e, b.dmg); } });
        if (first) { beamObstacles(w, b, b.dmg); pathFx(); }
      }
      if (first) {
        const ex = b.pts[b.pts.length - 2], ey = b.pts[b.pts.length - 1];
        if (prof.creep) w.addCreep(ex, ey, 8, 'player', b.dmg * 0.35, 1.8);
        if (!b.child) laserLanding(w, b, ex, ey, a, maxLen);
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
  // Rocket Nib and friends: a laser hits harder the further it has reached
  if (b.laser && prof.accel > 0 && b.pts.length >= 2) dmg *= 1 + Math.min(1, prof.accel * 0.4) * Math.min(1, Math.hypot(e.x - b.pts[0], e.y - b.pts[1]) / 200);
  // the Jeweller's Loupe: whatever you keep burning heats up, up to nearly double damage
  if (prof.focus > 0) {
    const fresh = (e.data.heatT ?? -9) > w.time - 0.6;
    e.data.heat = Math.min(1, (fresh ? e.data.heat ?? 0 : 0) + (tick ? 0.04 : 0.15) * prof.focus); e.data.heatT = w.time;
    dmg *= 1 + e.data.heat * 0.9;
    if (e.data.heat > 0.6 && Math.random() < 0.3) w.fx.sparks(e.x, e.y - e.hitY, 2, '#ffb060', 60);
  }
  const d = dmg * (crit ? 3 : 1);
  let status = b.status ?? (prof.rainbow && Math.random() < (tick ? 0.12 : 1) ? RAINBOW[Math.floor(Math.random() * RAINBOW.length)] : null);
  // overcharged to Searing and past: lasers set things alight
  if (!status && overcharge(prof) >= 2 && Math.random() < (tick ? 0.1 : 0.35)) status = 'burn';
  w.damageEnemy(e, d, { ang: b.ang, knock: (tick ? 0.25 : 1) * prof.knock * (crit ? 2 : 1), source: 'beam', prof, crit, status, procMul: tick ? 0.35 : 1 });
  if (prof.chain > 0 && Math.random() < luckChance(prof.chainChance * (tick ? 0.35 : 1), luck)) w.chainLightning(e, prof.chain, dmg * 1.5, prof);
  if (prof.explode > 0 && Math.random() < (tick ? 0.1 : b.child ? 0.3 : 1)) w.explode(e.x, e.y, prof.explode, Math.max(4, d * (tick ? 2 : 1.4)), { friendly: true, small: true });
  if (prof.lifesteal > 0 && Math.random() < prof.lifesteal * 0.05 * (tick ? 0.15 : 1)) w.player.healRed(1, true);
  if (prof.creep && Math.random() < (tick ? 0.08 : 0.6)) w.addCreep(e.x, e.y, 8, 'player', dmg * 0.35, 1.8);
  // the Arc Lamp: a laser hit leaps on to the nearest enemies it hasn't touched
  if (b.laser && prof.laserArc > 0 && !b.child && !b.arced) { b.arced = true; arcFrom(w, b, e, prof.laserArc, dmg * 0.6); }
  if (prof.split > 0 && !b.laser && Math.random() < (tick ? 0.08 : 0.4)) {
    for (let k = 0; k < Math.min(4, prof.split); k++) w.proj.player(w, prof, e.x, e.y - 6, 8, Math.random() * TAU, w.player.stats.damage * 0.5, 220, 90, 0.7, 1);
  }
}

/**
 * Where a laser lands, the items you carry play out: Powder Ink blows the spot up, Prism and the splits
 * refract it into smaller rays, a boomerang sends it back, fire scorches its whole path.
 */
function laserLanding(w: World, b: Beam, ex: number, ey: number, a: number, maxLen: number): void {
  const prof = b.prof, len = Math.hypot(ex - b.pts[0], ey - b.pts[1]);
  const wall = len < maxLen - 8;
  if (prof.explode > 0 && wall) w.explode(ex, ey, prof.explode * 0.8, Math.max(4, b.dmg * 1.2), { friendly: true, small: true });
  // refraction: split items break a landing laser into a fan of smaller rays
  if (prof.split > 0) {
    const n = Math.min(4, prof.split), back = wall ? a + Math.PI : a;
    for (let k = 0; k < n; k++) {
      const da = (k - (n - 1) / 2) * (wall ? 0.55 : 0.4);
      childLaser(w, prof, ex - Math.cos(a) * 3, ey - Math.sin(a) * 3, back + da, b.dmg * 0.45, Math.max(1, b.width * 0.6), 90, b.color);
    }
  }
  // boomerang: the laser comes back to you a beat later and cuts through everything again
  if (prof.boomerang) w.after(0.1, () => {
    const pl = w.player;
    childLaser(w, prof, ex, ey, Math.atan2(pl.y - 11 - ey, pl.x - ex), b.dmg * 0.7, b.width, Math.hypot(pl.x - ex, pl.y - 11 - ey), b.color);
  });
  // fire: a laser that can burn leaves a scorched line of embers behind it
  if (prof.burn > 0) alongBeam(b.pts, 34, (x, y) => { if (Math.random() < Math.min(0.7, prof.burn * 1.6)) w.addCreep(x, y + 10, 7, 'player', Math.max(2, b.dmg * 0.3), 1.4, '#c8501a'); });
}

/** One arc of the Arc Lamp: hop from enemy to enemy with thin blue rays. */
function arcFrom(w: World, b: Beam, from: Enemy, jumps: number, dmg: number): void {
  let cur = from;
  const seen = new Set<number>(b.hitOnce); seen.add(from.id);
  for (let j = 0; j < jumps; j++) {
    let best: Enemy | null = null, bd = 110 * 110;
    for (const e of w.enemies) {
      if (e.dead || e.friendly || e.hidden || e.spawnT > 0 || seen.has(e.id)) continue;
      const d2 = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
      if (d2 < bd) { bd = d2; best = e; }
    }
    if (!best) return;
    seen.add(best.id); b.hitOnce.add(best.id);
    const x = cur.x, y = cur.y - cur.hitY, tx = best.x, ty = best.y - best.hitY;
    childLaser(w, b.prof, x, y, Math.atan2(ty - y, tx - x), dmg, 1.5, Math.hypot(tx - x, ty - y) + 6, '#a0e8ff');
    cur = best;
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
    if (!b.enemyBeam && b.prof?.short) { renderInkBeam(w, ctx, b, camX, camY); continue; }
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
    if (!warm && !(b.prof?.short && !b.enemyBeam)) for (let i = 0; i < pts.length; i += 2) w.r.addGlow(pts[i] - camX, pts[i + 1] - camY, 18 + b.width, b.enemyBeam ? '#ff3050' : b.color, 0.35);
    if (!warm) { w.r.addLight(pts[0] - camX, pts[1] - camY, 50, 0.6); w.r.addLight(pts[pts.length - 2] - camX, pts[pts.length - 1] - camY, 40, 0.6); }
  }
}
/**
 * The Blot's beam: not light but a gush of ink. A ragged black column with a violet heart, edges that
 * bulge and churn as it pours, droplets flung off the sides and a splash where it lands.
 */
function renderInkBeam(w: World, ctx: CanvasRenderingContext2D, b: Beam, camX: number, camY: number): void {
  const pts = b.pts, t = b.t;
  // swells open, holds, then chokes off
  const env = Math.min(1, t / 0.08) * Math.min(1, (b.dur - t) / 0.16);
  const W = b.width * 1.35 * env;
  if (W <= 0.3) return;
  const x0 = pts[0] - camX, y0 = pts[1] - camY, x1 = pts[pts.length - 2] - camX, y1 = pts[pts.length - 1] - camY;
  const len = Math.hypot(x1 - x0, y1 - y0) || 1, ux = (x1 - x0) / len, uy = (y1 - y0) / len, nx = -uy, ny = ux;
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const stroke = (lw: number, c: string) => { ctx.strokeStyle = c; ctx.lineWidth = Math.max(1, lw); ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] - camX, pts[i + 1] - camY); ctx.stroke(); };
  stroke(W + 5, 'rgba(8,4,20,0.55)');
  stroke(W + 1, '#0c0818');
  // churning bulges along the column
  for (let d = 0; d < len; d += 4) {
    const wob = Math.sin(d * 0.35 - t * 38) * 0.5 + Math.sin(d * 0.13 + t * 21) * 0.5;
    const r = W * (0.45 + 0.22 * wob);
    const px = x0 + ux * d + nx * wob * W * 0.18, py = y0 + uy * d + ny * wob * W * 0.18;
    ctx.fillStyle = (d / 4) % 3 === 0 ? '#1a1236' : '#0a0616';
    ctx.beginPath(); ctx.arc(px, py, Math.max(0.8, r), 0, Math.PI * 2); ctx.fill();
  }
  // a violet heart running down the middle, flickering
  stroke(W * 0.42, '#2a1f5a');
  stroke(Math.max(1, W * 0.12), Math.floor(t * 30) % 2 ? '#6a5ad8' : '#4a3aa8');
  // streaks of ink rushing down the beam
  for (let i = 0; i < 6; i++) {
    const k = ((t * 3.2 + i / 6) % 1) * len, off = Math.sin(i * 2.7) * W * 0.3;
    ctx.fillStyle = '#4a3a9a'; ctx.fillRect(snap(x0 + ux * k + nx * off), snap(y0 + uy * k + ny * off), 2, 1);
  }
  // droplets flung off the sides
  for (let i = 0; i < 14; i++) {
    const ph = (t * 2.6 + i * 0.137) % 1, d = ((i * 37) % 100) / 100 * len, side = i % 2 ? 1 : -1;
    const out = W * 0.5 + ph * 14, fall = ph * ph * 6;
    ctx.globalAlpha = 1 - ph; ctx.fillStyle = i % 3 ? '#14102a' : '#3a2a7a';
    const s = i % 4 === 0 ? 2 : 1;
    ctx.fillRect(snap(x0 + ux * d + nx * side * out), snap(y0 + uy * d + ny * side * out + fall), s, s);
  }
  ctx.globalAlpha = 1;
  // the splash where it lands
  for (let i = 0; i < 9; i++) {
    const a = Math.atan2(-uy, -ux) + (i - 4) * 0.35, k = (t * 4 + i * 0.21) % 1, r = 3 + k * 10;
    ctx.globalAlpha = 1 - k; ctx.fillStyle = i % 2 ? '#14102a' : '#2a1f5a';
    ctx.fillRect(snap(x1 + Math.cos(a) * r), snap(y1 + Math.sin(a) * r + k * k * 4), 2, 2);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#0a0616'; ctx.beginPath(); ctx.ellipse(x1, y1, W * 0.7, W * 0.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  w.r.addGlow(x0, y0, 18, '#6a4aff', 0.18); w.r.addGlow((x0 + x1) / 2, (y0 + y1) / 2, 22, '#3a1a98', 0.08);
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
  // a swing that connects lands with weight: a beat of hit pause, a thump, a jolt (more for a full spin)
  if (hitSet.size) {
    w.hitstop(charged ? 0.07 : 0.035);
    w.shake(charged ? 3 : 1.2);
    w.audio.play('thud', { x, vol: charged ? 0.6 : 0.4, pitch: charged ? 0.8 : 1.1 });
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
