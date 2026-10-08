// The Boys: things borrowed off friends (a collection set, not a transformation) (Crug's pen, Ewen's bike, Gavyn's pouch, Sam's beer), Badger
// the tabby, and the Cherry Orchard, an ultra-rare tin of 99 cherry bombs.
import type { ItemDef } from '../types';
import { ramp, hex, P } from './kit';
import { familiarIcon } from '../../art/familiars';
import { dist2 } from '../../core/math';

function crugsPen(p: P): void {
  // a slim black dab pen with a silver band, glowing at the tip, a wisp of vapour coming off it
  const b = ramp('#2a2a32');
  for (let i = 0; i < 10; i++) { p.set(4 + i, 14 - i, b[2]); p.set(5 + i, 14 - i, b[1]); p.set(4 + i, 13 - i, b[3]); }
  p.set(9, 9, '#c8c8d0'); p.set(10, 9, '#e8e8f0'); p.set(10, 8, '#c8c8d0');
  p.set(14, 4, '#ff8a2a'); p.set(15, 4, '#ffd060'); p.set(14, 3, '#ffd060');
  p.set(15, 2, '#d8d8e0'); p.set(16, 1, '#b8b8c4'); p.set(14, 1, '#b8b8c4');
  p.set(3, 15, '#5a5a66');
}
function ewensBike(p: P): void {
  // a shoddy old red road bike: thin wheels, drop bars, a rusty patch
  const fr = '#c82a2a', dk = '#7a1a1a', tyre = '#1a1a1e', rim = '#8a8a92';
  for (const cx of [4, 14]) { p.ring(cx, 12, 3.5, tyre, 1); p.set(cx, 12, rim); p.set(cx - 2, 12, rim); p.set(cx + 2, 12, rim); p.set(cx, 10, rim); p.set(cx, 14, rim); }
  p.line(4, 12, 8, 7, hex(fr)); p.line(8, 7, 13, 7, hex(fr)); p.line(8, 7, 9, 12, hex(fr)); p.line(9, 12, 4, 12, hex(dk)); p.line(13, 7, 14, 12, hex(fr)); p.line(9, 12, 13, 7, hex(fr));
  p.line(13, 7, 13, 5, hex('#8a8a92')); p.line(13, 5, 15, 5, hex('#8a8a92')); p.set(15, 6, '#8a8a92'); p.set(14, 7, '#8a8a92');
  p.line(8, 7, 7, 5, hex('#8a8a92')); p.rect(6, 4, 3, 1, hex('#2a2a2a'));
  p.set(11, 7, '#8a5a2a'); p.set(6, 9, '#8a5a2a');
}
function gavynsPouch(p: P): void {
  // a round tin with the lid off and a little white pouch on top
  const t = ramp('#3a5a8a');
  p.ball(9, 12, 6, 3, t); p.rect(3, 9, 13, 3, t[2]); p.ball(9, 9, 6, 2.5, t); p.ball(9, 9, 5, 1.8, ramp('#d8e0e8'));
  p.rect(7, 6, 5, 3, hex('#f4f0e8')); p.rect(7, 6, 5, 1, hex('#ffffff')); p.set(11, 8, '#d8d0c0');
  p.rect(5, 11, 8, 1, hex('#e8d8a0'));
}
function samsBeer(p: P): void {
  // a brown bottle, foam spilling over the neck
  const g = ramp('#6a3a14');
  p.rect(7, 3, 4, 4, g[2]); p.ball(9, 11, 4.5, 5, g, { dither: 0.3 }); p.rect(5, 9, 8, 6, g[2]);
  p.rect(5, 10, 8, 3, hex('#e8d8a0')); p.rect(6, 11, 6, 1, hex('#8a2a2a'));
  p.ball(9, 2, 3, 1.6, ramp('#f4f0e4')); p.set(6, 4, '#f4f0e4'); p.set(12, 5, '#f4f0e4'); p.set(12, 6, '#e8e0cc');
  p.set(6, 9, '#c8945a');
}
function orchard(p: P): void {
  // a wicker basket heaped with cherry bombs
  const w = ramp('#a8743a');
  p.poly([2, 10, 16, 10, 14, 16, 4, 16], w[2]); for (let x = 3; x < 16; x += 2) p.line(x, 11, x - 1, 16, w[1]);
  for (const [x, y] of [[5, 8], [9, 7], [13, 8], [7, 5], [11, 5], [9, 3]] as [number, number][]) { p.ball(x, y, 2.2, 2.2, ramp('#c8283a')); p.set(x - 1, y - 1, '#ff9aa0'); }
  p.line(9, 1, 10, -1, hex('#3a2a1a')); p.set(10, 0, '#ffd040');
}

export const FRIEND_ITEMS: ItemDef[] = [
  { id: 'crugs_pen', name: 'Crug\'s Pen', kind: 'passive', quality: 2, pools: { treasure: 1 }, tags: ['boys'],
    pickup: 'Flaming shots', effect: ['Your shots are on fire and set enemies alight.', 'Damage +0.1.'],
    stats: { damage: 0.1 }, attack: { burn: 0.45, shape: 'fire' }, icon: crugsPen,
    lore: 'Crug swears it\'s the good stuff. It smells like burnt mango.' },
  { id: 'ewens_bike', name: 'Ewen\'s Bike', kind: 'passive', quality: 1, pools: { treasure: 0.9 }, tags: ['boys'],
    pickup: 'Spikes and creep can\'t hurt you', effect: ['You can\'t be hurt by spikes or creep.', 'Speed +0.1.'],
    stats: { speed: 0.1 }, icon: ewensBike,
    lore: 'An old red road bike, mostly rust. Ewen rides it over anything. The brakes are a suggestion.' },
  { id: 'gavyns_pouch', name: 'Gavyn\'s Pouch', kind: 'passive', quality: 1, pools: { treasure: 1 }, tags: ['boys'],
    pickup: 'Fire rate up', effect: ['Fire rate +0.3.', 'Your upper lip is very fat now.'],
    stats: { tears: 0.3 }, icon: gavynsPouch,
    lore: 'Gavyn keeps one in at all times. Nobody has seen his real top lip in years.' },
  { id: 'sams_beer', name: 'Sam\'s Beer', kind: 'passive', quality: 2, pools: { treasure: 0.9 }, tags: ['boys'],
    pickup: 'Frothy creep shots, damage up', effect: ['Damage +0.5.', 'Shots are beer: they leave brown creep that hurts enemies and fizzes away into foam.'],
    stats: { damage: 0.5 }, attack: { creep: true, shape: 'beer', tint: '#8a5a20' }, icon: samsBeer,
    lore: 'Sam\'s. Warm, flat, and somehow still foaming.' },
  { id: 'toffee', name: 'Badger', kind: 'familiar', quality: 3, pools: { treasure: 0.8 },
    pickup: 'A tabby with a temper', effect: ['A brown tabby kitten that pounces on enemies.', 'Hisses when you\'re hurt, scaring enemies near you.', 'Brings you a present every 3 rooms.'],
    familiar: { kind: 'chaser', contact: 9, speed: 115, sprite: 'toffee', special: 'tabby', spawnEvery: 3, spawnDrop: ['button', 'heart', 'key', 'bomb', 'button5', 'sweet'] },
    hooks: { onHurt: (w) => {
      // Badger's hiss: everything near you is scared off for a moment
      const pl = w.player;
      for (const e of w.enemies) if (!e.dead && !e.isBoss && dist2(e.x, e.y, pl.x, pl.y) < 90 * 90) e.fear = Math.max(e.fear, 2.2);
      w.audio.play('snip', { x: pl.x, pitch: 1.8, vol: 0.5 }); w.hud.toast('Badger hisses!', 1);
    } },
    icon: familiarIcon('toffee'),
    lore: 'Found under the workshop bench in a box marked FRAGILE. She is not fragile.' },
  { id: 'cherry_orchard', name: 'The Cherry Orchard', kind: 'passive', quality: 4, pools: { secret: 0.2 },
    pickup: '99 bombs', effect: ['Your cherry bombs are set to 99.'],
    hooks: { onPickup: (w) => { w.player.bombs = 99; } }, icon: orchard,
    lore: 'Every cherry bomb the house ever had, in one basket. Ultra rare.' },
];
