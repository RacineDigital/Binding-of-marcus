// Chapter IV–V bosses and the Binding, redrawn on the rig: the Ossuary Knight, Mother of Moths, the
// Bellringer, the Choirmaster, the Blotted Man (and Half) and the Unbound (and It Remembers).
import type { PixelArt } from '../render/pixel';
import type { Pose } from './rig';
import { jaws, eyeball, brow, gash, boils, tatters, claw, veins, dribble, melt, ramp, hex, h01, TAU } from './kit';

// ------------------------------------------------------------------ The Ossuary Knight
// A knight who came down into the bone-crypt and never left: blackened, dented plate, the breastplate
// split open on a ribcage packed with other people's bones, a skull grinning through the visor slit
// with two cold lights for eyes, a greatsword of lashed femurs and a kite shield with a skull boss.
// When the shield shatters, the helm cracks too and the jaw hangs out.
export function paintKnight(p: PixelArt, s: Pose): void {
  const raise = Math.max(s.raise, s.x.raise ?? 0), broken = s.phase > 0;
  const plate = ramp('#4a4a56'), rust = '#6a3a24', bone = ramp('#e0d6c0'), cloth = ramp('#4a1a22');
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 12);
  // armoured legs, stepping heavy
  for (const side of [-1, 1]) {
    const fx = cx + side * 6 + Math.round(side * s.step * 2), hip = floor - 18 + sink;
    p.tube(cx + side * 4, hip, fx, floor - 4, 3.4, plate);
    p.rect(fx - 4, floor - 4, 8, 3, plate[1]); p.rect(fx - 4, floor - 4, 8, 1, plate[3]);
  }
  // the tattered tabard hanging between the legs
  tatters(p, cx - 5, cx + 5, floor - 20 + sink, 12, '#4a1a22', 11, s.step * 0.6);
  // torso: a dented breastplate split down the middle on a ribcage full of bones
  const tx = cx + Math.round(s.lean * 2), ty = floor - 32 + sink;
  p.ball(tx, ty, 11, 12, plate, { dither: 0.35 });
  p.poly([tx - 5, ty - 9, tx + 5, ty - 9, tx + 3, ty + 9, tx - 3, ty + 9], '#14101a');
  for (let i = 0; i < 4; i++) { const y = ty - 6 + i * 4; p.line(tx - 4, y, tx + 4, y + 1, bone[3]); p.set(tx, y, bone[1]); }   // ribs
  p.ball(tx - 1, ty + 1, 2.4, 2.2, bone); p.set(tx - 2, ty, '#1a1010'); p.set(tx, ty, '#1a1010');   // a little skull stuffed in
  p.ball(tx + 2, ty + 6, 1.8, 1.4, bone);
  for (const [dx, dy] of [[-8, -6], [7, 2], [-6, 6]]) p.set(tx + dx, ty + dy, rust);   // rust and dents
  p.ball(tx - 10, ty - 8, 4.5, 3.5, plate); p.ball(tx + 10, ty - 8, 4.5, 3.5, plate);   // pauldrons
  for (const sx of [-12, 8]) p.line(tx + sx, ty - 11, tx + sx + 4, ty - 11, plate[4]);
  // the shield arm (left): a kite shield with a skull boss, or a broken strap once it's gone
  const shx = tx - 14, shy = ty + 2 + Math.round(s.hurt * -2);
  if (!broken) {
    p.poly([shx - 7, shy - 10, shx + 5, shy - 10, shx + 5, shy + 4, shx - 1, shy + 12, shx - 7, shy + 4], plate[2]);
    p.shadeV(shx - 7, shy - 10, 12, 22, plate, 0.5);
    p.line(shx - 7, shy - 10, shx + 5, shy - 10, plate[4]);
    p.ball(shx - 1, shy - 1, 3, 3, bone); p.set(shx - 2, shy - 2, '#1a1010'); p.set(shx, shy - 2, '#1a1010'); p.line(shx - 2, shy + 1, shx, shy + 1, '#1a1010');
    gash(p, shx - 5, shy - 7, shx - 2, shy + 5, { stitch: '', blood: '#2a2a34' });
  } else {
    p.tube(tx - 10, ty - 6, shx, shy + 2, 2.6, plate); claw(p, shx - 1, shy + 5, Math.PI / 2, 0.7, '#4a4a56', '#e0d6c0', 4, 4);
    p.line(shx + 2, shy - 2, shx + 4, shy + 4, hex('#6a4a2a'));   // the snapped strap
  }
  // the sword arm (right) and a greatsword of lashed femurs: raised high on the wind-up, hacking down
  const arx = tx + 10, ary = ty - 6, armA = -0.6 - raise * 1.7 + Math.max(0, s.lean) * 1.4;
  const hx = arx + Math.cos(armA) * 10, hy = ary + Math.sin(armA) * 10 + 6;
  p.tube(arx, ary, hx, hy, 2.8, plate); p.ball(hx, hy, 2.6, 2.4, plate);
  const ba = armA - 1.1 + raise * 0.5;
  const tipx = hx + Math.cos(ba) * 24, tipy = hy + Math.sin(ba) * 24;
  p.line(hx - Math.cos(ba) * 3, hy - Math.sin(ba) * 3, hx + Math.cos(ba) * 2, hy + Math.sin(ba) * 2, hex('#3a2a24'), 2);
  p.line(hx + Math.cos(ba + 1.57) * 3, hy + Math.sin(ba + 1.57) * 3, hx - Math.cos(ba + 1.57) * 3, hy - Math.sin(ba + 1.57) * 3, bone[2], 2);   // crossguard
  p.line(hx + Math.cos(ba) * 2, hy + Math.sin(ba) * 2, tipx, tipy, bone[3], 3);
  p.line(hx + Math.cos(ba) * 2 + 1, hy + Math.sin(ba) * 2, tipx + 1, tipy, bone[1]);
  for (let k = 0.3; k < 1; k += 0.25) { const x = hx + Math.cos(ba) * 24 * k, y = hy + Math.sin(ba) * 24 * k; p.ball(x, y, 2.2, 2.2, bone); p.set(x, y, bone[0]); }   // the knuckle-ends of the femurs
  // the helm: a pot helm with a cross slit, a skull grinning behind it; cracked open in phase two
  const hdx = tx + Math.round(s.lean * 2), hdy = ty - 17 + Math.round(-Math.max(0, -s.lean) * 2) + Math.round(s.hurt);
  p.ball(hdx, hdy, 7.5, 8, plate, { dither: 0.3 });
  p.rect(hdx - 7, hdy - 1, 15, 4, '#0c0a10');                   // the visor slit
  p.rect(hdx - 1, hdy - 6, 3, 13, '#0c0a10');
  for (const side of [-1, 1]) {
    // two cold blue points of light deep in the eye sockets
    p.ellipse(hdx + side * 3.5, hdy + 1, 1.8, 1.4, '#06060a');
    if (s.hurt < 0.6) s.eyes.push({ x: hdx + side * 3.5, y: hdy + 1, r: 1.2, iris: broken ? '#ff4a3a' : '#8ad8ff', pupil: '#ffffff', glint: false });
  }
  p.rect(hdx - 7, hdy - 9, 15, 1, plate[4]); p.line(hdx, hdy - 9, hdx, hdy - 14, hex('#8a1a24'), 2);   // a red plume stump
  if (broken) {
    // the helm's cheek has broken away: bone jaw and teeth hanging out
    p.poly([hdx + 2, hdy + 2, hdx + 8, hdy - 1, hdx + 8, hdy + 8, hdx + 2, hdy + 7], bone[3]);
    for (let i = 0; i < 5; i++) p.set(hdx + 3 + i, hdy + 4 + (i % 2), '#1a1010');
    jaws(p, hdx + 4, hdy + 8, 6, 3, Math.max(0.3, s.jaw), { gum: '#3a2a24', lip: '#c8b8a0', fangs: 0, seed: 6, grin: 0.2, drool: null });
  }
  if (s.death > 0) melt(p, s.death, floor, 61, '#2a2224');
}

// ------------------------------------------------------------------ Mother of Moths
// A moth as wide as the room, and every eyespot on her wings is a real eye, bloodshot and watching.
// Her furred head holds a withered old woman's face, mouth hanging open, feathered antennae curling
// up from her brow. She beats her wings slowly; when she lifts them for a gust they flare wide.
export function paintMothMother(p: PixelArt, s: Pose): void {
  const up = Math.max(s.raise, s.x.up ?? 0);
  const wing = ramp(s.phase ? '#9a8a68' : '#b8a47a'), fur = ramp('#d8c8a0'), dark = ramp('#5a4a3a'), skin = ramp('#c8b8a8');
  const cx = p.w / 2, cy = p.h - 28 + Math.round(s.breath * 1.5) + Math.round(s.death * 14);
  const flap = Math.sin(s.t * TAU) * 0.25 - up * 0.7 + s.hurt * 0.3;
  // the wings: four great sweeping planes, dark-bordered, veined, ragged at the edge, and real eyes in
  // the eyespots of the upper pair
  const rim = ramp('#3a2a1a');
  for (const side of [-1, 1]) {
    for (const [hi, len, wid, off] of [[0, 28, 15, 9], [1, 40, 22, -5]] as [number, number, number, number][]) {
      const a = (hi ? -0.5 : 0.5) + flap * (hi ? 1 : 0.6);
      const tipx = cx + side * len * Math.cos(a), tipy = cy + off + len * Math.sin(a) * 0.85;
      const mx = (cx + tipx) / 2, my = (cy + off + tipy) / 2;
      // a dark border first, the lighter wing inside it
      p.poly([cx + side * 2, cy + off - 4, tipx, tipy - wid * 0.45, tipx + side * 3, tipy + wid * 0.45, cx + side * 3, cy + off + 7], rim[1]);
      p.ball(mx, my, len * 0.46, wid * 0.62, rim, { dither: 0.3 });
      p.poly([cx + side * 3, cy + off - 2, tipx - side * 2, tipy - wid * 0.3, tipx, tipy + wid * 0.3, cx + side * 4, cy + off + 5], wing[hi ? 2 : 1]);
      p.ball(mx, my, len * 0.4, wid * 0.5, wing, { dither: 0.55 });
      for (let v = 0; v < 5; v++) p.line(cx + side * 4, cy + off, tipx - side * v * 3, tipy + (v - 2) * wid * 0.2, rim[2]);
      // a pale band across the wing
      p.line(mx - side * 3, my - wid * 0.4, mx + side * 4, my + wid * 0.4, wing[4], 2);
      // a torn, fringed edge; holes torn through in phase two
      for (let k2 = 0; k2 < 8; k2++) p.set(tipx - side * k2 * 2, tipy + wid * 0.5 + (k2 % 2), rim[0]);
      if (s.phase) { p.ellipse(mx + side * 4, my + 3, 2.2, 1.8, 0); p.ellipse(tipx - side * 6, tipy, 1.6, 1.4, 0); }
      if (hi) {
        // the eyespot: an orange ring of scales round a real, bloodshot eye
        const ex = mx + side * 2, ey = my - 1;
        p.ellipse(ex, ey, 7, 6.5, rim[0]); p.ring(ex, ey, 6.4, '#d8782a', 1.2);
        eyeball(p, s, ex, ey, 4.4, '#c82a2a', { sclera: '#f0e0b8', socket: '#1a0e08', side, anger: 0.4 + s.phase * 0.4, veins: 5 });
      } else {
        const ex = mx + side * 2, ey = my;
        p.ellipse(ex, ey, 3.4, 3, rim[0]); p.ring(ex, ey, 3, '#d8782a', 1); p.set(ex, ey, '#f0e0b8');
      }
    }
  }
  // the furred body hanging below
  p.ball(cx, cy + 10, 6, 11, fur, { dither: 0.6 });
  for (let y = cy + 2; y < cy + 21; y += 3) p.line(cx - 5, y, cx + 5, y + 1, dark[2]);   // banded abdomen
  // little hooked legs folded under
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) { const lx = cx + side * 4, ly = cy + 3 + i * 3; p.line(lx, ly, lx + side * 5, ly + 3, dark[1]); p.set(lx + side * 5, ly + 4, dark[0]); }
  // the head: a ball of fur with a withered woman's face in it
  const hx = cx, hy = cy - 7 + Math.round(s.hurt * -2);
  p.ball(hx, hy, 8.5, 8, fur, { dither: 0.5 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; p.line(hx + Math.cos(a) * 6, hy + Math.sin(a) * 6, hx + Math.cos(a) * 8.5, hy + Math.sin(a) * 8, fur[2]); }   // ruff
  p.ball(hx, hy + 1, 5.4, 6, skin, { dither: 0.3 });
  for (const [x, y] of [[-3, 3], [3, 3], [-2, -2], [2, -2]]) p.set(hx + x, hy + y, skin[1]);   // wrinkles
  for (const side of [-1, 1]) {
    p.ellipse(hx + side * 2, hy, 1.5, 1.3, '#1a0e0e');
    if (s.hurt < 0.6) s.eyes.push({ x: hx + side * 2, y: hy, r: 1.1, iris: '#f0e0a0', pupil: '#1a0e0e', glint: false });
  }
  jaws(p, hx, hy + 4, 4, 2 + s.jaw * 4, Math.max(0.35, s.jaw), { gum: '#5a2a24', lip: '#a8988a', fangs: 0, seed: 8, grin: -0.4, drool: '#e8d8a0' });
  // feathered antennae curling up from the brow
  for (const side of [-1, 1]) {
    let x = hx + side * 2, y = hy - 6;
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + side * (0.2 + k * 0.13); x += Math.cos(a) * 1.4; y += Math.sin(a) * 1.4; p.set(x, y, dark[1]); if (k % 2) { p.set(x + side, y + 1, fur[3]); p.set(x - side, y + 1, fur[3]); } }
  }
  if (s.death > 0) melt(p, s.death, p.h - 2, 71, '#5a4a3a');
}

// ------------------------------------------------------------------ The Bellringer
// The verger who rang for the dead, hunched under the weight of the great bell that came down on his
// head and never came off. His face glares out through holes hacked in the bronze; his arms are too
// long; he swings a handbell like a mace. Hurt, the bell cracks and something dark runs out.
export function paintBellringer(p: PixelArt, s: Pose): void {
  const swing = Math.max(s.raise, s.x.swing ?? 0);
  const bronze = ramp(s.phase ? '#8a6a3a' : '#a07a3a'), robe = ramp('#3a3240'), skin = ramp('#b8a090');
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 12);
  // bare, twisted feet under a dragging robe
  for (const side of [-1, 1]) { const fx = cx + side * 6 + Math.round(side * s.step * 2); p.ball(fx, floor - 1, 3.4, 1.6, skin); for (let i = 0; i < 3; i++) p.set(fx + side * 2 + i * side * 0.6, floor, '#e8dcc8'); }
  const ty = floor - 22 + sink;
  p.poly([cx - 10, ty - 6, cx + 10, ty - 6, cx + 13, floor - 3, cx - 13, floor - 3], robe[2]);
  p.shadeV(cx - 13, ty - 6, 26, floor - 3 - ty + 6, robe, 0.5);
  tatters(p, cx - 13, cx + 13, floor - 4, 3, '#2a2430', 13, s.step * 0.6);
  for (const x of [-6, 0, 6]) p.line(cx + x, ty - 2, cx + x * 1.3, floor - 5, robe[1]);
  // the bell sits down over head and shoulders; he's hunched forward under it
  const bx = cx + Math.round(s.lean * 3), by = ty - 12 + Math.round(-Math.max(0, -s.lean) * 2) + Math.round(s.hurt * 2);
  p.poly([bx - 8, by - 10, bx + 8, by - 10, bx + 12, by + 6, bx + 14, by + 9, bx - 14, by + 9, bx - 12, by + 6], bronze[2]);
  p.ball(bx, by - 9, 8, 4, bronze, { dither: 0.3 });
  p.shadeV(bx - 14, by - 12, 28, 21, bronze, 0.4);
  p.rect(bx - 14, by + 7, 28, 2, bronze[4]); p.rect(bx - 14, by + 9, 28, 1, bronze[0]);
  p.rect(bx - 2, by - 15, 4, 3, bronze[1]); p.ring(bx, by - 16, 2, bronze[3], 1);   // the crown loop
  for (const [x, y] of [[-6, -6], [7, -3], [-9, 3]]) p.set(bx + x, by + y, '#5a8a6a');   // verdigris
  // the holes hacked in the bronze: two eyes glaring out and a ragged mouth hole full of teeth
  for (const side of [-1, 1]) {
    eyeball(p, s, bx + side * 4, by - 3, 2.3, '#e8c040', { sclera: '#e8d8b8', socket: '#0a0606', side, anger: 0.7 + s.phase * 0.3, veins: 2 });
    p.line(bx + side * 7, by - 7, bx + side * 1, by - 5 - (side > 0 ? 0 : 0), '#2a1a10');   // hacked edge like a brow
  }
  jaws(p, bx, by + 3, 10, 4 + s.jaw * 3, Math.max(0.35, s.jaw), { gum: '#3a0a10', lip: '#5a3a1a', fangs: 2, seed: 12, grin: -0.2 });
  if (s.phase) { gash(p, bx - 3, by - 10, bx - 6, by + 6, { stitch: '', blood: '#1a0a0a' }); dribble(p, bx - 6, by + 7, 4, '#2a0a0a'); }
  // long arms hanging out from under the rim; the right one swings the handbell
  p.tube(bx - 12, by + 7, bx - 16, by + 18, 2, skin); claw(p, bx - 16, by + 20, Math.PI / 2, 0.6, '#b8a090', '#e8dcc8', 4, 4);
  const shx = bx + 12, shy = by + 7, armA = 0.9 - swing * 2.6 + Math.max(0, s.lean) * 0.8;
  const hx = shx + Math.cos(armA) * 13, hy = shy + Math.sin(armA) * 13;
  p.tube(shx, shy, hx, hy, 2, skin);
  const ha = armA + 0.3, hbx = hx + Math.cos(ha) * 4, hby = hy + Math.sin(ha) * 4;
  p.line(hx, hy, hbx, hby, hex('#5a3a24'), 2);
  p.ball(hbx + Math.cos(ha) * 3, hby + Math.sin(ha) * 3, 3.6, 3.4, bronze); p.set(hbx + Math.cos(ha) * 5, hby + Math.sin(ha) * 5, '#2a1a10');
  if (s.death > 0) melt(p, s.death, floor, 81, '#2a1e18');
}

// ------------------------------------------------------------------ The Choirmaster
// The master of a choir that sang for so long its voices wore away. Gaunt, in a black cassock and a
// white ruff, eyes long gone, and a mouth that hangs open in one endless, impossible note. He
// conducts with a baton; when he raises both arms the mouth stretches past his chin.
export function paintChoirmaster(p: PixelArt, s: Pose): void {
  const up = Math.max(s.raise, s.x.up ?? 0);
  const cass = ramp('#241a2e'), ruff = ramp('#e8e4dc'), skin = ramp('#c8bcb4');
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 12);
  // the cassock, floor length, hem trailing into wisps (he floats)
  const ty = floor - 30 + sink;
  p.poly([cx - 7, ty, cx + 7, ty, cx + 12, floor - 4, cx - 12, floor - 4], cass[2]);
  p.shadeV(cx - 12, ty, 24, floor - 4 - ty, cass, 0.5);
  tatters(p, cx - 12, cx + 12, floor - 5, 4, '#1a1222', 17, s.breath);
  for (let y = ty + 3; y < floor - 6; y += 4) p.set(cx, y, '#c8a04a');   // buttons
  // arms: conducting, the baton in the right hand; both thrown up for the big note
  for (const side of [-1, 1]) {
    const shx = cx + side * 6, shy = ty + 2;
    const a = side > 0 ? (0.6 - up * 2.2 + Math.sin(s.t * TAU) * 0.35) : (Math.PI - 0.6 + up * 2.2);
    const hx = shx + Math.cos(a) * 12, hy = shy + Math.sin(a) * 12;
    p.tube(shx, shy, hx, hy, 2, cass);
    claw(p, hx, hy, a, 0.5 + up * 0.4, '#c8bcb4', '#f0e8e0', 4, 3);
    if (side > 0) { const ba = a - 0.6; p.line(hx, hy, hx + Math.cos(ba) * 10, hy + Math.sin(ba) * 10, hex('#e8e0d0')); p.set(hx + Math.cos(ba) * 10, hy + Math.sin(ba) * 10, '#ffffff'); }
  }
  // the white ruff, stained red in phase two
  const ry = ty - 1;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI; p.ball(cx + Math.cos(a) * 7, ry + Math.sin(a) * 1.5, 2.2, 1.8, ruff); }
  if (s.phase) for (const x of [-4, 1, 5]) dribble(p, cx + x, ry + 1, 3 + (x & 1), '#8a1a24');
  // the long gaunt head, eyeless, with the mouth hanging open in a scream that stretches with the note
  const hx = cx + Math.round(s.lean * 2), hy = ry - 10 + Math.round(s.hurt * 2);
  const stretch = 2 + up * 5 + s.jaw * 3;
  p.ball(hx, hy, 5.5, 7 + stretch * 0.4, skin, { dither: 0.25 });
  p.ball(hx, hy - 6, 5.5, 3, ramp('#3a2a3a'));   // a skullcap
  for (const side of [-1, 1]) {
    p.ellipse(hx + side * 2.4, hy - 2, 1.6, 2.2, '#0a0408');
    dribble(p, Math.round(hx + side * 2.4), Math.round(hy), 3 + (side > 0 ? 2 : 0), '#1a0a14');
  }
  brow(p, hx - 5, hy - 5, 4, 1, '#8a7a72', 1); brow(p, hx + 1, hy - 4, 4, -1, '#8a7a72', 1);
  // the mouth: a long vertical hole, ringed with a few teeth, a throat going down forever
  const my = hy + 2, mh = 3 + stretch * 1.4;
  p.ellipse(hx, my + mh / 2, 2.6, mh / 2 + 0.5, '#5a1a24');
  p.ellipse(hx, my + mh / 2, 1.9, mh / 2, '#0a0206');
  for (const [dx, dy] of [[-1, 0], [1, 0], [-2, 1], [2, 1], [-1, mh], [1, mh]]) p.set(hx + dx, my + dy, '#e8e0c8');
  if (s.death > 0) melt(p, s.death, floor, 91, '#1a0e20');
}

// ------------------------------------------------------------------ The Blotted Man
// A man drawn in ink and then spilled. Tall, thin, all drips and no edges, with one enormous white
// eye that finds you, and a wide grin of white teeth cut into the black. Long arms dribble into
// claws, and he stands in his own puddle. Hurt, a second eye tears open. The Half is what's left when
// he splits: lopsided, with half the grin.
export function paintBlotted(p: PixelArt, s: Pose, k: number): void {
  const ink = ramp('#1e1a3a'), sheen = '#4a4a8a';
  const floor = p.h - 2, cx = p.w / 2;
  const sink = Math.round(s.squash * 6 + s.death * 14);
  const H = Math.round(48 * k), top = floor - H + sink;
  // the puddle he stands in
  p.ellipse(cx, floor, 10 * k + Math.abs(s.breath), 2, '#14102a'); p.set(cx - 4 * k, floor - 1, sheen);
  // the body: a tall wobbling column of ink, narrow at the legs
  for (let y = top; y < floor; y++) {
    const u = (y - top) / H;
    const half = (u < 0.25 ? 6 + u * 10 : u < 0.6 ? 8.5 - (u - 0.25) * 4 : 7 - (u - 0.6) * 6) * k + Math.sin(y * 0.4 + s.t * TAU) * 0.8;
    const sway = Math.round(Math.sin(u * 3 + s.t * TAU) * 1.2 * k + s.lean * (1 - u) * 3);
    for (let x = -half; x <= half; x++) p.set(cx + x + sway, y, x < -half + 1.5 ? ink[3] : x > half - 2 ? ink[0] : ink[2]);
  }
  // drips running down and off him
  for (let i = 0; i < 6; i++) { const x = cx - 7 * k + i * 2.8 * k, y = top + 10 + (i % 3) * 8; dribble(p, Math.round(x), Math.round(y), 3 + ((i + Math.round(s.t * 6)) % 4), '#1e1a3a', sheen); }
  // long arms that dribble into claws
  for (const side of [-1, 1]) {
    const shx = cx + side * 7 * k, shy = top + 14 * k, a = Math.PI / 2 + side * (0.35 - s.raise * 1.2) - (side > 0 ? Math.max(0, s.lean) * 0.6 : 0);
    const hx = shx + Math.cos(a) * 17 * k, hy = shy + Math.sin(a) * 17 * k;
    p.tube(shx, shy, hx, hy, 1.8 * k, ink);
    claw(p, hx, hy, a, 0.6 + s.raise * 0.4, '#1e1a3a', '#e8e8f8', 4, 4 * k);
    dribble(p, Math.round(hx), Math.round(hy + 3), 2, '#1e1a3a', sheen);
  }
  // the head: one great white eye and a jagged grin, both cut into the dark
  const hx = cx + Math.round(s.lean * 2), hy = top + 6 * k + Math.round(s.hurt * 2);
  p.ball(hx, hy, 7 * k, 7 * k, ink, { dither: 0.3 });
  const half = k < 1;
  eyeball(p, s, hx - (half ? 1 : 2) * k, hy - 2 * k, 3.4 * k, '#e8e8f8', { sclera: '#f4f4fc', socket: '#0a0818', pupil: '#0a0818', veins: 0, anger: 0.3 + s.phase * 0.4, side: -1 });
  if (s.phase && !half) eyeball(p, s, hx + 4, hy - 4, 1.8, '#e8e8f8', { sclera: '#f4f4fc', socket: '#0a0818', pupil: '#0a0818', veins: 0, side: 1 });
  // the grin: a long jagged white crescent, wider when he laughs
  const gw = (half ? 7 : 11) * k, gy = hy + 3 * k, open = Math.max(0.2, s.jaw);
  for (let x = -gw / 2; x <= gw / 2; x++) {
    const u = x / (gw / 2), yy = gy - u * u * 2 * k;
    p.set(hx + x, yy, '#f4f4fc');
    if (open > 0.4) { for (let j = 1; j < 1 + open * 3; j++) p.set(hx + x, yy + j, '#0a0206'); p.set(hx + x, yy + Math.round(1 + open * 3), Math.round(x) % 2 ? '#f4f4fc' : '#0a0206'); }
    if (Math.round(x) % 2 === 0) p.set(hx + x, yy + 1, '#c8c8e0');
  }
  if (s.death > 0) melt(p, s.death, floor, 101, '#0e0c1c');
}

// ------------------------------------------------------------------ The Unbound / It Remembers
// Grandfather's great ledger, with every fear he ever stitched shut inside it. A grimoire bigger than
// a door, the leather cover tooled into a scowling face around a single great eye, brass corners,
// burst stitching and a broken clasp. Open, the pages are rows of teeth and a ribbon bookmark lolls
// out like a tongue. It Remembers: the cover has grown skin, veins and a green eye.
export function paintBook(p: PixelArt, s: Pose, flesh: boolean): void {
  const open = Math.min(1, Math.max(s.x.open ?? 0, s.jaw > 0.7 ? (s.jaw - 0.7) * 3 : 0));
  const leather = ramp(flesh ? '#a85a5a' : '#6a2a2a'), page = ramp('#e6dcc0'), brass = ramp('#c89a3a'), hand = ramp(flesh ? '#d8a0a0' : '#d8ccc0');
  const cx = p.w / 2, base = p.h - 10 + Math.round(s.breath * 1.5) + Math.round(s.death * 8);
  const W = 25, H = 46;
  const gape = Math.round(open * 18 + Math.max(0, -s.lean) * 5);
  const top = base - H;
  // the back board and the block of pages, standing upright
  p.rect(cx - W - 2, top + 2, W * 2 + 4, H, leather[1]);
  p.rect(cx - W, top + 6, W * 2, H - 6, page[2]);
  for (let y = top + 8; y < base - 1; y += 2) p.rect(cx - W + 1, y, W * 2 - 2, 1, page[(y / 2) % 2 ? 3 : 1]);
  // the mouth between the pages: the cover hinges up from the top, the pages below are teeth
  const lip = top + 12 - gape;      // the bottom edge of the lifted cover
  if (open > 0.1) {
    p.rect(cx - W + 1, lip, W * 2 - 2, gape + 10, '#1a0408');
    p.ball(cx, lip + gape / 2 + 6, W * 0.7, gape / 2 + 4, ramp(flesh ? '#7a1424' : '#5a0a1a'), { dither: 0.5 });
    p.ball(cx, lip + gape / 2 + 8, W * 0.35, gape / 3 + 2, ramp('#1a0408'));
    for (let x = -W + 2; x < W - 1; x += 3) {
      const bl = 3 + Math.round(h01(x, 5) * 3) + Math.round(open * 2);
      for (let j = 0; j < bl; j++) { p.set(cx + x, lip + gape + 10 - j, j === bl - 1 ? page[1] : page[4]); p.set(cx + x + 1, lip + gape + 10 - j, page[2]); }
    }
    // the ribbon bookmark lolls out like a tongue
    for (let j = 0; j < 12 + open * 8; j++) p.set(cx + 5 + Math.round(Math.sin(j * 0.5 + s.t * TAU) * 1.5), lip + gape / 2 + 8 + j, j % 4 === 0 ? '#e83a4a' : '#b8202e');
  }
  // pale hands clawing out from between the pages at the sides
  for (const side of [-1, 1]) for (const [hy, ln] of [[base - 22, 6], [base - 10, 5]] as [number, number][]) {
    const reach = ln + Math.round(open * 3) + Math.round(Math.sin(s.t * TAU + hy) * 1.5);
    p.tube(cx + side * (W - 2), hy, cx + side * (W + reach), hy + 2, 1.5, hand);
    claw(p, cx + side * (W + reach + 1), hy + 3, Math.PI / 2 - side * 0.6, 0.7 + open * 0.3, flesh ? '#d8a0a0' : '#d8ccc0', '#f8f0e8', 4, 4);
  }
  // the front cover, lifting on its top edge like a jaw: tooled leather, brass corners, a scowling face
  const fy = top - gape * 0.4, fh = 12 + H - 12 - gape * 0.6;
  const coverH = Math.max(14, H - 10 - gape);
  p.rect(cx - W - 2, fy, W * 2 + 4, coverH, leather[2]); p.shadeV(cx - W - 2, fy, W * 2 + 4, coverH, leather, 0.4);
  p.rect(cx - W - 2, fy, W * 2 + 4, 2, leather[4]); p.rect(cx - W - 2, fy + coverH - 2, W * 2 + 4, 2, leather[0]);
  for (const [x, y] of [[-W - 2, fy], [W - 3, fy], [-W - 2, fy + coverH - 5], [W - 3, fy + coverH - 5]]) { p.rect(cx + x, y, 5, 5, brass[2]); p.set(cx + x + 1, y + 1, brass[4]); }
  for (let y = fy + 4; y < fy + coverH - 4; y += 3) { p.line(cx - W, y, cx - W + 2, y + 1, '#1a0a0a'); if (h01(y, 7) < 0.4) p.line(cx + W - 2, y, cx + W, y + 2, '#e8dcc0'); }
  if (flesh) { veins(p, cx - W + 2, fy + 6, 22, '#6a1020', 3, 0.5); veins(p, cx + W - 4, fy + coverH - 6, 18, '#6a1020', 4, -2.4); boils(p, [[cx - 16, fy + 8, 1.8], [cx + 17, fy + 16, 1.5]], '#d88080'); }
  // the great eye in the cover, in a stitched socket, under heavy tooled brows
  const ey = fy + Math.min(coverH / 2, 16);
  eyeball(p, s, cx, ey, 7, flesh ? '#3ac84a' : '#c83a4a', { sclera: '#f0e6cc', socket: '#2a0a0a', anger: 0.6 + s.phase * 0.3, side: 1, veins: 6 });
  brow(p, cx - 13, ey - 11, 9, 3.5, flesh ? '#7a2a2a' : '#4a1a1a', 3);
  brow(p, cx + 4, ey - 7.5, 9, -3.5, flesh ? '#7a2a2a' : '#4a1a1a', 3);
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) p.line(cx + side * 9, ey - 3 + i * 2, cx + side * 12, ey - 3 + i * 2, '#2a1414');
  // shut, the cover's bottom edge is a stitched mouth
  if (open <= 0.1) { const my = fy + coverH - 6; p.line(cx - 10, my, cx + 10, my + 1, '#1a0a0a'); for (let x = -9; x <= 9; x += 3) p.line(cx + x, my - 2, cx + x, my + 2, '#e8dcc0'); }
  // the broken clasp hanging off the edge
  p.rect(cx + W + 1, ey + 4, 5, 4, brass[2]); p.line(cx + W + 5, ey + 6, cx + W + 7, ey + 12, brass[1]);
  if (s.phase) { gash(p, cx - W + 2, fy + 3, cx - W + 10, fy + 14, { stitch: '#1a0a0a', blood: '#8a1a24' }); gash(p, cx + 10, fy + coverH - 4, cx + 20, fy + coverH - 10, { stitch: '', blood: '#8a1a24' }); }
  void fh;
  if (s.death > 0) melt(p, s.death, p.h - 2, 111, '#2b2f66');
}
void tatters;
