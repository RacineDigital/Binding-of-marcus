// Enemy runtime object. Behaviour lives in data-driven EnemyDefs.
import type { World } from '../game/world';
import { Sprite } from '../render/sprite';
import { PixelArt } from '../render/pixel';
import { detailed } from '../render/hd';
import { finishMaterial, materialFor } from '../art/material';

/** How much bigger regular enemies are than their original art (bosses keep their own size). */
export const ENEMY_SCALE = 1.3;
import { moveBody, MoveMode } from '../rooms/collide';
import type { AttackProfile } from '../projectiles/profile';

export type Role = 'melee' | 'flyer' | 'shooter' | 'swarm' | 'heavy' | 'turret' | 'special' | 'boss';
export type SpriteSet = Record<string, Sprite[]>;

/** procMul scales status-effect chances (beams tick many times a second, so they roll at a reduced rate). */
export interface HurtInfo { ang: number; knock: number; source: string; crit?: boolean; prof?: AttackProfile | null; status?: string | null; procMul?: number }

export interface EnemyDef {
  id: string; name: string; desc?: string;
  hp: number; r: number; speed: number;
  flying?: boolean; ghost?: boolean; contact?: number; mass?: number;
  role: Role; cost: number; hitY?: number;
  gore?: string; goreDecal?: string;
  sprites: () => SpriteSet;
  /** Other enemies whose bodies this one wears mid-fight (their sprites are baked ahead of time). */
  borrows?: string[];
  init?(e: Enemy, w: World): void;
  update(e: Enemy, w: World, dt: number): void;
  draw?(e: Enemy, ctx: CanvasRenderingContext2D, w: World, sx: number, sy: number): void;
  onDeath?(e: Enemy, w: World): void;
  onHurt?(e: Enemy, w: World, dmg: number, info: HurtInfo): number | void;
  noKnock?: boolean; noStatus?: boolean; noSeparate?: boolean;
  light?: [number, string];
  /** Room casting rules: at most `max` per room; needs `company` other creatures or is left out. */
  cast?: { max?: number; company?: number };
  /** Other creatures within r of this one take `mul` of their damage (the Lampkeeper's light). */
  aura?: { r: number; mul: number; color: string };
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
    const k = def.boss ? 1 : ENEMY_SCALE;
    this.r = def.r * k; this.hitY = (def.hitY ?? def.r) * k;
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
    // it recognises the ink Marcus took from its kind (game/inklings.ts)
    if (this.data.furious) m *= 1.15;
    // driven on by a Foreman's whistle
    if (this.data.hasteT > 0) m *= 1.4;
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
  if (!s) {
    s = def.sprites();
    // regular enemies: doubled with detail, then drawn a bit bigger than they were
    if (!def.boss) {
      const hd: SpriteSet = {};
      for (const [k, list] of Object.entries(s)) hd[k] = list.map((sp) => { const n = new Sprite(finishMaterial(detailed(sp.art), materialFor(def.id)), sp.ox * 2, sp.oy * 2); n.scale = ENEMY_SCALE / 2; return n; });
      s = hd;
    } else {
      const polished: SpriteSet = {};
      for (const [key, list] of Object.entries(s)) {
        polished[key] = list.map(sp => {
          const art = new PixelArt(sp.w, sp.h); art.data.set(sp.art.data); finishMaterial(art, materialFor(def.id));
          const next = new Sprite(art, sp.ox, sp.oy); next.scale = sp.scale;
          (next as any).eyes = (sp as any).eyes;
          return next;
        });
        if ((list as any).fps) (polished[key] as any).fps = (list as any).fps;
      }
      s = polished;
    }
    spriteCache.set(def.id, s);
  }
  return s;
}
