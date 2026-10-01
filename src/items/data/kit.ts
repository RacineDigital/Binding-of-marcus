// Icon painting kit and shared helpers for item definitions.
import { PixelArt } from '../../render/pixel';
import { ramp, hex } from '../../render/color';
import type { World } from '../../game/world';
import type { TempEffect } from '../../player/player';

export { ramp, hex };
export type P = PixelArt;

export const I = {
  bottle(p: P, liquid: string, glass = '#9ab8c8'): void {
    const g = ramp(glass), l = ramp(liquid);
    p.rect(7, 2, 4, 3, hex('#8a6a4a')); p.rect(7, 2, 4, 1, hex('#b89a70'));
    p.rect(8, 5, 2, 2, g[2]);
    p.ball(9, 11, 5, 5, g, { dither: 0.4 });
    p.ball(9, 12, 4, 3.5, l, { dither: 0.4 });
    p.set(6, 9, '#ffffff'); p.set(6, 10, g[4]);
  },
  jar(p: P, content: string, lid = '#8a6a4a'): void {
    const g = ramp('#9ab8c8'), c = ramp(content);
    p.rect(4, 5, 10, 11, g[1]); p.rect(5, 6, 8, 9, g[2]);
    p.rect(5, 9, 8, 6, c[2]); p.rect(5, 9, 8, 1, c[3]);
    p.rect(3, 3, 12, 3, hex(lid)); p.rect(3, 3, 12, 1, ramp(lid)[4]);
    p.set(5, 7, '#ffffff');
  },
  book(p: P, cover: string, mark?: (p: P) => void): void {
    const c = ramp(cover);
    p.rect(3, 3, 12, 13, c[2]); p.rect(3, 3, 2, 13, c[1]); p.rect(14, 4, 1, 12, hex('#e8dcc0'));
    p.rect(3, 15, 12, 1, c[0]); p.rect(5, 3, 9, 1, c[3]);
    p.rect(6, 6, 6, 1, hex('#c8a04a')); p.rect(6, 12, 6, 1, hex('#c8a04a'));
    mark?.(p);
  },
  gem(p: P, color: string, x = 9, y = 9, r = 4): void {
    const c = ramp(color);
    p.poly([x, y - r, x + r, y, x, y + r, x - r, y], c[2]);
    p.poly([x, y - r, x - r, y, x, y], c[3]); p.poly([x, y + r, x + r, y, x, y], c[1]);
    p.set(x - 1, y - r + 2, '#ffffff');
  },
  heart(p: P, color: string, x = 9, y = 9, s = 1): void {
    const c = ramp(color);
    p.ball(x - 2.5 * s, y - 2 * s, 3 * s, 3 * s, c); p.ball(x + 2.5 * s, y - 2 * s, 3 * s, 3 * s, c);
    p.poly([x - 5.5 * s, y - 1.5 * s, x + 5.5 * s, y - 1.5 * s, x, y + 5 * s], c[2]);
    p.set(x - 3 * s, y - 3 * s, c[4]);
  },
  drop(p: P, color: string, x = 9, y = 10, r = 4): void {
    const c = ramp(color);
    p.ball(x, y + 1, r, r, c); p.poly([x - r * 0.8, y, x, y - r * 1.8, x + r * 0.8, y], c[2]);
    p.set(x - 1, y - 1, '#ffffff');
  },
  ring(p: P, color: string, gem?: string): void {
    const c = ramp(color);
    p.ring(9, 10, 5, c[2], 2); p.ring(9, 10, 5, c[3], 1);
    if (gem) I.gem(p, gem, 9, 4, 2.5);
  },
  shard(p: P, color: string): void { const c = ramp(color); p.poly([5, 15, 8, 2, 14, 7, 11, 16], c[2]); p.line(8, 3, 10, 14, c[4]); },
  coin(p: P, color: string, x = 9, y = 9, r = 5): void { const c = ramp(color); p.ball(x, y, r, r, c); p.ring(x, y, r - 1.5, c[1]); },
};

/** Keep a temporary effect active only while cond holds. */
export function conditional(w: World, id: string, cond: boolean, eff: Omit<TempEffect, 'id'>): void {
  const pl = w.player;
  const has = pl.temp.some((t) => t.id === id);
  if (cond && !has) pl.addTemp({ id, ...eff });
  else if (!cond && has) pl.clearTemp((t) => t.id === id);
}
/** Per-item counters stored on the run. */
export function counter(w: World, id: string, add = 1): number {
  const f = w.run.flags; f['c_' + id] = (f['c_' + id] ?? 0) + add; return f['c_' + id];
}
