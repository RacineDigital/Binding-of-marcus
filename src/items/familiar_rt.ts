// Familiar runtime: permanent familiars from items and temporary inklings.
import type { World } from '../game/world';
import type { FamiliarSpec } from './types';
import { getItem } from './registry';
import { familiarSprites } from '../art/familiars';
import { TAU, angleTo, dist2, clamp } from '../core/math';
import { baseProfile, AttackProfile } from '../projectiles/profile';
import { volley, Beam, SHOT_PX, beamScale, laserScale, overchargeMul, laserColor } from '../projectiles/weapons';
import type { Enemy } from '../enemies/enemy';
import { spawnDrop } from '../game/drops';

export class Familiar {
  id: string; spec: FamiliarSpec; x: number; y: number; r = 6; t = Math.random() * 3; cd = 0; idx = 0;
  temp = false; life = 0; dead = false; target: Enemy | null = null; ang = 0; data: any = {}; flip = false;
  onBlock?: (w: World) => void;
  constructor(id: string, spec: FamiliarSpec, x: number, y: number) { this.id = id; this.spec = spec; this.x = x; this.y = y; }
}

const INKLING: FamiliarSpec = { kind: 'chaser', contact: 1, sprite: 'inkling', speed: 150 };
const trail: { x: number; y: number }[] = [];

export function spawnInkling(w: World, x: number, y: number): void {
  if (w.familiars.filter((f) => f.temp).length > 40) return;
  const f = new Familiar('inkling', INKLING, x, y); f.temp = true; f.r = 4; f.life = 30; f.ang = Math.random() * TAU;
  w.familiars.push(f);
}

export function syncFamiliars(w: World): void {
  const want: string[] = [];
  const pl = w.player;
  for (const [id, n] of pl.items) {
    const it = getItem(id);
    if (!it?.familiar) continue;
    const per = it.familiarCount ?? 1;
    for (let i = 0; i < n * per; i++) want.push(id);
  }
  const have = w.familiars.filter((f) => !f.temp);
  const keep: Familiar[] = [];
  const pool = [...have];
  for (const id of want) {
    const i = pool.findIndex((f) => f.id === id);
    if (i >= 0) keep.push(pool.splice(i, 1)[0]);
    else keep.push(new Familiar(id, getItem(id)!.familiar!, pl.x, pl.y));
  }
  let fi = 0, oi = 0;
  const orbitals = keep.filter((f) => f.spec.kind === 'orbital').length;
  for (const f of keep) {
    if (f.spec.kind === 'follower' || f.spec.kind === 'spawner') f.idx = fi++;
    if (f.spec.kind === 'orbital') { f.idx = oi++; f.data.phase = (f.idx / Math.max(1, orbitals)) * TAU; }
  }
  w.familiars = [...keep, ...w.familiars.filter((f) => f.temp)];
  for (const f of w.familiars) if (f.spec.blocks && !f.onBlock) f.onBlock = () => { f.data.flash = 0.15; };
}

export function familiarsOnRoomEnter(w: World): void {
  trail.length = 0;
  for (const f of w.familiars) { f.x = w.player.x + (Math.random() - 0.5) * 10; f.y = w.player.y + (Math.random() - 0.5) * 10; f.target = null; }
}

export function familiarsOnRoomClear(w: World): void {
  w.familiars = w.familiars.filter((f) => !f.dead);
  for (const f of w.familiars) {
    if (f.temp) continue;
    const s = f.spec;
    if (s.spawnEvery && s.spawnDrop) {
      f.data.rooms = (f.data.rooms ?? 0) + 1;
      if (f.data.rooms >= s.spawnEvery) {
        f.data.rooms = 0;
        const d = Array.isArray(s.spawnDrop) ? s.spawnDrop[Math.floor(Math.random() * s.spawnDrop.length)] : s.spawnDrop;
        spawnDrop(w, d, f.x, f.y);
        w.fx.stars(f.x, f.y - 8, 5, '#ffe080');
      }
    }
    if (s.special === 'mothjar') { for (let i = 0; i < 2; i++) spawnInkling(w, f.x, f.y); }
    s.onRoomClear?.(w, f);
  }
}

function familiarProfile(f: Familiar, w: World): AttackProfile {
  const sh = f.spec.shoot!;
  if (sh.inherit) return w.player.prof;
  if (!f.data.prof) {
    const p = baseProfile();
    p.shape = (sh.shape as any) ?? 'ink';
    if (sh.pierce) p.pierce = 99;
    if (sh.homing) p.homing = 0.8;
    if (sh.shape === 'fire') p.burn = 0.5;
    f.data.prof = p;
  }
  return f.data.prof;
}

export function updateFamiliars(w: World, dt: number): void {
  const pl = w.player;
  // position trail for followers
  const last = trail[0];
  if (!last || dist2(last.x, last.y, pl.x, pl.y) > 4) { trail.unshift({ x: pl.x, y: pl.y }); if (trail.length > 200) trail.pop(); }
  for (const f of w.familiars) {
    if (f.dead) continue;
    f.t += dt; f.cd -= dt;
    if (f.data.flash > 0) f.data.flash -= dt;
    const s = f.spec;
    switch (s.kind) {
      case 'follower': case 'spawner': {
        const ti = Math.min(trail.length - 1, (f.idx + 1) * 5);
        const tp = trail[ti] ?? pl;
        f.x += (tp.x - f.x) * Math.min(1, dt * 10); f.y += (tp.y - f.y) * Math.min(1, dt * 10);
        break;
      }
      case 'orbital': {
        const R = (s.orbitR ?? 26) + (pl.stats.size - 1) * 10;
        const a = f.t * (s.orbitSpeed ?? 2.4) + (f.data.phase ?? 0);
        const tx = pl.x + Math.cos(a) * R, ty = pl.y - 6 + Math.sin(a) * R * 0.8;
        f.x += (tx - f.x) * Math.min(1, dt * 14); f.y += (ty - f.y) * Math.min(1, dt * 14);
        break;
      }
      case 'hover': {
        const a = f.t * 0.8 + f.idx;
        const tx = pl.x + Math.cos(a) * 20, ty = pl.y - 22 + Math.sin(a * 1.3) * 5;
        f.x += (tx - f.x) * Math.min(1, dt * 4); f.y += (ty - f.y) * Math.min(1, dt * 4);
        break;
      }
      case 'chaser': {
        if (!f.target || f.target.dead || f.target.hidden) f.target = w.nearestEnemy(f.x, f.y, 400);
        const spd = s.speed ?? 110;
        let tx = pl.x + Math.cos(f.t * 2 + f.idx) * 18, ty = pl.y - 8 + Math.sin(f.t * 2 + f.idx) * 12;
        if (f.target) { tx = f.target.x; ty = f.target.y - f.target.hitY * 0.5; }
        const a = angleTo(f.x, f.y, tx, ty);
        f.ang += clamp(((a - f.ang + Math.PI * 3) % TAU) - Math.PI, -7 * dt, 7 * dt);
        const dd = Math.sqrt(dist2(f.x, f.y, tx, ty));
        let sp = f.target ? spd : Math.min(spd, dd * 4);
        // Badger stalks, then pounces: a fast leap with a hop when she gets close
        if (s.special === 'tabby') {
          f.data.pcd = (f.data.pcd ?? 0) - dt;
          if (f.target && dd < 56 && f.data.pcd <= 0 && !(f.data.leap > 0)) { f.data.leap = 0.32; f.data.pcd = 1.4; f.ang = a; w.audio.play('hop', { x: f.x, pitch: 1.6, vol: 0.4 }); }
          if (f.data.leap > 0) { f.data.leap -= dt; sp = spd * 3.2; f.data.z = Math.sin((1 - f.data.leap / 0.32) * Math.PI) * 8; } else { f.data.z = 0; if (f.target && dd < 90) sp *= 0.55; }
        }
        f.x += Math.cos(f.ang) * sp * dt; f.y += Math.sin(f.ang) * sp * dt;
        f.flip = Math.cos(f.ang) < 0;
        if (f.temp) { f.life -= dt; if (f.life <= 0) f.dead = true; }
        break;
      }
      case 'turret': break;
    }
    // contact damage
    if (s.contact && f.cd <= 0) {
      for (const e of w.enemies) {
        if (e.dead || e.hidden || e.spawnT > 0 || e.friendly) continue;
        if (dist2(f.x, f.y, e.x, e.y - e.hitY * 0.5) < (f.r + e.r) ** 2) {
          const dmg = f.temp ? pl.stats.damage * 2 + 2 : s.contact * (1 + w.run.floorIndex * 0.25);
          w.damageEnemy(e, dmg, { ang: angleTo(f.x, f.y, e.x, e.y), knock: 0.5, source: 'familiar', prof: pl.prof, procMul: 0.5 });
          if (s.special === 'spider') e.slow = 2;
          f.cd = 0.25;
          if (f.temp) { f.dead = true; w.fx.burst(f.x, f.y, 4, 8, '#2a2e70', 60, 0.4); w.audio.play('splat', { x: f.x, vol: 0.4 }); }
          break;
        }
      }
    }
    // shooting
    if (s.shoot && f.cd <= 0) {
      const sh = s.shoot;
      let ang: number | null = null;
      if (s.kind === 'hover' || s.kind === 'orbital') { const e = w.nearestEnemy(f.x, f.y, sh.range ?? 180); if (e) ang = angleTo(f.x, f.y, e.x, e.y - e.hitY); }
      else if (pl.aiming) ang = pl.aimAng;
      if (ang !== null) {
        f.cd = 1 / sh.rate;
        const prof = familiarProfile(f, w);
        const copy = sh.inherit && (pl.mode === 'beam' || pl.mode === 'laser') ? pl.mode : null;
        if (copy === 'beam') {
          // twins copy the Burning Glass: a shorter, weaker beam carrying your full profile
          f.cd = 1 / (sh.rate * 0.4);
          const oc = overchargeMul(pl.prof); const b = new Beam(prof); b.dur = 0.35; b.width = 5 * beamScale(pl.stats.size) * oc.width; b.dmg = pl.stats.damage * sh.dmg * 0.55 * oc.dmg; b.ang = ang; b.followPlayer = false; b.x = f.x; b.y = f.y - 6; b.color = laserColor(pl.prof, '#6a58ff', w);
          w.beams.push(b);
        } else if (sh.laser || copy === 'laser') {
          const oc = overchargeMul(pl.prof); const b = new Beam(prof); b.laser = true; b.dur = 0.16; b.width = 5 * laserScale(pl.stats.size) * oc.width; b.dmg = (copy ? pl.stats.damage * sh.dmg : sh.dmg) * oc.dmg; b.ang = ang; b.followPlayer = false; b.x = f.x; b.y = f.y - 6; b.color = copy ? laserColor(pl.prof, '#ff5a6a', w) : laserColor(pl.prof, '#6ad0ff', w);
          w.beams.push(b);
        } else {
          const st = { ...pl.stats, damage: sh.inherit ? pl.stats.damage * sh.dmg : sh.dmg, fireRate: sh.rate, range: sh.range ?? 200 };
          const n = sh.burst ?? 1;
          if (sh.inherit) volley(w, prof, st, f.x, f.y - 2, 8, ang, { fam: true, sizeMul: 0.8 });
          else for (let i = 0; i < n; i++) w.proj.player(w, prof, f.x, f.y - 2, 8, ang + (n > 1 ? (i - (n - 1) / 2) * (sh.spread ?? 0.2) : 0), st.damage, SHOT_PX * 0.95, st.range, 0.75, 0, true);
        }
        f.data.flash = 0.08;
      }
    }
  }
  w.familiars = w.familiars.filter((f) => !f.dead);
}

export function renderFamiliar(w: World, ctx: CanvasRenderingContext2D, f: Familiar, sx: number, sy: number): void {
  const spr = familiarSprites(f.spec.sprite);
  const fr = spr[Math.floor(f.t * 6) % 2];
  const air = f.spec.kind === 'orbital' || f.spec.kind === 'hover' || f.temp || f.spec.sprite === 'belfry_bat' || f.spec.sprite === 'paper_bird';
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath(); ctx.ellipse(sx, sy + (air ? 8 : 0), 4, 1.5, 0, 0, TAU); ctx.fill();
  fr.draw(ctx, sx, sy + (air ? -2 : 1) - (f.data.z ?? 0), { flip: f.flip, flash: f.data.flash > 0 ? 0.8 : 0 });
  if (f.spec.sprite === 'lantern_wisp' || f.spec.sprite === 'little_wick') { w.r.addGlow(sx, sy - 8, 16, '#ffa040', 0.35); w.r.addLight(sx, sy - 8, 40, 0.5); }
  if (f.spec.sprite === 'wax_angel' || f.spec.sprite === 'choir_mote') w.r.addGlow(sx, sy - 8, 14, '#fff0c0', 0.3);
}
