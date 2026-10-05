// Hand-drawn Chapter III creatures: the Underworks' rats, leeches, bloaters, grates and the drowned.
// Same canvas sizes and frame counts as the painted versions they replace, so hitboxes are unchanged.
// Preview: npx tsx tests/sprite-png.ts src/art/hand/under.ts test-output/under.png 8
import type { Palette } from '../grid';

// ------------------------------------------------------------------ Sewer Rat (18x12, faces right)
export const RAT_PAL: Palette = { o: '#1a1214', d: '#3e3236', m: '#5e4e50', M: '#7e6c6c', h: '#a89490', p: '#b86a6e', P: '#e8a8a0', w: '#f4e8d8', e: '#ff3a3a', t: '#c88a86' };
const RAT_BODY = [
  '..................',
  '............oo....',
  '...........opPo...',
  '.....ooooooopPoo..',
  '...oommMMMMMMMMMo.',
  '..omMhhMMMMMMMMweo',
  '.tomMMMMMMMMMMMMPo',
  't.odmmmmmmmmmMMMoo',
  't..oddddddddddmoo.',
  '.t..ooddddddoo....',
];
export const RAT = [
  [...RAT_BODY, '..t..oo.....oo....', '..................'],
  [...RAT_BODY, '..t...oo...oo.....', '..................'],
  [...RAT_BODY.slice(0, 9), '..t.ooddddddoo....', '.t.....oo.oo......', '..................'],
  [...RAT_BODY, '..t...oo...oo.....', '..................'],
];

// ------------------------------------------------------------------ Sump Leech (18x22, rears up out of the floor)
export const LEECH_PAL: Palette = { o: '#140a10', d: '#2e1e2c', m: '#4a3448', M: '#6a4e66', h: '#94749a', k: '#0a0406', r: '#8a2a3a', w: '#ecdcd0', s: '#352433' };
const LEECH_A = [
  '..................',
  '......oooooo......',
  '.....oMhhMMMo.....',
  '....oMwrwrwMmo....',
  '....omrkkkkrmo....',
  '....owkkkkkkwo....',
  '....omrkkkkrdo....',
  '....odwrwrwrdo....',
  '.....odmmmmdo.....',
  '.....omMhMmdo.....',
  '.....osssssso.....',
  '.....omMhMmdo.....',
  '.....omMMMmdo.....',
  '.....osssssso.....',
  '.....omMhMmdo.....',
  '.....omMMMmdo.....',
  '.....osssssso.....',
  '.....omMhMmdo.....',
  '....omMMMMmddo....',
  '....osssssssso....',
  '...odmMMMMMmddo...',
  '...oooooooooooo...',
];
/** Second frame: reared one pixel higher, one more ring showing. */
export const LEECH = [LEECH_A, [...LEECH_A.slice(1, 11), LEECH_A[11], ...LEECH_A.slice(11)]];

// ------------------------------------------------------------------ Bloater (26x28, waddles)
export const BLOAT_PAL: Palette = { o: '#141810', d: '#3e4a2e', m: '#5e6e46', M: '#7e8e5e', h: '#a6b47e', y: '#c8b860', Y: '#f0e494', s: '#b4b294', S: '#8a8870', k: '#1a1a10', v: '#5a4440' };
const BLOAT_TOP = [
  '..........................',
  '..........oooooo..........',
  '.........osssssSo.........',
  '........ossssssSSo........',
  '........oskksskkSo........',
  '........ossssssSSo........',
  '........osSkkkkSSo........',
  '.........oSSSSSSo.........',
  '.......ooommmmmmooo.......',
  '.....oommMMMMMMMMmmoo.....',
  '....omMMhhMMMMMMMMMmmo....',
  '...omMhhhMMMyYMMMMMMmmo...',
  '..omMMhhMMMMyyMMMMMMMmdo..',
  '..omMMMMMMMMMMMMMMvMMmdo..',
  '.omMyYMMMMMMMMMMvMMMMmddo.',
  '.omMyyMMMMMMMMMvMMMMMmddo.',
  '.omMMMMMMMMMMMMvMMMMyYmdo.',
  '.odmMMMMMMMMMMMMMMMMyymdo.',
  '.odmmMMMMyYMMMMMMMMMMmddo.',
  '.oddmMMMMyyMMMMMMMMMmmddo.',
  '..oddmmMMMMMMMMMMMmmdddo..',
  '..oddddmmmmmmmmmmmmddddo..',
  '...oddddddddddddddddddo...',
  '....ooddddddddddddddoo....',
  '......oooooooooooooo......',
];
const LEGS_DOWN = ['.......odSo....odSo.......', '......oddSSo..oddSSo......', '......oooooo..oooooo......'];
const LEGS_LEFT_UP = ['.......odSo....odSo.......', '......oooooo..oddSSo......', '..............oooooo......'];
const LEGS_RIGHT_UP = ['.......odSo....odSo.......', '......oddSSo..oooooo......', '......oooooo..............'];
export const BLOAT = [[...BLOAT_TOP, ...LEGS_DOWN], [...BLOAT_TOP, ...LEGS_LEFT_UP], [...BLOAT_TOP, ...LEGS_DOWN], [...BLOAT_TOP, ...LEGS_RIGHT_UP]];

// ------------------------------------------------------------------ Grate Eye (24x16: shut, peering, staring)
export const GRATE_PAL: Palette = { o: '#0e0c0e', I: '#4a464a', J: '#7a767a', k: '#060404', w: '#ece4d4', W: '#b8ae9e', r: '#c83a3a', R: '#7a1a1a', p: '#0a0a0a' };
const G_TOP = ['........................', '.oooooooooooooooooooooo.', '.oJJJJJJJJJJJJJJJJJJJJo.'];
const G_ROW = '.oIkkJkkkJkkkJkkkJkkkIo.';
const G_BOTTOM = ['.oIIIIIIIIIIIIIIIIIIIIo.', '.oooooooooooooooooooooo.', '........................'];
export const GRATE = [
  [...G_TOP, ...Array(10).fill(G_ROW), ...G_BOTTOM],
  [...G_TOP, G_ROW, G_ROW, G_ROW,
    '.oIkkJkkWJWWWJWkkJkkkIo.',
    '.oIkkJWwrJRpRJrwWJkkkIo.',
    '.oIkkJkkWJWWWJWkkJkkkIo.',
    G_ROW, G_ROW, G_ROW, G_ROW, ...G_BOTTOM],
  [...G_TOP, G_ROW, G_ROW,
    '.oIkkJkWwJwwwJwWkJkkkIo.',
    '.oIkkJWwwJrRrJwwWJkkkIo.',
    '.oIkWJwwrJRpRJrwwJWkkIo.',
    '.oIkWJwwrJRpRJrwwJWkkIo.',
    '.oIkkJWwwJrRrJwwWJkkkIo.',
    '.oIkkJkWwJwwwJwWkJkkkIo.',
    G_ROW, G_ROW, ...G_BOTTOM],
];

// ------------------------------------------------------------------ The Drowned (22x28: dripping, and an arm raised with a pale light)
export const DROWN_PAL: Palette = { o: '#0a1418', h: '#1e2a36', H: '#34485a', s: '#8aa0a8', S: '#b2c6ca', k: '#06090c', b: '#4a6a7a', B: '#6c8c9a', c: '#2e4652', w: '#7ab8d8', g: '#a8d8f0', G: '#eefaff' };
const DROWN_HEAD = [
  '......................',
  '.......oooooooo.......',
  '......ohHHHHHHho......',
  '.....ohHHhHHhHHho.....',
  '.....ohHhhHhhHhho.....',
  '....ohhHhSShhHhhho....',
  '....ohHhSSSShhhHho....',
  '....ohhhSkSSkShhho....',
  '....ohhhSSSSSShhho....',
  '....ohwhSSkkSShwho....',
  '.....ohhsSSSSshho.....',
  '.....oho.osso.oho.....',
];
const DROWN_BODY = [
  '......oocBBBBcoo......',
  '.....ocBBBBBBBBco.....',
  '....ocBBbBBBBbBBco....',
  '....osBBbBBBBbBBso....',
  '....osbBbBBBBbBbso....',
  '....osbbbBBBBbbbso....',
  '.....ocbbBBBBbbco.....',
  '.....ocbbbBBbbbco.....',
  '.....ocbbbbbbbbco.....',
  '.....ocbbbbbbbbco.....',
  '....ocbbbbbbbbbbco....',
  '....ocbcbbbbbbcbco....',
  '...ocbco.cbbc.ocbco...',
  '...oco...occo...oco...',
];
export const DROWN_IDLE = [
  [...DROWN_HEAD, ...DROWN_BODY, '....o.....oo.....o....', '......w.........w.....'],
  [...DROWN_HEAD, ...DROWN_BODY, '....o..w..oo.....o....', '...........w..........'],
];
export const DROWN_RAISE = [[
  '......................',
  '.......oooooooo.......',
  '......ohHHHHHHho......',
  '.....ohHHhHHhHHho..oo.',
  '.....ohHhhHhhHhho.ogGo',
  '....ohhHhSShhHhhhooggo',
  '....ohHhSSSShhhHho.oSo',
  '....ohhhSkSSkShhho.oBo',
  '....ohhhSSSSSShhho.oBo',
  '....ohwhSSkkSShwhooBo.',
  '.....ohhsSSSSshhooBo..',
  '.....oho.osso.ohoBo...',
  '......oocBBBBcooBo....',
  '.....ocBBBBBBBBcBo....',
  '....ocBBbBBBBbBBco....',
  '....osBBbBBBBbBBbo....',
  '....osbBbBBBBbBbbo....',
  '....osbbbBBBBbbbbo....',
  ...DROWN_BODY.slice(6),
  '....o.....oo.....o....',
  '......w.........w.....',
]];

// ------------------------------------------------------------------ Sludge (three sizes; it splits into the next one down)
export const SLUDGE_PAL: Palette = { o: '#141c0e', d: '#3a4a26', m: '#5a6e3a', M: '#7a8e50', h: '#9eb06a', H: '#cadb94', y: '#ece494', k: '#1e1a08', t: '#e4dcac' };
const SLUDGE_BIG = [
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '..................................',
  '............oooooooooo............',
  '.........oooMHHhhMMMMooo..........',
  '.......ooMHHHhhMMMMMMMMoo.........',
  '......oMHHhhMMMMMMMMMMMmo.........',
  '.....oMHhhMMMMMMMMMMMMMMmo........',
  '....oMHhMMMMMMMMMMMMMMMMMmo.......',
  '....oMhMMMMMMMMMMMMMMMMMMmmo......',
  '....oMhMMMMMMMMMMMMMMMMMHhMmo.....',
  '....oMMMMyyMMMMMMyyMMMMMMMmmo.....',
  '....oMMMykkyMMMMykkyMMMMMMmmo.....',
  '....oMMMykkyMMMMykkyMMMMMMmmo.....',
  '....oMMMMyyMMMMMMyyMMMMMMMmmo.....',
  '....oMMMMMMMMMMMMMMMMMMMMMmmo.....',
  '....oMMMMMMMMMMMMMMMMMMMMMmdo.....',
  '....omMMMMokkkkkkkkkkoMMMMmdo.....',
  '....omMMMMoktktktktkkoMMMMmdo.....',
  '...omMMMMMMokkkkkkkkoMMMMMmddo....',
  '...omMMMMMMMoooooooooMMMMMmddo....',
  '...omMMhMMMMMMMMMMMMMMMMMMmddo....',
  '...odmMMMMMMMMMMMMMMMMMMMmmddo....',
  '...odmmMMMMMMMMMMMMMMMMMmmdddo....',
  '...oddmmmMMMMMMMMMMMMMmmmmdddo....',
  '....oddmmmmmmmmmmmmmmmmmmdddo.....',
  '.....odmo.oddmmmmmmmmmdo.odmo.....',
  '.....odmo..odmo..oddo...odmo......',
  '......oo....odo...odo.....oo......',
];
const SLUDGE_MED = [
  '............................',
  '............................',
  '............................',
  '..........oooooooo..........',
  '.......ooMHHhMMMMoo.........',
  '.....ooMHHhMMMMMMMMoo.......',
  '....oMHhMMMMMMMMMMMmo.......',
  '...oMHhMMMMMMMMMMMMMmo......',
  '...oMhMMMMMMMMMMMMHhmo......',
  '...oMMMyyMMMMMMyyMMMmo......',
  '...oMMykkyMMMMykkyMMmo......',
  '...oMMMyyMMMMMMyyMMMmo......',
  '...omMMMMMMMMMMMMMMMmo......',
  '...omMMMMMMMMMMMMMMMmo......',
  '...omMMMMoooooooMMMmdo......',
  '..omMMMMMMMMMMMMMMMMmdo.....',
  '..odmMhMMMMMMMMMMMMmmdo.....',
  '..odmmMMMMMMMMMMMMmmddo.....',
  '..oddmmmmMMMMMMmmmmdddo.....',
  '...oddmmmmmmmmmmmmmddo......',
  '....odmo.oddmmmmdo.odo......',
  '....odo...odmo..o..odo......',
  '.....o.....oo........o......',
];
const SLUDGE_SMALL = [
  '......................',
  '......................',
  '......................',
  '........oooooo........',
  '.....ooMHHMMMoo.......',
  '....oMHhMMMMMMo.......',
  '...oMhMMMMMMHmo.......',
  '...oMMyMMMyMMmo.......',
  '...oMMMMMMMMMmo.......',
  '...omMMMoooMMmo.......',
  '..omMMMMMMMMMmdo......',
  '..odmMMMMMMMmmdo......',
  '..oddmmmmmmmmddo......',
  '...oddmmmmmmdddo......',
  '...odo.odmmdo.oo......',
  '....o...odo...o.......',
];
/** By size (1 small, 2 medium, 3 big). */
export const SLUDGE: Record<number, string[]> = { 1: SLUDGE_SMALL, 2: SLUDGE_MED, 3: SLUDGE_BIG };

/** Every frame with its palette, for tests/sprite-png.ts. */
export function sheet(): Record<string, { rows: string[]; pal: Palette }> {
  const out: Record<string, { rows: string[]; pal: Palette }> = {};
  const add = (name: string, list: string[][], pal: Palette) => list.forEach((rows, i) => (out[`${name}${i}`] = { rows, pal }));
  add('rat', RAT, RAT_PAL); add('leech', LEECH, LEECH_PAL); add('bloat', BLOAT, BLOAT_PAL);
  add('grate', GRATE, GRATE_PAL); add('drown', DROWN_IDLE, DROWN_PAL); add('raise', DROWN_RAISE, DROWN_PAL);
  add('sludge', [SLUDGE_BIG, SLUDGE_MED, SLUDGE_SMALL], SLUDGE_PAL);
  return out;
}
