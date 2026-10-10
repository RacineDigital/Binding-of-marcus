// Chapter I creatures added in 2.0, each filling a role the cellar lacked:
//   Paper Lurker (ambush), Mildew (zoning), Lampkeeper (support: shields allies), Old Trunk (heavy).
// Every one shows its intent before it acts and has a clear answer.
import { EnemyDef, Enemy } from './enemy';
import { sprites2 } from '../art/creatures2';
import { chase, keepDistance, distToPlayer, ringShot } from './ai';
import { TAU, angleTo, clamp, dist2 } from '../core/math';
import type { World } from '../game/world';

import { TILE } from '../core/constants';
/** The walkable rectangle of the current room, inset by m. */
const inside = (w: World, m: number) => ({ x0: w.room.ox + TILE + m, y0: w.room.oy + TILE + m, x1: w.room.ox + (w.room.cols - 1) * TILE - m, y1: w.room.oy + (w.room.rows - 1) * TILE - m });
const others = (e: Enemy, w: World) => w.enemies.filter((x) => x !== e && !x.dead && !x.friendly && !x.isBoss && x.spawnT <= 0);

// ------------------------------------------------------------------ Paper Lurker (ambush)
// Sits in the room looking like one more heap of paper. The heap breathes; walk close and it
// shudders, then bursts out and skitters at you. Shoot a suspicious heap first and it tumbles out
// stunned and takes extra damage. If it is the last thing in the room it gives itself up.
const lurker: EnemyDef = {
  id: 'lurker', name: 'Paper Lurker', desc: 'A mound of loose paper that breathes. Get close and it bursts out; shoot it first and it falls out stunned.',
  hp: 12, r: 7, speed: 62, role: 'melee', cost: 1.1, hitY: 7, gore: '#c8bc9c', spawnQuiet: true, cast: { max: 2 },
  sprites: () => sprites2('lurker'),
  init(e) { e.setState('buried'); e.anim = 'heap'; e.data.noContact = true; e.data.alone = 0; },
  update(e, w, dt) {
    if (e.state === 'buried') {
      e.kvx = e.kvy = 0;
      // the breath, and now and then something looks out from under the pages
      if ((e.t + e.id * 0.37) % 4.4 < 0.3) { e.setAnim('peek'); e.animate(dt, 10); } else { e.setAnim('heap'); e.animate(dt, 2.5); }
      e.data.alone = others(e, w).length === 0 ? e.data.alone + dt : 0;
      if (distToPlayer(e, w) < 54 || e.data.alone > 2.5) { e.setState('tell'); w.audio.play('chitter', { x: e.x, vol: 0.35, pitch: 0.8 }); }
    } else if (e.state === 'tell') {
      e.kvx = e.kvy = 0;
      e.setAnim('peek'); e.frame = Math.floor(e.st * 20) % 2; e.x += Math.sin(e.st * 70) * 0.6;
      if (Math.random() < dt * 30) w.fx.burst(e.x, e.y, 6, 1, '#e8dcc0', 50, 0.4);
      if (e.st > 0.45) burst(e, w, false);
    } else if (e.state === 'stun') {
      e.animate(dt, 4); e.x += Math.sin(e.st * 50) * 0.3;
      if (e.st > 0.9) e.setState('skitter');
    } else if (e.state === 'skitter') {
      // a zig-zag run at you; every couple of seconds it crouches, then lunges
      const a = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.sin(e.t * 7 + e.id) * 0.7;
      const s = e.def.speed * e.spd() * (e.fear > 0 ? -1 : 1);
      e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt); e.flip = w.player.x < e.x;
      e.animate(dt, 14);
      if (e.st > 2 && distToPlayer(e, w) < 110) { e.setState('crouch'); e.sx = 1.25; e.sy = 0.78; }
    } else if (e.state === 'crouch') {
      e.sx = 1.25; e.sy = 0.78;
      if (e.st > 0.35) { e.data.la = angleTo(e.x, e.y, w.player.x, w.player.y); e.setState('lunge'); w.audio.play('hop', { x: e.x, vol: 0.3, pitch: 1.3 }); }
    } else if (e.state === 'lunge') {
      const s = e.def.speed * 2.6 * e.spd() * (e.fear > 0 ? -1 : 1);
      const h = e.move(w, Math.cos(e.data.la) * s * dt, Math.sin(e.data.la) * s * dt); e.animate(dt, 20);
      if (h.hx || h.hy || e.st > 0.32) e.setState('skitter');
    }
  },
  onHurt(e, w, dmg) {
    if (e.state === 'buried' || e.state === 'tell') { burst(e, w, true); return dmg * 1.5; }
    if (e.state === 'stun') return dmg * 1.5;
    return dmg;
  },
};
function burst(e: Enemy, w: World, stunned: boolean): void {
  e.data.noContact = false; e.anim = 'walk'; e.frame = 0;
  e.setState(stunned ? 'stun' : 'skitter');
  e.sx = 0.7; e.sy = 1.4;
  w.fx.burst(e.x, e.y, 8, 10, '#e8dcc0', 90, 0.5); w.fx.smoke(e.x, e.y - 4, 3, 'rgba(200,190,160,', 5, 0.5, 8);
  w.audio.play(stunned ? 'thud' : 'heapBreak', { x: e.x, vol: 0.45 });
  if (stunned) w.fx.stars(e.x, e.y - 14, 3, '#ffe070');
}

// ------------------------------------------------------------------ Mildew (zoning)
// A rooted cap. It swells and its gills glow, then it puffs three patches of spores around itself
// that linger for a few seconds and hurt to stand in. Kill it and its spores dry up at once.
const mildew: EnemyDef = {
  id: 'mildew', name: 'Mildew', desc: 'A rooted cap that glows, then puffs spores that linger on the floor. Kill it and they dry up.',
  hp: 16, r: 7, speed: 0, role: 'turret', cost: 1.3, hitY: 9, mass: 99, cast: { max: 2 }, noKnock: true, gore: '#6a9a3a', goreDecal: '#2e4a22',
  sprites: () => sprites2('mildew'),
  init(e) { e.cd = 1.6 + Math.random() * 1.2; e.data.rot = Math.random() * TAU; e.data.patches = []; },
  update(e, w, dt) {
    e.data.patches = (e.data.patches as { life: number }[]).filter((p) => p.life > 0);
    e.cd -= dt;
    const swelling = e.cd < 0.65;
    if (swelling) { e.setAnim('swell'); e.frame = Math.min(2, Math.floor((0.65 - e.cd) / 0.22)); } else { e.setAnim('idle'); e.animate(dt, 3); }
    if (swelling) { e.sy = 1 + (0.65 - e.cd) * 0.25; e.sx = 1 + (0.65 - e.cd) * 0.12; if (Math.random() < dt * 14) w.fx.burst(e.x + (Math.random() - 0.5) * 12, e.y, 8, 1, '#c8ff70', 25, 0.5, 1, -30); }
    if (e.cd <= 0) {
      e.cd = w.run.floorIndex === 0 ? 3.6 : 3;
      if (e.data.patches.length < 6 && w.roomTime > 1) {
        for (let i = 0; i < 3; i++) {
          const a = e.data.rot + (i / 3) * TAU, d = 26 + Math.random() * 10;
          const b = inside(w, 4), x = clamp(e.x + Math.cos(a) * d, b.x0, b.x1), y = clamp(e.y + Math.sin(a) * d * 0.8, b.y0, b.y1);
          w.addCreep(x, y, 13, 'enemy', 0, 4.5, '#6a9a3a');
          e.data.patches.push(w.creep[w.creep.length - 1]);
          w.fx.smoke(x, y, 3, 'rgba(140,190,90,', 6, 0.7, 6);
        }
        e.data.rot += 1.05;
        e.sx = 1.3; e.sy = 0.75;
        w.audio.play('spit', { x: e.x, vol: 0.35, pitch: 0.6 });
      }
    }
  },
  onDeath(e) { for (const p of e.data.patches as { life: number }[]) p.life = Math.min(p.life, 0.35); },
};

// ------------------------------------------------------------------ Lampkeeper (support)
// A timid hooded thing with a lantern. It keeps its distance from you and stays near the others;
// everything standing in its light takes half damage (they glint gold when a shot is turned).
// Answer: chase it down first, or pull the others out of its light.
const lampkeeper: EnemyDef = {
  id: 'lampkeeper', name: 'Lampkeeper', desc: 'Creatures standing in its lantern light take half damage. It keeps away from you: corner it first, or draw the others out of the light.',
  hp: 12, r: 6, speed: 36, role: 'special', cost: 1.4, hitY: 13, gore: '#4a3a62', cast: { max: 1, company: 2 },
  light: [60, '#ffc040'], aura: { r: 54, mul: 0.5, color: '#ffc040' },
  sprites: () => sprites2('lampkeeper'),
  init(e) { e.anim = 'walk'; },
  update(e, w, dt) {
    const pals = others(e, w).filter((x) => !x.def.aura);
    const dP = distToPlayer(e, w);
    if (pals.length && dP > 70) {
      // stand behind the group, on the side away from you
      let cx = 0, cy = 0; for (const p of pals) { cx += p.x; cy += p.y; } cx /= pals.length; cy /= pals.length;
      const a = angleTo(w.player.x, w.player.y, cx, cy);
      const gx = cx + Math.cos(a) * 22, gy = cy + Math.sin(a) * 22;
      if (dist2(e.x, e.y, gx, gy) > 100) {
        // walk round a friend standing in the way rather than pushing into it
        let mv = angleTo(e.x, e.y, gx, gy);
        const inWay = pals.find((p) => dist2(p.x, p.y, e.x, e.y) < (p.r + e.r + 12) ** 2 && Math.abs(Math.atan2(Math.sin(angleTo(e.x, e.y, p.x, p.y) - mv), Math.cos(angleTo(e.x, e.y, p.x, p.y) - mv))) < 0.9);
        if (inWay) { mv += (e.y < inWay.y ? -1 : 1) * 1.2; e.move(w, Math.cos(mv) * e.def.speed * e.spd() * dt, Math.sin(mv) * e.def.speed * e.spd() * dt); }
        else chase(e, w, e.def.speed * e.spd(), dt, gx, gy);
      }
    } else keepDistance(e, w, 90, 150, e.def.speed * 1.2, dt);
    e.flip = w.player.x < e.x;
    e.animate(dt, 7);
  },
  onDeath(e, w) { w.fx.shards(e.x, e.y - 8, 6, '#ffd060'); w.fx.flash(e.x, e.y - 8, 14, '#ffd060', 0.15); w.audio.play('urnBreak', { x: e.x, vol: 0.4 }); },
};

// ------------------------------------------------------------------ Old Trunk (heavy)
// A steamer trunk with a mouth. It rattles, then hops at you (its shadow shows where it will land),
// slams down, and gapes open for a moment, when it takes much more damage. Closed, its wood and
// iron turn some of each hit.
const trunk: EnemyDef = {
  id: 'trunk', name: 'Old Trunk', desc: 'Rattles, then hops where you stand: watch for the shadow. After it lands it gapes open and takes much more damage.',
  hp: 30, r: 10, speed: 0, role: 'heavy', cost: 2.2, hitY: 10, mass: 3, cast: { max: 2 }, gore: '#7e5634', goreDecal: '#3a2a1a',
  sprites: () => sprites2('trunk'),
  init(e) { e.cd = 0.9 + Math.random() * 0.6; e.anim = 'shut'; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.setAnim('shut'); e.animate(dt, 3); e.cd -= dt;
      if (e.cd <= 0) { e.setState('rattle'); w.audio.play('thud', { x: e.x, vol: 0.2, pitch: 1.6 }); }
    } else if (e.state === 'rattle') {
      e.setAnim('rattle'); e.frame = Math.floor(e.st * 14) % 2; e.x += Math.sin(e.st * 60) * 0.5;
      if (e.st > 0.5) {
        const a = angleTo(e.x, e.y, w.player.x, w.player.y), d = Math.min(95, distToPlayer(e, w));
        const b = inside(w, e.r), tx = clamp(e.x + Math.cos(a) * d, b.x0, b.x1), ty = clamp(e.y + Math.sin(a) * d, b.y0, b.y1);
        e.data.landAt = { x: tx, y: ty, r: e.r * 1.4 };
        e.vx = (tx - e.x) / 0.62; e.vy = (ty - e.y) / 0.62; e.vz = 172;
        e.mode = 'fly'; e.setState('air'); e.setAnim('air');
        w.audio.play('hop', { x: e.x, vol: 0.4, pitch: 0.6 });
      }
    } else if (e.state === 'air') {
      e.vz -= 555 * dt; e.z = Math.max(0, e.z + e.vz * dt);
      e.move(w, e.vx * e.spd() * dt, e.vy * e.spd() * dt);
      if (e.z <= 0 && e.vz < 0) {
        e.z = 0; e.mode = 'walk'; e.data.landAt = null;
        e.sx = 1.35; e.sy = 0.7; w.shake(2.5);
        w.fx.burst(e.x, e.y, 2, 12, '#8a7a6a', 80, 0.4); w.fx.ring(e.x, e.y, 4, 26, '#c8b090', 0.25, false);
        w.audio.play('thud', { x: e.x, vol: 0.6, pitch: 0.7 });
        if (w.run.floorIndex === 0) ringShot(e, w, 4, 85, TAU / 8);
        else ringShot(e, w, 6, 105, e.data.alt ? TAU / 12 : 0);
        e.data.alt = !e.data.alt;
        e.setState('open'); e.setAnim('open');
      }
    } else if (e.state === 'open') {
      e.animate(dt, 8);
      if (e.st > 0.95) { e.setState('idle'); e.cd = 0.8 + Math.random() * 0.5; e.sx = 0.9; e.sy = 1.1; }
    }
  },
  onHurt(e, w, dmg, info) {
    if (e.state === 'open') {
      if (e.t - (e.data.weakT ?? -9) > 0.12) { e.data.weakT = e.t; w.fx.sparks(e.x, e.y - e.hitY, 4, '#ffd860', 100, 0.2); w.audio.play('weakHit', { x: e.x, vol: 0.35 }); }
      return dmg * 1.6;
    }
    if (info.source === 'shot' && e.t - (e.data.knockT ?? -9) > 0.25) { e.data.knockT = e.t; w.audio.play('thud', { x: e.x, vol: 0.15, pitch: 2 }); }
    return dmg * 0.75;
  },
};

export const CELLAR2_ENEMIES: EnemyDef[] = [lurker, mildew, lampkeeper, trunk];
