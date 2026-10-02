// Pacing report over many seeds: per chapter, how many fights, how much enemy health stands between
// you and the boss, how far the rewards are, and how much is placed on the floor to find.
//   npx tsx tests/tools/pacing.ts [seeds]
import { Run } from '../../src/game/run';
import { generateFloor } from '../../src/generation/floorgen';
import { getEnemy } from '../../src/enemies/registry';
const N = Number(process.argv[2] ?? 60);
type Acc = Record<string, number[]>;
const per: Acc[] = Array.from({ length: 8 }, () => ({}));
const push = (f: number, k: string, v: number) => (per[f][k] ??= []).push(v);
for (let i = 0; i < N; i++) {
  const seed = 'P' + i.toString(36).toUpperCase().padStart(7, '3');
  const run = new Run(seed, 'marcus', () => true);
  for (let f = 0; f < 8; f++) {
    run.floorIndex = f;
    const fl = generateFloor(run, f), rooms = fl.rooms;
    // distances from the start room
    const dist = new Map<number, number>([[0, 0]]), q = [0];
    while (q.length) { const r = q.shift()!; for (const d of rooms[r].doors) if (!dist.has(d.to)) { dist.set(d.to, dist.get(r)! + 1); q.push(d.to); } }
    const boss = rooms.find((r) => r.type === 'boss')!;
    const fights = rooms.filter((r) => r.spawns.length && r.type !== 'boss');
    const hp = fights.reduce((s, r) => s + r.spawns.reduce((a, sp) => a + (getEnemy(sp.id)?.hp ?? 0), 0), 0);
    push(f, 'rooms', rooms.length); push(f, 'fights', fights.length); push(f, 'enemies', fights.reduce((s, r) => s + r.spawns.length, 0));
    push(f, 'enemyHP', hp); push(f, 'maxRoomHP', Math.max(0, ...fights.map((r) => r.spawns.reduce((a, sp) => a + (getEnemy(sp.id)?.hp ?? 0), 0))));
    push(f, 'emptyNormal', rooms.filter((r) => r.type === 'normal' && !r.spawns.length).length);
    push(f, 'bossDist', dist.get(boss.id) ?? -1);
    const tre = rooms.filter((r) => r.type === 'treasure'); push(f, 'treasure', tre.length);
    push(f, 'shop', rooms.filter((r) => r.type === 'shop').length);
    push(f, 'specials', rooms.filter((r) => !['normal', 'start', 'boss', 'secret', 'supersecret'].includes(r.type)).length);
    push(f, 'placedPickups', rooms.reduce((s, r) => s + r.pickups.filter((p) => p.kind !== 'item' && p.kind !== 'pedestal').length, 0));
    push(f, 'pedestals', rooms.reduce((s, r) => s + r.pickups.filter((p) => p.kind === 'pedestal' || p.kind === 'item').length, 0));
  }
}
const avg = (a: number[]) => (a.reduce((s, x) => s + x, 0) / a.length);
const keys = Object.keys(per[0]);
console.log('chapter  ' + keys.map((k) => k.padStart(13)).join(''));
per.forEach((p, f) => console.log(`   ${f + 1}     ` + keys.map((k) => avg(p[k]).toFixed(1).padStart(13)).join('')));
