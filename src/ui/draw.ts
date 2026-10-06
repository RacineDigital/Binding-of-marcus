// Shared UI drawing helpers (virtual 480x270 coordinates, crisp text).
export const FONT_TITLE = "'Pirata One', 'Georgia', serif";
export const FONT_BODY = "'Barlow Condensed', 'Arial Narrow', sans-serif";
export const COL = {
  ink: '#120e18', panel: 'rgba(14,10,20,0.9)', border: '#8a7560', text: '#efe6d6', dim: '#a89c8c', up: '#9ee08a', down: '#ff8a7a',
  gold: '#f0c860', note: '#b8a8ff', red: '#e04a4a',
};

/** Extra scale for text drawn while it is set (the HUD sets it from Options -> HUD text size). */
let TS = 1;
export function setTextScale(k: number): void { TS = k; }
export function textScale(): number { return TS; }
export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = COL.text, align: CanvasTextAlign = 'left', font = FONT_BODY, weight = 600, shadow = true): number {
  size *= TS;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  if (shadow) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillText(s, x + size * 0.07, y + size * 0.07); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
  return ctx.measureText(s).width;
}
/** The logo face: engraved Roman capitals. */
export const FONT_LOGO = "'Cinzel', 'Trajan Pro', Georgia, serif";
/**
 * Page heading in the logo's style: spaced capitals, with a printer's rule and diamond under
 * centred headings. Returns the width.
 */
export function heading(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color: string, align: 'left' | 'center' = 'center', rule = align === 'center'): number {
  const S = s.toUpperCase();
  ctx.save();
  ctx.font = `700 ${size}px ${FONT_LOGO}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const track = size * 0.09;
  (ctx as any).letterSpacing = `${track}px`;
  const w = ctx.measureText(S).width - track;
  const x0 = align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = 'rgba(40,20,10,0.25)'; ctx.fillText(S, x0 + size * 0.06, y + size * 0.06);
  ctx.fillStyle = color; ctx.fillText(S, x0, y);
  (ctx as any).letterSpacing = '0px';
  if (rule) {
    const ry = y + size * 0.45, half = Math.max(w * 0.5, 24) + 6, d = size * 0.18;
    ctx.globalAlpha *= 0.55; ctx.fillStyle = color;
    ctx.fillRect(x0 + w / 2 - half, ry, half - d - 3, 0.6); ctx.fillRect(x0 + w / 2 + d + 3, ry, half - d - 3, 0.6);
    ctx.globalAlpha /= 0.55;
    ctx.beginPath(); ctx.moveTo(x0 + w / 2, ry - d); ctx.lineTo(x0 + w / 2 + d, ry + 0.3); ctx.lineTo(x0 + w / 2, ry + d + 0.6); ctx.lineTo(x0 + w / 2 - d, ry + 0.3); ctx.fill();
  }
  ctx.restore();
  return w;
}
export function measure(ctx: CanvasRenderingContext2D, s: string, size: number, font = FONT_BODY, weight = 600): number {
  ctx.font = `${weight} ${size * TS}px ${font}`; return ctx.measureText(s).width;
}
/** Wrap text into lines that fit maxW. */
export function wrap(ctx: CanvasRenderingContext2D, s: string, size: number, maxW: number, font = FONT_BODY): string[] {
  ctx.font = `600 ${size * TS}px ${font}`;
  const words = s.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** Chamfered ink panel with a thin warm border. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 1, border = COL.border, fill: string | CanvasGradient = COL.panel): void {
  const c = 3;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.moveTo(x + c, y); ctx.lineTo(x + w - c, y); ctx.lineTo(x + w, y + c); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x + c, y + h); ctx.lineTo(x, y + h - c); ctx.lineTo(x, y + c); ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = border; ctx.lineWidth = 0.6; ctx.stroke();
  // inner hairline
  ctx.strokeStyle = 'rgba(255,240,220,0.06)'; ctx.lineWidth = 0.5;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.restore();
}
/** Torn paper strip used for banners. */
export function paperStrip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha: number, seed = 1): void {
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.beginPath();
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  ctx.moveTo(x, y + rnd() * 2);
  for (let i = 1; i <= 24; i++) ctx.lineTo(x + (w * i) / 24, y + rnd() * 2.5);
  for (let i = 24; i >= 0; i--) ctx.lineTo(x + (w * i) / 24, y + h - rnd() * 2.5);
  ctx.closePath();
  ctx.fillStyle = '#e4d8bc'; ctx.fill();
  ctx.fillStyle = 'rgba(120,90,60,0.12)';
  for (let i = 0; i < 40; i++) ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 3, 0.6);
  ctx.strokeStyle = 'rgba(80,60,40,0.5)'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.restore();
}
