import { grid } from './grid';
import * as HM from './hand/marcus';
const HAND = { pal: HM.MARCUS_PAL, sheets: () => ({ down: HM.HEAD_DOWN }) };
import { buildPlayerSprites } from './marcus';
import { LOOKS } from './look';
import { ALL_ENEMY_DEFS } from '../enemies/registry';
import { getSprites } from '../enemies/enemy';
import { ALL_ITEMS } from '../items/registry';
import { itemIconCanvas } from './items';
import { FLOORS } from '../data/floors';
import { propsFor } from './props';
import { familiarSprites } from './familiars';

export interface Sheet { label: string; canvas: HTMLCanvasElement }
export function artSheets(which: string): Sheet[] {
  const out: Sheet[] = [];
  if (which === 'hand') {
    for (const [label, rows] of Object.entries(HAND.sheets())) out.push({ label, canvas: grid(rows, HAND.pal).toCanvas() });
  }
  if (which === 'player') {
    for (const k of Object.keys(LOOKS)) {
      const s = buildPlayerSprites(LOOKS[k]);
      const c = document.createElement('canvas'); c.width = 24; c.height = 30;
      const x = c.getContext('2d')!;
      s.body.down[0].draw(x, 12, 30); s.head.down.normal.draw(x, 12, 20);
      out.push({ label: k, canvas: c });
      for (const d of ['down', 'side', 'up'] as const) out.push({ label: d, canvas: s.head[d].normal.canvas });
      for (let i = 1; i <= 6; i++) out.push({ label: 'w' + i, canvas: s.body.side[i].canvas });
    }
  } else if (which.startsWith('enemies') || which.startsWith('bosses')) {
    const defs = ALL_ENEMY_DEFS().filter((d) => which.startsWith('bosses') === !!d.boss);
    const page = Number(which.replace(/\D/g, '') || 0);
    for (const d of defs.slice(page * 12, page * 12 + 12)) {
      const set = getSprites(d);
      for (const [anim, fr] of Object.entries(set)) fr.slice(0, 4).forEach((s, i) => out.push({ label: `${d.id}:${anim}${i}`, canvas: s.canvas }));
    }
  } else if (which === 'items' || which === 'refs') {
    for (const it of which === 'refs' ? ALL_ITEMS.slice(-29) : ALL_ITEMS) out.push({ label: it.id.slice(0, 10), canvas: itemIconCanvas(it.id) });
  } else if (which.startsWith('props')) {
    const f = FLOORS[Number(which.slice(5) || 0)];
    const P = propsFor(f);
    [...P.rocks, ...P.marked, P.block, P.pillar, P.urn, P.keg, P.spikes, P.web, ...P.heap.flat(), ...P.fire.map((x) => x[0]), P.fireBase].forEach((s, i) => out.push({ label: String(i), canvas: s.canvas }));
  } else if (which === 'familiars') {
    for (const id of ['inkling', 'paper_bird', 'tin_soldier', 'moth_friend', 'ghost_cat', 'thimble', 'bookworm', 'button_jar', 'lantern_wisp', 'shadow_twin', 'stitch_spider', 'wax_angel', 'moth_jar', 'clink_mouse', 'glass_eye', 'belfry_bat', 'scraps', 'little_wick'])
      out.push({ label: id, canvas: familiarSprites(id)[0].canvas });
  }
  return out;
}
