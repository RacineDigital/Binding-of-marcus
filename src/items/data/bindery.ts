// The bindery's tools: items that change how you fight rather than how hard. Each one asks something
// of you (stand still, keep moving, stay close, stay unhurt, carry buttons) and pays you for it.
import type { ItemDef } from '../types';
import type { World } from '../../game/world';
import type { StatMods } from '../../player/stats';
import { ramp, hex, P, counter, directHit } from './kit';
import { spawnInkling } from '../familiar_rt';
import { TAU, dist2 } from '../../core/math';
import { luckChance } from '../../projectiles/profile';

/** Swap a lasting effect for a new value (or remove it), only when it changes. */
function setLasting(w: World, id: string, stats: StatMods | null): void {
  const pl = w.player, cur = pl.temp.find((t) => t.id === id);
  if (JSON.stringify(cur?.stats ?? null) === JSON.stringify(stats)) return;
  pl.temp = pl.temp.filter((t) => t.id !== id);
  if (stats) pl.temp.push({ id, stats });
  pl.recompute();
}
const foes = (w: World) => w.enemies.some((e) => !e.dead && !e.friendly);

export const BINDERY_ITEMS: ItemDef[] = [
  { id: 'paper_cut', name: 'Paper Cut', kind: 'passive', quality: 2, pools: { treasure: 1 },
    pickup: 'Sharp edges', effect: ['Your shots are pages: 10% chance of a bold 3x hit, 20% chance to make enemies bleed.'],
    attack: { shape: 'page', crit: 0.1, poison: 0.2 },
    icon: (p: P) => { p.poly([3, 14, 14, 3, 16, 5, 5, 16], hex('#efe6d0')); p.line(4, 15, 15, 4, hex('#c8bca0')); p.set(12, 7, '#c8283a'); p.set(13, 8, '#c8283a'); p.set(13, 10, '#a01828'); },
    lore: 'The worst ones are from the thinnest paper.' },
  { id: 'bookends', name: 'Bookends', kind: 'passive', quality: 3, pools: { treasure: 0.9 },
    pickup: 'Both ends of the shelf', effect: ['Also fire a shot behind you.', 'Shots that fly their full range split in two.'],
    attack: { rear: true, split: 2, splitOnExpire: true }, stats: { tearsMult: 0.9 },
    icon: (p: P) => { const m = ramp('#7a5a3a'); p.rect(2, 4, 3, 12, m[2]); p.rect(2, 13, 6, 3, m[2]); p.rect(13, 4, 3, 12, m[2]); p.rect(10, 13, 6, 3, m[2]); for (const [x, c] of [[6, '#8a2a2a'], [8, '#2a4a8a'], [10, '#3a6a3a']] as [number, string][]) p.rect(x, 6, 2, 7, hex(c)); } },
  { id: 'printing_plate', name: 'Printing Plate', kind: 'passive', quality: 3, pools: { shop: 0.9 },
    pickup: 'Press down hard', effect: ['Every 7 seconds in a fight you stamp the floor: enemy shots near you are erased, and nearby enemies take 2x your damage + 4 and are thrown back.'],
    hooks: {
      onTick(w, dt) {
        const f = w.run.flags;
        if (!foes(w)) { f.plateT = 0; return; }
        f.plateT = (f.plateT ?? 0) + dt;
        if (f.plateT < 7) return;
        f.plateT = 0;
        const pl = w.player;
        for (const p of w.proj.list) if (p.active && p.team === 1 && dist2(p.x, p.y, pl.x, pl.y) < 64 * 64) { w.fx.sparks(p.x, p.y - p.z, 2, '#e8e0d0', 60); w.proj.kill(p); }
        for (const e of w.enemies) if (!e.dead && !e.friendly && dist2(e.x, e.y, pl.x, pl.y) < (52 + e.r) ** 2)
          w.damageEnemy(e, pl.stats.damage * 2 + 4, { ang: Math.atan2(e.y - pl.y, e.x - pl.x), knock: 2.5, source: 'stamp' });
        w.fx.ring(pl.x, pl.y, 6, 60, '#efe6d0', 0.3); w.shake(3); w.audio.play('boomSmall', { x: pl.x, vol: 0.5, pitch: 1.3 });
      },
    },
    icon: (p: P) => { const m = ramp('#8a8a96'); p.rect(3, 4, 12, 10, m[2]); p.rect(3, 4, 12, 1, m[4]); p.rect(5, 6, 8, 6, hex('#2a2430')); p.line(6, 7, 11, 7, hex('#c8c0b0')); p.line(6, 9, 10, 9, hex('#c8c0b0')); p.rect(7, 14, 4, 3, hex('#5a3a24')); } },
  { id: 'gilt_edge', name: 'Gilt Edge', kind: 'passive', quality: 2, pools: { shop: 1 },
    pickup: 'Money talks', effect: ['Damage +1 for every 10 buttons you carry (up to +3). Spending them takes it away.'],
    hooks: { onTick(w) { const t = Math.min(3, Math.floor(w.player.buttons / 10)); setLasting(w, 'gilt_edge', t ? { damage: t } : null); } },
    icon: (p: P) => { p.rect(3, 3, 12, 13, hex('#5a2a2a')); p.rect(13, 3, 2, 13, hex('#e8c040')); p.rect(3, 15, 12, 1, hex('#e8c040')); p.rect(3, 3, 12, 1, hex('#e8c040')); p.set(14, 6, '#fff4b0'); p.set(14, 11, '#fff4b0'); } },
  { id: 'creasing_iron', name: 'Creasing Iron', kind: 'passive', quality: 3, pools: { treasure: 0.8 },
    pickup: 'Stand still, crease hard', effect: ['Stand still for a second to crease your next attack: 3x damage, and it pierces everything.'],
    hooks: {
      onTick(w) {
        const pl = w.player;
        if (pl.idleT < 1 || !foes(w) || pl.temp.some((t) => t.id === 'crease')) return;
        pl.addTemp({ id: 'crease', stats: { damageMult: 3 }, attack: { pierce: 99 }, room: true });
        w.fx.ring(pl.x, pl.y - 8, 14, 4, '#efe6d0', 0.25, false); w.audio.play('tink', { pitch: 1.5, vol: 0.5 });
      },
      onFire(w) { if (w.player.temp.some((t) => t.id === 'crease')) w.after(0.05, () => w.player.clearTemp((t) => t.id === 'crease')); },
    },
    icon: (p: P) => { const b = ramp('#e8e0cc'); p.poly([4, 15, 12, 3, 15, 5, 7, 16], b[2]); p.line(5, 15, 13, 4, b[4]); p.set(14, 4, '#ffffff'); } },
  { id: 'reading_lamp', name: 'Reading Lamp', kind: 'passive', quality: 2, pools: { blessing: 0.9 }, tags: ['wax'],
    pickup: 'Up close, everything is clearer', effect: ['Enemies within 3 tiles of you take 60% more damage.'],
    hooks: { onHitEnemy(w, e, dmg) { if (directHit(w) && !e.dead && dist2(e.x, e.y, w.player.x, w.player.y) < 72 * 72) e.hp -= dmg * 0.6; } },
    icon: (p: P) => { p.poly([5, 4, 13, 4, 15, 9, 3, 9], hex('#3a6a4a')); p.rect(8, 9, 2, 6, hex('#8a7a5a')); p.rect(5, 15, 8, 2, hex('#5a4a3a')); p.rect(6, 9, 6, 1, hex('#fff0b0')); } },
  { id: 'overdue_notice', name: 'Overdue Notice', kind: 'passive', quality: 2, pools: { curse: 1 },
    pickup: 'Clean record, sharp teeth', effect: ['Each room you clear without being hit adds damage +0.4 (up to +2.4).', 'Getting hit wipes it all.'],
    hooks: {
      onHurt(w) { const f = w.run.flags; f.overdue = 0; f.overdueHurt = w.room.id; setLasting(w, 'overdue_notice', null); },
      onRoomClear(w) { const f = w.run.flags; if (f.overdueHurt === w.room.id) return; f.overdue = Math.min(6, (f.overdue ?? 0) + 1); setLasting(w, 'overdue_notice', { damage: Math.round(f.overdue * 4) / 10 }); },
      onFloor(w) { w.run.flags.overdueHurt = -1; },
    },
    icon: (p: P) => { p.rect(3, 2, 12, 14, hex('#e8dcc0')); p.rect(3, 2, 12, 3, hex('#b02a2a')); for (let y = 7; y < 15; y += 2) p.line(5, y, 12, y, hex('#8a7a6a')); p.ring(12, 12, 2.5, '#b02a2a'); } },
  { id: 'spilt_inkwell', name: 'Spilt Inkwell', kind: 'passive', quality: 3, pools: { deal: 0.8 }, tags: ['ink'],
    pickup: 'Something crawls out', effect: ['Kills have a 20% chance (more with luck) to leave an inkling that fights for you for 30 seconds.'],
    hooks: { onKill(w, e) { if (!e.friendly && Math.random() < luckChance(0.2, w.player.stats.luck)) spawnInkling(w, e.x, e.y); } },
    icon: (p: P) => { p.poly([3, 9, 9, 5, 12, 8, 6, 12], hex('#2a2440')); p.ball(10, 13, 5, 2.5, ramp('#1a1830')); p.set(9, 12, '#f2f0ff'); p.set(12, 12, '#f2f0ff'); } },
  { id: 'red_thread', name: 'Red Thread', kind: 'passive', quality: 2, pools: { treasure: 1 }, tags: ['thread'],
    pickup: 'Tied together', effect: ['35% chance for a hit to run a thread to another enemy, hurting it too.'],
    attack: { chain: 1, chainChance: 0.35, tint: '#c8283a' },
    icon: (p: P) => { for (let a = 0; a < TAU * 1.5; a += 0.2) p.set(9 + Math.cos(a) * (2 + a), 9 + Math.sin(a) * (2 + a) * 0.8, '#c8283a'); p.line(13, 12, 16, 16, hex('#a01828')); } },
  { id: 'marginalia', name: 'Grandfather\'s Marginalia', kind: 'passive', quality: 3, pools: { library: 1 },
    pickup: 'He wrote back', effect: ['Every 6th attack also sends one of his notes: it seeks the nearest enemy, passes through three, and marks them (marked enemies take 50% more damage).'],
    hooks: { onFire(w, ang) { if (counter(w, 'marginalia') % 6) return; const pl = w.player;
      w.proj.player(w, { ...pl.prof, homing: 1.4, pierce: 3, mark: 1, split: 0, explode: 0, shape: 'page', tint: '#d8c8a0' }, pl.x, pl.y, 8, ang, pl.stats.damage * 1.5, 170, 260, 1.3, 1); } },
    icon: (p: P) => { p.rect(3, 3, 12, 13, hex('#efe6d0')); for (let y = 5; y < 15; y += 2) p.line(5, y, 10, y, hex('#8a7a6a')); p.line(12, 4, 12, 14, hex('#3a3aa0')); p.set(13, 6, '#3a3aa0'); p.set(13, 10, '#3a3aa0'); } },
];
