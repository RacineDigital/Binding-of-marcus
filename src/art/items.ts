// Item icon rendering cache.
import { PixelArt } from '../render/pixel';
import { getItem } from '../items/registry';
import { ramp } from '../render/color';
import { ICONS } from './itemicons';

const cache = new Map<string, HTMLCanvasElement>();
let unknown: HTMLCanvasElement | null = null;

export function itemIconArt(id: string): PixelArt {
  const p = new PixelArt(18, 18);
  const it = getItem(id);
  if (it) { try { (ICONS[id] ?? it.icon)(p); } catch (e) { console.error('icon failed', id, e); } }
  p.outline(undefined, false, 0.85);
  return p;
}
export function itemIconCanvas(id: string, blind = false): HTMLCanvasElement {
  if (blind) {
    if (!unknown) {
      // a plain, bold question mark (Blight of the Unread hides what's on the pedestal)
      const p = new PixelArt(18, 18);
      const Q = ['.xxxxx.', 'xx...xx', 'xx...xx', '.....xx', '....xx.', '...xx..', '...xx..', '.......', '...xx..', '...xx..'];
      Q.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'x') { p.set(5 + x, 3 + y, y < 2 ? '#f0e8ff' : '#c8b0ff'); } }));
      p.outline('#140c10');
      unknown = p.toCanvas();
    }
    return unknown;
  }
  let c = cache.get(id);
  if (!c) { c = itemIconArt(id).toCanvas(); cache.set(id, c); }
  return c;
}
