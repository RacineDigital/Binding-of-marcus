// The tainted readers' signatures: each reader's gift, inked over and turned against itself. Like the
// other signatures these never appear in a pool and can't be rerolled away.
import type { ItemDef } from '../types';
import { ramp, hex, P } from './kit';

const SIG = ['quest', 'innate', 'tainted'];
const INK = '#2a1a3a', RED = '#c8283a';

/** Ozzie's fate: what each face of the die gives for one room. */
const FATE: { name: string; stats?: Record<string, number>; attack?: Record<string, unknown> }[] = [
  { name: 'Snake eyes: slower and weaker', stats: { damage: -1, speed: -0.15 } },
  { name: 'Two: shots fan out', attack: { shots: 2, spread: 14 } },
  { name: 'Three: fire rate up', stats: { tears: 1 } },
  { name: 'Four: shots pierce', attack: { pierce: 2 } },
  { name: 'Five: damage up', stats: { damage: 2 } },
  { name: 'Six: everything up', stats: { damage: 1.5, tears: 0.6, speed: 0.2, luck: 2 } },
];

export const TAINTED_ITEMS: ItemDef[] = [
  { id: 't_smudge', name: 'The Smudge', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Ink always comes back', effect: ['Every shot flies out and comes back to you, hitting whatever it passes on the way back too.', 'Shorter range.'],
    attack: { boomerang: true, pierce: 1 }, stats: { range: -50 },
    icon: (p: P) => { p.ball(9, 9, 6, 5, ramp(INK)); p.line(3, 12, 15, 6, hex('#6a64b8')); p.set(14, 5, '#f2f0ff'); p.set(4, 13, '#f2f0ff'); },
    lore: 'He wrote himself into the story, and then he couldn\'t get the ink off.' },
  { id: 't_runaway', name: 'Running Away', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Too fast to hold', effect: ['Pebbles ricochet twice more and fly in pairs.', 'You are very fast, but you can\'t hold red hearts.'],
    attack: { bounce: 2, shots: 1, spread: 10 }, stats: { speed: 0.3, damage: -0.6 },
    icon: (p: P) => { p.ball(6, 11, 3, 3, ramp('#9a948a')); p.ball(12, 7, 3, 3, ramp('#9a948a')); p.line(2, 15, 16, 2, hex(RED)); },
    lore: 'Wren never stopped running. Not even when there was nothing left behind her.' },
  { id: 't_unravel', name: 'Unravelling', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Every thread pulls tight', effect: ['Your needles almost always stitch the enemy they hit to two more, and the thread carries the damage across.', 'Bronze shields instead of most of your hearts.'],
    attack: { chain: 2, chainChance: 0.8, pierce: 1 }, stats: { damage: -0.4 },
    icon: (p: P) => { p.line(3, 14, 14, 3, hex('#c8c8d0')); for (let i = 0; i < 6; i++) p.set(4 + i * 2, 4 + ((i * 5) % 9), RED); p.line(5, 6, 13, 13, hex(RED)); },
    lore: 'She mended everyone else until there was no thread left for her.' },
  { id: 't_orbit', name: 'Lost Pages', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Pages circle him', effect: ['Your shots circle around you instead of flying away, passing through stone.', 'You float, and hold only wax hearts.'],
    attack: { orbit: true, spectral: true }, stats: { damage: 0.4 }, flight: true,
    icon: (p: P) => { p.ring(9, 9, 6, '#9ad0f0'); for (const [x, y] of [[9, 3], [15, 9], [9, 15], [3, 9]]) p.rect(x - 1, y - 1, 3, 3, hex('#efe6d0')); },
    lore: 'He forgot where the story was going, so it goes round and round him instead.' },
  { id: 't_spill', name: 'The Spill', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'It never stops pouring', effect: ['Hold fire to charge, release for a long, full ink beam that leaves burning ink where it lands.', 'You fly, and hold only ink hearts.'],
    attack: { mode: 'beam', creep: true, shape: 'void', tint: '#3a1a6a' }, flight: true,
    icon: (p: P) => { p.ball(9, 6, 5, 4, ramp('#1a1830')); p.rect(7, 9, 4, 8, hex('#2a2650')); p.ball(9, 16, 6, 2, ramp('#3a1a6a')); p.set(7, 5, '#f2f0ff'); p.set(11, 5, '#f2f0ff'); },
    lore: 'Once it learned to open wide, it couldn\'t close again.' },
  { id: 't_fate', name: 'Fate', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Every room is a bet', effect: ['Each new room rolls a die: one to six, from a curse to a blessing, for that room only.', 'Luck makes high rolls more likely.'],
    hooks: {
      onRoomEnter(w) {
        const pl = w.player;
        if (w.room.cleared && w.room.type !== 'boss') return;
        const luck = pl.stats.luck;
        let roll = Math.floor(Math.random() * 6);
        if (luck > 0 && Math.random() < Math.min(0.5, luck * 0.08)) roll = Math.min(5, roll + 1);
        const f = FATE[roll];
        pl.addTemp({ id: 't_fate', stats: f.stats as any, attack: f.attack as any, room: true });
        w.hud.toast('Fate rolls ' + f.name, 1.8);
        w.audio.play('coinDrop', { pitch: 0.7 + roll * 0.1 });
      },
    },
    icon: (p: P) => { p.rect(4, 4, 10, 10, hex('#2a2230')); p.rect(4, 13, 10, 1, hex('#100c14')); for (const [x, y] of [[6, 6], [11, 11]]) p.set(x, y, RED); },
    lore: 'Ozzie bet everything. The die decides what he gets back.' },
  { id: 't_burnout', name: 'Burnt Out', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Everything she touches catches', effect: ['Your fire sets enemies alight, and anything you kill bursts into flame, hurting what stands near it.'],
    attack: { burn: 1 },
    hooks: { onKill(w, e) { w.explode(e.x, e.y, 22, 4, { friendly: true, small: true, noPlayer: true, source: 't_burnout' }); } },
    icon: (p: P) => { p.ball(9, 11, 4, 5, ramp('#ff8030')); p.ball(9, 9, 2, 3, ramp('#ffe080')); p.rect(7, 15, 4, 2, hex('#3a2a22')); },
    lore: 'Nell kept the lamp lit every night. One night it kept her.' },
  { id: 't_brute', name: 'Brute', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Nothing stands in his way', effect: ['Your swings knock enemies flying and break rocks.', 'Kills sometimes heal half a heart.'],
    attack: { shatter: true, knock: 1.5 }, stats: { damage: 1, speed: -0.08 },
    hooks: { onKill(w) { if (Math.random() < 0.1 && w.player.health.healRed(1)) w.audio.play('heal', { vol: 0.5 }); } },
    icon: (p: P) => { p.tube(4, 14, 13, 4, 1.5, ramp('#e8e0cc')); p.ball(13, 4, 2.5, 2.5, ramp(RED)); },
    lore: 'Bram stopped walking home the long way. He just goes through.' },
  { id: 't_swarm', name: 'The Swarm', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'They follow, and multiply', effect: ['Your moths hunt, and split into two more when they hit.', 'Each moth hits a little softer.'],
    attack: { homing: 0.6, split: 2, splitOnHit: true, shape: 'moth' }, stats: { damage: -1 }, flight: true,
    icon: (p: P) => { for (const [x, y] of [[5, 5], [13, 7], [8, 13], [14, 14]]) { p.poly([x, y, x - 3, y - 2, x - 2, y + 2], hex('#5a4c38')); p.poly([x, y, x + 3, y - 2, x + 2, y + 2], hex('#3a3024')); } },
    lore: 'Wick isn\'t one moth any more. It never really was.' },
  { id: 't_wither', name: 'Withering', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'The roses have gone to thorns', effect: ['Your thorns poison and slow what they hit, and leave brambles behind them.', 'Wax hearts only.'],
    attack: { poison: 1, slow: 0.3, creep: true, shape: 'needle', tint: '#6a7a3a' },
    icon: (p: P) => { p.tube(4, 15, 13, 5, 1, ramp('#4a3a2a')); for (const [x, y] of [[6, 12], [9, 9], [11, 7]]) p.set(x + 1, y, '#a8b070'); p.ball(13, 4, 3, 3, ramp('#5a2a3a')); },
    lore: 'Ada\'s rose grew back the wrong way: all thorn, no flower.' },
];
