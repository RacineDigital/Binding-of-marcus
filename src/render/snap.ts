// Sub-pixel drawing. The world is drawn at SUB device pixels per art pixel, so things move a
// screen pixel at a time (like Isaac) instead of jumping a whole chunky art pixel. Art stays chunky:
// only positions get the finer grid.
export let SUB = 1;
export function setSub(k: number): void { SUB = Math.max(1, Math.round(k)); }
/** Round a world-space draw position to the nearest screen pixel. */
export function snap(v: number): number { return Math.round(v * SUB) / SUB; }
