// Meta-progression: run scores, personal bests, daily runs and stat-based achievements.
import type { World } from './world';
import type { Run } from './run';
import type { SaveManager } from '../save/save';
import { RNG } from '../core/rng';
import { BOSSES } from '../bosses/registry';

export type RunMode = 'normal' | 'hard' | 'daily' | 'endless';
export const MODE_NAMES: Record<RunMode, string> = { normal: 'Normal', hard: 'Second Edition (Hard)', daily: 'Daily Run', endless: 'Endless' };

/** Score for a finished (or ended) run. Shown on the death and ending screens. */
export function runScore(run: Run, won: boolean): { total: number; parts: [string, number][] } {
  const s = run.stats;
  const parts: [string, number][] = [
    ['Chapters', run.floorIndex * 1500],
    ['Bosses', s.bossesKilled.length * 1000],
    ['Enemies', s.kills * 10],
    ['Rooms', s.roomsCleared * 25],
    ['Secrets', s.secretsFound * 300],
    ['Items', s.items.length * 75],
    ['Hurt', -Math.round(s.damageTaken * 25)],
  ];
  if (won) { parts.push(['The End', 10000]); parts.push(['Time bonus', Math.max(0, Math.round((3600 - s.time) * 3))]); }
  let total = parts.reduce((a, [, v]) => a + v, 0);
  if (run.mode === 'hard') { parts.push(['Hard x1.5', Math.round(total * 0.5)]); total = Math.round(total * 1.5); }
  return { total: Math.max(0, total), parts };
}

/** Record a finished run's score. Returns the previous best for comparison. */
export function recordScore(save: SaveManager, run: Run, won: boolean): { score: number; best: number; isBest: boolean } {
  const { total } = runScore(run, won);
  const key = run.mode === 'daily' ? 'best_daily_' + todayKey() : 'best_' + run.mode;
  const best = save.data.stats[key] ?? 0;
  if (total > best) { save.data.stats[key] = total; save.markDirty(); }
  // run history (newest first, last 30)
  const h = save.data.history ?? (save.data.history = []);
  h.unshift({ date: Date.now(), char: run.charId, mode: run.challenge ? 'challenge' : run.mode, seed: run.seed, floor: run.floorIndex, won, score: total, time: run.stats.time, cause: run.stats.deathCause, items: run.stats.items.slice(-16) });
  if (h.length > 30) h.length = 30;
  save.markDirty();
  return { score: total, best, isBest: total > best };
}

export function todayKey(d = new Date()): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
/** The same seed for everyone on a given calendar day. */
export function dailySeed(d = new Date()): string {
  const r = new RNG('daily:' + todayKey(d));
  const A = 'ABCDEFGHJKLMNPQRSTVWXYZ23456789';
  let s = ''; for (let i = 0; i < 8; i++) s += A[r.int(0, A.length - 1)];
  return s;
}

/** Achievements that depend on lifetime statistics or the current run state. Cheap to call often. */
export function checkProgress(w: World): void {
  const save = w.game.save, st = save.data.stats, pl = w.player;
  const at = (id: string, cond: boolean) => { if (cond && !save.isUnlocked(id)) save.unlock(id); };
  at('kills_250', (st.kills ?? 0) >= 250);
  at('kills_2000', (st.kills ?? 0) >= 2000);
  at('runs_5', (st.runs ?? 0) >= 5);
  at('runs_25', (st.runs ?? 0) >= 25);
  at('deaths_10', (st.deaths ?? 0) >= 10);
  at('buttons_500', (st.buttons ?? 0) >= 500);
  at('deals_3', (st.deals ?? 0) >= 3);
  at('secrets_25', (st.secretsFound ?? 0) >= 25);
  at('shop_10', (st.purchases ?? 0) >= 10);
  at('items_15', pl.itemOrder.length >= 15);
  at('dmg_20', pl.stats.damage >= 20);
  const bossIds = BOSSES.filter((b) => !['snipB', 'ratprince', 'blottedhalf'].includes(b.id)).map((b) => b.id);
  at('all_bosses', bossIds.every((id) => save.data.bossesBeaten.includes(id)));
}

/** Called when Marcus drops to the next chapter. */
export function onChapterCleared(w: World): void {
  const save = w.game.save;
  if (!w.run.flags.hitThisFloor) save.unlock('flawless_floor');
  const t = w.run.stats.time - (w.run.flags.floorStartTime ?? 0);
  if (t < 90) save.unlock('fast_floor');
}
