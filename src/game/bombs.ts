// Cherry bombs: physics bodies with a fuse, pushed by Marcus, modified by bomb items.
import type { World } from './world';
import { moveBody } from '../rooms/collide';
import { TAU, dist2 } from '../core/math';
import type { BombMods } from '../items/types';
import { pickupSprites } from '../art/pickups';
import { getItem } from '../items/registry';
import type { Enemy } from '../enemies/enemy';
import { childLaser, laserColor, laserScale, overcharge, overchargeMul } from '../projectiles/weapons';

export class Bomb {
  x: number; y: number; z = 0; vx = 0; vy = 0; vz = 0; r = 6;
  fuse = 1.55; t = 0; dead = false; mods: BombMods; mini = false; stuck: Enemy | null = null; sox = 0; soy = 0;
  constructor(x: number, y: number, mods: BombMods) { this.x = x; this.y = y; this.mods = mods; }
}

export function playerBombMods(w: World): BombMods {
  const m: BombMods = {};
  const pl = w.player;
  for (const [id] of pl.items) { const b = getItem(id)?.bomb; if (b) for (const k of Object.keys(b) as (keyof BombMods)[]) { const v = b[k]; if (typeof v === 'number') (m as any)[k] = ((m as any)[k] ?? 0) + v; else (m as any)[k] = v; } }
  for (const id of pl.charms) { const b = getItem(id)?.bomb; if (b) Object.assign(m, b); }
  return m;
}

export function placeBomb(w: World): void {
  const pl = w.player;
  const infinite = false;
  if (pl.bombs <= 0 && !infinite) return;
  if (!infinite) pl.bombs--;
  const b = new Bomb(pl.x, pl.y + 2, playerBombMods(w));
  if (b.mods.big) b.r = 8;
  w.bombs.push(b);
  w.audio.play('bombPlace', { x: pl.x });
}

export function updateBombs(w: World, dt: number): void {
  const pl = w.player;
  for (const b of w.bombs) {
    if (b.dead) continue;
    b.t += dt; b.fuse -= dt;
    if (b.stuck) {
      if (b.stuck.dead) b.stuck = null; else { b.x = b.stuck.x + b.sox; b.y = b.stuck.y + b.soy; }
    } else {
      if (b.mods.homing && b.t > 0.2) {
        const e = w.nearestEnemy(b.x, b.y, 180);
        if (e) { const a = Math.atan2(e.y - b.y, e.x - b.x); b.vx += Math.cos(a) * 260 * dt; b.vy += Math.sin(a) * 260 * dt; }
      }
      // pushed by the player
      const rr = b.r + pl.r;
      const d2 = dist2(b.x, b.y, pl.x, pl.y);
      if (d2 < rr * rr && b.t > 0.35 && d2 > 0.01) {
        const d = Math.sqrt(d2); const nx = (b.x - pl.x) / d, ny = (b.y - pl.y) / d;
        b.vx += nx * 220 * dt * 6; b.vy += ny * 220 * dt * 6;
      }
      const f = Math.exp(-4 * dt); b.vx *= f; b.vy *= f;
      const h = moveBody(w.room, b, b.vx * dt, b.vy * dt, 'walk');
      if (h.hx) b.vx *= -0.6; if (h.hy) b.vy *= -0.6;
      if (b.mods.sticky && !b.stuck) {
        for (const e of w.enemies) if (!e.dead && dist2(e.x, e.y, b.x, b.y) < (e.r + b.r) ** 2) { b.stuck = e; b.sox = b.x - e.x; b.soy = b.y - e.y; break; }
      }
    }
    if (b.vz || b.z > 0) { b.vz -= 500 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = 0; } }
    if (Math.random() < dt * 20) w.fx.sparks(b.x + 2, b.y - 13 - b.z, 1, '#ffd060', 30, 0.15);
    if (b.fuse <= 0) detonate(w, b);
  }
  w.bombs = w.bombs.filter((b) => !b.dead);
}

export function detonate(w: World, b: Bomb): void {
  if (b.dead) return;
  b.dead = true;
  const m = b.mods;
  const r = (b.mini ? 30 : 44) + (m.big ? 16 : 0) + (m.radiusAdd ?? 0);
  const dmg = (b.mini ? 25 : 60) + (m.big ? 40 : 0) + (m.damageAdd ?? 0);
  w.explode(b.x, b.y, r, dmg, { bomb: true, mods: m, friendly: w.player.has('blast_apron') });
  // with lasers, a bomb goes off as a burst of rays
  const prof = w.player.prof;
  if (prof.modes.has('laser') || prof.lasers > 0) {
    const n = 6 + overcharge(prof) * 2, off = Math.random() * TAU;
    for (let i = 0; i < n; i++) childLaser(w, prof, b.x, b.y - 6, off + (i / n) * TAU, Math.max(8, w.player.stats.damage * 2) * overchargeMul(prof).dmg, 3 * laserScale(w.player.stats.size), 150, laserColor(prof, '#ff5a6a', w));
  }
  if (m.fire) for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; w.addCreep(b.x + Math.cos(a) * 18, b.y + Math.sin(a) * 12, 12, 'player', 18, 4, '#a0401a'); }
  if (m.poison) { w.fx.smoke(b.x, b.y, 16, 'rgba(90,150,40,', 10, 2.5, 6); for (const e of w.enemies) if (dist2(e.x, e.y, b.x, b.y) < (r * 1.6) ** 2) { e.poison = 5; e.poisonDmg = 6; } }
  if (m.ink) for (let i = 0; i < 5; i++) w.addCreep(b.x + (Math.random() - 0.5) * 40, b.y + (Math.random() - 0.5) * 30, 14, 'player', 12, 5);
  if (m.cross) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      for (let k = 1; k <= 3; k++) w.after(k * 0.06, () => w.explode(b.x + Math.cos(a) * k * 26, b.y + Math.sin(a) * k * 20, 22, dmg * 0.4, { friendly: true, small: true }));
    }
  }
  if (m.scatter && !b.mini) for (let i = 0; i < 4; i++) {
    const mb = new Bomb(b.x, b.y, { ...m, scatter: false }); mb.mini = true; mb.fuse = 0.6 + Math.random() * 0.4;
    const a = Math.random() * TAU; mb.vx = Math.cos(a) * 140; mb.vy = Math.sin(a) * 100; mb.vz = 120; mb.z = 2;
    w.bombs.push(mb);
  }
}

export function renderBomb(w: World, ctx: CanvasRenderingContext2D, b: Bomb, sx: number, sy: number): void {
  const S = pickupSprites();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(sx, sy, b.r, 2.5, 0, 0, TAU); ctx.fill();
  const blink = b.fuse < 0.8 ? Math.floor(b.fuse * 14) % 2 === 0 : Math.floor(b.fuse * 5) % 2 === 0;
  const pulse = 1 + Math.sin(b.t * (b.fuse < 0.8 ? 40 : 14)) * 0.07;
  const spr = b.mods.big ? S.goldBomb : S.bomb;
  spr.draw(ctx, sx, sy - b.z + 2, { sx: pulse * (b.mini ? 0.7 : b.mods.big ? 1.25 : 1), sy: (2 - pulse) * (b.mini ? 0.7 : b.mods.big ? 1.25 : 1), flash: blink ? 0.7 : 0 });
  w.r.addGlow(sx + 2, sy - 12, 10, '#ffb040', 0.25);
}
