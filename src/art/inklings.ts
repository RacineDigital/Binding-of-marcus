// Inkling art: a wet blob of ink holding the silhouette of the creature it was taken from, rimmed in
// the essence's colour. One small canvas per essence (pickups, the HUD margins, cards, the Journal).
import { INKLINGS, ENEMY_INK, setInklingIconPainter } from '../game/inklings';
import { getEnemy } from '../enemies/registry';
import { getSprites } from '../enemies/enemy';
import { TAU } from '../core/math';

const cache = new Map<string, HTMLCanvasElement>();

/** The creature an essence is drawn with: the first one written in it. */
export function inklingCreature(id: string): string | null {
  for (const [enemy, ink] of Object.entries(ENEMY_INK)) if (ink === id) return enemy;
  return null;
}

/** The Inkling drawn S pixels across (22 on the floor, 14 in the margins, 10 over a creature's head). */
export function inklingIcon(id: string, S = 22): HTMLCanvasElement {
  const key = id + '@' + S;
  let c = cache.get(key);
  if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = S;
  const u = S / 22;
  const ctx = c.getContext('2d')!;
  const d = INKLINGS[id];
  // the blob: an irregular round of ink with two drips, a darker core and a coloured rim
  let seed = id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed >>> 8) / 16777216; };
  const pts: [number, number][] = [];
  for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU, r = (8.2 + rnd() * 1.6) * u; pts.push([S / 2 + Math.cos(a) * r, S / 2 - u + Math.sin(a) * r * 0.92]); }
  const blob = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  ctx.fillStyle = d?.color ?? '#8080c0'; blob(); ctx.fill();
  ctx.save(); ctx.translate(S / 2, S / 2 - u); ctx.scale(0.86, 0.86); ctx.translate(-S / 2, -S / 2 + u); ctx.fillStyle = '#14111f'; blob(); ctx.fill(); ctx.restore();
  if (S >= 16) {
    ctx.fillStyle = '#14111f'; ctx.fillRect(Math.round(7 * u), Math.round(17 * u), 2, Math.round(4 * u)); ctx.fillRect(Math.round(14 * u), Math.round(17 * u), 2, Math.round(3 * u));
    ctx.fillStyle = d?.color ?? '#8080c0'; ctx.fillRect(Math.round(7 * u), Math.round(20 * u), 2, 1); ctx.fillRect(Math.round(14 * u), Math.round(19 * u), 2, 1);
  }
  // the creature, as a silhouette in the essence's colour
  const def = getEnemy(inklingCreature(id) ?? '');
  const set = def ? getSprites(def) : null;
  const spr = set ? Object.values(set).find((l) => l.length)?.[0] : null;
  if (spr) {
    const box = Math.max(6, Math.round(12 * u)), sw = spr.canvas.width, sh = spr.canvas.height, k = Math.min(box / sw, box / sh);
    const t = document.createElement('canvas'); t.width = Math.max(1, Math.round(sw * k)); t.height = Math.max(1, Math.round(sh * k));
    const tc = t.getContext('2d')!; tc.imageSmoothingEnabled = false; tc.drawImage(spr.canvas, 0, 0, t.width, t.height);
    tc.globalCompositeOperation = 'source-in'; tc.fillStyle = d?.color ?? '#c0c0e0'; tc.fillRect(0, 0, t.width, t.height);
    ctx.drawImage(t, Math.round((S - t.width) / 2), Math.round((S - t.height) / 2) - Math.round(u));
  }
  // a wet highlight
  if (S >= 14) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(Math.round(6 * u), Math.round(5 * u), 2, 1); ctx.fillRect(Math.round(5 * u), Math.round(6 * u), 1, 2); }
  cache.set(key, c);
  return c;
}

setInklingIconPainter(inklingIcon);
