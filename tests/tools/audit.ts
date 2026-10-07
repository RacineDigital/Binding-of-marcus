// Content audit for Lost Marcus 2.0: counts what exists and flags what is thin (stat-only items,
// near-duplicate stat lines, unreachable items, enemies without their own behaviour).
//   npx tsx tests/tools/audit.ts [--json]
import { ALL_ITEMS, CONSUMABLES } from '../../src/items/registry';
import { ENEMY_DEFS } from '../../src/enemies/registry';
import { BOSSES } from '../../src/bosses/registry';
import { TEMPLATES } from '../../src/rooms/templates';
import { FLOORS, ALT_FLOORS } from '../../src/data/floors';
import { CHARACTERS } from '../../src/player/characters';
import { CHALLENGES, ACHIEVEMENTS } from '../../src/data/achievements';
import { ENDINGS } from '../../src/data/endings';
import { ALL_SET_PIECES } from '../../src/generation/setpieces';

const kinds: Record<string, number> = {};
const statOnly: string[] = [], mech: string[] = [], unreach: string[] = [];
const sig = new Map<string, string[]>();
for (const it of ALL_ITEMS) {
  kinds[it.kind] = (kinds[it.kind] ?? 0) + 1;
  const hasMech = !!(it.attack || it.hooks || it.familiar || it.active || it.bomb || it.flight || it.spectralBody || it.give || it.health);
  if (it.kind === 'passive' && !hasMech) { statOnly.push(it.id); const k = JSON.stringify(it.stats ?? {}); sig.set(k, [...(sig.get(k) ?? []), it.id]); }
  else mech.push(it.id);
  if (!Object.values(it.pools ?? {}).some((w) => (w ?? 0) > 0) && it.kind !== 'trinket') unreach.push(it.id);
}
const dupes = [...sig.entries()].filter(([, ids]) => ids.length > 1);
const enemyFns = new Map<string, string[]>();
for (const d of Object.values(ENEMY_DEFS) as any[]) { const k = d.update.toString(); enemyFns.set(k, [...(enemyFns.get(k) ?? []), d.id]); }
const sharedAi = [...enemyFns.values()].filter((v) => v.length > 1);
const charms = CONSUMABLES.filter((c) => c.kind === 'charm').length;
const out = {
  items: ALL_ITEMS.length, byKind: kinds, consumables: CONSUMABLES.length, charms,
  passiveStatOnly: statOnly.length, statOnlyDuplicateGroups: dupes.map(([s, ids]) => `${ids.join(', ')} :: ${s}`),
  notInAnyPool: unreach,
  enemies: Object.keys(ENEMY_DEFS).length, enemiesSharingIdenticalBehaviour: sharedAi,
  bosses: Object.keys(BOSSES).length, roomTemplates: TEMPLATES.length, setPieces: ALL_SET_PIECES.length,
  floors: FLOORS.length, altFloors: ALT_FLOORS.length, characters: CHARACTERS.length, baseCharacters: CHARACTERS.filter((c) => !c.tainted).length,
  challenges: CHALLENGES.length, achievements: ACHIEVEMENTS.length, endings: Object.keys(ENDINGS).length,
};
if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 1));
else for (const [k, v] of Object.entries(out)) console.log(k.padEnd(34), Array.isArray(v) ? `${v.length}${v.length ? '\n    ' + v.join('\n    ') : ''}` : typeof v === 'object' ? JSON.stringify(v) : v);
