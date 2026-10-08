// Items that work with Inklings (game/inklings.ts): how fast the ink comes, how much of it Marcus can
// hold, and what he can do with what's written.
import { INK } from '../../game/inkflag';
import type { ItemDef } from '../types';
import { I, ramp, hex, P } from './kit';
import { inkState, weakestSlot, syncInk, METER_MAX, INKLINGS } from '../../game/inklings';
import { roman } from '../../data/floors';

export const INKWORK_ITEMS: ItemDef[] = [
  { id: 'ink_blotter', name: 'Rocker Blotter', kind: 'passive', quality: 2, pools: { library: 1 }, unlock: 'ink_first',
    pickup: 'Rock it over every page', effect: ['The ink meter fills 40% faster, so Inklings come more often.'],
    icon: (p: P) => { const c = ramp('#e8d8e8'); p.rect(3, 5, 12, 9, c[3]); p.rect(3, 5, 12, 1, c[4]); for (const [x, y] of [[6, 8], [10, 10], [12, 7], [7, 12]]) { p.set(x, y, '#3a3a8a'); p.set(x + 1, y, '#5a5ab0'); } } },
  { id: 'fourth_margin', name: 'The Fourth Margin', kind: 'passive', quality: 3, pools: { treasure: 0.6 }, unlock: 'ink_mastery',
    pickup: 'Room to write', effect: ['You can hold one more Inkling.'],
    icon: (p: P) => { p.rect(3, 2, 12, 15, hex('#efe6d0')); p.line(5, 2, 5, 16, hex('#c83a3a')); p.line(13, 2, 13, 16, hex('#c83a3a')); for (let y = 5; y < 16; y += 3) p.line(7, y, 11, y, hex('#8a7a6a')); } },
  { id: 'iron_gall', name: 'Iron Gall', kind: 'passive', quality: 3, pools: { deal: 1 },
    pickup: 'Ink that bites', effect: ['+0.15 damage for every level of Inkling you hold (up to +1.8 with four margins at III).'],
    hooks: { onPickup: (w) => syncInk(w) },
    icon: (p: P) => { I.bottle(p, '#1a1a2a', '#7a8a90'); p.set(8, 9, '#8a3a2a'); p.set(9, 11, '#8a3a2a'); } },
  { id: 'inkhorn', name: 'Inkhorn', kind: 'active', quality: 3, pools: { library: 1 }, unlock: 'ink_annotation',
    pickup: 'Pour it all out', effect: ['Fills the ink meter to the brim: the next creature you kill leaves its Inkling.'],
    active: { charge: 4, type: 'room', use: (w) => { const s = inkState(w); if (s.meter >= METER_MAX) return false; s.meter = METER_MAX; w.audio.play('inkHeart', { pitch: 0.7 }); w.hud.toast('The ink brims. Choose your next kill.', 2); } },
    icon: (p: P) => { const h = ramp('#d8c8a0'); p.poly([3, 14, 6, 4, 9, 3, 13, 9, 11, 15], h[2]); p.rect(7, 4, 3, 2, hex('#1a1a2a')); p.line(4, 14, 11, 15, h[0]); } },
  { id: 'pumice_stone', name: 'Pumice Stone', kind: 'active', quality: 2, pools: { shop: 1 },
    pickup: 'Scrub the margin clean', effect: ['Erases your weakest Inkling and pours its ink back: the meter brims, so your next kill leaves a new one.'],
    active: { charge: 2, type: 'room', use: (w) => {
      const s = inkState(w); if (!s.slots.length) return false;
      const old = s.slots.splice(weakestSlot(w), 1)[0]; s.meter = METER_MAX; syncInk(w);
      w.hud.toast(`${INKLINGS[old.id].name} ${roman(old.lv)} scrubbed away. The ink brims.`, 2.4); w.audio.play('pageGet', { pitch: 0.6 });
    } },
    icon: (p: P) => { const c = ramp('#b8b0a0'); p.ball(9, 10, 6, 4.5, c); for (const [x, y] of [[6, 9], [9, 8], [12, 10], [8, 12], [11, 12]]) p.set(x, y, '#8a8070'); } },
];
// switched off with the Inklings: none of these can turn up
if (!INK.on) for (const it of INKWORK_ITEMS) it.pools = {};
