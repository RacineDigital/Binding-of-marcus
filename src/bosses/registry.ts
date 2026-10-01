import type { EnemyDef } from '../enemies/enemy';
import { BOSSES_A } from './bosses_a';
import { BOSSES_B } from './bosses_b';
import { BOSSES_C } from './bosses_c';
import { BOSSES_D } from './bosses_d';
import { BOSSES_E } from './bosses_e';
export const BOSSES: EnemyDef[] = [...BOSSES_A, ...BOSSES_B, ...BOSSES_C, ...BOSSES_D, ...BOSSES_E];
import './lifedefs';
