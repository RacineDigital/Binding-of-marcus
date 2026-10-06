// A binding is a run-long sidegrade, chosen before opening the book. No permanent power grind.
import type { StatMods } from '../player/stats';

export type BindingId = 'unbound' | 'ember' | 'wayfarer' | 'clockwork';
export interface Binding {
  id: BindingId; name: string; title: string; color: string; dark: string;
  benefit: string; cost: string; stats: StatMods;
  keys?: number; bombs?: number; roomCharge?: number; active?: string;
}
export const BINDINGS: readonly Binding[] = [
  { id: 'unbound', name: 'Unbound', title: 'LET THE BOOK SURPRISE YOU', color: '#d9ba7c', dark: '#654e30',
    benefit: 'The reader\'s original starting kit.', cost: 'No added strengths or weaknesses.', stats: {} },
  { id: 'ember', name: 'Ember', title: 'MAKE EVERY SHOT COUNT', color: '#efa784', dark: '#843c2c',
    benefit: 'Damage +25%. Stronger individual shots.', cost: 'Fire rate -15%. Misses cost more time.', stats: { damageMult: 1.25, tearsMult: 0.85 } },
  { id: 'wayfarer', name: 'Wayfarer', title: 'OPEN ANOTHER DOOR', color: '#a2d4c6', dark: '#305d56',
    benefit: 'Speed +0.15. Start with +2 keys and +1 bomb.', cost: 'Damage -15%. Explore to build your strength.', stats: { speed: 0.15, damageMult: 0.85 }, keys: 2, bombs: 1 },
  { id: 'clockwork', name: 'Clockwork', title: 'BUILD AROUND YOUR ACTIVE', color: '#beb4ef', dark: '#574378',
    benefit: '+1 active charge per cleared combat room.', cost: 'Damage -20%. Tuning Fork if no starting active.', stats: { damageMult: 0.8 }, roomCharge: 1, active: 'tuning_fork' },
];
export function bindingById(id: unknown): Binding { return BINDINGS.find((b) => b.id === id) ?? BINDINGS[0]; }

export const FLAWLESS_TARGET = 3;
/** Every third consecutive unhurt combat clear pays a chest that never needs a key. */
export function flawlessReward(streak: number): boolean { return streak > 0 && streak % FLAWLESS_TARGET === 0; }
