// Painted sprites for the creatures added in 2.0 (and a few older ones that only had a frame or two):
// shaded, articulated bodies with proper animation instead of small hand grids. Every one faces
// right; the game mirrors them.
import { frames, eye, teeth, ramp, PixelArt } from './creature';
import type { SpriteSet } from '../enemies/enemy';
const TAU = Math.PI * 2;
const wave = (f: number, n: number, ph = 0) => Math.sin((f / n) * TAU + ph);

/** A tilted sheet of paper: a quad around (cx, cy), w x h, turned by a, with two ruled lines. */
/** The same painter calls, drawn dy pixels lower (for parts that rise above the usual frame). */
function lowered(p: PixelArt, dy: number): PixelArt {
  const q = Object.create(p) as PixelArt;
  q.set = (x, y, c) => p.set(x, y + dy, c); q.paint = (x, y, c) => p.paint(x, y + dy, c);
  q.rect = (x, y, w, h, c) => { p.rect(x, y + dy, w, h, c); return q; };
  q.ellipse = (cx, cy, rx, ry, c, o) => { p.ellipse(cx, cy + dy, rx, ry, c, o); return q; };
  q.ball = (cx, cy, rx, ry, r, o) => { p.ball(cx, cy + dy, rx, ry, r, o); return q; };
  q.line = (x0, y0, x1, y1, c, th) => { p.line(x0, y0 + dy, x1, y1 + dy, c, th); return q; };
  q.shadeV = (x, y, w, h, r, d, i) => { p.shadeV(x, y + dy, w, h, r, d, i); return q; };
  q.poly = (pts, c) => { p.poly(pts.map((v, i) => (i % 2 ? v + dy : v)), c); return q; };
  q.tube = (x0, y0, x1, y1, r, rm, o) => { p.tube(x0, y0 + dy, x1, y1 + dy, r, rm, o); return q; };
  q.ring = (cx, cy, r, c, th) => { p.ring(cx, cy + dy, r, c, th); return q; };
  return q;
}
function sheet(p: PixelArt, cx: number, cy: number, w: number, h: number, a: number, fill: string, rule: string, edge: string): void {
  const c = Math.cos(a), s = Math.sin(a), pt = (x: number, y: number) => [cx + x * c - y * s, cy + x * s + y * c];
  const q = [pt(-w / 2, -h / 2), pt(w / 2, -h / 2), pt(w / 2, h / 2), pt(-w / 2, h / 2)].flat();
  p.poly(q, fill);
  for (const k of [-0.15, 0.2]) { const [x0, y0] = pt(-w / 2 + 1, h * k), [x1, y1] = pt(w / 2 - 1, h * k); p.line(x0, y0, x1, y1, rule); }
  const [ex0, ey0] = pt(-w / 2, h / 2), [ex1, ey1] = pt(w / 2, h / 2); p.line(ex0, ey0, ex1, ey1, edge);
}

// ------------------------------------------------------------------ Paper Lurker
const PAPER = ['#efe4c8', '#ddd0b0', '#c4b592'];
function lurkerHeap(p: PixelArt, f: number, n: number, peek = 0): void {
  const b = wave(f, n) * 0.7;
  p.ball(14, 13 - b * 0.4, 12, 4.5 + b * 0.3, ramp('#a89878'));
  const S: [number, number, number, number, number][] = [[5, 12, 8, 5, -0.35], [22, 12, 8, 5, 0.4], [10, 9, 9, 5, 0.18], [18, 9, 9, 5, -0.22], [14, 11, 10, 5, 0.04], [8, 13, 7, 4, 0.1], [20, 13, 7, 4, -0.1]];
  S.forEach(([x, y, w, h, a], i) => sheet(p, x, y - b * (i > 1 ? 0.8 : 0.3), w, h, a + (peek ? Math.sin(f * 3 + i) * 0.12 : 0), PAPER[i % 3], '#9aa6c0', '#8a7c62'));
  if (peek) {
    p.ellipse(14, 11 - b, 4, 1.6, '#1a1218');
    p.set(12, 11 - b, '#ff4a3a'); p.set(16, 11 - b, '#ff4a3a');
    for (let i = 0; i < 4; i++) p.set(12.5 + i, 12.2 - b, '#efe4c8');
  }
}
function lurkerWalk(p: PixelArt, f: number, n: number): void {
  const st = wave(f, n), lift = Math.abs(st) * 0.8;
  // six rolled-paper legs, alternating
  for (let i = 0; i < 3; i++) {
    const ph = (i % 2 ? 1 : -1) * st, x = 8 + i * 6;
    p.tube(x, 12, x - 3 + ph * 2, 18, 1, ramp('#cfc2a0')); p.set(x - 3 + ph * 2, 18, '#8a7c62');
    p.tube(x + 2, 12, x + 4 - ph * 2, 18, 1, ramp('#d8cca8')); p.set(x + 4 - ph * 2, 18, '#8a7c62');
  }
  // a crumpled body of creased sheets
  p.ball(14, 10 - lift, 10, 6, ramp('#dccfae'), { dither: 0.5 });
  for (let i = 0; i < 4; i++) p.line(7 + i * 4, 5 - lift, 9 + i * 4, 14 - lift, i % 2 ? '#a8987a' : '#f4ead2');
  sheet(p, 11, 5 - lift + st * 0.5, 7, 3, -0.4 + st * 0.15, '#f0e6cc', '#9aa6c0', '#8a7c62');
  sheet(p, 17, 4 - lift - st * 0.5, 6, 3, 0.35 - st * 0.15, '#e4d8ba', '#9aa6c0', '#8a7c62');
  // a torn-edge maw at the front, red eyes above it
  p.ellipse(22, 11 - lift, 3.5, 2.6, '#1a1016');
  for (let i = 0; i < 4; i++) { p.set(20 + i, 9 - lift, '#f4ead2'); p.set(20 + i + (i % 2), 13 - lift, '#f4ead2'); }
  p.set(20, 7 - lift, '#ff4a3a'); p.set(23, 7 - lift, '#ff4a3a'); p.set(20, 6 - lift, '#ffb0a0');
}

// ------------------------------------------------------------------ Mildew
function mildew(p: PixelArt, f: number, n: number, glow = 0): void {
  const b = wave(f, n) * (0.4 + glow * 0.6), cy = 9 - glow * 1.2 - b * 0.4, rx = 10 + glow, ry = 4.2 + glow * 0.5;
  // roots gripping the floor, a slim stalk with a torn ring
  for (const dx of [-5, -2, 2, 5]) p.line(11, 19, 11 + dx, 20, '#3e2a1e');
  p.tube(11, 19, 11, cy + 3, 1.7, ramp('#d8cfa8'));
  p.line(10, cy + 5, 10, 18, '#f0e8c8');
  p.ellipse(11, cy + 7, 3, 1, '#b8ae88'); p.set(9, cy + 8, '#b8ae88');
  // the cap: a low, mouldy dome, spotted and fuzzed
  p.ball(11, cy, rx, ry, ramp(glow > 0.6 ? '#7aaa44' : '#5e8a3a'), { bias: -0.1, dither: 0.7 });
  for (const [x, y, r] of [[5, 0, 1.2], [10, -2, 1.6], [15, -1, 1.1], [8, 1, 0.8], [17, 1, 0.8], [13, 1, 0.9]]) p.ellipse(x, cy + y, r, r * 0.8, glow ? '#eaffb0' : '#b8cc88');
  for (let i = 0; i < 6; i++) p.set(3 + i * 3.2, cy - ry + 1 + (i % 2), '#a8c878');
  // the gills under the rim, glowing as it swells
  const gill = glow > 0.6 ? '#d8ff80' : glow ? '#8ac04a' : '#2e3a22';
  p.ellipse(11, cy + ry - 0.5, rx - 1, 1.4, gill);
  for (let i = -8; i <= 8; i += 2) p.set(11 + i, cy + ry - 0.5, glow ? '#f4ffd0' : '#4a5a32');
}

// ------------------------------------------------------------------ Lampkeeper
function lampkeeper(p: PixelArt, f: number, n: number): void {
  const st = wave(f, n), sw = wave(f, n, 1.2) * 1.2, robe = ramp('#4c3c6a');
  // little feet under the hem
  p.ellipse(7 + st, 25, 1.5, 1, '#2a2030'); p.ellipse(11 - st, 25, 1.5, 1, '#2a2030');
  // a hunched hooded robe, swaying at the hem
  p.poly([3, 24, 5, 12, 9, 5, 13, 8, 15, 14, 16, 24, 12, 23 + st * 0.5, 8, 24 - st * 0.5], robe[1]);
  p.ball(9, 13, 6, 9, robe, { dither: 0.6 });
  for (let i = 0; i < 3; i++) p.line(6 + i * 3, 15, 5 + i * 3 + st * 0.5, 24, '#2e2442');
  // the hood: a deep shadow with two small lit eyes
  p.ball(9, 7, 5, 5, ramp('#5a4a7a'));
  p.ellipse(10, 8, 3, 2.6, '#120c1a');
  p.set(9, 8, '#ffd060'); p.set(11, 8, '#ffd060');
  // an arm out to the pole, and the lantern swinging on its hook
  p.tube(12, 13, 16, 12, 1.2, robe);
  p.line(16, 12, 17, 6, '#6a5232');
  const lx = 17 + sw, ly = 14;
  p.line(17, 6, lx, ly - 4, '#2a2018');
  p.rect(lx - 2, ly - 3, 5, 6, '#7a5a22'); p.rect(lx - 1, ly - 2, 3, 4, '#ffe08a'); p.set(lx, ly - 1, '#ffffff');
  p.line(lx - 2, ly - 4, lx + 2, ly - 4, '#c8a050'); p.line(lx - 2, ly + 3, lx + 2, ly + 3, '#c8a050');
}

// ------------------------------------------------------------------ Old Trunk
function trunk(p0: PixelArt, f: number, n: number, open = 0, jitter = 0): void {
  const p = lowered(p0, 5), wood = ramp('#8a5a34'), lid = ramp('#9a6a3c');
  const j = jitter ? (f % 2 ? 1 : -1) * jitter : 0;
  const gape = open ? 4 + open * 3 + wave(f, n) * 1 : jitter ? 1.2 : wave(f, n) > 0.85 ? 0.8 : 0;
  // the box
  p.rect(2, 11, 23, 10, wood[2]); p.shadeV(2, 11, 23, 10, wood, 0.5);
  for (const y of [14, 17]) p.line(2, y, 24, y, wood[1]);
  if (gape > 0.5) {
    // the mouth: a dark hold, teeth on both rims, a tongue
    p.rect(3, 11 - gape, 21, gape + 1, '#2a0a12');
    p.ellipse(13, 11 - gape * 0.3, 7, Math.max(1, gape * 0.45), '#8a2a3a');
    if (open) { p.ellipse(13 + wave(f, n) * 2, 10, 4, 1.6, '#d8506a'); p.set(18, 8 - gape * 0.4, '#ffd060'); }
    for (let x = 4; x < 23; x += 3) { p.set(x, 11, '#efe6d0'); p.set(x + 1, 11, '#efe6d0'); p.set(x, 11 - gape, '#efe6d0'); p.set(x + 1, 11 - gape + 1, '#efe6d0'); }
  }
  // the lid, lifted by the gape
  const ly = 6 - gape + j * 0.5;
  p.rect(2, ly, 23, 5, lid[2]); p.shadeV(2, ly, 23, 5, lid, 0.5); p.line(2, ly, 24, ly, lid[4]);
  // iron bands, brass corners, a lock
  for (const x of [6, 19]) { p.rect(x, ly, 2, 5, '#3a3436'); p.rect(x, 11, 2, 10, '#3a3436'); p.set(x, 13, '#8a8a90'); p.set(x, 19, '#8a8a90'); }
  for (const [x, y] of [[2, ly], [23, ly], [2, 19], [23, 19]]) p.rect(x, y, 2, 2, '#c89a3a');
  p.rect(12, ly + 3, 3, 3, '#d8b04a'); p.set(13, ly + 4, '#2a1a10');
  p.line(3, 21, 24, 21, '#2a1a10');
}

// ------------------------------------------------------------------ Bellows
function bellows(p0: PixelArt, f: number, n: number, fill = 0): void {
  const p = lowered(p0, 3), b = wave(f, n) * 0.5, gap = 7 + fill * 4 + b, mid = 12, top = mid - gap / 2, bot = mid + gap / 2;
  // the leather bag, ballooning between the paddles, pleated
  p.ball(11, mid, 9 + fill * 1.5, gap / 2 + 1.5 + fill, ramp('#7a3a2a'), { bias: -0.05 });
  for (let i = 1; i < 4; i++) { const y = top + (gap * i) / 4; p.line(4, y, 18, y, '#4a1e16'); p.line(5, y + 1, 17, y + 1, '#b8604a'); }
  // two teardrop wooden paddles, wide at the handles (left), narrow at the nozzle (right)
  for (const [y, up] of [[top, 1], [bot, 0]] as [number, number][]) {
    p.poly([0, y - 2, 6, y - 3, 16, y - 2, 22, y, 16, y + 2, 6, y + 3, 0, y + 2], up ? '#b07a44' : '#8a5a32');
    p.line(2, y - 1, 18, y - 1, up ? '#d8a868' : '#a8743e'); p.line(3, y + 1, 17, y + 1, up ? '#7a4e26' : '#5a3a1e');
    p.ellipse(-0.5, y, 1.5, 1.5, '#5a3a1e');
  }
  // a face on the top paddle, scrunched while it fills
  eye(p, 9, top - 0.5, 1.5, 0.7, 0, '#2a1a10'); eye(p, 13, top - 0.8, 1.5, 0.7, 0, '#2a1a10');
  if (fill > 0.5) { p.line(8, top - 3, 10, top - 2.5, '#3a2010'); p.line(12, top - 3, 14, top - 3.5, '#3a2010'); }
  // the brass nozzle; a puff when it blows
  p.tube(21, mid, 26, mid, 1.4, ramp('#c89a3a')); p.ring(26, mid, 1.5, '#8a6a22');
  if (fill < 0) for (let i = 0; i < 3; i++) p.ellipse(27 + i * 0.5, mid - 1 + i, 1.2, 1, '#e8e0d0');
}

// ------------------------------------------------------------------ Foreman
function foreman(p: PixelArt, f: number, n: number, lift = 0): void {
  const st = wave(f, n), bob = Math.abs(st) * 0.7;
  // stubby legs in boots
  p.tube(8, 20, 8 + st, 24, 1.6, ramp('#3a3a4a')); p.tube(13, 20, 13 - st, 24, 1.6, ramp('#3a3a4a'));
  p.ellipse(8 + st, 25, 2.2, 1, '#1a1418'); p.ellipse(13 - st, 25, 2.2, 1, '#1a1418');
  // a barrel body in overalls with a big belly
  p.ball(10.5, 15 - bob, 7, 7, ramp('#c86a3a'), { bias: -0.05 });
  p.rect(6, 15 - bob, 10, 6, '#3a4a6a'); p.line(7, 11 - bob, 7, 15 - bob, '#3a4a6a'); p.line(14, 11 - bob, 14, 15 - bob, '#3a4a6a');
  p.set(7, 15 - bob, '#d8b04a'); p.set(14, 15 - bob, '#d8b04a');
  // a red face, goggles pushed up, a bristling moustache
  p.ball(11, 8 - bob, 5, 4.5, ramp('#d88a6a'));
  p.rect(7, 5 - bob, 9, 2, '#3a3436'); p.ellipse(9, 5.5 - bob, 1.6, 1.4, '#7ac0d0'); p.ellipse(13, 5.5 - bob, 1.6, 1.4, '#7ac0d0');
  p.set(9, 8 - bob, '#1a1010'); p.set(13, 8 - bob, '#1a1010');
  p.line(9, 10 - bob, 14, 10 - bob, '#5a3a2a'); p.line(8, 11 - bob, 10, 10 - bob, '#5a3a2a'); p.line(15, 11 - bob, 13, 10 - bob, '#5a3a2a');
  // the brass whistle on a cap, lifted to the mouth when it blows
  p.ball(11, 4 - bob, 4, 2, ramp('#4a4a5a'));
  const wx = lift ? 15 : 13, wy = lift ? 9 - bob : 1 - bob;
  p.tube(wx, wy, wx, wy - 3, 1.1, ramp('#d8b04a')); p.set(wx, wy - 4, '#fff0a0');
  p.tube(16, 13 - bob, lift ? 15 : 18, lift ? 10 - bob : 17 - bob, 1.3, ramp('#d88a6a'));
}

// ------------------------------------------------------------------ Riveter
function riveter(p: PixelArt, f: number, n: number, aim = 0): void {
  const st = aim ? 0 : wave(f, n), hot = aim ? (f % 2 ? 1 : 0.6) : 0;
  // three jointed legs a side, planted wide when it aims
  for (let i = 0; i < 3; i++) {
    const x = 6 + i * 5, ph = (i % 2 ? 1 : -1) * st, spread = aim ? 1.5 : 0;
    p.line(x, 11, x - 2 - spread, 14 + ph, '#4a4a56'); p.line(x - 2 - spread, 14 + ph, x - 3 - spread, 18, '#2a2a32');
    p.line(x + 1, 11, x + 3 + spread, 14 - ph, '#5a5a66'); p.line(x + 3 + spread, 14 - ph, x + 4 + spread, 18, '#2a2a32');
  }
  // a riveted iron shell
  p.ball(12, 9, 9, 5, ramp('#6a6a78'), { bias: -0.1 });
  p.line(4, 10, 20, 10, '#3a3a44');
  for (let x = 6; x <= 18; x += 3) p.set(x, 7, '#c8c8d8');
  // a red sensor eye and the rivet gun
  p.ellipse(16, 7, 1.8, 1.6, '#2a0a0a'); p.set(16, 7, aim ? '#ff4030' : '#c02a20'); p.set(15, 6, '#ffb0a0');
  p.tube(18, 10, 25, 10, 1.5, ramp('#4a4a56'));
  p.rect(23, 9, 2, 3, '#2a2a32');
  if (hot) { p.set(25, 10, hot > 0.8 ? '#ffffff' : '#ff8060'); p.set(26, 10, '#ff4030'); }
  p.line(9, 4, 9, 2, '#8a8a98'); p.set(9, 1, aim ? '#ff4030' : '#7a2a2a');
}

// ------------------------------------------------------------------ Brickback
function brickback(p: PixelArt, f: number, n: number, raise = 0): void {
  const st = raise ? 0 : wave(f, n), skin = ramp('#6a5a4a');
  // thick legs
  p.tube(8, 18, 7 + st, 23, 2, skin); p.tube(14, 18, 15 - st, 23, 2, skin);
  p.ellipse(7 + st, 24, 2.4, 1, '#2a2018'); p.ellipse(15 - st, 24, 2.4, 1, '#2a2018');
  // a hunched, heavy body and a small head sunk between the shoulders
  p.ball(11, 14, 8, 7, skin, { dither: 0.6 });
  for (const [x, y] of [[6, 12], [9, 16], [13, 11], [15, 15]]) p.set(x, y, '#4a3a2e');
  p.ball(9, 9, 4, 3.5, ramp('#7a6a58'));
  p.set(8, 9, '#ffb040'); p.set(11, 9, '#ffb040'); p.line(8, 11, 11, 11, '#2a1a12');
  // the firebrick slab: held out in front, or lifted overhead to slam
  const sx = raise ? 5 : 17, sy = raise ? 1 : 7, w = raise ? 14 : 7, h = raise ? 5 : 15;
  p.rect(sx, sy, w, h, '#b8502e');
  for (let y = sy + 2; y < sy + h; y += 3) p.line(sx, y, sx + w - 1, y, '#e8d8c0');
  for (let y = sy; y < sy + h; y += 3) for (let x = sx + ((y - sy) / 3) % 2 * 2 + 1; x < sx + w; x += 4) p.set(x, y + 1, '#e8d8c0');
  p.line(sx, sy, sx + w - 1, sy, '#e8885a'); p.line(sx + w - 1, sy, sx + w - 1, sy + h - 1, '#6a2a18');
  if (raise) { p.tube(5, 12, 7, 5, 1.6, skin); p.tube(16, 12, 17, 5, 1.6, skin); }
  else p.tube(14, 13, 17, 13, 1.6, skin);
}

// ------------------------------------------------------------------ Sluice Keeper
function sluicekeeper(p: PixelArt, f: number, n: number, turning = 0): void {
  const st = turning ? 0 : wave(f, n), skin = ramp('#4e6e5c'), bob = Math.abs(st) * 0.6;
  // webbed feet, a squat slick body in a rubber apron
  p.ellipse(7 + st, 23, 2.5, 1, '#2a3a30'); p.ellipse(13 - st, 23, 2.5, 1, '#2a3a30');
  p.tube(7, 19, 7 + st, 22, 1.6, skin); p.tube(13, 19, 13 - st, 22, 1.6, skin);
  p.ball(10, 15 - bob, 7, 6.5, skin, { bias: -0.05 });
  p.poly([5, 13 - bob, 15, 13 - bob, 16, 21 - bob, 4, 21 - bob], '#3a3028'); p.line(5, 14 - bob, 15, 14 - bob, '#6a5a48');
  // a wide frog head, heavy-lidded, a drip off the chin
  p.ball(10, 8 - bob, 6, 4.5, ramp('#5e7e6a'));
  p.ellipse(7, 6 - bob, 2, 1.6, '#e8d890'); p.ellipse(13, 6 - bob, 2, 1.6, '#e8d890');
  p.line(5, 5 - bob, 9, 5 - bob, '#2e4236'); p.line(11, 5 - bob, 15, 5 - bob, '#2e4236');
  p.set(7, 6 - bob, '#1a1a10'); p.set(13, 6 - bob, '#1a1a10');
  p.line(6, 10 - bob, 14, 10 - bob, '#24342a'); p.set(10, 12 - bob + (f % 2), '#9ad0e8');
  // the iron wheel on its post, spokes turning while it works the sluice
  const wx = 21, wy = 13, rot = turning ? (f / n) * (TAU / 4) : 0;
  p.line(wx, wy, wx, 23, '#3a3436');
  p.ring(wx, wy, 5, '#7a5a3a', 1.5); p.ring(wx, wy, 5, '#a87a4a');
  for (let k = 0; k < 4; k++) { const a = rot + (k * TAU) / 4; p.line(wx, wy, wx + Math.cos(a) * 4.5, wy + Math.sin(a) * 4.5, '#5a4a3a'); }
  p.ellipse(wx, wy, 1.3, 1.3, '#c8a050');
  p.tube(15, 14 - bob, turning ? wx - 3 + Math.cos(rot) * 2 : 18, turning ? wy + Math.sin(rot) * 2 : 15, 1.4, skin);
}

// ------------------------------------------------------------------ Bilge Priest
function bilgepriest(p: PixelArt, f: number, n: number, cast = 0): void {
  const sw = wave(f, n) * 0.8, robe = ramp('#2e4a7a');
  // a long waterlogged robe, dripping at the hem
  p.poly([3, 27, 6, 10, 10, 6, 14, 10, 16, 27], robe[1]);
  p.ball(9.5, 16, 6, 11, robe, { dither: 0.6 });
  for (let i = 0; i < 3; i++) p.line(6 + i * 3, 14, 5 + i * 3 + sw * 0.4, 27, '#1a2a4a');
  for (const x of [4, 8, 12, 15]) p.set(x, 27 + ((f + x) % 2), '#7ab0e0');
  // a tall barnacled mitre over a drowned grey face
  p.poly([6, 7, 9.5, -1 + (cast ? -1 : 0), 13, 7], '#4a6a9a'); p.line(9.5, 0, 9.5, 6, '#c8d8e8');
  for (const [x, y] of [[7, 5], [11, 3], [12, 6]]) p.set(x, y, '#d8d0b8');
  p.ball(9.5, 9, 3.5, 3, ramp('#8a9a9a'));
  p.set(8, 9, cast ? '#a0d8ff' : '#1a2a3a'); p.set(11, 9, cast ? '#a0d8ff' : '#1a2a3a'); p.line(8, 11, 11, 11, '#3a4a4a');
  // the hooked staff, held up and glowing while it chants
  const sx = 16, top = cast ? 0 : 4;
  p.line(sx, top + 3, sx, 27, '#5a4a32'); p.line(sx + 1, top + 3, sx + 1, 27, '#3a2e20');
  p.line(sx, top + 3, sx - 1, top + 1, '#7a6a52'); p.line(sx - 1, top + 1, sx + 1, top, '#7a6a52'); p.line(sx + 1, top, sx + 3, top + 1, '#7a6a52'); p.line(sx + 3, top + 1, sx + 3, top + 3, '#7a6a52');
  if (cast) { const g = 1 + (f % 2) * 0.6; p.ellipse(sx + 1.5, top + 1.5, g + 1, g + 1, '#5aa0ff'); p.set(sx + 1.5, top + 1.5, '#ffffff'); }
  p.tube(13, 14, sx, cast ? 9 : 15, 1.3, robe);
  if (cast) p.tube(6, 14, 3, 8, 1.3, robe);
}

// ------------------------------------------------------------------ Fumarole
function fumarole(p: PixelArt, f: number, n: number, hot = 0): void {
  const g = hot ? 0.6 + 0.4 * wave(f, n) : 0.25 + 0.1 * wave(f, n);
  // broken flagstones heaved up around a crack
  for (const [x, y, w, a] of [[3, 7, 7, -0.2], [17, 7, 7, 0.25], [10, 9, 8, 0.05], [6, 4, 6, 0.3], [16, 4, 6, -0.3]] as number[][]) {
    p.poly([x - w / 2, y + Math.sin(a) * 3, x + w / 2, y - Math.sin(a) * 3, x + w / 2, y + 3 - Math.sin(a) * 3, x - w / 2, y + 3 + Math.sin(a) * 3], '#5a5650');
    p.line(x - w / 2, y + Math.sin(a) * 3, x + w / 2, y - Math.sin(a) * 3, '#8a8478');
  }
  // the crack, glowing sickly green
  p.poly([4, 6, 9, 4.5, 12, 6, 16, 4.5, 20, 6, 16, 7.5, 12, 6.8, 8, 7.5], g > 0.5 ? '#a8e070' : '#4a7a2a');
  p.line(5, 6, 19, 6, g > 0.7 ? '#eaffb0' : '#7aba3a');
  if (hot) for (let i = 0; i < 3; i++) { const bx = 8 + i * 4, by = 4 - ((f + i) % n) * 1.5; p.ring(bx, by, 1, '#c8f080'); }
}

// ------------------------------------------------------------------ Spilled Pills
function pill(p: PixelArt, f: number, n: number): void {
  const a = (f / n) * Math.PI, cx = 6, cy = 5, L = 4, c = Math.cos(a) * L, s = Math.sin(a) * L * 0.6;
  p.tube(cx - c, cy - s, cx, cy, 2.3, ramp('#c8343c'));
  p.tube(cx, cy, cx + c, cy + s, 2.3, ramp('#efe6dc'));
  p.set(cx - c * 0.5 - 1, cy - s * 0.5 - 1.5, '#ffb0b0'); p.set(cx + c * 0.5 - 1, cy + s * 0.5 - 1.5, '#ffffff');
}

// ------------------------------------------------------------------ Monitor
function monitor(p: PixelArt, f: number, n: number, mode = 0): void {
  // a wheeled stand and pole
  p.line(3, 25, 15, 25, '#3a3e44'); for (const x of [3, 9, 15]) p.ellipse(x, 25.5, 1.3, 1, '#1a1c20');
  p.tube(9, 24, 9, 14, 1, ramp('#7a8088'));
  // a boxy screen with a bezel and a knob
  p.rect(1, 2, 17, 13, '#3e4a4a'); p.shadeV(1, 2, 17, 13, ramp('#56625e'), 0.4); p.line(1, 2, 17, 2, '#8a9890');
  const scr = mode === 1 ? (f % 2 ? '#5a1010' : '#2a0606') : '#0a1a14';
  p.rect(3, 4, 12, 8, scr);
  // the trace: a heartbeat scrolling across, red when it alarms
  const col = mode === 1 ? '#ff5040' : mode === 2 ? '#c8ffd0' : '#4ae07a';
  let py = 8;
  for (let x = 0; x < 12; x++) {
    const k = (x + f * 3) % 12, y = k === 5 ? 5 : k === 6 ? 11 : k === 7 ? 7 : 8;
    p.line(3 + Math.max(0, x - 1), py, 3 + x, y, col); py = y;
  }
  p.set(16, 13, mode === 1 ? '#ff3020' : '#3ae060');
}

// ------------------------------------------------------------------ Mourner
function mourner(p: PixelArt, f: number, n: number, kneel = 0): void {
  const sw = wave(f, n) * 0.6, dress = ramp('#4a4258'), sob = kneel ? (f % 2) * 0.6 : 0;
  if (!kneel) {
    // a long mourning dress, the hem stirring
    p.poly([3, 25, 6, 11, 12, 11, 15, 25, 12, 24 + sw, 6, 25 - sw], dress[1]);
    p.ball(9, 17, 5.5, 9, dress, { dither: 0.6 });
    for (let i = 0; i < 3; i++) p.line(6 + i * 3, 14, 5 + i * 3 + sw * 0.5, 25, '#2a2436');
  } else {
    // kneeling: the skirt pooled on the floor
    p.ball(9, 21, 8, 4.5, dress, { dither: 0.6 }); p.ball(9, 16 + sob, 5, 5, dress);
  }
  const hy = kneel ? 10 + sob : 6;
  // a pale bowed face behind a black lace veil, under a wide mourning hat
  p.ellipse(9.5, hy + 1, 3, 3.2, '#d8d0dc');
  p.set(8.5, hy + 1, '#4a4058'); p.set(10.5, hy + 1, '#4a4058'); p.line(9, hy + 3, 10, hy + 3, '#8a7a90');
  for (let y = -1; y <= 4; y += 2) for (let x = -3; x <= 3; x++) if ((x + y) % 2 === 0) p.set(9.5 + x, hy + y, '#3a3044');
  p.line(6, hy + 4, 13, hy + 4, '#1e1a24');
  p.ellipse(9.5, hy - 2, 7, 1.6, '#1e1a24'); p.ball(9.5, hy - 3.5, 3.5, 2.5, ramp('#2e2836'));
  p.line(6, hy - 4, 13, hy - 4, '#6a5a7a');
  p.ellipse(9, hy + 9, 2.2, 1.5, '#d8d0e0');
  p.line(9, hy + 9, 11, hy + 13, '#5a8a4a'); p.ellipse(11.5, hy + 13.5, 1.8, 1.4, '#f4f0f8'); p.set(11.5, hy + 13.5, '#e8d870');
}

// ------------------------------------------------------------------ Ink Mite
function mite(p: PixelArt, f: number, n: number): void {
  const flap = wave(f, n);
  for (const s of [-1, 1]) {
    p.ellipse(6 + s * 3.5, 4 - flap * 1.2, 2.6, 1.6 + Math.abs(flap) * 0.6, '#c4ccf4'); p.set(6 + s * 4.5, 3.5 - flap * 1.2, '#eef0ff');
    p.line(6 + s, 6, 6 + s * 5, 4 - flap * 1.2, '#9aa8e8');
  }
  p.ball(6, 7, 3.5, 3, ramp('#3a3486'));
  p.set(5, 7, '#ff5a5a'); p.set(7, 7, '#ff5a5a'); p.set(5, 6, '#ffd0d0');
  p.line(6, 10, 6, 11, '#1a1640'); p.line(4, 9, 3, 11, '#1a1640'); p.line(8, 9, 9, 11, '#1a1640');
}

// ------------------------------------------------------------------ Skull Mote
function skullmote(p: PixelArt, f: number, n: number): void {
  const jaw = Math.max(0, wave(f, n)) * 1.5, bone = ramp('#e0d4b8');
  p.ball(6, 5, 5, 4.5, bone);
  p.ellipse(4, 5, 1.4, 1.6, '#1a1410'); p.ellipse(8, 5, 1.4, 1.6, '#1a1410');
  p.set(4, 5, f % 2 ? '#8aff8a' : '#4ad04a'); p.set(8, 5, f % 2 ? '#8aff8a' : '#4ad04a');
  p.set(6, 7, '#3a2e24');
  p.rect(3, 8 + jaw, 6, 2, bone[2]); for (let x = 3; x < 9; x += 2) { p.set(x, 8, '#f4ecd8'); p.set(x, 8 + jaw + 1, '#a89870'); }
  p.line(2, 3, 4, 1, '#f8f0dc');
}

// ------------------------------------------------------------------ Swinging Censer
function censer(p: PixelArt, f: number, n: number): void {
  const brass = ramp('#c89a3a'), glow = f % 2 ? '#ffb040' : '#ff7a20';
  p.line(7, 0, 7, 5, '#8a7a5a'); p.line(5, 0, 6, 5, '#6a5a3a'); p.line(9, 0, 8, 5, '#6a5a3a');
  p.ball(7, 7, 3, 2, brass);
  p.ball(7, 13, 6, 6, brass, { bias: -0.1 });
  for (let i = 0; i < 4; i++) { const x = 3 + i * 2.7; p.ellipse(x, 12 + (i % 2), 0.9, 1.2, '#2a1406'); if ((i + f) % 2) p.set(x, 12 + (i % 2), glow); }
  p.line(2, 15, 12, 15, '#8a6a22'); p.line(2, 10, 12, 10, '#e8c870');
  p.ball(7, 20, 2.5, 1.5, ramp('#a87a2a'));
  p.ellipse(7, 13 - 4, 1, 0.6, glow);
}

export function sprites2(id: string): SpriteSet {
  switch (id) {
    case 'lurker': return { heap: frames(28, 18, 4, (p, f, n) => lurkerHeap(p, f, n)), peek: frames(28, 18, 2, (p, f, n) => lurkerHeap(p, f, n, 1)), walk: frames(28, 21, 6, lurkerWalk) };
    case 'mildew': return { idle: frames(23, 22, 4, (p, f, n) => mildew(p, f, n)), swell: frames(23, 22, 3, (p, f, n) => mildew(p, f, n, (f + 1) / n)) };
    case 'lampkeeper': return { walk: frames(22, 27, 6, lampkeeper) };
    case 'trunk': return { shut: frames(27, 28, 4, (p, f, n) => trunk(p, f, n)), rattle: frames(27, 28, 2, (p, f, n) => trunk(p, f, n, 0, 1)), air: frames(27, 28, 1, (p, f, n) => trunk(p, f, n, 0.3)), open: frames(27, 28, 3, (p, f, n) => trunk(p, f, n, 1)) };
    case 'bellows': return { idle: frames(30, 24, 4, (p, f, n) => bellows(p, f, n)), suck: frames(30, 24, 3, (p, f, n) => bellows(p, f, n, (f + 1) / n)), blow: frames(30, 24, 2, (p, f, n) => bellows(p, f, n, -0.5)) };
    case 'foreman': return { walk: frames(22, 26, 4, (p, f, n) => foreman(p, f, n)), lift: frames(22, 26, 2, (p, f, n) => foreman(p, f, n, 1)) };
    case 'riveter': return { walk: frames(28, 19, 4, (p, f, n) => riveter(p, f, n)), aim: frames(28, 19, 2, (p, f, n) => riveter(p, f, n, 1)) };
    case 'brickback': return { walk: frames(26, 25, 4, (p, f, n) => brickback(p, f, n)), raise: frames(26, 25, 1, (p, f, n) => brickback(p, f, n, 1)) };
    case 'sluicekeeper': return { walk: frames(28, 25, 4, (p, f, n) => sluicekeeper(p, f, n)), turn: frames(28, 25, 4, (p, f, n) => sluicekeeper(p, f, n, 1)) };
    case 'bilgepriest': return { idle: frames(21, 29, 4, (p, f, n) => bilgepriest(p, f, n)), cast: frames(21, 29, 4, (p, f, n) => bilgepriest(p, f, n, 1)) };
    case 'fumarole': return { idle: frames(24, 12, 4, (p, f, n) => fumarole(p, f, n)), hot: frames(24, 12, 4, (p, f, n) => fumarole(p, f, n, 1)) };
    case 'pill': return { roll: frames(13, 10, 4, pill) };
    case 'monitor': return { idle: frames(19, 27, 4, (p, f, n) => monitor(p, f, n)), alarm: frames(19, 27, 2, (p, f, n) => monitor(p, f, n, 1)), stream: frames(19, 27, 2, (p, f, n) => monitor(p, f, n, 2)) };
    case 'mourner': return { stand: frames(19, 27, 4, (p, f, n) => mourner(p, f, n)), kneel: frames(19, 27, 2, (p, f, n) => mourner(p, f, n, 1)) };
    case 'mite': return { idle: frames(13, 12, 4, mite) };
    case 'skullmote': return { idle: frames(13, 12, 4, skullmote) };
    case 'censer': return { idle: frames(15, 23, 4, censer) };
  }
  throw new Error('no painted sprites for ' + id);
}
