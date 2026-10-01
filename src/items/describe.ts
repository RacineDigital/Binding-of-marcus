// Builds precise, readable descriptions from item data (stat lines are generated, never hand-written).
import type { ItemDef } from './types';
import { STAT_LABEL, StatMods } from '../player/stats';
import { fmt1 } from '../core/math';

export interface DescLine { text: string; color: 'up' | 'down' | 'plain' | 'note' }

export function statLines(stats?: StatMods): DescLine[] {
  if (!stats) return [];
  const out: DescLine[] = [];
  for (const k of Object.keys(stats) as (keyof StatMods)[]) {
    const v = stats[k]!;
    if (!v) continue;
    const label = STAT_LABEL[k];
    if (k === 'damageMult' || k === 'tearsMult') { if (v !== 1) out.push({ text: `${label} x${fmt1(v)}`, color: v > 1 ? 'up' : 'down' }); continue; }
    const shown = k === 'range' ? `${v > 0 ? '+' : ''}${Math.round(v)}` : `${v > 0 ? '+' : ''}${fmt1(v)}`;
    out.push({ text: `${label} ${shown}`, color: v > 0 ? 'up' : 'down' });
  }
  return out;
}

export function describeItem(it: ItemDef): DescLine[] {
  const out: DescLine[] = [...statLines(it.stats)];
  const h = it.health;
  if (h) {
    if (h.containers) out.push({ text: `+${h.containers} Heart container${h.containers > 1 ? 's' : ''}`, color: 'up' });
    if (h.loseContainers) out.push({ text: `-${h.loseContainers} Heart container${h.loseContainers > 1 ? 's' : ''}`, color: 'down' });
    if (h.heal) out.push({ text: h.heal >= 24 ? 'Full heal' : `Heals ${h.heal / 2} heart${h.heal > 2 ? 's' : ''}`, color: 'up' });
    if (h.wax) out.push({ text: `+${h.wax / 2} Wax heart${h.wax > 2 ? 's' : ''}`, color: 'up' });
    if (h.ink) out.push({ text: `+${h.ink / 2} Ink heart${h.ink > 2 ? 's' : ''}`, color: 'up' });
    if (h.brass) out.push({ text: `+${h.brass} Brass heart${h.brass > 1 ? 's' : ''}`, color: 'up' });
    if (h.gilded) out.push({ text: `+${h.gilded} Gilded heart${h.gilded > 1 ? 's' : ''}`, color: 'up' });
  }
  const g = it.give;
  if (g) {
    if (g.buttons) out.push({ text: `+${g.buttons} Buttons`, color: 'up' });
    if (g.bombs) out.push({ text: `+${g.bombs} Cherry bombs`, color: 'up' });
    if (g.keys) out.push({ text: `+${g.keys} Keys`, color: 'up' });
  }
  if (it.flight) out.push({ text: 'Flight', color: 'up' });
  for (const e of it.effect) out.push({ text: e, color: 'plain' });
  if (it.active) {
    const a = it.active;
    const rc = a.type === 'room' ? `${a.charge} room${a.charge > 1 ? 's' : ''}` : a.type === 'timed' ? `${a.charge}s` : `${a.charge} kills`;
    out.push({ text: a.single ? 'Single use' : `Recharge: ${rc}`, color: 'note' });
  }
  return out;
}
