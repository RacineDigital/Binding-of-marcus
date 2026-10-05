// Chapter IV enemies: the forgotten ward's staff and patients.
import type { EnemyDef } from './enemy';
import { frames, eye, teeth, ramp, hex, glowEye, sprinkle, gridFrames } from '../art/creature';
import * as H from '../art/hand/ward';
import { chase, aimAngle, shoot, spreadShot, ringShot, distToPlayer, keepDistance, randomFloorPoint, wander } from './ai';
import { TAU, angleTo, clamp, dist } from '../core/math';
import { telegraph } from '../bosses/boss';

const orderly: EnemyDef = {
  id: 'orderly', name: 'Night Orderly', desc: 'Walks toward you, fades out, and steps back in closer than before.', hp: 18, r: 7, speed: 38, role: 'melee', cost: 1.6, hitY: 14,
  gore: '#a8c0b8',
  sprites: () => ({ walk: gridFrames(H.ORDERLY, H.ORDERLY_PAL) }),
  init(e) { e.anim = 'walk'; e.cd = 2.5 + Math.random(); },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.alpha = Math.min(1, e.alpha + dt * 3);
      chase(e, w, e.def.speed, dt); e.animate(dt, 5);
      e.cd -= dt;
      if (e.cd <= 0) {
        e.setState('fade');
        const a = angleTo(w.player.x, w.player.y, e.x, e.y) + (Math.random() - 0.5) * 1.5;
        const d = 55;
        e.data.tx = clamp(w.player.x + Math.cos(a) * d, w.room.ox + 12, w.room.ox + w.room.cols * 24 - 12);
        e.data.ty = clamp(w.player.y + Math.sin(a) * d, w.room.oy + 12, w.room.oy + w.room.rows * 24 - 12);
        telegraph(w, e.data.tx, e.data.ty, 10, 0.9, '#a0e0d0');
      }
    } else if (e.state === 'fade') {
      e.alpha = Math.max(0.05, 1 - e.st * 3); e.invuln = e.st > 0.3;
      if (e.st > 0.9) { e.x = e.data.tx; e.y = e.data.ty; e.invuln = false; e.setState('idle'); e.cd = 2.5 + Math.random(); e.alpha = 0.2; }
    }
  },
};

const wheelwraith: EnemyDef = {
  id: 'wheelwraith', name: 'Wheelchair Wraith', desc: 'Spins its wheels, then careens around the room bouncing off the walls.', hp: 18, r: 9, speed: 0, role: 'heavy', cost: 1.7, hitY: 12, mass: 2,
  gore: '#8a8a92',
  sprites: () => ({ idle: gridFrames(H.WRAITH, H.WRAITH_PAL) }),
  init(e) { e.cd = 1 + Math.random(); },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.cd -= dt; e.frame = 0;
      if (e.cd <= 0) { e.setState('spin'); w.audio.play('creak', { x: e.x, vol: 0.4 }); }
    } else if (e.state === 'spin') {
      e.ftime += dt * 30; e.frame = Math.floor(e.ftime) % 4;
      if (e.st > 0.55) { const a = angleTo(e.x, e.y, w.player.x, w.player.y); e.vx = Math.cos(a) * 190; e.vy = Math.sin(a) * 190; e.data.b = 3; e.setState('roll'); }
    } else if (e.state === 'roll') {
      e.ftime += dt * 20; e.frame = Math.floor(e.ftime) % 4;
      const h = e.move(w, e.vx * e.spd() * dt, e.vy * e.spd() * dt);
      e.flip = e.vx < 0;
      if (h.hx) { e.vx = -e.vx; e.data.b--; w.audio.play('thud', { x: e.x, vol: 0.4 }); }
      if (h.hy) { e.vy = -e.vy; e.data.b--; w.audio.play('thud', { x: e.x, vol: 0.4 }); }
      if (e.data.b < 0 || e.st > 3.5) { e.setState('idle'); e.cd = 1.4 + Math.random(); }
    }
  },
};

const nursedoll: EnemyDef = {
  id: 'nursedoll', name: 'Porcelain Nurse', desc: 'Keeps her distance and lobs syringes that land where you were standing.', hp: 12, r: 6, speed: 40, role: 'shooter', cost: 1.5, hitY: 11,
  gore: '#e8e0e0',
  sprites: () => ({ walk: gridFrames(H.NURSE, H.NURSE_PAL) }),
  init(e) { e.anim = 'walk'; e.cd = 1.5 + Math.random(); },
  update(e, w, dt) {
    keepDistance(e, w, 90, 140, e.def.speed, dt); e.animate(dt, 4);
    e.cd -= dt;
    if (e.cd < 0.35 && e.cd + dt >= 0.35) { e.sx = 0.85; e.sy = 1.15; }
    if (e.cd <= 0) {
      e.cd = 2.3 + Math.random() * 0.6;
      const d = clamp(distToPlayer(e, w), 40, 200);
      const a = aimAngle(e, w);
      for (let i = -1; i <= 1; i++) shoot(e, w, a + i * 0.28, d / 0.9, { lob: true, lobH: 40, range: d, shape: 'holy', r: 3 });
      w.audio.play('needle', { x: e.x });
    }
  },
};

const sheetghost: EnemyDef = {
  id: 'sheetghost', name: 'Bedsheet', desc: 'Drifts through walls and rocks toward you, then swoops.', hp: 12, r: 7, speed: 35, flying: true, ghost: true, role: 'flyer', cost: 1.2, hitY: 14,
  gore: '#d8d8e0',
  sprites: () => ({ idle: gridFrames(H.SHEET, H.SHEET_PAL) }),
  init(e) { e.cd = 2 + Math.random() * 2; e.alpha = 0.85; },
  update(e, w, dt) {
    e.animate(dt, 6);
    e.z = 8 + Math.sin(e.t * 2) * 3;
    if (e.state === 'idle') {
      const a = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.sin(e.t) * 0.5;
      e.move(w, Math.cos(a) * e.def.speed * e.spd() * dt, Math.sin(a) * e.def.speed * e.spd() * dt);
      e.cd -= dt;
      if (e.cd <= 0) { e.setState('swoop'); e.data.a = angleTo(e.x, e.y, w.player.x, w.player.y); e.sy = 1.2; }
    } else if (e.state === 'swoop') {
      const s = e.st < 0.3 ? -30 : 170;
      e.move(w, Math.cos(e.data.a) * s * e.spd() * dt, Math.sin(e.data.a) * s * e.spd() * dt);
      if (e.st > 1) { e.setState('idle'); e.cd = 2.5 + Math.random() * 1.5; }
    }
    e.flip = w.player.x < e.x;
  },
};

const mimic: EnemyDef = {
  id: 'mimic', name: 'Mimic Chest', desc: 'Not every box is a gift. It twitches when you get close.', hp: 22, r: 8, speed: 0, role: 'special', cost: 1.6, hitY: 8, mass: 2,
  gore: '#8a6a3a', contact: 1, spawnQuiet: true,
  sprites: () => ({ shut: gridFrames(H.MIMIC_SHUT, H.MIMIC_PAL), open: gridFrames(H.MIMIC_OPEN, H.MIMIC_PAL) }),
  init(e) { e.anim = 'shut'; e.spawnT = 0; e.data.noClear = false; },
  update(e, w, dt) {
    const d = distToPlayer(e, w);
    if (e.state === 'idle') {
      e.anim = 'shut';
      if (d < 70) { e.x += Math.sin(e.t * 50) * 0.3; }
      if (d < 38 || e.hp < e.maxHp) { e.setState('bite'); e.setAnim('open'); w.audio.play('bossRoar', { x: e.x, vol: 0.4, pitch: 1.6 }); }
    } else if (e.state === 'bite') {
      e.animate(dt, 10);
      chase(e, w, 85, dt);
      if (e.st > 3) { e.setState('rest'); e.setAnim('open'); }
    } else if (e.state === 'rest') { e.frame = 1; if (e.st > 1.2) { e.setState('bite'); } }
  },
};

const dripsentinel: EnemyDef = {
  id: 'dripsentinel', name: 'Drip Sentinel', desc: 'An IV stand that walks. It leaves a sickly trail and spits from its bag.', hp: 20, r: 7, speed: 26, role: 'heavy', cost: 1.5, hitY: 16, mass: 2,
  gore: '#8ac04a',
  sprites: () => ({ walk: gridFrames(H.DRIP, H.DRIP_PAL) }),
  init(e) { e.anim = 'walk'; e.cd = 2; e.data.cr = 0; },
  update(e, w, dt) {
    chase(e, w, e.def.speed, dt); e.animate(dt, 5);
    e.data.cr -= dt;
    if (e.data.cr <= 0) { e.data.cr = 0.35; w.addCreep(e.x, e.y + 2, 9, 'enemy', 1, 3.5, '#6a9a2a'); }
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = 3; const d = clamp(distToPlayer(e, w), 40, 180); shoot(e, w, aimAngle(e, w), d / 1, { lob: true, lobH: 50, range: d, shape: 'spore', creep: '#6a9a2a', r: 4 }); w.audio.play('spit', { x: e.x }); }
  },
};

export const WARD_ENEMIES: EnemyDef[] = [orderly, wheelwraith, nursedoll, sheetghost, mimic, dripsentinel];
void eye; void teeth; void sprinkle; void spreadShot; void ringShot; void randomFloorPoint; void wander; void dist; void TAU;
