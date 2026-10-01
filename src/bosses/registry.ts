import type { EnemyDef } from '../enemies/enemy';
import { BOSSES_A } from './bosses_a';
import { BOSSES_B } from './bosses_b';
import { BOSSES_C } from './bosses_c';
export const BOSSES: EnemyDef[] = [...BOSSES_A, ...BOSSES_B, ...BOSSES_C];
