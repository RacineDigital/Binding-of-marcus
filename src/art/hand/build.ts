// Assembles hand-drawn character grids into the PlayerSprites rig used by the player renderer.
import { PixelArt } from '../../render/pixel';
import { Sprite } from '../../render/sprite';
import { grid, Palette } from '../grid';
import type { PlayerSprites, HeadDir, HeadState } from '../marcus';
import { ramp, mix, hex } from '../../render/color';

export interface HandRig {
  pal: Palette;
  head: Record<HeadDir, string[]>;
  faces: Partial<Record<HeadDir, Record<string, [number, string[]]>>>;
  torso: Record<'down' | 'up' | 'side', string[]>;
  legsFront: { idle: string[]; leftUp: string[]; rightUp: string[] };
  legsSide: { idle: string[]; strideA: string[]; strideB: string[] };
  /** Legs held still while flying. */
  legsFly?: { front: string[]; side: string[] };
  /** Palette keys for raised arms in the pickup pose. */
  sleeve: string; skin: string; outline: string;
  /** Ghosts fade out below the knee. */
  ghost?: boolean;
}

const BW = 18, BH = 13;
/**
 * The walk cycle: eight frames per stride pair, and how far the torso (and the head with it) dips on
 * each. The dip lasts two frames around each footfall, so the bob reads as weight, not a twitch.
 */
export const WALK_FRAMES = 8;
export const WALK_BOB = [0, 0, 1, 1, 0, 0, 1, 1];
/** Pixels walked per walk frame (a full cycle is 40px: about two and a half strides a second). */
export const WALK_STEP = 5;

function withFace(base: string[], f?: [number, string[]]): string[] {
  if (!f) return base;
  return base.map((r, i) => (i >= f[0] && i < f[0] + f[1].length ? f[1][i - f[0]] : r));
}

function bodyArt(R: HandRig, dir: 'down' | 'up' | 'side', legs: string[], bob: number): PixelArt {
  const p = new PixelArt(BW, BH);
  const L = grid(legs, R.pal, 'legs'), T = grid(R.torso[dir], R.pal, 'torso');
  p.stamp(L, 0, BH - L.h);
  p.stamp(T, 0, bob);
  // Tailoring details remain attached to the torso as it bobs: collar, centre seam and cuff stitches.
  const seam = hex(R.pal[R.outline]), stitch = hex(R.pal[R.skin]);
  for (const x of [7, 10]) p.paint(x, bob + 2, mix(p.get(x, bob + 2), hex('#f2d7a8'), 0.2));
  for (let y = 3; y < 8; y++) p.paint(dir === 'side' ? 10 : 8, bob + y, mix(p.get(dir === 'side' ? 10 : 8, bob + y), seam, 0.25));
  for (const x of [3, 14]) { p.paint(x, bob + 5, mix(p.get(x, bob + 5), stitch, 0.24)); }
  if (R.ghost) for (let y = BH - 4; y < BH; y++) for (let x = 0; x < BW; x++) if ((x + y) % 2 || y === BH - 1) p.clear(x, y);
  return p;
}

export function buildHandSprites(R: HandRig): PlayerSprites {
  const states: HeadState[] = ['normal', 'fire', 'hurt', 'blink', 'happy'];
  const head = {} as PlayerSprites['head'];
  const headArt = (d: HeadDir, s: HeadState) => grid(withFace(R.head[d], s === 'normal' ? undefined : R.faces[d]?.[s]), R.pal, `head-${d}-${s}`);
  for (const d of ['down', 'up', 'side'] as HeadDir[]) {
    head[d] = {} as Record<HeadState, Sprite>;
    for (const s of states) { const a = headArt(d, s); head[d][s] = new Sprite(a, Math.floor(a.w / 2), a.h); }
  }
  const body = {} as PlayerSprites['body'];
  const bodyIdle = {} as PlayerSprites['bodyIdle'];
  const fly = {} as PlayerSprites['fly'];
  const F = R.legsFront, Sd = R.legsSide;
  // frame 0 is standing; 1..8 are the walk: a foot up for three frames, both down, the other foot
  const seq = {
    down: [F.idle, F.leftUp, F.leftUp, F.leftUp, F.idle, F.rightUp, F.rightUp, F.rightUp, F.idle],
    up: [F.idle, F.rightUp, F.rightUp, F.rightUp, F.idle, F.leftUp, F.leftUp, F.leftUp, F.idle],
    side: [Sd.idle, Sd.strideA, Sd.strideA, Sd.strideA, Sd.idle, Sd.strideB, Sd.strideB, Sd.strideB, Sd.idle],
  };
  const bob = [0, ...WALK_BOB];
  for (const d of ['down', 'up', 'side'] as const) {
    body[d] = seq[d].map((legs, i) => new Sprite(bodyArt(R, d, legs, bob[i]), BW / 2, BH));
    const legsIdle = d === 'side' ? Sd.idle : F.idle;
    bodyIdle[d] = [new Sprite(bodyArt(R, d, legsIdle, 0), BW / 2, BH), new Sprite(bodyArt(R, d, legsIdle, 1), BW / 2, BH)];
    const fl = R.legsFly ? (d === 'side' ? R.legsFly.side : R.legsFly.front) : legsIdle;
    fly[d] = [new Sprite(bodyArt(R, d, fl, 0), BW / 2, BH), new Sprite(bodyArt(R, d, fl, 1), BW / 2, BH)];
  }
  // pickup pose: both arms raised over the head
  const pk = new PixelArt(BW, BH + 6);
  pk.stamp(bodyArt(R, 'down', F.idle, 0), 0, 6);
  const sl = R.pal[R.sleeve], sk = R.pal[R.skin], ol = R.pal[R.outline];
  for (const x of [2, 15]) {
    for (let y = 6; y < 13; y++) { pk.set(x - 1, y, ol); pk.set(x, y, sl); pk.set(x + 1, y, sl); pk.set(x + 2, y, ol); }
    for (let y = 0; y < 7; y++) { pk.set(x - 1, y + 1, ol); pk.set(x, y + 1, sl); pk.set(x + 1, y + 1, sl); pk.set(x + 2, y + 1, ol); }
    pk.set(x, 0, sk); pk.set(x + 1, 0, sk); pk.set(x, 1, sk); pk.set(x + 1, 1, sk);
    pk.set(x - 1, 0, ol); pk.set(x + 2, 0, ol);
  }
  const pickup = new Sprite(pk, BW / 2, BH + 6);
  // death: Marcus folds into a spreading ink puddle
  const death: Sprite[] = [];
  const full = new PixelArt(22, 34);
  full.stamp(bodyArt(R, 'down', F.idle, 0), 2, 21);
  full.stamp(headArt('down', 'hurt'), 1, 0 + 2);
  const pud = ramp('#262a5c');
  for (let f = 0; f < 6; f++) {
    const k = f / 5;
    const p = new PixelArt(32, 22);
    p.ball(16, 18, 5 + k * 10, 2 + k * 2.4, pud, { dither: 0.8 });
    if (f < 5) {
      const sink = Math.floor(k * 16);
      for (let y = 0; y < 18; y++) for (let x = 0; x < 22; x++) {
        const sy = y + 16 - sink; if (sy < 0 || sy >= 34) continue;
        const v = full.get(x, sy); if (v) p.set(x + 5, y, v);
      }
    }
    if (f >= 4) { p.set(13, 17, '#ffffff'); p.set(19, 17, '#ffffff'); }
    death.push(new Sprite(p, 16, 20));
  }
  const portrait = head.down.normal;
  return { head, body, bodyIdle, fly, death, pickup, portrait };
}
