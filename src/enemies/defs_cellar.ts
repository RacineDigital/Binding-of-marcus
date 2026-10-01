// Chapter I enemies: the cellar's mites, moths, crawlers and nests.
import { EnemyDef, Enemy } from './enemy';
import { gridFrames, scaledFrames, glowEye } from '../art/creature';
import * as H from '../art/hand/cellar';
import { chase, buzz, wander, aimAngle, shoot, spreadShot, hasLOS, aligned, distToPlayer, ringShot } from './ai';
import { TAU, angleTo, clamp } from '../core/math';
import type { World } from '../game/world';

const mite: EnemyDef = {
  id: 'mite', name: 'Ink Mite', desc: 'Buzzes in erratic loops. Harmless alone.', hp: 3, r: 4, speed: 58, flying: true, role: 'swarm', cost: 0.35, hitY: 8,
  gore: '#2a2458', contact: 1,
  sprites: () => ({ idle: gridFrames(H.MITE, H.MITE_PAL) }),
  init(e) { e.anim = 'idle'; },
  update(e, w, dt) { buzz(e, w, e.def.speed, dt, 0.55); e.animate(dt, 18); },
};

const moth: EnemyDef = {
  id: 'moth', name: 'Dust Moth', desc: 'Flutters after you in lazy waves. Sheds choking dust when struck.', hp: 9, r: 6, speed: 42, flying: true, role: 'flyer', cost: 1, hitY: 12,
  gore: '#a89a7a',
  sprites: () => { const [up, dn] = gridFrames(H.MOTH, H.MOTH_PAL, 19); return { idle: [up, up, dn, dn] }; },
  update(e, w, dt) {
    const a = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.sin(e.t * 2.2 + e.id) * 0.9;
    const s = e.def.speed * e.spd() * (e.fear > 0 ? -1 : 1);
    e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
    e.z = 4 + Math.sin(e.t * 5) * 2;
    e.flip = w.player.x < e.x;
    e.animate(dt, 10);
  },
  onHurt(e, w) { if (Math.random() < 0.5) w.fx.smoke(e.x, e.y - 10, 2, 'rgba(180,165,130,', 4, 0.6, 4); },
};

const ragcrawler: EnemyDef = {
  id: 'ragcrawler', name: 'Rag Crawler', desc: 'A bundle of rags that learned to pull itself along. Lurches in bursts.', hp: 11, r: 7, speed: 44, role: 'melee', cost: 1, hitY: 8,
  gore: '#6a4a3a',
  sprites: () => ({ walk: gridFrames(H.RAG, H.RAG_PAL) }),
  init(e) { e.anim = 'walk'; },
  update(e, w, dt) {
    const pulse = 0.35 + Math.max(0, Math.sin(e.t * 5.5)) * 1.3;
    chase(e, w, e.def.speed * pulse, dt);
    e.animate(dt, 6 + pulse * 4);
  },
};

const gasper: EnemyDef = {
  id: 'gasper', name: 'Gasper', desc: 'A wheezing sack on stubby legs. Swells up before it spits.', hp: 13, r: 8, speed: 30, role: 'shooter', cost: 1.5, hitY: 11,
  gore: '#8a2a3a',
  sprites: () => ({
    idle: scaledFrames(H.GAS, H.GAS_PAL, [[1, 1], [1.03, 0.97]]),
    charge: scaledFrames(H.GAS, H.GAS_PAL, [[1.03, 1.03], [1.07, 1.05], [1.12, 1.08]]),
    spit: scaledFrames(H.GAS, H.GAS_PAL, [[1.12, 0.86]]),
  }),
  init(e) { e.anim = 'idle'; e.cd = 1 + Math.random(); },
  update(e, w, dt) {
    if (e.state === 'idle') {
      wander(e, w, e.def.speed, dt, 1.6);
      e.animate(dt, 4);
      e.cd -= dt;
      if (e.cd <= 0 && distToPlayer(e, w) < 200 && hasLOS(e, w)) { e.setState('charge'); e.setAnim('charge'); }
    } else if (e.state === 'charge') {
      e.animate(dt, 6, false);
      e.flip = w.player.x < e.x;
      if (e.st > 0.55) {
        const a = aimAngle(e, w);
        if (w.run.floorIndex === 0) shoot(e, w, a, 135);
        else spreadShot(e, w, 3, a, 0.4, 140);
        w.audio.play('spit', { x: e.x });
        e.sx = 1.3; e.sy = 0.75;
        e.setState('spit'); e.setAnim('spit');
      }
    } else if (e.state === 'spit') {
      if (e.st > 0.35) { e.setState('idle'); e.setAnim('idle'); e.cd = 1.6 + Math.random(); }
    }
  },
};

const dripling: EnemyDef = {
  id: 'dripling', name: 'Dripling', desc: 'A one-eyed blot that hops toward you. Watch it crouch.', hp: 11, r: 7, speed: 0, role: 'melee', cost: 1.2, hitY: 8,
  gore: '#2a2e70', goreDecal: '#1e2050',
  sprites: () => ({
    idle: scaledFrames(H.DRIP, H.DRIP_PAL, [[1, 1]]),
    crouch: scaledFrames(H.DRIP, H.DRIP_PAL, [[1.18, 0.78]]),
    air: scaledFrames(H.DRIP, H.DRIP_PAL, [[0.88, 1.12]]),
  }),
  init(e) { e.cd = 0.6 + Math.random() * 0.8; e.anim = 'idle'; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.cd -= dt;
      if (e.cd <= 0) { e.setState('crouch'); e.setAnim('crouch'); }
    } else if (e.state === 'crouch') {
      if (e.st > 0.38) {
        const a = angleTo(e.x, e.y, w.player.x + (Math.random() - 0.5) * 30, w.player.y + (Math.random() - 0.5) * 30);
        const d = clamp(distToPlayer(e, w), 30, 90);
        e.vx = Math.cos(a) * d / 0.55; e.vy = Math.sin(a) * d / 0.55; e.vz = 150;
        if (e.fear > 0) { e.vx = -e.vx; e.vy = -e.vy; }
        e.setState('air'); e.setAnim('air'); e.mode = 'fly';
        w.audio.play('hop', { x: e.x, vol: 0.3 });
      }
    } else if (e.state === 'air') {
      e.vz -= 540 * dt; e.z += e.vz * dt;
      e.move(w, e.vx * e.spd() * dt, e.vy * e.spd() * dt);
      if (e.z <= 0) {
        e.z = 0; e.mode = 'walk'; e.setState('idle'); e.setAnim('idle'); e.cd = 0.5 + Math.random() * 0.6;
        e.sx = 1.35; e.sy = 0.7;
        w.fx.spray(e.x, e.y, 2, 0, TAU, 6, '#2e3480', 50, 0.3, '#1e2050');
        if (w.run.floorIndex >= 2) ringShot(e, w, 4, 110, Math.PI / 4);
        w.audio.play('splat', { x: e.x, vol: 0.35 });
      }
    }
  },
};

const pillbug: EnemyDef = {
  id: 'pillbug', name: 'Pillbug', desc: 'Trundles about until you line up with it, then rears and rolls. Stunned by walls.', hp: 15, r: 7, speed: 26, role: 'melee', cost: 1.5, hitY: 7, mass: 1.5,
  gore: '#5a5a6a',
  sprites: () => ({ walk: gridFrames(H.PILL_WALK, H.PILL_PAL), rear: gridFrames(H.PILL_REAR, H.PILL_PAL), roll: gridFrames(H.PILL_ROLL, H.PILL_PAL) }),
  init(e) { e.anim = 'walk'; e.cd = 1; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      wander(e, w, e.def.speed, dt, 2);
      e.animate(dt, 6);
      e.cd -= dt;
      const al = aligned(e, w, 12);
      if (al !== null && e.cd <= 0 && hasLOS(e, w)) { e.data.dir = al; e.setState('rear'); e.setAnim('rear'); w.audio.play('chitter', { x: e.x, vol: 0.4 }); }
    } else if (e.state === 'rear') {
      e.animate(dt, 12);
      e.x += (Math.random() - 0.5) * 0.8;
      if (e.st > 0.4) { e.setState('roll'); e.setAnim('roll'); }
    } else if (e.state === 'roll') {
      e.animate(dt, 16);
      const s = 200 * e.spd();
      const h = e.move(w, Math.cos(e.data.dir) * s * dt, Math.sin(e.data.dir) * s * dt);
      e.flip = Math.cos(e.data.dir) < 0;
      if (h.hx || h.hy || e.st > 2.2) {
        e.setState('stun'); e.setAnim('walk'); w.shake(1); w.audio.play('thud', { x: e.x });
        w.fx.burst(e.x, e.y, 4, 6, '#8a8a9a', 60, 0.4);
        e.sx = 0.7; e.sy = 1.3;
      }
    } else if (e.state === 'stun') {
      if (e.st > 0.9) { e.setState('idle'); e.cd = 0.8; }
    }
  },
  onHurt(e, w, dmg) { return e.state === 'roll' ? dmg * 0.4 : dmg; },
};

const mitenest: EnemyDef = {
  id: 'mitenest', name: 'Mite Nest', desc: 'A papery hive stuck to the floor. Pulses before each mite hatches.', hp: 22, r: 9, speed: 0, role: 'turret', cost: 2, hitY: 10, mass: 99,
  gore: '#b8a888', noKnock: true,
  sprites: () => ({ idle: gridFrames(H.NEST, H.NEST_PAL) }),
  init(e) { e.cd = 1.5 + Math.random(); e.data.kids = []; },
  update(e, w, dt) {
    e.data.kids = (e.data.kids as Enemy[]).filter((k) => !k.dead);
    e.cd -= dt;
    e.frame = e.cd < 0.5 ? (Math.floor(e.t * 12) % 2) + 1 : 0;
    if (e.cd <= 0) {
      e.cd = 2.8;
      if (e.data.kids.length < 3) {
        const k = w.spawnEnemy('mite', e.x, e.y + 4, true);
        if (k) { k.spawnT = 0.05; k.parent = e; e.data.kids.push(k); k.data.noClear = false; }
        e.sx = 1.2; e.sy = 0.85;
        w.audio.play('hatch', { x: e.x, vol: 0.4 });
      }
    }
  },
};

const spool: EnemyDef = {
  id: 'spool', name: 'Threadspool', desc: 'A wooden spool bristling with pins. Spins up, then flings needles.', hp: 15, r: 7, speed: 0, role: 'turret', cost: 1.4, hitY: 9, mass: 99, noKnock: true,
  gore: '#8a5a3a',
  sprites: () => ({ idle: gridFrames(H.SPOOL, H.SPOOL_PAL) }),
  init(e) { e.cd = 1.2 + Math.random(); e.data.rot = 0; },
  update(e, w, dt) {
    e.cd -= dt;
    const spin = e.cd < 0.6 ? 20 : 4;
    e.ftime += dt * spin; e.frame = Math.floor(e.ftime) % 4;
    if (e.cd <= 0) {
      e.cd = 2.2;
      ringShot(e, w, 4, 125, e.data.rot, { shape: 'bone', r: 2.5 });
      e.data.rot = e.data.rot ? 0 : Math.PI / 4;
      w.audio.play('needle', { x: e.x, vol: 0.4 });
    }
  },
};

const candlewick: EnemyDef = {
  id: 'candlewick', name: 'Candlewick', desc: 'A tallow creature that coughs up little flames. Leaves a fire behind when it dies.', hp: 12, r: 6, speed: 34, role: 'shooter', cost: 1.4, hitY: 12,
  gore: '#e8dcb8', light: [50, '#ffa040'],
  sprites: () => ({ walk: gridFrames(H.CANDLE, H.CAN_PAL) }),
  init(e) { e.cd = 1.5 + Math.random(); e.anim = 'walk'; },
  update(e, w, dt) {
    wander(e, w, e.def.speed, dt, 1.4);
    e.animate(dt, 6);
    e.cd -= dt;
    if (e.cd < 0.4 && e.cd + dt >= 0.4) { e.sx = 0.85; e.sy = 1.2; }
    if (e.cd <= 0 && distToPlayer(e, w) < 180) {
      e.cd = 2.2;
      const a = aimAngle(e, w);
      for (let i = -1; i <= 1; i++) shoot(e, w, a + i * 0.25, 95, { shape: 'ember', r: 3, range: 150 });
      w.audio.play('fireSpit', { x: e.x, vol: 0.4 });
    }
  },
  onDeath(e, w) {
    const [c, r] = w.room.cellAt(e.x, e.y);
    if (w.room.inGrid(c, r) && w.room.at(c, r) === 0) { w.room.setOb(c, r, 6, 6, 0); w.obstacleDirty = true; }
  },
};

export const CELLAR_ENEMIES: EnemyDef[] = [mite, moth, ragcrawler, gasper, dripling, pillbug, mitenest, spool, candlewick];
void Enemy; void glowEye; void (null as unknown as World);
