// The AttackProfile is the composable description of how Marcus attacks. Items contribute partial
// profiles which are merged here; projectiles, beams, melee swings and familiars all read from it.
export type AttackMode = 'shot' | 'charge' | 'burst' | 'beam' | 'laser' | 'melee';
export type ShotShape = 'ink' | 'needle' | 'fire' | 'bone' | 'wax' | 'spark' | 'page' | 'blood' | 'moth' | 'star' | 'void';

export interface AttackProfile {
  modes: Set<AttackMode>;
  shots: number;          // projectiles per volley
  spread: number;         // degrees between fanned shots
  pierce: number;         // enemies a shot may pass through (Infinity = all)
  spectral: boolean;      // passes through obstacles
  homing: number;         // steering strength (0 = none)
  bounce: number;         // wall bounces
  split: number;          // children spawned on split
  splitOnHit: boolean; splitOnExpire: boolean;
  explode: number;        // explosion radius in px, 0 = none
  chain: number;          // chain lightning jumps
  chainChance: number;
  orbit: boolean; boomerang: boolean; wiggle: number; spiral: boolean; arc: boolean;
  grow: number;           // size gain per 100px travelled
  accel: number;          // speed change factor per second (negative = decelerate)
  burn: number; poison: number; slow: number; freeze: number; fear: number; confuse: number; mark: number; charm: number;
  crit: number;           // chance for a bold 3x hit
  creep: boolean;         // leaves damaging ink puddles
  rear: boolean; sides: boolean; // extra fixed-direction shots
  lifesteal: number;
  knock: number;
  shape: ShotShape; tint: string | null;
  chargeTime: number;     // seconds to full charge (before fire-rate scaling)
  pull: boolean;          // shots drag nearby pickups
  shatter: boolean;       // shots break rocks
  magnet: boolean;        // enemy projectiles near shots are cancelled
  rainbow: boolean;       // random status each shot
}

export type ProfilePart = Partial<Omit<AttackProfile, 'modes'>> & { mode?: AttackMode };

export function baseProfile(): AttackProfile {
  return {
    modes: new Set(['shot']), shots: 1, spread: 12, pierce: 0, spectral: false, homing: 0, bounce: 0, split: 0,
    splitOnHit: false, splitOnExpire: false, explode: 0, chain: 0, chainChance: 0, orbit: false, boomerang: false,
    wiggle: 0, spiral: false, arc: false, grow: 0, accel: 0, burn: 0, poison: 0, slow: 0, freeze: 0, fear: 0,
    confuse: 0, mark: 0, charm: 0, crit: 0, creep: false, rear: false, sides: false, lifesteal: 0, knock: 1,
    shape: 'ink', tint: null, chargeTime: 1.1, pull: false, shatter: false, magnet: false, rainbow: false,
  };
}

/** Merge a partial into a profile. Numbers stack, flags OR, shape/tint take the latest. */
export function mergeProfile(p: AttackProfile, part: ProfilePart): void {
  for (const k of Object.keys(part) as (keyof ProfilePart)[]) {
    const v = part[k];
    if (v === undefined) continue;
    if (k === 'mode') { p.modes.add(v as AttackMode); continue; }
    if (k === 'shape' || k === 'tint') { (p as any)[k] = v; continue; }
    if (k === 'spread' || k === 'chargeTime') { (p as any)[k] = Math.max((p as any)[k], v as number); continue; }
    if (k === 'homing') { p.homing = p.homing > 0 ? Math.max(p.homing, v as number) + 0.3 : (v as number); continue; }
    if (k === 'shots') { p.shots += v as number; continue; }
    const cur = (p as any)[k];
    if (typeof cur === 'boolean') (p as any)[k] = cur || !!v;
    else if (typeof cur === 'number') (p as any)[k] = cur + (v as number);
  }
}

/** Resolve the primary attack mode from the collected set. */
export function primaryMode(p: AttackProfile): AttackMode {
  const order: AttackMode[] = ['beam', 'laser', 'melee', 'burst', 'charge'];
  for (const m of order) if (p.modes.has(m)) return m;
  return 'shot';
}

/** Probability helper that scales with luck. */
export function luckChance(base: number, luck: number): number {
  return Math.max(0, Math.min(0.95, base * (1 + Math.max(-0.8, luck * 0.12))));
}
