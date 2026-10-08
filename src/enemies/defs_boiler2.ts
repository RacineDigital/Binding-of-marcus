// Chapter II creatures added in 2.0, each filling a role the boiler rooms lacked:
//   Bellows (environment: its gust shoves you and fans fires), Foreman (support: its whistle hastens
//   the others), Riveter (ranged: a locked aim line, then three rivets down it), Brickback (shield:
//   a firebrick slab blocks shots from the side it faces).
import { EnemyDef, Enemy } from './enemy';
import { gridFrames, scaledFrames } from '../art/creature';
import * as H from '../art/hand/boiler3';
import { chase, keepDistance, distToPlayer, ringShot, hasLOS } from './ai';
import { angleTo, angleDiff, dist2 } from '../core/math';
import { moveBody } from '../rooms/collide';
import type { World } from '../game/world';

const others = (e: Enemy, w: World) => w.enemies.filter((x) => x !== e && !x.dead && !x.friendly && !x.isBoss && x.spawnT <= 0);

// ------------------------------------------------------------------ Bellows (environment)
// A leather bellows that waddles to keep its nozzle on you. It inhales (it swells, dust is drawn in),
// then blows a cone: inside it you are shoved back, and any fire it passes over spits embers.
// Answer: step out of the cone's line, or put a rock between you; it is helpless while refilling.
const CONE = 0.42, REACH = 125;
const bellows: EnemyDef = {
  id: 'bellows', name: 'Bellows', desc: 'Swells as it breathes in, then blows: the gust shoves you back and makes fires spit. Step out of its line.',
  hp: 16, r: 8, speed: 30, role: 'special', cost: 1.5, hitY: 9, gore: '#8a5430', goreDecal: '#3a2418', cast: { max: 1 },
  sprites: () => ({ idle: scaledFrames(H.BELLOWS, H.BELLOWS_PAL, [[1, 1], [1.12, 1.18], [0.9, 0.82]]) }),
  init(e) { e.cd = 1.4 + Math.random(); e.frame = 0; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      keepDistance(e, w, 70, 120, e.def.speed * e.spd(), dt); e.frame = 0;
      e.flip = w.player.x < e.x;
      e.cd -= dt;
      if (e.cd <= 0 && distToPlayer(e, w) < 150) { e.setState('inhale'); e.data.ga = angleTo(e.x, e.y, w.player.x, w.player.y); w.audio.play('extinguish', { x: e.x, vol: 0.3, pitch: 0.5 }); }
    } else if (e.state === 'inhale') {
      // it can still turn while breathing in; the direction locks when it blows
      e.data.ga = angleTo(e.x, e.y, w.player.x, w.player.y); e.flip = Math.cos(e.data.ga) < 0;
      e.frame = 1;
      if (Math.random() < dt * 30) { const a = e.data.ga + (Math.random() - 0.5) * CONE * 2, d = 40 + Math.random() * 40; w.fx.burst(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 6, 1, '#c8b8a0', -60, 0.4, 1, 0); }
      if (e.st > 0.7) { e.setState('blow'); w.audio.play('extinguish', { x: e.x, vol: 0.6, pitch: 0.8 }); }
    } else if (e.state === 'blow') {
      e.frame = 2;
      const a = e.data.ga;
      if (Math.random() < dt * 40) { const s = a + (Math.random() - 0.5) * CONE * 2; w.fx.burst(e.x + Math.cos(s) * 14, e.y + Math.sin(s) * 14, 8, 1, '#e8dcc8', 150, 0.5, 1, 0); }
      // the gust shoves you while you stand in it
      const pl = w.player, d = Math.hypot(pl.x - e.x, pl.y - e.y), off = Math.abs(angleDiff(angleTo(e.x, e.y, pl.x, pl.y), a));
      if (d < REACH && off < CONE && !pl.dead) { const push = 150 * (1 - d / REACH * 0.5) * dt; moveBody(w.room, pl, Math.cos(a) * push, Math.sin(a) * push, pl.flight ? 'fly' : 'walk', null); }
      // fires in the gust spit embers at you
      if (!e.data.fanned) {
        e.data.fanned = true;
        const room = w.room;
        for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) {
          if (room.at(c, r) !== 6) continue;
          const { x: fx, y: fy } = room.cellCenter(c, r), fd = Math.hypot(fx - e.x, fy - e.y);
          if (fd < REACH + 20 && Math.abs(angleDiff(angleTo(e.x, e.y, fx, fy), a)) < CONE + 0.1) {
            w.fx.embers(fx, fy - 6, 8, '#ff9a40');
            w.proj.enemy(fx, fy, a + (Math.random() - 0.5) * 0.3, 95, { shape: 'ember', r: 3, range: 140, z: 6 });
          }
        }
      }
      if (e.st > 0.65) { e.setState('idle'); e.data.fanned = false; e.cd = 2.2 + Math.random() * 0.8; }
    }
  },
};

// ------------------------------------------------------------------ Foreman (support)
// Keeps behind the others. Every few seconds it lifts its whistle (a puff of steam and a rising
// hiss), then blows: everything near it is hastened for three seconds (steam trails off them).
// Answer: kill it first, or fight away from it.
const HASTE_R = 100;
const foreman: EnemyDef = {
  id: 'foreman', name: 'Foreman', desc: 'Blows its whistle to drive the others faster for a few seconds. Steam rises before it blows.',
  hp: 18, r: 7, speed: 32, role: 'special', cost: 1.5, hitY: 13, gore: '#9a4a2a', goreDecal: '#3a1a10', cast: { max: 1, company: 2 },
  sprites: () => ({ walk: gridFrames(H.FOREMAN, H.FOREMAN_PAL) }),
  init(e) { e.anim = 'walk'; e.cd = 2 + Math.random(); },
  update(e, w, dt) {
    const pals = others(e, w);
    if (e.state === 'idle') {
      if (pals.length && distToPlayer(e, w) > 80) {
        let cx = 0, cy = 0; for (const p of pals) { cx += p.x; cy += p.y; } cx /= pals.length; cy /= pals.length;
        const a = angleTo(w.player.x, w.player.y, cx, cy);
        chase(e, w, e.def.speed * e.spd(), dt, cx + Math.cos(a) * 30, cy + Math.sin(a) * 30);
      } else keepDistance(e, w, 90, 150, e.def.speed * e.spd(), dt);
      e.flip = w.player.x < e.x; e.animate(dt, 5);
      e.cd -= dt;
      if (e.cd <= 0 && pals.some((p) => dist2(p.x, p.y, e.x, e.y) < HASTE_R * HASTE_R)) { e.setState('lift'); w.audio.play('extinguish', { x: e.x, vol: 0.3, pitch: 1.6 }); }
    } else if (e.state === 'lift') {
      e.sy = 1.12; e.sx = 0.92;
      if (Math.random() < dt * 20) w.fx.smoke(e.x, e.y - e.hitY * 2.2, 1, 'rgba(230,230,240,', 3, 0.5, 20);
      if (e.st > 0.6) {
        e.setState('idle'); e.cd = 5 + Math.random() * 1.5;
        w.audio.play('whistle', { x: e.x, vol: 0.6 });
        w.fx.ring(e.x, e.y - 6, 6, HASTE_R, '#f0f0ff', 0.35, false);
        for (const p of pals) if (dist2(p.x, p.y, e.x, e.y) < HASTE_R * HASTE_R) { p.data.hasteT = 3; w.fx.bolt(e.x, e.y - e.hitY, p.x, p.y - p.hitY, '#f0f0ff', 0.15); }
      }
    }
  },
};

// ------------------------------------------------------------------ Riveter (ranged)
// Scuttles to a spot with a clear line to you and plants. A thin red line shows its aim; it follows
// you for half a second, then locks (it brightens), and three rivets go down it. Then it reloads.
// Answer: be off the line when it locks; hit it while it reloads.
const riveter: EnemyDef = {
  id: 'riveter', name: 'Riveter', desc: 'Plants and aims: the red line follows you, then locks and brightens. Three rivets follow it. Be off the line.',
  hp: 15, r: 8, speed: 46, role: 'shooter', cost: 1.5, hitY: 8, gore: '#5e5e6a', goreDecal: '#2a2a30', cast: { max: 2 },
  sprites: () => ({ walk: gridFrames(H.RIVETER, H.RIVETER_PAL) }),
  init(e) { e.anim = 'walk'; e.cd = 1.2 + Math.random(); },
  update(e, w, dt) {
    if (e.state === 'idle') {
      keepDistance(e, w, 100, 170, e.def.speed * e.spd(), dt); e.animate(dt, 8); e.flip = w.player.x < e.x;
      e.cd -= dt;
      if (e.cd <= 0 && hasLOS(e, w) && distToPlayer(e, w) < 230) { e.setState('aim'); e.data.aim = angleTo(e.x, e.y, w.player.x, w.player.y); w.audio.play('tink', { x: e.x, vol: 0.3, pitch: 0.7 }); }
    } else if (e.state === 'aim') {
      if (e.st < 0.5) e.data.aim = angleTo(e.x, e.y, w.player.x, w.player.y);
      else if (!e.data.locked) { e.data.locked = true; w.audio.play('tink', { x: e.x, vol: 0.5, pitch: 1.4 }); }
      e.data.aimLine = { a: e.data.aim, locked: e.st >= 0.5 };
      e.flip = Math.cos(e.data.aim) < 0;
      if (e.st > 0.9) { e.setState('fire'); e.data.n = 0; e.data.aimLine = null; }
    } else if (e.state === 'fire') {
      const want = 1 + Math.floor(e.st / 0.1);
      while (e.data.n < Math.min(3, want)) { e.data.n++; w.proj.enemy(e.x + Math.cos(e.data.aim) * 10, e.y + Math.sin(e.data.aim) * 6, e.data.aim, 185, { shape: 'bone', r: 2.5, z: 6 }); e.kvx -= Math.cos(e.data.aim) * 30; e.kvy -= Math.sin(e.data.aim) * 30; w.audio.play('needle', { x: e.x, vol: 0.4 }); }
      if (e.st > 0.35) { e.setState('reload'); e.data.locked = false; }
    } else if (e.state === 'reload') {
      e.x += Math.sin(e.st * 50) * 0.2;
      if (e.st > 1.1) { e.setState('idle'); e.cd = 1.4 + Math.random(); }
    }
  },
  onDeath(e) { e.data.aimLine = null; },
};

// ------------------------------------------------------------------ Brickback (shield)
// Carries a firebrick slab on the side it faces; shots from that side are turned. It turns to face
// you, but slowly. When close it raises the slab (a tell) and slams it down: a ring of cinders, and
// for a moment the slab is on the floor and it is open from every side.
// Answer: get round it, or wait for the slam.
const brickback: EnemyDef = {
  id: 'brickback', name: 'Brickback', desc: 'Its firebrick slab turns shots from the side it faces, and it is slow to turn. Get round it, or hit it after it slams the slab down.',
  hp: 26, r: 9, speed: 28, role: 'heavy', cost: 2, hitY: 11, mass: 2.5, gore: '#a8442a', goreDecal: '#3a1a10', cast: { max: 2 },
  sprites: () => ({ walk: gridFrames([H.BRICK], H.BRICK_PAL), raise: gridFrames([H.BRICK_RAISE], H.BRICK_PAL) }),
  init(e) { e.anim = 'walk'; e.data.face = 1; e.cd = 1.5; },
  update(e, w, dt) {
    // it faces left or right, and only changes its mind slowly
    const want = w.player.x < e.x ? -1 : 1;
    if (want !== e.data.face) { e.data.turnT = (e.data.turnT ?? 0) + dt; if (e.data.turnT > 0.75) { e.data.face = want; e.data.turnT = 0; e.sx = 0.8; } } else e.data.turnT = 0;
    e.flip = e.data.face < 0;
    if (e.state === 'idle') {
      chase(e, w, e.def.speed * e.spd(), dt); e.setAnim('walk');
      e.cd -= dt;
      if (e.cd <= 0 && distToPlayer(e, w) < 60) { e.setState('raise'); e.setAnim('raise'); w.audio.play('creak', { x: e.x, vol: 0.4 }); }
    } else if (e.state === 'raise') {
      e.sy = 1.1;
      if (e.st > 0.55) {
        e.setState('down'); e.setAnim('walk'); e.sx = 1.3; e.sy = 0.75; w.shake(1.5);
        ringShot(e, w, w.run.floorIndex >= 2 ? 8 : 6, 95, Math.random(), { shape: 'ember', r: 3, range: 120 });
        w.fx.burst(e.x + e.data.face * 12, e.y, 2, 10, '#a8442a', 70, 0.4); w.audio.play('thud', { x: e.x, vol: 0.5 });
      }
    } else if (e.state === 'down') {
      if (e.st > 0.9) { e.setState('idle'); e.cd = 2.2; }
    }
  },
  onHurt(e, w, dmg, info) {
    if (e.state === 'down') return dmg * 1.3;
    // the slab: a shot coming from the side it faces (within about 70 degrees) is turned
    const from = info.ang + Math.PI;   // direction the shot came from
    const facing = e.data.face > 0 ? 0 : Math.PI;
    if (info.source !== 'burn' && info.source !== 'poison' && info.source !== 'creep' && Math.abs(angleDiff(from, facing)) < 1.2) {
      if (e.t - (e.data.blockT ?? -9) > 0.1) { e.data.blockT = e.t; w.audio.play('clang', { x: e.x, vol: 0.3, pitch: 1.3 }); w.fx.sparks(e.x + e.data.face * 12, e.y - 8, 3, '#ffb070', 80); }
      return dmg * 0.15;
    }
    return dmg;
  },
};

export const BOILER2_ENEMIES: EnemyDef[] = [bellows, foreman, riveter, brickback];
