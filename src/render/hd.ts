// Bigger, more detailed enemies from the same art: each sprite is doubled with a pixel-art-aware
// upscale (Scale2x: diagonals come out clean instead of blocky), then given what the small version
// had no room for: a top light catching its upper edges, shadow pooling underneath, and a fine
// texture across its body.
import { PixelArt } from './pixel';
import { mix, pack, R, G, B, A, Col } from './color';

const WHITE = pack(255, 248, 230), DARK = pack(10, 6, 14);

/** Scale2x (EPX): doubles a sprite, rounding off stair-stepped diagonals. */
function scale2x(s: PixelArt): PixelArt {
  const out = new PixelArt(s.w * 2, s.h * 2);
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
    const P = s.get(x, y), a = s.get(x, y - 1), b = s.get(x + 1, y), c = s.get(x - 1, y), d = s.get(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (c === a && c !== d && a !== b) e0 = a;
    if (a === b && a !== c && b !== d) e1 = b;
    if (d === c && d !== b && c !== a) e2 = c;
    if (b === d && b !== a && d !== c) e3 = d;
    const o = out.data, w = out.w, X = x * 2, Y = y * 2;
    o[Y * w + X] = e0; o[Y * w + X + 1] = e1; o[(Y + 1) * w + X] = e2; o[(Y + 1) * w + X + 1] = e3;
  }
  return out;
}
const lum = (c: Col) => (R(c) * 0.3 + G(c) * 0.59 + B(c) * 0.11) / 255;
const isEdge = (c: Col) => A(c) > 0 && lum(c) < 0.09;   // the dark outline

/** The doubled, detailed version of a sprite. */
export function detailed(src: PixelArt): PixelArt {
  const p = scale2x(src), w = p.w, h = p.h, d = p.data, o = d.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = d[y * w + x];
    if (!A(c) || isEdge(c)) continue;
    const up = y > 0 ? d[(y - 1) * w + x] : 0, up2 = y > 1 ? d[(y - 2) * w + x] : 0, dn = y < h - 1 ? d[(y + 1) * w + x] : 0, dn2 = y < h - 2 ? d[(y + 2) * w + x] : 0;
    const lf = x > 0 ? d[y * w + x - 1] : 0;
    let v = c;
    // light from above-left: the first body pixels under the top outline catch it
    if (!A(up) || isEdge(up)) v = mix(v, WHITE, 0.22);
    else if (!A(up2) || isEdge(up2)) v = mix(v, WHITE, 0.1);
    else if (!A(lf) || isEdge(lf)) v = mix(v, WHITE, 0.08);
    // shadow pooling along the underside
    if (!A(dn) || isEdge(dn)) v = mix(v, DARK, 0.26);
    else if (!A(dn2) || isEdge(dn2)) v = mix(v, DARK, 0.12);
    // a fine texture over the body (skin, cloth, wax), strongest in the mid-tones
    const l = lum(c);
    if ((x + y * 3) % 4 === 0 && l > 0.15 && l < 0.85) v = mix(v, DARK, 0.07);
    o[y * w + x] = v;
  }
  p.data = o;
  return p;
}
