// The endings. Each way through gives Marcus a different way to face that night.
// Seen endings are kept in the save and listed in the Journal.
import { ENDING_STORY, TRUE_ENDING_STORY, LIGHT_ENDING_STORY } from './lore';
import type { Run } from '../game/run';
import { FINAL_FLOOR } from './floors';

export type EndingId = 'morning' | 'own_hand' | 'for_marcus' | 'the_visit' | 'goodnight';
export interface EndingDef {
  id: EndingId; num: number; name: string; lines: string[];
  /** Shown on the endings page before it has been seen: a nudge, never the full recipe. */
  clue: string;
  /** Which line is set large, as the heart of the ending. */
  key: number;
}

export const ENDINGS: EndingDef[] = [
  { id: 'morning', num: 1, name: 'Not Yet', lines: ENDING_STORY, key: 2,
    clue: 'Reach the Deep End and beat what is waiting there.' },
  { id: 'own_hand', num: 2, name: 'The Voicemail', lines: TRUE_ENDING_STORY, key: 1,
    clue: 'After the Deep End, the signal breaks up. Go into the static.' },
  { id: 'for_marcus', num: 3, name: 'First Light', lines: LIGHT_ENDING_STORY, key: 2,
    clue: 'The light only reaches down for someone who has already been into the static twice.' },
  { id: 'the_visit', num: 4, name: 'Room 4', key: 1,
    lines: [
      'The shape in the bed was not a monster. It was Grandad: small, and tired, with the paper upside down on his lap so it would make Nell laugh.',
      '"There you are," he said. "I saved you the good chair."',
      'They talked about nothing for a long time. Then he squeezed Marcus\'s hand and said, "Go on. Your sister\'s been sat up there all week."',
      'Marcus stayed until the nurse dimmed the lights. Then he went.',
    ],
    clue: 'There is a boarded back stair in the boiler rooms. Grandad is at the top of it, in Room 4.' },
  { id: 'goodnight', num: 5, name: 'Wake Up', key: 3,
    lines: [
      'The first thing was the beeping. The second was a hand, holding his so tight it hurt.',
      'Nell was asleep in the chair, still in her coat. She woke when he squeezed back.',
      'In the spring, on a Saturday, he went to the cemetery with the good biscuits and his grandfather\'s watch on his wrist. It had started again.',
      '"Sorry I\'m late," Marcus said. "I came."',
    ],
    clue: 'See every other ending. Then go back to Room 4, one more time.' },
];
export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<EndingId, EndingDef>;

/** One line per character, added after whichever ending they reach. */
export const EPILOGUES: Record<string, string> = {
  marcus: 'Marcus kept Grandad\'s watch. He still checks it at four minutes past four, every time, and then he lets it go.',
  wren: 'Wren drew one more picture for the hospital wall: Marcus, enormous, wearing Grandad\'s crown.',
  edda: 'Edda sewed Marcus\'s name into his hospital gown, so they would not lose him either.',
  elias: 'Down there, the old boiler man finally let the fire go out, and sat down for a cup of tea.',
  blot: 'The black shape from the river curled up and dried out on the bank, like a stain that finally lifts.',
  ozzie: 'Ozzie rolled his die one last time, then put it away without looking at how it landed.',
  nell: 'Nell had been there every day. She never blamed Marcus for staying away, and she never needed to say so.',
  bram: 'Bram walked past the bridge every morning on the way to school, and every morning he touched the new railing.',
  ada: 'Ada\'s rose came back through the greenhouse roof that spring. Nobody cut it again.',
  wick: 'Wick flew to the lamp in the hospital window and stayed there, keeping it lit for whoever came next.',
};

/** Which ending a finished run reached. */
export function endingFor(run: Run): EndingId {
  const f = run.flags;
  if (f.home) return 'goodnight';
  if (f.room4) return 'the_visit';
  if (f.margins && run.floorIndex > FINAL_FLOOR) return f.light ? 'for_marcus' : 'own_hand';
  return 'morning';
}
