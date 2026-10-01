// Chapter V–VII bosses and the final boss.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, crack, rivets, stitches, bigEye, maw, drips, rand01 } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer, buzz } from '../enemies/ai';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { TAU, angleTo, angleDiff, clamp, dist } from '../core/math';
import { enemyBeam, Beam } from '../projectiles/weapons';
import type { World } from '../game/world';

function drawBoss(e: Enemy, ctx: CanvasRenderingContext2D, sx: number, sy: number, extra: Partial<{ rot: number; alpha: number; tint: string; tintAmt: number; yoff: number }> = {}): void {
  const set = e.sprites[e.anim] ?? e.sprites.idle; const spr = set[e.frame % set.length];
  spr.draw(ctx, sx, sy - e.z + (extra.yoff ?? 2), { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, rot: extra.rot, alpha: extra.alpha ?? (e.alpha < 1 ? e.alpha : undefined), tint: extra.tint, tintAmt: extra.tintAmt });
}
function gapRing(e: Enemy, w: World, n: number, gap: number, speed: number, at: number, o: Parameters<typeof shoot>[4] = {}): void {
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (Math.abs(angleDiff(a, at)) < (gap / n) * Math.PI) continue; shoot(e, w, a, speed, o); }
}
const bone = () => ramp('#e0d6c0');

// ================================================================== Ossuary Knight
function paintKnight(p: any, f: number, raise: number, shield: boolean, n = 4): void {
  // a skeleton in a dead knight's armour: dented pauldrons, a tattered crimson tabard, ribs showing
  // through a broken breastplate, a horned great-helm with red eyes in the slit
  const ph = (f / n) * TAU;
  const b = bone(), ar = ramp('#4a4a56'), cl = ramp('#6a1e24');
  const st = Math.sin(ph) * 2.5, bob = Math.abs(Math.sin(ph)) * -1;
  // bony legs in greaves
  p.tube(18 + st, 42, 18 + st, 55, 2.2, ar); p.tube(30 - st, 42, 30 - st, 55, 2.2, ar);
  p.rect(15 + st, 54, 6, 3, ar[1]); p.rect(27 - st, 54, 6, 3, ar[1]);
  p.set(18 + st, 48, b[3]); p.set(30 - st, 48, b[3]);
  // tabard, torn at the hem
  p.poly([12, 46 + bob, 16, 22 + bob, 34, 22 + bob, 38, 46 + bob], cl[2]); p.shadeV(12, 22 + bob, 26, 24, cl, 0.5);
  for (let x = 13; x < 38; x += 3) p.poly([x, 45 + bob, x + 3, 45 + bob, x + 1.5, 48 + bob + ((x * 7) % 3)], cl[1]);
  p.rect(23, 30 + bob, 4, 10, hex('#c8a04a')); p.rect(20, 33 + bob, 10, 3, hex('#c8a04a'));   // a faded cross
  // breastplate, staved in, ribs behind it
  p.ball(25, 29 + bob, 11, 9.5, ar, { dither: 0.5 });
  p.ball(27, 30 + bob, 4.5, 4, ramp('#14101a'));
  for (let i = 0; i < 3; i++) p.line(24, 28 + bob + i * 2, 30, 28 + bob + i * 2, b[2]);
  crack(p, 20, 24 + bob, 7, ar[0], 5, 1.2);
  rivets(p, 16, 26 + bob, 34, 26 + bob, 6, ar[4], '#ffffff');
  // pauldrons
  for (const s of [-1, 1]) { p.ball(25 + s * 11, 23 + bob, 5, 4, ar); p.line(25 + s * 8, 21 + bob, 25 + s * 14, 23 + bob, ar[4]); }
  // horned great-helm
  p.ball(25, 13 + bob, 8.5, 8.5, ar, { dither: 0.4 });
  p.rect(17, 6 + bob, 17, 14, ar[2]); p.shadeV(17, 6 + bob, 17, 14, ar, 0.5);
  p.poly([17, 6 + bob, 25, 0 + bob, 34, 6 + bob], ar[3]);
  for (const s of [-1, 1]) { p.tube(25 + s * 8, 7 + bob, 25 + s * 13, 1 + bob, 1.6, b); p.tube(25 + s * 13, 1 + bob, 25 + s * 12, -3 + bob, 1, b); }
  p.rect(18, 13 + bob, 15, 2, hex('#0a0408')); p.rect(24, 13 + bob, 2, 6, hex('#0a0408'));
  for (let y = 16; y < 20; y += 2) for (let x = 19; x < 32; x += 2) if (x < 23 || x > 27) p.set(x, y + bob, '#14101a');
  p.set(21, 13 + bob, '#ff4040'); p.set(29, 13 + bob, '#ff4040'); p.set(22, 13 + bob, '#ff9090'); p.set(30, 13 + bob, '#ff9090');
  p.rect(24, 0 + bob, 2, 3, hex('#c83a3a'));
  if (shield) {
    // a kite shield, scarred, with a skull boss
    const sh = ramp('#5a5a66');
    p.poly([1, 22 + bob, 14, 20 + bob, 14, 46 + bob, 8, 53 + bob, 1, 46 + bob], sh[2]); p.shadeV(1, 20 + bob, 13, 33, sh, 0.4);
    p.line(1, 22 + bob, 14, 20 + bob, sh[4]); p.line(14, 20 + bob, 14, 46 + bob, sh[0]);
    p.line(8, 22 + bob, 8, 50 + bob, hex('#c8a04a')); p.line(2, 32 + bob, 13, 32 + bob, hex('#c8a04a'));
    p.ball(8, 32 + bob, 2.6, 2.6, b); p.set(7, 32 + bob, '#1a0a0a'); p.set(9, 32 + bob, '#1a0a0a');
    crack(p, 3, 40 + bob, 6, sh[0], 9, 0.6);
  }
  // notched longsword
  const sy = 40 - raise * 30;
  p.line(38, 36, 46, sy - 14, hex('#d8d8e0')); p.line(39, 36, 47, sy - 14, hex('#9a9aa8'));
  p.line(36, 37, 41, 35, hex('#8a6a3a')); p.ball(37, 38, 1.4, 1.4, ramp('#c8a04a'));
  p.set(42, (36 + sy - 14) / 2 + 2, '#3a3a44'); p.set(44, sy - 6, '#8a1a24');
}
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
  sprites: () => ({
    walk: frames(52, 58, 8, (p, f, n) => paintKnight(p, f, 0, true, n)), raise: frames(52, 58, 1, (p) => paintKnight(p, 0, 1, true)),
    walk2: frames(52, 58, 8, (p, f, n) => paintKnight(p, f, 0, false, n)), raise2: frames(52, 58, 1, (p) => paintKnight(p, 0, 1, false)),
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
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== Mother of Moths
function paintMothMother(p: any, f: number, up: number, n = 4): void {
  // a vast moth: dusty patterned wings with staring eye-spots, a furred thorax, feathered antennae,
  // a cluster of eggs on the abdomen and six thin legs hanging
  const ph = (f / n) * TAU;
  const w1 = ramp('#a8946e'), body = ramp('#5a4a3a'), fur = ramp('#c8b48a');
  const flap = (Math.sin(ph) * 0.5 + 0.5) * 9 + up * 6;
  const wing = (s: number) => {
    const ox = 36, tipx = 36 + s * 34, wy = 6 + flap;
    p.poly([ox, 26, tipx, wy, ox + s * 30, 34, ox + s * 6, 40], s < 0 ? w1[2] : w1[3]);
    p.poly([ox, 30, ox + s * 26, 34, ox + s * 16, 50 - flap * 0.3, ox + s * 4, 42], w1[1]);
    p.shadeV(s < 0 ? 2 : 36, 4, 34, 46, w1, 0.4);
    // veins and bands
    for (let i = 0; i < 4; i++) p.line(ox + s * 3, 27, ox + s * (12 + i * 6), wy + 3 + i * 7, w1[0]);
    p.line(ox + s * 8, 24 + flap * 0.4, ox + s * 30, 12 + flap * 0.8, w1[4]);
    for (let i = 0; i < 6; i++) p.set(tipx - s * (2 + i * 2), wy + 2 + i, i % 2 ? '#e8dcc0' : w1[0]);
    // eye-spot
    const ex = ox + s * 22, ey = 20 + flap * 0.45;
    p.ball(ex, ey, 6.5, 6, ramp('#3a2a4a')); p.ball(ex, ey, 4.5, 4.2, ramp('#c8a040')); p.ball(ex, ey, 2.4, 2.4, ramp('#14101e'));
    p.set(ex - s * 1, ey - 1, '#ffffff'); p.ring(ex, ey, 6.5, hex('#e8dcc0'), 0.8);
    p.ball(ox + s * 12, 44 - flap * 0.3, 2, 2, ramp('#3a2a4a'));
  };
  wing(-1); wing(1);
  // legs
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = 36 + s * (3 + i), y = 30 + i * 3; p.line(x, y, x + s * (5 + i), y + 7 + Math.sin(ph + i) * 1.5, body[1]); }
  // abdomen with eggs and fur bands
  p.tube(36, 18, 36, 48, 6, body, { dither: 0.7 });
  for (let y = 24; y < 48; y += 4) p.line(31, y, 41, y, body[1]);
  for (const [x, y] of [[33, 40], [37, 43], [39, 39], [35, 45]]) { p.ball(x, y, 1.4, 1.4, ramp('#e8e0c8')); }
  // furred thorax and head
  p.ball(36, 19, 7, 6, fur, { dither: 0.9 });
  for (let i = 0; i < 8; i++) p.set(30 + i * 1.7, 14 + (i % 3), fur[4]);
  p.ball(36, 14, 5.5, 5, fur, { dither: 0.8 });
  bigEye(p, 33, 14, 2.2, 0.3, 0.3, '#f0e060', { veins: '', sclera: '#3a2a1a' }); bigEye(p, 39, 14, 2.2, -0.3, 0.3, '#f0e060', { veins: '', sclera: '#3a2a1a' });
  // feathered antennae
  for (const s of [-1, 1]) { p.line(36 + s * 3, 10, 36 + s * 10, 1, body[2]); for (let i = 0; i < 5; i++) { const x = 36 + s * (4 + i * 1.4), y = 9 - i * 1.8; p.set(x - s, y - 1, w1[4]); p.set(x + s, y + 1, w1[4]); } }
}
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
  sprites: () => ({ idle: frames(72, 56, 8, (p, f, n) => paintMothMother(p, f, 0, n)), up: frames(72, 56, 1, (p) => paintMothMother(p, 0, -1.5)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; e.z = 14; },
  update(e, w, dt) { bossUpdate(e, w, dt, mothBrain); if (Math.random() < dt * 6) w.fx.burst(e.x + (Math.random() - 0.5) * 40, e.y - e.z - 10, 2, 1, '#c8b48a', 20, 0.8, 1, 40); },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 6 }); },
};

// ================================================================== The Bellringer
function paintBellringer(p: any, f: number, swing: number, n = 4): void {
  // a hunchbacked bell-ringer in a sackcloth habit, rope burns on his hands, one milky eye and a
  // cracked bronze bell heavier than he is
  const ph = (f / n) * TAU;
  const robe = ramp('#4a3a32'), s = ramp('#c8a890'), bell = ramp('#b88a3a');
  const st = Math.sin(ph) * 1.5, bob = Math.abs(Math.sin(ph)) * -0.8;
  p.rect(14 + st, 46, 6, 6, robe[0]); p.rect(26 - st, 46, 6, 6, robe[0]);
  p.rect(13 + st, 51, 7, 2, hex('#2a1e18')); p.rect(26 - st, 51, 7, 2, hex('#2a1e18'));
  p.ball(23, 34 + bob, 15, 14, robe, { dither: 0.6 });
  for (let y = 24; y < 46; y += 3) p.line(12 + ((y * 3) % 5), y + bob, 34 - ((y * 5) % 4), y + bob, robe[1]);   // sackcloth weave
  stitches(p, 30, 26 + bob, 34, 40 + bob, '#8a7a5a', 4);
  p.ball(30, 22 + bob, 9.5, 8.5, robe); // hump
  p.line(24, 18 + bob, 38, 22 + bob, robe[3]);
  p.rect(10, 40 + bob, 24, 2, hex('#8a6a3a')); // rope belt
  for (let i = 0; i < 3; i++) p.set(18 + i, 42 + bob + i, '#8a6a3a');
  // head poking out of the hood
  p.ball(19, 23 + bob, 8, 7, robe[0] ? robe : robe);
  p.ball(17, 26 + bob, 6, 5.5, s);
  p.ball(15, 25 + bob, 1.8, 1.8, ramp('#e8f0f0')); p.set(15, 25 + bob, '#c8d8d8');   // milky eye
  p.set(19, 25 + bob, '#1a0a0a'); p.set(19, 24 + bob, '#ffffff');
  p.rect(14, 29 + bob, 6, 1, hex('#5a2a2a')); p.set(15, 30 + bob, '#e8e0c8'); p.set(18, 30 + bob, '#e8e0c8');
  crack(p, 16, 22 + bob, 3, s[1], 3, 0.4);
  // the bell
  const bx = 8 - swing * 4, by = 40 - swing * 10 + Math.sin(ph) * 0.5;
  p.line(17, 34 + bob, bx + 6, by - 8, robe[1]); p.line(16, 34 + bob, bx + 5, by - 8, s[1]);
  p.poly([bx - 1, by + 8, bx + 3, by - 6, bx + 11, by - 6, bx + 15, by + 8], bell[2]); p.shadeV(bx - 1, by - 6, 16, 14, bell, 0.5);
  p.line(bx + 4, by - 5, bx + 1, by + 7, bell[4]);
  p.rect(bx - 2, by + 7, 18, 2, bell[1]); p.rect(bx - 2, by + 7, 18, 1, bell[3]);
  for (let x = bx + 1; x < bx + 13; x += 3) p.set(x, by - 1, bell[0]);   // engraved band
  crack(p, bx + 9, by - 4, 9, '#3a2410', 7, 1.6, 0.6);
  p.ball(bx + 7, by + 10 + Math.sin(ph * 2) * 0.6, 2, 2, bell);
  p.ring(bx + 7, by - 7, 2, bell[3]);
}
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
  sprites: () => ({ walk: frames(46, 54, 8, (p, f, n) => paintBellringer(p, f, 0, n)), swing: frames(46, 54, 1, (p) => paintBellringer(p, 0, 1)) }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, bellBrain); e.flip = w.player.x > e.x; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy); },
};

// ================================================================== The Choirmaster
function paintChoirmaster(p: any, f: number, up: number, n = 2): void {
  // a gaunt choirmaster in a violet cassock with gold piping, a white ruff, a sheet of music pinned to
  // his chest, and a mouth that never stops singing
  const ph = (f / n) * TAU;
  const robe = ramp('#2a1a3a'), trim = ramp('#c8a04a'), s = ramp('#d8c0b0');
  const sway = Math.sin(ph) * 1.2;
  p.poly([9, 56, 14, 18, 30, 18, 35, 56], robe[2]); p.shadeV(9, 18, 26, 38, robe, 0.5);
  p.line(22, 20, 22, 56, trim[2]); p.line(14, 20, 11, 56, trim[1]); p.line(30, 20, 33, 56, trim[1]);
  for (let y = 24; y < 54; y += 3) p.set(22, y, trim[4]);   // buttons
  for (let i = 0; i < 6; i++) p.poly([10 + i * 4, 56, 14 + i * 4, 56, 12 + i * 4, 58], robe[1]);
  // music sheet pinned on
  p.rect(15, 30, 6, 8, hex('#efe6d2')); for (let y = 31; y < 37; y += 2) p.line(16, y, 20, y, hex('#8a7a6a')); p.set(17, 32, '#1a1010'); p.set(19, 34, '#1a1010');
  // arms: one conducting with a baton
  p.tube(14, 22, 8, 34, 2, robe); p.ball(8, 35, 1.6, 1.6, s);
  const ay = 30 - up * 14 + sway;
  p.tube(30, 22, 36, ay, 2, robe); p.ball(36, ay, 1.6, 1.6, s);
  p.line(36, ay, 43, ay - 8 - up * 2, hex('#e8e0d0')); p.set(43, ay - 8 - up * 2, '#ffffff');
  // ruff
  for (let i = 0; i < 9; i++) p.ball(15 + i * 1.8, 18.5 + (i % 2), 1.6, 1.6, ramp('#f0ece4'));
  // head, mitre and singing mouth
  p.ball(22, 11, 6.5, 7.5, s, { dither: 0.5 });
  p.line(17, 7, 19, 9, s[1]); p.line(27, 7, 25, 9, s[1]);   // gaunt cheek lines
  p.poly([14, 6, 22, -3, 30, 6], trim[2]); p.poly([16, 6, 22, -1, 28, 6], robe[3]); p.line(22, -2, 22, 5, trim[4]);
  p.ellipse(19, 10, 1.6, 1.2, hex('#1a0a10')); p.ellipse(25, 10, 1.6, 1.2, hex('#1a0a10'));
  p.set(19, 10, '#f0e8ff'); p.set(25, 10, '#f0e8ff');
  const mo = 1.2 + Math.abs(Math.sin(ph)) * 1.4 + up;
  p.ellipse(22, 15.5, 2.2, mo, hex('#3a0a10')); p.set(22, 15.5 + mo - 1, '#c84a5a');
}
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
  sprites: () => ({ idle: frames(46, 58, 6, (p, f, n) => paintChoirmaster(p, f, 0, n)), up: frames(46, 58, 1, (p) => paintChoirmaster(p, 1, 1)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, choirBrain); e.flip = w.player.x < e.x; },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 4 }); },
};

// ================================================================== The Blotted Man
function paintBlotted(p: any, f: number, scale: number, n = 2): void {
  // a man made of spilled ink: dripping everywhere, words half-legible across his body, mismatched
  // staring eyes, and a mouth that is just a hole
  const ph = (f / n) * TAU;
  const c = ramp('#1e1a36');
  const H = 56 * scale, cx = 20 * scale, sw = Math.sin(ph) * 1.2 * scale;
  p.poly([cx - 9 * scale, H, cx - 6 * scale + sw, 18 * scale, cx + 6 * scale + sw, 18 * scale, cx + 9 * scale, H], c[2]);
  p.shadeV(cx - 9 * scale, 18 * scale, 18 * scale, H - 18 * scale, c, 0.6);
  // smeared handwriting
  for (let r = 0; r < 4; r++) { let x = cx - 6 * scale; const y = (24 + r * 7) * scale; for (let k = 0; k < 5; k++) { p.set(x, y + Math.sin(k * 2 + r) , '#4a4a8a'); p.set(x + 1, y + Math.sin(k * 2 + r), '#4a4a8a'); x += 2.5 * scale; } }
  const ar = Math.sin(ph) * 2;
  p.tube(cx - 6 * scale, 22 * scale, cx - 14 * scale, 40 * scale + ar, 2.4 * scale, c); p.tube(cx + 6 * scale, 22 * scale, cx + 15 * scale, 38 * scale - ar, 2.4 * scale, c);
  for (const [hx, hy] of [[cx - 14 * scale, 40 * scale + ar], [cx + 15 * scale, 38 * scale - ar]]) for (let j = 0; j < 3; j++) p.line(hx - 1 + j, hy, hx - 1 + j, hy + 2 + ((j + f) % 3), c[1]);
  p.ball(cx + sw * 0.5, 11 * scale, 8 * scale, 9 * scale, c, { dither: 0.7 });
  drips(p, Math.round(cx - 7 * scale), Math.round(cx + 7 * scale), Math.round(16 * scale), c[1], c[3], f / n, 7, Math.round(4 * scale));
  bigEye(p, cx - 3 * scale, 10 * scale, 2.6 * scale, Math.cos(ph) * 0.4, 0.3, '#1a1630', { sclera: '#f2f0ff', veins: '#8a8ac8' });
  bigEye(p, cx + 3.5 * scale, 11.5 * scale, 1.9 * scale, Math.cos(ph + 1) * 0.4, 0.3, '#1a1630', { sclera: '#f2f0ff', veins: '' });
  p.ellipse(cx, 17 * scale, 2.6 * scale, (1.2 + Math.abs(Math.sin(ph)) * 0.8) * scale, hex('#0a0814'));
  for (let i = 0; i < 7; i++) { const x = cx - 9 * scale + i * 3 * scale; p.tube(x, H - 2, x, H + 2 + ((i + f) % 3), 1, c); }
  p.ball(cx, H + 2, 11 * scale, 2 * scale, c);
}
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
  sprites: () => ({ idle: frames(42, 64, 6, (p, f, n) => paintBlotted(p, f, 1, n)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, blotBrainF); },
  draw(e, ctx, w, sx, sy) { if (e.hidden) { ctx.fillStyle = '#14122a'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 6, 0, 0, TAU); ctx.fill(); return; } drawBoss(e, ctx, sx, sy); },
};
const blottedhalf: EnemyDef = {
  id: 'blottedhalf', name: 'Blotted Half', desc: '', boss: true,
  hp: 150, r: 10, speed: 0, role: 'boss', cost: 0, hitY: 18, mass: 6, noKnock: true, gore: '#1e1a36', goreDecal: '#0e0c1c',
  sprites: () => ({ idle: frames(30, 44, 6, (p, f, n) => paintBlotted(p, f, 0.7, n)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 0.8; },
  update(e, w, dt) { bossUpdate(e, w, dt, blotBrainH); },
  draw: blottedman.draw,
};

// ================================================================== The Unbound (final)
function paintBook(p: any, f: number, open: number, n = 4, flesh = false): void {
  // the Unbound: Grandfather's great ledger come alive. Tooled leather, brass corners, a clasp that
  // chatters like a jaw, ribbon markers trailing, and a vast eye set into the cover
  const ph = (f / n) * TAU;
  const cov = ramp(flesh ? '#b88a7a' : '#5a1e24'), pg = ramp('#e6dcc0'), gold = ramp(flesh ? '#d8c8b0' : '#c8a04a');
  const cx = 44, cy = 34 + Math.sin(ph) * 1;
  if (open < 0.5) {
    p.rect(cx - 22, cy - 26, 44, 52, cov[2]); p.shadeV(cx - 22, cy - 26, 44, 52, cov, 0.5);
    // spine bands and tooled border
    for (const y of [-20, -8, 8, 20]) { p.rect(cx - 24, cy + y, 3, 3, cov[3]); p.set(cx - 24, cy + y, cov[4]); }
    p.ring(cx - 2, cy, 19, cov[1], 1); for (let i = 0; i < 24; i++) { const a = (i / 24) * TAU; p.set(cx - 2 + Math.cos(a) * 17, cy + Math.sin(a) * 21, gold[1]); }
    // fore-edge of pages, fluttering
    p.rect(cx + 18, cy - 24, 5, 48, pg[2]);
    for (let y = cy - 22; y < cy + 22; y += 3) p.line(cx + 18, y, cx + 22 + Math.round(Math.sin(ph * 2 + y) * 0.8), y, pg[1]);
    // brass corners
    for (const [x, y] of [[cx - 22, cy - 26], [cx + 15, cy - 26], [cx - 22, cy + 19], [cx + 15, cy + 19]]) { p.rect(x, y, 7, 7, gold[2]); p.rect(x + 1, y + 1, 5, 5, gold[3]); p.set(x + 3, y + 3, gold[0]); }
    // the eye
    p.ball(cx - 2, cy, 13, 12, ramp(flesh ? '#8a3a3a' : '#3a0a10'));
    bigEye(p, cx - 2, cy, 9.5, Math.cos(ph) * 0.6, Math.sin(ph) * 0.4, flesh ? '#3a8a3a' : '#c83a3a', { veins: '#c84a4a' });
    // eyelashes / stitched lids
    for (let i = 0; i < 9; i++) { const a = Math.PI + 0.2 + (i / 8) * (Math.PI - 0.4); p.line(cx - 2 + Math.cos(a) * 11, cy + Math.sin(a) * 10.5, cx - 2 + Math.cos(a) * 14, cy + Math.sin(a) * 13.5, flesh ? '#5a2a2a' : gold[3]); }
    // clasp chattering like a jaw
    const cl = Math.round(Math.abs(Math.sin(ph * 2)) * 2);
    p.rect(cx + 16, cy - 4 - cl, 9, 3, gold[3]); p.rect(cx + 16, cy + 2 + cl, 9, 3, gold[2]);
    for (let x = cx + 17; x < cx + 25; x += 2) { p.set(x, cy - 1 - cl, '#f0ead8'); p.set(x, cy + 1 + cl, '#f0ead8'); }
    // ribbon markers trailing below
    for (const [x, c] of [[cx - 8, '#c83a3a'], [cx + 2, '#3a5ac8'], [cx + 10, '#e8c040']] as [number, string][]) for (let j = 0; j < 9; j++) p.set(x + Math.round(Math.sin(ph + j * 0.6 + x) * 1.5), cy + 26 + j, c);
    if (flesh) { stitches(p, cx - 20, cy - 14, cx + 14, cy - 18, '#2a1010', 3); stitches(p, cx - 18, cy + 16, cx + 12, cy + 20, '#2a1010', 3); for (const [x, y] of [[cx - 14, cy - 18], [cx + 10, cy + 12], [cx - 16, cy + 10]]) bigEye(p, x, y, 2, 0, 0.3, '#3a8a3a', { veins: '' }); }
  } else {
    // opened: two page wings scrawled with writing, teeth along the page edges, and something long
    // and thin climbing out of the gutter
    const flap = (Math.sin(ph) * 0.5 + 0.5) * 7;
    p.poly([cx, cy - 20, cx - 40, cy - 28 + flap, cx - 40, cy + 22 + flap * 0.5, cx, cy + 26], pg[3]);
    p.poly([cx, cy - 20, cx + 40, cy - 28 + flap, cx + 40, cy + 22 + flap * 0.5, cx, cy + 26], pg[2]);
    // lines of handwriting: words of uneven length, sloping with the page
    const ink = flesh ? '#8a2a2a' : '#5a4a3a';
    for (let y = -16; y < 20; y += 4) for (const side of [-1, 1]) {
      let x = 6;
      while (x < 34) {
        const wl = 2 + Math.floor(rand01(y * 7 + x, side) * 5);
        for (let k = 0; k < wl && x + k < 35; k++) p.set(cx + side * (x + k), cy + y + Math.round(flap * 0.3 * ((x + k) / 34)) + 1, ink);
        x += wl + 2;
      }
    }
    // drop caps in red
    p.rect(cx - 33, cy - 18 + flap * 0.3, 4, 5, hex('#c83a3a')); p.rect(cx + 8, cy - 18, 4, 5, hex('#c83a3a'));
    // teeth on the outer edges
    for (let y = -26; y < 22; y += 3) { p.set(cx - 41, cy + y + flap, '#f0ead8'); p.set(cx + 40, cy + y + flap, '#f0ead8'); }
    p.rect(cx - 3, cy - 22, 6, 50, cov[1]); p.rect(cx - 1, cy - 22, 2, 50, cov[3]);
    // the thing in the gutter
    p.ball(cx, cy - 2, 7, 10, ramp('#14101e'), { dither: 0.6 });
    p.tube(cx - 4, cy - 4, cx - 16, cy + 6 + flap * 0.5, 1.6, ramp('#14101e')); p.tube(cx + 4, cy - 4, cx + 16, cy + 6 + flap * 0.5, 1.6, ramp('#14101e'));
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) p.line(cx + s * 16, cy + 6 + flap * 0.5, cx + s * (18 + i), cy + 9 + flap * 0.5 + i, hex('#14101e'));
    p.ball(cx, cy - 16, 4.5, 3.5, ramp('#14101e'));
    glowEye(p, cx - 3, cy - 6, flesh ? '#60ff60' : '#ff3040'); glowEye(p, cx + 2, cy - 6, flesh ? '#60ff60' : '#ff3040');
    maw(p, cx - 3, cy, 6, 4, 0.8, { gum: '#3a0a14', drool: '' });
  }
}
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
    if (ph === 2) w.audio.setMusic('bossFinal');
  },
};
const unbound: EnemyDef = {
  id: 'unbound', name: 'The Unbound', desc: 'Every fear Grandfather stitched shut, all at once.', boss: true,
  hp: 900, r: 20, speed: 0, role: 'boss', cost: 0, hitY: 30, mass: 30, noKnock: true, flying: true, gore: '#e6dcc0', goreDecal: '#2b2f66', light: [100, '#ff6070'],
  sprites: () => ({ idle: frames(90, 72, 8, (p, f, n) => paintBook(p, f, 0, n)), open: frames(90, 72, 8, (p, f, n) => paintBook(p, f, 1, n)) }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.4; e.z = 18; },
  update(e, w, dt) {
    bossUpdate(e, w, dt, unboundBrain);
    if (Math.random() < dt * 5) w.fx.burst(e.x + (Math.random() - 0.5) * 60, e.y - e.z - 20, 4, 1, '#e6dcc0', 30, 1, 2, 30);
  },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 8 }); w.r.addGlow(sx, sy - e.z - 30, 60, e.data.phase ? '#ff3050' : '#f0d0a0', 0.15); },
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
    if (ph === 2) w.audio.setMusic('bossFinal');
  },
};
const itremembers: EnemyDef = {
  ...unbound,
  id: 'itremembers', name: 'It Remembers', desc: 'You closed the book once. It has been waiting on the last page ever since.',
  hp: 1250, light: [110, '#ff3050'],
  // the cover has grown skin and the eye has gone green: it is not the book you closed
  sprites: () => ({ idle: frames(90, 72, 8, (p, f, n) => paintBook(p, f, 0, n, true)), open: frames(90, 72, 8, (p, f, n) => paintBook(p, f, 1, n, true)) }),
  init(e) { e.anim = 'open'; e.data.idleT = 1.2; e.z = 18; },
  update(e, w, dt) {
    bossUpdate(e, w, dt, remembersBrain);
    if (Math.random() < dt * 7) w.fx.burst(e.x + (Math.random() - 0.5) * 60, e.y - e.z - 20, 4, 1, Math.random() < 0.5 ? '#e6dcc0' : '#c83a4a', 30, 1, 2, 30);
  },
  draw(e, ctx, w, sx, sy) { drawBoss(e, ctx, sx, sy, { yoff: 8, tint: '#ff2040', tintAmt: 0.22 + 0.08 * Math.sin(e.t * 4) }); w.r.addGlow(sx, sy - e.z - 30, 70, '#ff3050', 0.22); },
};

export const BOSSES_C: EnemyDef[] = [ossuaryknight, mothmother, bellringer, choirmaster, blottedman, blottedhalf, unbound, itremembers];
void teeth; void legs; void sprinkle; void distToPlayer; void (null as unknown as World);
