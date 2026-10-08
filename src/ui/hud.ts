// In-run heads-up display, drawn crisp at display resolution in virtual coordinates.
import { inspectInfo, InspectInfo } from './inspect';
import type { Pickup } from '../game/pickups';
import type { World } from '../game/world';
import { pickupSprites } from '../art/pickups';
import { TRANSFORM_EFFECTS } from '../player/player';
import { LASER_TIERS, overcharge } from '../projectiles/weapons';
import { itemIconCanvas } from '../art/items';
import { getItem, getConsumable } from '../items/registry';
import { describeItem, DescLine } from '../items/describe';
import { text, panel, paperStrip, wrap, COL, FONT_TITLE, FONT_BODY, measure, setTextScale, textScale } from './draw';
import { PixelArt } from '../render/pixel';
import { ramp } from '../render/color';
import { MAP_SIZE, VIEW_W, VIEW_H } from '../core/constants';
import type { Enemy } from '../enemies/enemy';
import { ease, fmt1, clamp, dist2 } from '../core/math';
import { CURSE_NAMES } from '../generation/floorgen';
import { sweetName, dealCost, dealCostText } from '../game/roomflow';
import { SWEET_EFFECTS } from '../items/data/consumables';
import { drawHitboxes } from '../game/worldrender';
import { ticketFor, doorOdds } from '../game/bargain';
import { diceFace } from '../items/data/dice';
import { bindLabel, fmtKeys, ACTION_ORDER } from '../core/input';
import { restockCost, donationLabel, shopStock } from '../game/npc';
import { charById } from '../player/characters';
import { mapIcon } from '../art/roomicons';
import { letterHunt, isWantedHalf, LETTER_HALVES } from '../game/letter';
import { sweetColor } from '../items/sweetcolor';
import { STING_HIT, StingKind } from '../audio/bossting';
import { FLAWLESS_TARGET } from '../game/bindings';
import { bindingSeal } from './bindingart';
import { itemRole, ROLE_COLOR, ROLE_LABEL } from '../items/choice';
import { inkState, inkCap, brimming, METER_MAX, INKLINGS } from '../game/inklings';
import { INK } from '../game/inkflag';
import { inklingIcon } from '../art/inklings';

/** How long a boss title card holds the screen. */
const BOSS_CARD = 2.9;

/** The Blot's heart: pop in, beat, fly to the hearts (seconds). */
const GIFT_POP = 0.45, GIFT_HOLD = 1.7, GIFT_FLY_END = 2.3;
/** How close you must stand to a pinned note to keep reading it (world px). */
const NOTE_READ_RANGE = 34;

interface Banner { title: string; sub: string; t: number; icon: HTMLCanvasElement | null; note?: string; kicker?: string; dismissible?: boolean }

/** 8x8 stat icons drawn from character maps (palette letters below). */
const STAT_ICON_MAPS: Record<string, string[]> = {
  speed: [   // a yellow running shoe with motion lines
    '.........',
    '...yyy...',
    '...yYy...',
    'w..yYy...',
    '.w.yyyyy.',
    'w..yyyyyy',
    '.w.yyyyyy',
    '...wwwwww',
    '.........'],
  damage: [  // a red-hilted sword
    '.......ss',
    '......sSs',
    '.....sSs.',
    '....sSs..',
    '.R.sSs...',
    '..RSs....',
    '..bRR....',
    '.b.......',
    'b........'],
  rate: [    // blue tear drops, one after another
    '...k.....',
    '..kk.....',
    '..kKk..k.',
    '.kKKk.kk.',
    '.kKKkkKkk',
    '.kKKk.kk.',
    '..kk.....',
    '.........',
    '.........'],
  range: [   // a double-headed arrow over a ruler
    '.........',
    '.o.....o.',
    'oo.....oo',
    'ooooooooo',
    'oo.....oo',
    '.o.....o.',
    '.........',
    'ttttttttt',
    't.t.t.t.t'],
  shot: [    // a shot flying fast, with speed streaks
    '.........',
    '......cc.',
    'cccc.cCCc',
    '.....cCCc',
    'cccc.cCCc',
    '......cc.',
    '.........',
    '.........',
    '.........'],
  size: [    // a small shot growing into a big one
    '.........',
    '....mmm..',
    '...mMMMm.',
    '.m.mMMMMm',
    'mMmmMMMMm',
    '.m.mMMMMm',
    '...mMMMm.',
    '....mmm..',
    '.........'],
  luck: [    // a four-leaf clover
    '.ll...ll.',
    'lLLl.lLLl',
    'lLLLlLLLl',
    '.lLLlLLl.',
    '..llGll..',
    '.lLLlLLl.',
    'lLLLlLLLl',
    'lLLl.lLLl',
    '.ll.G.ll.'],
  laser: [   // a red ray with a white-hot core
    '.........',
    '.......xx',
    '.....xxXx',
    '...xxXXx.',
    '.xxXXxx..',
    'xXXxx....',
    'xxx......',
    '.........',
    '.........'],
  wing: [    // a white wing, for flight
    '......ww.',
    '....wwWw.',
    '..wwWWWw.',
    '.wWWWWWw.',
    'wWWWWWw..',
    '.wWWWw...',
    '..wWw.u..',
    '...w.uu..',
    '....uuu..'],
  door: [    // arched door, half ink, half wax
    '..dddd..',
    '.dpppPd.',
    'dpppPPPd',
    'dpppPPPd',
    'dpp.PPPd',
    'dpppPPPd',
    'dpppPPPd',
    'dddddddd'],
};
/** What each stat icon stands for, spelled out. */
const STAT_NAMES: Record<string, string> = { speed: 'Speed', damage: 'Damage', rate: 'Fire rate', range: 'Range', shot: 'Shot speed', size: 'Shot size', luck: 'Luck', door: 'Bargain door', wing: 'Flight' };
const STAT_ICON_PAL: Record<string, string> = {
  y: '#e8b830', Y: '#ffe890', w: '#e8e4f4', b: '#7a4a2a', R: '#e0283a', s: '#c8ccd8', S: '#ffffff',
  k: '#3a7ae8', K: '#a8d0ff', o: '#f08a30', t: '#c8a868', c: '#40d0e0', C: '#d8fcff', l: '#3a9a3a', L: '#7ae06a', G: '#2a5a20',
  m: '#4a4ab8', M: '#9a9aff', x: '#ff4a5a', X: '#fff0e0', d: '#8a7560', p: '#3a2e7a', P: '#efe6d2', W: '#ffffff', u: '#8ab8e8',
};
/** The Dust Jacket in the heart row: a little blue book cover with its flap folded round. */
let jacketCanvas: HTMLCanvasElement | null = null;
function jacketIcon(): HTMLCanvasElement {
  if (jacketCanvas) return jacketCanvas;
  const p = new PixelArt(11, 10);
  for (let y = 1; y <= 9; y++) for (let x = 1; x <= 9; x++) p.set(x, y, y <= 2 ? '#8ab0d8' : x >= 8 ? '#2a4a7a' : '#4a72a8');
  for (let y = 1; y <= 9; y++) p.set(0, y, '#1a2a4a');
  for (let y = 2; y <= 8; y++) p.set(8, y, '#e8dcc0');
  p.rect(3, 4, 3, 1, '#c8a04a'); p.rect(3, 6, 3, 1, '#c8a04a');
  p.outline('#0a1020');
  jacketCanvas = p.toCanvas();
  return jacketCanvas;
}
let statIcons: Record<string, HTMLCanvasElement> | null = null;
function statIcon(k: string): HTMLCanvasElement {
  if (!statIcons) {
    statIcons = {};
    for (const [name, rows] of Object.entries(STAT_ICON_MAPS)) {
      const p = new PixelArt(9, 9);
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (STAT_ICON_PAL[ch]) p.set(x, y, STAT_ICON_PAL[ch]); }));
      statIcons[name] = p.toCanvas();
    }
  }
  return statIcons[k];
}

export class Hud {
  w: World;
  banners: Banner[] = [];
  toasts: { text: string; t: number; dur: number }[] = [];
  floorCardT = 0; floorTitle = ''; floorSub = ''; floorCurse: string | null = null;
  roomNameT = 0; roomNameText = '';
  bossIntroT = 0; bossName = ''; bossSub = ''; bossRef: Enemy | null = null;
  bossKind: StingKind = 'chapter'; bossChapter = ''; private bossSlammed = false;
  bossTrail = 1;
  activeFlash = 0;
  fullMap = false;
  panelFade = 0; panelInfo: InspectInfo | null = null; panelPickup: Pickup | null = null;
  /** A note being read: a page held up at the bottom of the screen for a while. */
  /** A note or letter on screen. `at` pins it to a spot in the room: it can only be read standing there. */
  note: { title: string; text: string; by: string; t: number; dur: number; at?: { x: number; y: number } } | null = null;
  constructor(w: World) { this.w = w; }
  /** A transformation: its name, big, in the middle of the screen. */
  tcard: { name: string; desc: string; t: number } | null = null;
  transformCard(name: string, desc: string): void { this.tcard = { name, desc, t: 0 }; }
  /** The Blot's heart: pops up mid-screen, beats, then flies to your hearts and becomes a red container. */
  gift: { t: number; landed: boolean } | null = null;
  giftHeart(): void { this.gift = { t: 0, landed: false }; this.w.audio.play('chime', { pitch: 0.8 }); this.w.audio.play('heal', { vol: 0.6 }); }
  showNote(title: string, body: string, by: string, at?: { x: number; y: number }): void {
    // touching a pinned note you're already reading just keeps it open
    if (at && this.note?.at && this.note.title === title) { this.note.at = at; return; }
    this.note = { title, text: body, by, t: 0, dur: at ? 1e9 : 3.5 + body.length * 0.03, at };
  }
  /** Is this pinned note the one on screen? */
  readingNote(title: string): boolean { return !!this.note?.at && this.note.title === title && this.note.dur > this.note.t + 0.3; }

  /** Speedrun-style run clock under the map. */
  /** A first-run hint, centred at the top of the screen; it ticks green for a moment once done. */
  /** On the hospital path: a two-line checklist for the halves of Grandfather's letter, and where each one is. */
  private drawLetterHunt(ctx: CanvasRenderingContext2D): void {
    const w = this.w, h = letterHunt(w);
    if (!h) return;
    let y = 64 + (w.floor.curse ? 8 : 0) + (w.game.save.data.settings.timer ? 12 : 0);
    const rows: [boolean, string, string][] = [
      [h.top, 'Top half', 'Lost & Found, after the boss'],
      [h.bottom, 'Bottom half', 'Deep Crawlspace, on the map'],
    ];
    const lines = rows.map(([got, name, where]) => got ? `\u2713 ${name}: found` : `\u2022 ${name}: ${where}`);
    const wd = Math.max(measure(ctx, 'Grandfather\'s letter', 6, FONT_BODY, 700), ...lines.map((s) => measure(ctx, s, 5.5))) + 6;
    ctx.save();
    text(ctx, 'Grandfather\'s letter', VIEW_W - 11, y + 7, 6, '#ffe08c', 'right', FONT_BODY, 700);
    lines.forEach((s, i) => text(ctx, s, VIEW_W - 11, y + 16 + i * 9, 5.5, rows[i][0] ? COL.up : COL.text, 'right'));
    ctx.restore();
  }

  private drawTimer(ctx: CanvasRenderingContext2D): void {
    const t = this.w.run.stats.time;
    const m = Math.floor(t / 60), s = t % 60;
    const str = `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
    text(ctx, str, VIEW_W - 8, 71, 7, this.w.run.won ? '#ffd060' : '#e8e0d0', 'right');
  }
  banner(title: string, sub: string, icon: HTMLCanvasElement | null = null, note?: string, kicker?: string, dismissible = false): void { this.banners = [{ title, sub, t: 0, icon, note, kicker, dismissible }]; }
  /** A boss's name struck through in ink: the chapter's keeper is done. */
  bossDown(name: string): void { this.dcard = { name, t: 0 }; }
  dcard: { name: string; t: number } | null = null;
  toast(s: string, dur = 2.4): void { this.toasts.push({ text: s, t: 0, dur }); if (this.toasts.length > 3) this.toasts.shift(); }
  floorCardAlarm = false;
  floorCard(title: string, sub: string, curse: string | null, alarm = false): void { this.floorCardT = 3.2; this.floorTitle = title; this.floorSub = sub; this.floorCurse = curse; this.floorCardAlarm = alarm; }
  roomName(s: string): void { this.roomNameT = 2.2; this.roomNameText = s; }
  /** The boss title card, choreographed to the boss's own sting (the name slams on its hit). */
  bossIntro(name: string, sub: string, ref: Enemy, kind: StingKind = 'chapter', id = name): void {
    this.bossIntroT = BOSS_CARD; this.bossName = name; this.bossSub = sub; this.bossRef = ref; this.bossTrail = 1;
    this.bossKind = kind; this.bossSlammed = false;
    const th = this.w.floor?.theme;
    this.bossChapter = kind === 'echo' ? 'Where you fell' : kind === 'final' ? (th?.chapter || 'The End') + ' · ' + (th?.name ?? '') : [th?.chapter, th?.name].filter(Boolean).join(' · ');
    this.w.audio.bossSting(id, kind);
  }
  flashActive(): void { this.activeFlash = 0.6; }

  update(dt: number): void {
    for (const b of this.banners) b.t += dt;
    if (this.banners.some((b) => b.dismissible && b.t > 0.35 && ACTION_ORDER.some((action) => this.w.input.wasPressed(action)))) this.banners = this.banners.filter((b) => !b.dismissible);
    this.banners = this.banners.filter((b) => b.t < (b.dismissible ? 8 : b.note ? 4 : 3));
    if (this.dcard && (this.dcard.t += dt) > 2.6) this.dcard = null;
    if (this.note && (this.note.t += dt) > this.note.dur) this.note = null;
    // a pinned note stays open while you stand by it, and fades the moment you walk away
    if (this.note?.at && this.note.dur > 1e8) {
      const pl = this.w.player, far = Math.hypot(pl.x - this.note.at.x, pl.y - this.note.at.y) > NOTE_READ_RANGE;
      if (far) this.note.dur = this.note.t + 0.35;
    }
    if (this.tcard && (this.tcard.t += dt) > 3) this.tcard = null;
    if (this.gift) {
      const g = this.gift; g.t += dt;
      if (!g.landed && g.t >= GIFT_FLY_END) {
        g.landed = true;
        if (this.w.player.health.growRedContainer()) { this.w.audio.play('waxHeart', { pitch: 0.7 }); this.toast('A red heart grows in the ink: +1 heart container', 2.4); }
      }
      if (g.t > GIFT_FLY_END + 0.6) this.gift = null;
    }
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.dur);
    this.floorCardT = Math.max(0, this.floorCardT - dt);
    this.roomNameT = Math.max(0, this.roomNameT - dt);
    this.bossIntroT = Math.max(0, this.bossIntroT - dt);
    this.activeFlash = Math.max(0, this.activeFlash - dt);
    this.trackStats(dt);
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
    setTextScale(this.w.game.save.data.settings.hudScale || 1);
    try { this.renderHud(ctx); } finally { setTextScale(1); }
  }
  private renderHud(ctx: CanvasRenderingContext2D): void {
    const w = this.w;
    // screen flashes & vignette (softened, and never more than a glow, with Reduce flashing on)
    const flashK = w.game.save.data.settings.reduceFlash ? 0.25 : 1;
    if (w.redFlash > 0) {
      // hurt: the edges of the screen flush red; the middle, where the fight is, stays clear
      const rg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.32, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.6);
      rg.addColorStop(0, 'rgba(160,10,20,0)'); rg.addColorStop(1, `rgba(170,12,24,${Math.min(0.75 * flashK, w.redFlash * 0.9 * flashK).toFixed(3)})`);
      ctx.fillStyle = rg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (w.whiteFlash > 0) { ctx.fillStyle = `rgba(255,250,240,${Math.min(0.5 * flashK, w.whiteFlash * 0.5 * flashK).toFixed(3)})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (w.showHitboxes) drawHitboxes(w, ctx);
    this.drawPriceTags(ctx);
    if (w.deathT >= 0) return;
    this.drawActive(ctx);
    this.drawHearts(ctx);
    this.drawResources(ctx);
    this.drawInk(ctx);
    if (!this.fullMap) this.drawRunIdentity(ctx);
    const eid = w.game.save.data.settings.descStyle !== 'card';
    if (w.game.save.data.settings.showStats && !(eid && this.panelFade > 0.05)) this.drawStats(ctx);
    this.drawConsumables(ctx);
    if (w.floor.curse === 'lost') { if (!this.fullMap) text(ctx, CURSE_NAMES.lost, VIEW_W - 8, 14, 7, COL.dim, 'right'); }
    else if (!this.fullMap) this.drawMinimap(ctx, false);
    if (!this.fullMap) this.drawLetterHunt(ctx);
    if (w.game.save.data.settings.showItems !== false && !this.fullMap) this.drawItemTracker(ctx);
    if (w.game.save.data.settings.timer && !this.fullMap) this.drawTimer(ctx);
    this.drawBossBar(ctx);
    if (eid) this.drawEID(ctx); else this.drawItemPanel(ctx);
    this.drawBanners(ctx);
    this.drawTransformCard(ctx);
    this.drawBossDown(ctx);
    this.drawGift(ctx);
    this.drawNote(ctx);
    this.drawToasts(ctx);
    this.drawRoomName(ctx);
    this.drawFloorCard(ctx);
    this.drawBossIntro(ctx);
    if (this.fullMap) this.drawTabScreen(ctx);
  }

  /**
   * Held map key: kept simple on purpose. Where you are (chapter, floor, curse), what you carry as a
   * grid of icons, and the map, zoomed in to fill the rest of the screen.
   */
  private drawTabScreen(ctx: CanvasRenderingContext2D): void {
    const w = this.w, pl = w.player, f = w.floor, th = f.theme;
    ctx.save();
    ctx.fillStyle = 'rgba(6,4,10,0.9)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // where you are
    const where = [th?.chapter, th?.name].filter(Boolean).join('  ·  ');
    text(ctx, where || 'The Cellar', VIEW_W / 2, 20, 12, COL.text, 'center', FONT_TITLE, 400);
    const sub = [`Floor ${w.run.floorIndex + 1}`, f.curse ? CURSE_NAMES[f.curse] ?? '' : ''].filter(Boolean).join('  ·  ');
    text(ctx, sub, VIEW_W / 2, 31, 7, f.curse ? '#c090ff' : COL.dim, 'center', FONT_BODY, 600);
    // your items: the active first, then everything you've picked up, then charms
    const X = 12, Y = 46, colW = 150;
    const ids = [...(pl.active ? [pl.active] : []), ...pl.itemOrder.filter((id) => (pl.items.get(id) ?? 0) > 0 && id !== pl.active), ...pl.charms];
    text(ctx, `YOUR ITEMS  ·  ${ids.length}`, X, Y - 4, 6.5, COL.dim, 'left', FONT_BODY, 700);
    if (!ids.length) text(ctx, 'Nothing yet.', X, Y + 10, 7, COL.dim, 'left');
    let cell = 18;
    while (cell > 10 && Math.ceil(ids.length / Math.floor(colW / cell)) * cell > VIEW_H - Y - 10) cell -= 1;
    const per = Math.floor(colW / cell);
    ctx.imageSmoothingEnabled = false;
    ids.forEach((id, i) => {
      const x = X + (i % per) * cell, y = Y + Math.floor(i / per) * cell;
      ctx.fillStyle = id === pl.active ? 'rgba(255,220,120,0.14)' : 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, cell - 2, cell - 2);
      ctx.drawImage(itemIconCanvas(id), x, y, cell - 2, cell - 2);
      const n = pl.items.get(id) ?? 1;
      if (n > 1) text(ctx, `x${n}`, x + cell - 2, y + cell - 3, 5.5, COL.gold, 'right', FONT_BODY, 700);
    });
    // the map, as big as it fits
    if (f.curse !== 'lost') this.drawMinimap(ctx, true, { x: X + colW + 16, y: 42, w: VIEW_W - (X + colW + 16) - 12, h: VIEW_H - 52 });
    else text(ctx, CURSE_NAMES.lost, VIEW_W * 0.66, VIEW_H / 2, 9, COL.dim, 'center');
    ctx.restore();
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

  private drawGift(ctx: CanvasRenderingContext2D): void {
    const g = this.gift; if (!g) return;
    const S = pickupSprites().hud.red.canvas, t = g.t;
    // where the new container will sit
    const h = this.w.player.health, n = h.redMax / 2 + (g.landed ? -1 : 0);
    const tx = this.heartsX() + (n % 6) * 11 + 5.5, ty = 6 + Math.floor(n / 6) * 10 + 5;
    const cx = VIEW_W / 2, cy = VIEW_H / 2 - 18;
    let x = cx, y = cy, sc: number, glow = 1;
    if (t < GIFT_POP) sc = 7 * ease.outBack(t / GIFT_POP);
    else if (t < GIFT_HOLD) { const beat = Math.max(0, Math.sin((t - GIFT_POP) * 9)); sc = 7 * (1 + beat * 0.12); }
    else if (t < GIFT_FLY_END) { const k = ease.inOutCubic((t - GIFT_HOLD) / (GIFT_FLY_END - GIFT_HOLD)); x = cx + (tx - cx) * k; y = cy + (ty - cy) * k - Math.sin(k * Math.PI) * 30; sc = 7 + (1 - 7) * k; glow = 1 - k * 0.6; }
    else { x = tx; y = ty; sc = 1 + Math.max(0, 0.6 - (t - GIFT_FLY_END)) ; glow = Math.max(0, 0.6 - (t - GIFT_FLY_END)); }
    ctx.save();
    if (t < GIFT_FLY_END) {
      // a soft red bloom and rays behind it while it beats
      ctx.globalAlpha = 0.35 * glow; ctx.fillStyle = '#ff2040';
      ctx.beginPath(); ctx.arc(x, y, 6 * sc, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.25 * glow; ctx.strokeStyle = '#ff8090'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + t * 1.5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 4 * sc, y + Math.sin(a) * 4 * sc); ctx.lineTo(x + Math.cos(a) * 7.5 * sc, y + Math.sin(a) * 7.5 * sc); ctx.stroke(); }
      if (t > GIFT_POP && t < GIFT_HOLD) { ctx.globalAlpha = Math.min(1, (t - GIFT_POP) * 4) * Math.min(1, (GIFT_HOLD - t) * 4); text(ctx, 'A heart grows in the ink', cx, cy + 50, 10, '#ffd0d8', 'center', FONT_TITLE, 400); }
    } else if (glow > 0) { ctx.globalAlpha = glow; ctx.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.fillRect(x + Math.cos(a) * (4 + (1 - glow) * 12), y + Math.sin(a) * (4 + (1 - glow) * 12), 1, 1); } }
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(S, x - (S.width / 2) * sc, y - (S.height / 2) * sc, S.width * sc, S.height * sc);
    ctx.restore();
  }
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
    // the Dust Jacket sits at the end of your hearts: bright while it will take this room's first hit,
    // faded once it has
    if (this.w.player.count('dust_jacket') > 0) {
      const [x, y] = pos(), ready = !!this.w.run.flags.jacket;
      ctx.globalAlpha = ready ? 1 : 0.3; ctx.drawImage(jacketIcon(), x, y); ctx.globalAlpha = 1;
      if (ready && Math.floor(this.w.time * 1.5) % 4 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2, y + 1, 1, 7); }
    }
  }

  private drawResources(ctx: CanvasRenderingContext2D): void {
    const pl = this.w.player;
    const H = pickupSprites().hud;
    const rows = Math.ceil((pl.health.redMax / 2 + pl.health.extra.length + (pl.count('dust_jacket') > 0 ? 1 : 0)) / 6);
    const y0 = Math.max(30, 8 + Math.max(1, rows) * 10 + 4);
    const x = 6;
    this.inkY = y0 + 40;
    const line = (spr: HTMLCanvasElement, n: number, y: number, special = false) => {
      ctx.drawImage(spr, x, y - 1);
      text(ctx, String(n).padStart(2, '0'), x + 15, y + 8, 9, special ? COL.gold : COL.text);
    };
    line(H.button.canvas, pl.buttons, y0);
    line(H.bomb.canvas, pl.bombs, y0 + 13);
    line((pl.goldKey ? H.goldKey : H.key).canvas, pl.keys, y0 + 26, pl.goldKey);
  }

  private inkY = 47;
  /** Where the margins end this frame (0 when hidden), so the stats start below them. */
  private inkBottom = 0;
  /**
   * The margins: an ink meter, then a blot per margin with the essence written in it and its level.
   * Hidden until the first Inkling is seen, so a new player meets it when it first matters.
   */
  private drawInk(ctx: CanvasRenderingContext2D): void {
    const w = this.w, s = inkState(w), cap = inkCap(w);
    this.inkBottom = 0;
    if (!INK.on) return;
    if (!s.slots.length && s.meter <= 0 && !(w.game.save.data.inkSeen ?? []).length) return;
    const y = this.inkY, x0 = 5, full = brimming(w), SW = 17;
    const wide = cap * SW + 1;
    this.inkBottom = y + 22;
    for (let i = 0; i < cap; i++) {
      const sx = x0 + 1 + i * SW, sl = s.slots[i];
      if (!sl) { ctx.strokeStyle = 'rgba(150,140,190,0.35)'; ctx.lineWidth = 0.5; ctx.strokeRect(sx + 1.5, y + 0.5, 13, 13); continue; }
      ctx.drawImage(inklingIcon(sl.id, 14), sx + 1, y);
      // its level, as one to three ink strokes under it
      for (let l = 0; l < 3; l++) { ctx.fillStyle = l < sl.lv ? INKLINGS[sl.id].color : 'rgba(120,110,150,0.35)'; ctx.fillRect(sx + 2 + l * 4.4, y + 15, 3.4, 1.6); }
    }
    // the meter: a line of ink along the bottom, pulsing when it brims
    const k = Math.min(1, s.meter / METER_MAX);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0 + 1, y + 18.5, wide - 2, 2);
    ctx.fillStyle = full ? `rgba(210,200,255,${(0.75 + Math.sin(w.time * 8) * 0.25).toFixed(2)})` : '#6a5ad0';
    ctx.fillRect(x0 + 1, y + 18.5, Math.round((wide - 2) * k), 2);
    if (full) text(ctx, 'The ink brims: your next kill leaves an Inkling', x0 + wide + 5, y + 12, 6.5, '#d0c8ff');
  }

  private drawRunIdentity(ctx: CanvasRenderingContext2D): void {
    const w = this.w;
    const offers = w.pickups.filter((p) => p.pedestal && p.data.id && p.data.group !== undefined && !p.dead);
    if (w.room.type === 'treasure' && offers.length > 1) {
      text(ctx, 'CHOOSE ONE CURIO', VIEW_W / 2, 52, 8, '#ecd9a7', 'center');
      text(ctx, 'The other returns to the book.', VIEW_W / 2, 62, 7, '#b7cac4', 'center');
    }
  }

  /** Stat values as shown, keyed by icon. */
  private statRows(): [string, string, number][] {
    const s = this.w.player.stats;
    const r2 = (v: number) => Math.round(v * 100) / 100;
    return [
      ['speed', fmt1(s.speed), s.speed], ['damage', fmt1(r2(s.damage)), r2(s.damage)], ['rate', fmt1(r2(s.fireRate)), r2(s.fireRate)],
      ['range', String(Math.round(s.range / 24 * 10) / 10), Math.round(s.range / 24 * 10) / 10], ['shot', fmt1(r2(s.shotSpeed)), r2(s.shotSpeed)], ['size', fmt1(r2(s.size)), r2(s.size)], ['luck', String(s.luck), s.luck],
    ];
  }
  /** Recent stat changes, shown as +0.5 / -0.2 beside the value for a couple of seconds (like Isaac). */
  private statPrev = new Map<string, number>();
  private statDelta = new Map<string, { d: number; t: number }>();
  private doorPrev = -1; private doorFlash = 0; private doorDrop = 0;
  private trackStats(dt: number): void {
    for (const [k, , v] of this.statRows()) {
      const prev = this.statPrev.get(k);
      if (prev !== undefined && Math.abs(v - prev) > 0.001) this.statDelta.set(k, { d: v - prev, t: 2.2 });
      this.statPrev.set(k, v);
    }
    for (const [k, e] of this.statDelta) { e.t -= dt; if (e.t <= 0) this.statDelta.delete(k); }
    // bargain door odds: flash when a hit knocks them down
    const odds = doorOdds(this.w).total;
    if (this.doorPrev >= 0 && odds < this.doorPrev - 0.001 && this.w.run.floorIndex > 0) { this.doorFlash = 1.6; this.doorDrop = odds - this.doorPrev; }
    this.doorPrev = odds;
    this.doorFlash = Math.max(0, this.doorFlash - dt);
    this.trackFlight(dt);
    this.trackLasers(dt);
  }

  private drawStats(ctx: CanvasRenderingContext2D): void {
    const y0 = Math.max(112, this.inkBottom + 12), x = 6;
    const rows = this.statRows();
    rows.forEach(([k, v], i) => {
      const y = y0 + i * 10;
      ctx.globalAlpha = 0.9; ctx.drawImage(statIcon(k), x, y - 7); ctx.globalAlpha = 1;
      text(ctx, v, x + 11, y, 7, COL.text, 'left');
      const dl = this.statDelta.get(k);
      if (dl) {
        ctx.globalAlpha = Math.min(1, dl.t * 2);
        text(ctx, `${dl.d > 0 ? '+' : ''}${k === 'luck' ? Math.round(dl.d) : fmt1(Math.round(dl.d * 100) / 100)} ${STAT_NAMES[k].toLowerCase()}`, x + 13 + measure(ctx, v, 7), y, 6.5, dl.d > 0 ? COL.up : COL.down, 'left', FONT_BODY, 700);
        ctx.globalAlpha = 1;
      }
    });
    // bargain door chance, Isaac-style: drops when you get hit
    const odds = doorOdds(this.w);
    const y = y0 + rows.length * 10 + 2;
    const ch1 = this.w.run.floorIndex === 0;
    ctx.globalAlpha = ch1 ? 0.45 : 0.9; ctx.drawImage(statIcon('door'), x, y - 7); ctx.globalAlpha = 1;
    const f = this.doorFlash;
    const col = f > 0 && Math.floor(f * 8) % 2 === 0 ? COL.down : ch1 ? COL.dim : odds.total >= 0.5 ? COL.gold : COL.text;
    const label = `${Math.round(odds.total * 100)}%`;
    text(ctx, label, x + 11, y, 7, col, 'left');
    if (f > 0) { ctx.globalAlpha = Math.min(1, f * 2); text(ctx, `${Math.round(this.doorDrop * 100)}%`, x + 13 + measure(ctx, label, 7), y, 6.5, COL.down, 'left', FONT_BODY, 700); ctx.globalAlpha = 1; }
    // flight gets its own line, so you always know your feet are off the floor
    if (this.w.player.flight) {
      const fy = y + 11, glow = this.flyFlash > 0 && Math.floor(this.flyFlash * 8) % 2 === 0;
      ctx.drawImage(statIcon('wing'), x, fy - 7 + Math.round(Math.sin(this.w.time * 4) * 0.8));
      text(ctx, 'Flying', x + 11, fy, 7, glow ? '#ffffff' : '#a8d0ff', 'left');
    }
    // the laser family: how many you hold and what tier that overcharges them to
    const L = this.w.player.prof.lasers;
    if (L > 0) {
      const ly = y + (this.w.player.flight ? 22 : 11), tier = LASER_TIERS[overcharge(this.w.player.prof)];
      const glow = this.laserFlash > 0 && Math.floor(this.laserFlash * 8) % 2 === 0;
      ctx.drawImage(statIcon('laser'), x, ly - 7);
      const label = `Lasers \u00d7${L}`;
      text(ctx, label, x + 11, ly, 7, glow ? '#ffffff' : '#ff9a8a', 'left');
      if (tier.name) text(ctx, tier.name, x + 14 + measure(ctx, label, 7), ly, 6.5, tier.color ?? COL.text, 'left', FONT_BODY, 700);
    }
  }
  private flyFlash = 0; private flyPrev = false;
  private laserFlash = 0; private laserPrev = -1;
  /** A new laser item is announced with what it does to the rest: more of them, hotter tier. */
  private trackLasers(dt: number): void {
    const prof = this.w.player.prof, L = prof.lasers;
    if (this.laserPrev >= 0 && L > this.laserPrev && this.w.time > 1) {
      this.laserFlash = 2;
      const t = LASER_TIERS[overcharge(prof)];
      this.toast(L >= 2 ? `Lasers \u00d7${L}: ${t.name}! ${t.perk[0].toUpperCase()}${t.perk.slice(1)}.` : 'A laser item. Every other one you find will overcharge it.', 3);
    }
    this.laserPrev = L; this.laserFlash = Math.max(0, this.laserFlash - dt);
  }
  /** Getting flight is announced, so it never goes unnoticed. */
  private trackFlight(dt: number): void {
    const fl = this.w.player.flight;
    if (fl && !this.flyPrev && this.w.time > 1) { this.flyFlash = 2; this.toast('Your feet leave the floor: you can fly!', 2); }
    this.flyPrev = fl; this.flyFlash = Math.max(0, this.flyFlash - dt);
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
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ids.forEach((id, i) => {
      const x = right - cols * cell + (i % cols) * cell, y = top + Math.floor(i / cols) * cell;
      const age = now - (this.itemSeenAt.get(id) ?? -9);
      if (age < 1.5) { ctx.globalAlpha = (1 - age / 1.5) * 0.8; ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x, y, cell, cell); ctx.globalAlpha = 1; }
      const icon = itemIconCanvas(id);
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
      const spr = c.kind === 'page' ? S.page : S.sweets[sweetColor(c.id) % S.sweets.length];
      spr.draw(ctx, x + 8, y + 15);
      if (i === 0) {
        // name and key sit left of the whole row so they never overlap a second pocket item
        const lx = VIEW_W - 22 - (pl.consumables.length - 1) * 20 - 4;
        const name = c.kind === 'page' ? (getConsumable(c.id)?.name ?? 'Page') : sweetName(this.w, Number(c.id));
        text(ctx, name, lx, y + 12, 7, COL.text, 'right');
      }
    });
    pl.charms.forEach((id, i) => { ctx.drawImage(itemIconCanvas(id), 6 + i * 20, VIEW_H - 24); });
  }

  drawMinimap(ctx: CanvasRenderingContext2D, full: boolean, box?: { x: number; y: number; w: number; h: number }): void {
    const w = this.w, f = w.floor;
    let cw = full ? 15 : 10, ch = full ? 11 : 8, k = 1;
    const gap = 1;
    // bounds of known rooms
    let minx = 99, miny = 99, maxx = -1, maxy = -1;
    for (const r of f.rooms) {
      if (!(r.seen || r.visited) || !r.discovered && (r.type === 'secret' || r.type === 'supersecret')) continue;
      minx = Math.min(minx, r.gx); miny = Math.min(miny, r.gy); maxx = Math.max(maxx, r.gx + r.cw - 1); maxy = Math.max(maxy, r.gy + r.ch - 1);
    }
    if (maxx < 0) return;
    // zoomed to fill the box it's given (up to 2.5x), so a small floor reads big
    if (box) {
      k = Math.min(2.5, (box.w - 16) / ((maxx - minx + 1) * (cw + gap)), (box.h - 16) / ((maxy - miny + 1) * (ch + gap)));
      cw *= k; ch *= k;
    }
    const mw = (maxx - minx + 1) * (cw + gap), mh = (maxy - miny + 1) * (ch + gap);
    let ox: number, oy: number;
    if (box) { ox = box.x + box.w / 2 - mw / 2; oy = box.y + box.h / 2 - mh / 2; panel(ctx, ox - 8, oy - 8, mw + 16, mh + 16, 0.95); }
    else if (full) { ox = Math.max(216, Math.min(VIEW_W - 14 - mw, VIEW_W * 0.71 - mw / 2)); oy = VIEW_H / 2 - mh / 2; panel(ctx, ox - 8, oy - 8, mw + 16, mh + 16, 0.95); }
    else {
      // centre on the current room within a fixed window
      const winW = 72, winH = 52;
      const cur = w.room;
      ox = VIEW_W - 8 - winW / 2 - (cur.gx - minx + cur.cw / 2) * (cw + gap);
      oy = 8 + winH / 2 - (cur.gy - miny + cur.ch / 2) * (ch + gap);
      ctx.save();
      ctx.beginPath(); ctx.rect(VIEW_W - 8 - winW, 6, winW, winH); ctx.clip();
    }
    // icons are painted at the screen's real pixel size, so they are as sharp as the text
    const dens = ctx.getTransform().a || 1, isz = full ? Math.min(18, Math.round(9 * Math.max(1, k * 0.8))) : 7;
    for (const r of f.rooms) {
      const secret = r.type === 'secret' || r.type === 'supersecret';
      if (!(r.seen || r.visited)) continue;
      if (secret && !r.discovered) continue;
      const x = ox + (r.gx - minx) * (cw + gap), y = oy + (r.gy - miny) * (ch + gap);
      const W = r.cw * (cw + gap) - gap, Hh = r.ch * (ch + gap) - gap;
      const current = r === w.room;
      // a bevelled tile: lit top-left edge, shaded bottom-right
      const base = current ? '#f4ecdc' : r.visited ? '#8a8090' : '#3e3844';
      ctx.fillStyle = base; ctx.fillRect(x, y, W, Hh);
      ctx.fillStyle = current ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)'; ctx.fillRect(x, y, W, 0.5); ctx.fillRect(x, y, 0.5, Hh);
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x, y + Hh - 0.6, W, 0.6); ctx.fillRect(x + W - 0.5, y, 0.5, Hh);
      if (current) {
        ctx.strokeStyle = `rgba(255,236,170,${0.55 + 0.35 * Math.sin(w.time * 5)})`; ctx.lineWidth = 0.6;
        ctx.strokeRect(x - 0.6, y - 0.6, W + 1.2, Hh + 1.2);
      }
      const ic = mapIcon(r.type, Math.round(isz * dens));
      // half of Grandfather's letter is in here: show it, not the room's usual icon
      const half = LETTER_HALVES.find((id) => (current ? w.pickups.some((p) => !p.dead && isWantedHalf(w, p.kind, p.data.id) && p.data.id === id) : r.pickups.some((p) => isWantedHalf(w, p.kind, p.data?.id) && p.data?.id === id)));
      if (half) {
        const s = isz * (1.15 + 0.12 * Math.sin(w.time * 5));
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.strokeStyle = `rgba(255,224,140,${0.6 + 0.4 * Math.sin(w.time * 5)})`; ctx.lineWidth = 0.8; ctx.strokeRect(x - 0.8, y - 0.8, W + 1.6, Hh + 1.6);
        ctx.drawImage(itemIconCanvas(half), x + W / 2 - s / 2, y + Hh / 2 - s / 2, s, s);
        ctx.restore();
      } else if (ic) { ctx.globalAlpha = current ? 0.85 : 1; ctx.drawImage(ic, x + W / 2 - isz / 2, y + Hh / 2 - isz / 2, isz, isz); ctx.globalAlpha = 1; }
    }
    if (!full) ctx.restore();
    // curse label
    if (f.curse && !full) text(ctx, CURSE_NAMES[f.curse] ?? '', VIEW_W - 8, 68, 5.5, '#c090ff', 'right');
    void MAP_SIZE;
  }

  private drawBossBar(ctx: CanvasRenderingContext2D): void {
    const w = this.w;
    if (!w.bossList.length || w.bossList.every((b) => b.dead) || this.bossIntroT > 0.35) return;
    if (w.room.type !== 'boss' && w.room.type !== 'miniboss' && w.room.type !== 'echo') return;
    const f = this.bossHpFrac();
    const bw = 160, bx = VIEW_W / 2 - bw / 2, by = VIEW_H - 16;
    const alpha = clamp((w.roomTime - 1.2) * 3, 0, 1);
    ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#0a060a'; ctx.fillRect(bx - 2, by - 2, bw + 4, 8);
    ctx.fillStyle = '#5a1a20'; ctx.fillRect(bx, by, bw * this.bossTrail, 4);
    // gold while it's spent and open: the bar itself says 'now'
    const open = w.bossList.some((b) => !b.dead && b.data.exposed);
    ctx.fillStyle = open ? (Math.sin(w.time * 16) > -0.3 ? '#f0c040' : '#c89020') : '#c8283a'; ctx.fillRect(bx, by, bw * f, 4);
    ctx.fillStyle = 'rgba(255,200,200,0.35)'; ctx.fillRect(bx, by, bw * f, 1);
    ctx.strokeStyle = '#8a7560'; ctx.lineWidth = 0.6; ctx.strokeRect(bx - 2, by - 2, bw + 4, 8);
    text(ctx, (w.room.type === 'boss' || w.room.type === 'echo') && this.bossName ? this.bossName : w.bossList[0].def.name, VIEW_W / 2, by - 4, 8, COL.text, 'center', FONT_TITLE, 400);
    ctx.restore();
  }

  /** Compact, External-Item-Descriptions-style readout in the top-left corner. */
  private drawEID(ctx: CanvasRenderingContext2D): void {
    if (this.panelFade <= 0 || !this.panelInfo) return;
    const info = this.panelInfo, p = this.panelPickup, w = this.w;
    const x = 8, y0 = 74, maxW = 190;
    const a = this.panelFade;
    type L = { t: string; c: string; size: number; bullet?: string; bc?: string };
    const lines: L[] = [];
    const qCol = ['#a8a8a8', '#efe6d6', '#8ae07a', '#7ab8ff', '#ffd060'][Math.max(0, info.quality)] ?? COL.text;
    if (info.kindLabel) lines.push({ t: info.kindLabel, c: COL.dim, size: 6 });
    if (info.pool) lines.push({ t: info.pool.item, c: info.pool.color, size: 7, bullet: info.pool.mark, bc: info.pool.color });
    for (const l of info.lines) {
      const [bullet, bc, c] = l.color === 'up' ? ['↑', '#7ae070', '#c8f0c0'] : l.color === 'down' ? ['↓', '#ff6a5a', '#ffc8c0'] : l.color === 'note' ? ['‣', '#b8a8ff', '#d8d0ff'] : ['•', '#c8b8a0', COL.text];
      wrap(ctx, l.text, 7.5, maxW - 10).forEach((s, i) => lines.push({ t: s, c, size: 7.5, bullet: i === 0 ? bullet : '', bc }));
    }
    // transformation progress, like EID's transformation hints
    for (const tag of info.tags ?? []) {
      const T = TRANSFORM_EFFECTS[tag]; if (!T) continue;
      const have = Math.min(3, w.player.tagCount(tag)), done = w.player.transformations.has(tag);
      // a pedestal you're looking at counts as the next piece
      const owned = !!info.itemId && w.player.items.has(info.itemId);
      const next = done || owned ? have : Math.min(3, have + 1);
      const pips = '◆'.repeat(have) + (next > have ? '◈' : '') + '◇'.repeat(3 - next);
      lines.push({ t: done ? `${T.name}  ◆◆◆  complete` : next >= 3 && next > have ? `${T.name}  ${pips}  this completes it!` : `${T.name}  ${pips}  ${have}/3${next > have ? ` (${next}/3 with this)` : ''}`, c: '#d0a8ff', size: 7, bullet: '✦', bc: '#b080ff' });
    }
    if (info.itemId && !w.game.save.data.itemsSeen.includes(info.itemId)) lines.push({ t: 'New to your collection!', c: COL.gold, size: 7, bullet: '★', bc: COL.gold });
    if (p && p.price > 0) lines.push({ t: `Costs ${p.price} buttons${w.player.buttons < p.price ? ` (you have ${w.player.buttons})` : ''}`, c: w.player.buttons >= p.price ? COL.gold : COL.down, size: 7, bullet: '¢', bc: COL.gold });
    if (p && p.data.swap && p.data.id) { const t = ticketFor(w, p); lines.push(t ? { t: `Leave behind: ${getItem(t)?.name ?? t}`, c: '#ffd8a0', size: 7, bullet: '⇄', bc: '#e0a860' } : { t: 'Free: you have nothing to leave', c: COL.up, size: 7, bullet: '⇄', bc: '#e0a860' }); }
    if (p && p.data.group !== undefined) lines.push({ t: 'Choose one. The other offer disappears.', c: COL.gold, size: 7, bullet: '◇', bc: COL.gold });
    if (p && p.deal > 0) { const dc = dealCost(w, p); lines.push({ t: `Costs ${dealCostText(dc)}${dc.ok ? '' : ' (not enough)'}`, c: COL.down, size: 7, bullet: '♥', bc: COL.down }); }
    const k = textScale();
    let h = 11 * k; for (const l of lines) h += l.size * k + 2.5;
    ctx.save(); ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 3, y0 - 3, maxW + 6, h + 4);
    if (info.icon) { const iw = (info.icon as HTMLCanvasElement).width || 16; const k = Math.min(1, 12 / iw); ctx.drawImage(info.icon, x, y0, iw * k, ((info.icon as HTMLCanvasElement).height || 16) * k); }
    text(ctx, info.title, x + 16, y0 + 9, 9, qCol, 'left', FONT_BODY, 700);
    if (info.quality >= 0) text(ctx, `Q${info.quality}`, x + 16 + measure(ctx, info.title, 9, FONT_BODY, 700) + 4, y0 + 9, 6.5, qCol, 'left', FONT_BODY, 600);
    let y = y0 + 11 * k;
    for (const l of lines) {
      y += l.size * k + 2.5;
      if (l.bullet) text(ctx, l.bullet, x + 1, y - 0.5, l.size, l.bc ?? COL.text, 'left', FONT_BODY, 700);
      text(ctx, l.t, x + 9, y - 0.5, l.size, l.c, 'left', FONT_BODY, 600);
    }
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
      const dc = dealCost(this.w, p), S = pickupSprites().hud;
      foot = `Costs ${dealCostText(dc)}`; footCol = COL.down; footIcon = (dc.red ? S.red : dc.extra[0] === 'ink' ? S.ink : S.wax).canvas;
    } else if (p?.data.swap) {
      const t = ticketFor(this.w, p);
      foot = t ? `Leave ${getItem(t)?.name ?? t} in exchange` : 'Free (you have nothing to leave)'; footCol = '#ffd8a0'; footIcon = t ? itemIconCanvas(t) : null;
    } else if (p?.data.locked) { foot = 'Win the challenge to claim it'; }
    else foot = p?.data.group !== undefined ? 'Choose one · the other offer disappears' : 'Walk into it to take it';
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
    // where it's from: a coloured tag under the quality pips (an Inkwell item reads as one at a glance)
    if (info.pool) {
      const pl = info.pool, lbl = `${pl.mark} ${pl.item.toUpperCase()}`, tw = measure(ctx, lbl, 6.5, FONT_BODY, 700) + 6;
      ctx.fillStyle = pl.dark ? 'rgba(40,0,10,0.9)' : 'rgba(255,255,255,0.06)'; ctx.fillRect(x + W - 6 - tw, y + 12, tw, 10);
      ctx.strokeStyle = pl.color; ctx.globalAlpha = a * 0.7; ctx.strokeRect(x + W - 6 - tw + 0.5, y + 12.5, tw - 1, 9); ctx.globalAlpha = a;
      text(ctx, lbl, x + W - 9, y + 19.5, 6.5, pl.color, 'right', FONT_BODY, 700, false);
    }
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
    // the shop's machines say what they do once you walk up: the restock price, the donation progress
    for (const n of w.npcs) {
      if ((n.kind !== 'restock' && n.kind !== 'donation') || dist2(n.x, n.y, w.player.x, w.player.y) > 50 * 50) continue;
      if (n.kind === 'restock' && !shopStock(w).length) continue;
      const sx = n.x - w.renderCamX, sy = n.y - w.renderCamY - 40;
      const cost = n.kind === 'restock' ? restockCost(w) : 1;
      const label = n.kind === 'restock' ? `Restock ${cost}` : donationLabel(w), tw = measure(ctx, label, 7.5) + 16;
      ctx.fillStyle = 'rgba(8,6,12,0.82)'; ctx.fillRect(Math.round(sx - tw / 2), sy, tw, 11);
      if (n.kind === 'donation') {
        // a bar filling toward the next shop level
        const d = w.game.save.data.donated ?? 0, full = d >= 50 * 5 ? 1 : (d % 50) / 50;
        ctx.fillStyle = 'rgba(232,192,96,0.3)'; ctx.fillRect(Math.round(sx - tw / 2), sy, tw * full, 11);
      }
      ctx.drawImage(pickupSprites().hud.button.canvas, sx + tw / 2 - 11, sy + 1.5, 8, 8);
      text(ctx, label, sx - tw / 2 + 4, sy + 8.5, 7.5, w.player.buttons >= cost ? COL.gold : COL.down, 'left', FONT_BODY, 700);
    }
    for (const p of w.pickups) {
      if (p.dead) continue;
      const sx = p.x - w.renderCamX, sy = p.y - w.renderCamY;
      if (p.pedestal && p.data.id && p.data.group !== undefined && !w.blindItems()) {
        const it = getItem(p.data.id);
        if (it) {
          const role = itemRole(it);
          text(ctx, ROLE_LABEL[role], sx, sy + 15, 6.5, ROLE_COLOR[role], 'center');
        }
      }
      if (p.price > 0) {
        const afford = w.player.buttons >= p.price;
        const label = String(p.price), tw = measure(ctx, label, 8.5) + 14;
        ctx.fillStyle = 'rgba(8,6,12,0.82)'; ctx.fillRect(Math.round(sx - tw / 2), sy + 4, tw, 11);
        ctx.drawImage(pickupSprites().hud.button.canvas, sx - tw / 2 + 2, sy + 5.5, 8, 8);
        text(ctx, label, sx + tw / 2 - 3, sy + 12.5, 8.5, afford ? COL.gold : COL.down, 'right', FONT_BODY, 700);
      } else if (p.deal > 0 && p.data.id) {
        // the hearts it would really take: red containers, or your last wax/ink hearts once red runs out
        const dc = dealCost(w, p), S = pickupSprites().hud;
        const icons = dc.red ? Array(dc.red).fill(S.red) : dc.extra.map((k) => (k === 'ink' ? S.ink : S.wax));
        if (!dc.ok) ctx.globalAlpha = 0.45;
        icons.forEach((s, i) => ctx.drawImage(s.canvas, sx - (icons.length * 12) / 2 + i * 12, sy + 4));
        ctx.globalAlpha = 1;
      }
      if (p.data.swap && p.data.id) {
        // claim ticket: the item you'd leave behind
        const t = ticketFor(w, p);
        ctx.fillStyle = 'rgba(8,6,12,0.82)'; ctx.fillRect(Math.round(sx - 15), sy + 4, 30, 13);
        if (t) { text(ctx, '⇄', sx - 7, sy + 13.5, 8, '#e0a860', 'center', FONT_BODY, 700); ctx.drawImage(itemIconCanvas(t), sx + 1, sy + 4.5, 12, 12); }
        else text(ctx, 'FREE', sx, sy + 13, 7, COL.up, 'center', FONT_BODY, 700);
      }
      if (p.data.locked && p.pedestal) text(ctx, 'PROVE YOURSELF', sx, sy + 12, 6, COL.dim, 'center');
    }
  }

  private drawBanners(ctx: CanvasRenderingContext2D): void {
    for (const b of this.banners) {
      const end = b.note ? 3.5 : 2.5;
      const a = b.t < 0.25 ? ease.outBack(b.t / 0.25) : b.t > end ? 1 - (b.t - end) / 0.5 : 1;
      const alpha = clamp(a, 0, 1);
      const tw = Math.max(measure(ctx, b.title, 14, FONT_TITLE, 400), measure(ctx, b.sub, 8), b.note ? measure(ctx, b.note, 7) : 0) + (b.icon ? 34 : 24);
      const H = b.dismissible ? 51 : b.note ? 41 : 32, x = VIEW_W / 2 - tw / 2, y = 30;
      ctx.save();
      ctx.translate(VIEW_W / 2, y + 16); ctx.scale(1, 0.6 + 0.4 * a); ctx.translate(-VIEW_W / 2, -(y + 16));
      paperStrip(ctx, x, y, tw, H, alpha, b.title.length);
      ctx.globalAlpha = alpha;
      if (b.kicker) {
        // a rare find: a gilt edge and a small capital line above the strip
        ctx.strokeStyle = 'rgba(214,168,64,0.9)'; ctx.lineWidth = 1; ctx.strokeRect(x + 1.5, y + 1.5, tw - 3, H - 3);
        text(ctx, b.kicker, VIEW_W / 2, y - 3, 6.5, '#f0c860', 'center', FONT_BODY, 700);
      }
      const tx = b.icon ? x + 26 : x + 12;
      if (b.icon) ctx.drawImage(b.icon, x + 6, y + 7);
      text(ctx, b.title, tx, y + 16, 14, '#2a1a14', 'left', FONT_TITLE, 400, false);
      text(ctx, b.sub, tx, y + 26, 8, '#5a4636', 'left', FONT_BODY, 600, false);
      if (b.note) text(ctx, '✦ ' + b.note, tx, y + 36, 7, '#5a2a7a', 'left', FONT_BODY, 700, false);
      if (b.dismissible) text(ctx, 'PRESS ANY GAME CONTROL TO CLOSE', x + tw - 7, y + 46, 5.5, '#7a6a58', 'right', FONT_BODY, 600, false);
      ctx.restore();
    }
  }
  private drawBossDown(ctx: CanvasRenderingContext2D): void {
    const c = this.dcard; if (!c) return;
    const a = clamp(Math.min(c.t * 5, (2.6 - c.t) * 2.5), 0, 1), cy = 104;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 0, VIEW_W, 0);
    g.addColorStop(0, 'rgba(10,6,8,0)'); g.addColorStop(0.5, 'rgba(10,6,8,0.7)'); g.addColorStop(1, 'rgba(10,6,8,0)');
    ctx.fillStyle = g; ctx.fillRect(0, cy - 26, VIEW_W, 44);
    text(ctx, 'CLOSED', VIEW_W / 2, cy - 14, 7, '#c8a878', 'center', FONT_BODY, 700);
    text(ctx, c.name, VIEW_W / 2, cy + 4, 18, '#efe2c8', 'center', FONT_TITLE, 400);
    // the strike: a wet ink line drawn across the name, quickly, a beat after it appears
    const w = measure(ctx, c.name, 18, FONT_TITLE, 400) + 16, k = ease.outCubic(clamp((c.t - 0.35) / 0.3, 0, 1));
    ctx.fillStyle = '#a02a2a'; ctx.fillRect(VIEW_W / 2 - w / 2, cy - 2, w * k, 2);
    ctx.fillStyle = 'rgba(160,42,42,0.5)'; ctx.fillRect(VIEW_W / 2 - w / 2 + 2, cy, w * k - 4, 1);
    ctx.restore();
  }
  private drawTransformCard(ctx: CanvasRenderingContext2D): void {
    const c = this.tcard; if (!c) return;
    const a = clamp(Math.min(c.t * 4, (3 - c.t) * 2), 0, 1), k = ease.outBack(clamp(c.t / 0.35, 0, 1));
    const cy = 96;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 0, VIEW_W, 0);
    g.addColorStop(0, 'rgba(40,10,60,0)'); g.addColorStop(0.5, 'rgba(40,10,60,0.75)'); g.addColorStop(1, 'rgba(40,10,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, cy - 24, VIEW_W, 46);
    text(ctx, 'TRANSFORMATION', VIEW_W / 2, cy - 12, 7, '#c8a8ff', 'center', FONT_BODY, 700);
    ctx.translate(VIEW_W / 2, cy + 6); ctx.scale(k, k);
    ctx.shadowColor = '#b070ff'; ctx.shadowBlur = 12;
    text(ctx, c.name.toUpperCase(), 0, 0, 20, '#f4e8ff', 'center', FONT_TITLE, 400);
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.save(); ctx.globalAlpha = a;
    text(ctx, c.desc, VIEW_W / 2, cy + 18, 7.5, '#e0d0ff', 'center', FONT_BODY, 600);
    ctx.restore();
  }
  /** Grandfather's handwriting on a scrap of paper, held up until it has had time to be read. */
  private drawNote(ctx: CanvasRenderingContext2D): void {
    const n = this.note; if (!n) return;
    const a = clamp(Math.min(n.t * 4, (n.dur - n.t) * 2), 0, 1);
    const W = 300, lines = wrap(ctx, n.text, 7.5, W - 28);
    const H = 30 + lines.length * 9.5 + (n.by ? 10 : 0), x = VIEW_W / 2 - W / 2, y = VIEW_H - 52 - H + (1 - a) * 8;
    ctx.save();
    paperStrip(ctx, x, y, W, H, a, n.title.length + 7);
    ctx.globalAlpha = a;
    text(ctx, n.title, x + 14, y + 15, 11, '#2a1a14', 'left', FONT_TITLE, 400, false);
    ctx.fillStyle = 'rgba(90,60,40,0.35)'; ctx.fillRect(x + 14, y + 19, W - 28, 0.6);
    lines.forEach((l, i) => text(ctx, l, x + 14, y + 30 + i * 9.5, 7.5, '#3a2a40', 'left', FONT_BODY, 600, false));
    if (n.by) text(ctx, '— ' + n.by, x + W - 14, y + H - 7, 7, '#6a4a3a', 'right', FONT_BODY, 600, false);
    ctx.restore();
  }
  private drawToasts(ctx: CanvasRenderingContext2D): void {
    this.toasts.forEach((t, i) => {
      const a = Math.min(1, t.t * 5, (t.dur - t.t) * 3);
      ctx.globalAlpha = clamp(a, 0, 1);
      const lines = wrap(ctx, t.text, 8, 300);
      const k = textScale();
      lines.forEach((l, j) => text(ctx, l, VIEW_W / 2, VIEW_H - 40 - (this.toasts.length - 1 - i) * 12 * k - (lines.length - 1 - j) * 10 * k, 8, COL.text, 'center'));
      ctx.globalAlpha = 1;
    });
  }
  private drawRoomName(ctx: CanvasRenderingContext2D): void {
    if (this.roomNameT <= 0) return;
    if (this.w.room.type === 'treasure' && this.w.pickups.filter((p) => p.data.group !== undefined && p.data.id && !p.dead).length > 1) return;
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
    if (this.floorCardAlarm) text(ctx, this.floorSub, VIEW_W / 2, VIEW_H / 2 + 23, 10, '#e0303a', 'center', FONT_TITLE, 400);
    else text(ctx, this.floorSub, VIEW_W / 2, VIEW_H / 2 + 20, 7, COL.dim, 'center', FONT_BODY, 400);
    if (this.floorCurse) text(ctx, CURSE_NAMES[this.floorCurse] ?? '', VIEW_W / 2, VIEW_H / 2 + 36, 8, '#c090ff', 'center', FONT_TITLE, 400);
    ctx.restore();
  }
  /**
   * The boss title card. Ink wedges sweep in during the sting's riser; on the hit the boss is torn out
   * of silhouette with a white flash and a shake, and its name stamps down letter by letter; the
   * subtitle types itself out underneath. Your reader faces it from the left across a VS seal.
   */
  private drawBossIntro(ctx: CanvasRenderingContext2D): void {
    if (this.bossIntroT <= 0) return;
    const w = this.w, t = BOSS_CARD - this.bossIntroT, H = STING_HIT;
    const ACC = { chapter: '#a82230', final: '#e81e34', echo: '#6aa8f0', champion: '#e8b840' }[this.bossKind];
    const BAND = { chapter: '#0c0508', final: '#1c0306', echo: '#060a14', champion: '#120c04' }[this.bossKind];
    const out = clamp(this.bossIntroT / 0.35, 0, 1);              // 1 until the last 0.35 s, then 0
    const inK = ease.outCubic(clamp(t / H, 0, 1)), hit = t >= H;
    if (hit && !this.bossSlammed) { this.bossSlammed = true; w.trauma = Math.max(w.trauma, 0.55); }
    const cy = VIEW_H / 2;
    ctx.save();
    // the room dims behind the card
    ctx.globalAlpha = 0.55 * Math.min(1, t * 5) * out; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // two ink wedges meet in a slanted band
    ctx.globalAlpha = 0.95 * out; ctx.fillStyle = BAND;
    const L = -VIEW_W + inK * VIEW_W, R = VIEW_W - inK * VIEW_W;
    ctx.beginPath(); ctx.moveTo(L, cy - 44); ctx.lineTo(L + VIEW_W * 0.62, cy - 52); ctx.lineTo(L + VIEW_W * 0.58, cy + 54); ctx.lineTo(L, cy + 60); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R + VIEW_W * 0.4, cy - 54); ctx.lineTo(R + VIEW_W, cy - 62); ctx.lineTo(R + VIEW_W, cy + 46); ctx.lineTo(R + VIEW_W * 0.36, cy + 52); ctx.fill();
    // ink drips off the bottom edge
    for (let i = 0; i < 14; i++) {
      const x = (i * 37 + 11) % VIEW_W, len = (4 + (i * 7) % 11) * clamp((t - 0.2 - (i % 5) * 0.06) * 2, 0, 1);
      ctx.fillRect(x, cy + 52 - (x / VIEW_W) * 8, 2, len); ctx.beginPath(); ctx.arc(x + 1, cy + 52 - (x / VIEW_W) * 8 + len, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // accent rules that draw across on the hit
    const rule = ease.outCubic(clamp((t - H) * 3, 0, 1));
    ctx.fillStyle = ACC; ctx.fillRect(0, cy + 47, VIEW_W * rule, 1.5); ctx.fillRect(VIEW_W * (1 - rule), cy - 55, VIEW_W, 1.5);
    // a light behind the boss
    const bx = VIEW_W - 92, by = cy + 30;
    if (hit) {
      const g = ctx.createRadialGradient(bx, by - 30, 4, bx, by - 30, 90);
      g.addColorStop(0, ACC + '88'); g.addColorStop(1, ACC + '00');
      ctx.globalAlpha = out * (0.6 + 0.4 * Math.sin(t * 7) * 0.5); ctx.fillStyle = g; ctx.fillRect(bx - 100, by - 130, 200, 200);
    }
    ctx.globalAlpha = out;
    // the boss: a silhouette until the hit, then torn into view with a white flash
    const b = this.bossRef;
    if (b && !b.dead) {
      const set = b.sprites.portrait ?? b.sprites.idle ?? Object.values(b.sprites)[0];
      const spr = set?.[Math.floor(t * 6) % set.length];
      if (spr) {
        const k = Math.min(1.8, 92 / Math.max(spr.h, 1)), sl = ease.outCubic(clamp(t / 0.5, 0, 1));
        ctx.save(); ctx.translate(VIEW_W + 70 - sl * (VIEW_W + 70 - bx), by + Math.sin(t * 3) * 1.5); ctx.scale(k, k);
        const flash = hit ? Math.max(0, 1 - (t - H) * 3.5) * (w.game.save.data.settings.reduceFlash ? 0.2 : 1) : 0;
        spr.draw(ctx, 0, 0, hit ? { flash, tint: this.bossKind === 'echo' ? '#8ab8ff' : undefined, tintAmt: this.bossKind === 'echo' ? 0.35 : 0 } : { tint: '#000000', tintAmt: 1 });
        ctx.restore();
      }
    }
    // your reader, coming in from the left
    const sp = w.game.menus.sprites(charById(w.run.charId));
    const rs = ease.outCubic(clamp((t - 0.1) / 0.5, 0, 1));
    ctx.save(); ctx.translate(-50 + rs * 120, cy + 34); ctx.scale(2.6, 2.6);
    sp.bodyIdle.down[Math.floor(t * 2) % 2].draw(ctx, 0, 0); sp.head.down.normal.draw(ctx, 0, -10);
    ctx.restore();
    // the VS seal, stamped between them
    if (hit) {
      const vk = 1 + Math.max(0, 0.18 - (t - H)) * 6, vx = 132, vy = cy - 22;
      ctx.save(); ctx.translate(vx, vy); ctx.scale(vk, vk); ctx.rotate(-0.12);
      ctx.fillStyle = ACC; ctx.beginPath();
      for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI * 2, r = 11 + ((i * 5) % 3) * 1.4; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.fill();
      text(ctx, 'VS', 0, 4, 12, '#100608', 'center', FONT_TITLE, 400, false);
      ctx.restore();
    }
    // the chapter line, then the name stamped down letter by letter
    ctx.globalAlpha = out * clamp((t - 0.15) * 4, 0, 1);
    text(ctx, this.bossChapter.toUpperCase(), VIEW_W / 2 + 14, cy - 30, 7, ACC, 'center', FONT_BODY, 700);
    ctx.globalAlpha = out;
    if (hit) {
      const name = this.bossName.toUpperCase(), size = name.length > 22 ? 18 : 24;
      ctx.font = `400 ${size}px ${FONT_TITLE}`;
      const total = ctx.measureText(name).width;
      let x = VIEW_W / 2 + 14 - total / 2;
      for (let i = 0; i < name.length; i++) {
        const ch = name[i], cw = ctx.measureText(ch).width, lt = t - H - i * 0.022;
        if (lt > 0) {
          const k = 1 + Math.max(0, 0.12 - lt) * 9, rot = ((i * 7919) % 11 - 5) * 0.004;
          ctx.save(); ctx.translate(x + cw / 2, cy + 2); ctx.rotate(rot); ctx.scale(k, k);
          ctx.globalAlpha = out * clamp(lt * 12, 0, 1);
          text(ctx, ch, 0, 0, size, '#f4e6d0', 'center', FONT_TITLE, 400);
          ctx.restore();
        }
        x += cw;
      }
      // the subtitle types itself out
      const st = clamp((t - H - 0.35) * 55, 0, this.bossSub.length);
      const lines = wrap(ctx, this.bossSub.slice(0, Math.floor(st)), 7.5, 230);
      lines.slice(0, 2).forEach((l, i) => text(ctx, l, VIEW_W / 2 + 14, cy + 17 + i * 9, 7.5, '#c8a898', 'center', FONT_BODY, 600));
      if (this.bossKind === 'final') text(ctx, 'THIS IS HOW IT ENDS', VIEW_W / 2 + 14, cy + 41, 6.5, '#ff6070', 'center', FONT_BODY, 700);
      if (this.bossKind === 'champion') text(ctx, 'CHAMPION', VIEW_W / 2 + 14, cy + 41, 6.5, ACC, 'center', FONT_BODY, 700);
    }
    // the white flash on the hit
    if (hit && t - H < 0.18) { ctx.globalAlpha = (1 - (t - H) / 0.18) * (w.game.save.data.settings.reduceFlash ? 0.1 : 0.55); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    ctx.restore();
  }
}
void SWEET_EFFECTS;
