// Interactive NPCs and machines: shopkeeper, slot machine, fortune owl, beggar, wishing well, seamstress, clock.
import type { World } from './world';
import { npcSprites } from '../art/npcs';
import { dist2, TAU } from '../core/math';
import { spawnDrop } from './drops';
import { RNG } from '../core/rng';
import { FORTUNES } from '../data/lore';
import { NOTE_BY_ID, NOTES } from '../data/notes';
import * as flow from './roomflow';
import { moveBody } from '../rooms/collide';

export class Npc {
  kind: string; x: number; y: number; r = 9; t = 0; cd = 0; frame = 0; dead = false; data: any = {};
  onBomb?: (w: World) => void;
  constructor(kind: string, x: number, y: number) { this.kind = kind; this.x = x; this.y = y; }
}

const PAYOUT: [string, number][] = [['none', 52], ['button', 16], ['heart', 8], ['bomb', 6], ['key', 6], ['page', 4], ['sweet', 4], ['mite', 3], ['item', 1]];

export function makeNpc(w: World, kind: string, x: number, y: number): Npc {
  const n = new Npc(kind, x, y);
  n.onBomb = (ww) => npcBombed(ww, n);
  if (kind === 'clock') n.r = 10;
  if (kind === 'well') n.r = 13;
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
      const res = rng.weighted(PAYOUT, (x) => x[1])![0];
      w.after(0.85, () => {
        if (n.dead || !w.room) return;
        if (res === 'none') { w.audio.play('slotLose', { x: n.x }); return; }
        w.audio.play('slotWin', { x: n.x });
        if (res === 'mite') flow.spawnEnemy(w, 'mite', n.x, n.y + 14, true);
        else if (res === 'item') { flow.spawnPedestal(w, n.x, n.y + 22, w.run.pools.roll('arcade'), 'normal'); n.dead = true; w.fx.shards(n.x, n.y, 16, '#8a3a4a', 120); }
        else { const c = res === 'button' ? rng.int(2, 3) : 1; for (let i = 0; i < c; i++) spawnDrop(w, res, n.x, n.y + 12); }
      });
      break;
    }
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
  else if (n.kind === 'fortune') f = n.data.blink > 0 ? 1 : 0;
  else if (n.kind === 'clock') f = Math.floor(n.t) % 4;
  else f = Math.floor(n.t * 1.5) % frames.length;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(sx, sy, n.r, 3, 0, 0, TAU); ctx.fill();
  frames[f].draw(ctx, sx, sy + 1);
  if (n.kind === 'slot' || n.kind === 'fortune') w.r.addGlow(sx, sy - 18, 22, '#ffd080', 0.15);
}
