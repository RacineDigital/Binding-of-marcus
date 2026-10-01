// The soundtrack. Each chapter has its own genre and composition; every track has a calm stem
// (exploring) and a combat stem (full band) that crossfade with the fight intensity.
//   Cellar - dark synthwave          Boiler Rooms - industrial rock
//   Underworks - darkwave            Forgotten Ward - chamber rock
//   Depths - djent                   Chapel - gothic metal
//   Hollow - industrial darksynth    Binding - symphonic gothic metal
// Melody tokens are "degree:sixteenths" ("r" = rest, "|" = bar line for readability).
import type { Song } from './score';

const FILL_SYNTH = '....x...x..xx.xx';
const ROCK_FILL_TOMS = '........11223333';

export const SONGS: Record<string, Song> = {
  // ------------------------------------------------------------------ menu: gothic chamber
  menu: {
    title: 'Bindery Hymn', genre: 'Gothic chamber', bpm: 66, key: 38, scale: 'harmonic', bars: 16, only: 'calm',
    chords: [0, 5, 3, 4, 0, 5, 2, 4, 5, 3, 0, 4, 0, 3, 4, 0],
    reverb: { seconds: 4, damp: 0.6, mix: 0.55 },
    parts: [
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'calm', vol: 0.5, rev: 0.4 },
      { kind: 'pad', sound: 'strings', octave: 3, layer: 'calm', vol: 0.45, from: 4, rev: 0.5 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'calm', vol: 0.3, from: 8, rev: 0.6 },
      { kind: 'arp', sound: 'harp', octave: 3, rate: 2, seq: [0, 1, 2, 3, 4, 3, 2, 1], layer: 'calm', vol: 0.45, pan: -0.25, rev: 0.4 },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'calm', vol: 0.4, from: 4, pan: 0.2, rev: 0.6,
        melody: '4:6 3:2 2:4 1:4 | 0:8 3:4 2:4 | 3:6 4:2 5:4 4:4 | 6:12 r:4 | 2:6 1:2 0:4 1:4 | 3:8 2:4 0:4 | 2:4 4:4 7:6 5:2 | 6:12 r:4' },
    ],
  },
  // ------------------------------------------------------------------ I. Cellar: dark synthwave
  cellar: {
    title: 'Wax and Wires', genre: 'Dark synthwave', bpm: 100, key: 38, scale: 'aeolian', bars: 16,
    chords: [0, 5, 2, 6, 0, 5, 2, 6, 3, 0, 5, 6, 3, 5, 6, 6],
    reverb: { seconds: 2.6, damp: 0.5, mix: 0.4 },
    parts: [
      { kind: 'pad', sound: 'supersaw', octave: 3, layer: 'both', vol: 0.38, rev: 0.35, cut: 2200 },
      { kind: 'arp', sound: 'saw', octave: 3, rate: 1, seq: [0, 1, 2, 3, 2, 1], layer: 'both', vol: 0.32, echo: true, pan: 0.15, cut: 1300 },
      { kind: 'synthbass', octave: 1, pat: ['x---------------'], layer: 'calm', vol: 0.5, cut: 260, grit: 0 },
      { kind: 'synthbass', octave: 1, pat: ['x.x.o.x.x.x.o.x.'], layer: 'combat', vol: 0.62, cut: 520, grit: 0.35 },
      { kind: 'drums', style: 'synth', layer: 'combat', vol: 0.85,
        kick: ['x...x...x...x...'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x.......x...', '....x.......x...', '....x.......x...', '....x.......x...', FILL_SYNTH],
        hat: ['..x...x...x...x.', '..x...x...x.x.x.'], cym: ['c...............', '................', '................', '................', '................', '................', '................', '................'] },
      { kind: 'guitar', low: 38, riff: ['X-------X-------'], layer: 'combat', vol: 0.3 },
      { kind: 'lead', sound: 'saw', octave: 4, layer: 'combat', vol: 0.55, glide: true, rev: 0.3,
        melody: '7:4 6:2 4:2 3:4 4:4 | 5:6 4:2 2:8 | 4:4 2:4 0:4 2:4 | 6:4 4:4 1:8 | 7:4 9:4 8:4 7:4 | 5:6 7:2 4:8 | 4:4 5:4 7:4 9:4 | 8:12 r:4' },
    ],
  },
  // ------------------------------------------------------------------ II. Boiler Rooms: industrial rock
  boiler: {
    title: 'Pressure Gauge', genre: 'Industrial rock', bpm: 112, key: 40, scale: 'phrygian', bars: 16,
    chords: [0, 0, 1, 0, 0, 0, 5, 6, 0, 0, 1, 0, 3, 1, 0, 0],
    reverb: { seconds: 1.8, damp: 0.4, mix: 0.3 },
    parts: [
      { kind: 'pad', sound: 'warm', octave: 2, layer: 'both', vol: 0.4, rev: 0.4 },
      { kind: 'perc', sound: 'pipe', midi: 64, pat: ['x.......x.....x.', '......x.........'], layer: 'calm', vol: 0.35, rev: 0.5, pan: -0.3 },
      { kind: 'synthbass', octave: 1, pat: ['x...x...x...x...'], layer: 'calm', vol: 0.45, cut: 300, grit: 0.2 },
      { kind: 'drums', style: 'industrial', layer: 'calm', vol: 0.35, hat: ['x.x.x.x.x.x.x.x.'] },
      { kind: 'arp', sound: 'pluck', octave: 3, rate: 2, seq: [0, -1, 1, -1, 2, -1, 1, 3], layer: 'calm', vol: 0.3, echo: true, cut: 1000 },
      { kind: 'guitar', low: 40, notes: [0, 1, 3, 5, 6, 7, 10, 12], riff: ['x.x.xx.x.x..X---', 'x.xxx.x.1-x.x.2-'], layer: 'combat', vol: 0.62 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.62, grit: 0.6 },
      { kind: 'drums', style: 'industrial', layer: 'combat', vol: 0.9,
        kick: ['x..x..x...x..x..'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x...x..xx.xx'],
        hat: ['x.x.x.x.x.x.x.x.'], cym: ['c...............', '................', '................', '................'] },
      { kind: 'perc', sound: 'anvil', midi: 76, pat: ['....x.......x...'], layer: 'combat', vol: 0.4, pan: 0.25 },
      { kind: 'lead', sound: 'square', octave: 4, layer: 'combat', vol: 0.45, from: 8, rev: 0.25,
        melody: '7:2 8:2 7:2 r:2 4:4 5:2 4:2 | 3:4 1:4 0:8 | 7:2 8:2 7:2 r:2 9:4 8:2 7:2 | 8:8 5:8 | 7:2 8:2 7:2 r:2 4:4 5:2 4:2 | 3:4 4:4 5:8 | 4:2 5:2 7:4 8:4 10:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ III. Underworks: darkwave
  underworks: {
    title: 'Drain Runoff', genre: 'Darkwave', bpm: 96, key: 36, scale: 'dorian', bars: 16,
    chords: [0, 3, 0, 6, 0, 3, 4, 6, 2, 3, 0, 6, 2, 3, 4, 4],
    reverb: { seconds: 3, damp: 0.55, mix: 0.45 },
    parts: [
      { kind: 'arp', sound: 'clean', octave: 3, rate: 2, seq: [0, 2, 4, 2, 3, 2, 4, 1], layer: 'both', vol: 0.45, echo: true, pan: -0.2, rev: 0.3 },
      { kind: 'pad', sound: 'warm', octave: 3, layer: 'calm', vol: 0.45, rev: 0.5 },
      { kind: 'pad', sound: 'supersaw', octave: 3, layer: 'combat', vol: 0.32, rev: 0.35, cut: 1800 },
      { kind: 'synthbass', octave: 1, pat: ['x---------------'], layer: 'calm', vol: 0.5, cut: 250, grit: 0 },
      { kind: 'synthbass', octave: 1, pat: ['x.xxx.xxx.xxx.x.'], layer: 'combat', vol: 0.55, cut: 480, grit: 0.3 },
      { kind: 'drums', style: 'synth', layer: 'combat', vol: 0.85,
        kick: ['x.......x.x.....'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', FILL_SYNTH], hat: ['x.x.x.x.x.x.x.x.'],
        cym: ['c...............', '................', '................', '................'] },
      { kind: 'lead', sound: 'saw', octave: 4, layer: 'combat', vol: 0.5, glide: true, rev: 0.35,
        melody: '4:4 3:2 2:2 3:4 2:2 0:2 | 3:8 5:4 4:4 | 4:4 6:2 7:2 6:4 4:4 | 6:8 7:8 | 9:4 8:2 7:2 8:4 7:2 6:2 | 5:8 4:4 3:4 | 4:4 5:4 6:4 8:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ IV. Forgotten Ward: chamber rock
  ward: {
    title: 'Night Shift', genre: 'Chamber rock', bpm: 124, key: 42, scale: 'harmonic', bars: 16,
    chords: [0, 5, 3, 4, 0, 5, 6, 4, 3, 4, 0, 5, 3, 1, 4, 4],
    reverb: { seconds: 2.6, damp: 0.5, mix: 0.4 },
    parts: [
      { kind: 'stacc', sound: 'strings', octave: 3, pat: ['0.0.2.0.1.0.2.0.'], layer: 'both', vol: 0.5, rev: 0.25 },
      { kind: 'arp', sound: 'harp', octave: 4, rate: 2, seq: [0, 1, 2, 3, 2, 1, 2, 4], layer: 'calm', vol: 0.32, pan: 0.3 },
      { kind: 'pad', sound: 'strings', octave: 3, layer: 'both', vol: 0.32, rev: 0.4 },
      { kind: 'drums', style: 'rock', layer: 'combat', vol: 0.85,
        kick: ['x.....x.x.......'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x.......x...'],
        hat: ['r.r.r.r.r.r.r.r.'], cym: ['c...............', '................', '................', '................'], toms: ['................', '................', '................', ROCK_FILL_TOMS] },
      { kind: 'guitar', low: 42, riff: ['X--.X.X.X--.X.X.'], layer: 'combat', vol: 0.5 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.55, grit: 0.35 },
      { kind: 'lead', sound: 'strings', octave: 4, layer: 'combat', vol: 0.6, rev: 0.35,
        melody: '4:6 3:2 2:4 1:4 | 0:8 2:4 4:4 | 3:6 2:2 3:4 5:4 | 6:12 r:4 | 4:6 5:2 4:4 2:4 | 3:8 2:4 0:4 | 1:4 2:4 3:4 6:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ V. Depths: djent
  depths: {
    title: 'Ossuary Djent', genre: 'Djent', bpm: 132, key: 33, scale: 'phrygian', bars: 16,
    chords: [0, 0, 0, 1, 0, 0, 5, 6, 0, 0, 0, 1, 3, 4, 5, 6],
    reverb: { seconds: 3.2, damp: 0.6, mix: 0.42 },
    parts: [
      { kind: 'arp', sound: 'clean', octave: 3, rate: 2, seq: [0, 2, 4, 7, 4, 2], layer: 'both', vol: 0.45, echo: true, pan: 0.3, rev: 0.4 },
      { kind: 'pad', sound: 'glass', octave: 4, layer: 'calm', vol: 0.4, rev: 0.6 },
      { kind: 'pad', sound: 'warm', octave: 2, layer: 'both', vol: 0.4, rev: 0.4 },
      { kind: 'synthbass', octave: 1, pat: ['x---------------'], layer: 'calm', vol: 0.45, cut: 220, grit: 0 },
      // 23-step riff against 16-step bars: the accents drift across the bar line
      { kind: 'guitar', low: 33, notes: [0, 1, 3, 5, 7, 8, 10, 12], cycle: 'x.xx..x.x..xB-..x.x..A-.', layer: 'combat', vol: 0.66 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.6, grit: 0.7 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.9, kickFollows: true,
        snare: ['........x.......'], cym: ['c...h...h...h...', 'h...h...h...h...', 'h...h...h...h...', 'h...h...h...h...'] },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'combat', vol: 0.4, from: 8, rev: 0.6,
        melody: '7:8 r:8 | 6:8 r:8 | 4:8 r:8 | 5:12 r:4 | 7:8 r:8 | 8:8 r:8 | 9:8 8:4 7:4 | 5:16' },
    ],
  },
  // ------------------------------------------------------------------ VI. Chapel: gothic metal
  chapel: {
    title: 'Vespers in Iron', genre: 'Gothic metal', bpm: 84, key: 38, scale: 'harmonic', bars: 16,
    chords: [0, 5, 3, 4, 0, 5, 6, 4, 3, 0, 1, 4, 0, 5, 4, 0],
    reverb: { seconds: 4.2, damp: 0.6, mix: 0.5 },
    parts: [
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'both', vol: 0.45, rev: 0.45 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'both', vol: 0.38, from: 4, rev: 0.6 },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'calm', vol: 0.35, rev: 0.7,
        melody: '7:8 6:8 | 5:8 4:8 | 3:8 4:8 | 6:16 | 7:8 9:8 | 8:8 7:8 | 6:8 4:8 | 7:16' },
      { kind: 'guitar', low: 38, riff: ['X-------X---X---', 'x.x.x.x.X---x.x.'], layer: 'combat', vol: 0.62 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.55, grit: 0.5 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.9,
        kick: ['x.....x.x.......', 'x.....x.x.......', 'x.....x.x.......', 'xxxxxxxxxxxxxxxx'], snare: ['........x.......'],
        hat: ['r...r...r...r...'], cym: ['c...............', '................', '................', 'c.......c.......'] },
      { kind: 'lead', sound: 'organ', octave: 4, layer: 'combat', vol: 0.5, rev: 0.35,
        melody: '7:4 6:4 5:4 4:4 | 5:8 4:4 2:4 | 3:4 4:4 5:4 3:4 | 6:12 4:4 | 7:4 9:4 8:4 7:4 | 8:8 7:4 5:4 | 6:4 5:4 4:4 6:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ VII. Hollow: industrial darksynth
  hollow: {
    title: 'Static Mass', genre: 'Industrial darksynth', bpm: 140, key: 35, scale: 'phrygian', bars: 16,
    chords: [0, 1, 0, 1, 0, 1, 5, 4, 0, 1, 0, 1, 6, 5, 4, 1],
    reverb: { seconds: 2.2, damp: 0.45, mix: 0.35 },
    parts: [
      { kind: 'pad', sound: 'glass', octave: 4, layer: 'calm', vol: 0.35, rev: 0.6 },
      { kind: 'pad', sound: 'warm', octave: 2, layer: 'both', vol: 0.42, rev: 0.4 },
      { kind: 'arp', sound: 'bell', octave: 4, rate: 4, seq: [0, 1, 2, 1], layer: 'calm', vol: 0.28, echo: true },
      { kind: 'perc', sound: 'sheet', midi: 60, pat: ['x...............', '................', '........x.......', '................'], layer: 'calm', vol: 0.3, rev: 0.6 },
      { kind: 'drums', style: 'industrial', layer: 'calm', vol: 0.3, hat: ['x..x..x.x..x..x.'] },
      { kind: 'guitar', low: 35, notes: [0, 1, 3, 5, 7, 8, 10, 12], riff: ['x.x.x.xxx.x.x.B-', 'x.x.x.xx1-1-x.x.'], layer: 'combat', vol: 0.6 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.5, grit: 0.8 },
      { kind: 'synthbass', octave: 1, pat: ['xxxxxxxxxxxxxxxx'], layer: 'combat', vol: 0.3, cut: 420, grit: 0.5 },
      { kind: 'drums', style: 'industrial', layer: 'combat', vol: 0.9,
        kick: ['x...x...x...x..x'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x...x.x.xxxx'],
        hat: ['xxxxxxxxxxxxxxxx'], cym: ['c...............', '................', '................', '................'] },
      { kind: 'perc', sound: 'anvil', midi: 70, pat: ['..x.......x.....'], layer: 'combat', vol: 0.35, pan: -0.3 },
      { kind: 'lead', sound: 'saw', octave: 4, layer: 'combat', vol: 0.5, glide: true, from: 8, rev: 0.3,
        melody: '0:2 1:2 0:2 7:2 6:4 4:4 | 5:4 4:4 1:8 | 0:2 1:2 0:2 7:2 8:4 7:4 | 6:8 4:8 | 7:2 8:2 7:2 4:2 5:4 4:4 | 3:4 1:4 0:8 | 1:4 3:4 4:4 5:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ VIII. Binding: symphonic gothic metal
  binding: {
    title: 'The Last Stitch', genre: 'Symphonic gothic metal', bpm: 150, key: 38, scale: 'harmonic', bars: 16,
    chords: [0, 5, 3, 4, 0, 5, 1, 4, 5, 3, 6, 4, 0, 3, 4, 4],
    reverb: { seconds: 3.6, damp: 0.55, mix: 0.45 },
    parts: [
      { kind: 'pad', sound: 'strings', octave: 3, layer: 'both', vol: 0.4, rev: 0.45 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'both', vol: 0.35, rev: 0.55 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0.1.2.1.0.1.2.1.'], layer: 'calm', vol: 0.35 },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'calm', vol: 0.3, rev: 0.6, melody: '7:8 6:8 | 5:8 4:8 | 5:8 3:8 | 4:16' },
      { kind: 'guitar', low: 38, riff: ['0000000000000000', 'X---X---0000X---'], layer: 'combat', vol: 0.6 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.5, grit: 0.55 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.9,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', 'x.x.x.x.x.x.xxxx'],
        cym: ['c...c...c...c...', 'r...r...r...r...', 'c...c...c...c...', 'r...r...c.c.c.c.'] },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.3 },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.5, from: 8, pan: 0.3,
        melody: '7:4 6:2 5:2 4:4 5:4 | 6:8 4:8 | 5:4 4:2 3:2 2:4 3:4 | 4:16 | 7:4 9:4 10:4 9:4 | 8:4 7:4 6:8 | 5:4 6:4 7:4 8:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ The Attic: shoegaze / darkwave
  attic: {
    title: 'Dust Sheets', genre: 'Shoegaze darkwave', bpm: 88, key: 40, scale: 'aeolian', bars: 16,
    chords: [0, 5, 3, 6, 0, 5, 2, 6, 3, 4, 0, 5, 3, 4, 6, 6],
    reverb: { seconds: 4, damp: 0.6, mix: 0.55 },
    parts: [
      { kind: 'pad', sound: 'warm', octave: 3, layer: 'both', vol: 0.45, rev: 0.5 },
      { kind: 'arp', sound: 'clean', octave: 3, rate: 2, seq: [0, 2, 4, 3, 2, 4], layer: 'both', vol: 0.42, echo: true, pan: -0.25, rev: 0.4 },
      { kind: 'pad', sound: 'glass', octave: 4, layer: 'calm', vol: 0.3, rev: 0.7 },
      { kind: 'synthbass', octave: 1, pat: ['x---------------'], layer: 'calm', vol: 0.45, cut: 240, grit: 0 },
      { kind: 'synthbass', octave: 1, pat: ['x.......x...x...'], layer: 'combat', vol: 0.55, cut: 420, grit: 0.25 },
      { kind: 'guitar', low: 40, riff: ['X-------X-------'], voicing: 'oct', gain: 0.7, layer: 'combat', vol: 0.4 },
      { kind: 'drums', style: 'synth', layer: 'combat', vol: 0.8,
        kick: ['x.......x.x.....'], snare: ['........x.......'], hat: ['x.x.x.x.x.x.x.x.'], cym: ['c...............', '................', '................', '................'] },
      { kind: 'lead', sound: 'saw', octave: 4, layer: 'combat', vol: 0.4, glide: true, rev: 0.45, from: 4,
        melody: '4:8 3:4 2:4 | 0:12 r:4 | 2:4 3:4 4:8 | 6:12 r:4 | 7:8 6:4 4:4 | 5:12 4:4 | 3:4 4:4 6:4 4:4 | 4:16' },
    ],
  },
  // ------------------------------------------------------------------ The Greenhouse: witch house
  greenhouse: {
    title: 'Something Blooming', genre: 'Witch house', bpm: 70, key: 37, scale: 'phrygian', bars: 8,
    chords: [0, 0, 1, 0, 5, 5, 6, 1],
    reverb: { seconds: 4.4, damp: 0.6, mix: 0.6 },
    parts: [
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'both', vol: 0.45, rev: 0.7 },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'both', vol: 0.4, rev: 0.7,
        melody: '0:4 r:2 1:2 0:4 r:4 | 3:4 r:4 1:8 | 0:4 r:2 1:2 0:4 7:4 | 6:12 r:4' },
      { kind: 'pad', sound: 'warm', octave: 2, layer: 'calm', vol: 0.4, rev: 0.4 },
      { kind: 'synthbass', octave: 0, pat: ['x-------x--x----', 'x-------x---x---'], layer: 'combat', vol: 0.8, cut: 180, grit: 0.15 },
      { kind: 'drums', style: 'synth', layer: 'combat', vol: 0.85,
        kick: ['x.......x..x....', 'x.......x...x...'], snare: ['........x.......'], hat: ['x.x.x.x.x.xxx.x.', 'x.x.x.x.xxxxx.x.'] },
      { kind: 'pad', sound: 'supersaw', octave: 3, layer: 'combat', vol: 0.25, rev: 0.5, cut: 1600 },
    ],
  },
  // ------------------------------------------------------------------ The Print Shop: EBM / industrial techno
  printshop: {
    title: 'Ink on Iron', genre: 'EBM / industrial techno', bpm: 128, key: 45, scale: 'phrygian', bars: 16,
    chords: [0, 0, 0, 1, 0, 0, 5, 6, 0, 0, 0, 1, 3, 1, 0, 0],
    reverb: { seconds: 1.6, damp: 0.4, mix: 0.25 },
    parts: [
      { kind: 'synthbass', octave: 1, pat: ['x.x.x.x.x.x.x.x.'], layer: 'calm', vol: 0.45, cut: 260, grit: 0.2 },
      { kind: 'drums', style: 'industrial', layer: 'calm', vol: 0.35, hat: ['..x...x...x...x.'] },
      { kind: 'perc', sound: 'pipe', midi: 67, pat: ['x...............', '........x.......'], layer: 'calm', vol: 0.3, rev: 0.4 },
      { kind: 'synthbass', octave: 1, pat: ['xxoxxxoxxxoxxxox'], layer: 'combat', vol: 0.6, cut: 620, grit: 0.55 },
      { kind: 'drums', style: 'industrial', layer: 'combat', vol: 0.95,
        kick: ['x...x...x...x...'], snare: ['....x.......x...'], hat: ['..x...x...x...x.', '..x...x...x.x.x.'], cym: ['c...............', '................', '................', '................'] },
      { kind: 'perc', sound: 'anvil', midi: 77, pat: ['......x.......x.'], layer: 'combat', vol: 0.35, pan: 0.3 },
      { kind: 'lead', sound: 'square', octave: 4, layer: 'combat', vol: 0.4, from: 4, rev: 0.2,
        melody: '0:2 r:2 0:2 1:2 0:4 r:4 | 3:2 r:2 1:4 0:8 | 0:2 r:2 0:2 1:2 3:4 4:4 | 3:8 1:8' },
    ],
  },
  // ------------------------------------------------------------------ The Clocktower: baroque metal
  clocktower: {
    title: 'Counting Down', genre: 'Baroque metal', bpm: 140, key: 38, scale: 'harmonic', bars: 16,
    chords: [0, 3, 4, 0, 5, 3, 4, 4, 0, 3, 6, 0, 5, 1, 4, 4],
    reverb: { seconds: 2.8, damp: 0.5, mix: 0.4 },
    parts: [
      { kind: 'arp', sound: 'harp', octave: 4, rate: 1, seq: [0, 1, 2, 3, 2, 1, 2, 1], layer: 'both', vol: 0.32, pan: 0.2, rev: 0.25 },
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'both', vol: 0.35, rev: 0.4 },
      { kind: 'stacc', sound: 'strings', octave: 3, pat: ['0.0.2.0.1.0.2.0.'], layer: 'calm', vol: 0.35 },
      { kind: 'guitar', low: 38, riff: ['0.0.0.0.0.0.0.0.', 'X---0.0.X---0.0.'], layer: 'combat', vol: 0.58 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.5, grit: 0.5 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.9,
        kick: ['xxxxxxxxxxxxxxxx', 'x.x.x.x.x.x.x.x.'], snare: ['....x.......x...'], cym: ['c...r...r...r...', 'r...r...r...r...', 'r...r...r...r...', 'r...r...c.c.c.c.'] },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.45, from: 8, pan: -0.3,
        melody: '7:2 6:2 7:2 4:2 5:2 4:2 3:2 2:2 | 3:4 4:4 6:8 | 7:2 6:2 7:2 9:2 8:2 7:2 6:2 5:2 | 4:16 | 3:2 4:2 5:2 6:2 7:4 4:4 | 5:4 3:4 1:8 | 2:4 3:4 4:4 6:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ bosses
  boss: {
    title: 'Teeth in the Dark', genre: 'Darksynth / industrial', bpm: 140, key: 40, scale: 'phrygian', bars: 16, only: 'combat',
    chords: [0, 0, 1, 0, 0, 0, 5, 6, 3, 3, 1, 1, 0, 1, 0, 6],
    reverb: { seconds: 2, damp: 0.45, mix: 0.3 },
    parts: [
      { kind: 'pad', sound: 'supersaw', octave: 3, layer: 'combat', vol: 0.25, cut: 2000 },
      { kind: 'synthbass', octave: 1, pat: ['xxoxxxoxxxoxxxoo'], layer: 'combat', vol: 0.5, cut: 500, grit: 0.5 },
      { kind: 'guitar', low: 40, notes: [0, 1, 3, 5, 7, 8, 10, 12], riff: ['x.x.x.x.X---x.x.', 'x.xx.x.x1-1-X---'], layer: 'combat', vol: 0.6 },
      { kind: 'drums', style: 'industrial', layer: 'combat', vol: 0.95,
        kick: ['x...x...x...x...'], snare: ['....x.......x...', '....x.......x...', '....x.......x...', '....x...x.xxxxxx'],
        hat: ['x.x.x.x.x.x.x.x.', 'x.o.x.o.x.o.x.o.'], cym: ['c...............', '................', '................', '................', '................', '................', '................', '................'] },
      { kind: 'perc', sound: 'anvil', midi: 74, pat: ['....x.......x...'], layer: 'combat', vol: 0.35 },
      { kind: 'lead', sound: 'saw', octave: 4, layer: 'combat', vol: 0.5, glide: true,
        melody: '7:4 8:2 7:2 4:4 5:4 | 4:4 3:2 1:2 0:8 | 7:4 8:2 7:2 9:4 10:4 | 9:8 8:8 | 11:4 10:2 9:2 8:4 7:4 | 8:4 7:4 5:8 | 4:4 5:4 7:4 8:4 | 7:16' },
    ],
  },
  boss2: {
    title: 'Splinter', genre: 'Djent', bpm: 150, key: 35, scale: 'phrygian', bars: 16, only: 'combat',
    chords: [0, 0, 0, 1, 0, 0, 6, 5, 0, 0, 0, 1, 3, 4, 5, 6],
    reverb: { seconds: 2.6, damp: 0.5, mix: 0.35 },
    parts: [
      { kind: 'pad', sound: 'glass', octave: 4, layer: 'combat', vol: 0.25, rev: 0.6 },
      { kind: 'guitar', low: 35, notes: [0, 1, 3, 5, 7, 8, 10, 12], cycle: 'x.xx.x..x.xB--x.x..xx.C-.', layer: 'combat', vol: 0.66 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.6, grit: 0.7 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95, kickFollows: true,
        snare: ['....x.......x...'], cym: ['c.h.h.h.h.h.h.h.', 'h.h.h.h.h.h.h.h.', 'h.h.h.h.h.h.h.h.', 'h.h.h.h.c.c.c.c.'] },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.5, from: 8, pan: 0.3,
        melody: '0:4 1:4 3:4 4:4 | 5:8 4:8 | 3:4 4:4 5:4 7:4 | 8:16 | 7:4 8:4 10:4 8:4 | 7:8 5:8 | 4:4 3:4 1:4 0:4 | 1:16' },
    ],
  },
  bossFinal: {
    title: 'Unbound', genre: 'Symphonic gothic metal', bpm: 164, key: 38, scale: 'harmonic', bars: 16, only: 'combat',
    chords: [0, 0, 5, 4, 0, 0, 1, 4, 3, 3, 5, 6, 0, 5, 4, 4],
    reverb: { seconds: 3.4, damp: 0.55, mix: 0.4 },
    parts: [
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'combat', vol: 0.45, rev: 0.6 },
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'combat', vol: 0.3, rev: 0.4 },
      { kind: 'stacc', sound: 'strings', octave: 4, pat: ['0101210101210121'], layer: 'combat', vol: 0.32 },
      { kind: 'guitar', low: 38, riff: ['0000000000000000', 'X---X---X---0000'], layer: 'combat', vol: 0.6 },
      { kind: 'bass', octave: 1, followGuitar: true, layer: 'combat', vol: 0.5, grit: 0.6 },
      { kind: 'drums', style: 'metal', layer: 'combat', vol: 0.95,
        kick: ['xxxxxxxxxxxxxxxx'], snare: ['....x.......x...', 'x.x.x.x.x.x.x.x.', '....x.......x...', 'x.x.x.x.x.xxxxxx'],
        cym: ['c...c...c...c...'] },
      { kind: 'lead', sound: 'organ', octave: 5, layer: 'combat', vol: 0.35, rev: 0.3,
        melody: '7:4 6:4 7:4 4:4 | 5:4 4:4 3:4 2:4 | 3:4 4:4 5:4 3:4 | 6:16 | 7:4 9:4 10:4 9:4 | 8:4 7:4 5:4 4:4 | 3:4 4:4 5:4 6:4 | 7:16' },
      { kind: 'lead', sound: 'guitar', octave: 4, layer: 'combat', vol: 0.45, pan: -0.3, from: 4,
        melody: '7:4 6:4 7:4 4:4 | 5:4 4:4 3:4 2:4 | 3:4 4:4 5:4 3:4 | 6:16 | 7:4 9:4 10:4 9:4 | 8:4 7:4 5:4 4:4 | 3:4 4:4 5:4 6:4 | 7:16' },
    ],
  },
  // ------------------------------------------------------------------ death / ending
  death: {
    title: 'Ink Dries', genre: 'Requiem', bpm: 58, key: 50, scale: 'aeolian', bars: 8, only: 'calm',
    chords: [0, 5, 3, 4, 0, 5, 3, 0],
    reverb: { seconds: 4.5, damp: 0.65, mix: 0.6 },
    parts: [
      { kind: 'pad', sound: 'strings', octave: 3, layer: 'calm', vol: 0.45, rev: 0.6 },
      { kind: 'arp', sound: 'harp', octave: 3, rate: 4, seq: [0, 1, 2, 1], layer: 'calm', vol: 0.4, rev: 0.5 },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'calm', vol: 0.35, rev: 0.7, melody: '4:8 3:8 | 2:8 1:8 | 0:16 | r:16' },
    ],
  },
  ending: {
    title: 'Rebound', genre: 'Hymn', bpm: 72, key: 50, scale: 'ionian', bars: 8, only: 'calm',
    chords: [0, 4, 5, 3, 0, 4, 3, 4],
    reverb: { seconds: 4.5, damp: 0.6, mix: 0.55 },
    parts: [
      { kind: 'pad', sound: 'organ', octave: 3, layer: 'calm', vol: 0.4, rev: 0.4 },
      { kind: 'pad', sound: 'choir', octave: 4, layer: 'calm', vol: 0.35, rev: 0.6 },
      { kind: 'pad', sound: 'strings', octave: 3, layer: 'calm', vol: 0.35, rev: 0.5 },
      { kind: 'arp', sound: 'harp', octave: 4, rate: 2, seq: [0, 1, 2, 3, 2, 1, 2, 4], layer: 'calm', vol: 0.35 },
      { kind: 'lead', sound: 'bell', octave: 5, layer: 'calm', vol: 0.4, rev: 0.6,
        melody: '4:8 5:4 4:4 | 4:8 2:8 | 5:8 4:4 2:4 | 3:16 | 4:8 5:4 7:4 | 8:8 7:8 | 5:4 4:4 3:4 1:4 | 0:16' },
    ],
  },
};
