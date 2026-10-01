// Chapter I bosses.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, pack } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer } from '../enemies/ai';
import { bossUpdate, BossBrain, telegraph } from './boss';
import { TAU, angleTo, clamp, dist } from '../core/math';
import type { World } from '../game/world';

// ------------------------------------------------------------------ Grubmother
const grubBrain: BossBrain = {
  idleTime: [0.9, 1.5], phases: [0.5],
  idle(e, w, dt) { chase(e, w, 26 + e.data.phase * 14, dt); e.setAnim('idle'); e.animate(dt, 6); },
  attacks: [
    { id: 'spray', weight: 3,
      start(e) { e.setAnim('rear'); e.frame = 0; },
      run(e, w, t) {
        e.flip = w.player.x < e.x;
        if (t < 0.6) { e.frame = 0; e.sx = 1 - t * 0.2; e.sy = 1 + t * 0.25; return false; }
        e.frame = 1;
        if (!e.data.sprayed) { e.data.sprayed = true; e.data.sprayN = 0; w.audio.play('bossSpit', { x: e.x }); }
        const want = Math.floor((t - 0.6) / 0.05);
        const n = e.data.phase ? 16 : 11;
        while (e.data.sprayN < Math.min(n, want)) {
          e.data.sprayN++;
          shoot(e, w, aimAngle(e, w) + (Math.random() - 0.5) * 1.1, 110 + Math.random() * 60, { r: 3.5 + Math.random() * 1.5 });
        }
        if (t > 0.6 + n * 0.05 + 0.4) { e.data.sprayed = false; return true; }
        return false;
      } },
    { id: 'burrow', weight: 2, cooldown: 4,
      start(e, w) { e.data.bt = 0; e.setAnim('rear'); w.audio.play('burrow', { x: e.x }); },
      run(e, w, t, dt) {
        if (t < 0.5) { e.sy = 1 - t * 1.6; e.sx = 1 + t * 0.6; w.fx.burst(e.x, e.y, 2, 1, '#5a4a3a', 60, 0.4); return false; }
        if (!e.hidden && t < 1) { e.hidden = true; e.invuln = true; e.sx = e.sy = 1; e.data.tx = w.player.x; e.data.ty = w.player.y; }
        if (t < 1.9) {
          // mound tunnels toward the player
          const a = angleTo(e.x, e.y, w.player.x, w.player.y);
          e.move(w, Math.cos(a) * 95 * dt, Math.sin(a) * 95 * dt);
          if (Math.random() < 0.5) w.fx.burst(e.x, e.y, 1, 1, '#6a5a48', 40, 0.3);
          return false;
        }
        if (!e.data.tele) { e.data.tele = true; telegraph(w, e.x, e.y, 26, 0.6); w.audio.play('rumble', { x: e.x }); }
        if (t < 2.5) { w.shake(0.3); return false; }
        if (e.hidden) {
          e.hidden = false; e.invuln = false; e.data.tele = false;
          e.setAnim('rear'); e.frame = 1; e.sy = 1.4; e.sx = 0.8;
          ringShot(e, w, e.data.phase ? 14 : 10, 120, Math.random());
          w.fx.shards(e.x, e.y, 16, '#6a5a48', 130); w.shake(5); w.audio.play('erupt', { x: e.x });
        }
        return t > 3.1;
      } },
    { id: 'birth', weight: 1.5, cooldown: 6,
      start(e) { e.setAnim('rear'); e.frame = 1; },
      run(e, w, t) {
        e.sx = 1 + Math.sin(t * 30) * 0.05;
        if (t > 0.7 && !e.data.born) {
          e.data.born = true;
          const alive = w.enemies.filter((x) => !x.dead && !x.isBoss).length;
          if (alive < 4) for (let i = 0; i < 2; i++) { const k = w.spawnEnemy(e.data.phase ? 'ragcrawler' : 'mite', e.x + (i ? 16 : -16), e.y + 8, true); if (k) k.noDrop = true; }
          w.audio.play('hatch', { x: e.x }); w.fx.spray(e.x, e.y, 10, Math.PI / 2, 2, 12, '#c8a080', 70, 0.5, '#8a6a50');
        }
        if (t > 1.2) { e.data.born = false; return true; }
        return false;
      } },
    { id: 'lunge', weight: 2, phases: [1],
      start(e, w) { e.data.la = angleTo(e.x, e.y, w.player.x, w.player.y); telegraph(w, e.x + Math.cos(e.data.la) * 40, e.y + Math.sin(e.data.la) * 40, 14, 0.45); },
      run(e, w, t, dt) {
        if (t < 0.45) { e.sx = 0.9; e.sy = 1.1; return false; }
        const h = e.move(w, Math.cos(e.data.la) * 230 * dt, Math.sin(e.data.la) * 230 * dt);
        if (h.hx || h.hy || t > 1.1) { w.shake(2); spreadShot(e, w, 5, e.data.la + Math.PI, 1.2, 100); return true; }
        return false;
      } },
  ],
};
function paintGrub(p: any, f: number, rear: number, mouth: number): void {
  const skin = ramp('#e2c6ae'), fold = ramp('#b88a7a');
  const pulse = (i: number) => Math.sin(f * 1.6 + i) * 0.8;
  // back segments (tail to front)
  const segs = [[12, 30, 9], [22, 29, 11], [34, 28, 12.5]];
  segs.forEach(([x, y, r], i) => {
    p.ball(x, y - rear * i * 0.5, r + pulse(i), r * 0.8 + pulse(i) * 0.5, skin, { dither: 0.6 });
    p.line(x - 2, y - r * 0.7, x - 2, y + r * 0.6, fold[1]);
  });
  legs(p, 26, 36, 8, 0.35, 6, f, fold[0]);
  // head segment
  const hx = 46, hy = 24 - rear * 8;
  p.ball(hx, hy, 11, 10 + rear, skin, { dither: 0.5 });
  // round mouth
  const mr = 3 + mouth * 3.5;
  p.ellipse(hx + 3, hy + 2, mr + 1.5, mr + 1, fold[1]);
  p.ellipse(hx + 3, hy + 2, mr, mr * 0.9, '#2a0a12');
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; p.set(hx + 3 + Math.cos(a) * mr * 0.85, hy + 2 + Math.sin(a) * mr * 0.8, '#f0e8d8'); }
  // beady eyes
  glowEye(p, hx - 4, hy - 5, '#1a0a10'); p.set(hx + 8, hy - 6, '#1a0a10');
  sprinkle(p, '#c89a88', 20, 7);
}
const grubmother: EnemyDef = {
  id: 'grubmother', name: 'The Grubmother', desc: 'She has been eating the foundations for years.', boss: true,
  hp: 230, r: 16, speed: 30, role: 'boss', cost: 0, hitY: 14, mass: 8, gore: '#c8a080', goreDecal: '#6a4a38', noKnock: true, noSeparate: false,
  sprites: () => ({
    idle: frames(62, 44, 4, (p, f) => paintGrub(p, f, 0, 0.2)),
    rear: frames(62, 50, 2, (p, f) => paintGrub(p, 0, 1, f ? 1 : 0.4)),
  }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, grubBrain); },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) {
      // dirt mound
      ctx.fillStyle = '#3a2e24'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 14, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.ellipse(sx, sy - 4, 10, 4, 0, 0, TAU); ctx.fill();
      return;
    }
    const set = e.sprites[e.anim]; const spr = set[e.frame % set.length];
    spr.draw(ctx, sx, sy + 4, { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy });
  },
};

// ------------------------------------------------------------------ The Wardrobe
const wardBrain: BossBrain = {
  idleTime: [0.8, 1.4], phases: [0.5],
  idle(e, w, dt) {
    // hops toward the player
    e.data.hop = (e.data.hop ?? 0) + dt;
    if (e.data.hop > 0.55) { e.data.hop = 0; e.data.ha = angleTo(e.x, e.y, w.player.x, w.player.y); e.vz = 90; w.audio.play('thud', { x: e.x, vol: 0.4 }); }
    if (e.z > 0 || e.vz > 0) { e.vz -= 400 * dt; e.z = Math.max(0, e.z + e.vz * dt); e.move(w, Math.cos(e.data.ha) * 50 * dt, Math.sin(e.data.ha) * 50 * dt); if (e.z === 0) { e.vz = 0; e.sx = 1.15; e.sy = 0.88; } }
    e.setAnim('closed');
  },
  attacks: [
    { id: 'charge', weight: 3,
      start(e, w) { e.setAnim('tilt'); e.data.ca = angleTo(e.x, e.y, w.player.x, w.player.y); w.audio.play('creak', { x: e.x }); },
      run(e, w, t, dt) {
        if (t < 0.55) { e.x += (Math.random() - 0.5) * 1.2; return false; }
        e.setAnim('closed');
        const s = e.data.phase ? 260 : 210;
        const h = e.move(w, Math.cos(e.data.ca) * s * dt, Math.sin(e.data.ca) * s * dt);
        if (Math.random() < 0.5) w.fx.burst(e.x, e.y, 2, 1, '#5a4a3a', 50, 0.3);
        if (h.hx || h.hy || t > 2) {
          w.shake(5); w.audio.play('slam', { x: e.x }); e.sx = 0.8; e.sy = 1.2;
          ringShot(e, w, e.data.phase ? 12 : 8, 115, Math.random());
          return true;
        }
        return false;
      } },
    { id: 'doors', weight: 3,
      start(e, w) { e.setAnim('open'); e.frame = 0; w.audio.play('creak', { x: e.x }); },
      run(e, w, t) {
        e.frame = t > 0.35 ? 1 : 0;
        if (t > 0.5 && !e.data.d1) { e.data.d1 = true; spreadShot(e, w, 5, aimAngle(e, w), 1.0, 130); w.audio.play('bossSpit', { x: e.x }); }
        if (t > 0.9 && !e.data.d2) {
          e.data.d2 = true; spreadShot(e, w, 6, aimAngle(e, w), 1.2, 115);
          const moths = w.enemies.filter((x) => !x.dead && x.def.id === 'moth').length;
          if (moths < 3) { const m = w.spawnEnemy('moth', e.x, e.y - 10, true); if (m) m.noDrop = true; }
        }
        if (t > 1.4) { e.data.d1 = e.data.d2 = false; e.setAnim('closed'); return true; }
        return false;
      } },
    { id: 'hangers', weight: 2, cooldown: 3,
      start(e) { e.setAnim('open'); e.frame = 1; e.data.sp = Math.random() * TAU; },
      run(e, w, t, dt) {
        if (t < 0.4) return false;
        e.data.sp += dt * 3.2;
        e.data.st = (e.data.st ?? 0) - dt;
        if (e.data.st <= 0) {
          e.data.st = 0.09;
          const arms = e.data.phase ? 3 : 2;
          for (let i = 0; i < arms; i++) shoot(e, w, e.data.sp + (i / arms) * TAU, 105, { shape: 'bone', r: 3 });
        }
        if (t > 2.2) { e.setAnim('closed'); return true; }
        return false;
      } },
  ],
};
function paintWardrobe(p: any, open: number, tilt: number, bob: number): void {
  const wood = ramp('#6a4028'), dark = ramp('#3a2418');
  const x0 = 6, y0 = 8 + bob, W = 36, H = 44;
  // legs
  for (const lx of [x0 + 3, x0 + W - 6]) { p.rect(lx, y0 + H, 3, 4, dark[2]); p.set(lx - 1, y0 + H + 3, dark[1]); p.set(lx + 3, y0 + H + 3, dark[1]); }
  // body
  p.rect(x0, y0, W, H, wood[2]);
  p.shadeV(x0, y0, W, H, wood, 0.5);
  // crown
  p.poly([x0 - 2, y0 + 1, x0 + W / 2, y0 - 7, x0 + W + 2, y0 + 1], wood[3]);
  p.ball(x0 + W / 2, y0 - 3, 3, 2.5, ramp('#b8903a'));
  // interior darkness with eyes and teeth
  const iw = W - 6;
  p.rect(x0 + 3, y0 + 5, iw, H - 10, '#0c0608');
  if (open > 0) {
    glowEye(p, x0 + 12, y0 + 16, '#f0d040'); glowEye(p, x0 + 24, y0 + 16, '#f0d040');
    teeth(p, x0 + 9, y0 + 24, 18, 6, open);
  }
  // doors
  const dw = Math.round((iw / 2) * (1 - open * 0.8));
  for (const side of [0, 1]) {
    const dx = side ? x0 + 3 + iw - dw : x0 + 3;
    p.rect(dx, y0 + 5, dw, H - 10, wood[2]);
    p.rect(dx + 1, y0 + 8, Math.max(1, dw - 2), H - 16, wood[1]);
    p.rect(dx, y0 + 5, dw, 1, wood[3]);
    if (dw > 4) p.set(side ? dx + 1 : dx + dw - 2, y0 + H / 2, '#d8b060');
  }
  if (open > 0.6) { p.rect(x0 - 6, y0 + 6, 6, H - 12, wood[1]); p.rect(x0 + W, y0 + 6, 6, H - 12, wood[1]); }
  void tilt;
}
const wardrobe: EnemyDef = {
  id: 'wardrobe', name: 'The Wardrobe', desc: 'Every child knows what lives inside.', boss: true,
  hp: 250, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 10, gore: '#6a4028', goreDecal: '#3a2418', noKnock: true,
  sprites: () => ({
    closed: frames(50, 60, 1, (p) => paintWardrobe(p, 0, 0, 0)),
    tilt: frames(50, 60, 1, (p) => paintWardrobe(p, 0.15, 1, 1)),
    open: frames(50, 60, 2, (p, f) => paintWardrobe(p, f ? 1 : 0.5, 0, 0)),
  }),
  init(e) { e.anim = 'closed'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, wardBrain); },
  draw(e, ctx, w, sx, sy) {
    const set = e.sprites[e.anim]; const spr = set[e.frame % set.length];
    const rot = e.anim === 'tilt' ? Math.sin(e.st * 30) * 0.04 - 0.08 : 0;
    spr.draw(ctx, sx, sy - e.z + 2, { flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, rot });
  },
};

// ------------------------------------------------------------------ Twin Snips
function snipBrain(aggressive: boolean): BossBrain {
  return {
    idleTime: aggressive ? [0.7, 1.2] : [0.9, 1.5],
    idle(e, w, dt) {
      const enraged = !w.enemies.some((x) => x !== e && x.isBoss && !x.dead);
      e.data.enraged = enraged;
      if (aggressive) chase(e, w, enraged ? 70 : 45, dt); else keepDistance(e, w, 70, 130, enraged ? 70 : 50, dt);
      e.setAnim('walk'); e.animate(dt, enraged ? 14 : 9);
      if (enraged) e.data.idleT -= dt * 0.6;
    },
    attacks: aggressive ? [
      { id: 'dash', weight: 3,
        start(e, w) { e.setAnim('open'); e.data.da = angleTo(e.x, e.y, w.player.x, w.player.y); w.audio.play('snip', { x: e.x }); telegraph(w, e.x + Math.cos(e.data.da) * 30, e.y + Math.sin(e.data.da) * 30, 12, 0.4); },
        run(e, w, t, dt) {
          if (t < 0.45) return false;
          e.setAnim('walk');
          const h = e.move(w, Math.cos(e.data.da) * 250 * dt, Math.sin(e.data.da) * 250 * dt);
          e.animate(dt, 20);
          if (h.hx || h.hy || t > 1.3) { w.audio.play('snip', { x: e.x }); spreadShot(e, w, 3, e.data.da + Math.PI, 0.8, 110, { shape: 'bone' }); return true; }
          return false;
        } },
      { id: 'cut', weight: 2,
        start(e) { e.setAnim('open'); },
        run(e, w, t) {
          if (t > 0.4 && !e.data.c) { e.data.c = true; const a = aimAngle(e, w); for (let i = -3; i <= 3; i++) shoot(e, w, a + i * 0.14, 150 - Math.abs(i) * 12, { shape: 'bone', r: 2.5 }); w.audio.play('snip', { x: e.x }); }
          if (t > 0.8) { e.data.c = false; return true; }
          return false;
        } },
    ] : [
      { id: 'burst', weight: 3,
        run(e, w, t) {
          e.setAnim('open');
          const n = Math.floor(t / 0.22);
          if (n > (e.data.bn ?? -1) && n < (e.data.enraged ? 5 : 3)) { e.data.bn = n; shoot(e, w, aimAngle(e, w, 0.8, 150), 150, { shape: 'bile' }); w.audio.play('snip', { x: e.x, vol: 0.5 }); }
          if (t > (e.data.enraged ? 1.3 : 0.9)) { e.data.bn = -1; return true; }
          return false;
        } },
      { id: 'cross', weight: 2,
        run(e, w, t) {
          e.setAnim('open');
          if (t > 0.5 && !e.data.x) { e.data.x = true; ringShot(e, w, 8, 100, e.data.rot ? Math.PI / 8 : 0); e.data.rot = !e.data.rot; }
          if (t > 0.9) { e.data.x = false; return true; }
          return false;
        } },
    ],
  };
}
function paintSnip(p: any, f: number, open: number, brass: boolean): void {
  const blade = ramp('#c8ccd8'), handle = ramp(brass ? '#c89a3a' : '#9a2a3a');
  const cx = 18, cy = 20;
  const a = 0.18 + open * 0.5;
  for (const side of [-1, 1]) {
    const tx = cx + side * (3 + Math.sin(a) * 16), ty = cy - 19;
    p.poly([cx - side * 1, cy + 1, cx + side * 3, cy - 1, tx, ty, tx - side * 2, ty + 1], side < 0 ? blade[3] : blade[2]);
    p.line(cx + side * 3, cy - 1, tx, ty, blade[4]);
    p.line(cx - side * 1, cy + 1, tx - side * 2, ty + 1, blade[1]);
  }
  const st = [0, 2, 0, -2][f % 4];
  // handles double as legs
  p.line(cx - 2, cy + 2, cx - 6, cy + 8, handle[1]); p.line(cx + 2, cy + 2, cx + 6, cy + 8, handle[1]);
  p.ring(cx - 7, cy + 11 + st * 0.5, 4.5, handle[2], 2.2); p.ring(cx + 7, cy + 11 - st * 0.5, 4.5, handle[2], 2.2);
  p.set(cx - 9, cy + 9 + st * 0.5, handle[4]); p.set(cx + 5, cy + 9 - st * 0.5, handle[4]);
  // pivot screw eye
  p.ball(cx, cy, 4, 4, ramp('#e8e0d0'));
  p.ball(cx + (open ? 0 : 0.5), cy, 2, 2, ramp(brass ? '#3a8a3a' : '#b02a2a'));
  p.set(cx - 2, cy - 2, '#ffffff');
}
const snipA: EnemyDef = {
  id: 'snipA', name: 'Snip', desc: '', boss: true, hp: 125, r: 9, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, gore: '#c8ccd8', goreDecal: '#5a1a24',
  sprites: () => ({ walk: frames(36, 38, 4, (p, f) => paintSnip(p, f, 0, false)), open: frames(36, 38, 1, (p) => paintSnip(p, 0, 1, false)) }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, snipBrainA); },
};
const snipB: EnemyDef = {
  id: 'snipB', name: 'Snap', desc: '', boss: true, hp: 125, r: 9, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, gore: '#c89a3a', goreDecal: '#5a1a24',
  sprites: () => ({ walk: frames(36, 38, 4, (p, f) => paintSnip(p, f, 0, true)), open: frames(36, 38, 1, (p) => paintSnip(p, 0, 1, true)) }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1.6; },
  update(e, w, dt) { bossUpdate(e, w, dt, snipBrainB); },
};
const snipBrainA = snipBrain(true), snipBrainB = snipBrain(false);
// A named stub so floor data / intros can refer to the pair.
const twinsnips: EnemyDef = { ...snipA, id: 'twinsnips', name: 'Twin Snips', desc: 'Grandmother\'s sewing scissors. They never did like each other.' };

export const BOSSES_A: EnemyDef[] = [grubmother, wardrobe, snipA, snipB, twinsnips];

void pack; void eye; void hex; void clamp; void dist; void randomFloorPoint; void distToPlayer; void (null as unknown as Enemy); void (null as unknown as World);
