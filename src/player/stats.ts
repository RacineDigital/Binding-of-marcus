// Numeric stat block. Items contribute additive and multiplicative parts; final values derived here.
export interface StatMods {
  damage?: number; damageMult?: number; tears?: number; tearsMult?: number; range?: number;
  shotSpeed?: number; speed?: number; luck?: number; size?: number; knockback?: number;
}
export const STAT_LABEL: Record<keyof StatMods, string> = {
  damage: 'Damage', damageMult: 'Damage', tears: 'Fire rate', tearsMult: 'Fire rate', range: 'Range',
  shotSpeed: 'Shot speed', speed: 'Speed', luck: 'Luck', size: 'Shot size', knockback: 'Knockback',
};

export interface BaseStats { damage: number; tears: number; range: number; shotSpeed: number; speed: number; luck: number }
export const MARCUS_BASE: BaseStats = { damage: 3.5, tears: 2.73, range: 230, shotSpeed: 1, speed: 1, luck: 0 };

export interface FinalStats {
  damage: number; fireRate: number; range: number; shotSpeed: number; speed: number; luck: number; size: number; knockback: number;
}

export function computeStats(base: BaseStats, mods: StatMods[]): FinalStats {
  let dmg = base.damage, dm = 1, tears = base.tears, tm = 1, range = base.range, ss = base.shotSpeed, sp = base.speed,
    luck = base.luck, size = 1, kb = 1;
  for (const m of mods) {
    dmg += m.damage ?? 0; dm *= m.damageMult ?? 1; tears += m.tears ?? 0; tm *= m.tearsMult ?? 1;
    range += m.range ?? 0; ss += m.shotSpeed ?? 0; sp += m.speed ?? 0; luck += m.luck ?? 0; size += m.size ?? 0; kb += m.knockback ?? 0;
  }
  // Soft cap on flat damage so stacking stays exciting but bounded.
  const d = Math.max(0.5, dmg) * dm;
  return {
    damage: Math.max(0.5, d),
    fireRate: Math.max(0.6, Math.min(24, tears * tm)),
    range: Math.max(70, range),
    shotSpeed: Math.max(0.45, Math.min(2.6, ss)),
    speed: Math.max(0.5, Math.min(2.0, sp)),
    luck,
    size: Math.max(0.5, Math.min(3.5, size + Math.max(0, d - 3.5) * 0.035)),
    knockback: kb,
  };
}
