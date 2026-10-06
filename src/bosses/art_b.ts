// Chapter II–III bosses, redrawn on the rig: Furnace Heart, Old Stoker, the Rat King (and Prince),
// Bilgemaw, the Matron and the Sleepwalker.
import type { PixelArt } from '../render/pixel';
import type { Pose } from './rig';
import { jaws, eyeball, brow, gash, boils, tatters, claw, veins, dribble, melt, ramp, hex, h01, TAU } from './kit';

// ------------------------------------------------------------------ Furnace Heart
// A cast-iron stove that is also a heart: two swollen iron lobes held together with riveted bands that
// bulge as it beats, arteries for stovepipes, pressure gauges for eyes, and a firebox door for a mouth
// that swings open on a throat of molten teeth. Second phase: the iron glows through its cracks.
export function paintFurnace(p: PixelArt, s: Pose): void {
  const hot = s.phase > 0, open = Math.min(1, Math.max(s.x.open ?? 0, s.jaw > 0.6 ? (s.jaw - 0.6) * 2.5 : 0));
  const iron = ramp(hot ? '#4a3034' : '#3e3640'), band = ramp('#5a5058'), brass = ramp('#c89a3a');
  const floor = p.h - 2, cx = p.w / 2;
  const beat = 1 + Math.max(0, s.breath) * 0.06 + s.squash * 0.5;
  const top = floor - 50 + Math.round(-s.lean * 2 + s.death * 12);
  // stubby iron legs with claws
  for (const lx of [cx - 13, cx - 5, cx + 5, cx + 13]) { p.tube(lx, floor - 7, lx + (lx < cx ? -1 : 1), floor - 2, 2.2, band); claw(p, lx + (lx < cx ? -1 : 1), floor, Math.PI / 2, 0.3, '#2a242a', '#c8b8a0', 3, 2); }
  // arteries / stovepipes rising from the lobes; the right one is the chimney
  p.tube(cx - 9, top + 6, cx - 13, top - 4, 3, ramp('#7a2a34')); p.ellipse(cx - 13, top - 5, 3, 1.4, '#3a0a10');
  p.tube(cx + 8, top + 6, cx + 10, top - 6, 3.4, band); p.rect(cx + 6, top - 9, 8, 3, band[3]); p.rect(cx + 6, top - 9, 8, 1, band[4]);
  // Flanged side pipes and hanging chain links make the machine feel assembled and heavy.
  for (const side of [-1, 1]) {
    const xx = cx + side * 22, yy = top + 23;
    p.tube(cx + side * 16, yy - 4, xx, yy - 4, 2.1, band);
    p.tube(xx, yy - 4, xx, yy + 8, 2.1, band);
    p.rect(xx - 3, yy - 5, 6, 2, '#91817a');
    for (let y = yy + 8; y < floor - 7; y += 4) {
      p.ring(xx + Math.sin(s.t * TAU + side) * 0.6, y, 1.6, '#aa8970', 0.7);
      p.set(xx - 1, y - 1, '#e0bf92');
    }
  }
  // the heart: two lobes over a tapering body
  p.ball(cx - 8, top + 13, 12 * beat, 11 * beat, iron, { dither: 0.35 });
  p.ball(cx + 8, top + 13, 12 * beat, 11 * beat, iron, { dither: 0.35 });
  p.poly([cx - 19 * beat, top + 16, cx + 19 * beat, top + 16, cx + 12, floor - 6, cx - 12, floor - 6], iron[2]);
  p.shadeV(cx - 19, top + 16, 38, floor - 6 - top - 16, iron, 0.5);
  // riveted bands, bulging between
  for (const by of [top + 9, top + 24, top + 37]) {
    const half = by < top + 20 ? 19 * beat : by < top + 30 ? 17 : 13;
    p.rect(cx - half, by, half * 2, 2, band[2]); p.rect(cx - half, by, half * 2, 1, band[4]);
    for (let x = -half + 2; x < half; x += 5) { p.set(cx + x, by, brass[3]); p.set(cx + x, by + 1, brass[1]); }
  }
  // veins of rust, and red-hot cracks when it's angry
  veins(p, cx - 15, top + 14, 14, '#6a2a2a', 3, 0.6); veins(p, cx + 14, top + 18, 12, '#6a2a2a', 4, 2.4);
  if (hot) for (const [x, y, sd] of [[cx - 12, top + 12, 7], [cx + 10, top + 30, 9], [cx - 4, top + 28, 5]] as [number, number, number][]) {
    let xx = x, yy = y; for (let i = 0; i < 12; i++) { p.set(xx, yy, i % 3 ? '#ff8a2a' : '#ffe080'); xx += Math.round(h01(sd, i) * 2 - 1); yy += 1; }
  }
  // gauge eyes in brass bezels, a heavy iron brow scowling over them
  for (const side of [-1, 1]) {
    const ex = cx + side * 8, ey = top + 15;
    p.ring(ex, ey, 5, brass[2], 1.5); p.set(ex - 3, ey - 4, brass[4]);
    eyeball(p, s, ex, ey, 3.6, hot ? '#ff3a1a' : '#e88a20', { sclera: '#efe4c8', socket: '#1a1418', anger: 0.55 + (hot ? 0.35 : 0), side, veins: 2 });
    if (s.hurt > 0.5 || s.phase) p.line(ex - 2, ey - 3, ex + 1, ey + 2, '#ffffff');   // cracked glass
    // a heavy iron brow cutting down across the gauge toward the middle: it is always angry
    const sl = -side * (2.5 + (hot ? 1.5 : 0) + s.hurt * -2);
    brow(p, ex - 6, ey - 6 + (side > 0 ? 0 : 0) - Math.round(sl > 0 ? 0 : -sl), 12, sl, '#16121a', 3);
  }
  // the firebox mouth: an iron door with a grate of bars for teeth; open, a throat of fire and molten teeth
  const my = top + 29, mw = 20, mh = 12;
  p.rect(cx - mw / 2 - 1, my - 1, mw + 2, mh + 2, band[1]);
  p.rect(cx - mw / 2, my, mw, mh, '#1a0806');
  p.ball(cx, my + mh / 2 + 1, mw / 2 - 1, mh / 2, ramp(hot ? '#ffd040' : '#ff8a2a'), { dither: 0.4 });
  p.ball(cx, my + mh / 2 + 2, mw / 4, mh / 4, ramp('#fff4c0'));
  if (open > 0.15) {
    // molten teeth round the throat
    for (let x = -mw / 2 + 1; x < mw / 2; x += 2) { p.set(cx + x, my + 1, '#ffd890'); p.set(cx + x, my + 2, '#ff8a2a'); p.set(cx + x + 1, my + mh - 2, '#ffd890'); }
    // the door hangs open below, like a jaw
    const dh = Math.round(4 + open * 6);
    p.rect(cx - mw / 2, my + mh, mw, dh, band[2]); p.rect(cx - mw / 2, my + mh + dh - 1, mw, 1, band[0]);
    for (let x = -mw / 2 + 2; x < mw / 2 - 1; x += 3) p.rect(cx + x, my + mh, 1, dh - 1, '#1a1418');
  } else {
    for (let x = -mw / 2 + 1; x < mw / 2; x += 3) { p.rect(cx + x, my, 2, mh, band[2]); p.set(cx + x, my, band[4]); p.set(cx + x, my + mh - 1, '#ffb040'); }
  }
  if (s.death > 0) melt(p, s.death, floor, 31, '#1a0806');
}

// ------------------------------------------------------------------ Old Stoker
// The man who fed the furnace for forty years, and never came up. Huge, hunched, burned bald, one
// eye cooked shut and the other an ember. A leather apron charred through, forearms like hams and
// a coal shovel he swings like an axe.
export function paintStoker(p: PixelArt, s: Pose): void {
  const raise = Math.max(s.raise, s.x.raise ?? 0);
  const skin = ramp(s.phase ? '#b86a54' : '#a8705a'), burn = ramp('#c87a6a'), soot = ramp('#2e2a2c'), apron = ramp('#5a3e2a'), boot = ramp('#2a2220');
  const floor = p.h - 2, cx = p.w / 2 - 2;
  const crouch = Math.round(s.squash * 8 + s.death * 10), lean = s.lean;
  // legs: wide, braced, stepping
  for (const side of [-1, 1]) {
    const st = side * s.step * 2;
    const fx = cx + side * 8 + st, hip = floor - 16 + crouch;
    p.tube(cx + side * 5, hip, fx, floor - 3, 3.6, ramp('#3a3436'));
    p.ball(fx + side * 1, floor - 2, 5, 2.6, boot);
  }
  // the hulking torso, leaning into the swing
  const tx = cx + Math.round(lean * 3), ty = floor - 30 + crouch;
  p.ball(tx, ty, 15, 14, skin, { dither: 0.35 });
  // the charred apron, holes burned through it
  p.poly([tx - 11, ty - 4, tx + 11, ty - 4, tx + 13, floor - 12 + crouch, tx - 13, floor - 12 + crouch], apron[2]);
  p.shadeV(tx - 13, ty - 4, 26, 22, apron, 0.5);
  for (const [hx, hy] of [[-5, 4], [6, 9], [-2, 13]]) { p.ellipse(tx + hx, ty + hy, 1.6, 1.2, '#1a1010'); p.set(tx + hx, ty + hy - 2, '#ff8a2a'); }
  p.line(tx - 11, ty - 4, tx - 6, ty - 13, apron[1]); p.line(tx + 11, ty - 4, tx + 6, ty - 13, apron[1]);
  // burn scars over the chest and shoulders, and embers stuck in the skin once he's furious
  boils(p, [[tx - 12, ty - 8, 1.6], [tx + 12, ty - 6, 1.4], [tx + 9, ty - 11, 1.1]], '#d89080');
  if (s.phase) for (const [ex, ey] of [[-9, -2], [10, 2], [-13, 6]]) { p.set(tx + ex, ty + ey, '#ffb040'); p.set(tx + ex + 1, ty + ey, '#ff6a2a'); }
  // arms: the shovel arm comes up overhead on the wind-up and down hard on the swing
  const shX = tx + 13, shY = ty - 7;
  const armA = -0.4 - raise * 1.9 + Math.max(0, lean) * 1.6;
  const hx = shX + Math.cos(armA) * 14, hy = shY + Math.sin(armA) * 14 + 8;
  p.tube(shX, shY, hx, hy, 4.2, skin);
  // the shovel: a long handle and a black iron blade, glowing in phase two
  const ha = armA - 0.9 + raise * 0.6;
  const bx = hx + Math.cos(ha) * 17, by = hy + Math.sin(ha) * 17;
  p.line(hx - Math.cos(ha) * 4, hy - Math.sin(ha) * 4, bx, by, hex('#6a4a2a'), 2);
  p.ball(bx + Math.cos(ha) * 3, by + Math.sin(ha) * 3, 5, 4, ramp(s.phase ? '#c8501a' : '#3a3a42'));
  p.set(bx + Math.cos(ha) * 4 - 2, by + Math.sin(ha) * 4 - 2, s.phase ? '#ffe080' : '#8a8a96');
  p.ball(hx, hy, 3.6, 3.2, skin);
  // the other arm hangs low and heavy, fist clenched
  p.tube(tx - 13, ty - 7, tx - 17, ty + 10 - raise * 4, 4, skin); p.ball(tx - 17, ty + 12 - raise * 4, 4, 3.6, skin);
  p.line(tx - 19, ty + 11 - raise * 4, tx - 15, ty + 11 - raise * 4, skin[0]);
  // the head: small and low between the shoulders, scalp blistered, one eye cooked shut
  const hdx = tx + 1 + Math.round(lean * 3), hdy = ty - 15 + Math.round(-Math.max(0, -lean) * 2) + Math.round(s.hurt * 2);
  p.ball(hdx, hdy, 8.5, 8, skin, { dither: 0.3 });
  boils(p, [[hdx - 4, hdy - 6, 1.3], [hdx + 3, hdy - 7, 1.6], [hdx + 6, hdy - 3, 1]], '#d8988a');
  p.ellipse(hdx - 3, hdy - 1, 2.6, 1.6, burn[1]); p.line(hdx - 5, hdy - 1, hdx - 1, hdy - 1, '#5a2a24');   // the cooked eye
  eyeball(p, s, hdx + 3, hdy - 1, 2.4, '#ffb020', { anger: 0.8, side: 1, sclera: '#f0c890', veins: 2 });
  brow(p, hdx - 6, hdy - 5, 11, 2.5, '#8a5a48', 2);
  // the soot-black underbite, a few teeth left
  jaws(p, hdx + 1, hdy + 5, 10, 5, Math.max(0.2, s.jaw), { gum: '#6a2a2a', lip: '#3a2420', tooth: '#d8c890', fangs: 1, seed: 5, grin: -0.4, drool: null });
  p.line(hdx - 5, hdy + 3, hdx - 4, hdy + 8, soot[1]); p.line(hdx + 6, hdy + 3, hdx + 5, hdy + 8, soot[1]);
  if (s.death > 0) melt(p, s.death, floor, 17);
}

// ------------------------------------------------------------------ The Rat King
// Eight rats whose tails knotted together in the dark under the boiler, and one of them grew
// fat and crowned on the rest. The pack writhes in a ring, every head snapping outward, around a
// knot of raw pink tails; the King sits up out of it with a bent tin crown, yellow buck teeth and one
// good eye. The Prince is a smaller knot with a paper crown.
export function paintRatKing(p: PixelArt, s: Pose, k: number): void {
  const fur = ramp(s.phase ? '#6a5a54' : '#7a6a62'), dark = ramp('#3a302c'), tail = ramp('#d8a0a0');
  const floor = p.h - 2, cx = p.w / 2, cy = floor - 9 * k;
  const n = k < 1 ? 5 : 8;
  // the knot of tails on the floor
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + s.t * 0.6;
    p.line(cx + Math.cos(a) * 3 * k, cy + 2 + Math.sin(a) * 1.5, cx + Math.cos(a + 1.5) * 7 * k, cy + 3 + Math.sin(a + 1.5) * 3 * k, tail[(i % 2) + 1]);
  }
  p.ball(cx, cy + 2, 5 * k, 3 * k, tail, { dither: 0.4 });
  // the ring of rats, snapping outward, back legs scrabbling: darker than the King, each one a
  // proper rat (wedge snout, ear, red eye, teeth) so the pack reads as many animals
  const rat = ramp(s.phase ? '#4a3e3a' : '#54463e');
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + 0.3 + Math.sin(s.t * TAU + i * 1.7) * 0.12 * (s.anim === 'move' ? 2 : 1);
    const lunge = (s.anim === 'attack' || s.anim === 'roar' ? 3 : 0) + (i % 3 === Math.floor(s.t * 3) ? 1.5 : 0);
    const ca = Math.cos(a), sa = Math.sin(a);
    const bx = cx + ca * (11 * k + lunge * 0.5), by = cy + sa * (6.5 * k);
    const hx = cx + ca * (18 * k + lunge), hy = cy + sa * (10 * k + lunge * 0.4) - 2;
    p.ball(bx, by, 5 * k, 3.4 * k, rat, { dither: 0.5 });
    p.line(bx - ca * 4 * k, by + 2, bx - ca * 6 * k + sa, by + 3, rat[0]);   // a back leg
    p.ball(hx, hy, 3 * k, 2.5 * k, rat);
    // the wedge of a snout
    const sx = hx + ca * 3.5 * k, sy = hy + sa * 2 * k + 0.5;
    p.line(hx + ca * 1.5 * k, hy, sx, sy, rat[3]); p.set(sx, sy, '#e88a9a');
    p.set(sx - ca, sy + 1, '#efe2c0'); p.set(sx - ca * 2, sy + 1, '#efe2c0');
    p.set(hx - sa * 1.3, hy - 1, '#ff2a2a');
    p.ball(hx - ca * 1.2 - sa * 1.6, hy - 2.4, 1.2 * k, 1.4 * k, ramp('#c88a8a'));   // ear
    if (s.phase && i % 3 === 1) { p.set(bx, by - 2, '#8a1a24'); p.set(bx + 1, by - 1, '#b8202e'); }
  }
  // the King sits up out of the knot: fat, mangy, crowned
  const kx = cx, ky = cy - 12 * k + Math.round(s.breath * 1) - Math.round(Math.max(0, -s.lean) * 4 * k) + Math.round(s.death * 8);
  p.ball(kx, ky + 4 * k, 9 * k, 8 * k, fur, { dither: 0.4 });
  p.ball(kx, ky + 6 * k, 5 * k, 4.5 * k, ramp('#b8a8a0'), { dither: 0.6 });   // pale belly
  for (const [mx, my] of [[-6, 2], [5, -1], [7, 5]]) p.ball(kx + mx * k, ky + my * k, 1.6 * k, 1.3 * k, ramp('#c89090'));   // mange
  // little hands clutching at its chest
  claw(p, kx - 6 * k, ky + 5 * k, -0.4, 0.4, '#d8a0a0', '#f0e0d0', 3, 2.5 * k);
  claw(p, kx + 6 * k, ky + 5 * k, -2.7, 0.4, '#d8a0a0', '#f0e0d0', 3, 2.5 * k);
  // the head: a heavy wedge with one milky eye and one good one
  const hx = kx, hy = ky - 6 * k;
  p.ball(hx, hy, 8.5 * k, 7 * k, fur, { dither: 0.3 });
  brow(p, hx - 5 * k, hy - 5 * k, 4 * k, 1.5, '#4a3a34', 1); brow(p, hx + 1 * k, hy - 3.5 * k, 4 * k, -1.5, '#4a3a34', 1);
  p.ball(hx - 6 * k, hy - 4 * k, 2.6 * k, 3 * k, fur); p.ball(hx + 6 * k, hy - 4 * k, 2.6 * k, 3 * k, fur);   // ears
  p.ball(hx - 6 * k, hy - 4 * k, 1.4 * k, 1.8 * k, ramp('#d8a0a0')); p.ball(hx + 6 * k, hy - 4 * k, 1.4 * k, 1.8 * k, ramp('#d8a0a0'));
  p.ball(hx, hy + 3 * k, 3.6 * k, 2.6 * k, ramp('#c89a9a'));   // snout
  p.set(hx, hy + 1.5 * k, '#3a1a1a');
  // the milky dead eye and the bright mean one
  p.ball(hx - 3 * k, hy - 1.5 * k, 1.8 * k, 1.8 * k, ramp('#d8d8c8')); p.set(hx - 3 * k, hy - 1.5 * k, '#a8a8a0');
  eyeball(p, s, hx + 3 * k, hy - 1.5 * k, 1.8 * k + 0.4, '#e02020', { sclera: '#f0d0b0', anger: 0.7, side: 1, veins: 1 });
  // yellow buck teeth that come down over the lip, and whiskers
  const open = Math.min(1, s.jaw);
  // the mouth snarls open under them, and the buck teeth hang down over the lip
  jaws(p, hx, hy + 6 * k, 7 * k, 3 + open * 3 * k, Math.max(0.3, open), { gum: '#8a2a34', lip: '#9a6a6a', tooth: '#e8d8a0', fangs: 0, seed: 4, grin: -0.3, drool: '#d8e8d0' });
  p.rect(hx - 1, hy + 3.5 * k, 3, Math.round(3.5 * k + open * 2), hex('#e8c860')); p.line(hx, hy + 3.5 * k, hx, hy + 6.5 * k + open * 2, '#b8902a'); p.set(hx - 1, hy + 3.5 * k + 1, '#fff0b0');
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) p.line(hx + side * 3 * k, hy + 3 * k, hx + side * (8 + i) * k, hy + (1 + i * 1.5) * k, '#c8b8b0');
  // the crown: bent tin for the King, folded paper for the Prince
  const cy2 = hy - 7 * k;
  if (k >= 1) {
    const crown = ramp(s.phase ? '#a88a3a' : '#d8b048');
    p.poly([hx - 6, cy2 + 3, hx + 6, cy2 + 2, hx + 6, cy2 - 3, hx + 3, cy2, hx + 1, cy2 - 5, hx - 1, cy2 - 1, hx - 4, cy2 - 4, hx - 6, cy2 - 1], crown[3]);
    p.rect(hx - 6, cy2 + 1, 12, 2, crown[1]); p.set(hx + 1, cy2 - 1, '#e83a3a'); p.set(hx - 4, cy2, '#3a8ae8');
    if (s.phase) p.line(hx - 1, cy2 - 3, hx + 1, cy2 + 2, '#2a1a10');
  } else {
    p.poly([hx - 4, cy2 + 2, hx + 4, cy2 + 2, hx + 4, cy2 - 2, hx + 2, cy2, hx, cy2 - 3, hx - 2, cy2, hx - 4, cy2 - 2], hex('#e8e0c8'));
    p.line(hx - 4, cy2 + 2, hx + 4, cy2 + 2, hex('#a89a7a'));
  }
  if (s.death > 0) melt(p, s.death, floor, 13);
}

// ------------------------------------------------------------------ Bilgemaw
// What lives at the bottom of the drains: an eel's body, an angler's head. A jaw that hangs open past
// its own chin, translucent needle teeth in two rows, a lure on a stalk that glows sickly green, a
// milky blind eye and a small black one that finds you. Barnacles and torn fins.
export function paintBilge(p: PixelArt, s: Pose): void {
  const skin = ramp(s.phase ? '#4a6a5a' : '#5a7a6a'), belly = ramp('#a8b8a0'), fin = ramp('#3a5a52');
  const cx = 20, cy = p.h - 14 + Math.round(s.breath) + Math.round(s.death * 6);
  const open = Math.min(1, 0.25 + s.jaw * 0.9);
  // the gill frills and pectoral fin
  for (let i = 0; i < 4; i++) p.line(cx - 7, cy - 4 + i * 2, cx - 12, cy - 5 + i * 3 + Math.round(s.breath), fin[1 + (i % 2)]);
  tatters(p, cx - 10, cx - 4, cy + 6, 4, '#3a5a52', 5, s.breath * 0.5);
  // the head: a broad slab, the upper jaw over a dropped lower one
  p.ball(cx, cy - 2, 13, 9, skin, { dither: 0.35 });
  p.ball(cx + 2, cy + 3, 10, 4, belly, { dither: 0.5 });
  for (const [bx, by] of [[-6, -8], [-2, -9], [3, -8], [-9, -4]]) { p.ball(cx + bx, cy + by, 1.3, 1, ramp('#c8c0a8')); p.set(cx + bx, cy + by, '#5a5248'); }   // barnacles
  veins(p, cx - 8, cy - 3, 10, '#3a4a42', 9, 0);
  // the mouth: an underbite that hangs open, two rows of long glassy needle teeth
  const mx = cx + 8, my = cy + 1, gape = 3 + open * 9;
  p.poly([mx - 9, my, mx + 12, my - 3, mx + 12, my - 1, mx - 9, my + 2], skin[2]);                 // upper jaw lip
  p.poly([mx - 9, my + 2, mx + 13, my + gape - 1, mx + 13, my + gape + 2, mx - 9, my + 5], skin[1]);  // lower jaw
  p.poly([mx - 8, my + 1, mx + 11, my - 1, mx + 12, my + gape - 1, mx - 8, my + 3], '#14080a');
  p.poly([mx - 4, my + 2, mx + 6, my + 1, mx + 6, my + gape * 0.6, mx - 4, my + 3], '#5a1a24');
  for (let i = 0; i < 7; i++) {
    const tx = mx - 6 + i * 3;
    const ul = 2 + (i % 2) + Math.round(open * 2), ll = 2 + ((i + 1) % 2) + Math.round(open * 3);
    for (let j = 0; j < ul; j++) p.set(tx, my - 1 + j - i * 0.25, j === ul - 1 ? '#d8f0e8' : '#a8c8c0');
    for (let j = 0; j < ll; j++) p.set(tx + 1, my + gape - j + i * 0.1 - 0.5, j === ll - 1 ? '#d8f0e8' : '#a8c8c0');
  }
  if (open > 0.5) dribble(p, mx + 4, Math.round(my + gape + 1), 3, '#a8d8c8');
  // the lure on its stalk (its glow is drawn by the life layer at the tip)
  const lx = cx + 18 + Math.round(Math.sin(s.t * TAU) * 2), ly = cy - 15 + Math.round(Math.cos(s.t * TAU));
  p.line(cx + 4, cy - 9, cx + 12, cy - 16, fin[2]); p.line(cx + 12, cy - 16, lx, ly, fin[2]);
  p.ball(lx, ly, 2, 2, ramp('#e8ff80')); p.set(lx, ly, '#ffffff');
  // eyes: a big milky blind one, and a small black hunting one that tracks you
  p.ball(cx + 1, cy - 4, 3.4, 3, ramp('#d8e0d0')); p.ball(cx + 1, cy - 4, 1.6, 1.4, ramp('#a8b8b0'));
  eyeball(p, s, cx + 7, cy - 6, 1.9, '#1a1a10', { sclera: '#e0d8a0', anger: 0.4, side: 1, veins: 0, socket: '#1a2a22' });
  brow(p, cx - 2, cy - 9, 11, 1.5, '#3a5a4a', 1);
  if (s.phase) gash(p, cx - 6, cy - 6, cx - 1, cy + 2, { stitch: '', blood: '#5a8a6a' });
  if (s.death > 0) melt(p, s.death, p.h - 2, 21, '#1a2a22');
}
/** One body segment of the Bilgemaw: a slab of eel with a frilled dorsal fin, spots and barnacles. */
export function paintBilgeSeg(p: PixelArt): void {
  const skin = ramp('#5a7a6a'), belly = ramp('#a8b8a0'), fin = ramp('#3a5a52');
  tatters(p, 6, 17, 2, 4, '#3a5a52', 9, 0);
  for (let x = 6; x < 18; x += 2) p.line(x, 6, x - 1, 2, fin[1]);
  p.ball(12, 11, 9, 6.5, skin, { dither: 0.4 });
  p.ball(12, 14, 7, 3, belly, { dither: 0.5 });
  for (const [x, y] of [[8, 8], [14, 9], [11, 7], [16, 11]]) p.set(x, y, '#2a3a32');
  p.ball(6, 9, 1.2, 1, ramp('#c8c0a8'));
}

// ------------------------------------------------------------------ The Matron
// The night matron on the children's ward. Tall, thin and starched, a porcelain mask of a kind
// face that has cracked, a smile stitched shut over something that wants out, and a syringe as long
// as her arm. In her second phase the mask has split in half and the stitches have torn.
export function paintMatron(p: PixelArt, s: Pose): void {
  const raise = Math.max(s.raise, s.x.raise ?? 0);
  const dress = ramp('#7a8aa8'), apron = ramp('#e8e4d8'), skin = ramp('#e8dcd0'), stain = '#7a2a2a';
  const floor = p.h - 2, cx = p.w / 2 - 2;
  const sink = Math.round(s.squash * 6 + s.death * 14), lean = s.lean;
  // the long dress, its hem dragging and torn
  const waist = floor - 26 + sink;
  p.poly([cx - 6, waist, cx + 6, waist, cx + 11, floor - 3, cx - 11, floor - 3], dress[2]);
  p.shadeV(cx - 11, waist, 22, floor - 3 - waist, dress, 0.5);
  tatters(p, cx - 11, cx + 11, floor - 4, 4, '#5a6a88', 3, s.step * 0.5);
  // the starched apron, stained down the front
  p.poly([cx - 5, waist - 6, cx + 5, waist - 6, cx + 7, floor - 8, cx - 7, floor - 8], apron[3]);
  p.shadeV(cx - 7, waist - 6, 14, floor - 8 - waist + 6, apron, 0.4);
  for (const [x, y, l] of [[cx - 2, waist + 2, 6], [cx + 3, waist + 6, 4], [cx, waist - 2, 3]] as [number, number, number][]) dribble(p, x, y, l, stain, '#a84a4a');
  // the narrow body and shoulders, leaning in to strike
  const tx = cx + Math.round(lean * 2), ty = waist - 12;
  p.ball(tx, ty, 6.5, 8, dress, { dither: 0.3 });
  p.rect(tx - 3, ty - 6, 6, 3, apron[3]);   // collar
  // the free arm, long fingers spread
  p.tube(tx - 6, ty - 3, tx - 10, ty + 8, 1.8, dress); claw(p, tx - 10, ty + 10, Math.PI / 2 + 0.3, 0.6, '#e8dcd0', '#f8f0e8', 4, 4);
  // the syringe arm: up on the wind-up, lunging forward on the strike
  const shX = tx + 6, shY = ty - 4, armA = -0.2 - raise * 1.5 + Math.max(0, lean) * 0.9;
  const hx = shX + Math.cos(armA) * 9, hy = shY + Math.sin(armA) * 9 + 3;
  p.tube(shX, shY, hx, hy, 1.9, dress); p.ball(hx, hy, 2, 1.8, skin);
  const sa = armA - 0.5 + raise * 0.2;
  const bx = hx + Math.cos(sa) * 3, by = hy + Math.sin(sa) * 3, ex = hx + Math.cos(sa) * 15, ey = hy + Math.sin(sa) * 15;
  p.line(bx, by, ex, ey, hex('#c8d8e8'), 3);                       // the barrel
  p.line(bx + Math.cos(sa), by + Math.sin(sa) + 1, ex - Math.cos(sa) * 2, ey - Math.sin(sa) * 2 + 1, hex(s.phase ? '#9a1a24' : '#6ac0a0'), 1);   // what's in it
  p.line(ex, ey, ex + Math.cos(sa) * 8, ey + Math.sin(sa) * 8, hex('#e8e8f0'));   // the needle
  p.set(ex + Math.cos(sa) * 8, ey + Math.sin(sa) * 8, '#ffffff');
  // a long neck, then the porcelain mask
  const hdx = tx + Math.round(lean * 2), hdy = ty - 15 + Math.round(-Math.max(0, -lean) * 2) + Math.round(s.hurt);
  p.rect(hdx - 1, hdy + 5, 3, 6, skin[2]);
  p.ball(hdx, hdy, 6, 7.5, skin, { dither: 0.2 });
  // the nurse's cap with its red cross
  p.poly([hdx - 6, hdy - 5, hdx + 6, hdy - 5, hdx + 4, hdy - 11, hdx - 4, hdy - 11], apron[4]);
  p.rect(hdx - 1, hdy - 10, 2, 4, hex('#c82a2a')); p.rect(hdx - 2, hdy - 9, 4, 2, hex('#c82a2a'));
  // hollow eyes with pinprick pupils that follow you, black tears
  for (const side of [-1, 1]) {
    eyeball(p, s, hdx + side * 2.6, hdy - 1, 1.7, '#e8e0d0', { sclera: '#1a1014', socket: '#3a2a2a', veins: 0, pupil: '#ffffff', anger: s.phase ? 0.6 : 0.2, side });
    dribble(p, Math.round(hdx + side * 2.6), Math.round(hdy + 1), 2 + (side > 0 ? 2 : 1), '#1a1014', '#3a2a3a');
  }
  // the mouth: a smile stitched shut that tears open
  const open = Math.min(1, s.jaw * (s.phase ? 1.2 : 0.8));
  if (open > 0.3 || s.phase) jaws(p, hdx, hdy + 4, 7, 4 + open * 4, open, { gum: '#8a1a24', lip: '#c8a8a0', fangs: 2, seed: 9, grin: 0.6, drool: '#8a1a24' });
  else { p.line(hdx - 3, hdy + 3, hdx + 3, hdy + 4, '#6a3a3a'); for (let i = -3; i <= 3; i += 2) p.line(hdx + i, hdy + 2, hdx + i, hdy + 5, '#2a1414'); }
  // cracks in the porcelain; in phase two half of it has fallen away onto raw red underneath
  p.line(hdx + 2, hdy - 6, hdx + 4, hdy - 1, '#a89a90'); p.line(hdx + 4, hdy - 1, hdx + 3, hdy + 2, '#a89a90');
  if (s.phase) { p.poly([hdx + 1, hdy - 7, hdx + 6, hdy - 3, hdx + 6, hdy + 5, hdx + 2, hdy + 6, hdx + 3, hdy], hex('#8a2030')); boils(p, [[hdx + 4, hdy - 2, 1.1], [hdx + 4, hdy + 3, 0.9]], '#c84a4a'); }
  if (s.death > 0) melt(p, s.death, floor, 41);
}

// ------------------------------------------------------------------ The Sleepwalker
// A child in a long nightgown, floating a hand's width off the floor, arms out in front of her,
// hair hanging over her face, sleeping. The hem trails off into wisps. When she wakes, her eyes are
// two holes with a light at the bottom, and her mouth tears all the way open.
export function paintSleeper(p: PixelArt, s: Pose): void {
  const awake = s.phase > 0 || (s.x.awake ?? 0) > 0;
  const gown = ramp('#d8d8e4'), skin = ramp('#d8d0d8'), hair = ramp('#2a2430');
  const floor = p.h - 2, cx = p.w / 2;
  const bob = Math.round(s.breath * 1.5), hover = 5 + Math.round(-s.squash * 4) + Math.round(s.death * -4);
  const bottom = floor - hover + bob;
  // the gown, trailing off into wisps that sway behind her
  p.poly([cx - 6, bottom - 26, cx + 6, bottom - 26, cx + 11, bottom - 4, cx - 11, bottom - 4], gown[2]);
  p.shadeV(cx - 11, bottom - 26, 22, 22, gown, 0.5);
  for (let x = cx - 10; x <= cx + 10; x += 3) p.line(x, bottom - 22, x + (x - cx) * 0.2, bottom - 5, gown[1]);   // folds
  tatters(p, cx - 11, cx + 11, bottom - 4, 6, '#b8b8c8', 7, s.breath + s.lean);
  // bare feet dangling under the hem
  p.ball(cx - 3, bottom + 1, 1.6, 1.2, skin); p.ball(cx + 3, bottom + 2 + Math.round(s.breath), 1.6, 1.2, skin);
  // arms held out in front, hands hanging limp (clawing when awake)
  const ay = bottom - 22 + Math.round(-s.raise * 4);
  for (const side of [-1, 1]) {
    const hx = cx + side * 13 + Math.round(s.lean * 2), hy = ay + 2 + Math.round(side * s.breath);
    p.tube(cx + side * 5, ay - 2, hx, hy, 1.8, gown);
    if (awake) claw(p, hx + side, hy + 2, Math.PI / 2 + side * 0.3, 0.8, '#d8d0d8', '#f0e8f0', 4, 4);
    else { p.line(hx, hy + 1, hx + side, hy + 4, skin[2]); p.line(hx + side, hy + 1, hx + side * 2, hy + 4, skin[2]); }
  }
  // the head: long lank hair hangs behind and either side of a small pale face
  const hdx = cx + Math.round(s.lean * 2), hdy = bottom - 33 + Math.round(-Math.max(0, -s.lean) * 2);
  for (let i = -7; i <= 7; i++) {
    if (Math.abs(i) < 4) continue;
    const len = 12 + Math.round(h01(i, 3) * 7), lift = awake ? Math.round(Math.abs(i) * 0.6) : 0;
    for (let j = 0; j < len; j++) {
      const x = hdx + i + Math.round(Math.sin(j * 0.4 + s.t * TAU + i) * (awake ? 1.5 : 0.5)), y = hdy - 5 + j - lift;
      p.set(x, y, j === 0 ? hair[3] : hair[(i + j) % 3 === 0 ? 1 : 2]);
    }
  }
  p.ball(hdx, hdy - 2, 7, 5, hair, { dither: 0.2 });           // the crown of the head
  p.ball(hdx, hdy + 1, 5.5, 6, skin, { dither: 0.2 });          // the face
  p.ball(hdx, hdy + 3, 4.5, 3, ramp('#c8b8c8'), { dither: 0.7 });  // hollow cheeks
  // eyes: shut with dark rings asleep; awake, two black holes with a light deep in them
  for (const side of [-1, 1]) {
    const ex = hdx + side * 2.4, ey = hdy;
    if (awake) {
      p.ellipse(ex, ey, 1.7, 2.2, '#06040a');
      if (s.hurt < 0.5) s.eyes.push({ x: ex, y: ey, r: 1.2, iris: '#e8f0ff', pupil: '#ffffff', glint: false });
      dribble(p, Math.round(ex), Math.round(ey + 2), 2 + (side > 0 ? 2 : 1), '#2a1a2a');
    } else {
      p.ellipse(ex, ey + 0.5, 2, 1.5, '#8a7a98');
      p.line(ex - 1.5, ey + 0.5, ex + 1.5, ey + 0.5, '#2a1a2a'); p.set(ex + side * 1.5, ey + 1, '#2a1a2a');   // lashes
    }
  }
  // the mouth: lips sewn shut asleep; awake, torn open in a scream
  if (awake) jaws(p, hdx, hdy + 4.5, 5, 3 + s.jaw * 4, Math.max(0.5, s.jaw), { gum: '#3a0a14', lip: '#a898a8', fangs: 0, seed: 2, grin: -0.3, drool: '#2a1a2a' });
  else { p.line(hdx - 2, hdy + 4, hdx + 2, hdy + 4, '#6a4a5a'); for (let i = -2; i <= 2; i += 2) p.line(hdx + i, hdy + 3, hdx + i, hdy + 5, '#3a2a3a'); }
  // a ragged fringe, and two strands falling across the face
  for (let i = -5; i <= 5; i++) { const l = 2 + Math.round(h01(i, 9) * 3); for (let j = 0; j < l; j++) p.set(hdx + i, hdy - 5 + j, hair[j === l - 1 ? 1 : 2]); }
  for (const sx of [-2, 3]) for (let j = 0; j < 8; j++) p.set(hdx + sx + Math.round(Math.sin(j * 0.6) * 0.6), hdy - 2 + j, hair[1]);
  if (s.death > 0) melt(p, s.death, floor, 51, '#4a4a5a');
}
void jaws; void gash; void boils;
