// Chapter VI enemies: choir, censers, penitents and cherub moths.
import { sprites2 } from '../art/creatures2';
import type { EnemyDef } from './enemy';
import { snap } from '../render/snap';
import { frames, ramp, hex, glowEye, eye, gridFrames } from '../art/creature';
import * as H from '../art/hand/chapel';
import { chase, aimAngle, shoot, spreadShot, ringShot, distToPlayer, keepDistance, buzz } from './ai';
import { TAU, angleTo } from '../core/math';

const choirboy: EnemyDef = {
  id: 'choirboy', name: 'Choir Boy', desc: 'Floats and sings. Its notes wave through the air.', hp: 14, r: 7, speed: 30, flying: true, role: 'shooter', cost: 1.6, hitY: 16,
  gore: '#e8e0f0',
  sprites: () => ({ idle: gridFrames(H.CHOIR_IDLE, H.CHOIR_PAL), sing: gridFrames(H.CHOIR_SING, H.CHOIR_PAL) }),
  init(e) { e.cd = 1.5 + Math.random(); e.anim = 'idle'; },
  update(e, w, dt) {
    keepDistance(e, w, 80, 140, e.def.speed, dt);
    e.z = 6 + Math.sin(e.t * 2.4) * 3;
    e.cd -= dt;
    if (e.cd < 0.8) e.setAnim('sing'); else { e.setAnim('idle'); e.animate(dt, 3); }
    if (e.cd < 0.8 && e.cd > 0) {
      const n = Math.floor((0.8 - e.cd) / 0.2);
      if (n > (e.data.n ?? -1)) { e.data.n = n; shoot(e, w, aimAngle(e, w), 100, { wig: 14, shape: 'holy', r: 3.5 }); w.audio.play('flute', { x: e.x, vol: 0.4, pitch: 1 + n * 0.12 }); }
    }
    if (e.cd <= 0) { e.cd = 2.6 + Math.random(); e.data.n = -1; }
  },
};

const censer: EnemyDef = {
  id: 'censer', name: 'Swinging Censer', desc: 'Hangs from nothing and swings, puffing smoke in a slow spiral.', hp: 20, r: 7, speed: 0, flying: true, role: 'turret', cost: 1.7, hitY: 18, mass: 99, noKnock: true,
  gore: '#c8a04a', light: [40, '#ffb050'],
  sprites: () => sprites2('censer'),
  init(e) { e.data.ax = e.x; e.data.ay = e.y; e.cd = 0.5; e.data.spin = Math.random() * TAU; },
  update(e, w, dt) {
    const sw = Math.sin(e.t * 1.6) * 0.9;
    e.x = e.data.ax + Math.sin(sw) * 30; e.y = e.data.ay + (1 - Math.cos(sw)) * 10; e.z = 16;
    e.data.spin += dt * 1.4;
    e.cd -= dt;
    if (Math.random() < dt * 6) w.fx.smoke(e.x, e.y - 20, 1, 'rgba(200,190,200,', 2, 1, 10);
    if (e.cd <= 0) { e.cd = 0.35; shoot(e, w, e.data.spin, 70, { shape: 'holy', r: 3.5, range: 170 }); if (w.run.floorIndex >= 6) shoot(e, w, e.data.spin + Math.PI, 70, { shape: 'holy', r: 3.5, range: 170 }); }
  },
  draw(e, ctx, w, sx, sy) {
    const ay = sy - e.z;
    ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(snap(e.data.ax - w.camX), snap(e.data.ay - w.camY - 80)); ctx.lineTo(sx, ay - 20); ctx.stroke();
    e.sprites.idle[Math.floor(w.time * 6 + e.id) % e.sprites.idle.length].draw(ctx, sx, ay, { flash: e.flash > 0 ? 1 : 0 });
  },
};

const penitent: EnemyDef = {
  id: 'penitent', name: 'Penitent', desc: 'While it kneels in prayer nothing can hurt it. When it rises, it throws candles.', hp: 22, r: 8, speed: 36, role: 'heavy', cost: 1.8, hitY: 14, mass: 2,
  gore: '#5a4a5a',
  sprites: () => ({ walk: gridFrames(H.PEN_WALK, H.PEN_PAL), kneel: gridFrames(H.PEN_KNEEL, H.PEN_PAL) }),
  init(e) { e.anim = 'kneel'; e.setState('pray'); },
  update(e, w, dt) {
    if (e.state === 'pray') {
      e.invuln = true; e.setAnim('kneel');
      if (Math.random() < dt * 4) w.fx.stars(e.x, e.y - 20, 1, '#fff0a0', 20);
      if (e.st > 2.2) { e.invuln = false; e.setState('walk'); e.setAnim('walk'); e.cd = 0.6; }
    } else if (e.state === 'walk') {
      chase(e, w, e.def.speed, dt); e.animate(dt, 4);
      e.cd -= dt;
      if (e.cd <= 0) { e.cd = 1.2; spreadShot(e, w, 3, aimAngle(e, w), 0.5, 115, { shape: 'ember', r: 3.5 }); w.audio.play('fireSpit', { x: e.x, vol: 0.4 }); }
      if (e.st > 3.5) e.setState('pray');
    }
  },
  onHurt(e, w, dmg) { if (e.state === 'pray') { w.fx.sparks(e.x, e.y - 14, 3, '#fff0a0', 60); return 0; } return dmg; },
};

const cherubmoth: EnemyDef = {
  id: 'cherubmoth', name: 'Cherub Moth', desc: 'A moth with a painted porcelain face. Its shots slowly turn to follow you.', hp: 12, r: 6, speed: 55, flying: true, role: 'flyer', cost: 1.4, hitY: 14,
  gore: '#d8c8b8',
  sprites: () => ({ idle: gridFrames(H.CHERUB, H.CHERUB_PAL) }),
  init(e) { e.cd = 2 + Math.random(); },
  update(e, w, dt) {
    buzz(e, w, e.def.speed, dt, 0.4); e.animate(dt, 12); e.z = 8;
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = 2.4 + Math.random(); shoot(e, w, aimAngle(e, w), 80, { homing: 0.6, shape: 'dark', r: 3.5, range: 300 }); w.audio.play('flute', { x: e.x, vol: 0.3, pitch: 1.6 }); }
  },
};

export const CHAPEL_ENEMIES: EnemyDef[] = [choirboy, censer, penitent, cherubmoth];
void ringShot; void distToPlayer; void angleTo; void hex;
