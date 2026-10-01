// Hand-authored pixel art: sprites written as rows of palette characters.
import { PixelArt } from '../render/pixel';

export type Palette = Record<string, string>;

/** Build a PixelArt from rows of palette keys ('.' and ' ' are transparent). */
export function grid(rows: string[], pal: Palette, name = 'sprite'): PixelArt {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const p = new PixelArt(w, h);
  rows.forEach((row, y) => {
    if (row.length !== w) console.warn(`grid ${name}: row ${y} is ${row.length} wide, expected ${w}`);
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch];
      if (c === undefined) { console.warn(`grid ${name}: unknown key '${ch}' at ${x},${y}`); continue; }
      p.set(x, y, c);
    }
  });
  return p;
}

/** Stamp a grid on top of an existing PixelArt at (ox, oy). */
export function stampGrid(p: PixelArt, rows: string[], pal: Palette, ox: number, oy: number): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch]; if (c !== undefined) p.set(ox + x, oy + y, c);
    }
  });
}

/** Swap palette keys in a set of rows (cheap recolours / variants). */
export function swapKeys(rows: string[], map: Record<string, string>): string[] {
  return rows.map((r) => [...r].map((ch) => map[ch] ?? ch).join(''));
}
