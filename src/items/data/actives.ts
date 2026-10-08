// Active items: charged abilities used with the Active key.
import type { ItemDef, PoolId } from '../types';
import type { World } from '../../game/world';
import { I, ramp, hex } from './kit';
import { spawnDrop } from '../../game/drops';
import { spawnInkling } from '../familiar_rt';
import { revealMap, unlockDoor, spawnPedestal } from '../../game/roomflow';
import { priceFor } from '../../generation/populate';
import { TAU, dist2 } from '../../core/math';
import { Beam, beamScale, overchargeMul } from '../../projectiles/weapons';
import { getItem } from '../registry';
import type { RoomType } from '../../rooms/room';
import { markDie } from './dice';

export function poolForRoom(t: RoomType): PoolId {
  switch (t) {
    case 'shop': return 'shop'; case 'boss': return 'boss'; case 'deal': return 'deal'; case 'blessing': return 'blessing';
    case 'library': return 'library'; case 'secret': case 'supersecret': return 'secret'; case 'cursed': return 'curse';
    case 'arcade': return 'arcade'; case 'challenge': return 'challenge'; default: return 'treasure';
  }
}
export function reroll(w: World): boolean {
  let n = 0;
  for (const p of w.pickups) {
    if (!p.pedestal || !p.data.id || getItem(p.data.id)?.tags?.includes('quest')) continue;
    const id = w.run.pools.roll(poolForRoom(w.room.type));
    p.data.id = id; n++;
    if (p.price > 0) p.price = priceFor(id);
    w.fx.smoke(p.x, p.y - 20, 6, 'rgba(200,190,230,', 5, 0.6); w.fx.stars(p.x, p.y - 24, 6, '#ffffff');
  }
  if (!n) return false;
  w.audio.play('reroll');
  return true;
}

export const ACTIVES: ItemDef[] = [
  { id: 'old_dice', name: 'Grandad\'s Die', kind: 'active', quality: 4, pools: { shop: 1 }, tags: ['dice'],
    pickup: 'Reroll your fate', effect: ['Rerolls every item pedestal in the room into a new item.'], active: { charge: 6, type: 'room', use: (w) => { const ok = reroll(w); if (ok) markDie(w, 'old_dice'); return ok; } },
    icon: (p) => { const c = ramp('#e8dcc0'); p.rect(3, 4, 12, 12, c[2]); p.rect(3, 4, 12, 2, c[4]); p.rect(14, 5, 1, 11, c[0]); for (const [x, y] of [[5, 7], [9, 10], [12, 13], [12, 7], [5, 13]]) p.set(x, y, '#1a1010'); } },
  { id: 'stopped_watch', name: 'Stopped Watch', kind: 'active', quality: 3, pools: { shop: 0.8 }, tags: ['clock'], unlock: 'transform_clock',
    pickup: 'Hold the second hand', effect: ['Enemies and their shots move at half speed for 8 seconds.'], active: { charge: 3, type: 'room', use: (w) => { w.slowT = 8; w.audio.play('chime'); w.whiteFlash = 0.2; } },
    icon: (p) => { p.ball(9, 10, 6, 6, ramp('#9a9aa8')); p.ball(9, 10, 4.5, 4.5, ramp('#efe6d0')); p.line(9, 10, 9, 6, hex('#1a1010')); p.line(9, 10, 12, 10, hex('#1a1010')); p.ring(9, 3, 1.5, '#9a9aa8'); p.line(13, 3, 15, 5, hex('#c83a3a')); } },
  { id: 'sewing_kit', name: 'Sewing Kit', kind: 'active', quality: 2, pools: { treasure: 1 }, tags: ['thread'],
    pickup: 'Patch yourself up', effect: ['Heals one red heart (or adds half a wax heart if you cannot hold red).'],
    active: { charge: 4, type: 'room', use: (w) => { const h = w.player.health; if (h.noRed) h.addExtra('wax', 1); else if (h.red >= h.redMax) return false; else w.player.healRed(2, true); w.audio.play('stitch'); } },
    icon: (p) => { const t = ramp('#8a3a4a'); p.rect(3, 6, 12, 9, t[2]); p.rect(3, 6, 12, 2, t[3]); p.ball(7, 4, 2.5, 2, ramp('#e8e0d0')); p.line(10, 2, 14, 6, hex('#d8d8e0')); } },
  { id: 'cherry_jar', name: 'Cherry Jar', kind: 'active', quality: 1, pools: { shop: 1 },
    pickup: 'Reusable cherry bomb', effect: ['Spawns a cherry bomb pickup.'], active: { charge: 2, type: 'room', use: (w) => { spawnDrop(w, 'bomb', w.player.x, w.player.y); } },
    icon: (p) => { I.jar(p, '#c8283a'); p.ball(7, 11, 1.6, 1.6, ramp('#e04050')); p.ball(11, 12, 1.6, 1.6, ramp('#e04050')); } },
  { id: 'inkpot', name: 'Inkpot', kind: 'active', quality: 3, pools: { deal: 1 }, tags: ['ink'],
    pickup: 'Spill it everywhere', effect: ['Splashes every enemy in the room for 30 damage and floods the floor around you with ink.'],
    active: { charge: 3, type: 'room', use: (w) => { for (const e of w.enemies) if (!e.dead) w.damageEnemy(e, 30 + w.player.stats.damage * 2, { ang: Math.atan2(e.y - w.player.y, e.x - w.player.x), knock: 1.5, source: 'ink' }); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; w.addCreep(w.player.x + Math.cos(a) * 26, w.player.y + Math.sin(a) * 18, 14, 'player', 15, 5); } w.fx.ring(w.player.x, w.player.y, 6, 140, '#3a3480', 0.5); w.audio.play('inkBurst'); w.shake(4); } },
    icon: (p) => { const g = ramp('#3a3a4a'); p.rect(4, 7, 10, 9, g[2]); p.rect(6, 4, 6, 3, g[3]); p.rect(5, 9, 8, 6, hex('#1a1c40')); p.set(6, 10, '#6a64d0'); } },
  { id: 'moth_box', name: 'Moth Box', kind: 'active', quality: 2, pools: { treasure: 1 }, tags: ['moth'],
    pickup: 'Release the swarm', effect: ['Releases four inklings that hunt enemies and burst on contact.'],
    active: { charge: 2, type: 'room', use: (w) => { for (let i = 0; i < 4; i++) spawnInkling(w, w.player.x, w.player.y); w.audio.play('hatch'); } },
    icon: (p) => { const b = ramp('#6a4a2a'); p.rect(3, 7, 12, 9, b[2]); p.rect(2, 5, 14, 3, b[3]); p.set(6, 3, '#c8b48a'); p.set(12, 2, '#c8b48a'); p.set(9, 1, '#c8b48a'); } },
  { id: 'tuning_fork', name: 'Tuning Fork', kind: 'active', quality: 2, pools: { treasure: 1 },
    pickup: 'One clear note', effect: ['A shockwave destroys nearby enemy shots, pushes enemies back and deals 20 damage.'],
    active: { charge: 2, type: 'room', use: (w) => { const pl = w.player; w.fx.ring(pl.x, pl.y - 6, 6, 110, '#e0e8ff', 0.4); w.cancelEnemyShotsNear(pl.x, pl.y, 120); for (const e of w.enemies) if (!e.dead && dist2(e.x, e.y, pl.x, pl.y) < 110 * 110) w.damageEnemy(e, 20, { ang: Math.atan2(e.y - pl.y, e.x - pl.x), knock: 4, source: 'wave' }); w.audio.play('fork'); w.shake(2); } },
    icon: (p) => { const m = ramp('#c8c8d4'); p.tube(6, 2, 6, 9, 1.3, m); p.tube(12, 2, 12, 9, 1.3, m); p.tube(6, 9, 12, 9, 1.3, m); p.tube(9, 9, 9, 16, 1.3, m); } },
  { id: 'pocket_mirror', name: 'Pocket Mirror', kind: 'active', quality: 1, pools: { shop: 1 },
    pickup: 'Step through', effect: ['Teleports you to a random room on this floor.'],
    active: { charge: 2, type: 'room', use: (w) => { const opts = w.floor.rooms.filter((r) => r !== w.room && r.type !== 'supersecret' && (r.type !== 'secret' || r.discovered)); if (!opts.length) return false; w.game.teleport(opts[Math.floor(Math.random() * opts.length)].id); } },
    icon: (p) => { p.ball(9, 8, 6, 6, ramp('#8a6a4a')); p.ball(9, 8, 4.5, 4.5, ramp('#a8c8e0')); p.set(7, 6, '#ffffff'); p.rect(8, 14, 2, 3, hex('#8a6a4a')); } },
  { id: 'chalk_stick', name: 'Stick of Chalk', kind: 'active', quality: 2, pools: { library: 1 },
    pickup: 'Draw the map', effect: ['Reveals the whole floor, including crawlspaces.'], active: { charge: 6, type: 'room', use: (w) => { revealMap(w, true); w.audio.play('secret'); } },
    icon: (p) => { p.rect(6, 3, 6, 12, hex('#e8e4d8')); p.rect(6, 3, 6, 2, hex('#ffffff')); p.rect(11, 5, 1, 10, hex('#b8b4a8')); } },
  { id: 'oil_lantern', name: 'Oil Lantern', kind: 'active', quality: 2, pools: { blessing: 1 }, tags: ['wax'],
    pickup: 'Throw the flame', effect: ['Throws a ring of eight fireballs that set enemies alight.'],
    active: { charge: 3, type: 'room', use: (w) => { const pl = w.player; const prof = { ...pl.prof, burn: 1, shape: 'fire' as const, modes: pl.prof.modes }; for (let i = 0; i < 8; i++) w.proj.player(w, prof, pl.x, pl.y - 4, 10, (i / 8) * TAU, pl.stats.damage * 2 + 4, 200, 200, 1.4); w.audio.play('fireSpit'); } },
    icon: (p) => { p.rect(5, 5, 8, 10, hex('#3a3434')); p.rect(6, 6, 6, 8, ramp('#f0a040')[3]); p.rect(8, 8, 2, 4, hex('#fff8e0')); p.ring(9, 3, 2, '#3a3434'); } },
  { id: 'hand_bell', name: 'Hand Bell', kind: 'active', quality: 2, pools: { treasure: 1 },
    pickup: 'Ring it loud', effect: ['Every enemy flees in fear for 4 seconds.'],
    active: { charge: 2, type: 'room', use: (w) => { for (const e of w.enemies) if (!e.dead && !e.isBoss) e.fear = 4; else if (!e.dead) e.fear = 1.5; w.audio.play('bell'); w.fx.ring(w.player.x, w.player.y - 8, 8, 160, '#f0d070', 0.6); } },
    icon: (p) => { const b = ramp('#c8a04a'); p.poly([4, 13, 6, 5, 12, 5, 14, 13], b[2]); p.shadeV(4, 5, 10, 8, b); p.rect(3, 13, 12, 2, b[1]); p.rect(8, 1, 2, 4, hex('#6a4a2a')); p.ball(9, 15, 1.5, 1.5, b); } },
  { id: 'tailors_shears', name: 'Tailor\'s Shears', kind: 'active', quality: 3, pools: { treasure: 0.8 }, tags: ['thread'], unlock: 'transform_thread',
    pickup: 'Cut through', effect: ['For this room: Damage +2 and shots pierce three enemies.'],
    active: { charge: 3, type: 'room', use: (w) => { w.player.addTemp({ id: 'shears', stats: { damage: 2 }, attack: { pierce: 3 }, room: true }); w.audio.play('snip'); } },
    icon: (p) => { const m = ramp('#c8ccd8'); p.poly([9, 9, 3, 2, 5, 2], m[3]); p.poly([9, 9, 15, 2, 13, 2], m[2]); p.ring(5, 13, 3, '#2a2a2a', 1.5); p.ring(13, 13, 3, '#2a2a2a', 1.5); } },
  { id: 'almanac', name: 'The Almanac', kind: 'active', quality: 2, pools: { library: 1 },
    pickup: 'Forecast: violence', effect: ['For this room: Damage +1.5 and fire rate +0.5.'],
    active: { charge: 2, type: 'room', use: (w) => { w.player.addTemp({ id: 'almanac', stats: { damage: 1.5, tears: 0.5 }, room: true }); w.audio.play('pageUse'); } },
    icon: (p) => I.book(p, '#3a6a4a', (q) => { q.ball(9, 9, 2.5, 2.5, ramp('#f0c040')); }) },
  { id: 'bestiary', name: 'The Bestiary', kind: 'active', quality: 3, pools: { library: 1 },
    pickup: 'Know your enemy', effect: ['Deals 25 damage to every enemy in the room.'],
    active: { charge: 3, type: 'room', use: (w) => { for (const e of w.enemies) if (!e.dead) { w.fx.stars(e.x, e.y - e.hitY, 4, '#f0e0a0'); w.damageEnemy(e, 25, { ang: 0, knock: 0.5, source: 'book' }); } w.audio.play('pageUse'); } },
    icon: (p) => I.book(p, '#6a2a2a', (q) => { q.ball(9, 9, 2.5, 2, ramp('#e8e0d0')); q.set(8, 9, '#1a1010'); q.set(10, 9, '#1a1010'); }) },
  { id: 'hymnal', name: 'The Hymnal', kind: 'active', quality: 3, pools: { library: 1 },
    pickup: 'A protective verse', effect: ['Invincible for 6 seconds.'],
    active: { charge: 4, type: 'room', use: (w) => { w.player.iframes = 6; w.audio.play('choir'); } },
    icon: (p) => I.book(p, '#e8e0d0', (q) => { q.rect(8, 6, 2, 7, hex('#c8a04a')); q.rect(6, 8, 6, 2, hex('#c8a04a')); }) },
  { id: 'atlas', name: 'The Atlas', kind: 'active', quality: 2, pools: { library: 1 },
    pickup: 'Somewhere special', effect: ['Teleports you to a special room you have not visited yet.'],
    active: { charge: 4, type: 'room', use: (w) => { const opts = w.floor.rooms.filter((r) => !r.visited && r.type !== 'normal' && r.type !== 'boss' && r.type !== 'supersecret'); if (!opts.length) return false; const r = opts[Math.floor(Math.random() * opts.length)]; r.discovered = true; w.game.teleport(r.id); } },
    icon: (p) => I.book(p, '#3a4a6a', (q) => { q.ring(9, 9, 3, '#8ac8f0'); q.line(6, 9, 12, 9, hex('#8ac8f0')); }) },
  { id: 'ledger', name: 'The Ledger', kind: 'active', quality: 2, pools: { library: 1 },
    pickup: 'Balance the books', effect: ['Doubles your buttons, up to 10 extra.'],
    active: { charge: 3, type: 'room', use: (w) => { const add = Math.min(10, w.player.buttons); if (!add) return false; w.player.buttons += add; w.audio.play('coinBig'); w.fx.text(w.player.x, w.player.y - 30, '+' + add, '#ffe070'); } },
    icon: (p) => I.book(p, '#5a4a2a', (q) => { I.coin(q, '#e8c040', 9, 9, 2.5); }) },
  { id: 'bookbinders_press', name: 'The Boiler Valve', kind: 'active', quality: 4, pools: { treasure: 0.4 }, unlock: 'win_elias',
    pickup: 'Let the pressure out', effect: ['Crushes weakened enemies (under 40 health) outright and deals 50 damage to the rest.'],
    active: { charge: 4, type: 'room', use: (w) => { for (const e of w.enemies) if (!e.dead) { if (!e.isBoss && e.hp < 40) w.killEnemy(e); else w.damageEnemy(e, 50, { ang: Math.PI / 2, knock: 0, source: 'press' }); } w.shake(7); w.audio.play('slam'); w.whiteFlash = 0.3; } },
    icon: (p) => { const m = ramp('#5a5a66'); p.rect(3, 2, 12, 3, m[3]); p.rect(8, 5, 2, 5, m[2]); p.rect(4, 10, 10, 3, m[2]); p.rect(2, 14, 14, 3, ramp('#6a4a2a')[2]); } },
  { id: 'binders_awl', name: 'Binder\'s Awl', kind: 'active', quality: 2, pools: { treasure: 0.5 }, tags: ['thread'],
    pickup: 'Punch holes', effect: ['Fires a ring of piercing needles. Recharges over 4 seconds.'],
    active: { charge: 4, type: 'timed', use: (w) => { const pl = w.player; const prof = { ...pl.prof, pierce: 99, shape: 'needle' as const, modes: pl.prof.modes, split: 0, orbit: false }; for (let i = 0; i < 8; i++) w.proj.player(w, prof, pl.x, pl.y - 4, 10, (i / 8) * TAU, pl.stats.damage * 1.5, 280, 200, 1); w.audio.play('needle'); } },
    icon: (p) => { p.ball(9, 4, 3, 2.5, ramp('#6a4a2a')); p.line(9, 6, 9, 16, hex('#c8ccd8')); p.set(9, 16, '#ffffff'); } },
  { id: 'locksmith_pick', name: 'Locksmith\'s Pick', kind: 'active', quality: 2, pools: { shop: 1 },
    pickup: 'Click', effect: ['Opens every locked door and chest in the room for free.'],
    active: { charge: 2, type: 'room', use: (w) => { let n = 0; for (const d of w.doors) if (d.def.locked) { unlockDoor(w, d.def); n++; } for (const p of w.pickups) if (p.kind === 'chest:locked' || p.kind === 'chest:reliquary') { p.kind = 'chest:tin'; n++; } if (!n) { spawnDrop(w, 'key', w.player.x, w.player.y); } w.audio.play('unlock'); } },
    icon: (p) => { p.line(3, 15, 12, 6, hex('#a8a8b0')); p.line(12, 6, 14, 6, hex('#a8a8b0')); p.line(14, 6, 14, 3, hex('#a8a8b0')); p.ring(4, 14, 2, '#6a4a2a', 1.5); } },
  { id: 'wishbone', name: 'Wishbone', kind: 'active', quality: 3, pools: { secret: 0.8 },
    pickup: 'Make a wish', effect: ['Breaks to summon a treasure item. Single use.'],
    active: { charge: 0, type: 'room', single: true, use: (w) => { const id = w.run.pools.roll('treasure'); spawnPedestal(w, w.player.x, w.player.y + 30, id, 'treasure'); w.audio.play('secret'); } },
    icon: (p) => { const b = ramp('#e8dcc8'); p.tube(9, 4, 4, 15, 1.4, b); p.tube(9, 4, 14, 15, 1.4, b); p.ball(9, 4, 2, 2, b); } },
  { id: 'wrath_candle', name: 'Candle of Wrath', kind: 'active', quality: 3, pools: { deal: 1 },
    pickup: 'Burn in four directions', effect: ['Fires four searing beams in a cross that inherit your shot effects.'],
    active: { charge: 3, type: 'room', use: (w) => { for (let i = 0; i < 4; i++) { const b = new Beam(w.player.prof); b.ang = (i / 4) * TAU; const oc = overchargeMul(w.player.prof); b.dur = 0.6; b.width = 9 * beamScale(w.player.stats.size) * oc.width; b.dmg = w.player.stats.damage * 0.9 * oc.dmg; b.color = '#ff5040'; w.beams.push(b); } w.shake(4); w.audio.play('beam'); } },
    icon: (p) => { const w = ramp('#3a1a1a'); p.rect(6, 7, 6, 9, w[2]); p.ball(9, 4, 2, 3, ramp('#ff5030')); p.line(1, 4, 5, 4, hex('#ff5030')); p.line(13, 4, 17, 4, hex('#ff5030')); } },
  { id: 'recipe_book', name: 'Recipe Book', kind: 'active', quality: 2, pools: { library: 1 },
    pickup: 'Mix it up', effect: ['Transforms every loose pickup in the room into a different random pickup.'],
    active: { charge: 3, type: 'room', use: (w) => { const loose = w.pickups.filter((p) => !p.pedestal && !p.shop && !p.isChest()); if (!loose.length) return false; for (const p of loose) { p.dead = true; spawnDrop(w, ['button', 'heart', 'key', 'bomb', 'page', 'sweet', 'wax', 'chest'][Math.floor(Math.random() * 8)], p.x, p.y); } w.audio.play('reroll'); } },
    icon: (p) => I.book(p, '#8a5a2a', (q) => { q.ball(9, 9, 2.5, 2, ramp('#c8c8d8')); q.line(8, 6, 10, 4, hex('#c8c8d8')); }) },
  { id: 'glue_pot', name: 'Glue Pot', kind: 'active', quality: 1, pools: { shop: 1 },
    pickup: 'Stuck fast', effect: ['Slows every enemy in the room for 6 seconds.'],
    active: { charge: 2, type: 'room', use: (w) => { for (const e of w.enemies) if (!e.dead) e.slow = 6; w.audio.play('splat'); for (let i = 0; i < 8; i++) w.addCreep(w.player.x + (Math.random() - 0.5) * 80, w.player.y + (Math.random() - 0.5) * 50, 12, 'player', 2, 6, '#c8b888'); } },
    icon: (p) => { const g = ramp('#8a7a5a'); p.rect(4, 7, 10, 9, g[2]); p.rect(3, 5, 12, 3, ramp('#e8e0c8')[3]); p.line(12, 2, 9, 7, hex('#6a4a2a')); } },
  { id: 'marrow_flute', name: 'Marrow Flute', kind: 'active', quality: 3, pools: { curse: 0.6 }, tags: ['bone'], unlock: 'transform_bone',
    pickup: 'A hollow tune', effect: ['Plays three rings of bone shards that burst outward from you.'],
    active: { charge: 2, type: 'room', use: (w) => { const pl = w.player; for (let k = 0; k < 3; k++) w.after(k * 0.22, () => { for (let i = 0; i < 10; i++) w.proj.player(w, { ...pl.prof, shape: 'bone', modes: pl.prof.modes }, pl.x, pl.y - 4, 10, (i / 10) * TAU + k * 0.3, pl.stats.damage * 1.2, 200, 160, 1); w.audio.play('flute', { pitch: 1 + k * 0.12 }); }); } },
    icon: (p) => { const b = ramp('#e8dcc8'); p.tube(3, 15, 15, 3, 1.8, b); for (let i = 0; i < 4; i++) p.set(6 + i * 2.5, 12 - i * 2.5, '#3a2a1a'); } },
  { id: 'fountain_pen', name: 'Fountain Pen', kind: 'active', quality: 3, pools: { deal: 0.5 }, tags: ['ink'], unlock: 'ch_ink',
    pickup: 'Write in splinters', effect: ['For this room: shots split into three on impact and leave ink trails.'],
    active: { charge: 3, type: 'room', use: (w) => { w.player.addTemp({ id: 'fpen', attack: { split: 3, splitOnHit: true, creep: true }, room: true }); w.audio.play('pageUse'); } },
    icon: (p) => { const m = ramp('#1a1a2a'); p.tube(3, 15, 11, 7, 2, m); p.poly([11, 7, 15, 3, 13, 9], hex('#c8a04a')); p.set(14, 4, '#1a1010'); } },
];
void getItem;
