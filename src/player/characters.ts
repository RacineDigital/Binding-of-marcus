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
  /** The reader this is the tainted version of (unlocked by earning all of that reader's marks). */
  tainted?: string;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'marcus', name: 'Marcus', title: 'The Grandson', look: 'marcus',
    desc: 'Eleven years old, lost inside an oversized hoodie. Flicks ink when he is frightened, which is always.',
    base: { damage: 3.5, tears: 2.73, range: 230, shotSpeed: 1, speed: 1, luck: 0 },
    health: { red: 3 }, items: ['frightened'], buttons: 0, keys: 1, bombs: 1, unlockHint: '', passive: 'Frightened: getting hit makes him flick ink and fire much faster for a moment. Hits harder on his last half heart.',
  },
  {
    id: 'wren', name: 'Wren', title: 'The Cousin', look: 'wren',
    desc: 'Marcus\'s cousin. Quick, reckless, and never without her slingshot; she once drew Grandad wearing a crown. Her pebbles ricochet off walls.',
    base: { damage: 3.0, tears: 3.1, range: 210, shotSpeed: 1.15, speed: 1.2, luck: 0 },
    health: { red: 2, wax: 2 }, items: ['slingshot'], buttons: 5, keys: 0, bombs: 0,
    unlock: 'beat_ch2', unlockHint: 'Defeat the Chapter II boss.', passive: 'Slingshot: pebbles ricochet off the walls. Fast but fragile.',
  },
  {
    id: 'edda', name: 'Edda', title: 'The Seamstress', look: 'edda',
    desc: 'Marcus\'s aunt, who mended everything but herself, and sewed Grandad\'s name into his hospital coat. Her needles pass through the first thing they hit.',
    base: { damage: 2.6, tears: 3.7, range: 250, shotSpeed: 1.25, speed: 1, luck: 1 },
    health: { red: 2, brass: 2 }, items: ['thimble', 'stitchwork'], buttons: 0, keys: 1, bombs: 1,
    profile: { shape: 'needle', pierce: 1 },
    unlock: 'beat_ch4', unlockHint: 'Defeat the Chapter IV boss.', passive: 'Stitchwork: needles pierce and stitch enemies together. Starts with the Thimble.',
  },
  {
    id: 'elias', name: 'Elias', title: 'The Binder', look: 'elias',
    desc: 'What remains of the grandfather, still looking for the last page. He cannot hold red hearts, drifts over pits, and his shots pass through stone.',
    base: { damage: 3.1, tears: 2.6, range: 260, shotSpeed: 0.95, speed: 0.95, luck: 0 },
    health: { red: 0, wax: 6, noRed: true }, items: ['binders_awl'], buttons: 0, keys: 0, bombs: 2,
    profile: { spectral: true, tint: '#9ad0f0', shape: 'wax' }, flight: true,
    unlock: 'beat_ch6', unlockHint: 'Defeat the Chapter VI boss.', passive: 'Wax hearts only. Flies, and his shots pass through stone.',
  },
  {
    id: 'blot', name: 'The Blot', title: 'The Unwritten', look: 'blot',
    desc: 'The ink Grandfather spilled across Chapter Seven, which learned to walk and then to fly. It cannot throw. It opens its mouth instead.',
    base: { damage: 4.4, tears: 2.3, range: 200, shotSpeed: 0.9, speed: 0.9, luck: -1 },
    health: { red: 0, ink: 6, noRed: true }, items: ['ink_maw'], buttons: 0, keys: 0, bombs: 0,
    profile: { shape: 'void' }, flight: true,
    unlock: 'beat_final', unlockHint: 'Finish the story once.', passive: 'Ink hearts only, but sometimes a red one grows. Flies, and spews a short, charged ink beam.',
  },
  {
    id: 'ozzie', name: 'Ozzie', title: 'The Gambler', look: 'ozzie',
    desc: 'The neighbour\'s boy, who never once said no to a bet. He keeps a six-sided die in his pocket and trusts it more than his eyes.',
    base: { damage: 3.2, tears: 2.73, range: 230, shotSpeed: 1, speed: 1.05, luck: 2 },
    health: { red: 2, wax: 2 }, items: ['old_dice', 'loaded_dice'], buttons: 7, keys: 1, bombs: 1,
    unlock: 'unlock_ozzie', unlockHint: 'Defeat It Remembers while holding a die.', passive: 'Loaded: every shot rolls a die, and a six hits for triple. Starts with the D6.',
  },
  {
    id: 'nell', name: 'Nell', title: 'The Lamplighter', look: 'nell',
    desc: 'Marcus\'s older sister, who visited Grandad every day. She came down after Marcus with a lamp, and she is furious about it.',
    base: { damage: 3.3, tears: 2.8, range: 220, shotSpeed: 1, speed: 1, luck: 0 },
    health: { red: 3 }, items: ['lamplight', 'pocket_lantern'], buttons: 0, keys: 1, bombs: 1,
    unlock: 'beat_unwritten', unlockHint: 'Go through the tear after the Binding and defeat what waits on the Last Page.', passive: 'Lamplight: embers often set enemies alight, and burning enemies take more from her. Carries the Pocket Lantern.',
  },
  {
    id: 'bram', name: 'Bram', title: 'The Bruiser', look: 'bram',
    desc: 'The boy from the end of the street. He does not throw things. He hits them, with the bone folder he took from the bindery.',
    base: { damage: 4.2, tears: 2.2, range: 200, shotSpeed: 0.95, speed: 0.88, luck: -1 },
    health: { red: 4 }, items: ['bone_folder', 'tin_heart'], buttons: 0, keys: 0, bombs: 2,
    unlock: 'unlock_bram', unlockHint: 'Defeat three chapter bosses in one run without any of them hitting you.', passive: 'Fights up close with the Bone Folder: no shots, big swings. Slow and sturdy.',
  },
  {
    id: 'wick', name: 'Wick', title: 'The Moth Child', look: 'wick',
    desc: 'Something that lived in the lampshade, raised by moths. It floats, it follows the light, and its moths follow it.',
    base: { damage: 2.8, tears: 3.0, range: 240, shotSpeed: 1.05, speed: 1.05, luck: 0 },
    health: { red: 2, wax: 2 }, items: ['moth_friend', 'moth_jar', 'moth_swarm'], buttons: 0, keys: 1, bombs: 1,
    profile: { shape: 'moth' }, flight: true,
    unlock: 'unlock_wick', unlockHint: 'Finish the story while you are Mothkin.', passive: 'Flies. Moth shots home in on enemies. Starts with the Lampmoth and a Jar of Moths.',
  },
  {
    id: 'ada', name: 'Ada', title: 'The Gardener', look: 'ada',
    desc: 'Grandmother, who went at four minutes past four. Her rose still grows through the greenhouse roof, and she has come to see to it, and to him.',
    base: { damage: 3.2, tears: 2.8, range: 250, shotSpeed: 1, speed: 0.95, luck: 2 },
    health: { red: 2, wax: 4 }, items: ['grandmothers_ring', 'four_leaf', 'rose_cuttings'], buttons: 3, keys: 1, bombs: 1,
    profile: { shape: 'needle', tint: '#4a9a3a', slow: 0.35 },
    unlock: 'unlock_ada', unlockHint: 'Finish The Visit while carrying Grandmother\'s Ring.', passive: 'Rose Cuttings: thorns slow what they hit and leave brambles behind. Starts with Grandmother\'s Ring.',
  },
];
// ------------------------------------------------------------------ the mirrored
// Each reader's reflection, inked over: their gift turned against them. One unlocks once its reader has earned
// all five ending marks.
const T = (base: string, name: string, title: string, desc: string, d: Omit<CharacterDef, 'id' | 'name' | 'title' | 'desc' | 'look' | 'unlock' | 'unlockHint' | 'tainted'>): CharacterDef => {
  const b = CHARACTERS.find((c) => c.id === base)!;
  return { id: base + '_t', name: 'Mirrored ' + name, title, desc, look: base + '_t', unlock: 'tainted_' + base, tainted: base,
    unlockHint: `Earn all five marks as ${b.name}.`, ...d };
};
export const TAINTED: CharacterDef[] = [
  T('marcus', 'Marcus', 'The Smudged', 'The boy who wrote himself into the book, and could not wash the ink off. Whatever he throws comes back to him.',
    { base: { damage: 3.6, tears: 2.6, range: 230, shotSpeed: 1, speed: 1, luck: 0 }, health: { red: 3 }, items: ['t_smudge'], buttons: 0, keys: 1, bombs: 1,
      passive: 'The Smudge: every shot comes back to you, hitting going and coming. Shorter range.' }),
  T('wren', 'Wren', 'The Runaway', 'She ran so far she ran out of herself. Too quick to hold anything red, and her pebbles never stop bouncing.',
    { base: { damage: 3.0, tears: 3.0, range: 210, shotSpeed: 1.2, speed: 1.15, luck: 0 }, health: { red: 0, wax: 4, noRed: true }, items: ['slingshot', 't_runaway'], buttons: 5, keys: 0, bombs: 0,
      passive: 'Running Away: pebbles fly in pairs and ricochet more. Very fast, wax hearts only.' }),
  T('edda', 'Edda', 'The Unravelled', 'She stitched everyone else back together. Now every thread she throws pulls three of them tight at once.',
    { base: { damage: 2.8, tears: 3.4, range: 250, shotSpeed: 1.25, speed: 1, luck: 1 }, health: { red: 1, brass: 4 }, items: ['thimble', 't_unravel'], buttons: 0, keys: 1, bombs: 1,
      profile: { shape: 'needle', pierce: 1 }, passive: 'Unravelling: needles stitch the enemy they hit to two more. One heart, four bronze shields.' }),
  T('elias', 'Elias', 'The Forgotten', 'He forgot where the story was going. The pages circle him now, a slow storm he cannot put down.',
    { base: { damage: 3.0, tears: 2.8, range: 260, shotSpeed: 0.95, speed: 0.95, luck: 0 }, health: { red: 0, wax: 4, noRed: true }, items: ['binders_awl', 't_orbit'], buttons: 0, keys: 0, bombs: 2,
      profile: { spectral: true, tint: '#9ad0f0', shape: 'page' }, flight: true, passive: 'Lost Pages: your shots circle around you through stone. Flies, wax hearts only.' }),
  T('blot', 'Blot', 'The Spill', 'It opened wide once and never closed again. The ink just keeps coming, all the way across the room.',
    { base: { damage: 3.8, tears: 2.2, range: 220, shotSpeed: 0.9, speed: 0.9, luck: -1 }, health: { red: 0, ink: 4, noRed: true }, items: ['t_spill'], buttons: 0, keys: 0, bombs: 0,
      profile: { shape: 'void' }, flight: true, passive: 'The Spill: a full-length ink beam that leaves burning ink behind. Flies, ink hearts only.' }),
  T('ozzie', 'Ozzie', 'The Broke', 'He bet everything he had, and then he bet himself. Every room he walks into is another throw of the die.',
    { base: { damage: 3.3, tears: 2.7, range: 230, shotSpeed: 1, speed: 1.05, luck: 1 }, health: { red: 2 }, items: ['old_dice', 't_fate'], buttons: 0, keys: 1, bombs: 1,
      passive: 'Fate: each new room rolls a die, from a curse on one to a blessing on six. Starts broke.' }),
  T('nell', 'Nell', 'The Burnt Out', 'She kept the lamp lit for him every night, until one night it kept her. Everything she touches catches.',
    { base: { damage: 3.4, tears: 2.4, range: 220, shotSpeed: 1, speed: 1, luck: 0 }, health: { red: 2, brass: 1 }, items: ['lamplight', 't_burnout'], buttons: 0, keys: 1, bombs: 1,
      passive: 'Burnt Out: embers set enemies alight, and whatever you kill bursts into flame.' }),
  T('bram', 'Bram', 'The Brute', 'He stopped going round things. He goes through them: walls, rocks, whatever is in the way.',
    { base: { damage: 4.6, tears: 2.1, range: 200, shotSpeed: 0.95, speed: 0.85, luck: -1 }, health: { red: 5 }, items: ['bone_folder', 't_brute'], buttons: 0, keys: 0, bombs: 1,
      passive: 'Brute: huge swings that knock enemies flying and break rocks; kills sometimes heal.' }),
  T('wick', 'Wick', 'The Swarm', 'It was never really one moth. Now it does not pretend: every moth it throws becomes three.',
    { base: { damage: 2.9, tears: 3.2, range: 240, shotSpeed: 1.05, speed: 1.05, luck: 0 }, health: { red: 0, wax: 4, noRed: true }, items: ['moth_friend', 't_swarm'], buttons: 0, keys: 1, bombs: 1,
      profile: { shape: 'moth' }, flight: true, passive: 'The Swarm: moths hunt and split in two when they hit. Flies, wax hearts only.' }),
  T('ada', 'Ada', 'The Withered', 'Her rose came back the wrong way: all thorn, no flower. She has come to see to that, too.',
    { base: { damage: 3.2, tears: 2.8, range: 250, shotSpeed: 1, speed: 0.95, luck: 1 }, health: { red: 0, wax: 6, noRed: true }, items: ['grandmothers_ring', 't_wither'], buttons: 3, keys: 1, bombs: 1,
      profile: { shape: 'needle', tint: '#6a7a3a' }, passive: 'Withering: thorns poison and slow, and leave brambles. Wax hearts only.' }),
];
CHARACTERS.push(...TAINTED);
export const charById = (id: string) => CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
