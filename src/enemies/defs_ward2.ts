// Chapter IV creatures added in 2.0, each filling a role the ward lacked:
//   Spilled Pills (swarm: rolling capsules that bounce), Monitor (turret: a sine-wave stream),
//   Mourner (support: tethers one ally and makes it untouchable until the Mourner is hit).
import type { EnemyDef, Enemy } from './enemy';
import { sprites2 } from '../art/creatures2';
import { keepDistance, chase, distToPlayer, aimAngle, shoot } from './ai';
import { angleTo, dist2 } from '../core/math';
import type { World } from '../game/world';

// ------------------------------------------------------------------ Spilled Pills (swarm)
// Little capsules spilled from a tray. Each rolls in a straight line and bounces off walls and
// rocks; every couple of seconds it wobbles (the tell) and turns toward you. Answer: read the lines,
// step across them; one hit pops one.
const pill: EnemyDef = {
  id: 'pill', name: 'Spilled Pills', desc: 'Capsules that roll in straight lines and bounce off walls. They wobble before they turn toward you.',
  hp: 4, r: 4, speed: 78, role: 'swarm', cost: 0.35, hitY: 4, gore: '#e8e0d8', goreDecal: '#b04848', contact: 1,
  sprites: () => sprites2('pill'),
  init(e) { e.anim = 'roll'; e.data.a = Math.random() * Math.PI * 2; e.cd = 1 + Math.random() * 1.5; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      const s = e.def.speed * e.spd() * (e.fear > 0 ? -1 : 1);
      const h = e.move(w, Math.cos(e.data.a) * s * dt, Math.sin(e.data.a) * s * dt);
      if (h.hx) e.data.a = Math.PI - e.data.a;
      if (h.hy) e.data.a = -e.data.a;
      e.animate(dt, 10); e.flip = Math.cos(e.data.a) < 0;
      e.cd -= dt;
      if (e.cd <= 0) e.setState('wobble');
    } else if (e.state === 'wobble') {
      e.x += Math.sin(e.st * 60) * 0.5;
      if (e.st > 0.3) { e.data.a = angleTo(e.x, e.y, w.player.x, w.player.y) + (Math.random() - 0.5) * 0.3; e.setState('idle'); e.cd = 1.8 + Math.random() * 1.2; }
    }
  },
};

// ------------------------------------------------------------------ Monitor (turret)
// A heart monitor on a stand. Its trace speeds up and the screen flashes red (the tell), then it
// sends a stream of six blips at you that weave in a sine wave, every blip on the same path.
// Answer: the weave is a lane: step out of it sideways; it is defenceless between streams.
const monitor: EnemyDef = {
  id: 'monitor', name: 'Monitor', desc: 'Its screen flashes red, then it sends a weaving stream of blips that all follow one path. Step out of the lane.',
  hp: 18, r: 7, speed: 0, role: 'turret', cost: 1.4, hitY: 16, mass: 99, noKnock: true, gore: '#4a5a5a', goreDecal: '#1a2424', cast: { max: 2 },
  sprites: () => sprites2('monitor'),
  init(e) { e.cd = 1.5 + Math.random(); },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.setAnim('idle'); e.animate(dt, 5); e.cd -= dt;
      if (e.cd <= 0) { e.setState('alarm'); e.data.a = aimAngle(e, w); w.audio.play('beep', { x: e.x, vol: 0.4 }); }
    } else if (e.state === 'alarm') {
      e.setAnim('alarm'); e.frame = Math.floor(e.st * 10) % 2;
      if (e.st > 0.6) { e.setState('stream'); e.data.n = 0; e.data.a = angleTo(e.x, e.y, w.player.x, w.player.y); }
    } else if (e.state === 'stream') {
      e.setAnim('stream'); e.animate(dt, 10);
      const want = 1 + Math.floor(e.st / 0.12);
      while (e.data.n < Math.min(6, want)) { e.data.n++; shoot(e, w, e.data.a, 120, { wig: 16, shape: 'water', r: 3.2 }); w.audio.play('beep', { x: e.x, vol: 0.25, pitch: 1.4 }); }
      if (e.data.n >= 6 && e.st > 0.8) { e.setState('idle'); e.cd = 2.4 + Math.random() * 0.6; }
    }
  },
};

// ------------------------------------------------------------------ Mourner (support / shield)
// A veiled visitor. It goes to the nearest of the others, kneels (a pale thread draws out), and while
// it kneels that one cannot be hurt. Hit the Mourner and it flinches: the thread snaps for a while.
// Kill it and its charge is free. Answer: shoot the Mourner first, or at least make it flinch.
const mourner: EnemyDef = {
  id: 'mourner', name: 'Mourner', desc: 'Kneels beside one of the others and holds it: while the pale thread holds, that one cannot be hurt. Hit the Mourner to break it.',
  hp: 16, r: 6, speed: 34, role: 'special', cost: 1.6, hitY: 12, gore: '#c8c0d0', goreDecal: '#4a4458', cast: { max: 1, company: 1 },
  sprites: () => sprites2('mourner'),
  init(e) { e.anim = 'stand'; e.data.ward = null; },
  update(e, w, dt) {
    const ward = e.data.ward as Enemy | null;
    if (ward && (ward.dead || e.state !== 'kneel')) release(e);
    if (e.state === 'idle') {
      e.setAnim('stand'); e.animate(dt, 3);
      const cands = w.enemies.filter((x) => x !== e && !x.dead && !x.isBoss && !x.friendly && x.spawnT <= 0 && x.def.id !== 'mourner' && !x.data.tetherBy && !x.invuln);
      const t = cands.sort((a, b) => dist2(a.x, a.y, e.x, e.y) - dist2(b.x, b.y, e.x, e.y))[0];
      if (t && (e.data.flinch ?? 0) <= 0) {
        if (dist2(t.x, t.y, e.x, e.y) > 28 * 28) chase(e, w, e.def.speed * e.spd(), dt, t.x, t.y);
        else { e.setState('kneel'); e.setAnim('kneel'); e.data.ward = t; t.data.tetherBy = e; w.audio.play('chant', { x: e.x, vol: 0.3, pitch: 1.5 }); }
      } else keepDistance(e, w, 90, 150, e.def.speed * e.spd(), dt);
      e.data.flinch = (e.data.flinch ?? 0) - dt;
      e.flip = w.player.x < e.x;
    } else if (e.state === 'kneel') {
      e.animate(dt, 5);
      const t = e.data.ward as Enemy | null;
      if (!t) { e.setState('idle'); return; }
      // it holds its charge while it stays near; if the charge walks off, it follows
      t.invuln = e.st > 0.5;
      if (dist2(t.x, t.y, e.x, e.y) > 60 * 60) { release(e); e.setState('idle'); }
    }
  },
  onHurt(e, w, dmg) {
    if (e.state === 'kneel') { release(e); e.setState('idle'); e.data.flinch = 1.5; e.flash = 0.2; w.audio.play('tink', { x: e.x, vol: 0.4, pitch: 0.7 }); }
    return dmg;
  },
  onDeath(e) { release(e); },
};
function release(e: Enemy): void {
  const t = e.data.ward as Enemy | null;
  if (t) { t.invuln = false; t.data.tetherBy = null; }
  e.data.ward = null;
}

export const WARD2_ENEMIES: EnemyDef[] = [pill, monitor, mourner];
void distToPlayer; void (null as unknown as World);
