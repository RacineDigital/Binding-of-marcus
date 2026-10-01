import { BaseStats } from './stats';
import type { ProfilePart } from '../projectiles/profile';

export interface CharacterDef {
  id: string; name: string; title: string; desc: string; look: string;
  base: BaseStats;
  health: { red: number; wax?: number; ink?: number; brass?: number; noRed?: boolean };
  items: string[]; buttons: number; keys: number; bombs: number;
  profile?: ProfilePart;
  flight?: boolean;
  unlock?: string; unlockHint: string;
  passive: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'marcus', name: 'Marcus', title: 'The Grandson', look: 'marcus',
    desc: 'Eleven years old, wearing his grandfather\'s cardigan. Flicks ink when he is frightened, which is always.',
    base: { damage: 3.5, tears: 2.73, range: 230, shotSpeed: 1, speed: 1, luck: 0 },
    health: { red: 3 }, items: [], buttons: 0, keys: 1, bombs: 1, unlockHint: '', passive: 'None. The baseline.',
  },
  {
    id: 'wren', name: 'Wren', title: 'The Cousin', look: 'wren',
    desc: 'Quick, reckless, and never without her slingshot. Her pebbles ricochet once off walls and rocks.',
    base: { damage: 3.0, tears: 3.1, range: 210, shotSpeed: 1.15, speed: 1.2, luck: 0 },
    health: { red: 2, wax: 2 }, items: ['slingshot'], buttons: 5, keys: 0, bombs: 0,
    unlock: 'beat_ch2', unlockHint: 'Defeat the Chapter II boss.', passive: 'Starts with Wren\'s Slingshot. Fast but fragile.',
  },
  {
    id: 'edda', name: 'Edda', title: 'The Seamstress', look: 'edda',
    desc: 'Marcus\'s aunt, who mended everything in the house but herself. Throws needles that pass through the first thing they hit.',
    base: { damage: 2.6, tears: 3.7, range: 250, shotSpeed: 1.25, speed: 1, luck: 1 },
    health: { red: 2, brass: 2 }, items: ['thimble'], buttons: 0, keys: 1, bombs: 1,
    profile: { shape: 'needle', pierce: 1 },
    unlock: 'beat_ch4', unlockHint: 'Defeat the Chapter IV boss.', passive: 'Needle shots pierce one enemy. Starts with the Thimble.',
  },
  {
    id: 'elias', name: 'Elias', title: 'The Binder', look: 'elias',
    desc: 'What remains of the grandfather. He cannot hold red hearts, drifts over pits, and his shots pass through stone.',
    base: { damage: 3.1, tears: 2.6, range: 260, shotSpeed: 0.95, speed: 0.95, luck: 0 },
    health: { red: 0, wax: 6, noRed: true }, items: ['binders_awl'], buttons: 0, keys: 0, bombs: 2,
    profile: { spectral: true, tint: '#9ad0f0', shape: 'wax' }, flight: true,
    unlock: 'beat_ch6', unlockHint: 'Defeat the Chapter VI boss.', passive: 'Wax hearts only. Flight and spectral shots.',
  },
  {
    id: 'blot', name: 'The Blot', title: 'The Unwritten', look: 'blot',
    desc: 'A stain that learned to walk. Hits hard, bleeds ink, and every heart it holds wants to burst.',
    base: { damage: 4.4, tears: 2.3, range: 200, shotSpeed: 0.9, speed: 0.9, luck: -1 },
    health: { red: 0, ink: 6, noRed: true }, items: [], buttons: 0, keys: 0, bombs: 0,
    profile: { creep: true, shape: 'void' },
    unlock: 'beat_final', unlockHint: 'Finish the story once.', passive: 'Ink hearts only. Shots trail damaging ink.',
  },
];
export const charById = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
