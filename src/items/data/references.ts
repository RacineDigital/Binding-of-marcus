// Niche real-life references. Two sets, each with a transformation:
//   'drain' - Bladee / Drain Gang (Icedancer, Gluee, Red Light, 333, Spiderr, Be Nice 2 Me, Exeter...)
//   'vamp'  - Playboi Carti (Whole Lotta Red, Die Lit, Vamp Anthem, Magnolia, Sky, Stop Breathing...)
// plus a handful of internet-era objects (brick phone, pocket pet, lava lamp, Frutiger Aero, Y2K),
// and 'jeffy' - Jeffy (SML): the diaper, the pencil up the nose and the blue bike helmet.
import type { ItemDef } from '../types';
import { I, ramp, hex, P, conditional, counter } from './kit';
import { TAU } from '../../core/math';
import { spawnDrop, rollDropKind } from '../../game/drops';
import { RNG } from '../../core/rng';
import { familiarIcon } from '../../art/familiars';
import { spawnInkling } from '../familiar_rt';
import type { World } from '../../game/world';
import type { Enemy } from '../../enemies/enemy';

// ---------------------------------------------------------------- icon helpers
function digit3(p: P, x: number, y: number, c: string): void {
  p.rect(x, y, 3, 1, hex(c)); p.rect(x + 2, y, 1, 5, hex(c)); p.rect(x + 1, y + 2, 2, 1, hex(c)); p.rect(x, y + 4, 3, 1, hex(c));
}
function sparkle(p: P, x: number, y: number, c = '#ffffff'): void { p.set(x, y, c); p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c); }
function snowflake(p: P, cx: number, cy: number, r: number, c: string, c2: string): void {
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU - Math.PI / 2;
    p.line(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, hex(c));
    const bx = cx + Math.cos(a) * r * 0.6, by = cy + Math.sin(a) * r * 0.6;
    p.line(bx, by, bx + Math.cos(a + 0.9) * 2, by + Math.sin(a + 0.9) * 2, hex(c2));
    p.line(bx, by, bx + Math.cos(a - 0.9) * 2, by + Math.sin(a - 0.9) * 2, hex(c2));
  }
  p.set(cx, cy, '#ffffff');
}

/** Freeze/slow helpers used by actives. */
function forEachEnemy(w: World, fn: (e: Enemy) => void): number {
  let n = 0;
  for (const e of w.enemies) if (!e.dead && !e.friendly) { fn(e); n++; }
  return n;
}

export const REFERENCES: ItemDef[] = [
  // =============================================================== DRAIN
  { id: 'icedancer', name: 'Icedancer', kind: 'passive', quality: 3, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Skate through it', effect: ['Shots chill enemies, slowing them (35% chance).', 'Chilled enemies shatter into 6 ice shards when they die.'],
    stats: { speed: 0.15 }, attack: { slow: 0.35, tint: '#9ad8ff' },
    lore: 'A skate boot laced with frost. It glides even on stone.',
    hooks: { onKill: (w, e) => {
      if (e.slow <= 0) return;
      const pl = w.player;
      for (let i = 0; i < 6; i++) w.proj.player(w, { ...pl.prof, split: 0, explode: 0 } as any, e.x, e.y - 4, 6, (i / 6) * TAU + Math.random() * 0.3, pl.stats.damage * 0.5, 210, 90, 0.7, 1);
      w.fx.sparks(e.x, e.y - 6, 10, '#c8f0ff', 140);
    } },
    icon: (p) => {
      const b = ramp('#e8f2ff'), bl = ramp('#4a90d0');
      p.rect(6, 3, 6, 9, b[3]); p.rect(6, 3, 6, 1, b[4]); p.rect(11, 5, 1, 7, b[1]);
      p.rect(6, 9, 9, 3, b[2]); p.rect(14, 10, 1, 2, b[1]);
      for (let y = 4; y < 9; y += 2) { p.set(8, y, bl[2]); p.set(10, y, bl[2]); }
      p.rect(4, 13, 12, 1, hex('#c8d8e8')); p.set(15, 12, '#c8d8e8'); p.rect(7, 12, 1, 1, hex('#8aa0b8')); p.rect(13, 12, 1, 1, hex('#8aa0b8'));
      sparkle(p, 3, 4, '#c8f0ff');
    } },
  { id: 'gluee', name: 'Gluee', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Everything sticks', effect: ['Shots leave sticky puddles that hurt enemies.', 'Shots slow enemies (20% chance).', 'Fire rate up.'],
    stats: { tears: 0.3 }, attack: { creep: true, slow: 0.2, tint: '#7ab8ff' },
    icon: (p) => {
      const w = ramp('#e8eef8'), cap = ramp('#3a7ad0');
      p.rect(5, 6, 8, 10, w[2]); p.rect(5, 6, 1, 10, w[4]); p.rect(12, 6, 1, 10, w[1]);
      p.rect(7, 2, 4, 4, cap[2]); p.rect(8, 1, 2, 1, cap[3]);
      p.rect(6, 9, 6, 4, cap[3]); p.rect(7, 10, 4, 2, hex('#e8f0ff'));
      p.set(4, 13, cap[3]); p.set(4, 14, cap[3]); p.set(4, 16, cap[2]);
    } },
  { id: 'red_light', name: 'Red Light', unlock: 'daily_first', kind: 'passive', quality: 3, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Hold still', effect: ['While you stand still, damage x1.4.'],
    hooks: { onTick: (w) => { const pl = w.player; conditional(w, 'red_light', Math.hypot(pl.vx, pl.vy) < 12 && !pl.dead, { stats: { damageMult: 1.4 }, attack: { tint: '#ff3040' } }); } },
    icon: (p) => {
      const g = ramp('#ff3040');
      p.ball(9, 8, 5, 5.5, g); p.ball(9, 7, 2.5, 2.5, ramp('#ffb0b8'));
      p.rect(7, 13, 5, 3, hex('#8a8a92')); p.rect(7, 14, 5, 1, hex('#5a5a62')); p.rect(8, 16, 3, 1, hex('#3a3a42'));
      p.set(3, 3, '#ff6070'); p.set(15, 3, '#ff6070'); p.set(2, 9, '#ff6070'); p.set(16, 9, '#ff6070');
    } },
  { id: 'angel_333', name: '333', unlock: 'flawless_floor', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Angel numbers', effect: ['Luck up.', '15% chance for a bold critical hit (3x damage).'],
    stats: { luck: 3 }, attack: { crit: 0.15 },
    icon: (p) => { p.ring(9, 9, 7, '#5a4a8a', 1); digit3(p, 3, 7, '#f0e080'); digit3(p, 7, 7, '#f0e080'); digit3(p, 11, 7, '#f0e080'); sparkle(p, 14, 3, '#fff8c0'); } },
  { id: 'drain_butterfly', name: 'Drain Butterfly', unlock: 'transform_drain', kind: 'passive', quality: 4, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Weightless', effect: ['Flight.', 'Shots flutter and pass through rocks.', 'Damage up, speed up.'],
    flight: true, stats: { speed: 0.1, damage: 1, damageMult: 1.2 }, attack: { wiggle: 6, spectral: true, tint: '#c8e0ff' },
    icon: (p) => {
      const a = ramp('#a8d0ff'), b = ramp('#e8f0ff');
      p.ball(5, 6, 4, 4.5, a); p.ball(13, 6, 4, 4.5, a); p.ball(5.5, 12, 3, 3, b); p.ball(12.5, 12, 3, 3, b);
      p.ball(4, 5, 1.5, 1.5, ramp('#5a7ad0')); p.ball(14, 5, 1.5, 1.5, ramp('#5a7ad0'));
      p.rect(8, 4, 2, 11, hex('#2a2440')); p.line(8, 4, 6, 1, hex('#2a2440')); p.line(9, 4, 11, 1, hex('#2a2440'));
    } },
  { id: 'spiderr', name: 'Spiderr', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Spin the web', effect: ['Shots slow enemies (25% chance).', '25% chance for killed enemies to leave an ink spider that fights for you.'],
    attack: { slow: 0.25 },
    hooks: { onKill: (w, e) => { if (Math.random() < 0.25) spawnInkling(w, e.x, e.y); } },
    icon: (p) => {
      const c = ramp('#2a2a3e');
      for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { const y = 6 + k * 2.4; p.line(9, 9, 9 + s * 6, y - 2 + (k % 2), c[3]); p.line(9 + s * 6, y - 2 + (k % 2), 9 + s * 7, y + 2, c[2]); }
      p.ball(9, 10, 3.5, 3.5, c); p.ball(9, 6, 2.2, 2, c);
      p.set(8, 6, '#9ad8ff'); p.set(10, 6, '#9ad8ff'); p.line(9, 1, 9, 4, hex('#c8c8d8'));
    } },
  { id: 'be_nice_2_me', name: 'Be Nice 2 Me', kind: 'passive', quality: 3, pools: { blessing: 0.8 }, tags: ['drain'],
    pickup: 'Please', effect: ['+1 Heart container.', 'Shots can charm enemies so they fight for you (12% chance).'],
    health: { containers: 1, heal: 2 }, attack: { charm: 0.12, tint: '#ffa0d0' },
    icon: (p) => { I.heart(p, '#ff8ac0', 9, 10, 1.1); sparkle(p, 14, 3); sparkle(p, 3, 4, '#ffd0e8'); p.set(6, 7, '#ffffff'); } },
  { id: 'exeter', name: 'Exeter', unlock: 'supersecret', kind: 'active', quality: 3, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'A cold room', effect: ['Freezes every enemy in the room solid for 4 seconds.'],
    active: { charge: 4, type: 'room', use: (w) => {
      const n = forEachEnemy(w, (e) => { e.freeze = Math.max(e.freeze, e.isBoss ? 1.5 : 4); w.fx.sparks(e.x, e.y - 8, 6, '#c8f0ff', 80); });
      w.whiteFlash = 0.5; w.audio.play('chime');
      w.cancelEnemyShotsNear(w.player.x, w.player.y, 9999);
      return n > 0;
    } },
    icon: (p) => { snowflake(p, 9, 9, 7, '#a8e0ff', '#e8f8ff'); } },
  { id: 'trash_island', name: 'Trash Island', unlock: 'runs_5', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Washed ashore', effect: ['Each chapter, a pile of three random pickups washes up beside you.'],
    hooks: {
      onPickup: (w) => { for (let i = 0; i < 3; i++) spawnDrop(w, rollDropKind(new RNG(Math.random()), w.player.stats.luck, 'small') ?? 'button', w.player.x, w.player.y + 12); },
      onFloor: (w) => { for (let i = 0; i < 3; i++) spawnDrop(w, rollDropKind(new RNG(Math.random()), w.player.stats.luck, 'small') ?? 'button', w.player.x, w.player.y + 12); },
    },
    icon: (p) => {
      p.ellipse(9, 14, 8, 2.5, hex('#d8c080')); p.ellipse(9, 14, 6, 1.5, hex('#e8d8a0'));
      const g = ramp('#7a8a8a'); p.rect(6, 5, 7, 9, g[2]); p.rect(6, 5, 1, 9, g[4]); p.rect(12, 5, 1, 9, g[1]);
      p.rect(5, 3, 9, 2, g[3]); p.rect(8, 2, 3, 1, g[1]);
      for (let x = 8; x < 12; x += 2) p.line(x, 7, x, 12, g[1]);
      p.set(14, 2, '#6ac0e0'); p.set(15, 3, '#6ac0e0');
    } },
  { id: 'crest', name: 'Crest', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Wear it', effect: ['+1 Wax heart.', 'Damage up. Star-shaped shots.'],
    health: { wax: 2 }, stats: { damage: 0.5 }, attack: { shape: 'star' },
    icon: (p) => {
      const s = ramp('#8aa8d8');
      p.poly([3, 3, 15, 3, 15, 9, 9, 16, 3, 9], s[2]); p.poly([3, 3, 9, 3, 9, 16, 3, 9], s[3]);
      p.line(3, 3, 15, 3, s[4]);
      p.poly([9, 5, 10.2, 8, 13, 8.2, 10.8, 10, 11.6, 13, 9, 11.2, 6.4, 13, 7.2, 10, 5, 8.2, 7.8, 8], hex('#fff0a0'));
    } },
  { id: 'cold_visions', name: 'Cold Visions', unlock: 'secrets_25', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'See it all', effect: ['Reveals the layout of every chapter (not hidden rooms).', 'Range up.'],
    stats: { range: 40 },
    hooks: {
      onPickup: (w) => { for (const r of w.floor.rooms) if (r.type !== 'secret' && r.type !== 'supersecret') r.seen = true; },
      onFloor: (w) => { for (const r of w.floor.rooms) if (r.type !== 'secret' && r.type !== 'supersecret') r.seen = true; },
    },
    icon: (p) => {
      p.ellipse(9, 9, 8, 4.5, hex('#e8f2ff')); p.ball(9, 9, 3.5, 3.5, ramp('#5a9ad8'));
      snowflake(p, 9, 9, 2.5, '#e8f8ff', '#ffffff');
      p.line(1, 9, 3, 6, hex('#2a3a5a')); p.line(17, 9, 15, 6, hex('#2a3a5a'));
    } },
  { id: 'ginseng_strip', name: 'Ginseng Strip', kind: 'passive', quality: 2, pools: { blessing: 1 }, tags: ['drain'],
    pickup: 'Sad boy energy', effect: ['Fire rate up. Speed up.'],
    stats: { tears: 0.45, speed: 0.1 },
    lore: 'From 2002, or so the label claims.',
    icon: (p) => {
      const b = ramp('#4a9a5a');
      p.rect(6, 5, 6, 11, b[2]); p.rect(6, 5, 1, 11, b[4]); p.rect(11, 5, 1, 11, b[1]);
      p.rect(7, 2, 4, 3, b[1]); p.rect(7, 1, 4, 1, hex('#c8a04a'));
      p.rect(6, 8, 6, 4, hex('#f0e8c8')); p.rect(7, 9, 4, 1, hex('#c83a3a')); p.rect(7, 10, 3, 1, hex('#2a6a3a'));
    } },
  { id: 'iced_tea', name: 'Tallboy Iced Tea', unlock: 'shop_10', kind: 'passive', quality: 1, pools: { shop: 1.2 },
    pickup: 'Still 99 cents', effect: ['+1 Heart container. Heals 2 hearts.', 'Shot speed up.'],
    health: { containers: 1, heal: 4 }, stats: { shotSpeed: 0.15 },
    icon: (p) => {
      const c = ramp('#5ac0b0');
      p.rect(5, 2, 8, 15, c[2]); p.rect(5, 2, 2, 15, c[4]); p.rect(12, 2, 1, 15, c[1]);
      p.rect(5, 1, 8, 1, hex('#c8c8d0')); p.rect(5, 16, 8, 1, hex('#a8a8b0'));
      for (const [x, y] of [[8, 6], [10, 10], [7, 12]]) { p.set(x, y, '#f080a0'); p.set(x + 1, y, '#f8a0b8'); p.set(x, y + 1, '#f8a0b8'); }
      p.rect(6, 4, 6, 1, hex('#e8c040'));
    } },

  // =============================================================== VAMP
  { id: 'whole_lotta_red', name: 'Whole Lotta Red', unlock: 'transform_vamp', kind: 'passive', quality: 4, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Rage', effect: ['Damage up and damage x1.2. Shots burn (15% chance).', 'Taking damage sends you into a 5 second rage: fire rate x1.6.'],
    stats: { damage: 1, damageMult: 1.2 }, attack: { burn: 0.15, shape: 'blood', tint: '#e01a2a' },
    hooks: { onHurt: (w) => { w.player.clearTemp((t) => t.id === 'wlr_rage'); w.player.addTemp({ id: 'wlr_rage', time: 5, stats: { tearsMult: 1.6 } }); w.redFlash = 0.8; w.hud.toast('RAGE', 1); } },
    icon: (p) => {
      p.ball(9, 9, 7.5, 7.5, ramp('#c81828')); for (const r of [6, 4.5]) p.ring(9, 9, r, '#8a0e18');
      p.ball(9, 9, 2.4, 2.4, ramp('#1a0a10')); p.set(9, 9, '#e8e0e0');
      p.line(4, 5, 6, 3, hex('#ff6a70'));
    } },
  { id: 'die_lit', name: 'Die Lit', unlock: 'kills_2000', kind: 'passive', quality: 3, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Go out loud', effect: ['Enemies explode when they die, hurting nearby enemies (never you).'],
    hooks: { onKill: (w, e) => { if (!e.isBoss) w.explode(e.x, e.y, 30, w.player.stats.damage * 2 + 4, { small: true, friendly: true, noPlayer: true, source: 'die_lit' }); } },
    icon: (p) => {
      p.ball(9, 11, 5, 4.5, ramp('#e8e0d0')); p.rect(6, 14, 6, 3, hex('#d8d0c0'));
      p.rect(6, 10, 2, 2, hex('#1a0a10')); p.rect(10, 10, 2, 2, hex('#1a0a10')); p.set(9, 13, '#1a0a10');
      for (let i = 0; i < 4; i++) p.poly([5 + i * 2.5, 7, 6 + i * 2.5, 1 + (i % 2) * 2, 7.5 + i * 2.5, 7], hex(i % 2 ? '#ffb040' : '#ff6a2a'));
    } },
  { id: 'vamp_anthem', name: 'Vamp Anthem', kind: 'passive', quality: 3, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Drink up', effect: ['Damage up.', 'Shots have a small chance to heal you.', 'Every 12 kills heals half a heart.'],
    stats: { damage: 0.6 }, attack: { lifesteal: 0.25 },
    hooks: { onKill: (w) => { if (counter(w, 'vamp_anthem') % 12 === 0) { w.player.healRed(1, true); w.fx.stars(w.player.x, w.player.y - 18, 4, '#ff4050'); } } },
    icon: (p) => {
      p.ellipse(9, 9, 7, 4, hex('#6a0a18')); p.ellipse(9, 8, 6, 2.5, hex('#2a0408'));
      p.poly([5, 7, 7, 7, 6, 12], hex('#f4f0e8')); p.poly([11, 7, 13, 7, 12, 12], hex('#f4f0e8'));
      p.set(6, 12, '#d01828'); p.set(12, 12, '#d01828'); p.set(12, 14, '#d01828');
    } },
  { id: 'shoota', name: 'Shoota', unlock: 'fast_floor', kind: 'passive', quality: 2, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Rapid', effect: ['Fire rate up. Shot speed up.'],
    stats: { tears: 0.6, shotSpeed: 0.25 },
    icon: (p) => {
      p.poly([9, 1, 11, 7, 17, 8, 12, 11, 14, 17, 9, 13, 4, 17, 6, 11, 1, 8, 7, 7], hex('#e01a2a'));
      p.poly([9, 4, 10, 8, 13, 8.5, 10.5, 10.5, 11.5, 14, 9, 11.8, 6.5, 14, 7.5, 10.5, 5, 8.5, 8, 8], hex('#ff8a90'));
    } },
  { id: 'magnolia', name: 'Magnolia', kind: 'passive', quality: 2, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'In bloom', effect: ['+1 Heart container. Luck up.', '10% chance to find a heart after clearing a room.'],
    health: { containers: 1, heal: 2 }, stats: { luck: 1 }, attack: { tint: '#f0a0c8' },
    hooks: { onRoomClear: (w) => { if (Math.random() < 0.1) spawnDrop(w, 'heart', w.room.center().x, w.room.center().y + 20); } },
    icon: (p) => {
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU - Math.PI / 2; p.ball(9 + Math.cos(a) * 4, 9 + Math.sin(a) * 4, 3, 3, ramp('#f4b0d0')); }
      p.ball(9, 9, 2.2, 2.2, ramp('#f0d060')); p.line(9, 14, 9, 17, hex('#4a7a3a'));
    } },
  { id: 'sky', name: 'Sky', kind: 'passive', quality: 3, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Above it', effect: ['Flight.', 'Range up.'],
    flight: true, stats: { range: 60 },
    icon: (p) => {
      const c = ramp('#e8eef8');
      p.ball(6, 10, 4, 3.5, c); p.ball(11, 8, 5, 4.5, c); p.ball(14, 11, 3, 2.5, c); p.rect(3, 11, 13, 3, c[2]);
      p.rect(3, 13, 13, 1, c[1]);
      sparkle(p, 4, 3, '#fff0a0'); p.set(15, 2, '#fff0a0');
    } },
  { id: 'stop_breathing', name: 'Stop Breathing', unlock: 'dmg_20', kind: 'active', quality: 3, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Hold it', effect: ['Every enemy in the room chokes: frozen for 2.5 seconds and hit for heavy damage.'],
    active: { charge: 3, type: 'room', use: (w) => {
      const dmg = 20 + w.player.stats.damage * 4;
      const n = forEachEnemy(w, (e) => { e.freeze = Math.max(e.freeze, e.isBoss ? 0.8 : 2.5); w.damageEnemy(e, e.isBoss ? dmg * 0.6 : dmg, { ang: 0, knock: 0, source: 'stop_breathing' }); });
      w.redFlash = 0.5; w.shake(3); w.audio.play('bossRoar', { vol: 0.5 });
      return n > 0;
    } },
    icon: (p) => {
      const l = ramp('#e07080');
      p.ball(5.5, 10, 3.5, 5.5, l); p.ball(12.5, 10, 3.5, 5.5, l); p.rect(8, 2, 2, 7, hex('#c8c0c8'));
      p.line(3, 3, 15, 15, hex('#1a0a10')); p.line(15, 3, 3, 15, hex('#1a0a10')); p.line(4, 3, 15, 14, hex('#1a0a10')); p.line(14, 3, 3, 14, hex('#1a0a10'));
    } },
  { id: 'rockstar_made', name: 'Rockstar Made', unlock: 'all_bosses', kind: 'passive', quality: 3, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Power chord', effect: ['Every 6th volley also fires a ring of 8 shots around you.'],
    hooks: { onFire: (w) => {
      if (counter(w, 'rockstar') % 6 !== 0) return;
      const pl = w.player;
      for (let i = 0; i < 8; i++) w.proj.player(w, pl.prof, pl.x, pl.y - 6, 10, (i / 8) * TAU, pl.stats.damage, 220 * pl.stats.shotSpeed, pl.stats.range * 0.7, 1);
      w.fx.ring(pl.x, pl.y - 6, 4, 26, 'rgba(255,80,90,0.8)', 0.25);
    } },
    icon: (p) => {
      const r = ramp('#d01828');
      p.poly([3, 15, 9, 8, 12, 11, 6, 17], r[2]); p.poly([9, 8, 4, 6, 7, 11], r[3]);
      p.line(10, 9, 16, 2, hex('#3a2a20')); p.line(11, 9, 16, 3, hex('#5a4a3a'));
      p.rect(15, 1, 2, 2, hex('#1a1014')); for (let i = 0; i < 3; i++) p.set(6 + i, 12 + i, '#e8e0d0');
    } },
  { id: 'slatt', name: 'Slatt', unlock: 'deals_3', kind: 'passive', quality: 2, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'Slime love', effect: ['Shots poison enemies (25% chance).', 'Shots leave toxic puddles.'],
    attack: { poison: 0.25, creep: true, tint: '#6ae04a' },
    icon: (p) => { I.heart(p, '#5ad040', 9, 9, 1.1); p.set(6, 14, '#5ad040'); p.set(6, 15, '#4ab030'); p.set(12, 15, '#5ad040'); p.set(12, 16, '#4ab030'); p.set(7, 6, '#d0ffc0'); } },
  { id: 'narcissist', name: 'Narcissist', unlock: 'win_hard', kind: 'familiar', quality: 3, pools: { secret: 0.8 }, tags: ['vamp'],
    pickup: 'Look at yourself', effect: ['A reflection follows you and copies your shots (with all their effects) at reduced damage.'],
    familiar: { kind: 'follower', shoot: { dmg: 0.35, rate: 2, inherit: true }, sprite: 'narcissist' }, icon: familiarIcon('narcissist') },
  { id: 'baby_voice', name: 'Baby Voice', kind: 'passive', quality: 1, pools: { secret: 1 }, tags: ['vamp'],
    pickup: 'What did he say?', effect: ['Shots confuse enemies (12% chance).', 'Speed up.'],
    stats: { speed: 0.05 }, attack: { confuse: 0.12 },
    icon: (p) => {
      p.ellipse(9, 10, 6, 4, hex('#f4a0c8')); p.ellipse(9, 10, 4, 2.5, hex('#ffd0e4'));
      p.ball(9, 10, 1.8, 1.8, ramp('#e870a8')); p.ring(9, 4, 2.5, '#f4a0c8', 1); p.rect(8, 6, 2, 2, hex('#f4a0c8'));
    } },

  // =============================================================== INTERNET-ERA OBJECTS
  { id: 'brick_phone', name: 'Brick Phone', unlock: 'deaths_10', kind: 'active', quality: 3, pools: { treasure: 1 },
    pickup: 'Indestructible', effect: ['Throw the phone: a huge shot that pierces everything and flies back to you.'],
    active: { charge: 2, type: 'room', use: (w) => {
      const pl = w.player;
      const prof = { ...pl.prof, pierce: 999, boomerang: true, split: 0, shape: 'void', tint: '#8a9aa8' } as any;
      w.proj.player(w, prof, pl.x, pl.y - 8, 10, pl.aimAng, pl.stats.damage * 6 + 15, 260, 260, 2.4);
      w.audio.play('bigshot');
    } },
    icon: (p) => {
      const c = ramp('#4a5a6a');
      p.rect(5, 1, 8, 16, c[2]); p.rect(5, 1, 1, 16, c[4]); p.rect(12, 1, 1, 16, c[1]);
      p.rect(6, 3, 6, 5, hex('#9ac85a')); p.rect(7, 4, 3, 1, hex('#5a8a3a'));
      for (let y = 10; y < 16; y += 2) for (let x = 6; x < 12; x += 2) p.set(x, y, '#c8d0d8');
    } },
  { id: 'pocket_pet', name: 'Pocket Pet', unlock: 'buttons_500', kind: 'familiar', quality: 2, pools: { shop: 0.8 },
    pickup: 'Feed it', effect: ['A little digital pet. Every 3 rooms cleared, it gives you a heart, a button or a key.'],
    familiar: { kind: 'follower', spawnEvery: 3, spawnDrop: ['heart', 'button', 'key', 'heartHalf'], sprite: 'pocket_pet' }, icon: familiarIcon('pocket_pet') },
  { id: 'lava_lamp', name: 'Lava Lamp', unlock: 'kills_250', kind: 'passive', quality: 3, pools: { treasure: 1 },
    pickup: 'Groovy', effect: ['Shots drift like warm wax: they wiggle, grow as they fly and burn (25% chance).'],
    attack: { wiggle: 7, grow: 0.5, burn: 0.25, tint: '#ff8a3a' },
    icon: (p) => {
      p.poly([6, 4, 12, 4, 14, 14, 4, 14], hex('#d8501a')); p.poly([7, 4, 9, 4, 8, 14, 5, 14], hex('#e8702a'));
      p.ball(9, 7, 1.8, 1.8, ramp('#ffd040')); p.ball(10, 11, 2.2, 2, ramp('#ffd040'));
      p.rect(5, 2, 8, 2, hex('#8a8a98')); p.rect(4, 14, 10, 3, hex('#8a8a98')); p.rect(4, 14, 10, 1, hex('#b8b8c8'));
    } },
  { id: 'aero_bubble', name: 'Aero Bubble', unlock: 'items_15', kind: 'passive', quality: 2, pools: { treasure: 1 },
    pickup: 'Glossy', effect: ['Shots bounce off walls and rocks once. Luck up. Range up.'],
    stats: { luck: 1, range: 30 }, attack: { bounce: 1, tint: '#7ad0ff' },
    icon: (p) => {
      p.ball(9, 9, 7, 7, ramp('#4ab0e8')); p.ball(9, 10, 5.5, 5, ramp('#8ae0ff'));
      p.ellipse(7, 5, 3.5, 1.8, hex('#ffffff')); p.set(12, 13, '#ffffff'); p.ellipse(11, 14, 2, 0.8, hex('#d0f4ff'));
      p.line(2, 15, 5, 13, hex('#6ad070'));
    } },
  { id: 'y2k_bug', name: 'Y2K Bug', unlock: 'runs_25', kind: 'passive', quality: 2, pools: { curse: 1 },
    pickup: '00/00/00', effect: ['Every chapter your stats glitch: two random stats go up a lot, one goes down.'],
    hooks: {
      onPickup: (w) => glitchStats(w),
      onFloor: (w) => glitchStats(w),
    },
    icon: (p) => {
      const c = ramp('#3a9a4a');
      p.ball(9, 10, 5, 6, c); p.line(9, 4, 9, 16, c[1]);
      for (const y of [7, 10, 13]) { p.line(4, y, 1, y - 1, hex('#1a3a20')); p.line(14, y, 17, y - 1, hex('#1a3a20')); }
      p.rect(6, 8, 2, 3, hex('#0a1a0a')); p.rect(10, 8, 2, 3, hex('#0a1a0a')); p.set(6, 9, '#8aff8a'); p.set(10, 9, '#8aff8a');
    } },
  // ---------------------------------------------------------------- Jeffy
  { id: 'big_boy_diaper', name: 'Big Boy Diaper', kind: 'passive', quality: 2, pools: { shop: 0.6 }, tags: ['jeffy'],
    pickup: 'I\'m a big boy!', effect: ['Speed up.', 'Getting hit leaves a puddle that hurts enemies standing in it.'],
    stats: { speed: 0.15 },
    hooks: { onHurt: (w) => { w.addCreep(w.player.x, w.player.y, 20, 'player', w.player.stats.damage * 1.2, 5, '#e8d040'); w.hud.toast('Uh oh.', 1); } },
    icon: (p) => {
      const c = ramp('#f4f2ec');
      p.poly([2, 5, 16, 5, 13, 15, 5, 15], c[3]); p.shadeV(2, 5, 15, 11, c, 0.6);
      p.rect(2, 5, 15, 2, hex('#ffffff')); p.rect(1, 6, 3, 2, hex('#7ab8f0')); p.rect(15, 6, 3, 2, hex('#7ab8f0'));
      p.set(7, 10, '#f0d860'); p.set(10, 11, '#f0d860'); p.set(8, 12, '#e8c840');
    } },
  { id: 'nose_pencil', name: 'Nose Pencil', kind: 'passive', quality: 2, pools: { shop: 1 }, tags: ['jeffy'],
    pickup: 'Why\'d you have to do that?', effect: ['Damage up.', 'Your shots are sharpened pencils that pierce the first enemy.'],
    stats: { damage: 0.6 }, attack: { pierce: 1, shape: 'needle', tint: '#f0c030' },
    icon: (p) => {
      p.line(3, 15, 13, 5, hex('#e8b020'), 3); p.line(4, 15, 14, 5, hex('#f8d050'), 1);
      p.poly([13, 3, 16, 2, 15, 5], '#e8c8a0'); p.set(15, 3, '#2a2a2a');
      p.rect(1, 15, 3, 3, hex('#e88a9a')); p.rect(3, 14, 2, 2, hex('#b8b8c0'));
    } },
  { id: 'bike_helmet', name: 'Blue Bike Helmet', kind: 'passive', quality: 2, pools: { shop: 0.8 }, tags: ['jeffy'],
    pickup: 'Safety first', effect: ['+1 wax heart.', 'Your own bombs can\'t hurt you.'],
    health: { wax: 2 },
    icon: (p) => {
      const c = ramp('#2a6ad8');
      p.ball(9, 9, 7, 6, c); p.rect(2, 10, 15, 3, c[1]);
      for (const x of [6, 9, 12]) p.line(x, 4, x, 8, c[0]);
      p.set(6, 6, '#a8d0ff'); p.set(7, 5, '#a8d0ff');
      p.line(3, 13, 6, 16, hex('#1a1a2a')); p.line(15, 13, 12, 16, hex('#1a1a2a'));
    } },
];

function glitchStats(w: World): void {
  const pool: [string, number][] = [['damage', 1.2], ['tears', 0.6], ['speed', 0.2], ['range', 60], ['shotSpeed', 0.3], ['luck', 2]];
  const pick = pool.slice().sort(() => Math.random() - 0.5);
  const stats: Record<string, number> = {};
  stats[pick[0][0]] = pick[0][1]; stats[pick[1][0]] = pick[1][1]; stats[pick[2][0]] = -pick[2][1] * 0.5;
  const pl = w.player;
  pl.clearTemp((t) => t.id === 'y2k');
  pl.addTemp({ id: 'y2k', floor: true, stats: stats as any });
  w.hud.toast('SYSTEM CLOCK RESET', 1.5);
}
