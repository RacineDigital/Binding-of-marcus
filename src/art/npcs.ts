// NPC and machine sprites.
import { PixelArt } from '../render/pixel';
import { ramp, hex } from '../render/color';
import { Sprite } from '../render/sprite';

function mott(f: number): PixelArt {
  // Mott the moth-headed peddler, hunched in a patched coat.
  const p = new PixelArt(30, 36);
  const coat = ramp('#6a4a36'), fur = ramp('#c8b48a'), eye = ramp('#2a2240');
  const bob = f % 2;
  p.ball(15, 26, 10, 9, coat, { dither: 0.6 });
  p.rect(6, 30, 18, 6, coat[1]);
  p.ball(9, 26, 2.5, 4, ramp('#8a6a4a')); // patch
  p.tube(8, 22, 5, 30, 2.2, coat); p.tube(22, 22, 25, 30, 2.2, coat);
  p.ball(15, 13 + bob, 8, 7, fur, { dither: 0.8 });
  p.ball(10, 12 + bob, 3.4, 3.8, eye); p.ball(20, 12 + bob, 3.4, 3.8, eye);
  p.set(9, 10 + bob, '#8a80c0'); p.set(19, 10 + bob, '#8a80c0');
  p.line(12, 6 + bob, 7, 0, fur[1]); p.line(18, 6 + bob, 23, 0, fur[1]);
  for (let i = 0; i < 4; i++) { p.set(8 - i * 0.5, 2 + i, fur[3]); p.set(22 + i * 0.5, 2 + i, fur[3]); }
  p.rect(12, 18 + bob, 6, 2, fur[3]);
  p.polish().outline(undefined, false, 0.85);
  return p;
}
function slot(f: number): PixelArt {
  const p = new PixelArt(26, 34);
  const m = ramp('#8a3a4a'), t = ramp('#c8a04a');
  p.rect(3, 6, 20, 26, m[2]); p.shadeV(3, 6, 20, 26, m);
  p.rect(3, 6, 20, 2, t[3]); p.rect(3, 30, 20, 2, m[0]);
  p.rect(6, 11, 14, 8, hex('#1a1216'));
  const sym = ['#e04a4a', '#e8c040', '#4a8ad8', '#5ab85a'];
  for (let i = 0; i < 3; i++) { const c = sym[(f + i * 2) % 4]; p.rect(7 + i * 4.5, 13, 3, 4, c); p.set(7 + i * 4.5, 13, '#ffffff'); }
  p.rect(9, 22, 8, 2, hex('#0a0808')); p.rect(8, 26, 10, 3, t[2]);
  p.line(24, 10, 24, 20, hex('#8a8a92')); p.ball(24, 9 - (f === 1 ? -6 : 0), 2, 2, ramp('#d04040'));
  p.rect(5, 2, 16, 4, t[2]); p.rect(6, 3, 14, 2, hex('#f0e0a0'));
  p.polish().outline(undefined, false, 0.85);
  return p;
}
function fortune(f: number): PixelArt {
  const p = new PixelArt(26, 38);
  const wood = ramp('#5a3a2a'), glass = ramp('#3a4a5a'), owl = ramp('#a88a5a');
  p.rect(3, 8, 20, 28, wood[2]); p.shadeV(3, 8, 20, 28, wood);
  p.rect(5, 10, 16, 14, glass[1]); p.rect(5, 10, 16, 1, glass[3]);
  p.ball(13, 18, 5, 5.5, owl); p.ball(11, 16, 1.6, 1.6, ramp('#f0d040')); p.ball(15, 16, 1.6, 1.6, ramp('#f0d040'));
  p.set(11, 16, '#1a1010'); p.set(15, 16, '#1a1010'); p.set(13, 18, '#e0a040');
  if (f === 1) { p.set(11, 16, '#f0d040'); p.set(15, 16, '#f0d040'); }
  p.rect(8, 27, 10, 3, hex('#0a0808')); p.rect(9, 31, 8, 2, hex('#c8a04a'));
  p.poly([3, 8, 13, 1, 23, 8], wood[3]);
  p.polish().outline(undefined, false, 0.85);
  return p;
}
function beggar(f: number): PixelArt {
  const p = new PixelArt(24, 26);
  const rag = ramp('#5a5448'), skin = ramp('#c8a080');
  p.ball(12, 18, 9, 7, rag, { dither: 0.8 });
  p.ball(12, 9 + (f % 2), 6, 6, rag);
  p.ball(12, 11 + (f % 2), 3.5, 3, ramp('#1a1614'));
  p.set(10, 11 + (f % 2), '#d0c0a0'); p.set(14, 11 + (f % 2), '#d0c0a0');
  p.tube(6, 18, 3, 21, 1.6, skin); p.ball(3, 22, 2.5, 1.8, ramp('#8a8a92'));
  p.polish().outline(undefined, false, 0.85);
  return p;
}
function well(): PixelArt {
  const p = new PixelArt(32, 30);
  const s = ramp('#6a6260'), wd = ramp('#5a3a24');
  p.ellipse(16, 22, 13, 6, s[1]); p.ellipse(16, 21, 12, 5, s[2]);
  p.ellipse(16, 20, 9, 3.5, hex('#0e1418')); p.set(13, 19, '#4a6a8a'); p.set(18, 20, '#4a6a8a');
  p.rect(4, 22, 24, 6, s[2]); for (let x = 4; x < 28; x += 6) p.rect(x, 22, 1, 6, s[0]);
  p.rect(4, 4, 2, 18, wd[2]); p.rect(26, 4, 2, 18, wd[1]);
  p.poly([2, 6, 16, 0, 30, 6, 28, 8, 16, 3, 4, 8], wd[3]);
  p.line(16, 5, 16, 14, hex('#8a7a5a')); p.rect(14, 14, 4, 3, wd[2]);
  p.polish().outline(undefined, false, 0.85);
  return p;
}
function seamstress(f: number): PixelArt {
  const p = new PixelArt(28, 36);
  const dress = ramp('#4a2a3a'), skin = ramp('#d8b8a0'), hair = ramp('#9a9aa8');
  p.poly([6, 36, 9, 18, 19, 18, 22, 36], dress[2]); p.shadeV(6, 18, 16, 18, dress);
  p.ball(14, 12, 5.5, 6, skin); p.ball(14, 8, 6.5, 4.5, hair); p.ball(14, 4, 3, 3, hair);
  p.set(12, 12, '#1a1010'); p.set(16, 12, '#1a1010');
  p.line(9, 22, 4, 26 + (f % 2), dress[1]); p.line(19, 22, 24, 24 - (f % 2), dress[1]);
  p.line(24, 24 - (f % 2), 26, 18 - (f % 2), hex('#e0e0e8'));
  p.rect(11, 16, 6, 1, hex('#c8a04a'));
  p.polish().outline(undefined, false, 0.85);
  return p;
}
function clock(f: number): PixelArt {
  const p = new PixelArt(22, 46);
  const wd = ramp('#4a2a1e'), br = ramp('#c8a04a');
  p.rect(3, 6, 16, 38, wd[2]); p.shadeV(3, 6, 16, 38, wd);
  p.poly([2, 8, 11, 0, 20, 8], wd[3]);
  p.ball(11, 13, 6, 6, ramp('#e8dcc0')); p.ring(11, 13, 6, br[2]);
  const a = (f / 4) * Math.PI * 2;
  p.line(11, 13, 11 + Math.cos(a) * 4, 13 + Math.sin(a) * 4, hex('#1a1010')); p.line(11, 13, 11, 9, hex('#1a1010'));
  p.rect(6, 22, 10, 18, hex('#1a1010'));
  const sw = Math.sin(a) * 3;
  p.line(11, 23, 11 + sw, 34, br[1]); p.ball(11 + sw, 35, 2.5, 2.5, br);
  p.polish().outline(undefined, false, 0.85);
  return p;
}

export interface NpcSprites { [k: string]: Sprite[] }
let cache: NpcSprites | null = null;
export function npcSprites(): NpcSprites {
  if (cache) return cache;
  const mk = (fn: (f: number) => PixelArt, n: number) => [...Array(n).keys()].map((f) => { const pa = fn(f); return new Sprite(pa, Math.floor(pa.w / 2), pa.h); });
  cache = {
    mott: mk(mott, 2), slot: mk(slot, 4), fortune: mk(fortune, 2), beggar: mk(beggar, 2), well: mk(() => well(), 1),
    seamstress: mk(seamstress, 2), clock: mk(clock, 4),
  };
  return cache;
}
