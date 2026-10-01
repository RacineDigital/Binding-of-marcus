// Chapter VII enemies: the torn page and what leaks through.
import type { EnemyDef } from './enemy';
import { frames, ramp, hex, glowEye, eye, sprinkle } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, distToPlayer, randomFloorPoint } from './ai';
import { TAU, angleTo, clamp, dist2 } from '../core/math';
import { telegraph } from '../bosses/boss';

function blotDef(id: string, big: boolean): EnemyDef {
  const r = big ? 9 : 5;
  return {
    id, name: big ? 'Blot' : 'Blotlet', desc: big ? 'A walking ink stain. Leaves puddles; splits when popped.' : '', hp: big ? 20 : 7, r, speed: big ? 34 : 60, role: big ? 'melee' : 'swarm', cost: big ? 1.6 : 0.5, hitY: r,
    gore: '#1a1830', goreDecal: '#0e0c1c',
    sprites: () => ({
      idle: frames(r * 2 + 10, r * 2 + 10, 4, (p, f) => {
        const c = ramp('#26234a');
        const cx = r + 5, cy = r + 5;
        const wob = Math.sin((f / 4) * TAU);
        p.ball(cx, cy, r + wob, r - wob * 0.5, c, { dither: 0.7 });
        for (let i = 0; i < (big ? 5 : 3); i++) { const a = (i / (big ? 5 : 3)) * TAU + f * 0.3; p.ball(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, 2, 2, c); }
        eye(p, cx - r * 0.35, cy - 1, big ? 2.2 : 1.4, 0, 0, '#1a1830', '#f2f0ff'); eye(p, cx + r * 0.35, cy - 1, big ? 2.2 : 1.4, 0, 0, '#1a1830', '#f2f0ff');
      }, r * 2 + 6),
    }),
    init(e) { e.anim = 'idle'; e.data.cr = 0; },
    update(e, w, dt) {
      chase(e, w, e.def.speed, dt); e.animate(dt, 7);
      if (big) { e.data.cr -= dt; if (e.data.cr <= 0) { e.data.cr = 0.5; w.addCreep(e.x, e.y, 10, 'enemy', 1, 3, '#14122a'); } }
    },
    onDeath(e, w) { if (!big) return; for (const s of [-1, 1]) { const k = w.spawnEnemy('blotlet', e.x + s * 6, e.y, true); if (k) { k.spawnT = 0.05; k.kvx = s * 140; k.parent = e; } } },
  };
}

const voideye: EnemyDef = {
  id: 'voideye', name: 'Void Eye', desc: 'Opens a rift, blinks to a new spot, and fires in a cross.', hp: 16, r: 8, speed: 0, flying: true, role: 'shooter', cost: 1.8, hitY: 14,
  gore: '#6a3ad0', light: [40, '#8a5aff'],
  sprites: () => ({
    idle: frames(22, 22, 2, (p, f) => {
      const v = ramp('#2a1a4a');
      p.ball(11, 11, 10, 8, v, { dither: 0.9 });
      p.ball(11, 11, 7, 5 - f, ramp('#e8e0f0'));
      p.ball(11, 11, 3, 3 - f * 0.5, ramp('#8a3ad0')); p.set(11, 11, '#0a0412');
      p.set(8, 9, '#ffffff');
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; p.set(11 + Math.cos(a) * 10, 11 + Math.sin(a) * 8, '#8a5aff'); }
    }),
  }),
  init(e) { e.cd = 1.5; },
  update(e, w, dt) {
    e.z = 10 + Math.sin(e.t * 3) * 2;
    e.animate(dt, 2);
    if (e.state === 'idle') {
      e.alpha = Math.min(1, e.alpha + dt * 3); e.invuln = false;
      e.cd -= dt;
      if (e.cd <= 0) {
        const plus = Math.random() < 0.5;
        ringShot(e, w, 4, 120, plus ? 0 : Math.PI / 4, { shape: 'dark', r: 4 });
        if (w.run.floorIndex >= 6) ringShot(e, w, 4, 80, plus ? Math.PI / 4 : 0, { shape: 'dark', r: 3 });
        w.audio.play('zap', { x: e.x, vol: 0.4 });
        e.setState('blink');
      }
    } else if (e.state === 'blink') {
      e.alpha = Math.max(0, 1 - e.st * 3);
      if (e.st > 0.35) { e.invuln = true; }
      if (e.st > 0.5 && !e.data.t) { const p = randomFloorPoint(w, 80); e.data.t = p; telegraph(w, p.x, p.y, 10, 0.6, '#8a5aff'); }
      if (e.st > 1.1) { e.x = e.data.t.x; e.y = e.data.t.y; e.data.t = null; e.setState('idle'); e.cd = 1.4 + Math.random(); e.alpha = 0.2; }
    }
  },
};

const pagewraith: EnemyDef = {
  id: 'pagewraith', name: 'Page Wraith', desc: 'A spirit of torn pages. Its shots bend as they fly.', hp: 16, r: 7, speed: 45, flying: true, role: 'flyer', cost: 1.7, hitY: 14,
  gore: '#e6dcc0',
  sprites: () => ({
    idle: frames(22, 26, 4, (p, f) => {
      const pg = ramp('#e6dcc0');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + f * 0.4; const x = 11 + Math.cos(a) * 6, y = 13 + Math.sin(a) * 7;
        p.poly([x - 3, y - 3, x + 3, y - 2, x + 2, y + 4, x - 3, y + 3], pg[2 + (i % 2)]);
        p.line(x - 2, y, x + 1, y, hex('#5a4a3a'));
      }
      p.ball(11, 10, 3.5, 4, ramp('#1a1420'));
      glowEye(p, 10, 10, '#c8b0ff'); p.set(12, 10, '#c8b0ff');
    }),
  }),
  init(e) { e.cd = 1.5 + Math.random(); },
  update(e, w, dt) {
    const a = angleTo(e.x, e.y, w.player.x, w.player.y) + Math.sin(e.t * 1.2 + e.id) * 1.4;
    e.move(w, Math.cos(a) * e.def.speed * e.spd() * dt, Math.sin(a) * e.def.speed * e.spd() * dt);
    e.z = 8 + Math.sin(e.t * 2) * 2; e.animate(dt, 5);
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = 2 + Math.random(); const base = aimAngle(e, w); for (const s of [-1, 1]) shoot(e, w, base - s * 0.7, 110, { curve: s * 1.3, shape: 'holy', r: 3.5, range: 320 }); w.audio.play('pageGet', { x: e.x, vol: 0.5 }); }
  },
};

const mirrorshade: EnemyDef = {
  id: 'mirrorshade', name: 'Mirror Shade', desc: 'Your reflection, inverted. It moves when you move and shoots when you shoot.', hp: 22, r: 6, speed: 0, role: 'special', cost: 2, hitY: 14,
  gore: '#3a3458',
  sprites: () => ({ idle: frames(22, 30, 1, () => {}) }),
  init(e) { e.cd = 0; },
  update(e, w, dt) {
    const room = w.room, pl = w.player;
    const cx = room.ox + room.cols * 12;
    const tx = 2 * cx - pl.x, ty = pl.y;
    const a = angleTo(e.x, e.y, tx, ty), d = Math.sqrt(dist2(e.x, e.y, tx, ty));
    const s = Math.min(d * 6, 130) * e.spd();
    e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
    e.cd -= dt;
    if (pl.aiming && e.cd <= 0) { e.cd = 0.9; const ang = Math.PI - pl.aimAng; shoot(e, w, ang, 140, { shape: 'dark', r: 3.5 }); }
  },
  draw(e, ctx, w, sx, sy) {
    const s = w.player.spr;
    ctx.save(); ctx.globalAlpha = 0.85;
    const flash = e.flash > 0 ? 1 : 0;
    s.body.down[0].draw(ctx, sx, sy, { flip: true, tint: '#2a2050', tintAmt: 0.75, flash });
    s.head.down.normal.draw(ctx, sx, sy - 10, { flip: true, tint: '#2a2050', tintAmt: 0.75, flash });
    ctx.restore();
    w.r.addGlow(sx, sy - 12, 14, '#6a50d0', 0.2);
  },
};

const hollowmaw: EnemyDef = {
  contact: 2, id: 'hollowmaw', name: 'Hollow Maw', desc: 'A hole in the page that breathes in. Don\'t let it pull you close.', hp: 30, r: 12, speed: 0, role: 'turret', cost: 2, hitY: 3, mass: 99, noKnock: true, noSeparate: true,
  gore: '#14122a', goreDecal: '#0e0c1c',
  sprites: () => ({
    idle: frames(34, 22, 2, (p, f) => {
      p.ellipse(17, 11, 15, 9, hex('#0a0814'));
      p.ellipse(17, 11, 12, 7, hex('#000000'));
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; p.set(17 + Math.cos(a) * (13 - (i % 2)), 11 + Math.sin(a) * (8 - (i % 2)), i % 2 ? '#e8e0d0' : '#8a7cff'); }
      if (f) sprinkle(p, '#6a5ad0', 6, 9, 8, 6, 18, 10);
    }, 14),
  }),
  init(e) { e.cd = 2; },
  update(e, w, dt) {
    e.animate(dt, 3);
    const pl = w.player;
    const d = Math.sqrt(dist2(e.x, e.y, pl.x, pl.y));
    if (d < 130 && !pl.flight) {
      const k = (1 - d / 130) * 55 * dt;
      const a = angleTo(pl.x, pl.y, e.x, e.y);
      pl.x += Math.cos(a) * k; pl.y += Math.sin(a) * k;
      if (Math.random() < dt * 10) w.fx.burst(pl.x + (Math.random() - 0.5) * 30, pl.y, 2, 1, '#6a5ad0', 20, 0.4, 1, 0);
    }
    e.cd -= dt;
    if (e.cd <= 0) { e.cd = 2.8; ringShot(e, w, 8, 85, Math.random(), { shape: 'dark', r: 3.5, range: 200 }); w.audio.play('bossSpit', { x: e.x, vol: 0.4, pitch: 0.7 }); }
  },
};

export const HOLLOW_ENEMIES: EnemyDef[] = [blotDef('blot', true), blotDef('blotlet', false), voideye, pagewraith, mirrorshade, hollowmaw];
void spreadShot; void distToPlayer; void clamp;
