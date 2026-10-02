// Central registry of items and consumables. Content lives in ./data/*.
import type { ItemDef, ConsumableDef, PoolId } from './types';
import { PASSIVES_A } from './data/passives_a';
import { PASSIVES_B } from './data/passives_b';
import { ACTIVES } from './data/actives';
import { FAMILIARS } from './data/familiars';
import { REFERENCES } from './data/references';
import { DICE } from './data/dice';
import { STORY_ITEMS } from './data/story';
import { FRIEND_ITEMS } from './data/friends';
import { ECHO_ITEMS } from './data/echoes';
import { PACT_ITEMS } from './data/pacts';
import { INNATE_ITEMS } from './data/innate';
import { TAINTED_ITEMS } from './data/tainted';
import { PAGES, SWEETS, CHARMS } from './data/consumables';

export const ALL_ITEMS: ItemDef[] = [...PASSIVES_A, ...PASSIVES_B, ...ACTIVES, ...FAMILIARS, ...REFERENCES, ...DICE, ...STORY_ITEMS, ...FRIEND_ITEMS, ...ECHO_ITEMS, ...PACT_ITEMS, ...INNATE_ITEMS, ...TAINTED_ITEMS];
const byId = new Map<string, ItemDef>();
for (const it of ALL_ITEMS) {
  if (byId.has(it.id)) console.warn('duplicate item id', it.id);
  byId.set(it.id, it);
}
export const CONSUMABLES: ConsumableDef[] = [...PAGES, ...SWEETS, ...CHARMS];
const consById = new Map<string, ConsumableDef>();
for (const c of CONSUMABLES) consById.set(c.id, c);
// charms are also usable as "items" for stat recomputation
for (const c of CHARMS) byId.set(c.id, { id: c.id, name: c.name, kind: 'trinket', quality: 1, pools: {}, pickup: c.desc, effect: c.effect, stats: c.stats, attack: c.attack, hooks: c.hooks, bomb: (c as any).bomb, icon: c.icon ?? (() => {}) });

export function getItem(id: string): ItemDef | undefined { return byId.get(id); }
export function getConsumable(id: string): ConsumableDef | undefined { return consById.get(id); }
export function itemsInPool(pool: PoolId): ItemDef[] { return ALL_ITEMS.filter((i) => (i.pools[pool] ?? 0) > 0); }
export const FALLBACK_ITEM = 'stale_crust';
