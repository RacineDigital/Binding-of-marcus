// Themed bosses for the newer chapters (Greenhouse, Frozen Cistern, Clocktower, Print Shop), a
// second Binding boss, and The Unwritten: what waits on the Last Page beyond the Margins.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { getSprites } from '../enemies/enemy';
import { frames, eye, ramp, hex, glowEye, sprinkle } from '../art/creature';
import { aimAngle, shoot, spreadShot, ringShot, randomFloorPoint, chase, keepDistance } from '../enemies/ai';
import { bossUpdate, BossBrain, BossAttack, telegraph } from './boss';
import { TAU, angleTo, angleDiff, clamp, dist } from '../core/math';
import { enemyBeam, Beam } from '../projectiles/weapons';
import type { World } from '../game/world';
import { getEnemy } from '../enemies/registry';
import { TILE } from '../core/constants';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ rot: number; alpha: number; tint: string; tintAmt: number; yoff: number; scale: number }> = {}): void {
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
function paintThornwife(p: any, f: number, open: number): void {
  const pot = ramp('#a8583a'), stem = ramp('#3a6a2a'), rose = ramp('#c8283a'), face = ramp('#e8d8c8');
  const cx = 34, sway = Math.sin(f * 1.6) * 1.5;
  // clay pot
  p.poly([cx - 16, 50, cx + 16, 50, cx + 12, 66, cx - 12, 66], pot[2]); p.shadeV(cx - 16, 50, 32, 16, pot, 0.5);
  p.rect(cx - 18, 47, 36, 4, pot[3]); p.rect(cx - 18, 47, 36, 1, pot[4]);
  p.rect(cx - 16, 51, 32, 1, hex('#3a2418'));
  // stem body and vine arms
  p.tube(cx, 48, cx + sway, 26, 3.5, stem);
  for (const s of [-1, 1]) {
    const ax = cx + s * (18 + open * 6), ay = 30 - open * 8;
    p.tube(cx + sway, 36, ax, ay, 2, stem);
    p.tube(ax, ay, ax + s * 4, ay + 8 - open * 10, 1.5, stem);
    for (let k = 0; k < 4; k++) p.set(cx + s * (5 + k * 4), 35 - k * (1 + open * 2), '#d8e0a0');
  }
  for (let y = 30; y < 47; y += 4) { p.set(cx - 4, y, '#d8e0a0'); p.set(cx + 4, y + 2, '#d8e0a0'); }
  // rose head with a face in the bloom
  const hx = cx + sway, hy = 18;
  p.ball(hx, hy, 15, 13, rose, { dither: 0.5 });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + f * 0.1; p.line(hx + Math.cos(a) * 6, hy + Math.sin(a) * 5, hx + Math.cos(a) * 14, hy + Math.sin(a) * 12, rose[0]); }
  p.ball(hx, hy + 1, 7, 7, face, { dither: 0.4 });
  glowEye(p, hx - 3, hy - 1, '#2a0a10'); glowEye(p, hx + 3, hy - 1, '#2a0a10');
  p.line(hx - 2, hy + 4, hx + 2, hy + 4 + open, hex('#6a1a24'));
  // leaves
  p.ball(cx - 9, 42, 5, 2.5, stem); p.ball(cx + 9, 40, 5, 2.5, stem);
}
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
  sprites: () => ({ idle: frames(68, 68, 4, (p, f) => paintThornwife(p, f, 0)), open: frames(68, 68, 4, (p, f) => paintThornwife(p, f, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, thornBrain); },
  draw(e, ctx, w, sx, sy) { if (e.hidden) { ctx.fillStyle = '#2a3a1e'; ctx.beginPath(); ctx.ellipse(sx, sy, 14, 5, 0, 0, TAU); ctx.fill(); return; } drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Rime Bride (Frozen Cistern)
function paintBride(p: any, f: number, veil: number): void {
  const ice = ramp('#a8d8f0'), dress = ramp('#d8ecf8'), dark = ramp('#14203a');
  const cx = 30, bob = Math.sin(f * 1.6) * 1.5;
  // trailing gown, frayed into icicles at the hem
  p.poly([cx - 6, 24 + bob, cx + 6, 24 + bob, cx + 20, 62, cx - 20, 62], dress[2]); p.shadeV(cx - 20, 24, 40, 40, dress, 0.6);
  for (let x = cx - 19; x < cx + 20; x += 3) { const l = 3 + ((x * 7) % 5); p.line(x, 62, x, 62 + l, ice[1 + (x % 2)]); }
  // arms holding a frozen bouquet
  p.tube(cx - 6, 30 + bob, cx - 2, 40 + bob, 1.5, dress); p.tube(cx + 6, 30 + bob, cx + 2, 40 + bob, 1.5, dress);
  p.ball(cx, 42 + bob, 5, 4, ice); for (let i = 0; i < 5; i++) p.set(cx - 3 + i * 1.5, 39 + bob - (i % 2), '#ffffff');
  // veiled head and icicle crown
  p.ball(cx, 16 + bob, 9, 10, dark, { dither: 0.5 });
  for (let i = -3; i <= 3; i++) p.line(cx + i * 2.5, 6 + bob, cx + i * 2.5, 2 + bob - (3 - Math.abs(i)) * 1.5, ice[3]);
  glowEye(p, cx - 3, 16 + bob, '#7af0ff'); glowEye(p, cx + 3, 16 + bob, '#7af0ff');
  // the veil, lifted when she screams
  const vy = 8 + bob - veil * 6;
  // lace: every other pixel, so the face shows through
  for (let y = 0; y < 22; y++) { const half = 10 + y * 0.2; for (let x = -half; x <= half; x++) if ((Math.round(x) + y) % 2 === 0 && (y > 12 || Math.abs(x) > 6 || veil > 0.5)) p.set(cx + x, vy + y, (y % 6 === 0) ? '#ffffff' : '#dcecf6'); }
  sprinkle(p, '#ffffff', 14, 3);
}
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
  sprites: () => ({ idle: frames(60, 72, 4, (p, f) => paintBride(p, f, 0)), veil: frames(60, 72, 4, (p, f) => paintBride(p, f, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; e.z = 10; },
  update(e, w, dt) { bossUpdate(e, w, dt, brideBrain); if (Math.random() < dt * 6) w.fx.burst(e.x + (Math.random() - 0.5) * 30, e.y, 4, 1, '#e0f4ff', 20, 0.8); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { alpha: 0.95 }); w.r.addGlow(sx, sy - e.z - 30, 40, '#a0e8ff', 0.15); },
};

// ================================================================== The Pendulum (Clocktower)
function paintPendulum(p: any, f: number, swing: number): void {
  const wood = ramp('#4a2a1a'), brass = ramp('#c8a04a'), face = ramp('#efe6d2');
  const cx = 36;
  // tall case
  p.rect(cx - 16, 8, 32, 70, wood[2]); p.shadeV(cx - 16, 8, 32, 70, wood, 0.5);
  p.rect(cx - 18, 6, 36, 4, wood[3]); p.rect(cx - 18, 76, 36, 4, wood[1]);
  p.poly([cx - 18, 6, cx, -2, cx + 18, 6], wood[3]);
  // clock face that is also an eye
  p.ball(cx, 22, 13, 13, face, { dither: 0.3 });
  p.ring(cx, 22, 13, brass[2], 1.5);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p.set(cx + Math.cos(a) * 10.5, 22 + Math.sin(a) * 10.5, '#3a2a1a'); }
  eye(p, cx, 22, 5, Math.sin(f) * 0.6, 0.2, '#6a0a14', '#f0e8d8');
  const ha = f * 0.8 - Math.PI / 2;
  p.line(cx, 22, cx + Math.cos(ha) * 9, 22 + Math.sin(ha) * 9, '#1a1010');
  p.line(cx, 22, cx + Math.cos(ha * 3) * 6, 22 + Math.sin(ha * 3) * 6, '#1a1010');
  // glass window with the pendulum swinging
  p.rect(cx - 10, 40, 20, 32, hex('#1a1418'));
  const sw = Math.sin(swing) * 7;
  p.line(cx, 42, cx + sw, 64, brass[1]);
  p.ball(cx + sw, 66, 5, 5, brass);
  p.rect(cx - 10, 40, 20, 1, hex('#8a7a6a'));
}
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
  id: 'pendulum', name: 'The Pendulum', desc: 'The tower clock, still keeping the time of the night it all went wrong.', boss: true,
  hp: 380, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 34, mass: 30, noKnock: true, gore: '#4a2a1a', goreDecal: '#2a1a10', light: [60, '#ffd890'],
  sprites: () => ({ idle: frames(72, 84, 6, (p, f) => paintPendulum(p, f, (f / 6) * TAU)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, pendBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Typesetter (Print Shop)
function paintPress(p: any, f: number, open: number): void {
  const iron = ramp('#3a3a44'), brass = ramp('#a8804a');
  const cx = 38, chew = open * 6;
  // squat iron legs
  for (const s of [-1, 1]) p.tube(cx + s * 18, 44, cx + s * 22, 58, 3, iron);
  // the press body
  p.rect(cx - 26, 14, 52, 32, iron[2]); p.shadeV(cx - 26, 14, 52, 32, iron, 0.5);
  p.rect(cx - 28, 12, 56, 4, iron[3]);
  // big screw and wheel on top
  p.rect(cx - 2, 0, 4, 13, brass[2]); for (let y = 1; y < 12; y += 2) p.set(cx - 2, y, brass[4]);
  p.ring(cx, 3, 9, brass[1], 1.5); p.line(cx - 9, 3, cx + 9, 3, brass[1]);
  // the platen mouth with letter-block teeth
  p.rect(cx - 20, 26, 40, 10 + chew, hex('#0c0a10'));
  const letters = 'ABCDEFGHIJ';
  for (let i = 0; i < 8; i++) { const x = cx - 18 + i * 5; p.rect(x, 26, 4, 4, hex('#e6dcc0')); p.set(x + 1 + (i % 2), 27 + (letters.charCodeAt(i) % 2), '#2a2420'); p.rect(x, 32 + chew, 4, 4, hex('#d8ccb0')); }
  glowEye(p, cx - 10, 20, '#ff4040'); glowEye(p, cx + 10, 20, '#ff4040');
  // ink drips
  for (let i = 0; i < 4; i++) { const x = cx - 15 + i * 10; p.line(x, 46, x, 48 + ((i + f) % 3) * 2, hex('#14122a')); }
}
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
  sprites: () => ({ idle: frames(76, 62, 3, (p, f) => paintPress(p, f, 0)), open: frames(76, 62, 3, (p, f) => paintPress(p, f, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, pressBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Bookbinder (The Binding)
function paintBinder(p: any, f: number, arm: number): void {
  const skin = ramp('#8a7a6a'), apron = ramp('#5a3424'), book = ramp('#5a1e24'), pg = ramp('#e6dcc0');
  const cx = 28, sway = Math.sin(f * 1.6);
  // long legs and leather apron
  p.tube(cx - 5, 50, cx - 6 + sway, 70, 2, skin); p.tube(cx + 5, 50, cx + 6 - sway, 70, 2, skin);
  p.poly([cx - 10, 26, cx + 10, 26, cx + 13, 54, cx - 13, 54], apron[2]); p.shadeV(cx - 13, 26, 26, 28, apron, 0.5);
  // thin arms: one holds a long needle, the other trails thread
  p.tube(cx - 10, 28, cx - 18, 42 - arm * 10, 1.5, skin);
  p.line(cx - 18, 42 - arm * 10, cx - 26, 22 - arm * 18, hex('#d8dce8'), 1);
  p.tube(cx + 10, 28, cx + 16, 44, 1.5, skin);
  for (let i = 0; i < 10; i++) p.set(cx + 16 + Math.sin(i * 0.8 + f) * 3, 44 + i * 2, '#c83a4a');
  // head: a closed book stitched shut
  p.rect(cx - 9, 4, 18, 22, book[2]); p.shadeV(cx - 9, 4, 18, 22, book, 0.5);
  p.rect(cx + 7, 5, 3, 20, pg[2]);
  for (let y = 8; y < 24; y += 3) p.line(cx - 6, y, cx + 3, y + 1, hex('#e6dcc0'));
  glowEye(p, cx - 4, 10, '#ff3040'); glowEye(p, cx + 2, 10, '#ff3040');
}
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
  sprites: () => ({ idle: frames(56, 76, 4, (p, f) => paintBinder(p, f, 0)), raise: frames(56, 76, 4, (p, f) => paintBinder(p, f, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, binderBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Unwritten (the Last Page)
// A towering mass of ink that keeps rewriting itself. Past three quarters of its health it starts
// taking the shapes of the stories Marcus already finished (any boss, inked over), fighting the way
// they fought; at the end it drops every shape and throws everything at once.
/** The two final bosses share their moves; this picks shot shapes, colours and summons. */
interface FinalStyle { main: string; alt: string; light: string; creep: string; glow: string; tint: string; summons: string[]; forms: string }
const INK_STYLE: FinalStyle = { main: 'inkE', alt: 'dark', light: 'holy', creep: '#14112a', glow: '#8a7aff', tint: '#1a1440', summons: ['blot', 'pagewraith', 'voideye', 'mirrorshade'], forms: 'rewrites itself as' };
const LIGHT_STYLE: FinalStyle = { main: 'holy', alt: 'wax', light: 'star', creep: '#e8d8a0', glow: '#ffe8a0', tint: '#fff2c8', summons: ['cherubmoth', 'choirboy', 'censer', 'penitent'], forms: 'remembers' };
const styleOf = (e: Enemy): FinalStyle => (e.def.id === 'author' ? LIGHT_STYLE : INK_STYLE);

type Move = 'spray' | 'charge' | 'rings' | 'beams' | 'rain' | 'drops' | 'spiral' | 'summon' | 'tendrils' | 'pages';
const FORMS: Record<string, Move[]> = {
  grubmother: ['spray', 'drops'], wardrobe: ['charge', 'rings'], furnaceheart: ['rings', 'spiral'], oldstoker: ['spray', 'charge'],
  ratking: ['summon', 'spray'], bilgemaw: ['charge', 'drops'], matron: ['drops', 'spiral'], sleepwalker: ['charge', 'tendrils'],
  ossuaryknight: ['charge', 'rings'], mothmother: ['summon', 'spiral'], bellringer: ['rings', 'rain'], choirmaster: ['beams', 'spiral'],
  blottedman: ['tendrils', 'rain'], unbound: ['beams', 'pages'], thornwife: ['tendrils', 'spray'], rimebride: ['drops', 'rings'],
  pendulum: ['beams', 'rings'], typesetter: ['rain', 'charge'], bookbinder: ['tendrils', 'beams'],
};
const BASE_MOVES: Move[] = ['tendrils', 'pages', 'rain', 'spiral'];
const LAST_MOVES: Move[] = ['beams', 'spiral', 'tendrils', 'rain', 'drops'];

function paintUnwritten(p: any, f: number, rage: number): void {
  const ink = ramp('#14112a'), paper = ramp('#efe6d2');
  const cx = 48, by = 92;
  // a column of ink with scribbled lines, flaring into tendrils at the base
  for (let y = 18; y < by; y++) {
    const k = (y - 18) / (by - 18);
    const half = 10 + k * 22 + Math.sin(y * 0.35 + f * 1.4) * 2.5;
    for (let x = Math.floor(cx - half); x < cx + half; x++) p.set(x, y, ink[(x + y + f) % 7 === 0 ? 3 : (x * 3 + y) % 11 === 0 ? 1 : 2]);
  }
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.15 + 0.7 * (i / 6)); const l = 10 + ((i * 5 + f * 3) % 8); p.tube(cx + Math.cos(a) * 26, by - 2, cx + Math.cos(a) * (32 + l), by + Math.sin(a) * 3, 2.5 - (i % 2), ink); }
  // handwriting scrawled across the body, in red when it rages
  for (let r = 0; r < 6; r++) { const y = 34 + r * 9; let x = cx - 14 - r; for (let s = 0; s < 8 + r; s++) { p.set(x, y + Math.sin(s * 1.7 + f) * 1.5, rage ? '#c83a4a' : '#4a4a8a'); x += 2 + ((s * 7) % 3); } }
  // ragged page cloak over the shoulders
  p.poly([cx - 26, 24, cx + 26, 24, cx + 34, 54, cx + 20, 46, cx + 12, 58, cx, 48, cx - 12, 58, cx - 20, 46, cx - 34, 54], paper[1]);
  for (let x = cx - 24; x < cx + 24; x += 4) p.line(x, 26, x + 2, 44, paper[0]);
  // a blank paper mask with a crown of quill nibs
  p.ball(cx, 14, 11, 12, paper, { dither: 0.3 });
  for (let i = -2; i <= 2; i++) { const x = cx + i * 5; p.poly([x - 1.5, 4 - Math.abs(i), x + 1.5, 4 - Math.abs(i), x, -6 - (2 - Math.abs(i)) * 2], hex('#2a2440')); }
  glowEye(p, cx - 4, 13, rage ? '#ff3040' : '#8a7aff'); glowEye(p, cx + 4, 13, rage ? '#ff3040' : '#8a7aff');
  p.line(cx - 3, 19, cx + 3, 19 + Math.sin(f) , hex('#2a2440'));
}

function startMove(e: Enemy, w: World, m: Move): void {
  e.data.move = m; e.data.mt = 0; e.data.mk = 0;
  const fast = e.data.phase >= 2 ? 1.25 : 1;
  e.data.fast = fast;
  if (m === 'charge') { e.data.ca = angleTo(e.x, e.y, w.player.x, w.player.y); telegraph(w, e.x + Math.cos(e.data.ca) * 50, e.y + Math.sin(e.data.ca) * 50, 18, 0.55, '#8a7aff'); }
  if (m === 'beams') {
    const n = e.data.phase >= 3 ? 4 : 3, a0 = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.PI / n;
    e.data.bs = []; for (let i = 0; i < n; i++) e.data.bs.push(enemyBeam(w, e.x, e.y - 40, a0 + (i / n) * TAU, 3.2, 0.9, 10, (Math.random() < 0.5 ? 1 : -1) * 0.55 * fast));
    w.audio.play('beam', { x: e.x });
  }
}
/** Runs the current move one frame; returns true when it's done. */
function runMove(e: Enemy, w: World, dt: number): boolean {
  const t = (e.data.mt += dt), m: Move = e.data.move, fast = e.data.fast ?? 1, S = styleOf(e);
  const at = (times: number[], fn: (i: number) => void) => { while (e.data.mk < times.length && t > times[e.data.mk]) { fn(e.data.mk); e.data.mk++; } };
  switch (m) {
    case 'spray': at([0.3, 0.6, 0.9], () => { for (let i = 0; i < 9; i++) shoot(e, w, aimAngle(e, w) + (Math.random() - 0.5) * 1.0, (130 + Math.random() * 60) * fast, { shape: S.main, r: 3.5 + Math.random() }); w.audio.play('bossSpit', { x: e.x }); }); return t > 1.3;
    case 'charge': {
      if (t < 0.55) return false;
      const h = e.move(w, Math.cos(e.data.ca) * 270 * dt, Math.sin(e.data.ca) * 270 * dt);
      if (Math.random() < 0.5) w.addCreep(e.x, e.y, 9, 'enemy', 1, 2.5, S.creep);
      if (h.hx || h.hy || t > 1.5) { w.shake(5); ringShot(e, w, 16, 120 * fast, Math.random(), { shape: S.main, r: 4 }); w.audio.play('slam', { x: e.x }); return true; }
      return false;
    }
    case 'rings': at([0.3, 0.75, 1.2], (i) => { gapRing(e, w, 22, 3, 100 * fast, angleTo(e.x, e.y, w.player.x, w.player.y) + (i - 1) * 0.6, { shape: S.alt, r: 3.5 }); w.audio.play('bell', { x: e.x, vol: 0.4, pitch: 0.6 }); }); return t > 1.6;
    case 'beams': for (const b of e.data.bs as Beam[]) { b.x = e.x; b.y = e.y - 40; } if (t > 4.1) { e.data.bs = []; return true; } return false;
    case 'rain': at([0.3, 1.0], () => {
      const room = w.room; const gap = Math.floor(Math.random() * (room.cols - 4)) + 2;
      for (let c = 0; c < room.cols; c++) { if (Math.abs(c - gap) <= 1) continue; w.proj.enemy(room.ox + c * TILE + 12, room.oy + 4, Math.PI / 2, 95 * fast, { shape: S.main, r: 4, range: room.rows * TILE + 20, z: 10, delay: 0.5 + (c % 2) * 0.15 }); }
      w.audio.play('pageUse', { x: e.x });
    }); return t > 2.2;
    case 'drops': at([0.1, 0.4, 0.7, 1.0], () => { const pl = w.player; for (let i = 0; i < 3; i++) { const x = pl.x + (Math.random() - 0.5) * 70, y = pl.y + (Math.random() - 0.5) * 50; if (inRoom(w, x, y)) dropAt(w, x, y, i * 0.08, { shape: S.main, r: 5 }); } }); return t > 1.8;
    case 'spiral': {
      e.data.sa = (e.data.sa ?? 0) + dt * 2.4 * fast; e.data.sst = (e.data.sst ?? 0) - dt;
      if (e.data.sst <= 0) { e.data.sst = 0.1; for (let i = 0; i < 4; i++) shoot(e, w, e.data.sa + (i / 4) * TAU, 100 * fast, { shape: i % 2 ? S.alt : S.light, r: 3.5 }); }
      return t > 2.8;
    }
    case 'summon': at([0.4], () => { const n = w.enemies.filter((x) => !x.dead && !x.isBoss).length; for (let i = 0; i < Math.max(0, 4 - n); i++) { const p = randomFloorPoint(w, 80); const k = w.spawnEnemy(S.summons[i % S.summons.length], p.x, p.y, false); if (k) k.noDrop = true; } w.audio.play('secret', { x: e.x, vol: 0.5 }); }); return t > 1;
    case 'tendrils': at([0.35, 0.8, 1.25], (i) => { const a = angleTo(e.x, e.y, w.player.x, w.player.y); for (const s of e.data.phase >= 2 ? [-0.5, 0, 0.5] : [-0.3, 0.3]) tendril(w, e.x, e.y, a + s + (i - 1) * 0.15, 14, 15, { shape: S.main }); w.audio.play('rumble', { x: e.x, vol: 0.4 }); }); return t > 1.9;
    case 'pages': at([0.3, 0.55, 0.8, 1.05], () => { const a = aimAngle(e, w); for (const s of [-1, 1]) shoot(e, w, a - s * 0.8, 125 * fast, { curve: s * 1.4, shape: S.light, r: 3.5, range: 420 }); w.audio.play('pageGet', { x: e.x, vol: 0.5 }); }); return t > 1.6;
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
  e.data.formT = e.data.phase >= 2 ? 5 : 7;
  e.flash = 1; w.audio.play('bossRoar', { x: e.x, pitch: 0.7 });
  const def = getEnemy(e.data.form);
  w.hud.toast(`It ${S.forms} ${def?.name ?? 'something you remember'}.`, 1.6);
}
const finalBoss = (id: string, name: string, desc: string, gore: string, glow: string, paint: (p: any, f: number, rage: number) => void): EnemyDef => ({
  id, name, desc, boss: true,
  hp: 1100, r: 24, speed: 0, role: 'boss', cost: 0, hitY: 44, mass: 60, noKnock: true, gore, goreDecal: gore, light: [120, glow],
  sprites: () => ({ idle: frames(96, 104, 4, (p, f) => paint(p, f, 0)), rage: frames(96, 104, 4, (p, f) => paint(p, f, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 2; e.data.phase = 0; },
  update(e, w, dt) {
    const d = e.data;
    e.animate(dt, 5);
    if (Math.random() < dt * 8) w.fx.burst(e.x + (Math.random() - 0.5) * 50, e.y, 3, 1, styleOf(e).creep, 30, 0.8);
    // phases at 75%, 50% and 25%
    const TH = [0.75, 0.5, 0.25];
    if (d.phase < TH.length && e.hpFrac() <= TH[d.phase]) {
      d.phase++; d.move = null; d.idleT = 1.2; e.invuln = true; d.invT = 1.1;
      w.proj.clear(); w.shake(8); w.whiteFlash = 0.6; w.hitstop(0.15); w.audio.play('bossRoar', { x: e.x });
      if (d.phase === 1) { w.hud.toast('The Unwritten starts rewriting itself.'); rewrite(e, w); }
      if (d.phase === 2) w.hud.toast('It writes faster.');
      if (d.phase === 3) { d.form = null; e.anim = 'rage'; w.hud.toast('The last line. Everything at once.'); const p = nearPlayer(w, 110); e.x = p.x; e.y = p.y; }
    }
    if (d.invT > 0) { d.invT -= dt; e.sx = 1 + Math.sin(e.t * 40) * 0.05; if (d.invT <= 0) { e.invuln = false; e.sx = 1; } return; }
    // shape changes on a timer while rewriting (phases 1-2)
    if (d.form && (d.phase === 1 || d.phase === 2)) { d.formT -= dt; if (d.formT <= 0 && !d.move) rewrite(e, w); }
    if (d.move) {
      if (runMove(e, w, dt)) { d.move = null; d.idleT = (d.phase >= 3 ? 0.35 : d.phase >= 2 ? 0.55 : 0.8) + Math.random() * 0.3; }
      // the last stand layers a slow spiral under everything else
      if (d.phase >= 3 && d.move !== 'spiral') { d.ls = (d.ls ?? 0) - dt; if (d.ls <= 0) { d.ls = 0.32; d.la = (d.la ?? 0) + 0.45; for (let i = 0; i < 3; i++) shoot(e, w, d.la + (i / 3) * TAU, 80, { shape: styleOf(e).alt, r: 3 }); } }
      return;
    }
    // circle Marcus at a distance, never quite still (the arena is bigger than the screen)
    const pl = w.player;
    d.wa = (d.wa ?? 0) + dt * 0.4;
    const a = angleTo(e.x, e.y, pl.x + Math.cos(d.wa) * 120, pl.y - 30 + Math.sin(d.wa * 1.3) * 45);
    e.move(w, Math.cos(a) * 40 * dt, Math.sin(a) * 40 * dt);
    e.flip = w.player.x < e.x;
    d.idleT -= dt;
    if (d.idleT <= 0) {
      const moves = d.phase >= 3 ? LAST_MOVES : d.form ? [...FORMS[d.form], 'tendrils' as Move] : BASE_MOVES;
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
        w.r.addGlow(sx, sy - 30, 70, styleOf(e).glow, 0.2);
        return;
      }
    }
    drawBoss(e, ctx, sx, sy, { yoff: 6 });
    w.r.addGlow(sx, sy - 50, 80, d.phase >= 3 ? '#ff3050' : styleOf(e).glow, e.def.id === 'author' ? 0.08 : 0.2);
  },
});
const unwritten = finalBoss('unwritten', 'The Unwritten', 'Everything the book left out, writing itself in. It wants the last word.', '#14112a', '#8a7aff', paintUnwritten);

/** The Author: robed in white, haloed in quills, the pen that started all of this. */
function paintAuthor(p: any, f: number, rage: number): void {
  const robe = ramp('#efe6d2'), gold = ramp('#d8b048'), shade = ramp('#b8ab90');
  const cx = 48, by = 96;
  // long robe flaring at the hem, with gold trim
  for (let y = 26; y < by; y++) {
    const k = (y - 26) / (by - 26), half = 9 + k * 24 + Math.sin(y * 0.3 + f * 1.3) * 1.5;
    for (let x = Math.floor(cx - half); x < cx + half; x++) p.set(x, y, robe[(x - cx) > half * 0.4 ? 1 : (x - cx) < -half * 0.6 ? 3 : 2]);
    p.set(Math.floor(cx - half), y, gold[2]); p.set(Math.ceil(cx + half) - 1, y, gold[1]);
  }
  for (let x = cx - 33; x < cx + 33; x++) p.set(x, by - 1, gold[3]);
  // the great quill held across the body
  p.tube(cx - 26, 70, cx + 18, 30, 1.5, shade);
  for (let i = 0; i < 12; i++) p.line(cx + 18 - i * 3, 30 + i * 3, cx + 24 - i * 3, 22 + i * 3, robe[4]);
  p.set(cx - 27, 71, '#14112a'); p.set(cx - 28, 72, '#14112a');
  // hood with no face, only light; a halo of quill nibs
  p.ball(cx, 16, 12, 13, robe, { dither: 0.4 });
  p.ball(cx, 18, 7, 8, ramp(rage ? '#ff6050' : '#fff2c0'), { dither: 0.2 });
  for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; const x = cx + Math.cos(a) * 18, y = 12 + Math.sin(a) * 14; p.poly([x - 1.2, y, x + 1.2, y, x + Math.cos(a) * 5, y + Math.sin(a) * 5], gold[3 - (i % 2)]); }
  sprinkle(p, '#ffffff', 10, 5 + f);
}
const author = finalBoss('author', 'The Author', 'Grandfather, as he was when he first picked up the pen. He would like a better ending.', '#e8d8a0', '#ffe8a0', paintAuthor);

export const BOSSES_D: EnemyDef[] = [thornwife, rimebride, pendulum, typesetter, bookbinder, unwritten, author];
void clamp; void dist; void hex; void eye;
