// Chapter V enemies: bones, diggers and maws.
import type { EnemyDef, Enemy } from './enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, distToPlayer, randomFloorPoint, hasLOS } from './ai';
import { TAU, angleTo, angleDiff, clamp } from '../core/math';
import { telegraph } from '../bosses/boss';

const bone = () => ramp('#e0d6c0');

const skullmote: EnemyDef = {
  id: 'skullmote', name: 'Skull Mote', desc: '', hp: 6, r: 4, speed: 0, flying: true, role: 'swarm', cost: 0.5, hitY: 10, gore: '#e0d6c0', noSeparate: true,
  sprites: () => ({ idle: frames(12, 12, 1, (p) => { p.ball(6, 6, 4, 3.6, bone()); p.set(4, 6, '#1a0a0a'); p.set(7, 6, '#1a0a0a'); p.rect(5, 9, 3, 1, ramp('#c8b8a0')[1]); }) }),
  update(e, w, dt) {
    const core: Enemy | null = e.parent;
    if (core && !core.dead) {
      e.data.a = (e.data.a ?? 0) + dt * 2.6;
      e.x = core.x + Math.cos(e.data.a) * 22; e.y = core.y + Math.sin(e.data.a) * 16; e.z = 6;
    } else {
      // orphaned motes hunt the player
      chase(e, w, 90, dt);
    }
  },
};
const skullorbit: EnemyDef = {
  id: 'skullorbit', name: 'Ossuary Lantern', desc: 'A skull wreathed in orbiting skulls. Break the ring, or break the centre and face the motes.', hp: 18, r: 7, speed: 26, flying: true, role: 'special', cost: 2.2, hitY: 12,
  gore: '#e0d6c0', light: [36, '#c0ff90'],
  sprites: () => ({
    idle: frames(18, 18, 2, (p, f) => {
      p.ball(9, 9, 6.5, 6, bone(), { dither: 0.6 });
      glowEye(p, 6, 8, '#a0ff60'); glowEye(p, 11, 8, '#a0ff60');
      p.rect(7, 12, 5, 2, hex('#1a0a0a')); for (let x = 7; x < 12; x += 2) p.set(x, 12, '#e0d6c0');
      if (f) p.set(9, 2, '#c0ff90');
    }),
  }),
  init(e, w) { e.cd = 2.5; for (let i = 0; i < 4; i++) { const m = w.spawnEnemy('skullmote', e.x, e.y, true); if (m) { m.parent = e; m.data.a = (i / 4) * TAU; m.spawnT = e.spawnT; } } },
  update(e, w, dt) {
    chase(e, w, e.def.speed, dt); e.animate(dt, 3); e.z = 8;
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = 2.6; shoot(e, w, aimAngle(e, w), 110, { shape: 'spore', r: 4 }); }
  },
};

const gravedigger: EnemyDef = {
  id: 'gravedigger', name: 'Gravedigger', desc: 'Sinks into the earth and flings clods of dirt that burst where they land.', hp: 18, r: 7, speed: 30, role: 'shooter', cost: 1.7, hitY: 12,
  gore: '#6a5040',
  sprites: () => ({
    idle: frames(22, 28, 2, (p, f) => {
      const c = ramp('#5a4a3a'), s = ramp('#a89070');
      p.poly([5, 26, 7, 12, 15, 12, 17, 26], c[2]); p.shadeV(5, 12, 12, 14, c, 0.6);
      p.ball(11, 8, 4.5, 4.5, s);
      p.poly([4, 6, 11, 0, 18, 6], hex('#3a2a20')); p.rect(3, 5, 16, 2, hex('#2a1e18'));
      glowEye(p, 9, 8, '#f0d040'); p.set(13, 8, '#f0d040');
      p.line(17, 10 + f, 20, 26, hex('#6a4a2a')); p.poly([18, 24, 22, 24, 21, 28, 19, 28], ramp('#8a8a92')[2]);
    }),
  }),
  init(e) { e.cd = 1.5; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.animate(dt, 2); e.alpha = Math.min(1, e.alpha + dt * 4); e.hidden = false; e.invuln = false;
      e.cd -= dt;
      if (e.cd <= 0) {
        e.cd = 0.5;
        const n = w.run.floorIndex >= 5 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const tx = w.player.x + (Math.random() - 0.5) * 50, ty = w.player.y + (Math.random() - 0.5) * 40;
          const d = clamp(Math.hypot(tx - e.x, ty - e.y), 30, 200);
          shoot(e, w, angleTo(e.x, e.y, tx, ty), d / 1.0, { lob: true, lobH: 55, range: d, shape: 'bile', r: 4.5, split: 4, splitSpd: 80 });
        }
        w.audio.play('swing', { x: e.x });
        e.setState('throw');
      }
    } else if (e.state === 'throw') {
      if (e.st > 0.6) { e.setState('dig'); w.audio.play('burrow', { x: e.x, vol: 0.5 }); }
    } else if (e.state === 'dig') {
      e.alpha = Math.max(0, 1 - e.st * 2.5);
      if (e.st > 0.4) { e.hidden = true; e.invuln = true; }
      if (e.st > 1.4) { const p = randomFloorPoint(w, 70); e.x = p.x; e.y = p.y; telegraph(w, e.x, e.y, 10, 0.5, '#c8a080'); e.setState('rise'); }
    } else if (e.state === 'rise') { if (e.st > 0.5) { e.setState('idle'); e.cd = 0.8; w.fx.shards(e.x, e.y, 8, '#6a5040', 80); } }
  },
};

const ossspider: EnemyDef = {
  id: 'ossspider', name: 'Ossuary Spider', desc: 'Skitters about, then marks a spot and leaps on it.', hp: 12, r: 7, speed: 80, role: 'melee', cost: 1.3, hitY: 7,
  gore: '#e0d6c0',
  sprites: () => ({
    walk: frames(26, 18, 4, (p, f) => {
      legs(p, 13, 10, 8, 0.45, 11, f * 1.6, hex('#d0c4aa'));
      p.ball(13, 9, 5.5, 4.5, bone());
      p.ball(13, 13, 3.5, 2.5, ramp('#c8b8a0'));
      glowEye(p, 11, 8, '#e04040'); p.set(15, 8, '#e04040'); p.set(13, 7, '#e04040');
    }),
  }),
  init(e) { e.anim = 'walk'; e.cd = 1 + Math.random(); },
  update(e, w, dt) {
    if (e.state === 'idle') {
      e.data.wa = (e.data.wa ?? Math.random() * TAU) + (Math.random() - 0.5) * 6 * dt;
      const h = e.move(w, Math.cos(e.data.wa) * e.def.speed * e.spd() * dt, Math.sin(e.data.wa) * e.def.speed * e.spd() * dt);
      if (h.hx || h.hy) e.data.wa += Math.PI;
      e.animate(dt, 14);
      e.cd -= dt;
      if (e.cd <= 0 && distToPlayer(e, w) < 160) { e.data.tx = w.player.x; e.data.ty = w.player.y; telegraph(w, e.data.tx, e.data.ty, 12, 0.5); e.setState('aim'); }
    } else if (e.state === 'aim') {
      e.x += Math.sin(e.st * 60) * 0.4;
      if (e.st > 0.5) { e.setState('leap'); e.data.sx = e.x; e.data.sy = e.y; e.mode = 'fly'; w.audio.play('hop', { x: e.x }); }
    } else if (e.state === 'leap') {
      const k = clamp(e.st / 0.45, 0, 1);
      e.x = e.data.sx + (e.data.tx - e.data.sx) * k; e.y = e.data.sy + (e.data.ty - e.data.sy) * k;
      e.z = Math.sin(k * Math.PI) * 30;
      if (k >= 1) { e.z = 0; e.mode = 'walk'; e.setState('idle'); e.cd = 1.4 + Math.random(); e.sx = 1.3; e.sy = 0.7; w.fx.burst(e.x, e.y, 2, 6, '#8a7a6a', 50, 0.3); }
    }
  },
};

const marrowmaw: EnemyDef = {
  id: 'marrowmaw', name: 'Marrow Maw', desc: 'A mouth in the floor. It coughs up crawlers and gnashes before it spits.', hp: 30, r: 11, speed: 0, role: 'turret', cost: 2.2, hitY: 6, mass: 99, noKnock: true,
  gore: '#8a2a2a', goreDecal: '#4a1418',
  sprites: () => ({
    idle: frames(30, 20, 3, (p, f) => {
      const c = ramp('#8a3a3a');
      p.ball(15, 11, 13, 8, c, { dither: 0.8 });
      const o = [2, 4, 6][f];
      p.ellipse(15, 11, 8, o * 0.7 + 1, hex('#1a0408'));
      for (let i = 0; i < 9; i++) { const x = 8 + i * 1.8; p.set(x, 11 - o * 0.7, '#e8e0d0'); p.set(x + 0.9, 11 + o * 0.7, '#e8e0d0'); }
      sprinkle(p, '#c8a090', 12, 3);
    }, 16),
  }),
  init(e) { e.cd = 2; e.data.kids = []; },
  update(e, w, dt) {
    e.cd -= dt;
    e.frame = e.cd < 0.5 ? 2 - Math.floor(e.t * 10) % 2 : 0;
    if (e.cd <= 0) {
      e.cd = 2.6;
      e.data.kids = (e.data.kids as Enemy[]).filter((k) => !k.dead);
      if (e.data.kids.length < 2 && Math.random() < 0.6) { const k = w.spawnEnemy('ragcrawler', e.x, e.y + 8, true); if (k) { k.noDrop = true; e.data.kids.push(k); } w.audio.play('hatch', { x: e.x }); }
      else { spreadShot(e, w, 5, aimAngle(e, w), 0.9, 120, { r: 4 }); w.audio.play('bossSpit', { x: e.x, vol: 0.6 }); }
    }
  },
};

export const DEPTHS_ENEMIES: EnemyDef[] = [skullorbit, skullmote, gravedigger, ossspider, marrowmaw];
void eye; void teeth; void ringShot; void hasLOS;
