// The 3.1 pacts and hexes. Inkwell items are the devil's: horns, signatures and black wings, paid
// for in hearts. Hexed items are cursed things that do something wonderful and something awful.
import type { ItemDef } from '../types';
import { ramp, hex, P } from './kit';


function horns(p: P): void {
  const k = ramp('#2a1430');
  for (const s of [-1, 1]) {
    const x0 = 9 + s * 3;
    p.tube(x0, 14, x0 + s * 3, 8, 2, k); p.tube(x0 + s * 3, 8, x0 + s * 2, 3, 1.4, k);
    p.set(x0 + s * 2, 2, '#c81830'); p.set(x0 + s * 3, 7, '#5a2a60');
  }
  p.rect(5, 14, 9, 2, hex('#14040a')); p.set(9, 15, '#ff2030');
}
function signature(p: P): void {
  const pc = ramp('#e8dcc0');
  p.poly([3, 3, 15, 2, 16, 15, 3, 16], pc[3]); p.rect(3, 3, 1, 13, pc[1]);
  for (let y = 5; y < 11; y += 2) p.rect(5, y, 9, 1, hex('#b8a888'));
  // a red signature scrawled across the bottom, and a thumbprint in blood
  p.line(5, 13, 7, 12, hex('#a01020')); p.line(7, 12, 9, 14, hex('#a01020')); p.line(9, 14, 12, 12, hex('#c81830')); p.line(12, 12, 14, 13, hex('#c81830'));
  p.ball(13, 6, 1.8, 2, ramp('#8a0a18'));
}
function inkWings(p: P): void {
  const k = ramp('#1a1430');
  for (const s of [-1, 1]) {
    p.poly([9, 11, 9 + s * 8, 2, 9 + s * 8, 8, 9 + s * 6, 14], k[1]);
    p.line(9, 11, 9 + s * 8, 2, k[3]);
    for (let i = 0; i < 3; i++) p.line(9 + s * (3 + i * 2), 13 - i, 9 + s * (4 + i * 2), 6 - i, k[0]);
    p.set(9 + s * 8, 9, '#c81830');
  }
  p.ball(9, 12, 2, 2.5, ramp('#2a2040'));
}
function blackCat(p: P): void {
  const k = ramp('#16141c');
  p.ball(9, 12, 5, 4, k); p.ball(9, 7, 4, 3.5, k);
  p.poly([5, 6, 6, 2, 8, 5], k[2]); p.poly([13, 6, 12, 2, 10, 5], k[2]);
  p.set(7, 7, '#e8d040'); p.set(11, 7, '#e8d040'); p.set(7, 8, '#2a2a10'); p.set(11, 8, '#2a2a10');
  p.tube(14, 14, 16, 8, 1, k); p.set(9, 9, '#c86a7a');
}
function hexDoll(p: P): void {
  const c = ramp('#a88a5a');
  p.ball(9, 6, 4, 4, c); p.tube(9, 9, 9, 15, 2.6, c); p.tube(6, 11, 3, 9, 1.2, c); p.tube(12, 11, 15, 9, 1.2, c);
  p.tube(8, 15, 7, 17, 1, c); p.tube(10, 15, 11, 17, 1, c);
  p.set(7, 5, '#1a0a10'); p.set(8, 6, '#1a0a10'); p.set(8, 4, '#1a0a10'); p.set(10, 5, '#1a0a10'); p.set(11, 6, '#1a0a10'); p.set(11, 4, '#1a0a10');
  p.rect(7, 8, 4, 1, hex('#5a2a2a'));
  for (const [x, y, c2] of [[12, 3, '#c81830'], [5, 12, '#a040ff'], [13, 13, '#c8c8d0']] as [number, number, string][]) { p.line(x, y, x + 3, y - 2, hex('#c8c8d0')); p.set(x + 3, y - 2, c2); }
}
function crackedMirror(p: P): void {
  p.ball(9, 9, 6.5, 7.5, ramp('#6a4a2a')); p.ball(9, 9, 5, 6, ramp('#a8c0d8'));
  p.line(6, 4, 9, 9, hex('#ffffff')); p.line(9, 9, 13, 7, hex('#ffffff')); p.line(9, 9, 8, 14, hex('#e8f0ff')); p.line(9, 9, 5, 11, hex('#e8f0ff'));
  p.set(9, 9, '#14101a'); p.set(12, 12, '#c070ff');
}

export const PACT_ITEMS: ItemDef[] = [
  { id: 'ink_horns', name: 'Ink Horns', kind: 'passive', quality: 3, pools: { deal: 1 },
    pickup: 'Damage up, gore first', effect: ['Your first hit on each enemy gores it for 50% more damage.'],
    stats: { damage: 1.5 }, icon: horns,
    hooks: { onHitEnemy(w, e, dmg) { if (e.data.gored || e.dead) return; e.data.gored = true; e.hp -= dmg * 0.5; w.fx.sparks(e.x, e.y - e.hitY, 4, '#5a2a6a', 60); } },
    lore: 'They grow on anyone who signs enough. They itch.' },
  { id: 'the_signature', name: 'The Signature', kind: 'passive', quality: 4, pools: { deal: 0.6 },
    pickup: 'Sign here', effect: ['Damage +1.5, speed +0.2.', 'Every red heart container you have turns into ink hearts.', 'Shots sometimes terrify enemies.'],
    stats: { damage: 1.5, speed: 0.2 }, attack: { fear: 0.12, tint: '#5a0a18' },
    hooks: { onPickup: (w) => {
      const h = w.player.health;
      if (h.noRed) { h.addExtra('ink', 4); return; }
      const n = h.redMax / 2; h.removeContainers(n); h.addExtra('ink', n * 2 + 2);
      w.shake(4); w.audio.play('bossRoar', { pitch: 0.6, vol: 0.5 });
    } },
    icon: signature, lore: 'In red, at the bottom, where Grandfather never signed.' },
  { id: 'ink_wings', name: 'Wings of the Well', kind: 'passive', quality: 3, pools: { deal: 0.8 },
    pickup: 'Flight, damage up', effect: ['You can fly.', 'Damage +0.7.'],
    stats: { damage: 0.7 }, flight: true, icon: inkWings,
    lore: 'Whatever lives at the bottom of the Inkwell lent you these. It will want them back.' },
  { id: 'black_cat', name: 'Black Cat', kind: 'passive', quality: 3, pools: { curse: 1 },
    pickup: 'Damage up... luck down', effect: ['Damage +1.2, fire rate +0.4.', 'Luck -3.', 'Enemies you kill sometimes leave a hex behind that hurts other enemies.'],
    stats: { damage: 1.2, tears: 0.4, luck: -3 },
    hooks: { onKill: (w, e) => { if (Math.random() < 0.25) w.addCreep(e.x, e.y, 18, 'player', 8, 4, '#6a2a9a'); } },
    icon: blackCat, lore: 'It crossed Marcus\'s path on the cellar stairs. Then it crossed it again, to be sure.' },
  { id: 'hex_doll', name: 'Hex Doll', kind: 'passive', quality: 3, pools: { curse: 0.8 },
    pickup: 'Pass it on', effect: ['Damage +0.5.', 'When you are hurt, every enemy in the room takes 30 damage and is marked.', 'It takes half a heart from you at the start of every chapter (never your last).'],
    stats: { damage: 0.5 },
    hooks: {
      onHurt: (w) => {
        for (const e of w.enemies) if (!e.dead) { w.damageEnemy(e, 30, { source: 'hex', ang: 0, knock: 0 } as any); e.mark = Math.max(e.mark, 3); w.fx.sparks(e.x, e.y - 10, 6, '#c070ff', 80); }
        w.audio.play('snip', { pitch: 0.6 }); w.hud.toast('Pins go in.', 1);
      },
      onFloor: (w) => { if (w.player.health.totalHalf() > 1) w.hurtPlayer(1, 'the Hex Doll', { ignoreIframes: true }); },
    },
    icon: hexDoll, lore: 'It has Marcus\'s hair sewn on. Somebody else is meant to hold the pins.' },
  { id: 'cracked_mirror', name: 'Cracked Mirror', kind: 'passive', quality: 2, pools: { curse: 0.9 },
    pickup: 'Triple shot... seven years', effect: ['You fire three shots at once.', 'Damage x0.8.', 'Luck -1.'],
    stats: { damageMult: 0.8, luck: -1 }, attack: { shots: 2, spread: 10 }, icon: crackedMirror,
    lore: 'Seven years\' bad luck, or three of everything. Marcus chose three.' },
];

