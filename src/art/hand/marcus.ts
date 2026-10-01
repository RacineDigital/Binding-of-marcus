// Hand-drawn Marcus: messy black hair with a shine ring, big dark eyes, an ink teardrop,
// an oversized hoodie, dark jeans and white sneakers.
// Head 20x19 (faces aim) with expression overrides; body 18x13 composed from torso + leg poses.
import { Palette } from '../grid';

export const MARCUS_PAL: Palette = {
  o: '#120c18', // outline
  K: '#0c0a14', h: '#17151f', H: '#22202f', L: '#34355a', l: '#5d64a0', // hair: deep -> shine
  S: '#f6d6bc', s: '#e2b194', d: '#bf8670', W: '#fff4e6', // skin
  e: '#140c1e', w: '#ffffff', v: '#7464b8', // eyes
  m: '#6e2434', r: '#f0a49a', k: '#4450b0', // mouth, blush, ink tear
  c: '#262238', C: '#3a3556', D: '#544e7e', E: '#7a72a8', // hoodie
  R: '#c23040', q: '#7c1a2a', // hood lining
  t: '#e6e2f0', // drawstrings
  j: '#344466', J: '#4c6090', // jeans
  n: '#efeef5', N: '#b2b0c6', x: '#2a2434', // sneakers
};

export const HEAD_DOWN = [
  '.......o....oo......',
  '.....ooHo..oHHo.o...',
  '...ooHHHHooHHHHooHo.',
  '..oHHHLLHHHHHHHHHHo.',
  '.oHHLLlLLHHHHHHHHHHo',
  '.oHLLHHHHLLHHHHHHhHo',
  'oHHHHHHHHHHLLLHHHhHo',
  'oHHhHHHhHHHHhHHHhHHo',
  'oHHhHHhSShHHhSShHhHo',
  'oHHhsHhsSHhSSSsHhHho',
  'oHhSShSSSShSSSSShHho',
  'oHsooooSSSSSSoooosHo',
  'oSSSweeSSSSSSweeSSSo',
  'osSSeeeSSSSSSeeeSSso',
  'osSSeevSSSSSSeevSSso',
  '.oSrrSkSSSSSSSSrrSo.',
  '.osSSSSSSmmSSSSSSso.',
  '..osSSSSSSSSSSSSso..',
  '....oooooooooooo....',
];

/** Expression overrides for HEAD_DOWN, keyed by first row index. */
export const FACE_DOWN: Record<string, [number, string[]]> = {
  fire: [11, [
    'oHsSSSSSSSSSSSSSSsHo',
    'oSSooooSSSSSSooooSSo',
    'osSSeeeSSSSSSeeeSSso',
    'osSSSSSSSSSSSSSSSSso',
    '.oSrrSkSSSSSSSSrrSo.',
    '.osSSSSSSmmSSSSSSso.',
    '..osSSSSSmmSSSSSso..',
  ]],
  hurt: [11, [
    'oHsSSSSSSSSSSSSSSsHo',
    'oSSSeSSSSSSSSSSeSSSo',
    'osSSSeeSSSSSSeeSSSso',
    'osSSeSSSSSSSSSSeSSso',
    '.oSrrSkSSSSSSSSrrSo.',
    '.osSSSSSmSmSSSSSSso.',
  ]],
  blink: [11, [
    'oHsSSSSSSSSSSSSSSsHo',
    'oSSSSSSSSSSSSSSSSSSo',
    'osSSoooSSSSSSoooSSso',
    'osSSSSSSSSSSSSSSSSso',
  ]],
  happy: [11, [
    'oHsSSSSSSSSSSSSSSsHo',
    'oSSSSeSSSSSSSSeSSSSo',
    'osSSeSeSSSSSSeSeSSso',
    'osSSSSSSSSSSSSSSSSso',
    '.oSrrSkSSSSSSSSrrSo.',
    '.osSSSSSmmmmSSSSSso.',
  ]],
};

export const HEAD_SIDE = [
  '........o..oo.......',
  '......ooHooHHo.o....',
  '....ooHHHHHHHHooHo..',
  '...oHHHHLLLHHHHHHHo.',
  '..oHHHHLLlLLHHHHHHHo',
  '.oHHHHLLHHHHLLHHHHHo',
  '.oHHHHHHHHHHHHLLHHHo',
  'oHHHHHHHhHHHhHHHhHHo',
  'oHHHHHHhHHHhSShHHhHo',
  'oHHHHHHhsSShHhSSShHo',
  'oHHHHHhSSSShSSSSSSho',
  'oHHHHHsSSSSSoooosSSo',
  'oHHHHSdSSSSSweeSSSSo',
  'oHHHHSdSSSSSeeeSSSSo',
  'ohHHHHsSSSSSeevSSSSo',
  '.ohHHHsSSSSrrSSSSSo.',
  '..ohhsSSSSSSSSSmmSo.',
  '...oosSSSSSSSSSSso..',
  '.....ooooooooooo....',
];

export const FACE_SIDE: Record<string, [number, string[]]> = {
  fire: [11, [
    'oHHHHHsSSSSSSSSSSSSo',
    'oHHHHSdSSSSSooooSSSo',
    'oHHHHSdSSSSSeeeSSSSo',
    'ohHHHHsSSSSSSSSSSSSo',
    '.ohHHHsSSSSrrSSSSSo.',
    '..ohhsSSSSSSSSSmmSo.',
    '...oosSSSSSSSSSmmo..',
  ]],
  hurt: [11, [
    'oHHHHHsSSSSSSSSSSSSo',
    'oHHHHSdSSSSSSSeSSSSo',
    'oHHHHSdSSSSSSeeSSSSo',
    'ohHHHHsSSSSSSSeSSSSo',
    '.ohHHHsSSSSrrSSSSSo.',
    '..ohhsSSSSSSSSmSmSo.',
  ]],
  blink: [11, [
    'oHHHHHsSSSSSSSSSSSSo',
    'oHHHHSdSSSSSSSSSSSSo',
    'oHHHHSdSSSSSoooSSSSo',
    'ohHHHHsSSSSSSSSSSSSo',
  ]],
  happy: [11, [
    'oHHHHHsSSSSSSSSSSSSo',
    'oHHHHSdSSSSSSeSSSSSo',
    'oHHHHSdSSSSSeSeSSSSo',
    'ohHHHHsSSSSSSSSSSSSo',
    '.ohHHHsSSSSrrSSSSSo.',
    '..ohhsSSSSSSSSmmmSo.',
  ]],
};

export const HEAD_UP = [
  '.......o....oo......',
  '.....ooHo..oHHo.o...',
  '...ooHHHHooHHHHooHo.',
  '..oHHHLLHHHHHHHHHHo.',
  '.oHHLLlLLHHHHHHHHHHo',
  '.oHLLHHHHLLHHHHHHhHo',
  'oHHHHHHHHHHLLLHHHhHo',
  'oHHHHHHHHhHHHHHHHhHo',
  'oHHHhHHHHHhHHHHhHHHo',
  'oHHHHhHHHHHhHHhHHHHo',
  'oSHHHHhHHHHHhHHHHHSo',
  'oSHHhHHHHhHHHHHhHHSo',
  'osHHHHhHHHHhHHHhHHso',
  'ohHHHhHHHHhHHHhHHHho',
  '.ohHHHhHHHHhHHHHhho.',
  '..ohhHHHhHHHHhHHhho.',
  '...ohhhHHHHHHHhhho..',
  '....oosSSSSSSSsoo...',
  '......oooooooo......',
];

// ---------------------------------------------------------------- body
// Torsos are 18 wide and 9 tall (rows 0-8); legs are 4 rows (rows 9-12).
export const TORSO_DOWN = [
  '......oCCCCCo.....',
  '.....oDCqRqCDo....',
  '....oCDCtRtCDCo...',
  '...oCCDCCtqtCDCo..',
  '..oCcCCDCCCCCDCcCo',
  '..oCcCCCCwwCCCCcCo',
  '..oCcCcDDDDDDcCcCo',
  '..oScCcCCCCCCcCcSo',
  '...ooccccccccccoo.',
];
export const TORSO_UP = [
  '.....ooCCCCCoo....',
  '....oCDDDDDDDCo...',
  '...oCDEDDDDDEDCo..',
  '...oCCDDDDDDDCCo..',
  '..oCcCCCCCCCCCCcCo',
  '..oCcCCCCCCCCCCcCo',
  '..oCcCCCCcCCCCCcCo',
  '..oScCCCCcCCCCCcSo',
  '...ooccccccccccoo.',
];
export const TORSO_SIDE = [
  '.......oCCCCo.....',
  '......oDCCCCDo....',
  '.....oCDCCqtCo....',
  '.....oCDCCCtCCo...',
  '....oCCDCCCCCCo...',
  '....oCCCCCCCCCo...',
  '....oCCcDDDDCCo...',
  '....oCCcCCCCCCo...',
  '.....occccccccoo..',
];

// Leg poses, 4 rows each. Front view (down/up) and side view (facing right).
export const LEGS_FRONT = {
  idle: [
    '....ojjjJJjjjo....',
    '....ojjjoojjjo....',
    '...onnnNooNnnno...',
    '...oxxxxooxxxxo...',
  ],
  leftUp: [
    '....ojjjJJjjjo....',
    '...onnnNoojjjo....',
    '...oxxxxooNnnno...',
    '.........oxxxxo...',
  ],
  rightUp: [
    '....ojjjJJjjjo....',
    '....ojjjooNnnno...',
    '...onnnNooxxxxo...',
    '...oxxxxo.........',
  ],
};
export const LEGS_SIDE = {
  idle: [
    '......ojjjjo......',
    '......ojjjjo......',
    '.....onnnnNNo.....',
    '.....oxxxxxxo.....',
  ],
  strideA: [
    '.....ojjjJjjo.....',
    '....oJJJo.ojjjo...',
    '...onnNo..onnnNNo.',
    '...oxxxo..oxxxxxo.',
  ],
  strideB: [
    '.....ojjJjjjo.....',
    '....ojjjo.oJJJo...',
    '...onnNo..onnnNNo.',
    '...oxxxo..oxxxxxo.',
  ],
};

/** Preview sheet for tests/sprite-png.ts. */
export function sheet(): Record<string, { rows: string[]; pal: Palette }> {
  const out: Record<string, { rows: string[]; pal: Palette }> = {};
  const over = (base: string[], top: string[], ox: number, oy: number): string[] => {
    const g = base.map((r) => [...r]);
    top.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.' && g[y + oy] && x + ox >= 0 && x + ox < g[0].length) g[y + oy][x + ox] = ch; }));
    return g.map((r) => r.join(''));
  };
  const figure = (head: string[], torso: string[], legs: string[], headUp = false): string[] => {
    let g = Array.from({ length: 29 }, () => '.'.repeat(20));
    const body = [...torso, ...legs];
    if (headUp) { g = over(g, body, 1, 16); g = over(g, head, 0, 0); }
    else { g = over(g, body, 1, 16); g = over(g, head, 0, 0); }
    return g;
  };
  const face = (base: string[], f?: [number, string[]]) => (f ? base.map((r, i) => (i >= f[0] && i < f[0] + f[1].length ? f[1][i - f[0]] : r)) : base);
  out.down = { rows: figure(HEAD_DOWN, TORSO_DOWN, LEGS_FRONT.idle), pal: MARCUS_PAL };
  out.side = { rows: figure(HEAD_SIDE, TORSO_SIDE, LEGS_SIDE.strideA), pal: MARCUS_PAL };
  out.up = { rows: figure(HEAD_UP, TORSO_UP, LEGS_FRONT.leftUp, true), pal: MARCUS_PAL };
  for (const k of Object.keys(FACE_DOWN)) out['d_' + k] = { rows: face(HEAD_DOWN, FACE_DOWN[k]), pal: MARCUS_PAL };
  for (const k of Object.keys(FACE_SIDE)) out['s_' + k] = { rows: face(HEAD_SIDE, FACE_SIDE[k]), pal: MARCUS_PAL };
  return out;
}
