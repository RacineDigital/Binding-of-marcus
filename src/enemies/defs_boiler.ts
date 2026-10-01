// Chapter II enemies: soot, steam, rust and cinders.
import type { EnemyDef } from './enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, pack } from '../art/creature';
import { chase, buzz, wander, aimAngle, shoot, spreadShot, ringShot, hasLOS, aligned, distToPlayer, randomFloorPoint, keepDistance } from './ai';
import { TAU, angleTo, angleDiff, clamp } from '../core/math';
import { telegraph } from '../bosses/boss';

const sootsprite: EnemyDef = {
  id: 'sootsprite', name: 'Soot Sprite', desc: 'Circles you, flares, then dives.', hp: 8, r: 5, speed: 70, flying: true, role: 'flyer', cost: 1, hitY: 12,
  gore: '#2a2224', light: [40, '#ff7a2a'],
  sprites: () => ({
    idle: frames(16, 18, 4, (p, f) => {
      const fl = ramp('#f07a2a');
      for (let i = 0; i < 4; i++) p.tube(5 + i * 2, 8, 4 + i * 2 + Math.sin(f + i) * 1.5, 2 + (i % 2) * 2, 1, fl);
      p.ball(8, 10, 4.5, 4, ramp('#2a2426'), { dither: 0.8 });
      p.set(6, 10, '#ffb040'); p.set(9, 10, '#ffb040');
      p.poly([4, 11, 0, 8 + (f % 2) * 3, 3, 13], hex('#4a3a3a')); p.poly([12, 11, 16, 8 + (f % 2) * 3, 13, 13], hex('#4a3a3a'));
    }, 17),
  }),
  init(e) { e.data.a = Math.random() * TAU; e.cd = 2 + Math.random(); },
  update(e, w, dt) {
    e.animate(dt, 12);
    if (e.state === 'idle') {
      e.data.a += dt * 1.6;
      const tx = w.player.x + Math.cos(e.data.a) * 60, ty = w.player.y + Math.sin(e.data.a) * 45;
      const a = angleTo(e.x, e.y, tx, ty);
      e.move(w, Math.cos(a) * e.def.speed * e.spd() * dt, Math.sin(a) * e.def.speed * e.spd() * dt);
      e.z = 6 + Math.sin(e.t * 6) * 2;
      e.cd -= dt;
      if (e.cd <= 0) { e.setState('flare'); e.data.da = angleTo(e.x, e.y, w.player.x, w.player.y); }
    } else if (e.state === 'flare') {
      e.flash = Math.sin(e.st * 40) > 0 ? 0.5 : 0;
      if (e.st > 0.45) e.setState('dive');
    } else if (e.state === 'dive') {
      const h = e.move(w, Math.cos(e.data.da) * 220 * e.spd() * dt, Math.sin(e.data.da) * 220 * e.spd() * dt);
      if (Math.random() < 0.5) w.fx.embers(e.x, e.y - 8, 1, '#ff8a30');
      if (h.hx || h.hy || e.st > 0.8) { e.setState('idle'); e.cd = 2 + Math.random() * 1.5; }
    }
    e.flip = w.player.x < e.x;
  },
};

const valvehead: EnemyDef = {
  id: 'valvehead', name: 'Valvehead', desc: 'A pressure valve with opinions. Its gauge spins before it vents.', hp: 18, r: 8, speed: 0, role: 'turret', cost: 1.5, hitY: 10, mass: 99, noKnock: true,
  gore: '#8a6a3a',
  sprites: () => ({
    idle: frames(22, 24, 4, (p, f) => {
      const br = ramp('#b8863a'), ir = ramp('#4a4448');
      p.rect(8, 15, 6, 8, ir[2]); p.rect(3, 19, 16, 4, ir[1]); p.rect(3, 19, 16, 1, ir[3]);
      p.ball(11, 10, 8, 7.5, br, { dither: 0.5 });
      p.ball(11, 10, 5, 5, ramp('#e8e0c8'));
      const a = (f / 4) * TAU;
      p.line(11, 10, 11 + Math.cos(a) * 4, 10 + Math.sin(a) * 4, hex('#c83a3a'));
      p.set(11, 10, '#1a1010');
      p.rect(9, 1, 4, 3, ir[3]); p.rect(6, 2, 10, 1, br[1]);
      glowEye(p, 6, 8, '#1a1010'); p.set(16, 8, '#1a1010');
    }, 23),
  }),
  init(e) { e.cd = 1 + Math.random() * 1.5; e.data.x = false; },
  update(e, w, dt) {
    e.cd -= dt;
    const spin = e.cd < 0.6 ? 24 : 3;
    e.ftime += dt * spin; e.frame = Math.floor(e.ftime) % 4;
    if (e.cd < 0.6 && Math.random() < 0.4) w.fx.smoke(e.x, e.y - 20, 1, 'rgba(220,220,230,', 2, 0.4, 20);
    if (e.cd <= 0) {
      e.cd = 2.4;
      ringShot(e, w, 4, 105, e.data.x ? Math.PI / 4 : 0, { shape: 'holy', r: 4, range: 160 });
      if (w.run.floorIndex >= 3) ringShot(e, w, 4, 70, e.data.x ? 0 : Math.PI / 4, { shape: 'holy', r: 3, range: 120 });
      e.data.x = !e.data.x; e.sy = 1.2; e.sx = 0.9;
      w.audio.play('extinguish', { x: e.x, vol: 0.5 });
    }
  },
};

const stoker: EnemyDef = {
  id: 'stoker', name: 'Stoker', desc: 'Lifts its shovel when you line up, then barrels across the room.', hp: 22, r: 9, speed: 34, role: 'heavy', cost: 2, hitY: 12, mass: 3,
  gore: '#3a2a22',
  sprites: () => {
    const paint = (p: any, f: number, raise: number) => {
      const body = ramp('#4a3a34'), skin = ramp('#7a5a4a'), sh = ramp('#8a8a92');
      const st = [0, 1, 0, -1][f % 4];
      p.rect(7 + st, 22, 4, 4, body[0]); p.rect(14 - st, 22, 4, 4, body[0]);
      p.ball(13, 15, 9, 8, body, { dither: 0.6 });
      p.ball(13, 8, 5, 4.5, skin);
      p.rect(9, 5, 8, 2, hex('#2a2224'));
      glowEye(p, 11, 8, '#ffb040'); p.set(15, 8, '#ffb040');
      // shovel
      const sy = 14 - raise * 10;
      p.line(20, 18, 23, sy, hex('#6a4a2a')); p.poly([21, sy, 26, sy - 2, 26, sy - 7, 21, sy - 5], sh[2]);
      p.tube(20, 15, 20, 18, 2, skin);
      sprinkle(p, '#1a1416', 12, 4 + f);
    };
    return { walk: frames(28, 28, 4, (p, f) => paint(p, f, 0)), raise: frames(28, 28, 1, (p) => paint(p, 0, 1)), charge: frames(28, 28, 2, (p, f) => paint(p, f * 2, 0.4)) };
  },
  init(e) { e.anim = 'walk'; e.cd = 1; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      chase(e, w, e.def.speed, dt); e.setAnim('walk'); e.animate(dt, 6);
      e.cd -= dt;
      const al = aligned(e, w, 14);
      if (al !== null && e.cd <= 0 && hasLOS(e, w)) { e.data.dir = al; e.setState('raise'); e.setAnim('raise'); w.audio.play('creak', { x: e.x, vol: 0.5 }); }
    } else if (e.state === 'raise') {
      if (e.st > 0.5) { e.setState('charge'); e.setAnim('charge'); }
    } else if (e.state === 'charge') {
      e.animate(dt, 12);
      const h = e.move(w, Math.cos(e.data.dir) * 210 * e.spd() * dt, Math.sin(e.data.dir) * 210 * e.spd() * dt);
      e.flip = Math.cos(e.data.dir) < 0;
      if (Math.random() < 0.4) w.fx.embers(e.x, e.y - 6, 1, '#ff8a30');
      if (h.hx || h.hy || e.st > 2) { e.setState('stun'); e.setAnim('walk'); w.shake(2); w.audio.play('slam', { x: e.x, vol: 0.6 }); e.sx = 0.75; e.sy = 1.25; if (w.run.floorIndex >= 2) spreadShot(e, w, 5, e.data.dir + Math.PI, 1.4, 100, { shape: 'ember' }); }
    } else if (e.state === 'stun') { if (e.st > 1) { e.setState('idle'); e.cd = 1; } }
  },
};

const rustcrab: EnemyDef = {
  id: 'rustcrab', name: 'Rust Crab', desc: 'Its iron shell faces you. Hit it from the side or behind.', hp: 18, r: 8, speed: 40, role: 'heavy', cost: 1.6, hitY: 8, mass: 2,
  gore: '#8a4a2a',
  sprites: () => ({
    idle: frames(26, 20, 4, (p, f) => {
      const sh = ramp('#8a4a2a'), cl = ramp('#a8582a');
      legs(p, 13, 13, 6, 0.5, 8, f * 1.5, hex('#5a2a1a'));
      p.ball(13, 10, 10, 7, sh, { dither: 0.6 });
      for (let i = -6; i <= 6; i += 4) p.line(13 + i, 5, 13 + i, 15, sh[1]);
      sprinkle(p, '#c87a3a', 10, 2 + f);
      p.ball(3, 8 - (f % 2), 3, 2.5, cl); p.ball(23, 8 + (f % 2), 3, 2.5, cl);
      p.set(2, 6, '#1a0a0a'); p.set(24, 6, '#1a0a0a');
      glowEye(p, 10, 4, '#f0e040'); p.set(16, 4, '#f0e040');
    }),
  }),
  init(e) { e.cd = 2 + Math.random(); },
  update(e, w, dt) {
    keepDistance(e, w, 60, 110, e.def.speed, dt);
    e.animate(dt, 8);
    e.data.face = angleTo(e.x, e.y, w.player.x, w.player.y);
    e.cd -= dt;
    if (e.cd < 0.4 && e.cd + dt >= 0.4) { e.sx = 1.15; e.sy = 0.9; }
    if (e.cd <= 0) { e.cd = 2.6; spreadShot(e, w, 2, aimAngle(e, w), 0.35, 120); w.audio.play('snip', { x: e.x, vol: 0.5 }); }
  },
  onHurt(e, w, dmg, info) {
    // shot travelling toward the crab's face is blocked
    const towardFace = Math.abs(angleDiff(info.ang + Math.PI, e.data.face ?? 0));
    if (info.source === 'shot' && towardFace < 0.9) return 0;
    return dmg;
  },
};

const cinderhopper: EnemyDef = {
  id: 'cinderhopper', name: 'Cinder Toad', desc: 'Hops after you, leaving smouldering patches where it lands.', hp: 13, r: 7, speed: 0, role: 'melee', cost: 1.4, hitY: 7,
  gore: '#3a2a22', light: [30, '#ff6a2a'],
  sprites: () => {
    const paint = (p: any, sq: number) => {
      const c = ramp('#3a3032'), g = ramp('#f06a2a');
      const ry = 6 - sq * 2;
      p.ball(10, 15 - ry, 8 + sq * 1.5, ry, c, { dither: 0.7 });
      p.tube(3, 15, 1, 17, 1.5, c); p.tube(17, 15, 19, 17, 1.5, c);
      for (const [x, y] of [[6, 12], [12, 10], [14, 14], [8, 15]]) p.paint(x, y - sq, g[3]);
      p.ball(6, 8 + sq, 2, 2, ramp('#f0c040')); p.ball(14, 8 + sq, 2, 2, ramp('#f0c040')); p.set(6, 8 + sq, '#1a0a0a'); p.set(14, 8 + sq, '#1a0a0a');
    };
    return { idle: frames(20, 18, 1, (p) => paint(p, 0)), crouch: frames(20, 18, 1, (p) => paint(p, 1)), air: frames(20, 18, 1, (p) => paint(p, -0.7)) };
  },
  init(e) { e.cd = 0.6 + Math.random(); e.anim = 'idle'; },
  update(e, w, dt) {
    if (e.state === 'idle') { e.cd -= dt; if (e.cd <= 0) { e.setState('crouch'); e.setAnim('crouch'); } }
    else if (e.state === 'crouch') {
      if (e.st > 0.35) {
        const a = angleTo(e.x, e.y, w.player.x, w.player.y) + (Math.random() - 0.5) * 0.5;
        const d = clamp(distToPlayer(e, w), 30, 100);
        e.vx = Math.cos(a) * d / 0.6; e.vy = Math.sin(a) * d / 0.6; e.vz = 160;
        e.setState('air'); e.setAnim('air'); e.mode = 'fly';
      }
    } else if (e.state === 'air') {
      e.vz -= 540 * dt; e.z += e.vz * dt;
      e.move(w, e.vx * e.spd() * dt, e.vy * e.spd() * dt);
      if (e.z <= 0) {
        e.z = 0; e.mode = 'walk'; e.setState('idle'); e.setAnim('idle'); e.cd = 0.7 + Math.random() * 0.5;
        e.sx = 1.3; e.sy = 0.75;
        w.addCreep(e.x, e.y, 13, 'enemy', 1, 3, '#a03a1a');
        w.fx.embers(e.x, e.y, 6, '#ff8a30', 14);
        w.audio.play('sizzle', { x: e.x, vol: 0.4 });
      }
    }
  },
};

const pipeworm: EnemyDef = {
  id: 'pipeworm', name: 'Pipe Worm', desc: 'Bursts out of the floor, sprays a ring of scalding shots, and sinks again.', hp: 16, r: 8, speed: 0, role: 'turret', cost: 1.6, hitY: 14, mass: 99, noKnock: true,
  gore: '#6a6a72',
  sprites: () => ({
    up: frames(18, 32, 3, (p, f) => {
      const m = ramp('#6a6a72'), r = ramp('#8a4a2a');
      const h = [10, 20, 28][f];
      for (let y = 30; y > 30 - h; y -= 4) { p.ball(9, y, 6, 3, m); p.line(3, y, 15, y, r[1]); }
      if (f === 2) { p.ball(9, 6, 6, 5, m); p.ball(9, 6, 3, 2.5, ramp('#1a0a0a')); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; p.set(9 + Math.cos(a) * 3, 6 + Math.sin(a) * 2.5, '#f0e0d0'); } }
    }, 31),
  }),
  init(e) { e.hidden = true; e.invuln = true; e.cd = 0.8 + Math.random(); e.alpha = 1; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.cd -= dt;
      if (e.cd <= 0) { const p = randomFloorPoint(w, 50); e.x = p.x; e.y = p.y; telegraph(w, e.x, e.y, 12, 0.6, '#c8a080'); e.setState('rise'); w.audio.play('rumble', { x: e.x, vol: 0.4 }); }
    } else if (e.state === 'rise') {
      if (e.st > 0.6) { e.hidden = false; e.invuln = false; e.setState('up'); e.anim = 'up'; e.frame = 0; w.fx.shards(e.x, e.y, 8, '#6a5a50', 90); }
    } else if (e.state === 'up') {
      e.frame = Math.min(2, Math.floor(e.st / 0.12));
      if (e.st > 0.5 && !e.data.shot) { e.data.shot = true; ringShot(e, w, w.run.floorIndex >= 3 ? 10 : 6, 110, Math.random(), { shape: 'ember' }); w.audio.play('fireSpit', { x: e.x }); }
      if (e.st > 1.6) { e.setState('sink'); }
    } else if (e.state === 'sink') {
      e.frame = Math.max(0, 2 - Math.floor(e.st / 0.12));
      if (e.st > 0.4) { e.hidden = true; e.invuln = true; e.data.shot = false; e.setState('idle'); e.cd = 1.2 + Math.random(); }
    }
  },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) { ctx.fillStyle = 'rgba(20,16,16,0.5)'; ctx.beginPath(); ctx.ellipse(sx, sy, 7, 3, 0, 0, TAU); ctx.fill(); return; }
    const spr = e.sprites.up[e.frame]; spr.draw(ctx, sx, sy + 1, { flash: e.flash > 0 ? 1 : 0, sx: e.sx, sy: e.sy });
  },
};

export const BOILER_ENEMIES: EnemyDef[] = [sootsprite, valvehead, stoker, rustcrab, cinderhopper, pipeworm];
void eye; void teeth; void pack; void buzz; void wander;
