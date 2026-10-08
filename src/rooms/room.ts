// Persistent per-floor room data and room geometry helpers.
import { TILE, VIEW_W, VIEW_H, roomCols, roomRows } from '../core/constants';

export type RoomType =
  | 'start' | 'normal' | 'boss' | 'treasure' | 'shop' | 'secret' | 'supersecret' | 'challenge' | 'sacrifice'
  | 'arcade' | 'cursed' | 'library' | 'miniboss' | 'event' | 'deal' | 'blessing' | 'lostfound' | 'echo';

export const ROOM_NAMES: Record<RoomType, string> = {
  start: 'Landing', normal: '', boss: 'The Floor\'s End', treasure: 'The Curio', shop: 'Mott\'s Wares',
  secret: 'Crawlspace', supersecret: 'Deep Crawlspace', challenge: 'Proving Room', sacrifice: 'The Pincushion',
  arcade: 'Button Parlor', cursed: 'Hexed Room', library: 'The Archive', miniboss: 'Lurker\'s Den', event: 'Odd Room',
  deal: 'The Inkwell', blessing: 'Wax Chapel', lostfound: 'Lost & Found', echo: 'Where You Fell',
};

export const enum Side { N = 0, E = 1, S = 2, W = 3 }
export const SIDE_DX = [0, 1, 0, -1];
export const SIDE_DY = [-1, 0, 1, 0];
export const opposite = (s: Side): Side => ((s + 2) % 4) as Side;

export type DoorKind = 'normal' | 'treasure' | 'boss' | 'shop' | 'secret' | 'supersecret' | 'challenge' | 'sacrifice'
  | 'arcade' | 'cursed' | 'library' | 'miniboss' | 'event' | 'deal' | 'blessing' | 'lostfound' | 'echo';

export interface DoorDef {
  side: Side; slot: number; to: number; kind: DoorKind;
  locked: boolean;   // needs a key
  hidden: boolean;   // secret wall, needs explosion
  chained?: boolean; // needs a button payment etc.
}

export const enum Ob {
  None = 0, Rock = 1, Marked = 2, Block = 3, Pit = 4, Spikes = 5, Fire = 6, Heap = 7, Keg = 8, Urn = 9,
  Pillar = 10, Web = 11, TimedSpikes = 12, Button = 13,
}
export const OB_SOLID_WALK = new Set<number>([Ob.Rock, Ob.Marked, Ob.Block, Ob.Pit, Ob.Fire, Ob.Heap, Ob.Keg, Ob.Urn, Ob.Pillar]);
export const OB_SOLID_SHOT = new Set<number>([Ob.Rock, Ob.Marked, Ob.Block, Ob.Fire, Ob.Heap, Ob.Keg, Ob.Urn, Ob.Pillar]);
export const OB_SOLID_FLY = new Set<number>([Ob.Block, Ob.Pillar]);

export interface SpawnDef { id: string; c: number; r: number; champion?: boolean }
export interface PickupState { kind: string; x: number; y: number; data?: any }

export class RoomData {
  id: number; gx: number; gy: number; cw: number; ch: number; type: RoomType;
  doors: DoorDef[] = [];
  cols: number; rows: number;
  grid: Uint8Array; ghp: Float32Array; gvar: Uint8Array;
  spawns: SpawnDef[] = [];
  cleared = false; visited = false; seen = false; discovered = true;
  pickups: PickupState[] = [];
  npcs: { kind: string; x: number; y: number; data?: any }[] = [];
  seed: string;
  distance = 0;
  bossId?: string;
  template = '';
  deadEnd = false;
  bgCache: HTMLCanvasElement | null = null;
  decalsDirty = false;
  waves: SpawnDef[][] = []; // challenge / ambush waves
  flags: Record<string, any> = {};
  constructor(id: number, gx: number, gy: number, cw: number, ch: number, type: RoomType, seed: string) {
    this.id = id; this.gx = gx; this.gy = gy; this.cw = cw; this.ch = ch; this.type = type; this.seed = seed;
    this.cols = roomCols(cw); this.rows = roomRows(ch);
    const n = this.cols * this.rows;
    this.grid = new Uint8Array(n); this.ghp = new Float32Array(n); this.gvar = new Uint8Array(n);
  }
  get pxW(): number { return VIEW_W * this.cw; }
  get pxH(): number { return VIEW_H * this.ch; }
  get ox(): number { return (this.pxW - this.cols * TILE) / 2; }
  get oy(): number { return (this.pxH - this.rows * TILE) / 2; }
  cells(): [number, number][] {
    const out: [number, number][] = [];
    for (let y = 0; y < this.ch; y++) for (let x = 0; x < this.cw; x++) out.push([this.gx + x, this.gy + y]);
    return out;
  }
  idx(c: number, r: number): number { return r * this.cols + c; }
  inGrid(c: number, r: number): boolean { return c >= 0 && r >= 0 && c < this.cols && r < this.rows; }
  at(c: number, r: number): number { return this.inGrid(c, r) ? this.grid[r * this.cols + c] : Ob.Block; }
  setOb(c: number, r: number, k: Ob, hp = 0, v = 0): void {
    if (!this.inGrid(c, r)) return;
    const i = r * this.cols + c; this.grid[i] = k; this.ghp[i] = hp; this.gvar[i] = v;
  }
  /** Column (for N/S doors) or row (for E/W doors) of a door slot. */
  doorCell(side: Side, slot: number): number {
    if (side === Side.N || side === Side.S) return slot === 0 ? 7 : this.cols - 1 - 7;
    return slot === 0 ? 4 : this.rows - 1 - 4;
  }
  /** World position of the door opening centre on the interior edge. */
  doorPos(side: Side, slot: number): { x: number; y: number } {
    const k = this.doorCell(side, slot);
    switch (side) {
      case Side.N: return { x: this.ox + k * TILE + TILE / 2, y: this.oy };
      case Side.S: return { x: this.ox + k * TILE + TILE / 2, y: this.oy + this.rows * TILE };
      case Side.W: return { x: this.ox, y: this.oy + k * TILE + TILE / 2 };
      default: return { x: this.ox + this.cols * TILE, y: this.oy + k * TILE + TILE / 2 };
    }
  }
  /** Grid cell just inside a door. */
  doorInner(side: Side, slot: number): [number, number] {
    const k = this.doorCell(side, slot);
    switch (side) {
      case Side.N: return [k, 0];
      case Side.S: return [k, this.rows - 1];
      case Side.W: return [0, k];
      default: return [this.cols - 1, k];
    }
  }
  cellCenter(c: number, r: number): { x: number; y: number } {
    return { x: this.ox + c * TILE + TILE / 2, y: this.oy + r * TILE + TILE / 2 };
  }
  cellAt(x: number, y: number): [number, number] {
    return [Math.floor((x - this.ox) / TILE), Math.floor((y - this.oy) / TILE)];
  }
  center(): { x: number; y: number } { return { x: this.pxW / 2, y: this.pxH / 2 }; }
  /** Which map cell (relative) a door slot belongs to, plus the neighbouring map coordinate. */
  doorNeighbor(side: Side, slot: number): { mx: number; my: number } {
    let lx = 0, ly = 0;
    if (side === Side.N) { lx = slot; ly = 0; } else if (side === Side.S) { lx = slot; ly = this.ch - 1; }
    else if (side === Side.W) { lx = 0; ly = slot; } else { lx = this.cw - 1; ly = slot; }
    const dx = [0, 1, 0, -1][side], dy = [-1, 0, 1, 0][side];
    return { mx: this.gx + lx + dx, my: this.gy + ly + dy };
  }
}
