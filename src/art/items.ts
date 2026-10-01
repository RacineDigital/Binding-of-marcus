// Item icon rendering cache.
import { PixelArt } from '../render/pixel';
import { getItem } from '../items/registry';
import { ramp } from '../render/color';

const cache = new Map<string, HTMLCanvasElement>();
let unknown: HTMLCanvasElement | null = null;

export function itemIconArt(id: string): PixelArt {
  const p = new PixelArt(18, 18);
  const it = getItem(id);
  if (it) { try { it.icon(p); } catch (e) { console.error('icon failed', id, e); } }
  p.outline(undefined, false, 0.85);
  return p;
}
export function itemIconCanvas(id: string, blind = false): HTMLCanvasElement {
  if (blind) {
    if (!unknown) {
      const p = new PixelArt(18, 18);
      const c = ramp('#d8d0c0');
      p.ring(9, 6, 4, c[3], 2); p.rect(9, 9, 2, 4, c[3]); p.rect(9, 14, 2, 2, c[3]);
      p.clear(5, 7); p.clear(5, 8); p.clear(6, 8);
      p.outline('#140c10');
      unknown = p.toCanvas();
    }
    return unknown;
  }
  let c = cache.get(id);
  if (!c) { c = itemIconArt(id).toCanvas(); cache.set(id, c); }
  return c;
}
