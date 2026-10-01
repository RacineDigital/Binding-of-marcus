// Render interpolation. The simulation runs at a fixed 60 Hz; on high refresh-rate displays
// (120/144/165/240 Hz) each rendered frame blends every moving thing between its previous and
// current simulated position, so motion is smooth instead of repeating frames.
import type { World } from './world';

/** Anything with a position that the renderer draws. `_ix/_iy/_iz` hold the previous step's position. */
interface Mover { x: number; y: number; z?: number; _ix?: number; _iy?: number; _iz?: number }

/** Max distance (px) we blend across; anything that moved further was teleported or respawned. */
const SNAP = 40;

function snapList(list: Mover[]): void {
  for (let i = 0; i < list.length; i++) { const o = list[i]; o._ix = o.x; o._iy = o.y; o._iz = o.z; }
}
function snapActive(list: (Mover & { active: boolean })[]): void {
  for (let i = 0; i < list.length; i++) { const o = list[i]; if (o.active) { o._ix = o.x; o._iy = o.y; o._iz = o.z; } }
}

/** Record positions at the start of a simulation step. */
export function snapshotWorld(w: World): void {
  const pl = w.player as unknown as Mover;
  pl._ix = pl.x; pl._iy = pl.y; pl._iz = pl.z;
  snapList(w.enemies as unknown as Mover[]);
  snapList(w.pickups as unknown as Mover[]);
  snapList(w.bombs as unknown as Mover[]);
  snapList(w.npcs as unknown as Mover[]);
  snapList(w.familiars as unknown as Mover[]);
  snapActive(w.proj.list as unknown as (Mover & { active: boolean })[]);
  snapActive(w.fx.parts as unknown as (Mover & { active: boolean })[]);
  w.icamX = w.camX; w.icamY = w.camY;
}

// Saved true positions while the interpolated ones are swapped in for drawing.
const saved: number[] = [];
const touched: Mover[] = [];

function blend(o: Mover, a: number): void {
  const px = o._ix, py = o._iy;
  if (px === undefined || py === undefined) return;
  const dx = o.x - px, dy = o.y - py;
  if (dx === 0 && dy === 0 && (o.z === undefined || o.z === o._iz)) return;
  if (dx * dx + dy * dy > SNAP * SNAP) return;
  touched.push(o); saved.push(o.x, o.y, o.z ?? 0);
  o.x = px + dx * a; o.y = py + dy * a;
  if (o.z !== undefined && o._iz !== undefined) o.z = o._iz + (o.z - o._iz) * a;
}

/** Swap interpolated positions in for rendering. Always pair with restoreInterp(). */
export function applyInterp(w: World, a: number): void {
  touched.length = 0; saved.length = 0;
  w.renderCamX = w.camX; w.renderCamY = w.camY;
  if (a >= 1) return;
  blend(w.player as unknown as Mover, a);
  for (const o of w.enemies) blend(o as unknown as Mover, a);
  for (const o of w.pickups) blend(o as unknown as Mover, a);
  for (const o of w.bombs) blend(o as unknown as Mover, a);
  for (const o of w.npcs) blend(o as unknown as Mover, a);
  for (const o of w.familiars) blend(o as unknown as Mover, a);
  for (const o of w.proj.list) if (o.active) blend(o as unknown as Mover, a);
  for (const o of w.fx.parts) if (o.active) blend(o as unknown as Mover, a);
  if (Math.abs(w.camX - w.icamX) < 60 && Math.abs(w.camY - w.icamY) < 60) {
    w.renderCamX = w.icamX + (w.camX - w.icamX) * a; w.renderCamY = w.icamY + (w.camY - w.icamY) * a;
  }
}

export function restoreInterp(): void {
  for (let i = 0; i < touched.length; i++) {
    const o = touched[i];
    o.x = saved[i * 3]; o.y = saved[i * 3 + 1];
    if (o.z !== undefined) o.z = saved[i * 3 + 2];
  }
  touched.length = 0; saved.length = 0;
}

/** Call when a pooled object is (re)spawned so it does not blend from its previous life. */
export function resetInterp(o: Mover): void { o._ix = undefined; o._iy = undefined; o._iz = undefined; }
