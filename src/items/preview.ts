// "With your build": what an item on a pedestal would actually do to you, right now. The numbers
// are real (the item is tried on, measured and taken off again), and when it changes how you attack
// it says how that combines with the attack you already have.
import type { World } from '../game/world';
import type { DescLine } from './describe';
import { getItem } from './registry';
import type { AttackProfile } from '../projectiles/profile';
import { LASER_TIERS, overcharge } from '../projectiles/weapons';

/** What each shot effect turns into on a laser, for "with your lasers" lines. */
export const LASER_NOTES: [keyof AttackProfile, string][] = [
  ['bounce', 'ricochet off walls'], ['homing', 'bend onto enemies'], ['split', 'refract into a fan of smaller rays where they land'],
  ['explode', 'blow up the spot they land on'], ['burn', 'scorch a line of embers along their path'], ['wiggle', 'linger and lash side to side, cutting through more'],
  ['spiral', 'also fire a ray that spins round you'], ['boomerang', 'come back to you, cutting through everything again'],
  ['grow', 'come out much wider'], ['accel', 'hit harder the further they reach'], ['orbit', 'also fire from a point circling you'],
  ['chain', 'throw lightning off what they hit'], ['laserArc', 'leap on to nearby enemies'], ['focus', 'heat up whatever they keep hitting'],
  ['prismRays', 'come with a red burning ray and a blue chilling ray'], ['searchlight', 'sweep a searchlight every fourth pull'],
  ['rear', 'also fire behind you'], ['sides', 'also fire to your sides'], ['crit', 'sometimes land bold, triple hits'],
  ['creep', 'leave ink where they end'], ['magnet', 'erase enemy shots they cross'], ['rainbow', 'shift colour, with a new status every pull'],
  ['lifesteal', 'drink blood'], ['mark', 'hex what they hit'], ['freeze', 'freeze what they hit'], ['poison', 'poison what they hit'],
];
const gained = (b: AttackProfile, a: AttackProfile, k: keyof AttackProfile) => {
  const x = b[k] as unknown, y = a[k] as unknown;
  return typeof y === 'boolean' ? y && !x : typeof y === 'number' ? y > (x as number) + 1e-6 : false;
};
const has = (p: AttackProfile, k: keyof AttackProfile) => { const v = p[k] as unknown; return typeof v === 'boolean' ? v : typeof v === 'number' ? v > 0 : false; };
const isLaser = (p: AttackProfile) => p.modes.has('laser') || p.lasers > 0;

const MODE_NAME: Record<string, string> = {
  shot: 'shots', charge: 'a charged shot (hold, release)', burst: 'a charged spray (hold, release)', beam: 'a charged beam (hold, release)',
  laser: 'rapid lasers', melee: 'close-range swings (hold for a spin)',
};
/** What two attack styles do together (order doesn't matter). */
export const COMBOS: Record<string, string> = {
  'beam+burst': 'Your beam goes off with a spray of shots.',
  'beam+charge': 'Your beam comes out thicker and hits harder.',
  'beam+laser': 'Lasers make the beam charge faster.',
  'burst+charge': 'Fuller sprays: more shots per release.',
  'burst+laser': 'Every laser pull scatters stray lasers too.',
  'charge+laser': 'Heavier, wider lasers.',
  'laser+melee': 'Swings flick a laser; a full spin fires lasers all round.',
  'beam+melee': 'A full spin also fires beams.',
  'burst+melee': 'A full spin also throws a spray of shots.',
  'charge+melee': 'Spins charge into a heavier blow.',
};
/** What two attack styles now do together, for each style newly joined to the ones already held. */
export function newCombos(before: Set<string>, after: Set<string>): string[] {
  const out: string[] = [];
  for (const m of after) if (!before.has(m)) for (const o of before) { const c = COMBOS[[m, o].sort().join('+')]; if (c) out.push(c); }
  return out;
}
const cache = new Map<string, DescLine[]>();

export function previewLines(w: World, id: string): DescLine[] {
  const pl = w.player, it = getItem(id);
  if (!it || it.kind === 'active') return [];
  const key = id + '|' + pl.itemOrder.join(',') + '|' + [...pl.items.values()].join(',') + '|' + pl.temp.map((t) => t.id).join(',') + '|' + [...pl.transformations].join(',');
  const hit = cache.get(key); if (hit) return hit;
  const b = { ...pl.stats }, bMode = pl.mode, bShots = pl.prof.shots, bFlight = pl.flight, bModes = new Set(pl.prof.modes), bProf = pl.prof;
  pl.items.set(id, (pl.items.get(id) ?? 0) + 1); pl.recompute();
  const a = { ...pl.stats }, aMode = pl.mode, aShots = pl.prof.shots, aFlight = pl.flight, aModes = new Set(pl.prof.modes), aProf = pl.prof;
  const n = (pl.items.get(id) ?? 1) - 1; if (n <= 0) pl.items.delete(id); else pl.items.set(id, n);
  pl.recompute();

  const out: DescLine[] = [];
  const row = (name: string, x: number, y: number, unit = 1, digits = 2, higherIsBetter = true) => {
    const X = Math.round((x / unit) * 10 ** digits) / 10 ** digits, Y = Math.round((y / unit) * 10 ** digits) / 10 ** digits;
    if (X === Y) return;
    out.push({ text: `${name} ${X} → ${Y}`, color: (Y > X) === higherIsBetter ? 'up' : 'down' });
  };
  row('Damage', b.damage, a.damage); row('Fire rate', b.fireRate, a.fireRate); row('Speed', b.speed, a.speed);
  row('Range', b.range, a.range, 24, 1); row('Shot speed', b.shotSpeed, a.shotSpeed); row('Shot size', b.size, a.size); row('Luck', b.luck, a.luck, 1, 0);
  if (aShots !== bShots) out.push({ text: `Shots per volley ${bShots} → ${aShots}`, color: aShots > bShots ? 'up' : 'down' });
  if (aMode !== bMode) out.push({ text: `Your attack becomes ${MODE_NAME[aMode] ?? aMode}.`, color: 'note' });
  // a new attack style next to one you already have: say what they do together
  for (const m of aModes) if (!bModes.has(m)) for (const o of bModes) {
    const c = COMBOS[[m, o].sort().join('+')]; if (c) out.push({ text: c, color: 'note' });
  }
  if (aFlight && !bFlight) out.push({ text: 'You will fly: over pits, rocks and spikes.', color: 'note' });
  // lasers: another laser item overcharges them; anything else says what it does to them
  if (aProf.lasers > bProf.lasers && aProf.lasers >= 2) {
    const t = LASER_TIERS[overcharge(aProf)];
    out.push({ text: `Lasers \u00d7${aProf.lasers}: ${t.name} (${t.perk}).`, color: 'up' });
  }
  if (isLaser(aProf)) {
    // already a laser build: what this item adds to them. Becoming one: what you already carry does to them
    const keys = LASER_NOTES.filter(([k]) => isLaser(bProf) ? gained(bProf, aProf, k) : has(aProf, k));
    if (keys.length) out.push({ text: `Your lasers will ${keys.slice(0, 4).map(([, t]) => t).join('; ')}.`, color: 'note' });
  }
  if (out.length) out.unshift({ text: 'With your build:', color: 'plain' });
  cache.set(key, out);
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  return out;
}
