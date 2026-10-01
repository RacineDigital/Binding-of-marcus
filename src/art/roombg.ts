// Paints a room's static background: floor, perspective walls, ambient occlusion and decor.
import { PixelArt, BAYER4 } from '../render/pixel';
import { Col, hex, ramp, mix, darken, lighten, pack } from '../render/color';
import { RNG } from '../core/rng';
import { TILE } from '../core/constants';
import { FloorTheme } from '../data/floors';
import { RoomData } from '../rooms/room';
import { fbm, hash2, vnoise } from './noise';

export const BG_MARGIN = 16;

interface Ctx { p: PixelArt; M: number; x0: number; y0: number; w: number; h: number; rng: RNG; seed: number; t: FloorTheme; room: RoomData }

function jit(c: Col, amt: number, r: number): Col {
  return r < 0.5 ? darken(c, (0.5 - r) * 2 * amt) : lighten(c, (r - 0.5) * 2 * amt * 0.7);
}

// ---------------------------------------------------------------- floors
function floorFlag(c: Ctx): void {
  // Irregular flagstones: stretched Voronoi slabs with bevelled edges, grime and damp.
  const { p, x0, y0, w, h } = c;
  const base = hex(c.t.pal.floor), alt = hex(c.t.pal.floor2), grout = hex(c.t.pal.grout);
  const SX = 28, SY = 20;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const gx0 = Math.floor(x / SX), gy0 = Math.floor(y / SY);
    let d1 = 1e9, d2 = 1e9, id = 0, fx1 = 0, fy1 = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = gx0 + i, gy = gy0 + j;
      const fx = (gx + 0.2 + hash2(gx, gy, c.seed) * 0.6) * SX, fy = (gy + 0.2 + hash2(gx, gy, c.seed + 1) * 0.6) * SY;
      const dx = (x - fx) / SX, dy = (y - fy) / SY;
      const d = Math.max(Math.abs(dx), Math.abs(dy)) * 0.6 + Math.hypot(dx, dy) * 0.4;
      if (d < d1) { d2 = d1; d1 = d; id = gx * 7919 + gy * 31; fx1 = fx; fy1 = fy; } else if (d < d2) d2 = d;
    }
    const edge = (d2 - d1) * 16;
    let v = jit(mix(base, alt, hash2(id, 1, c.seed)), 0.16, hash2(id, 2, c.seed));
    const n = fbm(x * 0.12, y * 0.12, c.seed + id, 2);
    if (n > 0.6) v = darken(v, 0.07); else if (n < 0.32) v = lighten(v, 0.04);
    if (edge < 1.1) v = grout;
    else if (edge < 2.1) v = (y < fy1 || x < fx1) ? lighten(v, 0.07) : darken(v, 0.14);
    else if (edge < 3.2 && (y > fy1)) v = darken(v, 0.06);
    const grime = fbm(x * 0.03, y * 0.03, c.seed + 5, 3);
    if (grime > 0.56) v = mix(v, hex('#1a1412'), Math.min(0.55, (grime - 0.56) * 2.2));
    const damp = fbm(x * 0.05 + 40, y * 0.05, c.seed + 9, 3);
    if (damp > 0.64 && edge >= 1.1) v = mix(v, hex(c.t.pal.stain), Math.min(0.5, (damp - 0.64) * 3));
    if (hash2(x, y, c.seed + 77) < 0.012) v = darken(v, 0.12);
    p.set(x0 + x, y0 + y, v);
  }
  cracks(c, 3 + c.rng.int(0, 3), darken(grout, 0.05));
}
function floorPlanks(c: Ctx): void {
  // Long floorboards with grain, knots, nail heads and dark gaps.
  const { p, x0, y0, w, h } = c;
  const base = hex(c.t.pal.floor), alt = hex(c.t.pal.floor2), grout = hex(c.t.pal.grout);
  const ph = 7;
  for (let y = 0; y < h; y++) {
    const row = Math.floor(y / ph), ly = y % ph;
    // each row is split into boards of varying length
    let x = -Math.floor(hash2(row, 9, c.seed) * 60), board = 0;
    while (x < w) {
      const len = 34 + Math.floor(hash2(row, board, c.seed + 3) * 50);
      const tone = jit(mix(base, alt, hash2(row, board, c.seed + 5)), 0.1, hash2(board, row, c.seed + 7));
      for (let i = Math.max(0, x); i < Math.min(w, x + len); i++) {
        let v = tone;
        const grain = Math.sin((i + row * 13) * 0.18 + Math.sin(i * 0.05 + board) * 2 + ly * 0.9);
        if (grain > 0.82) v = darken(v, 0.1); else if (grain < -0.9) v = lighten(v, 0.05);
        if (ly === 0) v = grout; else if (ly === 1) v = lighten(v, 0.07); else if (ly === ph - 1) v = darken(v, 0.12);
        if (i === x || i === x + len - 1) v = darken(grout, 0);
        if ((i === x + 2 || i === x + len - 3) && (ly === 2 || ly === ph - 2)) v = hex('#8a8078');
        p.set(x0 + i, y0 + y, v);
      }
      // a knot now and then
      if (ly === 3 && hash2(row, board, c.seed + 11) < 0.25) { const kx = x + 6 + Math.floor(hash2(board, row, c.seed + 13) * Math.max(1, len - 12)); if (kx > 0 && kx < w - 1) { p.set(x0 + kx, y0 + y, darken(tone, 0.3)); p.set(x0 + kx + 1, y0 + y, darken(tone, 0.2)); } }
      x += len; board++;
    }
  }
  const dust = fbm(0, 0, c.seed, 1); void dust;
  cracks(c, 2, darken(grout, 0.05));
}
function floorBrick(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  const base = hex(c.t.pal.floor), alt = hex(c.t.pal.floor2), grout = hex(c.t.pal.grout);
  const bw = 12, bh = 6;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const row = Math.floor(y / bh);
    const off = (row % 2) * (bw / 2);
    const bx = Math.floor((x + off) / bw);
    const lx = (x + off) % bw, ly = y % bh;
    const r = hash2(bx, row, c.seed);
    let v = jit(mix(base, alt, hash2(bx, row, c.seed + 3)), 0.14, r);
    if (lx === 0 || ly === 0) v = grout;
    else if (ly === 1 || lx === 1) v = lighten(v, 0.08);
    else if (ly === bh - 1) v = darken(v, 0.12);
    const soot = fbm(x * 0.05, y * 0.05, c.seed + 9, 3);
    if (soot > 0.58) v = mix(v, hex('#120c0c'), Math.min(0.7, (soot - 0.58) * 3));
    p.set(x0 + x, y0 + y, v);
  }
  // iron grates
  const n = c.rng.int(1, 3);
  for (let i = 0; i < n; i++) {
    const gc = c.rng.int(1, Math.floor(w / TILE) - 2), gr = c.rng.int(1, Math.floor(h / TILE) - 2);
    const gx = x0 + gc * TILE, gy = y0 + gr * TILE;
    const iron = ramp('#4a4442');
    p.rect(gx, gy, TILE, TILE, iron[1]);
    p.rect(gx + 1, gy + 1, TILE - 2, TILE - 2, iron[2]);
    for (let k = 3; k < TILE - 3; k += 3) p.rect(gx + 3, gy + k, TILE - 6, 1, '#0b0808');
    p.rect(gx, gy, TILE, 1, iron[3]); p.rect(gx, gy, 1, TILE, iron[3]);
    p.set(gx + 1, gy + 1, iron[4]); p.set(gx + TILE - 2, gy + 1, iron[4]); p.set(gx + 1, gy + TILE - 2, iron[4]); p.set(gx + TILE - 2, gy + TILE - 2, iron[4]);
  }
}
function floorCobble(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  const base = hex(c.t.pal.floor), alt = hex(c.t.pal.floor2), grout = hex(c.t.pal.grout);
  const S = 9;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const cx = Math.floor(x / S), cy = Math.floor(y / S);
    let d1 = 1e9, d2 = 1e9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const fx = (gx + 0.15 + hash2(gx, gy, c.seed) * 0.7) * S, fy = (gy + 0.15 + hash2(gx, gy, c.seed + 1) * 0.7) * S;
      const d = (x - fx) ** 2 + (y - fy) ** 2;
      if (d < d1) { d2 = d1; d1 = d; id = gx * 7919 + gy; } else if (d < d2) d2 = d;
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1);
    let v = jit(mix(base, alt, hash2(id, 1, c.seed)), 0.16, hash2(id, 2, c.seed));
    if (edge < 1.2) v = grout;
    else if (edge < 2.2) v = darken(v, 0.12);
    else if (d1 < 6) v = lighten(v, 0.07);
    const wet = fbm(x * 0.06, y * 0.06, c.seed + 5, 3);
    if (wet > 0.6 && edge >= 1.2) v = mix(v, hex(c.t.pal.stain), 0.45);
    p.set(x0 + x, y0 + y, v);
  }
  // puddles
  const n = c.rng.int(1, 3);
  for (let i = 0; i < n; i++) {
    const px = x0 + c.rng.int(30, w - 30), py = y0 + c.rng.int(20, h - 20), rx = c.rng.int(10, 22), ry = c.rng.int(5, 9);
    const water = ramp('#1f3038');
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2 + (vnoise(x * 0.3, y * 0.3, c.seed) - 0.5) * 0.6;
      if (d < 1) p.set(px + x, py + y, d > 0.8 ? water[1] : (y < -ry * 0.3 && hash2(x, y, 3) < 0.15) ? water[4] : water[2]);
    }
  }
}
function floorTile(c: Ctx): void {
  const { p, x0, y0, w, h, rng } = c;
  const base = hex(c.t.pal.floor), alt = hex(c.t.pal.floor2), grout = hex(c.t.pal.grout);
  const S = 12;
  const missing = new Set<number>();
  for (let i = 0; i < rng.int(3, 8); i++) missing.add(rng.int(0, 60) * 1000 + rng.int(0, 40));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const tx = Math.floor(x / S), ty = Math.floor(y / S), lx = x % S, ly = y % S;
    let v = jit(((tx + ty) % 2 ? base : mix(base, alt, 0.5)), 0.08, hash2(tx, ty, c.seed));
    const grime = fbm(x * 0.04, y * 0.04, c.seed + 2, 3);
    v = mix(v, hex(c.t.pal.stain), Math.max(0, grime - 0.55) * 1.6);
    if (lx === 0 || ly === 0) v = grout;
    else if (lx === 1 || ly === 1) v = lighten(v, 0.1);
    if (missing.has(tx * 1000 + ty)) {
      v = (lx === 0 || ly === 0) ? grout : darken(hex('#3a2c24'), hash2(x, y, 4) * 0.3);
      if (ly === 1) v = hex('#1a1210');
    }
    p.set(x0 + x, y0 + y, v);
  }
  cracks(c, 5, grout);
}
function floorEarth(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  const base = ramp(c.t.pal.floor);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x * 0.07, y * 0.07, c.seed, 4);
    const t = n * 1.4 - 0.2 + BAYER4[((y & 3) << 2) | (x & 3)] * 0.18;
    const v = base[Math.max(0, Math.min(3, Math.floor(t * 4)))];
    p.set(x0 + x, y0 + y, v);
  }
  // pebbles
  for (let i = 0; i < (w * h) / 180; i++) {
    const px = x0 + c.rng.int(0, w - 1), py = y0 + c.rng.int(0, h - 1);
    const pc = ramp(c.t.pal.rock);
    p.set(px, py, pc[3]); p.set(px + 1, py, pc[2]); p.set(px, py + 1, pc[1]); p.set(px + 1, py + 1, pc[0]);
  }
  cracks(c, 8, darken(base[0], 0.3));
}
function floorChecker(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  const a = hex(c.t.pal.floor), b = hex(c.t.pal.floor2), grout = hex(c.t.pal.grout);
  const S = 24;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const tx = Math.floor(x / S), ty = Math.floor(y / S), lx = x % S, ly = y % S;
    let v = (tx + ty) % 2 ? a : b;
    const vein = Math.abs(vnoise(x * 0.09 + ty * 3, y * 0.05 + tx * 5, c.seed) - 0.5);
    if (vein < 0.025) v = (tx + ty) % 2 ? darken(v, 0.15) : lighten(v, 0.15);
    const wear = fbm(x * 0.03, y * 0.03, c.seed + 8, 3);
    v = mix(v, hex('#2a2224'), Math.max(0, wear - 0.6) * 1.2);
    if (lx === 0 || ly === 0) v = grout; else if (lx === 1 || ly === 1) v = lighten(v, 0.08);
    p.set(x0 + x, y0 + y, v);
  }
  // carpet runner through the middle
  if (c.room.cw === 1 && c.room.ch === 1 && c.rng.chance(0.6)) {
    const red = ramp('#6a1c24');
    const cx = x0 + Math.floor(w / 2), half = 22;
    for (let y = 0; y < h; y++) for (let x = -half; x <= half; x++) {
      let v = red[2];
      if (Math.abs(x) >= half - 1) v = hex('#c49a44');
      else if (Math.abs(x) >= half - 3) v = red[1];
      else if ((y + Math.abs(x) * 2) % 12 === 0) v = red[3];
      if (hash2(x, y, 7) < 0.06) v = red[1];
      p.set(cx + x, y0 + y, v);
    }
  }
}
function floorVoid(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  const base = ramp(c.t.pal.floor), acc = hex(c.t.pal.accent);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x * 0.05, y * 0.05, c.seed, 4);
    let v = base[Math.max(0, Math.min(3, Math.floor((n * 1.3 - 0.1 + BAYER4[((y & 3) << 2) | (x & 3)] * 0.15) * 4)))];
    const vein = Math.abs(fbm(x * 0.035, y * 0.035, c.seed + 11, 3) - 0.5);
    if (vein < 0.012) v = mix(acc, base[1], 0.4);
    else if (vein < 0.024) v = mix(acc, base[1], 0.8);
    p.set(x0 + x, y0 + y, v);
  }
}
function floorPages(c: Ctx): void {
  const { p, x0, y0, w, h, rng } = c;
  const paper = ramp(c.t.pal.floor);
  p.rect(x0, y0, w, h, darken(paper[1], 0.3));
  for (let i = 0; i < (w * h) / 900; i++) {
    const pw = rng.int(30, 60), ph = rng.int(38, 70);
    const px = rng.int(-20, w - 10), py = rng.int(-20, h - 10);
    const tone = mix(paper[2], paper[3], rng.next() * 0.6);
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) {
      const X = px + x, Y = py + y;
      if (X < 0 || Y < 0 || X >= w || Y >= h) continue;
      let v = tone;
      if (x === 0 || y === 0) v = lighten(tone, 0.1);
      if (x === pw - 1 || y === ph - 1) v = darken(tone, 0.3);
      if (y > 5 && y < ph - 5 && x > 4 && x < pw - 4 && y % 4 === 0 && hash2(Math.floor(X / 3), Y, c.seed) > 0.35) v = darken(tone, 0.45);
      p.set(x0 + X, y0 + Y, v);
    }
    // shadow under page edge
    for (let x = 0; x < pw; x++) if (px + x >= 0 && px + x < w && py + ph < h && py + ph >= 0) p.set(x0 + px + x, y0 + py + ph, darken(tone, 0.5));
  }
}
function cracks(c: Ctx, n: number, col: Col): void {
  const { p, x0, y0, w, h, rng } = c;
  for (let i = 0; i < n; i++) {
    let x = rng.int(4, w - 4), y = rng.int(4, h - 4);
    let a = rng.float(0, Math.PI * 2);
    const len = rng.int(5, 16);
    for (let k = 0; k < len; k++) {
      p.set(x0 + Math.round(x), y0 + Math.round(y), col);
      if (k % 3 === 0) p.set(x0 + Math.round(x) + 1, y0 + Math.round(y) + 1, lighten(hex(c.t.pal.floor), 0.1));
      a += rng.float(-0.7, 0.7);
      x += Math.cos(a); y += Math.sin(a);
      if (rng.chance(0.08)) { const b = a + rng.sign() * 1.1; for (let j = 0; j < 4; j++) p.set(x0 + Math.round(x + Math.cos(b) * j), y0 + Math.round(y + Math.sin(b) * j), col); }
    }
  }
}

// ---------------------------------------------------------------- walls
function paintWalls(c: Ctx): void {
  const { p, M, room, t } = c;
  const W = room.pxW, H = room.pxH;
  const ix0 = room.ox, iy0 = room.oy, ix1 = room.ox + room.cols * TILE, iy1 = room.oy + room.rows * TILE;
  const wall = hex(t.pal.wall), wall2 = hex(t.pal.wall2), mortar = hex(t.pal.mortar);
  const style = t.wall;
  const cx = W / 2, cy = H / 2;
  const topD = iy0 + M, botD = H - iy1 + M, leftD = ix0 + M, rightD = W - ix1 + M;
  for (let y = -M; y < H + M; y++) for (let x = -M; x < W + M; x++) {
    if (x >= ix0 && x < ix1 && y >= iy0 && y < iy1) continue;
    const tt = (iy0 - y) / topD, tb = (y - iy1 + 1) / botD, tl = (ix0 - x) / leftD, tr = (x - ix1 + 1) / rightD;
    let side = 0, d = tt;
    if (tr > d) { side = 1; d = tr; }
    if (tb > d) { side = 2; d = tb; }
    if (tl > d) { side = 3; d = tl; }
    // along-wall coordinate with perspective convergence
    let u: number;
    if (side === 0 || side === 2) {
      const inner = (ix1 - ix0) / 2, outer = (W + 2 * M) / 2;
      u = ((x - cx) / (inner + (outer - inner) * d)) * inner;
    } else {
      const inner = (iy1 - iy0) / 2, outer = (H + 2 * M) / 2;
      u = ((y - cy) / (inner + (outer - inner) * d)) * inner;
    }
    const v = wallTexel(style, side, u, d, x, y, wall, wall2, mortar, c);
    // depth shading: far edge darker, crease at floor junction
    let col = v;
    col = darken(col, Math.min(0.55, d * 0.55));
    if (d < 0.06) col = darken(col, 0.35);
    p.set(x + M, y + M, col);
  }
  // corner seams
  for (const [ax, ay, bx, by] of [[ix0, iy0, -M, -M], [ix1, iy0, W + M, -M], [ix0, iy1, -M, H + M], [ix1, iy1, W + M, H + M]]) {
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let i = 0; i < steps; i++) {
      const x = Math.round(ax + ((bx - ax) * i) / steps), y = Math.round(ay + ((by - ay) * i) / steps);
      p.set(x + M, y + M, darken(mortar, 0.2));
    }
  }
  // lip where wall meets floor
  const lip = lighten(wall, 0.25);
  for (let x = ix0 - 1; x <= ix1; x++) { p.set(x + M, iy0 - 1 + M, lip); p.set(x + M, iy1 + M, darken(wall, 0.5)); }
  for (let y = iy0 - 1; y <= iy1; y++) { p.set(ix0 - 1 + M, y + M, lighten(wall, 0.15)); p.set(ix1 + M, y + M, lighten(wall, 0.15)); }
}

function wallTexel(style: string, side: number, u: number, d: number, x: number, y: number, wall: Col, wall2: Col, mortar: Col, c: Ctx): Col {
  const rows = 3;
  const row = Math.floor(d * rows * 1.0001);
  const rowT = d * rows - row;
  const seed = c.seed;
  switch (style) {
    case 'iron': {
      const pw = 34, bx = Math.floor((u + 400) / pw), lx = ((u + 400) % pw + pw) % pw;
      let v = mix(wall, wall2, hash2(bx, side, seed));
      if (lx < 1) v = mortar; else if (lx < 2) v = lighten(v, 0.15);
      if ((lx > 3 && lx < 5 || lx > pw - 5 && lx < pw - 3) && Math.abs(rowT - 0.5) < 0.12) v = lighten(v, 0.4); // rivets
      if (Math.abs(rowT - 0.02) < 0.05 && row > 0) v = mortar;
      // pipes running along wall
      if (row === 1 && rowT > 0.35 && rowT < 0.75) { const k = (rowT - 0.35) / 0.4; v = mix(hex('#6a4a3a'), hex('#b07a50'), 1 - Math.abs(k - 0.35) * 2); }
      const rust = fbm(x * 0.08, y * 0.08, seed + 4, 3);
      if (rust > 0.6) v = mix(v, hex('#6a3a22'), (rust - 0.6) * 2.5);
      return v;
    }
    case 'ward': {
      if (d < 0.45) {
        const S = 8; const lx = ((u % S) + S) % S, ly = Math.floor(d * 40) % 4;
        let v = mix(hex('#8fa89a'), hex('#7a9486'), hash2(Math.floor(u / S), Math.floor(d * 10), seed));
        if (lx < 1 || ly === 0) v = hex('#4a5a52');
        return v;
      }
      let v = mix(wall, wall2, fbm(u * 0.08, d * 6, seed, 2));
      const peel = fbm(u * 0.12, d * 8, seed + 2, 3);
      if (peel > 0.62) v = mix(hex('#8a7a6a'), v, 0.3);
      if (d > 0.44 && d < 0.49) v = hex('#3a4a42');
      return v;
    }
    case 'cave': {
      const n = fbm(u * 0.06, d * 3 + side * 10, seed, 4);
      let v = mix(wall2, wall, n);
      if (Math.abs(n - 0.5) < 0.02) v = mortar;
      if (hash2(Math.floor(x / 2), Math.floor(y / 2), seed) < 0.03) v = lighten(v, 0.2);
      return v;
    }
    case 'torn': {
      const layer = Math.floor(fbm(u * 0.03, d * 2, seed, 3) * 6);
      let v = layer % 2 ? wall : wall2;
      const edge = Math.abs(fbm(u * 0.03, d * 2, seed, 3) * 6 - Math.round(fbm(u * 0.03, d * 2, seed, 3) * 6));
      if (edge < 0.08) v = lighten(hex('#6a5cb0'), 0.1);
      else if (edge < 0.14) v = mortar;
      return v;
    }
    case 'spines': {
      // rows of book spines standing along the wall
      const bw = 5 + Math.floor(hash2(Math.floor((u + 500) / 7), row, seed) * 5);
      const bx = Math.floor((u + 500 + row * 3) / 7), lx = ((u + 500 + row * 3) % 7 + 7) % 7;
      const hues = ['#6a2a2a', '#2a4a3a', '#3a2e5a', '#6a4a22', '#4a2a3a', '#2a3a5a', '#5a5a3a'];
      let v = hex(hues[Math.floor(hash2(bx, row, seed) * hues.length)]);
      void bw;
      if (lx < 1) v = mortar; else if (lx < 2) v = lighten(v, 0.2);
      if (Math.abs(rowT - 0.2) < 0.04 || Math.abs(rowT - 0.8) < 0.04) v = hex('#b8963c');
      if (rowT < 0.04) v = hex('#2a1810');
      return v;
    }
    case 'chapel': {
      const bw = 26, off = row % 2 ? bw / 2 : 0;
      const bx = Math.floor((u + 400 + off) / bw), lx = (((u + 400 + off) % bw) + bw) % bw;
      let v = mix(wall, wall2, hash2(bx, row, seed) * 0.6);
      v = mix(v, lighten(wall, 0.2), fbm(u * 0.2, d * 10, seed, 2) * 0.3);
      if (lx < 1.2 || rowT < 0.06) v = mortar;
      return v;
    }
    case 'sewer': {
      const bw = 14, off = row % 2 ? 7 : 0;
      const r2 = Math.floor(d * 6), rt2 = d * 6 - r2;
      const bx = Math.floor((u + 400 + (r2 % 2) * 7) / bw), lx = (((u + 400 + (r2 % 2) * 7) % bw) + bw) % bw;
      void off;
      let v = mix(wall, wall2, hash2(bx, r2, seed));
      if (lx < 1 || rt2 < 0.12) v = mortar;
      const slime = fbm(u * 0.1, d * 4, seed + 3, 3);
      if (slime > 0.55 && d < 0.6) v = mix(v, hex('#4a6a2a'), (slime - 0.55) * 2.5);
      return v;
    }
    default: { // stone
      const bw = 20 + Math.floor(hash2(row, 0, seed) * 6), off = hash2(row, 1, seed) * bw;
      const bx = Math.floor((u + 400 + off) / bw), lx = (((u + 400 + off) % bw) + bw) % bw;
      let v = jit(mix(wall, wall2, hash2(bx, row, seed)), 0.1, hash2(bx, row, seed + 1));
      const n = fbm(u * 0.25, d * 12, seed, 2);
      if (n > 0.65) v = darken(v, 0.1);
      if (lx < 1.3 || rowT < 0.07) v = mortar;
      else if (lx < 2.3) v = lighten(v, 0.1);
      return v;
    }
  }
}

// ---------------------------------------------------------------- wall decor
const WALL_DECOR: Record<string, string[]> = {
  cellar: ['sconce', 'shelf', 'crack', 'chain', 'sconce', 'moss'],
  rootcellar: ['roots', 'roots', 'sconce', 'moss', 'crack'],
  boiler: ['pipe', 'gauge', 'pipe', 'sconce', 'valve'],
  coalchute: ['pipe', 'chain', 'sconce', 'crack'],
  underworks: ['grate', 'moss', 'pipe', 'sconce', 'grate'],
  flooded: ['grate', 'grate', 'moss', 'sconce'],
  ward: ['frame', 'lamp', 'frame', 'crack', 'chart'],
  morgue: ['lamp', 'chart', 'frame', 'crack'],
  depths: ['sconce', 'banner', 'skullniche', 'chain', 'crack'],
  catacombs: ['skullniche', 'skullniche', 'sconce', 'banner'],
  chapel: ['window', 'sconce', 'banner', 'window', 'candles'],
  belfry: ['window', 'candles', 'chain', 'sconce'],
  hollow: ['pages', 'eye', 'pages', 'crack'],
  inkwell: ['pages', 'eye', 'crack'],
  binding: ['pages', 'sconce', 'pages', 'window'],
};
function wallDecor(c: Ctx): void {
  const { p, M, room, rng, t } = c;
  const list = WALL_DECOR[t.id] ?? WALL_DECOR.cellar;
  const wallTop = M + 2, wallBottom = room.oy + M - 3;
  const h = wallBottom - wallTop;
  // slots along each top-wall segment, avoiding door columns
  const doorXs = room.doors.filter((d) => d.side === 0).map((d) => room.doorPos(d.side, d.slot).x + M);
  const cols = room.cols;
  const lights: { x: number; y: number; c?: string; r?: number }[] = (room.flags.lights = room.flags.lights ?? []);
  for (let i = 0; i < cols; i += 1) {
    const x = room.ox + M + i * 24 + 12;
    if (doorXs.some((dx) => Math.abs(dx - x) < 30)) continue;
    if (rng.next() > 0.32) continue;
    const kind = rng.pick(list);
    const y = wallTop + h * 0.5;
    paintWallThing(p, kind, x, y, h, rng, t, lights, M);
    i += 1;
  }
}
function paintWallThing(p: PixelArt, kind: string, x: number, y: number, h: number, rng: RNG, t: FloorTheme, lights: { x: number; y: number; c?: string; r?: number }[], M: number): void {
  const iron = ramp('#3a3434');
  switch (kind) {
    case 'sconce': {
      p.rect(x - 1, y + 2, 3, 5, iron[2]); p.rect(x - 3, y + 6, 7, 2, iron[3]); p.set(x - 3, y + 7, iron[1]);
      const w = ramp('#e8dcc0'); p.rect(x - 1, y - 2, 3, 5, w[2]); p.set(x - 1, y - 2, w[4]);
      p.set(x, y - 3, '#2a1a10'); p.set(x, y - 4, '#ffb040'); p.set(x, y - 5, '#ffe0a0');
      lights.push({ x: x - M, y: y - 4 - M });
      break;
    }
    case 'candles': {
      const w = ramp('#e8dcc0');
      for (let k = -1; k <= 1; k++) { const hh = 4 + (k === 0 ? 2 : 0); p.rect(x + k * 4 - 1, y + 4 - hh, 2, hh, w[2]); p.set(x + k * 4, y + 3 - hh, '#ffb040'); }
      p.rect(x - 6, y + 4, 13, 1, iron[3]);
      lights.push({ x: x - M, y: y - 2 - M });
      break;
    }
    case 'shelf': {
      const wd = ramp('#5a3a24');
      p.rect(x - 9, y + 3, 19, 2, wd[3]); p.rect(x - 9, y + 5, 19, 1, wd[0]);
      const jars = ['#6a8a4a', '#8a4a3a', '#4a6a8a', '#c8a050'];
      for (let k = 0; k < 4; k++) { const jh = rng.int(3, 6); const jc = ramp(rng.pick(jars)); p.rect(x - 8 + k * 5, y + 3 - jh, 3, jh, jc[2]); p.set(x - 8 + k * 5, y + 3 - jh, jc[4]); }
      break;
    }
    case 'crack': {
      let cx = x + rng.int(-6, 6), cy = y - h * 0.4;
      for (let k = 0; k < h * 0.8; k++) { p.set(cx, cy, darken(hex(t.pal.mortar), 0.3)); cx += rng.int(-1, 1); cy += 1; }
      break;
    }
    case 'moss': case 'roots': {
      const m = ramp(kind === 'moss' ? '#4a6a2e' : '#6a4a2a');
      for (let k = 0; k < 18; k++) { const dx = rng.int(-7, 7), dy = rng.int(-Math.floor(h * 0.4), Math.floor(h * 0.45)); p.set(x + dx, y + dy, m[rng.int(1, 3)]); }
      if (kind === 'roots') for (let k = 0; k < 3; k++) { let rx = x + rng.int(-6, 6); for (let ry = y - h * 0.5; ry < y + h * 0.5; ry++) { p.set(rx, ry, m[1]); if (rng.chance(0.3)) rx += rng.int(-1, 1); } }
      break;
    }
    case 'chain': {
      const ch = ramp('#6a6a72');
      for (let yy = y - h * 0.5; yy < y + h * 0.35; yy += 2) { p.set(x, yy, ch[3]); p.set(x + ((yy | 0) % 4 === 0 ? 1 : -1), yy + 1, ch[1]); }
      p.ring(x, y + h * 0.4, 2, ch[2]);
      break;
    }
    case 'pipe': {
      const pc = ramp(rng.chance(0.5) ? '#8a5a3a' : '#5a5a62');
      p.rect(x - 12, y - 1, 25, 4, pc[2]); p.rect(x - 12, y - 1, 25, 1, pc[4]); p.rect(x - 12, y + 2, 25, 1, pc[0]);
      p.rect(x - 4, y - 3, 3, 8, pc[3]); p.rect(x + 5, y - 3, 3, 8, pc[3]);
      if (rng.chance(0.4)) p.set(x + 9, y + 4, '#c8d8e0');
      break;
    }
    case 'gauge': case 'valve': {
      const br = ramp('#b8863a');
      p.ball(x, y, 4, 4, br); p.ball(x, y, 2.6, 2.6, ramp(kind === 'gauge' ? '#e8e0c8' : '#8a3a2a'));
      if (kind === 'gauge') p.line(x, y, x + 2, y - 1, hex('#c83a3a')); else { p.line(x - 3, y, x + 3, y, br[4]); p.line(x, y - 3, x, y + 3, br[4]); }
      break;
    }
    case 'grate': {
      const ir = ramp('#3a3c3a');
      p.rect(x - 6, y - 4, 12, 9, hex('#0a0c0a')); for (let k = -5; k <= 5; k += 2) p.rect(x + k, y - 4, 1, 9, ir[3]);
      p.rect(x - 6, y - 4, 12, 1, ir[4]);
      const sl = ramp('#5a7a2a'); for (let k = 0; k < 3; k++) { const sx2 = x + rng.int(-4, 4); for (let yy = y + 5; yy < y + 5 + rng.int(2, 6); yy++) p.set(sx2, yy, sl[2]); }
      break;
    }
    case 'frame': {
      const fr = ramp('#6a5a3a');
      p.rect(x - 6, y - 5, 12, 10, fr[2]); p.rect(x - 5, y - 4, 10, 8, hex('#2a2a30'));
      p.ball(x, y - 1, 2, 2.2, ramp('#8a8070')); p.rect(x - 3, y + 1, 6, 3, ramp('#4a4a50')[2]);
      if (rng.chance(0.5)) p.line(x - 5, y - 4, x + 4, y + 3, hex('#5a5a60'));
      break;
    }
    case 'lamp': {
      p.line(x, y - h * 0.5, x, y - 3, iron[2]); p.ball(x, y - 1, 4, 2.5, ramp('#8a9a8a')); p.rect(x - 1, y + 1, 3, 1, hex('#e0f0d0'));
      lights.push({ x: x - M, y: y + 2 - M });
      break;
    }
    case 'chart': {
      p.rect(x - 4, y - 5, 9, 11, hex('#d8d0c0')); for (let k = 0; k < 4; k++) p.line(x - 3, y - 3 + k * 2, x + 3 - (k % 2) * 2, y - 3 + k * 2, hex('#6a6a70'));
      p.line(x - 3, y + 3, x + 3, y + 1, hex('#c83a3a'));
      break;
    }
    case 'banner': {
      const bc = ramp(rng.pick(['#6a1e24', '#2a3a5a', '#4a3a1a']));
      p.rect(x - 6, y - h * 0.5, 13, 2, iron[3]);
      p.poly([x - 5, y - h * 0.5 + 2, x + 6, y - h * 0.5 + 2, x + 6, y + 5, x, y + 2, x - 5, y + 5], bc[2]);
      p.line(x - 5, y - h * 0.5 + 2, x - 5, y + 5, bc[3]); p.ball(x, y - 2, 2, 2, ramp('#c8a04a'));
      break;
    }
    case 'skullniche': {
      p.ellipse(x, y, 7, 5, hex('#120c0a')); p.ball(x, y + 1, 3, 2.6, ramp('#d8ccb0')); p.set(x - 1, y + 1, '#1a1010'); p.set(x + 1, y + 1, '#1a1010');
      break;
    }
    case 'window': {
      const cols = ['#c83a4a', '#3a6ac8', '#e0b040', '#4a9a5a'];
      for (let yy = -6; yy <= 6; yy++) for (let xx = -5; xx <= 5; xx++) {
        const inside = yy >= -2 ? true : xx * xx / 25 + (yy + 2) * (yy + 2) / 16 <= 1;
        if (!inside) continue;
        const edge = Math.abs(xx) === 5 || yy === 6 || (yy < -1 && xx * xx / 25 + (yy + 2) * (yy + 2) / 16 > 0.6);
        p.set(x + xx, y + yy, edge ? hex('#2a2224') : (xx === 0 || yy === 1) ? hex('#3a3034') : hex(cols[((xx > 0 ? 1 : 0) + (yy > 1 ? 2 : 0)) % 4]));
      }
      lights.push({ x: x - M, y: y - M, c: rng.pick(cols), r: 60 });
      break;
    }
    case 'pages': {
      for (let k = 0; k < 3; k++) { const px = x - 8 + k * 6 + rng.int(-1, 1), py = y - 4 + rng.int(-2, 2); p.rect(px, py, 5, 7, hex('#e6dcc0')); p.line(px + 1, py + 2, px + 3, py + 2, hex('#5a4a3a')); p.line(px + 1, py + 4, px + 3, py + 4, hex('#5a4a3a')); p.set(px + 2, py, '#8a8a92'); }
      break;
    }
    case 'eye': {
      p.ellipse(x, y, 6, 3, hex('#e8e0f0')); p.ball(x, y, 2.4, 2.4, ramp('#6a3ad0')); p.set(x, y, '#0a0614');
      lights.push({ x: x - M, y: y - M, c: '#8a5aff', r: 30 });
      break;
    }
  }
}

// ---------------------------------------------------------------- decor
function decor(c: Ctx): void {
  const { p, x0, y0, w, h, rng, t } = c;
  const kinds: Record<string, string[]> = {
    cellar: ['paper', 'bottle', 'stain', 'stain', 'debris', 'candle', 'debris'],
    boiler: ['coal', 'coal', 'stain', 'debris', 'bolt'],
    underworks: ['moss', 'moss', 'debris', 'stain', 'bone'],
    ward: ['paper', 'pill', 'stain', 'stain', 'debris'],
    depths: ['bone', 'bone', 'skull', 'debris', 'stain'],
    chapel: ['wax', 'wax', 'petal', 'petal', 'debris', 'candle'],
    hollow: ['inksplat', 'inksplat', 'glyph', 'debris'],
    binding: ['letter', 'letter', 'inksplat', 'debris', 'glyph'],
    rootcellar: ['moss', 'moss', 'debris', 'bone', 'stain', 'candle'],
    coalchute: ['coal', 'coal', 'coal', 'debris', 'stain'],
    flooded: ['moss', 'stain', 'stain', 'debris'],
    morgue: ['paper', 'pill', 'stain', 'debris', 'bone'],
    catacombs: ['bone', 'skull', 'skull', 'debris', 'candle'],
    belfry: ['wax', 'debris', 'petal', 'candle'],
    inkwell: ['inksplat', 'inksplat', 'inksplat', 'glyph'],
  };
  const list = kinds[t.id] ?? kinds.cellar;
  const n = Math.floor((w * h) / 2200) + rng.int(0, 6);
  let candles = 0;
  for (let i = 0; i < n; i++) {
    let k = rng.pick(list);
    if (k === 'candle' && ++candles > 2) k = 'debris';
    const x = x0 + rng.int(6, w - 8), y = y0 + rng.int(6, h - 8);
    drawDecor(c, k, x, y);
  }
  // cobwebs in corners
  if (t.id === 'cellar' || t.id === 'depths' || t.id === 'ward' || t.id === 'chapel') {
    for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x0 + w - 1, y0, -1, 1]]) if (rng.chance(0.7)) {
      const web = pack(200, 200, 210, 150);
      for (let i = 0; i < 16; i++) { p.set(cx + i * sx, cy + Math.floor(i * 0.2) * sy, web); p.set(cx + Math.floor(i * 0.2) * sx, cy + i * sy, web); }
      for (let r = 5; r < 16; r += 5) for (let a = 0; a <= 10; a++) {
        const ang = (a / 10) * (Math.PI / 2);
        p.set(cx + Math.round(Math.cos(ang) * r) * sx, cy + Math.round(Math.sin(ang) * r * 0.9) * sy, web);
      }
      for (let i = 0; i < 12; i++) p.set(cx + i * sx, cy + i * sy, web);
    }
  }
}
function drawDecor(c: Ctx, k: string, x: number, y: number): void {
  const { p, rng } = c;
  switch (k) {
    case 'paper': {
      const pc = ramp('#d9cfb2'); const w = rng.int(5, 8), h = rng.int(6, 9);
      const sk = rng.float(-0.3, 0.3);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) p.set(x + i + Math.round(j * sk), y + j, j === h - 1 ? pc[0] : (j % 2 === 1 && i > 0 && i < w - 1 && rng.chance(0.7)) ? pc[1] : pc[3]);
      break;
    }
    case 'bottle': {
      const g = ramp('#3a6a4a');
      p.rect(x, y, 6, 3, g[2]); p.rect(x + 6, y + 1, 2, 1, g[1]); p.set(x + 1, y, g[4]); p.rect(x, y + 3, 6, 1, pack(0, 0, 0, 90));
      break;
    }
    case 'stain': {
      const col = pack(0, 0, 0, 38); const r = rng.int(5, 14);
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j * 2 < r * r * (0.6 + vnoise(i * 0.3, j * 0.3, c.seed) * 0.6)) blend(p, x + i, y + j, col);
      break;
    }
    case 'debris': {
      const rc = ramp(c.t.pal.rock);
      for (let i = 0; i < rng.int(3, 7); i++) { const dx = rng.int(-4, 4), dy = rng.int(-3, 3); p.set(x + dx, y + dy, rc[3]); p.set(x + dx + 1, y + dy, rc[1]); p.set(x + dx, y + dy + 1, pack(0, 0, 0, 80)); }
      break;
    }
    case 'candle': {
      c.room.flags.lights = c.room.flags.lights ?? [];
      c.room.flags.lights.push({ x: x - c.M, y: y - c.M });
      const wx = ramp('#e6dcc0');
      p.rect(x, y, 3, 4, wx[2]); p.set(x, y, wx[4]); p.rect(x - 1, y + 4, 5, 1, wx[0]); p.set(x + 1, y - 1, '#2a1a10');
      break;
    }
    case 'coal': {
      const cc = ramp('#2a2628');
      for (let i = 0; i < rng.int(2, 5); i++) { const dx = rng.int(-4, 4), dy = rng.int(-2, 2); p.rect(x + dx, y + dy, 2, 2, cc[1]); p.set(x + dx, y + dy, cc[4]); }
      break;
    }
    case 'bolt': { p.set(x, y, '#8a8078'); p.set(x + 1, y, '#5a524c'); p.set(x, y + 1, '#3a3430'); break; }
    case 'moss': {
      const m = ramp('#4a6a2e');
      for (let i = 0; i < 14; i++) { const dx = rng.int(-5, 5), dy = rng.int(-3, 3); p.set(x + dx, y + dy, m[rng.int(1, 3)]); }
      break;
    }
    case 'bone': {
      const b = ramp('#d8ccb0'); const a = rng.float(0, Math.PI);
      const dx = Math.cos(a) * 4, dy = Math.sin(a) * 2;
      p.line(x - dx, y - dy, x + dx, y + dy, b[2]);
      p.set(x - dx - 1, y - dy, b[3]); p.set(x + dx + 1, y + dy, b[3]); p.set(x - dx, y - dy + 1, b[1]); p.set(x + dx, y + dy + 1, b[1]);
      break;
    }
    case 'skull': {
      const b = ramp('#d8ccb0');
      p.ball(x, y, 3, 2.6, b); p.set(x - 1, y, '#1a1210'); p.set(x + 1, y, '#1a1210'); p.rect(x - 1, y + 2, 3, 1, b[1]);
      break;
    }
    case 'pill': { p.set(x, y, '#c84a4a'); p.set(x + 1, y, '#e8e0d0'); break; }
    case 'wax': {
      const wx = ramp('#e8dcb8'); const r = rng.int(2, 4);
      p.ball(x, y, r, r * 0.6, wx);
      break;
    }
    case 'petal': { p.set(x, y, '#8a2a3a'); p.set(x + 1, y, '#b03a4a'); p.set(x, y + 1, '#5a1a2a'); break; }
    case 'inksplat': {
      const ink = hex('#0c0a1a'); const r = rng.int(3, 7);
      for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j < r * r * vnoise(i * 0.5 + x, j * 0.5, 3) * 1.6) p.set(x + i, y + j, ink);
      break;
    }
    case 'glyph': {
      const g = mix(hex(c.t.pal.accent), hex(c.t.pal.floor), 0.55);
      p.ring(x, y, 4, g); p.line(x - 3, y, x + 3, y, g); p.line(x, y - 3, x, y + 3, g);
      break;
    }
    case 'letter': {
      const ink = hex('#2b2f66');
      for (let i = 0; i < rng.int(2, 5); i++) { const lx = x + i * 3; p.line(lx, y, lx + rng.int(0, 1), y + rng.int(2, 3), ink); }
      break;
    }
    case 'web': {
      const web = pack(210, 210, 220, 110); const r = rng.int(5, 9);
      for (let a = 0; a < 6; a++) { const an = (a / 6) * Math.PI * 2; p.line(x, y, x + Math.cos(an) * r, y + Math.sin(an) * r, web); }
      break;
    }
  }
}
function blend(p: PixelArt, x: number, y: number, c: Col): void {
  const base = p.get(x, y); if (!base) return;
  const a = ((c >>> 24) & 255) / 255;
  p.set(x, y, mix(base, (c & 0x00ffffff) | 0xff000000, a));
}

function ambientOcclusion(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dt = y, dl = x, dr = w - 1 - x, db = h - 1 - y;
    let s = 0;
    if (dt < 12) s = Math.max(s, (1 - dt / 12) * 0.5);
    if (dl < 7) s = Math.max(s, (1 - dl / 7) * 0.35);
    if (dr < 7) s = Math.max(s, (1 - dr / 7) * 0.35);
    if (db < 4) s = Math.max(s, (1 - db / 4) * 0.2);
    if (s <= 0) continue;
    s += BAYER4[((y & 3) << 2) | (x & 3)] * 0.12;
    if (s > 0.04) p.set(x0 + x, y0 + y, darken(p.get(x0 + x, y0 + y), Math.min(0.7, s)));
  }
}

export function paintRoomBackground(room: RoomData, theme: FloorTheme): HTMLCanvasElement {
  const M = BG_MARGIN;
  const p = new PixelArt(room.pxW + M * 2, room.pxH + M * 2);
  const rng = new RNG(room.seed + ':bg');
  room.flags.lights = [];
  const seed = rng.int(0, 1e6);
  const c: Ctx = { p, M, x0: room.ox + M, y0: room.oy + M, w: room.cols * TILE, h: room.rows * TILE, rng, seed, t: theme, room };
  paintWalls(c);
  wallDecor(c);
  switch (theme.floor) {
    case 'flag': floorFlag(c); break;
    case 'brick': floorBrick(c); break;
    case 'cobble': floorCobble(c); break;
    case 'tile': floorTile(c); break;
    case 'earth': floorEarth(c); break;
    case 'checker': floorChecker(c); break;
    case 'void': floorVoid(c); break;
    case 'pages': floorPages(c); break;
    case 'planks': floorPlanks(c); break;
  }
  calmFloor(c);
  decor(c);
  specialFloor(c);
  ambientOcclusion(c);
  return p.toCanvas();
}

/**
 * Readability pass: compress the floor's contrast toward its average colour and lift it a touch,
 * so characters, shots and pickups always stand out from the ground.
 */
function calmFloor(c: Ctx): void {
  const { p, x0, y0, w, h } = c;
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = p.get(x0 + x, y0 + y); r += v & 255; g += (v >>> 8) & 255; b += (v >>> 16) & 255; n++; }
  const mean = pack(r / n, g / n, b / n);
  const k = c.t.floor === 'void' || c.t.floor === 'pages' ? 0.2 : 0.34;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = p.get(x0 + x, y0 + y);
    p.set(x0 + x, y0 + y, lighten(mix(v, mean, k), 0.05));
  }
}

/** Room-type specific floor treatments (rugs, glyph circles...). */
function specialFloor(c: Ctx): void {
  const { p, x0, y0, w, h, room } = c;
  const cx = x0 + w / 2, cy = y0 + h / 2;
  if (room.type === 'treasure' || room.type === 'blessing') {
    const gold = ramp(room.type === 'blessing' ? '#d8d0c0' : '#b8903a');
    for (let y = -30; y <= 30; y++) for (let x = -42; x <= 42; x++) {
      const d = (x / 42) ** 2 + (y / 30) ** 2;
      if (d <= 1 && d > 0.9) p.set(cx + x, cy + y, gold[1]);
      else if (d <= 0.9) p.set(cx + x, cy + y, mix(p.get(cx + x, cy + y), gold[0], 0.35));
    }
  }
  if (room.type === 'deal' || room.type === 'cursed' || room.type === 'sacrifice') {
    const col = room.type === 'deal' ? hex('#3a2e7a') : hex('#6a1a2a');
    for (let a = 0; a < 360; a += 0.5) {
      const r = a / 360;
      const rad = (a * Math.PI) / 180;
      p.set(cx + Math.cos(rad) * 40, cy + Math.sin(rad) * 28, col);
      p.set(cx + Math.cos(rad) * 34, cy + Math.sin(rad) * 23, col);
      void r;
    }
    for (let i = 0; i < 5; i++) {
      const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2, a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
      p.line(cx + Math.cos(a1) * 34, cy + Math.sin(a1) * 23, cx + Math.cos(a2) * 34, cy + Math.sin(a2) * 23, col);
    }
  }
  if (room.type === 'lostfound') {
    // a worn runner rug scattered with claim tickets
    const rug = ramp('#2e4a48'), rw = 150, rh = 62;
    const r = new RNG(room.seed + ':lf');
    for (let y = -rh / 2; y < rh / 2; y++) for (let x = -rw / 2; x < rw / 2; x++) {
      const e = Math.min(x + rw / 2, rw / 2 - 1 - x, y + rh / 2, rh / 2 - 1 - y);
      let v = rug[2];
      if (e < 1) v = rug[0]; else if (e < 3) v = hex('#a8804a'); else if (e < 4) v = rug[1];
      else if ((x + 300) % 12 < 1 || (y + 300) % 12 < 1) v = rug[1];
      p.set(cx + x, cy + y + 8, v);
    }
    for (let i = 0; i < 9; i++) {
      const tx = Math.round(cx + (r.next() - 0.5) * (w - 60)), ty = Math.round(cy + (r.next() - 0.5) * (h - 50));
      p.rect(tx, ty, 5, 3, hex('#d8caa8')); p.set(tx + 1, ty + 1, '#8a3a2a'); p.set(tx + 3, ty + 1, '#6a5a42');
    }
  }
  if (room.type === 'shop' || room.type === 'library' || room.type === 'arcade') {
    const rug = ramp(room.type === 'library' ? '#3a4a6a' : room.type === 'arcade' ? '#6a2a5a' : '#6a3a24');
    const rw = room.type === 'shop' ? 196 : 120, rh = 70;
    for (let y = -rh / 2; y < rh / 2; y++) for (let x = -rw / 2; x < rw / 2; x++) {
      const ex = Math.min(x + rw / 2, rw / 2 - 1 - x), ey = Math.min(y + rh / 2, rh / 2 - 1 - y);
      const e = Math.min(ex, ey);
      let v = rug[2];
      if (e < 1) v = rug[0]; else if (e < 3) v = hex('#b8903a'); else if (e < 4) v = rug[1];
      else if ((Math.abs(x) + Math.abs(y)) % 10 === 0) v = rug[3];
      p.set(cx + x, cy + y + 8, v);
    }
  }
}
