// Bosses of the hospital path: the Iron Lung (Intensive Care) and The Patient, waiting in Room 4.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, ramp, hex, glowEye, sprinkle } from '../art/creature';
import { aimAngle, shoot, spreadShot, ringShot, randomFloorPoint, chase } from '../enemies/ai';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { TAU, angleTo, angleDiff, dist } from '../core/math';
import { enemyBeam, Beam } from '../projectiles/weapons';
import type { World } from '../game/world';
import { moveBody } from '../rooms/collide';
import { TILE } from '../core/constants';
import { charById } from '../player/characters';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ alpha: number; yoff: number }> = {}): void {
  const set = e.sprites[e.anim] ?? e.sprites.idle; const spr = set[e.frame % set.length];
  spr.draw(ctx, sx, sy - e.z + (extra.yoff ?? 2), { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, alpha: extra.alpha ?? (e.alpha < 1 ? e.alpha : undefined) });
}
function gapRing(e: Enemy, w: World, n: number, gap: number, speed: number, at: number, o: Parameters<typeof shoot>[4] = {}): void {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (Math.abs(angleDiff(a, at)) < (gap / n) * Math.PI) continue; shoot(e, w, a, speed, o); }
}
const inRoom = (w: World, x: number, y: number) => x > w.room.ox + 12 && x < w.room.ox + w.room.cols * TILE - 12 && y > w.room.oy + 12 && y < w.room.oy + w.room.rows * TILE - 12;
/** Breathe in: drag Marcus toward a point (walls still stop him). Flying doesn't help. */
function pull(w: World, x: number, y: number, strength: number, dt: number): void {
  const pl = w.player, d = dist(pl.x, pl.y, x, y);
  if (d < 12) return;
  const a = angleTo(pl.x, pl.y, x, y), k = strength * dt * Math.min(1, 220 / d + 0.35);
  moveBody(w.room, pl, Math.cos(a) * k, Math.sin(a) * k, pl.flight ? 'fly' : 'walk');
  if (Math.random() < dt * 14) w.fx.burst(pl.x + (Math.random() - 0.5) * 40, pl.y - 6 + (Math.random() - 0.5) * 20, 1, 1, '#d8e8f0', 30, 0.4, 1, 0);
}

// ================================================================== The Iron Lung (Intensive Care)
function paintLung(p: any, f: number, rage: number, n = 4): void {
  const iron = ramp('#6a7a84'), dark = ramp('#2a3238'), brass = ramp('#c8a04a'), skin = ramp('#d8c0a8');
  const breath = Math.sin((f / n) * TAU); f = (f / n) * 4;
  // wheeled stand
  p.rect(14, 46, 56, 4, dark[2]);
  for (const x of [20, 62]) { p.ball(x, 52, 4, 4, dark); p.set(x, 52, '#8a8a92'); }
  // the riveted drum lying on its side
  p.ball(42, 30, 32, 17, iron, { dither: 0.5 });
  p.rect(14, 14, 56, 32, iron[2]); p.shadeV(14, 14, 56, 32, iron, 0.5);
  for (let x = 18; x < 70; x += 8) { p.set(x, 16, iron[4]); p.set(x, 43, iron[0]); }
  p.rect(14, 14, 56, 1, iron[4]);
  // portholes
  for (const x of [32, 48]) { p.ball(x, 24, 4, 4, dark); p.ball(x, 24, 3, 3, ramp(rage ? '#6a2a2a' : '#4a6a7a')); p.set(x - 1, 23, '#ffffff'); }
  // gauges, needles twitching
  for (const [x, k] of [[60, 0], [66, 1]] as [number, number][]) { p.ball(x, 22, 3, 3, ramp('#efe6d0')); p.ring(x, 22, 3, brass[2]); const a = -Math.PI / 2 + (rage ? 1.2 : 0.4) + Math.sin(f * 2.1 + k) * 0.5; p.line(x, 22, x + Math.cos(a) * 2.5, 22 + Math.sin(a) * 2.5, hex(rage ? '#d02020' : '#1a1010')); }
  // bellows at the far end, pumping
  const bw = 6 + breath * 3;
  for (let i = 0; i < 4; i++) p.rect(70 + i * (bw / 4), 18 + i, 2, 24 - i * 2, dark[1 + (i % 2)]);
  p.rect(70 + bw, 20, 3, 20, iron[3]);
  // the head poking out of the near end, with a breathing mask
  p.rect(4, 24, 12, 12, iron[1]);
  p.ball(8, 27, 6, 6, skin, { dither: 0.4 });
  p.rect(2, 22, 12, 3, hex('#9a9aa0'));
  glowEye(p, 6, 26, rage ? '#ff3040' : '#1a1418'); glowEye(p, 10, 26, rage ? '#ff3040' : '#1a1418');
  p.ball(8, 32, 4, 3, ramp('#a8c8d0'), { dither: 0.3 }); p.set(8, 32, '#ffffff');
  p.tube(8, 35, 20, 44, 1.2, ramp('#c8d8e0'));
  // rust streaks, a condemned tag, tubes snaking to the stand
  for (const x of [22, 41, 57]) for (let j = 0; j < 8; j++) p.set(x + (j % 2), 30 + j, j % 3 ? '#8a5a3a' : '#6a4a3a');
  p.rect(36, 34, 8, 5, hex('#e8dca8')); p.rect(37, 35, 6, 1, hex('#c83a3a')); p.rect(37, 37, 4, 1, hex('#4a3a2a'));
  p.tube(52, 44, 58, 48, 1, ramp('#c8d8e0')); p.tube(26, 44, 22, 47, 1, ramp('#c8d8e0'));
  for (let x = 16; x < 70; x += 6) p.set(x + 2, 18 + ((x * 3) % 5), '#c8e0f0');   // condensation beads
  sprinkle(p, '#9aa8b0', 6, 3 + Math.round(f), 14, 14, 56, 32);
}
const lungBrain: BossBrain = {
  idleTime: [0.8, 1.3], phases: [0.5],
  idle(e, w, dt) { chase(e, w, 16 + e.data.phase * 8, dt); e.flip = w.player.x > e.x; e.animate(dt, 4); },
  attacks: [
    { id: 'exhale', weight: 3,
      run(e, w, t) {
        const times = e.data.phase ? [0.35, 0.6, 0.85, 1.1] : [0.4, 0.8, 1.2];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) {
          spreadShot(e, w, e.data.phase ? 7 : 5, aimAngle(e, w), 0.9, 130, { shape: 'water', r: 3.5 });
          w.audio.play('bossSpit', { x: e.x, pitch: 0.7 }); e.data.k++;
        }
        if (t > times[times.length - 1] + 0.4) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'inhale', weight: 2, cooldown: 4,
      start(e, w) { w.audio.play('rumble', { x: e.x }); w.hud.toast('It breathes in.', 1); },
      run(e, w, t, dt) {
        if (t < 1.8) {
          pull(w, e.x, e.y, 70, dt);
          // the air it drags in carries shots with it
          e.data.it = (e.data.it ?? 0) - dt;
          if (e.data.it <= 0) { e.data.it = 0.18; const a = Math.random() * TAU; const x = e.x + Math.cos(a) * 170, y = e.y + Math.sin(a) * 110; if (inRoom(w, x, y)) w.proj.enemy(x, y, angleTo(x, y, e.x, e.y), 90, { shape: 'water', r: 3, range: 170 }); }
          return false;
        }
        if (!e.data.ex) { e.data.ex = true; ringShot(e, w, e.data.phase ? 20 : 14, 120, Math.random(), { shape: 'water', r: 4 }); w.shake(4); w.audio.play('erupt', { x: e.x }); }
        if (t > 2.3) { e.data.ex = false; return true; }
        return false;
      } },
    { id: 'pressure', weight: 2.5,
      run(e, w, t) {
        const times = [0.3, 0.8];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) { gapRing(e, w, e.data.phase ? 20 : 16, 3, 95, angleTo(e.x, e.y, w.player.x, w.player.y) + e.data.k * 0.6, { shape: 'holy', r: 3.5 }); w.audio.play('sizzle', { x: e.x, pitch: 1.2 }); e.data.k++; }
        if (t > 1.3) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'roll', weight: 2,
      start(e, w) { e.data.ra = w.player.x > e.x ? 0 : Math.PI; telegraph(w, e.x + Math.cos(e.data.ra) * 60, e.y, 20, 0.6, '#80c0ff'); },
      run(e, w, t, dt) {
        if (t < 0.6) { e.sx = 1 + Math.sin(t * 40) * 0.04; return false; }
        const h = e.move(w, Math.cos(e.data.ra) * 230 * dt, 0);
        if (Math.random() < 0.4) w.addCreep(e.x, e.y + 4, 9, 'enemy', 1, 2.5, '#5a8aa0');
        if (h.hx || t > 1.8) { w.shake(5); ringShot(e, w, 12, 110, 0, { shape: 'water', r: 3.5 }); w.audio.play('slam', { x: e.x }); e.sx = 1; return true; }
        return false;
      } },
    { id: 'alarm', weight: 2.5, phases: [1],
      start(e, w) { e.data.sa = Math.random() * TAU; w.audio.play('bell', { x: e.x, pitch: 2.2, vol: 0.5 }); },
      run(e, w, t, dt) {
        e.data.sa += dt * 2.6; e.data.st = (e.data.st ?? 0) - dt;
        if (e.data.st <= 0) { e.data.st = 0.12; for (let i = 0; i < 2; i++) shoot(e, w, e.data.sa + i * Math.PI, 105, { shape: i ? 'water' : 'holy', r: 3.2 }); }
        return t > 2.4;
      } },
  ],
  onPhase(e, w) { w.hud.toast('The alarms start. Every gauge in the red.'); e.anim = 'rage'; },
};
const ironlung: EnemyDef = {
  id: 'ironlung', name: 'The Iron Lung', desc: 'It breathes for whoever is inside. It would like to breathe for you.', boss: true,
  hp: 420, r: 20, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 40, noKnock: true, gore: '#6a7a84', goreDecal: '#3a4a54', light: [60, '#c0e8ff'],
  sprites: () => ({ idle: frames(84, 58, 8, (p, f, n) => paintLung(p, f, 0, n)), rage: frames(84, 58, 8, (p, f, n) => paintLung(p, f, 1, n)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, lungBrain); if (Math.random() < dt * 3) w.fx.burst(e.x - (e.flip ? -36 : 36), e.y - 20, 2, 1, '#e8f0f4', 30, 0.6); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Patient (Room 4)
// What Marcus imagined was in the bed at the end of the ward: a tall shape under a hospital sheet,
// tubes trailing to a drip stand, a heart monitor glowing through its chest. It is the last thing he
// was afraid of. When it falls, it is only Grandad.
function paintPatient(p: any, f: number, rage: number, n = 4): void {
  const sheet = ramp('#dce4e0'), gown = ramp('#9ab8c0'), ink = ramp('#14112a'), steel = ramp('#9a9aa4');
  const cx = 44, bob = Math.sin((f / n) * TAU) * 1.5; f = Math.round((f / n) * 4);
  // the drip stand beside it, with a bag and a tube to the arm
  p.rect(80, 14, 2, 80, steel[2]); p.rect(74, 92, 14, 2, steel[1]); p.rect(76, 12, 10, 2, steel[3]);
  p.ball(81, 22, 5, 7, ramp(rage ? '#c83a4a' : '#c8e0f0'), { dither: 0.3 }); p.set(79, 19, '#ffffff');
  p.tube(81, 29, 64, 50 + bob, 0.9, ramp('#d8e8f0'));
  // the sheet, draped over something too tall, hanging in points at the hem
  for (let y = 16; y < 96; y++) {
    const k = (y - 16) / 80, half = 12 + k * 20 + Math.sin(y * 0.25 + f * 1.2) * 1.5;
    for (let x = Math.floor(cx - half); x < cx + half; x++) p.set(x, y + bob, sheet[(x - cx) > half * 0.45 ? 1 : (x - cx) < -half * 0.6 ? 3 : 2]);
  }
  for (let x = cx - 30; x < cx + 32; x += 6) p.poly([x, 95 + bob, x + 6, 95 + bob, x + 3, 100 + bob + ((x * 7) % 3)], sheet[1]);
  // stitched-on name tape at the collar (Edda's)
  p.rect(cx - 6, 30 + bob, 12, 2, hex('#e8e0c8')); for (let i = 0; i < 5; i++) p.set(cx - 4 + i * 2, 30 + bob, '#8a2a2a');
  // gown showing through where the sheet has slipped
  p.poly([cx - 12, 34 + bob, cx + 12, 34 + bob, cx + 16, 60 + bob, cx - 16, 60 + bob], gown[2]);
  for (let x = cx - 10; x < cx + 12; x += 4) for (let y = 38; y < 58; y += 4) p.set(x + ((y / 4) % 2) * 2, y + bob, gown[3]);
  // the heart monitor through its chest: a green trace, red when it races
  p.rect(cx - 10, 42 + bob, 20, 11, hex('#0a1410'));
  const mc = rage ? '#ff4050' : '#60ff90';
  const trace = [0, 0, 0, -1, 0, 0, -5, 4, -2, 0, 0, 0, 0, -1, 0, 0, -5, 4, -2, 0];
  for (let i = 0; i < 18; i++) p.set(cx - 9 + i, 48 + bob + trace[(i + f * 3) % trace.length], mc);
  // long arms in sleeves, hands like a bundle of tubes
  for (const s of [-1, 1]) {
    p.tube(cx + s * 14, 36 + bob, cx + s * 26, 62 + bob, 2.5, sheet);
    for (let k = 0; k < 4; k++) p.line(cx + s * 26, 62 + bob, cx + s * (24 + k * 2), 72 + bob + k, ink[2]);
  }
  // the hooded head: no face, only a breathing mask and two holes that run with ink
  p.ball(cx, 18 + bob, 11, 12, sheet, { dither: 0.3 });
  p.ball(cx, 20 + bob, 7, 8, ink, { dither: 0.2 });
  glowEye(p, cx - 3, 18 + bob, rage ? '#ff3040' : '#c8e8ff'); glowEye(p, cx + 3, 18 + bob, rage ? '#ff3040' : '#c8e8ff');
  for (const s of [-3, 3]) p.line(cx + s, 20 + bob, cx + s + (s > 0 ? 1 : -1), 27 + bob + (f % 2), ink[3]);
  p.ball(cx, 26 + bob, 4, 3, ramp('#a8c8d0'), { dither: 0.3 }); p.set(cx - 1, 25 + bob, '#ffffff');
  if (rage) sprinkle(p, '#14112a', 26, 7 + f, cx - 26, 40, 52, 56);
}

/** The heart monitor: each beep is a ring of shots. */
function beep(e: Enemy, w: World, n: number, speed: number): void {
  gapRing(e, w, n, 3, speed, angleTo(e.x, e.y, w.player.x, w.player.y) + (Math.random() - 0.5) * 2, { shape: 'bile', r: 3.5 });
  w.audio.play('chime', { x: e.x, pitch: 2.4, vol: 0.35 });
  w.fx.ring(e.x, e.y - 48, 4, 26, e.data.phase >= 2 ? '#ff4050' : '#60ff90', 0.3);
}
const patientBrain: BossBrain = {
  idleTime: [0.6, 1.05], phases: [0.66, 0.33],
  idle(e, w, dt) {
    // drift after Marcus at the edge of the screen, never quite touching the floor
    const pl = w.player;
    e.data.wa = (e.data.wa ?? 0) + dt * 0.5;
    const a = angleTo(e.x, e.y, pl.x + Math.cos(e.data.wa) * 110, pl.y - 30 + Math.sin(e.data.wa * 1.3) * 40);
    e.move(w, Math.cos(a) * (34 + e.data.phase * 8) * dt, Math.sin(a) * (34 + e.data.phase * 8) * dt);
    e.z = 6 + Math.sin(e.t * 1.6) * 3; e.flip = pl.x < e.x; e.animate(dt, 4);
    // between attacks the monitor keeps beeping
    e.data.hb = (e.data.hb ?? 1) - dt;
    if (e.data.hb <= 0) { e.data.hb = [1.4, 1.0, 0.7][e.data.phase]; beep(e, w, 10 + e.data.phase * 2, 70 + e.data.phase * 10); }
  },
  attacks: [
    { id: 'heartbeat', weight: 3,
      run(e, w, t) {
        const gap = [0.4, 0.32, 0.24][e.data.phase], n = 4 + e.data.phase;
        e.data.k ??= 0;
        while (e.data.k < n && t > 0.3 + e.data.k * gap) { beep(e, w, 16 + e.data.phase * 3, 90 + e.data.k * 8); e.data.k++; }
        if (t > 0.5 + n * gap) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'tubes', weight: 2.5,
      run(e, w, t) {
        const times = [0.35, 0.8, 1.25];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) {
          const a = angleTo(e.x, e.y, w.player.x, w.player.y);
          for (const s of e.data.phase >= 1 ? [-0.45, 0, 0.45] : [-0.3, 0.3]) {
            for (let i = 1; i <= 13; i++) { const ang = a + s + (e.data.k - 1) * 0.12, x = e.x + Math.cos(ang) * 15 * i, y = e.y + Math.sin(ang) * 15 * i; w.after(i * 0.05, () => { if (!e.dead) w.proj.enemy(x, y, ang, 0, { r: 4.5, life: 0.7, shape: 'water', z: 6 }); }); }
          }
          w.audio.play('rumble', { x: e.x, vol: 0.4 }); e.data.k++;
        }
        if (t > 1.8) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'pills', weight: 2,
      run(e, w, t) {
        const times = [0.3, 0.6, 0.9];
        e.data.k ??= 0;
        while (e.data.k < times.length && t > times[e.data.k]) {
          for (let i = 0; i < 3 + e.data.phase; i++) { const a = aimAngle(e, w) + (Math.random() - 0.5) * 1.4; shoot(e, w, a, 70 + Math.random() * 60, { shape: 'holy', r: 4, lob: true, lobH: 40, split: 5, splitSpd: 95 }); }
          w.audio.play('coinDrop', { x: e.x, pitch: 0.7 }); e.data.k++;
        }
        if (t > 1.5) { e.data.k = 0; return true; }
        return false;
      } },
    { id: 'drip', weight: 2,
      run(e, w, t) {
        if (!e.data.dr) {
          e.data.dr = true;
          const pl = w.player;
          for (let i = 0; i < 8 + e.data.phase * 3; i++) {
            const x = pl.x + (Math.random() - 0.5) * 110, y = pl.y + (Math.random() - 0.5) * 70;
            if (!inRoom(w, x, y)) continue;
            telegraph(w, x, y, 8, 0.55 + i * 0.09, '#80c0ff');
            w.after(i * 0.09, () => { if (!e.dead) w.proj.enemy(x, y, 0, 0, { drop: 120, r: 5, shape: 'water' }); });
          }
        }
        if (t > 1.7) { e.data.dr = false; return true; }
        return false;
      } },
    { id: 'breath', weight: 2.5, phases: [1, 2], cooldown: 4,
      start(e, w) { w.hud.toast('It can\'t breathe. It wants your breath.', 1.4); w.audio.play('rumble', { x: e.x }); },
      run(e, w, t, dt) {
        if (t < 1.6) { pull(w, e.x, e.y, 78, dt); return false; }
        if (!e.data.bx) { e.data.bx = true; spreadShot(e, w, 15, aimAngle(e, w), 2.2, 150, { shape: 'water', r: 4 }); ringShot(e, w, 12, 80, Math.random(), { shape: 'holy', r: 3.5 }); w.shake(5); w.audio.play('bossRoar', { x: e.x, pitch: 0.6 }); }
        if (t > 2.1) { e.data.bx = false; return true; }
        return false;
      } },
    { id: 'visitors', weight: 1.2, phases: [1], cooldown: 9,
      run(e, w, t) {
        if (!e.data.vs) {
          e.data.vs = true;
          const n = w.enemies.filter((x) => !x.dead && !x.isBoss).length;
          for (let i = 0; i < Math.max(0, 3 - n); i++) { const p = randomFloorPoint(w, 80); const k = w.spawnEnemy(i % 2 ? 'orderly' : 'nursedoll', p.x, p.y, false); if (k) k.noDrop = true; }
          w.hud.toast('Visiting hours are over.', 1.4);
        }
        if (t > 1) { e.data.vs = false; return true; }
        return false;
      } },
    { id: 'flatline', weight: 3, phases: [2], cooldown: 3,
      start(e, w) {
        // the trace goes flat: a line right across the room, swinging slowly, with beeps between
        const s = Math.random() < 0.5 ? 1 : -1;
        e.data.bs = [enemyBeam(w, e.x, e.y - 48, 0, 3.4, 0.9, 8, s * 0.32), enemyBeam(w, e.x, e.y - 48, Math.PI, 3.4, 0.9, 8, s * 0.32)];
        w.audio.play('beam', { x: e.x }); w.hud.toast('Flatline.', 1);
      },
      run(e, w, t) {
        for (const b of e.data.bs as Beam[]) { b.x = e.x; b.y = e.y - 48; }
        e.data.fk ??= 0;
        if (t > 1.2 + e.data.fk * 0.7 && e.data.fk < 3) { beep(e, w, 14, 80); e.data.fk++; }
        if (t > 4.3) { e.data.bs = []; e.data.fk = 0; return true; }
        return false;
      } },
  ],
  onPhase(e, w, ph) {
    if (ph === 1) w.hud.toast('The monitor speeds up.');
    else { w.hud.toast('The line goes flat. It keeps coming.'); e.anim = 'rage'; w.whiteFlash = 0.4; }
  },
};
const patient: EnemyDef = {
  id: 'patient', name: 'The Patient', desc: 'The bed at the end of the ward. Everything Marcus was afraid he would find there.', boss: true,
  hp: 1050, r: 18, speed: 0, role: 'boss', cost: 0, hitY: 46, mass: 60, noKnock: true, flying: true, gore: '#dce4e0', goreDecal: '#14112a', light: [110, '#c8e8ff'],
  sprites: () => ({ idle: frames(92, 104, 8, (p, f, n) => paintPatient(p, f, 0, n)), rage: frames(92, 104, 8, (p, f, n) => paintPatient(p, f, 1, n)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 2; e.z = 6; },
  update(e, w, dt) { bossUpdate(e, w, dt, patientBrain); if (Math.random() < dt * 5) w.fx.burst(e.x + (Math.random() - 0.5) * 40, e.y, 2, 1, e.data.phase >= 2 ? '#14112a' : '#dce4e0', 20, 0.8); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 6 }); w.r.addGlow(sx, sy - e.z - 46, 50, e.data.phase >= 2 ? '#ff4050' : '#60ff90', 0.14); },
};

// ================================================================== Echoes
// Your last death, come back: a ghost of the reader you died as, on the chapter where it happened.
// It fights the way you did (strafing, dashing, firing your shots), harder the more you carried,
// and when it fades it leaves one of the things it had.
const echo: EnemyDef = {
  id: 'echo', name: 'Your Echo', desc: 'It died here last time. It remembers how.', boss: true,
  hp: 230, r: 7, speed: 0, role: 'boss', cost: 0, hitY: 12, mass: 4, gore: '#a8c8f0', goreDecal: '#2a3a5a', light: [50, '#a8d0ff'],
  // (in play it wears your reader's look; this is how the Bestiary remembers it)
  sprites: () => ({ idle: frames(22, 30, 2, (p, f) => {
    const c = ramp('#a8c8f0');
    p.ball(11, 9, 7, 7, c, { dither: 0.4 }); p.poly([4, 12, 18, 12, 20, 28 - f, 15, 26, 11, 29, 7, 26, 2, 28 - f], c[2]);
    p.ball(11, 10, 4.5, 4.5, ramp('#1a2a44')); p.set(9, 10, '#e8f4ff'); p.set(13, 10, '#e8f4ff');
    for (let y = 16; y < 26; y += 3) p.set(11, y, c[4]);
  }) }),
  init(e) { e.data.idleT = 1; e.data.dir = 'down'; },
  update(e, w, dt) {
    const d = e.data, pl = w.player;
    const power = Math.min(3, (d.items?.length ?? 0) / 6);
    d.t2 = (d.t2 ?? 0) + dt;
    // strafe around Marcus at a fighting distance, like a player would
    const dd = dist(e.x, e.y, pl.x, pl.y), a = angleTo(e.x, e.y, pl.x, pl.y);
    d.side ??= 1; if (Math.random() < dt * 0.5) d.side *= -1;
    const want = dd > 130 ? 1 : dd < 80 ? -1 : 0;
    const mx = Math.cos(a) * want + Math.cos(a + Math.PI / 2 * d.side) * 0.8, my = Math.sin(a) * want + Math.sin(a + Math.PI / 2 * d.side) * 0.8;
    const sp = (d.dash > 0 ? 220 : 62 + power * 10);
    e.move(w, mx * sp * dt, my * sp * dt);
    d.dash = (d.dash ?? 0) - dt;
    d.dcd = (d.dcd ?? 2.5) - dt;
    if (d.dcd <= 0) { d.dcd = 2.2 + Math.random() * 1.5; d.dash = 0.22; d.side *= -1; w.fx.smoke(e.x, e.y, 4, 'rgba(160,190,230,', 4, 0.4); }
    d.dir = Math.abs(pl.x - e.x) > Math.abs(pl.y - e.y) ? 'side' : pl.y > e.y ? 'down' : 'up';
    e.flip = pl.x < e.x;
    // tears, in bursts, the way it used to shoot
    d.fcd = (d.fcd ?? 1) - dt;
    if (d.fcd <= 0) {
      d.fcd = Math.max(0.28, 0.55 - power * 0.08);
      const n = 1 + Math.floor(power), aim = aimAngle(e, w, 0.4, 150);
      for (let i = 0; i < n; i++) shoot(e, w, aim + (i - (n - 1) / 2) * 0.16, 150 + power * 12, { shape: 'water', r: 3.5, z: 10 });
      w.audio.play('shoot', { x: e.x, pitch: 0.7, vol: 0.4 });
    }
    // and now and then everything it had at once
    d.bcd = (d.bcd ?? 4) - dt;
    if (d.bcd <= 0) { d.bcd = 4.5 - power * 0.5; ringShot(e, w, 10 + Math.floor(power * 3), 105, Math.random(), { shape: 'water', r: 3.5, z: 10 }); w.audio.play('bossSpit', { x: e.x, pitch: 1.3 }); }
    if (Math.random() < dt * 10) w.fx.burst(e.x + (Math.random() - 0.5) * 10, e.y - 6, 4, 2, '#c8e0ff', 16, 0.6);
  },
  draw(e, ctx, w, sx, sy) {
    const sp = w.game.menus.sprites(charById(e.data.char ?? 'marcus'));
    const dir = (e.data.dir ?? 'down') as 'down' | 'up' | 'side';
    const flies = !!charById(e.data.char ?? 'marcus').flight, f = Math.floor(e.t * 11) % 8 + 1;
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.25 * Math.sin(e.t * 7) * Math.sin(e.t * 2.3);
    ctx.filter = 'grayscale(1) brightness(1.3) sepia(0.4) hue-rotate(170deg) saturate(2.2)';
    // an echo of a reader who flew hovers with its legs still
    const body = flies ? sp.fly[dir][Math.floor(e.t * 1.6) % 2] : sp.body[dir][f] ?? sp.body[dir][0];
    body.draw(ctx, sx, sy + 1, { flip: dir === 'side' && e.flip, flash: e.flash > 0 ? 0.6 : 0 });
    sp.head[dir].normal.draw(ctx, sx, sy - 9, { flip: dir === 'side' && e.flip, flash: e.flash > 0 ? 0.6 : 0 });
    ctx.restore();
    w.r.addGlow(sx, sy - 10, 22, '#a8d0ff', 0.25);
  },
};

export const BOSSES_E: EnemyDef[] = [ironlung, patient, echo];
void hex;
