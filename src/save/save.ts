// Persistent save data in localStorage: unlocks, collection, statistics, settings and the resumable run.
import { Bindings, DEFAULT_BINDINGS } from '../core/input';

export interface Settings {
  music: number; sfx: number; shake: number; scale: 'sharp' | 'integer' | 'stretch'; diagonalAim: boolean;
  showStats: boolean; showFps: boolean; fireDropChance: number; bindings: Bindings; fullscreen: boolean; hudScale: number;
  /** Blend frames between simulation steps (smooth on 120+ Hz displays). */
  interpolate: boolean;
  /** Show collected items on the HUD. */
  showItems: boolean;
  /** Frame-rate cap; 0 = match the display refresh rate. */
  fpsCap: number;
}
export interface SaveData {
  version: number;
  unlocks: string[];               // achievement ids earned
  itemsSeen: string[];             // collection
  bossesBeaten: string[];
  challengesDone: string[];
  stats: Record<string, number>;
  settings: Settings;
  run: any | null;                 // snapshot for Continue
  bestTime: number;
  lastSeed: string;
  introSeen: boolean;
}

const KEY = 'binding-of-marcus-save-v1';

export function defaultSave(): SaveData {
  return {
    version: 1, unlocks: [], itemsSeen: [], bossesBeaten: [], challengesDone: [], stats: {},
    settings: { music: 0.7, sfx: 0.8, shake: 1, scale: 'sharp', diagonalAim: false, showStats: true, showFps: false, fireDropChance: 0.1, bindings: structuredClone(DEFAULT_BINDINGS), fullscreen: false, hudScale: 1, interpolate: true, fpsCap: 0, showItems: true },
    run: null, bestTime: 0, lastSeed: '', introSeen: false,
  };
}

export class SaveManager {
  data: SaveData;
  onUnlock: ((id: string) => void) | null = null;
  private dirty = false;
  constructor() {
    this.data = defaultSave();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const def = defaultSave();
        this.data = { ...def, ...d, settings: { ...def.settings, ...(d.settings ?? {}), bindings: { ...def.settings.bindings, ...(d.settings?.bindings ?? {}) } } };
      }
    } catch (e) { console.warn('save load failed', e); }
    setInterval(() => this.flush(), 2000);
    window.addEventListener('beforeunload', () => this.flush());
  }
  markDirty(): void { this.dirty = true; }
  flush(): void {
    if (!this.dirty) return;
    this.dirty = false;
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { console.warn('save failed', e); }
  }
  isUnlocked(id: string): boolean { return this.data.unlocks.includes(id); }
  unlock(id: string): boolean {
    if (this.data.unlocks.includes(id)) return false;
    this.data.unlocks.push(id); this.markDirty();
    this.onUnlock?.(id);
    return true;
  }
  stat(k: string, add: number): number {
    const v = (this.data.stats[k] ?? 0) + add;
    if (add !== 0) { this.data.stats[k] = v; this.markDirty(); }
    return v;
  }
  collectItem(id: string): void { if (!this.data.itemsSeen.includes(id)) { this.data.itemsSeen.push(id); this.markDirty(); } this.stat('itemsCollected', 1); }
  markBoss(id: string): void { if (!this.data.bossesBeaten.includes(id)) { this.data.bossesBeaten.push(id); this.markDirty(); } this.stat('bossKills', 1); }
  reset(): void { const s = this.data.settings; this.data = defaultSave(); this.data.settings = s; this.markDirty(); this.flush(); }
}
