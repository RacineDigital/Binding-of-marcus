// Run state that persists across floors.
import { RNG } from '../core/rng';
import type { RoomData } from '../rooms/room';
import type { FloorTheme } from '../data/floors';
import { ItemPools } from '../items/pools';

export interface Floor {
  index: number; theme: FloorTheme; rooms: RoomData[]; map: Int16Array; size: number;
  startId: number; bossId: number; curse: string | null; label: string; alt: boolean;
}
export interface RunStats {
  kills: number; time: number; roomsCleared: number; items: string[]; damageTaken: number; bossesKilled: string[];
  secretsFound: number; buttonsCollected: number; floorsCleared: number; deathCause?: string;
}

export class Run {
  seed: string; charId: string; floorIndex = 0; challenge: string | null = null;
  mode: 'normal' | 'hard' | 'daily' = 'normal';
  rng: RNG;
  pools: ItemPools;
  stats: RunStats = { kills: 0, time: 0, roomsCleared: 0, items: [], damageTaken: 0, bossesKilled: [], secretsFound: 0, buttonsCollected: 0, floorsCleared: 0 };
  flags: Record<string, any> = { dealChance: 0.2, dealsTaken: 0, blessingsTaken: 0, hitThisFloor: false, bossHit: false };
  sweetMap: number[] = [];
  identified = new Set<string>();
  won = false;
  constructor(seed: string, charId: string, unlocked: (id: string) => boolean) {
    this.seed = seed; this.charId = charId;
    this.rng = new RNG(seed + ':run');
    this.pools = new ItemPools(new RNG(seed + ':items'), unlocked);
    const sr = new RNG(seed + ':sweets');
    this.sweetMap = sr.shuffle([...Array(12).keys()]);
  }
  floorRng(label: string): RNG { return new RNG(`${this.seed}:f${this.floorIndex}:${label}`); }
}
