// The notes: scraps found lying around down there. Voicemails, texts and notes from Grandad, the
// family and the hospital, and at the very end one from Marcus. Picked up one at a time across many
// runs; kept in the save and readable from the Journal. Read in order, they tell what happened that
// night, and point the way to the paths that are hidden.
export interface NoteDef {
  id: string; title: string; text: string;
  /** Who it is from, if not Grandad. */
  by?: string;
  /** Only turns up once this achievement is unlocked. */
  req?: string;
  /** Only turns up in these chapters (theme ids, or 'hospital' for the hospital path). */
  where?: string[];
}

export const NOTES: NoteDef[] = [
  // ---- anywhere, from the first run
  { id: 'n_book', title: 'Voicemail, March',
    text: 'Marcus, it\'s Grandad. The boiler at the house is making that noise again. Come round Saturday and I\'ll show you how to bleed it. Bring the good biscuits. Not the ones your mum buys.' },
  { id: 'n_binding', title: 'Voicemail, April',
    text: 'It\'s me again. Cellar\'s a state. Some things you just have to shut a lid on until they stop rattling. Not you, mind. You I\'d like to see. Saturday?' },
  { id: 'n_grub', title: 'The Foundations',
    text: 'The surveyor says the house is damp right down to the foundations. I say something\'s been eating them for years. Same as me, really. Don\'t tell your mother I said that.' },
  { id: 'n_wardrobe', title: 'The Wardrobe',
    text: 'Found the old wardrobe in the cellar. You were six and you swore blind there was a man living in it. There was. Me, with the Christmas presents. Thought you\'d want the truth, finally.' },
  { id: 'n_ink', title: 'Black Water', by: 'Marcus',
    text: 'The water was so cold it did not feel like water. It felt like being shut in somewhere. Then it felt like nothing. Then I was in the cellar.' },
  { id: 'n_mott', title: 'Mott',
    text: 'Mott at the corner shop takes buttons now instead of money. I don\'t ask. He has been very patient about my tab, and his coat has never looked so full.' },
  { id: 'n_rose', title: 'Ada\'s Rose',
    text: 'Ada\'s rose has grown right through the greenhouse roof. I can\'t bring myself to cut it back. Edda says I water it like I\'m apologising to it.' },
  { id: 'n_press', title: 'The Night Shift',
    text: 'Forty-one years in the boiler rooms under St. Agnes. Nights, mostly. You would not believe what you hear through the pipes of a hospital at four in the morning.' },
  { id: 'n_moth', title: 'The Big Moth',
    text: 'The moths are in the lampshade again. One of them is very large and sits on the edge of the bench to watch me work. I have decided it is on my side.' },
  { id: 'n_clock', title: 'Four Minutes Past Four',
    text: 'The clock on the bridge stopped at four minutes past four, the morning Ada went. The council offered to fix it. I asked them not to.' },
  { id: 'n_wren', title: 'A Drawing',
    text: 'Wren sent another drawing: a slingshot, a moth, and me, enormous, wearing a crown. It\'s pinned above the workbench. Nobody has ever drawn me a crown before.' },
  { id: 'n_fear', title: 'Real',
    text: 'Marcus asked me once if the things in the cellar were real. I said they are exactly as real as being frightened is. He thought about it and said, "That\'s very real, then." He was nine. He was right.' },
  { id: 'n_cough', title: 'Bellows',
    text: 'Forty-one years breathing boiler dust. The doctor listened to my chest for a long time and then went very quiet. I told him I already knew. Bellows don\'t last for ever.' },
  { id: 'n_edda', title: 'Name Tape',
    text: 'Edda came round to mend my good coat for the hospital, and sewed my name into the collar so they wouldn\'t lose me. I told her I\'m not a school jumper. She did it anyway.' },
  // ---- once the Deep End has been reached
  { id: 'n_stair', title: 'The Back Stair', req: 'beat_final',
    text: 'There is a service stair behind the second boiler that comes up right under the ward. Boarded since \'96. If anyone wanted to get to Room 4 without walking past all those beds, that\'s the way. Make a loud noise. It\'ll give.' },
  { id: 'n_lastpage', title: 'Eleven Calls', by: 'Nell',
    req: 'beat_final',
    text: 'Marcus pick up. / Pick up. / Hes asking for you. / Marcus please. / They said tonight. / Please just come. / I\'m not angry I promise just come. / (8 more, unread)' },
  { id: 'n_blot', title: 'Incident Report', by: 'Police', req: 'beat_final',
    text: 'Harrow Lane bridge, 04:04. Vehicle through the railings into the river, one occupant, male, 17. Pulled out by a passing van driver at 04:19, not breathing, resuscitated on the bank. Taken to St. Agnes.' },
  // ---- the hospital (only found on the back stair's path)
  { id: 'n_room4', title: 'Room 4', where: ['hospital'],
    text: 'They\'ve put me in Room 4, at the far end of the ward. Nell comes every day after college and reads me the paper upside down to make me laugh. It works every time.' },
  { id: 'n_visiting', title: 'Visiting Hours', where: ['hospital'],
    text: 'Marcus hasn\'t come. Nell says he\'s busy. He\'s frightened of these corridors, I reckon. I don\'t blame him one bit. I\'m frightened of them too, and I live here now.' },
  { id: 'n_letter', title: 'Two Halves', where: ['hospital'],
    text: 'Wrote the boy a letter, for when he comes. Tore it in two like cinema tickets, because I\'m an old fool and he likes a puzzle. Half is with the lost property desk. The other half is somewhere only a brave lad would dig. With both, Room 4 will let him in.' },
  { id: 'n_night', title: 'The Night Nurse', where: ['hospital'],
    text: 'The night nurse walks the ward like a clock. She stops outside my door and listens to me breathe. I do not think she is a nurse.' },
  // ---- after the endings
  { id: 'n_margins', title: 'The Last Message', by: 'Nell', req: 'beat_unwritten',
    text: 'There is one voicemail on Marcus\'s phone that nobody has played. It came in at ten past two that night, from Grandad\'s mobile. I can\'t bring myself to listen to it. It\'s his.' },
  { id: 'n_dedication', title: 'The Watch', req: 'beat_author',
    text: 'The watch goes to Marcus. He will pretend he doesn\'t want it. He will want it. It stopped at four minutes past four, same as the bridge. Tell him it starts again if you wind it.' },
  { id: 'n_came', title: 'He Came', req: 'beat_patient',
    text: 'He came. In the end, through all of it, soaking wet, with both halves of my letter in his fist. I could not have asked for better.' },
  { id: 'n_last', title: 'Saturdays', by: 'Marcus', req: 'the_end',
    text: 'Grandad\'s watch started again the day I woke up. Nell says that is not how watches work. I go and see him on Saturdays now. I bring the good biscuits.' },
];
export const NOTE_BY_ID = Object.fromEntries(NOTES.map((n) => [n.id, n])) as Record<string, NoteDef>;
export const HOSPITAL_THEMES = ['waiting', 'nightward', 'icu'];

/** Notes that can turn up in a chapter, given what has been unlocked. */
export function notesFor(themeId: string, isUnlocked: (id: string) => boolean): NoteDef[] {
  const here = HOSPITAL_THEMES.includes(themeId) ? 'hospital' : themeId;
  return NOTES.filter((n) => (!n.req || isUnlocked(n.req)) && (!n.where || n.where.includes(here)));
}
