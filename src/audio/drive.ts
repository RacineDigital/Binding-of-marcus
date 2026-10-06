// Original fast melodic rock for gameplay. No sampled recordings or borrowed melodies.
// Recordings are rendered ahead of release with scripts/render-soundtrack.mjs.
import type { Song, ScaleName } from './score';

type Theme = { bpm: number; key: number; scale: ScaleName; riff: number; hook: number };
const themes: Record<string, Theme> = {
  cellar: { bpm: 168, key: 38, scale: 'aeolian', riff: 0, hook: 0 },
  boiler: { bpm: 176, key: 40, scale: 'phrygian', riff: 1, hook: 1 },
  underworks: { bpm: 164, key: 36, scale: 'dorian', riff: 2, hook: 2 },
  ward: { bpm: 160, key: 41, scale: 'harmonic', riff: 3, hook: 3 },
  depths: { bpm: 180, key: 35, scale: 'phrygian', riff: 1, hook: 2 },
  chapel: { bpm: 172, key: 38, scale: 'harmonic', riff: 3, hook: 1 },
  hollow: { bpm: 178, key: 37, scale: 'aeolian', riff: 2, hook: 0 },
  binding: { bpm: 184, key: 38, scale: 'harmonic', riff: 0, hook: 3 },
};
const riffs = [
  ['x.x.X-x.x.x.X-x.', 'x.x.X-x.5-3-X---', 'x.x.x.x.X-x.X-x.', 'X---5-3-x.x.X-..'],
  ['x.xx.x.xX---x.x.', 'x.xx.x.x3-1-X---', 'x.x.X-x.x.xx.x.x', 'X-x.1-x.3-X-....'],
  ['X-x.x.x.X-x.x.x.', 'X-x.3-x.5-3-X-x.', 'x.x.X-x.X-x.x.x.', 'X---5-3-1-X-....'],
  ['X---x.x.X---x.x.', 'X-3-5-3-X-x.X---', 'x.x.X-x.x.x.X-x.', 'X-5-3-1-X---....'],
];
const hooks = [
  '7:2 7:2 9:2 7:2 4:4 5:2 6:2 | 7:4 6:2 4:2 3:4 r:2 4:2 | 5:2 5:2 7:2 9:2 10:4 9:2 7:2 | 6:4 4:4 3:4 r:4',
  '0:2 2:2 3:4 2:2 0:2 6:4 | 7:2 6:2 4:4 3:2 2:2 0:4 | 2:2 3:2 4:4 7:2 6:2 4:4 | 3:2 2:2 0:4 r:4 7:4',
  '4:2 7:2 9:4 7:2 5:2 4:4 | 3:2 4:2 5:4 4:2 2:2 0:4 | 7:2 9:2 10:4 9:2 7:2 5:4 | 4:4 3:2 2:2 0:4 r:4',
  '0:4 7:2 6:2 4:4 3:2 2:2 | 3:4 4:2 6:2 7:4 r:4 | 9:2 7:2 6:4 4:2 3:2 2:4 | 4:4 3:4 0:4 r:4',
];
export function driveSong(id: string, title: string, index = 0): Song {
  const t = themes[id] ?? { bpm: 164 + (index % 6) * 4, key: [38, 40, 36, 41, 35, 37][index % 6], scale: (index % 3 === 0 ? 'harmonic' : index % 3 === 1 ? 'phrygian' : 'aeolian') as ScaleName, riff: index % 4, hook: (index + 1) % 4 };
  return {
    title, genre: 'Melodic arcade rock', bpm: t.bpm, key: t.key, scale: t.scale,
    bars: 32, real: true, only: 'combat',
    chords: [0,0,5,3,0,0,6,4,0,5,3,6,0,5,6,4,0,0,3,4,5,3,6,4,0,5,3,6,0,5,4,4],
    reverb: { seconds: 0.65, damp: 0.45, mix: 0.14 },
    parts: [
      { kind: 'guitar', low: t.key, riff: riffs[t.riff], notes: [0,1,3,5,7,8,10], gain: 5.2, layer: 'combat', vol: 0.58, rev: 0.07 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.62, grit: 0.4 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.92,
        kick: ['x.x...x.x.x...x.', 'x..x..x.x...x.x.', 'x.x.x...x.x.x...', 'x.x...x.x.xxx...'],
        snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x.....g.x.gg'],
        hat: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.o.'],
        cym: ['c...............','................','................','................','c...............','................','................','............h...'],
        toms: ['................','................','................','............1233'] },
      // A first phrase establishes the riff; the hook arrives four bars in, then gets a break.
      { kind: 'lead', sound: 'chip', octave: 4, melody: hooks[t.hook], layer: 'combat', vol: 0.28, from: 4, to: 16, pan: -0.15, rev: 0.12 },
      { kind: 'lead', sound: 'realguitar', octave: 4, melody: hooks[(t.hook + 2) % 4], layer: 'combat', vol: 0.38, from: 20, to: 32, rev: 0.15 },
      { kind: 'arp', sound: 'pluck', octave: 3, rate: 2, seq: [0,1,2,3,2,1,2,1], layer: 'combat', vol: 0.12, from: 16, to: 20, pan: 0.2, rev: 0.1 },
    ],
  };
}
