// Packed colors are 0xAABBGGRR (little-endian ImageData Uint32 layout).
export type Col = number;
const cache = new Map<string, Col>();
export function hex(h: string, a = 255): Col {
  const key = h + a;
  const c = cache.get(key);
  if (c !== undefined) return c;
  let s = h.replace('#', '');
  if (s.length === 3) s = s.split('').map((ch) => ch + ch).join('');
  const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
  const v = ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  cache.set(key, v);
  return v;
}
export function pack(r: number, g: number, b: number, a = 255): Col {
  return ((a << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}
export const R = (c: Col) => c & 255;
export const G = (c: Col) => (c >>> 8) & 255;
export const B = (c: Col) => (c >>> 16) & 255;
export const A = (c: Col) => (c >>> 24) & 255;
export function toCss(c: Col, alphaMul = 1): string {
  return `rgba(${R(c)},${G(c)},${B(c)},${((A(c) / 255) * alphaMul).toFixed(3)})`;
}
export function mix(a: Col, b: Col, t: number): Col {
  return pack(R(a) + (R(b) - R(a)) * t, G(a) + (G(b) - G(a)) * t, B(a) + (B(b) - B(a)) * t, A(a) + (A(b) - A(a)) * t);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
function shiftHue(h: number, target: number, amt: number): number {
  let d = target - h;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  return h + d * amt;
}
/** Hue-shifted 5-step color ramp: [deep shadow, shadow, base, light, highlight]. */
export function ramp(base: string): Col[] {
  const c = hex(base);
  const [h, s, l] = rgbToHsl(R(c), G(c), B(c));
  const steps = [-0.5, -0.25, 0, 0.18, 0.34];
  return steps.map((st) => {
    if (st === 0) return c;
    const dark = st < 0;
    const nh = dark ? shiftHue(h, 255, Math.abs(st) * 0.55) : shiftHue(h, 55, st * 0.45);
    const ns = Math.min(1, Math.max(0, s * (dark ? 1 + Math.abs(st) * 0.3 : 1 - st * 0.35)));
    const nl = Math.min(0.97, Math.max(0.03, dark ? l * (1 + st * 1.25) : l + (1 - l) * st * 1.1));
    const [r, g, b] = hslToRgb(nh, ns, nl);
    return pack(r, g, b);
  });
}
export function darken(c: Col, amt: number): Col {
  const [h, s, l] = rgbToHsl(R(c), G(c), B(c));
  const [r, g, b] = hslToRgb(shiftHue(h, 260, amt * 0.4), Math.min(1, s * (1 + amt * 0.2)), l * (1 - amt));
  return pack(r, g, b, A(c));
}
export function lighten(c: Col, amt: number): Col {
  const [h, s, l] = rgbToHsl(R(c), G(c), B(c));
  const [r, g, b] = hslToRgb(shiftHue(h, 55, amt * 0.3), s * (1 - amt * 0.2), l + (1 - l) * amt);
  return pack(r, g, b, A(c));
}
