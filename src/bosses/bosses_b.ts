// Chapter II–IV bosses.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, crack, rivets, stitches, bigEye } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer } from '../enemies/ai';
import { rig, drawRigged } from './rig';
import * as G from './art_b';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { TAU, angleTo, angleDiff, clamp, dist } from '../core/math';
import type { World } from '../game/world';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ rot: number; alpha: number; tint: string; tintAmt: number; yoff: number }> = {}, w?: World): void {
  // rigged bosses pick their own pose and draw their eyes live
  if (w && e.sprites.death) { drawRigged(e, ctx, w, sx, sy, { tint: extra.tint, tintAmt: extra.tintAmt, alpha: extra.alpha, yoff: extra.yoff ?? 2 }); return; }
  const set = e.sprites[e.anim] ?? e.sprites.idle; const spr = set[e.frame % set.length];
  spr.draw(ctx, sx, sy - e.z + (extra.yoff ?? 2), { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, rot: extra.rot, alpha: extra.alpha ?? (e.alpha < 1 ? e.alpha : undefined), tint: extra.tint, tintAmt: extra.tintAmt });
}
function gapRing(e: Enemy, w: World, n: number, gap: number, speed: number, at: number, o: Parameters<typeof shoot>[4] = {}): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    if (Math.abs(angleDiff(a, at)) < (gap / n) * Math.PI) continue;
    shoot(e, w, a, speed, o);
  }
}

// ================================================================== Furnace Heart
// Rhythm: it turns its fire jets, lobs coals at marked spots, then vents a ring of steam with one
// gap and has to cool with its grate hanging open: that open grate is the weak spot. Overheated
// (below 45%) it moves, jets twice, and vents more often.
const furnaceBrain: BossBrain = {
  idleTime: [0.8, 1.3], phases: [0.45],
  sequence: [['jets', 'coal', 'vent'], ['jets', 'vent', 'coal', 'jets', 'vent']],
  idle(e, w, dt) {
    const c = w.room.center();
    if (e.data.phase) chase(e, w, 30, dt);
    else { const a = angleTo(e.x, e.y, c.x, c.y - 10); if (dist(e.x, e.y, c.x, c.y - 10) > 4) e.move(w, Math.cos(a) * 20 * dt, Math.sin(a) * 20 * dt); }
    e.animate(dt, 6);
    if (Math.random() < dt * 8) w.fx.embers(e.x + 10, e.y - 56, 1, '#ff8a30');
  },
  attacks: [
    { id: 'jets', weight: 3,
      start(e) { e.data.ja = Math.random() * TAU; e.data.jt = 0; e.setAnim('open'); },
      run(e, w, t, dt) {
        if (t < 0.6) { if (Math.random() < 0.5) w.fx.embers(e.x, e.y - 20, 2, '#ffb040'); return false; }
        e.data.ja += dt * (e.data.phase ? 1.5 : 1.1);
        e.data.jt -= dt;
        if (e.data.jt <= 0) {
          // three arms (120 degree lanes) at first, five once overheated: always room to walk between
          e.data.jt = 0.09;
          const arms = e.data.phase ? 5 : 3;
          for (let i = 0; i < arms; i++) shoot(e, w, e.data.ja + (i / arms) * TAU, 120, { shape: 'ember', r: 3.5 });
        }
        if (t > 3) { e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'coal', weight: 2,
      run(e, w, t) {
        if (t > 0.5 && !e.data.c) {
          e.data.c = true;
          for (let i = 0; i < (e.data.phase ? 7 : 5); i++) {
            const tx = w.player.x + (Math.random() - 0.5) * 120, ty = w.player.y + (Math.random() - 0.5) * 80;
            const d = clamp(dist(e.x, e.y, tx, ty), 30, 260);
            shoot(e, w, angleTo(e.x, e.y, tx, ty), d / 1.1, { lob: true, lobH: 70, range: d, shape: 'ember', r: 5, creep: '#a03a1a' });
            telegraph(w, tx, ty, 12, 1.1, '#ff6a2a');
          }
          w.audio.play('bossSpit', { x: e.x }); e.sy = 1.15;
        }
        if (t > 1.6) { e.data.c = false; return true; }
        return false;
      } },
    { id: 'vent', weight: 2,
      run(e, w, t) {
        if (t < 0.6) { if (Math.random() < 0.6) w.fx.smoke(e.x, e.y - 30, 1, 'rgba(230,230,240,', 3, 0.5, 30); return false; }
        if (!e.data.v) { e.data.v = true; gapRing(e, w, 28, 5, 95, angleTo(e.x, e.y, w.player.x, w.player.y) + (Math.random() - 0.5) * 2, { shape: 'holy', r: 4 }); w.audio.play('extinguish', { x: e.x }); w.shake(2); }
        if (t > 1.2 && e.data.phase && !e.data.v2) { e.data.v2 = true; gapRing(e, w, 28, 5, 95, Math.random() * TAU, { shape: 'holy', r: 4 }); }
        if (t > 1.6) { e.data.v = e.data.v2 = false; e.setAnim('open'); return true; }
        return false;
      }, recover: 1.5 },
  ],
  onPhase(e, w) { w.hud.toast('The furnace overheats!'); },
};
const furnaceheart: EnemyDef = {
  id: 'furnaceheart', name: 'Furnace Heart', desc: 'It has been burning since before the house was built.', boss: true,
  hp: 270, r: 20, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 20, noKnock: true, gore: '#2a2224', goreDecal: '#1a1416', light: [110, '#ff6a2a'], contact: 1,
  sprites: () => rig({ w: 62, h: 68, paint: G.paintFurnace, phases: 1, aliases: { hot: 'idle' }, fps: { open: 7 },
    // the firebox door hanging open, the fire breathing in the throat
    extra: { open: [0, 1, 2, 3].map((f) => ({ x: { open: 1 }, jaw: 0.85 + (f % 2) * 0.15, breath: Math.sin(f * 1.6) })) } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) {
    bossUpdate(e, w, dt, furnaceBrain);
    if (e.state === 'idle' && e.anim === 'open') e.anim = 'idle';
    if (e.data.phase && e.anim === 'idle') e.anim = 'hot';
    // cooling with the grate open: steam pours off it
    if (e.state === 'recover' && Math.random() < dt * 14) w.fx.smoke(e.x + (Math.random() - 0.5) * 16, e.y - 30, 1, 'rgba(230,230,240,', 4, 0.6, 26);
  },
  // the iron casing turns most of a hit; through the open grate it all goes in
  onHurt(e, w, dmg, info) {
    if (e.data.exposed || e.anim === 'open') return dmg;
    if (info.source !== 'burn' && info.source !== 'poison' && w.time - (e.data.clangT ?? -9) > 0.15) { e.data.clangT = w.time; w.audio.play('clang', { x: e.x, vol: 0.4 }); }
    return dmg * 0.6;
  },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, e.data.phase ? { tint: '#ff2010', tintAmt: 0.08 + Math.sin(w.time * 8) * 0.05 } : {}, w); },
};

// ================================================================== Old Stoker
// Rhythm: three waves of coal from the shovel, then the charge. If he hits a wall he's dazed and
// the coals fall around the room (step between the marks); then he stomps where you stood. Below
// half he charges twice and whirls his shovel between.
const stokerBrain: BossBrain = {
  idleTime: [0.7, 1.2], phases: [0.5],
  sequence: [['shovel', 'charge', 'stomp'], ['charge', 'stomp', 'charge', 'whirl', 'shovel']],
  idle(e, w, dt) { chase(e, w, e.data.phase ? 48 : 36, dt); e.setAnim('walk'); e.animate(dt, 6); },
  attacks: [
    { id: 'charge', weight: 3,
      start(e, w) { e.setAnim('raise'); e.data.ca = angleTo(e.x, e.y, w.player.x, w.player.y); w.audio.play('bossRoar', { x: e.x, vol: 0.6, pitch: 1.2 }); },
      run(e, w, t, dt) {
        if (t < 0.6) return false;
        e.setAnim('walk'); e.animate(dt, 16);
        const h = e.move(w, Math.cos(e.data.ca) * 240 * dt, Math.sin(e.data.ca) * 240 * dt);
        e.flip = Math.cos(e.data.ca) < 0;
        if (h.hx || h.hy || t > 2.2) {
          e.data.dazed = !!(h.hx || h.hy);
          w.shake(e.data.dazed ? 6 : 3); w.audio.play('slam', { x: e.x });
          // the coals land on marked spots, never right on top of you or him, so there's always room
          for (let i = 0, n = 0; i < 30 && n < (e.data.phase ? 9 : 6); i++) {
            const p = randomFloorPoint(w);
            if (dist(p.x, p.y, w.player.x, w.player.y) < 34 || dist(p.x, p.y, e.x, e.y) < 30) continue;
            n++; telegraph(w, p.x, p.y, 10, 0.9, '#ff6a2a'); w.proj.enemy(p.x, p.y, 0, 0, { drop: 200 + Math.random() * 40, shape: 'ember', r: 5, creep: '#a03a1a' });
          }
          return true;
        }
        return false;
      }, recover: (e) => (e.data.dazed ? 1.3 : 0.3) },
    { id: 'shovel', weight: 3,
      start(e) { e.setAnim('raise'); },
      run(e, w, t) {
        // three swings, each a fan of five with the gaps shifted half a step: a lane opens, then moves
        const wave = Math.floor((t - 0.5) / 0.38);
        if (t > 0.5 && wave > (e.data.sw ?? -1) && wave < 3) {
          e.data.sw = wave; e.setAnim(wave % 2 ? 'raise' : 'walk');
          const a = e.data.sa ??= aimAngle(e, w), n = 5, off = wave % 2 ? 0.5 : 0;
          for (let i = 0; i < n; i++) shoot(e, w, a + (i - (n - 1) / 2 + off) * 0.26, 125, { shape: 'ember', r: 3.6 });
          if (e.data.phase) shoot(e, w, a, 90, { shape: 'ember', r: 4.5 });
          w.audio.play('swing', { x: e.x, pitch: 1 + wave * 0.08 }); e.sx = 1.12; e.sy = 0.9;
        }
        if (t > 0.5 + 3 * 0.38 + 0.2) { e.data.sw = -1; e.data.sa = undefined; e.setAnim('walk'); return true; }
        return false;
      }, recover: 0.45 },
    { id: 'stomp', weight: 2,
      start(e, w) { e.data.tx = w.player.x; e.data.ty = w.player.y; e.data.sx0 = e.x; e.data.sy0 = e.y; telegraph(w, e.data.tx, e.data.ty, 22, 0.9); e.mode = 'fly'; },
      run(e, w, t) {
        const k = clamp((t - 0.2) / 0.7, 0, 1);
        e.x = e.data.sx0 + (e.data.tx - e.data.sx0) * k; e.y = e.data.sy0 + (e.data.ty - e.data.sy0) * k; e.z = Math.sin(k * Math.PI) * 60;
        if (k >= 1 && !e.data.land) { e.data.land = true; e.z = 0; e.mode = 'walk'; ringShot(e, w, e.data.phase ? 16 : 12, 120, Math.random(), { shape: 'ember' }); w.shake(7); w.audio.play('slam', { x: e.x }); e.sx = 1.3; e.sy = 0.75; }
        if (t > 1.3) { e.data.land = false; return true; }
        return false;
      }, recover: 0.7 },
    { id: 'whirl', weight: 2, phases: [1],
      run(e, w, t, dt) {
        e.data.wa = (e.data.wa ?? 0) + dt * 6; e.flip = Math.sin(e.data.wa) < 0;
        e.data.wt = (e.data.wt ?? 0) - dt;
        if (e.data.wt <= 0) { e.data.wt = 0.06; shoot(e, w, e.data.wa, 120, { shape: 'ember' }); shoot(e, w, e.data.wa + Math.PI, 120, { shape: 'ember' }); }
        chase(e, w, 25, dt);
        return t > 2.2;
      } },
  ],
};
const oldstoker: EnemyDef = {
  id: 'oldstoker', name: 'Old Stoker', desc: 'He kept the house warm. He never stopped.', boss: true,
  hp: 290, r: 16, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 12, noKnock: true, gore: '#3e3230', goreDecal: '#1a1416', light: [60, '#ff8a3a'],
  sprites: () => rig({ w: 62, h: 62, paint: G.paintStoker, phases: 1, aliases: { walk: 'move' }, extra: { raise: [{ raise: 1, lean: -0.5, jaw: 0.7, squash: 0.05 }] } }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, stokerBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Rat King
const ratBrain = (prince: boolean): BossBrain => ({
  idleTime: prince ? [0.6, 1] : [0.8, 1.3], phases: prince ? [] : [0.5],
  idle(e, w, dt) { chase(e, w, prince ? 55 : 40, dt); e.animate(dt, 8); },
  attacks: [
    { id: 'scatter', weight: 2, cooldown: 3,
      run(e, w, t) {
        if (t > 0.4 && !e.data.s) { e.data.s = true; const n = w.enemies.filter((x) => !x.dead && x.def.id === 'rat').length; for (let i = 0; i < (n < 5 ? 3 : 0); i++) { const k = w.spawnEnemy('rat', e.x, e.y, true); if (k) k.noDrop = true; } w.audio.play('chitter', { x: e.x }); }
        if (t > 0.8) { e.data.s = false; return true; }
        return false;
      } },
    { id: 'roll', weight: 3,
      start(e, w) { e.data.ra = angleTo(e.x, e.y, w.player.x, w.player.y); e.data.b = 2; e.vx = Math.cos(e.data.ra) * 200; e.vy = Math.sin(e.data.ra) * 200; },
      run(e, w, t, dt) {
        if (t < 0.45) { e.x += Math.sin(t * 60) * 0.6; return false; }
        const h = e.move(w, e.vx * dt, e.vy * dt);
        if (h.hx) { e.vx = -e.vx; e.data.b--; w.shake(2); w.audio.play('thud', { x: e.x }); }
        if (h.hy) { e.vy = -e.vy; e.data.b--; w.shake(2); w.audio.play('thud', { x: e.x }); }
        e.animate(dt, 20);
        return e.data.b < 0 || t > 3;
      } },
    { id: 'squeak', weight: 2,
      run(e, w, t) {
        if (t > 0.45 && !e.data.q) { e.data.q = true; ringShot(e, w, prince ? 6 : 10, 105, Math.random()); spreadShot(e, w, 3, aimAngle(e, w), 0.4, 150); w.audio.play('chitter', { x: e.x }); }
        if (t > 0.9) { e.data.q = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w) {
    if (prince) return;
    // the knot tears apart into two princes
    for (const s of [-1, 1]) {
      const k = w.spawnEnemy('ratprince', e.x + s * 20, e.y, true);
      if (k) { k.isBoss = true; k.spawnT = 0.3; w.bossList.push(k); k.kvx = s * 150; }
    }
    w.hud.toast('The knot tears in two!');
    e.isBoss = false; w.killEnemy(e, true);
    w.bossList = w.bossList.filter((b) => b !== e);
  },
});
const ratBrainK = ratBrain(false), ratBrainP = ratBrain(true);
const ratking: EnemyDef = {
  id: 'ratking', name: 'The Rat King', desc: 'A crown, a knot, and two hundred tiny teeth.', boss: true,
  hp: 300, r: 17, speed: 0, role: 'boss', cost: 0, hitY: 14, mass: 8, noKnock: true, gore: '#6a3a3a', goreDecal: '#3a1a1a',
  sprites: () => rig({ w: 62, h: 56, paint: (p, s) => G.paintRatKing(p, s, 1), phases: 1 }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, ratBrainK); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};
const ratprince: EnemyDef = {
  id: 'ratprince', name: 'Rat Prince', desc: '', boss: true,
  hp: 85, r: 11, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, noKnock: true, gore: '#6a3a3a', goreDecal: '#3a1a1a',
  sprites: () => rig({ w: 44, h: 40, paint: (p, s) => G.paintRatKing(p, s, 0.7), phases: 1 }),
  init(e) { e.anim = 'idle'; e.data.idleT = 0.8; },
  update(e, w, dt) { bossUpdate(e, w, dt, ratBrainP); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== Bilgemaw
const bilgeBrain: BossBrain = {
  idleTime: [0.6, 1.1], phases: [0.5],
  idle(e, w, dt) {
    e.data.oa = (e.data.oa ?? 0) + dt * 0.9;
    const tx = w.player.x + Math.cos(e.data.oa) * 90, ty = w.player.y + Math.sin(e.data.oa) * 60;
    const a = angleTo(e.x, e.y, tx, ty);
    e.move(w, Math.cos(a) * 70 * dt, Math.sin(a) * 70 * dt);
    e.data.face = angleTo(e.x, e.y, w.player.x, w.player.y);
  },
  attacks: [
    { id: 'lunge', weight: 3,
      start(e, w) { e.data.n = e.data.phase ? 2 : 1; e.data.k = 0; },
      run(e, w, t, dt) {
        const st = e.data.ls ?? 'dive';
        if (st === 'dive') {
          e.hidden = true; e.invuln = true;
          // pick a line through the player from a wall
          const room = w.room;
          const horiz = Math.random() < 0.5;
          const L = room.ox + 10, R = room.ox + room.cols * 24 - 10, T = room.oy + 10, B = room.oy + room.rows * 24 - 10;
          if (horiz) { e.data.from = { x: Math.random() < 0.5 ? L : R, y: clamp(w.player.y, T, B) }; e.data.to = { x: e.data.from.x === L ? R : L, y: e.data.from.y }; }
          else { e.data.from = { x: clamp(w.player.x, L, R), y: Math.random() < 0.5 ? T : B }; e.data.to = { x: e.data.from.x, y: e.data.from.y === T ? B : T }; }
          for (let i = 0; i <= 8; i++) { const k = i / 8; telegraph(w, e.data.from.x + (e.data.to.x - e.data.from.x) * k, e.data.from.y + (e.data.to.y - e.data.from.y) * k, 9, 0.8, '#80c0d0'); }
          w.audio.play('rumble', { x: e.x });
          e.data.ls = 'wait'; e.data.lt = t;
          return false;
        }
        if (st === 'wait') { if (t - e.data.lt > 0.8) { e.x = e.data.from.x; e.y = e.data.from.y; e.hidden = false; e.invuln = false; e.data.ls = 'go'; e.data.lt = t; e.data.face = angleTo(e.x, e.y, e.data.to.x, e.data.to.y); e.data.snap = (e.data.snap ?? 0) + 1; w.audio.play('splash', { x: e.x }); } return false; }
        if (st === 'go') {
          const a = angleTo(e.x, e.y, e.data.to.x, e.data.to.y);
          e.x += Math.cos(a) * 330 * dt; e.y += Math.sin(a) * 330 * dt;
          if (Math.random() < 0.5) w.addCreep(e.x, e.y, 10, 'enemy', 1, 2.5, '#3a5a4a');
          if (dist(e.x, e.y, e.data.to.x, e.data.to.y) < 12) {
            e.data.k++;
            if (e.data.k < e.data.n) { e.data.ls = 'dive'; return false; }
            e.data.ls = undefined; ringShot(e, w, 8, 100, Math.random(), { shape: 'water' }); return true;
          }
          return false;
        }
        return true;
      } },
    { id: 'spit', weight: 2,
      run(e, w, t) {
        if (t > 0.5 && !e.data.s) {
          e.data.s = true;
          for (let i = -1; i <= 1; i++) { const d = clamp(distToPlayer(e, w), 40, 220); shoot(e, w, aimAngle(e, w) + i * 0.35, d / 0.9, { lob: true, lobH: 50, range: d, shape: 'spore', r: 5, creep: '#4a7a3a' }); }
          w.audio.play('bossSpit', { x: e.x });
        }
        if (t > 1) { e.data.s = false; return true; }
        return false;
      } },
    { id: 'coil', weight: 2,
      run(e, w, t, dt) {
        e.data.oa = (e.data.oa ?? 0) + dt * 2.2;
        const tx = w.player.x + Math.cos(e.data.oa) * 80, ty = w.player.y + Math.sin(e.data.oa) * 55;
        const a = angleTo(e.x, e.y, tx, ty); e.move(w, Math.cos(a) * 160 * dt, Math.sin(a) * 160 * dt);
        e.data.ct = (e.data.ct ?? 0) - dt;
        if (e.data.ct <= 0) { e.data.ct = 0.3; shoot(e, w, aimAngle(e, w), 120, { shape: 'water' }); }
        e.data.face = a;
        return t > 2.5;
      } },
  ],
};
const BILGE_SEGS = 5, BILGE_GAP = 13;
/** Bilgemaw's head: a drain-dwelling anglerfish with a lure, whiskers and a mouth full of needles. */
const bilgemaw: EnemyDef = {
  id: 'bilgemaw', name: 'Bilgemaw', desc: 'Everything drains down. It waits at the bottom with its mouth open.', boss: true,
  hp: 290, r: 13, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 10, noKnock: true, gore: '#3a5a4a', goreDecal: '#1a2a22', ghost: true, noSeparate: true,
  sprites: () => rig({ w: 52, h: 42, paint: G.paintBilge, phases: 1 }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; e.data.snap = 0; e.mode = 'ghost'; },
  update(e, w, dt) {
    // the body is made of real segments (separate enemies) that follow the head
    if (!e.data.segs) {
      e.data.segs = [];
      for (let i = 0; i < BILGE_SEGS; i++) {
        const k = w.spawnEnemy('bilgeseg', e.x, e.y, false);
        if (!k) continue;
        k.parent = e; k.data.i = i; k.spawnT = e.spawnT; k.noDrop = true;
        e.data.segs.push(k);
      }
    }
    e.animate(dt, 4);
    bossUpdate(e, w, dt, bilgeBrain);
  },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) { ctx.strokeStyle = 'rgba(120,170,180,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 6, 0, 0, TAU); ctx.stroke(); return; }
    e.flip = Math.cos(e.data.face ?? 0) < 0;
    drawBoss(e, ctx, sx, sy, { yoff: 4 }, w);
  },
};
/**
 * One body segment of the Bilgemaw. It is a real enemy, so shots, beams, explosions and chain lightning
 * all find it; damage it takes is passed on to the head, which holds the shared health bar.
 */
const bilgeseg: EnemyDef = {
  id: 'bilgeseg', name: 'Bilgemaw', desc: '', hp: 1e7, r: 8, speed: 0, role: 'boss', cost: 0, hitY: 8, mass: 10, noKnock: true,
  gore: '#3a5a4a', goreDecal: '#1a2a22', ghost: true, noSeparate: true, contact: 1,
  sprites: () => ({ idle: frames(24, 20, 1, (p) => G.paintBilgeSeg(p)) }),
  init(e) { e.anim = 'idle'; e.mode = 'ghost'; e.data.snap = -1; },
  onHurt(e, w, dmg, info) {
    const head = e.parent as Enemy | null;
    if (!head || head.dead || head.invuln || head.hidden) return 0;
    w.damageEnemy(head, dmg * 0.7, { ang: info.ang, knock: 0, source: 'link', crit: false, prof: null });
    e.hp = e.maxHp; // segments never die on their own
    return dmg;
  },
  update(e, w) {
    const head = e.parent as Enemy | null;
    if (!head || head.dead) { w.killEnemy(e); return; }
    e.hidden = head.hidden; e.invuln = head.invuln || head.hidden; e.spawnT = Math.min(e.spawnT, head.spawnT);
    const i = e.data.i as number;
    const prev: Enemy = i === 0 ? head : (head.data.segs[i - 1] ?? head);
    if (e.data.snap !== head.data.snap) {
      // the head just surfaced somewhere new: lay the body out straight behind it
      e.data.snap = head.data.snap;
      const a = (head.data.face ?? 0) + Math.PI;
      e.x = head.x + Math.cos(a) * BILGE_GAP * (i + 1); e.y = head.y + Math.sin(a) * BILGE_GAP * (i + 1);
    } else {
      // follow the segment in front, keeping a fixed gap so the body never comes apart
      const d = dist(e.x, e.y, prev.x, prev.y);
      if (d > BILGE_GAP) { e.x = prev.x + ((e.x - prev.x) / d) * BILGE_GAP; e.y = prev.y + ((e.y - prev.y) / d) * BILGE_GAP; }
    }
    e.data.face = angleTo(e.x, e.y, prev.x, prev.y);
  },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) return;
    const k = 1 - (e.data.i ?? 0) * 0.09;
    e.sprites.idle[0].draw(ctx, sx, sy + 4, { sx: k, sy: k, flip: Math.cos(e.data.face ?? 0) < 0, flash: e.flash > 0 ? 0.7 : 0 });
  },
};

// ================================================================== The Matron
const matronBrain: BossBrain = {
  idleTime: [0.7, 1.2], phases: [0.5],
  idle(e, w, dt) { keepDistance(e, w, 80, 140, e.data.phase ? 60 : 40, dt); e.setAnim('idle'); },
  attacks: [
    { id: 'teleport', weight: 2,
      start(e, w) { const a = Math.random() * TAU; e.data.tp = { x: clamp(w.player.x + Math.cos(a) * 90, w.room.ox + 20, w.room.ox + w.room.cols * 24 - 20), y: clamp(w.player.y + Math.sin(a) * 60, w.room.oy + 20, w.room.oy + w.room.rows * 24 - 20) }; telegraph(w, e.data.tp.x, e.data.tp.y, 14, 0.7, '#e0e0ff'); },
      run(e, w, t) {
        e.alpha = t < 0.35 ? 1 - t / 0.35 : t < 0.7 ? 0 : Math.min(1, (t - 0.7) / 0.3);
        e.invuln = t > 0.25 && t < 0.75;
        if (t > 0.7 && e.data.tp) { e.x = e.data.tp.x; e.y = e.data.tp.y; e.data.tp = null; spreadShot(e, w, 5, aimAngle(e, w), 1, 150, { shape: 'holy', r: 3 }); }
        if (t > 1) { e.alpha = 1; return true; }
        return false;
      } },
    { id: 'syringes', weight: 3,
      start(e) { e.setAnim('raise'); },
      run(e, w, t) {
        const n = Math.floor((t - 0.45) / 0.35);
        if (t > 0.45 && n > (e.data.n ?? -1) && n < (e.data.phase ? 3 : 2)) { e.data.n = n; spreadShot(e, w, 5, aimAngle(e, w), 0.8, 165, { shape: 'holy', r: 3 }); w.audio.play('needle', { x: e.x }); }
        if (t > 1.3) { e.data.n = -1; e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'dolls', weight: 1.5, cooldown: 5,
      run(e, w, t) {
        if (t > 0.6 && !e.data.d) { e.data.d = true; const n = w.enemies.filter((x) => !x.dead && x.def.id === 'nursedoll').length; for (let i = 0; i < Math.min(2, 3 - n); i++) { const k = w.spawnEnemy('nursedoll', e.x + (i ? 20 : -20), e.y + 10, true); if (k) k.noDrop = true; } w.audio.play('bell', { x: e.x, vol: 0.4 }); }
        if (t > 1) { e.data.d = false; return true; }
        return false;
      } },
    { id: 'inject', weight: 2,
      start(e, w) { e.setAnim('raise'); e.data.ia = angleTo(e.x, e.y, w.player.x, w.player.y); telegraph(w, e.x + Math.cos(e.data.ia) * 60, e.y + Math.sin(e.data.ia) * 60, 14, 0.5); },
      run(e, w, t, dt) {
        if (t < 0.5) return false;
        const h = e.move(w, Math.cos(e.data.ia) * 260 * dt, Math.sin(e.data.ia) * 260 * dt);
        if (Math.random() < 0.6) w.addCreep(e.x, e.y, 9, 'enemy', 1, 3, '#6a9a2a');
        if (h.hx || h.hy || t > 1.3) { e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'rain', weight: 2, phases: [1],
      run(e, w, t) {
        if (t > 0.4 && !e.data.r) { e.data.r = true; for (let i = 0; i < 10; i++) { const p = randomFloorPoint(w); const d = clamp(dist(e.x, e.y, p.x, p.y), 30, 300); telegraph(w, p.x, p.y, 9, 1.0, '#a0e060'); shoot(e, w, angleTo(e.x, e.y, p.x, p.y), d / 1.0, { lob: true, lobH: 80, range: d, shape: 'holy', r: 3 }); } }
        if (t > 1.4) { e.data.r = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w) { w.hud.toast('Lights out. The night shift begins.'); w.floor.curse = w.floor.curse ?? null; w.run.flags.nightShift = true; },
};
const matron: EnemyDef = {
  id: 'matron', name: 'The Matron', desc: 'Visiting hours are over. Your name is not on her list.', boss: true,
  hp: 330, r: 11, speed: 0, role: 'boss', cost: 0, hitY: 26, mass: 6, noKnock: true, gore: '#e8d0c8', goreDecal: '#6a2a2a',
  sprites: () => rig({ w: 50, h: 68, paint: G.paintMatron, phases: 1, extra: { raise: [{ raise: 1, lean: -0.4, jaw: 0.45 }] } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, matronBrain); e.flip = w.player.x < e.x; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Sleepwalker
const sleepBrain: BossBrain = {
  idleTime: [0.9, 1.4], phases: [0.5],
  idle(e, w, dt) {
    if (!e.data.phase) { const a = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.sin(e.t) * 0.6; e.move(w, Math.cos(a) * 18 * dt, Math.sin(a) * 18 * dt); }
    else chase(e, w, 45, dt);
    e.z = 6 + Math.sin(e.t * 1.5) * 3; e.animate(dt, 3);
  },
  attacks: [
    { id: 'hands', weight: 3,
      start(e) { e.data.h = 0; e.data.ht = 0; },
      run(e, w, t, dt) {
        e.data.ht -= dt;
        if (e.data.ht <= 0 && e.data.h < (e.data.phase ? 5 : 3)) {
          e.data.ht = 0.55; e.data.h++;
          const x = w.player.x, y = w.player.y;
          telegraph(w, x, y, 14, 0.7, '#c0c8ff');
          w.after(0.7, () => { if (e.dead) return; w.fx.burst(x, y, 4, 12, '#c0c8ff', 80, 0.5); w.proj.enemy(x, y, 0, 0, { r: 10, range: 1, shape: 'holy', z: 2, life: 0.15 }); for (let i = 0; i < 4; i++) w.proj.enemy(x, y, (i / 4) * TAU + Math.PI / 4, 90, { shape: 'holy', r: 3 }); w.audio.play('hit', { x, pitch: 0.6 }); });
        }
        return t > (e.data.phase ? 3.4 : 2.2);
      } },
    { id: 'sigh', weight: 2,
      run(e, w, t) {
        if (t > 0.6 && !e.data.s) { e.data.s = true; ringShot(e, w, 14, 70, Math.random(), { shape: 'holy', r: 4 }); w.audio.play('choir', { x: e.x, vol: 0.4 }); }
        if (t > 1.2 && e.data.phase && !e.data.s2) { e.data.s2 = true; ringShot(e, w, 14, 70, Math.random(), { shape: 'holy', r: 4 }); }
        if (t > 1.6) { e.data.s = e.data.s2 = false; return true; }
        return false;
      } },
    { id: 'dash', weight: 3, phases: [1],
      start(e) { e.data.dn = 0; e.data.dt = 0; },
      run(e, w, t, dt) {
        e.data.dt -= dt;
        if (e.data.dt <= 0) {
          if (e.data.dn >= 3) return true;
          e.data.dn++; e.data.dt = 0.8; e.data.da = angleTo(e.x, e.y, w.player.x, w.player.y);
          telegraph(w, e.x + Math.cos(e.data.da) * 50, e.y + Math.sin(e.data.da) * 50, 12, 0.3);
        }
        if (e.data.dt < 0.5) {
          e.move(w, Math.cos(e.data.da) * 280 * dt, Math.sin(e.data.da) * 280 * dt);
          if (Math.random() < 0.3) w.proj.enemy(e.x, e.y - 10, e.data.da + Math.PI / 2 * (Math.random() < 0.5 ? 1 : -1), 40, { shape: 'holy', r: 3, range: 60 });
        }
        return false;
      } },
  ],
  onPhase(e, w) { e.anim = 'awake'; w.hud.toast('It wakes.'); w.audio.play('bossRoar', { x: e.x }); w.fx.burst(e.x, e.y, 20, 30, '#e0e0e8', 120, 0.8, 2); },
};
const sleepwalker: EnemyDef = {
  id: 'sleepwalker', name: 'The Sleepwalker', desc: 'Bed fourteen has not been empty in forty years.', boss: true,
  hp: 320, r: 13, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 6, flying: true, noKnock: true, gore: '#c8c8d0', goreDecal: '#4a4a5a',
  sprites: () => rig({ w: 46, h: 60, paint: G.paintSleeper, phases: 1, aliases: { awake: 'idle' } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, sleepBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { alpha: e.data.phase ? 1 : 0.9 }, w); w.r.addGlow(sx, sy - 24, 30, '#c0c8ff', 0.12); },
};

export const BOSSES_B: EnemyDef[] = [furnaceheart, oldstoker, ratking, ratprince, bilgemaw, bilgeseg, matron, sleepwalker];
void eye; void teeth; void legs; void (null as unknown as Enemy);
