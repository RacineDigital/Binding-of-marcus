// Each reader's signature: the thing only they do, like Azazel's stubby brimstone. These are never
// found in a pool, can't be rerolled or traded away, and show in the tracker so you can read them.
import type { ItemDef } from '../types';
import { ramp, hex, P } from './kit';
import { TAU } from '../../core/math';

const SIG = ['quest', 'innate'];

export const INNATE_ITEMS: ItemDef[] = [
  { id: 'ink_tear', name: 'Ink Tear', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Marcus cries ink', effect: ['When you are hurt, you burst into tears: a ring of 8 ink tears flies out from you.'],
    hooks: { onHurt: (w) => {
      const pl = w.player;
      for (let i = 0; i < 8; i++) w.proj.player(w, pl.prof, pl.x, pl.y - 8, 10, (i / 8) * TAU + 0.2, pl.stats.damage, 200, 120, 1);
      w.fx.ring(pl.x, pl.y - 8, 4, 26, '#4450b0', 0.3);
    } },
    icon: (p: P) => { p.ball(9, 11, 4.5, 5, ramp('#4450b0'), { dither: 0.3 }); p.poly([6, 9, 9, 2, 12, 9], hex('#4450b0')); p.set(7, 9, '#c8d0ff'); p.set(8, 8, '#ffffff'); },
    lore: 'He always cried when he was frightened. Down here, it helps.' },
  { id: 'stitchwork', name: 'Stitchwork', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Edda sews them together', effect: ['Your needles pierce, and often stitch the enemy they hit to another nearby: the thread carries the damage across.'],
    attack: { chain: 1, chainChance: 0.35 },
    icon: (p: P) => { p.line(3, 15, 14, 3, hex('#c8c8d0')); p.ring(14, 3, 1.5, '#c8c8d0'); for (let i = 0; i < 5; i++) p.set(4 + i * 2, 12 - (i % 2) * 3, '#c83a4a'); p.line(4, 12, 12, 6, hex('#c83a4a')); },
    lore: 'She sewed Grandad\'s name into his coat so nobody would lose him.' },
  { id: 'ink_maw', name: 'The Blot\'s Mouth', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'A short, black beam', effect: ['You can\'t throw ink. Hold fire to charge, release to spew a short, thick beam of it.', 'You fly on wings of ink.'],
    attack: { mode: 'beam', short: true, shape: 'void', tint: '#2a1a5a' }, flight: true,
    icon: (p: P) => { p.ball(9, 9, 6, 6, ramp('#1a1830')); p.rect(5, 10, 8, 3, hex('#05030a')); for (let x = 5; x < 13; x += 2) p.set(x, 10, '#f2f0ff'); p.rect(12, 10, 6, 2, hex('#3a2a8a')); p.set(7, 7, '#f2f0ff'); p.set(11, 7, '#f2f0ff'); },
    lore: 'It never learned to throw. It learned to open wide.' },
  { id: 'loaded_dice', name: 'Loaded', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Every shot is a roll', effect: ['Every shot rolls a die: on a six it hits three times as hard.', 'Luck makes sixes more likely.'],
    attack: { crit: 0.17 },
    icon: (p: P) => { p.rect(4, 4, 10, 10, hex('#efe6d6')); p.rect(4, 13, 10, 1, hex('#b8ab96')); for (const [x, y] of [[6, 6], [11, 6], [6, 9], [11, 9], [6, 11], [11, 11]]) p.set(x, y, '#c83a3a'); },
    lore: 'Ozzie\'s die always comes up six when it matters. He won\'t say why.' },
  { id: 'moth_swarm', name: 'Following the Light', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Moths find their way', effect: ['Your moth shots flutter after whatever they\'re thrown at.'],
    attack: { homing: 0.35 },
    icon: (p: P) => { for (const [x, y] of [[5, 6], [12, 9], [7, 13]]) { p.poly([x, y, x - 3, y - 2, x - 2, y + 2], hex('#c8b48a')); p.poly([x, y, x + 3, y - 2, x + 2, y + 2], hex('#a8946e')); } p.ball(14, 3, 2, 2, ramp('#ffe080')); },
    lore: 'Wick doesn\'t aim. It just lets them go towards the light.' },
  { id: 'rose_cuttings', name: 'Rose Cuttings', kind: 'passive', quality: 0, pools: {}, tags: SIG,
    pickup: 'Thorns take root', effect: ['Your thorns slow what they hit, and leave brambles where they fly that hurt anything walking through.'],
    attack: { creep: true },
    icon: (p: P) => { p.tube(4, 15, 13, 5, 1, ramp('#3a7a2a')); for (const [x, y] of [[6, 12], [9, 9], [11, 7]]) p.set(x + 1, y, '#e0e8b0'); p.ball(13, 4, 3, 3, ramp('#c8283a')); p.set(12, 3, '#ff9aa0'); },
    lore: 'Grandmother took cuttings of everything. The rose is from one of them.' },
];
