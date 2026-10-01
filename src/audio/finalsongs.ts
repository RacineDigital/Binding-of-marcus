// The three final boss themes. Each is a 32-bar arrangement with sections (intro, assault,
// breakdown, climax) rather than one looped riff, so the fight builds:
//   The Binding (the Unbound / It Remembers) - symphonic black metal
//   The Unwritten                           - industrial djent chaos
//   The Author                              - angelic-horror organ, choir and metal march
// Melodies are written out over all 32 bars ("r:16" is a bar's rest) so sections line up exactly.
import type { Song } from './score';

/** Shift every scale degree in a melody (for harmonies a third or an octave up). */
const up = (mel: string, by: number) => mel.replace(/(^|\s)(-?\d+)([+b]?):/g, (_m, s, d, acc) => `${s}${Number(d) + by}${acc}:`);
const rest = (bars: number) => `r:${bars * 16}`;

// ------------------------------------------------------------------ The Binding
const BIND_M1 = '7:4 6:2 7:2 9:4 7:4 | 10:6 9:2 7:8 | 7:4 6:2 5:2 4:4 5:4 | 6:16 | 5:4 6:2 7:2 8:4 7:4 | 5:6 4:2 3:8 | 4:4 5:4 6:4 4:4 | 7:16';
const BIND_M2 = '4:8 5:8 | 6:8 7:8 | 5:16 | 4:16 | 7:8 9:8 | 10:8 9:8 | 8:16 | 6:16';

// ------------------------------------------------------------------ The Unwritten
const UNW_M = '7:2 8:2 7:2 4:2 5:2 4:2 1:2 0:2 | 7:2 8:2 11:4 10:2 8:2 7:4 | 4:3 5:3 4:2 1:4 2:4 | 0:16 | 7:2 8:2 7:2 4:2 5:2 4:2 1:2 0:2 | 11:4 12:4 11:2 10:2 8:4 | 7:4 8:4 4:8 | 7:16';

// ------------------------------------------------------------------ The Author
const AUT_M = '4:4 5:4 4:4 2:4 | 1:8 0:8 | 4:4 5:4 7:4 8:4 | 7:16 | 9:4 8:4 7:4 5:4 | 4:8 5:8 | 4:4 2:4 1:4 2:4 | 0:16';
const AUT_C = '7:16 | 8:16 | 9:8 8:8 | 7:16 | 5:16 | 6:16 | 8:8 7:8 | 7:16';

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
    title: 'Unwriting', genre: 'Industrial djent', bpm: 176, key: 37, scale: 'locrian', bars: 32, only: 'combat',
    chords: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 4, 1, 0, 1, 4, 5, 0, 0, 6, 5, 4, 4, 1, 1, 0, 0, 0, 1, 0, 1, 4, 5],
    reverb: { seconds: 2.4, damp: 0.45, mix: 0.3 },
    parts: [
      { kind: 'pad', sound: 'supersaw', octave: 3, layer: 'combat', vol: 0.26, cut: 2200 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'combat', vol: 0.4, rev: 0.6, from: 24 },
      { kind: 'arp', sound: 'saw', octave: 4, rate: 4, seq: [0, 1, 2, 3, 2, 1], layer: 'combat', vol: 0.22, cut: 3000, echo: true, to: 20 },
      { kind: 'arp', sound: 'saw', octave: 5, rate: 4, seq: [0, 2, 3, 5, 3, 2], layer: 'combat', vol: 0.22, cut: 3600, echo: true, from: 24 },
      // a polymetric djent riff that refuses to line up with the bar, then pure assault
      { kind: 'guitar', low: 37, notes: [0, 1, 3, 5, 7, 8, 10, 12], cycle: 'x.xx.x..x.xB--x.x..xx.C-.', layer: 'combat', vol: 0.66, from: 4, to: 12 },
      { kind: 'guitar', low: 37, riff: ['x.x.xx.xx.x.xx.x', 'x.x.xx.xx.x.X---'], layer: 'combat', vol: 0.64, from: 12, to: 20 },
      { kind: 'guitar', low: 25, riff: ['x...x..x.x..x...', 'x...x..x.x..X---', 'x...x..x.x..x...', 'x.x.x.x.xxxxXXXX'], layer: 'combat', vol: 0.72, from: 20, to: 24 },
      { kind: 'guitar', low: 37, notes: [0, 1, 3, 5, 7, 8, 10, 12], cycle: 'x.xx.x..x.xB--x.x..xx.C-.', layer: 'combat', vol: 0.68, from: 24 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.5, grit: 0.75, from: 4 },
      { kind: 'synthbass', octave: 1, pat: ['x.xxx.xxx.xxx.xx'], layer: 'combat', vol: 0.45, cut: 600, grit: 0.6, to: 4 },
      { kind: 'drums', style: 'industrial', layer: 'combat', vol: 0.95, to: 4,
        kick: ['x...x...x...x...'], hat: ['x.x.x.x.x.x.x.x.'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', 'x.x.x.x.xxxxxxxx'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 4, to: 12, kickFollows: true,
        snare: ['....x.......x...'], cym: ['h.h.h.h.h.h.h.h.', 'h.h.h.h.h.h.h.h.', 'h.h.h.h.h.h.h.h.', 'h.h.h.h.c.c.c.c.'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 12, to: 20,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['x.x.x.x.x.x.x.x.'], cym: ['c...c...c...c...'] },
      { kind: 'drums', style: 'industrial', layer: 'combat', vol: 1, from: 20, to: 24,
        kick: ['x...x..x.x..x...'], snare: ['........x.......', '........x.......', '........x.......', 'x.x.x.x.xxxxxxxx'], cym: ['h.......h.......'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 1, from: 24, kickFollows: true,
        snare: ['x...x...x...x...'], cym: ['c.h.c.h.c.h.c.h.'] },
      { kind: 'perc', sound: 'anvil', midi: 72, pat: ['x..x..x.....x...'], layer: 'combat', vol: 0.36, from: 20, to: 24 },
      { kind: 'perc', sound: 'sheet', midi: 50, pat: ['x...............'], layer: 'combat', vol: 0.35, from: 24 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.4, from: 3, to: 4 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.45, from: 23, to: 24 },
      // a screaming saw lead over the assault and the end
      { kind: 'lead', sound: 'saw', octave: 4, layer: 'combat', vol: 0.46, glide: true, melody: `${rest(12)} | ${UNW_M} | ${rest(4)} | ${UNW_M}` },
      { kind: 'lead', sound: 'square', octave: 5, layer: 'combat', vol: 0.22, pan: 0.35, melody: `${rest(24)} | ${up(UNW_M, 2)}` },
    ],
  },

  finalAuthor: {
    title: 'The Final Draft', genre: 'Choral organ metal', bpm: 168, key: 41, scale: 'phrygdom', bars: 32, only: 'combat',
    chords: [0, 0, 1, 0, 0, 0, 1, 0, 5, 5, 6, 0, 3, 3, 1, 0, 0, 5, 6, 0, 5, 6, 1, 0, 0, 0, 1, 0, 5, 6, 1, 0],
    reverb: { seconds: 3.8, damp: 0.55, mix: 0.42 },
    parts: [
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'combat', vol: 0.36, rev: 0.5 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'combat', vol: 0.42, rev: 0.6, from: 4 },
      { kind: 'arp', sound: 'bell', octave: 5, rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], layer: 'combat', vol: 0.2, echo: true },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.3, from: 4, to: 20 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.34, from: 24 },
      { kind: 'guitar', low: 41, riff: ['x.x.x.x.X---x.x.', 'x.x.x.x.X---X---'], layer: 'combat', vol: 0.6, from: 4, to: 12 },
      { kind: 'guitar', low: 41, riff: ['XXXXXXXXXXXXXXXX'], layer: 'combat', vol: 0.56, from: 12, to: 20 },
      { kind: 'guitar', low: 29, riff: ['................', '................', 'X---------------', 'x.x.x.x.xxxxXXXX'], layer: 'combat', vol: 0.6, from: 20, to: 24 },
      { kind: 'guitar', low: 41, riff: ['X---X---XXXXXXXX', 'XXXXXXXXXXXXXXXX'], layer: 'combat', vol: 0.6, from: 24 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.5, grit: 0.5, from: 4 },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 0.9, to: 4,
        kick: ['x...............'], toms: ['1...2...3...3...', '1...2...3...3...', '1...2...3...3...', '1.1.2.2.33333333'], cym: ['c...............', '................'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 4, to: 12,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x...x.xxxxxx'], hat: ['r.r.r.r.r.r.r.r.'], cym: ['c...............', '................'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 12, to: 20,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['x.x.x.x.x.x.x.x.'], cym: ['c.......c.......'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, from: 20, to: 24,
        kick: ['................', '................', 'x...............', 'x.x.x.x.xxxxxxxx'], snare: ['................', '................', '................', 'x.x.x.x.xxxxxxxx'],
        toms: ['................', '................', '................', '........11223333'], cym: ['................', '................', 'c...............', '................'] },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 1, from: 24,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.x.x.x.x.', 'x.x.x.x.xxxxxxxx'], cym: ['c...c...c...c...'] },
      { kind: 'perc', sound: 'pipe', midi: 65, pat: ['x.......x.......'], layer: 'combat', vol: 0.3, to: 4 },
      { kind: 'perc', sound: 'pipe', midi: 65, pat: ['x...............'], layer: 'combat', vol: 0.3, from: 20, to: 24 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.4, from: 3, to: 4 },
      { kind: 'perc', sound: 'riser', midi: 60, pat: ['x...............'], layer: 'combat', vol: 0.45, from: 23, to: 24 },
      { kind: 'lead', sound: 'organ', octave: 5, layer: 'combat', vol: 0.38, rev: 0.35, melody: `${rest(4)} | ${AUT_M} | ${rest(12)} | ${AUT_M}` },
      { kind: 'lead', sound: 'choir', octave: 4, layer: 'combat', vol: 0.55, rev: 0.6, melody: `${rest(12)} | ${AUT_C} | ${rest(4)} | ${up(AUT_C, 7)}` },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'combat', vol: 0.25, rev: 0.6, melody: `${rest(20)} | ${AUT_C.split('|').slice(0, 4).join('|')} | ${rest(8)}` },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.42, pan: -0.3, melody: `${rest(24)} | ${up(AUT_M, 2)}` },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.42, pan: 0.3, melody: `${rest(24)} | ${AUT_M}` },
    ],
  },
};
