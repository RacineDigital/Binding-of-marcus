// Circle-vs-grid collision for the current room, with open door corridors.
import { TILE } from '../core/constants';
import { RoomData, Ob, OB_SOLID_WALK, OB_SOLID_SHOT, OB_SOLID_FLY, Side } from './room';

export type MoveMode = 'walk' | 'fly' | 'shot' | 'ghost';
export interface Body { x: number; y: number; r: number }
export interface OpenDoor { side: Side; pos: number } // pos = centre along the edge (x for N/S, y for E/W)

export function solidCell(room: RoomData, c: number, r: number, mode: MoveMode): boolean {
  if (!room.inGrid(c, r)) return false;
  const k = room.grid[r * room.cols + c];
  if (k === Ob.None) return false;
  // a put-out fire is just ash: walk and shoot straight over it
  if (k === Ob.Fire && room.ghp[r * room.cols + c] <= 0) return false;
  switch (mode) {
    case 'walk': return OB_SOLID_WALK.has(k);
    case 'fly': return OB_SOLID_FLY.has(k);
    case 'shot': return OB_SOLID_SHOT.has(k);
    default: return false;
  }
}

/** Is a world point blocked for the given mode (grid or outside the interior)? */
export function pointBlocked(room: RoomData, x: number, y: number, mode: MoveMode): boolean {
  const ix = x - room.ox, iy = y - room.oy;
  if (ix < 0 || iy < 0 || ix >= room.cols * TILE || iy >= room.rows * TILE) return true;
  return solidCell(room, Math.floor(ix / TILE), Math.floor(iy / TILE), mode);
}

export interface HitInfo { hx: boolean; hy: boolean; wall: boolean; cell: [number, number] | null }
const _hit: HitInfo = { hx: false, hy: false, wall: false, cell: null };

function resolveGrid(room: RoomData, b: Body, mode: MoveMode, axis: 0 | 1, hit: HitInfo): void {
  if (mode === 'ghost') return;
  const c0 = Math.floor((b.x - b.r - room.ox) / TILE), c1 = Math.floor((b.x + b.r - room.ox) / TILE);
  const r0 = Math.floor((b.y - b.r - room.oy) / TILE), r1 = Math.floor((b.y + b.r - room.oy) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    if (!solidCell(room, c, r, mode)) continue;
    const rx = room.ox + c * TILE, ry = room.oy + r * TILE;
    // inset hit box slightly so bodies slide around corners smoothly
    const inset = 1;
    const x0 = rx + inset, y0 = ry + inset, x1 = rx + TILE - inset, y1 = ry + TILE - inset;
    const nx = Math.max(x0, Math.min(b.x, x1)), ny = Math.max(y0, Math.min(b.y, y1));
    let dx = b.x - nx, dy = b.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= b.r * b.r) continue;
    hit.cell = [c, r];
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2), push = b.r - d;
      b.x += (dx / d) * push; b.y += (dy / d) * push;
      if (Math.abs(dx) > Math.abs(dy)) hit.hx = true; else hit.hy = true;
    } else {
      // centre inside the tile: push out along the movement axis
      if (axis === 0) { const l = b.x - x0, rr = x1 - b.x; b.x = l < rr ? x0 - b.r : x1 + b.r; hit.hx = true; }
      else { const t = b.y - y0, bb = y1 - b.y; b.y = t < bb ? y0 - b.r : y1 + b.r; hit.hy = true; }
    }
  }
}

function resolveBounds(room: RoomData, b: Body, doors: OpenDoor[] | null, hit: HitInfo): void {
  const L = room.ox, T = room.oy, R = room.ox + room.cols * TILE, B = room.oy + room.rows * TILE;
  const half = TILE / 2;
  const inDoor = (side: Side, along: number) => {
    if (!doors) return false;
    for (const d of doors) if (d.side === side && Math.abs(along - d.pos) <= half - b.r + 0.5) return true;
    return false;
  };
  // corridor containment when already inside a doorway
  if (b.y < T && doors) { const d = doors.find((d) => d.side === Side.N && Math.abs(b.x - d.pos) < half + 2); if (d) { b.x = Math.max(d.pos - half + b.r, Math.min(d.pos + half - b.r, b.x)); } }
  if (b.y > B && doors) { const d = doors.find((d) => d.side === Side.S && Math.abs(b.x - d.pos) < half + 2); if (d) { b.x = Math.max(d.pos - half + b.r, Math.min(d.pos + half - b.r, b.x)); } }
  if (b.x < L && doors) { const d = doors.find((d) => d.side === Side.W && Math.abs(b.y - d.pos) < half + 2); if (d) { b.y = Math.max(d.pos - half + b.r, Math.min(d.pos + half - b.r, b.y)); } }
  if (b.x > R && doors) { const d = doors.find((d) => d.side === Side.E && Math.abs(b.y - d.pos) < half + 2); if (d) { b.y = Math.max(d.pos - half + b.r, Math.min(d.pos + half - b.r, b.y)); } }
  if (b.x - b.r < L && !(b.x < L + half && inDoor(Side.W, b.y))) { if (b.y >= T && b.y <= B) { b.x = L + b.r; hit.hx = true; hit.wall = true; } }
  if (b.x + b.r > R && !(b.x > R - half && inDoor(Side.E, b.y))) { if (b.y >= T && b.y <= B) { b.x = R - b.r; hit.hx = true; hit.wall = true; } }
  if (b.y - b.r < T && !(b.y < T + half && inDoor(Side.N, b.x))) { if (b.x >= L && b.x <= R) { b.y = T + b.r; hit.hy = true; hit.wall = true; } }
  if (b.y + b.r > B && !(b.y > B - half && inDoor(Side.S, b.x))) { if (b.x >= L && b.x <= R) { b.y = B - b.r; hit.hy = true; hit.wall = true; } }
  // never leave the room rectangle entirely
  b.x = Math.max(4, Math.min(room.pxW - 4, b.x)); b.y = Math.max(4, Math.min(room.pxH - 4, b.y));
}

/** Move a circular body, sliding along obstacles. Returns shared hit info (copy if you need to keep it). */
export function moveBody(room: RoomData, b: Body, dx: number, dy: number, mode: MoveMode, doors: OpenDoor[] | null = null): HitInfo {
  _hit.hx = false; _hit.hy = false; _hit.wall = false; _hit.cell = null;
  // substep large moves to avoid tunnelling
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (b.r * 0.9 + 1)));
  const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    b.x += sx; resolveGrid(room, b, mode, 0, _hit); resolveBounds(room, b, doors, _hit);
    b.y += sy; resolveGrid(room, b, mode, 1, _hit); resolveBounds(room, b, doors, _hit);
  }
  return _hit;
}

/** Would a body of radius r at (x, y) overlap a solid cell (the same inset boxes moveBody resolves against)? */
export function circleBlocked(room: RoomData, x: number, y: number, r: number, mode: MoveMode): boolean {
  if (mode === 'ghost') return false;
  const c0 = Math.floor((x - r - room.ox) / TILE), c1 = Math.floor((x + r - room.ox) / TILE);
  const r0 = Math.floor((y - r - room.oy) / TILE), r1 = Math.floor((y + r - room.oy) / TILE);
  for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
    if (!solidCell(room, c, rr, mode)) continue;
    const x0 = room.ox + c * TILE + 1, y0 = room.oy + rr * TILE + 1, x1 = x0 + TILE - 2, y1 = y0 + TILE - 2;
    const nx = Math.max(x0, Math.min(x, x1)), ny = Math.max(y0, Math.min(y, y1));
    if ((x - nx) ** 2 + (y - ny) ** 2 < r * r - 0.01) return true;
  }
  return false;
}

/**
 * Corner forgiveness. Pushing straight at the very edge of an obstacle should slip round it, not stop
 * dead. Given a push along one axis (dir = -1 or 1 on that axis) that just got blocked, returns how far
 * to steer sideways (signed px, the smaller way round) to clear it, or 0 when the obstacle is met
 * squarely (more than `reach` px of overlap) and the body should simply stop.
 */
export function cornerSlide(room: RoomData, b: Body, axis: 0 | 1, dir: number, mode: MoveMode, reach = 8): number {
  const ahead = (ox: number, oy: number) => axis === 0 ? circleBlocked(room, b.x + dir * 1.5 + ox, b.y + oy, b.r, mode) : circleBlocked(room, b.x + ox, b.y + dir * 1.5 + oy, b.r, mode);
  const beside = (o: number) => axis === 0 ? circleBlocked(room, b.x, b.y + o, b.r, mode) : circleBlocked(room, b.x + o, b.y, b.r, mode);
  if (!ahead(0, 0)) return 0;
  for (let o = 1; o <= reach; o++) {
    for (const s of [-1, 1]) {
      const off = o * s;
      if (axis === 0 ? !ahead(0, off) && !beside(off) : !ahead(off, 0) && !beside(off)) return off;
    }
  }
  return 0;
}

/** Line of sight between two points for the given mode (grid sampling). */
export function lineClear(room: RoomData, x0: number, y0: number, x1: number, y1: number, mode: MoveMode = 'shot'): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.ceil(d / 8);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    const [c, r] = [Math.floor((x - room.ox) / TILE), Math.floor((y - room.oy) / TILE)];
    if (solidCell(room, c, r, mode)) return false;
  }
  return true;
}
