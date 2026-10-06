// Baked material accents: stable between animation frames, with no per-frame rendering cost.
import { PixelArt } from '../render/pixel';
import { A, R, G, B, mix, hex } from '../render/color';

export type Material = 'flesh' | 'cloth' | 'metal' | 'bone' | 'wood' | 'ink';
const groups: [Material, RegExp][] = [
  ['metal', /pillbug|valve|stoker|furnace|pipe|grate|knight|snip|snap|typesetter|ironlung/],
  ['cloth', /rag|moth|sheet|orderly|nurse|matron|sleepwalker|choir|penitent|wraith|bride|unwritten|author|patient|echo/],
  ['bone', /ossuary|skull|marrow|rat/],
  ['wood', /wardrobe|spool|nest|mimic|pendulum|unbound|remembers|bookbinder|page/],
  ['ink', /mite|drip|sludge|blot|void|hollow/],
];
export function materialFor(id: string): Material { return groups.find(([, re]) => re.test(id))?.[0] ?? 'flesh'; }
const brightness = (v: number) => (R(v) * 0.3 + G(v) * 0.59 + B(v) * 0.11) / 255;

/** Keep outlines, bright eyes, mouths, alpha and the original silhouette intact. */
export function finishMaterial(p: PixelArt, material: Material): PixelArt {
  const src = p.data.slice(), at = (x: number, y: number) => x >= 0 && y >= 0 && x < p.w && y < p.h ? src[y * p.w + x] : 0;
  const warm = hex('#f8d9b6'), cold = hex('#b5e2ec'), shadow = hex('#160d22');
  for (let y = 1; y < p.h - 1; y++) for (let x = 1; x < p.w - 1; x++) {
    const v = at(x, y), l = brightness(v);
    if (A(v) !== 255 || l < 0.13 || l > 0.84) continue;
    // Feature boundaries stay clean; accents only occupy solid body clusters.
    if ([at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)].some(n => A(n) < 255 || brightness(n) < 0.09)) continue;
    let out = v;
    const top = brightness(at(x, y - 1)), bottom = brightness(at(x, y + 1));
    if (l > top + 0.06 && l > bottom + 0.025) out = mix(out, material === 'metal' || material === 'ink' ? cold : warm, 0.14);
    if (material === 'metal' && (x + y * 2) % 17 === 0 && l > 0.3) {
      out = mix(out, cold, 0.36); p.paint(x + 1, y, mix(v, shadow, 0.3));
    } else if (material === 'cloth' && x % 4 === 1 && y % 5 < 2) out = mix(out, shadow, 0.18);
    else if (material === 'wood' && (x + Math.floor(y / 7)) % 6 === 1) out = mix(out, shadow, 0.22);
    else if (material === 'bone' && (x * 3 + Math.floor(y / 3)) % 19 === 0) out = mix(out, shadow, 0.28);
    else if (material === 'flesh' && (x * 7 + y * 3) % 31 < 2) out = mix(out, hex('#722d45'), 0.28);
    else if (material === 'ink' && (x + y) % 11 === 0 && l > 0.28) out = mix(out, cold, 0.25);
    p.set(x, y, out);
  }
  return p;
}
