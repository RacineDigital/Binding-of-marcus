import type { EnemyDef } from './enemy';
import { CELLAR_ENEMIES } from './defs_cellar';
import { CELLAR2_ENEMIES } from './defs_cellar2';
import { BOILER_ENEMIES } from './defs_boiler';
import { UNDER_ENEMIES } from './defs_under';
import { WARD_ENEMIES } from './defs_ward';
import { DEPTHS_ENEMIES } from './defs_depths';
import { CHAPEL_ENEMIES } from './defs_chapel';
import { HOLLOW_ENEMIES } from './defs_hollow';
import { BOSSES } from '../bosses/registry';

export const ENEMY_DEFS: EnemyDef[] = [
  ...CELLAR_ENEMIES, ...CELLAR2_ENEMIES, ...BOILER_ENEMIES, ...UNDER_ENEMIES, ...WARD_ENEMIES, ...DEPTHS_ENEMIES, ...CHAPEL_ENEMIES, ...HOLLOW_ENEMIES,
];
// regular enemies move about a third faster than they were first written to
const ENEMY_PACE = 1.3;
for (const d of ENEMY_DEFS) if (!d.boss) d.speed *= ENEMY_PACE;
const byId = new Map<string, EnemyDef>();
for (const d of [...ENEMY_DEFS, ...BOSSES]) byId.set(d.id, d);
export function getEnemy(id: string): EnemyDef | undefined { return byId.get(id); }
export const ALL_ENEMY_DEFS = () => [...byId.values()];
