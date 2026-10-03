// Chapter I bosses.
import type { EnemyDef, Enemy } from '../enemies/enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle, pack, crack, grain, bigEye, maw } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, keepDistance, randomFloorPoint, distToPlayer } from '../enemies/ai';
import { bossUpdate, BossBrain, BossAttack, telegraph } from './boss';
import { rig, drawRigged } from './rig';
import * as G from './art_a';
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
const grubmother: EnemyDef = {
  id: 'grubmother', name: 'The Grubmother', desc: 'She has been eating the foundations for years. The surveyor said it was damp.', boss: true,
  hp: 210, r: 16, speed: 30, role: 'boss', cost: 0, hitY: 14, mass: 8, gore: '#c8a080', goreDecal: '#6a4a38', noKnock: true, noSeparate: false,
  sprites: () => rig({ w: 64, h: 56, paint: G.paintGrub, phases: 1,
    // her own pose: reared up, mouth opening (0) and turned inside out mid-spray (1)
    extra: { rear: [{ lean: -1, jaw: 0.45, squash: -0.05 }, { lean: -1, jaw: 1, squash: -0.1 }] } }),
  init(e) { e.anim = 'idle'; e.data.idleT = 1.2; },
  update(e, w, dt) { bossUpdate(e, w, dt, grubBrain); },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) {
      // dirt mound
      ctx.fillStyle = '#3a2e24'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 14, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.ellipse(sx, sy - 4, 10, 4, 0, 0, TAU); ctx.fill();
      return;
    }
    drawRigged(e, ctx, w, sx, sy + 1);
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
const wardrobe: EnemyDef = {
  id: 'wardrobe', name: 'The Wardrobe', desc: 'Grandmother hid the presents in it. Marcus was sure there was a man inside. There was. Its doors are solid; hit it while they\'re open.', boss: true,
  hp: 205, r: 15, speed: 0, role: 'boss', cost: 0, hitY: 22, mass: 10, gore: '#6a4028', goreDecal: '#3a2418', noKnock: true,
  sprites: () => rig({ w: 54, h: 68, paint: G.paintWardrobe, phases: 1, aliases: { closed: 'idle' },
    extra: {
      // rocking on its feet before a charge, doors cracking open
      tilt: [{ lean: -0.4, squash: 0.06, x: { tilt: 1, open: 0.12 } }],
      // the doors: parting (0), then flung wide, jaws gaping (1)
      open: [{ x: { open: 0.5 }, jaw: 0.4 }, { x: { open: 1 }, jaw: 1, lean: 0.2 }],
    } }),
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
const snipA: EnemyDef = {
  id: 'snipA', name: 'Snip', desc: '', boss: true, hp: 110, r: 9, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, gore: '#c8ccd8', goreDecal: '#5a1a24',
  sprites: () => rig({ w: 38, h: 42, paint: (p, s) => G.paintSnip(p, s, false), phases: 1, aliases: { walk: 'move' }, extra: { open: [{ x: { open: 1 }, jaw: 1, lean: -0.3 }] } }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1; },
  update(e, w, dt) { bossUpdate(e, w, dt, snipBrainA); },
};
const snipB: EnemyDef = {
  id: 'snipB', name: 'Snap', desc: '', boss: true, hp: 110, r: 9, speed: 0, role: 'boss', cost: 0, hitY: 10, mass: 4, gore: '#c89a3a', goreDecal: '#5a1a24',
  sprites: () => rig({ w: 38, h: 42, paint: (p, s) => G.paintSnip(p, s, true), phases: 1, aliases: { walk: 'move' }, extra: { open: [{ x: { open: 1 }, jaw: 1, lean: -0.3 }] } }),
  init(e) { e.anim = 'walk'; e.data.idleT = 1.6; },
  update(e, w, dt) { bossUpdate(e, w, dt, snipBrainB); },
};
const snipBrainA = snipBrain(true), snipBrainB = snipBrain(false);
// A named stub so floor data / intros can refer to the pair.
const twinsnips: EnemyDef = { ...snipA, id: 'twinsnips', name: 'Twin Snips', desc: 'Grandmother\'s sewing scissors. They never did like each other.' };

export const BOSSES_A: EnemyDef[] = [grubmother, wardrobe, snipA, snipB, twinsnips];

void pack; void eye; void hex; void clamp; void dist; void randomFloorPoint; void distToPlayer; void (null as unknown as Enemy); void (null as unknown as World);
