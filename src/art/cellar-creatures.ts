// Opening-chapter creatures: articulated bodies and distinct materials instead of round blobs.
import { frames, eye, teeth, ramp, PixelArt } from './creature';
import type { SpriteSet } from '../enemies/enemy';
const TAU = Math.PI * 2;
const flesh = ramp('#bc6c72'), bone = ramp('#dfc9a1'), ink = ramp('#49479b');

function gasper(p: PixelArt, f: number, n: number, swell = 0, spit = false): void {
  const breath = Math.sin(f / n * TAU) * 0.4, y = 12 + breath;
  // Thin feet and folded haunches support a heavy, asymmetrical breathing sac.
  for (const x of [7, 16]) { p.tube(x, 18, x - 1, 23, 1.5, flesh); p.line(x - 2, 23, x + 1, 23, '#d7ad92'); }
  p.ball(11, y, 8 + swell, 9 - (spit ? 2 : 0), flesh, { bias: -0.05 });
  p.ball(8, y + 2, 4, 5, ramp('#994754'));
  // Raised rib folds and throat slits; highlights belong to flesh, not flat eye-white discs.
  for (let i = 0; i < 4; i++) {
    p.line(4, 12 + i * 2, 7, 13 + i * 2, '#6b3346');
    p.line(5, 12 + i * 2, 7, 12 + i * 2, '#dd9690');
  }
  p.ellipse(8, 7 + breath, 3.2, 2.3, '#4a2433'); p.ellipse(15, 6 + breath, 2.8, 2.5, '#4a2433');
  eye(p, 8, 7 + breath, 1.4, 0, 0, '#bd992f', '#d8baa2');
  eye(p, 15, 6 + breath, 1.3, 0, 0, '#bd992f', '#d8baa2');
  p.line(5, 4, 10, 5, '#e8aaa0'); p.line(13, 4, 17, 3, '#e8aaa0');
  const open = spit ? 1 : swell ? 0.75 : 0.35;
  p.ellipse(12, 15, 4, 2 + open * 2, '#6d2739'); teeth(p, 9, 13, 7, 5, open);
  p.set(11, 16 + open * 2, '#c6636c'); p.set(13, 17 + open, '#da7b7a');
  if (swell) p.line(18, 11, 18, 16, '#edb2a0');
}
function rag(p: PixelArt, f: number, n: number): void {
  const step = Math.sin(f / n * TAU), cloth = ramp('#80715d');
  for (const [x, sign] of [[6, -1], [20, 1]]) {
    p.tube(x, 12, x + sign * 3, 15 + step * sign, 1.1, bone);
    p.line(x + sign * 3, 15 + step * sign, x + sign * 5, 17, '#bfa58a');
    for (let i = 0; i < 3; i++) p.line(x + sign * 5, 17, x + sign * (5 + i), 18 - i, '#deceb1');
  }
  p.ball(15, 10 + step * 0.4, 10, 7, cloth);
  // Cloth overlaps in bands, with an exposed shoulder and a trailing frayed seam.
  for (let i = 0; i < 4; i++) {
    p.line(9 + i * 3, 5, 8 + i * 3, 15, '#4c443d'); p.line(10 + i * 3, 5, 9 + i * 3, 14, '#ab9a7b');
    p.set(9 + i * 3, 10, '#d4c6a4');
  }
  p.ball(7, 11, 5, 5, bone); p.ellipse(5, 10, 1.5, 2, '#32232a'); p.ellipse(9, 10, 1.3, 1.6, '#32232a');
  p.set(5, 10, '#e9b157'); p.set(9, 10, '#e9b157'); p.set(7, 13, '#4c3540');
  teeth(p, 4, 14, 6, 2, 0.8); p.line(22, 15, 25, 17, '#a89674');
}
function drip(p: PixelArt, f: number, n: number, crouch = false, air = false): void {
  const pulse = Math.sin(f / n * TAU), y = crouch ? 13 : air ? 8 : 10 + pulse * 0.4;
  p.poly([2, 18, 4, 12, 6, 15, 9, 9, 13, 12, 16, 9, 18, 17, 15, 19, 12, 17, 8, 20, 5, 17], '#25224c');
  p.ball(10, y, crouch ? 8 : 7, air ? 9 : crouch ? 5 : 7, ink);
  p.tube(5, y + 4, 3, 17, 1.2, ink); p.tube(15, y + 3, 17, 18, 1.2, ink);
  p.ellipse(10, y - 1, 4.6, 3.6, '#242038'); p.ball(10, y - 1, 3.5, 2.8, ramp('#d8c7b1'));
  p.ellipse(11, y - 1, 1.6, 2, '#ab334e'); p.set(11, y - 1, '#251428'); p.set(10, y - 2, '#fff2d9');
  p.line(7, y + 4, 12, y + 3, '#130f29'); p.set(8, y + 4, '#e6c6a1');
  p.line(5, y - 3, 6, y - 5, '#aea6cf'); p.set(6, y - 5, '#e3dce8');
}
function moth(p: PixelArt, f: number, n: number): void {
  const flap = Math.sin(f / n * TAU), c = ramp('#aa8761');
  for (const side of [-1, 1]) {
    const tip = 12 + side * (10 - Math.abs(flap) * 2);
    p.poly([12 + side * 2, 8, tip, 2 + flap, tip - side, 13, 12 + side * 3, 18, 12, 10], '#3e2d32');
    p.poly([12 + side * 3, 8, tip - side, 4 + flap, tip - side * 2, 12, 12 + side * 4, 16], '#c0a27c');
    p.line(12 + side * 3, 10, tip - side * 2, 6 + flap, '#665044');
    p.line(12 + side * 3, 11, tip - side * 2, 12, '#665044');
    p.ball(12 + side * 6, 8 + flap * 0.4, 2.7, 2.4, ramp('#74614d'));
    p.ellipse(12 + side * 6, 8 + flap * 0.4, 1.2, 1.4, '#503958'); p.set(12 + side * 6, 7 + flap * 0.4, '#e2c691');
    p.line(12 + side, 5, 12 + side * 4, 0, '#bca17e');
    for (let i = 0; i < 3; i++) p.line(12 + side, 12 + i, 12 + side * (3 + i), 14 + i, '#53413d');
  }
  p.tube(12, 6, 12, 16, 2, c); p.ball(12, 6, 2.5, 3, c);
  p.set(11, 5, '#ffd37c'); p.set(13, 5, '#ffd37c');
  for (let y = 10; y < 17; y += 2) p.line(11, y, 13, y, '#4d3840');
}

export function cellarSprites(id: 'gasper' | 'ragcrawler' | 'dripling' | 'dustmoth'): SpriteSet {
  if (id === 'gasper') return { idle: frames(23, 25, 4, gasper), charge: frames(23, 25, 4, (p,f,n) => gasper(p,f,n,f / n * 1.4)), spit: frames(23,25,2,(p,f,n)=>gasper(p,f,n,0,true)) };
  if (id === 'ragcrawler') return { walk: frames(28,20,6,rag) };
  if (id === 'dripling') return { idle: frames(21,22,4,drip), crouch: frames(21,22,2,(p,f,n)=>drip(p,f,n,true)), air: frames(21,22,2,(p,f,n)=>drip(p,f,n,false,true)) };
  return { fly: frames(25,22,6,moth) };
}
