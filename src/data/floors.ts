// Floor themes: visuals, ambience, enemy & boss pools, difficulty.
export type FloorStyle = 'flag' | 'brick' | 'cobble' | 'tile' | 'earth' | 'checker' | 'void' | 'pages' | 'planks';
export type WallStyle = 'stone' | 'iron' | 'sewer' | 'ward' | 'cave' | 'chapel' | 'torn' | 'spines';
export type Ambience = 'dust' | 'embers' | 'drips' | 'motes' | 'ash' | 'glass' | 'ink' | 'pages';

export interface FloorTheme {
  id: string; name: string; subtitle: string; chapter: string;
  floor: FloorStyle; wall: WallStyle; ambience: Ambience;
  pal: {
    floor: string; floor2: string; grout: string; wall: string; wall2: string; mortar: string;
    rock: string; accent: string; stain: string; heap: string; heapKind: 'paper' | 'coal' | 'refuse' | 'linen' | 'bone' | 'wax' | 'ink' | 'pages';
  };
  ambient: string; darkness: number; playerLight: number;
  enemies: Record<string, number>; // enemy id -> weight
  bosses: string[];
  music: string;
  hazards: { spikes: number; pits: number; fires: number; kegs: number; webs?: number };
  fireVariants: number[]; // allowed fire variants
  hpMul: number; budget: number; // legacy per-theme scaling (difficulty now comes from depth)
  /** How tough this chapter's cast is by design (0 = Cellar ... 7 = Binding). */
  tier?: number;
}

export const FLOORS: FloorTheme[] = [
  {
    id: 'cellar', name: 'The Cellar', subtitle: 'Where the damp keeps its secrets', chapter: 'Chapter I',
    floor: 'flag', wall: 'stone', ambience: 'dust',
    pal: { floor: '#48403a', floor2: '#3a332f', grout: '#1c1616', wall: '#4d4448', wall2: '#3a3238', mortar: '#1c1618',
      rock: '#6d625c', accent: '#b0894f', stain: '#2e3a2a', heap: '#d8ccb0', heapKind: 'paper' },
    ambient: '#0a0610', darkness: 0.5, playerLight: 100,
    enemies: { mite: 10, moth: 7, ragcrawler: 9, gasper: 7, dripling: 6, pillbug: 5, mitenest: 3, spool: 4, candlewick: 2 },
    bosses: ['grubmother', 'wardrobe', 'twinsnips'],
    music: 'cellar', hazards: { spikes: 0.15, pits: 0.3, fires: 0.45, kegs: 0.15 }, fireVariants: [0, 0, 0, 2],
    hpMul: 1, budget: 0.9,
  },
  {
    id: 'boiler', name: 'The Boiler Rooms', subtitle: 'The house still breathes down here', chapter: 'Chapter II',
    floor: 'brick', wall: 'iron', ambience: 'embers',
    pal: { floor: '#4a3431', floor2: '#3b2a29', grout: '#1d1414', wall: '#4a4546', wall2: '#35302f', mortar: '#171213',
      rock: '#5e5552', accent: '#d9772c', stain: '#1a1614', heap: '#2d2a2c', heapKind: 'coal' },
    ambient: '#140604', darkness: 0.36, playerLight: 90,
    enemies: { sootsprite: 8, valvehead: 6, stoker: 7, cinderhopper: 6, pipeworm: 4, mite: 4, gasper: 4, moth: 3 },
    bosses: ['furnaceheart', 'oldstoker', 'grubmother'],
    music: 'boiler', hazards: { spikes: 0.25, pits: 0.2, fires: 0.6, kegs: 0.35 }, fireVariants: [0, 0, 1, 2],
    hpMul: 1.15, budget: 1.1,
  },
  {
    id: 'underworks', name: 'The Underworks', subtitle: 'Everything drains down eventually', chapter: 'Chapter III',
    floor: 'cobble', wall: 'sewer', ambience: 'drips',
    pal: { floor: '#394540', floor2: '#2e3834', grout: '#151c1a', wall: '#3d4a44', wall2: '#2c3632', mortar: '#111715',
      rock: '#56625b', accent: '#7fae5a', stain: '#40562a', heap: '#5a5238', heapKind: 'refuse' },
    ambient: '#020a08', darkness: 0.4, playerLight: 88,
    enemies: { rat: 8, leech: 6, bloater: 5, grateeye: 5, sludge: 6, drowner: 5, pillbug: 3, dripling: 4, stoker: 2 },
    bosses: ['ratking', 'bilgemaw', 'furnaceheart'],
    music: 'underworks', hazards: { spikes: 0.2, pits: 0.45, fires: 0.25, kegs: 0.2 }, fireVariants: [0, 2, 2, 1],
    hpMul: 1.3, budget: 1.3,
  },
  {
    id: 'ward', name: 'The Forgotten Ward', subtitle: 'Nobody came to visit', chapter: 'Chapter IV',
    floor: 'tile', wall: 'ward', ambience: 'motes',
    pal: { floor: '#7d8a80', floor2: '#6b776e', grout: '#3a403c', wall: '#4f6a60', wall2: '#3a5048', mortar: '#1e2826',
      rock: '#8a8a82', accent: '#c2d4b0', stain: '#5a3a30', heap: '#d6d2c4', heapKind: 'linen' },
    ambient: '#040a0c', darkness: 0.44, playerLight: 86,
    enemies: { orderly: 6, wheelwraith: 5, nursedoll: 6, sheetghost: 7, mimic: 3, dripsentinel: 5, leech: 3, bloater: 3, moth: 3 },
    bosses: ['matron', 'sleepwalker', 'ratking'],
    music: 'ward', hazards: { spikes: 0.3, pits: 0.3, fires: 0.25, kegs: 0.15 }, fireVariants: [1, 1, 0, 2],
    hpMul: 1.5, budget: 1.5,
  },
  {
    id: 'depths', name: 'The Depths', subtitle: 'Older than the house above', chapter: 'Chapter V',
    floor: 'earth', wall: 'cave', ambience: 'ash',
    pal: { floor: '#3e3230', floor2: '#322826', grout: '#181010', wall: '#3c302e', wall2: '#2a2120', mortar: '#120b0b',
      rock: '#5a4a44', accent: '#c2a27a', stain: '#4a1e1e', heap: '#d9cdb8', heapKind: 'bone' },
    ambient: '#0c0304', darkness: 0.5, playerLight: 84,
    enemies: { skullorbit: 5, gravedigger: 5, ossspider: 7, marrowmaw: 3, cinderhopper: 3, sheetghost: 3, sludge: 3 },
    bosses: ['ossuaryknight', 'mothmother', 'sleepwalker'],
    music: 'depths', hazards: { spikes: 0.4, pits: 0.45, fires: 0.35, kegs: 0.2, webs: 0.3 }, fireVariants: [0, 1, 1, 3],
    hpMul: 1.7, budget: 1.7,
  },
  {
    id: 'chapel', name: 'The Chapel', subtitle: 'Wax remembers every prayer', chapter: 'Chapter VI',
    floor: 'checker', wall: 'chapel', ambience: 'glass',
    pal: { floor: '#6e6258', floor2: '#3c3438', grout: '#231d20', wall: '#5a4c4a', wall2: '#433836', mortar: '#1c1516',
      rock: '#8a7c70', accent: '#e8c46a', stain: '#6a4a2a', heap: '#efe4c2', heapKind: 'wax' },
    ambient: '#0a0508', darkness: 0.46, playerLight: 86,
    enemies: { choirboy: 6, candlewick: 6, censer: 5, penitent: 5, cherubmoth: 6, orderly: 3, nursedoll: 2 },
    bosses: ['bellringer', 'choirmaster', 'matron'],
    music: 'chapel', hazards: { spikes: 0.3, pits: 0.35, fires: 0.55, kegs: 0.15 }, fireVariants: [0, 1, 1, 3],
    hpMul: 1.9, budget: 1.9,
  },
  {
    id: 'hollow', name: 'The Hollow', subtitle: 'The page tears here', chapter: 'Chapter VII',
    floor: 'void', wall: 'torn', ambience: 'ink',
    pal: { floor: '#1e1a2e', floor2: '#171426', grout: '#0a0812', wall: '#2e2848', wall2: '#221d38', mortar: '#0c0a16',
      rock: '#3e3858', accent: '#8a7cff', stain: '#0e0c1c', heap: '#26234a', heapKind: 'ink' },
    ambient: '#030208', darkness: 0.56, playerLight: 82,
    enemies: { blot: 6, voideye: 5, pagewraith: 6, mirrorshade: 3, hollowmaw: 3, cherubmoth: 3, skullorbit: 3, penitent: 3, wheelwraith: 3 },
    bosses: ['blottedman', 'choirmaster', 'mothmother'],
    music: 'hollow', hazards: { spikes: 0.35, pits: 0.5, fires: 0.3, kegs: 0.2 }, fireVariants: [1, 3, 3, 2],
    hpMul: 2.1, budget: 2.1,
  },
  {
    id: 'binding', name: 'The Binding', subtitle: 'The last page is still blank', chapter: 'Final Chapter',
    floor: 'pages', wall: 'spines', ambience: 'pages',
    pal: { floor: '#b8a47e', floor2: '#a08c68', grout: '#4a3a28', wall: '#5a2e2a', wall2: '#40201e', mortar: '#1c0e0c',
      rock: '#7a6a58', accent: '#e8d8a0', stain: '#2b2f66', heap: '#e6dcc0', heapKind: 'pages' },
    ambient: '#08040a', darkness: 0.42, playerLight: 86,
    enemies: { blot: 4, pagewraith: 5, voideye: 4, choirboy: 3, penitent: 3, mirrorshade: 3, orderly: 3, stoker: 3, skullorbit: 3 },
    bosses: ['unbound', 'bookbinder'],
    music: 'binding', hazards: { spikes: 0.3, pits: 0.35, fires: 0.3, kegs: 0.2 }, fireVariants: [0, 1, 3],
    hpMul: 2.3, budget: 2.3,
  },
];
export const FINAL_FLOOR = 7;
FLOORS.forEach((f, i) => { f.tier = i; });

/** Alternate takes on chapters I–VII. A floor is sometimes replaced by its variant (seeded). */
type ThemeOverride = Partial<Omit<FloorTheme, 'pal' | 'hazards'>> & { pal?: Partial<FloorTheme['pal']>; hazards?: Partial<FloorTheme['hazards']> };
function variant(base: FloorTheme, o: ThemeOverride): FloorTheme {
  return { ...base, ...o, pal: { ...base.pal, ...(o.pal ?? {}) }, hazards: { ...base.hazards, ...(o.hazards ?? {}) } } as FloorTheme;
}
export const ALT_FLOORS: Record<string, FloorTheme> = {
  cellar: variant(FLOORS[0], { id: 'rootcellar', name: 'The Root Cellar', subtitle: 'Something grew down here while nobody looked',
    floor: 'earth', wall: 'cave', pal: { floor: '#4a3e30', floor2: '#3a3026', wall: '#4a3c2e', wall2: '#362c22', rock: '#6a5a44', stain: '#3a4a22', heap: '#c8b490' },
    enemies: { mite: 8, moth: 8, ragcrawler: 8, gasper: 6, dripling: 6, pillbug: 7, mitenest: 4, rat: 5 } }),
  boiler: variant(FLOORS[1], { id: 'coalchute', name: 'The Coal Chute', subtitle: 'Black dust in every breath',
    floor: 'earth', ambience: 'ash', pal: { floor: '#2e2a2a', floor2: '#242020', rock: '#3a3436', stain: '#120e0e' }, darkness: 0.46,
    enemies: { sootsprite: 9, valvehead: 5, stoker: 8, cinderhopper: 7, pipeworm: 5, mite: 4 } }),
  underworks: variant(FLOORS[2], { id: 'flooded', name: 'The Flooded Drains', subtitle: 'The water is rising, slowly',
    pal: { floor: '#2e3e44', floor2: '#26343a', wall: '#34464a', stain: '#2a4a5a', rock: '#4a5a60' }, ambience: 'drips',
    enemies: { leech: 9, drowner: 8, sludge: 6, bloater: 5, grateeye: 5, rat: 5 } }),
  ward: variant(FLOORS[3], { id: 'morgue', name: 'The Morgue', subtitle: 'Cold drawers, cold hands',
    pal: { floor: '#6e7c86', floor2: '#5c6872', wall: '#4a5a6a', wall2: '#3a4856', stain: '#3a4a5a', heap: '#c8d0d8' }, darkness: 0.5,
    enemies: { orderly: 7, sheetghost: 8, wheelwraith: 4, mimic: 4, dripsentinel: 5, nursedoll: 4 } }),
  depths: variant(FLOORS[4], { id: 'catacombs', name: 'The Catacombs', subtitle: 'Shelves of the patient dead',
    floor: 'flag', wall: 'stone', pal: { floor: '#5a5048', floor2: '#4a423c', wall: '#4e4640', wall2: '#3a342e', rock: '#6e6458' },
    enemies: { skullorbit: 6, ossspider: 6, gravedigger: 5, marrowmaw: 3, sheetghost: 3 } }),
  chapel: variant(FLOORS[5], { id: 'belfry', name: 'The Belfry', subtitle: 'Every bell still remembers its last toll',
    floor: 'brick', wall: 'chapel', pal: { floor: '#5a4232', floor2: '#4a3628', grout: '#1e1410', heap: '#efe4c2' }, ambience: 'dust',
    enemies: { choirboy: 5, censer: 6, penitent: 5, cherubmoth: 7, sootsprite: 3 } }),
  hollow: variant(FLOORS[6], { id: 'inkwell', name: 'The Inkwell', subtitle: 'Deep enough to drown a story',
    pal: { floor: '#141a2e', floor2: '#10142a', wall: '#1e2846', wall2: '#161e38', accent: '#4a8aff' },
    enemies: { blot: 8, voideye: 5, pagewraith: 5, hollowmaw: 4, mirrorshade: 3, drowner: 3 } }),
};

// ---------------------------------------------------------------------------- new chapters
export const NEW_FLOORS: FloorTheme[] = [
  {
    id: 'attic', name: 'The Attic', subtitle: 'Dust sheets over everything nobody wanted', chapter: '', tier: 1,
    floor: 'planks', wall: 'stone', ambience: 'dust',
    pal: { floor: '#5a4632', floor2: '#4a3a2a', grout: '#1e140e', wall: '#4a3c34', wall2: '#382c26', mortar: '#1a120e',
      rock: '#7a6a5a', accent: '#d8b070', stain: '#3a3020', heap: '#e0d8c4', heapKind: 'linen' },
    ambient: '#0a0608', darkness: 0.46, playerLight: 96,
    enemies: { moth: 9, mite: 7, sheetghost: 6, nursedoll: 4, spool: 5, mimic: 3, ragcrawler: 5, candlewick: 3 },
    bosses: ['wardrobe', 'mothmother', 'sleepwalker'],
    music: 'attic', hazards: { spikes: 0.15, pits: 0.2, fires: 0.3, kegs: 0.1, webs: 0.25 }, fireVariants: [0, 0, 2],
    hpMul: 1.15, budget: 1.1,
  },
  {
    id: 'greenhouse', name: 'The Greenhouse', subtitle: 'Glass, rot and something blooming', chapter: '', tier: 2,
    floor: 'earth', wall: 'cave', ambience: 'motes',
    pal: { floor: '#34402a', floor2: '#2a3422', grout: '#121a0e', wall: '#3a4a3a', wall2: '#2a3a2c', mortar: '#101a12',
      rock: '#5a6a4a', accent: '#a8d070', stain: '#4a6a2a', heap: '#8a7a4a', heapKind: 'refuse' },
    ambient: '#040a04', darkness: 0.4, playerLight: 92,
    enemies: { leech: 6, bloater: 5, cinderhopper: 6, dripling: 6, pillbug: 6, gasper: 5, sludge: 4, mitenest: 3 },
    bosses: ['thornwife', 'grubmother', 'bilgemaw'],
    music: 'greenhouse', hazards: { spikes: 0.25, pits: 0.35, fires: 0.2, kegs: 0.1, webs: 0.2 }, fireVariants: [2, 2, 0],
    hpMul: 1.3, budget: 1.3,
  },
  {
    id: 'printshop', name: 'The Print Shop', subtitle: 'Iron type, inky rollers, no one at the press', chapter: '', tier: 3,
    floor: 'brick', wall: 'iron', ambience: 'pages',
    pal: { floor: '#3a3438', floor2: '#2e2a2e', grout: '#121014', wall: '#3e3a40', wall2: '#2c282e', mortar: '#100e12',
      rock: '#5a5660', accent: '#c83a3a', stain: '#1a1a2e', heap: '#e6dcc0', heapKind: 'pages' },
    ambient: '#060408', darkness: 0.42, playerLight: 88,
    enemies: { valvehead: 5, pagewraith: 5, blot: 5, stoker: 5, spool: 6, sootsprite: 4, blotlet: 3 },
    bosses: ['typesetter', 'blottedman', 'oldstoker'],
    music: 'printshop', hazards: { spikes: 0.3, pits: 0.2, fires: 0.4, kegs: 0.35 }, fireVariants: [0, 1, 3],
    hpMul: 1.5, budget: 1.5,
  },
  {
    id: 'cistern', name: 'The Frozen Cistern', subtitle: 'Ice where the water used to be', chapter: '', tier: 3,
    floor: 'cobble', wall: 'sewer', ambience: 'glass',
    pal: { floor: '#4a5e6a', floor2: '#3c4e5a', grout: '#1a2630', wall: '#3e5260', wall2: '#2e3e4a', mortar: '#121c24',
      rock: '#7a8e9a', accent: '#a8e0ff', stain: '#6a8aa0', heap: '#c8d8e0', heapKind: 'refuse' },
    ambient: '#020610', darkness: 0.44, playerLight: 90,
    enemies: { drowner: 6, sludge: 5, grateeye: 5, voideye: 3, mirrorshade: 3, leech: 6, rat: 5, sheetghost: 3 },
    bosses: ['rimebride', 'bilgemaw', 'ratking'],
    music: 'underworks', hazards: { spikes: 0.3, pits: 0.4, fires: 0.15, kegs: 0.15 }, fireVariants: [1, 1, 3],
    hpMul: 1.5, budget: 1.5,
  },
  {
    id: 'clocktower', name: 'The Clocktower', subtitle: 'Every gear is counting down', chapter: '', tier: 4,
    floor: 'tile', wall: 'iron', ambience: 'motes',
    pal: { floor: '#5a4a34', floor2: '#4a3c2a', grout: '#1c1408', wall: '#4a3e30', wall2: '#362c22', mortar: '#140e08',
      rock: '#8a7a5a', accent: '#e0b050', stain: '#3a2a10', heap: '#b8904a', heapKind: 'coal' },
    ambient: '#080604', darkness: 0.44, playerLight: 88,
    enemies: { valvehead: 6, wheelwraith: 5, skullorbit: 5, choirboy: 4, censer: 4, spool: 5, cherubmoth: 3 },
    bosses: ['pendulum', 'bellringer', 'sleepwalker'],
    music: 'clocktower', hazards: { spikes: 0.35, pits: 0.4, fires: 0.3, kegs: 0.2 }, fireVariants: [0, 1, 1],
    hpMul: 1.7, budget: 1.7,
  },
  {
    id: 'stacks', name: 'The Library Stacks', subtitle: 'Shelves taller than the dark', chapter: '', tier: 5,
    floor: 'tile', wall: 'spines', ambience: 'pages',
    pal: { floor: '#4a2e2a', floor2: '#3a2422', grout: '#160c0a', wall: '#4a2a26', wall2: '#361e1c', mortar: '#140a08',
      rock: '#7a5a4a', accent: '#e8c070', stain: '#2a1a3a', heap: '#e6dcc0', heapKind: 'pages' },
    ambient: '#080406', darkness: 0.48, playerLight: 86,
    enemies: { pagewraith: 6, blot: 5, moth: 5, mimic: 4, penitent: 4, spool: 4, mirrorshade: 3, cherubmoth: 4 },
    bosses: ['blottedman', 'mothmother', 'choirmaster'],
    music: 'chapel', hazards: { spikes: 0.3, pits: 0.35, fires: 0.4, kegs: 0.15, webs: 0.2 }, fireVariants: [0, 1, 3],
    hpMul: 1.9, budget: 1.9,
  },
];
for (const [k, v] of Object.entries(ALT_FLOORS)) v.tier = FLOORS.find((f) => f.id === k)?.tier ?? 0;

/** Every theme a non-final chapter can use. */
// ---------------------------------------------------------------------------- beyond the Binding
/**
 * The Margins: reached through the portal that opens after the Binding (once the story has been
 * finished before). A huge chapter of the hardest creatures with several boss rooms; only one of
 * them leads on, to the Last Page.
 */
export const MARGINS_THEME: FloorTheme = {
  id: 'margins', name: 'The Margins', subtitle: 'Where the notes nobody was meant to read are kept', chapter: 'Epilogue', tier: 7,
  floor: 'pages', wall: 'torn', ambience: 'ink',
  pal: { floor: '#c8bea6', floor2: '#b4a98e', grout: '#4a3e30', wall: '#2a2238', wall2: '#1e182a', mortar: '#0c0812',
    rock: '#5e5668', accent: '#c83a4a', stain: '#2b2f66', heap: '#e6dcc0', heapKind: 'pages' },
  ambient: '#06040c', darkness: 0.48, playerLight: 92,
  enemies: { pagewraith: 6, voideye: 5, mirrorshade: 5, blot: 4, hollowmaw: 3, penitent: 4, orderly: 3, censer: 3, ossspider: 4, marrowmaw: 3,
    skullorbit: 3, wheelwraith: 3, sheetghost: 3, stoker: 3, drowner: 3, gravedigger: 3 },
  bosses: ['grubmother', 'wardrobe', 'furnaceheart', 'oldstoker', 'ratking', 'bilgemaw', 'matron', 'sleepwalker', 'ossuaryknight',
    'mothmother', 'bellringer', 'choirmaster', 'blottedman', 'thornwife', 'rimebride', 'pendulum', 'typesetter', 'ironlung'],
  music: 'binding', hazards: { spikes: 0.35, pits: 0.4, fires: 0.35, kegs: 0.25, webs: 0.15 }, fireVariants: [1, 3, 3],
  hpMul: 2.5, budget: 2.5,
};
/** The Last Page: one huge, empty page and what is writing itself onto it. */
export const LASTPAGE_THEME: FloorTheme = {
  ...MARGINS_THEME, id: 'lastpage', name: 'The Last Page', subtitle: 'It has been waiting for you to arrive', chapter: 'The End',
  floor: 'pages', wall: 'torn', ambience: 'pages',
  pal: { ...MARGINS_THEME.pal, floor: '#e6dcc4', floor2: '#ddd2b8', grout: '#a89878', wall: '#14101c', wall2: '#0c0a12', stain: '#14163a' },
  darkness: 0.3, enemies: { blot: 1 }, bosses: ['unwritten'], music: 'binding', hazards: { spikes: 0, pits: 0, fires: 0, kegs: 0 },
};
/**
 * The light path (the beam after the Binding): the Dedication, a bright twin of the Margins, then
 * the Foreword, where the Author waits.
 */
export const DEDICATION_THEME: FloorTheme = {
  ...MARGINS_THEME, id: 'dedication', name: 'The Dedication', subtitle: '"For my grandson, who was always braver than me"', chapter: 'Epilogue',
  floor: 'tile', wall: 'chapel', ambience: 'motes',
  pal: { floor: '#e8e0cc', floor2: '#d8ccb0', grout: '#a8987a', wall: '#c8bca4', wall2: '#a8987e', mortar: '#5a4a38',
    rock: '#b8ac94', accent: '#ffd870', stain: '#c8b47a', heap: '#fff4dc', heapKind: 'wax' },
  ambient: '#100c06', darkness: 0.22, playerLight: 110,
  enemies: { cherubmoth: 6, choirboy: 5, censer: 5, penitent: 5, sheetghost: 4, wheelwraith: 3, skullorbit: 3, mirrorshade: 3, pagewraith: 3, orderly: 3, ossspider: 3, candlewick: 3 },
  bosses: ['bellringer', 'choirmaster', 'matron', 'rimebride', 'pendulum', 'thornwife', 'sleepwalker', 'ossuaryknight', 'mothmother', 'wardrobe', 'furnaceheart', 'typesetter', 'grubmother', 'ironlung'],
  music: 'chapel',
};
export const FOREWORD_THEME: FloorTheme = {
  ...DEDICATION_THEME, id: 'foreword', name: 'The Foreword', subtitle: 'Before the story, there was the one who wrote it', chapter: 'The Beginning',
  floor: 'pages', pal: { ...DEDICATION_THEME.pal, floor: '#f4ecd8', floor2: '#ece2c8', grout: '#c8b890' },
  darkness: 0.15, enemies: { cherubmoth: 1 }, bosses: ['author'], hazards: { spikes: 0, pits: 0, fires: 0, kegs: 0 },
};
// ---------------------------------------------------------------------------- the back stair
/**
 * St. Agnes: the hospital Grandfather never came home from. Reached by the boarded back stair in
 * the Chapter II boss room (once the story has been finished); it replaces Chapters III to V. With
 * both halves of his letter, the door to Room 4 opens after Intensive Care.
 */
export const HOSPITAL_FLOORS: FloorTheme[] = [
  {
    id: 'waiting', name: 'The Waiting Room', subtitle: 'Visiting hours are nine till eight', chapter: '', tier: 2,
    floor: 'tile', wall: 'ward', ambience: 'motes',
    pal: { floor: '#8a9a88', floor2: '#7a8a78', grout: '#3a4440', wall: '#6a8278', wall2: '#506a60', mortar: '#202a28',
      rock: '#9a9a8e', accent: '#e8e0a0', stain: '#6a5a3a', heap: '#d8d4c4', heapKind: 'linen' },
    ambient: '#06080a', darkness: 0.38, playerLight: 92,
    enemies: { orderly: 6, nursedoll: 6, sheetghost: 5, wheelwraith: 4, mimic: 3, dripsentinel: 4, moth: 4, spool: 3 },
    bosses: ['matron', 'pendulum', 'sleepwalker'],
    music: 'ward', hazards: { spikes: 0.2, pits: 0.2, fires: 0.2, kegs: 0.1 }, fireVariants: [1, 1, 0],
    hpMul: 1.3, budget: 1.3,
  },
  {
    id: 'nightward', name: 'The Night Ward', subtitle: 'The lights hum, and nobody comes', chapter: '', tier: 3,
    floor: 'tile', wall: 'ward', ambience: 'dust',
    pal: { floor: '#4a5a5a', floor2: '#3e4c4c', grout: '#1a2222', wall: '#34484a', wall2: '#263638', mortar: '#101818',
      rock: '#6a7a78', accent: '#a0d8c8', stain: '#3a2a3a', heap: '#b8c0c0', heapKind: 'linen' },
    ambient: '#020608', darkness: 0.6, playerLight: 84,
    enemies: { sheetghost: 7, orderly: 5, wheelwraith: 5, nursedoll: 5, dripsentinel: 5, mirrorshade: 3, leech: 3, moth: 3 },
    bosses: ['sleepwalker', 'matron', 'mothmother'],
    music: 'ward', hazards: { spikes: 0.3, pits: 0.3, fires: 0.2, kegs: 0.1 }, fireVariants: [1, 1, 3],
    hpMul: 1.5, budget: 1.5,
  },
  {
    id: 'icu', name: 'Intensive Care', subtitle: 'The machines breathe for him now', chapter: '', tier: 4,
    floor: 'tile', wall: 'iron', ambience: 'glass',
    pal: { floor: '#9aa8b0', floor2: '#8a98a2', grout: '#4a5660', wall: '#5a6a78', wall2: '#44525e', mortar: '#1c2228',
      rock: '#a8b0b8', accent: '#60ff90', stain: '#3a5a6a', heap: '#dce4ea', heapKind: 'linen' },
    ambient: '#04060a', darkness: 0.42, playerLight: 88,
    enemies: { dripsentinel: 6, orderly: 5, wheelwraith: 5, valvehead: 4, nursedoll: 4, sheetghost: 4, voideye: 3, bloater: 3 },
    bosses: ['ironlung', 'matron'],
    music: 'ward', hazards: { spikes: 0.3, pits: 0.25, fires: 0.15, kegs: 0.2 }, fireVariants: [1, 1, 3],
    hpMul: 1.7, budget: 1.7,
  },
];
/** Room 4: the room at the end of the ward. What is in the bed is what Marcus was afraid of. */
export const ROOM4_THEME: FloorTheme = {
  ...HOSPITAL_FLOORS[1], id: 'room4', name: 'Room 4', subtitle: 'At the very end of the ward, by the window', chapter: 'Visiting Hours', tier: 7,
  pal: { ...HOSPITAL_FLOORS[1].pal, floor: '#5e6a68', floor2: '#56625f', wall: '#2c3c40', wall2: '#203034' },
  darkness: 0.5, enemies: { nursedoll: 1 }, bosses: ['patient'], hazards: { spikes: 0, pits: 0, fires: 0, kegs: 0 },
};
/** Home: the cellar in the morning. Nothing down here any more but the book. */
export const HOME_THEME: FloorTheme = {
  id: 'home', name: 'Home', subtitle: 'It is morning, and it is real', chapter: 'Afterword', tier: 0,
  floor: 'planks', wall: 'stone', ambience: 'motes',
  pal: { floor: '#8a6a48', floor2: '#7a5c3e', grout: '#3a2a1a', wall: '#8a7a68', wall2: '#6e604e', mortar: '#3a3024',
    rock: '#a89880', accent: '#ffe0a0', stain: '#6a5a40', heap: '#efe4c8', heapKind: 'pages' },
  ambient: '#1a140c', darkness: 0.08, playerLight: 130,
  enemies: { moth: 1 }, bosses: [], music: 'ending', hazards: { spikes: 0, pits: 0, fires: 0, kegs: 0 }, fireVariants: [0],
  hpMul: 1, budget: 1,
};
/** Where the hospital path sits: its first chapter, Room 4 after its last, and Home after that. */
export const HOSPITAL_FIRST = 2, ROOM4_FLOOR = HOSPITAL_FIRST + HOSPITAL_FLOORS.length, HOME_FLOOR = ROOM4_FLOOR + 1;

/** Chapter indices beyond the Binding when a run goes through the portal. */
export const MARGINS_FLOOR = FINAL_FLOOR + 1, LASTPAGE_FLOOR = FINAL_FLOOR + 2;

export const CHAPTER_POOL: FloorTheme[] = [...FLOORS.slice(0, FINAL_FLOOR), ...Object.values(ALT_FLOORS), ...NEW_FLOORS];
const FAMILY: Record<string, string> = { rootcellar: 'cellar', coalchute: 'boiler', flooded: 'underworks', morgue: 'ward', catacombs: 'depths', belfry: 'chapel', inkwell: 'hollow' };
export const familyOf = (t: FloorTheme): string => FAMILY[t.id] ?? t.id;

/** Difficulty comes from how deep you are, not which chapter you are in. */
// regular enemies toughen gently so late chapters don't turn into long, flat fights; bosses keep the
// steeper curve, so each one is still the wall at the end of its chapter
export const DEPTH_HP = [1, 1.12, 1.25, 1.38, 1.5, 1.62, 1.75, 1.9];
const BOSS_DEPTH_HP = [1, 1.15, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3];
export const DEPTH_BUDGET = [0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3];
const BOSS_TIER_HP = [240, 290, 300, 320, 380, 380, 400, 900];
export function enemyHpMul(depth: number, tier: number, boss: boolean): number {
  const d = Math.min(DEPTH_HP.length - 1, depth), t = Math.min(7, tier);
  const loop = 1 + 0.3 * Math.max(0, depth - FINAL_FLOOR); // endless: every chapter past the Binding is tougher
  if (boss) return loop * BOSS_DEPTH_HP[d] * Math.min(1.25, Math.max(0.6, BOSS_TIER_HP[d] / BOSS_TIER_HP[t]));
  return loop * DEPTH_HP[d] * Math.min(1.5, Math.max(0.65, (1 + 0.12 * d) / (1 + 0.12 * t)));
}
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function roman(n: number): string {
  let out = '';
  for (const [v, r] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as [number, string][]) while (n >= v) { out += r; n -= v; }
  return out;
}
export function chapterLabel(depth: number): string { return depth === FINAL_FLOOR ? 'Final Chapter' : `Chapter ${roman(depth + 1)}`; }
