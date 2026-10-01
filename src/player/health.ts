// Segmented health: red felt hearts (containers), wax (temporary), ink (temporary, bursts when lost),
// brass (armour plates that absorb one whole hit), gilded overlays (spill buttons when broken).
export type ExtraKind = 'wax' | 'ink';
export interface ExtraHeart { k: ExtraKind; h: number } // h = half units (1 or 2)

export const MAX_HEARTS = 12;

export interface DamageResult { taken: number; brassBroke: boolean; inkLost: number; gildedBroke: number; dead: boolean }

export class Health {
  redMax = 6; red = 6;
  extra: ExtraHeart[] = [];
  brass = 0;
  gilded = 0;
  /** Characters that cannot hold red hearts (e.g. Elias). */
  noRed = false;

  heartsCount(): number { return this.redMax / 2 + this.extra.length; }
  extraHalf(): number { let s = 0; for (const e of this.extra) s += e.h; return s; }
  totalHalf(): number { return this.red + this.extraHalf(); }
  canAddHeart(): boolean { return this.heartsCount() < MAX_HEARTS; }

  addContainers(n: number, fill = true): void {
    if (this.noRed) { this.addExtra('wax', n * 2); return; }
    for (let i = 0; i < n; i++) {
      if (this.heartsCount() >= MAX_HEARTS) {
        // trade a temporary heart for the container
        if (this.extra.length) this.extra.pop(); else break;
      }
      this.redMax += 2; if (fill) this.red += 2;
    }
    this.red = Math.min(this.red, this.redMax);
  }
  removeContainers(n: number): void {
    this.redMax = Math.max(0, this.redMax - n * 2);
    this.red = Math.min(this.red, this.redMax);
    this.gilded = Math.min(this.gilded, this.redMax / 2);
  }
  healRed(half: number): number {
    const before = this.red;
    this.red = Math.min(this.redMax, this.red + half);
    return this.red - before;
  }
  addExtra(k: ExtraKind, half: number): number {
    let added = 0;
    while (half > 0) {
      const last = this.extra[this.extra.length - 1];
      if (last && last.h === 1 && last.k === k) { last.h = 2; half--; added++; continue; }
      if (this.heartsCount() >= MAX_HEARTS) break;
      const h = Math.min(2, half);
      this.extra.push({ k, h }); half -= h; added += h;
    }
    return added;
  }
  /** A real red container, even for readers who can't normally hold red (the Blot's gift). */
  growRedContainer(): boolean {
    if (this.heartsCount() >= MAX_HEARTS) return false;
    this.redMax += 2; this.red += 2;
    return true;
  }
  addBrass(n: number): void { this.brass = Math.min(6, this.brass + n); }
  addGilded(n: number): void { this.gilded = Math.min(this.redMax / 2, this.gilded + n); }

  /** Apply damage in half-hearts. redFirst: self-inflicted costs (drain red before temporary). */
  damage(half: number, redFirst = false): DamageResult {
    const res: DamageResult = { taken: 0, brassBroke: false, inkLost: 0, gildedBroke: 0, dead: false };
    if (!redFirst && this.brass > 0) { this.brass--; res.brassBroke = true; return res; }
    const redBefore = this.red;
    while (half > 0) {
      if (redFirst && this.red > 0) { this.red--; half--; res.taken++; continue; }
      const last = this.extra[this.extra.length - 1];
      if (last) {
        last.h--; half--; res.taken++;
        if (last.h <= 0) { this.extra.pop(); if (last.k === 'ink') res.inkLost++; }
        continue;
      }
      if (this.red > 0) { this.red--; half--; res.taken++; continue; }
      break;
    }
    // gilded containers crack when their red is emptied
    const fullBefore = Math.ceil(redBefore / 2), fullAfter = Math.ceil(this.red / 2);
    const lostContainers = fullBefore - fullAfter;
    if (lostContainers > 0 && this.gilded > 0) {
      const g = Math.min(this.gilded, lostContainers);
      // only gilded hearts sitting at the end of the red row break
      const firstGilded = this.redMax / 2 - this.gilded;
      let broke = 0;
      for (let i = fullAfter; i < fullBefore; i++) if (i >= firstGilded) broke++;
      this.gilded -= Math.min(g, broke); res.gildedBroke = Math.min(g, broke);
    }
    res.dead = this.totalHalf() <= 0;
    return res;
  }
  serialize(): any { return { redMax: this.redMax, red: this.red, extra: this.extra.map((e) => ({ ...e })), brass: this.brass, gilded: this.gilded, noRed: this.noRed }; }
  static from(o: any): Health { const h = new Health(); Object.assign(h, o); h.extra = (o.extra ?? []).map((e: ExtraHeart) => ({ ...e })); return h; }
}
