// World pickups: currency, keys, bombs, hearts, consumables, chests and item pedestals.
import type { World } from './world';
import { snap } from '../render/snap';
import { pickupSprites } from '../art/pickups';
import { moveBody } from '../rooms/collide';
import { TAU } from '../core/math';
import { itemIconCanvas } from '../art/items';
import { getItem } from '../items/registry';
import { homePool } from '../items/homes';
import type { PoolId } from '../items/types';

export class Pickup {
  kind: string; x: number; y: number; z = 0; vx = 0; vy = 0; vz = 0; r = 5;
  t = 0; data: any = {}; dead = false;
  price = 0; deal = 0; shop = false; pedestal = false; opened = false; noCollect = 0.35; phase = Math.random() * TAU;
  collectT = -1; bounceN = 0;
  constructor(kind: string, x: number, y: number) {
    this.kind = kind; this.x = x; this.y = y;
    if (kind.startsWith('chest')) this.r = 8;
    if (kind === 'item') { this.r = 9; this.pedestal = true; this.noCollect = 0.2; }
  }
  isChest(): boolean { return this.kind.startsWith('chest:'); }
}

export function popPickup(p: Pickup, strength = 1): void {
  const a = Math.random() * TAU;
  const s = (30 + Math.random() * 50) * strength;
  p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.7; p.vz = 110 + Math.random() * 60 * strength; p.z = 2;
}

export function updatePickups(w: World, dt: number): void {
  for (const p of w.pickups) {
    if (p.dead) continue;
    p.t += dt;
    if (p.noCollect > 0) p.noCollect -= dt;
    if (p.collectT >= 0) { p.collectT += dt; if (p.collectT > 0.35) p.dead = true; continue; }
    if (p.pedestal) continue;
    // physics
    if (p.z > 0 || p.vz > 0) {
      p.vz -= 520 * dt; p.z += p.vz * dt;
      if (p.z <= 0) {
        p.z = 0;
        if (p.vz < -60 && p.bounceN < 3) { p.vz = -p.vz * 0.4; p.bounceN++; if (p.bounceN === 1) w.audio.play(p.kind.startsWith('button') ? 'coinDrop' : 'thud', { vol: 0.25, x: p.x }); }
        else p.vz = 0;
      }
    }
    const f = Math.exp(-(p.z > 0 ? 1 : 6) * dt);
    p.vx *= f; p.vy *= f;
    if (Math.abs(p.vx) + Math.abs(p.vy) > 0.5) {
      const h = moveBody(w.room, p, p.vx * dt, p.vy * dt, 'walk');
      if (h.hx) p.vx = -p.vx * 0.5; if (h.hy) p.vy = -p.vy * 0.5;
    }
    // separation from other pickups so drops don't stack
    for (const q of w.pickups) {
      if (q === p || q.dead || q.pedestal) continue;
      const dx = p.x - q.x, dy = p.y - q.y, d2 = dx * dx + dy * dy, rr = p.r + q.r - 2;
      if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2); p.vx += (dx / d) * 40 * dt * 10; p.vy += (dy / d) * 40 * dt * 10; }
    }
  }
  w.pickups = w.pickups.filter((p) => !p.dead);
}

export function renderPickup(w: World, ctx: CanvasRenderingContext2D, p: Pickup, sx: number, sy: number): void {
  const S = pickupSprites();
  const collecting = p.collectT >= 0;
  const k = collecting ? p.collectT / 0.35 : 0;
  const alpha = collecting ? 1 - k : 1;
  const lift = collecting ? k * 14 : 0;
  // spawn squash when landing
  const sq = p.z <= 0 && p.t < 0.5 ? 1 + Math.sin(p.t * 20) * Math.exp(-p.t * 8) * 0.25 : 1;
  if (!p.pedestal) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, sy, p.r * 0.9, 2, 0, 0, TAU); ctx.fill();
  }
  const y = sy - p.z - lift;
  const o = { alpha, sx: 1 / sq, sy: sq };
  switch (p.kind) {
    case 'item': {
      const style = p.data.style ?? 'treasure';
      (S.pedestal[style] ?? S.pedestal.normal).draw(ctx, sx, sy + 2);
      if (p.data.id) {
        const blind = w.blindItems();
        const icon = itemIconCanvas(p.data.id, blind);
        const bob = Math.sin(p.t * 3 + p.phase) * 2;
        const it = getItem(p.data.id), home = it && !blind ? homePool(it) : null;
        if (home) poolAura(w, ctx, home, sx, sy, p.t + p.phase);
        ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(sx, sy - 13, 6, 1.5, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.drawImage(icon, snap(sx - icon.width / 2), snap(sy - 32 + bob));
        w.r.addGlow(sx, sy - 24, 22, home && AURA[home] ? AURA[home]!.glow : (it?.quality ?? 0) >= 3 ? '#ffe090' : '#b0a8ff', home && AURA[home] ? 0.3 : 0.18);
      }
      return;
    }
    case 'button': S.button.draw(ctx, sx, y, o); break;
    case 'button5': S.button5.draw(ctx, sx, y, o); break;
    case 'button10': S.button10.draw(ctx, sx, y, o); break;
    case 'key': S.key.draw(ctx, sx, y, o); break;
    case 'goldKey': S.goldKey.draw(ctx, sx, y, o); break;
    case 'bomb': S.bomb.draw(ctx, sx, y, o); break;
    case 'bomb2': S.bomb.draw(ctx, sx - 3, y, o); S.bomb.draw(ctx, sx + 3, y + 1, o); break;
    case 'goldBomb': S.goldBomb.draw(ctx, sx, y, o); break;
    case 'heart': S.heart.draw(ctx, sx, y, { ...o, sy: sq * (1 + Math.sin(p.t * 6) * 0.05) }); break;
    case 'heartHalf': S.heartHalf.draw(ctx, sx, y, o); break;
    case 'wax': S.wax.draw(ctx, sx, y, o); break;
    case 'waxHalf': S.waxHalf.draw(ctx, sx, y, o); break;
    case 'ink': S.ink.draw(ctx, sx, y, o); break;
    case 'brass': S.brass.draw(ctx, sx, y, o); break;
    case 'gilded': S.gilded.draw(ctx, sx, y, o); break;
    case 'spark': S.spark.draw(ctx, sx, y, o); break;
    case 'sparkBig': S.sparkBig.draw(ctx, sx, y, o); break;
    case 'page': S.page.draw(ctx, sx, y, o); break;
    case 'sweet': S.sweets[(p.data.color ?? 0) % S.sweets.length].draw(ctx, sx, y, o); break;
    case 'charm': {
      const icon = itemIconCanvas(p.data.id, false);
      ctx.globalAlpha = alpha;
      ctx.drawImage(icon, snap(sx - icon.width / 2), snap(y - icon.height));
      ctx.globalAlpha = 1;
      break;
    }
    default:
      if (p.isChest()) { const kind = p.kind.slice(6); const pair = S.chest[kind] ?? S.chest.tin; pair[p.opened ? 1 : 0].draw(ctx, sx, y, o); }
  }
  if (p.shop && p.price > 0) {/* label drawn in UI pass */}
  if (p.kind === 'goldKey' || p.kind === 'button10' || p.kind === 'gilded') if (Math.random() < 0.05) w.fx.stars(p.x + (Math.random() - 0.5) * 8, p.y - 4, 1, '#ffe070', 10);
}

/** Items from the darker and holier pools carry their room with them, wherever they turn up. */
const AURA: Partial<Record<PoolId, { glow: string; mote: string; rise: number; n: number; size: number }>> = {
  deal: { glow: '#ff2030', mote: '#14040a', rise: 22, n: 5, size: 2 },     // ink smoke curling up off it
  curse: { glow: '#a040ff', mote: '#c070ff', rise: 14, n: 3, size: 1 },    // hex sparks
  blessing: { glow: '#fff0b0', mote: '#fffbe8', rise: 18, n: 4, size: 1 },  // drifting light
};
function poolAura(w: World, ctx: CanvasRenderingContext2D, home: PoolId, sx: number, sy: number, t: number): void {
  const a = AURA[home]; if (!a) return;
  ctx.save();
  for (let i = 0; i < a.n; i++) {
    const k = (t * 0.55 + i / a.n) % 1;
    const x = sx + Math.sin(t * 1.7 + i * 2.3) * (4 + k * 5), y = sy - 18 - k * a.rise;
    ctx.globalAlpha = (1 - k) * (home === 'deal' ? 0.75 : 0.85) * Math.min(1, k * 5);
    ctx.fillStyle = home === 'deal' && i % 2 ? '#7a0a14' : a.mote;
    const sz = a.size + (home === 'deal' ? Math.round((1 - k) * 1.5) : 0);
    ctx.fillRect(snap(x - sz / 2), snap(y), sz, sz);
  }
  if (home === 'deal') {
    // a ring of red under the icon, like something watching from the ink
    ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.12; ctx.strokeStyle = '#ff2030'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(sx, sy - 13, 8, 2.2, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();
  void w;
}
