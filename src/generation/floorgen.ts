// Seeded floor generation: builds a room graph on a hidden 13x13 grid, assigns special rooms,
// hides secret rooms and connects doors that line up between neighbouring cells.
import { RNG } from '../core/rng';
import { MAP_SIZE } from '../core/constants';
import { RoomData, RoomType, Side, DoorKind, opposite } from '../rooms/room';
import { FLOORS, FloorTheme, FINAL_FLOOR, CHAPTER_POOL, familyOf, chapterLabel } from '../data/floors';
import type { Run, Floor } from '../game/run';
import { populateRoom } from './populate';
import type { SaveManager } from '../save/save';

const DIRS: [number, number, Side][] = [[0, -1, Side.N], [1, 0, Side.E], [0, 1, Side.S], [-1, 0, Side.W]];
const CURSES = ['dark', 'lost', 'unknown', 'maze'];
export const CURSE_NAMES: Record<string, string> = {
  dark: 'Blight of the Unlit', lost: 'Blight of the Unmapped', unknown: 'Blight of the Unread', maze: 'Blight of the Crooked Hall', seen: 'Blessing of Sight',
};

interface Ctx { rng: RNG; map: Int16Array; rooms: RoomData[]; seed: string; fi: number }

function inb(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < MAP_SIZE && y < MAP_SIZE; }
function at(c: Ctx, x: number, y: number): number { return inb(x, y) ? c.map[y * MAP_SIZE + x] : -2; }
function occupiedNeighbors(c: Ctx, x: number, y: number, ignore = -1): number {
  let n = 0;
  for (const [dx, dy] of DIRS) { const v = at(c, x + dx, y + dy); if (v >= 0 && v !== ignore) n++; }
  return n;
}
function place(c: Ctx, gx: number, gy: number, cw: number, ch: number, type: RoomType): RoomData {
  const id = c.rooms.length;
  const r = new RoomData(id, gx, gy, cw, ch, type, `${c.seed}:f${c.fi}:r${id}`);
  for (const [x, y] of r.cells()) c.map[y * MAP_SIZE + x] = id;
  c.rooms.push(r);
  return r;
}

/**
 * The run's chapter order, fixed by the seed: the first chapter is always one of the gentler ones,
 * the rest are drawn at random from every chapter family (no family twice), and the Binding is
 * always last. A chapter never shows up more than one step ahead of its usual depth (no Stacks
 * as Chapter II), but anything easier can appear late: enemy health and budgets follow depth.
 */
const orderCache = new Map<string, FloorTheme[]>();
export function chapterOrder(seed: string): FloorTheme[] {
  let o = orderCache.get(seed);
  if (o) return o;
  const rng = new RNG(seed + ':chapters');
  const first = rng.pick(CHAPTER_POOL.filter((t) => (t.tier ?? 0) <= 1));
  o = [first];
  const used = new Set([familyOf(first)]);
  while (o.length < FINAL_FLOOR) {
    const fresh = CHAPTER_POOL.filter((t) => !used.has(familyOf(t)));
    const fit = fresh.filter((t) => (t.tier ?? 0) <= o!.length + 1);
    const t = rng.pick(fit.length ? fit : fresh.length ? fresh : CHAPTER_POOL);
    used.add(familyOf(t)); o.push(t);
  }
  if (orderCache.size > 50) orderCache.clear();
  orderCache.set(seed, o);
  return o;
}
export function themeAt(seed: string, fi: number): FloorTheme {
  if (fi === FINAL_FLOOR) return FLOORS[FINAL_FLOOR];
  const order = chapterOrder(seed);
  return fi < FINAL_FLOOR ? order[fi] : chapterOrder(seed + ':loop' + Math.floor(fi / FINAL_FLOOR))[fi % FINAL_FLOOR];
}
export function pickTheme(run: Run, fi: number): FloorTheme { return themeAt(run.seed, fi); }

export function generateFloor(run: Run, fi: number, save?: SaveManager): Floor {
  const theme = pickTheme(run, fi);
  const base = new RNG(`${run.seed}:floor${fi}`);
  const isFinal = fi === FINAL_FLOOR;
  const target = isFinal ? 7 : Math.min(19, 7 + Math.floor(fi * 1.5) + base.int(0, 2));
  let c: Ctx | null = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const rng = new RNG(`${run.seed}:floor${fi}:a${attempt}`);
    const ctx: Ctx = { rng, map: new Int16Array(MAP_SIZE * MAP_SIZE).fill(-1), rooms: [], seed: run.seed, fi };
    if (tryBuild(ctx, target, fi, isFinal)) { c = ctx; break; }
  }
  if (!c) throw new Error('floor generation failed');
  const rng = c.rng;
  // curses
  let curse: string | null = null;
  if (fi > 0 && !isFinal && rng.chance(0.18 + fi * 0.02)) curse = rng.pick(CURSES);
  if (run.challenge === 'darkness') curse = 'dark';
  if (curse === 'maze') curse = 'lost';
  const floor: Floor = {
    index: fi, theme, rooms: c.rooms, map: c.map, size: MAP_SIZE, startId: 0,
    bossId: c.rooms.findIndex((r) => r.type === 'boss'), curse,
    label: `${chapterLabel(fi)} — ${theme.name}`, alt: !FLOORS.includes(theme),
  };
  // populate every room (deterministic per room seed, pools consumed in id order)
  const prng = new RNG(`${run.seed}:populate${fi}`);
  for (const r of c.rooms) populateRoom(r, floor, run, prng, save);
  sprinkleMarkedRocks(floor, rng);
  return floor;
}

function tryBuild(c: Ctx, target: number, fi: number, isFinal: boolean): boolean {
  const rng = c.rng;
  const cx = 6, cy = 6;
  place(c, cx, cy, 1, 1, 'start');
  const queue: RoomData[] = [c.rooms[0]];
  const bigChance = isFinal ? 0 : 0.12 + fi * 0.015;
  while (queue.length && c.rooms.length < target) {
    const room = queue.shift()!;
    const cells = room.cells();
    for (const [x, y] of rng.shuffle(cells.slice())) {
      for (const [dx, dy] of rng.shuffle(DIRS.slice())) {
        if (c.rooms.length >= target) break;
        const nx = x + dx, ny = y + dy;
        if (at(c, nx, ny) !== -1) continue;
        if (occupiedNeighbors(c, nx, ny) > 1) continue;
        if (rng.chance(0.45) && queue.length > 0) continue;
        // try a big shape
        let placed: RoomData | null = null;
        if (room.type !== 'start' && rng.chance(bigChance)) {
          const shapes: [number, number][] = rng.shuffle([[2, 1], [1, 2], [2, 2]]);
          for (const [w, h] of shapes) {
            for (const [ox, oy] of rng.shuffle([[0, 0], [-(w - 1), 0], [0, -(h - 1)], [-(w - 1), -(h - 1)]])) {
              const gx = nx + ox, gy = ny + oy;
              let ok = true;
              for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) {
                const X = gx + i, Y = gy + j;
                if (at(c, X, Y) !== -1) ok = false;
                // new cells may only touch the parent room
                for (const [ddx, ddy] of DIRS) { const v = at(c, X + ddx, Y + ddy); if (v >= 0 && v !== room.id) ok = false; }
              }
              if (ok && gx >= 1 && gy >= 1 && gx + w <= MAP_SIZE - 1 && gy + h <= MAP_SIZE - 1) { placed = place(c, gx, gy, w, h, 'normal'); break; }
            }
            if (placed) break;
          }
        }
        if (!placed) placed = place(c, nx, ny, 1, 1, 'normal');
        queue.push(placed);
      }
    }
    if (queue.length === 0 && c.rooms.length < target) {
      // re-seed expansion from a random room so we reach the target
      const any = c.rooms[rng.int(0, c.rooms.length - 1)];
      queue.push(any);
      if (rng.chance(0.02)) return false;
    }
  }
  if (c.rooms.length < target) return false;
  // graph distances
  const adj = buildAdjacency(c);
  const dist = bfs(adj, 0);
  c.rooms.forEach((r) => (r.distance = dist[r.id]));
  const deadEnds = c.rooms.filter((r) => r.type === 'normal' && r.cw === 1 && r.ch === 1 && adj[r.id].length === 1)
    .sort((a, b) => b.distance - a.distance);
  const specials: RoomType[] = [];
  if (!isFinal) {
    specials.push('treasure');
    if (fi < FINAL_FLOOR - 1 || fi > FINAL_FLOOR) specials.push('shop');
    const optional: RoomType[] = [];
    if (fi >= 1 && rng.chance(0.55)) optional.push('challenge');
    if (rng.chance(0.4)) optional.push('sacrifice');
    if (rng.chance(0.4)) optional.push('arcade');
    if (rng.chance(0.45)) optional.push('cursed');
    if (rng.chance(0.3)) optional.push('library');
    if (fi >= 1 && rng.chance(0.4)) optional.push('miniboss');
    if (rng.chance(0.45)) optional.push('event');
    specials.push(...rng.shuffle(optional));
  }
  const needed = 1 + Math.min(2, specials.length);
  if (deadEnds.length < needed) return false;
  // boss at the furthest dead end
  const boss = deadEnds.shift()!;
  if (boss.distance < (isFinal ? 2 : 3)) return false;
  boss.type = 'boss';
  const pool = rng.shuffle(deadEnds.slice());
  for (const t of specials) {
    // keep treasure away from the start a little
    const idx = pool.findIndex((r) => t !== 'treasure' || r.distance >= 1);
    if (idx < 0) break;
    const r = pool.splice(idx, 1)[0];
    r.type = t;
  }
  // secret room: empty cell touching the most rooms (not the boss room)
  if (!isFinal) {
    const cands: { x: number; y: number; n: number }[] = [];
    for (let y = 1; y < MAP_SIZE - 1; y++) for (let x = 1; x < MAP_SIZE - 1; x++) {
      if (at(c, x, y) !== -1) continue;
      let n = 0, bad = false;
      for (const [dx, dy] of DIRS) {
        const v = at(c, x + dx, y + dy);
        if (v >= 0) { const t = c.rooms[v].type; if (t === 'boss') bad = true; else if (t === 'normal' || t === 'start') n++; }
      }
      if (!bad && n >= 2) cands.push({ x, y, n });
    }
    if (cands.length) {
      const best = Math.max(...cands.map((q) => q.n));
      const top = cands.filter((q) => q.n >= Math.min(best, 3));
      const s = rng.pick(top);
      place(c, s.x, s.y, 1, 1, 'secret');
    }
    // deep crawlspace: touches exactly one normal room
    const cands2: { x: number; y: number }[] = [];
    for (let y = 1; y < MAP_SIZE - 1; y++) for (let x = 1; x < MAP_SIZE - 1; x++) {
      if (at(c, x, y) !== -1) continue;
      let n = 0, bad = false;
      for (const [dx, dy] of DIRS) {
        const v = at(c, x + dx, y + dy);
        if (v >= 0) { const t = c.rooms[v].type; if (t === 'normal' && c.rooms[v].cw === 1 && c.rooms[v].ch === 1) n++; else bad = true; }
      }
      if (!bad && n === 1) cands2.push({ x, y });
    }
    if (cands2.length && rng.chance(0.75)) { const s = rng.pick(cands2); place(c, s.x, s.y, 1, 1, 'supersecret'); }
  }
  connectDoors(c, fi);
  return true;
}

function buildAdjacency(c: Ctx): number[][] {
  const adj: number[][] = c.rooms.map(() => []);
  for (const r of c.rooms) for (const [x, y] of r.cells()) for (const [dx, dy] of DIRS) {
    const v = at(c, x + dx, y + dy);
    if (v >= 0 && v !== r.id && !adj[r.id].includes(v)) adj[r.id].push(v);
  }
  return adj;
}
function bfs(adj: number[][], s: number): number[] {
  const d = adj.map(() => -1); d[s] = 0; const q = [s];
  while (q.length) { const u = q.shift()!; for (const v of adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); } }
  return d;
}

const SPECIAL_DOOR: Partial<Record<RoomType, DoorKind>> = {
  treasure: 'treasure', boss: 'boss', shop: 'shop', secret: 'secret', supersecret: 'supersecret', challenge: 'challenge',
  sacrifice: 'sacrifice', arcade: 'arcade', cursed: 'cursed', library: 'library', miniboss: 'miniboss', event: 'event', deal: 'deal', blessing: 'blessing',
};

function connectDoors(c: Ctx, fi: number): void {
  for (const r of c.rooms) r.doors = [];
  for (const r of c.rooms) {
    for (let j = 0; j < r.ch; j++) for (let i = 0; i < r.cw; i++) {
      const x = r.gx + i, y = r.gy + j;
      for (const [dx, dy, side] of DIRS) {
        // only edge cells in the direction of travel
        if (side === Side.N && j !== 0) continue; if (side === Side.S && j !== r.ch - 1) continue;
        if (side === Side.W && i !== 0) continue; if (side === Side.E && i !== r.cw - 1) continue;
        const v = at(c, x + dx, y + dy);
        if (v < 0 || v === r.id) continue;
        const o = c.rooms[v];
        // special rooms only connect through their single entrance; secret rooms connect to all normal neighbours
        const special = (t: RoomType) => t !== 'normal' && t !== 'start';
        if (special(r.type) && special(o.type)) continue;
        const slot = side === Side.N || side === Side.S ? i : j;
        const kind: DoorKind = SPECIAL_DOOR[o.type] ?? SPECIAL_DOOR[r.type] ?? 'normal';
        const hidden = o.type === 'secret' || o.type === 'supersecret' || r.type === 'secret' || r.type === 'supersecret';
        const lockT = (t: RoomType) => (t === 'treasure' && fi >= 1) || (t === 'shop' && fi >= 1) || t === 'library';
        r.doors.push({ side, slot, to: v, kind, locked: lockT(o.type) || lockT(r.type), hidden });
      }
    }
  }
}

/** A deal/blessing room appended next to the boss room after the boss dies. */
export function addBargainRoom(run: Run, floor: Floor, boss: RoomData, kind: 'deal' | 'blessing'): RoomData | null {
  const map = floor.map;
  for (const [dx, dy, side] of DIRS) {
    const x = boss.gx + dx, y = boss.gy + dy;
    if (!inb(x, y) || map[y * MAP_SIZE + x] !== -1) continue;
    const id = floor.rooms.length;
    const r = new RoomData(id, x, y, 1, 1, kind, `${run.seed}:f${floor.index}:r${id}`);
    map[y * MAP_SIZE + x] = id;
    floor.rooms.push(r);
    boss.doors.push({ side, slot: 0, to: id, kind, locked: false, hidden: false });
    r.doors.push({ side: opposite(side), slot: 0, to: boss.id, kind: 'normal', locked: false, hidden: false });
    r.distance = boss.distance + 1;
    populateRoom(r, floor, run, new RNG(r.seed + ':pop'));
    return r;
  }
  return null;
}

function sprinkleMarkedRocks(floor: Floor, rng: RNG): void {
  // Guarantee a couple of chalk-marked stones per floor.
  const rocks: [RoomData, number][] = [];
  for (const r of floor.rooms) if (r.type === 'normal') for (let i = 0; i < r.grid.length; i++) if (r.grid[i] === 1) rocks.push([r, i]);
  const already = floor.rooms.reduce((n, r) => n + r.grid.filter((k) => k === 2).length, 0);
  const want = Math.max(0, rng.int(1, 3) - already);
  for (let k = 0; k < want && rocks.length; k++) {
    const [r, i] = rocks.splice(rng.int(0, rocks.length - 1), 1)[0];
    r.grid[i] = 2; r.gvar[i] = rng.int(0, 1);
  }
}
