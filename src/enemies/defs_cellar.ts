// Chapter I enemies: the cellar's mites, moths, crawlers and nests.
import { EnemyDef, Enemy } from './enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, pack } from '../art/creature';
import { chase, buzz, wander, aimAngle, shoot, spreadShot, hasLOS, aligned, distToPlayer, ringShot } from './ai';
import { TAU, angleTo, clamp } from '../core/math';
import type { World } from '../game/world';

const mite: EnemyDef = {
  id: 'mite', name: 'Ink Mite', desc: 'Buzzes in erratic loops. Harmless alone.', hp: 3, r: 4, speed: 58, flying: true, role: 'swarm', cost: 0.35, hitY: 8,
  gore: '#2a2458', contact: 1,
  sprites: () => ({
    idle: frames(12, 14, 2, (p, f) => {
      const b = ramp('#3a3070');
      p.ellipse(3.5, 5 - f, 3, f ? 2 : 3.5, pack(200, 210, 255, 140)); p.ellipse(8.5, 5 - f, 3, f ? 2 : 3.5, pack(200, 210, 255, 140));
      p.ball(6, 8, 3.2, 3, b); p.ball(6, 11, 2, 1.5, ramp('#241c48'));
      glowEye(p, 5, 8, '#e04050'); p.set(7, 8, '#e04050');
    }),
  }),
  init(e) { e.anim = 'idle'; },
  update(e, w, dt) { buzz(e, w, e.def.speed, dt, 0.55); e.animate(dt, 18); },
};

const moth: EnemyDef = {
  id: 'moth', name: 'Dust Moth', desc: 'Flutters after you in lazy waves. Sheds choking dust when struck.', hp: 9, r: 6, speed: 42, flying: true, role: 'flyer', cost: 1, hitY: 12,
  gore: '#a89a7a',
  sprites: () => ({
    idle: frames(22, 20, 4, (p, f) => {
      const wing = ramp('#b8a47e'), body = ramp('#6a5a44');
      const flap = [0, 2, 4, 2][f];
      p.poly([11, 9, 1, 3 + flap, 2, 12 - flap * 0.3, 10, 13], wing[2]);
      p.poly([11, 9, 21, 3 + flap, 20, 12 - flap * 0.3, 12, 13], wing[2]);
      p.shadeV(1, 3, 20, 11, wing, 0.7);
      p.ball(5, 7 + flap * 0.5, 1.5, 1.5, ramp('#4a3a6a')); p.ball(17, 7 + flap * 0.5, 1.5, 1.5, ramp('#4a3a6a'));
      p.tube(11, 7, 11, 15, 2.2, body);
      p.line(10, 6, 8, 2, body[1]); p.line(12, 6, 14, 2, body[1]);
      glowEye(p, 10, 8, '#f0e060'); p.set(12, 8, '#f0e060');
    }, 19),
  }),
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
  sprites: () => ({
    walk: frames(24, 18, 4, (p, f) => {
      const rag = ramp('#7a6a58'), skin = ramp('#d8c8b0');
      const reach = [0, 2, 4, 2][f];
      p.ball(13, 11, 8, 5.5, rag, { dither: 0.8 });
      p.poly([5, 13, 8, 7, 12, 12], rag[1]); p.poly([19, 14, 21, 9, 16, 12], rag[3]);
      // pale face peeking from the rags
      p.ball(8, 9, 4, 3.6, skin);
      p.set(6, 9, '#1a1010'); p.set(9, 9, '#1a1010'); p.rect(7, 11, 2, 1, hex('#4a1a1a'));
      // grasping arm
      p.line(6, 12, 2 - reach * 0.5, 14 - reach * 0.3, skin[1]); p.line(2 - reach * 0.5, 14 - reach * 0.3, 1 - reach * 0.5, 16, skin[2]);
      p.line(17, 15, 21, 16, rag[0]);
      sprinkle(p, '#4a3a2e', 8, 3 + f);
    }),
  }),
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
  sprites: () => {
    const paint = (swell: number, mouth: number, step: number) => (p: any) => {
      const sk = ramp('#b87a6a');
      p.rect(7 + step, 18, 2, 3, sk[1]); p.rect(14 - step, 18, 2, 3, sk[1]);
      p.ball(11.5, 12 - swell * 0.5, 8 + swell, 7 + swell, sk, { dither: 0.6 });
      p.ball(8, 9 - swell, 2.2, 2.2, ramp('#e8d0c0')); p.ball(15, 9 - swell, 2.2, 2.2, ramp('#e8d0c0'));
      p.set(8, 9 - swell, '#1a1010'); p.set(15, 9 - swell, '#1a1010');
      teeth(p, 9, 13 - swell * 0.3, 6, 4, mouth);
      p.set(5, 13, sk[1]); p.set(18, 11, sk[1]); p.set(17, 15, sk[3]);
    };
    return {
      idle: frames(24, 22, 2, (p, f) => paint(0, 0.3, f)(p)),
      charge: frames(24, 22, 3, (p, f) => paint(f * 0.8, 0.2 + f * 0.3, 0)(p)),
      spit: frames(24, 22, 1, (p) => paint(-0.5, 1, 0)(p)),
    };
  },
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
  sprites: () => {
    const paint = (sq: number, air: boolean) => (p: any) => {
      const b = ramp('#2e3480');
      const rx = 7 * (1 + sq * 0.25), ry = 6 * (1 - sq * 0.3);
      p.ball(9, 15 - ry, rx, ry, b, { dither: 0.5 });
      for (const x of [3, 7, 12, 15]) if (!air) p.tube(x, 14, x, 16 + (x % 3), 1, b);
      eye(p, 9, 14 - ry * 1.1, 3, 0, 0.3, '#e04050');
      p.set(4, 12 - ry * 0.5, b[4]); p.set(5, 11 - ry * 0.5, b[4]);
    };
    return { idle: frames(18, 18, 1, (p) => paint(0, false)(p)), crouch: frames(18, 18, 1, (p) => paint(1, false)(p)), air: frames(18, 18, 1, (p) => paint(-0.6, true)(p)) };
  },
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
  sprites: () => {
    const shell = ramp('#6a6a7a');
    return {
      walk: frames(22, 16, 4, (p, f) => {
        legs(p, 11, 12, 6, 0.5, 6, f * 1.6, hex('#3a3440'));
        p.ball(11, 9, 9, 6, shell, { dither: 0.5 });
        for (let i = -6; i <= 6; i += 3) p.line(11 + i, 4 + Math.abs(i) * 0.3, 11 + i, 14 - Math.abs(i) * 0.3, shell[1]);
        p.line(19, 7, 22, 4, hex('#3a3440')); p.line(19, 8, 22, 7, hex('#3a3440'));
        glowEye(p, 18, 9, '#f0c040');
      }),
      rear: frames(22, 18, 2, (p, f) => {
        p.ball(11, 10 - f, 8, 7, shell, { dither: 0.5 });
        legs(p, 11, 12, 6, 0.5, 7, f * 3, hex('#3a3440'));
        glowEye(p, 17, 7 - f, '#ff6040');
      }),
      roll: frames(18, 18, 4, (p, f) => {
        p.ball(9, 9, 7.5, 7.5, shell, { dither: 0.4 });
        const a = (f / 4) * Math.PI;
        for (let k = 0; k < 3; k++) { const aa = a + k * (Math.PI / 3); p.line(9 + Math.cos(aa) * 7, 9 + Math.sin(aa) * 7, 9 - Math.cos(aa) * 7, 9 - Math.sin(aa) * 7, shell[1]); }
      }, 17),
    };
  },
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
  sprites: () => ({
    idle: frames(22, 24, 3, (p, f) => {
      const paper = ramp('#b8a888');
      const s = [0, 0.8, 1.6][f];
      p.ball(11, 14, 8.5 + s * 0.4, 9 + s * 0.3, paper, { dither: 0.9 });
      for (let y = 7; y < 22; y += 3) p.line(4, y, 18, y + 1, paper[1]);
      p.ball(11, 16, 2.4, 2.4, ramp('#1a1010'));
      p.set(8, 11, '#3a3070'); p.set(14, 13, '#3a3070'); p.set(10, 19, '#3a3070');
      p.rect(9, 3, 4, 3, paper[0]);
    }, 23),
  }),
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
  sprites: () => ({
    idle: frames(18, 22, 4, (p, f) => {
      const wood = ramp('#8a5a3a'), thread = ramp('#b83a4a');
      p.rect(3, 17, 12, 3, wood[1]); p.rect(3, 17, 12, 1, wood[3]);
      p.rect(5, 6, 8, 11, thread[2]); for (let y = 6; y < 17; y += 2) p.line(5, y + (f % 2), 12, y + (f % 2), thread[1]);
      p.rect(3, 3, 12, 3, wood[2]); p.rect(3, 3, 12, 1, wood[4]);
      const a = (f / 4) * Math.PI / 2;
      for (let k = 0; k < 4; k++) { const aa = a + (k * Math.PI) / 2; p.line(9 + Math.cos(aa) * 4, 11 + Math.sin(aa) * 3, 9 + Math.cos(aa) * 8, 11 + Math.sin(aa) * 5, hex('#d8d8e0')); }
      eye(p, 9, 11, 2, 0, 0, '#1a1010');
    }, 21),
  }),
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
  sprites: () => ({
    walk: frames(16, 26, 4, (p, f) => {
      const wax = ramp('#e8dcb8'), fl = ramp('#f08a30');
      const st = [0, 1, 0, -1][f];
      p.rect(4, 8, 8, 14, wax[2]); p.shadeV(4, 8, 8, 14, wax, 0.4);
      p.ball(4, 11, 1.2, 2, wax); p.ball(11, 14, 1.2, 2.5, wax);
      p.rect(5 + st, 22, 2, 3, wax[1]); p.rect(9 - st, 22, 2, 3, wax[1]);
      p.set(6, 14, '#1a1010'); p.set(9, 14, '#1a1010'); p.rect(7, 17, 2, 1, hex('#5a2a1a'));
      p.set(8, 7, '#2a1a10');
      p.ball(8, 4 - (f % 2), 2.2, 3.4, fl); p.set(8, 3 - (f % 2), fl[4]);
    }, 25),
  }),
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
