// Song description format for the offline music renderer.
//
// Time is counted in 16th-note steps. A song loops every `bars` bars. Patterns are strings with one
// character per 16th; an array of patterns cycles bar by bar (pattern[bar % length]). A `cycle`
// pattern ignores bar lines and cycles over the whole song (used for polymetric djent riffs).

export const SCALES = {
  aeolian: [0, 2, 3, 5, 7, 8, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10], locrian: [0, 1, 3, 5, 6, 8, 10], ionian: [0, 2, 4, 5, 7, 9, 11],
  phrygdom: [0, 1, 4, 5, 7, 8, 10],
} as const;
export type ScaleName = keyof typeof SCALES;

/** Which stem a part plays in: calm (exploring), combat (fighting) or both. */
export type Layer = 'calm' | 'combat' | 'both';

interface PartBase { layer: Layer; vol: number; pan?: number; rev?: number; from?: number; to?: number }

/**
 * Drum kit. Characters: kick 'x'; snare 'x' hit, 'g' ghost; hats 'x' closed, 'o' open, 'r' ride;
 * cymbals 'c' crash, 'h' china; toms '1' high, '2' mid, '3' floor.
 * `kickFollows` makes the kick double every guitar chug (djent / metal).
 */
export interface DrumPart extends PartBase {
  kind: 'drums'; style: 'metal' | 'synth' | 'industrial' | 'rock';
  kick?: string[]; snare?: string[]; hat?: string[]; cym?: string[]; toms?: string[];
  kickFollows?: boolean;
}
/**
 * Distorted rhythm guitar, double tracked L/R. Characters:
 *  'x' palm-muted chug on the low pedal note (key root, `low` octave)
 *  'X' open power chord on the current chord root
 *  '0'-'9' muted chug on chord root + notes[digit]
 *  'A'-'J' open power chord on chord root + notes[letter index]
 *  '-' let the previous note ring, '.' rest (choke)
 */
export interface GuitarPart extends PartBase {
  kind: 'guitar'; low: number; riff?: string[]; cycle?: string; notes?: number[]; voicing?: 'power' | 'oct' | 'fifth' | 'single';
  gain?: number;
}
/** Bass: 'x' chord root, 'o' octave up, '5' fifth, 'k' key root, '-' hold, '.' rest. `followGuitar` copies the guitar rhythm. */
export interface BassPart extends PartBase {
  kind: 'bass' | 'synthbass'; octave: number; pat?: string[]; followGuitar?: boolean; grit?: number; cut?: number;
}
/** Arpeggio over the current chord: indices into chord tones (0 root, 1 third, 2 fifth, 3 octave...). */
export interface ArpPart extends PartBase {
  kind: 'arp'; sound: 'pluck' | 'saw' | 'bell' | 'clean' | 'harp' | 'chip'; octave: number; rate: 1 | 2 | 4; seq: number[]; len?: number; cut?: number; echo?: boolean;
}
/** Sustained chord per bar (repeated chords are merged). */
export interface PadPart extends PartBase {
  kind: 'pad'; sound: 'supersaw' | 'strings' | 'organ' | 'choir' | 'warm' | 'glass'; octave: number; seventh?: boolean; cut?: number;
}
/** Melody from tokens "deg:len" (scale degree relative to key root at `octave`), "r:len" rests; '+'/'-' suffix = sharp/flat. */
export interface LeadPart extends PartBase {
  kind: 'lead'; sound: 'saw' | 'square' | 'guitar' | 'choir' | 'bell' | 'strings' | 'organ' | 'clean' | 'chip'; octave: number; melody: string; glide?: boolean;
}
/** Short string stabs / ostinato: chars are chord-tone indices, '.' rest. */
export interface StaccPart extends PartBase {
  kind: 'stacc'; sound: 'strings' | 'pluck' | 'organ'; octave: number; pat: string[];
}
/** Pitched percussion: 'x' hit. */
export interface PercPart extends PartBase {
  kind: 'perc'; sound: 'anvil' | 'pipe' | 'sheet' | 'riser'; midi: number; pat: string[];
}
export type Part = DrumPart | GuitarPart | BassPart | ArpPart | PadPart | LeadPart | StaccPart | PercPart;

export interface Song {
  title: string; genre: string;
  bpm: number; key: number; scale: ScaleName; bars: number;
  /** Optional tempo map: bpm for each bar (cycles), so a song can rush, drag and rush again. */
  tempo?: number[];
  /** Chord root as scale degree per bar (cycles). */
  chords: number[];
  swing?: number;
  reverb: { seconds: number; damp: number; mix: number };
  parts: Part[];
  /** Calm-only or combat-only tracks. */
  only?: 'calm' | 'combat';
}
