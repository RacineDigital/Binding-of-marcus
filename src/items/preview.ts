// "With your build": what an item on a pedestal would actually do to you, right now. The numbers
// are real (the item is tried on, measured and taken off again), and when it changes how you attack
// it says how that combines with the attack you already have.
import type { World } from '../game/world';
import type { DescLine } from './describe';
import { getItem } from './registry';

const MODE_NAME: Record<string, string> = {
  shot: 'shots', charge: 'a charged shot (hold, release)', burst: 'a charged spray (hold, release)', beam: 'a charged beam (hold, release)',
  laser: 'rapid lasers', melee: 'close-range swings (hold for a spin)',
};
/** What two attack styles do together (order doesn't matter). */
const COMBOS: Record<string, string> = {
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
const cache = new Map<string, DescLine[]>();

export function previewLines(w: World, id: string): DescLine[] {
  const pl = w.player, it = getItem(id);
  if (!it || it.kind === 'active') return [];
  const key = id + '|' + pl.itemOrder.join(',') + '|' + [...pl.items.values()].join(',') + '|' + pl.temp.map((t) => t.id).join(',') + '|' + [...pl.transformations].join(',');
  const hit = cache.get(key); if (hit) return hit;
  const b = { ...pl.stats }, bMode = pl.mode, bShots = pl.prof.shots, bFlight = pl.flight, bModes = new Set(pl.prof.modes);
  pl.items.set(id, (pl.items.get(id) ?? 0) + 1); pl.recompute();
  const a = { ...pl.stats }, aMode = pl.mode, aShots = pl.prof.shots, aFlight = pl.flight, aModes = new Set(pl.prof.modes);
  const n = (pl.items.get(id) ?? 1) - 1; if (n <= 0) pl.items.delete(id); else pl.items.set(id, n);
  pl.recompute();

  const out: DescLine[] = [];
  const row = (name: string, x: number, y: number, unit = 1, digits = 2, higherIsBetter = true) => {
    const X = Math.round((x / unit) * 10 ** digits) / 10 ** digits, Y = Math.round((y / unit) * 10 ** digits) / 10 ** digits;
    if (X === Y) return;
    out.push({ text: `${name} ${X} → ${Y}`, color: (Y > X) === higherIsBetter ? 'up' : 'down' });
  };
  row('Damage', b.damage, a.damage); row('Fire rate', b.fireRate, a.fireRate); row('Speed', b.speed, a.speed);
  row('Range', b.range, a.range, 24, 1); row('Shot speed', b.shotSpeed, a.shotSpeed); row('Luck', b.luck, a.luck, 1, 0);
  if (aShots !== bShots) out.push({ text: `Shots per volley ${bShots} → ${aShots}`, color: aShots > bShots ? 'up' : 'down' });
  if (aMode !== bMode) out.push({ text: `Your attack becomes ${MODE_NAME[aMode] ?? aMode}.`, color: 'note' });
  // a new attack style next to one you already have: say what they do together
  for (const m of aModes) if (!bModes.has(m)) for (const o of bModes) {
    const c = COMBOS[[m, o].sort().join('+')]; if (c) out.push({ text: c, color: 'note' });
  }
  if (aFlight && !bFlight) out.push({ text: 'You will fly: over pits, rocks and spikes.', color: 'note' });
  if (out.length) out.unshift({ text: 'With your build:', color: 'plain' });
  cache.set(key, out);
  if (cache.size > 64) cache.delete(cache.keys().next().value!);
  return out;
}
