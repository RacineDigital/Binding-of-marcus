// Chapter VI–VII bosses and the final forms, redrawn on the rig: the Thornwife, the Rime Bride, the
// Pendulum, the Typesetter, the Bookbinder, the Unwritten and the Author.
import type { PixelArt } from '../render/pixel';
import type { Pose } from './rig';
import { jaws, eyeball, brow, gash, boils, tatters, claw, veins, dribble, melt, ramp, hex, h01, TAU } from './kit';

// ------------------------------------------------------------------ The Thornwife
// Grandmother's prize rose, grown into a woman in the greenhouse. A body of twisted thorned stems
// rising out of a cracked clay pot, arms that are long whips of bramble, and a head that is a great red
// bloom: petals frame a pale sleeping face, until it opens and the face splits down the middle into a
// flower-mouth ringed with thorns.
export function paintThornwife(p: PixelArt, s: Pose): void {
  const open = Math.min(1, Math.max(s.x.open ?? 0, s.jaw > 0.6 ? (s.jaw - 0.6) * 2.5 : 0));
  const stem = ramp('#3a6a2a'), petal = ramp(s.phase ? '#a81a2a' : '#c8283a'), pot = ramp('#a8582a'), face = ramp('#efe0d8');
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 14);
  // the cracked pot, roots breaking out of it
  p.poly([cx - 13, floor - 16, cx + 13, floor - 16, cx + 10, floor, cx - 10, floor], pot[2]);
  p.shadeV(cx - 13, floor - 16, 26, 16, pot, 0.5); p.rect(cx - 15, floor - 18, 30, 3, pot[3]); p.rect(cx - 15, floor - 18, 30, 1, pot[4]);
  p.line(cx - 4, floor - 15, cx - 7, floor - 4, pot[0]); p.line(cx - 7, floor - 4, cx - 5, floor, pot[0]);
  for (const [x, a] of [[-10, 2.5], [9, 0.6], [-2, 1.7]] as [number, number][]) p.line(cx + x, floor - 2, cx + x + Math.cos(a) * 6, floor + 1, stem[1]);
  // the body: twisted stems braided into a woman's shape, thorns all over
  const top = floor - 44 + sink;
  for (let i = 0; i < 5; i++) {
    const x0 = cx - 6 + i * 3;
    for (let y = floor - 17; y > top + 8; y--) {
      const u = (floor - 17 - y) / 30;
      const x = x0 + Math.sin(y * 0.25 + i * 1.3 + s.t * TAU * 0.5) * 2 * (1 - u * 0.5) + (i - 2) * u * -1.2 + s.lean * u * 3;
      p.set(x, y, stem[(i + y) % 3 === 0 ? 3 : 2]); p.set(x + 1, y, stem[1]);
      if ((y + i * 5) % 7 === 0) p.set(x + ((i & 1) ? 2 : -1), y - 1, '#d8e8b0');   // thorns
    }
  }
  for (const [x, y] of [[-7, -24], [8, -30], [-5, -34]]) { p.ball(cx + x, floor + y + sink, 2.8, 1.6, stem); p.line(cx + x, floor + y + sink, cx + x * 1.4, floor + y + sink - 2, stem[3]); }   // leaves
  // bramble-whip arms, lashing up on the wind-up
  for (const side of [-1, 1]) {
    let x = cx + side * 5, y = top + 14, a = Math.PI / 2 + side * (0.9 - s.raise * 2.2) - (side > 0 ? Math.max(0, s.lean) : 0);
    for (let k = 0; k < 20; k++) {
      a += side * 0.08 * Math.sin(k * 0.5 + s.t * TAU);
      x += Math.cos(a) * 1.2; y += Math.sin(a) * 1.2;
      p.set(x, y, stem[2]); p.set(x, y + 1, stem[1]);
      if (k % 3 === 0) p.set(x + side, y - 1, '#d8e8b0');
    }
    p.set(x, y, '#8a1a2a');   // the tip drips red
  }
  // the head: a rose bloom; petals frame a pale face that splits into a thorned flower-mouth
  const hx = cx + Math.round(s.lean * 3), hy = top + 2 + Math.round(-Math.max(0, -s.lean) * 3) + Math.round(s.hurt * 2);
  const spread = 1 + open * 0.35;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2, r = 9 * spread;
    p.ball(hx + Math.cos(a) * r * 0.75, hy + Math.sin(a) * r * 0.7, 5.5, 4.5, petal, { dither: 0.4 });
  }
  p.ball(hx, hy - 4, 8, 5, petal, { dither: 0.3 });
  if (open < 0.25) {
    // asleep: a pale porcelain face, closed eyes, a little red mouth
    p.ball(hx, hy + 1, 6.5, 7.5, face, { dither: 0.2 });
    p.ball(hx, hy + 5, 5, 3, ramp('#e8c8c0'), { dither: 0.6 });
    for (const side of [-1, 1]) {
      // closed eyes, heavy lids and long lashes, dreaming
      p.line(hx + side * 4.5, hy - 1, hx + side * 1.2, hy - 0.5, '#4a1a20'); p.line(hx + side * 4.5, hy - 1.5, hx + side * 1.4, hy - 1.5, '#c8a8a0');
      for (let i = 0; i < 3; i++) p.set(hx + side * (1.6 + i * 1.2), hy + 0.5, '#4a1a20');
      p.ball(hx + side * 3.8, hy + 3, 1.6, 1, ramp('#e89aa0'));   // a flush on the cheeks
    }
    // a little rosebud mouth that smiles far too wide at the corners
    p.ball(hx, hy + 5, 1.8, 1.2, ramp('#a8202e')); p.line(hx - 2, hy + 5, hx - 4.5, hy + 3.5, '#6a1420'); p.line(hx + 2, hy + 5, hx + 4.5, hy + 3.5, '#6a1420');
    if (s.phase) dribble(p, hx - 2, Math.round(hy + 1), 4, '#a8202e');   // weeping sap
  } else {
    // the face has split down the middle into a mouth; two eyes peer out from the halves
    const g = 1 + open * 5;
    p.ball(hx - g, hy + 1, 5, 7.5, face); p.ball(hx + g, hy + 1, 5, 7.5, face);
    p.ellipse(hx, hy + 2, g, 6.5, '#2a0408');
    p.ellipse(hx, hy + 3, g * 0.5, 4, '#7a1424');
    for (let y = -4; y <= 7; y += 2) { p.set(hx - g + 1, hy + 2 + y, '#e8f0c8'); p.set(hx + g - 1, hy + 3 + y, '#e8f0c8'); }   // thorn teeth
    eyeball(p, s, hx - g - 1, hy - 1, 1.7, '#3a8a2a', { sclera: '#f8f0e8', anger: 0.6, side: -1, veins: 1 });
    eyeball(p, s, hx + g + 1, hy - 1, 1.7, '#3a8a2a', { sclera: '#f8f0e8', anger: 0.6, side: 1, veins: 1 });
  }
  if (s.death > 0) melt(p, s.death, floor, 121, '#3a5a2a');
}

// ------------------------------------------------------------------ The Rime Bride
// A bride who waited at the altar until she froze. A wedding gown gone grey and stiff with ice,
// icicles hanging from the hem, a bouquet of dead black flowers, and a long frosted veil. When she
// lifts the veil, her face is blue, her lips black, her eyes frosted white with a pinprick of light,
// and her teeth are icicles.
export function paintBride(p: PixelArt, s: Pose): void {
  const veilUp = Math.max(s.raise, s.x.veil ?? 0);
  const gown = ramp('#d8e0e8'), ice = ramp('#a8d8f0'), skin = ramp('#8eaed0'), veil = ramp('#eef4fa');
  const floor = p.h - 2, cx = p.w / 2;
  const bob = Math.round(s.breath * 1.5), hover = 4 + Math.round(s.death * -4);
  const bottom = floor - hover + bob;
  const hx = cx + Math.round(s.lean * 2), hy = bottom - 43 + Math.round(-Math.max(0, -s.lean) * 2) + Math.round(s.hurt * 2);
  // the long veil behind her, falling from the crown to the floor and blowing in a cold draught
  for (let y = hy - 6; y < bottom - 2; y++) {
    const u = (y - hy + 6) / (bottom - hy + 4), half = 6 + u * 21 + Math.sin(y * 0.18 + s.t * TAU) * 2 * u;
    // sheer: only its hems and a few creases show, so the gown and her shape still read through it
    for (let x = -half; x <= half; x++) { const edge = Math.abs(x) > half - 1.5; if (edge || ((Math.round(x) + y) % 2 === 0 && h01(Math.round(x * 0.3), Math.round(y * 0.2)) < 0.35)) p.set(hx + x * (1 - u * 0.15) + u * 3 * Math.sin(s.t * TAU), y, edge ? '#8aa0b8' : '#b8c8d8'); }
  }
  // the gown: a wide stiff bell, frost crusting the skirt, icicles hanging off the hem
  p.poly([cx - 6, bottom - 34, cx + 6, bottom - 34, cx + 17, bottom - 3, cx - 17, bottom - 3], gown[2]);
  p.shadeV(cx - 17, bottom - 34, 34, 31, gown, 0.5);
  for (let x = -14; x <= 14; x += 4) p.line(cx + x * 0.4, bottom - 30, cx + x, bottom - 4, gown[1]);
  for (let i = 0; i < 9; i++) { const x = cx - 16 + i * 4; const l = 3 + Math.round(h01(i, 4) * 5); for (let j = 0; j < l; j++) p.set(x, bottom - 3 + j, j === l - 1 ? '#ffffff' : ice[2 + (j & 1)]); }
  for (const [x, y] of [[-10, -12], [6, -8], [-4, -20], [11, -18]]) { p.set(cx + x, bottom + y, ice[4]); p.set(cx + x + 1, bottom + y + 1, ice[3]); }
  tatters(p, cx - 17, cx + 17, bottom - 4, 3, '#a8b8c8', 23, s.breath * 0.5);
  // a lace bodice and thin blue arms; the bouquet of dead black flowers held in front
  const by = bottom - 32;
  p.poly([cx - 6, by - 3, cx + 6, by - 3, cx + 4, by + 6, cx - 4, by + 6], gown[3]);
  for (let x = -5; x <= 5; x += 2) p.set(cx + x, by - 2, gown[4]);
  p.tube(cx - 6, by - 2, cx - 7, by + 8, 1.6, skin); p.tube(cx - 7, by + 8, cx - 2, by + 12, 1.4, skin);
  const rx = cx + 4 + Math.round(veilUp * 5), ry = by + 11 - Math.round(veilUp * 18);
  p.tube(cx + 6, by - 2, cx + 8, by + 4 - veilUp * 8, 1.6, skin); p.tube(cx + 8, by + 4 - veilUp * 8, rx, ry, 1.4, skin);
  claw(p, rx, ry, -Math.PI / 2 * veilUp + Math.PI / 2 * (1 - veilUp), 0.6, '#7a9ac0', '#e8f4ff', 3, 3);
  p.ball(cx - 1, by + 13, 4.4, 3.6, ramp('#2a2a34'));
  for (const [x, y] of [[-3, 11], [1, 10], [-1, 14], [2, 13], [-4, 14]]) { p.ball(cx + x, by + y, 1.5, 1.3, ramp('#4a3a4a')); p.set(cx + x, by + y, '#a8d8f0'); }
  for (let j = 0; j < 6; j++) p.set(cx - 1 + (j % 2), by + 16 + j, '#3a4a2a');
  // the head: frost-blue, cheeks sunken, the eyes frosted white with a cold light far back
  p.line(cx, by - 4, hx, hy + 6, skin[2], 3);
  p.ball(hx, hy, 6.5, 7.5, skin, { dither: 0.25 });
  p.ball(hx, hy - 6, 6.5, 3, ramp('#c8d8e8'), { dither: 0.4 });   // hair, pinned up and frozen white
  for (const side of [-1, 1]) {
    const ex = hx + side * 2.7, ey = hy - 0.5;
    p.ellipse(ex, ey + 0.5, 2.6, 2.4, '#3a4a6a');   // sunken sockets
    p.ellipse(ex, ey, 2, 1.8, '#e8f4ff');
    if (veilUp > 0.3 && s.hurt < 0.6) s.eyes.push({ x: ex, y: ey, r: 1.4, iris: '#c8f0ff', pupil: '#3a98d8', glint: false });
    p.line(hx + side * 1, hy - 3.5, hx + side * 5, hy - 3 + (veilUp > 0.3 ? side * -0.8 : 0.5), '#3a5a7a');
    p.line(hx + side * 4, hy + 2, hx + side * 3, hy + 4, skin[1]);   // hollow cheeks
  }
  jaws(p, hx, hy + 4.5, 7, 2 + s.jaw * 4, Math.max(0.3, s.jaw), { gum: '#0a0a1a', lip: '#1a1a2a', tooth: '#e8f8ff', fangs: 2, seed: 15, grin: -0.2, drool: '#c8e8f8' });
  for (const [x, y] of [[-4, -4], [3, 3], [5, -2], [-5, 3]]) p.set(hx + x, hy + y, '#e8f4ff');   // frost on the skin
  if (s.phase) { p.line(hx - 5, hy - 5, hx - 1, hy + 3, '#e8f4ff'); p.line(hx - 1, hy + 3, hx + 1, hy + 7, '#e8f4ff'); p.line(hx - 3, hy - 1, hx - 6, hy + 1, '#e8f4ff'); }
  // the blusher veil: down over her face (you can see her through it), or folded back over her head
  if (veilUp < 0.5) {
    for (let y = hy - 8; y < hy + 10; y++) {
      const half = 7.5 + (y - hy + 8) * 0.25 + Math.sin(y * 0.5 + s.t * TAU) * 0.6;
      for (let x = Math.round(-half); x <= Math.round(half); x++) if (Math.abs(x) >= half - 1 || y === hy + 9 || ((x + y) % 2 === 0 && y % 3 !== 0)) p.set(hx + x, y, Math.abs(x) >= half - 1 || y === hy + 9 ? veil[2] : '#dce8f4');
    }
    for (const side of [-1, 1]) { p.set(hx + side * 2.7, hy - 0.5, '#c8f0ff'); p.set(hx + side * 2.7 + 1, hy - 0.5, '#5ab8e8'); }   // her eyes, faintly lit through it
  } else {
    p.ball(hx, hy - 7, 8.5, 3.5, veil, { dither: 0.5 });
    for (let x = -8; x <= 8; x += 2) p.set(hx + x, hy - 4, veil[1]);
  }
  // a crown of frozen flowers
  for (let i = -3; i <= 3; i++) { p.ball(hx + i * 2.3, hy - 8 - (Math.abs(i) < 2 ? 1 : 0), 1.4, 1.3, ramp(i % 2 ? '#c8d8e8' : '#a8c8e0')); }
  if (s.death > 0) melt(p, s.death, floor, 131, '#5a7a9a');
}

// ------------------------------------------------------------------ The Pendulum
// The hall clock that stopped when Grandmother died, and started again. A tall walnut case on clawed
// feet. Its dial is a face: two eyes set among the numerals, the hands for angry brows. Below, the
// glass door of the case is a mouth full of teeth, and the pendulum swings in it like a tongue.
export function paintPendulum(p: PixelArt, s: Pose): void {
  const wood = ramp(s.phase ? '#4a2416' : '#5a2e1a'), brass = ramp('#d8a840'), dial = ramp('#efe4c8');
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 4 + s.death * 12);
  const top = floor - 78 + sink, W = 15;
  const swing = Math.sin(s.t * TAU) * (0.55 + (s.x.swing ?? 0) * 0.3) + s.lean * 0.3;
  // clawed feet
  for (const side of [-1, 1]) claw(p, cx + side * 11, floor - 1, Math.PI / 2, 0.4, '#3a1c10', '#e8dcc0', 3, 3);
  // the tall case: a hood, a waist and a base
  p.rect(cx - W - 2, floor - 14, W * 2 + 4, 13, wood[2]); p.rect(cx - W - 2, floor - 14, W * 2 + 4, 2, wood[4]);
  p.rect(cx - W + 2, top + 30, W * 2 - 4, floor - 14 - top - 30, wood[2]); p.shadeV(cx - W + 2, top + 30, W * 2 - 4, floor - 14 - top - 30, wood, 0.5);
  p.rect(cx - W, top, W * 2, 32, wood[2]); p.shadeV(cx - W, top, W * 2, 32, wood, 0.4);
  p.poly([cx - W - 3, top + 2, cx, top - 9, cx + W + 3, top + 2], wood[3]);   // the pediment
  p.ball(cx, top - 6, 2.4, 2.4, brass); p.set(cx - 1, top - 7, brass[4]);
  for (const side of [-1, 1]) { p.ball(cx + side * (W + 1), top + 1, 2, 2, brass); }   // finials
  // the dial: a face. Numerals round the rim, eyes, hands for brows
  const fx = cx, fy = top + 15;
  p.ball(fx, fy, 12, 12, dial, { dither: 0.15 }); p.ring(fx, fy, 12, brass[2], 1.5); p.ring(fx, fy, 10, brass[4], 0.6);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p.set(fx + Math.cos(a) * 9, fy + Math.sin(a) * 9, '#2a1a10'); if (i % 3 === 0) p.set(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8, '#2a1a10'); }
  for (const side of [-1, 1]) eyeball(p, s, fx + side * 4.5, fy - 1, 2.8, s.phase ? '#c82a2a' : '#3a2a1a', { sclera: '#f8f0d8', socket: '#3a2a1a', anger: 0.65 + s.phase * 0.3, side, veins: 2 });
  // the hands, black and sharp, cut down across the eyes like a scowl
  p.line(fx - 9, fy - 6 + Math.round(s.hurt * -1), fx - 1, fy - 3, hex('#14100a'), 2); p.line(fx + 1, fy - 3, fx + 9, fy - 7 + Math.round(s.hurt * -1), hex('#14100a'), 2);
  p.ball(fx, fy - 3, 1.4, 1.4, brass);
  jaws(p, fx, fy + 6, 9, 3 + s.jaw * 2, Math.max(0.25, s.jaw * 0.8), { gum: '#3a1a10', lip: '#c8b890', fangs: 0, seed: 17, grin: 0.5, drool: null });
  // the glass door: a long mouth with teeth down both sides, the pendulum swinging inside like a tongue
  const my = top + 34, mh = floor - 16 - my, mw = 18;
  p.rect(cx - mw / 2, my, mw, mh, '#12080a');
  p.ball(cx, my + mh * 0.6, mw * 0.35, mh * 0.35, ramp('#4a0a14'), { dither: 0.6 });
  for (let y = my + 1; y < my + mh - 1; y += 3) { p.set(cx - mw / 2, y, '#efe2c0'); p.set(cx - mw / 2 + 1, y + 1, '#c8b890'); p.set(cx + mw / 2 - 1, y + 1, '#efe2c0'); p.set(cx + mw / 2 - 2, y + 2, '#c8b890'); }
  const px = cx + Math.sin(swing) * 6, py = my + 2 + Math.cos(swing) * (mh - 9);
  p.line(cx, my + 1, px, py, brass[1]);
  p.ball(px, py, 4, 4, brass); p.set(px - 1.5, py - 1.5, brass[4]);
  if (s.phase) { gash(p, cx - W + 4, top + 32, cx - W + 8, top + 50, { stitch: '', blood: '#2a1008' }); p.line(fx - 7, fy - 9, fx + 2, fy + 4, '#a89878'); }
  if (s.death > 0) melt(p, s.death, floor, 141, '#2a1a10');
}

// ------------------------------------------------------------------ The Typesetter
// The print shop's press, grown hungry. An iron press on squealing rollers whose platen opens like a
// jaw lined with backwards lead letters for teeth, a long tongue of printed paper rolling out of it, and
// two typewriter keys on stalks for eyes. Ink drips from everything.
export function paintPress(p: PixelArt, s: Pose): void {
  const open = Math.min(1, Math.max(s.x.open ?? 0, s.jaw > 0.6 ? (s.jaw - 0.6) * 2.5 : 0));
  const iron = ramp(s.phase ? '#3a3440' : '#3a3e4a'), brass = ramp('#c89a3a'), lead = ramp('#a8a8b4');
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 5 + s.death * 12);
  // rollers for feet, turning
  for (const side of [-1, 1]) {
    const rx = cx + side * 20;
    p.ball(rx, floor - 5, 5, 5, iron); for (let i = 0; i < 4; i++) { const a = s.t * TAU * (s.anim === 'move' ? 2 : 0.5) + i * 1.57; p.line(rx, floor - 5, rx + Math.cos(a) * 4, floor - 5 + Math.sin(a) * 4, iron[0]); }
  }
  // the bed: a heavy iron slab
  const bedY = floor - 14 + sink;
  p.rect(cx - 28, bedY, 56, 8, iron[2]); p.rect(cx - 28, bedY, 56, 2, iron[4]); p.rect(cx - 28, bedY + 7, 56, 1, iron[0]);
  for (let x = -26; x < 26; x += 6) { p.set(cx + x, bedY + 3, brass[3]); p.set(cx + x, bedY + 4, brass[1]); }
  // the paper tongue rolling out of the jaws, covered in print
  const tl = 10 + Math.round(open * 14);
  for (let j = 0; j < tl; j++) { const x = cx + 6 + Math.round(Math.sin(j * 0.35 + s.t * TAU) * 2); p.rect(x - 4, bedY - 2 + j, 9, 1, (j % 3) ? '#efe6d0' : '#d8ccb0'); if (j % 2) p.set(x - 2 + (j % 5), bedY - 2 + j, '#2a2a34'); }
  // the platen: the upper jaw, lifting open; lead type for teeth top and bottom
  const gape = Math.round(4 + open * 14 + Math.max(0, -s.lean) * 4);
  const jy = bedY - gape;
  p.rect(cx - 24, bedY - 3, 48, 3, '#14101a');
  p.rect(cx - 24, jy - 4, 48, gape + 1, '#14080c');
  p.ball(cx, jy + gape / 2, 18, gape / 2 + 1, ramp('#5a0a18'), { dither: 0.6 });
  for (let x = -22; x < 22; x += 3) {
    const tl2 = 2 + Math.round(h01(x, 2) * 2), bl = 2 + Math.round(h01(x, 6) * 2);
    for (let j = 0; j < tl2; j++) p.set(cx + x, jy - 3 + j, j === tl2 - 1 ? lead[1] : lead[3]);
    for (let j = 0; j < bl; j++) p.set(cx + x + 1, bedY - 3 - j, j === bl - 1 ? lead[1] : lead[3]);
  }
  // the head: the press's iron crown above the platen, with a screw-wheel on top
  const hy = jy - 22 + Math.round(s.hurt * 2);
  p.rect(cx - 26, hy, 52, 19, iron[2]); p.shadeV(cx - 26, hy, 52, 19, iron, 0.4);
  p.rect(cx - 26, hy, 52, 2, iron[4]); p.rect(cx - 26, hy + 17, 52, 2, iron[0]);
  p.rect(cx - 1, hy - 10, 3, 10, iron[1]); p.ring(cx, hy - 11, 6, brass[2], 1.6);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + s.t * TAU * 0.25; p.set(cx + Math.cos(a) * 6, hy - 11 + Math.sin(a) * 6, brass[4]); }
  // a face on the crown: typewriter-key eyes bulging out of their sockets on stalks, heavy iron brows
  // bolted down over them in a scowl, and a big brass screw for a nose
  for (const side of [-1, 1]) {
    const ex = cx + side * 12, ey = hy + 2 - Math.round(Math.abs(s.breath) + s.raise * 3);
    p.ball(cx + side * 12, hy + 8, 5, 3, ramp('#14141a'));
    p.line(cx + side * 12, hy + 8, ex, ey + 3, iron[1], 3);
    p.ball(ex, ey, 5.5, 5, ramp('#1a1a22')); p.ring(ex, ey, 5.5, brass[2], 1);
    eyeball(p, s, ex, ey, 4, s.phase ? '#ff4a3a' : '#e8c040', { sclera: '#efe6d0', socket: '#14141a', anger: 0.75, side, veins: 2 });
    brow(p, ex - 6, ey - 6 + (side < 0 ? 0 : 3), 12, side < 0 ? 3 : -3, '#2a2a34', 3);
    for (const k of [-5, 5]) p.set(ex + k, ey - 5 + (side * k > 0 ? 0 : 3) + 1, brass[4]);   // rivets in the brows
  }
  p.ball(cx, hy + 11, 2.5, 2.5, brass); p.line(cx - 2, hy + 11, cx + 2, hy + 11, brass[0]);
  for (const x of [-20, -8, 9, 19]) dribble(p, cx + x, hy + 19, 2 + (Math.abs(x) % 4), '#14122a', '#4a4a8a');
  if (s.phase) gash(p, cx - 20, hy + 4, cx - 12, hy + 14, { stitch: '', blood: '#14122a' });
  if (s.death > 0) melt(p, s.death, floor, 151, '#14122a');
}

// ------------------------------------------------------------------ The Bookbinder
// The man who made the Binding: the bookbinder from Grandfather's stories, stooped and long, in a
// leather apron, his eyes and mouth sewn shut with binding thread. He carries a bone folder and an
// awl as long as a sword. As he's hurt the stitches tear: first an eye, then the mouth.
export function paintBinder(p: PixelArt, s: Pose): void {
  const raise = Math.max(s.raise, s.x.raise ?? 0);
  const coat = ramp('#2a2236'), apron = ramp('#5a3a22'), skin = ramp('#b8aca4'), thread = '#e8d8a8';
  const floor = p.h - 2, cx = p.w / 2 - 2;
  const sink = Math.round(s.squash * 5 + s.death * 14);
  // long spindly legs, knees bent under the weight of the hump
  for (const side of [-1, 1]) {
    const fx = cx + side * 6 + Math.round(side * s.step * 3), kx = cx + side * 7, ky = floor - 13 + sink;
    p.tube(cx + side * 3, floor - 24 + sink, kx, ky, 2, coat); p.tube(kx, ky, fx, floor - 3, 1.8, coat);
    p.ball(fx + side * 2, floor - 1, 3.5, 1.6, ramp('#1a1418'));
  }
  // the long coat, sewn together out of old book covers: you can see their spines and titles
  const ty = floor - 46 + sink, lean = Math.round(s.lean * 3);
  p.poly([cx - 7 + lean, ty, cx + 9 + lean, ty - 2, cx + 13, floor - 13 + sink, cx - 12, floor - 13 + sink], coat[2]);
  p.shadeV(cx - 12, ty - 2, 25, floor - 11 - ty, coat, 0.5);
  const covers = ['#5a2a2a', '#2a3a5a', '#3a4a2a', '#4a3a5a', '#6a4a2a'];
  for (let i = 0; i < 6; i++) {
    const x = cx - 10 + (i % 3) * 7, y = ty + 6 + Math.floor(i / 3) * 12;
    p.rect(x, y, 6, 10, covers[i % covers.length]); p.rect(x, y, 6, 1, '#a89060'); p.rect(x + 1, y + 4, 4, 1, '#c8a860');
  }
  for (let y = ty + 4; y < floor - 14 + sink; y += 3) { p.set(cx - 4, y, thread); p.set(cx + 3, y + 1, thread); }   // the seams
  tatters(p, cx - 12, cx + 13, floor - 14 + sink, 6, '#2a2236', 31, s.step * 0.6);
  // the hump on his back, and a leather apron hung on the front with an awl and a bone folder in it
  p.ball(cx - 7 + lean, ty + 2, 8, 7, coat, { dither: 0.3 });
  p.poly([cx - 3 + lean, ty + 8, cx + 8 + lean, ty + 6, cx + 9, floor - 16 + sink, cx - 3, floor - 16 + sink], apron[2]);
  p.shadeV(cx - 3, ty + 6, 12, floor - 22 - ty + sink, apron, 0.5);
  p.line(cx + 1, ty + 12, cx + 1, ty + 18, hex('#c8c8d0')); p.line(cx + 5, ty + 12, cx + 5, ty + 17, hex('#e8dcc0'));
  // threads trailing everywhere from the needle
  for (const x of [-12, 11]) for (let j = 0; j < 12; j++) p.set(cx + x + Math.round(Math.sin(j * 0.6 + s.t * TAU) * 1.4), ty + 4 + j * 1.5, thread);
  // arms: long and bony, with long fingers. The left pulls a thread; the right raises the great needle
  p.tube(cx - 6 + lean, ty + 4, cx - 12, ty + 16, 1.6, coat); p.tube(cx - 12, ty + 16, cx - 14, ty + 26, 1.3, skin);
  claw(p, cx - 14, ty + 27, Math.PI / 2 + 0.3, 0.6, '#a89c94', '#d8ccc0', 3, 4);
  const shx = cx + 7 + lean, shy = ty + 4, armA = 0.9 - raise * 2.4 + Math.max(0, s.lean) * 0.6;
  const ex2 = shx + Math.cos(armA) * 9, ey2 = shy + Math.sin(armA) * 9;
  const hx = ex2 + Math.cos(armA - 0.4) * 8, hy = ey2 + Math.sin(armA - 0.4) * 8;
  p.tube(shx, shy, ex2, ey2, 1.6, coat); p.tube(ex2, ey2, hx, hy, 1.3, skin);
  const aa = armA - 0.5 - raise * 0.4;
  claw(p, hx, hy, aa, 0.5, '#a89c94', '#d8ccc0', 3, 3);
  // the needle: as long as he is tall, with its eye threaded
  const nx0 = hx - Math.cos(aa) * 4, ny0 = hy - Math.sin(aa) * 4, nx1 = hx + Math.cos(aa) * 26, ny1 = hy + Math.sin(aa) * 26;
  p.line(nx0, ny0, nx1, ny1, hex('#c8c8d4'), 2); p.line(nx0, ny0, nx1, ny1, hex('#ffffff'));
  p.ring(nx0, ny0, 1.5, '#8a8a94', 1);
  for (let j = 0; j < 10; j++) p.set(nx0 - j * 0.6, ny0 + j * 1.3 + Math.sin(j + s.t * TAU), thread);
  // the head: jutting forward and low on a long neck, bald and grey, eyes sewn shut with thick
  // black X stitches over sunken sockets, the mouth sewn shut across its whole width
  const hdx = cx + 8 + lean + Math.round(Math.max(0, s.lean) * 2), hdy = ty - 3 + Math.round(-Math.max(0, -s.lean) * 3) + Math.round(s.hurt * 2);
  p.tube(cx + 3 + lean, ty + 2, hdx - 2, hdy + 5, 2.6, skin);
  p.ball(hdx, hdy, 7, 8.5, skin, { dither: 0.25 });
  p.ellipse(hdx - 1, hdy - 6, 4, 1.5, skin[3]);   // a bald, shining crown
  for (const side of [-1, 1]) {
    const ex = hdx + side * 3, ey = hdy - 1;
    p.ellipse(ex, ey, 2.6, 2.4, '#5a4a4a');
    const torn = (s.phase >= 1 && side > 0) || s.phase >= 2;
    if (torn) {
      // the stitches have torn through: a red, staring eye, the threads still hanging off it
      eyeball(p, s, ex, ey, 2.2, '#c82a2a', { sclera: '#f0d8c8', socket: '#3a0a10', anger: 0.85, side, veins: 3 });
      p.line(ex - 2, ey - 3, ex - 3, ey + 2, thread); p.line(ex + 2, ey + 3, ex + 3, ey + 6, thread);
      dribble(p, Math.round(ex), Math.round(ey + 2), 4, '#8a1a24');
    } else {
      p.line(ex - 2, ey - 2, ex + 2, ey + 2, '#0a0408', 1); p.line(ex - 2, ey + 2, ex + 2, ey - 2, '#0a0408', 1);
      p.set(ex - 2, ey - 2, thread); p.set(ex + 2, ey + 2, thread);
    }
    brow(p, ex - 2.5, ey - 4 - (side > 0 ? 0 : 1), 5, side * 1.2, '#6a5a5a', 1);
  }
  p.line(hdx - 1, hdy + 1, hdx, hdy + 3, skin[1]);   // a long thin nose
  if (s.phase >= 2 || s.jaw > 0.85) {
    // the mouth rips open, threads snapping
    jaws(p, hdx, hdy + 5, 7, 3 + s.jaw * 5, Math.max(0.5, s.jaw), { gum: '#5a0a18', lip: '#8a6a6a', fangs: 2, seed: 19, grin: 0.3, drool: '#8a1a24' });
    for (let i = -5; i <= 5; i += 3) p.line(hdx + i, hdy + 3, hdx + i + 1, hdy + 1, thread);
  } else {
    p.line(hdx - 5, hdy + 5, hdx + 5, hdy + 5, '#2a1414'); p.line(hdx - 5, hdy + 5, hdx - 6, hdy + 4, '#2a1414'); p.line(hdx + 5, hdy + 5, hdx + 6, hdy + 4, '#2a1414');
    for (let i = -4; i <= 4; i += 2) p.line(hdx + i, hdy + 3.5, hdx + i, hdy + 6.5, '#0a0408');
  }
  if (s.death > 0) melt(p, s.death, floor, 161, '#2b2f66');
}

// ------------------------------------------------------------------ The Unwritten / The Author
// The Unwritten: everything the book left out. A towering hooded shape of wet ink, its robe hemmed
// with torn blank pages, long arms reaching out of it with claws of nib-steel. Under the peaked hood
// there's no face: a hole full of eyes, and a ring of half-formed letters for teeth.
export function paintUnwritten(p: PixelArt, s: Pose): void {
  const rage = s.x.rage ?? 0, hot = rage || s.phase;
  const ink = ramp('#1a1636'), deep = ramp('#06040e'), pg = ramp('#e6dcc0'), glow = rage ? '#ff3050' : '#a89aff';
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 20);
  const top = floor - 90 + sink, lean = Math.round(s.lean * 4);
  // a pool of ink spreading under it
  p.ellipse(cx, floor, 38, 3.5, '#0a081a'); p.ellipse(cx - 10, floor - 1, 12, 1, '#2a2a5a');
  // the robe: narrow at the shoulders, flaring to a hem of torn pages, ink running down it
  const sh = top + 30;
  for (let y = sh; y < floor - 1; y++) {
    const u = (y - sh) / (floor - sh), half = 13 + u * 21 + Math.sin(y * 0.3 + s.t * TAU) * 1.2, dx = Math.round(lean * (1 - u));
    for (let x = Math.round(-half); x <= Math.round(half); x++) p.set(cx + x + dx, y, x < -half + 2 ? ink[3] : x > half - 4 ? ink[0] : (x + 40) % 9 === 0 ? ink[1] : ink[2]);
  }
  for (let i = 0; i < 12; i++) { const x = cx - 32 + i * 5.5, l = 3 + Math.round(h01(i, 9) * 5); p.poly([x, floor - 3, x + 5, floor - 3, x + 2 + h01(i, 3) * 2, floor - 3 + l], pg[1 + (i % 3)]); }
  if (hot) for (const [x, y] of [[-14, 20], [9, 34], [-4, 46], [16, 52]]) { p.line(cx + x, sh + y, cx + x + 3, sh + y + 6, '#3a0a18', 2); p.line(cx + x, sh + y, cx + x + 3, sh + y + 6, glow); }
  // pages stuck to it, flapping
  for (let i = 0; i < 6; i++) {
    const x = cx - 22 + h01(i, 1) * 40, y = sh + 10 + h01(i, 2) * 40, a = Math.sin(s.t * TAU + i) * 0.4;
    p.poly([x, y, x + 6 * Math.cos(a), y - 3, x + 7 * Math.cos(a), y + 5, x + 1, y + 7], pg[2 + (i % 2)]);
    for (let k = 1; k < 4; k++) p.line(x + 1, y + k * 1.6, x + 5 * Math.cos(a), y - 1 + k * 1.6, '#4a4a6a');
  }
  // The unfinished skeleton presses through the robe: asymmetrical, quill-like ribs.
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const yy = sh + 10 + i * 7, root = cx + lean + side * (12 + i * 2);
    const bend = Math.sin(s.t * TAU + i) * 1.3;
    p.tube(root, yy, root + side * 8, yy - 4 + bend, 1.1, pg);
    p.line(root + side * 8, yy - 4 + bend, root + side * 11, yy - 9 + bend, '#a89aaf');
    p.set(root, yy + 1, '#0d081c');
  }
  // long arms reaching out of the robe, with claws like pen nibs, dripping
  for (const side of [-1, 1]) {
    const shx = cx + side * 13 + lean, shy = sh + 2, a = Math.PI / 2 + side * (0.55 - s.raise * 1.5 + Math.max(0, s.lean) * 0.3);
    const ex = shx + Math.cos(a) * 15, ey = shy + Math.sin(a) * 15, b = a - side * 0.35;
    const hx = ex + Math.cos(b) * 14, hy = ey + Math.sin(b) * 14;
    p.tube(shx, shy, ex, ey, 4, ink); p.tube(ex, ey, hx, hy, 3, ink);
    claw(p, hx, hy, b, 0.9, '#2a2440', '#c8c8d8', 4, 7);
    dribble(p, Math.round(ex), Math.round(ey + 3), 4, '#1a1636', '#4a4a9a');
  }
  // the peaked hood, leaning in at you
  const hx = cx + lean, hy = top + 16 + Math.round(s.hurt * 2);
  p.poly([hx - 18, hy + 16, hx - 15, hy - 6, hx - 4 + lean, hy - 20, hx + 6 + lean * 2, hy - 23, hx + 15, hy - 6, hx + 18, hy + 16], ink[2]);
  p.ball(hx, hy, 16, 16, ink, { dither: 0.3 });
  p.poly([hx + 2 + lean, hy - 20, hx + 6 + lean * 2, hy - 23, hx + 9, hy - 10], ink[4]);
  for (const side of [-1, 1]) p.line(hx + side * 15, hy - 4, hx + side * 17, hy + 15, side < 0 ? ink[4] : ink[0], 2);
  // the hole: a void full of eyes, ringed with letter-teeth
  p.ellipse(hx, hy + 3, 12, 13, deep[1]); p.ellipse(hx, hy + 4, 10, 11, deep[0]);
  const eyesAt: [number, number, number][] = [[-5, -3, 3.6], [5, -2, 3.2], [0, -8, 2.6], [-7, 4, 2.2], [7, 5, 2], [0, 2, 3]];
  eyesAt.slice(0, hot ? 6 : 4).forEach(([x, y, r], i) => eyeball(p, s, hx + x, hy + y, r, glow, { sclera: '#e6dcc0', socket: '#06040e', side: x < 0 ? -1 : 1, anger: 0.45, veins: hot ? 2 : 1, lid: (i === 2 && Math.sin(s.t * TAU) > 0.6) ? 0.8 : 0 }));
  const my = hy + 10, gape = s.jaw * 3;
  for (let i = -7; i <= 7; i += 2) { const l = 2 + ((i + 9) % 3); p.rect(hx + i, my - gape * 0.3, 1, l, pg[3]); p.set(hx + i, my - gape * 0.3, pg[4]); }
  for (let i = -6; i <= 6; i += 2) { const l = 1 + ((i + 8) % 3); p.rect(hx + i, my + 4 + gape - l, 1, l, pg[2]); }
  if (s.death > 0) melt(p, s.death, floor, 171, '#14112a');
}
// The Author: Grandfather as he was when he first picked up the pen, in a white and gold cowl under a
// halo of quill nibs. In one hand the great quill, in the other the open book. His face is a blank page
// with one ink eye that weeps; raging, the page tears and ink bleeds up through the robe.
export function paintAuthor(p: PixelArt, s: Pose): void {
  const rage = s.x.rage ?? 0, hot = rage || s.phase;
  const robe = ramp('#efe6d2'), gold = ramp('#d8b048'), pageC = ramp('#f4ecd8'), skin = ramp('#e8ccb8');
  const floor = p.h - 4, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 20);
  const top = floor - 70 + sink, lean = Math.round(s.lean * 3);
  const hx = cx + lean, hy = top - 6 + Math.round(s.hurt * 2);
  // the halo of quill nibs behind the head, slowly turning
  for (let i = 0; i < 13; i++) {
    const a = Math.PI * 0.9 + (i / 12) * Math.PI * 1.2 + Math.sin(s.t * TAU) * 0.05;
    const x = hx + Math.cos(a) * 20, y = hy - 2 + Math.sin(a) * 17;
    p.poly([x - 1.6, y, x + 1.6, y, x + Math.cos(a) * 7, y + Math.sin(a) * 7], gold[3 - (i % 2)]);
    p.line(x, y, x + Math.cos(a) * 4, y + Math.sin(a) * 4, gold[0]);
  }
  p.ring(hx, hy - 2, 16, gold[2], 1);
  // the robe: a bell of white, a gold stole down the front written over in tiny script
  for (let y = top + 8; y < floor; y++) {
    const k = (y - top - 8) / (floor - top - 8), half = 11 + k * 22 + Math.sin(y * 0.3 + s.t * TAU) * 1.2, dx = Math.round(lean * (1 - k));
    for (let x = Math.floor(-half); x < half; x++) p.set(cx + x + dx, y, robe[x > half * 0.45 ? 1 : x < -half * 0.6 ? 3 : 2]);
    p.set(Math.floor(cx - half) + dx, y, gold[3]); p.set(Math.ceil(cx + half) - 1 + dx, y, gold[1]);
  }
  for (const x of [-16, -8, 9, 17]) p.line(cx + x * 0.4, top + 12, cx + x, floor - 3, robe[1]);
  for (const side of [-1, 1]) {
    for (let y = top + 10; y < floor - 2; y++) { const x = cx + side * (3 + (y - top) * 0.06) + Math.round(lean * (1 - (y - top) / 70)); p.set(x, y, gold[2]); p.set(x + side, y, gold[side < 0 ? 3 : 1]); if (y % 3 === 0) p.set(x - side, y, '#5a4a2a'); }
  }
  for (let x = cx - 33; x < cx + 33; x += 2) { p.set(x, floor - 5, gold[(x % 4) ? 3 : 1]); p.set(x, floor - 3, gold[2]); }
  if (hot) for (let i = 0; i < (rage ? 14 : 7); i++) { const x = cx - 30 + i * (rage ? 4.4 : 9) + (i % 2); const h = 6 + ((i * 7 + Math.round(s.t * 12)) % (rage ? 18 : 10)); for (let j = 0; j < h; j++) p.set(x + Math.round(Math.sin(j * 0.6 + i) * 0.7), floor - 2 - j, j < 2 ? '#2a2450' : '#14112a'); }
  // the open book in his left hand, held out in front
  const bx = cx - 14 + lean, by = top + 30 + Math.round(s.breath);
  p.tube(cx - 10 + lean, top + 12, cx - 15 + lean, top + 24, 4, robe); p.tube(cx - 15 + lean, top + 24, bx + 2, by - 2, 3.5, robe);
  p.poly([bx - 9, by - 4, bx, by - 1, bx + 9, by - 4, bx + 9, by + 5, bx, by + 7, bx - 9, by + 5], pageC[3]);
  p.line(bx, by - 1, bx, by + 7, pageC[1]); p.poly([bx - 9, by + 5, bx, by + 7, bx + 9, by + 5, bx + 9, by + 6, bx, by + 8, bx - 9, by + 6], hex('#8a2a2a'));
  for (let k = 0; k < 3; k++) { p.line(bx - 7, by - 2 + k * 2, bx - 2, by - 0.5 + k * 2, '#8a7a60'); p.line(bx + 2, by - 0.5 + k * 2, bx + 7, by - 2 + k * 2, '#8a7a60'); }
  p.ball(bx - 2, by + 3, 2.4, 2, skin);
  // the great quill in his right hand: a white feather as long as his arm, its nib dripping ink
  const qa = -1.0 - s.raise * 0.45 + Math.max(0, s.lean) * 0.75;
  const qx = cx + 15 + lean, qy = top + 28;
  p.tube(cx + 10 + lean, top + 12, cx + 16 + lean, top + 22, 4, robe); p.tube(cx + 16 + lean, top + 22, qx, qy, 3.5, robe);
  const tx = qx + Math.cos(qa) * 40, ty = qy + Math.sin(qa) * 40, nx = qx - Math.cos(qa) * 9, ny = qy - Math.sin(qa) * 9;
  const px = -Math.sin(qa), py = Math.cos(qa);
  for (let i = 0; i <= 14; i++) {
    const k = 0.25 + i * 0.053, x = qx + Math.cos(qa) * 40 * k, y = qy + Math.sin(qa) * 40 * k, wv = Math.sin(k * Math.PI) * 5.5, fl = Math.sin(s.t * TAU + i * 0.6) * 0.5;
    p.line(x, y, x + px * (wv + fl) - Math.cos(qa) * 2, y + py * (wv + fl) - Math.sin(qa) * 2, robe[4]);
    p.line(x, y, x - px * (wv * 0.8 + fl) - Math.cos(qa) * 2, y - py * (wv * 0.8 + fl) - Math.sin(qa) * 2, robe[2]);
  }
  p.line(nx, ny, tx, ty, hex('#b8ab90'));
  p.line(nx, ny, qx - Math.cos(qa) * 3, qy - Math.sin(qa) * 3, hex('#2a2440'), 2);
  dribble(p, Math.round(nx), Math.round(ny + 1), 3, '#14112a', '#4a4a8a');
  p.ball(qx, qy, 2.6, 2.4, skin);
  // the cowl, gold-edged, and in it a face that is a blank page with one weeping ink eye
  p.poly([hx - 13, hy + 12, hx - 12, hy - 6, hx, hy - 15, hx + 12, hy - 6, hx + 13, hy + 12], robe[2]);
  p.ball(hx, hy, 12.5, 13, robe, { dither: 0.4 });
  for (let a = -2.6; a <= -0.5; a += 0.08) p.set(hx + Math.cos(a) * 12.5, hy + Math.sin(a) * 13, gold[3]);
  p.line(hx - 12, hy + 1, hx - 12, hy + 12, gold[2]); p.line(hx + 12, hy + 1, hx + 12, hy + 12, gold[1]);
  p.rect(hx - 7, hy - 7, 14, 17, pageC[3]); p.shadeV(hx - 7, hy - 7, 14, 17, pageC, 0.3);
  p.rect(hx - 7, hy - 7, 14, 1, pageC[4]); p.rect(hx + 6, hy - 6, 1, 16, pageC[1]);
  for (let y = hy - 4; y < hy + 9; y += 2) p.line(hx - 6, y, hx + 5, y, '#d8ccb0');   // faint ruled lines
  eyeball(p, s, hx, hy - 1, 4, rage ? '#c82a2a' : '#14112a', { sclera: '#fffaf0', socket: '#14112a', anger: rage ? 0.75 : 0.1, side: 1, veins: hot ? 3 : 0 });
  dribble(p, hx - 1, hy + 3, 5 + (hot ? 3 : 0), '#14112a', '#4a4a8a'); dribble(p, hx + 2, hy + 3, 3, '#14112a', '#4a4a8a');
  if (hot) { p.line(hx + 3, hy - 7, hx + 5, hy + 2, '#14112a'); p.line(hx + 5, hy + 2, hx + 3, hy + 9, '#14112a'); }
  if (rage) jaws(p, hx - 1, hy + 7, 6, 3 + s.jaw * 3, Math.max(0.4, s.jaw), { gum: '#14112a', lip: '#c8b890', fangs: 1, seed: 21, grin: 0.4, drool: '#14112a' });
  if (s.death > 0) melt(p, s.death, floor, 181, '#e8d8a0');
}
void boils; void veins;
