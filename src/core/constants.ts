// Global layout constants. The world renders into a VIEW_W x VIEW_H low-res buffer.
export const VIEW_W = 480;
export const VIEW_H = 270;
export const TILE = 24;
/** Interior grid of a 1x1 room (columns x rows). */
export const ROOM_COLS = 15;
export const ROOM_ROWS = 9;
/** Extra columns/rows added per additional cell for large rooms. */
export const BIG_EXTRA_COLS = 20; // 15*2+5 = 35
export const BIG_EXTRA_ROWS = 11; // 9+11 = 20
export const FIXED_DT = 1 / 60;
export const MAP_SIZE = 13;

export function roomCols(cw: number): number { return cw === 1 ? ROOM_COLS : ROOM_COLS + BIG_EXTRA_COLS; }
export function roomRows(ch: number): number { return ch === 1 ? ROOM_ROWS : ROOM_ROWS + BIG_EXTRA_ROWS; }

/** Marcus's hurt capsule, measured against his sprite: spine from 17px up (chin) to 6px up (hips). */
export const HURT_TOP = 17, HURT_BOT = 6, HURT_R = 4;
/** The game's version (kept in step with package.json by the test suite). */
export const GAME_VERSION = '3.13.0';
