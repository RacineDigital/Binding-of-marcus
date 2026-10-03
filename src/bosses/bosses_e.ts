// Bosses of the hospital path: the Iron Lung (Intensive Care) and The Patient, waiting in Room 4.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, ramp, hex, glowEye, sprinkle } from '../art/creature';
import { aimAngle, shoot, spreadShot, ringShot, randomFloorPoint, chase } from '../enemies/ai';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { rig, drawRigged } from './rig';
import * as G from './art_e';
import { TAU, angleTo, angleDiff, dist } from '../core/math';
import { enemyBeam, Beam } from '../projectiles/weapons';
import type { World } from '../game/world';
import { moveBody, solidCell } from '../rooms/collide';
import { TILE } from '../core/constants';
import { charById } from '../player/characters';
import { getEnemy } from '../enemies/registry';
import { PATTERNS } from './patterns';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ alpha: number; yoff: number }> = {}, w?: World): void {
  // rigged bosses pick their own pose and draw their eyes live
  if (w && e.sprites.death) { drawRigged(e, ctx, w, sx, sy, { alpha: extra.alpha, yoff: extra.yoff ?? 2 }); return; }
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
  sprites: () => rig({ w: 84, h: 58, paint: G.paintLung, phases: 1, aliases: { rage: 'idle' } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, lungBrain); if (Math.random() < dt * 3) w.fx.burst(e.x - (e.flip ? -36 : 36), e.y - 20, 2, 1, '#e8f0f4', 30, 0.6); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Patient (Room 4)
// What Marcus imagined was in the bed at the end of the ward: a tall shape under a hospital sheet,
// tubes trailing to a drip stand, a heart monitor glowing through its chest. It is the last thing he
// was afraid of. When it falls, it is only Grandad.

/** The heart monitor: each beep is a ring of shots. */
function beep(e: Enemy, w: World, n: number, speed: number): void {
  gapRing(e, w, n, 3, speed, angleTo(e.x, e.y, w.player.x, w.player.y) + (Math.random() - 0.5) * 2, { shape: 'bile', r: 3.5 });
  w.audio.play('chime', { x: e.x, pitch: 2.4, vol: 0.35 });
  w.fx.ring(e.x, e.y - 48, 4, 26, e.data.phase >= 2 ? '#ff4050' : '#60ff90', 0.3);
}
const patientBrain: BossBrain = {
  idleTime: [0.5, 0.9], phases: [0.75, 0.5, 0.25],
  idle(e, w, dt) {
    // drift after Marcus at the edge of the screen, never quite touching the floor
    const pl = w.player;
    e.data.wa = (e.data.wa ?? 0) + dt * 0.5;
    const a = angleTo(e.x, e.y, pl.x + Math.cos(e.data.wa) * 110, pl.y - 30 + Math.sin(e.data.wa * 1.3) * 40);
    e.move(w, Math.cos(a) * (34 + e.data.phase * 8) * dt, Math.sin(a) * (34 + e.data.phase * 8) * dt);
    e.z = 6 + Math.sin(e.t * 1.6) * 3; e.flip = pl.x < e.x; e.animate(dt, 4);
    // between attacks the monitor keeps beeping
    e.data.hb = (e.data.hb ?? 1) - dt;
    if (e.data.hb <= 0) { e.data.hb = [1.3, 1.0, 0.75, 0.55][e.data.phase]; beep(e, w, 10 + e.data.phase * 2, 70 + e.data.phase * 10); }
  },
  attacks: [
    { id: 'heartbeat', weight: 3,
      run(e, w, t) {
        const gap = [0.36, 0.3, 0.24, 0.2][e.data.phase], n = 4 + e.data.phase;
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
    // what it learned from everything else in the book
    { ...PATTERNS.wall('water'), weight: 2, phases: [1, 2, 3] },
    { ...PATTERNS.seekers('holy'), weight: 1.6, phases: [1, 2, 3] },
    { ...PATTERNS.spiral('bile'), weight: 2, phases: [2, 3] },
    { ...PATTERNS.shockwave('water'), weight: 2, phases: [2, 3] },
    { id: 'flatline', weight: 3, phases: [2, 3], cooldown: 3,
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
    if (ph === 1) w.hud.toast('The monitor speeds up. It forgets who it is.');
    else if (ph === 2) { w.hud.toast('The line goes flat. It keeps coming.'); e.anim = 'rage'; w.whiteFlash = 0.4; }
    else { w.hud.toast('Code blue.', 1.6); e.anim = 'rage'; w.whiteFlash = 0.7; w.shake(9); }
  },
};
// ------------------------------------------------------------------ forgetting
// The Patient doesn't remember who it is. Every so often it slips away and comes back as
// something else from the book (any boss Marcus has fought), still with its monitor beeping
// underneath, faster each phase: Delirium, in a hospital bed. Only bosses that stay where you can
// hit them: the ones that burrow, sink or blink out (Grubmother, Bilgemaw, Matron, Choirmaster,
// Thornwife) would leave it untouchable too often.
const FORMS = ['furnaceheart', 'oldstoker', 'sleepwalker', 'ossuaryknight', 'mothmother', 'bellringer',
  'rimebride', 'pendulum', 'typesetter', 'ironlung', 'wardrobe'];
/** The fields a borrowed form keeps for itself; swapped in while it acts and draws. */
const KEEP = ['def', 'data', 'r', 'hitY', 'anim', 'frame', 'ftime', 'state', 'st', 'z', 'sx', 'sy', 'alpha', 'hidden', 'cd', 'cd2', 'tx', 'ty', 'mode'] as const;
type Snapshot = Record<string, unknown>;
function snapshot(e: Enemy): Snapshot { const o: Snapshot = {}; for (const k of KEEP) o[k] = (e as any)[k]; return o; }
function restore(e: Enemy, o: Snapshot): void { for (const k of KEEP) (e as any)[k] = o[k]; }
/** Run `fn` with the Patient wearing its current form (its own def, data, state and body). */
function asForm(e: Enemy, fn: (fd: EnemyDef) => void): void {
  const pd = e.data, f = pd.form as { def: EnemyDef; body: Snapshot };
  const mine = snapshot(e);
  restore(e, f.body);
  e.data.phase = Math.min(e.data.phase ?? 0, 1); e.data.hard = true;
  try { fn(f.def); } finally { f.body = snapshot(e); restore(e, mine); }
}
/** Seconds between shifts, by phase (it only starts shifting in phase 2). */
const SHIFT = [18, 16, 13, 11];
/** How long it is gone (and untouchable) while it shifts. */
const VANISH = 0.3;
function shiftForm(e: Enemy, w: World): void {
  const pd = e.data, last = pd.form?.def.id;
  // fade out where it stands...
  w.fx.smoke(e.x, e.y - 30, 14, 'rgba(20,16,40,', 9, 0.9);
  w.audio.play('bossRoar', { x: e.x, pitch: 1.6, vol: 0.5 });
  // ...and come back as something else (or, now and then, as itself): usually close to where it
  // was, only sometimes somewhere else in the room
  const near = Math.random() < 0.65;
  const p = near ? nearPoint(w, e.x, e.y) : randomFloorPoint(w, 90);
  telegraph(w, p.x, p.y, 26, 0.5, '#80c0ff');
  pd.vanish = VANISH; pd.to = p; e.invuln = true;
  const pool = FORMS.filter((id) => id !== last && getEnemy(id));
  const next = pd.phase === 0 || Math.random() < 0.25 || !pool.length ? null : pool[Math.floor(Math.random() * pool.length)];
  pd.nextForm = next;
}
/** A spot on the floor a short step from (x, y), or (x, y) itself if nothing nearby is open. */
function nearPoint(w: World, x: number, y: number): { x: number; y: number } {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, d = 20 + Math.random() * 30, px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
    const [c, r] = w.room.cellAt(px, py);
    if (inRoom(w, px, py) && !solidCell(w.room, c, r, 'walk') && dist(px, py, w.player.x, w.player.y) > 60) return { x: px, y: py };
  }
  return { x, y };
}
function arrive(e: Enemy, w: World): void {
  const pd = e.data;
  e.x = pd.to.x; e.y = pd.to.y; e.invuln = false;
  w.fx.ring(e.x, e.y - 30, 8, 80, '#80c0ff', 0.5); w.shake(5);
  gapRing(e, w, 18 + pd.phase * 4, 3, 85, angleTo(e.x, e.y, w.player.x, w.player.y), { shape: 'dark', r: 3.6 });
  if (pd.nextForm) {
    const fd = getEnemy(pd.nextForm)!;
    // a fresh body for the form, standing where the Patient arrived
    const body: Snapshot = { def: fd, data: { idleT: 0.8, tier: pd.tier ?? 0 }, r: fd.r, hitY: fd.hitY ?? fd.r, anim: 'idle', frame: 0, ftime: 0, state: 'idle', st: 0, z: 0, sx: 1, sy: 1, alpha: 1, hidden: false, cd: 0, cd2: 0, tx: e.x, ty: e.y, mode: fd.ghost ? 'ghost' : fd.flying ? 'fly' : 'walk' };
    pd.form = { def: fd, body };
    asForm(e, (d) => d.init?.(e, w));
    w.hud.toast(`It remembers ${fd.name}.`, 1.2);
  } else { pd.form = null; e.anim = pd.phase >= 2 ? 'rage' : 'idle'; e.state = 'idle'; e.st = 0; pd.idleT = 0.6; }
  pd.shiftT = SHIFT[pd.phase] ?? 4.5;
}

const patient: EnemyDef = {
  id: 'patient', name: 'The Patient', desc: 'The bed at the end of the ward. Everything Marcus was afraid he would find there, and it has forgotten which.', boss: true,
  borrows: FORMS,
  hp: 9500, r: 18, speed: 0, role: 'boss', cost: 0, hitY: 46, mass: 60, noKnock: true, flying: true, gore: '#dce4e0', goreDecal: '#14112a', light: [110, '#c8e8ff'],
  sprites: () => rig({ w: 92, h: 104, paint: G.paintPatient, phases: 3, aliases: { rage: 'idle' } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 2; e.z = 6; e.data.shiftT = 12; },
  update(e, w, dt) {
    const pd = e.data;
    pd.phase ??= 0;
    // vanishing between forms
    if (pd.vanish > 0) { pd.vanish -= dt; e.alpha = Math.max(0, pd.vanish / VANISH); if (pd.vanish <= 0) { e.alpha = 1; arrive(e, w); } return; }
    // a phase line crossed while it was someone else: it snaps back to itself to scream about it
    const th = patientBrain.phases!;
    if (pd.form && pd.phase < th.length && e.hpFrac() <= th[pd.phase]) { pd.form = null; e.state = 'idle'; e.anim = 'idle'; e.z = 6; e.hidden = false; }
    if (pd.form) {
      asForm(e, (fd) => fd.update(e, w, dt));
      // the monitor never stops, whoever it is
      pd.hb = (pd.hb ?? 1.2) - dt;
      if (pd.hb <= 0) { pd.hb = [1.6, 1.3, 1.0, 0.8][pd.phase]; beep(e, w, 10 + pd.phase * 2, 70 + pd.phase * 8); }
      if (pd.phase >= 3) { pd.cbT = (pd.cbT ?? 2) - dt; if (pd.cbT <= 0) { pd.cbT = 2.6; codeBlueWall(e, w); } }
    } else bossUpdate(e, w, dt, patientBrain);
    if (Math.random() < dt * 5) w.fx.burst(e.x + (Math.random() - 0.5) * 40, e.y, 2, 1, pd.phase >= 2 ? '#14112a' : '#dce4e0', 20, 0.8);
    // time to forget again (not mid-phase-change)
    if (pd.phase >= 1 && e.state !== 'phase') { pd.shiftT = (pd.shiftT ?? 12) - dt; if (pd.shiftT <= 0) shiftForm(e, w); }
  },
  draw(e, ctx, w, sx, sy) {
    const pd = e.data;
    if (pd.form && !(pd.vanish > 0)) {
      // a borrowed body, flickering with ink and the odd glimpse of the bed underneath
      asForm(e, (fd) => {
        const glitch = Math.sin(e.t * 23) > 0.85;
        ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = 'hue-rotate(200deg) saturate(2)';
        const set = e.sprites[e.anim] ?? e.sprites.idle, spr = set?.[e.frame % (set?.length || 1)];
        spr?.draw(ctx, sx + (glitch ? 3 : 1.5), sy - e.z + 2, { flip: e.flip });
        ctx.restore();
        if (fd.draw) fd.draw(e, ctx, w, sx, sy); else drawBoss(e, ctx, sx, sy);
      });
      if (Math.sin(e.t * 9) > 0.93) { ctx.save(); ctx.globalAlpha = 0.25; drawBoss(e, ctx, sx, sy, { yoff: 6 }, w); ctx.restore(); }
      w.r.addGlow(sx, sy - 20, 46, '#80c0ff', 0.12);
      return;
    }
    drawBoss(e, ctx, sx, sy, { yoff: 6 }, w);
    w.r.addGlow(sx, sy - e.z - 46, 50, pd.phase >= 2 ? '#ff4050' : '#60ff90', 0.14);
  },
};
/** Code blue: walls of shots sweep across from both sides with one way through each. */
function codeBlueWall(e: Enemy, w: World): void {
  const room = w.room, top = room.oy + 12, bot = room.oy + room.rows * TILE - 12;
  for (const fromLeft of [true, false]) {
    const x = fromLeft ? room.ox + 14 : room.ox + room.cols * TILE - 14, gapY = w.player.y + (Math.random() - 0.5) * 70;
    for (let y = top; y < bot; y += 11) if (Math.abs(y - gapY) > 20) w.proj.enemy(x, y, fromLeft ? 0 : Math.PI, 62, { shape: 'water', r: 3.8, range: room.cols * TILE });
  }
  w.audio.play('chime', { x: e.x, pitch: 1.2, vol: 0.5 });
}

// ================================================================== Echoes
// Your last death, come back: a ghost of the reader you died as, on the chapter where it happened.
// It fights the way you did (strafing, dashing, firing your shots), harder the more you carried,
// and when it fades it leaves one of the things it had.
const echo: EnemyDef = {
  id: 'echo', name: 'Your Echo', desc: 'It died here last time. It remembers how.', boss: true,
  hp: 115, r: 7, speed: 0, role: 'boss', cost: 0, hitY: 12, mass: 4, gore: '#a8c8f0', goreDecal: '#2a3a5a', light: [50, '#a8d0ff'],
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
    // circle Marcus at a fighting distance; it only backs off when he's right on top of it, and
    // dashes now and then rather than constantly darting away
    const dd = dist(e.x, e.y, pl.x, pl.y), a = angleTo(e.x, e.y, pl.x, pl.y);
    d.side ??= 1; if (Math.random() < dt * 0.25) d.side *= -1;
    const want = dd > 105 ? 1 : dd < 42 ? -0.6 : 0;
    const mx = Math.cos(a) * want + Math.cos(a + Math.PI / 2 * d.side) * 0.45, my = Math.sin(a) * want + Math.sin(a + Math.PI / 2 * d.side) * 0.45;
    const sp = (d.dash > 0 ? 160 : 48 + power * 8);
    e.move(w, mx * sp * dt, my * sp * dt);
    d.dash = (d.dash ?? 0) - dt;
    d.dcd = (d.dcd ?? 4) - dt;
    if (d.dcd <= 0) { d.dcd = 4.5 + Math.random() * 2; d.dash = 0.18; d.side *= -1; w.fx.smoke(e.x, e.y, 4, 'rgba(160,190,230,', 4, 0.4); }
    d.dir = Math.abs(pl.x - e.x) > Math.abs(pl.y - e.y) ? 'side' : pl.y > e.y ? 'down' : 'up';
    e.flip = pl.x < e.x;
    // tears, in bursts, the way it used to shoot
    d.fcd = (d.fcd ?? 1) - dt;
    if (d.fcd <= 0) {
      d.fcd = Math.max(0.38, 0.7 - power * 0.08);
      const n = 1 + Math.floor(power), aim = aimAngle(e, w, 0.4, 150);
      for (let i = 0; i < n; i++) shoot(e, w, aim + (i - (n - 1) / 2) * 0.16, 150 + power * 12, { shape: 'water', r: 3.5, z: 10 });
      w.audio.play('shoot', { x: e.x, pitch: 0.7, vol: 0.4 });
    }
    // and now and then everything it had at once
    d.bcd = (d.bcd ?? 4) - dt;
    if (d.bcd <= 0) { d.bcd = 6 - power * 0.5; ringShot(e, w, 8 + Math.floor(power * 2), 95, Math.random(), { shape: 'water', r: 3.5, z: 10 }); w.audio.play('bossSpit', { x: e.x, pitch: 1.3 }); }
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
