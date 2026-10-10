// Where enemies start, over many generated rooms: two on one tile, on a solid tile, bodies overlapping
// from neighbouring tiles, or standing at a doorway (where Marcus walks in).
//   npx tsx tests/tools/spawnaudit.ts [seeds] [floors]
import { Run } from '../../src/game/run';
import { generateFloor } from '../../src/generation/floorgen';
import { getEnemy } from '../../src/enemies/registry';
import { solidCell } from '../../src/rooms/collide';
import { TILE } from '../../src/core/constants';

const SEEDS = Number(process.argv[2] ?? 150), FLOORS = Number(process.argv[3] ?? 6);
let rooms = 0, spawns = 0, sameTile = 0, solid = 0, overlap = 0, nearDoor = 0;
const ex: string[] = [];
for (let s = 0; s < SEEDS; s++) {
  const run = new Run('spawn' + s, 'marcus', () => true);
  for (let f = 0; f < FLOORS; f++) for (const room of generateFloor(run, f).rooms) {
    if (!room.spawns?.length) continue;
    rooms++;
    const doors = room.doors.map((d) => room.doorPos(d.side, d.slot));
    const seen = new Map<string, number>();
    room.spawns.forEach((sp, i) => {
      spawns++;
      const k = sp.c + ',' + sp.r;
      if (seen.has(k)) { sameTile++; if (ex.length < 6) ex.push(`${room.type} ${sp.id} shares ${k}`); }
      seen.set(k, i);
      if (solidCell(room, sp.c, sp.r, getEnemy(sp.id)?.flying ? 'fly' : 'walk')) solid++;
      const c = room.cellCenter(sp.c, sp.r), r = getEnemy(sp.id)?.r ?? 6;
      if (doors.some((d) => Math.hypot(d.x - c.x, d.y - c.y) < TILE * 2)) nearDoor++;
      for (let j = 0; j < i; j++) {
        const o = room.spawns[j], oc = room.cellCenter(o.c, o.r), orr = getEnemy(o.id)?.r ?? 6;
        if (o.c === sp.c && o.r === sp.r) continue;
        if (Math.hypot(oc.x - c.x, oc.y - c.y) < r + orr) overlap++;
      }
    });
  }
}
const pct = (n: number) => `${n} (${((100 * n) / spawns).toFixed(1)}%)`;
console.log(`${rooms} rooms, ${spawns} enemies: same tile ${pct(sameTile)}, solid tile ${pct(solid)}, overlapping a neighbour ${pct(overlap)}, within 2 tiles of a door ${pct(nearDoor)}`);
if (ex.length) console.log(ex.join('\n'));
