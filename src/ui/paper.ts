// Old, handled paper for the menu pages: torn and nicked edges, a scorched rim, mottled tone,
// foxing, tide-marked water stains, creases and a dog-eared corner. Each sheet is painted once per
// size, seed and screen density, then reused, so it costs nothing per frame.

const cache = new Map<string, HTMLCanvasElement>();

function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/** Smooth value noise on a coarse lattice. */
function noise2(seed: number, cell: number, W: number, H: number): (x: number, y: number) => number {
  const r = rng(seed), gw = Math.ceil(W / cell) + 2, gh = Math.ceil(H / cell) + 2;
  const g = new Float32Array(gw * gh).map(() => r());
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / cell, fy = y / cell, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const a = g[iy * gw + ix], b = g[iy * gw + ix + 1], c = g[(iy + 1) * gw + ix], d = g[(iy + 1) * gw + ix + 1];
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
}

/** The torn outline of a sheet, in sheet pixels: wandering edges with the odd nick out of them. */
function outline(W: number, H: number, S: number, r: () => number): [number, number][] {
  const pts: [number, number][] = [];
  const side = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number, len: number) => {
    const n = Math.max(8, Math.round(len / (2.2 * S)));
    let wander = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      wander = wander * 0.7 + (r() - 0.5) * 1.1 * S;
      let d = Math.abs(wander) + r() * 0.9 * S;
      if (r() < 0.035) d += (1.5 + r() * 3) * S;          // a nick out of the edge
      pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
    }
  };
  const m = 1.2 * S;
  side(m, m, W - m, m, 0, 1, W);
  side(W - m, m, W - m, H - m, -1, 0, H);
  side(W - m, H - m, m, H - m, 0, -1, W);
  side(m, H - m, m, m, 1, 0, H);
  return pts;
}

/** Paint (or fetch) a weathered sheet of w x h virtual pixels at `S` device pixels each. */
export function paperSheet(w: number, h: number, seed: number, S: number, tone = '#e6dabd'): HTMLCanvasElement {
  S = Math.max(1, Math.min(4, Math.round(S)));
  const key = `${w}x${h}:${seed}:${S}:${tone}`;
  const hit = cache.get(key); if (hit) return hit;
  const pad = 6 * S;
  const W = Math.round(w * S), H = Math.round(h * S);
  const cv = document.createElement('canvas'); cv.width = W + pad * 2; cv.height = H + pad * 2;
  const ctx = cv.getContext('2d')!;
  const r = rng(seed * 7919 + w * 31 + h);
  const corner = Math.floor(r() * 4), fold = (seed % 3 === 1 ? 0 : 9 + r() * 6) * S;

  // ---- the outline (with the dog-ear cut off, its flap drawn afterwards)
  const raw = outline(W, H, S, r);
  const cx = corner % 2 ? W : 0, cy = corner > 1 ? H : 0, sx = corner % 2 ? -1 : 1, sy = corner > 1 ? -1 : 1;
  const inFold = (x: number, y: number) => fold > 0 && (x - cx) * sx + (y - cy) * sy < fold;
  const path = new Path2D();
  let first = true;
  const cut = (a: [number, number], b: [number, number]): [number, number] => {
    const da = (a[0] - cx) * sx + (a[1] - cy) * sy - fold, db = (b[0] - cx) * sx + (b[1] - cy) * sy - fold, t = da / (da - db);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i], b = raw[(i + 1) % raw.length];
    const ia = inFold(a[0], a[1]), ib = inFold(b[0], b[1]);
    if (!ia) { if (first) { path.moveTo(pad + a[0], pad + a[1]); first = false; } else path.lineTo(pad + a[0], pad + a[1]); }
    if (ia !== ib) { const c = cut(a, b); path.lineTo(pad + c[0], pad + c[1]); }
  }
  path.closePath();

  // ---- a soft shadow under the sheet
  ctx.save();
  ctx.filter = `blur(${2 * S}px)`; ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.translate(2.5 * S, 3.5 * S); ctx.fill(path);
  ctx.restore();

  // ---- the paper itself, pixel by pixel: mottled tone, a scorched rim, grain
  const base = [parseInt(tone.slice(1, 3), 16), parseInt(tone.slice(3, 5), 16), parseInt(tone.slice(5, 7), 16)];
  const big = noise2(seed + 1, 46 * S, W, H), mid = noise2(seed + 2, 13 * S, W, H), fine = noise2(seed + 3, 3 * S, W, H);
  const rim = noise2(seed + 4, 9 * S, W, H);
  const img = ctx.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.min(x, y, W - 1 - x, H - 1 - y) / S;               // virtual px from the edge
    const burn = Math.max(0, 1 - (e - rim(x, y) * 7) / 9);              // irregular scorched band
    const mott = (big(x, y) - 0.5) * 0.16 + (mid(x, y) - 0.5) * 0.1 + (fine(x, y) - 0.5) * 0.05 + (r() - 0.5) * 0.035;
    const k = 1 + mott - burn * burn * 0.5;
    const warm = burn * 0.35 + Math.max(0, big(x, y) - 0.6) * 0.4;     // yellowing toward brown
    const i = (y * W + x) * 4;
    d[i] = Math.max(0, Math.min(255, base[0] * k - warm * 18));
    d[i + 1] = Math.max(0, Math.min(255, base[1] * k - warm * 38));
    d[i + 2] = Math.max(0, Math.min(255, base[2] * k - warm * 62));
    d[i + 3] = 255;
  }
  const tex = document.createElement('canvas'); tex.width = W; tex.height = H;
  tex.getContext('2d')!.putImageData(img, 0, 0);
  ctx.save();
  ctx.clip(path);
  ctx.drawImage(tex, pad, pad);
  ctx.translate(pad, pad);

  // fibres
  for (let i = 0; i < (W * H) / (55 * S * S); i++) {
    const x = r() * W, y = r() * H, a = r() * Math.PI, l = (1.5 + r() * 4) * S;
    ctx.strokeStyle = r() < 0.5 ? 'rgba(90,64,36,0.07)' : 'rgba(255,248,230,0.1)';
    ctx.lineWidth = 0.35 * S; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.3); ctx.stroke();
  }
  // foxing: clusters of rusty specks
  const clusters = 3 + Math.floor(r() * 4);
  for (let c = 0; c < clusters; c++) {
    const fx = r() * W, fy = r() * H, n = 4 + Math.floor(r() * 10);
    for (let i = 0; i < n; i++) {
      const x = fx + (r() - 0.5) * 30 * S, y = fy + (r() - 0.5) * 22 * S, rad = (0.4 + r() * r() * 2.4) * S;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(130,70,30,${0.18 + r() * 0.22})`); g.addColorStop(1, 'rgba(130,70,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
    }
  }
  // water stains: a pale blot with a darker tide line round it
  const stains = 1 + Math.floor(r() * 2);
  for (let s = 0; s < stains; s++) {
    const x0 = (0.15 + r() * 0.7) * W, y0 = (0.15 + r() * 0.7) * H, R = (14 + r() * 26) * S;
    const blob = new Path2D(); const n = 28, ph = r() * 10;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, rr = R * (1 + Math.sin(a * 3 + ph) * 0.12 + Math.sin(a * 5 + ph * 2) * 0.07 + (r() - 0.5) * 0.05);
      const px = x0 + Math.cos(a) * rr, py = y0 + Math.sin(a) * rr * 0.75;
      if (i === 0) blob.moveTo(px, py); else blob.lineTo(px, py);
    }
    ctx.fillStyle = 'rgba(150,110,60,0.06)'; ctx.fill(blob);
    ctx.strokeStyle = 'rgba(120,80,40,0.16)'; ctx.lineWidth = 0.9 * S; ctx.stroke(blob);
    ctx.strokeStyle = 'rgba(120,80,40,0.07)'; ctx.lineWidth = 2.4 * S; ctx.stroke(blob);
  }
  // creases: a fold line with its lit side
  const creases = 1 + Math.floor(r() * 2);
  for (let c = 0; c < creases; c++) {
    const vert = r() < 0.5;
    const a0 = (0.25 + r() * 0.5), a1 = a0 + (r() - 0.5) * 0.12;
    const p0 = vert ? [a0 * W, -5] : [-5, a0 * H], p1 = vert ? [a1 * W, H + 5] : [W + 5, a1 * H];
    const mx = (p0[0] + p1[0]) / 2 + (r() - 0.5) * 6 * S, my = (p0[1] + p1[1]) / 2 + (r() - 0.5) * 6 * S;
    const line = (dx: number, dy: number, col: string, lw: number) => {
      ctx.strokeStyle = col; ctx.lineWidth = lw * S; ctx.beginPath();
      ctx.moveTo(p0[0] + dx, p0[1] + dy); ctx.quadraticCurveTo(mx + dx, my + dy, p1[0] + dx, p1[1] + dy); ctx.stroke();
    };
    line(0, 0, 'rgba(80,55,30,0.16)', 0.6);
    line(vert ? 0.8 * S : 0, vert ? 0 : 0.8 * S, 'rgba(255,250,235,0.3)', 0.6);
    line(0, 0, 'rgba(80,55,30,0.05)', 3);
  }
  // scuffs where thumbs have worn it pale
  for (let i = 0; i < 3; i++) {
    const x = r() * W, y = (r() < 0.5 ? 0.85 + r() * 0.15 : r()) * H, R = (8 + r() * 14) * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, 'rgba(255,250,235,0.14)'); g.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  // an old ink smudge, now and then
  if (r() < 0.6) {
    const x = (r() < 0.5 ? 0.06 + r() * 0.12 : 0.82 + r() * 0.12) * W, y = (0.1 + r() * 0.8) * H;
    ctx.fillStyle = 'rgba(30,24,50,0.12)';
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x + (r() - 0.5) * 6 * S, y + (r() - 0.5) * 4 * S, (0.6 + r() * 2) * S, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(30,24,50,0.18)'; ctx.beginPath(); ctx.arc(x, y, 1.6 * S, 0, Math.PI * 2); ctx.fill();
  }
  // the scorched rim, darkest right at the edge
  ctx.translate(-pad, -pad);
  ctx.strokeStyle = 'rgba(70,40,15,0.35)'; ctx.lineWidth = 3 * S; ctx.stroke(path);
  ctx.strokeStyle = 'rgba(50,28,10,0.55)'; ctx.lineWidth = 1.1 * S; ctx.stroke(path);
  ctx.restore();
  ctx.strokeStyle = 'rgba(40,22,8,0.75)'; ctx.lineWidth = 0.5 * S; ctx.stroke(path);

  // ---- the dog-ear: the corner folded over, its back showing
  if (fold > 0) {
    const ox = pad + cx, oy = pad + cy;
    const ax = ox + sx * fold, ay = oy, bx = ox, by = oy + sy * fold;   // ends of the fold line
    const tx = ax + bx - ox, ty = ay + by - oy;                           // the folded tip
    const flap = new Path2D(); flap.moveTo(ax, ay); flap.lineTo(bx, by); flap.lineTo(tx * 0.92 + ox * 0.08, ty * 0.92 + oy * 0.08); flap.closePath();
    ctx.save();
    ctx.filter = `blur(${1.2 * S}px)`; ctx.fillStyle = 'rgba(40,20,5,0.45)';
    ctx.translate(sx * 1.2 * S, sy * 1.5 * S); ctx.fill(flap); ctx.restore();
    const g = ctx.createLinearGradient(ox + sx * fold * 0.5, oy + sy * fold * 0.5, tx, ty);
    g.addColorStop(0, '#d2c29c'); g.addColorStop(1, '#b8a47a');
    ctx.fillStyle = g; ctx.fill(flap);
    ctx.strokeStyle = 'rgba(60,35,15,0.6)'; ctx.lineWidth = 0.5 * S; ctx.stroke(flap);
    ctx.strokeStyle = 'rgba(255,248,230,0.4)'; ctx.lineWidth = 0.5 * S;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  }
  cache.set(key, cv);
  return cv;
}

/** Draw a weathered sheet at (x, y) in the current (virtual) coordinates. */
export function drawPaper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number, tone?: string): void {
  const S = Math.abs(ctx.getTransform().a) || 1;
  const cv = paperSheet(w, h, seed, S, tone);
  const k = Math.max(1, Math.min(4, Math.round(S)));
  ctx.drawImage(cv, x - 6, y - 6, cv.width / k, cv.height / k);
}

/** A frame printed long ago: double rule, worn through in places, diamonds at the corners. */
export function wornFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed * 131 + 7);
  const rule = (x0: number, y0: number, x1: number, y1: number, col: string, lw: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.round(len / 9));
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    for (let i = 0; i < n; i++) {
      if (r() < 0.14) continue;                                    // worn away here
      const t0 = i / n, t1 = (i + 0.75 + r() * 0.25) / n;
      ctx.moveTo(x0 + (x1 - x0) * t0, y0 + (y1 - y0) * t0); ctx.lineTo(x0 + (x1 - x0) * t1, y0 + (y1 - y0) * t1);
    }
    ctx.stroke();
  };
  const box = (i: number, col: string, lw: number) => {
    rule(x + i, y + i, x + w - i, y + i, col, lw); rule(x + w - i, y + i, x + w - i, y + h - i, col, lw);
    rule(x + w - i, y + h - i, x + i, y + h - i, col, lw); rule(x + i, y + h - i, x + i, y + i, col, lw);
  };
  box(6, 'rgba(95,62,32,0.34)', 0.6); box(8.5, 'rgba(95,62,32,0.18)', 0.4);
  ctx.fillStyle = 'rgba(95,62,32,0.45)';
  for (const [cx, cy] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy - 2.4); ctx.lineTo(cx + 2.4, cy); ctx.lineTo(cx, cy + 2.4); ctx.lineTo(cx - 2.4, cy); ctx.fill();
  }
}
