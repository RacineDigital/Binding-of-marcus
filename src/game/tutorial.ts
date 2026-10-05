// First-run hints: a short card at the top of the screen on a new player's first few runs, one
// thing at a time (move, fire, doors, bombs, the map, active items, pages), ticked off as soon as
// they actually do it. Each one is remembered in the save, so it never comes back; existing
// players with a few runs behind them never see any of it. Off in Options -> Tutorial hints.
import type { World } from './world';
import { bindLabel, type Action } from '../core/input';

interface Step {
  id: string;
  /** Only shown once this is true (default: always). */
  when?: (w: World, s: TutState) => boolean;
  text: (w: World) => string;
  done: (w: World, s: TutState) => boolean;
}
interface TutState { moved: number; fired: number; rooms: number; lastRoom: number; cur: Step | null; doneT: number; doneText: string }

const pad = (w: World) => w.game.input.usingPad;
const keys = (as: Action[]) => as.map(bindLabel).join(' ');
const STEPS: Step[] = [
  { id: 'move', text: (w) => `Move with ${pad(w) ? 'the left stick' : keys(['moveUp', 'moveLeft', 'moveDown', 'moveRight'])}`, done: (_, s) => s.moved > 50 },
  { id: 'fire', text: (w) => `Fire with ${pad(w) ? 'the right stick' : keys(['shootUp', 'shootLeft', 'shootDown', 'shootRight'])}`, done: (_, s) => s.fired > 0.6 },
  { id: 'door', text: () => 'Walk through a door. Doors lock until every enemy in the room is beaten', done: (_, s) => s.rooms >= 2 },
  { id: 'bomb', when: (w) => w.player.bombs > 0 && w.room.cleared && w.room.type === 'normal',
    text: () => `${bindLabel('bomb')}: drop a cherry bomb. Bombs break rocks and open hidden walls`, done: (w) => w.game.input.wasPressed('bomb') },
  { id: 'map', when: (_, s) => s.rooms >= 3, text: () => `Hold ${bindLabel('map')} for the map and what your items do`, done: (w) => w.hud.fullMap },
  { id: 'active', when: (w) => !!w.player.active, text: () => `${bindLabel('active')}: use your active item. It recharges as you clear rooms`, done: (w) => w.game.input.wasPressed('active') },
  { id: 'page', when: (w) => w.player.consumables.length > 0, text: () => `${bindLabel('consumable')}: use a torn page or a sweet`, done: (w) => w.game.input.wasPressed('consumable') },
];
const state = new WeakMap<World, TutState>();

function enabled(w: World): boolean {
  const sv = w.game.save, d = sv.data;
  if (d.settings.tutorial === false || w.run.challenge || w.run.mode === 'daily') return false;
  return (d.stats.runs ?? 0) <= 3 && STEPS.some((st) => !d.tutorial?.includes(st.id));
}

export function tutorialTick(w: World, dt: number): void {
  let s = state.get(w);
  if (!s) state.set(w, (s = { moved: 0, fired: 0, rooms: 0, lastRoom: -1, cur: null, doneT: 0, doneText: '' }));
  s.doneT = Math.max(0, s.doneT - dt);
  if (!enabled(w) || w.inputLocked()) return;
  const pl = w.player, inp = w.game.input, d = w.game.save.data;
  s.moved += Math.hypot(pl.vx, pl.vy) * dt;
  if (['shootUp', 'shootDown', 'shootLeft', 'shootRight'].some((a) => inp.isDown(a as Action)) || (pad(w) && Math.hypot(inp.padAxes[2], inp.padAxes[3]) > 0.4)) s.fired += dt;
  if (w.room.id !== s.lastRoom) { s.lastRoom = w.room.id; s.rooms++; }
  const seen = (d.tutorial ??= []);
  s.cur = STEPS.find((st) => !seen.includes(st.id) && (!st.when || st.when(w, s!))) ?? null;
  if (s.cur && s.cur.done(w, s)) {
    seen.push(s.cur.id); w.game.save.markDirty();
    s.doneText = s.cur.text(w); s.doneT = 1.1; s.cur = null;
    w.audio.play('pageGet', { vol: 0.35, pitch: 1.3 });
  }
}

/** What the hint card should say right now, if anything (and whether it's the tick of one just done). */
export function tutorialLine(w: World): { text: string; done: boolean } | null {
  const s = state.get(w);
  if (!s) return null;
  if (s.doneT > 0) return { text: s.doneText, done: true };
  if (!s.cur || !enabled(w) || w.inputLocked()) return null;
  return { text: s.cur.text(w), done: false };
}
