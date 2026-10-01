// Enemy runtime object. Behaviour lives in data-driven EnemyDefs.
import type { World } from '../game/world';
import { Sprite } from '../render/sprite';
import { moveBody, MoveMode } from '../rooms/collide';
import type { AttackProfile } from '../projectiles/profile';

export type Role = 'melee' | 'flyer' | 'shooter' | 'swarm' | 'heavy' | 'turret' | 'special' | 'boss';
export type SpriteSet = Record<string, Sprite[]>;

export interface HurtInfo { ang: number; knock: number; source: string; crit?: boolean; prof?: AttackProfile | null; status?: string | null }

export interface EnemyDef {
  id: string; name: string; desc?: string;
  hp: number; r: number; speed: number;
  flying?: boolean; ghost?: boolean; contact?: number; mass?: number;
  role: Role; cost: number; hitY?: number;
  gore?: string; goreDecal?: string;
  sprites: () => SpriteSet;
  init?(e: Enemy, w: World): void;
  update(e: Enemy, w: World, dt: number): void;
  draw?(e: Enemy, ctx: CanvasRenderingContext2D, w: World, sx: number, sy: number): void;
  onDeath?(e: Enemy, w: World): void;
  onHurt?(e: Enemy, w: World, dmg: number, info: HurtInfo): number | void;
  noKnock?: boolean; noStatus?: boolean; noSeparate?: boolean;
  light?: [number, string];
  boss?: boolean;
  spawnQuiet?: boolean;
  deathSound?: string;
}

let NEXT_ID = 1;

export class Enemy {
  id = NEXT_ID++;
  def: EnemyDef;
  x: number; y: number; z = 0; vx = 0; vy = 0; vz = 0;
  kvx = 0; kvy = 0;
  r: number; hitY: number;
  hp: number; maxHp: number;
  state = 'idle'; st = 0; t = 0; cd = 0; cd2 = 0;
  anim = 'idle'; frame = 0; ftime = 0; flip = false;
  flash = 0; sx = 1; sy = 1; alpha = 1;
  spawnT = 0.7; dead = false; hidden = false; invuln = false; friendly = false;
  mode: MoveMode;
  burn = 0; burnDmg = 0; poison = 0; poisonDmg = 0; slow = 0; freeze = 0; fear = 0; confuse = 0; mark = 0; charm = 0;
  tickT = 0;
  champion: string | null = null;
  data: any = {};
  parent: Enemy | null = null;
  noDrop = false;
  isBoss = false;
  tx = 0; ty = 0; // generic target
  constructor(def: EnemyDef, x: number, y: number, hpMul = 1) {
    this.def = def; this.x = x; this.y = y;
    this.r = def.r; this.hitY = def.hitY ?? def.r;
    this.hp = this.maxHp = def.hp * hpMul;
    this.mode = def.ghost ? 'ghost' : def.flying ? 'fly' : 'walk';
    this.isBoss = !!def.boss;
  }
  get sprites(): SpriteSet { return getSprites(this.def); }
  /** Status-adjusted speed multiplier. */
  spd(): number {
    if (this.freeze > 0) return 0;
    let m = 1;
    if (this.slow > 0) m *= 0.5;
    if (this.champion === 'swift') m *= 1.35;
    return m;
  }
  move(w: World, dx: number, dy: number): { hx: boolean; hy: boolean; wall: boolean } {
    const h = moveBody(w.room, this, dx, dy, this.mode, null);
    return { hx: h.hx, hy: h.hy, wall: h.wall };
  }
  setAnim(a: string): void { if (this.anim !== a) { this.anim = a; this.frame = 0; this.ftime = 0; } }
  animate(dt: number, fps: number, loop = true): boolean {
    this.ftime += dt;
    const len = this.sprites[this.anim]?.length ?? 1;
    let done = false;
    while (this.ftime >= 1 / fps) {
      this.ftime -= 1 / fps; this.frame++;
      if (this.frame >= len) { if (loop) this.frame = 0; else { this.frame = len - 1; done = true; } }
    }
    return done;
  }
  setState(s: string, st = 0): void { this.state = s; this.st = st; }
  hpFrac(): number { return this.hp / this.maxHp; }
}

const spriteCache = new Map<string, SpriteSet>();
export function getSprites(def: EnemyDef): SpriteSet {
  let s = spriteCache.get(def.id);
  if (!s) { s = def.sprites(); spriteCache.set(def.id, s); }
  return s;
}
