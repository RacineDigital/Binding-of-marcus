// Chapter II–IV bosses.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer } from '../enemies/ai';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { TAU, angleTo, angleDiff, clamp, dist } from '../core/math';
import type { World } from '../game/world';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ rot: number; alpha: number; tint: string; tintAmt: number; yoff: number }> = {}): void {
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
function paintFurnace(p: any, f: number, hot: number, open: number): void {
  const ir = ramp(hot ? '#6a3a34' : '#4a4246'), br = ramp('#b8863a');
  // legs
  for (const x of [12, 44]) { p.rect(x - 3, 50, 6, 6, ir[1]); p.rect(x - 4, 55, 8, 2, ir[0]); }
  // body
  p.rect(6, 14, 44, 38, ir[2]); p.shadeV(6, 14, 44, 38, ir, 0.5);
  p.rect(4, 12, 48, 4, ir[3]); p.rect(4, 12, 48, 1, ir[4]);
  for (const x of [8, 48]) for (let y = 18; y < 50; y += 6) p.set(x, y, br[3]);
  // chimney
  p.rect(36, 0, 8, 13, ir[1]); p.rect(35, 0, 10, 2, ir[3]);
  // grated mouth with fire
  const glow = ramp(hot ? '#ff3a1a' : '#f07a2a');
  p.rect(14, 26, 28, 18, hex('#1a0806'));
  p.ball(28, 38 - open * 2, 12, 6 + open * 3, glow, { dither: 0.6 });
  for (let x = 16; x < 42; x += 4) p.rect(x, 26, 1, 18, ir[3]);
  p.rect(14, 26, 28, 2, ir[3]);
  // eyes: two pressure gauges
  for (const x of [18, 38]) { p.ball(x, 20, 4, 4, br); p.ball(x, 20, 2.6, 2.6, ramp('#e8e0c8')); p.line(x, 20, x + Math.cos(f + x) * 2, 20 + Math.sin(f + x) * 2, hex('#c83a3a')); }
  sprinkle(p, '#2a2224', 30, 5 + f);
}
const furnaceBrain: BossBrain = {
  idleTime: [0.8, 1.3], phases: [0.45],
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
          e.data.jt = 0.075;
          const arms = e.data.phase ? 6 : 4;
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
        if (t > 1.6) { e.data.v = e.data.v2 = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w) { w.hud.toast('The furnace overheats!'); },
};
const furnaceheart: EnemyDef = {
  id: 'furnaceheart', name: 'Furnace Heart', desc: 'It has been burning since before the house was built.', boss: true,
  hp: 300, r: 20, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 20, noKnock: true, gore: '#2a2224', goreDecal: '#1a1416', light: [110, '#ff6a2a'], contact: 1,
  sprites: () => ({ idle: frames(56, 58, 2, (p, f) => paintFurnace(p, f, 0, 0)), open: frames(56, 58, 2, (p, f) => paintFurnace(p, f, 0, 1)), hot: frames(56, 58, 2, (p, f) => paintFurnace(p, f, 1, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, furnaceBrain); if (e.data.phase && e.anim === 'idle') e.anim = 'hot'; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, e.data.phase ? { tint: '#ff2010', tintAmt: 0.15 + Math.sin(w.time * 8) * 0.08 } : {}); },
};

// ================================================================== Old Stoker
function paintStoker(p: any, f: number, raise: number): void {
  const body = ramp('#3e3230'), skin = ramp('#8a6a5a'), sh = ramp('#9a9aa8');
  const st = [0, 2, 0, -2][f % 4];
  p.rect(13 + st, 44, 7, 8, body[0]); p.rect(26 - st, 44, 7, 8, body[0]);
  p.ball(23, 32, 17, 15, body, { dither: 0.6 });
  p.rect(10, 24, 26, 3, hex('#5a3a2a'));
  p.ball(23, 14, 9, 8, skin, { dither: 0.5 });
  p.rect(14, 8, 18, 4, hex('#1e1618'));
  glowEye(p, 19, 14, '#ffb040'); glowEye(p, 26, 14, '#ffb040');
  p.rect(18, 19, 9, 2, hex('#1a0a0a'));
  p.tube(8, 28, 4, 40, 3.2, skin); p.tube(38, 28, 40, 38, 3.2, skin);
  const sy = 30 - raise * 24;
  p.line(40, 40, 46, sy, hex('#6a4a2a')); p.line(41, 40, 47, sy, hex('#5a3a1a'));
  p.poly([42, sy, 52, sy - 3, 52, sy - 13, 42, sy - 9], sh[2]); p.line(42, sy, 52, sy - 3, sh[4]);
  sprinkle(p, '#1a1214', 40, 3 + f);
}
const stokerBrain: BossBrain = {
  idleTime: [0.7, 1.2], phases: [0.5],
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
          w.shake(6); w.audio.play('slam', { x: e.x });
          for (let i = 0; i < (e.data.phase ? 9 : 6); i++) { const p = randomFloorPoint(w); telegraph(w, p.x, p.y, 10, 0.9, '#ff6a2a'); w.proj.enemy(p.x, p.y, 0, 0, { drop: 200 + Math.random() * 40, shape: 'ember', r: 5, creep: '#a03a1a' }); }
          return true;
        }
        return false;
      } },
    { id: 'shovel', weight: 3,
      start(e) { e.setAnim('raise'); },
      run(e, w, t) {
        if (t > 0.5 && !e.data.s) { e.data.s = true; e.setAnim('walk'); const a = aimAngle(e, w); for (let i = 0; i < (e.data.phase ? 16 : 12); i++) shoot(e, w, a + (Math.random() - 0.5) * 1.1, 100 + Math.random() * 90, { shape: 'ember', r: 3 + Math.random() * 2 }); w.audio.play('swing', { x: e.x }); }
        if (t > 1.1) { e.data.s = false; return true; }
        return false;
      } },
    { id: 'stomp', weight: 2,
      start(e, w) { e.data.tx = w.player.x; e.data.ty = w.player.y; e.data.sx0 = e.x; e.data.sy0 = e.y; telegraph(w, e.data.tx, e.data.ty, 22, 0.9); e.mode = 'fly'; },
      run(e, w, t) {
        const k = clamp((t - 0.2) / 0.7, 0, 1);
        e.x = e.data.sx0 + (e.data.tx - e.data.sx0) * k; e.y = e.data.sy0 + (e.data.ty - e.data.sy0) * k; e.z = Math.sin(k * Math.PI) * 60;
        if (k >= 1 && !e.data.land) { e.data.land = true; e.z = 0; e.mode = 'walk'; ringShot(e, w, e.data.phase ? 16 : 12, 120, Math.random(), { shape: 'ember' }); w.shake(7); w.audio.play('slam', { x: e.x }); e.sx = 1.3; e.sy = 0.75; }
        if (t > 1.4) { e.data.land = false; return true; }
        return false;
      } },
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
  hp: 310, r: 16, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 12, noKnock: true, gore: '#3e3230', goreDecal: '#1a1416', light: [60, '#ff8a3a'],
  sprites: () => ({ walk: frames(56, 54, 4, (p, f) => paintStoker(p, f, 0)), raise: frames(56, 54, 1, (p) => paintStoker(p, 0, 1)) }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, stokerBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Rat King
function paintRatKing(p: any, f: number, size: number): void {
  const fur = ramp('#6e5e5c'), pink = ramp('#d0a0a0');
  const cx = 28 * size, cy = 26 * size;
  // knotted tails in the middle
  for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.3; p.line(cx + Math.cos(a) * 4 * size, cy + Math.sin(a) * 3 * size, cx + Math.cos(a + 2.4) * 6 * size, cy + Math.sin(a + 2.4) * 4 * size, pink[2]); }
  p.ring(cx, cy, 3.5 * size, pink[1]); p.ring(cx + 1, cy - 1, 2 * size, pink[3]);
  // rats radiating outward
  const n = size > 0.8 ? 8 : 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.sin(f * 1.5 + i) * 0.12;
    const r0 = 7 * size, r1 = 17 * size;
    const x0 = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0 * 0.75;
    const x1 = cx + Math.cos(a) * r1, y1 = cy + Math.sin(a) * r1 * 0.75;
    p.tube(x0, y0, x1, y1, 3.6 * size, fur, { dither: 0.6 });
    const hx = cx + Math.cos(a) * (r1 + 3 * size), hy = cy + Math.sin(a) * (r1 + 3 * size) * 0.75;
    p.ball(hx, hy, 2.8 * size, 2.4 * size, fur);
    p.ball(hx - Math.sin(a) * 2.5 * size, hy + Math.cos(a) * 2 * size - 1, 1.4 * size, 1.4 * size, pink);
    p.set(hx + Math.cos(a) * 2.6 * size, hy + Math.sin(a) * 2 * size, '#e07a8a');
    p.set(hx + Math.cos(a - 0.6) * 1.2 * size, hy + Math.sin(a - 0.6) * 1.2 * size - 1, '#ff3a3a');
    p.set(x1 - Math.cos(a) * 3, y1 + 2 * size, fur[0]);
  }
  if (size > 0.8) {
    p.poly([cx - 9, cy - 9, cx - 9, cy - 19, cx - 5, cy - 14, cx, cy - 21, cx + 5, cy - 14, cx + 9, cy - 19, cx + 9, cy - 9], hex('#e0b040'));
    p.line(cx - 9, cy - 9, cx + 9, cy - 9, hex('#a07020')); p.set(cx, cy - 14, '#c83a3a'); p.set(cx - 6, cy - 12, '#4ab0e0'); p.set(cx + 6, cy - 12, '#4ab0e0');
  }
}
const ratBrain = (prince: boolean): BossBrain => ({
  idleTime: prince ? [0.6, 1] : [0.8, 1.3], phases: prince ? [] : [0.5],
  idle(e, w, dt) { chase(e, w, prince ? 55 : 40, dt); e.animate(dt, 8); },
  attacks: [
    { id: 'scatter', weight: 2, cooldown: 3,
      run(e, w, t) {
        if (t > 0.4 && !e.data.s) { e.data.s = true; const n = w.enemies.filter((x) => !x.dead && x.def.id === 'rat').length; for (let i = 0; i < (n < 6 ? 3 : 0); i++) { const k = w.spawnEnemy('rat', e.x, e.y, true); if (k) k.noDrop = true; } w.audio.play('chitter', { x: e.x }); }
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
  sprites: () => ({ idle: frames(58, 52, 4, (p, f) => paintRatKing(p, f, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, ratBrainK); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};
const ratprince: EnemyDef = {
  id: 'ratprince', name: 'Rat Prince', desc: '', boss: true,
  hp: 110, r: 11, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, noKnock: true, gore: '#6a3a3a', goreDecal: '#3a1a1a',
  sprites: () => ({ idle: frames(40, 36, 4, (p, f) => paintRatKing(p, f, 0.7)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 0.8; },
  update(e, w, dt) { bossUpdate(e, w, dt, ratBrainP); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
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
const paintBilgeSeg = (p: any) => { const c = ramp('#4a6a5a'); for (let i = 0; i < 3; i++) p.line(5 + i * 5, 6, 7 + i * 5, 1, c[3]); p.tube(3, 11, 20, 11, 6.5, c, { dither: 0.6 }); p.ball(12, 15, 7, 2, ramp('#a8b890')); };
const bilgemaw: EnemyDef = {
  id: 'bilgemaw', name: 'Bilgemaw', desc: 'Everything drains down. It waits at the bottom with its mouth open.', boss: true,
  hp: 290, r: 13, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 10, noKnock: true, gore: '#3a5a4a', goreDecal: '#1a2a22', ghost: true, noSeparate: true,
  sprites: () => ({
    idle: frames(44, 34, 2, (p, f) => {
      const c = ramp('#4a6a5a'), belly = ramp('#a8b890');
      // dorsal fin
      for (let i = 0; i < 6; i++) p.line(8 + i * 4, 9 - (i % 2), 10 + i * 4, 3 + (i % 2) * 2, c[3]);
      p.poly([6, 10, 30, 6, 36, 12, 30, 22, 8, 22], c[3]);
      p.tube(6, 16, 30, 15, 8, c, { dither: 0.6 });
      p.ball(18, 21, 12, 3, belly, { dither: 0.6 });
      // jaws
      const open = f ? 6 : 3;
      p.poly([28, 12, 42, 13 - open * 0.3, 40, 16, 29, 17], c[2]);
      p.poly([28, 18, 40, 19 + open * 0.8, 38, 22 + open * 0.5, 27, 22], c[1]);
      p.poly([29, 16, 40, 16, 39, 19 + open * 0.6, 29, 19], hex('#1a0608'));
      for (let x = 30; x < 40; x += 2) { p.set(x, 16, '#f0e8d8'); p.set(x + 1, 18 + open * 0.5, '#f0e8d8'); }
      glowEye(p, 26, 11, '#e0f040');
      p.line(10, 20, 5, 27, c[1]); p.line(12, 21, 9, 28, c[1]);
      sprinkle(p, '#8ab08a', 12, 2);
    }),
  }),
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
    drawBoss(e, ctx, sx, sy, { yoff: 4 });
  },
};
/**
 * One body segment of the Bilgemaw. It is a real enemy, so shots, beams, explosions and chain lightning
 * all find it; damage it takes is passed on to the head, which holds the shared health bar.
 */
const bilgeseg: EnemyDef = {
  id: 'bilgeseg', name: 'Bilgemaw', desc: '', hp: 1e7, r: 8, speed: 0, role: 'boss', cost: 0, hitY: 8, mass: 10, noKnock: true,
  gore: '#3a5a4a', goreDecal: '#1a2a22', ghost: true, noSeparate: true, contact: 1,
  sprites: () => ({ idle: frames(24, 20, 1, paintBilgeSeg) }),
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
function paintMatron(p: any, f: number, pose: number): void {
  const d = ramp('#e8e8f0'), s = ramp('#e8d0c8'), dk = ramp('#4a3a4a');
  p.poly([8, 58, 12, 22, 26, 22, 30, 58], d[2]); p.shadeV(8, 22, 22, 36, d, 0.5);
  p.rect(16, 30, 6, 2, hex('#c83a3a')); p.rect(18, 28, 2, 6, hex('#c83a3a'));
  p.rect(10, 54, 18, 4, dk[2]);
  p.tube(12, 24, 9, 42, 2, d); p.tube(26, 24, 30 + pose * 4, 38 - pose * 12, 2, d);
  p.ball(19, 14, 7, 8, s, { dither: 0.5 });
  p.rect(12, 5, 14, 4, d[3]); p.set(19, 6, '#c83a3a');
  p.ellipse(16, 14, 2, 1, hex('#1a1010')); p.ellipse(22, 14, 2, 1, hex('#1a1010'));
  p.line(15, 19, 23, 19, hex('#8a3a3a')); p.set(14, 18, '#8a3a3a'); p.set(24, 18, '#8a3a3a');
  // syringe
  const sx = 30 + pose * 4, sy = 38 - pose * 12;
  p.line(sx, sy, sx + 8, sy - 12, hex('#d8e8f0')); p.line(sx + 1, sy, sx + 9, sy - 12, hex('#a8c8d8'));
  p.line(sx + 8, sy - 12, sx + 11, sy - 17, hex('#e8e8f0'));
  p.ball(sx + 4, sy - 6, 1.5, 1.5, ramp('#8ac04a'));
  void f;
}
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
        if (t > 0.45 && n > (e.data.n ?? -1) && n < (e.data.phase ? 3 : 2)) { e.data.n = n; spreadShot(e, w, 5, aimAngle(e, w), 0.8, 190, { shape: 'holy', r: 3 }); w.audio.play('needle', { x: e.x }); }
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
  id: 'matron', name: 'The Matron', desc: 'Visiting hours are over.', boss: true,
  hp: 330, r: 11, speed: 0, role: 'boss', cost: 0, hitY: 26, mass: 6, noKnock: true, gore: '#e8d0c8', goreDecal: '#6a2a2a',
  sprites: () => ({ idle: frames(44, 60, 1, (p) => paintMatron(p, 0, 0)), raise: frames(44, 60, 1, (p) => paintMatron(p, 0, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, matronBrain); e.flip = w.player.x < e.x; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Sleepwalker
function paintSleeper(p: any, f: number, awake: boolean): void {
  if (!awake) {
    const c = ramp('#e0e0e8');
    p.ball(20, 16, 12, 12, c, { dither: 0.5 });
    p.rect(8, 16, 24, 26, c[2]); p.shadeV(8, 4, 24, 38, c, 0.5);
    for (let i = 0; i < 6; i++) p.rect(8 + i * 4, 42, 4, 3 + ((i + f) % 3) * 2, c[i % 2 ? 2 : 1]);
    p.line(14, 10, 14, 40, c[1]); p.line(26, 12, 25, 40, c[1]);
    p.ellipse(16, 16, 2, 1, hex('#9a9aa8')); p.ellipse(24, 16, 2, 1, hex('#9a9aa8'));
  } else {
    const s = ramp('#c8c8c0'), g = ramp('#8a9a8a');
    p.poly([12, 46, 15, 18, 25, 18, 28, 46], g[2]); p.shadeV(12, 18, 16, 28, g, 0.5);
    p.tube(14, 20, 6, 34 + f * 2, 1.8, s); p.tube(26, 20, 34, 34 - f * 2, 1.8, s);
    p.ball(20, 11, 7, 8, s, { dither: 0.5 });
    p.ball(17, 10, 2.2, 2.6, ramp('#0a0a10')); p.ball(23, 10, 2.2, 2.6, ramp('#0a0a10'));
    p.set(17, 10, '#e0f0ff'); p.set(23, 10, '#e0f0ff');
    p.ellipse(20, 16, 3, 2 + f, hex('#1a0a10'));
    p.line(13, 5, 10, 1, s[1]); p.line(27, 5, 30, 2, s[1]);
  }
}
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
  sprites: () => ({ idle: frames(40, 50, 2, (p, f) => paintSleeper(p, f, false)), awake: frames(40, 50, 2, (p, f) => paintSleeper(p, f, true)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, sleepBrain); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { alpha: e.data.phase ? 1 : 0.9 }); w.r.addGlow(sx, sy - 24, 30, '#c0c8ff', 0.12); },
};

export const BOSSES_B: EnemyDef[] = [furnaceheart, oldstoker, ratking, ratprince, bilgemaw, bilgeseg, matron, sleepwalker];
void eye; void teeth; void legs; void (null as unknown as Enemy);
