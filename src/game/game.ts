// Top-level game: fixed-step loop, scenes (menu / run / death / ending), run lifecycle and global input.
import { Renderer } from '../render/renderer';
import { Input } from '../core/input';
import { AudioEngine } from '../audio/audio';
import { SaveManager } from '../save/save';
import { FIXED_DT, VIEW_W, VIEW_H } from '../core/constants';
import { World } from './world';
import { snapshotWorld, applyInterp, restoreInterp } from './interp';
import { setFullscreen, onFullscreenChange } from '../core/fullscreen';
import { recordScore, checkProgress, RunMode } from './progress';
import { endingFor } from '../data/endings';
import { updatePresence } from './presence';
import { Run } from './run';
import { Player } from '../player/player';
import { charById } from '../player/characters';
import { randomSeed, normalizeSeed } from '../core/rng';
import { getItem, getConsumable } from '../items/registry';
import { placeBomb } from './bombs';
import * as flow from './roomflow';
import { SWEET_EFFECTS } from '../items/data/consumables';
import { MenuSystem } from '../ui/menus';
import { Health } from '../player/health';
import { spawnDrop } from './drops';
import { ACHIEVEMENTS } from '../data/achievements';
import { text, COL, FONT_TITLE, FONT_BODY } from '../ui/draw';

export type Scene = 'menu' | 'run' | 'dead' | 'ending';

export class Game {
  r: Renderer; input: Input; audio: AudioEngine; save: SaveManager;
  scene: Scene = 'menu';
  world: World | null = null;
  menus: MenuSystem;
  paused = false;
  fading = false; fadeT = 0; fadeDur = 0.5; fadeCb: (() => void) | null = null; fadeA = 0;
  private acc = 0; private last = 0;
  fps = 60; private fpsAcc = 0; private fpsN = 0;
  unlockQueue: { name: string; reward: string; t: number; big: boolean }[] = [];
  dropHold = 0;
  perf = { update: 0, render: 0, present: 0 };
  constructor(cv: HTMLCanvasElement) {
    this.r = new Renderer(cv);
    this.input = new Input(cv);
    this.input.toView = (cx, cy) => { const r = this.r, dpr = Math.min(window.devicePixelRatio || 1, 2); return [(cx * dpr - r.offX) / r.scale, (cy * dpr - r.offY) / r.scale]; };
    this.audio = createAudio();
    this.save = new SaveManager();
    this.applySettings();
    this.menus = new MenuSystem(this);
    // the desktop app comes back in fullscreen if you left it that way (F11 and Alt+Enter count too)
    if ((window as any).bomDesktop?.setFullscreen && this.save.data.settings.fullscreen) setFullscreen(true);
    onFullscreenChange((on) => { if (this.save.data.settings.fullscreen !== on) { this.save.data.settings.fullscreen = on; this.save.markSettings(); } });
    this.save.onUnlock = (id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      if (!a) return;
      // what you got, not just what you did; a new reader is a bigger moment
      const big = /Unlocks [A-Z][a-z]+, the|Unlocks (The Blot|Mirrored)/.test(a.unlocks);
      this.unlockQueue.push({ name: a.name, reward: a.unlocks, t: 0, big });
      this.audio.stinger('unlock');
      if (this.world) (this.world.run.flags.unlockedNow ??= []).push(id);
    };
    // readers whose marks were all earned before the mirrored existed get theirs now
    this.save.checkTainted();
    const unlockAudio = () => { this.audio.unlock(); };
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('gamepadconnected', unlockAudio);
    // F9 (or F12) saves a screenshot: to Pictures/Lost Marcus on desktop, a download in the browser
    window.addEventListener('keydown', (e) => { if (e.code === 'F9' || e.code === 'F12') { e.preventDefault(); this.screenshot(cv); } });
    // closing the window mid-run keeps your exact spot
    window.addEventListener('beforeunload', () => { if (this.scene === 'run' && this.world && !this.world.player.dead && this.world.deathT < 0) this.saveSnapshot(); this.save.flush(); });
  }

  screenshot(cv: HTMLCanvasElement): void {
    const url = cv.toDataURL('image/png');
    const say = (msg: string) => this.world?.hud.toast(msg, 2);
    this.audio.play('coinDrop', { vol: 0.6, pitch: 1.8 });
    const desk = (window as any).bomDesktop;
    if (desk?.screenshot) { desk.screenshot(url).then((file: string) => say('Screenshot saved: ' + file.split(/[\\/]/).pop()), () => say('Could not save the screenshot.')); return; }
    const a = document.createElement('a');
    a.href = url; a.download = `marcus-${new Date().toISOString().replace(/[:.]/g, '-')}.png`; a.click();
    say('Screenshot saved.');
  }

  applySettings(): void {
    const s = this.save.data.settings;
    this.input.bindings = structuredClone(s.bindings);
    this.input.diagonalAim = s.diagonalAim;
    this.r.mode = s.scale; this.r.resize();
    this.audio.setVolumes(s.music, s.sfx);
  }

  start(): void {
    this.last = performance.now();
    const frame = (now: number) => {
      requestAnimationFrame(frame);
      const cap = this.save.data.settings.fpsCap;
      // small tolerance so a 144 cap on a 144 Hz display never drops frames to timing jitter
      if (cap && now - this.last < 1000 / cap - 1.2) return;
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.fpsAcc += dt; this.fpsN++;
      if (this.fpsAcc >= 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }
      this.input.pollPad(dt);
      this.acc += dt;
      let steps = 0;
      const t0 = performance.now();
      while (this.acc >= FIXED_DT && steps < 5) { this.step(FIXED_DT); this.acc -= FIXED_DT; steps++; this.input.endStep(); }
      const t1 = performance.now();
      if (steps === 5) this.acc = 0;
      this.render(dt);
      const t2 = performance.now();
      this.perf.update = this.perf.update * 0.95 + (t1 - t0) * 0.05; this.perf.render = this.perf.render * 0.95 + (t2 - t1) * 0.05;
    };
    requestAnimationFrame(frame);
  }

  private playAcc = 0;
  private step(dt: number): void {
    this.audio.update(dt);
    updatePresence(this, dt);
    if (this.scene === 'run' && !this.paused) { this.playAcc += dt; if (this.playAcc >= 10) { this.save.stat('playTime', this.playAcc); this.playAcc = 0; } }
    for (const u of this.unlockQueue) u.t += dt;
    this.unlockQueue = this.unlockQueue.filter((u) => u.t < 5.5);
    if (this.fading) {
      this.fadeT += dt;
      const half = this.fadeDur;
      if (this.fadeCb && this.fadeT >= half) { const cb = this.fadeCb; this.fadeCb = null; cb(); }
      this.fadeA = this.fadeT < half ? this.fadeT / half : Math.max(0, 1 - (this.fadeT - half) / half);
      if (this.fadeT >= half * 2) { this.fading = false; this.fadeA = 0; }
    }
    if (this.scene !== 'run' || !this.world) { this.menus.update(dt); return; }
    const w = this.world;
    if (this.paused) {
      // the pause key (Esc / P / Start) resumes from the top-level pause menu; inside Options it just goes back
      if (this.input.wasPressed('pause') && !this.menus.inSubmenu() && !this.menus.pauseGuarded()) { this.paused = false; this.input.clearMenu(); this.audio.duck(1, 0.01); return; }
      this.menus.update(dt); return;
    }
    const inp = this.input;
    // the key that opened the pause menu must not also count as 'back' inside it
    if (inp.wasPressed('pause')) { this.paused = true; inp.clearMenu(); this.menus.openPause(); this.audio.duck(0.4, 0.2); return; }
    w.hud.fullMap = inp.isDown('map');
    if (!w.inputLocked() && !w.player.dead) {
      if (inp.wasPressed('bomb')) placeBomb(w);
      if (inp.wasPressed('active')) this.useActive(false);
      if (inp.wasPressed('consumable')) this.useConsumable();
      if (inp.wasPressed('swap') && w.player.consumables.length > 1) { w.player.consumables.push(w.player.consumables.shift()!); this.audio.play('pageGet', { vol: 0.4 }); }
      if (inp.isDown('drop')) { this.dropHold += dt; if (this.dropHold > 0.8 && w.player.charms.length) { this.dropCharm(); this.dropHold = -99; } } else this.dropHold = 0;
    }
    snapshotWorld(w);
    w.update(dt);
  }

  private render(dt: number): void {
    const r = this.r;
    if (this.scene === 'run' && this.world) {
      // blend between the last two 60 Hz simulation steps for smooth high refresh-rate output
      const alpha = this.paused || this.save.data.settings.interpolate === false ? 1 : Math.min(1, this.acc / FIXED_DT);
      applyInterp(this.world, alpha);
      try { this.world.render(); } finally { restoreInterp(); }
      r.shakeX = 0; r.shakeY = 0;
      r.present();
      const ui = r.uiBegin();
      this.world.hud.render(ui);
      if (this.paused) this.menus.renderPause(ui);
    } else {
      this.menus.renderBackground(dt);
      r.present();
      const ui = r.uiBegin();
      this.menus.render(ui);
    }
    const ui = r.uiBegin();
    if (this.fadeA > 0) { ui.fillStyle = `rgba(4,2,6,${this.fadeA.toFixed(3)})`; ui.fillRect(-2, -2, VIEW_W + 4, VIEW_H + 4); }
    // achievement toasts
    this.unlockQueue.forEach((u, i) => {
      const a = Math.min(1, u.t * 5, (5.5 - u.t) * 2);
      ui.globalAlpha = Math.max(0, a);
      // bottom-left, above the charms (the bottom-right corner holds the item tracker): a torn slip of paper
      const W = 176, H = 30, tx = this.scene === 'run' ? 6 : VIEW_W - W - 6, ty = VIEW_H - (this.scene === 'run' ? 64 : 44) - i * (H + 4) + (1 - Math.min(1, u.t * 4)) * 8;
      ui.fillStyle = 'rgba(0,0,0,0.4)'; ui.fillRect(tx + 2, ty + 2, W, H);
      ui.fillStyle = u.big ? '#efe2c0' : '#e2d6b8'; ui.fillRect(tx, ty, W, H);
      ui.fillStyle = u.big ? '#a02a2a' : '#8a6a3a'; ui.fillRect(tx, ty, 3, H);
      text(ui, u.big ? 'A NEW READER' : 'UNLOCKED', tx + 8, ty + 8, 5.5, u.big ? '#a02a2a' : '#7a5a2a', 'left', FONT_BODY, 700, false);
      text(ui, u.name, tx + 8, ty + 17, 8.5, '#2a1e18', 'left', FONT_TITLE, 400, false);
      text(ui, u.reward.length > 46 ? u.reward.slice(0, 45) + '…' : u.reward, tx + 8, ty + 26, 6, '#5a4636', 'left', FONT_BODY, 600, false);
      ui.globalAlpha = 1;
    });
    if (this.save.data.settings.showFps) text(ui, `${Math.round(this.fps)} fps`, 4, VIEW_H - 4, 6, COL.dim);
  }

  // ---------------------------------------------------------------- run lifecycle
  newRun(charId: string, seed?: string, challenge: string | null = null, mode: RunMode = 'normal'): void {
    const s = seed ? normalizeSeed(seed) : randomSeed();
    const run = new Run(s.length ? s : randomSeed(), charId, (id) => this.save.isUnlocked(id));
    run.challenge = challenge; run.mode = mode;
    if (mode === 'daily') this.save.unlock('daily_first');
    const ch = charById(charId);
    const met = (this.save.data.readersMet ??= []); if (!met.includes(charId)) { met.push(charId); this.save.markDirty(); }
    const pl = new Player(ch);
    const h = new Health();
    h.noRed = !!ch.health.noRed;
    h.redMax = ch.health.red * 2; h.red = ch.health.red * 2;
    if (ch.health.wax) h.addExtra('wax', ch.health.wax);
    if (ch.health.ink) h.addExtra('ink', ch.health.ink);
    if (ch.health.brass) h.addBrass(ch.health.brass);
    if (challenge === 'glass') { h.redMax = 2; h.red = 2; h.extra = []; }
    pl.health = h;
    pl.buttons = ch.buttons; pl.keys = ch.keys; pl.bombs = ch.bombs;
    this.world = new World(this, run, pl);
    for (const id of ch.items) flow.grantItem(this.world, id, true);
    if (challenge) for (const id of challengeItems(challenge)) flow.grantItem(this.world, id, true);
    if (challenge === 'swarm') pl.temp.push({ id: 'swarm_rule', stats: { damageMult: 0.5 } });
    pl.recompute();
    this.save.data.lastSeed = run.seed;
    this.save.stat('runs', 1);
    this.menus.stack = [];
    this.scene = 'run'; this.paused = false;
    this.world.startFloor();
  }

  private lastAutosave = 0;
  /** Save the run (throttled) — called on every room change so progress is never lost. */
  autosave(): void {
    const now = performance.now();
    if (now - this.lastAutosave < 1500) return;
    this.lastAutosave = now;
    this.saveSnapshot(); this.save.flush();
  }
  /** Serialise the run, including the current floor's state, so Continue resumes in the same room. */
  saveSnapshot(): void {
    const w = this.world; if (!w) return;
    const pl = w.player;
    this.save.data.run = {
      seed: w.run.seed, charId: w.run.charId, floor: w.run.floorIndex, challenge: w.run.challenge, mode: w.run.mode,
      health: pl.health.serialize(), buttons: pl.buttons, keys: pl.keys, bombs: pl.bombs, goldKey: pl.goldKey, goldBomb: pl.goldBomb,
      items: [...pl.items.entries()], order: pl.itemOrder, active: pl.active, charge: pl.charge, consumables: pl.consumables, charms: pl.charms,
      consumableSlots: pl.consumableSlots, charmSlots: pl.charmSlots, temp: pl.temp.filter((t) => !t.room && t.time === undefined),   // effects for the rest of the floor carry over
      transformations: [...pl.transformations], pools: w.run.pools.serialize(), stats: w.run.stats, flags: w.run.flags, identified: [...w.run.identified],
      floorState: flow.serializeFloor(w), savedAt: Date.now(),
    };
    this.save.markDirty();
  }
  continueRun(): boolean {
    const s = this.save.data.run; if (!s) return false;
    try {
      const run = new Run(s.seed, s.charId, (id) => this.save.isUnlocked(id));
      run.challenge = s.challenge; run.mode = s.mode ?? 'normal'; run.floorIndex = s.floor; run.pools.restore(s.pools ?? []);
      run.stats = s.stats; run.flags = s.flags; run.identified = new Set(s.identified ?? []);
      const pl = new Player(charById(s.charId));
      pl.health = Health.from(s.health);
      pl.buttons = s.buttons; pl.keys = s.keys; pl.bombs = s.bombs; pl.goldKey = s.goldKey; pl.goldBomb = false;
      pl.items = new Map(s.items); pl.itemOrder = s.order; pl.active = s.active; pl.charge = s.charge;
      pl.consumables = s.consumables; pl.charms = s.charms; pl.consumableSlots = s.consumableSlots; pl.charmSlots = s.charmSlots;
      pl.temp = s.temp ?? []; pl.transformations = new Set(s.transformations ?? []);
      pl.recompute();
      this.world = new World(this, run, pl);
      this.world.syncFamiliars();
      this.menus.stack = [];   // the main menu must not linger under the pause menu
      this.scene = 'run'; this.paused = false;
      if (s.floorState && s.floorState.floor === s.floor) flow.restoreFloor(this.world, s.floorState);
      else this.world.startFloor();
      return true;
    } catch (e) { console.error('continue failed', e); this.save.data.run = null; return false; }
  }
  quitToMenu(): void {
    this.paused = false;
    this.scene = 'menu';
    this.world = null;
    this.menus.openMain();
    this.audio.setMusic('menu');
  }
  onPlayerDeath(): void {
    if (this.scene !== 'run' || !this.world) return;
    this.save.stat('deaths', 1);
    this.save.data.run = null; this.save.markDirty();
    // leave an echo where you fell (not in challenges or the Daily Run; the Binding's echo waits a chapter earlier)
    const wr = this.world.run, wp = this.world.player;
    if (!wr.challenge && wr.mode !== 'daily' && wr.floorIndex >= 1) {
      const items = wp.itemOrder.filter((id) => (wp.items.get(id) ?? 0) > 0 && !getItem(id)?.tags?.includes('quest') && getItem(id)?.kind !== 'active');
      this.save.data.echo = { char: wr.charId, floor: Math.min(wr.floorIndex, 6), items, cause: wr.stats.deathCause ?? 'something in the dark', chapter: this.world.floor.theme.name };
    }
    if ((this.save.data.stats.deaths ?? 0) >= 1) this.save.unlock('first_death');
    this.world.run.flags.score = recordScore(this.save, this.world.run, false);
    checkProgress(this.world);
    this.scene = 'dead';
    this.menus.openDeath(this.world);
    this.audio.setMusic('death');
  }
  /** Count the Binding as beaten (endless runs credit the win and keep going). */
  creditWin(): void {
    const w = this.world; if (!w || w.run.flags.credited) return;
    w.run.flags.credited = true; w.run.won = true;
    if (!w.run.challenge) { this.save.stat('wins', 1); this.save.unlock('beat_final'); }
    if (w.run.charId !== 'marcus' && !w.run.challenge) this.save.unlock('win_' + w.run.charId);
    if (!w.run.challenge) this.save.addMark(w.run.charId, 'morning', false);
  }
  onVictory(): void {
    const w = this.world; if (!w) return;
    w.run.won = true;
    if (!w.run.challenge && !w.run.flags.credited) { this.save.stat('wins', 1); this.save.unlock('beat_final'); }
    if (w.run.charId !== 'marcus' && !w.run.challenge) this.save.unlock('win_' + w.run.charId);
    if (w.player.transformations.has('moth') && !w.run.challenge) this.save.unlock('unlock_wick');
    if (w.run.challenge) { if (!this.save.data.challengesDone.includes(w.run.challenge)) this.save.data.challengesDone.push(w.run.challenge); this.save.unlock('ch_' + w.run.challenge); }
    const t = w.run.stats.time;
    if (!this.save.data.bestTime || t < this.save.data.bestTime) this.save.data.bestTime = t;
    if (t < 25 * 60) this.save.unlock('speedrun');
    if (w.run.mode === 'hard' && !w.run.challenge) this.save.unlock('win_hard');
    // which ending this was; the first time each is seen is remembered
    const ending = endingFor(w.run);
    w.run.flags.ending = ending;
    w.run.flags.newEnding = this.save.seeEnding(ending);
    if (!w.run.challenge) this.save.addMark(w.run.charId, ending, w.run.mode === 'hard');
    if (ending === 'the_visit' && w.player.has('grandmothers_ring') && !w.run.challenge) this.save.unlock('unlock_ada');
    if (ending === 'goodnight') this.save.unlock('the_end');
    w.run.flags.score = recordScore(this.save, w.run, true);
    this.save.data.run = null; this.save.markDirty();
    this.fadeTo(() => { this.scene = 'ending'; this.menus.openEnding(w); this.audio.setMusic('ending'); }, 1.2);
  }

  fadeTo(cb: () => void, dur = 0.5): void { this.fading = true; this.fadeT = 0; this.fadeDur = dur; this.fadeCb = cb; }

  snapshotWorld(): HTMLCanvasElement {
    const W = this.r.world.width, H = this.r.world.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d')!;
    x.drawImage(this.r.world, 0, 0);
    x.globalCompositeOperation = 'lighter'; x.drawImage(this.r.glow, 0, 0, W, H);
    x.globalCompositeOperation = 'source-over'; x.drawImage(this.r.light, 0, 0, W, H);
    return c;
  }

  teleport(id: number): void {
    const w = this.world; if (!w) return;
    if (!w.room.cleared && w.lockdown) { w.hud.toast('Something holds you here.'); return; }
    w.room.cleared = w.room.cleared || w.aliveEnemies() === 0;
    this.audio.play('teleport');
    w.whiteFlash = 0.8;
    w.enterRoom(id, null, false);
    const c = w.room.center(); w.player.x = c.x; w.player.y = c.y + 10;
    w.snapCamera();
  }

  useActive(free: boolean): void {
    const w = this.world; if (!w) return;
    const pl = w.player;
    if (!pl.active) return;
    const it = getItem(pl.active);
    if (!it?.active) return;
    if (!free && pl.charge < it.active.charge) { this.audio.play('deny', { vol: 0.4 }); return; }
    const res = it.active.use(w);
    if (res === false) return;
    if (!free) pl.charge = 0;
    pl.activeRoomUses++;
    this.audio.play('activeUse');
    w.itemHook('onActiveUse');
    this.save.stat('activesUsed', 1);
    if (it.active.single && !free) { pl.active = null; }
  }
  fullCharge(): void { if (this.world) flow.fullCharge(this.world); }

  useConsumable(): void {
    const w = this.world; if (!w) return;
    const pl = w.player;
    const c = pl.consumables.shift(); if (!c) return;
    if (c.kind === 'page') {
      const d = getConsumable(c.id);
      w.hud.banner(d?.name ?? 'Page', d?.effect[0] ?? '');
      this.audio.play('pageUse');
      d?.use?.(w);
      this.save.stat('pagesUsed', 1);
    } else {
      const eff = SWEET_EFFECTS[w.run.sweetMap[Number(c.id) % 12]];
      w.run.identified.add(eff.id);
      w.hud.banner(eff.name, eff.desc);
      this.audio.play(eff.good ? 'sweetGood' : 'sweetBad');
      eff.use(w);
      pl.happyT = eff.good ? 0.8 : 0; if (!eff.good) pl.hurtT = 0.3;
      this.save.stat('sweetsEaten', 1);
    }
  }
  dropCharm(): void {
    const w = this.world; if (!w) return;
    const id = w.player.charms.shift(); if (!id) return;
    const p = spawnDrop(w, 'charm', w.player.x, w.player.y); p.data = { id }; p.noCollect = 1.5;
    w.player.recompute();
  }
}

function challengeItems(ch: string): string[] {
  switch (ch) {
    case 'glass': return ['burning_glass'];
    case 'swarm': return ['moth_jar', 'paper_bird', 'lantern_wisp'];
    case 'ink': return ['inkwell_heart', 'split_nib'];
    default: return [];
  }
}

import { SynthAudio } from '../audio/synth';
import { attachDebug } from './debug';
function createAudio(): AudioEngine { try { return new SynthAudio(); } catch { return new AudioEngine(); } }

export function startGame(cv: HTMLCanvasElement, params: URLSearchParams): Game {
  const g = new Game(cv);
  (window as any).__bom = g;
  attachDebug(g);
  g.start();
  if (params.has('play')) g.newRun(params.get('char') || 'marcus', params.get('seed') || undefined);
  else if (params.has('menu')) g.menus.openMain();
  else g.menus.openSplash();
  return g;
}
