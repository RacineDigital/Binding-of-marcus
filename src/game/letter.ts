// Grandfather's letter on the hospital path: where its two halves are, said plainly. The top half
// waits at the lost property desk (whose door always opens after a hospital boss while it's there);
// the bottom half is down the chapter's Deep Crawlspace, which is open and marked on the map.
import type { World } from './world';
import { HOSPITAL_THEMES } from '../data/notes';

export const LETTER_HALVES = ['letter_top', 'letter_bottom'] as const;

/** Where each half is, while Marcus is on the hospital path without the whole letter (else null). */
export function letterHunt(w: World): { top: boolean; bottom: boolean } | null {
  const pl = w.player;
  if (!HOSPITAL_THEMES.includes(w.theme.id) || pl.has('grandfathers_letter')) return null;
  return { top: pl.has('letter_top'), bottom: pl.has('letter_bottom') };
}

/** A pickup that is a half of the letter Marcus still needs. */
export function isWantedHalf(w: World, kind: string, id: string | null | undefined): boolean {
  const h = letterHunt(w);
  if (!h || kind !== 'item') return false;
  return (id === 'letter_top' && !h.top) || (id === 'letter_bottom' && !h.bottom);
}

/** At the start of a hospital chapter: open the crawlspace holding the bottom half, mark it, and say where both halves are. */
export function onLetterFloor(w: World): void {
  const h = letterHunt(w);
  if (!h) return;
  if (!h.bottom) {
    for (const r of w.floor.rooms) {
      if (!r.pickups.some((p) => p.kind === 'item' && p.data?.id === 'letter_bottom')) continue;
      r.seen = true; r.discovered = true;
      for (const d of r.doors) {
        d.hidden = false;
        for (const od of w.floor.rooms[d.to].doors) if (od.to === r.id) od.hidden = false;
      }
    }
  }
  const tip = !h.top && !h.bottom
    ? 'Grandfather\'s letter is torn in two. One half is down the crawlspace on your map; the other is at Lost & Found, behind the boss.'
    : !h.bottom ? 'The rest of the letter is down the crawlspace marked on your map.'
    : 'The rest of the letter is at Lost & Found: beat the boss and take the door with the claim ticket.';
  w.after(2.8, () => w.hud.toast(tip, 5), true);
}

/** What the Room 4 door says when Marcus hasn't got the whole letter yet. */
export function room4Refusal(w: World): string {
  const pl = w.player;
  const missing = [!pl.has('letter_top') && 'the top half (Lost & Found)', !pl.has('letter_bottom') && 'the bottom half (a Deep Crawlspace)'].filter(Boolean);
  return `Locked. VISITORS, PLEASE BRING YOUR LETTER. Still missing: ${missing.join(' and ')}.`;
}
