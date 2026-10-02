// Builds the inspect card shown when Marcus stands next to an item pedestal or a shop pickup.
import { previewLines } from '../items/preview';
import type { World } from '../game/world';
import type { Pickup } from '../game/pickups';
import { getItem, getConsumable } from '../items/registry';
import { describeItem, DescLine } from '../items/describe';
import { poolInfo, PoolInfo } from '../items/homes';
import { itemIconCanvas } from '../art/items';
import { pickupSprites } from '../art/pickups';
import { SWEET_EFFECTS } from '../items/data/consumables';
import { bindLabel as K, fmtKeys } from '../core/input';

export interface InspectInfo {
  key: string;
  icon: CanvasImageSource | null;
  title: string;
  subtitle: string;
  lines: DescLine[];
  quality: number;          // -1 hides the quality pips
  kindLabel: string;        // PASSIVE / ACTIVE / FAMILIAR / PICKUP ...
  tags?: string[];
  itemId?: string;
  /** Which pool the item comes from, so you can tell an Inkwell item from a shop one. */
  pool?: PoolInfo | null;
}

const PICKUP_TEXT: Record<string, [string, string, string]> = {
  // kind: [name, subtitle, effect]
  heart: ['Red Heart', 'A whole felt heart', 'Heals 1 heart.'],
  heartHalf: ['Half Heart', 'Half a felt heart', 'Heals half a heart.'],
  wax: ['Wax Heart', 'Soft and temporary', 'Adds 1 wax heart on top of your red hearts. Wax hearts melt away when hit.'],
  waxHalf: ['Half Wax Heart', 'Soft and temporary', 'Adds half a wax heart.'],
  ink: ['Ink Heart', 'Bottled darkness', 'Adds 1 ink heart. When it breaks, it splashes damage on every enemy in the room.'],
  brass: ['Brass Heart', 'Armour plating', 'Adds 1 brass heart. Absorbs a whole hit before breaking.'],
  gilded: ['Gilded Heart', 'Worth its weight', 'Adds 1 gilded heart. Spills buttons when it breaks.'],
  key: ['Key', 'Opens things', 'Opens locked doors, locked boxes and the treasure room on later chapters.'],
  goldKey: ['Golden Key', 'Opens everything', 'Every lock on this floor opens for free.'],
  bomb: ['Cherry Bomb', 'Handle with care', 'Place with {bomb}. Breaks rocks, opens hidden walls and hurts everything nearby.'],
  bomb2: ['Two Cherry Bombs', 'Handle with care', '+2 cherry bombs.'],
  goldBomb: ['Golden Bomb', '+5 bombs', 'A heavy, gilded cherry bomb: five bombs at once.'],
  spark: ['Spark Jar', 'A little lightning', 'Charges your active item by 1.'],
  sparkBig: ['Big Spark Jar', 'A lot of lightning', 'Fully charges your active item.'],
  button: ['Button', 'Currency', '+1 button.'],
  button5: ['Silver Button', 'Currency', '+5 buttons.'],
  button10: ['Gold Button', 'Currency', '+10 buttons.'],
};

/** Item text can name controls as {action}; show whatever the player has bound. */
export function inspectInfo(w: World, p: Pickup): InspectInfo | null {
  const info = inspectRaw(w, p);
  if (info) { info.lines = info.lines.map((l) => ({ ...l, text: fmtKeys(l.text) })); info.subtitle = fmtKeys(info.subtitle); }
  return info;
}
function inspectRaw(w: World, p: Pickup): InspectInfo | null {
  const blind = w.blindItems();
  if (p.kind === 'item' && p.data.id) {
    const it = getItem(p.data.id); if (!it) return null;
    if (blind) return { key: 'blind', icon: itemIconCanvas(it.id, true), title: '???', subtitle: 'Something hidden by the Blight', lines: [{ text: 'You cannot make out what it is.', color: 'plain' }], quality: -1, kindLabel: '' };
    const kindLabel = p.data.swap ? 'LOST & FOUND  ·  take one, leave one' : it.kind === 'active' ? `ACTIVE ITEM  ·  ${K('active')} to use` : it.kind === 'familiar' ? 'FAMILIAR' : it.kind === 'trinket' ? 'CHARM' : 'PASSIVE ITEM';
    return { key: it.id, icon: itemIconCanvas(it.id, false), title: it.name, subtitle: it.pickup, lines: [...describeItem(it), ...previewLines(w, it.id)], quality: it.quality, kindLabel, tags: it.tags, itemId: it.id, pool: poolInfo(it) };
  }
  if (p.kind === 'charm' && p.data.id) {
    const it = getItem(p.data.id) ?? getConsumable(p.data.id) as any;
    if (!it) return null;
    const lines: DescLine[] = it.effect ? (getItem(p.data.id) ? describeItem(getItem(p.data.id)!) : it.effect.map((t: string) => ({ text: t, color: 'plain' as const }))) : [];
    return { key: p.data.id, icon: itemIconCanvas(p.data.id, false), title: it.name, subtitle: it.pickup ?? it.desc ?? '', lines, quality: -1, kindLabel: `CHARM  ·  hold ${K('drop')} to drop` };
  }
  if (p.kind === 'page' && p.data.id) {
    const c = getConsumable(p.data.id); if (!c) return null;
    return { key: c.id, icon: pickupSprites().page.canvas, title: c.name, subtitle: c.desc, lines: c.effect.map((t) => ({ text: t, color: 'plain' })), quality: -1, kindLabel: `TORN PAGE  ·  ${K('consumable')} to use` };
  }
  if (p.kind === 'sweet') {
    const eff = SWEET_EFFECTS[w.run.sweetMap[p.data.color ?? 0] ?? 0];
    const known = !!eff && w.run.identified.has(eff.id);
    return { key: 'sweet' + (p.data.color ?? 0), icon: pickupSprites().sweets[(p.data.color ?? 0) % pickupSprites().sweets.length].canvas,
      title: known ? eff.name : 'Unmarked Sweet', subtitle: known ? 'Identified' : 'Who knows what it does',
      lines: [{ text: known ? eff.desc : 'A random effect. Eat it ({consumable}) to find out.', color: 'plain' }], quality: -1, kindLabel: `SWEET  ·  ${K('consumable')} to use` };
  }
  const t = PICKUP_TEXT[p.kind];
  if (t) {
    const spr = (pickupSprites() as any)[p.kind];
    return { key: p.kind, icon: spr?.canvas ?? null, title: t[0], subtitle: t[1], lines: [{ text: t[2], color: 'plain' }], quality: -1, kindLabel: 'PICKUP' };
  }
  return null;
}
