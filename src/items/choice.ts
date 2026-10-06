import type { ItemDef } from './types';

export type ItemRole = 'offense' | 'survival' | 'utility' | 'active';
export const ROLE_LABEL: Record<ItemRole, string> = { offense: 'FIREPOWER', survival: 'SURVIVAL', utility: 'UTILITY', active: 'ACTIVE TOOL' };
export const ROLE_COLOR: Record<ItemRole, string> = { offense: '#efa784', survival: '#a2d4c6', utility: '#d9ba7c', active: '#beb4ef' };
/** Broad roles keep a treasure choice from being two nearly identical stat sticks. */
export function itemRole(i: ItemDef): ItemRole {
  if (i.kind === 'active') return 'active';
  if (i.attack || i.familiar || (i.stats?.damage ?? 0) > 0 || (i.stats?.damageMult ?? 1) > 1 || (i.stats?.tears ?? 0) > 0 || (i.stats?.tearsMult ?? 1) > 1) return 'offense';
  if (i.health || i.flight || i.spectralBody) return 'survival';
  return 'utility';
}
