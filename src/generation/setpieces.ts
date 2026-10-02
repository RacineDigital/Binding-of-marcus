// Set pieces: one or two rooms a chapter that only that chapter has. Each is built around a situation
// its own cast creates: hives to push through to, a charging stoker between lanes of fire, grate-eyes
// across a drain, nurses lobbing from behind the beds, penitents you have to wait out. They're named
// when you walk in, and a chest waits for whoever clears one.
//   Layout glyphs as in templates.ts; digits are fixed cast members (see `cast`).
export interface SetPiece { name: string; rows: string[]; cast: Record<string, string> }

const P: Record<string, SetPiece[]> = {
  cellar: [
    { name: 'The Nest', cast: { 1: 'mitenest', 2: 'ragcrawler' }, rows: [
      '...............',
      '.###.......###.',
      '.#1.........1#.',
      '.#...........#.',
      '.....2...2.....',
      '...............',
      '...............',
      '...............',
      '...............'] },
    { name: 'Rolling Aisle', cast: { 1: 'pillbug', 2: 'gasper' }, rows: [
      '...............',
      '.#.#.#...#.#.#.',
      '...............',
      '..1.........1..',
      '.......2.......',
      '..1.........1..',
      '...............',
      '.#.#.#...#.#.#.',
      '...............'] },
  ],
  boiler: [
    { name: 'The Firing Line', cast: { 1: 'valvehead', 2: 'stoker' }, rows: [
      '1.............1',
      '...............',
      '..fff.....fff..',
      '...............',
      '.......2.......',
      '...............',
      '..fff.....fff..',
      '...............',
      '1.............1'] },
    { name: 'Kegs and Cinders', cast: { 1: 'cinderhopper', 2: 'sootsprite' }, rows: [
      '...............',
      '...k.......k...',
      '.....1...1.....',
      '..k.........k..',
      '.......2.......',
      '..k.........k..',
      '.....1...1.....',
      '...k.......k...',
      '...............'] },
  ],
  underworks: [
    { name: 'The Sluice', cast: { 1: 'grateeye', 2: 'leech', 3: 'drowner' }, rows: [
      '...............',
      '..1.........1..',
      '.......o.......',
      '...2...o...2...',
      '.......3.......',
      '...2...o...2...',
      '.......o.......',
      '..1.........1..',
      '...............'] },
  ],
  ward: [
    { name: 'The Night Round', cast: { 1: 'nursedoll', 2: 'orderly' }, rows: [
      '...............',
      '.bb..bb.bb..bb.',
      '.1...........1.',
      '...............',
      '.....2...2.....',
      '...............',
      '.1...........1.',
      '.bb..bb.bb..bb.',
      '...............'] },
  ],
  depths: [
    { name: 'The Ossuary', cast: { 1: 'ossspider', 2: 'skullorbit' }, rows: [
      '...............',
      '..I.........I..',
      '....1.....1....',
      '...............',
      '.......2.......',
      '...............',
      '....1.....1....',
      '..I.........I..',
      '...............'] },
    { name: 'Gravefield', cast: { 1: 'gravedigger', 2: 'marrowmaw' }, rows: [
      '...............',
      '..p..1...1..p..',
      '...............',
      '.p...........p.',
      '.......2.......',
      '.p...........p.',
      '...............',
      '..p.........p..',
      '...............'] },
  ],
  chapel: [
    { name: 'The Vigil', cast: { 1: 'censer', 2: 'penitent', 3: 'choirboy' }, rows: [
      '...............',
      '..1.........1..',
      '...............',
      '.bbb.......bbb.',
      '.....2...2.....',
      '.bbb.......bbb.',
      '...............',
      '..3.........3..',
      '...............'] },
  ],
  hollow: [
    { name: 'The Tear', cast: { 1: 'voideye', 2: 'hollowmaw', 3: 'blot' }, rows: [
      '...............',
      '...1.......1...',
      '.....o...o.....',
      '...............',
      '.......2.......',
      '...............',
      '.....o...o.....',
      '...3.......3...',
      '...............'] },
  ],
};
/** Which family a chapter's set pieces come from (its variants and the side chapters borrow the nearest). */
const FAMILY: Record<string, string> = {
  cellar: 'cellar', rootcellar: 'cellar', attic: 'cellar',
  boiler: 'boiler', coalchute: 'boiler', printshop: 'boiler',
  underworks: 'underworks', flooded: 'underworks', cistern: 'underworks', greenhouse: 'underworks',
  ward: 'ward', morgue: 'ward', waiting: 'ward', nightward: 'ward', icu: 'ward',
  depths: 'depths', catacombs: 'depths', clocktower: 'depths',
  chapel: 'chapel', belfry: 'chapel', stacks: 'chapel',
  hollow: 'hollow', inkwell: 'hollow',
};
export function setPiecesFor(themeId: string): SetPiece[] { return P[FAMILY[themeId] ?? ''] ?? []; }
export const ALL_SET_PIECES = Object.values(P).flat();
