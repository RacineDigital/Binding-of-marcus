import { Run } from '../src/game/run';
import { generateFloor } from '../src/generation/floorgen';
import { Ob } from '../src/rooms/room';
let bad = 0, rooms = 0;
for (let k = 0; k < 120; k++) for (let f = 0; f < 8; f++) {
  const run = new Run('SPK' + k, 'marcus', () => true); run.floorIndex = f;
  for (const room of generateFloor(run, f).rooms) {
    if (room.type === 'sacrifice' || room.doors.length < 2) continue; rooms++;
    const walk = (x: number) => x === Ob.None || x === Ob.TimedSpikes || x === Ob.Web || x === Ob.Button;
    const ds = room.doors.map((d) => room.doorInner(d.side, d.slot));
    const seen = new Uint8Array(room.cols * room.rows); const q = [ds[0]]; seen[room.idx(ds[0][0], ds[0][1])] = 1;
    while (q.length) { const [c, r] = q.pop()!; for (const [dc, dr] of [[1,0],[-1,0],[0,1],[0,-1]]) { const nc = c + dc, nr = r + dr; if (!room.inGrid(nc, nr) || seen[room.idx(nc, nr)] || !walk(room.at(nc, nr))) continue; seen[room.idx(nc, nr)] = 1; q.push([nc, nr]); } }
    if (ds.some(([c, r]) => !seen[room.idx(c, r)])) bad++;
  }
}
console.log('OLD: rooms', rooms, 'door pairs only joined through spikes', bad);
