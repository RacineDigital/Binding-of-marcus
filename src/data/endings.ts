// The endings. Each path through the book ends in its own way; together they tell what really
// happened in the house on Harrow Lane. Seen endings are kept in the save and listed in the Journal.
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
  { id: 'morning', num: 1, name: 'Morning', lines: ENDING_STORY, key: 2,
    clue: 'Finish the story.' },
  { id: 'own_hand', num: 2, name: 'In His Own Hand', lines: TRUE_ENDING_STORY, key: 2,
    clue: 'Once the book has closed, it can be torn open again.' },
  { id: 'for_marcus', num: 3, name: 'For Marcus', lines: LIGHT_ENDING_STORY, key: 2,
    clue: 'The light only reaches down for someone who has been to the Last Page twice.' },
  { id: 'the_visit', num: 4, name: 'The Visit', key: 2,
    lines: [
      'The thing in the bed was not a monster.',
      'It was Grandad: small, and tired, with the paper upside down on his lap.',
      '"There you are," he said. "I saved you the good chair."',
      'Marcus sat in it, and held his hand, and stayed until the nurse dimmed the lights.',
    ],
    clue: 'There is a back stair in the boiler rooms. Grandfather wrote that he was waiting at the top of it.' },
  { id: 'goodnight', num: 5, name: 'Goodnight', key: 3,
    lines: [
      'Marcus carried the book up the cellar stairs and into the kitchen.',
      'Nell had made toast. Mum was on the phone. The radio was on.',
      'He sat at the table and wrote the very last line himself:',
      '"Goodnight, Grandad."',
      'Then he closed the book, and it stayed closed, because it was finished.',
    ],
    clue: 'See every other ending. Then visit him one more time.' },
];
export const ENDING_BY_ID = Object.fromEntries(ENDINGS.map((e) => [e.id, e])) as Record<EndingId, EndingDef>;

/** One line per reader, added after whichever ending they reach. */
export const EPILOGUES: Record<string, string> = {
  marcus: 'Marcus kept the book. He did not open it again for a long time, and then one day he did, just to visit.',
  wren: 'Wren pinned her slingshot above the press, next to the drawing of Grandad with the crown.',
  edda: 'Edda sewed the spine back up with red thread, so it would never come loose again.',
  elias: 'Elias set down the awl. For the first time since the hospital, he rested.',
  blot: 'The Blot curled up on the last page and dried there: a full stop at the end of everything.',
  ozzie: 'Ozzie rolled the die one last time, and put it away without looking at how it landed.',
  nell: 'Nell had visited every single day. She never told Marcus. She never needed to.',
  bram: 'Bram walked home the long way, past Harrow Lane, just to make sure the cellar door was shut.',
  ada: 'Ada\'s rose came back through the greenhouse roof that spring. Nobody ever cut it again.',
  wick: 'Wick flew to the lamp in the window and stayed there, keeping it lit for whoever came next.',
};

/** Which ending a finished run reached. */
export function endingFor(run: Run): EndingId {
  const f = run.flags;
  if (f.home) return 'goodnight';
  if (f.room4) return 'the_visit';
  if (f.margins && run.floorIndex > FINAL_FLOOR) return f.light ? 'for_marcus' : 'own_hand';
  return 'morning';
}
