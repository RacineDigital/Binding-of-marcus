// Grandfather's notes: scraps of paper left lying in the book, in his handwriting (and, at the very
// end, in someone else's). Picked up one at a time across many runs; kept in the save and readable
// from the Journal. Read in order, they tell the story the chapters only hint at, and point the way
// to the paths that are hidden.
export interface NoteDef {
  id: string; title: string; text: string;
  /** Who wrote it, if not Grandfather. */
  by?: string;
  /** Only turns up once this achievement is unlocked. */
  req?: string;
  /** Only turns up in these chapters (theme ids, or 'hospital' for the hospital path). */
  where?: string[];
}

export const NOTES: NoteDef[] = [
  // ---- the house (anywhere, from the first run)
  { id: 'n_book', title: 'A Book for Marcus',
    text: 'Marcus is afraid of the cellar. Good: a little fear keeps a boy careful. Not too much, though. I have started a book for him, where he goes all the way down and comes back up again.' },
  { id: 'n_binding', title: 'On Binding',
    text: 'Some stories are too frightening to leave loose. You fold them, you sew them, you press them flat under the weight of everything else. That is all binding is: holding a thing still until it stops kicking.' },
  { id: 'n_grub', title: 'The Foundations',
    text: 'Something is eating the foundations. The surveyor says damp. I say she has a name and a great many children. She can go in Chapter One, where she belongs.' },
  { id: 'n_wardrobe', title: 'The Wardrobe',
    text: 'Ada hid the Christmas presents in the big wardrobe, and Marcus was certain there was a man in it. I have given the man a chapter of his own. Perhaps now he will stop living in the wardrobe.' },
  { id: 'n_ink', title: 'Ink',
    text: 'Ink is only water that remembers. Spill it, and it keeps the shape of whatever it touched.' },
  { id: 'n_mott', title: 'Mott',
    text: 'Mott at the corner shop takes buttons now instead of money. I don\'t ask. He has been very patient about my tab, and his coat has never looked so full.' },
  { id: 'n_rose', title: 'Ada\'s Rose',
    text: 'Ada\'s rose has grown right through the greenhouse roof. I cannot bring myself to cut it back. Edda says I water it like I am apologising to it.' },
  { id: 'n_press', title: 'The Press',
    text: 'The old press still works if you swear at it. Every page of Marcus\'s book will be set by hand, letter by letter. It is slow. I am slower.' },
  { id: 'n_moth', title: 'The Big Moth',
    text: 'The moths are in the lampshade again. One of them is very large and sits on the edge of the bench to watch me work. I have decided it is on my side.' },
  { id: 'n_clock', title: 'Four Minutes Past Four',
    text: 'The tower clock stopped at four minutes past four, the morning Ada went. I have put it in the book that way. Four is a good number. Four walls. Four corners to a page.' },
  { id: 'n_wren', title: 'A Drawing',
    text: 'Wren sent another drawing: a slingshot, a moth, and me, enormous, wearing a crown. It is pinned above the press. Nobody has ever drawn me a crown before.' },
  { id: 'n_fear', title: 'Real',
    text: 'Marcus asked me if the monsters in the book are real. I said they are exactly as real as being frightened is. He thought about it and said, "That\'s very real, then." He is right.' },
  { id: 'n_cough', title: 'Bellows',
    text: 'Forty years of glue, ink and paper dust. The doctor listened to my chest for a long time and then went very quiet. I told him I already knew. Bellows don\'t last for ever.' },
  { id: 'n_edda', title: 'Name Tape',
    text: 'Edda came round to mend my good coat for the hospital, and sewed my name into the collar so they wouldn\'t lose me. I told her I am not a school jumper. She did it anyway.' },
  // ---- once the story has been finished
  { id: 'n_stair', title: 'The Back Stair', req: 'beat_final',
    text: 'There is a back stair behind the second boiler that goes all the way up to St. Agnes. I have written it into the book, boarded over. He will have to make a loud noise to get through. He is good at loud noises.' },
  { id: 'n_lastpage', title: 'The Last Page', req: 'beat_final',
    text: 'I have not written the last page. Every time I try, my hand shakes and the ink runs. Perhaps the ending is not mine to write.' },
  { id: 'n_blot', title: 'The Spill', req: 'beat_final',
    text: 'Knocked the whole bottle over Chapter Seven tonight. I sat and watched the stain spread. I am almost certain it was watching me back.' },
  // ---- the hospital (only found on the back stair's path)
  { id: 'n_room4', title: 'Room 4', where: ['hospital'],
    text: 'They have put me in Room 4, at the far end of the ward. Nell comes every day after school and reads me the paper upside down to make me laugh. It works every time.' },
  { id: 'n_visiting', title: 'Visiting Hours', where: ['hospital'],
    text: 'Marcus hasn\'t come. Nell says he is frightened of the corridors. I don\'t blame him one bit. I am frightened of them too, and I live here now.' },
  { id: 'n_letter', title: 'Two Halves', where: ['hospital'],
    text: 'I have written him a letter and torn it in two, like tickets at the pictures. One half is with the lost property. The other is hidden somewhere deep, where only a brave boy would dig. With both, the door to Room 4 will open.' },
  { id: 'n_night', title: 'The Night Nurse', where: ['hospital'],
    text: 'The night nurse walks the ward like a clock. She stops outside my door and listens to me breathe. I do not think she is a nurse.' },
  // ---- after the endings
  { id: 'n_margins', title: 'Notes in the Margin', req: 'beat_unwritten',
    text: 'I write notes to myself in the margins: things I meant to say to the boy and didn\'t. If anything reads this book after me, it will find them there. And it will be hungry.' },
  { id: 'n_dedication', title: 'Who It Is For', req: 'beat_author',
    text: '"For my grandson, who was always braver than me." I wrote that first, before anything else. You have to know who a book is for before you can finish it.' },
  { id: 'n_came', title: 'He Came', req: 'beat_patient',
    text: 'He came. He came in the end, through all of it, with his hood up and both halves of my letter in his fist. I could not have written it better if I had tried.' },
  { id: 'n_last', title: 'The Last Entry', by: 'Marcus', req: 'the_end',
    text: 'Grandad\'s book is finished. I wrote the last page myself. It is on the shelf in the cellar with the others, and the cellar door stays shut now. Not because of anything inside. I just don\'t need to go down there any more.' },
];
export const NOTE_BY_ID = Object.fromEntries(NOTES.map((n) => [n.id, n])) as Record<string, NoteDef>;
export const HOSPITAL_THEMES = ['waiting', 'nightward', 'icu'];

/** Notes that can turn up in a chapter, given what has been unlocked. */
export function notesFor(themeId: string, isUnlocked: (id: string) => boolean): NoteDef[] {
  const here = HOSPITAL_THEMES.includes(themeId) ? 'hospital' : themeId;
  return NOTES.filter((n) => (!n.req || isUnlocked(n.req)) && (!n.where || n.where.includes(here)));
}
