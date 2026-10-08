// Hand-drawn Chapter II creatures added in 2.0: Bellows, Foreman, Riveter and Brickback
// (preview: npx tsx tests/sprite-png.ts src/art/hand/boiler3.ts out.png).
import type { Palette } from '../grid';

export const BELLOWS_PAL: Palette = { o: '#140c08', l: '#5a3420', L: '#8a5430', h: '#b47a48', W: '#6a4a30', n: '#5e5a62', N: '#9a96a0', e: '#ffb040' };
export const FOREMAN_PAL: Palette = { o: '#120c0a', g: '#c8a050', G: '#fff0a0', b: '#6a2a1a', B: '#9a4a2a', R: '#c87a4a', k: '#1a1010', e: '#ffe060' };
export const RIVETER_PAL: Palette = { o: '#0e0c0e', i: '#3a3a44', I: '#5e5e6a', s: '#9a9aa6', e: '#ff5030' };
export const BRICK_PAL: Palette = { o: '#140a08', k: '#2a1a14', K: '#4a2e22', h: '#6a4432', r: '#7a2a1a', R: '#a8442a', H: '#d06a40', m: '#3a1a10', e: '#ffb040' };

export const BELLOWS: string[] = [
  '..................',
  '...oooooooooo.....',
  '..oWWWWWWWWWWo....',
  '..ollLlLlLlLlo....',
  '.olLhLhLhLhLlooo..',
  '.olLLeLLLLeLLoNNo.',
  '.olLLLLLLLLLLoNNo.',
  '.olLhLhLhLhLlooo..',
  '..ollLlLlLlLlo....',
  '..oWWWWWWWWWWo....',
  '...oooooooooo.....',
  '....o......o......',
  '...oo......oo.....',
  '..................',
];
export const FOREMAN: string[][] = [[
  '.....oggo.....',
  '.....ogGo.....',
  '....oooooo....',
  '...oBBBBBBo...',
  '..oBRRBBBBBo..',
  '..oBkeBBekBo..',
  '..oBBBBBBBBo..',
  '.oBBkkkkkkBBo.',
  '.oBBkRkRkRBBo.',
  '.obBBBBBBBBbo.',
  '.obBBBBBBBBbo.',
  '..obbBBBBbbo..',
  '..oobbbbbboo..',
  '...oo....oo...',
  '..oko....oko..',
  '..ooo....ooo..',
], [
  '.....oggo.....',
  '.....ogGo.....',
  '....oooooo....',
  '...oBBBBBBo...',
  '..oBRRBBBBBo..',
  '..oBkeBBekBo..',
  '..oBBBBBBBBo..',
  '.oBBkkkkkkBBo.',
  '.oBBkRkRkRBBo.',
  '.obBBBBBBBBbo.',
  '.obBBBBBBBBbo.',
  '..obbBBBBbbo..',
  '..oobbbbbboo..',
  '...oo.....oo..',
  '..oko.....oko.',
  '..ooo.....ooo.',
]];
export const RIVETER: string[][] = [[
  '..................',
  '....ooooooo.......',
  '...oIIsIIIIo......',
  '..oIsIIIIIIIooooo.',
  '..oIIeIIIeIIosssso',
  '..oIIIIIIIIIooooo.',
  '..oiiIIIIIiio.....',
  '...oiiiiiiio......',
  '..o.o.o..o.o.o....',
  '.o..o.o..o.o..o...',
], [
  '..................',
  '....ooooooo.......',
  '...oIIsIIIIo......',
  '..oIsIIIIIIIooooo.',
  '..oIIeIIIeIIosssso',
  '..oIIIIIIIIIooooo.',
  '..oiiIIIIIiio.....',
  '...oiiiiiiio......',
  '..o..o.oo.o..o....',
  '..o..o.o..o..o....',
]];
export const BRICK: string[] = [
  '..................',
  '.......oooo.......',
  '......oKKKKo......',
  '.....oKhKKKKo.ooo.',
  '....oKKeKKKKoorRHo',
  '....oKKKKKKKormRRo',
  '...oKhKKKKKKorRHRo',
  '...oKKKKKKKKormmmo',
  '...oKKKKKKKKorRRHo',
  '...okKKKKKKKormRRo',
  '....okkkkkkkorRHRo',
  '.....o.o.o.o.oooo.',
  '....o..o.o..o.....',
  '..................',
];
export const BRICK_RAISE: string[] = [
  '.............ooo..',
  '.......oooooorRHo.',
  '......oKKKKoormRRo',
  '.....oKhKKKKorRHRo',
  '....oKKeKKKKormmmo',
  '....oKKKKKKKorRRHo',
  '...oKhKKKKKKormRRo',
  '...oKKKKKKKKorRHRo',
  '...oKKKKKKKKooooo.',
  '...okKKKKKKKo.....',
  '....okkkkkkko.....',
  '.....o.o.o.o......',
  '....o..o.o..o.....',
  '..................',
];

/** For the sprite preview tool. */
export function sheet(): Record<string, { rows: string[]; pal: Palette }> {
  return {
    bellows: { rows: BELLOWS, pal: BELLOWS_PAL }, foreman0: { rows: FOREMAN[0], pal: FOREMAN_PAL }, foreman1: { rows: FOREMAN[1], pal: FOREMAN_PAL },
    riveter0: { rows: RIVETER[0], pal: RIVETER_PAL }, riveter1: { rows: RIVETER[1], pal: RIVETER_PAL }, brick: { rows: BRICK, pal: BRICK_PAL }, brickRaise: { rows: BRICK_RAISE, pal: BRICK_PAL },
  };
}
