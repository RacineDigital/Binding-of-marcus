// Bargain doors. When a chapter's boss falls, a door may open beside its room: the Inkwell (items for
// heart containers), the Wax Chapel (free blessings) or the Lost & Found (things you left behind,
// traded one-for-one for something you carry). Getting hit makes a door less likely, and the odds are
// shown on the HUD so you can watch them.
import type { World } from './world';
import type { Pickup } from './pickups';
import type { RoomData } from '../rooms/room';
import { getItem } from '../items/registry';
import { RNG } from '../core/rng';
import { addBargainRoom } from '../generation/floorgen';
import { FINAL_FLOOR } from '../data/floors';
import { HOSPITAL_THEMES } from '../data/notes';

export type BargainKind = 'deal' | 'blessing' | 'lostfound';
export const BARGAIN_NAMES: Record<BargainKind, string> = { deal: 'The Inkwell', blessing: 'Wax Chapel', lostfound: 'Lost & Found' };

/** Bonus for getting through a chapter without being hit. Lost on the first hit. */
export const UNTOUCHED = 0.35;
/** Bonus for not being hit by the chapter's boss. */
export const CLEAN_BOSS = 0.15;

export interface DoorOdds {
  total: number;
  /** How the total was reached, for the Tab screen. */
  parts: { label: string; value: string; good: boolean }[];
  split: Record<BargainKind, number>;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export function doorOdds(w: World): DoorOdds {
  const f = w.run.flags, fi = w.run.floorIndex;
  const parts: DoorOdds['parts'] = [];
  const base = f.dealChance ?? 0.2;
  let c = base;
  parts.push({ label: 'Base chance', value: pct(base), good: true });
  if (!f.hitThisFloor) { c += UNTOUCHED; parts.push({ label: 'Not hit this chapter', value: '+' + pct(UNTOUCHED), good: true }); }
  else parts.push({ label: 'Hit this chapter', value: '+0%', good: false });
  if (!f.bossHit) { c += CLEAN_BOSS; parts.push({ label: w.room?.type === 'boss' ? 'Boss hasn\'t hit you' : 'Clean boss fight', value: '+' + pct(CLEAN_BOSS), good: true }); }
  else parts.push({ label: 'Hit by the boss', value: '+0%', good: false });
  if (f.lastDoorFloor === fi - 1) { c *= 0.5; parts.push({ label: 'A door opened last chapter', value: 'x1/2', good: false }); }
  if (fi === 0) { c = 0; parts.push({ label: 'No doors in Chapter I', value: '0%', good: false }); }
  else if (fi === FINAL_FLOOR && w.run.mode !== 'endless') { c = 0; parts.push({ label: 'No doors in the final chapter', value: '0%', good: false }); }
  else if (f.margins && fi > FINAL_FLOOR) { c = 0; parts.push({ label: 'No doors past the Binding', value: '0%', good: false }); }
  return { total: Math.max(0, Math.min(1, c)), parts, split: doorSplit(w) };
}

/**
 * Which door opens. Take an Inkwell deal and the Wax Chapel stops answering; take a blessing and the
 * Inkwell stays shut. Walk away from an Inkwell without signing and the Chapel grows likelier. The
 * Lost & Found turns up more the more you've left behind, whatever you've signed.
 */
export function doorSplit(w: World): Record<BargainKind, number> {
  const f = w.run.flags;
  // the hospital's lost property desk is holding half of Grandfather's letter
  if (letterAtDesk(w)) return { deal: 0, blessing: 0, lostfound: 1 };
  const left = lostItemsFor(w).length;
  const lost = left > 0 ? Math.min(0.5, 0.15 + 0.06 * left) : 0.08;
  const rest = 1 - lost;
  let deal = rest / 2, blessing = rest / 2;
  if (f.blessingsTaken > 0) { deal = 0; blessing = rest; }
  else if (f.dealsTaken > 0) { deal = rest; blessing = 0; }
  else if (f.inkSkipped) { deal = rest / 3; blessing = rest * 2 / 3; }
  return { deal, blessing, lostfound: lost };
}

/** Roll for a door after the boss dies; opens it and returns its kind, or null. */
export function rollBargain(w: World, boss: RoomData): { kind: BargainKind; room: RoomData } | null {
  const fi = w.run.floorIndex, f = w.run.flags;
  noteLeftBehind(w, true);
  const odds = doorOdds(w);
  const rng = new RNG(w.run.seed + ':deal' + fi);
  if (rng.next() >= odds.total) return null;
  const r = rng.next();
  const s = odds.split;
  const kind: BargainKind = r < s.lostfound ? 'lostfound' : r < s.lostfound + s.deal ? 'deal' : 'blessing';
  const room = openBargain(w, boss, kind);
  return room ? { kind, room } : null;
}

/** Open a bargain room of a given kind next to a room (also used by the debug helpers). */
export function openBargain(w: World, beside: RoomData, kind: BargainKind): RoomData | null {
  const f = w.run.flags;
  const room = addBargainRoom(w.run, w.floor, beside, kind);
  if (!room) return null;
  f.lastDoorFloor = w.run.floorIndex; f.lastDoorKind = kind; f.dealsAtDoor = f.dealsTaken;
  if (kind === 'lostfound') stockLostFound(w, room);
  return room;
}

/** Called as a chapter ends: walking past an open Inkwell without signing anything is remembered. */
export function onLeaveFloor(w: World): void {
  const f = w.run.flags;
  noteLeftBehind(w, false);
  if (f.lastDoorFloor === w.run.floorIndex && f.lastDoorKind === 'deal' && f.dealsTaken === f.dealsAtDoor) f.inkSkipped = true;
  if (f.dealsTaken > 0) f.inkSkipped = false;
}

// ------------------------------------------------------------------ Lost & Found

/** Never asked for at the counter: losing these would undo something you can't get back. */
const NO_TRADE = new Set(['extra_pocket', 'charm_bracelet', 'moth_wings_rev', 'letter_top', 'letter_bottom', 'grandfathers_letter']);

function owns(w: World, id: string): boolean { return (w.player.items.get(id) ?? 0) > 0 || w.player.active === id; }

/** Items left behind this run (skipped choices, unbought stock, unsigned deals) that Marcus doesn't own. */
export function lostItemsFor(w: World): string[] {
  const list: string[] = w.run.flags.lostItems ?? [];
  return list.filter((id) => !owns(w, id) && getItem(id) && getItem(id)!.kind !== 'active');
}

/** Remember item pedestals Marcus walked away from in rooms he visited. */
export function noteLeftBehind(w: World, skipCurrent: boolean): void {
  const f = w.run.flags;
  const list: string[] = f.lostItems ?? (f.lostItems = []);
  const add = (id: string | null | undefined) => { if (id && !list.includes(id) && !owns(w, id)) list.push(id); };
  for (const r of w.floor.rooms) {
    if (!r.visited || r.type === 'lostfound') continue;
    if (r === w.room) { if (!skipCurrent) for (const p of w.pickups) if (p.kind === 'item' && !p.dead && !p.data.swap) add(p.data.id); continue; }
    for (const p of r.pickups) if (p.kind === 'item' && !p.data?.swap) add(p.data?.id);
  }
  if (list.length > 40) list.splice(0, list.length - 40);
}

/** On the hospital path, until Marcus has it, the top half of the letter waits at the lost property desk. */
export function letterAtDesk(w: World): boolean {
  const pl = w.player;
  return HOSPITAL_THEMES.includes(w.theme.id) && !pl.has('letter_top') && !pl.has('grandfathers_letter');
}

/** Fill the counter with things you left behind (they vanish from where you left them), topped up from the pools. */
function stockLostFound(w: World, room: RoomData): void {
  const lost = lostItemsFor(w);
  const rng = new RNG(room.seed + ':stock');
  rng.shuffle(lost);
  if (letterAtDesk(w)) lost.unshift('letter_top');
  const peds = room.pickups.filter((p) => p.kind === 'item' && p.data?.swap);
  for (const p of peds) {
    const id = lost.shift();
    if (!id) { p.data.id = w.run.pools.roll('treasure', rng, (i) => i.kind !== 'active', 1); continue; }
    p.data.id = id; p.data.found = true;
    // it was picked up and brought here
    for (const r of w.floor.rooms) if (r !== room) for (const q of r.pickups) if (q.kind === 'item' && q.data?.id === id) q.data.id = null;
  }
}

/** Passive items Marcus could hand over at the counter. */
function tradeable(w: World): string[] {
  const pl = w.player;
  return pl.itemOrder.filter((id) => (pl.items.get(id) ?? 0) > 0 && !NO_TRADE.has(id) && getItem(id)?.kind !== 'active');
}

/**
 * The item a Lost & Found pedestal asks you to leave in exchange, or null when you have nothing to
 * leave (then it's free). Each pedestal picks its own, and keeps it as long as you still carry it.
 */
export function ticketFor(w: World, p: Pickup): string | null {
  if (!p.data.swap || !p.data.id) return null;
  const own = tradeable(w).filter((id) => id !== p.data.id);
  if (!own.length) return null;
  if (p.data.ticket && own.includes(p.data.ticket)) return p.data.ticket;
  const others = new Set(w.pickups.filter((q) => q !== p && q.data.swap && q.data.ticket).map((q) => q.data.ticket));
  const fresh = own.filter((id) => !others.has(id));
  const pool = fresh.length ? fresh : own;
  const rng = new RNG(`${w.room.seed}:ticket:${Math.round(p.x)}:${w.run.flags.swaps ?? 0}`);
  p.data.ticket = rng.pick(pool);
  return p.data.ticket;
}
