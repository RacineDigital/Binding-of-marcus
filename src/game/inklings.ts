// Inklings: Lost Marcus's signature system. The monsters loose in the cellar are stories; when Marcus
// kills one at the right moment, the ink it was written in stays behind as an Inkling, and he writes
// it into his margins. Each essence changes how he fights, grows from I to III when he writes the same
// one again, and makes that creature's kind recognise its stolen ink (they come at him faster).
//
// How you get them
//   - Every kill pours ink into the meter (by the creature's weight). When it brims, each creature in
//     the room shows the essence it would leave, and the next one you kill leaves its Inkling: you pick
//     which by choosing what to kill.
//   - Champions always leave theirs; so do "annotated" creatures (dark ink aura), which appear more
//     often the more ink you carry. Bosses fill the meter.
//   - Three margins (the Blot, made of ink, has four). Writing an essence you hold raises it a level;
//     with every margin full, stand on the Inkling and press {active} to write over the weakest one.
//
// Order and stacking (the rules every essence follows)
//   1. Profile parts merge after items and charms, with the same rules (numbers add, flags OR), then
//      the usual caps apply. 2. Hooks run after items and charms, in margin order.
//   3. Anything an essence spawns (seekers, splashes, bursts) is depth 1: it can't split, start a
//      cadence, or spawn more of itself. Seekers and radial shots share a budget (a token bucket), and
//      buried bursts are capped, so mass kills stay spectacular without running away.
import type { World } from './world';
import type { Enemy } from '../enemies/enemy';
import { Team, type Proj } from '../projectiles/projectiles';
import { Pickup, popPickup } from './pickups';
import { spawnDrop } from './drops';
import type { AttackProfile, ProfilePart } from '../projectiles/profile';
import type { StatMods } from '../player/stats';
import type { VolleyOpts } from '../projectiles/weapons';
import { TAU, dist2, angleTo } from '../core/math';

export interface InklingDef {
  id: string; name: string; color: string;
  /** What it does, one line per level (I, II, III). */
  levels: [string, string, string];
  /** One-line summary for cards and the journal. */
  gist: string;
  part?: (lv: number) => ProfilePart;
  stats?: (lv: number) => StatMods;
}

export const INKLINGS: Record<string, InklingDef> = {
  swarm: { id: 'swarm', name: 'Swarm', color: '#5a5ad8', gist: 'Kills hatch ink mites that seek the next enemy.',
    levels: ['Each kill hatches 1 ink mite that hunts the nearest enemy (35% damage, carries your shot effects).', '2 mites per kill.', '3 mites per kill, at 45% damage.'] },
  dive: { id: 'dive', name: 'Dive', color: '#c8b48a', gist: 'Every few volleys, your shots dive at the nearest enemy.',
    levels: ['Every 3rd volley dives: its shots lock on to the nearest enemy and hit 15% harder.', 'Every 2nd volley dives.', 'Every volley dives, and diving shots pierce one enemy.'] },
  lurch: { id: 'lurch', name: 'Lurch', color: '#a0724a', gist: 'Every few volleys is a heavy lunge shot.',
    levels: ['Every 4th volley lunges: double damage, bigger, knocks enemies far back.', 'Every 3rd volley lunges.', 'Every 2nd volley lunges, and lunges pierce three enemies.'] },
  spit: { id: 'spit', name: 'Spittle', color: '#8aa848', gist: 'Volleys also lob ink that splashes where it lands.',
    levels: ['Each volley also lobs one blob of ink to the side that splashes where it lands (45% damage).', 'A blob to each side.', 'A blob to each side, with a wider splash.'] },
  ember: { id: 'ember', name: 'Ember', color: '#ff8a3a', gist: 'Shots burn; burning enemies spread the fire when they die.',
    levels: ['Shots have a 12% chance to burn. An enemy that dies burning sets everything within 36px alight.', '20% burn chance; the fire spreads 46px.', '30% burn chance; the fire spreads 56px.'],
    part: (lv) => ({ burn: [0.12, 0.2, 0.3][lv - 1] }) },
  bloat: { id: 'bloat', name: 'Bloat', color: '#8a9a5a', gist: 'Enemies you kill burst into ink.',
    levels: ['Enemies you kill burst into a puddle of ink that hurts others standing in it.', 'Bigger, stronger puddles.', 'Puddles, and each burst also throws 4 shots outward (40% damage, your shot effects).'] },
  leech: { id: 'leech', name: 'Leech', color: '#7a2a3a', gist: 'Your hits charge your active item.',
    levels: ['Every 30 hits charges your active item by one (with none, they leave a button).', 'Every 22 hits.', 'Every 15 hits.'] },
  gaze: { id: 'gaze', name: 'Gaze', color: '#d8d070', gist: 'Every few seconds, a volley becomes a piercing stare.',
    levels: ['Every 2.4 seconds your next volley is a stare: it passes through rocks and every enemy, 30% harder.', 'Every 1.8 seconds.', 'Every 1.2 seconds.'] },
  ward: { id: 'ward', name: 'Ward', color: '#b0b8d0', gist: 'Ink shards circle you and block enemy shots.',
    levels: ['An ink shard circles you and blocks enemy shots (it reforms after 0.8 seconds).', 'Two shards.', 'Three shards, and every shot they block they fire back at the nearest enemy.'] },
  bury: { id: 'bury', name: 'Bury', color: '#9a7a5a', gist: 'Shots that reach the end of their range bury a charge that bursts.',
    levels: ['Shots that fall at the end of their range bury a charge that bursts half a second later (60% damage).', 'Bigger bursts.', 'Bursts mark what they hit, and a marked enemy caught in a burst bursts too.'] },
  snare: { id: 'snare', name: 'Snare', color: '#d8d0c0', gist: 'Shots slow; kills leave webs.',
    levels: ['Shots have a 12% chance to slow.', '20% slow chance, and kills leave a web that slows anything in it.', '30% slow chance, and webs drag enemies toward their middle.'],
    part: (lv) => ({ slow: [0.12, 0.2, 0.3][lv - 1] }) },
  hymn: { id: 'hymn', name: 'Hymn', color: '#f0d890', gist: 'Kills ring out a note that frightens what is near.',
    levels: ['Each kill rings out: enemies within 40px are frightened and pushed back.', 'The note carries 55px.', 'The note carries 70px.'] },
  hoard: { id: 'hoard', name: 'Hoard', color: '#e0b040', gist: 'Clearing a room unhurt pays out.',
    levels: ['Clearing a combat room without being hit drops a button.', 'Two buttons.', 'Two buttons, and a 35% chance of a key.'] },
  unwrite: { id: 'unwrite', name: 'Unwrite', color: '#30304a', gist: 'Hits erase badly hurt enemies outright.',
    levels: ['Your hits erase any enemy (not bosses) left below 10% of its health.', 'Erases enemies left below 14% of their health.', 'Erases enemies left below 18% of their health.'] },
  phase: { id: 'phase', name: 'Phase', color: '#c0d8e8', gist: 'Shots pass through rocks, then through enemies.',
    levels: ['Your shots pass through rocks and obstacles.', 'They also pass through one enemy.', 'And when you are hurt, your shots pass through everything for 2 seconds.'],
    part: (lv) => (lv >= 2 ? { spectral: true, pierce: 1 } : { spectral: true }) },
  scurry: { id: 'scurry', name: 'Scurry', color: '#9a8070', gist: 'Kills give you a burst of speed and fire rate.',
    levels: ['For 1.2 seconds after each kill: +20% speed and +15% fire rate.', '+30% speed, +25% fire rate.', '+40% speed, +35% fire rate.'] },
};

/** Which essence each creature was written in. Every standard enemy has one (checked by the tests). */
export const ENEMY_INK: Record<string, string> = {
  // Chapter I, 2.0
  lurker: 'bury', mildew: 'bloat', lampkeeper: 'ward', trunk: 'lurch',
  // Chapter II, 2.0
  bellows: 'snare', foreman: 'hymn', riveter: 'gaze', brickback: 'ward',
  // Chapter III, 2.0
  sluicekeeper: 'snare', bilgepriest: 'phase', fumarole: 'bloat',
  // Chapter IV, 2.0
  pill: 'scurry', monitor: 'gaze', mourner: 'ward',
  mite: 'swarm', mitenest: 'swarm', skullmote: 'swarm', blotlet: 'swarm', marrowmaw: 'swarm',
  moth: 'dive', sootsprite: 'dive', cherubmoth: 'dive',
  ragcrawler: 'lurch', dripling: 'lurch', stoker: 'lurch', wheelwraith: 'lurch',
  gasper: 'spit', spool: 'spit', valvehead: 'spit', drowner: 'spit',
  candlewick: 'ember', cinderhopper: 'ember', censer: 'ember',
  bloater: 'bloat', sludge: 'bloat', sludge2: 'bloat', sludge3: 'bloat',
  leech: 'leech', dripsentinel: 'leech',
  grateeye: 'gaze', voideye: 'gaze',
  pillbug: 'ward', skullorbit: 'ward', mirrorshade: 'ward',
  pipeworm: 'bury', gravedigger: 'bury', nursedoll: 'bury',
  ossspider: 'snare', hollowmaw: 'snare',
  choirboy: 'hymn', penitent: 'hymn',
  mimic: 'hoard',
  blot: 'unwrite', pagewraith: 'unwrite',
  orderly: 'phase', sheetghost: 'phase',
  rat: 'scurry',
};

/** Two essences written side by side (both at II or more) annotate each other. */
export const ANNOTATIONS: { a: string; b: string; name: string; text: string }[] = [
  { a: 'ember', b: 'bury', name: 'Wildfire', text: 'Buried charges burst into flame, setting what they hit alight.' },
  { a: 'bloat', b: 'snare', name: 'Ink Web', text: 'Ink puddles slow whatever stands in them, and webs sting.' },
  { a: 'gaze', b: 'lurch', name: 'Glare', text: 'Every lunge is also a stare: it passes through rocks and every enemy.' },
  { a: 'unwrite', b: 'swarm', name: 'Erasure', text: 'Each erased enemy hatches two extra ink mites.' },
  { a: 'hymn', b: 'ward', name: 'Psalm', text: 'Each note restores your ward shards and wipes enemy shots near the kill.' },
];

export interface InkSlot { id: string; lv: number }
interface Web { x: number; y: number; r: number; t: number; pull: boolean }
interface Shard { cd: number }
export interface InkState {
  meter: number; slots: InkSlot[]; shotN: number; gazeT: number; leechN: number;
  /** Seeker/radial-shot budget (refills while you fight). */
  bucket: number;
}
interface InkRuntime { webs: Web[]; shards: Shard[]; bursts: number; hymnT: number; room: number }

export const METER_MAX = 16;
import { INK } from './inkflag';
export { INK };
const rt = new WeakMap<World, InkRuntime>();
const runtime = (w: World): InkRuntime => { let r = rt.get(w); if (!r) rt.set(w, (r = { webs: [], shards: [], bursts: 0, hymnT: 0, room: -1 })); return r; };

/** The run's ink (kept in the run's flags, so it saves and continues with the run). */
export function inkState(w: World): InkState {
  const f = w.run.flags as any;
  const s: InkState = (f.ink ??= { meter: 0, slots: [], shotN: 0, gazeT: 0, leechN: 0, bucket: 18 });
  s.slots ??= []; s.meter ??= 0; s.bucket ??= 18;
  return s;
}
export const inkCap = (w: World): number => (w.player.char.id === 'blot' ? 4 : 3) + w.player.count('fourth_margin');
export const inkLevel = (w: World, id: string): number => inkState(w).slots.find((s) => s.id === id)?.lv ?? 0;
export const inkTotal = (w: World): number => inkState(w).slots.reduce((n, s) => n + s.lv, 0);
export const inkOf = (e: Enemy): string | null => (e.isBoss || e.friendly ? null : ENEMY_INK[e.def.id] ?? null);
export const annotationOn = (w: World, name: string): boolean => {
  const a = ANNOTATIONS.find((x) => x.name === name);
  return !!a && inkLevel(w, a.a) >= 2 && inkLevel(w, a.b) >= 2;
};
export function activeAnnotations(w: World): typeof ANNOTATIONS { return ANNOTATIONS.filter((a) => inkLevel(w, a.a) >= 2 && inkLevel(w, a.b) >= 2); }

/** The meter has brimmed: the next creature killed leaves its Inkling. */
export const brimming = (w: World): boolean => inkState(w).meter >= METER_MAX;

/** The player's profile and stat contributions from the essences held (read by Player.recompute). */
export function inkMods(w: World): { attack?: ProfilePart; stats?: StatMods }[] {
  if (!INK.on) return [];

  const out: { attack?: ProfilePart; stats?: StatMods }[] = [];
  for (const s of inkState(w).slots) {
    const d = INKLINGS[s.id]; if (!d) continue;
    out.push({ attack: d.part?.(s.lv), stats: d.stats?.(s.lv) });
  }
  // Iron Gall: +0.15 damage per level held
  if (w.player.count('iron_gall') > 0) out.push({ stats: { damage: Math.min(1.8, 0.15 * inkTotal(w)) } });
  return out;
}
/** Re-read the essences into the player (after writing one, or when a run continues). */
export function syncInk(w: World): void {
  w.player.inkMods = inkMods(w);
  w.player.recompute();
  const pl = w.player;
  for (const e of w.enemies) e.data.furious = !!inkOf(e) && inkLevel(w, inkOf(e)!) > 0;
  void pl;
}

// ------------------------------------------------------------------ getting them
/** Write an essence into the margins. Returns what happened, for the banner. */
export function writeInk(w: World, id: string, force = false): 'new' | 'up' | 'max' | 'over' | 'full' {
  const s = inkState(w), d = INKLINGS[id]; if (!d) return 'full';
  const held = s.slots.find((x) => x.id === id);
  let res: 'new' | 'up' | 'max' | 'over' | 'full';
  if (held) {
    if (held.lv >= 3) {
      res = 'max';
      // a mastered essence's extra ink tops up the active item instead
      const pl = w.player;
      if (pl.active) pl.charge += 1;
    } else { held.lv++; res = 'up'; }
  } else if (s.slots.length < inkCap(w)) { s.slots.push({ id, lv: 1 }); res = 'new'; }
  else if (force) { const i = weakestSlot(w); s.slots.splice(i, 1, { id, lv: 1 }); res = 'over'; }
  else return 'full';
  const seen = (w.game.save.data.inkSeen ??= []);
  if (!seen.includes(id)) { seen.push(id); w.game.save.markDirty(); }
  syncInk(w);
  if (s.slots.length >= inkCap(w) && s.slots.every((x) => x.lv >= 3)) w.game.save.unlock('ink_mastery');
  if (s.slots.length) w.game.save.unlock('ink_first');
  if (activeAnnotations(w).length) w.game.save.unlock('ink_annotation');
  return res;
}
/** The margin a full write would replace: the lowest level, oldest first. */
export function weakestSlot(w: World): number {
  const s = inkState(w).slots;
  let best = 0;
  for (let i = 1; i < s.length; i++) if (s[i].lv < s[best].lv) best = i;
  return best;
}
/** Can this Inkling be written just by touching it (a level up, or a free margin)? */
export function canTakeInk(w: World, id: string): boolean {
  const s = inkState(w);
  return !!s.slots.find((x) => x.id === id) || s.slots.length < inkCap(w);
}

/** Every kill: fill the meter, leave Inklings, and run the essences' on-kill effects. */
export function inkOnKill(w: World, e: Enemy, quiet: boolean): void {
  if (!INK.on) return;

  const s = inkState(w);
  if (e.isBoss && !quiet && !e.friendly) { s.meter = METER_MAX; return; }
  const id = inkOf(e);
  if (!id || quiet || e.parent && !e.data.annotated) return;
  let drop = !!e.champion || !!e.data.annotated;
  if (!drop && s.meter >= METER_MAX) { drop = true; s.meter = 0; }
  else {
    s.meter = Math.min(METER_MAX, s.meter + ((e.def.cost ?? 1) * (e.data.furious ? 1.5 : 1) + (e.champion ? 3 : 0)) * (w.player.count('ink_blotter') > 0 ? 1.4 : 1));
    // the first time it ever brims, say what it means
    if (s.meter >= METER_MAX && !(w.game.save.data.inkSeen ?? []).length && !(w.run.flags as any).inkTold) {
      (w.run.flags as any).inkTold = true;
      w.hud.toast('The ink brims. Each creature now shows the Inkling it would leave: the next one you kill leaves it.', 5);
    }
  }
  if (drop) spawnInkling(w, id, e.x, e.y);
}

function spawnInkling(w: World, id: string, x: number, y: number): void {
  const p = new Pickup('inkling', x, y); p.data = { id }; p.r = 7; p.noCollect = 0.5;
  popPickup(p, 0.6); w.pickups.push(p);
  w.fx.burst(x, y, 6, 10, INKLINGS[id].color, 70, 0.5, 2);
  w.audio.play('inkHeart', { x, vol: 0.5, pitch: 1.3 });
}

/** New enemies: those whose essence Marcus holds come at him faster; with ink carried, some are annotated. */
export function inkOnSpawn(w: World, e: Enemy): void {
  if (!INK.on) return;

  const id = inkOf(e); if (!id || e.parent) return;
  e.data.furious = inkLevel(w, id) > 0;
  const total = inkTotal(w);
  if (total > 0 && !e.champion && w.roomRng.next() < Math.min(0.08, total * 0.008)) {
    e.data.annotated = true; e.hp *= 1.35; e.maxHp *= 1.35;
  }
}

// ------------------------------------------------------------------ the essences at work
const seekerProf = new WeakMap<AttackProfile, AttackProfile>();
/** A small homing copy of the player's profile for seekers and radial shots (no splitting, no orbiting). */
function childProf(p: AttackProfile, homing: number): AttackProfile {
  let c = seekerProf.get(p);
  if (!c) { c = { ...p, modes: new Set(p.modes), orbit: false, boomerang: false, split: 0, shots: 1, rear: false, sides: false, homing: Math.max(p.homing, homing) }; seekerProf.set(p, c); }
  return c;
}
function spend(w: World, n: number): number {
  const s = inkState(w); const k = Math.min(n, Math.floor(s.bucket));
  s.bucket -= k; return k;
}
function seekers(w: World, x: number, y: number, n: number, dmgK: number): void {
  const pl = w.player, k = spend(w, n);
  for (let i = 0; i < k; i++) {
    const p = w.proj.player(w, childProf(pl.prof, 3), x, y, 6, Math.random() * TAU, pl.stats.damage * dmgK, 150, 220, 0.6, 1);
    if (p) { p.homing = 3; p.tint = '#5a5ad8'; p.shape = 'moth'; }
  }
}
function radial(w: World, x: number, y: number, n: number, dmgK: number): void {
  const pl = w.player, k = spend(w, n), a0 = Math.random() * TAU;
  for (let i = 0; i < k; i++) w.proj.player(w, childProf(pl.prof, 0), x, y, 6, a0 + (i / n) * TAU, pl.stats.damage * dmgK, 170, 140, 0.7, 1);
}
function burst(w: World, x: number, y: number, lv: number, gen: number): void {
  const R = runtime(w);
  if (R.bursts >= 10) return;
  R.bursts++;
  w.after(0.45, () => {
    R.bursts = Math.max(0, R.bursts - 1);
    if (w.room.id !== R.room) return;
    const r = 18 + lv * 4, dmg = w.player.stats.damage * 0.6;
    const fire = annotationOn(w, 'Wildfire');
    // what's caught: marked enemies (level III) burst in turn, a generation at a time
    const caught = w.enemies.filter((e) => !e.dead && !e.friendly && dist2(e.x, e.y, x, y) < (r + e.r) ** 2);
    w.explode(x, y, r, dmg, { friendly: true, small: true });
    for (const e of caught) {
      if (fire && !e.def.noStatus) { e.burn = 3; e.burnDmg = Math.max(1, w.player.stats.damage * 0.35); }
      if (lv >= 3) {
        if (e.mark > 0 && gen < 2 && !e.dead) burst(w, e.x, e.y, lv, gen + 1);
        e.mark = Math.max(e.mark, 3);
      }
    }
  });
  w.fx.ring(x, y, 2, 8, INKLINGS.bury.color, 0.45, false);
}

/** Item-style hooks for the essences (called by World.itemHook after items and charms). */
export function inkHook(w: World, name: string, ...args: any[]): void {
  if (!INK.on) return;

  const s = inkState(w);
  if (!s.slots.length) return;
  const L = (id: string) => inkLevel(w, id);
  switch (name) {
    case 'onKill': {
      const e = args[0] as Enemy; if (!e || e.friendly) return;
      if (L('swarm')) seekers(w, e.x, e.y - 4, L('swarm'), L('swarm') >= 3 ? 0.45 : 0.35);
      if (L('ember') && e.burn > 0) {
        const r = [36, 46, 56][L('ember') - 1];
        for (const o of w.enemies) if (!o.dead && o !== e && !o.def.noStatus && dist2(o.x, o.y, e.x, e.y) < r * r) { o.burn = 3; o.burnDmg = Math.max(1, w.player.stats.damage * 0.35); }
        w.fx.ring(e.x, e.y - 4, 4, r, '#ff8a3a', 0.3, false); w.fx.embers(e.x, e.y - 6, 8, '#ff9a3a');
      }
      if (L('bloat')) {
        const lv = L('bloat');
        w.addCreep(e.x, e.y, [16, 21, 24][lv - 1], 'player', w.player.stats.damage * [0.5, 0.7, 0.8][lv - 1], 2.5, '#3a3a6a');
        if (lv >= 3) radial(w, e.x, e.y - 4, 4, 0.4);
        if (annotationOn(w, 'Ink Web')) runtime(w).webs.push({ x: e.x, y: e.y, r: 22, t: 2.5, pull: false });
      }
      if (L('snare') >= 2) runtime(w).webs.push({ x: e.x, y: e.y, r: L('snare') >= 3 ? 34 : 26, t: 4, pull: L('snare') >= 3 });
      if (L('hymn')) hymn(w, e.x, e.y, [40, 55, 70][L('hymn') - 1]);
      if (L('scurry')) {
        const lv = L('scurry');
        w.player.clearTemp((t) => t.id === 'ink_scurry');
        w.player.addTemp({ id: 'ink_scurry', time: 1.2, stats: { speed: [0.2, 0.3, 0.4][lv - 1], tearsMult: [1.15, 1.25, 1.35][lv - 1] } });
      }
      return;
    }
    case 'onHitEnemy': {
      const e = args[0] as Enemy;
      if (L('leech')) {
        s.leechN++;
        if (s.leechN >= [30, 22, 15][L('leech') - 1]) {
          s.leechN = 0;
          const pl = w.player;
          if (pl.active) { pl.charge += 1; w.fx.sparks(pl.x, pl.y - 22, 6, '#ff6a8a', 60); w.audio.play('pageGet', { vol: 0.35, pitch: 1.6 }); }
          else spawnDrop(w, 'button', e.x, e.y);
        }
      }
      if (L('unwrite') && !e.isBoss && !e.dead && e.hp > 0 && e.hp <= e.maxHp * [0.1, 0.14, 0.18][L('unwrite') - 1]) {
        w.fx.burst(e.x, e.y - e.hitY, 8, 12, '#1a1a2a', 80, 0.5, 2);
        w.fx.text(e.x, e.y - e.hitY - 12, 'ERASED', '#c8c8e0');
        const ex = e.x, ey = e.y;
        w.killEnemy(e);
        if (annotationOn(w, 'Erasure')) seekers(w, ex, ey, 2, 0.35);
      }
      return;
    }
    case 'onHurt': {
      if (L('phase') >= 3) { w.player.clearTemp((t) => t.id === 'ink_phase'); w.player.addTemp({ id: 'ink_phase', time: 2, attack: { pierce: 99, spectral: true } }); }
      return;
    }
    case 'onRoomClear': {
      if (L('hoard') && !w.roomHit && w.room.type !== 'start') {
        const lv = L('hoard'), loot = w.run.lootRng('ink');
        const c = w.room.center();
        for (let i = 0; i < (lv >= 2 ? 2 : 1); i++) spawnDrop(w, 'button', c.x + (i - 0.5) * 12, c.y);
        if (lv >= 3 && loot.chance(0.35)) spawnDrop(w, 'key', c.x, c.y + 10);
      }
      return;
    }
  }
}

function hymn(w: World, x: number, y: number, r: number): void {
  const R = runtime(w);
  if (w.time - R.hymnT < 0.12) return;
  R.hymnT = w.time;
  for (const e of w.enemies) {
    if (e.dead || e.friendly || dist2(e.x, e.y, x, y) > r * r) continue;
    if (!e.def.noStatus) e.fear = Math.max(e.fear, 1.5);
    if (!e.isBoss && !e.def.noKnock) { const a = angleTo(x, y, e.x, e.y); e.kvx += Math.cos(a) * 90; e.kvy += Math.sin(a) * 90; }
  }
  w.fx.ring(x, y - 6, 4, r, '#f0d890', 0.35, false);
  if (annotationOn(w, 'Psalm')) {
    for (const sh of R.shards) sh.cd = 0;
    for (const p of w.proj.list) if (p.active && p.team === Team.Enemy && dist2(p.x, p.y, x, y) < r * r) w.proj.kill(p);
  }
  w.audio.play('pageGet', { vol: 0.3, pitch: 2 });
}

/** Before a volley: the cadence essences decide whether this one dives, lunges or stares. */
export function inkVolley(w: World, prof: AttackProfile): { prof: AttackProfile; o: VolleyOpts; after: (ps: Proj[]) => void; lobs: number } {
  if (!INK.on) return { prof, o: {}, after: () => {}, lobs: 0 };

  const s = inkState(w), o: VolleyOpts = {};
  let p = prof, tag = '';
  if (!s.slots.length) return { prof, o, after: () => {}, lobs: 0 };
  s.shotN++;
  const every = (id: string, table: number[]) => { const lv = inkLevel(w, id); return lv > 0 && s.shotN % table[lv - 1] === 0; };
  const lunge = every('lurch', [4, 3, 2]);
  let stare = false;
  if (inkLevel(w, 'gaze') && s.gazeT >= [2.4, 1.8, 1.2][inkLevel(w, 'gaze') - 1]) { stare = true; s.gazeT = 0; }
  if (lunge && annotationOn(w, 'Glare')) stare = true;
  if (lunge || stare) {
    p = { ...prof, modes: new Set(prof.modes) };
    if (lunge) { o.dmgMul = 2; o.sizeMul = 1.5; p.knock = prof.knock * 2.5; if (inkLevel(w, 'lurch') >= 3) p.pierce = Math.max(p.pierce, 3); tag = 'lunge'; }
    if (stare) { o.dmgMul = (o.dmgMul ?? 1) * 1.3; p.pierce = 999; p.spectral = true; p.tint = '#e8e070'; tag = 'stare'; }
  }
  const dive = every('dive', [3, 2, 1]);
  const after = (ps: Proj[]) => {
    for (const q of ps) {
      if (dive) { q.homing = Math.max(q.homing, 3); q.dmg *= 1.15; if (inkLevel(w, 'dive') >= 3) q.pierce = Math.max(q.pierce, 1); }
      if (tag === 'lunge') q.r = Math.min(16, q.r * 1.1);
    }
    if (tag) w.fx.ring(w.player.x, w.player.y - 12, 3, 12, tag === 'stare' ? '#e8e070' : '#c89060', 0.18, false);
  };
  const lobs = inkLevel(w, 'spit') >= 2 ? 2 : inkLevel(w, 'spit') ? 1 : 0;
  return { prof: p, o, after, lobs };
}

/** Spittle's lobbed blobs, fired after each volley. */
const lobProf = new WeakMap<AttackProfile, [AttackProfile, number]>();
export function inkLobs(w: World, prof: AttackProfile, x: number, y: number, ang: number, n: number): void {
  if (!INK.on) return;

  const pl = w.player, lv = inkLevel(w, 'spit'), s = inkState(w);
  let c = lobProf.get(prof);
  if (!c || c[1] !== lv) { c = [{ ...prof, modes: new Set(prof.modes), arc: true, explode: lv >= 3 ? 16 : 10, split: 0, shots: 1, orbit: false, homing: 0, pierce: 0, rear: false, sides: false }, lv]; lobProf.set(prof, c); }
  const sides = n >= 2 ? [-1, 1] : [s.shotN % 2 ? -1 : 1];
  for (const sd of sides) {
    const q = w.proj.player(w, c[0], x, y, 10, ang + sd * 0.35, pl.stats.damage * 0.45, 150, Math.min(150, pl.stats.range * 0.6), 0.8, 1);
    if (q) { q.tint = '#5a7a3a'; q.shape = 'blood'; }
  }
}

/** A player shot ended: Bury plants its charge where it fell. */
export function inkShotEnd(w: World, p: Proj, landed: boolean): void {
  if (!INK.on) return;

  const lv = inkLevel(w, 'bury');
  if (!lv || !landed || p.depth > 0 || p.fromFamiliar) return;
  burst(w, p.x, p.y, lv, 0);
}

/** Every step: the gaze timer, ward shards, webs, and the seeker budget. */
export function inkTick(w: World, dt: number): void {
  if (!INK.on) return;

  const s = inkState(w), R = runtime(w);
  if (R.room !== w.room.id) { R.room = w.room.id; R.webs = []; R.bursts = 0; }
  s.bucket = Math.min(18, s.bucket + dt * 12);
  if (inkLevel(w, 'gaze')) s.gazeT += dt;
  // webs
  for (const web of R.webs) {
    web.t -= dt;
    for (const e of w.enemies) {
      if (e.dead || e.friendly || e.isBoss || dist2(e.x, e.y, web.x, web.y) > web.r * web.r) continue;
      e.slow = Math.max(e.slow, 0.25);
      if (web.pull) { const a = angleTo(e.x, e.y, web.x, web.y); e.move(w, Math.cos(a) * 22 * dt, Math.sin(a) * 22 * dt); }
      if (annotationOn(w, 'Ink Web') && Math.random() < dt * 2) w.damageEnemy(e, w.player.stats.damage * 0.25, { ang: 0, knock: 0, source: 'creep' });
    }
  }
  R.webs = R.webs.filter((x) => x.t > 0);
  // ward shards
  const n = inkLevel(w, 'ward');
  while (R.shards.length < n) R.shards.push({ cd: 0 });
  R.shards.length = n;
  const pl = w.player;
  R.shards.forEach((sh, i) => {
    if (sh.cd > 0) { sh.cd -= dt; return; }
    const [sx, sy] = shardPos(w, i, n);
    for (const p of w.proj.list) {
      if (!p.active || p.team !== Team.Enemy || dist2(p.x, p.y - p.z, sx, sy) > 8 * 8) continue;
      w.proj.kill(p); sh.cd = 0.8;
      w.fx.sparks(sx, sy, 5, '#d0d8f0', 70); w.audio.play('tink', { vol: 0.35, x: sx, pitch: 1.4 });
      if (n >= 3) {
        const t = nearestEnemy(w, sx, sy);
        if (t && spend(w, 1)) w.proj.player(w, childProf(pl.prof, 1.5), sx, sy + 6, 6, angleTo(sx, sy, t.x, t.y - t.hitY), pl.stats.damage * 0.6, 200, 200, 0.7, 1);
      }
      break;
    }
  });
}
function nearestEnemy(w: World, x: number, y: number): Enemy | null {
  let best: Enemy | null = null, bd = Infinity;
  for (const e of w.enemies) { if (e.dead || e.friendly || e.hidden || e.spawnT > 0) continue; const d = dist2(e.x, e.y, x, y); if (d < bd) { bd = d; best = e; } }
  return best;
}
export function shardPos(w: World, i: number, n: number): [number, number] {
  const a = w.time * 2.4 + (i / Math.max(1, n)) * TAU, pl = w.player;
  return [pl.x + Math.cos(a) * 19, pl.y - 11 + Math.sin(a) * 12];
}

// ------------------------------------------------------------------ drawing
// (a hoisted var without an initialiser: the art module may register before this module finishes loading)
// eslint-disable-next-line no-var
var inklingIconFn: ((id: string, size: number) => HTMLCanvasElement) | undefined;
/** The art module registers its icon painter here (it imports this module, so this one can't import it). */
export function setInklingIconPainter(fn: (id: string, size: number) => HTMLCanvasElement): void { inklingIconFn = fn; }
/** World-space drawing: webs on the floor, ward shards, auras, and the essence glyphs while brimming. */
export function renderInkWorld(w: World, ctx: CanvasRenderingContext2D, camX: number, camY: number, layer: 'floor' | 'top'): void {
  if (!INK.on) return;

  const R = runtime(w);
  if (layer === 'floor') {
    for (const web of R.webs) {
      const x = web.x - camX, y = web.y - camY, a = Math.min(1, web.t);
      ctx.save(); ctx.globalAlpha = 0.35 * a; ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 0.6;
      for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * web.r, y + Math.sin(an) * web.r * 0.6); ctx.stroke(); }
      for (const f of [0.4, 0.75, 1]) { ctx.beginPath(); ctx.ellipse(x, y, web.r * f, web.r * f * 0.6, 0, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    // annotated creatures stand in a pool of their own ink
    for (const e of w.enemies) {
      if (e.dead || !e.data.annotated) continue;
      ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(w.time * 4 + e.id) * 0.15; ctx.fillStyle = '#12101e';
      ctx.beginPath(); ctx.ellipse(e.x - camX, e.y - camY + 1, e.r + 4, (e.r + 4) * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
    return;
  }
  const n = inkLevel(w, 'ward');
  for (let i = 0; i < n; i++) {
    const sh = R.shards[i]; const [sx, sy] = shardPos(w, i, n);
    ctx.save(); ctx.globalAlpha = sh && sh.cd > 0 ? 0.25 : 0.95;
    ctx.translate(Math.round(sx - camX), Math.round(sy - camY)); ctx.rotate(w.time * 3 + i);
    ctx.fillStyle = '#1c1830'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(3, 0); ctx.lineTo(0, 4); ctx.lineTo(-3, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c8d0f0'; ctx.lineWidth = 0.7; ctx.stroke(); ctx.restore();
  }
  const brim = brimming(w);
  for (const e of w.enemies) {
    if (e.dead || e.hidden || e.spawnT > 0) continue;
    const id = inkOf(e); if (!id) continue;
    const d = INKLINGS[id];
    // annotated: an ink ring breathing round it in its essence's colour
    if (e.data.annotated) {
      ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(w.time * 5 + e.id) * 0.25; ctx.strokeStyle = d.color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(e.x - camX, e.y - camY - e.hitY * 0.5, e.r + 5, e.r + 5 + e.hitY * 0.3, 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
    if (!brim && !e.data.annotated && !e.champion) continue;
    // what it would leave: its Inkling, small, bobbing over its head
    const ic = inklingIconFn?.(id, 10); if (!ic) continue;
    const x = Math.round(e.x - camX - 5), y = Math.round(e.y - camY - e.hitY - e.r - 13 + Math.sin(w.time * 3 + e.id) * 1.2);
    ctx.save(); ctx.globalAlpha = brim ? 1 : 0.8; ctx.drawImage(ic, x, y); ctx.restore();
  }
}
