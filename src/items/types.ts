// Data schema for every collectible in the game.
import type { StatMods } from '../player/stats';
import type { ProfilePart } from '../projectiles/profile';
import type { PixelArt } from '../render/pixel';
import type { World } from '../game/world';
import type { Enemy } from '../enemies/enemy';

export type ItemKind = 'passive' | 'active' | 'familiar' | 'trinket';
export type PoolId = 'treasure' | 'shop' | 'boss' | 'secret' | 'deal' | 'blessing' | 'library' | 'curse' | 'challenge' | 'arcade';

export interface HealthGrant { containers?: number; heal?: number; wax?: number; ink?: number; brass?: number; gilded?: number; loseContainers?: number }
export interface Grant { buttons?: number; keys?: number; bombs?: number; drops?: [string, number][] }

export interface BombMods {
  big?: boolean; sticky?: boolean; homing?: boolean; fire?: boolean; poison?: boolean; scatter?: boolean;
  cross?: boolean; ink?: boolean; magnet?: boolean; remote?: boolean; damageAdd?: number; radiusAdd?: number;
}

export interface FamiliarSpec {
  kind: 'follower' | 'orbital' | 'chaser' | 'turret' | 'spawner' | 'hover';
  /** Shots fired by the familiar, if any. */
  shoot?: { dmg: number; rate: number; inherit?: boolean; shape?: string; pierce?: boolean; homing?: boolean; burst?: number; spread?: number; range?: number; laser?: boolean };
  contact?: number;        // contact damage per second-ish tick
  blocks?: boolean;        // blocks enemy shots
  orbitR?: number; orbitSpeed?: number;
  speed?: number;
  /** Produces pickups every N cleared rooms. */
  spawnEvery?: number; spawnDrop?: string | string[];
  sprite: string;          // familiar art id
  onRoomClear?: (w: World, f: any) => void;
  special?: string;        // bespoke behaviour hook key
}

export interface ItemHooks {
  onPickup?(w: World): void;
  onRoomEnter?(w: World, n: number): void;
  onRoomClear?(w: World, n: number): void;
  onFloor?(w: World, n: number): void;
  onKill?(w: World, e: Enemy, n: number): void;
  onHurt?(w: World, n: number): void;
  onHitEnemy?(w: World, e: Enemy, dmg: number, n: number): void;
  onFire?(w: World, ang: number, n: number): void;
  onTick?(w: World, dt: number, n: number): void;
  onBombExplode?(w: World, x: number, y: number, n: number): void;
  onActiveUse?(w: World, n: number): void;
  onPickupCollect?(w: World, kind: string, n: number): void;
}

export interface ActiveSpec {
  charge: number;                  // rooms (or seconds for 'timed', kills for 'kill')
  type: 'room' | 'timed' | 'kill';
  use: (w: World) => boolean | void; // return false to cancel (no charge spent)
  single?: boolean;                // consumed on use
  hold?: boolean;                  // effect lasts the room
}

export interface ItemDef {
  id: string; name: string; kind: ItemKind; quality: 0 | 1 | 2 | 3 | 4;
  pools: Partial<Record<PoolId, number>>;
  pickup: string;                  // short banner line
  effect: string[];                // precise gameplay description lines
  stats?: StatMods;
  attack?: ProfilePart;
  health?: HealthGrant;
  give?: Grant;
  tags?: string[];
  flight?: boolean;
  spectralBody?: boolean;
  unlock?: string;
  icon: (p: PixelArt) => void;
  hooks?: ItemHooks;
  active?: ActiveSpec;
  familiar?: FamiliarSpec;
  familiarCount?: number;
  bomb?: BombMods;
  price?: number;
  lore?: string;
}

export interface ConsumableDef {
  id: string; name: string; kind: 'page' | 'sweet' | 'charm';
  desc: string; effect: string[];
  use?: (w: World) => void;
  stats?: StatMods; attack?: ProfilePart; hooks?: ItemHooks; // for charms
  icon?: (p: PixelArt) => void;
  unlock?: string;
  bad?: boolean;
  rarity?: number;
}
