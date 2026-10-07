// Themed bosses for the newer chapters (Greenhouse, Frozen Cistern, Clocktower, Print Shop), a
// second Binding boss, and The Unwritten: what waits on the Last Page beyond the Margins.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { getSprites } from '../enemies/enemy';
import { rig, drawRigged, drawEyes } from './rig';
import * as G from './art_d';
import { bigEye, crack, drips, eye, frames, glowEye, grain, hex, maw, ramp, rivets, sprinkle, stitches } from '../art/creature';
import { aimAngle, shoot, spreadShot, ringShot, randomFloorPoint, chase, keepDistance } from '../enemies/ai';
import { bossUpdate, BossBrain, BossAttack, telegraph } from './boss';
import { TAU, angleTo, angleDiff, clamp, dist } from '../core/math';
import { enemyBeam, Beam } from '../projectiles/weapons';
import type { World } from '../game/world';
import { getEnemy } from '../enemies/registry';
import { TILE } from '../core/constants';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ rot: number; alpha: number; tint: string; tintAmt: number; yoff: number; scale: number }> = {}, w?: World): void {
  // rigged bosses pick their own pose and draw their eyes live
  if (w && e.sprites.death) { drawRigged(e, ctx, w, sx, sy, { tint: extra.tint, tintAmt: extra.tintAmt, alpha: extra.alpha, yoff: extra.yoff ?? 2 }); return; }
  const set = e.sprites[e.anim] ?? e.sprites.idle; const spr = set[e.frame % set.length];
  const k = extra.scale ?? 1;
  spr.draw(ctx, sx, sy - e.z + (extra.yoff ?? 2), { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx * k, sy: e.sy * k, rot: extra.rot, alpha: extra.alpha ?? (e.alpha < 1 ? e.alpha : undefined), tint: extra.tint, tintAmt: extra.tintAmt });
}
function gapRing(e: Enemy, w: World, n: number, gap: number, speed: number, at: number, o: Parameters<typeof shoot>[4] = {}): void {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (Math.abs(angleDiff(a, at)) < (gap / n) * Math.PI) continue; shoot(e, w, a, speed, o); }
}
/** Shots that fall from above onto a point, with a warning circle. */
function dropAt(w: World, x: number, y: number, delay: number, o: Parameters<World['proj']['enemy']>[4] = {}): void {
  telegraph(w, x, y, 9, 0.5 + delay, '#80c0ff');
  w.after(delay, () => { w.proj.enemy(x, y, 0, 0, { drop: 120, r: 5, ...o }); });
}
/** A line of ink bursting out of the floor toward a point, one blot after another. */
function tendril(w: World, x0: number, y0: number, ang: number, n: number, step: number, o: Parameters<World['proj']['enemy']>[4] = {}): void {
  for (let i = 1; i <= n; i++) {
    const x = x0 + Math.cos(ang) * step * i, y = y0 + Math.sin(ang) * step * i;
    w.after(i * 0.06, () => { w.proj.enemy(x, y, ang, 0, { r: 5, life: 0.75, shape: 'inkE', z: 4, ...o }); w.fx.burst(x, y, 2, 2, '#1a1430', 40, 0.3); });
  }
}
const inRoom = (w: World, x: number, y: number) => x > w.room.ox + 12 && x < w.room.ox + w.room.cols * TILE - 12 && y > w.room.oy + 12 && y < w.room.oy + w.room.rows * TILE - 12;

// ================================================================== The Thornwife (Greenhouse)
const thornBrain: BossBrain = {
  idleTime: [0.9, 1.4], phases: [0.5],
  idle(e, w, dt) { keepDistance(e, w, 90, 150, 18 + e.data.phase * 10, dt); e.setAnim('idle'); e.animate(dt, 4); },
  attacks: [
    { id: 'thorns', weight: 3,
      run(e, w, t) {
        const times = e.data.phase ? [0.35, 0.65, 0.95] : [0.4, 0.8];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) { spreadShot(e, w, e.data.phase ? 7 : 5, aimAngle(e, w), 1.0, 135, { shape: 'needle', r: 3 }); e.data.k++; w.audio.play('needle', { x: e.x }); }
        if (t > times[times.length - 1] + 0.4) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'roots', weight: 2.5,
      start(e, w) { e.data.ra = angleTo(e.x, e.y, w.player.x, w.player.y); e.setAnim('open'); w.audio.play('rumble', { x: e.x }); },
      run(e, w, t) {
        if (t > 0.45 && !e.data.rd) {
          e.data.rd = true;
          const spread = e.data.phase ? [-0.35, 0, 0.35] : [0];
          for (const s of spread) tendril(w, e.x, e.y, e.data.ra + s, 12, 16, { shape: 'spore', r: 5 });
        }
        if (t > 1.3) { e.data.rd = false; e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'pollen', weight: 2,
      run(e, w, t) {
        if (t > 0.3 && !e.data.pd) { e.data.pd = true; ringShot(e, w, e.data.phase ? 14 : 10, 55, Math.random(), { shape: 'spore', r: 4, curve: 0.6, range: 360 }); w.audio.play('bossSpit', { x: e.x }); }
        if (t > 0.9) { e.data.pd = false; return true; }
        return false;
      } },
    { id: 'uproot', weight: 1.5, cooldown: 5, phases: [1],
      run(e, w, t) {
        if (t < 0.5) { e.sy = 1 - t; return false; }
        if (!e.data.up) { e.data.up = true; e.hidden = true; e.invuln = true; const p = randomFloorPoint(w, 90); e.x = p.x; e.y = p.y; telegraph(w, e.x, e.y, 22, 0.6, '#7ab83a'); }
        if (t > 1.2 && e.hidden) { e.hidden = false; e.invuln = false; e.sy = 1.3; ringShot(e, w, 16, 120, 0, { shape: 'needle', r: 3 }); w.shake(4); w.audio.play('erupt', { x: e.x }); }
        if (t > 1.6) { e.data.up = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w) { w.hud.toast('The Thornwife blooms.'); e.anim = 'open'; },
};
const thornwife: EnemyDef = {
  id: 'thornwife', name: 'The Thornwife', desc: 'Grandmother\'s prize rose. Nobody remembered to stop watering it.', boss: true,
  hp: 340, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 30, mass: 14, noKnock: true, gore: '#c8283a', goreDecal: '#3a5a2a', light: [60, '#ff8090'],
  sprites: () => rig({ w: 68, h: 70, paint: G.paintThornwife, phases: 1, extra: { open: [0, 1, 2, 3].map((f) => ({ x: { open: 1 }, jaw: 0.9 + (f % 2) * 0.1, raise: 0.6 + (f % 2) * 0.3, breath: Math.sin(f * 1.6) })) }, fps: { open: 7 } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, thornBrain); },
  draw(e, ctx, w, sx, sy) { if (e.hidden) { ctx.fillStyle = '#2a3a1e'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 5, 0, 0, TAU); ctx.fill(); return; } drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Rime Bride (Frozen Cistern)
const brideBrain: BossBrain = {
  idleTime: [0.8, 1.3], phases: [0.5],
  idle(e, w, dt) {
    e.data.wa = (e.data.wa ?? 0) + dt * 0.7;
    const c = w.room.center();
    const a = angleTo(e.x, e.y, c.x + Math.cos(e.data.wa) * 100, c.y + Math.sin(e.data.wa * 1.4) * 40);
    e.move(w, Math.cos(a) * 45 * dt, Math.sin(a) * 45 * dt); e.z = 10 + Math.sin(e.t * 2) * 3; e.animate(dt, 4);
  },
  attacks: [
    { id: 'icicles', weight: 3,
      run(e, w, t) {
        if (!e.data.ic) {
          e.data.ic = true;
          const n = e.data.phase ? 7 : 5, pl = w.player;
          for (let i = 0; i < n; i++) { const a = Math.random() * TAU, r = i === 0 ? 0 : 20 + Math.random() * 50; const x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r * 0.7; if (inRoom(w, x, y)) dropAt(w, x, y, i * 0.12, { shape: 'water' }); }
          w.audio.play('bell', { x: e.x, pitch: 1.6, vol: 0.4 });
        }
        if (t > 1.4) { e.data.ic = false; return true; }
        return false;
      } },
    { id: 'frost', weight: 2.5,
      run(e, w, t) {
        const times = [0.3, 0.75, 1.2];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) { gapRing(e, w, e.data.phase ? 22 : 18, 3, 95, angleTo(e.x, e.y, w.player.x, w.player.y) + (e.data.k - 1) * 0.5, { shape: 'water', r: 3.5 }); e.data.k++; }
        if (t > 1.6) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'scream', weight: 1.5, cooldown: 4,
      start(e) { e.setAnim('veil'); },
      run(e, w, t) {
        if (t > 0.5 && !e.data.sc) { e.data.sc = true; spreadShot(e, w, 9, aimAngle(e, w), 1.6, 170, { shape: 'water', r: 4 }); w.shake(3); w.audio.play('bossRoar', { x: e.x, pitch: 1.4 }); }
        if (t > 1) { e.data.sc = false; e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'blizzard', weight: 3, phases: [1],
      start(e) { e.data.sa = Math.random() * TAU; },
      run(e, w, t, dt) {
        e.data.sa += dt * 2.2; e.data.st = (e.data.st ?? 0) - dt;
        if (e.data.st <= 0) { e.data.st = 0.11; for (let i = 0; i < 3; i++) shoot(e, w, e.data.sa + (i / 3) * TAU, 100, { shape: 'water', r: 3 }); }
        return t > 2.6;
      } },
  ],
  onPhase(e, w) { w.hud.toast('The Rime Bride lifts her veil.'); w.whiteFlash = 0.3; },
};
const rimebride: EnemyDef = {
  id: 'rimebride', name: 'The Rime Bride', desc: 'She waited at the bottom of the cistern for a groom who never came down.', boss: true,
  hp: 360, r: 13, speed: 0, role: 'boss', cost: 0, hitY: 30, mass: 8, noKnock: true, flying: true, gore: '#c8e8f8', goreDecal: '#5a7a9a', light: [70, '#a0e8ff'],
  sprites: () => rig({ w: 60, h: 72, paint: G.paintBride, phases: 1, extra: { veil: [0, 1, 2, 3].map((f) => ({ x: { veil: 1 }, raise: 1, jaw: 0.7 + (f % 2) * 0.3, breath: Math.sin(f * 1.6) })) }, fps: { veil: 6 } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; e.z = 10; },
  update(e, w, dt) { bossUpdate(e, w, dt, brideBrain); if (Math.random() < dt * 6) w.fx.burst(e.x + (Math.random() - 0.5) * 30, e.y, 4, 1, '#e0f4ff', 20, 0.8); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { alpha: 0.95 }, w); w.r.addGlow(sx, sy - e.z - 30, 40, '#a0e8ff', 0.15); },
};

// ================================================================== The Pendulum (Clocktower)
const pendBrain: BossBrain = {
  idleTime: [0.8, 1.3], phases: [0.5],
  idle(e, w, dt) { chase(e, w, 22 + e.data.phase * 10, dt); e.animate(dt, 4); },
  attacks: [
    { id: 'swing', weight: 3,
      start(e, w) { e.data.b = enemyBeam(w, e.x, e.y - 20, Math.PI / 2, 2.4, 0.7, 9, 0); w.audio.play('beam', { x: e.x }); },
      run(e, w, t) {
        const b = e.data.b as Beam; b.x = e.x; b.y = e.y - 20;
        b.ang = Math.PI / 2 + Math.sin(Math.max(0, t - 0.7) * (e.data.phase ? 2.6 : 2)) * 1.25;
        if (t > 3.1) { e.data.b = null; return true; }
        return false;
      } },
    { id: 'chime', weight: 2.5,
      run(e, w, t) {
        if (!e.data.ch) {
          e.data.ch = true;
          // twelve strikes around the face, each firing at Marcus in turn
          for (let i = 0; i < 12; i++) w.after(i * (e.data.phase ? 0.09 : 0.13), () => { if (e.dead) return; const a = (i / 12) * TAU - Math.PI / 2; const x = e.x + Math.cos(a) * 22, y = e.y + Math.sin(a) * 16; w.proj.enemy(x, y, angleTo(x, y, w.player.x, w.player.y), 150, { shape: 'holy', r: 3.5, z: 20, delay: 0.25 }); w.audio.play('bell', { x: e.x, vol: 0.25, pitch: 1 + i * 0.05 }); });
        }
        if (t > 2) { e.data.ch = false; return true; }
        return false;
      } },
    { id: 'stop', weight: 2, cooldown: 4,
      run(e, w, t) {
        if (!e.data.st) {
          e.data.st = true;
          // time stops: a ring of shots hangs around Marcus, then all close in at once
          const pl = w.player, n = e.data.phase ? 14 : 10;
          for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const x = pl.x + Math.cos(a) * 95, y = pl.y + Math.sin(a) * 70; if (inRoom(w, x, y)) w.proj.enemy(x, y, a + Math.PI, 85, { shape: 'holy', r: 3.5, delay: 1.0 }); }
          w.audio.play('bell', { x: e.x, pitch: 2, vol: 0.3 });
        }
        if (t > 1.6) { e.data.st = false; return true; }
        return false;
      } },
    { id: 'hands', weight: 3, phases: [1],
      start(e, w) { e.data.bs = [enemyBeam(w, e.x, e.y - 20, Math.random() * TAU, 3, 0.8, 8, 0.9), enemyBeam(w, e.x, e.y - 20, Math.random() * TAU, 3, 0.8, 6, -0.45)]; w.audio.play('beam', { x: e.x }); },
      run(e, w, t) { for (const b of e.data.bs as Beam[]) { b.x = e.x; b.y = e.y - 20; } if (t > 3.8) { e.data.bs = []; return true; } return false; } },
  ],
  onPhase(e, w) { w.hud.toast('The Pendulum strikes the hour.'); w.audio.play('bell', { x: e.x, pitch: 0.5 }); },
};
const pendulum: EnemyDef = {
  id: 'pendulum', name: 'The Pendulum', desc: 'The tower clock, stopped at four minutes past four: the morning Grandmother went.', boss: true,
  hp: 380, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 34, mass: 30, noKnock: true, gore: '#4a2a1a', goreDecal: '#2a1a10', light: [60, '#ffd890'],
  sprites: () => rig({ w: 72, h: 86, paint: G.paintPendulum, phases: 1, counts: { idle: 12, move: 12 } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, pendBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Typesetter (Print Shop)
const pressBrain: BossBrain = {
  idleTime: [0.9, 1.4], phases: [0.5],
  idle(e, w, dt) { chase(e, w, 28 + e.data.phase * 10, dt); e.setAnim('idle'); e.animate(dt, 4); },
  attacks: [
    { id: 'typeset', weight: 3,
      run(e, w, t) {
        if (!e.data.ts) {
          e.data.ts = true;
          // a line of type slides in from one wall with one gap to slip through
          const room = w.room, fromLeft = Math.random() < 0.5;
          const rows = room.rows, gap = 1 + Math.floor(Math.random() * (rows - 3));
          for (let r = 0; r < rows; r++) {
            if (Math.abs(r - gap) <= (e.data.phase ? 0 : 1)) continue;
            const x = fromLeft ? room.ox + 6 : room.ox + room.cols * TILE - 6, y = room.oy + r * TILE + 12;
            w.proj.enemy(x, y, fromLeft ? 0 : Math.PI, 105, { shape: 'inkE', r: 4.5, range: room.cols * TILE, delay: 0.55 });
          }
          w.audio.play('pageUse', { x: e.x });
        }
        if (t > 1.2) { e.data.ts = false; return true; }
        return false;
      } },
    { id: 'press', weight: 2.5,
      start(e, w) { e.data.tx = w.player.x; e.data.ty = w.player.y; telegraph(w, e.data.tx, e.data.ty, 26, 0.85); e.data.sx0 = e.x; e.data.sy0 = e.y; w.audio.play('creak', { x: e.x }); },
      run(e, w, t) {
        if (t < 0.85) { const k = t / 0.85; e.x = e.data.sx0 + (e.data.tx - e.data.sx0) * k; e.y = e.data.sy0 + (e.data.ty - e.data.sy0) * k; e.z = Math.sin(k * Math.PI) * 50; return false; }
        if (!e.data.land) { e.data.land = true; e.z = 0; ringShot(e, w, e.data.phase ? 18 : 14, 115, Math.random(), { shape: 'inkE', r: 4 }); w.shake(7); w.audio.play('slam', { x: e.x }); e.sx = 1.3; e.sy = 0.75; }
        if (t > 1.3) { e.data.land = false; return true; }
        return false;
      } },
    { id: 'roll', weight: 2, cooldown: 3,
      start(e, w) { e.data.ra = angleTo(e.x, e.y, w.player.x, w.player.y); telegraph(w, e.x + Math.cos(e.data.ra) * 40, e.y + Math.sin(e.data.ra) * 40, 14, 0.5); },
      run(e, w, t, dt) {
        if (t < 0.5) return false;
        const h = e.move(w, Math.cos(e.data.ra) * 240 * dt, Math.sin(e.data.ra) * 240 * dt);
        if (Math.random() < 0.6) w.addCreep(e.x, e.y, 10, 'enemy', 1, 3, '#14122a');
        if (h.hx || h.hy || t > 1.4) { w.shake(3); spreadShot(e, w, 5, e.data.ra + Math.PI, 1.2, 110, { shape: 'inkE' }); return true; }
        return false;
      } },
    { id: 'spit', weight: 2,
      start(e) { e.setAnim('open'); },
      run(e, w, t) {
        const times = e.data.phase ? [0.3, 0.55, 0.8] : [0.35, 0.7];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) { spreadShot(e, w, 3, aimAngle(e, w, 0.6), 0.35, 160, { shape: 'inkE', r: 4 }); e.data.k++; w.audio.play('bossSpit', { x: e.x }); }
        if (t > times[times.length - 1] + 0.35) { e.data.k = 0; e.setAnim('idle'); return true; }
        return false;
      } },
  ],
  onPhase(e, w) { w.hud.toast('The Typesetter runs off a second edition.'); },
};
const typesetter: EnemyDef = {
  id: 'typesetter', name: 'The Typesetter', desc: 'The old press in the print shop. It printed the book you are lost in.', boss: true,
  hp: 380, r: 17, speed: 0, role: 'boss', cost: 0, hitY: 24, mass: 30, noKnock: true, gore: '#2a2a34', goreDecal: '#14122a',
  sprites: () => rig({ w: 76, h: 74, paint: G.paintPress, phases: 1, extra: { open: [0, 1, 2, 3].map((f) => ({ x: { open: 1 }, jaw: 0.85 + (f % 2) * 0.15, breath: Math.sin(f * 1.6) })) }, fps: { open: 8 } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, pressBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Bookbinder (The Binding)
const binderBrain: BossBrain = {
  idleTime: [0.7, 1.1], phases: [0.66, 0.33],
  idle(e, w, dt) { keepDistance(e, w, 90, 140, 50, dt); e.setAnim('idle'); e.animate(dt, 5); },
  attacks: [
    { id: 'stitch', weight: 3,
      run(e, w, t) {
        const n = Math.floor((t - 0.3) / 0.2);
        if (t > 0.3 && n > (e.data.sn ?? -1) && n < (e.data.phase >= 1 ? 6 : 4)) { e.data.sn = n; const a = aimAngle(e, w); for (const s of [-1, 1]) shoot(e, w, a + s * 0.5, 130, { shape: 'needle', r: 3, curve: -s * 1.1, range: 320 }); w.audio.play('needle', { x: e.x }); }
        if (t > 1.6) { e.data.sn = -1; return true; }
        return false;
      } },
    { id: 'thread', weight: 2.5,
      start(e, w) { e.setAnim('raise'); e.data.bs = []; const a = angleTo(e.x, e.y, w.player.x, w.player.y); const n = e.data.phase >= 2 ? 3 : e.data.phase >= 1 ? 2 : 1; for (let i = 0; i < n; i++) e.data.bs.push(enemyBeam(w, e.x, e.y - 24, a + (i - (n - 1) / 2) * 0.55, 0.7, 0.8, 5, 0)); w.audio.play('beam', { x: e.x, pitch: 1.3 }); },
      run(e, w, t) { for (const b of e.data.bs as Beam[]) { b.x = e.x; b.y = e.y - 24; } if (t > 1.6) { e.data.bs = []; e.setAnim('idle'); return true; } return false; } },
    { id: 'needles', weight: 2,
      run(e, w, t) {
        if (!e.data.nd) { e.data.nd = true; const pl = w.player; for (let i = 0; i < (e.data.phase >= 1 ? 8 : 5); i++) { const x = pl.x + (Math.random() - 0.5) * 120, y = pl.y + (Math.random() - 0.5) * 80; if (inRoom(w, x, y)) dropAt(w, x, y, i * 0.1, { shape: 'needle', r: 4 }); } }
        if (t > 1.4) { e.data.nd = false; return true; }
        return false;
      } },
    { id: 'margins', weight: 1.2, cooldown: 7, phases: [1, 2],
      run(e, w, t) {
        if (t > 0.4 && !e.data.mg) { e.data.mg = true; const n = w.enemies.filter((x) => !x.dead && !x.isBoss).length; for (let i = 0; i < Math.max(0, 2 - n); i++) { const p = randomFloorPoint(w, 70); const k = w.spawnEnemy('pagewraith', p.x, p.y, false); if (k) k.noDrop = true; } }
        if (t > 0.9) { e.data.mg = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w, ph) { w.hud.toast(ph === 1 ? 'The Bookbinder pulls the thread tight.' : 'Every stitch at once.'); },
};
const bookbinder: EnemyDef = {
  id: 'bookbinder', name: 'The Bookbinder', desc: 'He sewed the story shut. He would like to sew you into it.', boss: true,
  hp: 820, r: 12, speed: 0, role: 'boss', cost: 0, hitY: 32, mass: 10, noKnock: true, gore: '#5a1e24', goreDecal: '#2b2f66', light: [70, '#ff6070'],
  sprites: () => rig({ w: 56, h: 76, paint: G.paintBinder, phases: 2, extra: { raise: [0, 1, 2, 3].map((f) => ({ x: { raise: 1 }, raise: 1, jaw: 0.5 + (f % 2) * 0.4, breath: Math.sin(f * 1.6) })) }, fps: { raise: 6 } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, binderBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Unwritten (the Last Page)
// A towering mass of ink that keeps rewriting itself. Past three quarters of its health it starts
// taking the shapes of the stories Marcus already finished (any boss, inked over), fighting the way
// they fought; at the end it drops every shape and throws everything at once.
/** The two final bosses share their moves; this picks shot shapes, colours and summons.
 *  pace scales how fast its shots fly; rest scales the pauses between its attacks. */
interface FinalStyle { main: string; alt: string; light: string; creep: string; glow: string; tint: string; summons: string[]; forms: string; pace: number; rest: number }
// the Unwritten is eased a little: shots 15% slower, pauses between attacks 20% longer
const INK_STYLE: FinalStyle = { main: 'inkE', alt: 'dark', light: 'holy', creep: '#14112a', glow: '#8a7aff', tint: '#1a1440', summons: ['blot', 'pagewraith', 'voideye', 'mirrorshade'], forms: 'rewrites itself as', pace: 0.85, rest: 1.2 };
const LIGHT_STYLE: FinalStyle = { main: 'holy', alt: 'wax', light: 'star', creep: '#e8d8a0', glow: '#ffe8a0', tint: '#fff2c8', summons: ['cherubmoth', 'choirboy', 'censer', 'penitent'], forms: 'remembers', pace: 1, rest: 1 };
const styleOf = (e: Enemy): FinalStyle => (e.def.id === 'author' ? LIGHT_STYLE : INK_STYLE);

type Move = 'spray' | 'charge' | 'rings' | 'beams' | 'rain' | 'drops' | 'spiral' | 'summon' | 'tendrils' | 'pages' | 'flower' | 'wall' | 'seekers' | 'cross';
/** The shapes it can take (every boss it has seen), and how each one fights. */
const FORMS: Record<string, Move[]> = {
  grubmother: ['spray', 'drops', 'flower'], wardrobe: ['charge', 'rings', 'wall'], twinsnips: ['charge', 'cross', 'spray'],
  furnaceheart: ['rings', 'spiral', 'flower'], oldstoker: ['spray', 'charge', 'wall'],
  ratking: ['summon', 'spray', 'seekers'], bilgemaw: ['charge', 'drops', 'wall'], matron: ['drops', 'spiral', 'seekers'], sleepwalker: ['charge', 'tendrils', 'cross'],
  ossuaryknight: ['charge', 'rings', 'cross'], mothmother: ['summon', 'spiral', 'seekers'], bellringer: ['rings', 'rain', 'flower'], choirmaster: ['beams', 'spiral', 'flower'],
  blottedman: ['tendrils', 'rain', 'seekers'], unbound: ['beams', 'pages', 'wall'], thornwife: ['tendrils', 'spray', 'flower'], rimebride: ['drops', 'rings', 'wall'],
  pendulum: ['beams', 'rings', 'cross'], typesetter: ['rain', 'charge', 'wall'], bookbinder: ['tendrils', 'beams', 'seekers'],
  ironlung: ['charge', 'rings', 'spray'], patient: ['drops', 'rings', 'seekers'], itremembers: ['beams', 'cross', 'pages'],
};
const BASE_MOVES: Move[] = ['tendrils', 'pages', 'rain', 'spiral', 'flower'];
const LAST_MOVES: Move[] = ['beams', 'spiral', 'tendrils', 'rain', 'drops', 'flower', 'wall', 'cross', 'seekers'];
/** Health fractions where it changes: eight phases in all. */
const FINAL_TH = [0.88, 0.76, 0.64, 0.52, 0.4, 0.28, 0.14];
const PHASE_LINES = ['', 'It starts rewriting itself.', 'It writes faster.', 'The pages turn on their own.', 'Every story at once.', 'It is running out of ink. It does not care.', 'The ink is everywhere.', 'The last line. Everything at once.'];


function startMove(e: Enemy, w: World, m: Move): void {
  e.data.move = m; e.data.mt = 0; e.data.mk = 0;
  const fast = (1 + e.data.phase * 0.06) * styleOf(e).pace;
  e.data.fast = fast;
  if (m === 'charge') { e.data.ca = angleTo(e.x, e.y, w.player.x, w.player.y); telegraph(w, e.x + Math.cos(e.data.ca) * 50, e.y + Math.sin(e.data.ca) * 50, 18, 0.5, '#8a7aff'); }
  if (m === 'beams') {
    const n = e.data.phase >= 5 ? 5 : e.data.phase >= 3 ? 4 : 3, a0 = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.PI / n;
    e.data.bs = []; for (let i = 0; i < n; i++) e.data.bs.push(enemyBeam(w, e.x, e.y - 40, a0 + (i / n) * TAU, 3.2, 0.9, 10, (Math.random() < 0.5 ? 1 : -1) * 0.55 * fast));
    w.audio.play('beam', { x: e.x });
  }
  if (m === 'cross') {
    const a0 = Math.random() * TAU, sp = (Math.random() < 0.5 ? 1 : -1) * 0.42 * fast;
    e.data.bs = []; for (let i = 0; i < 4; i++) e.data.bs.push(enemyBeam(w, e.x, e.y - 40, a0 + (i / 4) * TAU, 3.6, 1.0, 8, sp));
    w.audio.play('beam', { x: e.x });
  }
}
/** Runs the current move one frame; returns true when it's done. */
function runMove(e: Enemy, w: World, dt: number): boolean {
  const t = (e.data.mt += dt), m: Move = e.data.move, fast = e.data.fast ?? 1, S = styleOf(e);
  const dens = 1 + e.data.phase * 0.09;
  const N = (n: number) => Math.round(n * dens);
  const at = (times: number[], fn: (i: number) => void) => { while (e.data.mk < times.length && t > times[e.data.mk]) { fn(e.data.mk); e.data.mk++; } };
  switch (m) {
    case 'spray': at([0.3, 0.55, 0.8, 1.05], () => { for (let i = 0; i < N(9); i++) shoot(e, w, aimAngle(e, w) + (Math.random() - 0.5) * 1.1, (130 + Math.random() * 60) * fast, { shape: S.main, r: 3.5 + Math.random() }); w.audio.play('bossSpit', { x: e.x }); }); return t > 1.4;
    case 'charge': {
      if (t < 0.5) return false;
      const h = e.move(w, Math.cos(e.data.ca) * 290 * dt, Math.sin(e.data.ca) * 290 * dt);
      if (Math.random() < 0.5) w.addCreep(e.x, e.y, 9, 'enemy', 1, 2.5, S.creep);
      e.data.cst = (e.data.cst ?? 0) - dt;
      if (e.data.cst <= 0) { e.data.cst = 0.08; for (const s2 of [-1, 1]) shoot(e, w, e.data.ca + s2 * Math.PI / 2, 60, { shape: S.alt, r: 3 }); }
      if (h.hx || h.hy || t > 1.5) { w.shake(5); ringShot(e, w, N(18), 120 * fast, Math.random(), { shape: S.main, r: 4 }); w.audio.play('slam', { x: e.x }); return true; }
      return false;
    }
    case 'rings': at([0.3, 0.7, 1.1, 1.5], (i) => { gapRing(e, w, N(24), 3, 100 * fast, angleTo(e.x, e.y, w.player.x, w.player.y) + (i - 1) * 0.6, { shape: S.alt, r: 3.5 }); w.audio.play('bell', { x: e.x, vol: 0.4, pitch: 0.6 }); }); return t > 1.9;
    case 'beams': case 'cross': for (const b of e.data.bs as Beam[]) { b.x = e.x; b.y = e.y - 40; }
      if (m === 'cross') at([1.3, 2.1, 2.9], () => spreadShot(e, w, 5, aimAngle(e, w), 0.6, 120 * fast, { shape: S.light, r: 3.5 }));
      if (t > 4.1) { e.data.bs = []; return true; } return false;
    case 'rain': at([0.3, 0.95, 1.6], () => {
      const room = w.room; const gap = Math.floor(Math.random() * (room.cols - 4)) + 2;
      for (let c = 0; c < room.cols; c++) { if (Math.abs(c - gap) <= 1) continue; w.proj.enemy(room.ox + c * TILE + 12, room.oy + 4, Math.PI / 2, 95 * fast, { shape: S.main, r: 4, range: room.rows * TILE + 20, z: 10, delay: 0.5 + (c % 2) * 0.15 }); }
      w.audio.play('pageUse', { x: e.x });
    }); return t > 2.6;
    case 'wall': at([0.3, 1.2], () => {
      // a wall of ink sweeping across from one side, with one gap to slip through
      const room = w.room, left = Math.random() < 0.5, gap = Math.floor(Math.random() * (room.rows - 4)) + 2;
      for (let r = 0; r < room.rows; r++) { if (Math.abs(r - gap) <= 1) continue; const x = left ? room.ox + 6 : room.ox + room.cols * TILE - 6; w.proj.enemy(x, room.oy + r * TILE + 12, left ? 0 : Math.PI, 90 * fast, { shape: S.main, r: 4, range: room.cols * TILE + 20, z: 8, delay: 0.45 }); }
      w.audio.play('pageUse', { x: e.x, pitch: 0.7 });
    }); return t > 2.2;
    case 'drops': at([0.1, 0.35, 0.6, 0.85, 1.1], () => { const pl = w.player; for (let i = 0; i < N(3); i++) { const x = pl.x + (Math.random() - 0.5) * 80, y = pl.y + (Math.random() - 0.5) * 56; if (inRoom(w, x, y)) dropAt(w, x, y, i * 0.08, { shape: S.main, r: 5 }); } }); return t > 1.9;
    case 'spiral': {
      e.data.sa = (e.data.sa ?? 0) + dt * 2.4 * fast; e.data.sst = (e.data.sst ?? 0) - dt;
      if (e.data.sst <= 0) { e.data.sst = 0.09; const k = e.data.phase >= 4 ? 6 : 4; for (let i = 0; i < k; i++) shoot(e, w, e.data.sa + (i / k) * TAU, 100 * fast, { shape: i % 2 ? S.alt : S.light, r: 3.5 }); }
      return t > 2.8;
    }
    case 'flower': at([0.25, 0.6, 0.95, 1.3], (i) => {
      // petals: two rings at different speeds, turned half a step each time
      const n = N(16), off = (i % 2) * (Math.PI / n);
      ringShot(e, w, n, 80 * fast, off, { shape: S.light, r: 3.5 }); ringShot(e, w, n, 125 * fast, off + Math.PI / n, { shape: S.alt, r: 3 });
      w.audio.play('chime', { x: e.x, vol: 0.3, pitch: 0.8 + i * 0.1 });
    }); return t > 1.8;
    case 'seekers': at([0.3, 0.9], () => { for (let i = 0; i < N(5); i++) shoot(e, w, (i / N(5)) * TAU + Math.random() * 0.3, 70 * S.pace, { shape: S.light, r: 4, homing: 1.4, range: 520 }); w.audio.play('secret', { x: e.x, vol: 0.3 }); }); return t > 1.8;
    case 'summon': at([0.4], () => { const n = w.enemies.filter((x) => !x.dead && !x.isBoss).length; for (let i = 0; i < Math.max(0, 4 - n); i++) { const p = randomFloorPoint(w, 80); const k = w.spawnEnemy(S.summons[i % S.summons.length], p.x, p.y, false); if (k) k.noDrop = true; } w.audio.play('secret', { x: e.x, vol: 0.5 }); }); return t > 1;
    case 'tendrils': at([0.3, 0.7, 1.1, 1.5], (i) => { const a = angleTo(e.x, e.y, w.player.x, w.player.y); for (const s2 of e.data.phase >= 3 ? [-0.6, -0.2, 0.2, 0.6] : [-0.3, 0.3]) tendril(w, e.x, e.y, a + s2 + (i - 1) * 0.15, 14, 15, { shape: S.main }); w.audio.play('rumble', { x: e.x, vol: 0.4 }); }); return t > 2.0;
    case 'pages': at([0.3, 0.5, 0.7, 0.9, 1.1], () => { const a = aimAngle(e, w); for (const s2 of [-1, 1]) shoot(e, w, a - s2 * 0.8, 125 * fast, { curve: s2 * 1.4, shape: S.light, r: 3.5, range: 420 }); w.audio.play('pageGet', { x: e.x, vol: 0.5 }); }); return t > 1.6;
  }
  return true;
}
/** A free spot on screen about r away from Marcus. */
function nearPlayer(w: World, r: number): { x: number; y: number } {
  const pl = w.player;
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * TAU, x = pl.x + Math.cos(a) * r, y = pl.y + Math.sin(a) * r * 0.7;
    if (inRoom(w, x, y) && Math.abs(x - pl.x) < 190 && Math.abs(y - pl.y) < 100) return { x, y };
  }
  return randomFloorPoint(w, 80);
}
/** Take another boss's shape: vanish in a splash of ink and reappear somewhere else, wearing it. */
function rewrite(e: Enemy, w: World): void {
  const ids = Object.keys(FORMS).filter((id) => id !== e.data.form);
  const seen = ids.filter((id) => w.game.save.data.bossesBeaten.includes(id));
  const pool = seen.length >= 4 ? seen : ids;
  e.data.form = pool[Math.floor(Math.random() * pool.length)];
  const S = styleOf(e);
  w.fx.spray(e.x, e.y, 30, 0, TAU, 30, S.creep, 140, 0.7, S.creep);
  // the arena is bigger than the screen: reappear in view, a fair distance from Marcus
  const p = nearPlayer(w, 120); e.x = p.x; e.y = p.y;
  e.data.formT = Math.max(2.5, 6.5 - e.data.phase * 0.6);
  e.flash = 1; w.audio.play('bossRoar', { x: e.x, pitch: 0.7 });
  const def = getEnemy(e.data.form);
  w.hud.toast(`It ${S.forms} ${def?.name ?? 'something you remember'}.`, 1.6);
}
const finalBoss = (id: string, name: string, desc: string, gore: string, glow: string, paint: (p: any, s: any) => void, hp = 11000): EnemyDef => ({
  id, name, desc, boss: true, borrows: Object.keys(FORMS),
  hp, r: 24, speed: 0, role: 'boss', cost: 0, hitY: 44, mass: 60, noKnock: true, gore, goreDecal: gore, light: [120, glow],
  sprites: () => rig({ w: 96, h: 104, paint, phases: 1, extra: { rage: [0, 1, 2, 3, 4, 5].map((f) => ({ x: { rage: 1 }, jaw: 0.5 + Math.abs(Math.sin(f)) * 0.5, breath: Math.sin(f * 1.05), t: f / 6 })) }, fps: { rage: 8 } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 2; e.data.phase = 0; },
  update(e, w, dt) {
    const d = e.data, S = styleOf(e);
    e.animate(dt, 5);
    if (Math.random() < dt * 8) w.fx.burst(e.x + (Math.random() - 0.5) * 50, e.y, 3, 1, S.creep, 30, 0.8);
    // eight phases, each one faster, denser and stranger than the last
    if (d.phase < FINAL_TH.length && e.hpFrac() <= FINAL_TH[d.phase]) {
      d.phase++; d.move = null; d.idleT = 1.0; e.invuln = true; d.invT = 1.0;
      w.proj.clear(); w.beams = []; w.shake(8); w.whiteFlash = 0.6; w.hitstop(0.15); w.audio.play('bossRoar', { x: e.x });
      ringShot(e, w, 30, 70, Math.random(), { shape: S.alt, r: 3.5, delay: 0.6 });
      const line = PHASE_LINES[d.phase] ?? '';
      if (line) w.hud.toast(e.def.id === 'author' ? line.replace('It ', 'He ').replace('it ', 'he ') : line, 2);
      if (d.phase >= 7) { e.anim = 'rage'; }
      rewrite(e, w);
    }
    // tell the rig what it's doing: roaring through a phase change, mid-move, or drifting
    e.state = d.invT > 0 ? 'phase' : d.move ? 'attack' : 'idle'; e.st = d.invT > 0 ? 1 - d.invT : 0;
    if (d.invT > 0) { d.invT -= dt; e.sx = 1 + Math.sin(e.t * 40) * 0.05; if (d.invT <= 0) { e.invuln = false; e.sx = 1; } return; }
    // shapes change on a timer once it starts rewriting, faster and faster
    if (d.phase >= 1) { d.formT -= dt; if (d.formT <= 0 && !d.move) rewrite(e, w); }
    // bullet-hell layers under everything else, added as the fight goes on
    if (d.phase >= 2) {
      d.l1 = (d.l1 ?? 0) - dt;
      if (d.l1 <= 0) { d.l1 = (d.phase >= 6 ? 0.28 : 0.42) * S.rest; d.la = (d.la ?? 0) + 0.41; const k = d.phase >= 5 ? 3 : 2; for (let i = 0; i < k; i++) shoot(e, w, d.la + (i / k) * TAU, 72 * S.pace, { shape: S.alt, r: 3 }); }
    }
    if (d.phase >= 4) {
      d.l2 = (d.l2 ?? 0.2) - dt;
      if (d.l2 <= 0) { d.l2 = 0.5 * S.rest; d.lb = (d.lb ?? 0) - 0.33; for (let i = 0; i < 3; i++) shoot(e, w, d.lb + (i / 3) * TAU, 95 * S.pace, { shape: S.light, r: 3 }); }
    }
    if (d.phase >= 6) {
      d.l3 = (d.l3 ?? 4) - dt;
      if (d.l3 <= 0) { d.l3 = 6.5 * S.rest; const pl = w.player; for (let i = 0; i < 6; i++) { const x = pl.x + (Math.random() - 0.5) * 120, y = pl.y + (Math.random() - 0.5) * 80; if (inRoom(w, x, y)) dropAt(w, x, y, i * 0.1, { shape: S.main, r: 5 }); } }
    }
    if (d.move) {
      if (runMove(e, w, dt)) { d.move = null; d.idleT = (Math.max(0.15, 0.8 - d.phase * 0.09) + Math.random() * 0.25) * S.rest; }
      return;
    }
    // circle Marcus at a distance, never quite still (the arena is bigger than the screen)
    const pl = w.player;
    d.wa = (d.wa ?? 0) + dt * (0.4 + d.phase * 0.05);
    const a = angleTo(e.x, e.y, pl.x + Math.cos(d.wa) * 120, pl.y - 30 + Math.sin(d.wa * 1.3) * 45);
    e.move(w, Math.cos(a) * (40 + d.phase * 6) * dt, Math.sin(a) * (40 + d.phase * 6) * dt);
    e.flip = w.player.x < e.x;
    d.idleT -= dt;
    if (d.idleT <= 0) {
      const moves: Move[] = d.phase >= 7 ? (d.form ? [...FORMS[d.form], ...LAST_MOVES] : LAST_MOVES) : d.form ? [...FORMS[d.form], 'tendrils'] : BASE_MOVES;
      let m = moves[Math.floor(Math.random() * moves.length)];
      if (m === d.last && moves.length > 1) m = moves[(moves.indexOf(m) + 1) % moves.length];
      d.last = m; startMove(e, w, m);
    }
  },
  draw(e, ctx, w, sx, sy) {
    const d = e.data;
    if (d.form) {
      // wearing another boss's shape, inked over and drawn larger
      const def = getEnemy(d.form);
      const set = def ? (getSprites(def).idle ?? Object.values(getSprites(def))[0]) : null;
      if (set) {
        const spr = set[Math.floor(e.t * 5) % set.length];
        spr.draw(ctx, sx, sy + 2, { flip: e.flip, flash: e.flash > 0 ? 0.6 : 0, sx: 1.45 * e.sx, sy: 1.45 * e.sy, tint: styleOf(e).tint, tintAmt: 0.62 });
        // the borrowed body's eyes still follow Marcus
        if (e.flash <= 0.05) drawEyes(e, ctx, w, spr, sx, sy + 2, 1.45 * e.sx, 1.45 * e.sy, !!e.flip);
        w.r.addGlow(sx, sy - 30, 70, styleOf(e).glow, 0.2);
        return;
      }
    }
    drawBoss(e, ctx, sx, sy, { yoff: 6 }, w);
    w.r.addGlow(sx, sy - 50, 80, d.phase >= 3 ? '#ff3050' : styleOf(e).glow, e.def.id === 'author' ? 0.08 : 0.2);
  },
});
const unwritten = finalBoss('unwritten', 'The Unwritten', 'Everything the book left out, writing itself in. It wants the last word.', '#14112a', '#8a7aff', G.paintUnwritten, 6600);   // 40% less health than the Author's 11000

const author = finalBoss('author', 'The Author', 'Grandfather, as he was when he first picked up the pen. He would like a better ending.', '#e8d8a0', '#ffe8a0', G.paintAuthor);

export const BOSSES_D: EnemyDef[] = [thornwife, rimebride, pendulum, typesetter, bookbinder, unwritten, author];
void clamp; void dist; void hex; void eye;
