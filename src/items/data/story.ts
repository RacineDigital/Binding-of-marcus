// Story curios: Grandfather's letter (torn in two and hidden on the hospital path; whole, it opens
// Room 4) and the keepsakes the hardest endings unlock.
import type { ItemDef } from '../types';
import type { World } from '../../game/world';
import { I, ramp, hex, P } from './kit';
import { grantItem, removeItem } from '../../game/roomflow';

export const LETTER_TEXT = 'Dear Marcus. I am in Room 4, at the very end of the ward, by the window. The corridors are long, but they are only corridors. Bring both halves of this and they will let you in. I have saved you the good chair. Love, Grandad.';

function paper(p: P, half: 'top' | 'bottom' | 'whole'): void {
  const pc = ramp('#efe6d0');
  const y0 = half === 'bottom' ? 8 : 3, y1 = half === 'top' ? 10 : 16;
  p.rect(4, y0, 11, y1 - y0, pc[3]); p.rect(4, y0, 1, y1 - y0, pc[1]);
  // a torn, zig-zag edge where the halves meet
  if (half === 'top') for (let x = 4; x < 15; x++) p.set(x, y1 - (x % 2), pc[1]);
  if (half === 'bottom') for (let x = 4; x < 15; x++) p.set(x, y0 + (x % 2), pc[1]);
  for (let y = y0 + 2; y < y1 - 1; y += 2) p.rect(6, y, 7 - ((y * 3) % 4), 1, hex('#4a4a7a'));
  if (half !== 'bottom') p.set(6, y0 + 1, '#8a2a2a');
  if (half === 'whole') { p.rect(4, 9, 11, 1, pc[2]); I.heart(p, '#c83a4a', 13, 14, 0.45); }
}

/** Holding both halves: they join into the whole letter, and you read it. */
function joinLetter(w: World): void {
  const pl = w.player;
  if (!pl.has('letter_top') || !pl.has('letter_bottom')) return;
  removeItem(w, 'letter_top'); removeItem(w, 'letter_bottom');
  grantItem(w, 'grandfathers_letter', true);
  w.game.save.unlock('both_halves');
  w.audio.stinger('blessing');
  w.hud.showNote('Grandfather\'s Letter', LETTER_TEXT, 'Grandad');
}

export const STORY_ITEMS: ItemDef[] = [
  { id: 'letter_top', name: 'Letter (first half)', kind: 'passive', quality: 0, pools: {}, tags: ['quest'],
    pickup: '"Dear Marcus..."', effect: ['The top half of a letter in Grandfather\'s handwriting.', 'Find the other half on this path, and Room 4 will open.'],
    hooks: { onPickup: joinLetter }, icon: (p) => paper(p, 'top'),
    lore: 'Kept at the lost property desk, in an envelope with his name on it.' },
  { id: 'letter_bottom', name: 'Letter (second half)', kind: 'passive', quality: 0, pools: {}, tags: ['quest'],
    pickup: '"...saved you the good chair."', effect: ['The bottom half of a letter in Grandfather\'s handwriting.', 'Find the other half on this path, and Room 4 will open.'],
    hooks: { onPickup: joinLetter }, icon: (p) => paper(p, 'bottom'),
    lore: 'Hidden somewhere deep, where only a brave boy would dig.' },
  { id: 'grandfathers_letter', name: 'Grandfather\'s Letter', kind: 'passive', quality: 2, pools: {}, tags: ['quest'],
    pickup: 'Room 4 will let you in', effect: ['Damage +0.5, luck +1.', 'The door to Room 4 opens for you after the Intensive Care boss.'],
    stats: { damage: 0.5, luck: 1 }, icon: (p) => paper(p, 'whole'),
    lore: 'Both halves, taped together crooked. It smells of the hospital and of pipe smoke.' },
  { id: 'get_well_card', name: 'Get Well Soon', kind: 'passive', quality: 2, pools: { boss: 0.8 }, unlock: 'both_halves',
    pickup: 'Health up, mends each chapter', effect: ['+1 heart container.', 'Heals one heart at the start of every chapter.'],
    health: { containers: 1, heal: 2 },
    hooks: { onFloor: (w, n) => { w.player.healRed(2 * n, true); } },
    icon: (p) => { const c = ramp('#e8c870'); p.poly([3, 5, 15, 3, 16, 15, 4, 16], c[3]); p.poly([3, 5, 9, 4, 10, 16, 4, 16], c[2]); I.heart(p, '#c83a4a', 12, 9, 0.5); p.rect(5, 12, 3, 1, hex('#4a4a7a')); },
    lore: 'Made by Nell, signed by everyone. Marcus\'s name is in pencil, very small, at the bottom.' },
  { id: 'cardigan', name: 'Grandad\'s Cardigan', kind: 'passive', quality: 3, pools: { blessing: 1 }, unlock: 'beat_patient',
    pickup: 'Health up, sometimes a hit just doesn\'t land', effect: ['+1 heart container and a full heal.', '15% chance to shrug off any hit completely.'],
    health: { containers: 1, heal: 12 },
    icon: (p) => { const c = ramp('#8a6a4a'); p.poly([4, 3, 14, 3, 16, 16, 2, 16], c[2]); p.poly([7, 3, 11, 3, 9, 9], c[0]); for (let y = 6; y < 16; y += 3) p.set(9, y, '#e0c890'); p.rect(2, 6, 2, 9, c[1]); p.rect(14, 6, 2, 9, c[1]); for (let y = 4; y < 16; y += 2) p.set(5, y, c[3]); },
    lore: 'The brown one with the leather buttons. It was on the back of his chair in Room 4.' },
  { id: 'last_word', name: 'The Last Word', kind: 'passive', quality: 4, pools: { treasure: 0.4 }, unlock: 'the_end',
    pickup: 'You finish things now', effect: ['Damage +1 and x1.3.', 'Shots pass through rocks and pierce two enemies.'],
    stats: { damage: 1, damageMult: 1.3 }, attack: { spectral: true, pierce: 2, tint: '#2a2440' },
    icon: (p) => { const c = ramp('#2a2440'); p.tube(4, 15, 13, 4, 1.4, c); p.poly([3, 14, 5, 16, 2, 17], hex('#c8a04a')); for (let i = 0; i < 4; i++) p.line(13 - i * 2, 4 + i * 2, 15 - i * 2, 2 + i * 2, hex('#efe6d0')); p.set(3, 16, '#14112a'); },
    lore: '"Goodnight, Grandad." Written in his pen, in your hand.' },
];
