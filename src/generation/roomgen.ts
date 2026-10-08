// Procedural room layouts. Produces 15x9 rows in the same character format as the handmade
// templates (see rooms/templates.ts), so generated and authored rooms go through the same
// stamping, path carving and enemy casting. Layouts are built from a few features painted on
// one half or quarter of the room and mirrored, which keeps them readable and fair.
import { RNG } from '../core/rng';
import type { FloorTheme } from '../data/floors';
import type { Template } from '../rooms/templates';

const W = 15, H = 9;
type Grid = string[][];

const blank = (): Grid => Array.from({ length: H }, () => Array(W).fill('.'));
const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < W && r < H;
/** Cells in front of the four doors stay open. */
function nearDoor(c: number, r: number): boolean {
  return (Math.abs(c - 7) <= 1 && (r <= 1 || r >= H - 2)) || (Math.abs(r - 4) <= 1 && (c <= 1 || c >= W - 2));
}
function put(g: Grid, c: number, r: number, ch: string): void { if (inside(c, r) && !nearDoor(c, r)) g[r][c] = ch; }

type Feature = (g: Grid, rng: RNG, th: FloorTheme, half: { c1: number; r1: number }) => void;

const rockCh = (rng: RNG) => (rng.chance(0.12) ? '@' : '#');

const FEATURES: Record<string, Feature> = {
  // rock clusters grow out of the walls and corners, not the middle of the floor
  clusters: (g, rng, _th, h) => {
    for (let k = rng.int(1, 3); k > 0; k--) {
      const edge = rng.int(0, 2);
      let c = edge === 0 ? rng.int(0, 1) : rng.int(1, h.c1), r = edge === 1 ? rng.int(0, 1) : edge === 2 ? H - 1 - rng.int(0, 1) : rng.int(1, h.r1);
      for (let n = rng.int(2, 5); n > 0; n--) {
        put(g, c, r, rockCh(rng));
        if (rng.chance(0.5)) c += rng.chance(0.5) ? 1 : -1; else r += rng.chance(0.5) ? 1 : -1;
        c = Math.max(0, Math.min(h.c1, c)); r = Math.max(0, Math.min(H - 1, r));
        // keep to a band two cells deep along the walls
        if (c > 2 && r > 1 && r < H - 2) { if (c > r) r = rng.chance(0.5) ? 1 : H - 2; else c = 2; }
      }
    }
  },
  pillars: (g, rng, _th, h) => {
    const ch = rng.chance(0.5) ? 'I' : 'b';
    const step = rng.int(2, 3);
    for (let r = 2; r <= h.r1; r += step) for (let c = 2; c <= h.c1; c += step + 1) if (rng.chance(0.7)) put(g, c, r, ch);
  },
  lake: (g, rng, _th, h) => {
    const cx = rng.int(3, Math.max(3, h.c1 - 1)), cy = rng.int(2, Math.max(2, h.r1 - 1));
    const rx = rng.float(1.5, 3.2), ry = rng.float(1.2, 2.2);
    for (let r = 0; r <= h.r1; r++) for (let c = 0; c <= h.c1; c++) if (((c - cx) / rx) ** 2 + ((r - cy) / ry) ** 2 <= 1) put(g, c, r, 'o');
  },
  // a short spur of rock reaching in from a wall: cover with a way round it
  wall: (g, rng, _th, h) => {
    if (rng.chance(0.5)) { const r = rng.chance(0.5) ? rng.int(1, 2) : rng.int(H - 3, H - 2); const c0 = rng.int(0, 1), c1 = Math.min(h.c1, c0 + rng.int(2, 4)); for (let c = c0; c <= c1; c++) put(g, c, r, rng.chance(0.15) ? 'b' : rockCh(rng)); }
    else { const c = rng.int(2, Math.min(5, h.c1)); const top = rng.chance(0.5), len = rng.int(2, 3); for (let i = 0; i < len; i++) put(g, c, top ? i : H - 1 - i, rockCh(rng)); }
  },
  ring: (g, rng) => {
    const cx = 7, cy = 4, rx = rng.chance(0.5) ? 3 : 4, ry = 2;
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const d = ((c - cx) / rx) ** 2 + ((r - cy) / ry) ** 2;
      if (d > 0.7 && d < 1.45 && !(c === cx || r === cy)) put(g, c, r, rng.chance(0.2) ? 'b' : rockCh(rng));
    }
  },
  fires: (g, rng, th, h) => {
    if (th.hazards.fires < 0.2) return;
    for (let k = rng.int(1, 2); k > 0; k--) put(g, rng.int(1, h.c1), rng.int(1, h.r1), 'f');
  },
  spikes: (g, rng, th, h) => {
    if (th.hazards.spikes < 0.15) return;
    const c = rng.int(2, h.c1), r = rng.int(1, h.r1), timed = rng.chance(0.4);
    for (let dc = 0; dc < rng.int(1, 3); dc++) for (let dr = 0; dr < rng.int(1, 2); dr++) put(g, c + dc, r + dr, timed ? '~' : '^');
  },
  clutter: (g, rng, th, h) => {
    for (let k = rng.int(1, 3); k > 0; k--) {
      const roll = rng.next();
      const ch = roll < 0.35 ? 'p' : roll < 0.6 ? 'u' : roll < 0.6 + th.hazards.kegs * 0.6 ? 'k' : '#';
      put(g, rng.int(1, h.c1), rng.int(1, h.r1), ch);
    }
  },
  webs: (g, rng, th, h) => {
    if (!th.hazards.webs) return;
    for (let k = rng.int(2, 4); k > 0; k--) put(g, rng.int(1, h.c1), rng.int(1, h.r1), 'w');
  },
  corridor: (g, rng) => {
    // two long rock rows leaving a central lane
    const r1 = rng.chance(0.5) ? 2 : 1, r2 = H - 1 - r1;
    for (let c = 2; c < W - 2; c++) if (c % 4 !== 3) { put(g, c, r1, rockCh(rng)); put(g, c, r2, rockCh(rng)); }
  },
};

const FEATURE_WEIGHTS: [string, number][] = [
  ['clusters', 3], ['pillars', 1.4], ['lake', 1.2], ['wall', 2], ['ring', 0.7], ['fires', 1.2], ['spikes', 1], ['clutter', 2], ['webs', 0.8], ['corridor', 0.5],
];

/** Mirror the left half (and optionally the top half) across the room. */
function mirror(g: Grid, h: boolean, v: boolean): void {
  if (h) for (let r = 0; r < H; r++) for (let c = 0; c < 7; c++) if (g[r][c] !== '.') g[r][W - 1 - c] = g[r][c];
  if (v) for (let r = 0; r < 4; r++) for (let c = 0; c < W; c++) if (g[r][c] !== '.') g[H - 1 - r][c] = g[r][c];
}

const ROLES: [string, number][] = [['M', 3], ['F', 2.2], ['S', 1.6], ['H', 0.8], ['T', 0.7], ['W', 0.8], ['A', 2]];

/** Generate a 15x9 layout with enemy slots. */
export function generateLayout(rng: RNG, th: FloorTheme, floorIndex: number): string[] {
  return generateTemplate(rng, th, floorIndex).rows;
}

const SOLID = '#@bIofpku';
const inCore = (c: number, r: number) => c >= 3 && c <= 11 && r >= 2 && r <= 6;

/** Floor cells no door can walk to become part of whatever walls them in. */
function fillPockets(g: Grid): void {
  const seen = new Set<number>(), q: [number, number][] = [];
  for (const [c, r] of [[7, 0], [7, H - 1], [0, 4], [W - 1, 4]] as [number, number][]) { seen.add(r * W + c); q.push([c, r]); }
  while (q.length) {
    const [c, r] = q.pop()!;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (!inside(nc, nr) || seen.has(nr * W + nc) || SOLID.includes(g[nr][nc]) || g[nr][nc] === '^') continue;
      seen.add(nr * W + nc); q.push([nc, nr]);
    }
  }
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (seen.has(r * W + c) || SOLID.includes(g[r][c]) || g[r][c] === '^') continue;
    const wall = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dc, dr]) => g[r + dr]?.[c + dc]).find((ch) => ch && '#@bIo'.includes(ch));
    g[r][c] = wall ?? '#';
  }
}

/** Generate a layout as a template (tagged 'centerpiece' when it is built round a ring or pillars). */
export function generateTemplate(rng: RNG, th: FloorTheme, floorIndex: number): Template {
  const g = blank();
  const sym = rng.next();
  const hSym = sym < 0.82, vSym = sym < 0.35;
  const half = { c1: hSym ? 6 : W - 2, r1: vSym ? 3 : H - 2 };
  const n = rng.int(1, 3) + (floorIndex >= 3 && rng.chance(0.4) ? 1 : 0);
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const f = rng.weighted(FEATURE_WEIGHTS.filter(([k]) => !used.has(k) || k === 'clusters'), (x) => x[1]);
    if (!f) break;
    used.add(f[0]);
    FEATURES[f[0]](g, rng, th, half);
  }
  mirror(g, hSym, vSym);
  // movement lanes: no permanent obstacle or pit on the cross between the four doors (breakable
  // props may stand there: they read as props and can be shot away)
  for (let c = 0; c < W; c++) if ('#@bIo'.includes(g[4][c])) g[4][c] = '.';
  for (let r = 0; r < H; r++) if ('#@bIo'.includes(g[r][7])) g[r][7] = '.';
  // obstacle budget: thin out overly dense layouts
  const cells: [number, number][] = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (g[r][c] !== '.') cells.push([c, r]);
  while (cells.length > 40) { const [c, r] = cells.splice(rng.int(0, cells.length - 1), 1)[0]; g[r][c] = '.'; }
  fillPockets(g);
  // permanent obstacles keep to the edges unless the room is built round a centrepiece
  const centerpiece = used.has('ring') || used.has('pillars');
  if (!centerpiece) {
    const core: [number, number][] = [];
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) if (inCore(c, r) && '#@bI'.includes(g[r][c])) core.push([c, r]);
    while (core.length > 12) { const [c, r] = core.splice(rng.int(0, core.length - 1), 1)[0]; g[r][c] = '.'; }
  }
  // enemy slots on free floor, away from the doors, spread out
  const free: [number, number][] = [];
  for (let r = 1; r < H - 1; r++) for (let c = 1; c < W - 1; c++) {
    if (g[r][c] !== '.' || nearDoor(c, r)) continue;
    if (Math.abs(c - 7) + Math.abs(r - 4) <= 1) continue;
    free.push([c, r]);
  }
  const slots = rng.int(3, 5) + Math.min(2, Math.floor(floorIndex / 3));
  const placed: [number, number][] = [];
  for (let tries = 0; tries < 80 && placed.length < slots && free.length; tries++) {
    const [c, r] = free[rng.int(0, free.length - 1)];
    if (placed.some(([pc, pr]) => Math.abs(pc - c) + Math.abs(pr - r) < 3)) continue;
    const role = rng.weighted(ROLES, (x) => x[1])![0];
    g[r][c] = role; placed.push([c, r]);
    // symmetric rooms get symmetric enemies
    if (hSym && c !== 7 && placed.length < slots && g[r][W - 1 - c] === '.') { g[r][W - 1 - c] = role; placed.push([W - 1 - c, r]); }
  }
  return { name: 'generated', rows: g.map((row) => row.join('')), tags: centerpiece ? ['centerpiece'] : [] };
}
