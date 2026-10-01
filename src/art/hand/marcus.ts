// Hand-drawn Marcus. 20x18 head (faces aim), 18x13 body (faces movement).
import { Palette } from '../grid';

export const MARCUS_PAL: Palette = {
  o: '#130e18', // outline
  K: '#0d0b16', H: '#1f1d2e', h: '#16141f', L: '#35355a', l: '#5c5e92', // hair
  S: '#f4d3b8', s: '#dfae90', d: '#b9806e', W: '#fff1e2', // skin
  e: '#160f22', w: '#ffffff', v: '#6a5aa8', // eyes
  m: '#5a1e2a', r: '#ec9a92', k: '#3a44a0', // mouth, blush, ink smudge
};

export const HEAD_DOWN = [
  '........oLo.........',
  '......oooHlooo......',
  '....ooHHHLlHHHoo....',
  '...oHHHHLLHHHHHHo...',
  '..oHHLHHHHHHHHHhHo..',
  '.oHHLlHHHHHHHHHHhHo.',
  '.oHHHHHhHHHHHHhHHHo.',
  'oHHhHHhHHHHhHHHHhHHo',
  'oHhHHhSShHHSShHHSHHo',
  'oHHhSSSsHSSSsHSShHHo',
  'oHHsSeeeSSSSeeeSsHHo',
  'oShSSweeSSSSweeSShSo',
  'osSSSeevSSSSeevSSSso',
  '.oSrrSsSSSSSSsSrrSo.',
  '.oSSSkSSSSSSSSSSSSo.',
  '..oSSSSSSmmSSSSSso..',
  '...osSSSSSSSSSsso...',
  '....oooooooooooo....',
];
