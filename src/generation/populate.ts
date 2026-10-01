// Fills generated rooms: obstacle layouts from templates, role-based enemy casts and special room contents.
import { RNG } from '../core/rng';
import { RoomData, Ob, SpawnDef, Side } from '../rooms/room';
import { TEMPLATES, BOSS_TEMPLATE, Template } from '../rooms/templates';
import type { Floor, Run } from '../game/run';
import { getEnemy, ENEMY_DEFS } from '../enemies/registry';
import type { Role } from '../enemies/enemy';
import { FLOORS } from '../data/floors';
import { TILE } from '../core/constants';
import type { SaveManager } from '../save/save';

const FALLBACK: Record<string, Role[]> = {
  melee: ['melee', 'heavy', 'flyer'], flyer: ['flyer', 'swarm', 'melee'], shooter: ['shooter', 'turret', 'melee'],
  swarm: ['swarm', 'flyer', 'melee'], heavy: ['heavy', 'melee', 'shooter'], turret: ['turret', 'shooter', 'melee'],
};
const SLOT_ROLE: Record<string, Role | 'any'> = { M: 'melee', F: 'flyer', S: 'shooter', W: 'swarm', H: 'heavy', T: 'turret', A: 'any' };

function obstacleHp(k: Ob): number { return k === Ob.Heap || k === Ob.Fire ? 12 : k === Ob.Urn ? 3 : k === Ob.Keg ? 5 : 0; }

function stamp(room: RoomData, rows: string[], oc: number, orr: number, flipX: boolean, flipY: boolean, rng: RNG, floor: Floor, slots: { c: number; r: number; ch: string }[]): void {
  const th = floor.theme;
  for (let r = 0; r < 9; r++) for (let c = 0; c < 15; c++) {
    const ch = rows[flipY ? 8 - r : r][flipX ? 14 - c : c];
    const C = oc + c, Rr = orr + r;
    let k: Ob = Ob.None, v = 0;
    switch (ch) {
      case '#': k = Ob.Rock; v = rng.int(0, 5); break;
      case '@': k = rng.chance(0.18) ? Ob.Marked : Ob.Rock; v = rng.int(0, 5); break;
      case 'b': k = Ob.Block; break;
      case 'o': k = Ob.Pit; break;
      case '^': k = Ob.Spikes; break;
      case '~': k = Ob.TimedSpikes; break;
      case 'f': k = Ob.Fire; v = rng.pick(th.fireVariants); break;
      case 'p': k = Ob.Heap; v = rng.chance(0.06) ? 1 : rng.chance(0.06) ? 2 : (th.id === 'hollow' && rng.chance(0.3)) ? 3 : 0; break;
      case 'k': k = rng.chance(th.hazards.kegs + 0.5) ? Ob.Keg : Ob.Rock; break;
      case 'u': k = Ob.Urn; break;
      case 'I': k = Ob.Pillar; break;
      case 'w': k = th.hazards.webs ? Ob.Web : Ob.None; break;
      default:
        if (SLOT_ROLE[ch]) slots.push({ c: C, r: Rr, ch });
    }
    if (k !== Ob.None) room.setOb(C, Rr, k, obstacleHp(k), v);
  }
}

function pickTemplate(rng: RNG, fi: number): Template {
  const pool = TEMPLATES.filter((t) => (t.minFloor ?? 0) <= fi);
  return rng.weighted(pool, (t) => t.weight ?? 1)!;
}

/** Make sure doors are clear and every door can reach every other door. */
function ensurePaths(room: RoomData): void {
  const doors = room.doors.map((d) => room.doorInner(d.side, d.slot));
  const inward = (d: typeof room.doors[0]): [number, number] => {
    const [c, r] = room.doorInner(d.side, d.slot);
    return d.side === Side.N ? [c, r + 1] : d.side === Side.S ? [c, r - 1] : d.side === Side.W ? [c + 1, r] : [c - 1, r];
  };
  for (const d of room.doors) {
    const [c, r] = room.doorInner(d.side, d.slot); room.setOb(c, r, Ob.None);
    const [c2, r2] = inward(d); if (room.at(c2, r2) !== Ob.Pit) room.setOb(c2, r2, Ob.None);
  }
  if (doors.length < 1) return;
  const walk = (k: number) => k === Ob.None || k === Ob.Spikes || k === Ob.TimedSpikes || k === Ob.Web || k === Ob.Button;
  const reach = () => {
    const seen = new Uint8Array(room.cols * room.rows);
    const [sc, sr] = doors[0]; const q = [[sc, sr]]; seen[room.idx(sc, sr)] = 1;
    while (q.length) {
      const [c, r] = q.pop()!;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc, nr = r + dr;
        if (!room.inGrid(nc, nr) || seen[room.idx(nc, nr)]) continue;
        if (!walk(room.at(nc, nr))) continue;
        seen[room.idx(nc, nr)] = 1; q.push([nc, nr]);
      }
    }
    return seen;
  };
  const center: [number, number] = [Math.floor(room.cols / 2), Math.floor(room.rows / 2)];
  for (let pass = 0; pass < 3; pass++) {
    const seen = reach();
    const bad = doors.filter(([c, r]) => !seen[room.idx(c, r)]);
    if (!bad.length && seen[room.idx(center[0], center[1])]) return;
    for (const [c, r] of [...bad, doors[0]]) carve(room, c, r, center[0], center[1]);
  }
}
function carve(room: RoomData, c0: number, r0: number, c1: number, r1: number): void {
  let c = c0, r = r0;
  while (c !== c1 || r !== r1) {
    if (room.at(c, r) !== Ob.None && room.at(c, r) !== Ob.Spikes) room.setOb(c, r, Ob.None);
    if (c !== c1 && (r === r1 || Math.abs(c - c1) > Math.abs(r - r1))) c += Math.sign(c1 - c); else r += Math.sign(r1 - r);
  }
  room.setOb(c, r, Ob.None);
}

function nearDoor(room: RoomData, c: number, r: number): boolean {
  for (const d of room.doors) { const [dc, dr] = room.doorInner(d.side, d.slot); if (Math.abs(dc - c) + Math.abs(dr - r) <= 3) return true; }
  return false;
}

function castEnemies(room: RoomData, floor: Floor, rng: RNG, slots: { c: number; r: number; ch: string }[], budgetMul = 1): SpawnDef[] {
  const th = floor.theme;
  const pool = Object.entries(th.enemies).filter(([id]) => getEnemy(id));
  const pickRole = (role: Role | 'any'): string | null => {
    if (role === 'any') return rng.weighted(pool, (x) => x[1])?.[0] ?? null;
    for (const r of FALLBACK[role] ?? [role]) {
      const cands = pool.filter(([id]) => getEnemy(id)!.role === r);
      const p = rng.weighted(cands, (x) => x[1]);
      if (p) return p[0];
    }
    return rng.weighted(pool, (x) => x[1])?.[0] ?? null;
  };
  const cast = new Map<string, string>();
  const out: SpawnDef[] = [];
  let budget = (2.4 + Math.min(room.distance, 6) * 0.55) * th.budget * budgetMul * (room.cw * room.ch > 1 ? 1.8 : 1);
  if (floor.index === 0 && room.distance <= 1) budget = Math.min(budget, 2.5);
  const champ = 0.02 + floor.index * 0.012;
  const order = rng.shuffle(slots.slice());
  let placed = 0;
  for (const s of order) {
    if (nearDoor(room, s.c, s.r)) continue;
    const key = s.ch === 'A' ? 'A' + rng.int(0, 1) : s.ch;
    let id = cast.get(key);
    if (!id) { id = pickRole(SLOT_ROLE[s.ch]) ?? undefined; if (id) cast.set(key, id); }
    if (!id) continue;
    const def = getEnemy(id)!;
    const cost = def.cost * (s.ch === 'W' ? 2.2 : 1);
    if (placed > 0 && cost > budget) continue;
    budget -= cost; placed++;
    if (s.ch === 'W' || def.role === 'swarm') {
      const n = rng.int(3, 4);
      for (let i = 0; i < n; i++) out.push({ id, c: s.c + rng.float(-0.6, 0.6), r: s.r + rng.float(-0.5, 0.5) });
    } else out.push({ id, c: s.c, r: s.r, champion: rng.chance(champ) });
  }
  return out;
}

export function populateRoom(room: RoomData, floor: Floor, run: Run, prng: RNG, save?: SaveManager): void {
  const rng = new RNG(room.seed + ':pop');
  const fi = floor.index;
  const cx = room.pxW / 2, cy = room.pxH / 2;
  const pk = (kind: string, x: number, y: number, data?: any) => room.pickups.push({ kind, x, y, data });
  const item = (x: number, y: number, pool: any, style: string, extra: any = {}) => pk('item', x, y, { id: run.pools.roll(pool, prng), style, ...extra });
  const slots: { c: number; r: number; ch: string }[] = [];
  switch (room.type) {
    case 'start': {
      if (rng.chance(0.5)) { room.setOb(0, 0, Ob.Rock, 0, rng.int(0, 5)); room.setOb(14, 8, Ob.Rock, 0, rng.int(0, 5)); }
      break;
    }
    case 'normal': {
      const subs: [number, number][] = [];
      if (room.cw === 1 && room.ch === 1) subs.push([0, 0]);
      else for (let j = 0; j < room.ch; j++) for (let i = 0; i < room.cw; i++) subs.push([i * 20, j * 11]);
      for (const [oc, orr] of subs) stamp(room, pickTemplate(rng, fi).rows, oc, orr, rng.chance(0.5), rng.chance(0.5), rng, floor, slots);
      // big rooms: decorate the seams with pillars
      if (room.cw === 2) for (const r of [1, room.rows - 2]) if (rng.chance(0.5)) room.setOb(17, r, Ob.Pillar);
      ensurePaths(room);
      room.spawns = castEnemies(room, floor, rng, slots);
      if (room.spawns.length === 0) room.cleared = true;
      break;
    }
    case 'boss': {
      stamp(room, BOSS_TEMPLATE, 0, 0, false, false, rng, floor, slots);
      const opts = floor.theme.bosses.filter((b) => getEnemy(b));
      // the chapter's own bosses are most likely; earlier chapters' bosses can reappear
      room.bossId = rng.weighted(opts, (b) => (opts.indexOf(b) < 2 ? 3 : 1)) ?? opts[0];
      room.flags.bossItem = run.pools.roll('boss', prng);
      if (run.challenge === 'twins' && fi < 7) room.bossId = room.bossId + '+' + room.bossId;
      ensurePaths(room);
      break;
    }
    case 'miniboss': {
      stamp(room, BOSS_TEMPLATE, 0, 0, false, false, rng, floor, slots);
      const prev = FLOORS.slice(0, Math.max(1, fi)).flatMap((f) => f.bosses).filter((b) => getEnemy(b) && b !== 'unbound');
      room.bossId = rng.pick(prev.length ? prev : ['grubmother']);
      ensurePaths(room);
      break;
    }
    case 'treasure': {
      for (const [c, r] of [[1, 1], [13, 1], [1, 7], [13, 7]]) if (rng.chance(0.6)) room.setOb(c, r, Ob.Rock, 0, rng.int(0, 5));
      const choice = fi >= 2 && rng.chance(0.2);
      if (choice) { item(cx - 36, cy + 4, 'treasure', 'treasure', { group: 1 }); item(cx + 36, cy + 4, 'treasure', 'treasure', { group: 1 }); }
      else item(cx, cy + 4, 'treasure', 'treasure');
      break;
    }
    case 'shop': {
      room.npcs.push({ kind: 'mott', x: cx, y: room.oy + 34 });
      const y = cy + 18;
      const xs = [-96, -48, 0, 48, 96];
      const nItems = fi >= 4 ? 3 : 2;
      const itemSlots = rng.shuffle([0, 1, 2, 3, 4]).slice(0, nItems);
      xs.forEach((dx, i) => {
        if (itemSlots.includes(i)) {
          const id = run.pools.roll('shop', prng);
          pk('item', cx + dx, y, { id, style: 'shop', price: priceFor(id), shop: true });
        } else {
          const [kind, price] = rng.pick([['heart', 3], ['key', 5], ['bomb', 5], ['page', 5], ['sweet', 4], ['spark', 6], ['wax', 5], ['chest:locked', 6], ['bomb2', 7]] as [string, number][]);
          pk(kind, cx + dx, y + 6, kind === 'page' ? { id: null, price, shop: true, rollPage: true } : kind === 'sweet' ? { color: rng.int(0, 11), price, shop: true } : { price, shop: true });
        }
      });
      break;
    }
    case 'secret': {
      const r = rng.next();
      if (r < 0.3) item(cx, cy, 'secret', 'normal');
      else if (r < 0.65) for (let i = 0; i < rng.int(4, 7); i++) pk(rng.pick(['button', 'button', 'button5', 'key', 'bomb']), cx + rng.int(-40, 40), cy + rng.int(-24, 24));
      else if (r < 0.85) { pk('chest:tin', cx - 30, cy); pk('chest:locked', cx + 30, cy); }
      else { pk('heart', cx - 20, cy); pk('wax', cx, cy); pk('brass', cx + 20, cy); }
      break;
    }
    case 'supersecret': {
      if (rng.chance(0.7)) item(cx, cy, rng.chance(0.5) ? 'secret' : 'deal', 'normal');
      else for (let i = 0; i < 4; i++) pk(rng.pick(['heart', 'wax', 'ink']), cx + (i - 1.5) * 20, cy);
      break;
    }
    case 'challenge': {
      room.setOb(7, 4, Ob.Button);
      item(cx, room.oy + 40, 'challenge', 'treasure', { locked: true });
      const waves: SpawnDef[][] = [];
      for (let wv = 0; wv < 3; wv++) {
        const sl: { c: number; r: number; ch: string }[] = [];
        stamp(new RoomData(-1, 0, 0, 1, 1, 'normal', 'tmp'), pickTemplate(rng, fi).rows, 0, 0, false, false, rng, floor, sl);
        const fake = Object.assign(Object.create(RoomData.prototype), room, { doors: room.doors }) as RoomData;
        waves.push(castEnemies(fake, floor, rng, sl.filter((s) => room.at(s.c, s.r) === Ob.None), 1 + wv * 0.4));
      }
      room.waves = waves;
      break;
    }
    case 'sacrifice': room.setOb(7, 4, Ob.Spikes); break;
    case 'arcade': {
      const spots = rng.shuffle([[-80, -30], [-40, -30], [40, -30], [80, -30], [-80, 30], [80, 30]]);
      const kinds = ['slot', 'slot', 'fortune', 'beggar'];
      if (rng.chance(0.5)) kinds.pop();
      kinds.forEach((k, i) => room.npcs.push({ kind: k, x: cx + spots[i][0], y: cy + spots[i][1] }));
      for (let i = 0; i < rng.int(1, 3); i++) pk('button', cx + rng.int(-30, 30), cy + rng.int(10, 30));
      break;
    }
    case 'cursed': {
      const r = rng.next();
      if (r < 0.45) { pk('chest:crimson', cx - 26, cy); pk(rng.chance(0.5) ? 'chest:crimson' : 'chest:tin', cx + 26, cy); }
      else if (r < 0.75) {
        item(cx, cy, 'curse', 'deal');
        const sl = [{ c: 2, r: 2, ch: 'M' }, { c: 12, r: 6, ch: 'M' }, { c: 2, r: 6, ch: 'F' }, { c: 12, r: 2, ch: 'F' }];
        room.spawns = castEnemies(room, floor, rng, sl, 1.3);
      } else for (let i = 0; i < 3; i++) pk(rng.pick(['ink', 'page', 'sweet', 'button5']), cx + (i - 1) * 24, cy);
      break;
    }
    case 'library': {
      const n = rng.chance(0.4) ? 2 : 1;
      for (let i = 0; i < n; i++) { const id = run.pools.roll('library', prng); pk('item', cx + (n === 1 ? 0 : (i - 0.5) * 60), cy, { id, style: 'shop', price: 15, shop: true }); }
      for (const [c, r] of [[1, 1], [2, 1], [12, 1], [13, 1]]) room.setOb(c, r, Ob.Heap, 12, 0);
      break;
    }
    case 'event': {
      const k = rng.pick(['seamstress', 'clock', 'well', 'beggar', 'fortune']);
      room.npcs.push({ kind: k, x: cx, y: cy - 10 });
      if (k === 'well') for (const [c, r] of [[3, 2], [11, 2], [3, 6], [11, 6]]) room.setOb(c, r, Ob.Urn, 3);
      break;
    }
    case 'deal': {
      const n = rng.int(1, 2) + (fi >= 4 ? 1 : 0);
      for (let i = 0; i < n; i++) { const id = run.pools.roll('deal', prng); pk('item', cx + (i - (n - 1) / 2) * 56, cy, { id, style: 'deal', deal: dealPrice(id) }); }
      for (const [c, r] of [[3, 2], [11, 2]]) room.setOb(c, r, Ob.Fire, 12, 3);
      break;
    }
    case 'blessing': {
      item(cx, cy, 'blessing', 'blessing');
      pk('wax', cx - 40, cy + 20);
      break;
    }
  }
  // shop pages resolve lazily to a concrete page id (so the page pool can grow without re-seeding)
  for (const p of room.pickups) if (p.data?.rollPage) { p.data.id = pageIdFor(rng); delete p.data.rollPage; }
  void TILE;
}

import { getItem } from '../items/registry';
import { PAGES } from '../items/data/consumables';
function pageIdFor(rng: RNG): string { return rng.pick(PAGES).id; }
export function priceFor(id: string): number {
  const it = getItem(id); if (it?.price) return it.price;
  const q = it?.quality ?? 1;
  return q <= 1 ? 10 : q === 2 ? 15 : 20;
}
function dealPrice(id: string): number { const q = getItem(id)?.quality ?? 2; return q >= 3 ? 2 : 1; }
void ENEMY_DEFS;
