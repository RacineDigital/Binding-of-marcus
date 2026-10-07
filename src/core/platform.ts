// Where the game is running, as the desktop shell tells it: on Steam (and a Steam Deck), and the
// Steam achievement mirror. The save's own achievements stay the record; Steam is just told about
// them as they happen, and caught up on launch (an older save, another slot) when it's connected.
import type { PadKind } from './input';
export interface SteamInfo { enabled: boolean; running: boolean; deck: boolean; language: string; reason: string }

const desk = (): any => (globalThis as any).bomDesktop;
let info: SteamInfo | null | undefined;

export function steamInfo(): SteamInfo | null {
  if (info === undefined) { try { info = desk()?.steam?.info?.() ?? null; } catch { info = null; } }
  return info ?? null;
}
/** Connected to a running Steam client. */
export const onSteam = (): boolean => !!steamInfo()?.running;
/** Steam reports a Steam Deck (the controller glyphs follow it). */
export const onSteamDeck = (): boolean => !!steamInfo()?.deck;

/** The family of the controller Steam Input sees (null when not on Steam or it can't tell). */
export function steamPadKind(): PadKind | null {
  if (!onSteam()) return null;
  let t = '';
  try { t = String(desk().steam.padType?.() ?? ''); } catch { t = ''; }
  if (/^PS\d/.test(t)) return 'playstation';
  if (/^Switch/.test(t)) return 'nintendo';
  if (t === 'SteamDeckController' || ((!t || t === 'Unknown') && onSteamDeck())) return 'deck';
  return t ? 'xbox' : null;
}

export function steamAchieve(id: string): void {
  try { if (onSteam()) desk().steam.achieve(id); } catch { /* the shell went away: the save still has it */ }
}
export function steamSync(ids: string[]): void {
  try { if (onSteam() && ids.length) desk().steam.sync(ids); } catch { /* as above */ }
}
