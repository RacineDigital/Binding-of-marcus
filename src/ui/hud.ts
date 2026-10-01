// In-run heads-up display, drawn crisp at display resolution in virtual coordinates.
import { inspectInfo, InspectInfo } from './inspect';
import type { Pickup } from '../game/pickups';
import type { World } from '../game/world';
import { pickupSprites } from '../art/pickups';
import { itemIconCanvas } from '../art/items';
import { getItem, getConsumable } from '../items/registry';
import { describeItem, DescLine } from '../items/describe';
import { text, panel, paperStrip, wrap, COL, FONT_TITLE, FONT_BODY, measure } from './draw';
import { PixelArt } from '../render/pixel';
import { ramp } from '../render/color';
import { MAP_SIZE, VIEW_W, VIEW_H } from '../core/constants';
import type { Enemy } from '../enemies/enemy';
import { ease, fmt1, clamp } from '../core/math';
import { CURSE_NAMES } from '../generation/floorgen';
import { sweetName } from '../game/roomflow';
import { SWEET_EFFECTS } from '../items/data/consumables';

interface Banner { title: string; sub: string; t: number; icon: HTMLCanvasElement | null }

let mapIcons: Record<string, HTMLCanvasElement> | null = null;
function icons(): Record<string, HTMLCanvasElement> {
  if (mapIcons) return mapIcons;
  const mk = (fn: (p: PixelArt) => void) => { const p = new PixelArt(7, 7); fn(p); return p.toCanvas(); };
  mapIcons = {
    treasure: mk((p) => { p.poly([0.5, 5.5, 0.5, 1.5, 2, 3.5, 3.5, 0.5, 5, 3.5, 6.5, 1.5, 6.5, 5.5], '#f0c850'); }),
    boss: mk((p) => { p.ball(3.5, 3, 3, 2.8, ramp('#e8e0d0')); p.set(2, 3, '#1a0a0a'); p.set(4, 3, '#1a0a0a'); p.rect(2, 5, 3, 1, '#e8e0d0'); }),
    shop: mk((p) => { p.ball(3.5, 3.5, 3, 3, ramp('#c89a4a')); p.set(3, 3, '#3a2a1a'); p.set(4, 4, '#3a2a1a'); }),
    secret: mk((p) => { p.rect(2, 1, 3, 1, '#c8c0b0'); p.set(5, 2, '#c8c0b0'); p.set(4, 3, '#c8c0b0'); p.set(3, 4, '#c8c0b0'); p.set(3, 6, '#c8c0b0'); }),
    supersecret: mk((p) => { p.rect(2, 1, 3, 1, '#b0a0ff'); p.set(5, 2, '#b0a0ff'); p.set(4, 3, '#b0a0ff'); p.set(3, 4, '#b0a0ff'); p.set(3, 6, '#b0a0ff'); }),
    challenge: mk((p) => { p.line(0, 0, 6, 6, '#d8d8e0'); p.line(6, 0, 0, 6, '#d8d8e0'); }),
    sacrifice: mk((p) => { p.line(1, 6, 5, 0, '#e0e0e8'); p.set(5, 0, '#c83a4a'); p.rect(1, 5, 5, 1, '#8a2a3a'); }),
    arcade: mk((p) => { p.rect(1, 1, 5, 5, '#e8e0d0'); p.set(2, 2, '#1a1010'); p.set(4, 4, '#1a1010'); p.set(3, 3, '#1a1010'); }),
    cursed: mk((p) => { p.poly([3.5, 0, 6.5, 6.5, 0.5, 6.5], '#8a2a2a'); p.set(3, 3, '#ffb0b0'); p.set(3, 5, '#ffb0b0'); }),
    library: mk((p) => { p.rect(1, 1, 5, 5, '#6a3a2a'); p.rect(2, 2, 3, 3, '#e8dcc0'); }),
    miniboss: mk((p) => { p.line(1, 0, 1, 5, '#e0d0b0'); p.line(3, 0, 3, 6, '#e0d0b0'); p.line(5, 0, 5, 5, '#e0d0b0'); }),
    event: mk((p) => { p.rect(3, 0, 1, 4, '#8ad0c0'); p.set(3, 6, '#8ad0c0'); }),
    deal: mk((p) => { p.ball(3.5, 4, 2.5, 2.6, ramp('#5a50c0')); p.set(3, 0, '#5a50c0'); p.set(3, 1, '#5a50c0'); }),
    blessing: mk((p) => { p.rect(2, 2, 3, 5, '#f0e8d0'); p.set(3, 0, '#ffc050'); p.set(3, 1, '#ffc050'); }),
  };
  return mapIcons;
}

export class Hud {
  w: World;
  banners: Banner[] = [];
  toasts: { text: string; t: number; dur: number }[] = [];
  floorCardT = 0; floorTitle = ''; floorSub = ''; floorCurse: string | null = null;
  roomNameT = 0; roomNameText = '';
  bossIntroT = 0; bossName = ''; bossSub = ''; bossRef: Enemy | null = null;
  bossTrail = 1;
  activeFlash = 0;
  fullMap = false;
  panelFade = 0; panelInfo: InspectInfo | null = null; panelPickup: Pickup | null = null;
  constructor(w: World) { this.w = w; }

  banner(title: string, sub: string, icon: HTMLCanvasElement | null = null): void { this.banners = [{ title, sub, t: 0, icon }]; }
  toast(s: string, dur = 2.4): void { this.toasts.push({ text: s, t: 0, dur }); if (this.toasts.length > 3) this.toasts.shift(); }
  floorCard(title: string, sub: string, curse: string | null): void { this.floorCardT = 3.2; this.floorTitle = title; this.floorSub = sub; this.floorCurse = curse; }
  roomName(s: string): void { this.roomNameT = 2.2; this.roomNameText = s; }
  bossIntro(name: string, sub: string, ref: Enemy): void { this.bossIntroT = 2.3; this.bossName = name; this.bossSub = sub; this.bossRef = ref; this.bossTrail = 1; }
  flashActive(): void { this.activeFlash = 0.6; }

  update(dt: number): void {
    for (const b of this.banners) b.t += dt;
    this.banners = this.banners.filter((b) => b.t < 3);
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);
    this.floorCardT = Math.max(0, this.floorCardT - dt);
    this.roomNameT = Math.max(0, this.roomNameT - dt);
    this.bossIntroT = Math.max(0, this.bossIntroT - dt);
    this.activeFlash = Math.max(0, this.activeFlash - dt);
    const near = this.w.nearInspect;
    const info = near ? inspectInfo(this.w, near) : null;
    if (near && info) { this.panelInfo = info; this.panelPickup = near; this.panelFade = Math.min(1, this.panelFade + dt * 8); }
    else this.panelFade = Math.max(0, this.panelFade - dt * 8);
    const boss = this.w.bossList[0];
    if (boss) { const f = this.bossHpFrac(); this.bossTrail = f < this.bossTrail ? Math.max(f, this.bossTrail - dt * 0.35) : f; }
  }
  bossHpFrac(): number {
    let hp = 0, max = 0;
    for (const b of this.w.bossList) { hp += Math.max(0, b.hp); max += b.maxHp; }
    return max > 0 ? hp / max : 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const w = this.w;
    // screen flashes & vignette
    if (w.redFlash > 0) { ctx.fillStyle = `rgba(160,10,20,${(w.redFlash * 0.28).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (w.whiteFlash > 0) { ctx.fillStyle = `rgba(255,250,240,${(w.whiteFlash * 0.5).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawPriceTags(ctx);
    if (w.deathT >= 0) return;
    this.drawActive(ctx);
    this.drawHearts(ctx);
    this.drawResources(ctx);
    if (w.game.save.data.settings.showStats) this.drawStats(ctx);
    this.drawConsumables(ctx);
    if (w.floor.curse !== 'lost') this.drawMinimap(ctx, this.fullMap);
    if (w.game.save.data.settings.showItems !== false && !this.fullMap) this.drawItemTracker(ctx);
    else text(ctx, CURSE_NAMES.lost, VIEW_W - 8, 14, 7, COL.dim, 'right');
    this.drawBossBar(ctx);
    this.drawItemPanel(ctx);
    this.drawBanners(ctx);
    this.drawToasts(ctx);
    this.drawRoomName(ctx);
    this.drawFloorCard(ctx);
    this.drawBossIntro(ctx);
  }

  private drawActive(ctx: CanvasRenderingContext2D): void {
    const pl = this.w.player;
    if (!pl.active) return;
    const it = getItem(pl.active); if (!it) return;
    const x = 6, y = 6;
    const icon = itemIconCanvas(pl.active);
    const ready = !it.active || pl.charge >= it.active.charge;
    ctx.globalAlpha = ready ? 1 : 0.55;
    ctx.drawImage(icon, x, y);
    ctx.globalAlpha = 1;
    if (this.activeFlash > 0) { ctx.globalAlpha = this.activeFlash; ctx.fillStyle = '#fff4c0'; ctx.fillRect(x - 1, y - 1, 20, 20); ctx.globalAlpha = 1; ctx.drawImage(icon, x, y); }
    // charge bar
    if (it.active) {
      const bx = x + 20, by = y, bh = 18;
      ctx.fillStyle = '#0c0a10'; ctx.fillRect(bx, by, 4, bh);
      const frac = clamp(pl.charge / it.active.charge, 0, 1);
      const fh = Math.round((bh - 2) * frac);
      ctx.fillStyle = frac >= 1 ? (Math.floor(this.w.time * 4) % 2 ? '#f0e070' : '#d8c040') : '#9a9ab0';
      ctx.fillRect(bx + 1, by + bh - 1 - fh, 2, fh);
      if (it.active.type === 'room' && it.active.charge > 1 && it.active.charge <= 12) {
        ctx.fillStyle = '#0c0a10';
        for (let i = 1; i < it.active.charge; i++) ctx.fillRect(bx + 1, by + 1 + Math.round(((bh - 2) * i) / it.active.charge), 2, 0.5);
      }
      ctx.strokeStyle = '#6a6070'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, by, 4, bh);
    }
  }

  private heartsX(): number { return this.w.player.active ? 34 : 8; }

  private drawHearts(ctx: CanvasRenderingContext2D): void {
    const h = this.w.player.health;
    const H = pickupSprites().hud;
    const x0 = this.heartsX(), y0 = 6;
    let i = 0;
    const pos = () => { const col = i % 6, row = Math.floor(i / 6); i++; return [x0 + col * 11, y0 + row * 10]; };
    const containers = h.redMax / 2;
    const firstGilded = containers - h.gilded;
    const low = h.totalHalf() <= 2 && !h.noRed;
    for (let c = 0; c < containers; c++) {
      const [x, y] = pos();
      const fill = Math.max(0, Math.min(2, h.red - c * 2));
      const gild = c >= firstGilded;
      const spr = fill === 2 ? (gild ? H.gilded : H.red) : fill === 1 ? (gild ? H.gildedHalf : H.redHalf) : H.empty;
      const beat = low && fill > 0 ? 1 + Math.max(0, Math.sin(this.w.time * 8)) * 0.12 : 1;
      if (beat !== 1) { ctx.save(); ctx.translate(x + 5.5, y + 5); ctx.scale(beat, beat); ctx.drawImage(spr.canvas, -5.5, -5); ctx.restore(); }
      else ctx.drawImage(spr.canvas, x, y);
    }
    for (const e of h.extra) {
      const [x, y] = pos();
      const spr = e.k === 'wax' ? (e.h === 2 ? H.wax : H.waxHalf) : (e.h === 2 ? H.ink : H.inkHalf);
      ctx.drawImage(spr.canvas, x, y);
    }
    for (let b = 0; b < h.brass; b++) { const [x, y] = pos(); ctx.drawImage(H.brass.canvas, x, y); }
  }

  private drawResources(ctx: CanvasRenderingContext2D): void {
    const pl = this.w.player;
    const H = pickupSprites().hud;
    const rows = Math.ceil((pl.health.redMax / 2 + pl.health.extra.length + pl.health.brass) / 6);
    const y0 = Math.max(30, 8 + Math.max(1, rows) * 10 + 4);
    const x = 6;
    const line = (spr: HTMLCanvasElement, n: number, y: number, special = false) => {
      ctx.drawImage(spr, x, y - 1);
      text(ctx, String(n).padStart(2, '0'), x + 15, y + 8, 9, special ? COL.gold : COL.text);
    };
    line(H.button.canvas, pl.buttons, y0);
    line((pl.goldBomb ? H.goldBomb : H.bomb).canvas, pl.bombs, y0 + 13, pl.goldBomb);
    line((pl.goldKey ? H.goldKey : H.key).canvas, pl.keys, y0 + 26, pl.goldKey);
  }

  private drawStats(ctx: CanvasRenderingContext2D): void {
    const s = this.w.player.stats;
    const y0 = 118;
    const rows: [string, string][] = [
      ['SPD', fmt1(s.speed)], ['DMG', fmt1(Math.round(s.damage * 100) / 100)], ['RATE', fmt1(Math.round(s.fireRate * 100) / 100)],
      ['RNG', String(Math.round(s.range / 24 * 10) / 10)], ['SHOT', fmt1(Math.round(s.shotSpeed * 100) / 100)], ['LUCK', String(s.luck)],
    ];
    ctx.globalAlpha = 0.8;
    rows.forEach(([k, v], i) => {
      text(ctx, k, 6, y0 + i * 9, 6, COL.dim, 'left', FONT_BODY, 600);
      text(ctx, v, 26, y0 + i * 9, 7, COL.text, 'left');
    });
    ctx.globalAlpha = 1;
  }

  /** Collected passive items and familiars as a compact icon grid under the minimap. */
  private itemSeenAt = new Map<string, number>();
  private drawItemTracker(ctx: CanvasRenderingContext2D): void {
    const pl = this.w.player, ids = pl.itemOrder.filter((id) => (pl.items.get(id) ?? 0) > 0 && getItem(id)?.kind !== 'active');
    if (!ids.length) return;
    const now = this.w.time;
    for (const id of ids) if (!this.itemSeenAt.has(id)) this.itemSeenAt.set(id, now);
    // bottom-right corner, growing upward from above the consumables; stays clear of the side doors
    const right = VIEW_W - 8, bottom = VIEW_H - 34, maxH = 76, width = 84;
    let cell = 14;
    while (cell > 8 && Math.ceil(ids.length / Math.floor(width / cell)) * cell > maxH) cell -= 1;
    const cols = Math.min(ids.length, Math.floor(width / cell));
    const rows = Math.ceil(ids.length / cols);
    const top = bottom - rows * cell;
    const blind = this.w.blindItems();
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,12,0.4)'; ctx.fillRect(right - cols * cell - 2, top - 2, cols * cell + 4, rows * cell + 4);
    ctx.imageSmoothingEnabled = false;
    ids.forEach((id, i) => {
      const x = right - cols * cell + (i % cols) * cell, y = top + Math.floor(i / cols) * cell;
      const age = now - (this.itemSeenAt.get(id) ?? -9);
      if (age < 1.5) { ctx.globalAlpha = (1 - age / 1.5) * 0.8; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x, y, cell, cell); ctx.globalAlpha = 1; }
      const icon = itemIconCanvas(id, blind);
      const pad = cell >= 12 ? 1 : 0.5;
      ctx.drawImage(icon, x + pad, y + pad, cell - pad * 2, cell - pad * 2);
      const n = pl.items.get(id) ?? 1;
      if (n > 1) text(ctx, 'x' + n, x + cell - 0.5, y + cell - 0.5, 5, COL.text, 'right', FONT_BODY, 700);
    });
    ctx.restore();
  }

  private drawConsumables(ctx: CanvasRenderingContext2D): void {
    const pl = this.w.player;
    const S = pickupSprites();
    pl.consumables.forEach((c, i) => {
      const x = VIEW_W - 22 - i * 20, y = VIEW_H - 22;
      const spr = c.kind === 'page' ? S.page : S.sweets[Number(c.id) % S.sweets.length];
      spr.draw(ctx, x + 8, y + 15);
      if (i === 0) {
        const name = c.kind === 'page' ? (getConsumable(c.id)?.name ?? 'Page') : sweetName(this.w, Number(c.id));
        text(ctx, name, x - 4, y + 12, 7, COL.text, 'right');
        text(ctx, this.w.input.bindingLabel('consumable'), x - 4, y + 3, 5.5, COL.dim, 'right');
      }
    });
    pl.charms.forEach((id, i) => { ctx.drawImage(itemIconCanvas(id), 6 + i * 20, VIEW_H - 24); });
  }

  drawMinimap(ctx: CanvasRenderingContext2D, full: boolean): void {
    const w = this.w, f = w.floor;
    const cw = full ? 14 : 9, ch = full ? 10 : 7, gap = 1;
    // bounds of known rooms
    let minx = 99, miny = 99, maxx = -1, maxy = -1;
    for (const r of f.rooms) {
      if (!(r.seen || r.visited) || !r.discovered && (r.type === 'secret' || r.type === 'supersecret')) continue;
      minx = Math.min(minx, r.gx); miny = Math.min(miny, r.gy); maxx = Math.max(maxx, r.gx + r.cw - 1); maxy = Math.max(maxy, r.gy + r.ch - 1);
    }
    if (maxx < 0) return;
    const mw = (maxx - minx + 1) * (cw + gap), mh = (maxy - miny + 1) * (ch + gap);
    let ox: number, oy: number;
    if (full) { ox = VIEW_W / 2 - mw / 2; oy = VIEW_H / 2 - mh / 2; panel(ctx, ox - 8, oy - 8, mw + 16, mh + 16, 0.95); }
    else {
      // centre on the current room within a fixed window
      const winW = 72, winH = 52;
      const cur = w.room;
      ox = VIEW_W - 8 - winW / 2 - (cur.gx - minx + cur.cw / 2) * (cw + gap);
      oy = 8 + winH / 2 - (cur.gy - miny + cur.ch / 2) * (ch + gap);
      ctx.save();
      ctx.fillStyle = 'rgba(8,6,12,0.55)'; ctx.fillRect(VIEW_W - 8 - winW, 6, winW, winH);
      ctx.strokeStyle = 'rgba(160,140,120,0.35)'; ctx.lineWidth = 0.5; ctx.strokeRect(VIEW_W - 8 - winW, 6, winW, winH);
      ctx.beginPath(); ctx.rect(VIEW_W - 8 - winW, 6, winW, winH); ctx.clip();
    }
    const IC = icons();
    for (const r of f.rooms) {
      const secret = r.type === 'secret' || r.type === 'supersecret';
      if (!(r.seen || r.visited)) continue;
      if (secret && !r.discovered) continue;
      const x = ox + (r.gx - minx) * (cw + gap), y = oy + (r.gy - miny) * (ch + gap);
      const W = r.cw * (cw + gap) - gap, Hh = r.ch * (ch + gap) - gap;
      const current = r === w.room;
      ctx.fillStyle = current ? '#f4ecdc' : r.visited ? '#8a8090' : '#3e3844';
      ctx.fillRect(x, y, W, Hh);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y + Hh - 0.6, W, 0.6);
      const ic = IC[r.type];
      if (ic && !current) ctx.drawImage(ic, x + W / 2 - 3.5, y + Hh / 2 - 3.5);
    }
    if (!full) ctx.restore();
    // curse label
    if (f.curse && !full) text(ctx, CURSE_NAMES[f.curse] ?? '', VIEW_W - 8, 68, 5.5, '#c090ff', 'right');
    void MAP_SIZE;
  }

  private drawBossBar(ctx: CanvasRenderingContext2D): void {
    const w = this.w;
    if (!w.bossList.length || w.bossList.every((b) => b.dead) || this.bossIntroT > 1.4) return;
    if (w.room.type !== 'boss' && w.room.type !== 'miniboss') return;
    const f = this.bossHpFrac();
    const bw = 160, bx = VIEW_W / 2 - bw / 2, by = VIEW_H - 16;
    const alpha = clamp((w.roomTime - 1.2) * 3, 0, 1);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#0a060a'; ctx.fillRect(bx - 2, by - 2, bw + 4, 8);
    ctx.fillStyle = '#5a1a20'; ctx.fillRect(bx, by, bw * this.bossTrail, 4);
    ctx.fillStyle = '#c8283a'; ctx.fillRect(bx, by, bw * f, 4);
    ctx.fillStyle = 'rgba(255,200,200,0.35)'; ctx.fillRect(bx, by, bw * f, 1);
    ctx.strokeStyle = '#8a7560'; ctx.lineWidth = 0.6; ctx.strokeRect(bx - 2, by - 2, bw + 4, 8);
    text(ctx, w.room.type === 'boss' && this.bossName ? this.bossName : w.bossList[0].def.name, VIEW_W / 2, by - 4, 8, COL.text, 'center', FONT_TITLE, 400);
    ctx.restore();
  }

  private drawItemPanel(ctx: CanvasRenderingContext2D): void {
    if (this.panelFade <= 0 || !this.panelInfo) return;
    const info = this.panelInfo, p = this.panelPickup;
    const W = 236, pad = 8, bodyW = W - pad * 2;
    // wrap effect lines at a comfortable reading size
    const body: { t: string; c: string }[] = [];
    for (const l of info.lines) {
      const col = l.color === 'up' ? COL.up : l.color === 'down' ? COL.down : l.color === 'note' ? COL.note : COL.text;
      for (const s of wrap(ctx, l.text, 8.5, bodyW)) body.push({ t: s, c: col });
    }
    // footer: price / cost / how to take it
    let foot = '', footCol = COL.dim, footIcon: CanvasImageSource | null = null;
    if (p && p.price > 0) {
      const have = this.w.player.buttons, ok = have >= p.price;
      foot = ok ? `${p.price}   —   walk into it to buy` : `${p.price}   —   you have ${have}`;
      footCol = ok ? COL.gold : COL.down; footIcon = pickupSprites().hud.button.canvas;
    } else if (p && p.deal > 0) {
      foot = `Costs ${p.deal} heart container${p.deal > 1 ? 's' : ''}`; footCol = COL.down; footIcon = pickupSprites().hud.red.canvas;
    } else if (p?.data.locked) { foot = 'Win the challenge to claim it'; }
    else foot = 'Walk into it to take it';
    const titleH = 28, lineH = 10.5;
    const H = titleH + 4 + body.length * lineH + 18;
    // keep clear of the item and Marcus: bottom of the screen unless the item is low, then the top
    const sy = p ? p.y - this.w.renderCamY : 0;
    const a = ease.outCubic(this.panelFade);
    const x = Math.round(VIEW_W / 2 - W / 2);
    const y = Math.round((sy > VIEW_H * 0.6 ? 34 : VIEW_H - H - 8) + (1 - a) * 6);
    const gold = info.quality >= 3;
    ctx.save(); ctx.globalAlpha = a;
    // card
    ctx.fillStyle = 'rgba(8,6,12,0.96)'; ctx.fillRect(x, y, W, H);
    ctx.fillStyle = gold ? 'rgba(240,200,96,0.08)' : 'rgba(255,255,255,0.03)'; ctx.fillRect(x, y, W, titleH);
    ctx.strokeStyle = gold ? '#e0b860' : '#8a7560'; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, W - 1, H - 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(x + 2.5, y + 2.5, W - 5, H - 5);
    // icon
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x + 5, y + 4, 20, 20);
    if (info.icon) {
      const iw = (info.icon as HTMLCanvasElement).width || 16, ih = (info.icon as HTMLCanvasElement).height || 16;
      const k = Math.min(18 / iw, 18 / ih, 1.5);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(info.icon, x + 15 - (iw * k) / 2, y + 14 - (ih * k) / 2, iw * k, ih * k);
    }
    text(ctx, info.title.toUpperCase(), x + 31, y + 14, 12, gold ? COL.gold : COL.text, 'left', FONT_TITLE, 400);
    text(ctx, info.subtitle, x + 31, y + 24, 7.5, COL.dim, 'left', FONT_BODY, 500, false);
    if (info.quality >= 0) for (let i = 0; i < 4; i++) { ctx.fillStyle = i < info.quality ? '#f0c860' : 'rgba(255,255,255,0.18)'; ctx.fillRect(x + W - 10 - i * 5, y + 6, 3, 3); }
    // divider + body
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + pad, y + titleH + 1, W - pad * 2, 0.6);
    body.forEach((l, i) => text(ctx, l.t, x + pad, y + titleH + 12 + i * lineH, 8.5, l.c, 'left', FONT_BODY, 600, false));
    // footer
    const fy = y + H - 6;
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x + pad, fy - 10, W - pad * 2, 0.6);
    text(ctx, info.kindLabel, x + pad, fy, 6.5, COL.dim, 'left', FONT_BODY, 600, false);
    const fw = measure(ctx, foot, 7.5);
    text(ctx, foot, x + W - pad, fy, 7.5, footCol, 'right', FONT_BODY, 600, false);
    if (footIcon) ctx.drawImage(footIcon, x + W - pad - fw - 11, fy - 7.5, 8, 8);
    ctx.restore();
  }

  private drawPriceTags(ctx: CanvasRenderingContext2D): void {
    const w = this.w;
    for (const p of w.pickups) {
      if (p.dead) continue;
      const sx = p.x - w.renderCamX, sy = p.y - w.renderCamY;
      if (p.price > 0) {
        const afford = w.player.buttons >= p.price;
        const label = String(p.price), tw = measure(ctx, label, 8.5) + 14;
        ctx.fillStyle = 'rgba(8,6,12,0.82)'; ctx.fillRect(Math.round(sx - tw / 2), sy + 4, tw, 11);
        ctx.drawImage(pickupSprites().hud.button.canvas, sx - tw / 2 + 2, sy + 5.5, 8, 8);
        text(ctx, label, sx + tw / 2 - 3, sy + 12.5, 8.5, afford ? COL.gold : COL.down, 'right', FONT_BODY, 700);
      } else if (p.deal > 0 && p.data.id) {
        for (let i = 0; i < p.deal; i++) ctx.drawImage(pickupSprites().hud.red.canvas, sx - (p.deal * 12) / 2 + i * 12, sy + 4);
      }
      if (p.data.locked && p.pedestal) text(ctx, 'PROVE YOURSELF', sx, sy + 12, 6, COL.dim, 'center');
    }
  }

  private drawBanners(ctx: CanvasRenderingContext2D): void {
    for (const b of this.banners) {
      const a = b.t < 0.25 ? ease.outBack(b.t / 0.25) : b.t > 2.5 ? 1 - (b.t - 2.5) / 0.5 : 1;
      const alpha = clamp(a, 0, 1);
      const tw = Math.max(measure(ctx, b.title, 14, FONT_TITLE, 400), measure(ctx, b.sub, 8)) + (b.icon ? 34 : 24);
      const x = VIEW_W / 2 - tw / 2, y = 30;
      ctx.save();
      ctx.translate(VIEW_W / 2, y + 16); ctx.scale(1, 0.6 + 0.4 * a); ctx.translate(-VIEW_W / 2, -(y + 16));
      paperStrip(ctx, x, y, tw, 32, alpha, b.title.length);
      ctx.globalAlpha = alpha;
      const tx = b.icon ? x + 26 : x + 12;
      if (b.icon) ctx.drawImage(b.icon, x + 6, y + 7);
      text(ctx, b.title, tx, y + 16, 14, '#2a1a14', 'left', FONT_TITLE, 400, false);
      text(ctx, b.sub, tx, y + 26, 8, '#5a4636', 'left', FONT_BODY, 600, false);
      ctx.restore();
    }
  }
  private drawToasts(ctx: CanvasRenderingContext2D): void {
    this.toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 5, (t.dur - t.t) * 3);
      ctx.globalAlpha = clamp(a, 0, 1);
      const lines = wrap(ctx, t.text, 8, 300);
      lines.forEach((l, j) => text(ctx, l, VIEW_W / 2, VIEW_H - 40 - (this.toasts.length - 1 - i) * 12 - (lines.length - 1 - j) * 10, 8, COL.text, 'center'));
      ctx.globalAlpha = 1;
    });
  }
  private drawRoomName(ctx: CanvasRenderingContext2D): void {
    if (this.roomNameT <= 0) return;
    const a = Math.min(1, this.roomNameT * 2, (2.2 - this.roomNameT) * 4);
    ctx.globalAlpha = clamp(a, 0, 1);
    text(ctx, this.roomNameText, VIEW_W / 2, this.banners.length ? 82 : 58, 12, '#e8dcc8', 'center', FONT_TITLE, 400);
    ctx.globalAlpha = 1;
  }
  private drawFloorCard(ctx: CanvasRenderingContext2D): void {
    if (this.floorCardT <= 0) return;
    const t = 3.2 - this.floorCardT;
    const a = clamp(Math.min(t * 2.5, this.floorCardT * 1.6), 0, 1);
    ctx.save();
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#050307'; ctx.fillRect(0, VIEW_H / 2 - 30, VIEW_W, 60);
    ctx.globalAlpha = a;
    const [chapter, name] = this.floorTitle.split(' — ');
    text(ctx, chapter ?? '', VIEW_W / 2, VIEW_H / 2 - 12, 8, COL.dim, 'center', FONT_BODY, 600);
    text(ctx, name ?? this.floorTitle, VIEW_W / 2, VIEW_H / 2 + 8, 22, '#efe2c8', 'center', FONT_TITLE, 400);
    text(ctx, this.floorSub, VIEW_W / 2, VIEW_H / 2 + 20, 7, COL.dim, 'center', FONT_BODY, 400);
    if (this.floorCurse) text(ctx, CURSE_NAMES[this.floorCurse] ?? '', VIEW_W / 2, VIEW_H / 2 + 36, 8, '#c090ff', 'center', FONT_TITLE, 400);
    ctx.restore();
  }
  private drawBossIntro(ctx: CanvasRenderingContext2D): void {
    if (this.bossIntroT <= 0) return;
    const t = 2.3 - this.bossIntroT;
    const a = clamp(Math.min(t * 4, this.bossIntroT * 3), 0, 1);
    const slide = ease.outCubic(clamp(t * 2.5, 0, 1));
    ctx.save();
    ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#0a0406';
    ctx.beginPath(); ctx.moveTo(0, VIEW_H / 2 - 34); ctx.lineTo(VIEW_W, VIEW_H / 2 - 44); ctx.lineTo(VIEW_W, VIEW_H / 2 + 30); ctx.lineTo(0, VIEW_H / 2 + 40); ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#8a1a24'; ctx.fillRect(0, VIEW_H / 2 + 34 - 6, VIEW_W * slide, 1.5);
    text(ctx, this.bossName.toUpperCase(), VIEW_W / 2 - 60 + slide * 60, VIEW_H / 2 + 6, 26, '#f0e0cc', 'center', FONT_TITLE, 400);
    text(ctx, this.bossSub, VIEW_W / 2 + 60 - slide * 60, VIEW_H / 2 + 22, 8, '#c8a898', 'center', FONT_BODY, 600);
    ctx.restore();
  }
}
void SWEET_EFFECTS;
