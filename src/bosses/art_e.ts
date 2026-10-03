// The hospital path's bosses, redrawn on the rig: the Iron Lung and The Patient.
import type { PixelArt } from '../render/pixel';
import type { Pose } from './rig';
import { jaws, eyeball, brow, gash, dribble, claw, veins, melt, ramp, hex, h01, TAU } from './kit';

// ------------------------------------------------------------------ The Iron Lung
// The machine on the ward that breathes for whoever's inside. A riveted iron drum on a wheeled stand,
// bellows heaving at one end. At the other end a gaunt old man's head sticks out of the collar,
// gasping, eyes bulging, and skeletal arms have pushed out through the portholes to drag the whole
// thing across the floor. In the red, the drum swells, rivets pop and steam screams out of the seams.
export function paintLung(p: PixelArt, s: Pose): void {
  const red = s.phase > 0;
  const iron = ramp(red ? '#6a6a74' : '#6a7a84'), dark = ramp('#2a3238'), brass = ramp('#c8a04a'), skin = ramp('#d8c0a8'), arm = ramp('#c8b0a0');
  const floor = p.h - 2;
  const sink = Math.round(s.squash * 4 + s.death * 8);
  const swell = red ? 1 : 0, inhale = Math.max(0, s.breath) * 1.5 + (s.anim === 'windup' ? s.k * 2 : 0);
  // the wheeled stand
  p.rect(14, floor - 10, 56, 4, dark[2]); p.rect(14, floor - 10, 56, 1, dark[4]);
  for (const x of [20, 62]) { p.ball(x, floor - 4, 4, 4, dark); const a = s.step * 2 + x; p.line(x, floor - 4, x + Math.cos(a) * 3, floor - 4 + Math.sin(a) * 3, '#8a8a92'); }
  // the drum, lying on its side, breathing
  const dy = 30 + sink - Math.round(inhale * 0.5), ry = 15 + swell + inhale * 0.6;
  p.ball(44, dy, 28 + swell, ry, iron, { dither: 0.4 });
  p.rect(18, dy - ry + 2, 52, ry * 2 - 3, iron[2]); p.shadeV(18, dy - ry + 2, 52, ry * 2 - 3, iron, 0.5);
  p.rect(18, dy - ry + 2, 52, 1, iron[4]);
  for (const x of [26, 42, 58]) { p.rect(x, dy - ry + 2, 2, ry * 2 - 3, iron[1]); for (let y = dy - ry + 4; y < dy + ry - 2; y += 4) p.set(x, y, iron[4]); }   // banded seams and rivets
  for (const x of [22, 41, 57]) for (let j = 0; j < 9; j++) p.set(x + (j % 2), dy + 2 + j, j % 3 ? '#8a5a3a' : '#6a4a3a');   // rust
  // the condemned tag, wired on
  p.rect(46, dy + 4, 9, 6, hex('#e8dca8')); p.rect(47, dy + 5, 7, 1, hex('#c83a3a')); p.rect(47, dy + 7, 5, 1, hex('#4a3a2a'));
  // gauges with twitching needles, in the red when it rages
  for (const [x, k] of [[62, 0], [67, 1]] as [number, number][]) {
    p.ball(x, dy - 8, 3, 3, ramp('#efe6d0')); p.ring(x, dy - 8, 3, brass[2]);
    const a = -Math.PI / 2 + (red ? 1.3 : 0.3) + Math.sin(s.t * TAU * 3 + k) * (red ? 0.4 : 0.6);
    p.line(x, dy - 8, x + Math.cos(a) * 2.5, dy - 8 + Math.sin(a) * 2.5, hex(red ? '#d02020' : '#1a1010'));
  }
  // the bellows heaving at the far end
  const bw = 6 + s.breath * 3 + inhale;
  for (let i = 0; i < 5; i++) p.rect(70 + i * (bw / 5), dy - 11 + i, 2, 22 - i * 2, i % 2 ? dark[1] : dark[3]);
  p.rect(70 + bw, dy - 9, 3, 18, iron[3]);
  // skeletal arms out of the portholes, clawing at the floor to drag it along
  for (const [px, k] of [[32, 0], [50, 1]] as [number, number][]) {
    p.ball(px, dy - 4, 4.5, 4.5, dark); p.ring(px, dy - 4, 4.5, brass[1], 1);
    const reach = (k ? -s.step : s.step) * 4 + s.raise * -6 + Math.max(0, s.lean) * 4;
    const hx = px - 7 + reach, hy = floor - 6 + Math.min(0, reach * 0.5);
    p.tube(px, dy - 4, px - 3, dy + 6, 1.4, arm); p.tube(px - 3, dy + 6, hx, hy, 1.2, arm);
    claw(p, hx, hy, Math.PI * 0.75, 0.9, '#b8a090', '#e8dcc0', 4, 3);
  }
  // the head at the near end, out of a rubber collar: gaunt, gasping, eyes bulging at you
  const hx = 9 + Math.round(-s.lean * 2), hy = dy - 2 + Math.round(s.hurt * 2);
  p.ball(16, dy, 4, 9, ramp('#3a3438'));   // the collar
  p.ball(hx, hy, 8, 9, skin, { dither: 0.3 });
  p.ball(hx + 1, hy - 7, 6, 3, ramp('#e8e4dc'), { dither: 0.6 });   // a few white hairs
  for (let i = 0; i < 4; i++) p.line(hx - 4 + i * 3, hy - 9, hx - 5 + i * 3, hy - 12 - (i % 2), '#e8e4dc');
  p.line(hx - 6, hy + 1, hx - 4, hy + 5, skin[1]); p.line(hx + 5, hy + 1, hx + 4, hy + 5, skin[1]);   // hollow cheeks
  for (const side of [-1, 1]) eyeball(p, s, hx + side * 3.3, hy - 2, 2.6, red ? '#c82a2a' : '#4a7a9a', { sclera: '#f4ecd8', socket: '#5a3a3a', anger: red ? 0.6 : -0.3, side, veins: red ? 3 : 2 });
  brow(p, hx - 6, hy - 5 + (red ? 1 : 0), 4, red ? 1.5 : -1.5, '#e8e4dc', 1); brow(p, hx + 2, hy - 5 + (red ? 1 : 0), 4, red ? -1.5 : 1.5, '#e8e4dc', 1);
  // the gasping mouth under a cracked breathing mask
  jaws(p, hx, hy + 5, 6, 3 + s.jaw * 4 + inhale, Math.max(0.35, s.jaw), { gum: '#3a0a10', lip: '#a87a6a', fangs: 0, seed: 23, grin: -0.4, drool: '#c8e0f0' });
  p.ball(hx, hy + 5, 4.5, 3.5, ramp('#a8c8d0'), { dither: 0.6 }); p.set(hx - 2, hy + 3, '#ffffff'); p.line(hx + 1, hy + 3, hx + 3, hy + 6, '#6a8a94');
  p.tube(hx + 2, hy + 8, 20, floor - 10, 1, ramp('#c8d8e0'));
  if (red) { for (const [x, y] of [[24, -10], [60, 8], [38, 12]]) { p.set(x, dy + y, '#ffffff'); p.set(x + 1, dy + y - 1, '#d8e8f0'); } gash(p, 36, dy - 12, 44, dy - 4, { stitch: '', blood: '#2a1a14' }); }
  if (s.death > 0) melt(p, s.death, floor, 191, '#3a4a54');
}

// ------------------------------------------------------------------ The Patient
// What Marcus imagined was in the bed at the end of the ward: something far too tall under a hospital
// sheet. The sheet clings to a face: you can see the shape of a mouth stretched open under it, and
// two holes have been torn for the eyes, which are wet and real and looking at you. A drip stand
// follows it on squealing wheels; the heart monitor glows through its chest. The more it forgets,
// the more the sheet tears, until a jaw far too wide hangs out of it, running with ink.
export function paintPatient(p: PixelArt, s: Pose): void {
  const ph = s.phase, rage = ph >= 2;
  const sheet = ramp('#dce4e0'), gown = ramp('#9ab8c0'), ink = ramp('#14112a'), steel = ramp('#9a9aa4'), skin = ramp('#c8b8b0');
  const cx = 44, floor = p.h - 4;
  const bob = Math.round(s.breath * 1.5) + Math.round(s.squash * 4 + s.death * 12);
  // the drip stand, a bag of something that isn't saline, a line into the arm
  p.rect(80, 14, 2, 80, steel[2]); p.rect(74, 92, 14, 2, steel[1]); p.rect(76, 12, 10, 2, steel[3]);
  for (const x of [75, 86]) p.ball(x, 95, 1.5, 1.5, steel);
  p.ball(81, 22, 5, 7, ramp(rage ? '#5a0a18' : ph ? '#7a8a6a' : '#c8e0f0'), { dither: 0.3 }); p.set(79, 19, '#ffffff');
  // the sheet, hanging off something too tall, hem trailing in points
  const lean = Math.round(s.lean * 3);
  for (let y = 16; y < floor - 6; y++) {
    const k = (y - 16) / (floor - 22), half = 12 + k * 20 + Math.sin(y * 0.25 + s.t * TAU) * 1.5, sh = Math.round(lean * (1 - k));
    for (let x = Math.floor(cx - half); x < cx + half; x++) p.set(x + sh, y + bob, sheet[(x - cx) > half * 0.45 ? 1 : (x - cx) < -half * 0.6 ? 3 : 2]);
  }
  for (let x = cx - 30; x < cx + 32; x += 6) p.poly([x, floor - 7 + bob, x + 6, floor - 7 + bob, x + 3, floor - 2 + bob + ((x * 7) % 3)], sheet[1]);
  for (const x of [-12, -2, 9, 20]) p.line(cx + x * 0.5 + lean, 30 + bob, cx + x, floor - 8 + bob, sheet[1]);   // folds
  // ink soaking up through the sheet as it forgets
  if (ph) for (let i = 0; i < 3 + ph * 3; i++) {
    const x = Math.round(cx - 22 + h01(i, 3) * 44), y = Math.round(44 + h01(i, 5) * 40) + bob, r = 1.5 + h01(i, 7) * 2.5;
    p.ellipse(x, y, r, r * 0.8, '#2a2440'); p.ellipse(x, y, r - 0.8, r * 0.8 - 0.8, '#14112a');
    for (let j = 0; j < 3 + Math.round(h01(i, 9) * 8); j++) p.set(x + (j > 4 ? 1 : 0), y + Math.round(r * 0.8) + j, '#14112a');
  }
  // the gown showing through where the sheet slipped, the hospital bracelet, Edda's name tape
  p.poly([cx - 12 + lean, 34 + bob, cx + 12 + lean, 34 + bob, cx + 16, 60 + bob, cx - 16, 60 + bob], gown[2]);
  for (let x = cx - 10; x < cx + 12; x += 4) for (let y = 38; y < 58; y += 4) p.set(x + ((y / 4) % 2) * 2, y + bob, gown[3]);
  p.rect(cx - 6 + lean, 30 + bob, 12, 2, hex('#e8e0c8')); for (let i = 0; i < 5; i++) p.set(cx - 4 + i * 2 + lean, 30 + bob, '#8a2a2a');
  // the heart monitor through its chest: a green trace, racing red
  p.rect(cx - 10, 42 + bob, 20, 11, hex('#0a1410')); p.rect(cx - 10, 42 + bob, 20, 1, hex('#2a3a30'));
  const mc = rage ? '#ff4050' : ph ? '#e8e050' : '#60ff90';
  const trace = [0, 0, 0, -1, 0, 0, -5, 4, -2, 0, 0, 0, 0, -1, 0, 0, -5, 4, -2, 0];
  const flat = s.death > 0.3;
  for (let i = 0; i < 18; i++) p.set(cx - 9 + i, 48 + bob + (flat ? 0 : trace[(i + s.f * 3) % trace.length]), mc);
  // long arms in the sheet: gnarled grey hands, too many knuckles, the drip line taped into one
  for (const side of [-1, 1]) {
    const up = s.raise * (side < 0 ? 1 : 0.6);
    const ex = cx + side * (26 + up * 4), ey = 62 + bob - up * 26 + Math.max(0, s.lean) * 6;
    p.tube(cx + side * 13 + lean, 36 + bob, cx + side * 20, 48 + bob - up * 10, 2.6, sheet); p.tube(cx + side * 20, 48 + bob - up * 10, ex, ey, 2.2, sheet);
    claw(p, ex, ey + 2, Math.PI / 2 - side * 0.3 - up * 1.4 * -side, 0.7, '#a8a0a0', '#5a4a4a', 4, 7);
    if (side > 0) { p.rect(ex - 2, ey - 2, 4, 2, hex('#e8e8f0')); p.tube(81, 29, ex, ey - 1, 0.8, ramp(rage ? '#a83040' : '#d8e8f0')); }
  }
  // the head under the sheet: the fabric pulled tight over a face, a mouth straining open under it,
  // torn eye-holes with real eyes in them
  const hx = cx + lean, hy = 20 + bob + Math.round(s.hurt * 2);
  p.ball(hx, hy, 13, 14, sheet, { dither: 0.3 });
  p.line(hx - 9, hy + 6, hx - 6, hy + 13, sheet[1]); p.line(hx + 9, hy + 6, hx + 6, hy + 13, sheet[1]);
  p.line(hx - 4, hy - 3, hx - 1, hy + 4, sheet[3]); p.line(hx + 4, hy - 3, hx + 1, hy + 4, sheet[3]);   // the sheet clinging to a nose
  for (const side of [-1, 1]) {
    const ex = hx + side * 5, ey = hy - 3;
    p.ellipse(ex, ey, 4.4, 4, ink[1]);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; p.set(ex + Math.cos(a) * 4.6, ey + Math.sin(a) * 4.2, i % 2 ? sheet[4] : sheet[1]); }   // torn edge
    eyeball(p, s, ex, ey, 3.2, rage ? '#ff3040' : ph ? '#a8a060' : '#7aa8c8', { sclera: rage ? '#f0c8c0' : '#f0ece4', socket: '#14112a', anger: rage ? 0.8 : 0.3, side, veins: 2 + ph });
    dribble(p, Math.round(ex + side), Math.round(ey + 3), 3 + ph * 2, '#14112a', '#3a3a6a');
  }
  if (!rage) {
    // a mouth straining open under the fabric
    const m = 3 + s.jaw * 5;
    p.ellipse(hx, hy + 7.5, 5, m * 0.7, sheet[1]); p.ellipse(hx, hy + 7.5, 3.6, m * 0.55, '#6a7470'); p.ellipse(hx, hy + 7.5 + m * 0.15, 2.4, m * 0.35, '#4a5450');
    for (const side of [-1, 1]) p.line(hx + side * 5, hy + 5, hx + side * 8, hy + 3, sheet[1]);   // the fabric pulled taut at the corners
    if (ph) p.line(hx - 3, hy + 4, hx + 3, hy + 9, ink[2]);
  } else {
    // the sheet has torn away below the eyes: a jaw far too wide, hanging, running with ink
    p.ball(hx, hy + 10, 11, 7, skin, { dither: 0.3 });
    jaws(p, hx, hy + 10, 11, 6 + s.jaw * 7, Math.max(0.5, s.jaw), { gum: '#14112a', lip: '#8a6a6a', tooth: '#efe2c8', fangs: 2, seed: 29, grin: 0.15, drool: '#14112a' });
    for (let i = -11; i <= 11; i += 2) p.set(hx + i, hy + 3 + Math.abs(i) * 0.15 + (i % 4 ? 1 : 0), sheet[4]);
    veins(p, hx - 9, hy + 8, 5, '#6a3a4a', 31, 2.4);
  }
  if (s.death > 0) melt(p, s.death, floor, 201, '#14112a');
}
