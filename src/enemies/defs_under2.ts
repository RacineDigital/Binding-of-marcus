// Chapter III creatures added in 2.0, each filling a role the underworks lacked:
//   Sluice Keeper (environment: a current through one band of the room), Bilge Priest (support:
//   raises the fallen), Fumarole (zoning: slow drifting gas clouds).
import type { EnemyDef, Enemy } from './enemy';
import { sprites2 } from '../art/creatures2';
import { keepDistance, chase, distToPlayer } from './ai';
import { angleTo, dist2 } from '../core/math';
import { moveBody } from '../rooms/collide';
import { TILE } from '../core/constants';
import { telegraph } from '../bosses/boss';
import type { World } from '../game/world';

const inside = (w: World) => ({ x0: w.room.ox + TILE, y0: w.room.oy + TILE, x1: w.room.ox + (w.room.cols - 1) * TILE, y1: w.room.oy + (w.room.rows - 1) * TILE });

// ------------------------------------------------------------------ Sluice Keeper (environment)
// Hunches by a wall with an iron wheel. It turns the wheel (a creak; a trickle marks a band of
// floor through where you stand, across or down the room), then the sluice opens: for a few seconds
// a current runs along that band and carries anything walking in it. Answer: step out of the band
// while it trickles; fight across the current, not in it.
export interface Flow { horiz: boolean; at: number; half: number; dir: 1 | -1; warn: number; t: number; dur: number }
const sluicekeeper: EnemyDef = {
  id: 'sluicekeeper', name: 'Sluice Keeper', desc: 'Turns its wheel and a band of floor starts to trickle; then a current runs along it and carries you. Step out of the band in time.',
  hp: 18, r: 8, speed: 26, role: 'special', cost: 1.4, hitY: 10, gore: '#4a6a5a', goreDecal: '#1e2a24', cast: { max: 1 },
  sprites: () => sprites2('sluicekeeper'),
  init(e) { e.anim = 'walk'; e.cd = 2 + Math.random(); },
  update(e, w, dt) {
    const f = e.data.flow as Flow | null | undefined;
    if (f) {
      f.t += dt;
      if (f.t > f.warn) {
        // the current: carries the player and anything walking along the band
        const b = inside(w), inBand = (x: number, y: number) => Math.abs((f.horiz ? y : x) - f.at) < f.half;
        const push = 85 * dt * f.dir;
        const pl = w.player;
        if (!pl.dead && !pl.flight && inBand(pl.x, pl.y)) moveBody(w.room, pl, f.horiz ? push : 0, f.horiz ? 0 : push, 'walk', null);
        for (const x of w.enemies) if (x !== e && !x.dead && x.mode === 'walk' && !x.isBoss && !x.def.noKnock && inBand(x.x, x.y)) x.move(w, f.horiz ? push : 0, f.horiz ? 0 : push);
        if (Math.random() < dt * 40) {
          const along = f.horiz ? b.x0 + Math.random() * (b.x1 - b.x0) : b.y0 + Math.random() * (b.y1 - b.y0), across = f.at + (Math.random() - 0.5) * f.half * 2;
          w.fx.burst(f.horiz ? along : across, f.horiz ? across : along, 1, 1, '#9ad0e8', 0, 0.4, 1, 0);
        }
      }
      if (f.t > f.warn + f.dur) e.data.flow = null;
    }
    if (e.state === 'idle') {
      keepDistance(e, w, 110, 180, e.def.speed * e.spd(), dt); e.setAnim('walk'); e.animate(dt, 4); e.flip = w.player.x < e.x;
      e.cd -= dt;
      if (e.cd <= 0 && !e.data.flow) {
        e.setState('turn'); e.setAnim('turn');
        const horiz = Math.random() < 0.5;
        const pl = w.player;
        e.data.flow = { horiz, at: horiz ? pl.y : pl.x, half: TILE * 1.1, dir: (horiz ? (pl.x < e.x ? -1 : 1) : (pl.y < e.y ? -1 : 1)) as 1 | -1, warn: 0.9, t: 0, dur: 2.6 } as Flow;
        w.audio.play('creak', { x: e.x, vol: 0.5 });
      }
    } else if (e.state === 'turn') {
      e.sx = 1 + Math.sin(e.st * 18) * 0.05; e.animate(dt, 9);
      if (e.st > 0.9) { e.setState('idle'); e.cd = 5.5 + Math.random() * 1.5; w.audio.play('splash', { x: e.x, vol: 0.5 }); }
    }
  },
  onDeath(e) { e.data.flow = null; },
};

// ------------------------------------------------------------------ Bilge Priest (support)
// Keeps away from you. When one of the others falls nearby it goes to the body, raises its hooked
// staff and chants: the spot bubbles and a ring marks it. After a little over a second the creature
// stands up again at half strength (once per creature; twice per priest). Standing on the spot breaks
// the rite and staggers the priest. Answer: break the rite, or kill it first.
const priest: EnemyDef = {
  id: 'bilgepriest', name: 'Bilge Priest', desc: 'Chants over the fallen and raises them again. Stand on the spot it is chanting over to break the rite, or kill it first.',
  hp: 16, r: 6, speed: 34, role: 'special', cost: 1.6, hitY: 14, gore: '#3a5a8a', goreDecal: '#1a2a40', cast: { max: 1, company: 2 },
  sprites: () => sprites2('bilgepriest'),
  init(e) { e.anim = 'idle'; e.data.raised = 0; },
  update(e, w, dt) {
    const deaths = w.recentDeaths.filter((d) => !d.taken && d.room === w.room.id && w.time - d.t < 6 && dist2(d.x, d.y, e.x, e.y) < 220 * 220);
    if (e.state === 'idle') {
      e.setAnim('idle'); e.animate(dt, 4); e.flip = w.player.x < e.x;
      const target = e.data.raised < 2 ? deaths[0] : undefined;
      if (target && distToPlayer(e, w) > 40) {
        if (dist2(target.x, target.y, e.x, e.y) > 22 * 22) chase(e, w, e.def.speed * 1.3 * e.spd(), dt, target.x, target.y);
        else { target.taken = true; e.data.rite = target; e.setState('rite'); e.setAnim('cast'); telegraph(w, target.x, target.y, 16, 1.25, '#5aa0ff'); w.audio.play('chant', { x: e.x, vol: 0.5 }); }
      } else keepDistance(e, w, 110, 170, e.def.speed * e.spd(), dt);
      e.sy = 1 + Math.sin(e.t * 3) * 0.03;
    } else if (e.state === 'rite') {
      e.animate(dt, 8);
      const r = e.data.rite as { id: string; x: number; y: number };
      if (Math.random() < dt * 25) w.fx.burst(r.x + (Math.random() - 0.5) * 16, r.y, 2, 1, '#5aa0ff', 30, 0.5, 1, -40);
      if (dist2(w.player.x, w.player.y, r.x, r.y) < 22 * 22) {
        // broken: the player stands on the spot
        e.setState('stagger'); e.setAnim('idle'); e.data.rite = null; e.flash = 0.2;
        w.fx.ring(r.x, r.y, 4, 22, '#c0d8ff', 0.25); w.audio.play('tink', { x: r.x, vol: 0.5, pitch: 0.6 }); w.fx.stars(e.x, e.y - 22, 3, '#ffe070');
      } else if (e.st > 1.25) {
        const k = w.spawnEnemy(r.id, r.x, r.y, true);
        if (k) { k.hp = k.maxHp * 0.5; k.data.revived = true; k.noDrop = true; k.spawnT = 0.4; w.fx.ring(r.x, r.y, 4, 26, '#5aa0ff', 0.35); w.audio.play('hatch', { x: r.x, vol: 0.5, pitch: 0.7 }); }
        e.data.raised++; e.data.rite = null; e.setState('idle'); e.cd = 2;
      }
    } else if (e.state === 'stagger') {
      e.x += Math.sin(e.st * 40) * 0.3;
      if (e.st > 0.9) e.setState('idle');
    }
  },
};

// ------------------------------------------------------------------ Fumarole (zoning)
// A crack in the floor. Every few seconds it glows and bubbles, then belches a slow cloud of sewer
// gas that drifts after you for several seconds (at most three out at once). Answer: keep moving
// and kill the vent; the clouds are slower than you.
const fumarole: EnemyDef = {
  id: 'fumarole', name: 'Fumarole', desc: 'A crack that bubbles, then belches slow clouds of gas that drift after you. They are slower than you; kill the crack.',
  hp: 18, r: 8, speed: 0, role: 'turret', cost: 1.3, hitY: 4, mass: 99, noKnock: true, gore: '#6aa040', goreDecal: '#2a3a1a', cast: { max: 2 }, spawnQuiet: true,
  sprites: () => sprites2('fumarole'),
  init(e) { e.cd = 1.8 + Math.random(); e.data.clouds = []; },
  update(e, w, dt) {
    e.data.clouds = (e.data.clouds as { active: boolean }[]).filter((p) => p.active);
    e.cd -= dt;
    e.setAnim(e.cd < 0.7 ? 'hot' : 'idle'); e.animate(dt, e.cd < 0.7 ? 12 : 4);
    if (e.cd < 0.7 && Math.random() < dt * 20) w.fx.burst(e.x + (Math.random() - 0.5) * 10, e.y, 3, 1, '#a8e070', 30, 0.5, 1, -50);
    if (e.cd <= 0) {
      e.cd = 3.6;
      if (e.data.clouds.length < 3 && w.roomTime > 1) {
        const p = w.proj.enemy(e.x, e.y - 4, angleTo(e.x, e.y, w.player.x, w.player.y), 30, { r: 8, shape: 'spore', homing: 0.6, life: 7, range: 999, z: 6 });
        if (p) e.data.clouds.push(p);
        w.audio.play('bubble', { x: e.x, vol: 0.5 });
        e.sy = 1.3; e.sx = 0.85;
      }
    }
  },
};

export const UNDER2_ENEMIES: EnemyDef[] = [sluicekeeper, priest, fumarole];
void (null as unknown as Enemy);
