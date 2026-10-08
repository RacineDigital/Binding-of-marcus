// Hand-drawn Chapter III creatures added in 2.0: Sluice Keeper, Bilge Priest and Fumarole
// (preview: npx tsx tests/sprite-png.ts src/art/hand/under3.ts out.png).
import type { Palette } from '../grid';

export const KEEPER_PAL: Palette = { o: '#0e1210', G: '#4a6a5a', g: '#2e4a3e', e: '#e8f080', W: '#5e5a62', s: '#9a96a0' };
export const PRIEST_PAL: Palette = { o: '#0c0e14', h: '#8a7a5a', R: '#3a5a8a', r: '#24385a', b: '#0a0c12', e: '#9ad0ff', y: '#c8e8ff' };
export const VENT_PAL: Palette = { o: '#0e120a', k: '#2a2e22', g: '#4a6a2a', G: '#8ac040', y: '#d8ff80' };

export const KEEPER: string[][] = [[
  '................',
  '..........ooo...',
  '.........oWsWo..',
  '..oooo..oW.o.Wo.',
  '.oGGGGo.oo.s.oo.',
  'oGgGGGGooW.o.Wo.',
  'oGeGGeGo.oWsWo..',
  'oGGGGGGGo.ooo...',
  '.ogGGGGGGo......',
  '.oggGGGGGGo.....',
  '.oggggGGGGo.....',
  '..oggggggo......',
  '..o.o..o.o......',
  '.oo.o..o.oo.....',
], [
  '................',
  '..........ooo...',
  '.........oWsWo..',
  '..oooo..oW.o.Wo.',
  '.oGGGGo.oo.s.oo.',
  'oGgGGGGooW.o.Wo.',
  'oGeGGeGo.oWsWo..',
  'oGGGGGGGo.ooo...',
  '.ogGGGGGGo......',
  '.oggGGGGGGo.....',
  '.oggggGGGGo.....',
  '..oggggggo......',
  '...o.o.o.o......',
  '..oo.o.o.oo.....',
], [
  '................',
  '.........ooo....',
  '........oWsWo...',
  '..oooo.oW.o.Wo..',
  '.oGGGGooo.s.oo..',
  'oGgGGGGoW.o.Wo..',
  'oGeGGeGooWsWo...',
  'oGGGGGGGoooo....',
  '.ogGGGGGGo......',
  '.oggGGGGGGo.....',
  '.oggggGGGGo.....',
  '..oggggggo......',
  '..o.o..o.o......',
  '.oo.o..o.oo.....',
]];
export const PRIEST: string[][] = [[
  '..o.........',
  '.ohoo.......',
  '.oh.o.......',
  '.oh.........',
  '.oho.ooo....',
  '.ohooRRRo...',
  '.ohoRrrrRo..',
  '.ohoRbebRo..',
  '.ohooRRRoo..',
  '.oho.RRRRo..',
  '.ohoRRrRRRo.',
  '.ohoRrrrRRo.',
  '.ohoRRrRRRo.',
  '.ohoRrRRrRo.',
  '.oh.oRrRRrRo',
  '.oh.oRrrRrRo',
  '.oh.oRRrRRRo',
  '.oh..ooooooo',
  '.o..........',
  '............',
], [
  '..yo........',
  '.yhoo.......',
  '.oh.o.......',
  '.oh.........',
  '.oho.ooo....',
  '.ohooRRRo...',
  '.ohoRrrrRo..',
  '.ohoRbebRo..',
  '.ohooRRRoo..',
  '.oho.RRRRo..',
  '.ohoRRrRRRo.',
  '.ohoRrrrRRo.',
  '.ohoRRrRRRo.',
  '.ohoRrRRrRo.',
  '.oh.oRrRRrRo',
  '.oh.oRrrRrRo',
  '.oh.oRRrRRRo',
  '.oh..ooooooo',
  '.o..........',
  '............',
]];
export const VENT: string[][] = [[
  '................',
  '................',
  '......oooo......',
  '...oookkkkooo...',
  '..okkkgkkgkkko..',
  '.okggGggggGggko.',
  'okgGGyGGGGyGGgko',
  '.okggGggggGggko.',
  '..okkkkkkkkkko..',
  '...oooooooooo...',
], [
  '....g......g....',
  '..g..........g..',
  '...g..oooo..g...',
  '...oookkkkooo...',
  '..okkkgkkgkkko..',
  '.okggGggggGggko.',
  'okgGGyGGGGyGGgko',
  '.okggGggggGggko.',
  '..okkkkkkkkkko..',
  '...oooooooooo...',
]];

/** For the sprite preview tool. */
export function sheet(): Record<string, { rows: string[]; pal: Palette }> {
  const s: Record<string, { rows: string[]; pal: Palette }> = {};
  ([['keeper', KEEPER, KEEPER_PAL], ['priest', PRIEST, PRIEST_PAL], ['vent', VENT, VENT_PAL]] as [string, string[][], Palette][]).forEach(([n, fr, pal]) => fr.forEach((rows, i) => { s[n + i] = { rows, pal }; }));
  return s;
}
