// Discord Rich Presence (desktop only): tells the desktop shell what you're doing every couple of seconds.
// The shell dedupes and rate-limits, so this can just report the current state.
import type { Game } from './game';
import { CHARACTERS } from '../player/characters';
import { MODE_NAMES, RunMode } from './progress';

export interface Presence { details?: string; state?: string; start?: number; small?: string; smallText?: string }

let acc = 0;
let runKey = '', runStart = 0;

export function updatePresence(g: Game, dt: number): void {
  const desk = (window as any).bomDesktop;
  if (!desk?.setPresence) return;
  acc += dt;
  if (acc < 2) return;
  acc = 0;
  if (g.save.data.settings.discord === false) { desk.setPresence(null); return; }
  desk.setPresence(describe(g));
}

function describe(g: Game): Presence {
  const w = g.world;
  if (!w || g.scene === 'menu') return { details: 'In the menus', state: 'Choosing a story' };
  const run = w.run;
  // the timer counts from the start of this run, and survives Continue
  const key = run.seed + ':' + run.charId;
  if (key !== runKey) { runKey = key; runStart = Date.now() - run.stats.time * 1000; }
  const ch = CHARACTERS.find((c) => c.id === run.charId)?.name ?? 'Marcus';
  const mode = run.challenge ? 'Challenge' : MODE_NAMES[run.mode as RunMode] ?? 'Normal';
  if (g.scene === 'ending') return { details: 'Bound the story', state: `${ch} · ${mode}`, start: runStart };
  if (g.scene === 'dead' || w.player.dead) return { details: 'Lost in ' + w.floor.label, state: `${ch} · ${mode}` };
  const boss = w.bossList.find((b) => !b.dead);
  return {
    details: w.floor.label,
    state: boss ? `Fighting ${boss.def.name}` : g.paused ? `Paused · ${ch}` : `${ch} · ${mode}`,
    start: runStart,
  };
}
