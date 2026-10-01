// Chapter IV enemies: the forgotten ward's staff and patients.
import type { EnemyDef } from './enemy';
import { frames, eye, teeth, ramp, hex, glowEye, sprinkle } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, distToPlayer, keepDistance, randomFloorPoint, wander } from './ai';
import { TAU, angleTo, clamp, dist } from '../core/math';
import { telegraph } from '../bosses/boss';

const orderly: EnemyDef = {
  id: 'orderly', name: 'Night Orderly', desc: 'Walks toward you, fades out, and steps back in closer than before.', hp: 18, r: 7, speed: 38, role: 'melee', cost: 1.6, hitY: 14,
  gore: '#a8c0b8',
  sprites: () => ({
    walk: frames(18, 32, 4, (p, f) => {
      const c = ramp('#b8d0c8'), s = ramp('#c8b8b0');
      const st = [0, 1, 0, -1][f];
      p.rect(6 + st, 26, 2, 5, c[1]); p.rect(10 - st, 26, 2, 5, c[1]);
      p.poly([4, 27, 5, 11, 13, 11, 14, 27], c[2]); p.shadeV(4, 11, 10, 16, c, 0.6);
      p.line(9, 12, 9, 26, c[1]);
      p.tube(4, 13, 3, 22, 1.2, c); p.tube(14, 13, 15, 22, 1.2, c);
      p.ball(9, 6, 4, 4.5, s); p.rect(5, 2, 8, 2, c[3]);
      p.set(7, 6, '#1a1010'); p.set(11, 6, '#1a1010'); p.rect(8, 9, 2, 1, hex('#6a4a4a'));
    }),
  }),
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
  sprites: () => ({
    idle: frames(26, 28, 4, (p, f) => {
      const m = ramp('#8a8a96'), g = ramp('#c8e0e8');
      p.ring(8, 21, 6, m[3], 1.5); p.ring(19, 22, 4, m[3], 1.2);
      const a = (f / 4) * Math.PI;
      for (let k = 0; k < 2; k++) p.line(8 + Math.cos(a + k * 1.57) * 5, 21 + Math.sin(a + k * 1.57) * 5, 8 - Math.cos(a + k * 1.57) * 5, 21 - Math.sin(a + k * 1.57) * 5, m[2]);
      p.rect(6, 14, 14, 3, m[2]); p.rect(6, 5, 2, 10, m[2]);
      p.ball(14, 9, 5, 6, g, { dither: 0.8 }); p.ball(15, 4, 3.5, 3.5, g);
      glowEye(p, 14, 4, '#30a0c0'); p.set(17, 4, '#30a0c0');
    }),
  }),
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
  sprites: () => ({
    walk: frames(16, 24, 2, (p, f) => {
      const d = ramp('#e8e8f0'), s = ramp('#f0e0d8');
      p.poly([3, 21, 5, 10, 11, 10, 13, 21], d[2]); p.shadeV(3, 10, 10, 11, d, 0.6);
      p.rect(7, 12, 2, 4, hex('#c83a3a')); p.rect(6, 13, 4, 2, hex('#c83a3a'));
      p.rect(5 + f, 21, 2, 2, d[0]); p.rect(9 - f, 21, 2, 2, d[0]);
      p.ball(8, 6, 4.5, 4.5, s);
      p.rect(4, 2, 8, 2, d[3]); p.set(8, 2, '#c83a3a');
      p.set(6, 6, '#2a2a3a'); p.set(10, 6, '#2a2a3a'); p.line(7, 3, 6, 9, hex('#c8b8b0')); // crack
      p.set(8, 8, '#c86a6a');
    }),
  }),
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
  sprites: () => ({
    idle: frames(20, 26, 4, (p, f) => {
      const c = ramp('#e0e0e8');
      p.ball(10, 9, 7, 7, c, { dither: 0.5 });
      p.rect(3, 9, 14, 10, c[2]);
      p.shadeV(3, 2, 14, 17, c, 0.5);
      for (let i = 0; i < 4; i++) { const x = 3 + i * 4, len = 3 + ((i + f) % 3); p.rect(x, 19, 3, len, c[i % 2 ? 2 : 1]); }
      p.ball(7, 9, 1.5, 2, ramp('#1a1a2a')); p.ball(13, 9, 1.5, 2, ramp('#1a1a2a'));
    }),
  }),
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
  sprites: () => {
    const paint = (p: any, open: number) => {
      const c = ramp('#8a8e96'), t = ramp('#5a4a3a');
      p.rect(2, 10, 18, 9, c[2]); p.rect(2, 10, 18, 1, c[3]); p.rect(2, 18, 18, 1, c[0]);
      p.rect(2, 14, 18, 1, t[2]);
      const ly = 10 - open * 6;
      p.rect(1, ly - 5, 20, 6, c[2]); p.rect(1, ly - 5, 20, 1, c[4]); p.rect(9, ly - 1, 3, 3, t[3]);
      if (open > 0) {
        p.rect(3, ly + 1, 16, Math.max(1, 10 - ly), hex('#2a0a10'));
        for (let x = 3; x < 19; x += 2) { p.set(x, ly + 1, '#f0e8d8'); p.set(x + 1, 10, '#f0e8d8'); }
        p.ball(11, ly + 4, 3, 1.5, ramp('#c83a5a'));
        glowEye(p, 6, ly - 3, '#f0e040'); p.set(15, ly - 3, '#f0e040');
      }
    };
    return { shut: frames(22, 20, 1, (p) => paint(p, 0)), open: frames(22, 20, 2, (p, f) => paint(p, f ? 1 : 0.6)) };
  },
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
  sprites: () => ({
    walk: frames(18, 36, 4, (p, f) => {
      const m = ramp('#9a9aa8'), b = ramp('#8ac04a');
      const st = [0, 2, 0, -2][f];
      p.line(9, 10, 9, 30, m[3]); p.line(9, 30, 3 + st, 34, m[2]); p.line(9, 30, 15 - st, 34, m[2]); p.line(9, 30, 9, 35, m[1]);
      p.line(4, 8, 14, 8, m[3]);
      p.ball(12, 13, 4, 5.5, b, { dither: 0.5 }); p.set(11, 11, '#ffffff');
      p.line(12, 18, 13, 24, hex('#c8e0a0'));
      p.ball(9, 4, 3.5, 3, ramp('#c8c0b8')); p.set(8, 4, '#c83a3a'); p.set(10, 4, '#c83a3a');
    }, 35),
  }),
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
