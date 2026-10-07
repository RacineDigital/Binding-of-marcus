// Button prompts drawn as the player's own controls: keycaps on the keyboard, and on a controller the
// buttons of the one in hand (Xbox, PlayStation, Nintendo or Steam Deck), so every hint matches what's
// under their thumbs. Used by the menu hint bar and the controls pages.
import { text, measure, FONT_BODY } from './draw';
import { currentInput, keyLabel, padButtonOf, padLabel, type Action, type PadKind } from '../core/input';
import { VIEW_W, VIEW_H } from '../core/constants';

/** A controller glyph: a standard-mapping button (0-15), or the D-pad / a stick as a whole. */
export type PadGlyph = number | 'dpad' | 'dpadV' | 'dpadH' | 'lstick' | 'rstick';
export type Glyph = { pad: PadGlyph } | { key: string };
/** What a prompt asks for: a menu control, or an action (shown as whatever it's bound to). */
export type PromptKey = 'confirm' | 'back' | 'nav' | 'navV' | 'navH' | 'tabs' | 'tabL' | 'tabR' | Action;
/** [what to press (null for plain text), what it does, only on a controller ('pad') or only on keyboard and mouse ('keys')] */
export type Prompt = [PromptKey | PromptKey[] | null, string, ('pad' | 'keys')?];

const INKC = '#16110d', LIGHT = '#efe7d6', DARK = '#2c2a31';
const XBOX_FACE = ['#5fb544', '#d8473b', '#3b82d6', '#e8b52c'];
const PS_FACE = ['#8fb8ff', '#ff7a7a', '#f49ad8', '#4fd8b4'];

export const padKind = (): PadKind => currentInput()?.padKind ?? 'xbox';
export const onPad = (): boolean => !!currentInput()?.usingPad;

/** The glyphs for a prompt on the device in use. */
export function glyphsFor(k: PromptKey, pad = onPad()): Glyph[] {
  if (pad) {
    switch (k) {
      case 'confirm': return [{ pad: 0 }];
      case 'back': return [{ pad: 1 }];
      case 'nav': return [{ pad: 'dpad' }];
      case 'navV': return [{ pad: 'dpadV' }];
      case 'navH': return [{ pad: 'dpadH' }];
      case 'tabs': return [{ pad: 4 }, { pad: 5 }];
      case 'tabL': return [{ pad: 4 }];
      case 'tabR': return [{ pad: 5 }];
      default: { const b = padButtonOf(k); return [b === undefined ? { key: '—' } : { pad: b }]; }
    }
  }
  switch (k) {
    case 'confirm': return [{ key: 'Enter' }];
    case 'back': return [{ key: 'Esc' }];
    case 'nav': return [{ key: '↑↓←→' }];
    case 'navV': return [{ key: '↑↓' }];
    case 'navH': return [{ key: '←→' }];
    case 'tabs': return [{ key: 'Q' }, { key: 'R' }];
    case 'tabL': return [{ key: 'Q' }];
    case 'tabR': return [{ key: 'R' }];
    default: { const c = currentInput()?.bindings[k]?.[0]; return [{ key: c ? keyLabel(c) : '—' }]; }
  }
}

function font(ctx: CanvasRenderingContext2D, px: number, weight = 700): void {
  ctx.font = `${weight} ${px}px ${FONT_BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
}
function label(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, color: string): void {
  font(ctx, px); ctx.fillStyle = color; ctx.fillText(s, x, y + px * 0.04);
}
const keyPx = (h: number) => h * 0.74;
/** PlayStation names its View/Menu buttons (Create, Options) where the others have icons. */
const menuWord = (kind: PadKind) => kind === 'playstation';

/** Width of a glyph drawn h tall. */
export function glyphWidth(ctx: CanvasRenderingContext2D, g: Glyph, h: number, kind = padKind()): number {
  if ('key' in g) { font(ctx, keyPx(h)); return Math.max(h, ctx.measureText(g.key).width + h * 0.62); }
  const p = g.pad;
  if (typeof p !== 'number') return h * (p === 'dpad' || p === 'dpadV' || p === 'dpadH' ? 1 : 1.05);
  if (p >= 4 && p <= 7) { font(ctx, h * 0.58); return Math.max(h * 1.55, ctx.measureText(padLabel(p, kind)).width + h * 0.6); }
  if (p === 8 || p === 9) {
    if (kind === 'nintendo') return h;
    if (menuWord(kind)) { font(ctx, h * 0.52); return ctx.measureText(padLabel(p, kind)).width + h * 0.7; }
    return h * 1.35;
  }
  return h;
}

function outline(ctx: CanvasRenderingContext2D, h: number): void { ctx.strokeStyle = 'rgba(14,10,8,0.85)'; ctx.lineWidth = Math.max(0.45, h * 0.075); ctx.stroke(); }

/** Draw a glyph h tall with its left edge at x and its middle at cy; returns its width. */
export function drawGlyph(ctx: CanvasRenderingContext2D, g: Glyph, x: number, cy: number, h: number, kind = padKind()): number {
  const w = glyphWidth(ctx, g, h, kind);
  ctx.save();
  if ('key' in g) {
    // a keycap: a light key with a darker lip below
    ctx.fillStyle = 'rgba(40,28,18,0.55)'; ctx.beginPath(); ctx.roundRect(x, cy - h / 2 + h * 0.1, w, h, h * 0.22); ctx.fill();
    ctx.fillStyle = LIGHT; ctx.beginPath(); ctx.roundRect(x, cy - h / 2, w, h * 0.92, h * 0.22); ctx.fill(); outline(ctx, h);
    label(ctx, g.key, x + w / 2, cy - h * 0.04, keyPx(h), INKC);
    ctx.restore(); return w;
  }
  const p = g.pad, cx = x + w / 2, r = h / 2;
  if (typeof p === 'number' && p <= 3) {
    // face buttons: Xbox colours, PlayStation shapes, letters on Nintendo and the Deck
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = kind === 'xbox' ? XBOX_FACE[p] : DARK; ctx.fill(); outline(ctx, h);
    if (kind === 'playstation') {
      ctx.strokeStyle = PS_FACE[p]; ctx.lineWidth = Math.max(0.6, h * 0.12); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const s = h * 0.22;
      ctx.beginPath();
      if (p === 0) { ctx.moveTo(cx - s, cy - s); ctx.lineTo(cx + s, cy + s); ctx.moveTo(cx + s, cy - s); ctx.lineTo(cx - s, cy + s); }
      else if (p === 1) ctx.arc(cx, cy, s * 1.05, 0, Math.PI * 2);
      else if (p === 2) ctx.rect(cx - s, cy - s, s * 2, s * 2);
      else { ctx.moveTo(cx, cy - s * 1.15); ctx.lineTo(cx + s * 1.15, cy + s * 0.85); ctx.lineTo(cx - s * 1.15, cy + s * 0.85); ctx.closePath(); }
      ctx.stroke();
    } else {
      const dark = kind === 'xbox' && (p === 0 || p === 3);
      label(ctx, padLabel(p, kind), cx, cy, h * 0.66, dark ? INKC : '#f6f1e8');
    }
  } else if (typeof p === 'number' && p >= 4 && p <= 7) {
    // bumpers are flat bars; triggers are taller, rounded on top
    const trig = p >= 6, bh = trig ? h : h * 0.78, top = cy - bh / 2;
    ctx.beginPath(); ctx.roundRect(x, top, w, bh, trig ? [h * 0.42, h * 0.42, h * 0.14, h * 0.14] : h * 0.22);
    ctx.fillStyle = LIGHT; ctx.fill(); outline(ctx, h);
    label(ctx, padLabel(p, kind), cx, cy + (trig ? h * 0.04 : 0), h * 0.58, INKC);
  } else if (p === 8 || p === 9) {
    if (kind === 'nintendo') {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2); ctx.fillStyle = DARK; ctx.fill(); outline(ctx, h);
      ctx.fillStyle = '#f6f1e8'; const t = h * 0.1, l = h * 0.27;
      ctx.fillRect(cx - l, cy - t / 2, l * 2, t); if (p === 9) ctx.fillRect(cx - t / 2, cy - l, t, l * 2);
    } else {
      ctx.beginPath(); ctx.roundRect(x, cy - h * 0.36, w, h * 0.72, h * 0.36); ctx.fillStyle = DARK; ctx.fill(); outline(ctx, h);
      ctx.fillStyle = '#f6f1e8'; ctx.strokeStyle = '#f6f1e8'; ctx.lineWidth = Math.max(0.4, h * 0.07);
      if (menuWord(kind)) label(ctx, padLabel(p, kind), cx, cy, h * 0.52, '#f6f1e8');
      else if (p === 9) { const l = h * 0.26; for (let i = -1; i <= 1; i++) ctx.fillRect(cx - l, cy + i * h * 0.13 - h * 0.035, l * 2, h * 0.07); }
      else { const s = h * 0.2; ctx.strokeRect(cx - s * 1.2, cy - s * 0.9, s * 1.5, s * 1.3); ctx.fillRect(cx - s * 0.3, cy - s * 0.4, s * 1.5, s * 1.3); }
    }
  } else if (p === 10 || p === 11 || p === 'lstick' || p === 'rstick') {
    // a thumbstick seen from above; clicking it shows its click name
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = DARK; ctx.fill(); outline(ctx, h);
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2); ctx.fillStyle = '#4a4752'; ctx.fill();
    const left = p === 10 || p === 'lstick';
    if (typeof p === 'number') label(ctx, padLabel(p, kind), cx, cy, h * 0.42, '#f6f1e8');
    else {
      label(ctx, left ? 'L' : 'R', cx, cy, h * 0.5, '#f6f1e8');
      ctx.fillStyle = 'rgba(246,241,232,0.8)';
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r * 0.84, cy + Math.sin(a) * r * 0.84, h * 0.055, 0, Math.PI * 2); ctx.fill(); }
    }
  } else {
    // the D-pad: lit arms show which way to press
    const t = h * 0.36, e = h / 2;
    const lit = (dir: number) => p === 'dpad' || p === 12 + dir || (p === 'dpadV' && dir < 2) || (p === 'dpadH' && dir >= 2);
    ctx.beginPath();
    ctx.moveTo(cx - t / 2, cy - e); ctx.lineTo(cx + t / 2, cy - e); ctx.lineTo(cx + t / 2, cy - t / 2); ctx.lineTo(cx + e, cy - t / 2);
    ctx.lineTo(cx + e, cy + t / 2); ctx.lineTo(cx + t / 2, cy + t / 2); ctx.lineTo(cx + t / 2, cy + e); ctx.lineTo(cx - t / 2, cy + e);
    ctx.lineTo(cx - t / 2, cy + t / 2); ctx.lineTo(cx - e, cy + t / 2); ctx.lineTo(cx - e, cy - t / 2); ctx.lineTo(cx - t / 2, cy - t / 2); ctx.closePath();
    // a mid-grey body so the cross reads on dark bars as well as on paper
    ctx.fillStyle = '#5c5966'; ctx.fill(); outline(ctx, h);
    ctx.fillStyle = LIGHT;
    const arm = [[cx - t / 2 + 0.3, cy - e + 0.3, t - 0.6, e - t / 2], [cx - t / 2 + 0.3, cy + t / 2, t - 0.6, e - t / 2 - 0.3], [cx - e + 0.3, cy - t / 2 + 0.3, e - t / 2, t - 0.6], [cx + t / 2, cy - t / 2 + 0.3, e - t / 2 - 0.3, t - 0.6]];
    arm.forEach(([ax, ay, aw, ah], dir) => { if (lit(dir)) ctx.fillRect(ax, ay, aw, ah); });
  }
  ctx.restore();
  return w;
}

/** Glyphs side by side; returns the total width. */
export function drawGlyphs(ctx: CanvasRenderingContext2D, gs: Glyph[], x: number, cy: number, h: number): number {
  let w = 0;
  gs.forEach((g, i) => { if (i) w += h * 0.18; w += drawGlyph(ctx, g, x + w, cy, h); });
  return w;
}
export function glyphsWidth(ctx: CanvasRenderingContext2D, gs: Glyph[], h: number): number {
  return gs.reduce((s, g, i) => s + glyphWidth(ctx, g, h) + (i ? h * 0.18 : 0), 0);
}

/** The control hints along the bottom edge, in a small dark pill: glyphs for the device in use, then what they do. */
export function promptBar(ctx: CanvasRenderingContext2D, items: Prompt[], y = VIEW_H - 15): void {
  const pad = onPad(), size = 6.5, G = 7.4, sep = 9, gap = 2.4;
  const parts = items
    .filter(([, , only]) => !only || (only === 'pad') === pad)
    .map(([k, s]) => ({ glyphs: k === null ? [] : (Array.isArray(k) ? k : [k]).flatMap((kk) => glyphsFor(kk, pad)), s }));
  if (!parts.length) return;
  const widths = parts.map((p) => glyphsWidth(ctx, p.glyphs, G) + (p.glyphs.length && p.s ? gap : 0) + (p.s ? measure(ctx, p.s, size) : 0));
  const inner = widths.reduce((a, b) => a + b, 0) + sep * (parts.length - 1), total = inner + 16;
  const fit = Math.min(1, (VIEW_W - 8) / total), H = 11;
  ctx.save();
  ctx.translate(VIEW_W / 2, y + H / 2); ctx.scale(fit, fit); ctx.translate(-VIEW_W / 2, -(y + H / 2));
  const x0 = VIEW_W / 2 - total / 2;
  ctx.fillStyle = 'rgba(12,8,10,0.84)'; ctx.beginPath(); ctx.roundRect(x0, y, total, H, 5.5); ctx.fill();
  ctx.strokeStyle = 'rgba(201,164,106,0.35)'; ctx.lineWidth = 0.5; ctx.stroke();
  let x = x0 + 8;
  const cy = y + H / 2;
  parts.forEach((p, i) => {
    if (i) { ctx.fillStyle = 'rgba(230,215,195,0.45)'; ctx.fillRect(x + sep / 2 - 0.5, cy - 0.5, 1, 1); x += sep; }
    x += drawGlyphs(ctx, p.glyphs, x, cy, G);
    if (p.glyphs.length && p.s) x += gap;
    if (p.s) { text(ctx, p.s, x, cy + 2.3, size, 'rgba(232,218,198,0.9)', 'left', FONT_BODY, 600, false); x += measure(ctx, p.s, size); }
  });
  ctx.restore();
}
