// Chapter I bosses, redrawn on the rig: the Grubmother, the Wardrobe and the Twin Snips.
import type { PixelArt } from '../render/pixel';
import type { Pose } from './rig';
import { jaws, eyeball, brow, gash, boils, tatters, claw, veins, dribble, melt, ramp, hex, h01, TAU } from './kit';

// ------------------------------------------------------------------ The Grubmother
// A maggot the size of a sofa that has been eating the house from underneath. A soft, sagging,
// segmented body you can half see through (dark innards, her young squirming inside), pink baby
// hands along her belly that paddle when she crawls, boils on her back, and a blind lamprey head
// with one huge bloodshot eye she found somewhere. She rears up to spray, mouth turning inside out.
export function paintGrub(p: PixelArt, s: Pose): void {
  const W = p.w, floor = p.h - 2;
  const rear = Math.max(0, -s.lean), fwd = Math.max(0, s.lean);
  const sag = s.squash * 6 + s.death * 8;
  const skin = ramp(s.phase ? '#e8c0aa' : '#ecd2bc'), fold = ramp('#b07a6a'), gut = ramp('#5a2434');
  const hand = ramp('#e8a8a0');
  // her body: five segments, tail (left) to neck (right), rippling nose to tail
  const segs: [number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const x = 6 + i * 8.5 + fwd * i * 0.6;
    const r = 5.5 + i * 1.6 + Math.sin(s.breath * 1.2 + i) * 0.4;
    const y = floor - r * 0.8 + sag * 0.3 - rear * i * 1.6 + Math.sin(s.t * TAU - i * 1.3) * 0.8 * (s.anim === 'move' ? 2 : 1);
    segs.push([x, y, r]);
  }
  // baby hands along her belly, paddling with her crawl
  segs.slice(1).forEach(([x, , r], i) => {
    const sw = Math.sin(s.step * Math.PI + i * 1.7) * 2;
    claw(p, x + sw, floor - 1, Math.PI / 2 + 0.3, 0.6 + 0.4 * Math.abs(s.step), '#e8a8a0', '#f8e8e0', 3, 3);
    p.set(x + sw - 1, floor - 2 - r * 0.1, hand[1]);
  });
  // tail stinger
  p.tube(1, floor - 5 + sag * 0.2, 5, floor - 6 + sag * 0.2, 1.6, fold); p.set(0, floor - 4, fold[0]);
  for (let i = 0; i < segs.length; i++) {
    const [x, y, r] = segs[i];
    p.ball(x, y, r, r * 0.84, skin, { dither: 0.45 });
    // innards through the skin, and her young curled up in there
    p.ball(x + 1, y + r * 0.25, r * 0.6, r * 0.38, gut, { dither: 0.85 });
    if (i % 2) { p.ball(x + 1, y + r * 0.2, 1.6, 1.1, ramp('#f6ead8')); p.set(x + 2, y + r * 0.2, '#2a0a10'); }
    // the fold between segments, with a highlight on its lip
    p.line(x - r * 0.75, y - r * 0.5, x - r * 0.75, y + r * 0.62, fold[1]);
    p.line(x - r * 0.75 + 1, y - r * 0.45, x - r * 0.75 + 1, y + r * 0.5, skin[4]);
    // bristles along the spine
    for (let b = -r * 0.5; b < r * 0.5; b += 2.5) p.line(x + b, y - r * 0.8, x + b - 1, y - r * 0.8 - 2 - (Math.round(b) & 1), fold[0]);
    veins(p, x - r * 0.3, y - r * 0.2, Math.round(r * 1.2), s.phase ? '#a83a5a' : '#c8909a', i * 9 + 1, 0.4);
  }
  boils(p, [[segs[1][0], segs[1][1] - segs[1][2] * 0.7, 1.8], [segs[2][0] + 3, segs[2][1] - segs[2][2] * 0.8, 2.4], [segs[3][0] - 2, segs[3][1] - segs[3][2] * 0.85, 1.6]], s.phase ? '#d87a7a' : '#e8b8a0');
  // second phase: her back has split and the young are coming out
  if (s.phase) {
    const [x, y, r] = segs[2];
    gash(p, x - r * 0.7, y - r * 0.5, x + r * 0.8, y - r * 0.2, { stitch: '', open: 1 });
    for (const [dx, dy] of [[-2, -1], [2, 0], [0, -2]]) { p.ball(x + dx, y - r * 0.45 + dy, 1.5, 1.1, ramp('#f6ead8')); p.set(x + dx + 1, y - r * 0.45 + dy, '#2a0a10'); }
  }
  // the neck and head, rising when she rears: a big, blind, fleshy head turned toward you
  const [nx, ny, nr] = segs[4];
  const hx = Math.min(W - 14, nx + 8 + fwd * 3) - s.hurt * 2, hy = ny - 5 - rear * 16 + fwd * 3;
  p.tube(nx, ny, hx - 3, hy + 4, nr * 0.8, skin);
  p.ball(hx, hy, 13, 11.5 + rear, skin, { dither: 0.4 });
  // fleshy folds and wrinkles radiating from the mouth
  const open = Math.min(1, s.jaw * 1.15), mx = hx + 1, my = hy + 4 + rear;
  const mr = 3 + open * 4.5;
  for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU + 0.3; p.line(mx + Math.cos(a) * (mr + 2), my + Math.sin(a) * (mr + 1.6), mx + Math.cos(a) * (mr + 5), my + Math.sin(a) * (mr + 4), fold[1]); }
  // the lamprey mouth, facing you: puckered lips peel back into rings of hooked teeth, a red throat
  p.ellipse(mx, my, mr + 2.6, mr + 2.1, fold[1]);
  p.ellipse(mx, my - 0.5, mr + 2, mr + 1.4, fold[3]);
  p.ellipse(mx, my, mr + 1.2, mr + 0.9, '#9a2a3a');
  p.ellipse(mx, my, mr, mr * 0.9, '#22050c');
  p.ellipse(mx, my + 0.8, mr * 0.45, mr * 0.4, '#7a1424');
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + s.t * 0.8; const x = mx + Math.cos(a) * mr * 0.95, y = my + Math.sin(a) * mr * 0.88; p.set(x, y, '#f4ecd8'); p.set(x - Math.cos(a) * 0.9, y - Math.sin(a) * 0.9, '#c8b890'); }
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - s.t; p.set(mx + Math.cos(a) * mr * 0.55, my + Math.sin(a) * mr * 0.5, '#d8c8b0'); }
  if (open > 0.4) { dribble(p, Math.round(mx - 2), Math.round(my + mr + 1), 2 + Math.round(open * 4), '#d8eadc'); dribble(p, Math.round(mx + 3), Math.round(my + mr), 1 + Math.round(open * 3), '#c8e0d0'); }
  // her eyes: one huge stolen eye up on the brow, watching you, and a crust of small black ones
  for (const [ex, ey, er] of [[6, -6, 1.3], [8, -2.5, 1], [3, -9.5, 1.1], [-9, -2, 0.9], [9.5, 1.5, 0.8]] as [number, number, number][]) {
    p.ball(hx + ex, hy + ey, er + 0.5, er + 0.5, ramp('#14080c')); p.set(hx + ex - 0.5, hy + ey - 0.5, '#ffffff');
  }
  eyeball(p, s, hx - 4, hy - 6 - rear * 0.5, 4.2, s.phase ? '#c82a2a' : '#7a9a30', { anger: 0.35 + s.phase * 0.4, side: 1, veins: 5 });
  brow(p, hx - 10, hy - 12, 11, 3, '#b07a6a', 2);
  if (s.death > 0) melt(p, s.death, floor, 11);
}

// ------------------------------------------------------------------ The Wardrobe
// Grandmother's walnut wardrobe, and the man who lives inside it. Closed, it's furniture with a
// carved face that scowls and one yellow eye at the keyhole. Open, the doors are jaws lined with
// splintered wooden teeth, coat sleeves hang out like tongues, and something with too many eyes
// fills the dark. Hurt, it splits and the doors hang off their hinges.
export function paintWardrobe(p: PixelArt, s: Pose): void {
  const open = Math.min(1, s.x.open ?? 0), tilt = s.x.tilt ?? 0;
  const wood = ramp(s.phase ? '#64391f' : '#6e4228'), dark = ramp('#341e14'), brass = ramp('#c89a3a');
  const lift = Math.round(Math.max(0, -s.lean) * 3 - s.squash * 4);
  const x0 = 8, W = 36, H = 44, y0 = p.h - H - 7 - lift + Math.round(s.death * 10);
  // lion-claw feet gripping the floor
  for (const lx of [x0 + 3, x0 + W - 5]) {
    p.tube(lx, y0 + H - 1, lx, p.h - 4, 2.2, dark);
    claw(p, lx, p.h - 3, Math.PI / 2, 0.5 + Math.max(0, s.squash) * 2, '#3a2418', '#efe2c0', 3, 3);
  }
  // the carcass, shaded deep so it reads as a heavy box
  p.rect(x0, y0, W, H, wood[2]); p.shadeV(x0, y0, W, H, wood, 0.5);
  for (let i = 0; i < W; i += 3) for (let j = 0; j < H; j++) if (h01(i, j * 3) < 0.25) p.set(x0 + i + (j % 7 === 0 ? 1 : 0), y0 + j, wood[1]);
  p.rect(x0, y0, 2, H, wood[3]); p.rect(x0 + W - 3, y0, 3, H, wood[0]);
  p.rect(x0 - 1, y0 + H - 3, W + 2, 3, wood[1]); p.rect(x0 - 1, y0 + H - 3, W + 2, 1, wood[3]);
  // carved crown: a snarling wooden face with horns
  const cx = x0 + W / 2;
  p.poly([x0 - 3, y0 + 1, x0 + 4, y0 - 5, cx, y0 - 10, x0 + W - 4, y0 - 5, x0 + W + 3, y0 + 1], wood[3]);
  p.poly([x0 - 3, y0 - 1, x0 - 6, y0 - 9, x0 + 2, y0 - 4], wood[2]); p.poly([x0 + W + 3, y0 - 1, x0 + W + 6, y0 - 9, x0 + W - 2, y0 - 4], wood[2]);
  p.ball(cx, y0 - 4, 5, 4, wood, { dither: 0.3 });
  brow(p, cx - 4, y0 - 7, 3, 1.5 + s.phase, '#3a2418', 1); brow(p, cx + 1, y0 - 5.5, 3, -1.5 - s.phase, '#3a2418', 1);
  p.set(cx - 2, y0 - 5, '#ffd040'); p.set(cx + 2, y0 - 5, '#ffd040');
  p.line(cx - 3, y0 - 2, cx + 3, y0 - 2, '#1a0a08'); for (let i = -2; i <= 2; i += 2) p.set(cx + i, y0 - 2, '#efe2c0');
  // the dark inside
  const iw = W - 6, iy = y0 + 5, ih = H - 10;
  p.rect(x0 + 3, iy, iw, ih, '#0c0608');
  if (open > 0.05) {
    // the thing that lives in there: a mass of eyes over a wet mouth, coat hangers for ribs
    for (let i = 0; i < 3; i++) p.line(x0 + 9 + i * 7, iy + 2, x0 + 11 + i * 7, iy + 5, hex('#8a8a92'));
    p.ball(cx, iy + ih * 0.55, iw * 0.38, ih * 0.42, ramp('#4a1a22'), { dither: 0.6 });
    eyeball(p, s, cx - 6, iy + 10, 3.2, '#e8c030', { sclera: '#f0d860', anger: 0.5, side: -1 });
    eyeball(p, s, cx + 6, iy + 10, 3.2, '#e8c030', { sclera: '#f0d860', anger: 0.5, side: 1 });
    eyeball(p, s, cx, iy + 5, 2, '#e8c030', { sclera: '#f0d860' });
    for (const [ex, ey] of [[cx - 11, iy + 18], [cx + 10, iy + 20], [cx - 3, iy + 27]]) { p.set(ex, ey, '#f0d040'); p.set(ex + 1, ey, '#fff4a0'); }
    jaws(p, cx, iy + 22, 18, 10, open * (0.6 + s.jaw * 0.4), { gum: '#8a2030', lip: '#5a1420', tongue: '#b8384a', seed: 7, grin: 0.4 });
    // a coat sleeve lolling out like a tongue
    p.tube(cx + 3, iy + ih - 6, cx + 7, iy + ih + 4, 1.8, ramp('#4a4a6a')); p.set(cx + 7, iy + ih + 5, '#e8c8a8');
  } else {
    // shut: one eye at the keyhole, watching you
    p.rect(cx - 1, iy + 15, 3, 5, '#0a0404');
    if (s.hurt < 0.5) s.eyes.push({ x: cx, y: iy + 16, r: 1.6, iris: '#f0c040', glint: false });
  }
  // the doors: swing open into jaws, splintered teeth along their edges
  const dw = Math.round((iw / 2) * (1 - open * 0.85));
  for (const side of [0, 1]) {
    const dx = side ? x0 + 3 + iw - dw : x0 + 3;
    const sag = s.phase && side === 0 ? 2 : 0;   // in phase 2 one door hangs off its hinge
    p.rect(dx, iy + sag, dw, ih, wood[2]);
    if (dw > 4) {
      p.rect(dx + 1, iy + 3 + sag, dw - 2, ih - 6, wood[1]); p.rect(dx + 2, iy + 4 + sag, dw - 4, ih - 8, wood[2]);
      if (side === 1 && dw > 8) {
        // the cracked mirror, with someone else's face in it
        p.rect(dx + 3, iy + 6, dw - 6, 14, hex('#7a90a4')); p.shadeV(dx + 3, iy + 6, dw - 6, 14, ramp('#7a90a4'), 0.4);
        p.ball(dx + dw / 2, iy + 12, 2.5, 3, ramp('#c8b8a8')); p.set(dx + dw / 2 - 1, iy + 11, '#1a1010'); p.set(dx + dw / 2 + 1, iy + 11, '#1a1010');
        p.line(dx + 4, iy + 8, dx + dw - 4, iy + 17, '#e8f4ff');
      }
      p.ball(side ? dx + 2 : dx + dw - 3, iy + ih / 2, 1.3, 1.6, brass);
    }
    if (open > 0.25) for (let y = iy + 2; y < iy + ih - 2; y += 3) { const tx = side ? dx - 1 : dx + dw; p.set(tx, y, '#efe2c0'); p.set(tx + (side ? -1 : 1), y + 1, '#c8b890'); }
    // swung doors, seen edge-on beside the carcass
    if (open > 0.6) { const ox = side ? x0 + W : x0 - 6; p.rect(ox, iy + 1 + sag, 6, ih - 2, wood[1]); for (let y = iy + 3; y < iy + ih - 2; y += 4) p.set(side ? ox + 5 : ox, y, '#efe2c0'); }
  }
  // shut, but not quiet: long grey fingers curl out through the gap, and something dark seeps
  // from under the doors
  if (open < 0.2) {
    const gx = cx, wig = Math.round(s.breath * 1.5);
    for (const [fy, len] of [[iy + 9, 5], [iy + 13, 6], [iy + 17, 4], [iy + 25, 5]] as [number, number][]) {
      const side = fy % 2 ? 1 : -1;
      for (let j = 0; j < len; j++) p.set(gx + side * (1 + j), fy + Math.round(Math.sin(j * 0.9 + wig) * 0.8) + (j > len - 3 ? 1 : 0), j === len - 1 ? '#e8dcc8' : '#b8b0a8');
    }
    for (let i = 0; i < 4; i++) { const dx = x0 + 8 + i * 7; for (let j = 0; j < 2 + ((i + Math.round(s.t * 4)) % 3); j++) p.set(dx, y0 + H + j, '#1a0a14'); }
  }
  // splits in the wood once it's hurt
  if (s.phase) { gash(p, x0 + 4, y0 + 2, x0 + 9, y0 + 14, { stitch: '#1a1010', blood: '#5a1a12' }); gash(p, x0 + W - 6, y0 + H - 16, x0 + W - 2, y0 + H - 6, { stitch: '', blood: '#5a1a12' }); }
  void tilt;
  if (s.death > 0) melt(p, s.death, p.h - 2, 23);
}

// ------------------------------------------------------------------ The Twin Snips
// Grandmother's sewing shears, walking on their finger loops like legs. The pivot screw has become
// a bulging, bloodshot eye, the blades are honed into a mouth of serrated teeth that opens when they
// cut, and the loops end in little clawed feet. Snip is rust-red and lunges; Snap is brass and spits.
export function paintSnip(p: PixelArt, s: Pose, brass: boolean): void {
  const blade = ramp('#c8ccd8'), handle = ramp(brass ? '#c89a3a' : '#9a2a3a');
  const open = Math.min(1, Math.max(s.x.open ?? 0, s.jaw * 0.6 + Math.max(0, -s.lean) * 0.6));
  const cx = 18, cy = 21 - Math.round(Math.abs(s.step) * 1.5) + Math.round(s.squash * 4) + Math.round(s.death * 6);
  const a = 0.14 + open * 0.55 + (s.anim === 'idle' ? s.breath * 0.03 : 0);
  // blades: two jaws with serrated inner edges, a nick and blood near the tips
  for (const side of [-1, 1]) {
    const tx = cx + side * (3 + Math.sin(a) * 16), ty = cy - 19 + Math.round(s.hurt * 2);
    p.poly([cx - side * 1, cy + 1, cx + side * 3, cy - 1, tx, ty, tx - side * 2, ty + 1], side < 0 ? blade[3] : blade[2]);
    p.line(cx + side * 3, cy - 1, tx, ty, blade[4]);
    p.line(cx - side * 1, cy + 1, tx - side * 2, ty + 1, blade[1]);
    for (let k = 0.25; k < 0.95; k += 0.12) {   // teeth along the cutting edge
      const ex = cx - side + (tx - side * 2 - (cx - side)) * k, ey = cy + 1 + (ty + 1 - (cy + 1)) * k;
      p.set(ex - side, ey, '#efe6d0');
    }
    p.set(tx - side, ty + 2, '#8a1a24'); p.set(tx - side, ty + 3, '#6a0a14');
    if (s.phase) p.set(cx + side * (2 + Math.sin(a) * 8), cy - 9, '#2a2a30');   // chipped
  }
  // the finger loops walk like legs, ending in little claws
  const st = s.step * 2.2;
  for (const side of [-1, 1]) {
    const lx = cx + side * 7, ly = cy + 11 + side * st * 0.5;
    p.line(cx + side * 2, cy + 2, lx - side, ly - 4, handle[1]);
    p.ring(lx, ly, 4.5, handle[2], 2.2); p.ring(lx, ly, 3.3, side < 0 ? handle[3] : handle[1], 0.8);
    p.set(lx - 2, ly - 2, handle[4]);
    claw(p, lx + side * 1, ly + 5, Math.PI / 2, 0.4, brass ? '#a87a2a' : '#7a1a2a', '#efe6d0', 3, 2);
  }
  // the pivot screw is a bloodshot eye, rusted bolt heads round it like lashes
  p.ball(cx, cy, 4.6, 4.6, ramp('#d8d0c0'));
  for (let i = 0; i < 6; i++) p.set(cx + Math.cos(i * 1.05) * 4.4, cy + Math.sin(i * 1.05) * 4.4, '#8a5a3a');
  eyeball(p, s, cx, cy, 3, brass ? '#3a8a3a' : '#b02a2a', { anger: 0.6 + s.phase * 0.3, side: brass ? 1 : -1, veins: 4 });
  if (s.death > 0) melt(p, s.death, p.h - 2, brass ? 5 : 6);
}
void tatters;
