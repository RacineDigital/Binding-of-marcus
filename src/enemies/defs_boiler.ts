// Chapter II enemies: soot, steam, rust and cinders.
import type { EnemyDef } from './enemy';
import { frames, eye, teeth, ramp, hex, glowEye, sprinkle, pack, gridFrames, scaledFrames } from '../art/creature';
import * as H from '../art/hand/boiler';
import * as H2 from '../art/hand/boiler2';
import { chase, buzz, wander, aimAngle, shoot, spreadShot, ringShot, hasLOS, aligned, distToPlayer, randomFloorPoint, keepDistance } from './ai';
import { TAU, angleTo, angleDiff, clamp } from '../core/math';
import { telegraph } from '../bosses/boss';

const sootsprite: EnemyDef = {
  id: 'sootsprite', name: 'Soot Sprite', desc: 'Circles you, flares, then dives.', hp: 8, r: 5, speed: 70, flying: true, role: 'flyer', cost: 1, hitY: 12,
  gore: '#2a2224', light: [40, '#ff7a2a'],
  sprites: () => ({ idle: gridFrames(H.SOOT, H.SOOT_PAL) }),
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
  sprites: () => ({ idle: gridFrames(H.VALVE, H.VALVE_PAL) }),
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
  id: 'stoker', name: 'Stoker', desc: 'Lifts its shovel when you line up, then barrels across the room. Dazed and open if it hits a wall.', hp: 22, r: 9, speed: 34, role: 'heavy', cost: 2, hitY: 12, mass: 3,
  gore: '#3a2a22',
  sprites: () => ({ walk: gridFrames(H2.STOKER_WALK, H2.STOKER_PAL), raise: gridFrames(H2.STOKER_RAISE, H2.STOKER_PAL), charge: gridFrames(H2.STOKER_CHARGE, H2.STOKER_PAL) }),
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
    } else if (e.state === 'stun') { e.x += Math.sin(e.st * 36) * 0.25; if (e.st > 1) { e.setState('idle'); e.cd = 1; } }
  },
  // a charger that hits a wall is dazed and open: the same rule as the pillbug
  onHurt(e, w, dmg) { return e.state === 'stun' ? dmg * 1.5 : dmg; },
};

const cinderhopper: EnemyDef = {
  id: 'cinderhopper', name: 'Cinder Toad', desc: 'Hops after you, leaving smouldering patches where it lands.', hp: 13, r: 7, speed: 0, role: 'melee', cost: 1.4, hitY: 7,
  gore: '#3a2a22', light: [30, '#ff6a2a'],
  sprites: () => ({
    idle: scaledFrames(H.TOAD, H.TOAD_PAL, [[1, 1]]),
    crouch: scaledFrames(H.TOAD, H.TOAD_PAL, [[1.15, 0.8]]),
    air: scaledFrames(H.TOAD, H.TOAD_PAL, [[0.9, 1.12]]),
  }),
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
  sprites: () => ({ up: gridFrames(H2.PIPEWORM, H2.PIPE_PAL, 31) }),
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

export const BOILER_ENEMIES: EnemyDef[] = [sootsprite, valvehead, stoker, cinderhopper, pipeworm];
void eye; void teeth; void pack; void buzz; void wander;
