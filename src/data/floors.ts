// Floor themes: visuals, ambience, enemy & boss pools, difficulty.
export type FloorStyle = 'flag' | 'brick' | 'cobble' | 'tile' | 'earth' | 'checker' | 'void' | 'pages';
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
  hpMul: number; budget: number; // difficulty scaling
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
    enemies: { sootsprite: 8, valvehead: 6, stoker: 7, rustcrab: 5, cinderhopper: 6, pipeworm: 4, mite: 4, gasper: 4, moth: 3 },
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
    enemies: { boneknight: 5, skullorbit: 5, gravedigger: 5, ossspider: 7, marrowmaw: 3, cinderhopper: 3, sheetghost: 3, sludge: 3, rustcrab: 3 },
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
    enemies: { choirboy: 6, candlewick: 6, censer: 5, penitent: 5, cherubmoth: 6, boneknight: 3, orderly: 3, nursedoll: 2 },
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
    enemies: { blot: 4, pagewraith: 5, voideye: 4, boneknight: 3, choirboy: 3, penitent: 3, mirrorshade: 3, orderly: 3, stoker: 3, skullorbit: 3 },
    bosses: ['unbound'],
    music: 'binding', hazards: { spikes: 0.3, pits: 0.35, fires: 0.3, kegs: 0.2 }, fireVariants: [0, 1, 3],
    hpMul: 2.3, budget: 2.3,
  },
];
export const FINAL_FLOOR = FLOORS.length - 1;

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
    enemies: { sootsprite: 9, valvehead: 5, stoker: 8, cinderhopper: 7, pipeworm: 5, rustcrab: 4, mite: 4 } }),
  underworks: variant(FLOORS[2], { id: 'flooded', name: 'The Flooded Drains', subtitle: 'The water is rising, slowly',
    pal: { floor: '#2e3e44', floor2: '#26343a', wall: '#34464a', stain: '#2a4a5a', rock: '#4a5a60' }, ambience: 'drips',
    enemies: { leech: 9, drowner: 8, sludge: 6, bloater: 5, grateeye: 5, rat: 5 } }),
  ward: variant(FLOORS[3], { id: 'morgue', name: 'The Morgue', subtitle: 'Cold drawers, cold hands',
    pal: { floor: '#6e7c86', floor2: '#5c6872', wall: '#4a5a6a', wall2: '#3a4856', stain: '#3a4a5a', heap: '#c8d0d8' }, darkness: 0.5,
    enemies: { orderly: 7, sheetghost: 8, wheelwraith: 4, mimic: 4, dripsentinel: 5, boneknight: 2, nursedoll: 4 } }),
  depths: variant(FLOORS[4], { id: 'catacombs', name: 'The Catacombs', subtitle: 'Shelves of the patient dead',
    floor: 'flag', wall: 'stone', pal: { floor: '#5a5048', floor2: '#4a423c', wall: '#4e4640', wall2: '#3a342e', rock: '#6e6458' },
    enemies: { boneknight: 7, skullorbit: 6, ossspider: 6, gravedigger: 5, marrowmaw: 3, sheetghost: 3 } }),
  chapel: variant(FLOORS[5], { id: 'belfry', name: 'The Belfry', subtitle: 'Every bell still remembers its last toll',
    floor: 'brick', wall: 'chapel', pal: { floor: '#5a4232', floor2: '#4a3628', grout: '#1e1410', heap: '#efe4c2' }, ambience: 'dust',
    enemies: { choirboy: 5, censer: 6, penitent: 5, cherubmoth: 7, sootsprite: 3, boneknight: 3 } }),
  hollow: variant(FLOORS[6], { id: 'inkwell', name: 'The Inkwell', subtitle: 'Deep enough to drown a story',
    pal: { floor: '#141a2e', floor2: '#10142a', wall: '#1e2846', wall2: '#161e38', accent: '#4a8aff' },
    enemies: { blot: 8, voideye: 5, pagewraith: 5, hollowmaw: 4, mirrorshade: 3, drowner: 3 } }),
};
