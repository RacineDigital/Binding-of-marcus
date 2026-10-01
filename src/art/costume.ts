// Costumes: items that would show on you do (a ring on your hand, spectacles, a crown, wings), the
// strongest items restyle your whole outfit, and every transformation gives you a new look.
// Accessories are painted pixel by pixel in head- or body-local coordinates of the player rig and
// mirrored when the player faces left; whole-outfit changes are palette swaps of the rig.
import type { Palette } from './grid';
import type { CharacterLook } from './look';

export type Acc =
  | 'crown' | 'quill' | 'paperCrown' | 'waxCrown' | 'halo' | 'haloWhite' | 'antennae' | 'flower' | 'clover'
  | 'glasses' | 'monocle' | 'paperMask' | 'teeth' | 'pipe' | 'visor' | 'hollowEyes'
  | 'ring' | 'thimble' | 'bracelet' | 'lantern'
  | 'breastplate' | 'apron' | 'skeletonKey' | 'keyRing'
  | 'wingsMoth' | 'wingsSoot' | 'wingsWax' | 'wingsIce' | 'wingsQueen' | 'wingsAngel'
  | 'capeVamp' | 'capeCobweb' | 'capeJacket'
  | 'bikeHelmet' | 'nosePencil' | 'diaper' | 'fatLip';

type Layer = 'back' | 'body' | 'hand' | 'head' | 'face';
const LAYER: Record<Acc, Layer> = {
  crown: 'head', quill: 'head', paperCrown: 'head', waxCrown: 'head', halo: 'head', haloWhite: 'head', antennae: 'head', flower: 'head', clover: 'head',
  glasses: 'face', monocle: 'face', paperMask: 'face', teeth: 'face', pipe: 'face', visor: 'face', hollowEyes: 'face',
  ring: 'hand', thimble: 'hand', bracelet: 'hand', lantern: 'hand',
  breastplate: 'body', apron: 'body', skeletonKey: 'body', keyRing: 'body', diaper: 'body',
  bikeHelmet: 'head', nosePencil: 'face', fatLip: 'face',
  wingsMoth: 'back', wingsSoot: 'back', wingsWax: 'back', wingsIce: 'back', wingsQueen: 'back', wingsAngel: 'back',
  capeVamp: 'back', capeCobweb: 'body', capeJacket: 'back',
};

/** A whole-outfit change: palette keys of the hand-drawn rig (the other readers get a derived look). */
export interface Outfit { id: string; name: string; pal: Partial<Palette>; acc?: Acc[] }

/** Items that show on you. */
export const ITEM_ACC: Record<string, Acc[]> = {
  grandmothers_ring: ['ring'], golden_thimble: ['thimble'], charm_bracelet: ['bracelet'], pocket_lantern: ['lantern'],
  spectacles: ['glasses'], burning_glass: ['monocle'], paper_mask: ['paperMask'], mask_of_teeth: ['teeth'],
  grandpas_pipe: ['pipe'], cold_visions: ['visor'], hollow_eyes: ['hollowEyes'],
  wax_crown: ['waxCrown'], ch_paper_crown: ['paperCrown'], wax_halo: ['halo'], angel_333: ['haloWhite'],
  magnolia: ['flower'], four_leaf: ['clover'],
  big_boy_diaper: ['diaper'], nose_pencil: ['nosePencil'], bike_helmet: ['bikeHelmet'], gavyns_pouch: ['fatLip'],
  brass_plate: ['breastplate'], blast_apron: ['apron'], skeleton_key: ['skeletonKey'], key_ring: ['keyRing'],
  moth_wings_rev: ['wingsMoth'], soot_wings: ['wingsSoot'], wax_wings: ['wingsWax'], drain_butterfly: ['wingsIce'],
  moth_queen_wings: ['wingsQueen'], cobweb_cloak: ['capeCobweb'], dust_jacket: ['capeJacket'],
};

/** The strongest items change your whole outfit. */
export const ITEM_OUTFIT: Record<string, Outfit> = {
  whole_lotta_red: { id: 'wlr', name: 'Whole Lotta Red', pal: {
    c: '#4a0810', C: '#7a0e1c', D: '#a8162a', E: '#d83040', R: '#1a0a0e', q: '#0a0406', t: '#1a1014',
    L: '#7a0e1c', l: '#d01830', j: '#141016', J: '#221a24', n: '#1a1418', N: '#100c10', x: '#060406' } },
  black_quill: { id: 'quill', name: 'Black Quill', acc: ['quill'], pal: {
    c: '#06050a', C: '#0e0c16', D: '#1a1726', E: '#2a2640', R: '#3a3466', q: '#1e1a3a', t: '#8a84c8', k: '#06050a' } },
  the_debt: { id: 'debt', name: 'The Debt', pal: {
    c: '#1e1608', C: '#3a2a10', D: '#5a4418', E: '#8a6a28', R: '#e8c050', q: '#9a7a20', t: '#f0d878',
    v: '#e8c050', j: '#2a2014', J: '#3a2e1c' } },
  drain_butterfly: { id: 'butterfly', name: 'Drain Butterfly', pal: {
    c: '#8aa4c0', C: '#bcd0e4', D: '#dce8f4', E: '#ffffff', R: '#8ac8f0', q: '#4a88b8', t: '#ffffff', j: '#7a94b8', J: '#9ab4d8' } },
};

/** Every transformation is a new look (they win over item outfits). */
export const TRANSFORM_OUTFIT: Record<string, Outfit> = {
  // Jeffy: no shirt, just the diaper, the helmet and the pencil
  jeffy: { id: 'jeffy', name: 'Jeffy', acc: ['bikeHelmet', 'nosePencil', 'diaper'], pal: {
    c: '#b8876a', C: '#d8a684', D: '#e8b896', E: '#f1c7a1', R: '#f1c7a1', q: '#c8987a',
    j: '#dcdcd6', J: '#f4f4f0' } },
  vamp: { id: 'vamp', name: 'King Vamp', acc: ['crown', 'capeVamp'], pal: {
    S: '#ece0e0', s: '#cbbcc0', d: '#9c8890', W: '#fff6f6', v: '#e01828', r: '#d8a0a8', m: '#5a0a18',
    K: '#06040a', h: '#0e0a12', H: '#16121c', L: '#5a1020', l: '#a01830',
    c: '#0e080c', C: '#1c1016', D: '#2c1620', E: '#46202c', R: '#d01830', q: '#6a0a18', t: '#d8b048',
    j: '#140e14', J: '#22181e', n: '#2a1a1e', N: '#1a1014', x: '#0a0608' } },
  moth: { id: 'moth', name: 'Mothkin', acc: ['antennae', 'wingsMoth'], pal: {
    K: '#4a4034', h: '#6a5e4c', H: '#8a7c66', L: '#aa9a80', l: '#cabaa0',
    c: '#4a3c2c', C: '#6a5a44', D: '#8a7860', E: '#ac9a7e', R: '#d8c8a0', q: '#8a7656', t: '#f0e6cc' } },
  ink: { id: 'ink', name: 'Inkblooded', pal: {
    S: '#2c2c62', s: '#22224e', d: '#18183c', W: '#3c3c78', e: '#f2f2ff', w: '#f2f2ff', v: '#8a8aff', m: '#0a0a24', r: '#3a3a84', k: '#8a8aff',
    c: '#0a0a18', C: '#121228', D: '#1c1c3c', E: '#2a2a58', R: '#4450b0', q: '#22285a' } },
  clock: { id: 'clock', name: 'Clockwork', acc: ['monocle'], pal: {
    c: '#4a3410', C: '#7a5a22', D: '#a8823a', E: '#d8b860', R: '#3a3a46', q: '#22222c', t: '#ececf4', j: '#3a3028', J: '#54463a' } },
  wax: { id: 'wax', name: 'Waxen Saint', acc: ['halo'], pal: {
    S: '#fcecd8', s: '#ecd2b8', c: '#a89c88', C: '#cfc4ae', D: '#e8e0cc', E: '#fffaf0', R: '#e8a040', q: '#b06820', t: '#f0c060' } },
  thread: { id: 'thread', name: 'Needleworker', acc: ['thimble'], pal: {
    c: '#2a4a3a', C: '#8a3a3a', D: '#3a5a8a', E: '#c8a040', R: '#e8e0d0', q: '#a89a80', t: '#d02a3a' } },
  bone: { id: 'bone', name: 'Ossified', pal: {
    S: '#ebe5d2', s: '#cbc3ac', d: '#a39b82', W: '#fffaf0', e: '#0a0608', w: '#0a0608', v: '#0a0608', r: '#cbc3ac', m: '#2a2420', k: '#0a0608',
    c: '#363230', C: '#524c46', D: '#746e66', E: '#9c968c' } },
  void: { id: 'void', name: 'Hollowed', acc: ['hollowEyes'], pal: {
    S: '#3a2a5a', s: '#2a1e48', d: '#1e1438', W: '#4a3a70', r: '#3a2a5a', m: '#0a0614', k: '#c8a8ff',
    K: '#06040c', h: '#0a0814', H: '#0e0a1a', L: '#2a1e48', l: '#4a3a80',
    c: '#0a0814', C: '#120e22', D: '#1e1836', E: '#2e2650', R: '#6a4ab8', q: '#3a2a70', t: '#c8a8ff' } },
  drain: { id: 'drain', name: 'Drainer', acc: ['wingsAngel', 'haloWhite'], pal: {
    K: '#8a8478', h: '#b8b0a0', H: '#d8d0c0', L: '#f0ead8', l: '#ffffff',
    c: '#8aa4c0', C: '#bcd0e4', D: '#dce8f4', E: '#ffffff', R: '#7ab8e8', q: '#4a7aa8', t: '#ffffff', j: '#8aa0c0', J: '#aac0e0' } },
};

export interface Costume { outfit: Outfit | null; acc: Acc[] }

/** Work out what the player looks like from items, charms and transformations. */
export function costumeFor(items: Iterable<string>, charms: string[], transformations: Iterable<string>): Costume {
  const acc: Acc[] = [];
  const add = (a: Acc) => { if (acc.includes(a)) return; if (isBack(a) && acc.some(isBack)) return; acc.push(a); };
  let outfit: Outfit | null = null;
  for (const t of transformations) { const o = TRANSFORM_OUTFIT[t]; if (o) { outfit = o; break; } }
  const owned = [...items, ...charms];
  if (!outfit) for (const id of owned) if (ITEM_OUTFIT[id]) { outfit = ITEM_OUTFIT[id]; break; }
  // the outfit's own pieces first, so its wings or cape win
  for (const a of outfit?.acc ?? []) add(a);
  for (const id of owned) for (const a of ITEM_ACC[id] ?? []) add(a);
  return { outfit, acc };
}
const isBack = (a: Acc) => LAYER[a] === 'back';

/** Derive a procedural CharacterLook for the non-hand-drawn readers from an outfit palette. */
export function outfitLook(base: CharacterLook, o: Outfit): CharacterLook {
  const p = o.pal;
  return { ...base, shirt: p.C ?? base.shirt, trim: p.R ?? p.E ?? base.trim, skin: p.S ?? base.skin, hair: p.H ?? base.hair, eye: p.v ?? base.eye, shorts: p.j ?? base.shorts };
}

// ------------------------------------------------------------------ painting
type Dir = 'down' | 'up' | 'side';
export interface Frame {
  ctx: CanvasRenderingContext2D; t: number;
  /** head sprite box (top-left, size) and whether it is mirrored */
  hx: number; hy: number; hw: number; hflip: boolean; hdir: Dir;
  /** body sprite box */
  bx: number; by: number; bw: number; bflip: boolean; bdir: Dir;
}

function pen(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, flip: boolean) {
  return (x: number, y: number, col: string, ww = 1, hh = 1) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(flip ? x0 + w - x - ww : x0 + x), Math.round(y0 + y), ww, hh);
  };
}

/** Draw every accessory of one layer. Back pieces sit in front when we see the player from behind. */
export function drawCostume(f: Frame, acc: Acc[], layer: Layer): void {
  for (const a of acc) if (LAYER[a] === layer) PAINT[a](f);
}
export function hasLayer(acc: Acc[], layer: Layer): boolean { return acc.some((a) => LAYER[a] === layer); }

const H = (f: Frame) => pen(f.ctx, f.hx, f.hy, f.hw, f.hflip);
const B = (f: Frame) => pen(f.ctx, f.bx, f.by, f.bw, f.bflip);

function crownShape(f: Frame, base: string, hi: string, gem: string): void {
  const p = H(f);
  p(5, 0, base, 10, 2); p(5, -1, base); p(9, -2, base, 2, 1); p(9, -1, base, 2, 1); p(14, -1, base);
  p(5, -2, hi); p(10, -3, hi); p(14, -2, hi); p(6, 0, hi, 8, 1);
  p(9, 0, gem, 2, 1);
}
function wings(f: Frame, outer: string, inner: string, spot: string | null, big = 1): void {
  const ctx = f.ctx, cx = f.bx + f.bw / 2, cy = f.by + 4;
  const flap = Math.sin(f.t * 10) * 2;
  for (const s of [-1, 1]) {
    ctx.fillStyle = outer;
    ctx.beginPath(); ctx.moveTo(cx + s * 2, cy + 1);
    ctx.lineTo(cx + s * (12 * big), cy - 7 * big - flap); ctx.lineTo(cx + s * (14 * big), cy - 1 - flap * 0.5);
    ctx.lineTo(cx + s * (10 * big), cy + 6 * big); ctx.closePath(); ctx.fill();
    ctx.fillStyle = inner;
    ctx.beginPath(); ctx.moveTo(cx + s * 3, cy + 1);
    ctx.lineTo(cx + s * (10 * big), cy - 5 * big - flap); ctx.lineTo(cx + s * (11 * big), cy - flap * 0.5);
    ctx.lineTo(cx + s * (8 * big), cy + 4 * big); ctx.closePath(); ctx.fill();
    if (spot) { ctx.fillStyle = spot; ctx.fillRect(Math.round(cx + s * 9 * big - 1), Math.round(cy - 2 * big - flap * 0.6), 2, 2); }
  }
}
function cape(f: Frame, outer: string, inner: string, trim: string | null): void {
  const p = B(f);
  const sway = Math.round(Math.sin(f.t * 3) * 0.7);
  // wider than the body so it shows around it; only the outside is seen from behind
  p(1, -1, outer, 16, 14); p(0, 3, outer, 1, 10); p(17, 3, outer, 1, 10);
  p(1 + sway, 13, outer, 16, 1);
  if (f.bdir !== 'up') p(3, 1, inner, 12, 11);
  if (trim) { p(1, -1, trim, 16, 1); p(1 + sway, 13, trim, 16, 1); }
}

const PAINT: Record<Acc, (f: Frame) => void> = {
  // ---------------------------------------------------------------- head
  crown: (f) => crownShape(f, '#d8a838', '#ffe48a', '#d01830'),
  paperCrown: (f) => crownShape(f, '#e8e0cc', '#fffaf0', '#c8a040'),
  quill: (f) => { const p = H(f); for (let i = 0; i < 7; i++) p(16 + Math.floor(i / 3), 4 - i, i < 2 ? '#3a3448' : '#0a080e', 2, 1); p(18, -3, '#2a2638'); p(16, 5, '#c8a040'); },
  waxCrown: (f) => {
    crownShape(f, '#e8dcc0', '#fffaf0', '#c8a040');
    const p = H(f), fl = Math.floor(f.t * 8) % 2;
    for (const x of [6, 10, 14]) { p(x, -4, '#f4ecd8', 1, 2); p(x, -5 - fl, '#ffb040'); }
  },
  halo: (f) => { const ctx = f.ctx; ctx.save(); ctx.globalAlpha *= 0.9; ctx.strokeStyle = '#ffd860'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(f.hx + f.hw / 2, f.hy - 3 + Math.sin(f.t * 2) * 0.6, 6.5, 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); },
  haloWhite: (f) => { const ctx = f.ctx; ctx.save(); ctx.globalAlpha *= 0.9; ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(f.hx + f.hw / 2, f.hy - 3 + Math.sin(f.t * 2) * 0.6, 6.5, 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); },
  antennae: (f) => { const p = H(f), w = Math.round(Math.sin(f.t * 4)); p(6, -1, '#4a3a2a'); p(5, -2, '#4a3a2a'); p(4 + w, -3, '#8a7656', 2, 1); p(13, -1, '#4a3a2a'); p(14, -2, '#4a3a2a'); p(14 - w, -3, '#8a7656', 2, 1); },
  flower: (f) => { const p = H(f); p(15, 3, '#f0a8c8', 2, 2); p(14, 4, '#f8d0e0'); p(17, 4, '#f8d0e0'); p(15, 2, '#f8d0e0'); p(15, 5, '#f8d0e0'); p(15, 3, '#ffe890'); },
  clover: (f) => { const p = H(f); p(3, 4, '#4a9a4a', 2, 2); p(5, 3, '#5ab05a', 2, 2); p(4, 2, '#4a9a4a'); p(5, 6, '#2a6a2a'); },
  bikeHelmet: (f) => {
    // a blue bicycle helmet with vents, and the chin strap
    const p = H(f), b = '#2a6ad8', d = '#1c4aa0', l = '#7ab0ff';
    p(3, 0, b, 14, 4); p(2, 2, b, 1, 4); p(17, 2, b, 1, 4); p(4, -1, b, 12, 1); p(6, -2, d, 8, 1);
    p(3, 4, d, 14, 1);
    if (f.hdir !== 'up') { for (const x of [6, 10, 14]) p(x, 0, d, 1, 3); p(5, 0, l, 2, 1); }
    else for (const x of [5, 8, 11, 14]) p(x, 0, d, 1, 4);
    if (f.hdir === 'down') { p(3, 5, '#1a1a2a', 1, 9); p(16, 5, '#1a1a2a', 1, 9); }
    else if (f.hdir === 'side') p(8, 5, '#1a1a2a', 1, 9);
  },
  // ---------------------------------------------------------------- face
  fatLip: (f) => {
    // Gavyn's pouch: a big swollen top lip, pushed out over the mouth
    if (f.hdir === 'up') return; const p = H(f), sk = '#e2b48e', hi = '#f2caa6', sh = '#b8846a';
    if (f.hdir === 'down') { p(7, 15, sk, 6, 2); p(6, 16, sk, 8, 1); p(8, 15, hi, 3, 1); p(6, 17, sh, 8, 1); }
    else { p(15, 15, sk, 4, 2); p(18, 16, sk, 1, 1); p(16, 15, hi, 2, 1); p(15, 17, sh, 4, 1); }
  },
  nosePencil: (f) => {
    if (f.hdir === 'up') return; const p = H(f);
    if (f.hdir === 'down') { p(10, 15, '#e8b020', 1, 3); p(11, 15, '#c89010', 1, 3); p(10, 18, '#b8b8c0', 2, 1); p(10, 19, '#e88a9a', 2, 1); }
    else { p(17, 15, '#e8c8a0', 2, 1); p(19, 14, '#e8b020', 3, 1); p(19, 15, '#c89010', 3, 1); p(22, 14, '#b8b8c0', 1, 2); p(23, 14, '#e88a9a', 1, 2); }
  },
  glasses: (f) => {
    if (f.hdir === 'up') return; const p = H(f), c = '#c8a040', g = 'rgba(200,230,255,0.35)';
    if (f.hdir === 'down') { for (const x of [3, 12]) { p(x, 11, c, 5, 1); p(x, 15, c, 5, 1); p(x, 12, c, 1, 3); p(x + 4, 12, c, 1, 3); p(x + 1, 12, g, 3, 3); } p(8, 12, c, 4, 1); }
    else { p(11, 11, c, 5, 1); p(11, 15, c, 5, 1); p(11, 12, c, 1, 3); p(15, 12, c, 1, 3); p(12, 12, g, 3, 3); p(4, 12, c, 7, 1); }
  },
  monocle: (f) => {
    if (f.hdir === 'up') return; const p = H(f), c = '#e8c050', x = f.hdir === 'down' ? 12 : 11;
    p(x, 11, c, 5, 1); p(x, 15, c, 5, 1); p(x, 12, c, 1, 3); p(x + 4, 12, c, 1, 3); p(x + 1, 12, 'rgba(255,240,180,0.35)', 3, 3);
    p(x + 4, 16, c); p(x + 5, 17, c); p(x + 5, 18, c);
    if (Math.floor(f.t * 3) % 4 === 0) p(x + 1, 12, '#ffffff');
  },
  paperMask: (f) => {
    if (f.hdir === 'up') return; const p = H(f), m = '#f4eee0', s = '#c8bca4';
    if (f.hdir === 'down') { p(3, 10, m, 14, 7); p(2, 11, m, 1, 5); p(17, 11, m, 1, 5); p(4, 17, s, 12, 1); p(4, 12, '#140c1e', 3, 2); p(13, 12, '#140c1e', 3, 2); p(8, 15, '#140c1e', 4, 1); p(7, 14, '#140c1e'); p(12, 14, '#140c1e'); }
    else { p(8, 10, m, 11, 7); p(19, 12, m, 1, 4); p(12, 12, '#140c1e', 3, 2); p(14, 15, '#140c1e', 4, 1); }
  },
  teeth: (f) => {
    if (f.hdir === 'up') return; const p = H(f), x0 = f.hdir === 'down' ? 4 : 10, w = f.hdir === 'down' ? 12 : 9;
    p(x0, 15, '#1a0a10', w, 3); for (let x = x0; x < x0 + w; x += 2) { p(x, 15, '#f4eee0'); p(x + 1, 17, '#f4eee0'); }
  },
  pipe: (f) => {
    if (f.hdir === 'up') return; const p = H(f), wood = '#6a3a1e', hi = '#9a5a2e';
    if (f.hdir === 'down') { p(11, 16, wood, 3, 1); p(14, 16, wood, 1, 2); p(14, 17, hi, 3, 3); p(15, 17, '#2a1408'); }
    else { p(17, 16, wood, 3, 1); p(20, 15, hi, 3, 3); p(21, 15, '#2a1408'); }
    if (Math.floor(f.t * 2) % 2 === 0) p(f.hdir === 'down' ? 15 : 21, 13 - (Math.floor(f.t * 6) % 3), 'rgba(220,220,230,0.6)');
  },
  visor: (f) => {
    if (f.hdir === 'up') return; const p = H(f);
    if (f.hdir === 'down') { p(2, 12, '#3a6a9a', 16, 3); p(3, 12, '#9ad0f0', 14, 1); p(5, 13, '#e8f6ff', 2, 1); }
    else { p(9, 12, '#3a6a9a', 10, 3); p(10, 12, '#9ad0f0', 8, 1); }
  },
  hollowEyes: (f) => {
    if (f.hdir === 'up') return; const p = H(f), glow = Math.floor(f.t * 4) % 2 ? '#c8f0ff' : '#8ad8ff';
    const xs = f.hdir === 'down' ? [4, 13] : [12];
    for (const x of xs) { p(x, 12, '#05030a', 3, 3); p(x + 1, 13, glow); }
  },
  // ---------------------------------------------------------------- hands (the hands are the skin pixels at the bottom corners of the torso)
  ring: (f) => {
    if (f.bdir === 'side') return; const p = B(f);
    p(15, 7, '#e8c050', 2, 1); p(15, 8, '#b8862a', 2, 1); p(16, 6, '#d01830'); p(17, 6, '#ff6070');
    if (Math.floor(f.t * 1.5) % 3 === 0) { p(18, 5, '#fff8d0'); p(17, 4, 'rgba(255,248,208,0.6)'); p(19, 6, 'rgba(255,248,208,0.6)'); }
  },
  thimble: (f) => { if (f.bdir === 'side') return; const p = B(f); p(2, 7, '#e8c050', 2, 2); p(2, 7, '#fff0a0'); },
  bracelet: (f) => { if (f.bdir === 'side') return; const p = B(f); p(15, 6, '#c8a040', 3, 1); p(16, 7, '#d8584a'); },
  lantern: (f) => {
    const p = B(f), x = f.bdir === 'side' ? 11 : 1, glow = 0.55 + Math.sin(f.t * 9) * 0.15;
    p(x, 7, '#3a3434', 1, 2); p(x - 1, 9, '#3a3434', 3, 4); p(x, 10, `rgba(255,200,90,${glow + 0.3})`, 1, 2);
    const ctx = f.ctx; ctx.save(); ctx.globalAlpha *= glow * 0.35; ctx.fillStyle = '#ffc860'; ctx.beginPath(); ctx.arc(Math.round(f.bflip ? f.bx + f.bw - x : f.bx + x) + 0.5, f.by + 11, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  },
  // ---------------------------------------------------------------- body
  breastplate: (f) => { if (f.bdir === 'up') return; const p = B(f), x = f.bdir === 'side' ? 7 : 6; p(x, 3, '#b8862a', 6, 4); p(x + 1, 3, '#e8c050', 4, 1); p(x + 1, 7, '#8a5a1a', 4, 1); p(x + 2, 4, '#f8e08a'); },
  diaper: (f) => { const p = B(f), x = f.bdir === 'side' ? 6 : 4; p(x, 8, '#f4f4f0', 10, 4); p(x, 8, '#ffffff', 10, 1); p(x + 1, 11, '#d8d8d0', 8, 1); if (f.bdir === 'down') { p(x, 9, '#7ab8f0', 1, 2); p(x + 9, 9, '#7ab8f0', 1, 2); } },
  apron: (f) => { if (f.bdir === 'up') return; const p = B(f), x = f.bdir === 'side' ? 8 : 5; p(x, 4, '#6a4a2a', 8, 6); p(x + 1, 3, '#4a3218', 6, 1); p(x + 2, 6, '#8a6a3a', 4, 1); },
  skeletonKey: (f) => { const p = B(f), x = f.bdir === 'side' ? 6 : 12; p(x, 8, '#e8e0cc', 1, 4); p(x - 1, 7, '#e8e0cc', 3, 1); p(x + 1, 11, '#e8e0cc'); },
  keyRing: (f) => { const p = B(f), x = f.bdir === 'side' ? 6 : 12; p(x, 8, '#c8a040', 2, 2); p(x + 1, 10, '#d8d0b0', 1, 2); p(x - 1, 10, '#b8a888', 1, 2); },
  // ---------------------------------------------------------------- back
  wingsMoth: (f) => wings(f, '#8a7656', '#c8b490', '#3a2a1a'),
  wingsSoot: (f) => wings(f, '#1a181c', '#3a3640', null),
  wingsWax: (f) => wings(f, '#e8dcc0', '#fffaf0', '#f0b040'),
  wingsIce: (f) => wings(f, 'rgba(140,200,240,0.75)', 'rgba(220,240,255,0.8)', '#ffffff', 1.1),
  wingsQueen: (f) => wings(f, '#2a1a3a', '#5a3a7a', '#e8c050', 1.2),
  wingsAngel: (f) => wings(f, '#dce8f4', '#ffffff', null, 0.85),
  capeVamp: (f) => cape(f, '#0e080c', '#a8162a', '#d8b048'),
  capeCobweb: (f) => {
    // a shawl of web over the shoulders: radiating strands and a few rings
    const ctx = f.ctx; ctx.save(); ctx.strokeStyle = 'rgba(235,235,245,0.7)'; ctx.lineWidth = 0.5;
    const cx = f.bx + f.bw / 2, cy = f.by + 1;
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + i * 0.133); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 7); ctx.stroke(); }
    for (const r of [3.5, 6.5]) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.3, r, 0, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke(); }
    ctx.restore();
  },
  capeJacket: (f) => cape(f, '#6a1a22', '#8a2a30', '#d8b048'),
};
