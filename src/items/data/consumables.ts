// Torn Pages (single-use cards), Unmarked Sweets (unidentified pills) and Charms (trinkets).
import type { ConsumableDef } from '../types';
import type { World } from '../../game/world';
import { spawnDrop } from '../../game/drops';
import { TAU, dist2 } from '../../core/math';
import { Bomb } from '../../game/bombs';
import { PixelArt } from '../../render/pixel';
import { ramp, hex } from '../../render/color';
import { spawnInkling } from '../familiar_rt';

function teleportTo(w: World, pred: (t: string) => boolean): boolean {
  const target = w.floor.rooms.find((r) => pred(r.type));
  if (!target) { w.hud.toast('The page crumbles. Nowhere to go.'); return false; }
  w.game.teleport(target.id);
  return true;
}

export const PAGES: ConsumableDef[] = [
  { id: 'pg_lantern', name: 'The Lantern Page', kind: 'page', desc: 'Light every corner.', effect: ['Reveals the whole floor map, including hidden rooms.'],
    use: (w) => { for (const r of w.floor.rooms) { r.seen = true; r.discovered = true; } w.audio.play('secret'); } },
  { id: 'pg_stair', name: 'The Stair Page', kind: 'page', desc: 'Back to the landing.', effect: ['Teleports you to the first room of the floor.'],
    use: (w) => { w.game.teleport(w.floor.startId); } },
  { id: 'pg_crown', name: 'The Crown Page', kind: 'page', desc: 'Skip to the end of the chapter.', effect: ['Teleports you to the boss room.'],
    use: (w) => { teleportTo(w, (t) => t === 'boss'); } },
  { id: 'pg_pocket', name: 'The Pocket Page', kind: 'page', desc: 'A little of everything.', effect: ['Spawns a button, a key, a cherry bomb and a heart.'],
    use: (w) => { for (const k of ['button', 'key', 'bomb', 'heart']) spawnDrop(w, k, w.player.x, w.player.y); } },
  { id: 'pg_hearth', name: 'The Hearth Page', kind: 'page', desc: 'Warm and mended.', effect: ['Heals 2 red hearts.'],
    use: (w) => { w.player.healRed(4, true); w.audio.play('heal'); } },
  { id: 'pg_candle', name: 'The Candle Page', kind: 'page', desc: 'Two flames of wax.', effect: ['Grants 2 wax hearts.'],
    use: (w) => { w.player.health.addExtra('wax', 4); w.audio.play('waxHeart'); } },
  { id: 'pg_anvil', name: 'The Anvil Page', kind: 'page', desc: 'Heavy hands.', effect: ['Damage +1.5 and Speed +0.3 for the current room.'],
    use: (w) => { w.player.addTemp({ id: 'anvil', stats: { damage: 1.5, speed: 0.3 }, room: true }); } },
  { id: 'pg_owl', name: 'The Owl Page', kind: 'page', desc: 'Your shots know the way.', effect: ['Shots home in on enemies for the current room.'],
    use: (w) => { w.player.addTemp({ id: 'owl', attack: { homing: 0.9, tint: '#c080ff' }, room: true }); } },
  { id: 'pg_wind', name: 'The Wind Page', kind: 'page', desc: 'Weightless.', effect: ['Grants flight for the current room.'],
    use: (w) => { w.player.addTemp({ id: 'wind', room: true, flight: true }); } },
  { id: 'pg_tower', name: 'The Tower Page', kind: 'page', desc: 'Everything falls.', effect: ['Six lit cherry bombs scatter around you.'],
    use: (w) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; const b = new Bomb(w.player.x + Math.cos(a) * 30, w.player.y + Math.sin(a) * 22, {}); b.fuse = 1.2 + i * 0.1; w.bombs.push(b); } } },
  { id: 'pg_storm', name: 'The Storm Page', kind: 'page', desc: 'Lightning answers.', effect: ['Strikes every enemy in the room with lightning for 40 damage.'],
    use: (w) => { for (const e of w.enemies) if (!e.dead) { w.fx.bolt(e.x, e.y - 120, e.x, e.y - e.hitY, '#e0f0ff', 0.25, 2); w.damageEnemy(e, 40, { ang: Math.PI / 2, knock: 0.5, source: 'page' }); } w.audio.play('zap'); w.shake(4); w.whiteFlash = 0.3; } },
  { id: 'pg_shield', name: 'The Shield Page', kind: 'page', desc: 'Nothing can touch you.', effect: ['Invincible for 6 seconds.'],
    use: (w) => { w.player.iframes = 6; } },
  { id: 'pg_curio', name: 'The Curio Page', kind: 'page', desc: 'To the treasure.', effect: ['Teleports you to the treasure room.'],
    use: (w) => { teleportTo(w, (t) => t === 'treasure'); } },
  { id: 'pg_market', name: 'The Market Page', kind: 'page', desc: 'Mott is expecting you.', effect: ['Teleports you to the shop.'],
    use: (w) => { teleportTo(w, (t) => t === 'shop'); } },
  { id: 'pg_hidden', name: 'The Hidden Page', kind: 'page', desc: 'Between the walls.', effect: ['Teleports you into the floor\'s crawlspace, if it has one.'],
    use: (w) => { const r = w.floor.rooms.find((x) => x.type === 'secret'); if (r) { r.discovered = true; for (const d of r.doors) d.hidden = false; for (const o of w.floor.rooms) for (const d of o.doors) if (d.to === r.id) d.hidden = false; w.game.teleport(r.id); } } },
  { id: 'pg_ink', name: 'The Ink Page', kind: 'page', desc: 'Spill it.', effect: ['Grants an ink heart and splashes every enemy for 40 damage.'],
    use: (w) => { w.player.health.addExtra('ink', 2); w.inkBurst(); } },
  { id: 'pg_blank', name: 'The Blank Page', kind: 'page', desc: 'Write your own.', effect: ['Triggers your active item without using its charge.'], rarity: 0.4,
    use: (w) => { w.game.useActive(true); } },
  { id: 'pg_mirror', name: 'The Mirror Page', kind: 'page', desc: 'Twice as much.', effect: ['Duplicates every loose pickup in the room.'],
    use: (w) => { for (const p of [...w.pickups]) if (!p.pedestal && !p.isChest() && !p.shop) spawnDrop(w, p.kind, p.x, p.y).data = { ...p.data }; } },
  { id: 'pg_last', name: 'The Last Page', kind: 'page', desc: 'The End.', effect: ['Destroys every regular enemy in the room and deals 60 damage to bosses.'], rarity: 0.35,
    use: (w) => { for (const e of w.enemies) if (!e.dead) { if (e.isBoss) w.damageEnemy(e, 60, { ang: 0, knock: 0, source: 'page' }); else w.killEnemy(e); } w.whiteFlash = 0.8; w.shake(6); } },
  { id: 'pg_clock', name: 'The Clock Page', kind: 'page', desc: 'Slow the hands.', effect: ['Enemies and their shots move at half speed for 8 seconds.'],
    use: (w) => { w.slowT = 8; w.audio.play('chime'); } },
];

export interface SweetEffect { id: string; name: string; desc: string; good: boolean; use: (w: World) => void }
export const SWEET_EFFECTS: SweetEffect[] = [
  { id: 'sw_bright', name: 'Bright Sweet', desc: 'Full health!', good: true, use: (w) => { w.player.healRed(24, true); w.audio.play('heal'); } },
  { id: 'sw_brave', name: 'Brave Sweet', desc: 'Damage up', good: true, use: (w) => { w.player.addTemp({ id: 'sw', stats: { damage: 0.6 } }); } },
  { id: 'sw_quick', name: 'Quick Sweet', desc: 'Speed up', good: true, use: (w) => { w.player.addTemp({ id: 'sw', stats: { speed: 0.15 } }); } },
  { id: 'sw_fizzy', name: 'Fizzy Sweet', desc: 'Fire rate up', good: true, use: (w) => { w.player.addTemp({ id: 'sw', stats: { tears: 0.35 } }); } },
  { id: 'sw_long', name: 'Long Sweet', desc: 'Range up', good: true, use: (w) => { w.player.addTemp({ id: 'sw', stats: { range: 40 } }); } },
  { id: 'sw_lucky', name: 'Lucky Sweet', desc: 'Luck up', good: true, use: (w) => { w.player.addTemp({ id: 'sw', stats: { luck: 1 } }); } },
  { id: 'sw_sticky', name: 'Sticky Sweet', desc: 'Your active item hums with charge', good: true, use: (w) => { w.game.fullCharge(); } },
  { id: 'sw_gassy', name: 'Gassy Sweet', desc: 'Poison cloud!', good: true, use: (w) => { w.fx.smoke(w.player.x, w.player.y, 20, 'rgba(90,150,40,', 10, 2, 6); for (const e of w.enemies) if (dist2(e.x, e.y, w.player.x, w.player.y) < 120 * 120) { e.poison = 5; e.poisonDmg = 5; } } },
  { id: 'sw_bitter', name: 'Bitter Sweet', desc: 'Speed down', good: false, use: (w) => { w.player.addTemp({ id: 'sw', stats: { speed: -0.1 } }); } },
  { id: 'sw_stale', name: 'Stale Sweet', desc: 'Damage down', good: false, use: (w) => { w.player.addTemp({ id: 'sw', stats: { damage: -0.3 } }); } },
  { id: 'sw_rotten', name: 'Rotten Sweet', desc: 'Ouch.', good: false, use: (w) => { if (w.player.health.totalHalf() > 1) w.hurtPlayer(1, 'a rotten sweet', { ignoreIframes: true }); } },
  { id: 'sw_heavy', name: 'Heavy Sweet', desc: 'Shot speed down, shot size up', good: false, use: (w) => { w.player.addTemp({ id: 'sw', stats: { shotSpeed: -0.15, size: 0.25 } }); } },
];
export const SWEETS: ConsumableDef[] = [];

// ------------------------------------------------------------------ charms (trinkets)
const ic = (fn: (p: PixelArt) => void) => fn;
export const CHARMS: ConsumableDef[] = [
  { id: 'ch_bent_nail', name: 'Bent Nail', kind: 'charm', desc: 'Pierce the first thing', effect: ['Shots pierce one extra enemy.'], attack: { pierce: 1 },
    icon: ic((p) => { const m = ramp('#9a9aa8'); p.line(5, 3, 11, 11, m[3]); p.line(11, 11, 12, 15, m[2]); p.rect(3, 2, 5, 2, m[4]); }) },
  { id: 'ch_lucky_button', name: 'Lucky Button', kind: 'charm', desc: 'Luck up', effect: ['Luck +1.'], stats: { luck: 1 },
    icon: ic((p) => { const c = ramp('#4ab05a'); p.ball(9, 9, 5.5, 5.5, c); p.set(7, 8, '#1a3a1a'); p.set(10, 8, '#1a3a1a'); p.set(7, 11, '#1a3a1a'); p.set(10, 11, '#1a3a1a'); }) },
  { id: 'ch_needle', name: 'Darning Needle', kind: 'charm', desc: 'Stitched in place', effect: ['Shots have a 15% chance to slow enemies.'], attack: { slow: 0.15 },
    icon: ic((p) => { p.line(3, 15, 14, 3, hex('#d8d8e0')); p.ring(13, 4, 1.5, '#8a8a92'); p.line(14, 3, 16, 8, hex('#c83a4a')); }) },
  { id: 'ch_moth_wing', name: 'Moth Wing', kind: 'charm', desc: 'Lighter on your feet', effect: ['Speed +0.15.'], stats: { speed: 0.15 },
    icon: ic((p) => { const c = ramp('#c8b48a'); p.poly([3, 14, 8, 3, 15, 5, 12, 12], c[2]); p.shadeV(3, 3, 12, 11, c); p.ball(10, 7, 1.5, 1.5, ramp('#4a3a6a')); }) },
  { id: 'ch_wax_seal', name: 'Wax Seal', kind: 'charm', desc: 'Sealed with a little warmth', effect: ['20% chance to gain half a wax heart when you clear a room.'],
    hooks: { onRoomClear: (w) => { if (Math.random() < 0.2) { w.player.health.addExtra('wax', 1); w.fx.stars(w.player.x, w.player.y - 20, 4, '#fff0d0'); } } },
    icon: ic((p) => { const c = ramp('#b02a3a'); p.ball(9, 9, 6, 5.5, c); p.ring(9, 9, 3, c[1]); p.set(9, 9, c[4]); }) },
  { id: 'ch_rusty_key', name: 'Rusty Key', kind: 'charm', desc: 'They come in pairs', effect: ['25% chance to get an extra key when picking one up.'],
    hooks: { onPickupCollect: (w, kind: string) => { if (kind === 'key' && Math.random() < 0.25) { w.player.keys++; w.fx.text(w.player.x, w.player.y - 30, '+1', '#e0d0a0'); } } },
    icon: ic((p) => { const c = ramp('#9a5a3a'); p.ring(5, 7, 3, c[3], 2); p.rect(8, 6, 7, 2, c[2]); p.rect(12, 8, 1, 3, c[1]); p.rect(14, 8, 1, 2, c[1]); }) },
  { id: 'ch_lint', name: 'Ball of Lint', kind: 'charm', desc: 'Something lives in it', effect: ['Spawns an inkling whenever you clear a room.'],
    hooks: { onRoomClear: (w) => spawnInkling(w, w.player.x, w.player.y) },
    icon: ic((p) => { const c = ramp('#8a8a9a'); p.ball(9, 10, 5.5, 5, c, { dither: 1 }); p.set(8, 9, '#1a1a2a'); p.set(11, 9, '#1a1a2a'); }) },
  { id: 'ch_marble', name: 'Cracked Marble', kind: 'charm', desc: 'Fire rate up', effect: ['Fire rate +0.3.'], stats: { tears: 0.3 },
    icon: ic((p) => { p.ball(9, 9, 5.5, 5.5, ramp('#4a8ad0')); p.line(7, 5, 10, 12, hex('#e0f0ff')); p.set(7, 7, '#ffffff'); }) },
  { id: 'ch_match', name: 'Burnt Match', kind: 'charm', desc: 'Catch fire', effect: ['Shots have a 12% chance to burn enemies.'], attack: { burn: 0.12 },
    icon: ic((p) => { p.line(5, 15, 12, 5, hex('#c8a060')); p.ball(12.5, 4, 2, 2.5, ramp('#2a2020')); }) },
  { id: 'ch_glass', name: 'Glass Shard', kind: 'charm', desc: 'Occasional bold hits', effect: ['6% chance for a shot to deal triple damage.'], attack: { crit: 0.06 },
    icon: ic((p) => { p.poly([5, 15, 8, 3, 13, 8, 11, 15], hex('#a8d0e0')); p.line(8, 4, 9, 13, hex('#e8f8ff')); }) },
  { id: 'ch_flower', name: 'Pressed Flower', kind: 'charm', desc: 'A kind memory', effect: ['Heals a full red heart at the start of each floor.'],
    hooks: { onFloor: (w) => { w.player.healRed(2); } },
    icon: ic((p) => { for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; p.ball(9 + Math.cos(a) * 3.5, 8 + Math.sin(a) * 3.5, 2.2, 2.2, ramp('#c86a8a')); } p.ball(9, 8, 1.6, 1.6, ramp('#e8c040')); p.line(9, 11, 9, 16, hex('#4a7a3a')); }) },
  { id: 'ch_chalk', name: 'Chalk Stub', kind: 'charm', desc: 'Mark the hollow walls', effect: ['At the start of each floor, the crawlspace appears on your map.'],
    hooks: { onFloor: (w) => { const r = w.floor.rooms.find((x) => x.type === 'secret'); if (r) { r.seen = true; } } },
    icon: ic((p) => { p.rect(5, 6, 9, 5, hex('#e8e4d8')); p.rect(5, 10, 9, 1, hex('#b8b4a8')); p.line(4, 14, 9, 14, hex('#e8e4d8')); p.line(9, 14, 14, 12, hex('#e8e4d8')); }) },
  { id: 'ch_bottle_cap', name: 'Bottle Cap', kind: 'charm', desc: 'Buttons multiply', effect: ['20% chance for picked-up buttons to count double.'],
    hooks: { onPickupCollect: (w, kind: string) => { if (kind.startsWith('button') && Math.random() < 0.2) { w.player.buttons = Math.min(99, w.player.buttons + (kind === 'button' ? 1 : kind === 'button5' ? 5 : 10)); w.fx.text(w.player.x, w.player.y - 30, 'x2', '#ffe070'); } } },
    icon: ic((p) => { const c = ramp('#c83a3a'); p.ball(9, 9, 6, 5, c); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; p.set(9 + Math.cos(a) * 6.5, 9 + Math.sin(a) * 5.5, c[1]); } p.ring(9, 9, 3, c[3]); }) },
  { id: 'ch_milk_tooth', name: 'Milk Tooth', kind: 'charm', desc: 'Kills can heal', effect: ['5% chance for a killed enemy to drop half a heart.'],
    hooks: { onKill: (w, e) => { if (Math.random() < 0.05) spawnDrop(w, 'heartHalf', e.x, e.y); } },
    icon: ic((p) => { const c = ramp('#e8e0d0'); p.ball(9, 7, 5, 4, c); p.tube(6, 9, 6, 14, 1.6, c); p.tube(12, 9, 12, 14, 1.6, c); }) },
  { id: 'ch_fuse', name: 'Spare Fuse', kind: 'charm', desc: 'Bigger blasts', effect: ['Cherry bomb explosions are larger and hit harder.'], 
    icon: ic((p) => { p.line(3, 14, 8, 9, hex('#8a6a4a')); p.line(8, 9, 12, 7, hex('#8a6a4a')); p.ball(13, 5, 2, 2, ramp('#ffb040')); p.set(14, 3, '#fff0a0'); }) },
  { id: 'ch_paper_crown', name: 'Paper Crown', kind: 'charm', desc: 'King of the cellar', effect: ['Fire rate +0.4, Speed -0.1.'], stats: { tears: 0.4, speed: -0.1 },
    icon: ic((p) => { const c = ramp('#e0c860'); p.poly([3, 13, 3, 6, 6, 9, 9, 4, 12, 9, 15, 6, 15, 13], c[2]); p.rect(3, 12, 13, 2, c[1]); p.set(9, 6, '#c83a3a'); }) },
  { id: 'ch_candle_stub', name: 'Candle Stub', kind: 'charm', desc: 'A little more light', effect: ['Your light reaches further and shots have a 5% chance to burn.'], attack: { burn: 0.05 },
    icon: ic((p) => { const w = ramp('#e8dcc0'); p.rect(6, 8, 6, 7, w[2]); p.rect(6, 8, 6, 1, w[4]); p.ball(9, 5, 1.6, 2.5, ramp('#f0a040')); }) },
];
// Spare fuse is applied through bomb mods
(CHARMS.find((c) => c.id === 'ch_fuse') as any).bomb = { radiusAdd: 12, damageAdd: 20 };
void PixelArt;
