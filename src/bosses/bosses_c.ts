// Chapter V–VII bosses and the final boss.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, crack, rivets, stitches, bigEye, maw, drips, rand01 } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer, buzz } from '../enemies/ai';
import { rig, drawRigged } from './rig';
import * as G from './art_c';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { TAU, angleTo, angleDiff, clamp, dist } from '../core/math';
import { enemyBeam, Beam } from '../projectiles/weapons';
import type { World } from '../game/world';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ rot: number; alpha: number; tint: string; tintAmt: number; yoff: number }> = {}, w?: World): void {
  // rigged bosses pick their own pose and draw their eyes live
  if (w && e.sprites.death) { drawRigged(e, ctx, w, sx, sy, { tint: extra.tint, tintAmt: extra.tintAmt, alpha: extra.alpha, yoff: extra.yoff ?? 2 }); return; }
  const set = e.sprites[e.anim] ?? e.sprites.idle; const spr = set[e.frame % set.length];
  spr.draw(ctx, sx, sy - e.z + (extra.yoff ?? 2), { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, rot: extra.rot, alpha: extra.alpha ?? (e.alpha < 1 ? e.alpha : undefined), tint: extra.tint, tintAmt: extra.tintAmt });
}
function gapRing(e: Enemy, w: World, n: number, gap: number, speed: number, at: number, o: Parameters<typeof shoot>[4] = {}): void {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (Math.abs(angleDiff(a, at)) < (gap / n) * Math.PI) continue; shoot(e, w, a, speed, o); }
}
const bone = () => ramp('#e0d6c0');

// ================================================================== Ossuary Knight
const knightBrain: BossBrain = {
  idleTime: [0.7, 1.2], phases: [0.5],
  idle(e, w, dt) { chase(e, w, e.data.phase ? 45 : 32, dt); e.setAnim('walk'); e.animate(dt, 5); },
  attacks: [
    { id: 'sweep', weight: 3,
      start(e) { e.setAnim('raise'); },
      run(e, w, t) {
        if (t < 0.6) return false;
        if (!e.data.sw) { e.data.sw = true; e.setAnim('walk'); const a = aimAngle(e, w); spreadShot(e, w, e.data.phase ? 13 : 9, a, 2.2, 150, { shape: 'bone', r: 3.5, range: 140 }); e.kvx = Math.cos(a) * 200; e.kvy = Math.sin(a) * 200; w.audio.play('swing', { x: e.x }); w.shake(2); }
        if (t > 1.1) { e.data.sw = false; return true; }
        return false;
      } },
    { id: 'bash', weight: 2, phases: [0],
      start(e, w) { e.data.ba = angleTo(e.x, e.y, w.player.x, w.player.y); w.audio.play('bossRoar', { x: e.x, vol: 0.5, pitch: 1.3 }); },
      run(e, w, t, dt) {
        if (t < 0.5) return false;
        e.animate(dt, 14);
        const h = e.move(w, Math.cos(e.data.ba) * 230 * dt, Math.sin(e.data.ba) * 230 * dt);
        if (h.hx || h.hy || t > 2.2) { w.shake(5); w.audio.play('slam', { x: e.x }); e.data.stun = 1.4; return true; }
        return false;
      } },
    { id: 'javelins', weight: 2,
      run(e, w, t) {
        const n = Math.floor((t - 0.3) / 0.3);
        if (t > 0.3 && n > (e.data.jn ?? -1) && n < 3) { e.data.jn = n; shoot(e, w, aimAngle(e, w, 1, 220), 220, { shape: 'bone', r: 4 }); w.audio.play('needle', { x: e.x }); }
        if (t > 1.3) { e.data.jn = -1; return true; }
        return false;
      } },
    { id: 'rain', weight: 2, phases: [1],
      run(e, w, t) {
        if (t > 0.3 && !e.data.r) { e.data.r = true; for (let i = 0; i < 12; i++) { const p = i < 3 ? { x: w.player.x + (Math.random() - 0.5) * 30, y: w.player.y + (Math.random() - 0.5) * 20 } : randomFloorPoint(w); telegraph(w, p.x, p.y, 9, 0.9); w.proj.enemy(p.x, p.y, 0, 0, { drop: 210, shape: 'bone', r: 5 }); } w.audio.play('bossRoar', { x: e.x, vol: 0.5 }); }
        if (t > 1.6) { e.data.r = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w) { w.hud.toast('The shield shatters!'); w.fx.shards(e.x - 12, e.y - 20, 20, '#5a5a66', 140); e.anim = 'walk'; },
};
const ossuaryknight: EnemyDef = {
  id: 'ossuaryknight', name: 'The Ossuary Knight', desc: 'Sworn to guard the dead. He still is.', boss: true,
  hp: 380, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 26, mass: 12, noKnock: true, gore: '#e0d6c0', goreDecal: '#5a4a3a',
  sprites: () => rig({ w: 62, h: 68, paint: G.paintKnight, phases: 1, aliases: { walk: 'move', walk2: 'move' },
    extra: { raise: [{ raise: 1, lean: -0.4, jaw: 0.5 }], raise2: [{ raise: 1, lean: -0.4, jaw: 0.8, phase: 1 }] },
  }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) {
    e.data.face = angleTo(e.x, e.y, w.player.x, w.player.y);
    if (e.data.stun > 0) { e.data.stun -= dt; e.sx = 1 + Math.sin(e.t * 30) * 0.03; return; }
    bossUpdate(e, w, dt, knightBrain);
    if (e.data.phase) { if (e.anim === 'walk') e.anim = 'walk2'; if (e.anim === 'raise') e.anim = 'raise2'; }
    e.flip = w.player.x < e.x;
  },
  onHurt(e, w, dmg, info) {
    if (e.data.phase || e.data.stun > 0) return dmg;
    const toward = Math.abs(angleDiff(info.ang + Math.PI, e.data.face ?? 0));
    if (info.source === 'shot' && toward < 0.9) return dmg * 0.15;
    return dmg;
  },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== Mother of Moths
const mothBrain: BossBrain = {
  idleTime: [0.6, 1.1], phases: [0.5],
  idle(e, w, dt) { buzz(e, w, e.data.phase ? 70 : 50, dt, 0.35); e.z = 14 + Math.sin(e.t * 3) * 4; e.animate(dt, 8); },
  attacks: [
    { id: 'gust', weight: 3,
      start(e) { e.setAnim('up'); },
      run(e, w, t) {
        if (t < 0.5) return false;
        if (!e.data.g) {
          e.data.g = true; e.setAnim('idle');
          const a = angleTo(e.x, e.y, w.player.x, w.player.y);
          w.player.vx += Math.cos(a) * 260; w.player.vy += Math.sin(a) * 260;
          for (let i = 0; i < 10; i++) shoot(e, w, a + (Math.random() - 0.5) * 1.3, 80 + Math.random() * 70, { shape: 'holy', r: 3 });
          w.fx.smoke(e.x, e.y - 16, 10, 'rgba(200,185,150,', 8, 1, 4); w.audio.play('swing', { x: e.x, pitch: 0.6 }); w.shake(2);
        }
        if (t > 1) { e.data.g = false; return true; }
        return false;
      } },
    { id: 'swarm', weight: 1.5, cooldown: 5,
      run(e, w, t) {
        if (t > 0.5 && !e.data.s) { e.data.s = true; const n = w.enemies.filter((x) => !x.dead && x.def.id === 'moth').length; for (let i = 0; i < Math.min(4, 6 - n); i++) { const k = w.spawnEnemy('moth', e.x + (Math.random() - 0.5) * 40, e.y, true); if (k) k.noDrop = true; } w.audio.play('hatch', { x: e.x }); }
        if (t > 0.9) { e.data.s = false; return true; }
        return false;
      } },
    { id: 'spiral', weight: 3,
      start(e) { e.data.sa = Math.random() * TAU; },
      run(e, w, t, dt) {
        const c = w.room.center();
        const a = angleTo(e.x, e.y, c.x, c.y - 10); if (dist(e.x, e.y, c.x, c.y) > 10) e.move(w, Math.cos(a) * 80 * dt, Math.sin(a) * 80 * dt);
        if (t < 0.5) return false;
        e.data.sa += dt * 2.2;
        e.data.st = (e.data.st ?? 0) - dt;
        if (e.data.st <= 0) { e.data.st = 0.11; const arms = e.data.phase ? 3 : 2; for (let i = 0; i < arms; i++) shoot(e, w, e.data.sa + (i / arms) * TAU, 90, { shape: 'holy', r: 3.5 }); }
        return t > 3;
      } },
    { id: 'dive', weight: 2,
      start(e, w) { e.data.da = angleTo(e.x, e.y, w.player.x, w.player.y); telegraph(w, w.player.x, w.player.y, 16, 0.5); },
      run(e, w, t, dt) {
        if (t < 0.5) { e.z += 30 * dt; return false; }
        const h = e.move(w, Math.cos(e.data.da) * 260 * dt, Math.sin(e.data.da) * 260 * dt);
        e.z = Math.max(4, e.z - 60 * dt);
        return h.hx || h.hy || t > 1.6;
      } },
  ],
};
const mothmother: EnemyDef = {
  id: 'mothmother', name: 'Mother of Moths', desc: 'Every lamp in the house was hers once.', boss: true,
  hp: 360, r: 18, speed: 0, role: 'boss', cost: 0, hitY: 20, mass: 8, flying: true, noKnock: true, gore: '#a8946e', goreDecal: '#5a4a3a', light: [70, '#f0d080'],
  sprites: () => rig({ w: 84, h: 66, paint: G.paintMothMother, phases: 1, extra: { up: [{ x: { up: 1 }, raise: 1, jaw: 0.8 }] } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; e.z = 14; },
  update(e, w, dt) { bossUpdate(e, w, dt, mothBrain); if (Math.random() < dt * 6) w.fx.burst(e.x + (Math.random() - 0.5) * 40, e.y - e.z - 10, 2, 1, '#c8b48a', 20, 0.8, 1, 40); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 6 }, w); },
};

// ================================================================== The Bellringer
const bellBrain: BossBrain = {
  idleTime: [0.8, 1.3], phases: [0.5],
  idle(e, w, dt) { chase(e, w, e.data.phase ? 40 : 28, dt); e.setAnim('walk'); e.animate(dt, 5); },
  attacks: [
    { id: 'ring', weight: 3,
      start(e) { e.setAnim('swing'); e.data.r = 0; },
      run(e, w, t) {
        const times = e.data.phase ? [0.5, 1.1, 1.7] : [0.5, 1.3];
        while (e.data.r < times.length && t > times[e.data.r]) {
          const at = e.data.r % 2 ? Math.random() * TAU : angleTo(e.x, e.y, w.player.x, w.player.y) + Math.PI;
          gapRing(e, w, 30, 5, 85, at, { shape: 'holy', r: 4 });
          w.audio.play('bell', { x: e.x }); w.shake(3); w.fx.ring(e.x, e.y - 20, 6, 90, '#f0d070', 0.5); e.data.r++;
        }
        if (t > times[times.length - 1] + 0.5) { e.setAnim('walk'); return true; }
        return false;
      } },
    { id: 'leap', weight: 2,
      start(e, w) { e.data.tx = w.player.x; e.data.ty = w.player.y; e.data.x0 = e.x; e.data.y0 = e.y; telegraph(w, e.data.tx, e.data.ty, 24, 0.9); e.mode = 'fly'; },
      run(e, w, t) {
        const k = clamp((t - 0.2) / 0.7, 0, 1);
        e.x = e.data.x0 + (e.data.tx - e.data.x0) * k; e.y = e.data.y0 + (e.data.ty - e.data.y0) * k; e.z = Math.sin(k * Math.PI) * 70;
        if (k >= 1 && !e.data.l) { e.data.l = true; e.z = 0; e.mode = 'walk'; ringShot(e, w, 14, 110, Math.random(), { shape: 'holy' }); w.audio.play('bell', { x: e.x, pitch: 0.8 }); w.shake(6); }
        if (t > 1.4) { e.data.l = false; return true; }
        return false;
      } },
    { id: 'swingshot', weight: 2,
      start(e) { e.setAnim('swing'); },
      run(e, w, t) {
        if (t > 0.45 && !e.data.s) { e.data.s = true; spreadShot(e, w, 7, aimAngle(e, w), 1.2, 140, { shape: 'holy', r: 4 }); w.audio.play('bell', { x: e.x, vol: 0.5, pitch: 1.2 }); }
        if (t > 0.9) { e.data.s = false; e.setAnim('walk'); return true; }
        return false;
      } },
  ],
};
const bellringer: EnemyDef = {
  id: 'bellringer', name: 'The Bellringer', desc: 'He rings for every soul that comes down the stairs.', boss: true,
  hp: 400, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 12, noKnock: true, gore: '#4a3a32', goreDecal: '#2a1e18',
  sprites: () => rig({ w: 56, h: 62, paint: G.paintBellringer, phases: 1, aliases: { walk: 'move' }, extra: { swing: [{ x: { swing: 1 }, raise: 1, jaw: 0.8, lean: -0.3 }] } }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, bellBrain); e.flip = w.player.x > e.x; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, {}, w); },
};

// ================================================================== The Choirmaster
const choirBrain: BossBrain = {
  idleTime: [0.7, 1.1], phases: [0.5],
  idle(e, w, dt) { keepDistance(e, w, 100, 150, 40, dt); e.setAnim('idle'); e.animate(dt, 3); e.z = 4 + Math.sin(e.t * 2) * 2; },
  attacks: [
    { id: 'summon', weight: 1.5, cooldown: 6,
      run(e, w, t) {
        if (t > 0.6 && !e.data.s) { e.data.s = true; const n = w.enemies.filter((x) => !x.dead && x.def.id === 'choirboy').length; for (let i = 0; i < Math.min(2, 3 - n); i++) { const p = randomFloorPoint(w, 60); const k = w.spawnEnemy('choirboy', p.x, p.y, false); if (k) k.noDrop = true; } w.audio.play('choir', { x: e.x }); }
        if (t > 1) { e.data.s = false; return true; }
        return false;
      } },
    { id: 'conduct', weight: 3,
      start(e) { e.setAnim('up'); e.data.c = 0; },
      run(e, w, t) {
        const beat = 0.32;
        const n = Math.floor((t - 0.4) / beat);
        if (t > 0.4 && n > (e.data.c ?? -1) && n < 6) {
          e.data.c = n;
          const a = aimAngle(e, w);
          for (let i = -1; i <= 1; i++) shoot(e, w, a + i * 0.5, 110, { wig: 16, shape: 'holy', r: 3.5 });
          if (e.data.phase) for (let i = -1; i <= 1; i += 2) shoot(e, w, a + i * 0.25, 90, { wig: 10, shape: 'dark', r: 3 });
          w.audio.play('flute', { x: e.x, vol: 0.5, pitch: 1 + (n % 3) * 0.15 });
        }
        if (t > 0.4 + beat * 6 + 0.3) { e.data.c = -1; e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'crescendo', weight: 2,
      start(e) { e.setAnim('up'); e.data.k = 0; },
      run(e, w, t) {
        const times = [0.5, 0.9, 1.3, 1.7];
        while (e.data.k < times.length && t > times[e.data.k]) { ringShot(e, w, e.data.phase ? 16 : 12, 80 + e.data.k * 15, e.data.k * 0.2, { shape: 'holy', r: 3.5 }); w.audio.play('bell', { x: e.x, vol: 0.4, pitch: 1 + e.data.k * 0.1 }); e.data.k++; }
        if (t > 2.2) { e.setAnim('idle'); return true; }
        return false;
      } },
    { id: 'blink', weight: 1.5,
      run(e, w, t) {
        e.alpha = t < 0.3 ? 1 - t / 0.3 : Math.min(1, (t - 0.5) / 0.3); e.invuln = t > 0.2 && t < 0.6;
        if (t > 0.4 && !e.data.b) { e.data.b = true; const p = randomFloorPoint(w, 110); e.x = p.x; e.y = p.y; }
        if (t > 0.8) { e.data.b = false; e.alpha = 1; return true; }
        return false;
      } },
  ],
};
const choirmaster: EnemyDef = {
  id: 'choirmaster', name: 'The Choirmaster', desc: 'Every voice in the chapel answers to his baton.', boss: true,
  hp: 380, r: 12, speed: 0, role: 'boss', cost: 0, hitY: 24, mass: 8, noKnock: true, flying: true, gore: '#2a1a3a', goreDecal: '#1a0e20', light: [50, '#f0e0a0'],
  sprites: () => rig({ w: 52, h: 66, paint: G.paintChoirmaster, phases: 1, extra: { up: [{ x: { up: 1 }, raise: 1, jaw: 1 }] } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, choirBrain); e.flip = w.player.x < e.x; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 4 }, w); },
};

// ================================================================== The Blotted Man
const blotBrain = (half: boolean): BossBrain => ({
  idleTime: half ? [0.5, 0.9] : [0.7, 1.1], phases: half ? [] : [0.5],
  idle(e, w, dt) { chase(e, w, half ? 45 : 32, dt); e.animate(dt, 4); e.data.cr = (e.data.cr ?? 0) - dt; if (e.data.cr <= 0) { e.data.cr = 0.4; w.addCreep(e.x, e.y, 12, 'enemy', 1, 4, '#14122a'); } },
  attacks: [
    { id: 'sink', weight: 2,
      run(e, w, t, dt) {
        if (t < 0.4) { e.sy = 1 - t * 2; return false; }
        if (t < 1.6) { e.hidden = true; e.invuln = true; e.sy = 1; const a = angleTo(e.x, e.y, w.player.x, w.player.y); e.move(w, Math.cos(a) * 120 * dt, Math.sin(a) * 120 * dt); if (Math.random() < 0.6) w.addCreep(e.x, e.y, 10, 'enemy', 1, 1.5, '#14122a'); return false; }
        if (!e.data.tl) { e.data.tl = true; telegraph(w, e.x, e.y, 18, 0.5, '#8a7cff'); }
        if (t > 2.1 && e.hidden) { e.hidden = false; e.invuln = false; ringShot(e, w, half ? 8 : 14, 110, Math.random(), { shape: 'dark' }); w.audio.play('erupt', { x: e.x }); e.sy = 1.3; }
        if (t > 2.5) { e.data.tl = false; return true; }
        return false;
      } },
    { id: 'tendrils', weight: 3,
      start(e, w) { e.data.ta = angleTo(e.x, e.y, w.player.x, w.player.y); e.data.tk = 0; },
      run(e, w, t) {
        const steps = 7;
        while (e.data.tk < steps && t > 0.3 + e.data.tk * 0.12) {
          const d = 24 + e.data.tk * 22; const x = e.x + Math.cos(e.data.ta) * d, y = e.y + Math.sin(e.data.ta) * d;
          telegraph(w, x, y, 10, 0.5, '#8a7cff');
          const k = e.data.tk;
          w.after(0.5, () => { if (e.dead) return; w.fx.burst(x, y, 4, 8, '#1e1a36', 70, 0.5); w.proj.enemy(x, y, 0, 0, { r: 9, range: 1, shape: 'inkE', z: 2, life: 0.12 }); if (k % 2 === 0) for (const s of [-1, 1]) w.proj.enemy(x, y, e.data.ta + s * Math.PI / 2, 70, { shape: 'dark', r: 3 }); });
          e.data.tk++;
        }
        return t > 1.6;
      } },
    { id: 'flood', weight: 1.5, cooldown: 5,
      run(e, w, t) {
        if (t > 0.5 && !e.data.f) { e.data.f = true; for (let i = 0; i < 5; i++) { const p = randomFloorPoint(w, 40); w.addCreep(p.x, p.y, 16, 'enemy', 1, 6, '#14122a'); } if (!half) { const k = w.spawnEnemy('blot', e.x, e.y + 10, true); if (k) k.noDrop = true; } w.audio.play('inkBurst', { x: e.x, vol: 0.5 }); }
        if (t > 1) { e.data.f = false; return true; }
        return false;
      } },
  ],
  onPhase(e, w) {
    if (half) return;
    for (const s of [-1, 1]) { const k = w.spawnEnemy('blottedhalf', e.x + s * 20, e.y, true); if (k) { k.isBoss = true; k.spawnT = 0.3; w.bossList.push(k); k.kvx = s * 160; } }
    w.hud.toast('He tears himself in half!');
    e.isBoss = false; w.killEnemy(e, true); w.bossList = w.bossList.filter((b) => b !== e);
  },
});
const blotBrainF = blotBrain(false), blotBrainH = blotBrain(true);
const blottedman: EnemyDef = {
  id: 'blottedman', name: 'The Blotted Man', desc: 'The first mistake in the book. He was never erased.', boss: true,
  hp: 420, r: 13, speed: 0, role: 'boss', cost: 0, hitY: 26, mass: 10, noKnock: true, gore: '#1e1a36', goreDecal: '#0e0c1c',
  sprites: () => rig({ w: 48, h: 66, paint: (p, s) => G.paintBlotted(p, s, 1), phases: 1 }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, blotBrainF); },
  draw(e, ctx, w, sx, sy) { if (e.hidden) { ctx.fillStyle = '#14122a'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 6, 0, 0, TAU); ctx.fill(); return; } drawBoss(e, ctx, sx, sy, {}, w); },
};
const blottedhalf: EnemyDef = {
  id: 'blottedhalf', name: 'Blotted Half', desc: '', boss: true,
  hp: 150, r: 10, speed: 0, role: 'boss', cost: 0, hitY: 18, mass: 6, noKnock: true, gore: '#1e1a36', goreDecal: '#0e0c1c',
  sprites: () => rig({ w: 36, h: 48, paint: (p, s) => G.paintBlotted(p, s, 0.7), phases: 1 }),
  init(e) { e.anim = 'idle'; e.data.idleT = 0.8; },
  update(e, w, dt) { bossUpdate(e, w, dt, blotBrainH); },
  draw: blottedman.draw,
};

// ================================================================== The Unbound (final)
const unboundBrain: BossBrain = {
  idleTime: [0.6, 1], phases: [0.66, 0.33],
  idle(e, w, dt) {
    e.data.wa = (e.data.wa ?? 0) + dt * 0.5;
    const c = w.room.center();
    const tx = c.x + Math.cos(e.data.wa) * 90, ty = c.y - 30 + Math.sin(e.data.wa * 1.3) * 25;
    const a = angleTo(e.x, e.y, tx, ty); e.move(w, Math.cos(a) * 50 * dt, Math.sin(a) * 50 * dt);
    e.z = 18 + Math.sin(e.t * 2) * 4; e.animate(dt, 6);
  },
  attacks: [
    { id: 'pages', weight: 3, phases: [0, 1, 2],
      run(e, w, t) {
        const n = Math.floor((t - 0.4) / 0.25);
        if (t > 0.4 && n > (e.data.pn ?? -1) && n < (e.data.phase >= 2 ? 6 : 4)) { e.data.pn = n; const a = aimAngle(e, w); for (const s of [-1, 1]) shoot(e, w, a - s * 0.8, 120, { curve: s * 1.4, shape: 'holy', r: 3.5, range: 380 }); w.audio.play('pageGet', { x: e.x, vol: 0.5 }); }
        if (t > 1.8) { e.data.pn = -1; return true; }
        return false;
      } },
    { id: 'letters', weight: 2, phases: [0, 2],
      run(e, w, t) {
        if (t > 0.3 && !e.data.l) {
          e.data.l = true;
          const room = w.room; const gap = Math.floor(Math.random() * (room.cols - 3)) + 1;
          for (let c = 0; c < room.cols; c++) { if (Math.abs(c - gap) <= 1) continue; const x = room.ox + c * 24 + 12; w.proj.enemy(x, room.oy + 4, Math.PI / 2, 95, { shape: 'inkE', r: 4, range: 400, z: 10, delay: 0.5 + (c % 2) * 0.15 }); }
          w.audio.play('pageUse', { x: e.x });
        }
        if (t > 1.5) { e.data.l = false; return true; }
        return false;
      } },
    { id: 'summon', weight: 1.2, cooldown: 6, phases: [0, 1],
      run(e, w, t) {
        if (t > 0.5 && !e.data.s) { e.data.s = true; const n = w.enemies.filter((x) => !x.dead && !x.isBoss).length; for (let i = 0; i < Math.max(0, 3 - n); i++) { const p = randomFloorPoint(w, 70); const k = w.spawnEnemy(['blot', 'pagewraith', 'voideye'][i % 3], p.x, p.y, false); if (k) k.noDrop = true; } w.audio.play('secret', { x: e.x, vol: 0.5 }); }
        if (t > 1) { e.data.s = false; return true; }
        return false;
      } },
    { id: 'beams', weight: 3, phases: [1, 2],
      // the beams always open with Marcus in the middle of a gap, warn for a full second, and sweep
      // slowly enough to walk round the book ahead of them
      start(e, w) {
        const n = e.data.phase >= 2 ? 3 : 2;
        const a0 = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.PI / n;
        const dir = Math.random() < 0.5 ? 1 : -1;
        e.data.beams = [];
        for (let i = 0; i < n; i++) e.data.beams.push(enemyBeam(w, e.x, e.y - e.z - 6, a0 + (i / n) * TAU, 2.4, 1.0, 8, dir * 0.4));
        w.audio.play('beam', { x: e.x });
      },
      run(e, w, t) { for (const b of e.data.beams as Beam[]) { b.x = e.x; b.y = e.y - e.z - 6; } if (t > 3.4) { e.data.beams = []; return true; } return false; } },
    { id: 'ringburst', weight: 2, phases: [1, 2],
      run(e, w, t) {
        const times = [0.4, 0.8, 1.2];
        e.data.rk = e.data.rk ?? 0;
        while (e.data.rk < times.length && t > times[e.data.rk]) { ringShot(e, w, 18, 90 + e.data.rk * 10, e.data.rk * 0.17, { shape: 'dark', r: 3.5 }); e.data.rk++; w.audio.play('bell', { x: e.x, vol: 0.4, pitch: 0.7 }); }
        if (t > 1.6) { e.data.rk = 0; return true; }
        return false;
      } },
    { id: 'storm', weight: 3, phases: [2],
      start(e) { e.data.sa = 0; },
      run(e, w, t, dt) {
        e.data.sa += dt * 2.6;
        e.data.st = (e.data.st ?? 0) - dt;
        if (e.data.st <= 0) { e.data.st = 0.08; for (let i = 0; i < 4; i++) shoot(e, w, e.data.sa + (i / 4) * TAU, 105, { shape: 'holy', r: 3.5 }); }
        if (Math.floor(t / 0.7) !== Math.floor((t - dt) / 0.7)) spreadShot(e, w, 3, aimAngle(e, w), 0.3, 170, { shape: 'dark' });
        return t > 3.2;
      } },
  ],
  onPhase(e, w, ph) {
    e.anim = 'open';
    w.hud.toast(ph === 1 ? 'The book falls open.' : 'The binding snaps. The last page is all that remains.');
    w.whiteFlash = 0.5;
    if (ph === 2) w.audio.setMusic('finalBinding');
  },
};
const unbound: EnemyDef = {
  id: 'unbound', name: 'The Unbound', desc: 'Every fear Grandfather stitched shut, all at once.', boss: true,
  hp: 900, r: 20, speed: 0, role: 'boss', cost: 0, hitY: 30, mass: 30, noKnock: true, flying: true, gore: '#e6dcc0', goreDecal: '#2b2f66', light: [100, '#ff6070'],
  sprites: () => rig({ w: 96, h: 84, paint: (p, s) => G.paintBook(p, s, false), phases: 1, fps: { open: 7 }, extra: { open: [0, 1, 2, 3].map((f) => ({ x: { open: 1 }, jaw: 0.85 + (f % 2) * 0.15, breath: Math.sin(f * 1.6) })) } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.4; e.z = 18; },
  update(e, w, dt) {
    bossUpdate(e, w, dt, unboundBrain);
    if (Math.random() < dt * 5) w.fx.burst(e.x + (Math.random() - 0.5) * 60, e.y - e.z - 20, 4, 1, '#e6dcc0', 30, 1, 2, 30);
  },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 8 }, w); w.r.addGlow(sx, sy - e.z - 30, 60, e.data.phase ? '#ff3050' : '#f0d0a0', 0.15); },
};

// ================================================================== It Remembers (end game)
// Once the story has been finished, the Binding's boss is always this: the Unbound, awake, with
// every attack open from the start, less rest between them and more health. (Mom's Heart -> It Lives.)
const remembersBrain: BossBrain = {
  ...unboundBrain,
  idleTime: [0.4, 0.75],
  attacks: unboundBrain.attacks.map((a) => ({ ...a, phases: undefined })),
  onPhase(e, w, ph) {
    e.anim = 'open';
    w.hud.toast(ph === 1 ? 'It remembers how you did it last time.' : 'It will not let the book close again.');
    w.whiteFlash = 0.5;
    if (ph === 2) w.audio.setMusic('finalBinding');
  },
};
const itremembers: EnemyDef = {
  ...unbound,
  id: 'itremembers', name: 'It Remembers', desc: 'You closed the book once. It has been waiting on the last page ever since.',
  hp: 1250, light: [110, '#ff3050'],
  // the cover has grown skin and the eye has gone green: it is not the book you closed
  sprites: () => rig({ w: 96, h: 84, paint: (p, s) => G.paintBook(p, s, true), phases: 1, fps: { open: 7 }, extra: { open: [0, 1, 2, 3].map((f) => ({ x: { open: 1 }, jaw: 0.85 + (f % 2) * 0.15, breath: Math.sin(f * 1.6) })) } }),
  init(e) { e.anim = 'open'; e.data.idleT = 1.2; e.z = 18; },
  update(e, w, dt) {
    bossUpdate(e, w, dt, remembersBrain);
    if (Math.random() < dt * 7) w.fx.burst(e.x + (Math.random() - 0.5) * 60, e.y - e.z - 20, 4, 1, Math.random() < 0.5 ? '#e6dcc0' : '#c83a4a', 30, 1, 2, 30);
  },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 8, tint: '#ff2040', tintAmt: 0.22 + 0.08 * Math.sin(e.t * 4) }, w); w.r.addGlow(sx, sy - e.z - 30, 70, '#ff3050', 0.22); },
};

export const BOSSES_C: EnemyDef[] = [ossuaryknight, mothmother, bellringer, choirmaster, blottedman, blottedhalf, unbound, itremembers];
void teeth; void legs; void sprinkle; void distToPlayer; void (null as unknown as World);
