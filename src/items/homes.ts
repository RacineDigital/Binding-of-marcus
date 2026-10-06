// Where every item comes from. Each item lives in exactly one pool, and every item of a
// transformation shares its pool, so you learn where to look:
//   The Curio (treasure)   Mothkin, Needleworker, Live Wire (lasers), The Boys, and most shot changers
//   Mott's Wares (shop)    Clockwork, Tantrum, the dice, keys, bombs and pocket things
//   The Inkwell (deal)     Inkblooded and every pact: the devil's pool, paid in hearts
//   Wax Chapel (blessing)  Waxen Saint and Drainer: the angels' pool
//   Hexed Room (curse)     Hollowed and Ossified, and things with a price on them
//   Crawlspace (secret)    Night Count, and whatever the house hides
//   Chapter's End (boss)   food and plain stat-ups
//   The Archive (library)  books
import type { ItemDef, PoolId } from './types';

/** color is for dark panels, ink for the parchment menus. */
export interface PoolInfo { name: string; item: string; color: string; ink: string; mark: string; dark?: boolean }
export const POOL_INFO: Partial<Record<PoolId, PoolInfo>> = {
  treasure: { name: 'The Curio', item: 'Curio item', color: '#e8c060', ink: '#8a6a10', mark: '◆' },
  shop: { name: 'Mott\'s Wares', item: 'Shop item', color: '#7ad0a0', ink: '#2a7a4a', mark: '¢' },
  deal: { name: 'The Inkwell', item: 'Inkwell item', color: '#ff4a4a', ink: '#a01020', mark: '⛧', dark: true },
  blessing: { name: 'Wax Chapel', item: 'Chapel item', color: '#fff4c8', ink: '#9a7a20', mark: '✚' },
  curse: { name: 'Hexed Room', item: 'Hexed item', color: '#c070ff', ink: '#6a2a9a', mark: '✖', dark: true },
  secret: { name: 'Crawlspace', item: 'Secret room item', color: '#a8a0c0', ink: '#4a4460', mark: '?' },
  boss: { name: 'Chapter\'s End', item: 'Boss item', color: '#ff9a50', ink: '#a04a10', mark: '☠' },
  library: { name: 'The Archive', item: 'Archive item', color: '#80b0ff', ink: '#2a4a9a', mark: '❏' },
};

/** The one pool an item belongs to (null for starting and story items). */
export function homePool(it: ItemDef): PoolId | null {
  let best: PoolId | null = null, bw = 0;
  for (const [k, v] of Object.entries(it.pools) as [PoolId, number][]) if (v > bw) { bw = v; best = k; }
  return best;
}
export function poolInfo(it: ItemDef): PoolInfo | null { const h = homePool(it); return h ? POOL_INFO[h] ?? null : null; }
