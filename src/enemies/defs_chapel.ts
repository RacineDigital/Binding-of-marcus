// Chapter VI enemies: choir, censers, penitents and cherub moths.
import type { EnemyDef } from './enemy';
import { frames, ramp, hex, glowEye, eye } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, distToPlayer, keepDistance, buzz } from './ai';
import { TAU, angleTo } from '../core/math';

const choirboy: EnemyDef = {
  id: 'choirboy', name: 'Choir Boy', desc: 'Floats and sings. Its notes wave through the air.', hp: 14, r: 7, speed: 30, flying: true, role: 'shooter', cost: 1.6, hitY: 16,
  gore: '#e8e0f0',
  sprites: () => {
    const paint = (p: any, f: number, sing: boolean) => {
      const robe = ramp('#e8e4f0'), red = ramp('#a02a3a'), s = ramp('#e8c8b0');
      p.poly([4, 26, 6, 13, 14, 13, 16, 26], red[2]); p.shadeV(4, 13, 12, 13, red, 0.5);
      p.poly([5, 20, 7, 12, 13, 12, 15, 20], robe[3]); p.shadeV(5, 12, 10, 8, robe, 0.4);
      p.ball(10, 8, 4.5, 4.5, s); p.ball(10, 5, 4.5, 2.5, ramp('#e8c050'));
      p.set(8, 8, '#2a1a1a'); p.set(12, 8, '#2a1a1a');
      if (sing) p.ball(10, 11, 1.4, 1.8, ramp('#3a0a10')); else p.set(10, 11, '#8a4a4a');
      p.ring(10, 1, 3, '#f0d070');
      for (let i = 0; i < 3; i++) p.set(4 + i * 6, 27 + ((i + f) % 2), robe[2]);
    };
    return { idle: frames(20, 30, 2, (p, f) => paint(p, f, false)), sing: frames(20, 30, 1, (p) => paint(p, 0, true)) };
  },
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
  sprites: () => ({
    idle: frames(16, 22, 1, (p) => {
      const b = ramp('#c8a04a');
      p.ball(8, 14, 6, 6, b, { dither: 0.5 }); p.rect(2, 13, 12, 1, b[1]);
      for (let x = 4; x < 13; x += 3) p.set(x, 16, '#3a2a10');
      p.poly([4, 9, 8, 5, 12, 9], b[3]); p.ball(8, 20, 2, 1.5, b);
      p.set(6, 16, '#ffd060'); p.set(10, 17, '#ffd060');
    }),
  }),
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
    ctx.beginPath(); ctx.moveTo(Math.round(e.data.ax - w.camX), Math.round(e.data.ay - w.camY - 80)); ctx.lineTo(sx, ay - 20); ctx.stroke();
    e.sprites.idle[0].draw(ctx, sx, ay, { flash: e.flash > 0 ? 1 : 0 });
  },
};

const penitent: EnemyDef = {
  id: 'penitent', name: 'Penitent', desc: 'While it kneels in prayer nothing can hurt it. When it rises, it throws candles.', hp: 22, r: 8, speed: 36, role: 'heavy', cost: 1.8, hitY: 14, mass: 2,
  gore: '#5a4a5a',
  sprites: () => {
    const paint = (p: any, f: number, kneel: boolean) => {
      const robe = ramp('#4a3a4a');
      const top = kneel ? 10 : 4;
      p.poly([4, 27, 6, top + 8, 16, top + 8, 18, 27], robe[2]); p.shadeV(4, top + 8, 14, 19 - (kneel ? 6 : 0), robe, 0.5);
      p.poly([6, top + 9, 11, top, 16, top + 9], robe[3]);
      p.ball(11, top + 6, 3, 3, ramp('#0a0608'));
      glowEye(p, 10, top + 6, kneel ? '#fff0a0' : '#ff4040');
      if (!kneel) { const st = f % 2; p.rect(7 + st, 26, 2, 2, robe[0]); p.rect(14 - st, 26, 2, 2, robe[0]); }
      else { p.tube(8, top + 12, 11, top + 9, 1.2, robe); p.tube(14, top + 12, 11, top + 9, 1.2, robe); }
    };
    return { walk: frames(22, 28, 2, (p, f) => paint(p, f, false)), kneel: frames(22, 28, 1, (p) => paint(p, 0, true)) };
  },
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
  sprites: () => ({
    idle: frames(22, 20, 4, (p, f) => {
      const w = ramp('#c8a8c8'); const flap = [0, 2, 4, 2][f];
      p.poly([11, 10, 1, 4 + flap, 3, 15, 10, 14], w[2]); p.poly([11, 10, 21, 4 + flap, 19, 15, 12, 14], w[3]);
      eye(p, 5, 9 + flap * 0.4, 1.8, 0, 0, '#3a1a3a'); eye(p, 17, 9 + flap * 0.4, 1.8, 0, 0, '#3a1a3a');
      p.ball(11, 10, 4.5, 4.5, ramp('#f0e8e0'));
      p.set(9, 10, '#2a2a3a'); p.set(13, 10, '#2a2a3a'); p.set(11, 12, '#c86a7a'); p.set(9, 11, '#e8b0b0'); p.set(13, 11, '#e8b0b0');
      p.line(10, 5, 9, 2, w[1]); p.line(12, 5, 13, 2, w[1]);
    }),
  }),
  init(e) { e.cd = 2 + Math.random(); },
  update(e, w, dt) {
    buzz(e, w, e.def.speed, dt, 0.4); e.animate(dt, 12); e.z = 8;
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = 2.4 + Math.random(); shoot(e, w, aimAngle(e, w), 80, { homing: 0.6, shape: 'dark', r: 3.5, range: 300 }); w.audio.play('flute', { x: e.x, vol: 0.3, pitch: 1.6 }); }
  },
};

export const CHAPEL_ENEMIES: EnemyDef[] = [choirboy, censer, penitent, cherubmoth];
void ringShot; void distToPlayer; void angleTo; void hex;
