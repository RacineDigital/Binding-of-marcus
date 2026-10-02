// Room icons, drawn once at any size: the map uses them at three times the HUD's pixel density, and
// special doors wear a small version just above the doorway (a die over the Button Parlor, a
// pincushion over the Pincushion, a crown over the Curio).
import { PixelArt } from '../render/pixel';
import { ramp, hex } from '../render/color';
import { Sprite } from '../render/sprite';

/** Paint a room's icon into an S x S art, designed on a 24-unit grid. */
export function paintRoomIcon(p: PixelArt, kind: string, S: number): boolean {
  const k = S / 24, X = (v: number) => v * k;
  const ball = (x: number, y: number, rx: number, ry: number, c: string, o = {}) => p.ball(X(x), X(y), Math.max(0.6, X(rx)), Math.max(0.6, X(ry)), ramp(c), o);
  const line = (x0: number, y0: number, x1: number, y1: number, c: string, th = 1) => p.line(X(x0), X(y0), X(x1), X(y1), hex(c), Math.max(1, th * k));
  const tube = (x0: number, y0: number, x1: number, y1: number, r: number, c: string) => p.tube(X(x0), X(y0), X(x1), X(y1), Math.max(0.6, X(r)), ramp(c));
  const poly = (pts: number[], c: string) => p.poly(pts.map(X), hex(c));
  const rect = (x: number, y: number, w: number, h: number, c: string) => p.rect(Math.round(X(x)), Math.round(X(y)), Math.max(1, Math.round(X(w))), Math.max(1, Math.round(X(h))), hex(c));
  const dot = (x: number, y: number, c: string) => p.set(Math.round(X(x)), Math.round(X(y)), c);
  const question = (c: string) => {
    for (const [a, b] of [[[8, 8], [9, 5]], [[9, 5], [12, 3.5]], [[12, 3.5], [15, 5]], [[15, 5], [16, 8]], [[16, 8], [14.5, 11]], [[14.5, 11], [12, 13]], [[12, 13], [12, 16]]] as [number[], number[]][]) tube(a[0], a[1], b[0], b[1], 1.8, c);
    ball(12, 20, 2, 2, c);
  };
  switch (kind) {
    case 'treasure': // a crown
      poly([3, 19, 3, 8, 8, 13, 12, 5, 16, 13, 21, 8, 21, 19], '#e0b040');
      p.shadeV(X(3), X(5), X(18), X(14), ramp('#e0b040'), 0.4);
      rect(3, 16, 18, 3, '#a87a20'); rect(3, 16, 18, 1, '#ffe080');
      ball(12, 17.5, 1.7, 1.5, '#d02a3a'); ball(7, 17.5, 1.3, 1.3, '#3a8ad0'); ball(17, 17.5, 1.3, 1.3, '#3ad070');
      for (const [x, y] of [[3, 8], [12, 5], [21, 8]]) ball(x, y, 1.6, 1.6, '#ffe8a0');
      return true;
    case 'boss': // a skull
      ball(12, 10, 8.5, 8, '#e8e0cc', { dither: 0.3 });
      rect(7.5, 14, 9, 6, '#d8d0bc');
      ball(8.8, 10.5, 2.6, 2.8, '#1a0a10'); ball(15.2, 10.5, 2.6, 2.8, '#1a0a10');
      dot(9, 10.5, '#ff3040'); dot(15, 10.5, '#ff3040');
      poly([12, 13, 10.8, 15.5, 13.2, 15.5], '#2a1a1a');
      for (let x = 8.5; x < 16; x += 2.4) line(x, 17, x, 20, '#5a4a40');
      return true;
    case 'shop': // a button: the currency
      ball(12, 12, 9.5, 9.5, '#c8902a', { dither: 0.3 });
      p.ring(X(12), X(12), X(7), hex('#8a5a18'), Math.max(1, k));
      for (const [x, y] of [[9.5, 9.5], [14.5, 9.5], [9.5, 14.5], [14.5, 14.5]]) ball(x, y, 1.6, 1.6, '#3a2410');
      dot(7, 6.5, '#fff0c0');
      return true;
    case 'secret': question('#b8b0a0'); return true;
    case 'supersecret': question('#b090ff'); for (const [x, y] of [[4, 5], [20, 7], [19, 19]]) { dot(x, y, '#ffffff'); dot(x + 1, y, '#d8c8ff'); } return true;
    case 'challenge': // crossed swords
      for (const s of [1, -1]) {
        const x0 = s > 0 ? 5 : 19, x1 = s > 0 ? 20 : 4;
        tube(x0, 19, x1, 4, 1.2, '#d8dce8');
        line(x0 - s * 2, 15, x0 + s * 2, 19, '#c8a040', 2);
        tube(x0 - s * 1.2, 20.5, x0 - s * 2.6, 22, 1, '#7a4a2a');
      }
      return true;
    case 'sacrifice': // a pincushion
      ball(12, 15, 9, 6.5, '#c8283a', { dither: 0.3 });
      for (let x = 5; x < 20; x += 3) line(x, 11, x + 1, 19, '#9a1a2a');
      rect(8, 7.5, 8, 2.5, '#3a7a3a'); rect(11, 6, 2, 2, '#5ab05a');
      for (const [x0, y0, x1, y1, c] of [[7, 12, 4, 4, '#4a8ae0'], [12, 10, 12, 2, '#f0d040'], [17, 12, 20, 4, '#f0f0f0'], [9, 13, 7, 6, '#e05aa0']] as [number, number, number, number, string][]) {
        line(x0, y0, x1, y1, '#c8ccd8'); ball(x1, y1, 1.4, 1.4, c);
      }
      return true;
    case 'arcade': // a die
      rect(5, 5, 15, 15, '#9a948a'); rect(4, 4, 15, 15, '#f4efe4');
      p.shadeV(X(4), X(4), X(15), X(15), ramp('#f0ebe0'), 0.3);
      for (const [x, y] of [[7.5, 7.5], [15.5, 7.5], [11.5, 11.5], [7.5, 15.5], [15.5, 15.5]]) ball(x, y, 1.6, 1.6, '#1a1218');
      return true;
    case 'cursed': // a hex: an eye in a triangle
      poly([12, 2, 22.5, 21, 1.5, 21], '#6a2a9a'); poly([12, 6, 19, 18.5, 5, 18.5], '#2a1030');
      ball(12, 14, 4.5, 3, '#f0e8ff'); ball(12, 14, 2, 2.6, '#c070ff'); dot(12, 14, '#1a0a20');
      return true;
    case 'library': // an open book
      poly([12, 7, 2, 5, 2, 19, 12, 21], '#efe6d0'); poly([12, 7, 22, 5, 22, 19, 12, 21], '#ddd2b8');
      line(12, 7, 12, 21, '#6a3a2a', 1.4);
      for (let y = 9; y < 18; y += 2.4) { line(4, y - 0.6, 10, y + 0.4, '#7a6a5a'); line(14, y + 0.4, 20, y - 0.6, '#7a6a5a'); }
      rect(14, 3, 2, 6, '#c83a3a');
      return true;
    case 'miniboss': // claw marks
      for (let i = 0; i < 3; i++) { const x = 6 + i * 5; tube(x, 3 + i, x + 4, 20 - (2 - i), 1.4, '#d83a3a'); }
      return true;
    case 'event': // an exclamation
      tube(12, 3, 12, 14, 2.4, '#60d0c0'); ball(12, 19.5, 2.4, 2.4, '#60d0c0');
      return true;
    case 'deal': // an inkwell with a quill
      ball(12, 15.5, 7.5, 6, '#2a2650', { dither: 0.3 });
      rect(9.5, 6.5, 5, 4, '#2a2650'); rect(9, 5.5, 6, 2, '#6a4a2a');
      ball(9.5, 13.5, 1.5, 2, '#6a64b8');
      line(14, 6, 21, 1, '#efe6d0', 2); line(16, 4, 21, 2, '#ffffff');
      ball(12, 17, 2, 1.6, '#d82a3a');   // a red seal: it's a pact
      return true;
    case 'blessing': // a candle with a halo
      rect(9.5, 10, 5, 11, '#f0e8d0'); rect(9.5, 10, 2, 11, '#fffaf0'); rect(8, 20, 8, 2, '#c8b890');
      ball(12, 7, 2, 3, '#ffc040'); ball(12, 7.5, 1, 1.5, '#fff4c0');
      p.ring(X(12), X(4), X(5.5), hex('#ffe080'), Math.max(1, k * 0.8));
      return true;
    case 'echo': // a little ghost
      ball(12, 10, 7, 7, '#c8e0ff', { dither: 0.3 }); rect(5, 10, 14, 9, '#c8e0ff');
      for (const x of [5, 9.5, 14]) poly([x, 18, x + 5, 18, x + 2.5, 22], '#c8e0ff');
      ball(9.5, 10, 1.6, 2, '#1a2a3a'); ball(14.5, 10, 1.6, 2, '#1a2a3a');
      return true;
    case 'lostfound': // a luggage tag
      poly([6, 6, 20, 6, 20, 20, 6, 20, 3, 13], '#efe2c0'); p.shadeV(X(3), X(6), X(17), X(14), ramp('#e8dab8'), 0.3);
      ball(7, 13, 1.5, 1.5, '#5a4a32'); line(7, 13, 3, 4, '#c83a3a');
      line(10, 10, 18, 10, '#8a3a2a'); line(10, 13, 17, 13, '#5a4a32'); line(10, 16, 16, 16, '#5a4a32');
      return true;
  }
  return false;
}

const mapCache = new Map<string, HTMLCanvasElement | null>();
/** A map icon painted at exactly `px` screen pixels, so it stays crisp at any window size. */
export function mapIcon(kind: string, px = 24): HTMLCanvasElement | null {
  const key = kind + ':' + px;
  if (mapCache.has(key)) return mapCache.get(key)!;
  const p = new PixelArt(px, px);
  const ok = paintRoomIcon(p, kind, px - 2);
  let c: HTMLCanvasElement | null = null;
  if (ok) { const q = new PixelArt(px, px); q.stamp(p, 1, 1); q.outline('#0e0a12'); c = q.toCanvas(); }
  mapCache.set(key, c);
  return c;
}

const symCache = new Map<string, Sprite | null>();
/** The small symbol over a special door: the room's icon alone, outlined so it reads on any wall. */
export function doorSymbol(kind: string): Sprite | null {
  if (symCache.has(kind)) return symCache.get(kind)!;
  const S = 9, p = new PixelArt(S + 2, S + 2), ic = new PixelArt(S, S);
  let s: Sprite | null = null;
  if (paintRoomIcon(ic, kind, S)) { p.stamp(ic, 1, 1); p.outline('#0a0608'); s = new Sprite(p, Math.floor((S + 2) / 2), S + 2); }
  symCache.set(kind, s);
  return s;
}

