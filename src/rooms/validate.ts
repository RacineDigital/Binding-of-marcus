// Rules every authored 15x9 room layout must follow (checked by the tests for every template):
//   - nine rows of fifteen known characters;
//   - each doorway and the cell inside it are open floor, and no enemy waits in a door mouth (three
//     wide, two deep), so walking in is never an unavoidable hit;
//   - every floor cell can be walked to from a door (sealed pockets only hold turrets or flyers);
//   - permanent obstacles (rocks, blocks, pillars) mostly hug the edges: at most 12 in the room's
//     core unless the layout is tagged 'centerpiece'.
import type { Template } from './templates';

export const W = 15, H = 9;
const KNOWN = new Set([...'.#@boiI^~fpkuwMFSWHTA']);
/** Cells nothing can walk through. */
const SOLID = new Set([...'#@bIofpku']);
const PERMANENT = new Set([...'#@bI']);
const FLOOR = (ch: string) => !SOLID.has(ch) && ch !== '^';

/** The cells in front of each door that must stay open. */
export function doorMouth(c: number, r: number): boolean {
  return (Math.abs(c - 7) <= 1 && (r <= 1 || r >= H - 2)) || (Math.abs(r - 4) <= 1 && (c <= 1 || c >= W - 2));
}
const inCore = (c: number, r: number) => c >= 3 && c <= 11 && r >= 2 && r <= 6;

export function validateTemplate(t: Template): string[] {
  const out: string[] = [];
  if (t.rows.length !== H) return [`${H} rows expected, got ${t.rows.length}`];
  t.rows.forEach((row, r) => { if (row.length !== W) out.push(`row ${r} is ${row.length} wide`); for (const ch of row) if (!KNOWN.has(ch)) out.push(`unknown character '${ch}' in row ${r}`); });
  if (out.length) return out;
  const at = (c: number, r: number) => t.rows[r][c];
  for (const [c, r] of [[7, 0], [7, 1], [7, H - 1], [7, H - 2], [0, 4], [1, 4], [W - 1, 4], [W - 2, 4]]) if (at(c, r) !== '.') out.push(`doorway blocked at ${c},${r} ('${at(c, r)}')`);
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (doorMouth(c, r) && /[MFSWHTA]/.test(at(c, r))) out.push(`enemy '${at(c, r)}' waits in a door mouth at ${c},${r}`);
  // reachability from the doors
  const seen = new Set<number>(), q: [number, number][] = [];
  for (const [c, r] of [[7, 0], [7, H - 1], [0, 4], [W - 1, 4]] as [number, number][]) if (FLOOR(at(c, r))) { seen.add(r * W + c); q.push([c, r]); }
  while (q.length) {
    const [c, r] = q.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= W || nr >= H || seen.has(nr * W + nc) || !FLOOR(at(nc, nr))) continue;
      seen.add(nr * W + nc); q.push([nc, nr]);
    }
  }
  let core = 0;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    const ch = at(c, r);
    if (PERMANENT.has(ch) && inCore(c, r)) core++;
    if (FLOOR(ch) && !seen.has(r * W + c) && ch !== 'T' && ch !== 'F') {
      // a sealed pocket is fine only if it holds a turret or a flyer (some layouts guard one)
      const pocketHasGuard = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => 'TF'.includes(t.rows[r + dr]?.[c + dc] ?? ''));
      if (!pocketHasGuard) out.push(`floor at ${c},${r} cannot be reached from a door`);
    }
  }
  if (core > 12 && !t.tags?.includes('centerpiece')) out.push(`${core} permanent obstacles in the core (12 allowed without 'centerpiece')`);
  if (!/[MFSWHTA]/.test(t.rows.join(''))) out.push('no enemy slots');
  return out;
}
