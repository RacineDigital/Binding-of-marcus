// Chapter I bosses.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, pack, crack, grain, bigEye, maw } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer } from '../enemies/ai';
import { bossUpdate, BossBrain, BossAttack, telegraph } from './boss';
import { TAU, angleTo, clamp, dist } from '../core/math';
import type { World } from '../game/world';

// ------------------------------------------------------------------ Grubmother
// Rhythm: she sprays twice, then burrows and erupts under you and is left stuck half out of the
// ground (the moment to punish). Below half she lunges first and burrows twice in a row.
const grubBrain: BossBrain = {
  idleTime: [1.05, 1.6], phases: [0.5],
  sequence: [['spray', 'spray', 'burrow', 'birth'], ['lunge', 'spray', 'burrow', 'burrow', 'birth']],
  idle(e, w, dt) { chase(e, w, 26 + e.data.phase * 14, dt); e.setAnim('idle'); e.animate(dt, 6); },
  attacks: [
    { id: 'spray', weight: 3,
      start(e) { e.setAnim('rear'); e.frame = 0; },
      run(e, w, t) {
        e.flip = w.player.x < e.x;
        if (t < 0.6) { e.frame = 0; e.sx = 1 - t * 0.2; e.sy = 1 + t * 0.25; return false; }
        e.frame = 1;
        // a sweep, not a scatter: the stream crosses from one side of you to the other, so stepping
        // against the sweep (or behind her) is the way out
        if (!e.data.sprayed) { e.data.sprayed = true; e.data.sprayN = 0; e.data.sweepA = aimAngle(e, w); e.data.sweepDir = Math.random() < 0.5 ? 1 : -1; w.audio.play('bossSpit', { x: e.x }); }
        const want = Math.floor((t - 0.6) / 0.055);
        const n = e.data.phase ? 14 : 10, arc = 1.3;
        while (e.data.sprayN < Math.min(n, want)) {
          const k = e.data.sprayN / (n - 1);
          e.data.sprayN++;
          shoot(e, w, e.data.sweepA + e.data.sweepDir * (k - 0.5) * arc, 125, { r: 4 });
          if (e.data.phase && e.data.sprayN % 3 === 0) shoot(e, w, e.data.sweepA + e.data.sweepDir * (k - 0.5) * arc, 85, { r: 3 });
        }
        if (t > 0.6 + n * 0.055 + 0.3) { e.data.sprayed = false; return true; }
        return false;
      }, recover: 0.5 },
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
          ringShot(e, w, e.data.phase ? 12 : 8, 115, Math.random());
          w.fx.shards(e.x, e.y, 16, '#6a5a48', 130); w.shake(5); w.audio.play('erupt', { x: e.x });
        }
        return t > 2.8;
      }, recover: 1.2 },
    { id: 'birth', weight: 1.5, cooldown: 6,
      start(e) { e.setAnim('rear'); e.frame = 1; },
      run(e, w, t) {
        e.sx = 1 + Math.sin(t * 30) * 0.05;
        if (t > 0.7 && !e.data.born) {
          e.data.born = true;
          const alive = w.enemies.filter((x) => !x.dead && !x.isBoss).length;
          if (alive < 3) for (let i = 0; i < 2; i++) { const k = w.spawnEnemy(e.data.phase ? 'ragcrawler' : 'mite', e.x + (i ? 16 : -16), e.y + 8, true); if (k) k.noDrop = true; }
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
      }, recover: 0.6 },
  ],
};
function paintGrub(p: any, f: number, rear: number, mouth: number, n = 4): void {
  // a pale, swollen grub mother: translucent skin over dark innards, a ripple running nose to tail,
  // bristles, a cluster of beady eyes and a lamprey mouth ringed with teeth
  const ph = (f / n) * TAU;
  const skin = ramp('#ecd2bc'), fold = ramp('#b8806e'), gut = ramp('#6a3040');
  const segs = [[7, 32, 5.5], [14, 31, 8], [23, 30, 10], [33, 29, 11.5]];
  legs(p, 24, 37, 10, 0.3, 6, ph * 2, fold[0]);
  segs.forEach(([x, y, r], i) => {
    const k = 1 + Math.sin(ph - i * 1.3) * 0.08;
    const yy = y - rear * i * 0.6 + Math.sin(ph - i * 1.3) * 0.8;
    p.ball(x, yy, r * k, r * 0.82 * k, skin, { dither: 0.5 });
    p.ball(x + 1, yy + r * 0.25, r * 0.55 * k, r * 0.35 * k, gut, { dither: 0.9 });     // innards through the skin
    p.line(x - r * 0.75, yy - r * 0.45, x - r * 0.75, yy + r * 0.6, fold[1]);            // the fold between segments
    p.line(x - r * 0.75 + 1, yy - r * 0.4, x - r * 0.75 + 1, yy + r * 0.5, skin[4]);
    for (let b = 0; b < r * 0.8; b += 2) p.line(x - r * 0.4 + b, yy - r * 0.78, x - r * 0.4 + b - 1, yy - r * 0.78 - 2 - (b % 3), fold[0]);
    crack(p, x - 2, yy - r * 0.3, Math.round(r), '#c88a94', i * 7 + 3, 0.3, 1.1);
  });
  // tail stinger
  p.tube(2, 33, 6, 32, 1.8, fold); p.set(1, 34, fold[0]);
  // two of her young clinging to her back
  for (const [x, y] of [[16, 22], [27, 19]]) { p.ball(x, y - rear * 2, 2.6, 1.8, ramp('#f6eadc')); p.set(x + 2, y - rear * 2, '#2a0a10'); }
  // head
  const hx = 47, hy = 24 - rear * 8 + Math.sin(ph) * 0.8;
  p.ball(hx, hy, 12, 10.5 + rear, skin, { dither: 0.45 });
  p.ball(hx - 2, hy + 4, 8, 4, fold, { dither: 0.8 });
  crack(p, hx - 6, hy - 6, 9, '#c88a94', 41, 0.2);
  // lamprey mouth: a gum ring, two rings of teeth and a red throat
  const mr = 3 + mouth * 4 + Math.sin(ph * 2) * 0.4;
  p.ellipse(hx + 4, hy + 2, mr + 2.2, mr + 1.6, fold[1]);
  p.ellipse(hx + 4, hy + 2, mr + 1, mr * 0.95 + 0.5, '#8a2a3a');
  p.ellipse(hx + 4, hy + 2, mr, mr * 0.9, '#2a0610');
  p.ellipse(hx + 4, hy + 2.5, mr * 0.45, mr * 0.4, '#6a1020');
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + ph * 0.25; p.set(hx + 4 + Math.cos(a) * mr * 0.9, hy + 2 + Math.sin(a) * mr * 0.85, '#f4ecdc'); }
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU - ph * 0.3; p.set(hx + 4 + Math.cos(a) * mr * 0.55, hy + 2 + Math.sin(a) * mr * 0.5, '#d8ccb8'); }
  if (mouth > 0.3) for (let j = 0; j < 2 + mouth * 4; j++) p.set(hx + 6, hy + 2 + mr + j, '#d8eadc');
  // a cluster of glossy black eyes
  for (const [ex, ey, er] of [[-6, -6, 1.6], [-3, -8, 1.3], [0, -6.5, 1.8], [-8, -3, 1.1], [3, -8, 1]] as [number, number, number][]) {
    p.ball(hx + ex, hy + ey, er + 0.4, er + 0.4, ramp('#14080c')); p.set(hx + ex - 0.5, hy + ey - 0.5, '#ffffff');
  }
  sprinkle(p, '#c89a88', 26, 7);
  sprinkle(p, '#8a5a5a', 10, 11);
}
const grubmother: EnemyDef = {
  id: 'grubmother', name: 'The Grubmother', desc: 'She has been eating the foundations for years. The surveyor said it was damp.', boss: true,
  hp: 210, r: 16, speed: 30, role: 'boss', cost: 0, hitY: 14, mass: 8, gore: '#c8a080', goreDecal: '#6a4a38', noKnock: true, noSeparate: false,
  sprites: () => ({
    idle: frames(62, 44, 8, (p, f, n) => paintGrub(p, f, 0, 0.2, n)),
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
// Rhythm: closed, she's solid walnut and shrugs most of a hit off. She opens up to attack: charge
// and slam (doors burst open after), the doors volley, the spinning hangers. Hit her while she's open.
const wardBrain: BossBrain = {
  idleTime: [0.8, 1.4], phases: [0.5],
  sequence: [['charge', 'doors', 'hangers', 'doors'], ['charge', 'charge', 'doors', 'hangers']],
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
          e.setAnim('open'); e.frame = 1;   // the slam knocks her doors open: she's soft for a moment
          return true;
        }
        return false;
      }, recover: 0.9 },
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
        if (t > 1.4) { e.data.d1 = e.data.d2 = false; return true; }
        return false;
      }, recover: 0.5 },
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
function paintWardrobe(p: any, open: number, tilt: number, bob: number, f = 0): void {
  // a tall walnut wardrobe on clawed feet: carved crown with a face in it, grain, brass, a mirror on
  // one door, a coat sleeve caught in the gap, and something looking out through the keyhole
  const wood = ramp('#6e4228'), dark = ramp('#3a2418'), brass = ramp('#c89a3a');
  const x0 = 7, y0 = 9 + bob, W = 36, H = 44;
  // clawed feet
  for (const lx of [x0 + 3, x0 + W - 6]) {
    p.tube(lx + 1, y0 + H - 1, lx + 1, y0 + H + 3, 2, dark);
    for (const dx of [-2, 0, 2]) { p.set(lx + 1 + dx, y0 + H + 4, '#e8dcc0'); p.set(lx + 1 + dx, y0 + H + 5, '#b8a888'); }
  }
  // body
  p.rect(x0, y0, W, H, wood[2]); p.shadeV(x0, y0, W, H, wood, 0.5);
  grain(p, x0, y0, W, H, wood[1], 3);
  p.rect(x0, y0, 2, H, wood[3]); p.rect(x0 + W - 2, y0, 2, H, wood[0]);
  p.rect(x0 - 1, y0 + H - 3, W + 2, 3, wood[1]); p.rect(x0 - 1, y0 + H - 3, W + 2, 1, wood[3]);
  // carved crown with a little scowling face
  p.poly([x0 - 3, y0 + 1, x0 + 4, y0 - 4, x0 + W / 2, y0 - 9, x0 + W - 4, y0 - 4, x0 + W + 3, y0 + 1], wood[3]);
  p.poly([x0 + 2, y0, x0 + W / 2, y0 - 7, x0 + W - 2, y0], wood[2]);
  p.ball(x0 + W / 2, y0 - 3, 3.4, 2.8, brass);
  p.set(x0 + W / 2 - 1, y0 - 4, '#1a0a08'); p.set(x0 + W / 2 + 1, y0 - 4, '#1a0a08'); p.line(x0 + W / 2 - 1, y0 - 2, x0 + W / 2 + 1, y0 - 2, '#5a3a10');
  for (const s of [-1, 1]) p.line(x0 + W / 2 + s * 5, y0 - 3, x0 + W / 2 + s * 12, y0 - 1, wood[4]);
  // the dark inside: many eyes, hangers, a lolling tongue and rows of teeth on the door edges
  const iw = W - 6;
  p.rect(x0 + 3, y0 + 5, iw, H - 10, '#0c0608');
  if (open > 0) {
    for (let i = 0; i < 3; i++) p.line(x0 + 8 + i * 8, y0 + 7, x0 + 10 + i * 8, y0 + 10, hex('#8a8a92'));
    bigEye(p, x0 + 12, y0 + 16, 3.2, 0.3, 0.4, '#e8c030', { sclera: '#f0d860', veins: '#c86a20' });
    bigEye(p, x0 + 24, y0 + 16, 3.2, -0.3, 0.4, '#e8c030', { sclera: '#f0d860', veins: '#c86a20' });
    for (const [ex, ey] of [[x0 + 8, y0 + 30], [x0 + 28, y0 + 28], [x0 + 18, y0 + 10]]) { p.set(ex, ey, '#f0d040'); p.set(ex + 2, ey, '#f0d040'); }
    maw(p, x0 + 8, y0 + 23, 20, 9, open, { gum: '#6a1a24', tongue: '#b8384a' });
  } else {
    // something peering out through the gap
    if (f % 4 !== 3) { p.set(x0 + W / 2 - 1, y0 + 18, '#f0d040'); p.set(x0 + W / 2, y0 + 18, '#fff4a0'); }
  }
  // doors
  const dw = Math.round((iw / 2) * (1 - open * 0.8));
  for (const side of [0, 1]) {
    const dx = side ? x0 + 3 + iw - dw : x0 + 3;
    p.rect(dx, y0 + 5, dw, H - 10, wood[2]);
    if (dw > 4) {
      p.rect(dx + 1, y0 + 8, dw - 2, H - 16, wood[1]); p.rect(dx + 2, y0 + 9, dw - 4, H - 18, wood[2]);
      grain(p, dx + 2, y0 + 9, dw - 4, H - 18, wood[1], 11 + side);
      if (side === 1 && dw > 8) {
        // a mirror, cracked
        p.rect(dx + 3, y0 + 11, dw - 6, 14, hex('#8aa0b0')); p.shadeV(dx + 3, y0 + 11, dw - 6, 14, ramp('#7a90a4'), 0.4);
        crack(p, dx + 5, y0 + 13, 8, '#e8f4ff', 5, 1.2); p.set(dx + 4, y0 + 12, '#ffffff');
      }
      p.ball(side ? dx + 2 : dx + dw - 3, y0 + H / 2, 1.3, 1.6, brass);
      if (side === 0) { p.rect(dx + dw - 3, y0 + H / 2 + 3, 1, 2, '#0a0404'); p.set(dx + dw - 3, y0 + H / 2 + 3, open > 0 ? '#0a0404' : '#f0c040'); }
    }
    p.rect(dx, y0 + 5, dw, 1, wood[3]);
    // teeth along the door edges when they part
    if (open > 0.3) for (let y = y0 + 8; y < y0 + H - 6; y += 3) p.set(side ? dx - 1 : dx + dw, y, '#efe6d0');
  }
  // a coat sleeve caught in the closed doors
  if (open < 0.2) { p.tube(x0 + W / 2, y0 + 30, x0 + W / 2 + 2, y0 + H - 4, 1.6, ramp('#4a4a6a')); p.set(x0 + W / 2 + 2, y0 + H - 3, '#e8c8a8'); }
  if (open > 0.6) { p.rect(x0 - 6, y0 + 6, 6, H - 12, wood[1]); p.rect(x0 + W, y0 + 6, 6, H - 12, wood[1]); grain(p, x0 - 6, y0 + 6, 6, H - 12, wood[0], 21); }
  void tilt;
}
const wardrobe: EnemyDef = {
  id: 'wardrobe', name: 'The Wardrobe', desc: 'Grandmother hid the presents in it. Marcus was sure there was a man inside. There was. Its doors are solid; hit it while they\'re open.', boss: true,
  hp: 205, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 10, gore: '#6a4028', goreDecal: '#3a2418', noKnock: true,
  sprites: () => ({
    closed: frames(50, 60, 4, (p, f) => paintWardrobe(p, 0, 0, 0, f)),
    tilt: frames(50, 60, 1, (p) => paintWardrobe(p, 0.15, 1, 1)),
    open: frames(50, 60, 2, (p, f) => paintWardrobe(p, f ? 1 : 0.5, 0, 0)),
  }),
  init(e) { e.anim = 'closed'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, wardBrain); if (e.state === 'idle' || e.state === 'windup') e.setAnim('closed'); },
  // closed doors are solid walnut: most of a hit is lost (and you hear it). Open, she's all soft inside.
  onHurt(e, w, dmg, info) {
    if (e.anim !== 'closed' || e.data.exposed) return dmg;
    if (info.source !== 'burn' && info.source !== 'poison' && w.time - (e.data.clangT ?? -9) > 0.15) {
      e.data.clangT = w.time; w.audio.play('clang', { x: e.x, vol: 0.45 });
      w.fx.sparks(e.x - Math.cos(info.ang) * e.r, e.y - e.hitY, 3, '#c8a070', 70, 0.2);
    }
    return dmg * 0.5;
  },
  draw(e, ctx, w, sx, sy) {
    const set = e.sprites[e.anim]; const spr = set[e.frame % set.length];
    const rot = e.anim === 'tilt' ? Math.sin(e.st * 30) * 0.04 - 0.08 : 0;
    spr.draw(ctx, sx, sy - e.z + 2, { flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, rot });
  },
};

// ------------------------------------------------------------------ Twin Snips
// The pair take turns, so you only ever read one threat at a time: Snip (red) dashes and cuts,
// Snap (brass) keeps its distance and fires. A dash that ends in a wall leaves Snip's blades stuck
// for a moment. Kill one and the other is left alone and furious, and picks up its partner's move.
const snipAttacks: Record<string, BossAttack> = {
  dash: { id: 'dash', weight: 3,
    start(e, w) { e.setAnim('open'); e.data.da = angleTo(e.x, e.y, w.player.x, w.player.y); e.data.stuck = false; w.audio.play('snip', { x: e.x }); telegraph(w, e.x + Math.cos(e.data.da) * 30, e.y + Math.sin(e.data.da) * 30, 12, 0.45); },
    run(e, w, t, dt) {
      if (t < 0.45) { e.x += (Math.random() - 0.5) * 0.8; return false; }
      e.setAnim('walk');
      const h = e.move(w, Math.cos(e.data.da) * 250 * dt, Math.sin(e.data.da) * 250 * dt);
      e.animate(dt, 20);
      if (h.hx || h.hy || t > 1.3) {
        e.data.stuck = !!(h.hx || h.hy);
        w.audio.play(e.data.stuck ? 'clang' : 'snip', { x: e.x });
        if (e.data.stuck) { w.shake(2); w.fx.sparks(e.x + Math.cos(e.data.da) * e.r, e.y - 6, 6, '#e8e8f0', 90); e.setAnim('open'); }
        spreadShot(e, w, 3, e.data.da + Math.PI, 0.8, 110, { shape: 'bone' });
        return true;
      }
      return false;
    }, recover: (e) => (e.data.stuck ? 1.0 : 0.25) },
  cut: { id: 'cut', weight: 2,
    start(e) { e.setAnim('open'); },
    run(e, w, t) {
      if (t > 0.45 && !e.data.c) { e.data.c = true; const a = aimAngle(e, w); for (let i = -3; i <= 3; i++) shoot(e, w, a + i * 0.16, 150 - Math.abs(i) * 12, { shape: 'bone', r: 2.5 }); w.audio.play('snip', { x: e.x }); }
      if (t > 0.8) { e.data.c = false; return true; }
      return false;
    } },
  burst: { id: 'burst', weight: 3,
    run(e, w, t) {
      e.setAnim('open');
      const n = Math.floor(t / 0.24), max = e.data.phase ? 5 : 3;
      if (n > (e.data.bn ?? -1) && n < max) { e.data.bn = n; shoot(e, w, aimAngle(e, w, 0.8, 150), 150, { shape: 'bile' }); w.audio.play('snip', { x: e.x, vol: 0.5 }); }
      if (t > max * 0.24 + 0.3) { e.data.bn = -1; return true; }
      return false;
    }, recover: 0.35 },
  cross: { id: 'cross', weight: 2,
    run(e, w, t) {
      e.setAnim('open');
      if (t > 0.5 && !e.data.x) { e.data.x = true; ringShot(e, w, 8, 100, e.data.rot ? Math.PI / 8 : 0); e.data.rot = !e.data.rot; }
      if (t > 0.9) { e.data.x = false; return true; }
      return false;
    } },
};
function snipBrain(aggressive: boolean): BossBrain {
  return {
    idleTime: aggressive ? [0.7, 1.2] : [0.9, 1.5],
    sequence: aggressive ? [['dash', 'cut', 'dash'], ['dash', 'burst', 'cut', 'dash']] : [['burst', 'cross'], ['burst', 'dash', 'cross']],
    idle(e, w, dt) {
      const partner = w.enemies.find((x) => x !== e && x.isBoss && !x.dead && (x.def.id === 'snipA' || x.def.id === 'snipB'));
      const enraged = !partner;
      if (enraged && !e.data.enraged) {
        // alone now: one roar, then it fights with both pairs of moves
        e.data.enraged = true; e.data.phase = 1; e.data.seqI = 0; e.flash = 0.3;
        w.audio.play('bossRoar', { x: e.x, pitch: 1.4 }); w.shake(4); w.fx.ring(e.x, e.y - e.hitY, 6, 60, '#ff4050', 0.4);
        w.hud.toast(`${e.def.name} is alone, and furious.`, 1.8);
      }
      // taking turns: wait while the other one is winding up or attacking
      if (partner && (partner.state === 'attack' || partner.state === 'windup')) e.data.idleT = Math.max(e.data.idleT ?? 0, 0.35);
      if (aggressive) chase(e, w, enraged ? 70 : 45, dt); else keepDistance(e, w, 70, 130, enraged ? 70 : 50, dt);
      e.setAnim('walk'); e.animate(dt, enraged ? 14 : 9);
      if (enraged) e.data.idleT -= dt * 0.6;
    },
    attacks: Object.values(snipAttacks),
  };
}
function paintSnip(p: any, f: number, open: number, brass: boolean, n = 4): void {
  // a pair of old sewing shears walking on their finger loops: honed edges, a rusty pivot screw
  // that is also an eye, and nicks in the blades
  const ph = (f / n) * TAU;
  const blade = ramp('#c8ccd8'), handle = ramp(brass ? '#c89a3a' : '#9a2a3a');
  const cx = 18, cy = 20 + Math.round(Math.abs(Math.sin(ph)) * -1);
  const a = 0.18 + open * 0.5 + Math.sin(ph * 2) * 0.03;
  for (const side of [-1, 1]) {
    const tx = cx + side * (3 + Math.sin(a) * 16), ty = cy - 19;
    p.poly([cx - side * 1, cy + 1, cx + side * 3, cy - 1, tx, ty, tx - side * 2, ty + 1], side < 0 ? blade[3] : blade[2]);
    p.line(cx + side * 3, cy - 1, tx, ty, blade[4]);
    p.line(cx - side * 1, cy + 1, tx - side * 2, ty + 1, blade[1]);
    // a nick and a smear of something red near the tip
    const nx = cx + side * (1 + Math.sin(a) * 9), ny = cy - 10; p.set(nx, ny, blade[0]); p.set(tx - side, ty + 2, '#8a1a24');
  }
  const st = Math.sin(ph) * 2;
  // handles double as legs
  p.line(cx - 2, cy + 2, cx - 6, cy + 8, handle[1]); p.line(cx + 2, cy + 2, cx + 6, cy + 8, handle[1]);
  p.ring(cx - 7, cy + 11 + st * 0.5, 4.5, handle[2], 2.2); p.ring(cx + 7, cy + 11 - st * 0.5, 4.5, handle[2], 2.2);
  p.ring(cx - 7, cy + 11 + st * 0.5, 3.3, handle[3], 0.8); p.ring(cx + 7, cy + 11 - st * 0.5, 3.3, handle[1], 0.8);
  p.set(cx - 9, cy + 9 + st * 0.5, handle[4]); p.set(cx + 5, cy + 9 - st * 0.5, handle[4]);
  // pivot screw eye
  p.ball(cx, cy, 4.2, 4.2, ramp('#d8d0c0'));
  for (let i = 0; i < 4; i++) p.set(cx + Math.cos(i * 1.6) * 3.6, cy + Math.sin(i * 1.6) * 3.6, '#8a5a3a');
  bigEye(p, cx, cy, 2.6, Math.cos(ph) * 0.5, 0.2, brass ? '#3a8a3a' : '#b02a2a', { veins: '' });
}
const snipA: EnemyDef = {
  id: 'snipA', name: 'Snip', desc: '', boss: true, hp: 110, r: 9, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, gore: '#c8ccd8', goreDecal: '#5a1a24',
  sprites: () => ({ walk: frames(36, 38, 8, (p, f, n) => paintSnip(p, f, 0, false, n)), open: frames(36, 38, 1, (p) => paintSnip(p, 0, 1, false)) }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, snipBrainA); },
};
const snipB: EnemyDef = {
  id: 'snipB', name: 'Snap', desc: '', boss: true, hp: 110, r: 9, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, gore: '#c89a3a', goreDecal: '#5a1a24',
  sprites: () => ({ walk: frames(36, 38, 8, (p, f, n) => paintSnip(p, f, 0, true, n)), open: frames(36, 38, 1, (p) => paintSnip(p, 0, 1, true)) }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1.6; },
  update(e, w, dt) { bossUpdate(e, w, dt, snipBrainB); },
};
const snipBrainA = snipBrain(true), snipBrainB = snipBrain(false);
// A named stub so floor data / intros can refer to the pair.
const twinsnips: EnemyDef = { ...snipA, id: 'twinsnips', name: 'Twin Snips', desc: 'Grandmother\'s sewing scissors. They never did like each other.' };

export const BOSSES_A: EnemyDef[] = [grubmother, wardrobe, snipA, snipB, twinsnips];

void pack; void eye; void hex; void clamp; void dist; void randomFloorPoint; void distToPlayer; void (null as unknown as Enemy); void (null as unknown as World);
