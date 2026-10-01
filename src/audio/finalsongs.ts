// The three final boss themes. Each is a 32-bar arrangement with sections rather than one looped
// riff, so the fight builds:
//   The Binding (the Unbound / It Remembers) - symphonic black metal
//   The Unwritten                           - chip rock: a pulse-wave hook over a driving band
//   The Author                              - chip rock with organ and choir, in harmonic minor
// Melodies are written out over all 32 bars ("r:16" is a bar's rest) so sections line up exactly.
import type { Song } from './score';

/** Shift every scale degree in a melody (for harmonies a third or an octave up). */
const up = (mel: string, by: number) => mel.replace(/(^|\s)(-?\d+)([+b]?):/g, (_m, s, d, acc) => `${s}${Number(d) + by}${acc}:`);
const rest = (bars: number) => `r:${bars * 16}`;

// ------------------------------------------------------------------ The Binding
const BIND_M1 = '7:4 6:2 7:2 9:4 7:4 | 10:6 9:2 7:8 | 7:4 6:2 5:2 4:4 5:4 | 6:16 | 5:4 6:2 7:2 8:4 7:4 | 5:6 4:2 3:8 | 4:4 5:4 6:4 4:4 | 7:16';
const BIND_M2 = '4:8 5:8 | 6:8 7:8 | 5:16 | 4:16 | 7:8 9:8 | 10:8 9:8 | 8:16 | 6:16';

// The Unwritten and the Author share a tempo arc: start fast, ease off, race far faster, settle.
const ARC = (base: number, slow: number, peak: number) => [
  base, base, base, base, base, base, base, base,
  base - 6, base - 12, slow + 10, slow + 4, slow, slow, slow, slow,
  slow + 10, base - 4, base + 12, base + 26, peak - 6, peak, peak, peak,
  peak - 14, base + 14, base + 4, base, base, base, base, base,
];
/** A shredding eight-bar guitar solo for the fastest section. */
const SOLO = '7:1 8:1 7:1 5:1 4:1 5:1 7:1 8:1 10:2 8:2 7:2 5:2 | 4:1 5:1 4:1 2:1 1:1 2:1 4:1 5:1 7:4 5:4 | 7:1 9:1 10:1 12:1 10:1 9:1 7:1 9:1 10:1 12:1 14:1 12:1 10:2 9:2 | 14:8 12:4 10:4 | 7:1 8:1 10:1 8:1 7:1 5:1 4:1 5:1 7:1 8:1 10:1 8:1 7:1 5:1 4:1 2:1 | 0:2 1:2 2:2 4:2 5:2 7:2 8:2 9:2 | 10:1 9:1 8:1 7:1 10:1 9:1 8:1 7:1 11:2 10:2 9:2 8:2 | 7:12 r:4';

// ------------------------------------------------------------------ The Unwritten
// Chip-rock in the Super Meat Boy vein: a big pulse-wave hook over a driving band.
const UNW_HOOK = '7:2 7:1 7:1 4:2 7:2 9:2 7:2 4:2 7:2 | 9:2 9:1 9:1 7:2 5:2 4:4 5:2 7:2 | 9:2 9:1 9:1 11:2 9:2 7:2 6:2 7:4 | 6:6 4:2 6:4 8:4 | 7:2 7:1 7:1 4:2 7:2 9:2 7:2 4:2 7:2 | 9:2 9:1 9:1 7:2 5:2 4:4 2:2 4:2 | 5:2 4:2 5:2 7:2 9:4 11:4 | 13:4 11:2 9:2 7:8';
const UNW_SLOW = '4:8 3:8 | 2:8 0:8 | 4:6 5:2 4:8 | 2:16 | 5:8 4:8 | 3:8 2:8 | 1:4 2:4 3:4 4:4 | 6:16';

// ------------------------------------------------------------------ The Author
const AUT_HOOK = '4:2 7:2 9:2 7:2 9:4 10:2 9:2 | 12:4 11:2 10:2 9:4 7:4 | 10:2 9:2 10:2 12:2 10:4 9:2 7:2 | 11:6 8:2 6:8 | 4:2 7:2 9:2 7:2 9:4 10:2 9:2 | 12:4 14:2 12:2 11:4 9:4 | 10:2 11:2 13:2 11:2 10:4 9:4 | 11:16';
/** The Author's answering phrase, for the section that keeps the energy up where the slow part was. */
const AUT_ANS = '12:4 10:4 9:4 7:4 | 9:6 10:2 9:8 | 10:4 12:4 13:4 12:4 | 10:8 9:8 | 7:4 9:4 10:4 11:4 | 12:8 11:8 | 11:4 13:4 15:4 13:4 | 11:16';

/** A driving rock kit for each section of the arc: A fast, B half-time, C double-time punk, D A again with crashes. */
const ROCK_A = { kick: ['x.x...x.x.x...x.'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x...x.xxxxxx'], hat: ['x.x.x.x.x.x.x.x.'], cym: ['c...............', '................', '................', '................'] };
const ROCK_B = { kick: ['x.........x.x...'], snare: ['........x.......', '........x.......', '........x.......', 'x.x.x.x.xxxxxxxx'], hat: ['r...r...r...r...'], cym: ['c...............', '................'], toms: ['................', '................', '................', '........11223333'] };
const ROCK_C = { kick: ['x...x...x...x...'], snare: ['..x...x...x...x.', '..x...x...x...x.', '..x...x...x...x.', 'x.x.x.x.xxxxxxxx'], hat: ['x.x.x.x.x.x.x.x.'], cym: ['c.......c.......'] };
const ROCK_D = { kick: ['x.x...x.x.x...x.'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', 'x.x.x.x.xxxxxxxx'], hat: ['o.x.o.x.o.x.o.x.'], cym: ['c...............'] };

export const FINAL_SONGS: Record<string, Song> = {
  finalBinding: {
    title: 'Last Rites', genre: 'Symphonic black metal', bpm: 192, key: 38, scale: 'harmonic', bars: 32, only: 'combat',
    chords: [0, 0, 5, 4, 0, 0, 5, 4, 3, 3, 1, 4, 5, 5, 3, 3, 0, 0, 4, 4, 0, 1, 0, 1, 0, 5, 3, 4, 0, 5, 4, 4],
    reverb: { seconds: 3.2, damp: 0.5, mix: 0.36 },
    parts: [
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'combat', vol: 0.42, rev: 0.6 },
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'combat', vol: 0.3, rev: 0.4, from: 4 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.3, from: 4, to: 12 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0.0.2.0.0.0.2.3.'], layer: 'combat', vol: 0.3, from: 12, to: 20 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.34, from: 24 },
      // guitars: ringing chords, tremolo blasts, a gallop, a drop-tuned breakdown, tremolo again
      { kind: 'guitar', low: 38, riff: ['X---------------', 'X-------X-------'], layer: 'combat', vol: 0.55, to: 4 },
      { kind: 'guitar', low: 38, riff: ['XXXXXXXXXXXXXXXX'], layer: 'combat', vol: 0.55, from: 4, to: 12 },
      { kind: 'guitar', low: 38, riff: ['x.xxx.xxx.xxx.xX'], layer: 'combat', vol: 0.62, from: 12, to: 20 },
      { kind: 'guitar', low: 26, riff: ['x..x..x...x..x..', 'x..x..x...x..X--', 'x..x..x...x..x..', 'x.x.x.x.xxxxXXXX'], layer: 'combat', vol: 0.7, from: 20, to: 24 },
      { kind: 'guitar', low: 38, riff: ['XXXXXXXXXXXXXXXX'], layer: 'combat', vol: 0.58, from: 24 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.55, grit: 0.6 },
      // drums
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, to: 4,
        kick: ['x.......x.......'], snare: ['................', '................', '........x.......', 'x.x.x.x.xxxxxxxx'],
        toms: ['................', '................', '................', '........11223333'], cym: ['c...............', '................'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 4, to: 12,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['x.x.x.x.x.x.x.x.'], hat: ['r.r.r.r.r.r.r.r.'], cym: ['c.......c.......', 'c...............'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 12, to: 20,
        kick: ['x.xxx.xxx.xxx.xx'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x...x.xxxxxx'], hat: ['x.x.x.x.x.x.x.x.'], cym: ['c...............', '................'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 1, from: 20, to: 24,
        kick: ['x..x..x...x..x..'], snare: ['........x.......', '........x.......', '........x.......', 'x.x.x.x.xxxxxxxx'], cym: ['h...h...h...h...'],
        toms: ['................', '................', '................', '........11223333'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 1, from: 24,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.xxxxxxxx'], cym: ['c...c...c...c...'] },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.4, from: 3, to: 4 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.45, from: 23, to: 24 },
      { kind: 'perc', sound: 'anvil', midi: 62, pat: ['....x.......x...'], layer: 'combat', vol: 0.4, from: 20, to: 24 },
      // leads: an organ hymn over the blasts, the choir over the gallop, everything at the end
      { kind: 'lead', sound: 'organ', octave: 5, layer: 'combat', vol: 0.36, rev: 0.3, melody: `${rest(4)} | ${BIND_M1} | ${rest(12)} | ${BIND_M1}` },
      { kind: 'lead', sound: 'choir', octave: 4, layer: 'combat', vol: 0.5, rev: 0.6, melody: `${rest(12)} | ${BIND_M2} | ${rest(4)} | ${up(BIND_M2, 7)}` },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.42, pan: -0.3, melody: `${rest(24)} | ${up(BIND_M1, 2)}` },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.42, pan: 0.3, melody: `${rest(24)} | ${BIND_M1}` },
    ],
  },

  finalUnwritten: {
    title: 'Unwriting', genre: 'Chip rock', bpm: 176, key: 40, scale: 'aeolian', bars: 32, only: 'combat', real: true,
    tempo: ARC(176, 148, 224),
    chords: [0, 5, 2, 6, 0, 5, 2, 6, 3, 3, 0, 0, 5, 5, 6, 6, 0, 0, 5, 5, 3, 3, 4, 4, 0, 5, 2, 6, 0, 5, 6, 0],
    reverb: { seconds: 2.8, damp: 0.5, mix: 0.4 },
    parts: [
      { kind: 'pad', sound: 'warm', octave: 3, layer: 'combat', vol: 0.14, from: 8, to: 16 },
      // chip arps: bubbling under the hook, racing under the solo
      { kind: 'arp', sound: 'chip', octave: 5, rate: 2, seq: [0, 1, 2, 3, 2, 1], layer: 'combat', vol: 0.12, to: 8 },
      { kind: 'arp', sound: 'chip', octave: 5, rate: 1, seq: [0, 2, 3, 5, 3, 2], layer: 'combat', vol: 0.12, from: 16, to: 24 },
      { kind: 'arp', sound: 'chip', octave: 5, rate: 2, seq: [0, 1, 2, 3, 2, 1], layer: 'combat', vol: 0.12, from: 24 },
      // electric guitars: an 8th-note rock riff, huge half-time chords, punk tremolo, the riff again
      { kind: 'guitar', low: 40, notes: [0, 3, 5, 7, 10, 12], riff: ['X.x.x.X.x.x.X.x.', 'X.x.x.X.x.x.C-D-'], layer: 'combat', vol: 0.62, to: 8 },
      { kind: 'guitar', low: 28, riff: ['X-------x.x.X---', 'X-------x.x.x.x.', 'X-------X-------', 'x.x.x.x.xxxxXXXX'], layer: 'combat', vol: 0.68, from: 8, to: 16 },
      { kind: 'guitar', low: 40, riff: ['XXXXXXXXXXXXXXXX'], layer: 'combat', vol: 0.56, from: 16, to: 24 },
      { kind: 'guitar', low: 40, notes: [0, 3, 5, 7, 10, 12], riff: ['X.x.x.X.x.x.X.x.', 'X.x.x.X.x.x.C-D-'], layer: 'combat', vol: 0.64, from: 24 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.55, grit: 0.55 },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 0.95, to: 8, ...ROCK_A },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 1, from: 8, to: 16, ...ROCK_B },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 0.95, from: 16, to: 24, ...ROCK_C },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 1, from: 24, ...ROCK_D },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.35, from: 15, to: 16 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.35, from: 23, to: 24 },
      // the hook on chip, doubled by guitar at the end, a slow chip line, a guitar solo when it races
      // the hook on a played lead guitar, a twin a third below at the end, the chip only as a glint an octave up
      { kind: 'lead', sound: 'realguitar', octave: 4, layer: 'combat', vol: 0.5, pan: -0.15, melody: `${UNW_HOOK} | ${UNW_SLOW} | ${rest(8)} | ${UNW_HOOK}` },
      { kind: 'lead', sound: 'realguitar', octave: 4, layer: 'combat', vol: 0.4, pan: 0.2, melody: `${rest(24)} | ${up(UNW_HOOK, -2)}` },
      { kind: 'lead', sound: 'chip', octave: 5, layer: 'combat', vol: 0.12, rev: 0.4, melody: `${UNW_HOOK} | ${rest(16)} | ${UNW_HOOK}` },
      { kind: 'lead', sound: 'realguitar', octave: 4, layer: 'combat', vol: 0.5, pan: 0.1, melody: `${rest(16)} | ${SOLO} | ${rest(8)}` },
    ],
  },

  finalAuthor: {
    // no slow section: the hook, then the twin guitars and choir with an answering phrase, a racing
    // solo, then the hook with everything
    title: 'The Final Draft', genre: 'Chip rock / organ', bpm: 172, key: 43, scale: 'harmonic', bars: 32, only: 'combat', real: true,
    tempo: [172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172, 172,
      178, 186, 194, 202, 208, 214, 216, 216, 204, 190, 180, 172, 172, 172, 172, 172],
    chords: [0, 5, 3, 4, 0, 5, 6, 4, 5, 5, 3, 3, 0, 0, 4, 4, 0, 0, 5, 5, 1, 1, 4, 4, 0, 5, 3, 4, 0, 5, 4, 0],
    reverb: { seconds: 3.2, damp: 0.5, mix: 0.42 },
    parts: [
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'combat', vol: 0.15, rev: 0.5 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'combat', vol: 0.24, rev: 0.6, from: 8, to: 16 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'combat', vol: 0.24, rev: 0.6, from: 24 },
      { kind: 'arp', sound: 'chip', octave: 5, rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], layer: 'combat', vol: 0.08, to: 16 },
      { kind: 'arp', sound: 'chip', octave: 5, rate: 1, seq: [0, 1, 2, 3, 4, 3, 2, 1], layer: 'combat', vol: 0.08, from: 16, to: 24 },
      { kind: 'arp', sound: 'chip', octave: 5, rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], layer: 'combat', vol: 0.08, from: 24 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.16, from: 8, to: 16 },
      // electric guitars: a driving riff, the same pushed harder, punk tremolo under the solo, the riff hammered
      { kind: 'guitar', low: 43, notes: [0, 3, 5, 7, 10, 12], riff: ['X.x.x.X.x.x.X.x.', 'X.x.x.X.x.x.C-D-'], layer: 'combat', vol: 0.62, to: 8 },
      { kind: 'guitar', low: 43, notes: [0, 3, 5, 7, 10, 12], riff: ['X.x.x.X.x.x.X.x.', 'X---X---XXXXXXXX'], layer: 'combat', vol: 0.64, from: 8, to: 16 },
      { kind: 'guitar', low: 43, riff: ['XXXXXXXXXXXXXXXX'], layer: 'combat', vol: 0.56, from: 16, to: 24 },
      { kind: 'guitar', low: 43, notes: [0, 3, 5, 7, 10, 12], riff: ['X.x.x.X.x.x.X.x.', 'X---X---XXXXXXXX'], layer: 'combat', vol: 0.64, from: 24 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.55, grit: 0.5 },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 0.95, to: 8, ...ROCK_A },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 1, from: 8, to: 16, ...ROCK_D },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 0.95, from: 16, to: 24, ...ROCK_C },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 1, from: 24, ...ROCK_D },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.35, from: 15, to: 16 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.35, from: 23, to: 24 },
      // leads: the hook on a played lead guitar, twin guitars and choir answering, the solo, everything
      { kind: 'lead', sound: 'realguitar', octave: 4, layer: 'combat', vol: 0.5, pan: -0.15, melody: `${AUT_HOOK} | ${AUT_ANS} | ${rest(8)} | ${AUT_HOOK}` },
      { kind: 'lead', sound: 'realguitar', octave: 4, layer: 'combat', vol: 0.4, pan: 0.2, melody: `${rest(8)} | ${up(AUT_ANS, -2)} | ${rest(8)} | ${up(AUT_HOOK, -2)}` },
      { kind: 'lead', sound: 'choir', octave: 4, layer: 'combat', vol: 0.26, rev: 0.6, melody: `${rest(8)} | ${AUT_ANS} | ${rest(8)} | ${AUT_HOOK}` },
      { kind: 'lead', sound: 'chip', octave: 5, layer: 'combat', vol: 0.12, rev: 0.4, melody: `${AUT_HOOK} | ${rest(16)} | ${AUT_HOOK}` },
      { kind: 'lead', sound: 'realguitar', octave: 4, layer: 'combat', vol: 0.5, pan: 0.1, melody: `${rest(16)} | ${SOLO} | ${rest(8)}` },
    ],
  },
};
