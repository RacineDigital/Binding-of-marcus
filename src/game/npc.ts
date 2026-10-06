// Interactive NPCs and machines: shopkeeper, slot machine, fortune owl, beggar, donation box, restock
// machine, wishing well, seamstress, clock.
import type { World } from './world';
import { npcSprites } from '../art/npcs';
import { dist2, TAU } from '../core/math';
import { spawnDrop } from './drops';
import { RNG } from '../core/rng';
import { FORTUNES } from '../data/lore';
import { NOTE_BY_ID, NOTES } from '../data/notes';
import * as flow from './roomflow';
import { moveBody } from '../rooms/collide';
import { priceFor } from '../generation/populate';
import { DONATION_STEP, SHOP_LEVELS, MAX_SHOP_LEVEL, shopLevelFor, shopPrice } from './shoplevel';

export class Npc {
  kind: string; x: number; y: number; r = 9; t = 0; cd = 0; frame = 0; dead = false; data: any = {};
  onBomb?: (w: World) => void;
  constructor(kind: string, x: number, y: number) { this.kind = kind; this.x = x; this.y = y; }
}

// items don't come out of a working slot machine any more: only out of one that breaks
const PAYOUT: [string, number][] = [['none', 52], ['button', 16], ['heart', 8], ['bomb', 6], ['key', 6], ['page', 4], ['sweet', 4], ['mite', 3]];
/** A slot machine's chance to break on this pull: 5%, and 2% more for every pull before it. */
export function slotBreakChance(uses: number): number { return Math.min(1, 0.05 + 0.02 * uses); }

export function makeNpc(w: World, kind: string, x: number, y: number): Npc {
  const n = new Npc(kind, x, y);
  n.onBomb = (ww) => npcBombed(ww, n);
  if (kind === 'clock') n.r = 10;
  if (kind === 'well') n.r = 13;
  if (kind === 'restock') n.r = 11;
  if (kind === 'note') n.r = 6;
  if (kind === 'book') n.r = 10;
  if (kind === 'armchair') n.r = 13;
  return n;
}

function npcBombed(w: World, n: Npc): void {
  if (n.dead) return;
  if (n.kind === 'mott') {
    n.dead = true;
    w.fx.burst(n.x, n.y, 10, 20, '#c8b48a', 90, 0.6, 2);
    w.audio.play('deathBig', { x: n.x });
    w.hud.toast('Mott is gone. His coat was full of buttons.');
    for (let i = 0; i < 3 + Math.floor(Math.random() * 4); i++) spawnDrop(w, 'button', n.x, n.y);
    if (Math.random() < 0.15) spawnDrop(w, 'charm', n.x, n.y);
  } else if (n.kind === 'slot' || n.kind === 'fortune') {
    n.dead = true;
    w.fx.shards(n.x, n.y, 16, '#8a3a4a', 120);
    w.audio.play('rockBreak', { x: n.x });
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) spawnDrop(w, 'button', n.x, n.y);
    if (Math.random() < 0.1) flow.spawnPedestal(w, n.x, n.y + 10, w.run.pools.roll('arcade'), 'normal');
  } else if (n.kind === 'beggar') {
    n.dead = true; w.fx.smoke(n.x, n.y, 8); w.hud.toast('The beggar scatters.');
    w.run.flags.dealChance += 0.1;
  }
}

/** What the restock machine asks for a fresh lot: more each time in the same shop. */
export function restockCost(w: World): number { return 5 + 4 * (w.room.flags.restocks ?? 0); }
/** The shop's curios still for sale. */
export function shopStock(w: World) { return w.pickups.filter((p) => !p.dead && p.shop && p.pedestal && p.price > 0 && p.data.id); }
/** The shop level your donations have bought (the Daily Run is always a plain shop). */
export function currentShopLevel(w: World): number { return w.run.mode === 'daily' ? 0 : shopLevelFor(w.game.save.data.donated ?? 0); }
/** The restock machine: pay, and every curio still for sale becomes something else. */
function restock(w: World, n: Npc): void {
  const stock = shopStock(w);
  if (!stock.length) { w.hud.toast('The restock machine has nothing left to swap.', 2); n.cd = 1.5; return; }
  const cost = restockCost(w);
  if (!pay(w, cost)) { w.hud.toast(`A fresh lot costs ${cost} buttons.`, 2); n.cd = 1.5; return; }
  const rng = new RNG(Math.random() * 1e9), lvl = currentShopLevel(w);
  for (const p of stock) {
    const id = w.run.pools.roll('shop', rng);
    p.data.id = id; p.price = shopPrice(priceFor(id), lvl);
    w.fx.smoke(p.x, p.y - 6, 5, 'rgba(200,180,140,', 5, 0.5, 10); w.fx.stars(p.x, p.y - 10, 3, '#ffe0a0');
  }
  w.room.flags.restocks = (w.room.flags.restocks ?? 0) + 1;
  n.data.spin = 0.8; n.cd = 1.2;
  w.audio.play('chime', { x: n.x }); w.audio.play('coinBig', { x: n.x, vol: 0.5 });
  w.hud.toast('Clunk. The machine shuffles a fresh lot onto the counter.', 2);
}
/** The donation box: a button at a time, kept forever. Every 50 raises the shop a level. */
function donate(w: World, n: Npc): void {
  if (!pay(w, 1)) return;
  const save = w.game.save, before = shopLevelFor(save.data.donated ?? 0);
  save.data.donated = (save.data.donated ?? 0) + 1; save.markDirty();
  n.cd = 0.3; n.data.blink = 0.3;
  w.fx.stars(n.x, n.y - 22, 2, '#ffe070');
  const after = shopLevelFor(save.data.donated);
  if (after > before) {
    w.audio.play('chime', { x: n.x }); w.audio.play('slotWin', { x: n.x, vol: 0.6 }); w.fx.ring(n.x, n.y - 14, 4, 40, '#ffd860', 0.5);
    w.hud.toast(`The shop is now level ${after}: ${SHOP_LEVELS[after]}.`, 3.5);
    if (after >= MAX_SHOP_LEVEL) save.unlock('shop_max');
  }
}
/** What the donation box shows when you stand by it. */
export function donationLabel(w: World): string {
  const d = w.game.save.data.donated ?? 0, lvl = shopLevelFor(d);
  return lvl >= MAX_SHOP_LEVEL ? `Shop level ${lvl} (max)` : `Shop Lv ${lvl}  ·  ${d % DONATION_STEP}/${DONATION_STEP}`;
}

function pay(w: World, amt: number): boolean {
  if (w.player.buttons < amt) { w.audio.play('deny'); return false; }
  w.player.buttons -= amt; w.audio.play('coinSpend', { x: w.player.x }); return true;
}

function touch(w: World, n: Npc): void {
  const rng = new RNG(Math.random() * 1e9);
  switch (n.kind) {
    case 'slot': {
      if (!pay(w, 1)) return;
      n.data.spin = 0.9; n.cd = 1.0;
      // every pull wears it: 5% to break on the first, 2% more on each one after
      const broke = rng.next() < slotBreakChance(n.data.uses ?? 0);
      n.data.uses = (n.data.uses ?? 0) + 1;
      const res = rng.weighted(PAYOUT, (x) => x[1])![0];
      w.after(0.85, () => {
        if (n.dead || !w.room) return;
        if (broke) {
          // it breaks, and half the time there's an item in the wreckage
          n.dead = true; w.fx.shards(n.x, n.y, 16, '#8a3a4a', 120); w.audio.play('rockBreak', { x: n.x }); w.shake(2);
          if (rng.next() < 0.5) { flow.spawnPedestal(w, n.x, n.y + 22, w.run.pools.roll('arcade'), 'normal'); w.audio.play('slotWin', { x: n.x }); w.hud.toast('The slot machine breaks, and something falls out.', 2.5); }
          else w.hud.toast('The slot machine breaks. Nothing inside.', 2);
          return;
        }
        if (res === 'none') { w.audio.play('slotLose', { x: n.x }); return; }
        w.audio.play('slotWin', { x: n.x });
        if (res === 'mite') flow.spawnEnemy(w, 'mite', n.x, n.y + 14, true);
        else { const c = res === 'button' ? rng.int(2, 3) : 1; for (let i = 0; i < c; i++) spawnDrop(w, res, n.x, n.y + 12); }
      });
      break;
    }
    case 'donation': donate(w, n); break;
    case 'restock': restock(w, n); break;
    case 'fortune': {
      if (!pay(w, 1)) return;
      n.cd = 1; n.data.blink = 0.5;
      const r = rng.next();
      if (r < 0.55) { w.hud.toast('"' + rng.pick(FORTUNES) + '"', 4); w.audio.play('fortune'); }
      else if (r < 0.7) spawnDrop(w, 'wax', n.x, n.y + 12);
      else if (r < 0.82) spawnDrop(w, 'page', n.x, n.y + 12);
      else if (r < 0.92) spawnDrop(w, 'sweet', n.x, n.y + 12);
      else spawnDrop(w, 'charm', n.x, n.y + 12);
      break;
    }
    case 'beggar': {
      if (!pay(w, 1)) return;
      n.cd = 0.5; n.data.paid = (n.data.paid ?? 0) + 1;
      w.fx.stars(n.x, n.y - 16, 3, '#ffe070');
      if (rng.next() < 0.1 + n.data.paid * 0.02) {
        if (n.data.paid >= 5 && rng.next() < 0.4) { flow.spawnPedestal(w, n.x, n.y + 22, w.run.pools.roll('arcade'), 'normal'); n.dead = true; w.fx.smoke(n.x, n.y, 8); w.hud.toast('The beggar left something behind.'); }
        else spawnDrop(w, rng.pick(['heart', 'bomb', 'key', 'page', 'sweet']), n.x, n.y + 12);
      }
      break;
    }
    case 'well': {
      if (!pay(w, 1)) return;
      n.cd = 0.6;
      w.fx.ring(n.x, n.y - 10, 2, 10, '#6aa0d0', 0.4, false); w.audio.play('splash', { x: n.x });
      const r = rng.next();
      if (r < 0.1) { w.player.healRed(1, true); w.audio.play('heal'); }
      else if (r < 0.15) spawnDrop(w, 'wax', n.x, n.y + 16);
      else if (r < 0.18) { w.player.addTemp({ id: 'wish', stats: { luck: 1 }, floor: true }); w.hud.toast('You feel lucky.'); }
      else if (r < 0.185) { flow.spawnPedestal(w, n.x, n.y + 26, w.run.pools.roll('blessing'), 'blessing'); w.hud.toast('The well answers.'); }
      break;
    }
    case 'seamstress': {
      if (n.data.done) return;
      const h = w.player.health;
      if (h.redMax < 2 && h.extra.length < 2) { w.hud.toast('"Nothing left to unpick, dear."'); n.cd = 2; return; }
      if (h.redMax >= 2) h.removeContainers(1); else { h.extra.pop(); h.extra.pop(); }
      if (h.totalHalf() <= 0) h.addExtra('wax', 1);
      n.data.done = true; w.audio.play('stitch');
      w.hud.toast('"There. Stitched from what you gave me."', 3);
      flow.spawnPedestal(w, n.x, n.y + 26, w.run.pools.roll(rng.next() < 0.5 ? 'shop' : 'treasure'), 'normal');
      break;
    }
    case 'note': {
      // one of Grandfather's notes: read it (it goes in the Journal)
      const note = NOTE_BY_ID[n.data.id];
      if (!note) return;
      // you can only read it standing over it: it stays open while you're close and closes when you leave
      n.cd = 0.3;
      if (w.hud.readingNote(note.title)) return;
      const fresh = w.game.save.readNote(note.id);
      w.hud.showNote(note.title, note.text, note.by ?? 'Grandfather', { x: n.x, y: n.y });
      w.audio.play('pageGet', { x: n.x });
      if (fresh) {
        (w.run.flags.notesFound ??= []).push(note.id);
        w.audio.play('secret', { x: n.x, vol: 0.4 }); w.after(0.6, () => w.hud.toast('A new note in the Journal.', 2));
        if (NOTES.every((x) => w.game.save.hasNote(x.id))) w.game.save.unlock('notes_all');
      }
      break;
    }
    case 'book': {
      // the finished book: the very end
      if (n.data.done) return;
      n.data.done = true; n.cd = 99;
      w.player.controlLock = 3; w.player.vx = w.player.vy = 0;
      w.audio.stinger('blessing'); w.whiteFlash = 0.8;
      w.hud.showNote('The Last Page', 'There is one line left, and the pen is right there.', '');
      w.after(2.2, () => w.game.onVictory(), true);
      break;
    }
    case 'armchair': {
      if (n.data.done) return;
      n.data.done = true; n.cd = 99;
      w.hud.toast('His cardigan is still over the back. It smells of pipe smoke.', 3.5);
      break;
    }
    case 'clock': {
      if (n.data.done) return;
      n.data.done = true; w.audio.play('chime');
      const r = rng.int(0, 3);
      if (r === 0) { const act = w.player.active; if (act) { flow.fullCharge(w); w.hud.toast('Time rewinds. Your active item is fully charged.'); } else { w.player.healRed(2, true); w.hud.toast('Time rewinds. You feel mended.'); } }
      else if (r === 1) { w.player.addTemp({ id: 'clock', stats: { tears: 0.8 }, floor: true }); w.hud.toast('The pendulum quickens. Fire rate up for this floor.'); }
      else if (r === 2) { flow.revealMap(w, true); w.hud.toast('For a moment you can see every room at once.'); }
      else { w.player.addTemp({ id: 'clock2', stats: { speed: 0.25 }, floor: true }); w.hud.toast('Tick. Tock. You move faster this floor.'); }
      break;
    }
  }
}

export function updateNpcs(w: World, dt: number): void {
  const pl = w.player;
  for (const n of w.npcs) {
    if (n.dead) continue;
    n.t += dt; n.cd -= dt;
    if (n.data.spin > 0) n.data.spin -= dt;
    if (n.data.blink > 0) n.data.blink -= dt;
    // a slot machine that's been pulled a lot starts to smoke and rattle: it's close to breaking
    if (n.kind === 'slot' && (n.data.uses ?? 0) >= 4 && Math.random() < dt * (n.data.uses - 3) * 0.6) w.fx.smoke(n.x + (Math.random() - 0.5) * 10, n.y - 30, 1, 'rgba(60,54,64,', 3, 0.7);
    // solid: push the player out
    const rr = n.r + pl.r;
    const d2 = dist2(pl.x, pl.y, n.x, n.y);
    if (d2 < rr * rr && d2 > 0.01) {
      const d = Math.sqrt(d2);
      moveBody(w.room, pl, ((pl.x - n.x) / d) * (rr - d), ((pl.y - n.y) / d) * (rr - d), pl.flight ? 'fly' : 'walk');
      if (n.cd <= 0 && n.kind !== 'mott') { n.cd = 0.4; touch(w, n); }
    }
  }
  w.npcs = w.npcs.filter((n) => !n.dead);
}

export function renderNpc(w: World, ctx: CanvasRenderingContext2D, n: Npc, sx: number, sy: number): void {
  const S = npcSprites();
  const frames = S[n.kind]; if (!frames) return;
  let f = 0;
  if (n.kind === 'slot') f = n.data.spin > 0 ? Math.floor(n.t * 20) % 4 : 0;
  else if (n.kind === 'restock') f = n.data.spin > 0 ? Math.floor(n.t * 16) % 2 : 0;
  else if (n.kind === 'donation') f = n.data.blink > 0 ? 1 : 0;
  else if (n.kind === 'fortune') f = n.data.blink > 0 ? 1 : 0;
  else if (n.kind === 'clock') f = Math.floor(n.t) % 4;
  else f = Math.floor(n.t * 1.5) % frames.length;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy, n.r, 3, 0, 0, TAU); ctx.fill();
  frames[f].draw(ctx, sx, sy + 1);
  if (n.kind === 'slot' || n.kind === 'fortune' || n.kind === 'restock') w.r.addGlow(sx, sy - 18, 22, n.kind === 'restock' ? '#80ffb0' : '#ffd080', 0.15);
}
