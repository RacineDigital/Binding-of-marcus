// Chapter III enemies: rats, leeches, bloated things and sludge.
import type { EnemyDef, Enemy } from './enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, gridFrames, scaledFrames } from '../art/creature';
import * as H from '../art/hand/under';
import { chase, aimAngle, shoot, spreadShot, ringShot, hasLOS, distToPlayer, wander } from './ai';
import { TAU, angleTo, clamp } from '../core/math';
import { telegraph } from '../bosses/boss';
import type { World } from '../game/world';

const rat: EnemyDef = {
  id: 'rat', name: 'Sewer Rat', desc: 'Darts in bursts. Comes in packs.', hp: 5, r: 5, speed: 95, role: 'swarm', cost: 0.5, hitY: 5,
  gore: '#5a3a3a',
  sprites: () => ({ run: gridFrames(H.RAT, H.RAT_PAL) }),
  init(e) { e.anim = 'run'; e.cd = Math.random(); },
  update(e, w, dt) {
    e.cd -= dt;
    if (e.cd < 0) { e.data.go = !e.data.go; e.cd = e.data.go ? 0.6 + Math.random() * 0.5 : 0.25 + Math.random() * 0.3; e.data.off = (Math.random() - 0.5) * 1.2; }
    if (e.data.go) {
      const a = angleTo(e.x, e.y, w.player.x, w.player.y) + (e.data.off ?? 0) + (e.fear > 0 ? Math.PI : 0);
      const s = e.def.speed * e.spd();
      e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt); e.flip = Math.cos(a) < 0; e.animate(dt, 16);
    }
  },
};

const leech: EnemyDef = {
  id: 'leech', name: 'Bilge Leech', desc: 'A ripple in the floor that follows you. When it bulges, step away.', hp: 12, r: 6, speed: 60, role: 'melee', cost: 1.3, hitY: 8, ghost: true,
  gore: '#3a2a3a',
  sprites: () => ({ up: gridFrames(H.LEECH, H.LEECH_PAL) }),
  init(e) { e.hidden = true; e.invuln = true; e.cd = 0.5; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      const a = angleTo(e.x, e.y, w.player.x, w.player.y);
      const s = e.def.speed * e.spd();
      e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
      if (Math.random() < dt * 8) w.fx.ring(e.x, e.y, 2, 9, 'rgba(120,150,160,0.5)', 0.4, false);
      if (distToPlayer(e, w) < 34 && e.st > 1) { e.setState('bulge'); telegraph(w, e.x, e.y, 13, 0.45, '#a0c0d0'); }
    } else if (e.state === 'bulge') {
      if (e.st > 0.45) { e.hidden = false; e.invuln = false; e.setState('up'); e.anim = 'up'; w.audio.play('splash', { x: e.x }); w.fx.spray(e.x, e.y, 2, -Math.PI / 2, 2, 10, '#5a7a8a', 70, 0.4); }
    } else if (e.state === 'up') {
      e.frame = Math.floor(e.st * 6) % 2;
      if (e.st > 0.4 && !e.data.s && w.run.floorIndex >= 3) { e.data.s = true; ringShot(e, w, 6, 90); }
      if (e.st > 1.3) { e.hidden = true; e.invuln = true; e.data.s = false; e.setState('idle'); }
    }
  },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) {
      ctx.strokeStyle = 'rgba(140,170,180,0.45)'; ctx.lineWidth = 1;
      const k = e.state === 'bulge' ? 1 + Math.sin(e.st * 40) * 0.3 : 1;
      ctx.beginPath(); ctx.ellipse(sx, sy, 7 * k, 3 * k, 0, 0, TAU); ctx.stroke();
      return;
    }
    e.sprites.up[e.frame % 2].draw(ctx, sx, sy + 1, { flash: e.flash > 0 ? 1 : 0, sx: e.sx, sy: e.sy });
  },
};

const bloater: EnemyDef = {
  id: 'bloater', name: 'Bloater', desc: 'Slow and swollen. It bursts when it dies — keep your distance.', hp: 20, r: 10, speed: 22, role: 'heavy', cost: 1.6, hitY: 12, mass: 3,
  gore: '#6a8a3a', goreDecal: '#3a4a1a',
  sprites: () => ({ walk: gridFrames(H.BLOAT, H.BLOAT_PAL) }),
  init(e) { e.anim = 'walk'; },
  update(e, w, dt) { chase(e, w, e.def.speed, dt); e.animate(dt, 5); },
  onDeath(e, w) {
    ringShot(e, w, 10, 100, Math.random(), { shape: 'spore', r: 3.5, range: 200 });
    w.addCreep(e.x, e.y, 18, 'enemy', 1, 4, '#5a7a2a');
    w.fx.smoke(e.x, e.y, 10, 'rgba(110,140,60,', 8, 1.2, 8);
    w.audio.play('erupt', { x: e.x, vol: 0.6 });
  },
};

const grateeye: EnemyDef = {
  id: 'grateeye', name: 'Grate Eye', desc: 'Watches from under an iron grate. Only vulnerable while its lid is open.', hp: 14, r: 9, speed: 0, role: 'turret', cost: 1.5, hitY: 4, mass: 99, noKnock: true,
  gore: '#c8c0b0', contact: 0, noSeparate: true,
  sprites: () => ({ idle: gridFrames(H.GRATE, H.GRATE_PAL, 15) }),
  init(e) { e.invuln = true; e.cd = 1 + Math.random(); },
  update(e, w, dt) {
    e.cd -= dt;
    if (e.state === 'idle') { e.frame = 0; e.invuln = true; if (e.cd <= 0 && distToPlayer(e, w) < 230) { e.setState('open'); w.audio.play('creak', { x: e.x, vol: 0.3 }); } }
    else if (e.state === 'open') {
      e.frame = e.st < 0.25 ? 1 : 2; e.invuln = false;
      const n = Math.floor((e.st - 0.5) / 0.18);
      if (e.st > 0.5 && n > (e.data.n ?? -1) && n < 3) { e.data.n = n; shoot(e, w, aimAngle(e, w, 0.6, 140), 140); w.audio.play('spit', { x: e.x, vol: 0.4 }); }
      if (e.st > 1.6) { e.setState('idle'); e.cd = 1.8 + Math.random(); e.data.n = -1; }
    }
  },
};

function sludgeDef(id: string, size: number, next: string | null): EnemyDef {
  const r = 4 + size * 3;
  return {
    id, name: 'Sludge', desc: 'Splits when it dies. And again.', hp: 6 + size * 6, r, speed: 30 + (3 - size) * 14, role: size === 3 ? 'melee' : 'swarm', cost: size === 3 ? 1.6 : 0.5, hitY: r,
    gore: '#5a6a3a', goreDecal: '#3a4a22',
    // hand-drawn per size; it wobbles by squashing and stretching about its base
    sprites: () => ({ idle: scaledFrames(H.SLUDGE[size], H.SLUDGE_PAL, [[1, 1], [1.05, 0.95], [1, 1], [0.95, 1.05]]) }),
    init(e) { e.anim = 'idle'; },
    update(e, w, dt) { chase(e, w, e.def.speed * (0.6 + Math.max(0, Math.sin(e.t * 4)) * 0.8), dt); e.animate(dt, 6); },
    onDeath(e, w) {
      if (!next) return;
      for (const s of [-1, 1]) {
        const k = w.spawnEnemy(next, e.x + s * r * 0.6, e.y, true);
        if (k) { k.spawnT = 0.05; k.kvx = s * 120; k.parent = e; }
      }
    },
  };
}

const drowner: EnemyDef = {
  id: 'drowner', name: 'Drowned One', desc: 'Circles you at a distance, raising a hand before each shot.', hp: 14, r: 7, speed: 55, flying: true, role: 'shooter', cost: 1.6, hitY: 13,
  gore: '#4a6a7a',
  sprites: () => ({ idle: gridFrames(H.DROWN_IDLE, H.DROWN_PAL), raise: gridFrames(H.DROWN_RAISE, H.DROWN_PAL) }),
  init(e) { e.data.a = Math.random() * TAU; e.data.dir = Math.random() < 0.5 ? 1 : -1; e.cd = 1.5 + Math.random(); e.anim = 'idle'; },
  update(e, w, dt) {
    e.data.a += dt * 0.9 * e.data.dir;
    const R = 95;
    const tx = w.player.x + Math.cos(e.data.a) * R, ty = w.player.y + Math.sin(e.data.a) * R * 0.75;
    const a = angleTo(e.x, e.y, tx, ty);
    const s = e.def.speed * e.spd();
    const h = e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
    if (h.hx || h.hy) e.data.dir *= -1;
    e.z = 3 + Math.sin(e.t * 2) * 2;
    e.flip = w.player.x < e.x;
    e.cd -= dt;
    if (e.cd < 0.5) e.setAnim('raise'); else { e.setAnim('idle'); e.animate(dt, 3); }
    if (e.cd <= 0) { e.cd = 2 + Math.random(); spreadShot(e, w, w.run.floorIndex >= 4 ? 3 : 1, aimAngle(e, w, 0.5, 130), 0.3, 130, { shape: 'water' }); w.audio.play('splash', { x: e.x, vol: 0.4 }); }
  },
};

export const UNDER_ENEMIES: EnemyDef[] = [rat, leech, bloater, grateeye, sludgeDef('sludge', 3, 'sludge2'), sludgeDef('sludge2', 2, 'sludge3'), sludgeDef('sludge3', 1, null), drowner];
void eye; void teeth; void legs; void sprinkle; void hasLOS; void wander; void telegraph; void (null as unknown as Enemy); void (null as unknown as World);
