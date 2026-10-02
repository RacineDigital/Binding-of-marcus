// The chapter soundtrack: one theme per chapter (alternates, hidden routes and Home included),
// played from note data (chapterdata.ts, packed from MIDI) through the same instruments as the rest
// of the score. Every theme has a calm stem for exploring and a full-band combat stem.
import { CHAPTER_TRACKS, ChapterTrack, ChapterRole, UNIT } from './chapterdata';
import type { Song } from './score';

export interface ChapterNote { beat: number; len: number; midi: number; vel: number }

const decoded = new Map<string, ChapterNote[]>();
/** Unpack one part's notes (cached). */
export function chapterNotes(t: ChapterTrack, role: ChapterRole): ChapterNote[] {
  const key = t.id + ':' + role;
  let out = decoded.get(key);
  if (out) return out;
  out = [];
  const b64 = t.parts[role];
  if (b64) {
    const bin = atob(b64), n = bin.length;
    let i = 0, at = 0;
    const varint = () => { let v = 0, s = 0, b: number; do { b = bin.charCodeAt(i++); v |= (b & 0x7f) << s; s += 7; } while (b & 0x80); return v; };
    while (i < n) {
      at += varint(); const len = varint();
      out.push({ beat: at / UNIT, len: len / UNIT, midi: bin.charCodeAt(i++), vel: bin.charCodeAt(i++) });
    }
  }
  decoded.set(key, out);
  return out;
}

/** Music key for a chapter's theme. */
export const chapterMusic = (id: string) => 'ch_' + id;

export const CHAPTER_SONGS: Record<string, Song> = Object.fromEntries(CHAPTER_TRACKS.map((t) => {
  const drums = !!t.parts.drums;
  const song: Song = {
    title: t.title, genre: 'Chapter theme', bpm: t.bpm, key: 0, scale: 'aeolian', bars: 0, chords: [0],
    real: drums, reverb: { seconds: drums ? 2.2 : 3.4, damp: 0.55, mix: drums ? 0.3 : 0.45 },
    parts: [], chapter: t, only: drums ? undefined : 'calm',
  };
  return [chapterMusic(t.id), song];
}));
export const CHAPTER_IDS = CHAPTER_TRACKS.map((t) => t.id);
