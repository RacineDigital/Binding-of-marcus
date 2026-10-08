// Hand-drawn Chapter IV creatures added in 2.0: Spilled Pills, Monitor and Mourner
// (preview: npx tsx tests/sprite-png.ts src/art/hand/ward3.ts out.png).
import type { Palette } from '../grid';

export const PILL_PAL: Palette = { o: '#1a1418', R: '#c84848', r: '#8a2a2a', W: '#f0ece4', w: '#c8c0b8', e: '#1a1418' };
export const MONITOR_PAL: Palette = { o: '#0e1214', G: '#8a9a9a', k: '#0a1a14', g: '#60ff90', r: '#ff4040', S: '#5a6a6a' };
export const MOURNER_PAL: Palette = { o: '#14121a', V: '#4a4458', v: '#2e2a3a', k: '#0a080e', e: '#e8e0ff' };

export const PILL: string[][] = [[
  '.oooooo.',
  'oRRRWWWo',
  'oReRWeWo',
  'oRRRWWWo',
  '.oooooo.',
], [
  '.oooooo.',
  'oWWWRRRo',
  'oWeWReRo',
  'oWWWRRRo',
  '.oooooo.',
]];
export const MONITOR: string[][] = [[
  '..oooooooooo..',
  '.oGGGGGGGGGGo.',
  '.oGkkkkkkkkGo.',
  '.oGkgkkkkkkGo.',
  '.oGkkgkkgkkGo.',
  '.oGkkkgkgkkGo.',
  '.oGkkkkgkkkGo.',
  '.oGkkkkkkkkGo.',
  '.oGGGGGGGGGGo.',
  '..oooooooooo..',
  '......oo......',
  '......oo......',
  '......oo......',
  '.....oSSo.....',
  '....oSSSSo....',
  '...oSSSSSSo...',
  '...oooooooo...',
], [
  '..oooooooooo..',
  '.oGGGGGGGGGGo.',
  '.oGkkkkkkkkGo.',
  '.oGkrkkkkkkGo.',
  '.oGkkrkkrkkGo.',
  '.oGkkkrkrkkGo.',
  '.oGkkkkrkkkGo.',
  '.oGkkkkkkkkGo.',
  '.oGGGGGGGGGGo.',
  '..oooooooooo..',
  '......oo......',
  '......oo......',
  '......oo......',
  '.....oSSo.....',
  '....oSSSSo....',
  '...oSSSSSSo...',
  '...oooooooo...',
]];
export const MOURNER: string[][] = [[
  '....oooo....',
  '...oVVVVo...',
  '..oVVVVVVo..',
  '..oVvkkvVo..',
  '..oVkeekVo..',
  '..oVVkkVVo..',
  '..oVVVVVVo..',
  '.oVVVVVVVVo.',
  '.oVvVVVVvVo.',
  '.oVVVVVVVVo.',
  'oVVvVVVVvVVo',
  'oVVVVVVVVVVo',
  'oVvVVVVVVvVo',
  'oVVVVVVVVVVo',
  '.oooooooooo.',
  '............',
], [
  '............',
  '............',
  '............',
  '....oooo....',
  '...oVVVVo...',
  '..oVVVVVVo..',
  '..oVvkkvVo..',
  '..oVkeekVo..',
  '..oVVkkVVo..',
  '.oVVVVVVVVo.',
  'oVVvVVVVvVVo',
  'oVVVVVVVVVVo',
  'oVvVVVVVVvVo',
  'oVVVVVVVVVVo',
  '.oooooooooo.',
  '............',
]];

/** For the sprite preview tool. */
export function sheet(): Record<string, { rows: string[]; pal: Palette }> {
  const s: Record<string, { rows: string[]; pal: Palette }> = {};
  ([['pill', PILL, PILL_PAL], ['monitor', MONITOR, MONITOR_PAL], ['mourner', MOURNER, MOURNER_PAL]] as [string, string[][], Palette][]).forEach(([n, fr, pal]) => fr.forEach((rows, i) => { s[n + i] = { rows, pal }; }));
  return s;
}
