// Chapter III enemies: rats, leeches, bloated things and sludge.
import type { EnemyDef, Enemy } from './enemy';
import { frames, eye, teeth, ramp, hex, legs, glowEye, sprinkle } from '../art/creature';
import { chase, aimAngle, shoot, spreadShot, ringShot, hasLOS, distToPlayer, wander } from './ai';
import { TAU, angleTo, clamp } from '../core/math';
import { telegraph } from '../bosses/boss';
import type { World } from '../game/world';

const rat: EnemyDef = {
  id: 'rat', name: 'Sewer Rat', desc: 'Darts in bursts. Comes in packs.', hp: 5, r: 5, speed: 95, role: 'swarm', cost: 0.5, hitY: 5,
  gore: '#5a3a3a',
  sprites: () => ({
    run: frames(18, 12, 4, (p, f) => {
      const c = ramp('#6a5a5a');
      p.ball(8, 7, 5.5, 3.6, c, { dither: 0.6 }); p.ball(13, 6, 3, 2.6, c);
      p.ball(12, 4, 1.4, 1.4, ramp('#c89a9a')); p.set(15, 6, '#e04040');
      p.line(3, 7, 0, 5 + (f % 2) * 2, hex('#c89a9a'));
      const st = [0, 1, 0, -1][f];
      p.set(6 + st, 10, c[0]); p.set(10 - st, 10, c[0]); p.set(16, 7, '#f0e0d0');
    }),
  }),
  init(e) { e.anim = 'run'; e.cd = Math.random(); },
  update(e, w, dt) {
    e.cd -= dt;
    if (e.cd < 0) { e.data.go = !e.data.go; e.cd = e.data.go ? 0.6 + Math.random() * 0.5 : 0.25 + Math.random() * 0.3; e.data.off = (Math.random() - 0.5) * 1.2; }
    if (e.data.go) {
      const a = angleTo(e.x, e.y, w.player.x, w.player.y) + (e.data.off ?? 0) + (e.fear > 0 ? Math.PI : 0);
      const s = e.def.speed * e.spd();
      e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt); e.flip = Math.cos(a) < 0; e.animate(dt, 16);
    }
  },
};

const leech: EnemyDef = {
  id: 'leech', name: 'Bilge Leech', desc: 'A ripple in the floor that follows you. When it bulges, step away.', hp: 12, r: 6, speed: 60, role: 'melee', cost: 1.3, hitY: 8, ghost: true,
  gore: '#3a2a3a',
  sprites: () => ({
    up: frames(18, 22, 2, (p, f) => {
      const c = ramp('#4a3a4a');
      p.tube(9, 21, 9, 6 - f, 4.5, c);
      p.ball(9, 5 - f, 4, 3.5, c);
      p.ball(9, 4 - f, 2.5, 2, ramp('#1a0a10')); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; p.set(9 + Math.cos(a) * 2.4, 4 - f + Math.sin(a) * 2, '#e8d8d0'); }
      for (let y = 9; y < 20; y += 3) p.line(5, y, 13, y, c[1]);
    }),
  }),
  init(e) { e.hidden = true; e.invuln = true; e.cd = 0.5; },
  update(e, w, dt) {
    if (e.state === 'idle') {
      const a = angleTo(e.x, e.y, w.player.x, w.player.y);
      const s = e.def.speed * e.spd();
      e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
      if (Math.random() < dt * 8) w.fx.ring(e.x, e.y, 2, 9, 'rgba(120,150,160,0.5)', 0.4, false);
      if (distToPlayer(e, w) < 34 && e.st > 1) { e.setState('bulge'); telegraph(w, e.x, e.y, 13, 0.45, '#a0c0d0'); }
    } else if (e.state === 'bulge') {
      if (e.st > 0.45) { e.hidden = false; e.invuln = false; e.setState('up'); e.anim = 'up'; w.audio.play('splash', { x: e.x }); w.fx.spray(e.x, e.y, 2, -Math.PI / 2, 2, 10, '#5a7a8a', 70, 0.4); }
    } else if (e.state === 'up') {
      e.frame = Math.floor(e.st * 6) % 2;
      if (e.st > 0.4 && !e.data.s && w.run.floorIndex >= 3) { e.data.s = true; ringShot(e, w, 6, 90); }
      if (e.st > 1.3) { e.hidden = true; e.invuln = true; e.data.s = false; e.setState('idle'); }
    }
  },
  draw(e, ctx, w, sx, sy) {
    if (e.hidden) {
      ctx.strokeStyle = 'rgba(140,170,180,0.45)'; ctx.lineWidth = 1;
      const k = e.state === 'bulge' ? 1 + Math.sin(e.st * 40) * 0.3 : 1;
      ctx.beginPath(); ctx.ellipse(sx, sy, 7 * k, 3 * k, 0, 0, TAU); ctx.stroke();
      return;
    }
    e.sprites.up[e.frame % 2].draw(ctx, sx, sy + 1, { flash: e.flash > 0 ? 1 : 0, sx: e.sx, sy: e.sy });
  },
};

const bloater: EnemyDef = {
  id: 'bloater', name: 'Bloater', desc: 'Slow and swollen. It bursts when it dies — keep your distance.', hp: 20, r: 10, speed: 22, role: 'heavy', cost: 1.6, hitY: 12, mass: 3,
  gore: '#6a8a3a', goreDecal: '#3a4a1a',
  sprites: () => ({
    walk: frames(26, 28, 4, (p, f) => {
      const c = ramp('#8a9a6a'), v = ramp('#5a6a4a');
      const b = Math.sin((f / 4) * TAU) * 0.8;
      p.rect(9, 23, 3, 4, v[1]); p.rect(15, 23, 3, 4, v[1]);
      p.ball(13, 15, 10 + b, 10 - b * 0.5, c, { dither: 0.7 });
      for (const [x, y] of [[8, 12], [17, 10], [12, 20], [19, 17]]) { p.ball(x, y, 1.8, 1.8, ramp('#b8b06a')); }
      p.line(6, 15, 11, 18, v[0]); p.line(16, 8, 20, 13, v[0]);
      p.ball(13, 8, 4.5, 4, ramp('#a8a88a'));
      p.set(11, 8, '#1a1a10'); p.set(15, 8, '#1a1a10'); p.rect(12, 10, 3, 1, hex('#3a2a1a'));
    }),
  }),
  init(e) { e.anim = 'walk'; },
  update(e, w, dt) { chase(e, w, e.def.speed, dt); e.animate(dt, 5); },
  onDeath(e, w) {
    ringShot(e, w, 10, 100, Math.random(), { shape: 'spore', r: 3.5, range: 200 });
    w.addCreep(e.x, e.y, 18, 'enemy', 1, 4, '#5a7a2a');
    w.fx.smoke(e.x, e.y, 10, 'rgba(110,140,60,', 8, 1.2, 8);
    w.audio.play('erupt', { x: e.x, vol: 0.6 });
  },
};

const grateeye: EnemyDef = {
  id: 'grateeye', name: 'Grate Eye', desc: 'Watches from under an iron grate. Only vulnerable while its lid is open.', hp: 14, r: 9, speed: 0, role: 'turret', cost: 1.5, hitY: 4, mass: 99, noKnock: true,
  gore: '#c8c0b0', contact: 0, noSeparate: true,
  sprites: () => ({
    idle: frames(24, 16, 3, (p, f) => {
      const ir = ramp('#4a4448');
      p.rect(1, 2, 22, 13, ir[1]); p.rect(2, 3, 20, 11, hex('#0a0808'));
      if (f > 0) { p.ball(12, 8.5, 6, f === 1 ? 2.5 : 4.5, ramp('#e8e0d0')); p.ball(12, 8.5, 2.5, f === 1 ? 1.5 : 2.5, ramp('#c83a3a')); p.set(12, 8, '#0a0a0a'); }
      for (let x = 4; x < 22; x += 4) p.rect(x, 3, 1, 11, ir[3]);
      p.rect(1, 2, 22, 1, ir[3]);
    }, 15),
  }),
  init(e) { e.invuln = true; e.cd = 1 + Math.random(); },
  update(e, w, dt) {
    e.cd -= dt;
    if (e.state === 'idle') { e.frame = 0; e.invuln = true; if (e.cd <= 0 && distToPlayer(e, w) < 230) { e.setState('open'); w.audio.play('creak', { x: e.x, vol: 0.3 }); } }
    else if (e.state === 'open') {
      e.frame = e.st < 0.25 ? 1 : 2; e.invuln = false;
      const n = Math.floor((e.st - 0.5) / 0.18);
      if (e.st > 0.5 && n > (e.data.n ?? -1) && n < 3) { e.data.n = n; shoot(e, w, aimAngle(e, w, 0.6, 140), 140); w.audio.play('spit', { x: e.x, vol: 0.4 }); }
      if (e.st > 1.6) { e.setState('idle'); e.cd = 1.8 + Math.random(); e.data.n = -1; }
    }
  },
};

function sludgeDef(id: string, size: number, next: string | null): EnemyDef {
  const r = 4 + size * 3;
  return {
    id, name: 'Sludge', desc: 'Splits when it dies. And again.', hp: 6 + size * 6, r, speed: 30 + (3 - size) * 14, role: size === 3 ? 'melee' : 'swarm', cost: size === 3 ? 1.6 : 0.5, hitY: r,
    gore: '#5a6a3a', goreDecal: '#3a4a22',
    sprites: () => ({
      idle: frames(r * 2 + 8, r * 2 + 8, 4, (p, f) => {
        const c = ramp('#6a7a4a');
        const wob = Math.sin((f / 4) * TAU) * 0.8;
        const cx = r + 4, cy = r + 4;
        // body slumps wider at the base
        p.ball(cx, cy + 1, r + wob, r * 0.85 - wob * 0.6, c, { dither: 0.8 });
        p.ball(cx, cy + r * 0.55, r * 1.15, r * 0.4, c, { dither: 0.8 });
        // drips running down
        for (let i = 0; i < size + 1; i++) { const x = cx - r * 0.7 + i * (r * 1.4 / Math.max(1, size)); p.tube(x, cy + r * 0.5, x, cy + r * 0.95 + ((i + f) % 2), 1, c); }
        // bubbles
        p.ring(cx + r * 0.4, cy - r * 0.45, Math.max(1, size * 0.7), c[4]);
        p.set(cx - r * 0.55, cy - r * 0.5, c[4]); p.set(cx - r * 0.5, cy - r * 0.55, '#e8f0c0');
        // face
        if (size >= 2) {
          eye(p, Math.round(cx - r * 0.35), Math.round(cy - 2), size === 3 ? 2 : 1.4, 0, 0.4, '#3a3010', '#e0e090');
          eye(p, Math.round(cx + r * 0.3), Math.round(cy - 1), size === 3 ? 1.6 : 1.2, 0, 0.4, '#3a3010', '#e0e090');
          p.line(cx - r * 0.35, cy + r * 0.3, cx + r * 0.3, cy + r * 0.25 + wob * 0.5, c[0]);
          if (size === 3) for (let x = -2; x <= 2; x += 2) p.set(cx + x, cy + r * 0.3, '#d8d0a0');
        } else { p.set(cx - 1, cy - 1, '#e0e090'); p.set(cx + 1, cy - 1, '#e0e090'); }
      }, r * 2 + 4),
    }),
    init(e) { e.anim = 'idle'; },
    update(e, w, dt) { chase(e, w, e.def.speed * (0.6 + Math.max(0, Math.sin(e.t * 4)) * 0.8), dt); e.animate(dt, 6); },
    onDeath(e, w) {
      if (!next) return;
      for (const s of [-1, 1]) {
        const k = w.spawnEnemy(next, e.x + s * r * 0.6, e.y, true);
        if (k) { k.spawnT = 0.05; k.kvx = s * 120; k.parent = e; }
      }
    },
  };
}

const drowner: EnemyDef = {
  id: 'drowner', name: 'Drowned One', desc: 'Circles you at a distance, raising a hand before each shot.', hp: 14, r: 7, speed: 55, flying: true, role: 'shooter', cost: 1.6, hitY: 13,
  gore: '#4a6a7a',
  sprites: () => {
    const paint = (p: any, f: number, raise: boolean) => {
      const c = ramp('#5a7a8a'), h = ramp('#2a3a4a');
      p.poly([5, 26, 8, 12, 14, 12, 17, 26, 14, 23 + (f % 2), 11, 26, 8, 23 - (f % 2)], c[2]);
      p.shadeV(5, 12, 12, 14, c, 0.8);
      p.ball(11, 9, 5, 5.5, ramp('#8aa0a8'));
      p.ball(11, 6, 6, 4, h); p.line(6, 7, 5, 13, h[2]); p.line(16, 7, 17, 13, h[2]);
      p.set(9, 10, '#0a1418'); p.set(13, 10, '#0a1418');
      if (raise) { p.line(16, 14, 20, 6, c[3]); p.ball(20, 5, 1.6, 1.6, ramp('#8aa0a8')); }
      else p.line(15, 15, 18, 19, c[3]);
    };
    return { idle: frames(22, 28, 2, (p, f) => paint(p, f, false)), raise: frames(22, 28, 1, (p) => paint(p, 0, true)) };
  },
  init(e) { e.data.a = Math.random() * TAU; e.data.dir = Math.random() < 0.5 ? 1 : -1; e.cd = 1.5 + Math.random(); e.anim = 'idle'; },
  update(e, w, dt) {
    e.data.a += dt * 0.9 * e.data.dir;
    const R = 95;
    const tx = w.player.x + Math.cos(e.data.a) * R, ty = w.player.y + Math.sin(e.data.a) * R * 0.75;
    const a = angleTo(e.x, e.y, tx, ty);
    const s = e.def.speed * e.spd();
    const h = e.move(w, Math.cos(a) * s * dt, Math.sin(a) * s * dt);
    if (h.hx || h.hy) e.data.dir *= -1;
    e.z = 3 + Math.sin(e.t * 2) * 2;
    e.flip = w.player.x < e.x;
    e.cd -= dt;
    if (e.cd < 0.5) e.setAnim('raise'); else { e.setAnim('idle'); e.animate(dt, 3); }
    if (e.cd <= 0) { e.cd = 2 + Math.random(); spreadShot(e, w, w.run.floorIndex >= 4 ? 3 : 1, aimAngle(e, w, 0.5, 130), 0.3, 130, { shape: 'water' }); w.audio.play('splash', { x: e.x, vol: 0.4 }); }
  },
};

export const UNDER_ENEMIES: EnemyDef[] = [rat, leech, bloater, grateeye, sludgeDef('sludge', 3, 'sludge2'), sludgeDef('sludge2', 2, 'sludge3'), sludgeDef('sludge3', 1, null), drowner];
void eye; void teeth; void legs; void sprinkle; void hasLOS; void wander; void telegraph; void (null as unknown as Enemy); void (null as unknown as World);
