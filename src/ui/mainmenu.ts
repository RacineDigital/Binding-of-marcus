// The title screen: a layered, parallax "bindery at night" scene (moonlit window, bookshelves,
// drying pages, Marcus reading by a candle) with a menu that works with keys, pad and mouse,
// plus the save-profile picker.
import { GAME_VERSION } from '../core/constants';
import { update } from '../core/update';
import type { MenuSystem, Screen } from './menus';
import { text, COL, FONT_TITLE, FONT_BODY, measure, heading, FONT_LOGO } from './draw';
import { VIEW_W, VIEW_H } from '../core/constants';
import { CHARACTERS } from '../player/characters';
import { pickTheme } from '../generation/floorgen';
import { formatSeed, RNG } from '../core/rng';
import { clamp, ease, TAU } from '../core/math';
import { getEnemy } from '../enemies/registry';
import { getSprites } from '../enemies/enemy';
import { SLOTS, store } from '../save/save';
import { CHALLENGES, ACHIEVEMENTS } from '../data/achievements';
import { NOTES } from '../data/notes';
import { ENDINGS } from '../data/endings';
import { STORY_GUIDE } from '../data/storyguide';
import { promptBar, drawGlyphs, glyphsFor } from './glyphs';
import { padLabel } from '../core/input';

// ---------------------------------------------------------------------------- scene painting
interface SceneLayers { far: HTMLCanvasElement; mid: HTMLCanvasElement; near: HTMLCanvasElement; pages: { x: number; y: number; w: number; h: number; c: string }[] }
let layers: SceneLayers | null = null;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!; x.imageSmoothingEnabled = false; return [c, x];
}
const px = (x: CanvasRenderingContext2D, X: number, Y: number, w: number, h: number, c: string) => { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), w, h); };

function paintScene(): SceneLayers {
  const W = VIEW_W + 24, H = VIEW_H; // a little wider than the screen for parallax
  const rng = new RNG('title-scene');
  // ---------------- far: wall, arched window, moon
  const [far, f] = canvas(W, H);
  const wall = f.createLinearGradient(0, 0, 0, H); wall.addColorStop(0, '#0d0912'); wall.addColorStop(1, '#1a121c');
  f.fillStyle = wall; f.fillRect(0, 0, W, H);
  for (let y = 0; y < 210; y += 9) for (let x = (y / 9) % 2 ? 0 : 11; x < W; x += 22) { px(f, x, y, 21, 1, 'rgba(0,0,0,0.25)'); px(f, x, y + 1, 1, 8, 'rgba(0,0,0,0.18)'); px(f, x + 1, y + 1, 19, 1, 'rgba(255,240,220,0.025)'); }
  const wx = 300, wy = 22, ww = 74, wh = 120;
  // window recess and glass
  f.fillStyle = '#07050a'; f.beginPath(); f.moveTo(wx - 6, wy + wh + 4); f.lineTo(wx - 6, wy + 30); f.arc(wx + ww / 2, wy + 30, ww / 2 + 6, Math.PI, 0); f.lineTo(wx + ww + 6, wy + wh + 4); f.fill();
  const sky = f.createLinearGradient(0, wy, 0, wy + wh); sky.addColorStop(0, '#1a2a54'); sky.addColorStop(1, '#0c1430');
  f.fillStyle = sky; f.beginPath(); f.moveTo(wx, wy + wh); f.lineTo(wx, wy + 30); f.arc(wx + ww / 2, wy + 30, ww / 2, Math.PI, 0); f.lineTo(wx + ww, wy + wh); f.fill();
  f.save(); f.clip();
  for (let i = 0; i < 26; i++) px(f, wx + rng.int(2, ww - 2), wy + rng.int(2, wh - 30), 1, 1, i % 4 ? '#8aa0d8' : '#e8f0ff');
  f.fillStyle = '#f0ecd8'; f.beginPath(); f.arc(wx + 50, wy + 34, 11, 0, TAU); f.fill();
  f.fillStyle = '#d8d0b8'; f.beginPath(); f.arc(wx + 47, wy + 31, 3, 0, TAU); f.arc(wx + 54, wy + 38, 2, 0, TAU); f.fill();
  f.restore();
  // mullions and frame
  f.fillStyle = '#2a2024';
  f.fillRect(wx + ww / 2 - 1, wy - 6, 3, wh + 6); f.fillRect(wx, wy + 58, ww, 3); f.fillRect(wx, wy + 92, ww, 3);
  f.strokeStyle = '#3a2e30'; f.lineWidth = 3; f.beginPath(); f.moveTo(wx - 1, wy + wh); f.lineTo(wx - 1, wy + 30); f.arc(wx + ww / 2, wy + 30, ww / 2 + 1, Math.PI, 0); f.lineTo(wx + ww + 1, wy + wh); f.stroke();
  px(f, wx - 8, wy + wh, ww + 16, 5, '#3a2e30'); px(f, wx - 8, wy + wh, ww + 16, 1, '#5a4a48');
  // ---------------- mid: bookshelves left and right, drying-page line
  const [mid, m] = canvas(W, H);
  const bookCols = ['#6a2a24', '#2a4a3a', '#2a3a5e', '#5a4a2a', '#4a2a4a', '#7a5a3a', '#3a3a44', '#8a3a2a'];
  const shelf = (x0: number, w: number) => {
    px(m, x0 - 3, 14, w + 6, 196, '#1e1416'); px(m, x0 - 3, 14, 3, 196, '#2e2224'); px(m, x0 + w, 14, 3, 196, '#140e10');
    for (let sy = 20; sy < 200; sy += 30) {
      px(m, x0, sy, w, 26, '#0e0a0c');
      let bx = x0 + 1;
      while (bx < x0 + w - 3) {
        const bw = rng.int(3, 6), bh = rng.int(16, 25), col = rng.pick(bookCols);
        if (rng.chance(0.08)) { bx += bw; continue; } // gap
        const lean = rng.chance(0.1);
        const y = sy + 26 - bh;
        if (lean) { m.save(); m.translate(bx, sy + 26); m.rotate(-0.25); px(m, 0, -bh, bw, bh, col); m.restore(); bx += bw + 3; continue; }
        px(m, bx, y, bw, bh, col); px(m, bx, y, 1, bh, 'rgba(255,255,255,0.12)'); px(m, bx + bw - 1, y, 1, bh, 'rgba(0,0,0,0.35)');
        px(m, bx, y + 3, bw, 1, 'rgba(230,200,120,0.35)'); px(m, bx, y + bh - 4, bw, 1, 'rgba(230,200,120,0.25)');
        bx += bw;
      }
      px(m, x0 - 3, sy + 26, w + 6, 4, '#2e2224'); px(m, x0 - 3, sy + 26, w + 6, 1, '#4a3a36');
    }
  };
  shelf(176, 92); shelf(418, 86);
  // ---------------- near: floor boards, desk, book press, stacks
  const [near, n] = canvas(W, H);
  const fy = 206;
  const floor = n.createLinearGradient(0, fy, 0, H); floor.addColorStop(0, '#22181a'); floor.addColorStop(1, '#120c0e');
  n.fillStyle = floor; n.fillRect(0, fy, W, H - fy);
  for (let i = -12; i < 24; i++) { n.strokeStyle = 'rgba(0,0,0,0.35)'; n.lineWidth = 1; n.beginPath(); n.moveTo(330 + i * 9, fy); n.lineTo(330 + i * 34, H); n.stroke(); }
  for (const y of [fy + 14, fy + 34, fy + 58]) px(n, 0, y, W, 1, 'rgba(0,0,0,0.25)');
  px(n, 0, fy, W, 2, '#2e2224');
  // desk
  const dx = 300, dy = 172;
  px(n, dx, dy, 112, 6, '#5a3a24'); px(n, dx, dy, 112, 1, '#8a6a44'); px(n, dx, dy + 6, 112, 2, '#2a1a12');
  px(n, dx + 4, dy + 8, 6, 34, '#3a2618'); px(n, dx + 102, dy + 8, 6, 34, '#3a2618'); px(n, dx + 4, dy + 8, 1, 34, '#5a3a24');
  // book press (iron screw press)
  const bx = dx + 64;
  px(n, bx, dy - 30, 30, 4, '#3a3a44'); px(n, bx, dy - 30, 30, 1, '#6a6a78'); px(n, bx + 2, dy - 26, 3, 26, '#2a2a32'); px(n, bx + 25, dy - 26, 3, 26, '#2a2a32');
  px(n, bx + 13, dy - 42, 4, 14, '#4a4a54'); px(n, bx + 6, dy - 44, 18, 3, '#5a5a66'); px(n, bx + 4, dy - 8, 22, 4, '#6a4a2a'); px(n, bx + 4, dy - 4, 22, 4, '#8a2a24');
  // stacks of books
  let sy2 = dy;
  for (let k = 0; k < 4; k++) { const w = 18 - k * 2 + rng.int(-1, 2), h = 4; const c = rng.pick(bookCols); px(n, dx + 18 + rng.int(-1, 1), sy2 - h, w, h, c); px(n, dx + 18, sy2 - h, w, 1, 'rgba(255,255,255,0.15)'); sy2 -= h; }
  // loose papers
  for (let k = 0; k < 3; k++) { px(n, dx + 40 + k * 7, dy - 2 + (k % 2), 8, 2, '#d8ccb0'); }
  // floor clutter: crates of signatures and a fallen book
  px(n, 236, 196, 30, 16, '#3a2618'); px(n, 236, 196, 30, 1, '#5a3a24'); for (let k = 0; k < 4; k++) px(n, 238 + k * 7, 192, 5, 5, '#d8ccb0');
  px(n, 440, 214, 14, 4, '#6a2a24'); px(n, 440, 214, 14, 1, '#8a4a3a');
  // drying-line pages (animated at runtime, recorded here)
  const pages: SceneLayers['pages'] = [];
  for (let x = 190; x < 470; x += rng.int(16, 26)) pages.push({ x, y: 46 + Math.sin(x * 0.03) * 6, w: rng.int(7, 10), h: rng.int(9, 13), c: rng.chance(0.2) ? '#cfc2a2' : '#e2d6b8' });
  return { far, mid, near, pages };
}

// ---------------------------------------------------------------------------- scene rendering
const motes: { x: number; y: number; s: number; p: number }[] = [];
let floater: { x: number; y: number; vx: number; rot: number; t: number } | null = null;
let eyesT = 0;

export function renderMenuScene(ms: MenuSystem, dt: number): void {
  const g = ms.g, r = g.r, ctx = r.ctx;
  if (!layers) layers = paintScene();
  const t = ms.time;
  const mx = g.input.mouse.active && g.input.mouse.x >= 0 ? clamp((g.input.mouse.x / VIEW_W) * 2 - 1, -1, 1) : Math.sin(t * 0.2) * 0.4;
  r.beginFrame('#05030a', 0.78);
  r.worldBegin(); ctx.globalAlpha = 1;
  const par = (k: number) => -12 - mx * k;
  ctx.drawImage(layers.far, par(3), 0);
  // moonbeam
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const beam = ctx.createLinearGradient(330, 40, 250, 260);
  beam.addColorStop(0, 'rgba(110,140,220,0.16)'); beam.addColorStop(1, 'rgba(110,140,220,0)');
  ctx.fillStyle = beam; ctx.beginPath(); const bx = 300 + par(3);
  ctx.moveTo(bx, 60); ctx.lineTo(bx + 74, 60); ctx.lineTo(bx + 40, 270); ctx.lineTo(bx - 120, 270); ctx.fill();
  ctx.restore();
  ctx.drawImage(layers.mid, par(6), 0);
  // drying line with swaying pages
  const lx = par(6);
  ctx.strokeStyle = 'rgba(160,140,110,0.55)'; ctx.lineWidth = 0.7; ctx.beginPath();
  for (let x = 176; x <= 504; x += 8) { const y = 44 + Math.sin(x * 0.03) * 6; if (x === 176) ctx.moveTo(x + lx, y); else ctx.lineTo(x + lx, y); } ctx.stroke();
  for (const p of layers.pages) {
    const sw = Math.sin(t * 1.3 + p.x * 0.11) * 0.12;
    ctx.save(); ctx.translate(p.x + lx, p.y); ctx.rotate(sw);
    ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, 0, p.w, p.h);
    ctx.fillStyle = 'rgba(70,50,40,0.35)'; for (let k = 2; k < p.h - 1; k += 2) ctx.fillRect(-p.w / 2 + 1, k, p.w - 3, 0.6);
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  // eyes in the gap between books, now and then
  eyesT += dt;
  const blink = eyesT % 9;
  if (blink > 6 && blink < 8.2 && !((blink * 6) % 4 < 0.4)) { const ex = 214 + par(6), ey = 113; ctx.fillStyle = '#ff3040'; ctx.fillRect(ex, ey, 1, 1); ctx.fillRect(ex + 4, ey, 1, 1); r.addGlow(ex + 2, ey, 5, '#ff2030', 0.4); }
  ctx.drawImage(layers.near, par(9), 0);
  // candle on the desk
  const fl = 0.9 + Math.sin(t * 11) * 0.05 + Math.sin(t * 7.1) * 0.05;
  const kx = 300 + 50 + par(9), ky = 160;
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(kx - 2, ky, 5, 12); ctx.fillStyle = '#fff4dc'; ctx.fillRect(kx - 2, ky, 5, 1); ctx.fillStyle = '#c8b898'; ctx.fillRect(kx + 2, ky + 1, 1, 11);
  ctx.fillStyle = '#ffd070'; ctx.beginPath(); ctx.ellipse(kx + 0.5, ky - 4 + Math.sin(t * 9) * 0.4, 1.8 * fl, 3.6 * fl, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff8e0'; ctx.fillRect(kx, ky - 4, 1, 2);
  r.addLight(kx, ky - 4, 150 * fl, 1); r.addLight(kx, ky - 4, 70 * fl, 1);
  r.addGlow(kx, ky - 4, 46 * fl, '#ff9a30', 0.5);
  r.addLight(337 + par(3), 80, 120, 0.55); // moonlight
  // Marcus on a stool, reading
  const sp = ms.sprites(CHARACTERS[0]);
  const mxp = 318 + par(9), myp = 200;
  ctx.fillStyle = '#3a2618'; ctx.fillRect(mxp - 7, myp - 6, 14, 3); ctx.fillRect(mxp - 6, myp - 3, 2, 7); ctx.fillRect(mxp + 4, myp - 3, 2, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(mxp, myp + 4, 10, 2.5, 0, 0, TAU); ctx.fill();
  const breathe = Math.floor(t * 1.2) % 2;
  sp.bodyIdle.side[breathe].draw(ctx, mxp, myp - 4);
  sp.head.side[(t % 5) < 0.15 ? 'blink' : 'normal'].draw(ctx, mxp, myp - 14 + breathe * 0.5);
  // open book in his hands
  ctx.fillStyle = '#e8dcc0'; ctx.fillRect(mxp + 6, myp - 15, 7, 5); ctx.fillStyle = '#6a2a24'; ctx.fillRect(mxp + 6, myp - 10, 7, 1);
  // moths circling the candle
  const moth = getEnemy('moth');
  if (moth) {
    const fr = getSprites(moth).idle;
    for (const mo of ms.moths) {
      mo.a += dt * mo.s;
      const x = kx + Math.cos(mo.a) * mo.r, y = ky - 22 + Math.sin(mo.a * 1.7 + mo.r) * mo.r * 0.5 - mo.y * 2;
      ctx.save(); ctx.translate(x, y); ctx.scale(0.55, 0.55);
      fr[Math.floor(t * 12 + mo.r) % fr.length].draw(ctx, 0, 0, { flip: Math.cos(mo.a + Math.PI / 2) < 0 });
      ctx.restore();
    }
  }
  // dust in the moonbeam
  if (!motes.length) for (let i = 0; i < 40; i++) motes.push({ x: Math.random() * 480, y: Math.random() * 270, s: 2 + Math.random() * 5, p: Math.random() * TAU });
  for (const d of motes) {
    d.y += d.s * dt * 0.6; d.x += Math.sin(t * 0.6 + d.p) * dt * 3; if (d.y > 270) { d.y = -2; d.x = 200 + Math.random() * 240; }
    const inBeam = d.x > 200 && d.x < 420;
    ctx.fillStyle = `rgba(220,215,240,${inBeam ? 0.55 : 0.18})`; ctx.fillRect(d.x | 0, d.y | 0, 1, 1);
  }
  // a loose page drifts down across the room now and then
  if (!floater && Math.random() < dt * 0.08) floater = { x: 200 + Math.random() * 220, y: -10, vx: (Math.random() - 0.5) * 12, rot: 0, t: 0 };
  if (floater) {
    const p = floater; p.t += dt; p.y += dt * 16; p.x += p.vx * dt + Math.sin(p.t * 2) * dt * 14; p.rot = Math.sin(p.t * 2.2) * 0.6;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = '#e2d6b8'; ctx.fillRect(-4, -5, 8, 10); ctx.fillStyle = 'rgba(70,50,40,0.4)'; for (let k = -3; k < 4; k += 2) ctx.fillRect(-3, k, 6, 0.6); ctx.restore();
    if (p.y > 220) floater = null;
  }
  // darken the left side so the menu reads
  const shade = ctx.createLinearGradient(0, 0, 230, 0);
  shade.addColorStop(0, 'rgba(4,2,8,0.92)'); shade.addColorStop(0.6, 'rgba(4,2,8,0.6)'); shade.addColorStop(1, 'rgba(4,2,8,0)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, 230, VIEW_H);
}

// ---------------------------------------------------------------------------- main menu
interface Entry { id: string; label: string; desc: () => string; enabled?: () => boolean; act: () => void; icon: (ctx: CanvasRenderingContext2D, x: number, y: number, c: string) => void }


/** Draw a word letter by letter with tracking; alphaOf lets single letters fade. Returns the width. */
function tracked(ctx: CanvasRenderingContext2D, word: string, x: number, y: number, track: number, alphaOf?: (i: number) => number): number {
  let cx = x;
  for (let i = 0; i < word.length; i++) {
    const a = alphaOf ? alphaOf(i) : 1;
    if (a < 1) { ctx.save(); ctx.globalAlpha *= a; ctx.fillText(word[i], cx, y); ctx.restore(); } else ctx.fillText(word[i], cx, y);
    cx += ctx.measureText(word[i]).width + (i < word.length - 1 ? track : 0);
  }
  return cx - x;
}
function trackedWidth(ctx: CanvasRenderingContext2D, word: string, track: number): number {
  let w = 0;
  for (let i = 0; i < word.length; i++) w += ctx.measureText(word[i]).width + (i < word.length - 1 ? track : 0);
  return w;
}

/**
 * Title: engraved Roman capitals, like a name pressed into a book cover. LOST sits small and widely
 * spaced between two rules; MARCUS is lit from below like candlelight, and its last letter keeps
 * fading, as if it is slipping away.
 */
function drawLogo(ctx: CanvasRenderingContext2D, t: number, a: number, finished = false): void {
  ctx.save(); ctx.globalAlpha = a;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  const x = 34, y = 58;
  ctx.font = `700 34px ${FONT_LOGO}`;
  const W = trackedWidth(ctx, 'MARCUS', 2.5);
  const cx = x + W / 2;
  // warm candle glow behind the name
  const flick = 0.85 + Math.sin(t * 7.3) * 0.05 + Math.sin(t * 13.1) * 0.04;
  const glow = ctx.createRadialGradient(cx, y - 10, 4, cx, y - 10, 110);
  glow.addColorStop(0, `rgba(210,140,60,${0.2 * flick})`); glow.addColorStop(1, 'rgba(210,140,60,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 50, y - 70, W + 100, 120);
  // LOST, small and spaced, between two rules
  ctx.font = `600 11px ${FONT_LOGO}`;
  const lw = trackedWidth(ctx, 'LOST', 9);
  const ly = y - 33;
  ctx.fillStyle = '#c9a46a';
  tracked(ctx, 'LOST', cx - lw / 2, ly, 9);
  ctx.fillStyle = 'rgba(201,164,106,0.55)';
  ctx.fillRect(x, ly - 4, cx - lw / 2 - x - 8, 0.8);
  ctx.fillRect(cx + lw / 2 + 8, ly - 4, x + W - (cx + lw / 2 + 8), 0.8);
  // MARCUS: shadow, then a candlelit fill
  ctx.font = `700 34px ${FONT_LOGO}`;
  const fade = (i: number) => (i === 5 && !finished ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.9)) : 1);
  ctx.fillStyle = 'rgba(20,8,6,0.85)';
  tracked(ctx, 'MARCUS', x + 1.5, y + 1.5, 2.5, fade);
  const grad = ctx.createLinearGradient(0, y - 26, 0, y + 2);
  grad.addColorStop(0, '#f6ecd8'); grad.addColorStop(0.55, '#e3c79a'); grad.addColorStop(1, '#a8743e');
  ctx.fillStyle = grad;
  tracked(ctx, 'MARCUS', x, y, 2.5, fade);
  // a ruled line with a diamond, like a printer's ornament
  const ry = y + 9;
  ctx.fillStyle = 'rgba(201,164,106,0.55)';
  ctx.fillRect(x, ry, W / 2 - 6, 0.8); ctx.fillRect(cx + 6, ry, W / 2 - 6, 0.8);
  ctx.fillStyle = '#c9a46a';
  ctx.beginPath(); ctx.moveTo(cx, ry - 2.6); ctx.lineTo(cx + 2.6, ry + 0.4); ctx.lineTo(cx, ry + 3.4); ctx.lineTo(cx - 2.6, ry + 0.4); ctx.fill();
  ctx.restore();
}

// tiny icon painters (vector, crisp at any scale)
const I = {
  play: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 3.5); c.lineTo(x + 6, y); c.lineTo(x, y + 3.5); c.fill(); },
  plus: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x, y - 0.75, 7, 1.5); c.fillRect(x + 2.75, y - 3.5, 1.5, 7); },
  sun: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(x + 3.5, y, 2, 0, TAU); c.fill(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.fillRect(x + 3.5 + Math.cos(a) * 3.6 - 0.5, y + Math.sin(a) * 3.6 - 0.5, 1, 1); } },
  skull: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(x + 3.5, y - 0.8, 3, 0, TAU); c.fill(); c.fillRect(x + 1.5, y + 1, 4, 2.5); c.fillStyle = '#07050a'; c.fillRect(x + 2, y - 1.5, 1.2, 1.4); c.fillRect(x + 3.9, y - 1.5, 1.2, 1.4); },
  person: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.beginPath(); c.arc(x + 3.5, y - 2, 2, 0, TAU); c.fill(); c.fillRect(x + 1, y + 0.5, 5, 3.5); },
  book: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x, y - 3.5, 7, 7); c.fillStyle = '#07050a'; c.fillRect(x + 1, y - 2.5, 0.8, 5); c.fillRect(x + 2.5, y - 1.5, 3, 0.8); },
  chart: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x, y + 1, 1.6, 2.5); c.fillRect(x + 2.6, y - 1, 1.6, 4.5); c.fillRect(x + 5.2, y - 3, 1.6, 6.5); },
  gear: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; c.fillRect(x + 3.5 + Math.cos(a) * 3 - 1, y + Math.sin(a) * 3 - 1, 2, 2); } c.beginPath(); c.arc(x + 3.5, y, 2.4, 0, TAU); c.fill(); c.fillStyle = '#07050a'; c.beginPath(); c.arc(x + 3.5, y, 1, 0, TAU); c.fill(); },
  bookmark: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.beginPath(); c.moveTo(x + 1, y - 4); c.lineTo(x + 6, y - 4); c.lineTo(x + 6, y + 4); c.lineTo(x + 3.5, y + 2); c.lineTo(x + 1, y + 4); c.fill(); },
  scroll: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x + 1, y - 3, 5, 6); c.fillRect(x, y - 3.5, 7, 1.2); c.fillRect(x, y + 2.3, 7, 1.2); },
  door: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.fillStyle = col; c.fillRect(x + 1, y - 4, 5, 8); c.fillStyle = '#07050a'; c.fillRect(x + 4.3, y, 0.9, 0.9); },
  history: (c: CanvasRenderingContext2D, x: number, y: number, col: string) => { c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); c.arc(x + 3.5, y, 3, 0, TAU); c.stroke(); c.fillStyle = col; c.fillRect(x + 3, y - 2, 1, 2.4); c.fillRect(x + 3, y - 0.2, 2, 1); },
};

function fmtHours(sec: number): string { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; }

export function mainMenuScreen(ms: MenuSystem): Screen {
  const g = ms.g;
  const desktop = !!(globalThis as any).bomDesktop;
  const run = g.save.data.run;
  const entries: Entry[] = [];
  // only what you can use right now: Continue appears with a story in progress, Challenges once one is open
  if (run) entries.push({ id: 'continue', label: 'Continue', icon: I.play,
    desc: () => `${CHARACTERS.find((c) => c.id === run.charId)?.name ?? ''} · ${pickTheme({ seed: run.seed, flags: run.flags ?? {} } as any, run.floor).name} · Seed ${formatSeed(run.seed)}${run.mode === 'hard' ? ' · Hard' : run.mode === 'endless' ? ' · Endless' : ''}`,
    act: () => g.fadeTo(() => { if (!g.continueRun()) ms.openMain(); }, 0.4) });
  entries.push(
    { id: 'new', label: 'New Run', icon: I.plus, desc: () => 'Pick a reader, a mode and (optionally) a seed.', act: () => ms.push(ms.newRunScreen()) },
    { id: 'daily', label: 'Daily Run', icon: I.sun, desc: () => 'One seed for everyone today.', act: () => ms.push(ms.dailyScreen()) },
  );
  if (CHALLENGES.some((c) => !c.unlock || g.save.isUnlocked(c.unlock))) entries.push({ id: 'challenges', label: 'Challenges', icon: I.skull, desc: () => 'Runs with special rules and unique rewards.', act: () => ms.push(ms.challengesScreen()) });
  entries.push(
    { id: 'journal', label: 'Journal', icon: I.book, desc: () => { const n = newUnlocks(g); return n ? `${n} new achievement${n > 1 ? 's' : ''} to read under Statistics.` : 'Story guide, readers, curios, combinations, notes and endings.'; }, act: () => ms.push(journalScreen(ms)) },
    { id: 'news', label: 'What\'s new', icon: I.scroll, desc: () => `What changed in v${GAME_VERSION}.`, act: () => ms.push(ms.whatsNewScreen()) },
    { id: 'options', label: 'Options', icon: I.gear, desc: () => 'Sound, video, controls, save slots and credits.', act: () => ms.push(ms.optionsScreen()) },
  );
  if (desktop) entries.push({ id: 'quit', label: 'Quit', icon: I.door, desc: () => 'Close the book for now. Progress is saved.', act: () => { g.save.flush(); (globalThis as any).bomDesktop.quit(); } });
  return entryList(ms, entries, { logo: true });
}

const newUnlocks = (g: { save: { data: { unlocks: string[]; seenUnlocks?: string[] } } }) => { const s = g.save.data.seenUnlocks ?? []; return g.save.data.unlocks.filter((u) => !s.includes(u) && ACHIEVEMENTS.some((a) => a.id === u)).length; };
function nextGoal(g: MenuSystem['g']): string {
  const has = (id: string) => g.save.isUnlocked(id);
  if (!has('beat_final')) {
    const chapter = ['beat_ch1', 'beat_ch2', 'beat_ch3', 'beat_ch4', 'beat_ch5', 'beat_ch6', 'beat_ch7'].findIndex((id) => !has(id));
    return chapter >= 0 ? `NEXT GOAL · Defeat the Chapter ${chapter + 1} boss.` : 'NEXT GOAL · Finish the story at the Binding.';
  }
  if (!has('back_stair')) return 'NEXT GOAL · Look for the boarded back stair near the boilers.';
  if (!has('both_halves')) return 'NEXT GOAL · Find both halves of Elias’s letter in the hospital.';
  if (!has('beat_patient')) return 'NEXT GOAL · Use the letter to open Room 4 and stay for the visit.';
  const endings = new Set(g.save.data.endings ?? []);
  if (!endings.has('goodnight')) {
    const otherFour = ['morning', 'own_hand', 'for_marcus', 'the_visit'].every((id) => endings.has(id));
    return otherFour ? 'NEXT GOAL · See the other endings, then visit once more.' : 'NEXT GOAL · Explore the book for its other endings.';
  }
  return 'NEXT GOAL · Fill another reader’s five ending marks.';
}
/** The Journal: everything you have seen and done, one level down from the title. */
export function journalScreen(ms: MenuSystem): Screen {
  const g = ms.g;
  const entries: Entry[] = [
    { id: 'story', label: 'Story so far', icon: I.scroll, desc: () => 'A plain-language guide to the family, the book and every ending. Spoilers.', act: () => ms.push(storyGuideScreen(ms)) },
    { id: 'characters', label: 'Readers', icon: I.person, desc: () => 'Every reader you have met in the cellar.', act: () => ms.push(ms.charactersScreen()) },
    { id: 'collection', label: 'Collection', icon: I.book, desc: () => `Curios found: ${g.save.data.itemsSeen.length}. Press ${g.input.usingPad ? padLabel(0) : 'Enter'} inside for the bestiary.`, act: () => ms.push(ms.collectionScreen()) },
    { id: 'synergies', label: 'Attack combinations', icon: I.chart, desc: () => `${g.save.data.discoveredCombos?.length ?? 0} attack combinations discovered.`, act: () => ms.push(ms.synergiesScreen()) },
    { id: 'history', label: 'Run History', icon: I.history, desc: () => `Your last ${Math.min(30, g.save.data.history?.length ?? 0)} stories, good and bad.`, act: () => ms.push(ms.historyScreen()) },
    { id: 'stats', label: newUnlocks(g) ? `Statistics (${newUnlocks(g)} new)` : 'Statistics', icon: I.chart, desc: () => 'Lifetime numbers and achievements: what each one asks and what it gives.', act: () => ms.push(ms.statsScreen()) },
    { id: 'notes', label: 'Notes', icon: I.scroll, desc: () => `Grandfather's notes found: ${g.save.data.notes?.length ?? 0} of ${NOTES.length}.`, act: () => ms.push(ms.notesScreen()) },
    { id: 'endings', label: 'Endings', icon: I.bookmark, desc: () => `Endings found: ${g.save.data.endings?.length ?? 0} of ${ENDINGS.length}.`, act: () => ms.push(ms.endingsScreen()) },
  ];
  return entryList(ms, entries, { title: 'Journal', back: true });
}

/** A spoiler-marked story guide, available from the Journal at any time. */
function storyGuideScreen(ms: MenuSystem): Screen {
  let selected = 0;
  const choose = (i: number) => { if (i !== selected) { selected = i; ms.sfxMove(); } };
  return {
    t: 0,
    update(keys) {
      for (const k of keys) {
        if (k === 'back') { ms.pop(); return; }
        if (k === 'up' || k === 'left') choose((selected + STORY_GUIDE.length - 1) % STORY_GUIDE.length);
        if (k === 'down' || k === 'right') choose((selected + 1) % STORY_GUIDE.length);
      }
    },
    pointer(x, y, click) {
      const i = Math.floor((y - 88) / 20);
      if (x < 164 && i >= 0 && i < STORY_GUIDE.length) {
        choose(i);
        if (click) ms.sfxOk();
      }
    },
    render(ctx) {
      ctx.fillStyle = 'rgba(4,2,6,0.91)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      heading(ctx, 'Story so far', 24, 34, 15, '#efe2c8', 'left');
      text(ctx, 'SPOILERS · PLAIN-LANGUAGE GUIDE', 24, 48, 6.5, '#c79c73', 'left', FONT_BODY, 600);
      ctx.fillStyle = 'rgba(201,164,106,0.35)'; ctx.fillRect(24, 56, VIEW_W - 48, 0.7);
      STORY_GUIDE.forEach((section, i) => {
        const y = 88 + i * 20, on = i === selected;
        if (on) { ctx.fillStyle = 'rgba(120,22,34,0.55)'; ctx.fillRect(18, y - 10, 143, 16); }
        text(ctx, section.title, 28, y, on ? 9 : 8, on ? '#fff2dc' : '#b8a890', 'left', FONT_TITLE, 400);
      });
      ctx.fillStyle = 'rgba(225,210,190,0.12)'; ctx.fillRect(170, 68, 0.7, VIEW_H - 96);
      const section = STORY_GUIDE[selected];
      heading(ctx, section.title, 190, 80, 12, '#ead8ba', 'left');
      const wrapLine = (s: string, maxWidth: number, fontSize: number): string[] => {
        const out: string[] = []; let line = '';
        for (const word of s.split(/\s+/)) {
          const next = line ? `${line} ${word}` : word;
          if (line && measure(ctx, next, fontSize, FONT_BODY, 400) > maxWidth) { out.push(line); line = word; }
          else line = next;
        }
        if (line) out.push(line);
        return out;
      };
      let y = 104;
      for (const paragraph of section.lines) {
        for (const line of wrapLine(paragraph, 260, 8)) {
          text(ctx, line, 190, y, 8, '#d2c5b0', 'left', FONT_BODY, 400); y += 11;
        }
        y += 9;
      }
      text(ctx, `${selected + 1} / ${STORY_GUIDE.length}`, VIEW_W - 25, VIEW_H - 11, 6.5, 'rgba(200,185,165,0.5)', 'right');
      promptBar(ctx, [['navV', 'browse'], ['back', 'back']]);
    },
  };
}

/** A vertical list of menu entries over the title scene (the title menu and its submenus). */
function entryList(ms: MenuSystem, entries: Entry[], o: { logo?: boolean; title?: string; back?: boolean }): Screen {
  const g = ms.g;
  let sel = 0;
  let hover = -1;
  const DY = 17, X0 = 46;
  const Y0 = o.logo ? 124 : 92;
  const select = (i: number) => { if (i !== sel) { sel = i; ms.sfxMove(); } };
  return {
    t: 0,
    update(keys) {
      for (const k of keys) {
        if (k === 'back' && o.back) { ms.pop(); return; }
        if (k === 'up' || k === 'down') { sel = (sel + (k === 'up' ? -1 : 1) + entries.length) % entries.length; ms.sfxMove(); }
        if (k === 'confirm') { ms.sfxOk(); entries[sel].act(); }
      }
    },
    pointer(x, y, click) {
      hover = -1;
      for (let i = 0; i < entries.length; i++) {
        const ey = Y0 + i * DY;
        if (x >= X0 - 16 && x <= X0 + 120 && y >= ey - 10 && y <= ey + 5) { hover = i; break; }
      }
      if (hover >= 0) { select(hover); if (click) { ms.sfxOk(); entries[hover].act(); } }
    },
    render(ctx) {
      const a = ease.outCubic(clamp(this.t * 1.4, 0, 1));
      if (o.logo) drawLogo(ctx, ms.time, a, g.save.isUnlocked('the_end'));
      ctx.save(); ctx.globalAlpha = a;
      if (o.title) {
        // a soft shade so the submenu reads over the scene
        const sh = ctx.createLinearGradient(0, 0, 260, 0); sh.addColorStop(0, 'rgba(4,2,6,0.82)'); sh.addColorStop(1, 'rgba(4,2,6,0)');
        ctx.fillStyle = sh; ctx.fillRect(0, 0, 260, VIEW_H);
        heading(ctx, o.title, X0 - 12, 62, 15, '#efe2c8', 'left');
        ctx.fillStyle = 'rgba(201,164,106,0.45)'; ctx.fillRect(X0 - 12, 69, 120, 0.6);
      }
      entries.forEach((e, i) => {
        const y = Y0 + i * DY, on = i === sel;
        const slide = on ? 5 + Math.sin(ms.time * 5) * 0.6 : 0;
        if (on) {
          // brushed ink stroke behind the selection, and a needle cursor
          const w = measure(ctx, e.label, 12, FONT_TITLE, 400) + 34;
          const grad = ctx.createLinearGradient(X0 - 20, 0, X0 - 20 + w, 0);
          grad.addColorStop(0, 'rgba(120,22,34,0.85)'); grad.addColorStop(1, 'rgba(120,22,34,0)');
          ctx.fillStyle = grad; ctx.fillRect(X0 - 20, y - 10, w, 14);
          ctx.fillStyle = '#d8d8e0'; ctx.fillRect(X0 - 32 + Math.sin(ms.time * 6) * 1.5, y - 4, 9, 1); ctx.fillRect(X0 - 33 + Math.sin(ms.time * 6) * 1.5, y - 4.5, 1, 2);
        }
        e.icon(ctx, X0 - 13 + slide, y - 3.6, on ? '#ff8a8a' : 'rgba(200,180,160,0.5)');
        text(ctx, e.label, X0 + slide, y, on ? 12 : 10.5, on ? '#fff2dc' : '#b8a890', 'left', FONT_TITLE, 400);
      });
      // one quiet line describing the highlighted entry
      text(ctx, entries[sel].desc(), X0 - 13, Y0 + entries.length * DY + 4, 7, 'rgba(225,210,190,0.6)', 'left', FONT_BODY, 500);
      ctx.restore();
      if (o.back) { const bw = drawGlyphs(ctx, glyphsFor('back'), X0 - 13, VIEW_H - 12.4, 7); text(ctx, 'back', X0 - 13 + bw + 2.5, VIEW_H - 10, 6.5, 'rgba(200,185,165,0.55)', 'left'); }
      if (o.logo) {
        const goal = nextGoal(g);
        text(ctx, goal, 24, VIEW_H - 9, 6.5, 'rgba(230,205,170,0.62)', 'left', FONT_BODY, 600);
        const info = g.save.slotInfo(g.save.slot);
        text(ctx, `Slot ${g.save.slot}  ·  ${info.wins} win${info.wins === 1 ? '' : 's'}  ·  ${fmtHours(g.save.data.stats.playTime ?? 0)} played`, VIEW_W - 8, VIEW_H - 8, 6, 'rgba(200,185,165,0.45)', 'right');
        text(ctx, `v${GAME_VERSION.split('.').slice(0, 2).join('.')}  ·  Papermoth Games`, VIEW_W - 8, VIEW_H - 16, 6, 'rgba(200,185,165,0.3)', 'right');
        if (update.text) text(ctx, update.text, VIEW_W - 8, VIEW_H - 25, 6.5, update.ready ? '#a8e090' : '#e8c070', 'right');
      }
    },
  };
}

// ---------------------------------------------------------------------------- save slots
export function profilesScreen(ms: MenuSystem): Screen {
  const g = ms.g;
  let sel = g.save.slot - 1, row = 0; // row 0: slots, row 1: actions
  const actions = ['Use slot', 'Export save', 'Import save', 'Erase slot'];
  if (store.kind === 'file') actions.push('Open save folder');
  let act = 0, msg = '', msgT = 0;
  const flash = (s: string) => { msg = s; msgT = 3; };
  const doAction = () => {
    const n = sel + 1;
    switch (actions[act]) {
      case 'Use slot':
        if (n !== g.save.slot) { g.save.useSlot(n); g.audio.play('pageUse'); flash(`Now playing on slot ${n}.`); } else flash(`Already on slot ${n}.`);
        break;
      case 'Export save': {
        if (n !== g.save.slot) { flash('Switch to this slot first.'); break; }
        const blob = new Blob([g.save.exportSlot()], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `lost-marcus-slot${n}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        flash('Save exported.');
        break;
      }
      case 'Import save': {
        if (n !== g.save.slot) { flash('Switch to this slot first.'); break; }
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; f.text().then((s) => flash(g.save.importSlot(s) ? 'Save imported.' : 'That file is not a Lost Marcus save.')); };
        inp.click();
        break;
      }
      case 'Erase slot':
        ms.push(ms.confirmScreen(`Erase slot ${n}? Every unlock, statistic and saved run on it will be lost.`, () => { g.save.eraseSlot(n); ms.pop(); flash(`Slot ${n} erased.`); }));
        break;
      case 'Open save folder':
        void (globalThis as any).bomDesktop.openSaveFolder();
        break;
    }
  };
  const cardX = (i: number) => 52 + i * 128;
  return {
    t: 0,
    update(keys, dt) {
      msgT = Math.max(0, msgT - dt);
      for (const k of keys) {
        if (k === 'back') { ms.pop(); return; }
        if (k === 'up' || k === 'down') { row = 1 - row; ms.sfxMove(); }
        if (k === 'left' || k === 'right') { const d = k === 'left' ? -1 : 1; if (row === 0) sel = (sel + d + SLOTS) % SLOTS; else act = (act + d + actions.length) % actions.length; ms.sfxMove(); }
        if (k === 'confirm') { if (row === 0) { row = 1; act = 0; } else doAction(); ms.sfxOk(); }
      }
    },
    pointer(x, y, click) {
      for (let i = 0; i < SLOTS; i++) if (x >= cardX(i) && x <= cardX(i) + 116 && y >= 60 && y <= 170) { if (sel !== i || row !== 0) { sel = i; row = 0; ms.sfxMove(); } if (click) { row = 1; act = 0; } return; }
      const aw = 80, ax0 = VIEW_W / 2 - (actions.length * aw) / 2;
      for (let i = 0; i < actions.length; i++) if (x >= ax0 + i * aw && x <= ax0 + i * aw + aw - 6 && y >= 186 && y <= 202) { if (act !== i || row !== 1) { act = i; row = 1; ms.sfxMove(); } if (click) { ms.sfxOk(); doAction(); } return; }
    },
    render(ctx) {
      ctx.fillStyle = 'rgba(4,2,8,0.78)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      heading(ctx, 'Save Slots', VIEW_W / 2, 40, 13, '#efe2c8');
      for (let i = 0; i < SLOTS; i++) {
        const info = g.save.slotInfo(i + 1), x = cardX(i), on = sel === i && row === 0, cur = g.save.slot === i + 1;
        ctx.fillStyle = on ? 'rgba(60,24,34,0.95)' : 'rgba(20,14,24,0.92)'; ctx.fillRect(x, 60, 116, 110);
        ctx.strokeStyle = cur ? COL.gold : on ? '#c8a080' : 'rgba(160,140,120,0.4)'; ctx.lineWidth = on ? 1.2 : 0.7; ctx.strokeRect(x + 0.5, 60.5, 115, 109);
        text(ctx, `Slot ${i + 1}`, x + 10, 78, 12, cur ? COL.gold : '#efe2c8', 'left', FONT_TITLE, 400);
        if (cur) text(ctx, 'IN USE', x + 106, 78, 6, COL.gold, 'right');
        if (info.empty) { text(ctx, 'Empty', x + 10, 100, 8, COL.dim); continue; }
        const rows: [string, string][] = [['Runs', String(info.runs)], ['Wins', String(info.wins)], ['Unlocks', String(info.unlocks)], ['Played', fmtHours(info.playTime)], ['Run saved', info.hasRun ? 'Yes' : 'No']];
        rows.forEach(([k, v], j) => { text(ctx, k, x + 10, 96 + j * 12, 7.5, COL.dim); text(ctx, v, x + 106, 96 + j * 12, 7.5, COL.text, 'right'); });
        if (info.lastPlayed) text(ctx, new Date(info.lastPlayed).toLocaleDateString(), x + 10, 164, 6, 'rgba(200,185,165,0.5)');
      }
      const aw = 80, ax0 = VIEW_W / 2 - (actions.length * aw) / 2;
      actions.forEach((s, i) => {
        const on = row === 1 && act === i, x = ax0 + i * aw;
        ctx.fillStyle = on ? 'rgba(120,22,34,0.9)' : 'rgba(30,20,30,0.85)'; ctx.fillRect(x, 186, aw - 6, 16);
        text(ctx, s, x + (aw - 6) / 2, 197, 7.5, on ? '#fff2dc' : COL.text, 'center', FONT_BODY, 600);
      });
      if (msgT > 0) text(ctx, msg, VIEW_W / 2, 222, 8, COL.gold, 'center');
      text(ctx, store.kind === 'file' ? 'Saves are files in your app-data folder and are written every room.' : 'Saves live in this browser. Export a backup to keep them safe.', VIEW_W / 2, 238, 6.5, COL.dim, 'center');
      promptBar(ctx, [['navH', 'choose'], ['navV', 'switch row'], ['confirm', 'select'], ['back', 'back']]);
    },
  };
}
