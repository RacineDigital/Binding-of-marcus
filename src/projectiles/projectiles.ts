// Pooled projectile simulation. Player shots read behaviour from an AttackProfile so every modifier
// composes with every other; enemy shots use a small set of scripted motions.
import { resetInterp } from '../game/interp';
import { TAU, angleDiff, clamp, dist2 } from '../core/math';
import { AttackProfile, luckChance } from './profile';
import { pointBlocked } from '../rooms/collide';
import { TILE } from '../core/constants';
import { shotSprite, GLOW_SHAPES, SHOT_COLORS } from './art';
import type { World } from '../game/world';
import type { Enemy } from '../enemies/enemy';

export const enum Team { Player = 0, Enemy = 1 }

export class Proj {
  active = false; team = Team.Player;
  x = 0; y = 0; z = 0; vx = 0; vy = 0; spd = 0; r = 3; baseR = 3; dmg = 1;
  dist = 0; range = 200; t = 0; life = 0;
  prof: AttackProfile | null = null; depth = 0;
  hits: number[] = [];
  pierce = 0; bounce = 0;
  homing = 0; target: Enemy | null = null; retarget = 0;
  bx = 0; by = 0; wig = 0; phase = 0;
  orbit = false; orbA = 0; orbR = 0; orbRT = 0;
  back = false; falling = 0;
  curve = 0; accel = 0; delay = 0; lob = false; lobH = 0; creep = '';
  splitE = 0; splitSpd = 0;
  shape = 'ink'; tint: string | null = null;
  knock = 1; crit = false; fromFamiliar = false; spectral = false;
  creepAcc = 0; statusFixed: string | null = null; gravityWell = false;
  aimAtPlayerAfterDelay = false; ownerId = 0; noWall = false; drop = 0;
}

const MAX_PROJ = 1400;

export class Projectiles {
  list: Proj[] = [];
  private free: Proj[] = [];
  explosionsThisFrame = 0;
  /** Enemy shot speed multiplier (gentler on early chapters). */
  enemySpeedMul = 1;
  /** Seconds left in which enemies may not fire (set when entering a room). */
  enemyGrace = 0;
  constructor() { for (let i = 0; i < MAX_PROJ; i++) { const p = new Proj(); this.list.push(p); this.free.push(p); } }
  count(): number { return MAX_PROJ - this.free.length; }
  clear(): void { for (const p of this.list) if (p.active) this.kill(p); }
  alloc(): Proj | null {
    const p = this.free.pop();
    if (!p) return null;
    resetInterp(p); p.active = true; p.hits.length = 0; p.t = 0; p.dist = 0; p.z = 0; p.target = null; p.retarget = 0; p.orbit = false; p.back = false;
    p.falling = 0; p.curve = 0; p.accel = 0; p.delay = 0; p.lob = false; p.creep = ''; p.splitE = 0; p.wig = 0; p.phase = 0;
    p.homing = 0; p.pierce = 0; p.bounce = 0; p.prof = null; p.depth = 0; p.crit = false; p.fromFamiliar = false; p.spectral = false;
    p.knock = 1; p.tint = null; p.creepAcc = 0; p.drop = 0; p.statusFixed = null; p.aimAtPlayerAfterDelay = false; p.life = 0; p.noWall = false; p.gravityWell = false;
    return p;
  }
  kill(p: Proj): void { if (!p.active) return; p.active = false; this.free.push(p); }

  /** Spawn a single player projectile from a profile. */
  player(w: World, prof: AttackProfile, x: number, y: number, z: number, ang: number, dmg: number, spd: number, range: number, size: number, depth = 0, fam = false): Proj | null {
    const p = this.alloc(); if (!p) return null;
    p.team = Team.Player; p.prof = prof; p.depth = depth; p.fromFamiliar = fam;
    p.x = x; p.y = y; p.z = z; p.bx = x; p.by = y;
    p.spd = spd; p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd;
    p.range = range; p.dmg = dmg;
    p.baseR = p.r = clamp(3 * size * (0.85 + Math.min(0.6, dmg / 20)), 1.5, 16);
    p.pierce = prof.pierce; p.bounce = prof.bounce; p.homing = prof.homing; p.spectral = prof.spectral || prof.arc;
    p.wig = prof.wiggle; p.phase = Math.random() * TAU;
    p.shape = prof.rainbow ? ['fire', 'spark', 'spore', 'dark', 'star'][Math.floor(Math.random() * 5)] : prof.shape;
    p.tint = prof.tint; p.knock = prof.knock;
    if (prof.rainbow) p.statusFixed = ['burn', 'slow', 'poison', 'fear', 'confuse'][Math.floor(Math.random() * 5)];
    p.crit = prof.crit > 0 && Math.random() < luckChance(prof.crit, w.player.stats.luck);
    if (p.crit) { p.r *= 1.35; }
    if (prof.orbit && depth === 0) {
      p.orbit = true; p.orbA = ang; p.orbR = 10; p.orbRT = 26 + p.r * 3.2 + (size - 1) * 14;
      p.life = (range / spd) * 1.8 + 0.6;
    }
    if (prof.arc) { p.lob = true; p.lobH = 26; }
    return p;
  }

  /** Spawn an enemy projectile. */
  enemy(x: number, y: number, ang: number, spd: number, o: Partial<{ drop: number; r: number; dmg: number; range: number; shape: string; curve: number; accel: number; delay: number; lob: boolean; lobH: number; creep: string; homing: number; bounce: number; wig: number; split: number; splitSpd: number; z: number; spectral: boolean; aimAfterDelay: boolean; life: number }> = {}): Proj | null {
    if (this.enemyGrace > 0) return null;
    const p = this.alloc(); if (!p) return null;
    spd *= this.enemySpeedMul;
    p.team = Team.Enemy;
    p.x = x; p.y = y; p.bx = x; p.by = y; p.z = o.z ?? 8;
    p.spd = spd; p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd;
    p.r = p.baseR = o.r ?? 3.5; p.dmg = o.dmg ?? 1; p.range = o.range ?? 420; p.shape = o.shape ?? 'bile';
    p.curve = o.curve ?? 0; p.accel = o.accel ?? 0; p.delay = o.delay ?? 0; p.lob = !!o.lob; p.lobH = o.lobH ?? 36;
    p.creep = o.creep ?? ''; p.homing = o.homing ?? 0; p.bounce = o.bounce ?? 0; p.wig = o.wig ?? 0; p.splitE = o.split ?? 0;
    p.splitSpd = o.splitSpd ?? 110; p.spectral = !!o.spectral || p.lob; if (o.drop) { p.drop = o.drop; p.z = o.drop; } p.aimAtPlayerAfterDelay = !!o.aimAfterDelay; p.life = o.life ?? 0;
    return p;
  }

  update(w: World, dt: number): void {
    this.explosionsThisFrame = 0;
    const room = w.room;
    const pl = w.player;
    for (const p of this.list) {
      if (!p.active) continue;
      p.t += dt;
      if (p.delay > 0) {
        p.delay -= dt;
        if (p.delay <= 0 && p.aimAtPlayerAfterDelay) {
          const a = Math.atan2(pl.y - p.y, pl.x - p.x); p.vx = Math.cos(a) * p.spd; p.vy = Math.sin(a) * p.spd;
        }
        continue;
      }
      if (p.drop > 0) {
        p.z -= 240 * dt;
        if (p.z <= 0) { p.z = 0; p.lob = true; p.r = Math.max(p.r, 7); this.collideActors(w, p); if (p.active) this.expire(w, p, true); }
        continue;
      }
      // ------------------------------------------------ falling at end of range
      if (p.falling > 0) {
        p.falling -= dt; p.z -= 160 * dt;
        p.x += p.vx * dt * 0.6; p.y += p.vy * dt * 0.6;
        if (p.z <= 0 || p.falling <= 0) { this.expire(w, p, true); continue; }
        this.collideActors(w, p);
        continue;
      }
      // ------------------------------------------------ motion
      const prof = p.prof;
      if (p.orbit) {
        p.orbR += (p.orbRT - p.orbR) * Math.min(1, dt * 8);
        p.orbA += (p.spd / Math.max(12, p.orbR)) * dt * 0.9;
        p.x = pl.x + Math.cos(p.orbA) * p.orbR; p.y = pl.y - 4 + Math.sin(p.orbA) * p.orbR * 0.85;
        p.life -= dt;
        if (p.homing > 0 && p.t > 0.25) {
          const e = w.nearestEnemy(p.x, p.y, 70);
          if (e) { p.orbit = false; const a = Math.atan2(e.y - p.y, e.x - p.x); p.vx = Math.cos(a) * p.spd; p.vy = Math.sin(a) * p.spd; p.bx = p.x; p.by = p.y; p.dist = 0; p.range *= 0.6; }
        }
        if (p.life <= 0) { this.expire(w, p, false); continue; }
        this.collideActors(w, p);
        continue;
      }
      if (p.homing > 0) {
        p.retarget -= dt;
        if (p.retarget <= 0 || (p.target && (p.target.dead || p.target.hidden))) {
          p.target = w.nearestEnemy(p.x, p.y, 220, p.hits); p.retarget = 0.12;
        }
        if (p.target) {
          // aim at the same point collision tests against, and turn harder up close so shots
          // don't circle a nearby target forever
          const tx = p.target.x, ty = p.target.y - p.target.hitY + p.z * 0.25;
          const cur = Math.atan2(p.vy, p.vx), want = Math.atan2(ty - p.y, tx - p.x);
          const near = Math.sqrt(dist2(p.x, p.y, tx, ty));
          const rate = p.homing * 5.5 * (1 + clamp((90 - near) / 25, 0, 4)) * dt;
          const turn = clamp(angleDiff(cur, want), -rate, rate);
          const na = cur + turn; p.vx = Math.cos(na) * p.spd; p.vy = Math.sin(na) * p.spd;
        }
      }
      if (prof?.spiral) {
        const cur = Math.atan2(p.vy, p.vx) + 3.4 * dt / (1 + p.t * 1.5);
        p.vx = Math.cos(cur) * p.spd; p.vy = Math.sin(cur) * p.spd;
      }
      if (p.curve) {
        const cur = Math.atan2(p.vy, p.vx) + p.curve * dt;
        p.vx = Math.cos(cur) * p.spd; p.vy = Math.sin(cur) * p.spd;
      }
      const acc = p.accel || (prof?.accel ?? 0);
      if (acc) { p.spd = Math.max(20, Math.min(900, p.spd * (1 + acc * dt))); const a = Math.atan2(p.vy, p.vx); p.vx = Math.cos(a) * p.spd; p.vy = Math.sin(a) * p.spd; }
      if (prof?.boomerang && !p.back && p.dist > p.range * 0.5) { p.back = true; p.pierce = 99; p.hits.length = 0; }
      if (p.back) {
        const a = Math.atan2(pl.y - 6 - p.y, pl.x - p.x), cur = Math.atan2(p.vy, p.vx);
        const na = cur + clamp(angleDiff(cur, a), -9 * dt, 9 * dt);
        p.vx = Math.cos(na) * p.spd; p.vy = Math.sin(na) * p.spd;
        if (dist2(p.x, p.y, pl.x, pl.y - 6) < 144) { this.kill(p); continue; }
      }
      const mx = p.vx * dt, my = p.vy * dt;
      p.bx += mx; p.by += my;
      p.dist += Math.sqrt(mx * mx + my * my);
      if (p.wig) {
        const l = p.spd || 1, nx = -p.vy / l, ny = p.vx / l;
        const off = Math.sin(p.dist * 0.075 + p.phase) * p.wig;
        p.x = p.bx + nx * off; p.y = p.by + ny * off;
      } else { p.x = p.bx; p.y = p.by; }
      if (prof && prof.grow) { const k = 1 + (prof.grow * p.dist) / 100; p.r = Math.min(22, p.baseR * k); }
      if (p.lob) p.z = 6 + Math.sin(Math.min(1, p.dist / p.range) * Math.PI) * p.lobH;
      if (p.creep || prof?.creep) {
        p.creepAcc += Math.sqrt(mx * mx + my * my);
        if (p.creepAcc > 22) { p.creepAcc = 0; if (p.team === Team.Player) w.addCreep(p.x, p.y, 8, 'player', p.dmg * 0.35, 1.8); }
      }
      if (prof?.magnet) w.cancelEnemyShotsNear(p.x, p.y, p.r + 6);
      if (p.team === Team.Player && prof && (prof.pull)) w.pullPickups(p.x, p.y, 40);
      // ------------------------------------------------ walls and obstacles
      if (!p.noWall) {
        const blockedWall = pointBlocked(room, p.x, p.y, 'ghost');
        let blocked = blockedWall;
        let cellHit: [number, number] | null = null;
        if (!blocked && !p.spectral) {
          const c = Math.floor((p.x - room.ox) / TILE), r = Math.floor((p.y - room.oy) / TILE);
          if (w.obstacleBlocksShot(c, r)) { blocked = true; cellHit = [c, r]; }
        }
        if (blocked && !(p.lob && !blockedWall)) {
          if (cellHit && p.team === Team.Player) w.hitObstacle(cellHit[0], cellHit[1], p.dmg, !!prof?.shatter, p.x, p.y);
          if (p.bounce > 0) {
            p.bounce--;
            // reflect: test axes separately
            const bx0 = p.bx - mx, by0 = p.by - my;
            const hitX = this.blockedAt(w, bx0 + mx, by0, p), hitY = this.blockedAt(w, bx0, by0 + my, p);
            if (hitX || (!hitX && !hitY)) p.vx = -p.vx;
            if (hitY || (!hitX && !hitY)) p.vy = -p.vy;
            p.bx = bx0; p.by = by0; p.x = p.bx; p.y = p.by;
            p.hits.length = 0;
            if (prof && prof.explode > 0) w.explode(p.x, p.y, prof.explode, Math.max(4, p.dmg * 1.4), { friendly: true, small: true });
            w.fx.burst(p.x, p.y, p.z, 3, SHOT_COLORS[p.shape] ?? '#fff', 40, 0.25);
            continue;
          }
          this.expire(w, p, false, true);
          continue;
        }
      }
      // ------------------------------------------------ actor collisions
      if (this.collideActors(w, p)) continue;
      // ------------------------------------------------ range
      if (p.range > 0 && p.dist >= p.range && !p.back) {
        if (p.lob) { this.expire(w, p, true); continue; }
        if (p.team === Team.Player && !prof?.boomerang) { p.falling = 0.14; continue; }
        if (p.team === Team.Enemy) { this.expire(w, p, true); continue; }
      }
      if (p.life > 0 && p.t > p.life) { this.expire(w, p, false); continue; }
    }
  }

  private blockedAt(w: World, x: number, y: number, p: Proj): boolean {
    if (pointBlocked(w.room, x, y, 'ghost')) return true;
    if (p.spectral) return false;
    return w.obstacleBlocksShot(Math.floor((x - w.room.ox) / TILE), Math.floor((y - w.room.oy) / TILE));
  }

  /** Returns true if the projectile was consumed. */
  private collideActors(w: World, p: Proj): boolean {
    if (p.team === Team.Enemy) {
      const pl = w.player;
      if ((p.lob || p.drop) && p.z > 16) return false;
      const rr = p.r + pl.hitR;
      if (dist2(p.x, p.y, pl.x, pl.y - 6) < rr * rr) {
        if (w.playerHitByShot(p)) { this.expire(w, p, false); return true; }
      }
      if (w.familiarBlocksShot(p)) { this.expire(w, p, false); return true; }
      return false;
    }
    for (const e of w.enemies) {
      if (e.dead || e.hidden || e.spawnT > 0 || e.friendly) continue;
      const rr = p.r + e.r;
      if (dist2(p.x, p.y - p.z * 0.25, e.x, e.y - e.hitY) > rr * rr) continue;
      if (p.hits.includes(e.id)) continue;
      this.hitEnemy(w, p, e);
      if (!p.active) return true;
      if (p.pierce > 0) { p.pierce--; p.hits.push(e.id); continue; }
      this.expire(w, p, false);
      return true;
    }
    return false;
  }

  hitEnemy(w: World, p: Proj, e: Enemy): void {
    const prof = p.prof;
    let dmg = p.dmg;
    if (prof && prof.grow) dmg *= p.r / p.baseR;
    if (p.crit) dmg *= 3;
    const ang = Math.atan2(p.vy, p.vx);
    w.damageEnemy(e, dmg, { ang, knock: p.knock * (p.crit ? 2 : 1), source: 'shot', crit: p.crit, prof, status: p.statusFixed });
    if (!prof) return;
    if (prof.chain > 0 && Math.random() < luckChance(prof.chainChance, w.player.stats.luck)) w.chainLightning(e, prof.chain, dmg * 0.6, prof);
    if (prof.explode > 0 && this.explosionsThisFrame < 14) { this.explosionsThisFrame++; w.explode(p.x, p.y, prof.explode, Math.max(4, dmg * 1.4), { friendly: true, small: true }); }
    if (prof.lifesteal > 0 && Math.random() < prof.lifesteal * 0.05) w.player.healRed(1, true);
    if (prof.split > 0 && prof.splitOnHit && p.depth === 0) this.split(w, p, e.id);
  }

  split(w: World, p: Proj, avoidId = -1): void {
    const prof = p.prof!;
    const n = Math.min(8, prof.split);
    const base = Math.atan2(p.vy, p.vx);
    const arc = n >= 4 ? TAU : Math.PI * 0.75;
    for (let i = 0; i < n; i++) {
      const a = n >= 4 ? base + (i / n) * arc + Math.PI / n : base + (n === 1 ? Math.PI / 2 : (i / (n - 1) - 0.5) * arc);
      const c = this.player(w, prof, p.x, p.y, Math.max(4, p.z), a, p.dmg * 0.5, p.spd * 0.9, Math.max(60, p.range * 0.45), Math.max(0.5, (p.baseR / 3) * 0.7), p.depth + 1, p.fromFamiliar);
      if (c && avoidId >= 0) c.hits.push(avoidId);
      if (c) c.orbit = false;
    }
  }

  /** End of life: splash, split, explode. */
  expire(w: World, p: Proj, landed: boolean, wall = false): void {
    const prof = p.prof;
    const col = p.tint ?? SHOT_COLORS[p.shape] ?? '#343a9a';
    if (p.team === Team.Player) {
      w.fx.spray(p.x, p.y, Math.max(0, p.z), Math.atan2(-p.vy, -p.vx), wall ? 2.2 : TAU, Math.min(8, 3 + Math.floor(p.r * 0.6)), col, 50 + p.r * 6, 0.3, landed && Math.random() < 0.3 ? col : null);
      if ((landed || wall) && Math.random() < 0.35) w.decalSplat(p.x, p.y, col, Math.min(5, p.r * 0.7));
      w.audio.play('splat', { vol: 0.25, pitch: 1.2 - p.r * 0.02, x: p.x });
      if (prof) {
        if (prof.split > 0 && prof.splitOnExpire && p.depth === 0) this.split(w, p);
        if (prof.explode > 0 && (landed || prof.arc) && this.explosionsThisFrame < 14) { this.explosionsThisFrame++; w.explode(p.x, p.y, prof.explode * 1.1, Math.max(5, p.dmg * 1.6), { friendly: true, small: true }); }
      }
    } else {
      w.fx.spray(p.x, p.y, Math.max(0, p.z), 0, TAU, 4, col, 50, 0.3);
      if (p.lob) {
        w.fx.ring(p.x, p.y, 2, 12, col, 0.25, false);
        if (p.creep) w.addCreep(p.x, p.y, 14, 'enemy', 1, 4, p.creep);
        w.audio.play('splat', { vol: 0.2, pitch: 0.8, x: p.x });
      }
      if (p.splitE > 0) {
        for (let i = 0; i < p.splitE; i++) {
          const a = (i / p.splitE) * TAU + Math.random() * 0.3;
          this.enemy(p.x, p.y, a, p.splitSpd, { r: Math.max(2.5, p.r * 0.7), shape: p.shape, range: 180 });
        }
      }
    }
    this.kill(p);
  }

  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, w: World): void {
    // shadows first
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (const p of this.list) {
      if (!p.active || p.delay > 0 && p.team === Team.Player) continue;
      const sx = Math.round(p.x - camX), sy = Math.round(p.y - camY);
      const rw = Math.max(1, Math.round(p.r * 0.8));
      ctx.fillRect(sx - rw, sy, rw * 2, 1 + (p.r > 5 ? 1 : 0));
    }
    for (const p of this.list) {
      if (!p.active) continue;
      const sx = p.x - camX, sy = p.y - p.z - camY;
      const glowC = GLOW_SHAPES.has(p.shape);
      if (p.shape === 'needle') {
        const a = Math.atan2(p.vy, p.vx), L = 3 + p.r * 1.6;
        ctx.strokeStyle = '#3a3a4a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * L, sy - Math.sin(a) * L); ctx.lineTo(sx + Math.cos(a) * L * 0.5, sy + Math.sin(a) * L * 0.5); ctx.stroke();
        ctx.strokeStyle = '#e8ecf4'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * L, sy - Math.sin(a) * L); ctx.lineTo(sx + Math.cos(a) * L * 0.5, sy + Math.sin(a) * L * 0.5); ctx.stroke();
        continue;
      }
      // motion trail for fast shots
      const spr = shotSprite(p.shape, p.r, p.tint);
      if (p.team === Team.Player && p.spd > 250 && p.delay <= 0) {
        ctx.globalAlpha = 0.25;
        spr.draw(ctx, sx - p.vx * 0.022, sy - p.vy * 0.022);
        ctx.globalAlpha = 1;
      }
      if (p.delay > 0) ctx.globalAlpha = 0.55 + 0.45 * Math.sin(p.t * 30);
      spr.draw(ctx, sx, sy);
      ctx.globalAlpha = 1;
      if (p.crit) w.r.addGlow(sx, sy, p.r * 3, 'rgba(255,220,120,1)', 0.5);
      if (glowC) w.r.addGlow(sx, sy, p.r * 3.5, SHOT_COLORS[p.shape], 0.35);
      if (p.team === Team.Enemy) w.r.addLight(sx, sy, 14 + p.r * 2, 0.35);
    }
  }
}
