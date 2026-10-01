// Procedurally painted player rig: separate head (faces aim) and body (faces movement).
import { PixelArt } from '../render/pixel';
import { ramp, hex, darken, lighten } from '../render/color';
import { Sprite } from '../render/sprite';
import { CharacterLook } from './look';
import { buildHandSprites, HandRig } from './hand/build';
import * as HM from './hand/marcus';

const MARCUS_RIG: HandRig = {
  pal: HM.MARCUS_PAL,
  head: { down: HM.HEAD_DOWN, side: HM.HEAD_SIDE, up: HM.HEAD_UP },
  faces: { down: HM.FACE_DOWN, side: HM.FACE_SIDE },
  torso: { down: HM.TORSO_DOWN, up: HM.TORSO_UP, side: HM.TORSO_SIDE },
  legsFront: HM.LEGS_FRONT, legsSide: HM.LEGS_SIDE,
  sleeve: 'C', skin: 'S', outline: 'o',
};

export type HeadDir = 'down' | 'up' | 'side';
export type HeadState = 'normal' | 'fire' | 'hurt' | 'blink' | 'happy';
export interface PlayerSprites {
  head: Record<HeadDir, Record<HeadState, Sprite>>;
  body: Record<'down' | 'up' | 'side', Sprite[]>; // index 0 = idle, 1..6 walk
  bodyIdle: Record<'down' | 'up' | 'side', Sprite[]>; // breathing frames
  death: Sprite[];
  pickup: Sprite; // arms raised holding item
  portrait: Sprite;
}

const HW = 20, HH = 18;

function paintHead(L: CharacterLook, dir: HeadDir, st: HeadState): PixelArt {
  const p = new PixelArt(HW, HH);
  const skin = ramp(L.skin), hair = ramp(L.hair), eyeC = hex(L.eye);
  const cx = 10;
  const squash = st === 'fire' ? 1 : 0;
  const fy = 10 + squash * 0.5; // face center y
  const frx = 7 + squash * 0.6, fry = 6.3 - squash * 0.6;
  // back hair mass
  if (L.hairStyle !== 'bald' && L.hairStyle !== 'blot') {
    if (dir === 'side') p.ball(cx - 1.5, 8, 7.2, 6.4, hair, { dither: 0.6 });
    else p.ball(cx, 8, 8.2, 6.6, hair, { dither: 0.6 });
    if (L.hairStyle === 'bob') { p.ball(cx - 6, 12, 3, 4, hair); p.ball(cx + 6, 12, 3, 4, hair); }
    if (L.hairStyle === 'braid') {
      const bx = dir === 'side' ? cx - 8 : cx + 7;
      if (dir !== 'up') p.tube(bx, 10, bx + (dir === 'side' ? -1 : 1), 16, 1.6, hair);
      else { p.tube(cx - 7, 10, cx - 8, 16, 1.6, hair); }
    }
  }
  if (L.hairStyle === 'hood') p.ball(cx, 9, 9, 8, ramp(L.shirt));
  // ears
  if (dir === 'down') { p.ball(cx - 7.3, fy + 0.5, 1.6, 2, skin); p.ball(cx + 7.3, fy + 0.5, 1.6, 2, skin); }
  if (dir === 'up') { p.ball(cx - 7.6, fy, 1.6, 2, skin); p.ball(cx + 7.6, fy, 1.6, 2, skin); }
  // face
  if (dir !== 'up') {
    const fx = dir === 'side' ? cx + 1.5 : cx;
    if (L.hairStyle === 'blot') p.ball(fx, fy - 1, frx + 0.6, fry + 2, skin, { dither: 0.8 });
    else p.ball(fx, fy, frx, fry, skin, { dither: 0.35 });
    if (dir === 'side') { p.ball(cx - 3, fy + 0.5, 1.7, 2.1, skin); p.set(fx + frx, fy + 1, skin[2]); p.set(fx + frx - 0.2, fy + 2, skin[1]); }
  } else if (L.hairStyle === 'bald' || L.hairStyle === 'blot') {
    p.ball(cx, fy - 1, 7.5, 7.2, skin);
  }
  // bangs / fringe
  if (L.hairStyle === 'messy' || L.hairStyle === 'braid') {
    if (dir === 'down') {
      const pts = [2, 7, 3, 3, 7, 1.5, 12, 1.5, 17, 3.5, 18, 8, 16.5, 6, 15, 8.5, 13, 5.8, 11, 8, 9, 5.8, 7, 8.2, 5.5, 5.8, 3.6, 9];
      p.poly(pts, hair[2]);
      p.line(5, 3, 9, 2, hair[3]); p.line(10, 2, 13, 2.5, hair[4]); p.set(7, 4, hair[3]);
      p.line(3, 7, 5, 5, hair[1]); p.set(14, 6, hair[1]);
    } else if (dir === 'side') {
      const pts = [3, 9, 3, 3, 8, 1.2, 14, 1.5, 18, 4.5, 18.5, 7.5, 16.5, 6.4, 15, 8.8, 13.2, 6.2, 11, 8.5, 8, 6, 6.5, 11, 4, 12];
      p.poly(pts, hair[2]);
      p.line(7, 3, 12, 2, hair[3]); p.line(13, 2.5, 15, 3, hair[4]);
    } else {
      p.ball(cx, 8.5, 8, 7, hair, { dither: 0.7 });
      p.line(cx - 4, 4, cx - 5, 11, hair[1]); p.line(cx + 2, 3, cx + 3, 12, hair[1]); p.line(cx - 1, 5, cx - 1, 13, hair[3]);
    }
    // cowlick tuft
    p.line(cx + 1, 1.5, cx + 3, -0.5, hair[3]); p.set(cx + 4, 0, hair[4]); p.set(cx + 1, 0, hair[2]);
  } else if (L.hairStyle === 'bob') {
    if (dir === 'down') p.poly([2, 10, 3, 3, 8, 1.5, 12, 1.5, 17, 3, 18, 10, 16, 6.5, 4, 6.5], hair[2]);
    else if (dir === 'side') p.poly([2, 12, 3, 3, 9, 1.2, 16, 2, 18.5, 6, 12, 6, 7, 8, 6, 13], hair[2]);
    else p.ball(cx, 9, 8.5, 7.5, hair);
    p.line(5, 3, 12, 2, hair[4]);
  } else if (L.hairStyle === 'bald') {
    // wisps of white hair at the sides
    if (dir !== 'side') { p.ball(cx - 7, 8, 2, 3, hair); p.ball(cx + 7, 8, 2, 3, hair); }
    else p.ball(cx - 4, 8, 3, 3.5, hair);
  } else if (L.hairStyle === 'blot') {
    // drippy ink crown
    for (const [x, h] of [[4, 3], [7, 5], [11, 4], [15, 3]] as [number, number][]) p.tube(x, 4, x + 0.5, 4 - h * 0.5, 1.3, skin);
    p.set(8, 3, lighten(skin[2], 0.4)); p.set(9, 2, lighten(skin[2], 0.3));
  }
  if (L.beard && dir !== 'up') {
    const bx = dir === 'side' ? cx + 2 : cx;
    p.ball(bx, fy + 5, 5.2, 3.6, ramp(L.hair), { dither: 0.8 });
  }
  // eyes & face
  if (dir !== 'up') {
    const eyes: number[] = dir === 'down' ? [cx - 3.5, cx + 2.5] : [cx + 4];
    const ey = Math.round(fy - 0.5);
    for (const ex of eyes) {
      const x = Math.round(ex);
      if (st === 'blink') { p.set(x, ey + 1, eyeC); p.set(x + 1, ey + 1, eyeC); }
      else if (st === 'fire') { p.set(x, ey + 1, eyeC); p.set(x + 1, ey + 1, eyeC); p.set(x, ey, darken(skin[2], 0.3)); }
      else if (st === 'hurt') { p.set(x, ey, eyeC); p.set(x + 1, ey + 1, eyeC); p.set(x + 1, ey - 0, eyeC); p.set(x, ey + 1, eyeC); }
      else if (st === 'happy') { p.set(x, ey + 1, eyeC); p.set(x + 1, ey, eyeC); p.set(x + 2, ey + 1, eyeC); }
      else {
        p.rect(x, ey - 1, 2, 3, eyeC);
        p.set(x, ey - 1, L.hairStyle === 'blot' ? '#9fa0ff' : '#ffffff');
        if (L.hairStyle === 'blot') p.rect(x, ey - 1, 2, 3, '#f2f0ff'), p.set(x + 1, ey + 1, '#1a1830');
      }
      if (L.extra === 'glasses') { p.ring(x + 1, ey + 0.5, 2.6, '#c9b27a'); }
    }
    if (L.extra === 'glasses' && dir === 'down') p.line(cx - 1, ey, cx + 1, ey, '#c9b27a');
    // brows
    if (st === 'hurt' || st === 'fire') {
      for (const ex of eyes) p.line(Math.round(ex) - 0, ey - 3, Math.round(ex) + 1, ey - 2, darken(hex(L.hair), 0.1));
    }
    // mouth
    const mx = dir === 'down' ? cx - 1 : cx + 5;
    const my = Math.round(fy + 3.5);
    if (!L.beard) {
      if (st === 'fire') { p.rect(mx, my - 1, 2, 2, '#5a1e2a'); }
      else if (st === 'hurt') { p.rect(mx - 1, my - 1, 3, 2, '#5a1e2a'); p.set(mx, my - 1, '#ffffff'); }
      else if (st === 'happy') { p.line(mx - 1, my - 1, mx + 2, my - 1, '#5a1e2a'); p.set(mx, my, '#5a1e2a'); p.set(mx + 1, my, '#5a1e2a'); }
      else p.line(mx, my, mx + 1, my, darken(skin[1], 0.35));
    }
    // cheeks / freckles
    if (L.hairStyle !== 'blot') {
      const fr = darken(skin[2], 0.18);
      if (dir === 'down') { p.set(cx - 5, fy + 2, fr); p.set(cx - 4, fy + 3, fr); p.set(cx + 4, fy + 2, fr); p.set(cx + 5, fy + 3, fr); }
      else p.set(cx + 2, fy + 2, fr), p.set(cx + 3, fy + 3, fr);
    }
    if (L.extra === 'ink') {
      const ix = dir === 'down' ? cx + 4 : cx + 1;
      p.set(ix, fy + 2, '#2b2f66'); p.set(ix + 1, fy + 2, '#3d4290'); p.set(ix + 1, fy + 3, '#2b2f66');
    }
    if (L.extra === 'bandage') {
      const bx = dir === 'down' ? cx - 5 : cx + 1;
      p.rect(bx, fy + 1, 3, 2, '#efe3c8'); p.set(bx + 1, fy + 1, '#d8c7a0');
    }
  }
  p.outline('#1e1018');
  return p;
}

const BW = 18, BH = 13;
function paintBody(L: CharacterLook, dir: 'down' | 'up' | 'side', frame: number, idle = -1): PixelArt {
  const p = new PixelArt(BW, BH);
  const shirt = ramp(L.shirt), skin = ramp(L.skin), shorts = ramp(L.shorts), shoe = ramp(L.shoe);
  const trim = hex(L.trim);
  const cx = 9;
  // walk phase
  const ph = frame === 0 ? 0 : ((frame - 1) / 6) * Math.PI * 2;
  const s = Math.sin(ph);
  const bob = frame === 0 ? (idle === 1 ? 1 : 0) : (Math.abs(Math.cos(ph)) > 0.7 ? 0 : 1) ;
  const top = 1 + bob;
  // legs
  if (dir === 'side') {
    const a = s * 3;
    const legs: [number, number, string][] = [[cx - 1 + a, 1, L.sockR], [cx - 1 - a, 0, L.sockL]];
    for (const [lx, back, sock] of legs) {
      const lc = back ? darken(hex(L.skin), 0.15) : hex(L.skin);
      p.line(cx - 1, 9, lx, 10, lc, 1); p.line(cx, 9, lx + 1, 10, lc, 1);
      p.rect(lx, 10, 2, 1, sock);
      p.rect(lx, 11, 3, 1.5, back ? shoe[1] : shoe[2]); p.set(lx + 2, 11, shoe[3]);
    }
  } else {
    const liftL = frame === 0 ? 0 : Math.max(0, s) > 0.3 ? 1 : 0;
    const liftR = frame === 0 ? 0 : Math.max(0, -s) > 0.3 ? 1 : 0;
    const legs: [number, number, string][] = [[cx - 4, liftL, L.sockL], [cx + 1, liftR, L.sockR]];
    for (const [lx, lift, sock] of legs) {
      p.rect(lx + 1, 9 - lift, 2, 1, L.skin);
      p.rect(lx + 1, 10 - lift, 2, 1, sock);
      if (sock === '#e8e2d4') p.set(lx + 2, 10 - lift, '#b9b2a4');
      p.rect(lx, 11 - lift, 4, 2, shoe[2]); p.set(lx + (dir === 'up' ? 0 : 3), 11 - lift, shoe[3]);
      p.rect(lx, 12 - lift, 4, 1, shoe[1]);
    }
  }
  // shorts
  if (dir === 'side') p.rect(cx - 3, 7 + bob, 7, 2.5, shorts[2]);
  else { p.rect(cx - 5, 7 + bob, 10, 2.5, shorts[2]); p.rect(cx - 1, 8 + bob, 1, 2, shorts[1]); }
  // torso (oversized cardigan)
  if (dir === 'side') {
    p.poly([cx - 4, top, cx + 3, top, cx + 5, 8 + bob, cx - 5, 8 + bob], shirt[2]);
    p.shadeV(cx - 5, top, 11, 8, shirt, 0.5);
    p.line(cx + 3, top + 1, cx + 4, 7 + bob, shirt[3]);
    // swinging arm
    const ax = cx - s * 2.5;
    p.tube(cx, top + 1.5, ax, 6.5 + bob, 1.6, shirt);
    p.set(Math.round(ax), 7.5 + bob, L.skin); p.set(Math.round(ax) + 1, 7.5 + bob, skin[1]);
    p.line(cx - 4, 7 + bob, cx + 4, 7 + bob, trim);
  } else {
    p.poly([cx - 5, top, cx + 5, top, cx + 7, 8 + bob, cx - 7, 8 + bob], shirt[2]);
    p.shadeV(cx - 7, top, 14, 8, shirt, 0.5);
    // sleeves
    const sw = frame === 0 ? 0 : s * 0.8;
    p.tube(cx - 5, top + 1, cx - 7, 6.5 + bob + sw, 1.7, shirt);
    p.tube(cx + 5, top + 1, cx + 7, 6.5 + bob - sw, 1.7, shirt);
    p.rect(cx - 8, 7.5 + bob + sw, 2, 1, L.skin); p.rect(cx + 7, 7.5 + bob - sw, 2, 1, L.skin);
    p.line(cx - 6, 7 + bob, cx + 6, 7 + bob, trim);
    if (dir === 'down') {
      // placket and buttons, elbow patch hint
      p.line(cx, top, cx, 7 + bob, shirt[1]);
      p.set(cx + 1, top + 2, trim); p.set(cx + 1, top + 4, trim); p.set(cx + 1, top + 6, trim);
      p.set(cx - 1, top, skin[2]); p.set(cx, top, skin[1]); p.set(cx + 1, top, skin[2]);
      // pocket
      p.rect(cx - 4, top + 4, 2, 2, shirt[1]); p.set(cx - 4, top + 4, shirt[3]);
    } else {
      p.line(cx - 3, top + 3, cx + 3, top + 3, shirt[1]);
      p.set(cx - 2, top + 5, shirt[3]); p.set(cx + 2, top + 5, shirt[3]);
    }
  }
  if (L.ghost) p.map((c, x, y) => (y > 10 ? ((x + y) % 2 ? 0 : c) : c));
  p.outline('#1e1018');
  return p;
}

function paintDeath(L: CharacterLook, f: number): PixelArt {
  // Marcus collapses and dissolves into an ink puddle.
  const p = new PixelArt(30, 20);
  const k = f / 5;
  const pud = ramp('#262a5c');
  p.ball(15, 16, 5 + k * 9, 2 + k * 2.2, pud, { dither: 0.8 });
  if (f < 5) {
    const body = paintBody(L, 'down', 0);
    const head = paintHead(L, 'down', 'hurt');
    const sink = Math.floor(k * 12);
    const tmp = new PixelArt(30, 34);
    tmp.stamp(body, 6, 19); tmp.stamp(head, 5, 4);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
      const sy = y + 14 - sink; if (sy < 0 || sy >= 34) continue;
      const v = tmp.get(x, sy); if (v && y < 16) p.set(x, y, v);
    }
  }
  if (f >= 4) { p.set(12, 15, '#ffffff'); p.set(18, 15, '#ffffff'); }
  return p;
}

export function buildPlayerSprites(L: CharacterLook): PlayerSprites {
  if (L.hand === 'marcus') return buildHandSprites(MARCUS_RIG);
  const states: HeadState[] = ['normal', 'fire', 'hurt', 'blink', 'happy'];
  const head = {} as PlayerSprites['head'];
  for (const d of ['down', 'up', 'side'] as HeadDir[]) {
    head[d] = {} as Record<HeadState, Sprite>;
    for (const s of states) head[d][s] = new Sprite(paintHead(L, d, s), HW / 2, HH);
  }
  const body = {} as PlayerSprites['body'];
  const bodyIdle = {} as PlayerSprites['bodyIdle'];
  for (const d of ['down', 'up', 'side'] as const) {
    body[d] = [];
    for (let f = 0; f <= 6; f++) body[d].push(new Sprite(paintBody(L, d, f), BW / 2, BH));
    bodyIdle[d] = [new Sprite(paintBody(L, d, 0, 0), BW / 2, BH), new Sprite(paintBody(L, d, 0, 1), BW / 2, BH)];
  }
  const death: Sprite[] = [];
  for (let f = 0; f < 6; f++) death.push(new Sprite(paintDeath(L, f), 15, 18));
  // pickup pose: arms up
  const pk = new PixelArt(BW, BH + 6);
  const b = paintBody(L, 'down', 0);
  pk.stamp(b, 0, 6);
  const shirt = ramp(L.shirt);
  pk.tube(4, 8, 2, 2, 1.7, shirt); pk.tube(14, 8, 16, 2, 1.7, shirt);
  pk.rect(1, 0, 2, 2, L.skin); pk.rect(15, 0, 2, 2, L.skin);
  pk.outline('#1e1018');
  const pickup = new Sprite(pk, BW / 2, BH + 6);
  // portrait (large head for menus)
  const portrait = new Sprite(paintHead(L, 'down', 'normal'), HW / 2, HH);
  return { head, body, bodyIdle, death, pickup, portrait };
}
