import { PixelArt } from '../render/pixel';
import { ramp } from '../render/color';
import { Sprite } from '../render/sprite';

export const SHOT_COLORS: Record<string, string> = {
  ink: '#4450c8', needle: '#c8ccd8', fire: '#f07a28', bone: '#e0d6c0', wax: '#eadcb0', spark: '#6ad0ff', page: '#efe8d6',
  blood: '#a01e2a', moth: '#a89a8a', star: '#f0d050', void: '#6a3ad0', beer: '#8a5a20',
  // enemy palettes
  bile: '#d23a3a', spore: '#7ab83a', ember: '#f08a2a', dark: '#7a3ab0', water: '#3a9ad0', holy: '#f0e0a0', inkE: '#2a2448',
};
/** Sam's Beer: brown creep that fizzes away into white foam. */
export const BEER = '#7a4a1a';
const cache = new Map<string, Sprite>();
export function shotSprite(shape: string, r: number, tint: string | null): Sprite {
  r = Math.max(1, Math.min(16, Math.round(r)));
  const key = shape + r + (tint ?? '');
  let s = cache.get(key);
  if (s) return s;
  const base = tint ?? SHOT_COLORS[shape] ?? SHOT_COLORS.ink;
  const rm = ramp(base);
  const d = r * 2 + 3;
  const p = new PixelArt(d, d);
  const c = d / 2;
  p.ball(c, c, r, r, rm, { dither: 0.3, bias: shape === 'ink' ? -0.05 : 0.05 });
  if (r >= 2) {
    p.set(Math.floor(c - r * 0.45), Math.floor(c - r * 0.45), '#ffffff');
    if (r >= 4) p.set(Math.floor(c - r * 0.45) + 1, Math.floor(c - r * 0.45), rm[4]);
  }
  if (shape === 'bone') { p.paint(c + 1, c + 1, rm[1]); p.paint(c - 1, c + 2, rm[1]); }
  if (shape === 'void' || shape === 'dark') p.paint(c, c, '#1a0a2a');
  if (shape === 'spore') { p.paint(c + 1, c, rm[4]); p.paint(c - 1, c + 1, rm[0]); }
  // a head of foam on top of the brown
  if (shape === 'beer' && r >= 2) for (let x = -r + 1; x < r; x++) { p.paint(c + x, c - r + 1, '#f4f0e4'); if ((x & 1) === 0) p.paint(c + x, c - r + 2, '#e8e0cc'); }
  p.outline(undefined, false, 0.75);
  s = new Sprite(p, Math.floor(d / 2), Math.floor(d / 2));
  cache.set(key, s);
  return s;
}
export const GLOW_SHAPES = new Set(['fire', 'spark', 'star', 'void', 'ember', 'holy', 'dark']);
