// Item flow without a browser: generates many floors and counts the item pedestals each one offers,
// by room type, plus what quality the treasure and shop pools hand out. Rooms opened later (bargain
// rooms after a boss, chests, rocks) aren't counted; the boss item is counted as one per floor.
//   npx tsx tests/tools/itemflow.ts [seeds] [floors]
import { Run } from '../../src/game/run';
import { generateFloor } from '../../src/generation/floorgen';
import { getItem } from '../../src/items/registry';
import { RNG } from '../../src/core/rng';

const SEEDS = Number(process.argv[2] ?? 200), FLOORS = Number(process.argv[3] ?? 6);
const byFloor: Record<string, number>[] = Array.from({ length: FLOORS }, () => ({}));
for (let s = 0; s < SEEDS; s++) {
  const run = new Run('flow' + s, 'marcus', () => true);
  for (let f = 0; f < FLOORS; f++) {
    const fl = generateFloor(run, f);
    const c = byFloor[f];
    c.boss = (c.boss ?? 0) + 1;
    for (const r of fl.rooms) for (const p of r.pickups ?? []) {
      if (p.kind !== 'item' || !getItem(p.data?.id)) continue;
      // a choice of two counts as one
      if (p.data?.group && r.pickups.indexOf(p) !== r.pickups.findIndex((q: any) => q.kind === 'item' && q.data?.group === p.data.group)) continue;
      c[r.type] = (c[r.type] ?? 0) + 1;
    }
  }
}
console.log(`items offered per floor (average over ${SEEDS} seeds; shop items cost buttons):`);
byFloor.forEach((c, f) => {
  const free = Object.entries(c).filter(([k]) => k !== 'shop' && k !== 'library').reduce((a, [, v]) => a + v, 0) / SEEDS;
  console.log(`  floor ${f + 1}: free ${free.toFixed(2)}  |  ` + Object.entries(c).sort().map(([k, v]) => `${k} ${(v / SEEDS).toFixed(2)}`).join('  '));
});
for (const pool of ['treasure', 'shop'] as const) {
  const q = [0, 0, 0, 0, 0];
  for (let s = 0; s < 400; s++) {
    const run = new Run('pool' + s, 'marcus', () => true);
    const rng = new RNG('roll' + s);
    for (let k = 0; k < 4; k++) { const it = getItem(run.pools.roll(pool, rng)); if (it) q[it.quality]++; }
  }
  const n = q.reduce((a, b) => a + b, 0);
  console.log(`${pool} rolls by quality: ` + q.map((v, i) => `Q${i} ${((100 * v) / n).toFixed(1)}%`).join('  '));
}
