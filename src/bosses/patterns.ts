// A library of bullet patterns every boss can draw on once it's hurt. Each boss is dealt its own
// pair (picked from its id, so it always fights the same way) in its own shot, on top of the attacks
// it was written with. Every pattern leaves a way through: a gap, a lane, a beat to move in.
import type { Enemy } from '../enemies/enemy';
import type { World } from '../game/world';
import type { BossAttack } from './boss';
import { shoot, aimAngle } from '../enemies/ai';
import { telegraph } from './boss';
import { TAU, angleTo } from '../core/math';
import { TILE } from '../core/constants';

type Opts = Parameters<typeof shoot>[4];
type Pattern = (shape: string) => BossAttack;
const ph = (e: Enemy) => (e.data.tier ?? 0) as number;
/** Fire everything due between the last frame and now on a fixed beat. */
function beats(e: Enemy, key: string, t: number, every: number, until: number, fire: (i: number) => void): void {
  e.data[key] ??= 0;
  while (e.data[key] * every <= Math.min(t, until)) { fire(e.data[key]); e.data[key]++; }
}
const done = (e: Enemy, keys: string[]) => { for (const k of keys) delete e.data[k]; return true; };

export const PATTERNS: Record<string, Pattern> = {
  // two arms of shots unwinding from the boss, mirrored
  spiral: (shape) => ({ id: 'pt_spiral', weight: 1.6, cooldown: 6,
    run(e, w, t) {
      const n = ph(e) >= 2 ? 3 : 2, spin = e.data.pt_dir ??= Math.random() < 0.5 ? 1 : -1;
      beats(e, 'pt_k', t, 0.085, 1.9, (i) => { for (let a = 0; a < n; a++) shoot(e, w, i * 0.31 * spin + (a / n) * TAU, 88, { shape, r: 3.5 }); });
      if (t > 2.1) return done(e, ['pt_k', 'pt_dir']);
      return false;
    } }),
  // fans aimed at you, each one faster than the last
  volley: (shape) => ({ id: 'pt_volley', weight: 2, cooldown: 3,
    run(e, w, t) {
      beats(e, 'pt_k', t, 0.34, 1.05, (i) => {
        const n = ph(e) >= 2 ? 7 : 5, a = aimAngle(e, w, 0.5, 130);
        for (let k = 0; k < n; k++) shoot(e, w, a + (k - (n - 1) / 2) * 0.17, 115 + i * 18, { shape, r: 3.5 });
        w.audio.play('bossSpit', { x: e.x, pitch: 1 + i * 0.1, vol: 0.5 });
      });
      if (t > 1.3) return done(e, ['pt_k']);
      return false;
    } }),
  // four turning streams, a cross that sweeps the room
  cross: (shape) => ({ id: 'pt_cross', weight: 1.4, cooldown: 7,
    run(e, w, t) {
      const rot = (e.data.pt_dir ??= Math.random() < 0.5 ? 1 : -1) * 1.1;
      beats(e, 'pt_k', t, 0.11, 2.2, (i) => { for (let a = 0; a < 4; a++) shoot(e, w, i * 0.11 * rot + (a / 4) * TAU, 100, { shape, r: 3.5 }); });
      if (t > 2.4) return done(e, ['pt_k', 'pt_dir']);
      return false;
    } }),
  // a ring bursts out of a stamp on the floor; slip through the gap, then the next one
  shockwave: (shape) => ({ id: 'pt_shock', weight: 1.6, cooldown: 5,
    start(e, w) { telegraph(w, e.x, e.y, 34, 0.55, '#ff6040'); },
    run(e, w, t) {
      beats(e, 'pt_k', t - 0.55, 0.42, ph(e) >= 2 ? 0.84 : 0.42, (i) => {
        const n = 30, gapAt = aimAngle(e, w) + (i % 2 ? 1.2 : -1.2) + (Math.random() - 0.5) * 0.6;
        for (let k = 0; k < n; k++) { const a = (k / n) * TAU; if (Math.abs(((a - gapAt + Math.PI * 3) % TAU) - Math.PI) < 0.36) continue; shoot(e, w, a, 92, { shape, r: 3.6 }); }
        w.shake(4); w.audio.play('boomSmall', { x: e.x, vol: 0.6 });
      });
      if (t > 1.5) return done(e, ['pt_k']);
      return false;
    } }),
  // marked spots around you, then something falls on each one
  rain: (shape) => ({ id: 'pt_rain', weight: 1.5, cooldown: 6,
    run(e, w, t) {
      if (!e.data.pt_r) {
        e.data.pt_r = true;
        const pl = w.player, n = 7 + ph(e) * 3;
        for (let i = 0; i < n; i++) {
          const x = pl.x + (Math.random() - 0.5) * 140, y = pl.y + (Math.random() - 0.5) * 90;
          if (!inside(w, x, y)) continue;
          const d = 0.5 + i * 0.08;
          telegraph(w, x, y, 9, d, '#ff9040');
          w.after(i * 0.08, () => { if (!e.dead) w.proj.enemy(x, y, 0, 0, { drop: 130, r: 5, shape }); });
        }
      }
      if (t > 1.6) return done(e, ['pt_r']);
      return false;
    } }),
  // a wall of shots crosses the room with one opening, then another with the opening moved
  wall: (shape) => ({ id: 'pt_wall', weight: 1.4, cooldown: 7,
    run(e, w, t) {
      beats(e, 'pt_k', t, 0.85, ph(e) >= 2 ? 1.7 : 0.85, () => {
        const room = w.room, fromLeft = Math.random() < 0.5, x = fromLeft ? room.ox + 14 : room.ox + room.cols * TILE - 14;
        const top = room.oy + 12, bot = room.oy + room.rows * TILE - 12, gapY = w.player.y + (Math.random() - 0.5) * 60;
        for (let y = top; y < bot; y += 11) if (Math.abs(y - gapY) > 20) w.proj.enemy(x, y, fromLeft ? 0 : Math.PI, 70, { shape, r: 3.8, range: room.cols * TILE });
        w.audio.play('rumble', { x, vol: 0.5 });
      });
      if (t > 2) return done(e, ['pt_k']);
      return false;
    } }),
  // slow seekers that give up after a while
  seekers: (shape) => ({ id: 'pt_seek', weight: 1.2, cooldown: 8,
    run(e, w, t) {
      beats(e, 'pt_k', t, 0.18, 0.18 * (4 + ph(e)), (i) => shoot(e, w, (i / 5) * TAU + t, 55, { shape, r: 4.5, homing: 1.4, life: 3.2 }));
      if (t > 1.4) return done(e, ['pt_k']);
      return false;
    } }),
  // two curving streams that close in on you like pincers
  pincer: (shape) => ({ id: 'pt_pincer', weight: 1.5, cooldown: 5,
    run(e, w, t) {
      beats(e, 'pt_k', t, 0.07, 0.9, () => { const a = aimAngle(e, w); for (const s of [-1, 1]) shoot(e, w, a + s * 0.9, 120, { shape, r: 3.4, curve: -s * 1.5 }); });
      if (t > 1.2) return done(e, ['pt_k']);
      return false;
    } }),
  // a ring that ricochets off the walls
  bounce: (shape) => ({ id: 'pt_bounce', weight: 1.2, cooldown: 7,
    run(e, w, t) {
      beats(e, 'pt_k', t, 0.6, ph(e) >= 2 ? 0.6 : 0, (i) => { const off = Math.random(); for (let k = 0; k < 10; k++) shoot(e, w, off + (k / 10) * TAU, 105, { shape, r: 3.6, bounce: 2, range: 700 }); void i; });
      if (t > 1) return done(e, ['pt_k']);
      return false;
    } }),
  // lobbed shells that burst where they land
  shells: (shape) => ({ id: 'pt_shells', weight: 1.3, cooldown: 6,
    run(e, w, t) {
      beats(e, 'pt_k', t, 0.22, 0.22 * (3 + ph(e)), () => {
        const a = aimAngle(e, w) + (Math.random() - 0.5) * 0.9, d = 60 + Math.random() * 90;
        shoot(e, w, a, d * 1.1, { shape, r: 4.5, lob: true, lobH: 46, split: 6, splitSpd: 90 });
      });
      if (t > 1.5) return done(e, ['pt_k']);
      return false;
    } }),
};
function inside(w: World, x: number, y: number): boolean {
  const r = w.room; return x > r.ox + 12 && x < r.ox + r.cols * TILE - 12 && y > r.oy + 12 && y < r.oy + r.rows * TILE - 12;
}

/** Each boss's own shot, so its extra patterns look like they belong to it. */
const SHAPES: Record<string, string> = {
  grubmother: 'bile', wardrobe: 'dark', snipA: 'needle', snipB: 'needle', twinsnips: 'needle', furnaceheart: 'ember', oldstoker: 'ember',
  ratking: 'bile', ratprince: 'bile', bilgemaw: 'water', matron: 'holy', sleepwalker: 'dark', ossuaryknight: 'bone', mothmother: 'spore',
  bellringer: 'holy', choirmaster: 'holy', blottedman: 'inkE', blottedhalf: 'inkE', unbound: 'inkE', itremembers: 'dark', thornwife: 'spore',
  rimebride: 'water', pendulum: 'dark', typesetter: 'inkE', bookbinder: 'inkE', ironlung: 'water', patient: 'water',
};
export const shapeFor = (id: string) => SHAPES[id] ?? 'dark';

function hashOf(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** The patterns a boss is dealt: two once it's hurt, a third for its last phase. */
export function patternsFor(id: string): string[] {
  const names = Object.keys(PATTERNS), h = hashOf(id), out: string[] = [];
  for (let k = 0; out.length < 3; k++) { const n = names[(h + k * 7 + Math.floor(h / 97) * k) % names.length]; if (!out.includes(n)) out.push(n); }
  return out;
}
void angleTo;
