// Pickup sprites and HUD icons.
import { PixelArt } from '../render/pixel';
import { ramp, hex, darken, lighten } from '../render/color';
import { Sprite } from '../render/sprite';

function button(base: string, holes = 4): PixelArt {
  const p = new PixelArt(12, 12);
  const c = ramp(base);
  p.ball(6, 6, 4.6, 4.6, c, { dither: 0.3 });
  p.ring(6, 6, 3.2, c[1]);
  const hc = darken(c[0], 0.4);
  if (holes === 4) { p.set(5, 5, hc); p.set(7, 5, hc); p.set(5, 7, hc); p.set(7, 7, hc); }
  else { p.set(5, 6, hc); p.set(7, 6, hc); }
  p.set(3, 3, c[4]); p.set(4, 3, c[4]);
  p.polish().outline(undefined, false, 0.8);
  return p;
}
function key(gold = false): PixelArt {
  const p = new PixelArt(14, 12);
  const c = ramp(gold ? '#e0b040' : '#b8b4a8');
  p.ring(4, 5, 3.4, c[3], 2); p.set(4, 5, 0 as any);
  p.rect(7, 4, 6, 2, c[2]); p.rect(7, 4, 6, 1, c[3]);
  p.rect(10, 6, 1, 2, c[1]); p.rect(12, 6, 1, 3, c[1]);
  p.set(2, 3, c[4]);
  p.polish().outline(undefined, false, 0.8);
  return p;
}
function cherryBomb(big = false): PixelArt {
  const p = new PixelArt(14, 16);
  const c = ramp(big ? '#3a3a4a' : '#b8202a');
  const r = big ? 5.5 : 4.8;
  p.ball(7, 10, r, r, c, { dither: 0.4 });
  p.line(7, 5, 9, 2, hex('#4a6a2a')); p.set(10, 1, '#6a8a3a'); p.set(9, 1, '#6a8a3a');
  p.set(5, 7, c[4]); p.set(6, 7, lighten(c[4], 0.3));
  p.polish().outline(undefined, false, 0.8);
  return p;
}
export function heartIcon(kind: 'red' | 'wax' | 'ink' | 'brass' | 'empty' | 'gilded', half: 0 | 1 | 2): PixelArt {
  // 11x10 felt heart with stitching
  const p = new PixelArt(11, 10);
  const shape = (pp: PixelArt, col: string | number) => {
    pp.ellipse(3, 3, 2.9, 2.9, col); pp.ellipse(7.5, 3, 2.9, 2.9, col);
    pp.poly([0.2, 3.5, 10.8, 3.5, 5.5, 9.4], col);
  };
  if (kind === 'brass') {
    const c = ramp('#c8963a');
    p.poly([1, 1, 10, 1, 10, 5, 5.5, 9.5, 1, 5], c[2]);
    p.shadeV(1, 1, 10, 9, c, 0.5);
    p.rect(1, 1, 9, 1, c[4]); p.set(3, 3, c[4]); p.set(7, 3, c[4]); p.set(5, 6, c[1]);
    p.outline('#1a1008');
    return p;
  }
  const colors: Record<string, string> = { red: '#c8283a', wax: '#e6e0d0', ink: '#2a2650', empty: '#2a2228', gilded: '#c8283a' };
  const c = ramp(colors[kind]);
  const tmp = new PixelArt(11, 10);
  shape(tmp, c[2]);
  // shade
  tmp.map((v, x, y) => {
    const t = (x * 0.5 + y) / 11;
    return t < 0.25 ? c[4] : t < 0.5 ? c[3] : t < 0.85 ? c[2] : c[1];
  });
  if (kind === 'empty') tmp.map(() => hex('#2a2228'));
  if (half === 1) for (let y = 0; y < 10; y++) for (let x = 6; x < 11; x++) if (tmp.opaque(x, y)) tmp.set(x, y, kind === 'red' || kind === 'gilded' ? hex('#2a2228') : 0);
  p.stamp(tmp, 0, 0);
  if (kind !== 'empty') {
    // stitch marks
    const st = kind === 'ink' ? '#6a64b8' : kind === 'wax' ? '#b0a88a' : '#f0c0c0';
    p.paint(2, 2, st); p.paint(3, 1, st);
    if (half !== 1) p.paint(8, 2, darken(c[2], 0.25));
  }
  p.outline(kind === 'empty' ? '#120c10' : '#140a10');
  if (kind === 'gilded') { p.set(0, 3, '#f0c040'); p.set(10, 3, '#f0c040'); p.set(5, 9, '#f0c040'); p.set(1, 1, '#f0c040'); p.set(9, 1, '#f0c040'); }
  return p;
}
function heartPickup(kind: 'red' | 'wax' | 'ink' | 'brass' | 'gilded', half: 0 | 1): PixelArt {
  const p = new PixelArt(13, 12);
  p.stamp(heartIcon(kind, half ? 1 : 2), 1, 1);
  if (half) for (let y = 0; y < 12; y++) for (let x = 7; x < 13; x++) if (!(kind === 'brass')) p.clear(x, y);
  return p;
}
function spark(big: boolean): PixelArt {
  const p = new PixelArt(12, 16);
  const g = ramp('#8ab0c8');
  p.rect(2, 4, 8, 11, g[1]); p.rect(3, 5, 6, 9, lighten(g[1], 0.1));
  p.rect(3, 2, 6, 2, hex('#6a5a4a')); p.rect(3, 2, 6, 1, hex('#8a7a6a'));
  const y = ramp('#ffd040');
  p.line(7, 5, 5, 9, y[4]); p.line(5, 9, 7, 9, y[4]); p.line(7, 9, 5, 13, y[3]);
  if (big) { p.line(4, 6, 3, 8, y[2]); p.line(8, 10, 9, 12, y[2]); }
  p.set(3, 5, '#ffffff');
  p.polish().outline(undefined, false, 0.8);
  return p;
}
function page(): PixelArt {
  const p = new PixelArt(12, 14);
  const c = ramp('#e8dcc0');
  p.rect(1, 1, 10, 12, c[3]); p.rect(1, 12, 10, 1, c[1]); p.rect(10, 1, 1, 12, c[1]);
  p.set(9, 1, 0 as any); p.set(10, 2, 0 as any); p.set(9, 2, c[1]);
  for (let y = 4; y < 11; y += 2) p.rect(3, y, 5, 1, hex('#8a7a60'));
  p.rect(3, 3, 3, 1, hex('#a02a2a'));
  p.polish().outline(undefined, false, 0.8);
  return p;
}
export const SWEET_COLORS = ['#d84a4a', '#4a8ad8', '#e8c040', '#5ab85a', '#b85ad8', '#e8e0d0', '#e88a3a', '#3ab8b0', '#d86aa8', '#6a6a7a', '#8a5a3a', '#c8e0f0'];
function sweet(ci: number): PixelArt {
  const p = new PixelArt(14, 10);
  const c = ramp(SWEET_COLORS[ci % SWEET_COLORS.length]);
  const c2 = ramp(SWEET_COLORS[(ci * 5 + 3) % SWEET_COLORS.length]);
  p.ball(7, 5, 3.6, 3.2, c, { dither: 0.3 });
  p.poly([1, 2, 4, 5, 1, 8], c2[2]); p.poly([13, 2, 10, 5, 13, 8], c2[2]);
  p.set(6, 3, '#ffffff'); p.line(5, 5, 9, 5, c2[3]);
  p.polish().outline(undefined, false, 0.8);
  return p;
}
function chest(kind: 'tin' | 'locked' | 'crimson' | 'reliquary', open: boolean): PixelArt {
  const p = new PixelArt(20, 18);
  const base = kind === 'tin' ? '#8a8e96' : kind === 'locked' ? '#c89a3a' : kind === 'crimson' ? '#8a1e2a' : '#d8d0e0';
  const c = ramp(base);
  const trim = ramp(kind === 'crimson' ? '#2a1a1a' : kind === 'reliquary' ? '#c8a04a' : '#5a4a3a');
  p.rect(2, 8, 16, 9, c[2]); p.rect(2, 8, 16, 1, c[3]); p.rect(2, 16, 16, 1, c[0]);
  p.rect(2, 8, 1, 9, c[3]); p.rect(17, 8, 1, 9, c[1]);
  p.rect(2, 12, 16, 1, trim[2]);
  if (!open) {
    p.rect(1, 3, 18, 6, c[2]); p.rect(1, 3, 18, 1, c[4]); p.rect(1, 8, 18, 1, c[0]);
    p.rect(5, 3, 1, 6, trim[2]); p.rect(14, 3, 1, 6, trim[2]);
    if (kind !== 'tin') { p.rect(8, 7, 4, 4, trim[3]); p.set(9, 8, '#140c08'); p.set(10, 8, '#140c08'); }
    else { p.rect(9, 7, 2, 3, trim[3]); }
  } else {
    p.rect(1, 1, 18, 3, c[1]); p.rect(1, 1, 18, 1, c[3]);
    p.rect(3, 8, 14, 3, hex('#140c10'));
  }
  if (kind === 'reliquary') { p.set(10, 5, '#6ad0ff'); p.set(4, 14, '#6ad0ff'); p.set(15, 14, '#6ad0ff'); }
  if (kind === 'crimson') { p.set(9, 14, '#e0d0c0'); p.set(10, 14, '#e0d0c0'); p.set(9, 15, '#1a0a0a'); }
  p.polish().outline(undefined, false, 0.8);
  return p;
}
function pedestal(kind: string): PixelArt {
  const p = new PixelArt(22, 16);
  const base = kind === 'shop' ? '#6a4a2a' : kind === 'deal' ? '#1a1830' : kind === 'blessing' ? '#d8d0c4' : kind === 'gold' ? '#b8903a' : '#7a7078';
  const c = ramp(base);
  p.rect(3, 4, 16, 3, c[3]); p.rect(3, 4, 16, 1, c[4]);
  p.rect(5, 7, 12, 6, c[2]); p.rect(5, 7, 1, 6, c[3]); p.rect(16, 7, 1, 6, c[1]);
  p.rect(2, 13, 18, 3, c[1]); p.rect(2, 13, 18, 1, c[2]);
  if (kind === 'gold' || kind === 'treasure') { p.set(11, 9, '#f0d070'); p.set(10, 10, '#f0d070'); p.set(12, 10, '#f0d070'); p.set(11, 11, '#f0d070'); }
  if (kind === 'deal') { p.rect(9, 8, 4, 3, hex('#4a44a0')); }
  p.polish().outline(undefined, false, 0.8);
  return p;
}
function trapdoor(open: number): PixelArt {
  const p = new PixelArt(30, 24);
  const w = ramp('#5a3a24'), m = ramp('#3a3a42');
  p.rect(1, 2, 28, 20, m[1]); p.rect(2, 3, 26, 18, hex('#050304'));
  if (open < 1) {
    const h = Math.round(18 * (1 - open));
    p.rect(2, 3, 26, h, w[2]);
    for (let x = 2; x < 28; x += 5) p.rect(x, 3, 1, h, w[1]);
    p.rect(2, 3, 26, 1, w[3]);
    if (h > 8) { p.rect(12, 3 + Math.floor(h / 2), 6, 2, m[3]); }
  } else {
    for (let y = 0; y < 6; y++) p.rect(3, 4 + y * 3, 24, 1, hex('#1a1216'));
  }
  p.rect(1, 2, 28, 1, m[3]); p.rect(1, 21, 28, 1, m[0]);
  p.polish().outline(undefined, false, 0.8);
  return p;
}

export interface PickupSprites {
  button: Sprite; button5: Sprite; button10: Sprite; key: Sprite; goldKey: Sprite; bomb: Sprite; bomb2: Sprite; goldBomb: Sprite;
  heart: Sprite; heartHalf: Sprite; wax: Sprite; waxHalf: Sprite; ink: Sprite; brass: Sprite; gilded: Sprite;
  spark: Sprite; sparkBig: Sprite; page: Sprite; sweets: Sprite[];
  chest: Record<string, [Sprite, Sprite]>;
  pedestal: Record<string, Sprite>;
  trapdoor: Sprite[];
  hud: Record<string, Sprite>;
}
let cached: PickupSprites | null = null;
export function pickupSprites(): PickupSprites {
  if (cached) return cached;
  const s = (p: PixelArt, oy?: number) => new Sprite(p, Math.floor(p.w / 2), oy ?? p.h);
  cached = {
    button: s(button('#b87a44')), button5: s(button('#c8c8d8')), button10: s(button('#e8c040', 2)),
    key: s(key()), goldKey: s(key(true)), bomb: s(cherryBomb()), bomb2: s(cherryBomb()), goldBomb: s(cherryBomb(true)),
    heart: s(heartPickup('red', 0)), heartHalf: s(heartPickup('red', 1)), wax: s(heartPickup('wax', 0)), waxHalf: s(heartPickup('wax', 1)),
    ink: s(heartPickup('ink', 0)), brass: s(heartPickup('brass', 0)), gilded: s(heartPickup('gilded', 0)),
    spark: s(spark(false)), sparkBig: s(spark(true)), page: s(page()), sweets: SWEET_COLORS.map((_, i) => s(sweet(i))),
    chest: {
      tin: [s(chest('tin', false)), s(chest('tin', true))], locked: [s(chest('locked', false)), s(chest('locked', true))],
      crimson: [s(chest('crimson', false)), s(chest('crimson', true))], reliquary: [s(chest('reliquary', false)), s(chest('reliquary', true))],
    },
    pedestal: { treasure: s(pedestal('gold')), normal: s(pedestal('normal')), shop: s(pedestal('shop')), deal: s(pedestal('deal')), blessing: s(pedestal('blessing')) },
    trapdoor: [0, 0.33, 0.66, 1].map((o) => new Sprite(trapdoor(o), 15, 12)),
    hud: {
      red: new Sprite(heartIcon('red', 2), 0, 0), redHalf: new Sprite(heartIcon('red', 1), 0, 0), empty: new Sprite(heartIcon('empty', 0), 0, 0),
      wax: new Sprite(heartIcon('wax', 2), 0, 0), waxHalf: new Sprite(heartIcon('wax', 1), 0, 0),
      ink: new Sprite(heartIcon('ink', 2), 0, 0), inkHalf: new Sprite(heartIcon('ink', 1), 0, 0),
      brass: new Sprite(heartIcon('brass', 2), 0, 0), gilded: new Sprite(heartIcon('gilded', 2), 0, 0), gildedHalf: new Sprite(heartIcon('gilded', 1), 0, 0),
      button: new Sprite(button('#b87a44'), 0, 0), key: new Sprite(key(), 0, 0), bomb: new Sprite(cherryBomb(), 0, 0),
      goldKey: new Sprite(key(true), 0, 0), goldBomb: new Sprite(cherryBomb(true), 0, 0),
      page: new Sprite(page(), 0, 0), spark: new Sprite(spark(false), 0, 0),
    },
  };
  return cached;
}
