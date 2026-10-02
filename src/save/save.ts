// Persistent save data in localStorage: unlocks, collection, statistics, settings and the resumable run.
import { Bindings, DEFAULT_BINDINGS } from '../core/input';

export interface Settings {
  music: number; sfx: number; shake: number; /** Hit pause strength: 0 off, 0.5 light, 1 full. */ hitPause?: number; scale: 'sharp' | 'integer' | 'stretch'; diagonalAim: boolean;
  showStats: boolean; showFps: boolean; fireDropChance: number; bindings: Bindings; fullscreen: boolean; hudScale: number;
  /** Blend frames between simulation steps (smooth on 120+ Hz displays). */
  interpolate: boolean;
  /** Show collected items on the HUD. */
  showItems: boolean;
  /** 'eid' = compact External-Item-Descriptions style text, 'card' = large card. */
  descStyle: 'eid' | 'card';
  /** Frame-rate cap; 0 = match the display refresh rate. */
  fpsCap: number;
  /** Show a run timer on the HUD. */
  timer?: boolean;
  /** Show what you're playing in Discord (desktop). */
  discord?: boolean;
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
  lastPlayed?: number;
  /** Finished runs, newest first (for the run history screen). */
  history?: RunRecord[];
  /** Enemy kill counts by id (bestiary). */
  kills?: Record<string, number>;
  /** Grandfather's notes read (ids from data/notes). */
  notes?: string[];
  /** Endings seen (ids from data/endings). */
  endings?: string[];
  /** Completion marks per reader: ending ids, with ':hard' when won in Second Edition. */
  marks?: Record<string, string[]>;
  /** Where the last run died: its echo waits there next time. */
  echo?: { char: string; floor: number; items: string[]; cause: string; chapter: string } | null;
  /** Achievements already looked at in the Journal (the rest show as NEW). */
  seenUnlocks?: string[];
  /** Readers already played (an unlocked reader not in here shows as NEW). */
  readersMet?: string[];
  /** Buttons put in shop donation boxes, ever. Every 50 raises the shop a level. */
  donated?: number;
}
export interface RunRecord { date: number; char: string; mode: string; seed: string; floor: number; won: boolean; score: number; time: number; cause?: string; items: string[] }

/**
 * Where saves live. The desktop build writes JSON files in the user's app-data folder (through the
 * preload bridge); the browser build uses localStorage. Both expose the same tiny key/value API.
 */
interface Store { read(key: string): string | null; write(key: string, json: string): void; remove(key: string): void; kind: 'file' | 'browser' }
/** The five ending marks (ids of the endings in data/endings.ts). */
const MARKS = ['morning', 'own_hand', 'for_marcus', 'the_visit', 'goodnight'];
const desktop = (globalThis as any).bomDesktop as { readSave(k: string): string | null; writeSave(k: string, j: string): void; deleteSave(k: string): void } | undefined;
const LEGACY_KEY = 'binding-of-marcus-save-v1';
export const store: Store = desktop
  ? { kind: 'file', read: (k) => desktop.readSave(k), write: (k, j) => desktop.writeSave(k, j), remove: (k) => desktop.deleteSave(k) }
  : {
    kind: 'browser',
    read: (k) => { try { return localStorage.getItem('bom:' + k); } catch { return null; } },
    write: (k, j) => { try { localStorage.setItem('bom:' + k, j); } catch (e) { console.warn('save failed', e); } },
    remove: (k) => { try { localStorage.removeItem('bom:' + k); } catch { /* ignore */ } },
  };
export const SLOTS = 3;

/** Summary of a save slot for the profile picker. */
export interface SlotInfo { slot: number; empty: boolean; unlocks: number; wins: number; runs: number; playTime: number; hasRun: boolean; lastPlayed: number }

export function defaultSave(): SaveData {
  return {
    version: 1, unlocks: [], itemsSeen: [], bossesBeaten: [], challengesDone: [], stats: {},
    settings: { music: 0.7, sfx: 0.8, shake: 1, scale: 'sharp', diagonalAim: false, showStats: true, showFps: false, fireDropChance: 0.1, bindings: structuredClone(DEFAULT_BINDINGS), fullscreen: false, hudScale: 1, interpolate: true, fpsCap: 0, showItems: true, descStyle: 'eid' },
    run: null, bestTime: 0, lastSeed: '', introSeen: false,
  };
}

export class SaveManager {
  data: SaveData;
  settings: Settings;
  slot = 1;
  onUnlock: ((id: string) => void) | null = null;
  private dirty = false; private settingsDirty = false;
  constructor() {
    const def = defaultSave();
    this.settings = def.settings;
    // one-time migration of the original single localStorage save into slot 1
    if (store.kind === 'browser') {
      try {
        const old = localStorage.getItem(LEGACY_KEY);
        if (old && !store.read('slot1')) { store.write('slot1', old); const o = JSON.parse(old); if (o.settings) store.write('settings', JSON.stringify(o.settings)); }
      } catch { /* ignore */ }
    }
    try { const raw = store.read('settings'); if (raw) { const st = JSON.parse(raw); this.settings = { ...def.settings, ...st, bindings: { ...def.settings.bindings, ...(st.bindings ?? {}) } }; } } catch (e) { console.warn('settings load failed', e); }
    try { const meta = JSON.parse(store.read('meta') ?? '{}'); if (meta.slot >= 1 && meta.slot <= SLOTS) this.slot = meta.slot; } catch { /* ignore */ }
    this.data = this.loadSlot(this.slot);
    setInterval(() => this.flush(), 2000);
    window.addEventListener('beforeunload', () => { this.markDirty(); this.flush(); });
  }
  private loadSlot(n: number): SaveData {
    const def = defaultSave();
    let d: SaveData = def;
    try { const raw = store.read('slot' + n); if (raw) { const o = JSON.parse(raw); d = { ...def, ...o }; } } catch (e) { console.warn('slot load failed', e); }
    d.settings = this.settings; // settings are shared by every slot
    // saves from before NEW marks: everything already earned counts as seen
    d.seenUnlocks ??= [...d.unlocks];
    d.readersMet ??= ['marcus', ...d.unlocks.filter((u) => /^(beat_ch\d|beat_final|beat_unwritten|unlock_|tainted_)/.test(u))];
    return d;
  }
  /** Switch to another save slot (saving the current one first). */
  useSlot(n: number): void {
    this.markDirty(); this.flush();
    this.slot = n; this.data = this.loadSlot(n);
    store.write('meta', JSON.stringify({ slot: n }));
  }
  slotInfo(n: number): SlotInfo {
    let o: any = null;
    try { const raw = n === this.slot ? JSON.stringify(this.data) : store.read('slot' + n); o = raw ? JSON.parse(raw) : null; } catch { o = null; }
    const st = o?.stats ?? {};
    const empty = !o || (!(st.runs > 0) && !(o.unlocks?.length));
    return { slot: n, empty, unlocks: o?.unlocks?.length ?? 0, wins: st.wins ?? 0, runs: st.runs ?? 0, playTime: st.playTime ?? 0, hasRun: !!o?.run, lastPlayed: o?.lastPlayed ?? 0 };
  }
  eraseSlot(n: number): void {
    store.remove('slot' + n);
    if (n === this.slot) { this.data = this.loadSlot(n); this.dirty = false; }
  }
  /** The whole slot as JSON (for export) and import from a file. */
  exportSlot(): string { const { settings, ...rest } = this.data; void settings; return JSON.stringify({ game: 'lost-marcus', version: 2, save: rest }, null, 1); }
  importSlot(json: string): boolean {
    try {
      const o = JSON.parse(json); const d = o.save ?? o;
      if (!Array.isArray(d.unlocks) || typeof d.stats !== 'object') return false;
      this.data = { ...defaultSave(), ...d, settings: this.settings }; this.markDirty(); this.flush(); return true;
    } catch { return false; }
  }
  markDirty(): void { this.dirty = true; this.settingsDirty = true; }
  markSettings(): void { this.settingsDirty = true; }
  flush(): void {
    if (this.settingsDirty) { this.settingsDirty = false; store.write('settings', JSON.stringify(this.settings)); }
    if (!this.dirty) return;
    this.dirty = false;
    this.data.lastPlayed = Date.now();
    const { settings, ...rest } = this.data; void settings;
    store.write('slot' + this.slot, JSON.stringify(rest));
  }
  isUnlocked(id: string): boolean { return this.data.unlocks.includes(id); }
  unlock(id: string): boolean {
    if (this.data.unlocks.includes(id)) return false;
    this.data.unlocks.push(id); this.markDirty();
    this.onUnlock?.(id);
    this.flush();   // an unlock is never lost to a crash or a closed window
    return true;
  }
  stat(k: string, add: number): number {
    const v = (this.data.stats[k] ?? 0) + add;
    if (add !== 0) { this.data.stats[k] = v; this.markDirty(); }
    return v;
  }
  collectItem(id: string): void { if (!this.data.itemsSeen.includes(id)) { this.data.itemsSeen.push(id); this.markDirty(); } this.stat('itemsCollected', 1); }
  /** Returns true the first time a note is read. */
  readNote(id: string): boolean { const l = (this.data.notes ??= []); if (l.includes(id)) return false; l.push(id); this.markDirty(); return true; }
  hasNote(id: string): boolean { return !!this.data.notes?.includes(id); }
  /** Returns true the first time an ending is seen. */
  seeEnding(id: string): boolean { const l = (this.data.endings ??= []); if (l.includes(id)) return false; l.push(id); this.markDirty(); return true; }
  hasEnding(id: string): boolean { return !!this.data.endings?.includes(id); }
  /** Mark an ending on a reader's card (hard counts as normal too). */
  addMark(char: string, ending: string, hard: boolean): void {
    const m = ((this.data.marks ??= {})[char] ??= []);
    for (const k of hard ? [ending, ending + ':hard'] : [ending]) if (!m.includes(k)) { m.push(k); this.markDirty(); }
    this.checkTainted();
  }
  hasMark(char: string, key: string): boolean { return !!this.data.marks?.[char]?.includes(key); }
  /** All five ending marks earned with a reader (a story win before marks existed counts for Morning). */
  marksComplete(char: string): boolean {
    return MARKS.every((k) => this.hasMark(char, k) || (k === 'morning' && this.isUnlocked(char === 'marcus' ? 'beat_final' : 'win_' + char)));
  }
  /** Earning every mark with a reader unlocks their mirrored self. */
  checkTainted(): void {
    for (const c of Object.keys(this.data.marks ?? {})) if (!c.endsWith('_t') && this.marksComplete(c)) this.unlock('tainted_' + c);
  }
  markBoss(id: string): void { if (!this.data.bossesBeaten.includes(id)) { this.data.bossesBeaten.push(id); this.markDirty(); } this.stat('bossKills', 1); }
  reset(): void { this.data = defaultSave(); this.data.settings = this.settings; this.markDirty(); this.flush(); }
}
