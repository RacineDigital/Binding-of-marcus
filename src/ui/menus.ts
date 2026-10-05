// Front-end and overlay menus. Keyboard and controller navigable; drawn crisp over an animated scene.
import { latestNews } from './whatsnew';
import { GAME_VERSION } from '../core/constants';
import { errorCount, shareErrorLog } from '../core/errorlog';
import type { Game } from '../game/game';
import type { World } from '../game/world';
import { MenuKey, ACTION_ORDER, ACTION_LABELS, keyLabel, DEFAULT_BINDINGS, Action, bindLabel } from '../core/input';
import { text, COL, FONT_TITLE, FONT_BODY, wrap, measure, heading, panel } from './draw';
import { VIEW_W, VIEW_H } from '../core/constants';
import { CHARACTERS, CharacterDef } from '../player/characters';
import { buildPlayerSprites, PlayerSprites } from '../art/marcus';
import { costumeFor, drawCostume, type Frame } from '../art/costume';
import { LOOKS } from '../art/look';
import { ALL_ITEMS, getItem, CONSUMABLES } from '../items/registry';
import { itemIconCanvas } from '../art/items';
import { describeItem } from '../items/describe';
import { ACHIEVEMENTS, CHALLENGES } from '../data/achievements';
import { formatSeed, normalizeSeed, RNG } from '../core/rng';
import { dailySeed, todayKey, runScore, RunMode, MODE_NAMES } from '../game/progress';
import { INTRO_STORY } from '../data/lore';
import { ENDINGS, ENDING_BY_ID, EPILOGUES, EndingId } from '../data/endings';
import { NOTES, NoteDef } from '../data/notes';
import { poolInfo } from '../items/homes';
import { ITEM_LORE } from '../data/itemlore';
import { roman } from '../data/floors';
import { themeAt } from '../generation/floorgen';
import { ease, clamp, TAU } from '../core/math';
import { pickupSprites } from '../art/pickups';
import { renderMenuScene, mainMenuScreen, profilesScreen } from './mainmenu';
import { splashScreen } from './splash';
import { ALL_ENEMY_DEFS } from '../enemies/registry';
import { getSprites, EnemyDef } from '../enemies/enemy';
import type { Sprite } from '../render/sprite';
import { TRANSFORM_EFFECTS } from '../player/player';
import { drawPaper, wornFrame } from './paper';
import { isFullscreen, setFullscreen } from '../core/fullscreen';
import { doorSymbol } from '../art/roomicons';

export interface Screen {
  update(keys: MenuKey[], dt: number): void; render(ctx: CanvasRenderingContext2D): void; t: number; overlay?: boolean;
  /** Optional mouse support: hover / click / wheel in virtual coordinates. */
  pointer?(x: number, y: number, click: boolean, moved: boolean, wheel: number): void;
}

const INK = '#2a1e18', INK2 = '#5a4636', PAPER = '#e6dabd';

/** An old, handled page: torn, scorched, foxed and creased (painted once, then cached). */
function page(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 1, seed = 3): void {
  ctx.save(); ctx.globalAlpha *= a;
  drawPaper(ctx, x, y, w, h, seed, PAPER);
  wornFrame(ctx, x, y, w, h, seed);
  // a ribbon bookmark hanging over the top edge
  const bx = x + w - 30, bl = 11 + (seed % 3) * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(bx + 1, y - 2, 7, bl);
  const rg = ctx.createLinearGradient(bx, 0, bx + 7, 0); rg.addColorStop(0, '#6e1420'); rg.addColorStop(0.5, '#9a2232'); rg.addColorStop(1, '#5a0e18');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(bx, y - 3); ctx.lineTo(bx + 7, y - 3); ctx.lineTo(bx + 7, y + bl); ctx.lineTo(bx + 3.5, y + bl - 3.5); ctx.lineTo(bx, y + bl); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,200,0.15)'; ctx.fillRect(bx + 1, y - 3, 0.6, bl - 2);
  ctx.restore();
}
function inkBlot(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, color = 'rgba(30,24,60,0.85)'): void {
  ctx.save(); ctx.fillStyle = color;
  ctx.beginPath();
  const n = 18;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const wob = 1 + Math.sin(a * 3 + t * 2) * 0.06 + Math.sin(a * 5 - t * 1.3) * 0.04;
    const px = x + Math.cos(a) * w * 0.5 * wob, py = y + Math.sin(a) * h * 0.5 * wob;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.fill(); ctx.restore();
}
/** Key labels drawn as little keycaps, right-aligned at rx. */
function keycaps(ctx: CanvasRenderingContext2D, labels: string[], rx: number, y: number): void {
  let x = rx;
  for (let i = labels.length - 1; i >= 0; i--) {
    const w = Math.max(9, measure(ctx, labels[i], 6.5) + 6);
    x -= w;
    ctx.fillStyle = 'rgba(60,40,24,0.22)'; ctx.beginPath(); ctx.roundRect(x, y - 7.2, w, 9.5, 1.8); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,232,0.75)'; ctx.beginPath(); ctx.roundRect(x, y - 8, w, 9, 1.8); ctx.fill();
    ctx.strokeStyle = 'rgba(70,45,25,0.55)'; ctx.lineWidth = 0.5; ctx.stroke();
    text(ctx, labels[i], x + w / 2, y - 1.3, 6.5, INK, 'center', FONT_BODY, 600, false);
    x -= 3;
  }
}
/** Control hints in a small dark pill along the bottom edge. */
function hint(ctx: CanvasRenderingContext2D, s: string): void {
  const w = measure(ctx, s, 6.5) + 16, h = 10, x = VIEW_W / 2 - w / 2, y = VIEW_H - 15;
  ctx.save();
  ctx.fillStyle = 'rgba(12,8,10,0.82)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
  ctx.strokeStyle = 'rgba(201,164,106,0.35)'; ctx.lineWidth = 0.5; ctx.stroke();
  ctx.restore();
  text(ctx, s, VIEW_W / 2, y + 7.4, 6.5, 'rgba(230,215,195,0.85)', 'center', FONT_BODY, 600, false);
}
/** An open book: a worn leather cover, two foxed pages and a sewn spine. The in-game menus are pages of it. */
function book(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const hw = Math.round(w / 2);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 3, y + 4, w + 12, h + 6);
  ctx.fillStyle = '#3a1c16'; ctx.fillRect(x - 6, y - 4, w + 12, h + 8);
  ctx.fillStyle = '#4e261c'; ctx.fillRect(x - 6, y - 4, w + 12, 2); ctx.fillStyle = '#24100c'; ctx.fillRect(x - 6, y + h + 2, w + 12, 2);
  for (const [cx, cy] of [[x - 6, y - 4], [x + w + 2, y - 4], [x - 6, y + h], [x + w + 2, y + h]]) { ctx.fillStyle = '#8a6a3a'; ctx.fillRect(cx, cy, 4, 4); }
  ctx.restore();
  drawPaper(ctx, x, y, hw, h, seed, PAPER); wornFrame(ctx, x, y, hw, h, seed);
  drawPaper(ctx, x + hw, y, w - hw, h, seed + 7, PAPER); wornFrame(ctx, x + hw, y, w - hw, h, seed + 7);
  // the gutter: pages curve down into the spine, held by the binder's thread
  const gr = ctx.createLinearGradient(x + hw - 18, 0, x + hw + 18, 0);
  gr.addColorStop(0, 'rgba(60,36,20,0)'); gr.addColorStop(0.45, 'rgba(60,36,20,0.32)'); gr.addColorStop(0.5, 'rgba(30,16,8,0.5)'); gr.addColorStop(0.55, 'rgba(60,36,20,0.32)'); gr.addColorStop(1, 'rgba(60,36,20,0)');
  ctx.fillStyle = gr; ctx.fillRect(x + hw - 18, y, 36, h);
  ctx.fillStyle = 'rgba(150,40,40,0.65)';
  for (let sy = y + 14; sy < y + h - 10; sy += 22) ctx.fillRect(x + hw - 0.5, sy, 1, 7);
}
/** What a run unlocked, listed on its last page (so nothing earned slips past behind a toast). */
function unlockedThisRun(ctx: CanvasRenderingContext2D, ids: string[] | undefined, cx: number, y: number, head = '#8a2a2a', body = INK2): void {
  const got = (ids ?? []).map((id) => ACHIEVEMENTS.find((a) => a.id === id)).filter((a) => !!a);
  if (!got.length) return;
  text(ctx, got.length === 1 ? 'Unlocked this run' : `Unlocked this run (${got.length})`, cx, y, 7, head, 'center', FONT_BODY, 700, false);
  got.slice(0, 2).forEach((a, i) => { const s = a!.unlocks; text(ctx, s.length > 40 ? s.slice(0, 39) + '…' : s, cx, y + 9 + i * 8, 6.5, body, 'center', FONT_BODY, 600, false); });
  if (got.length > 2) text(ctx, `and ${got.length - 2} more in the Journal`, cx, y + 25, 6, body, 'center', FONT_BODY, 600, false);
}
/** A ledger line: label on the left, value on the right, a dotted leader between. */
function ledgerRow(ctx: CanvasRenderingContext2D, k: string, v: string, x0: number, x1: number, y: number): void {
  text(ctx, k, x0, y, 7.5, INK2, 'left', FONT_BODY, 600, false);
  text(ctx, v, x1, y, 7.5, INK, 'right', FONT_BODY, 700, false);
  const a = x0 + measure(ctx, k, 7.5) + 4, b = x1 - measure(ctx, v, 7.5, FONT_BODY, 700) - 4;
  ctx.fillStyle = 'rgba(90,60,40,0.4)'; for (let x = a; x < b; x += 3) ctx.fillRect(x, y - 0.5, 1, 0.6);
}
function fmtTime(sec: number): string { const m = Math.floor(sec / 60), s = Math.floor(sec % 60); return `${m}:${String(s).padStart(2, '0')}`; }

export class MenuSystem {
  g: Game;
  stack: Screen[] = [];

  time = 0;
  portraits = new Map<string, PlayerSprites>();
  moths: { a: number; r: number; s: number; y: number }[] = [];
  pauseScreen: Screen | null = null;
  constructor(g: Game) {
    this.g = g;
    for (let i = 0; i < 4; i++) this.moths.push({ a: Math.random() * TAU, r: 20 + Math.random() * 25, s: 0.8 + Math.random() * 1.2, y: Math.random() * 10 });
  }
  sprites(c: CharacterDef): PlayerSprites { let s = this.portraits.get(c.id); if (!s) { s = buildPlayerSprites(LOOKS[c.look]); this.portraits.set(c.id, s); } return s; }
  push(s: Screen): void { this.stack.push(s); this.g.input.clearMenu(); }
  pop(): void { this.stack.pop(); this.g.audio.play('pageGet', { vol: 0.4 }); }
  top(): Screen | undefined { return this.stack[this.stack.length - 1]; }
  sfxMove(): void { this.g.audio.play('coinDrop', { vol: 0.6, pitch: 1.4 }); }
  sfxOk(): void { this.g.audio.play('pageUse', { vol: 0.35 }); }

  update(dt: number): void {
    this.time += dt;
    let keys = this.g.input.takeMenu();
    if (this.pauseGuard > 0) { this.pauseGuard -= dt; keys = []; }
    const s = this.top() ?? (this.g.paused ? this.pauseScreen ?? undefined : undefined); if (!s) return;
    s.t += dt;
    const m = this.g.input.takeMouse();
    if (s.pointer && (m.moved || m.clicked || m.wheel) && this.pauseGuard <= 0) s.pointer(m.x, m.y, m.clicked, m.moved, m.wheel);
    if (this.top() !== s && this.top()) return; // a click opened another screen
    s.update(keys, dt);
  }

  // ------------------------------------------------------------ background scene
  renderBackground(dt: number): void { renderMenuScene(this, dt); }

  render(ctx: CanvasRenderingContext2D): void {
    const s = this.top();
    if (!s) return;
    // render the lowest non-overlay first if the top is an overlay
    if (s.overlay && !this.g.paused) { const below = this.stack[this.stack.length - 2]; if (below) below.render(ctx); }
    s.render(ctx);
  }

  // ------------------------------------------------------------ openers
  openMain(): void {
    this.stack = [];
    if (!this.g.save.data.introSeen) { this.push(this.introScreen()); return; }
    this.push(mainMenuScreen(this));
    // after an update, a returning player gets the new notes once (a brand new player doesn't need them)
    const st = this.g.save.data.settings;
    if (st.seenVersion !== GAME_VERSION) {
      if ((this.g.save.data.stats.runs ?? 0) > 0 && latestNews().blocks.length) this.push(this.whatsNewScreen());
      else { st.seenVersion = GAME_VERSION; this.g.save.markDirty(); }
    }
    this.g.audio.setMusic('menu');
    this.g.audio.prepareMusic('cellar'); this.g.audio.prepareMusic('boss');
  }
  /** Studio splash on launch, then the title. */
  openSplash(): void { this.stack = [splashScreen(this, () => this.openMain())]; }
  openPause(): void { this.pauseScreen = this.pauseMenu(); this.pauseGuard = 0.2; }
  private pauseGuard = 0;
  inSubmenu(): boolean { return this.stack.length > 0; }
  pauseGuarded(): boolean { return this.pauseGuard > 0; }
  renderPause(ctx: CanvasRenderingContext2D): void { this.pauseScreen?.render(ctx); if (this.stack.length) this.top()!.render(ctx); }
  openDeath(w: World): void { this.stack = [this.deathScreen(w)]; }
  openEnding(w: World): void { this.stack = [this.endingScreen(w)]; }

  // ------------------------------------------------------------ intro
  introScreen(): Screen {
    const self = this;
    return {
      t: 0,
      update(keys) {
        if (keys.includes('confirm') || keys.includes('back') || this.t > INTRO_STORY.length * 3.2 + 2) {
          self.g.save.data.introSeen = true; self.g.save.markDirty();
          self.stack = []; self.push(mainMenuScreen(self)); self.g.audio.setMusic('menu');
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.82)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        INTRO_STORY.forEach((line, i) => {
          const a = clamp((this.t - i * 3.0) * 1.2, 0, 1);
          ctx.globalAlpha = a;
          text(ctx, line, VIEW_W / 2, 80 + i * 22, 10, '#e6d6bc', 'center', FONT_BODY, 400);
        });
        ctx.globalAlpha = 1;
        hint(ctx, 'Press any key to continue');
      },
    };
  }

  // ------------------------------------------------------------ main
  mainScreen(): Screen {
    const self = this, g = this.g;
    const items = ['CONTINUE', 'NEW RUN', 'DAILY RUN', 'CHALLENGES', 'CHARACTERS', 'COLLECTION', 'STATISTICS', 'OPTIONS', 'CREDITS'];
    let sel = g.save.data.run ? 0 : 1;
    const enabled = (i: number) => i !== 0 || !!g.save.data.run;
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'up' || k === 'down') { do { sel = (sel + (k === 'up' ? -1 : 1) + items.length) % items.length; } while (!enabled(sel)); self.sfxMove(); }
          if (k === 'confirm') {
            self.sfxOk();
            switch (sel) {
              case 0: g.fadeTo(() => { if (!g.continueRun()) self.openMain(); }, 0.4); break;
              case 1: self.push(self.newRunScreen()); break;
              case 2: self.push(self.dailyScreen()); break;
              case 3: self.push(self.challengesScreen()); break;
              case 4: self.push(self.charactersScreen()); break;
              case 5: self.push(self.collectionScreen()); break;
              case 6: self.push(self.statsScreen()); break;
              case 7: self.push(self.optionsScreen()); break;
              case 8: self.push(self.creditsScreen()); break;
            }
          }
        }
      },
      render(ctx) {
        const a = ease.outCubic(clamp(this.t * 1.5, 0, 1));
        ctx.globalAlpha = a;
        // title
        const ty = 54;
        inkBlot(ctx, 128, ty - 10, 230, 46, self.time, 'rgba(8,4,12,0.55)');
        text(ctx, 'Lost', 40, ty - 4, 30, '#efe2c8', 'left', FONT_TITLE, 400);
        text(ctx, 'Marcus', 90, ty + 20, 24, '#c8a878', 'left', FONT_TITLE, 400);
        // drips from the title
        ctx.fillStyle = '#efe2c8';
        for (const [x, l] of [[52, 6], [96, 9], [141, 4], [176, 7]] as [number, number][]) { const len = l + Math.sin(self.time * 1.3 + x) * 2; ctx.fillRect(x, ty + 1, 1.2, len); ctx.beginPath(); ctx.arc(x + 0.6, ty + 1 + len, 1.3, 0, TAU); ctx.fill(); }
        items.forEach((it, i) => {
          const y = 96 + i * 15.5;
          const on = i === sel, en = enabled(i);
          if (on) inkBlot(ctx, 92, y - 3.5, 118 + Math.sin(self.time * 4) * 2, 14, self.time);
          const x = 44 + (on ? 6 : 0);
          text(ctx, it, x, y, on ? 11 : 9.5, !en ? 'rgba(160,150,140,0.35)' : on ? '#fff4dc' : '#b8a890', 'left', FONT_TITLE, 400);
          if (on) { const ms = self.sprites(CHARACTERS[0]); ctx.drawImage(ms.head.side.normal.canvas, x - 22, y - 13); }
        });
        if (g.save.data.run && sel === 0) {
          const r = g.save.data.run;
          text(ctx, `${CHARACTERS.find((c) => c.id === r.charId)?.name ?? ''} · ${themeAt(r.seed, r.floor).name} · Seed ${formatSeed(r.seed)}${r.mode === 'hard' ? ' · Hard' : r.mode === 'daily' ? ' · Daily' : ''}`, 44, 96 + 9 * 15.5 + 2, 7, COL.dim);
        }
        ctx.globalAlpha = 1;
        hint(ctx, `${g.input.usingPad ? 'D-pad' : 'Arrows / WASD'} to choose  ·  ${g.input.usingPad ? 'A' : 'Enter'} to select`);
        text(ctx, 'v2.0', VIEW_W - 6, VIEW_H - 6, 6, 'rgba(200,190,170,0.4)', 'right');
      },
    };
  }

  // ------------------------------------------------------------ daily run
  dailyScreen(): Screen {
    const self = this, g = this.g;
    const seed = dailySeed(), day = todayKey();
    const pool = CHARACTERS.filter((c) => !c.unlock || g.save.isUnlocked(c.unlock));
    const ch = pool[new RNG(seed + ':char').int(0, pool.length - 1)];
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'confirm') { g.audio.play('itemGet', { vol: 0.5 }); g.fadeTo(() => { self.stack = []; g.newRun(ch.id, seed, null, 'daily'); }, 0.5); }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 70, 26, 340, 212, 1, 17);
        heading(ctx, 'Daily Run', 240, 56, 14, INK);
        text(ctx, day, 240, 70, 8.5, INK2, 'center', FONT_BODY, 600, false);
        const sp = self.sprites(ch);
        ctx.save(); ctx.translate(150, 170); ctx.scale(3.5, 3.5);
        drawReader(ctx, sp, ch, self.time);
        ctx.restore();
        const S = g.save.data.stats;
        const rows: [string, string][] = [['Reader', ch.name], ['Seed', formatSeed(seed)], ['Today\'s best', S['best_daily_' + day] ? String(S['best_daily_' + day]) : '—'], ['Best ever (Normal)', S.best_normal ? String(S.best_normal) : '—']];
        rows.forEach(([k, v], i) => { text(ctx, k, 230, 104 + i * 16, 8.5, INK2, 'left', FONT_BODY, 600, false); text(ctx, v, 380, 104 + i * 16, 9, INK, 'right', FONT_TITLE, 400, false); });
        text(ctx, 'Everyone gets the same floors, items and bosses today.', 240, 186, 7, INK2, 'center', FONT_BODY, 600, false);
        inkBlot(ctx, 240, 208, 90, 14, self.time, 'rgba(40,30,60,0.2)');
        text(ctx, 'Begin', 240, 212, 11, INK, 'center', FONT_TITLE, 400, false);
        hint(ctx, 'Enter to begin · Esc back');
      },
    };
  }

  // ------------------------------------------------------------ new run
  newRunScreen(challenge: string | null = null, forceChar?: string, presetSeed?: string): Screen {
    const self = this, g = this.g;
    let ci = forceChar ? CHARACTERS.findIndex((c) => c.id === forceChar) : 0;
    let row = 0; // 0 = character, 1 = mode, 2 = seed, 3 = start
    let seed = presetSeed ?? ''; let editing = false;
    // Hard and Endless open up after the first win
    const modes: RunMode[] = g.save.isUnlocked('beat_final') && !challenge ? ['normal', 'hard', 'endless'] : ['normal'];
    const hardOpen = modes.length > 1;
    let mi = 0;
    const MODE_DESC: Partial<Record<RunMode, string>> = {
      hard: 'Tougher enemies, harsher hits, more champions; better treasure. Score x1.5.',
      endless: 'After the Binding the story keeps going: chapters loop, harder each time.',
    };
    const unlocked = (c: CharacterDef) => !c.unlock || g.save.isUnlocked(c.unlock);
    const scr: Screen = {
      t: 0,
      update(keys) {
        if (editing) return;
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'up') { row = (row + 3) % 4; if (row === 1 && !hardOpen) row = 0; self.sfxMove(); }
          if (k === 'down') { row = (row + 1) % 4; if (row === 1 && !hardOpen) row = 2; self.sfxMove(); }
          if ((k === 'left' || k === 'right') && row === 0 && !forceChar) {
            // the mirrored only join the line-up once they're unlocked
            do ci = (ci + (k === 'left' ? -1 : 1) + CHARACTERS.length) % CHARACTERS.length; while (CHARACTERS[ci].tainted && !unlocked(CHARACTERS[ci]));
            self.sfxMove();
          }
          if ((k === 'left' || k === 'right' || k === 'confirm') && row === 1) { mi = (mi + (k === 'left' ? modes.length - 1 : 1)) % modes.length; self.sfxMove(); continue; }
          if (k === 'confirm') {
            if (row === 2) {
              editing = true; g.input.textCapture = (key) => {
                if (key === 'Enter' || key === 'Escape') { editing = false; g.input.textCapture = null; g.input.clearMenu(); return; }
                if (key === 'Backspace') seed = seed.slice(0, -1);
                else if (/^[a-zA-Z0-9]$/.test(key) && seed.length < 8) seed = normalizeSeed(seed + key);
              };
              continue;
            }
            const c = CHARACTERS[ci];
            if (!unlocked(c)) { g.audio.play('deny'); continue; }
            g.audio.play('itemGet', { vol: 0.5 });
            g.fadeTo(() => { self.stack = []; g.newRun(c.id, seed.length === 8 ? seed : undefined, challenge, modes[mi]); }, 0.5);
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        const c = CHARACTERS[ci];
        const un = unlocked(c);
        page(ctx, 40, 22, 400, 220, 1, ci + 2);
        text(ctx, challenge ? 'Challenge: ' + (CHALLENGES.find((x) => x.id === challenge)?.name ?? '') : 'Choose your reader', 240, 40, 9, INK2, 'center', FONT_BODY, 600, false);
        // portrait
        const sp = self.sprites(c);
        ctx.save(); ctx.translate(110, 150); ctx.scale(4, 4);
        ctx.fillStyle = 'rgba(60,40,30,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.5, 0, 0, TAU); ctx.fill();
        if (!un) ctx.filter = 'brightness(0)';
        drawReader(ctx, sp, c, self.time);
        ctx.restore();
        if (!forceChar) { text(ctx, '◀', 62, 112, 12, INK2, 'center', FONT_BODY, 600, false); text(ctx, '▶', 158, 112, 12, INK2, 'center', FONT_BODY, 600, false); }
        if (un) drawMarks(ctx, g, c.id, 110, 172);
        // info
        const x0 = 190;
        text(ctx, un ? c.name : '???', x0, 70, 20, INK, 'left', FONT_TITLE, 400, false);
        if (un && !(g.save.data.readersMet ?? []).includes(c.id)) text(ctx, 'NEW', x0 + measure(ctx, c.name, 20, FONT_TITLE, 400) + 6, 58, 7, '#a02a2a', 'left', FONT_BODY, 700, false);
        // a gold star once the story has been finished with this reader
        if (un && (c.id === 'marcus' ? g.save.isUnlocked('beat_final') : g.save.isUnlocked('win_' + c.id))) text(ctx, '★', x0 + measure(ctx, c.name, 20, FONT_TITLE, 400) + 6, 66, 12, '#c89a2a', 'left', FONT_BODY, 700, false);
        text(ctx, un ? c.title : 'Locked', x0, 82, 8, '#8a3a2a', 'left', FONT_BODY, 600, false);
        const lines = wrap(ctx, un ? c.desc : c.unlockHint, 7.5, 220);
        lines.forEach((l, i) => text(ctx, l, x0, 96 + i * 9, 7.5, INK2, 'left', FONT_BODY, 600, false));
        if (un) {
          const yb = 100 + lines.length * 9;
          const stats: [string, number, number][] = [['Damage', c.base.damage, 5], ['Fire rate', c.base.tears, 4.5], ['Speed', c.base.speed, 1.6], ['Range', c.base.range / 24, 12]];
          stats.forEach(([n, v, max], i) => {
            text(ctx, n, x0, yb + i * 9, 7, INK2, 'left', FONT_BODY, 600, false);
            ctx.fillStyle = 'rgba(60,40,30,0.2)'; ctx.fillRect(x0 + 40, yb + i * 9 - 5, 80, 4);
            ctx.fillStyle = '#6a2a22'; ctx.fillRect(x0 + 40, yb + i * 9 - 5, 80 * clamp(v / max, 0, 1), 4);
          });
          // health preview
          const H = pickupSprites().hud; let hx = x0;
          const hy = yb + 38;
          for (let i = 0; i < c.health.red; i++) { ctx.drawImage(H.red.canvas, hx, hy); hx += 11; }
          for (let i = 0; i < (c.health.wax ?? 0) / 2; i++) { ctx.drawImage(H.wax.canvas, hx, hy); hx += 11; }
          for (let i = 0; i < (c.health.ink ?? 0) / 2; i++) { ctx.drawImage(H.ink.canvas, hx, hy); hx += 11; }
          text(ctx, c.passive, x0, hy + 20, 7, '#4a3a6a', 'left', FONT_BODY, 600, false);
          // starting items, shown as their icons
          c.items.forEach((id, i) => { if (getItem(id)) ctx.drawImage(itemIconCanvas(id), x0 + 240 - (c.items.length - i) * 18, hy - 4, 16, 16); });
        }
        // seed & start
        const opts = [`Mode: ${MODE_NAMES[modes[mi]]}`, `Seed: ${editing ? seed + (Math.floor(self.time * 3) % 2 ? '_' : ' ') : seed.length === 8 ? formatSeed(seed) : 'Random'}`, 'Begin'];
        [1, 2, 3].forEach((r) => {
          const y = 192 + (r - 1) * 13;
          const on = row === r;
          if (on) inkBlot(ctx, 300, y - 3, 150, 12, self.time, 'rgba(40,30,60,0.2)');
          text(ctx, opts[r - 1], 300, y, on ? 9 : 8, r === 1 && !hardOpen ? 'rgba(90,70,54,0.5)' : on ? (r === 1 && modes[mi] !== 'normal' ? '#8a1a1a' : INK) : INK2, 'center', FONT_TITLE, 400, false);
        });
        if (row === 1 && MODE_DESC[modes[mi]]) text(ctx, MODE_DESC[modes[mi]]!, 300, 233, 6.5, '#8a2a2a', 'center', FONT_BODY, 600, false);
        if (row === 0) text(ctx, '— character —', 110, 192, 7, INK2, 'center', FONT_BODY, 600, false);
        hint(ctx, editing ? 'Type an 8-character seed · Enter to confirm' : '←/→ character · ↑/↓ options · Enter to begin · Esc back');
      },
    };
    return scr;
  }

  // ------------------------------------------------------------ challenges
  challengesScreen(): Screen {
    const self = this, g = this.g;
    let sel = 0;
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'up' || k === 'down') { sel = (sel + (k === 'up' ? -1 : 1) + CHALLENGES.length) % CHALLENGES.length; self.sfxMove(); }
          if (k === 'confirm') {
            const c = CHALLENGES[sel];
            if (c.unlock && !g.save.isUnlocked(c.unlock)) { g.audio.play('deny'); continue; }
            self.push(self.newRunScreen(c.id, c.char));
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 40, 20, 400, 228, 1, 7);
        heading(ctx, 'Challenges', 240, 44, 13, INK);
        CHALLENGES.forEach((c, i) => {
          const y = 70 + i * 32;
          const locked = c.unlock && !g.save.isUnlocked(c.unlock);
          const done = g.save.data.challengesDone.includes(c.id);
          if (i === sel) inkBlot(ctx, 240, y + 4, 360, 30, self.time, 'rgba(40,30,60,0.15)');
          text(ctx, (done ? '✓ ' : '') + (locked ? '???' : c.name), 70, y, 11, locked ? '#8a7a6a' : INK, 'left', FONT_TITLE, 400, false);
          text(ctx, locked ? 'Finish the story to unlock challenges.' : c.desc + ' — ' + c.rules.join(' · '), 70, y + 11, 7, INK2, 'left', FONT_BODY, 600, false);
        });
        hint(ctx, 'Enter to begin · Esc back');
      },
    };
  }

  // ------------------------------------------------------------ characters gallery
  charactersScreen(): Screen {
    const self = this, g = this.g;
    // two pages of five to a row: the readers, then (once the story is finished) the mirrored
    const PAGES = [CHARACTERS.filter((c) => !c.tainted), CHARACTERS.filter((c) => c.tainted)];
    const pages = g.save.isUnlocked('beat_final') && PAGES[1].length ? 2 : 1;
    let pg = 0, sel = 0;
    const COLS = 5;
    const list = () => PAGES[pg];
    const rowsOf = (n: number) => Math.ceil(n / COLS);
    const pos = (i: number) => { const n = list().length, r = Math.floor(i / COLS), inRow = Math.min(COLS, n - r * COLS), c = i % COLS; return { x: 240 + (c - (inRow - 1) / 2) * 74, y: 90 + r * 60 }; };
    const isUn = (c: CharacterDef) => !c.unlock || g.save.isUnlocked(c.unlock);
    const choose = (i: number) => { const c = list()[i]; if (isUn(c)) self.push(self.newRunScreen(null, c.id)); else g.audio.play('deny'); };
    const flip = (d: number) => { if (pages < 2) return; pg = (pg + d + pages) % pages; sel = Math.min(sel, list().length - 1); self.sfxMove(); };
    return {
      t: 0,
      update(keys) {
        const n = list().length, rows = rowsOf(n);
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'tabL' || k === 'tabR') { flip(k === 'tabL' ? -1 : 1); continue; }
          if (k === 'left' || k === 'right') {
            const t = sel + (k === 'left' ? -1 : 1);
            // walking off either end of a page turns it
            if (pages > 1 && (t < 0 || t >= n)) { flip(k === 'left' ? -1 : 1); sel = k === 'left' ? list().length - 1 : 0; continue; }
            sel = (t + n) % n; self.sfxMove();
          }
          if (k === 'up' || k === 'down') { const t = sel + (k === 'up' ? -COLS : COLS); if (t >= 0 && t < n) { sel = t; self.sfxMove(); } else if (k === 'down' && Math.floor(sel / COLS) < rows - 1) { sel = n - 1; self.sfxMove(); } }
          if (k === 'confirm') choose(sel);
        }
      },
      pointer(x, y, click) {
        if (pages > 1 && y < 50 && click && (x < 140 || x > 340)) { flip(x < 240 ? -1 : 1); return; }
        for (let i = 0; i < list().length; i++) {
          const p = pos(i);
          if (Math.abs(x - p.x) < 32 && y > p.y - 40 && y < p.y + 18) { if (i !== sel) { sel = i; self.sfxMove(); } if (click) choose(i); return; }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 30, 14, 420, 240, 1, pg ? 13 : 11);
        heading(ctx, pg ? 'The Mirrored' : 'The Readers', 240, 36, 13, pg ? '#5a1a2a' : INK);
        if (pages > 1) { text(ctx, pg ? '◀ Readers' : '', 64, 36, 7.5, INK2, 'left', FONT_BODY, 600, false); text(ctx, pg ? '' : 'Mirrored ▶', 416, 36, 7.5, '#6a1a2a', 'right', FONT_BODY, 600, false); }
        list().forEach((c, i) => {
          const { x, y } = pos(i);
          const un = isUn(c);
          const sp = self.sprites(c);
          if (i === sel) inkBlot(ctx, x, y - 14, 56, 52, self.time, pg ? 'rgba(90,20,40,0.16)' : 'rgba(40,30,60,0.15)');
          ctx.save(); ctx.translate(x, y); ctx.scale(1.6, 1.6);
          if (!un) ctx.filter = 'brightness(0)';
          sp.bodyIdle.down[Math.floor(self.time * 1.5 + i) % 2].draw(ctx, 0, 0); sp.head.down.normal.draw(ctx, 0, -10);
          ctx.restore();
          text(ctx, un ? c.name.replace('Mirrored ', '') : '???', x, y + 11, 8.5, INK, 'center', FONT_TITLE, 400, false);
        });
        const c = list()[sel]; const un = isUn(c);
        const top = 90 + rowsOf(list().length) * 60 - 26;
        if (un && c.tainted) text(ctx, c.title, 240, top - 10, 7.5, '#6a1a2a', 'center', FONT_BODY, 700, false);
        wrap(ctx, un ? c.desc : 'Locked — ' + c.unlockHint, 7.5, 360).forEach((l, i) => text(ctx, l, 240, top + i * 9, 7.5, INK2, 'center', FONT_BODY, 600, false));
        if (un) text(ctx, c.passive, 240, top + 22, 7, '#4a3a6a', 'center', FONT_BODY, 600, false);
        if (un) drawMarks(ctx, g, c.id, 240, top + 41);
        hint(ctx, pages > 1 ? 'Arrows or mouse to choose · Q/R or walk off the edge to turn the page · Enter to start · Esc back' : 'Arrows or mouse to choose · Enter to start a run · Esc back');
      },
    };
  }

  // ------------------------------------------------------------ collection
  collectionScreen(): Screen {
    const self = this, g = this.g;
    const all = ALL_ITEMS.filter((i) => i.id !== 'moth_wings_rev' && !i.tags?.includes('innate'));
    const seen = new Set(g.save.data.itemsSeen);
    // What you've found comes first, gathered into sets (a transformation's items, then actives,
    // familiars and the rest); everything still missing waits at the end as silhouettes.
    const SET_TAGS = ['boys', 'vamp', 'drain', 'jeffy', 'dice', 'moth', 'ink', 'clock', 'wax', 'thread', 'bone', 'void'];
    const setOf = (it: typeof all[number]) => SET_TAGS.find((t) => it.tags?.includes(t)) ?? (it.kind === 'active' ? 'active' : it.kind === 'familiar' ? 'familiar' : 'curio');
    const SET_NAME = (k: string) => k === 'dice' ? 'The Dice' : k === 'boys' ? 'The Boys' : k === 'active' ? 'Active items' : k === 'familiar' ? 'Familiars' : k === 'curio' ? 'Curios' : `${TRANSFORM_EFFECTS[k]?.name ?? k} set`;
    const itemGroups: GridGroup[] = [];
    for (const k of [...SET_TAGS, 'active', 'familiar', 'curio']) {
      const inSet = all.filter((it) => setOf(it) === k);
      const got = inSet.filter((it) => seen.has(it.id));
      if (got.length) itemGroups.push({ label: SET_NAME(k), note: `${got.length} / ${inSet.length}`, color: SET_TAGS.includes(k) ? '#6a3a8a' : INK, ids: got.map((it) => all.indexOf(it)) });
    }
    const missing = all.filter((it) => !seen.has(it.id));
    if (missing.length) itemGroups.push({ label: 'Undiscovered', note: `${missing.length} left`, color: '#8a7a6a', ids: missing.map((it) => all.indexOf(it)) });
    const items = new GridView(itemGroups, 15, 19, 30, 52, 196);

    const kills = g.save.data.kills ?? {};
    const beasts = ALL_ENEMY_DEFS().filter((d) => !['snipA', 'snipB', 'ratprince', 'blottedhalf', 'bilgeseg'].includes(d.id));
    const beastGroups: GridGroup[] = [];
    const metC = beasts.filter((d) => !d.boss && kills[d.id]), metB = beasts.filter((d) => d.boss && kills[d.id]), unmet = beasts.filter((d) => !kills[d.id]);
    if (metC.length) beastGroups.push({ label: 'Creatures', note: `${metC.length} / ${beasts.filter((d) => !d.boss).length}`, color: INK, ids: metC.map((d) => beasts.indexOf(d)) });
    if (metB.length) beastGroups.push({ label: 'Bosses', note: `${metB.length} / ${beasts.filter((d) => d.boss).length}`, color: '#8a1a1a', ids: metB.map((d) => beasts.indexOf(d)) });
    if (unmet.length) beastGroups.push({ label: 'Not yet met', note: `${unmet.length} left`, color: '#8a7a6a', ids: unmet.map((d) => beasts.indexOf(d)) });
    const bview = new GridView(beastGroups, 10, 29, 28, 52, 196);

    let tab: 'items' | 'beasts' = 'items';
    const view = () => (tab === 'items' ? items : bview);
    const swapTab = () => { tab = tab === 'items' ? 'beasts' : 'items'; self.sfxMove(); };

    const renderBeasts = (ctx: CanvasRenderingContext2D) => {
      bview.render(ctx, (ctx, i, x, y, size, on) => {
        const d = beasts[i];
        ctx.fillStyle = on ? 'rgba(60,30,30,0.35)' : d.boss ? 'rgba(120,40,30,0.14)' : 'rgba(60,40,30,0.1)'; ctx.fillRect(x, y, size - 2, size - 2);
        drawBeast(ctx, d, x + 1, y + 1, size - 4, !kills[d.id]);
      });
      const d = beasts[bview.selected()];
      const dx = 338, dy = 50, n = d ? kills[d.id] ?? 0 : 0;
      ctx.fillStyle = 'rgba(60,40,30,0.15)'; ctx.fillRect(dx - 6, dy - 6, 124, 196);
      if (!d) return;
      drawBeast(ctx, d, dx + 20, dy, 76, !n);
      if (n) {
        let y = dy + 92;
        for (const l of wrap(ctx, d.name, 11, 118, FONT_TITLE)) { text(ctx, l, dx, y, 11, d.boss ? '#8a1a1a' : INK, 'left', FONT_TITLE, 400, false); y += 11; }
        text(ctx, d.boss ? `Boss · defeated ${n}×` : `Slain: ${n}`, dx, y, 7, '#8a3a2a', 'left', FONT_BODY, 600, false); y += 11;
        for (const s of wrap(ctx, d.desc || 'Small, fast and best ignored.', 7, 116)) { text(ctx, s, dx, y, 7, INK2, 'left', FONT_BODY, 600, false); y += 8.5; }
      } else {
        text(ctx, '???', dx, dy + 100, 14, INK2, 'left', FONT_TITLE, 400, false);
        text(ctx, d.boss ? 'Not yet defeated.' : 'Not yet met.', dx, dy + 114, 7.5, INK2, 'left', FONT_BODY, 600, false);
      }
    };
    const renderItems = (ctx: CanvasRenderingContext2D) => {
      items.render(ctx, (ctx, i, x, y, size, on) => {
        const it = all[i];
        const known = seen.has(it.id);
        const locked = it.unlock && !g.save.isUnlocked(it.unlock);
        ctx.fillStyle = on ? 'rgba(60,30,30,0.35)' : 'rgba(60,40,30,0.1)'; ctx.fillRect(x - 1, y - 1, 18, 18);
        if (known) ctx.drawImage(itemIconCanvas(it.id), x - 1, y - 1);
        else { ctx.globalAlpha = 0.25; ctx.filter = 'brightness(0)'; ctx.drawImage(itemIconCanvas(it.id), x - 1, y - 1); ctx.filter = 'none'; ctx.globalAlpha = 1; if (locked) text(ctx, '×', x + 8, y + 12, 9, '#8a3a2a', 'center', FONT_BODY, 600, false); }
      });
      const it = all[items.selected()];
      const dx = 340, dy = 50;
      ctx.fillStyle = 'rgba(60,40,30,0.15)'; ctx.fillRect(dx - 6, dy - 6, 120, 196);
      if (!it) return;
      if (seen.has(it.id)) {
        ctx.drawImage(itemIconCanvas(it.id), dx, dy, 32, 32);
        wrap(ctx, it.name, 11, 110, FONT_TITLE).forEach((l, i) => text(ctx, l, dx, dy + 46 + i * 11, 11, INK, 'left', FONT_TITLE, 400, false));
        let y = dy + 62 + (wrap(ctx, it.name, 11, 110, FONT_TITLE).length - 1) * 11;
        text(ctx, `"${it.pickup}"`, dx, y, 7, '#8a3a2a', 'left', FONT_BODY, 600, false); y += 11;
        for (const l of describeItem(it)) for (const s of wrap(ctx, l.text, 7, 108)) { text(ctx, s, dx, y, 7, l.color === 'up' ? '#2a6a2a' : l.color === 'down' ? '#8a2a2a' : INK2, 'left', FONT_BODY, 600, false); y += 8.5; }
        // where it came from, if anyone remembers
        const lore = it.lore ?? ITEM_LORE[it.id];
        if (lore) { y += 3; for (const s of wrap(ctx, lore, 6.5, 108)) { if (y > 228) break; text(ctx, s, dx, y, 6.5, '#7a5a3a', 'left', FONT_BODY, 500, false); y += 8; } }
        text(ctx, `${SET_NAME(setOf(it))}  ·  ${it.kind}`, dx, 236, 6.5, INK2, 'left', FONT_BODY, 600, false);
        const pi = poolInfo(it);
        if (pi) text(ctx, `${pi.mark} ${pi.name}`, dx + 114, 236, 6.5, pi.ink, 'right', FONT_BODY, 700, false);
      } else {
        text(ctx, '???', dx, dy + 46, 14, INK2, 'left', FONT_TITLE, 400, false);
        const a = it.unlock ? ACHIEVEMENTS.find((x) => x.id === it.unlock) : null;
        if (a && !g.save.isUnlocked(a.id)) wrap(ctx, 'Locked: ' + a.desc, 7.5, 108).forEach((l, i) => text(ctx, l, dx, dy + 62 + i * 9, 7.5, '#8a3a2a', 'left', FONT_BODY, 600, false));
        else text(ctx, 'Not yet found.', dx, dy + 62, 7.5, INK2, 'left', FONT_BODY, 600, false);
        // a hint of where to look
        const pi = poolInfo(it);
        if (pi) text(ctx, `${pi.mark} Found in ${pi.name}`, dx, 236, 6.5, pi.ink, 'left', FONT_BODY, 700, false);
      }
    };
    // tab labels double as buttons
    const TABS: ['items' | 'beasts', string, number][] = [['items', 'Collection', 30], ['beasts', 'Bestiary', 150]];
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'confirm' || k === 'tabL' || k === 'tabR') { swapTab(); continue; }
          if (k === 'left' || k === 'right' || k === 'up' || k === 'down') { view().move(k); self.sfxMove(); }
        }
      },
      pointer(x, y, click, moved, wheel) {
        if (wheel) { view().wheel(wheel); return; }
        if (click && y >= 22 && y <= 34) for (const [t, , tx] of TABS) if (x >= tx - 2 && x <= tx + 110 && t !== tab) { swapTab(); return; }
        if (view().pointer(x, y, click, moved)) self.sfxMove();
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 14, 10, 452, 250, 1, 5);
        for (const [t, label, tx] of TABS) heading(ctx, label, tx, 31, t === tab ? 12 : 9, t === tab ? INK : '#9a8a7a', 'left');
        const found = all.filter((i) => seen.has(i.id)).length, met = beasts.filter((d) => kills[d.id]).length;
        text(ctx, tab === 'items' ? `${found} / ${all.length} curios found` : `${met} / ${beasts.length} creatures recorded`, 450, 31, 7, INK2, 'right', FONT_BODY, 600, false);
        if (tab === 'beasts') renderBeasts(ctx); else renderItems(ctx);
        hint(ctx, `Arrows or mouse to browse · wheel to scroll · Enter or click a tab: ${tab === 'items' ? 'bestiary' : 'curios'} · Esc back`);
      },
    };
  }

  // ------------------------------------------------------------ statistics & achievements
  historyScreen(): Screen {
    const self = this, g = this.g;
    let sel = 0, scroll = 0;
    const list = () => g.save.data.history ?? [];
    return {
      t: 0,
      update(keys) {
        const n = list().length;
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'up') sel = Math.max(0, sel - 1);
          if (k === 'down') sel = Math.min(Math.max(0, n - 1), sel + 1);
          if (k === 'confirm' && list()[sel]) { const r = list()[sel]; self.push(self.newRunScreen(null, CHARACTERS.find((c) => c.id === r.char) ? r.char : undefined, r.seed)); return; }
        }
        if (sel < scroll) scroll = sel; if (sel >= scroll + 9) scroll = sel - 8;
      },
      pointer(_x, y, click, _m, wheel) {
        if (wheel) { sel = clamp(sel + wheel, 0, Math.max(0, list().length - 1)); return; }
        const i = Math.floor((y - 58) / 19) + scroll;
        if (i >= 0 && i < list().length && y >= 50) { sel = i; if (click) { const r = list()[sel]; self.push(self.newRunScreen(null, CHARACTERS.find((c) => c.id === r.char) ? r.char : undefined, r.seed)); } }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 20, 14, 440, 244, 1, 21);
        heading(ctx, 'Run History', 40, 38, 12, INK, 'left');
        const L = list();
        if (!L.length) text(ctx, 'No finished runs yet. Every story you finish or lose is written down here.', 240, 120, 8, INK2, 'center', FONT_BODY, 600, false);
        L.slice(scroll, scroll + 9).forEach((r, k) => {
          const i = k + scroll, y = 58 + k * 19, on = i === sel;
          if (on) inkBlot(ctx, 240, y + 3, 410, 17, self.time, 'rgba(40,30,60,0.15)');
          const ch = CHARACTERS.find((c) => c.id === r.char);
          text(ctx, r.won ? 'Won' : 'Lost', 40, y + 6, 9, r.won ? '#3a6a2a' : '#8a2a2a', 'left', FONT_TITLE, 400, false);
          text(ctx, `${ch?.name ?? r.char} · ${r.mode === 'hard' ? 'Hard' : r.mode === 'daily' ? 'Daily' : r.mode === 'endless' ? 'Endless' : 'Normal'} · Chapter ${r.floor + 1}`, 78, y + 2, 7.5, INK, 'left', FONT_BODY, 600, false);
          text(ctx, `${new Date(r.date).toLocaleDateString()} · ${fmtTime(r.time)} · Seed ${formatSeed(r.seed)}${r.cause && !r.won ? ' · ' + r.cause : ''}`, 78, y + 10, 6, INK2, 'left', FONT_BODY, 600, false);
          r.items.slice(0, 8).forEach((id, j) => { if (getItem(id)) ctx.drawImage(itemIconCanvas(id), 300 + j * 13, y - 4, 12, 12); });
          text(ctx, String(r.score), 444, y + 6, 9, INK, 'right', FONT_TITLE, 400, false);
        });
        hint(ctx, '↑/↓ browse · Enter to replay that seed · Esc back');
      },
    };
  }

  statsScreen(): Screen {
    const self = this, g = this.g;
    let scroll = 0;
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back' || k === 'confirm') { const s = g.save.data; s.seenUnlocks = [...s.unlocks]; g.save.markDirty(); self.pop(); return; }
          if (k === 'down') scroll = Math.min(ACHIEVEMENTS.length - 10, scroll + 1); if (k === 'up') scroll = Math.max(0, scroll - 1);
        }
      },
      pointer(x, y, click, _m, wheel) {
        if (wheel) { scroll = clamp(scroll + wheel, 0, ACHIEVEMENTS.length - 10); return; }
        // click the scrollbar track to jump
        if (click && x >= 440 && x <= 452 && y >= 46 && y <= 240) scroll = clamp(Math.round(((y - 46) / 194) * ACHIEVEMENTS.length - 5), 0, ACHIEVEMENTS.length - 10);
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 20, 14, 440, 244, 1, 9);
        const S = g.save.data.stats;
        heading(ctx, 'Statistics', 40, 38, 12, INK, 'left');
        const rows: [string, string][] = [
          ['Runs started', String(S.runs ?? 0)], ['Stories finished', String(S.wins ?? 0)], ['Deaths', String(S.deaths ?? 0)],
          ['Enemies defeated', String(S.kills ?? 0)], ['Bosses defeated', String(S.bossKills ?? 0)], ['Curios collected', String(S.itemsCollected ?? 0)],
          ['Secrets found', String(S.secretsFound ?? 0)], ['Buttons gathered', String(S.buttons ?? 0)], ['Chapters closed', String(S.floorsCleared ?? 0)],
          ['Bargains struck', String(S.deals ?? 0)], ['Best time', g.save.data.bestTime ? fmtTime(g.save.data.bestTime) : '—'], ['Best score', S.best_normal ? String(S.best_normal) : '—'], ['Best score (Hard)', S.best_hard ? String(S.best_hard) : '—'],
        ];
        rows.forEach(([k, v], i) => { text(ctx, k, 40, 54 + i * 14, 8.5, INK2, 'left', FONT_BODY, 600, false); text(ctx, v, 200, 54 + i * 14, 9, INK, 'right', FONT_BODY, 600, false); });
        const un = ACHIEVEMENTS.filter((a) => g.save.isUnlocked(a.id)).length;
        heading(ctx, 'Achievements', 230, 38, 12, INK, 'left');
        text(ctx, `${un} / ${ACHIEVEMENTS.length}`, 440, 38, 8, INK2, 'right', FONT_BODY, 600, false);
        const seen = g.save.data.seenUnlocks ?? [];
        ACHIEVEMENTS.slice(scroll, scroll + 10).forEach((a, i) => {
          const got = g.save.isUnlocked(a.id), fresh = got && !seen.includes(a.id);
          const y = 54 + i * 19;
          const name = (got ? '◆ ' : '◇ ') + (got || !a.hidden ? a.name : '???');
          text(ctx, name, 230, y, 8.5, got ? INK : '#8a7a6a', 'left', FONT_TITLE, 400, false);
          if (fresh) text(ctx, 'NEW', 234 + measure(ctx, name, 8.5, FONT_TITLE, 400), y, 6, '#a02a2a', 'left', FONT_BODY, 700, false);
          // earned: what it gave you. Not yet: what to do (hidden ones give a clue instead)
          const line = got ? `${a.desc} ${a.unlocks}` : a.hidden ? (a.clue ? 'Clue: ' + a.clue : a.desc) : `${a.desc} ${a.unlocks}`;
          text(ctx, line.length > 74 ? line.slice(0, 73) + '…' : line, 238, y + 8, 6.5, got ? INK2 : '#8a7a6a', 'left', FONT_BODY, 600, false);
        });
        // scrollbar
        const max = ACHIEVEMENTS.length - 10, th = Math.max(16, 194 * 10 / ACHIEVEMENTS.length), ty = 46 + (scroll / max) * (194 - th);
        ctx.fillStyle = 'rgba(90,60,40,0.18)'; ctx.fillRect(444, 46, 4, 194);
        ctx.fillStyle = 'rgba(110,50,40,0.75)'; ctx.fillRect(444, ty, 4, th);
        if (scroll > 0) text(ctx, '▲', 446, 44, 6, '#8a3a2a', 'center', FONT_BODY, 700, false);
        if (scroll < max) text(ctx, '▼ more', 448, 248, 6, '#8a3a2a', 'right', FONT_BODY, 700, false);
        hint(ctx, '↑/↓ or mouse wheel to scroll achievements · Esc back');
      },
    };
  }

  // ------------------------------------------------------------ options
  optionsScreen(overlay = false): Screen {
    const self = this, g = this.g;
    const st = () => g.save.data.settings;
    type Opt = { label: string; value: () => string; left?: () => void; right?: () => void; ok?: () => void };
    const pct = (v: number) => Math.round(v * 100) + '%';
    let logNote = '';
    const step = (k: 'music' | 'sfx' | 'shake', d: number) => { const s = st(); s[k] = clamp(Math.round((s[k] + d) * 10) / 10, 0, 1); g.applySettings(); g.save.markDirty(); g.audio.play('coin', { vol: 0.5 }); };
    const opts: Opt[] = [
      { label: 'Music volume', value: () => pct(st().music), left: () => step('music', -0.1), right: () => step('music', 0.1) },
      { label: 'Effects volume', value: () => pct(st().sfx), left: () => step('sfx', -0.1), right: () => step('sfx', 0.1) },
      { label: 'Screen shake', value: () => pct(st().shake), left: () => step('shake', -0.1), right: () => step('shake', 0.1) },
      { label: 'Reduce flashing', value: () => (st().reduceFlash ? 'On' : 'Off'), ok: () => { st().reduceFlash = !st().reduceFlash; g.save.markDirty(); } },
      { label: 'High-contrast enemy shots', value: () => (st().contrastShots ? 'On' : 'Off'), ok: () => { st().contrastShots = !st().contrastShots; g.save.markDirty(); } },
      { label: 'HUD text size', value: () => pct(st().hudScale || 1), ok: () => { const v = [1, 1.15, 1.3]; st().hudScale = v[(v.indexOf(st().hudScale || 1) + 1) % v.length]; g.save.markDirty(); } },
      { label: 'Hit pause', value: () => ({ 0: 'Off', 0.5: 'Light', 1: 'Full' } as Record<number, string>)[st().hitPause ?? 1] ?? 'Full', ok: () => { const v = [1, 0.5, 0]; st().hitPause = v[(v.indexOf(st().hitPause ?? 1) + 1) % 3]; g.save.markDirty(); } },
      { label: 'Scaling', value: () => ({ sharp: 'Sharp (fit)', integer: 'Pixel perfect', stretch: 'Nearest (fit)' } as any)[st().scale], ok: () => { const m = ['sharp', 'integer', 'stretch'] as const; st().scale = m[(m.indexOf(st().scale) + 1) % 3]; g.applySettings(); g.save.markDirty(); } },
      { label: 'Fullscreen', value: () => (isFullscreen() ? 'On' : 'Off'), ok: () => { const on = !isFullscreen(); setFullscreen(on); st().fullscreen = on; g.save.markDirty(); } },
      { label: 'Item descriptions', value: () => (st().descStyle === 'card' ? 'Large card' : 'Compact (EID style)'), ok: () => { st().descStyle = st().descStyle === 'card' ? 'eid' : 'card'; g.save.markDirty(); } },
      ...((window as any).bomDesktop?.setPresence ? [{ label: 'Discord status', value: () => (st().discord !== false ? 'On' : 'Off'), ok: () => { st().discord = st().discord === false; g.save.markDirty(); } }] : []),
      { label: 'Tutorial hints', value: () => (st().tutorial !== false ? 'On' : 'Off'), ok: () => { st().tutorial = st().tutorial === false; g.save.markDirty(); } },
      { label: 'Run timer', value: () => (st().timer ? 'On' : 'Off'), ok: () => { st().timer = !st().timer; g.save.markDirty(); } },
      { label: 'Show items on HUD', value: () => (st().showItems !== false ? 'On' : 'Off'), ok: () => { st().showItems = st().showItems === false; g.save.markDirty(); } },
      { label: 'Show stats on HUD', value: () => (st().showStats ? 'On' : 'Off'), ok: () => { st().showStats = !st().showStats; g.save.markDirty(); } },
      { label: 'Motion smoothing', value: () => (st().interpolate !== false ? 'On' : 'Off'), ok: () => { st().interpolate = st().interpolate === false; g.save.markDirty(); } },
      { label: 'Frame rate cap', value: () => (st().fpsCap ? st().fpsCap + ' fps' : 'Display rate'), ok: () => { const caps = [0, 60, 120, 144, 165, 240]; st().fpsCap = caps[(caps.indexOf(st().fpsCap ?? 0) + 1) % caps.length]; g.save.markDirty(); } },
      { label: 'Effects', value: () => (st().lowFx ? 'Low (for slower computers)' : 'Full'), ok: () => { st().lowFx = !st().lowFx; g.save.markDirty(); } },
      { label: 'Show FPS', value: () => (st().showFps ? 'On' : 'Off'), ok: () => { st().showFps = !st().showFps; g.save.markDirty(); } },
      { label: 'Controller rumble', value: () => pct(st().rumble ?? 1), left: () => { st().rumble = clamp(Math.round(((st().rumble ?? 1) - 0.25) * 4) / 4, 0, 1); g.applySettings(); g.save.markDirty(); g.input.rumble(0.6, 150); }, right: () => { st().rumble = clamp(Math.round(((st().rumble ?? 1) + 0.25) * 4) / 4, 0, 1); g.applySettings(); g.save.markDirty(); g.input.rumble(0.6, 150); } },
      { label: 'Pause when away', value: () => (st().autoPause !== false ? 'On' : 'Off'), ok: () => { st().autoPause = st().autoPause === false; g.save.markDirty(); } },
      { label: 'Diagonal keyboard aiming', value: () => (st().diagonalAim ? 'On' : 'Off'), ok: () => { st().diagonalAim = !st().diagonalAim; g.applySettings(); g.save.markDirty(); } },
      { label: 'Fire button-drop chance', value: () => pct(st().fireDropChance), left: () => { st().fireDropChance = clamp(Math.round((st().fireDropChance - 0.05) * 100) / 100, 0, 0.5); g.save.markDirty(); }, right: () => { st().fireDropChance = clamp(Math.round((st().fireDropChance + 0.05) * 100) / 100, 0, 0.5); g.save.markDirty(); } },
      { label: 'Help & controls', value: () => '', ok: () => self.push(self.helpScreen(overlay)) },
      { label: 'Error log', value: () => logNote || (errorCount() ? `${errorCount()} logged` : 'No errors'), ok: () => { void shareErrorLog().then((s) => { logNote = s; setTimeout(() => (logNote = ''), 2500); }); } },
    ];
    if (!overlay) opts.push({ label: 'Save slots', value: () => `Slot ${g.save.slot}`, ok: () => self.push(profilesScreen(self)) }, { label: 'Credits', value: () => '', ok: () => self.push(self.creditsScreen()) });
    if (!overlay) opts.push({ label: 'Erase all progress', value: () => '', ok: () => self.push(self.confirmScreen('Erase every unlock, statistic and saved run?', () => { g.save.reset(); self.openMain(); })) });
    opts.forEach((o) => { if (o.ok && !o.left) { o.left = o.ok; o.right = o.ok; } });
    // more options than fit on the page: show a window that follows the selection
    const VIS = 11, ROW = 16.5, TOP = 62;
    let sel = 0, scroll = 0;
    const follow = () => { if (sel < scroll) scroll = sel; if (sel >= scroll + VIS) scroll = sel - VIS + 1; };
    return {
      t: 0, overlay,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'up' || k === 'down') { sel = (sel + (k === 'up' ? -1 : 1) + opts.length) % opts.length; self.sfxMove(); }
          if (k === 'left') opts[sel].left?.();
          if (k === 'right') opts[sel].right?.();
          if (k === 'confirm') (opts[sel].ok ?? opts[sel].right)?.();
        }
        follow();
      },
      pointer(x, y, click, moved, wheel) {
        if (wheel) { scroll = clamp(scroll + wheel, 0, opts.length - VIS); sel = clamp(sel, scroll, scroll + VIS - 1); return; }
        const i = Math.floor((y - TOP + 9) / ROW) + scroll;
        if (x < 100 || x > 380 || i < scroll || i >= Math.min(opts.length, scroll + VIS)) return;
        if (moved && i !== sel) { sel = i; self.sfxMove(); }
        if (click) {
          sel = i;
          const o = opts[i];
          // click the left half of a slider to lower it, the right half to raise it
          if (!o.ok && o.left && x < 300) o.left(); else (o.ok ?? o.right)?.();
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 90, 16, 300, 240, 1, 4);
        heading(ctx, 'Options', 240, 40, 13, INK);
        if (scroll > 0) text(ctx, '▲', 240, 57, 6, INK2, 'center', FONT_BODY, 600, false);
        if (scroll + VIS < opts.length) text(ctx, '▼ more', 240, TOP + VIS * ROW - 2, 7, INK2, 'center', FONT_BODY, 600, false);
        opts.forEach((o, i) => {
          if (i < scroll || i >= scroll + VIS) return;
          const y = TOP + (i - scroll) * ROW;
          if (i === sel) inkBlot(ctx, 240, y - 3, 270, 15, self.time, 'rgba(40,30,60,0.15)');
          text(ctx, o.label, 112, y, 8.5, i === sel ? INK : INK2, 'left', FONT_BODY, 600, false);
          const v = o.value();
          if (v) text(ctx, (o.left && i === sel && !o.ok ? '◀ ' : '') + v + (o.right && i === sel && !o.ok ? ' ▶' : ''), 368, y, 8.5, INK, 'right', FONT_BODY, 600, false);
        });
        hint(ctx, '↑/↓ or wheel to scroll · ←/→ adjust · Enter toggle · Esc back');
      },
    };
  }
  controlsScreen(overlay: boolean): Screen {
    const self = this, g = this.g;
    let sel = 0, waiting = false;
    const n = ACTION_ORDER.length + 1;
    return {
      t: 0, overlay,
      update(keys) {
        if (waiting) return;
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'up' || k === 'down') { sel = (sel + (k === 'up' ? -1 : 1) + n) % n; self.sfxMove(); }
          if (k === 'confirm') {
            if (sel === ACTION_ORDER.length) { g.save.data.settings.bindings = structuredClone(DEFAULT_BINDINGS); g.applySettings(); g.save.markDirty(); g.audio.play('coin'); continue; }
            waiting = true;
            const a: Action = ACTION_ORDER[sel];
            g.input.captureNext = (code) => {
              waiting = false;
              if (code !== 'Escape' || a === 'pause') {
                const b = g.save.data.settings.bindings;
                // remove this key from other actions to avoid conflicts
                for (const other of ACTION_ORDER) b[other] = b[other].filter((c) => c !== code);
                b[a] = [code];
                if (a === 'pause' && !b.pause.includes('Escape')) b.pause.push('Escape');
                g.applySettings(); g.save.markDirty(); g.audio.play('unlock');
              }
              g.input.clearMenu();
            };
          }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 80, 8, 320, 256, 1, 6);
        heading(ctx, 'Controls', 240, 27, 11, INK, 'center', false);
        ACTION_ORDER.forEach((a, i) => {
          const y = 42 + i * 12.5;
          if (i === sel) inkBlot(ctx, 240, y - 3, 290, 12, self.time, 'rgba(40,30,60,0.15)');
          text(ctx, ACTION_LABELS[a], 98, y, 7.5, i === sel ? INK : INK2, 'left', FONT_BODY, 600, false);
          if (waiting && i === sel) text(ctx, 'Press a key…', 382, y, 7.5, '#8a2a2a', 'right', FONT_BODY, 600, false);
          else keycaps(ctx, g.save.data.settings.bindings[a].map(keyLabel), 382, y);
        });
        const y = 42 + ACTION_ORDER.length * 12.5;
        if (sel === ACTION_ORDER.length) inkBlot(ctx, 240, y - 3, 200, 12, self.time, 'rgba(40,30,60,0.15)');
        text(ctx, 'Reset to defaults', 240, y, 8, INK, 'center', FONT_TITLE, 400, false);
        hint(ctx, 'Enter then press a key to rebind · Controller: left stick move, right stick / face buttons fire, RB active, LB bomb, LT page');
      },
    };
  }
  confirmScreen(q: string, yes: () => void): Screen {
    const self = this; let sel = 1;
    return {
      t: 0, overlay: true,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'left' || k === 'right' || k === 'up' || k === 'down') sel = 1 - sel;
          if (k === 'confirm') { self.pop(); if (sel === 0) yes(); return; }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.7)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 120, 90, 240, 90, 1, 12);
        wrap(ctx, q, 9, 210).forEach((l, i) => text(ctx, l, 240, 115 + i * 11, 9, INK, 'center', FONT_BODY, 600, false));
        ['Yes', 'No'].forEach((s, i) => { const x = 200 + i * 80; if (i === sel) inkBlot(ctx, x, 158, 50, 14, self.time, 'rgba(40,30,60,0.2)'); text(ctx, s, x, 161, 10, INK, 'center', FONT_TITLE, 400, false); });
      },
    };
  }

  // ------------------------------------------------------------ credits
  creditsScreen(): Screen {
    const self = this;
    const lines = [
      ['Lost Marcus', 'title'], ['A Papermoth Games production', ''], ['', ''],
      ['Design, code, pixel art, music and sound', 'h'], ['Generated in-engine — every sprite, room, sound and song', ''], ['is painted or synthesised procedurally at runtime.', ''], ['', ''],
      ['Built with Claude Code', 'h'], ['', ''],
      ['Typefaces', 'h'], ['Cinzel — Natanael Gama (SIL OFL)', ''], ['Pirata One — Rodrigo Fuenzalida & Nicolás Massi (SIL OFL)', ''], ['Barlow Condensed — Jeremy Tribby (SIL OFL)', ''], ['', ''],
      ['With gratitude to', 'h'], ['Every grandparent who read the scary parts quietly', ''], ['and the room-by-room roguelikes that came before.', ''], ['', ''],
      ['Thank you for reading.', 'title'],
    ];
    return {
      t: 0,
      update(keys) { if (keys.length) self.pop(); },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.75)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        const y0 = VIEW_H - this.t * 18;
        lines.forEach(([l, k], i) => {
          const y = y0 + i * 16;
          if (y < -20 || y > VIEW_H + 20) return;
          text(ctx, l, VIEW_W / 2, y, k === 'title' ? 18 : k === 'h' ? 10 : 8, k === 'h' ? '#c8a878' : '#e6d6bc', 'center', k ? FONT_TITLE : FONT_BODY, k ? 400 : 600);
        });
        if (y0 + lines.length * 16 < -10) this.t = 0;
        hint(ctx, 'Any key to return');
      },
    };
  }

  // ------------------------------------------------------------ pause
  private pauseMenu(): Screen {
    const self = this, g = this.g;
    const daily = g.world?.run.mode === 'daily';
    const items = ['Resume', 'Help & controls', 'Options', daily ? 'Restart (not in the Daily Run)' : 'Restart (same reader)', 'Save & quit to menu'];
    let sel = 0;
    const choose = () => {
      if (sel === 0) { g.paused = false; return; }
      if (sel === 1) { self.push(self.helpScreen(true)); return; }
      if (sel === 2) { self.push(self.optionsScreen(true)); return; }
      if (sel === 3) { if (daily) { g.audio.play('deny'); return; } const r = g.world!.run, c = r.charId, ch = r.challenge, mode = r.mode; g.paused = false; g.fadeTo(() => g.newRun(c, undefined, ch, mode), 0.4); return; }
      if (sel === 4) { g.saveSnapshot(); g.save.flush(); g.fadeTo(() => g.quitToMenu(), 0.4); }
    };
    const BX = 36, BY = 18, BW = 408, BH = 236, L = BX + 22, R = BX + BW / 2 + 18;
    const scr: Screen = {
      t: 0,
      update(keys) {
        if (self.stack.length) return;
        for (const k of keys) {
          if (k === 'back') { g.paused = false; g.audio.duck(1, 0.01); return; }
          if (k === 'up' || k === 'down') { sel = (sel + (k === 'up' ? -1 : 1) + items.length) % items.length; self.sfxMove(); }
          if (k === 'confirm') { choose(); return; }
        }
      },
      pointer(x, y, click, moved) {
        if (self.stack.length) return;
        items.forEach((_, i) => { const iy = 82 + i * 19; if (x > L - 6 && x < L + 160 && y > iy - 11 && y < iy + 5) { if (moved && sel !== i) { sel = i; self.sfxMove(); } if (click) { sel = i; choose(); } } });
      },
      render(ctx) {
        const w = g.world; if (!w) return;
        ctx.fillStyle = 'rgba(4,2,6,0.78)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        book(ctx, BX, BY, BW, BH, 21);
        // the left page: where you are, and what to do
        heading(ctx, 'Paused', L, 48, 15, INK, 'left', false);
        text(ctx, `${w.floor.label}`, L, 60, 7.5, INK2, 'left', FONT_BODY, 600, false);
        ctx.fillStyle = 'rgba(90,60,40,0.35)'; ctx.fillRect(L, 65, 160, 0.6);
        items.forEach((it, i) => {
          const y = 82 + i * 19;
          if (i === sel) inkBlot(ctx, L + 72, y - 3.5, 168, 15, self.time, 'rgba(40,30,60,0.17)');
          text(ctx, it, L + (i === sel ? 4 : 0), y, i === sel ? 10.5 : 9.5, i === sel ? INK : INK2, 'left', FONT_TITLE, 400, false);
        });
        text(ctx, `Seed  ${formatSeed(w.run.seed)}`, L, BY + BH - 20, 7, INK2, 'left', FONT_BODY, 600, false);
        // the right page: the ledger of this run
        const r = w.run;
        heading(ctx, 'This run', R, 48, 11, INK, 'left', false);
        const st: [string, string][] = [['Time', fmtTime(r.stats.time)], ['Enemies defeated', String(r.stats.kills)], ['Rooms cleared', String(r.stats.roomsCleared)], ['Secrets found', String(r.stats.secretsFound)], ['Damage taken', `${r.stats.damageTaken / 2} hearts`]];
        st.forEach(([k, v], i) => ledgerRow(ctx, k, v, R, R + 168, 66 + i * 12));
        text(ctx, 'Curios', R, 136, 8, INK2, 'left', FONT_TITLE, 400, false);
        const ids = [...w.player.itemOrder, ...(w.player.active ? [w.player.active] : [])];
        if (!ids.length) text(ctx, 'Nothing yet.', R, 150, 7, 'rgba(90,70,54,0.7)', 'left', FONT_BODY, 600, false);
        ids.slice(0, 36).forEach((id, i) => ctx.drawImage(itemIconCanvas(id), R + (i % 9) * 19, 141 + Math.floor(i / 9) * 19));
        if (ids.length > 36) text(ctx, `+${ids.length - 36} more`, R + 168, 226, 6.5, INK2, 'right', FONT_BODY, 600, false);
        if (w.player.transformations.size) text(ctx, [...w.player.transformations].map((t) => TRANSFORM_EFFECTS[t]?.name ?? t).join(' · '), R, BY + BH - 20, 7, '#5a2a7a', 'left', FONT_BODY, 700, false);
        hint(ctx, `${bindLabel('pause')} to resume`);
      },
    };
    return scr;
  }

  /** Help: the controls as you have them bound, and how to read the house. Opened from the pause menu, the title and Options. */
  /** What's new: the newest changelog section, as pages of the book (left/right to turn them). */
  whatsNewScreen(): Screen {
    const self = this, g = this.g;
    const BX = 36, BY = 14, BW = 408, BH = 244, COLW = 172, LH = 9, TOP = 58, ROWS = Math.floor((BY + BH - 22 - TOP) / LH);
    const news = latestNews();
    let cols: { s: string; kind: string }[][] | null = null, spread = 0;
    const layout = (ctx: CanvasRenderingContext2D) => {
      const out: { s: string; kind: string }[] = [];
      for (const b of news.blocks) {
        if (b.kind === 'gap') { out.push({ s: '', kind: 'gap' }); continue; }
        const size = b.kind === 'head' ? 8 : 7, w = b.kind === 'bullet' ? COLW - 8 : COLW;
        wrap(ctx, b.s, size, w, b.kind === 'head' ? FONT_TITLE : FONT_BODY).forEach((s, i) => out.push({ s, kind: b.kind === 'bullet' && i > 0 ? 'cont' : b.kind }));
      }
      cols = [];
      let cur: { s: string; kind: string }[] = [];
      for (const l of out) {
        if (cur.length >= ROWS || (l.kind === 'head' && cur.length >= ROWS - 2)) { cols.push(cur); cur = []; }
        if (l.kind === 'gap' && !cur.length) continue;
        cur.push(l);
      }
      if (cur.length) cols.push(cur);
    };
    const spreads = () => Math.max(1, Math.ceil((cols?.length ?? 1) / 2));
    const done = () => { g.save.data.settings.seenVersion = GAME_VERSION; g.save.markDirty(); self.pop(); };
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { done(); return; }
          if (k === 'left' || k === 'up') { if (spread > 0) { spread--; self.sfxMove(); } }
          if (k === 'right' || k === 'down') { if (spread < spreads() - 1) { spread++; self.sfxMove(); } }
          if (k === 'confirm') { if (spread < spreads() - 1) { spread++; self.sfxMove(); } else { done(); return; } }
        }
      },
      pointer(x, _y, click) {
        if (!click) return;
        // the left page turns back (and does nothing on the first page); the right page turns on, or closes at the end
        if (x < VIEW_W / 2) { if (spread > 0) spread--; } else if (spread < spreads() - 1) spread++; else done();
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.8)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        if (!cols) layout(ctx);
        book(ctx, BX, BY, BW, BH, 47);
        // the title on the left page, its subtitle on the right: nothing runs across the spine
        const [main, sub] = news.title.split(/:\s*/);
        heading(ctx, main, BX + 18, 40, 10, INK, 'left', false);
        if (sub) text(ctx, spread === 0 ? sub[0].toUpperCase() + sub.slice(1) : 'continued', BX + BW / 2 + 14, 40, 9, '#6a2a1a', 'left', FONT_TITLE, 400, false);
        [0, 1].forEach((side) => {
          const col = cols![spread * 2 + side]; if (!col) return;
          const x0 = side === 0 ? BX + 18 : BX + BW / 2 + 14;
          col.forEach((l, i) => {
            const y = TOP + i * LH;
            if (l.kind === 'head') text(ctx, l.s, x0, y, 8, '#6a2a1a', 'left', FONT_TITLE, 400, false);
            else if (l.kind === 'bullet') { text(ctx, '\u2022', x0 + 1, y, 7, '#8a5a3a', 'left', FONT_BODY, 700, false); text(ctx, l.s, x0 + 8, y, 7, INK2, 'left', FONT_BODY, 600, false); }
            else if (l.kind === 'cont') text(ctx, l.s, x0 + 8, y, 7, INK2, 'left', FONT_BODY, 600, false);
            else if (l.kind === 'body') text(ctx, l.s, x0, y, 7, INK2, 'left', FONT_BODY, 600, false);
          });
        });
        text(ctx, `${spread + 1} / ${spreads()}`, BX + BW - 18, BY + BH - 10, 6.5, '#8a6a4a', 'right', FONT_BODY, 600, false);
        hint(ctx, spread < spreads() - 1 ? '\u2190 \u2192 turn the page \u00b7 Esc close' : 'Enter or Esc to close');
      },
    };
  }

  helpScreen(overlay: boolean): Screen {
    const self = this, g = this.g;
    const BX = 36, BY = 14, BW = 408, BH = 244, L = BX + 20, R = BX + BW / 2 + 16;
    return {
      t: 0, overlay,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'confirm') { self.push(self.controlsScreen(overlay)); return; }
        }
      },
      pointer(_x, _y, click) { if (click) self.push(self.controlsScreen(overlay)); },
      render(ctx) {
        ctx.fillStyle = overlay ? 'rgba(4,2,6,0.6)' : 'rgba(4,2,6,0.8)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        book(ctx, BX, BY, BW, BH, 33);
        heading(ctx, 'Controls', L, 40, 11, INK, 'left', false);
        const pad = g.input.usingPad, b = g.save.data.settings.bindings, one = (a: Action) => [bindLabel(a)];
        const rows: [string, string[]][] = pad
          ? [['Move', ['L-stick']], ['Fire', ['R-stick', 'A B X Y']], ['Active item', ['RB']], ['Bomb', ['LB']], ['Page / sweet', ['LT']], ['Pause', ['Start']]]
          : [
            ['Move', [b.moveUp, b.moveLeft, b.moveDown, b.moveRight].map((c) => keyLabel(c[0] ?? ''))],
            ['Fire', [b.shootUp, b.shootLeft, b.shootDown, b.shootRight].map((c) => keyLabel(c[0] ?? ''))],
            ['Steady (slow, precise)', one('focus')], ['Cherry bomb', one('bomb')], ['Active item / interact', one('active')],
            ['Page / sweet', one('consumable')], ['Swap pocket item', one('swap')], ['Drop charm (hold)', one('drop')],
            ['Map & item info (hold)', one('map')], ['Pause', one('pause')],
          ];
        rows.forEach(([label, caps], i) => { const y = 58 + i * 16; text(ctx, label, L, y, 7.5, INK2, 'left', FONT_BODY, 600, false); keycaps(ctx, caps, L + 170, y + 1); });
        text(ctx, 'Hold fire to charge beams, sprays and swings when you have them.', L, BY + BH - 24, 6.5, INK2, 'left', FONT_BODY, 600, false);
        text(ctx, `${pad ? 'A' : 'Enter'}: change key bindings`, L, BY + BH - 13, 6.5, '#8a2a2a', 'left', FONT_BODY, 700, false);
        // reading the house
        heading(ctx, 'Reading the house', R, 40, 11, INK, 'left', false);
        const doors: [string, string][] = [['treasure', 'Treasure: one curio'], ['shop', 'Shop: spend buttons'], ['boss', 'The chapter\'s keeper'], ['library', 'Library: pages and books'],
          ['deal', 'Inkwell: pay in hearts'], ['blessing', 'Chapel: a gift'], ['challenge', 'Challenge: a fight for a prize'], ['secret', 'Hidden: bomb the walls']];
        doors.forEach(([k, s], i) => { const y = 56 + i * 13; const sp = doorSymbol(k); if (sp) sp.draw(ctx, R + 5, y + 2); text(ctx, s, R + 14, y, 7, INK2, 'left', FONT_BODY, 600, false); });
        const H = pickupSprites().hud;
        const hearts: [Sprite, string][] = [[H.red, 'Red: refills when you heal'], [H.wax, 'Wax: extra, gone once lost'], [H.ink, 'Ink: extra, bursts when lost']];
        hearts.forEach(([sp, s], i) => { const y = 168 + i * 13; ctx.drawImage(sp.canvas, R, y - 7); text(ctx, s, R + 14, y, 7, INK2, 'left', FONT_BODY, 600, false); });
        text(ctx, 'Stand by a curio to read what it does to you.', R, BY + BH - 13, 6.5, INK2, 'left', FONT_BODY, 600, false);
        hint(ctx, `${pad ? 'A' : 'Enter'} to rebind · Esc back`);
      },
    };
  }

  // ------------------------------------------------------------ death & ending
  deathScreen(w: World): Screen {
    const self = this, g = this.g;
    let sel = 0; const items = ['Begin again', 'Return to the menu'];
    const BX = 36, BY = 16, BW = 408, BH = 240, L = BX + 20, R = BX + BW / 2 + 16, cx = BX + BW / 4;
    const act = () => {
      if (sel === 0) g.fadeTo(() => { self.stack = []; g.newRun(w.run.charId, undefined, w.run.challenge); }, 0.5);
      else g.fadeTo(() => g.quitToMenu(), 0.5);
    };
    return {
      t: 0,
      update(keys) {
        if (this.t < 1) return;
        for (const k of keys) {
          if (k === 'up' || k === 'down') { sel = 1 - sel; self.sfxMove(); }
          if (k === 'confirm') act();
        }
      },
      pointer(x, y, click, moved) {
        if (this.t < 1) return;
        items.forEach((_, i) => { const iy = BY + BH - 36 + i * 16; if (x > R - 4 && x < R + 170 && y > iy - 11 && y < iy + 5) { if (moved && sel !== i) { sel = i; self.sfxMove(); } if (click) { sel = i; act(); } } });
      },
      render(ctx) {
        const a = clamp(this.t * 1.2, 0, 1), r = w.run;
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(4,2,6,0.8)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        book(ctx, BX, BY + (1 - ease.outCubic(a)) * 10, BW, BH, 13);
        // left page: who fell, where, and to what
        const c = CHARACTERS.find((ch) => ch.id === r.charId) ?? CHARACTERS[0];
        heading(ctx, 'The story ends here', cx, 44, 13, INK, 'center', false);
        ctx.save(); ctx.translate(cx, 112); ctx.scale(2, 2); ctx.filter = 'grayscale(0.85) sepia(0.35) brightness(0.9)';
        drawReader(ctx, self.sprites(c), c, 0); ctx.restore();
        ctx.fillStyle = 'rgba(60,40,24,0.18)'; ctx.beginPath(); ctx.ellipse(cx, 114, 20, 4, 0, 0, TAU); ctx.fill();
        text(ctx, `${c.name} fell in ${w.floor.theme.name}`, cx, 134, 8, INK2, 'center', FONT_BODY, 600, false);
        text(ctx, `to ${r.stats.deathCause ?? 'something in the dark'}.`, cx, 145, 8, '#8a2a2a', 'center', FONT_BODY, 700, false);
        // how far the story got: one mark per chapter, a cross where it stopped
        const n = r.floorIndex + 1, sp = Math.min(22, 150 / Math.max(1, n)), x0 = cx - ((n - 1) * sp) / 2;
        for (let i = 0; i < n; i++) {
          const x = x0 + i * sp, last = i === n - 1;
          if (i > 0) { ctx.fillStyle = 'rgba(90,60,40,0.4)'; ctx.fillRect(x - sp + 5, 165.5, sp - 10, 0.6); }
          text(ctx, roman(i + 1), x, 168, 7, last ? '#8a2a2a' : INK2, 'center', FONT_TITLE, 400, false);
          if (last) { ctx.fillStyle = 'rgba(138,42,42,0.85)'; ctx.fillRect(x - 6, 165, 12, 1); ctx.fillRect(x - 2, 173, 4, 1); }
        }
        const sc = r.flags.score as { score: number; best: number; isBest: boolean } | undefined;
        if (sc) {
          text(ctx, `Score ${sc.score}`, cx, 192, 11, INK, 'center', FONT_TITLE, 400, false);
          text(ctx, sc.isBest ? 'A new personal best' : `Best ${sc.best}`, cx, 202, 7, sc.isBest ? '#8a2a2a' : INK2, 'center', FONT_BODY, 600, false);
        }
        unlockedThisRun(ctx, r.flags.unlockedNow, cx, 216);
        // right page: the ledger, the build, and what next
        heading(ctx, 'Ledger', R, 44, 11, INK, 'left', false);
        const st: [string, string][] = [['Time', fmtTime(r.stats.time)], ['Enemies defeated', String(r.stats.kills)], ['Rooms cleared', String(r.stats.roomsCleared)], ['Secrets found', String(r.stats.secretsFound)], ['Damage taken', `${r.stats.damageTaken / 2} hearts`], ['Seed', formatSeed(r.seed)]];
        st.forEach(([k, v], i) => ledgerRow(ctx, k, v, R, R + 168, 60 + i * 11));
        text(ctx, 'Curios carried', R, 136, 8, INK2, 'left', FONT_TITLE, 400, false);
        const ids = [...w.player.itemOrder, ...(w.player.active ? [w.player.active] : [])];
        if (!ids.length) text(ctx, 'None.', R, 150, 7, 'rgba(90,70,54,0.7)', 'left', FONT_BODY, 600, false);
        ids.slice(0, 27).forEach((id, i) => ctx.drawImage(itemIconCanvas(id), R + (i % 9) * 19, 141 + Math.floor(i / 9) * 19));
        items.forEach((it, i) => {
          const y = BY + BH - 36 + i * 16;
          if (i === sel) inkBlot(ctx, R + 70, y - 3.5, 160, 14, self.time, 'rgba(40,30,60,0.17)');
          text(ctx, it, R + (i === sel ? 4 : 0), y, i === sel ? 10.5 : 9.5, i === sel ? INK : INK2, 'left', FONT_TITLE, 400, false);
        });
        ctx.globalAlpha = 1;
      },
    };
  }
  endingScreen(w: World): Screen {
    const g = this.g;
    const end = ENDING_BY_ID[(w.run.flags.ending as EndingId) ?? 'morning'] ?? ENDING_BY_ID.morning;
    const epilogue = EPILOGUES[w.run.charId] ?? '';
    const fresh = !!w.run.flags.newEnding;
    const found = g.save.data.endings?.length ?? 0;
    // the next ending still to find, and its clue: a reason to pick the book up again
    const next = ENDINGS.find((e) => !g.save.hasEnding(e.id));
    // lay the story out once: wrapped lines, each fading in after the last
    let laid: { s: string; y: number; at: number; big: boolean; dim?: boolean }[] | null = null;
    let doneAt = 0;
    const layout = (ctx: CanvasRenderingContext2D) => {
      laid = []; let y = 74, at = 0.8;
      end.lines.forEach((l, i) => {
        const big = i === end.key;
        const ls = wrap(ctx, l, big ? 12 : 9.5, 380, big ? FONT_TITLE : FONT_BODY);
        for (const s2 of ls) { laid!.push({ s: s2, y, at, big }); y += big ? 15 : 12.5; }
        y += 5; at += 2.1;
      });
      if (epilogue) for (const s2 of wrap(ctx, epilogue, 8, 360)) { laid.push({ s: s2, y: y + 2, at, big: false, dim: true }); y += 10.5; }
      doneAt = at + 1.2;
    };
    return {
      t: 0,
      update(keys) { if (this.t > 4 && keys.includes('confirm')) g.fadeTo(() => g.quitToMenu(), 0.8); },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.84)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        if (!laid) layout(ctx);
        ctx.globalAlpha = clamp(this.t * 1.5, 0, 1);
        text(ctx, `Ending ${end.num}`, VIEW_W / 2, 34, 7.5, COL.gold, 'center', FONT_BODY, 700);
        text(ctx, end.name, VIEW_W / 2, 52, 17, '#efe2c8', 'center', FONT_TITLE, 400);
        for (const l of laid!) {
          ctx.globalAlpha = clamp((this.t - l.at) * 0.9, 0, 1);
          text(ctx, l.s, VIEW_W / 2, l.y, l.big ? 12 : l.dim ? 8 : 9.5, l.dim ? 'rgba(200,185,165,0.75)' : l.big ? '#f4dca8' : '#e6d6bc', 'center', l.big ? FONT_TITLE : FONT_BODY, l.big ? 400 : 600);
        }
        ctx.globalAlpha = clamp(this.t - doneAt, 0, 1);
        const ey = Math.max(170, (laid!.length ? laid![laid!.length - 1].y : 150) + 22);
        text(ctx, 'THE END', VIEW_W / 2, ey, 18, '#c8a878', 'center', FONT_TITLE, 400);
        text(ctx, fresh ? `A new ending. ${found} of ${ENDINGS.length} found.` : `${found} of ${ENDINGS.length} endings found.`, VIEW_W / 2, ey + 12, 7, fresh ? COL.gold : COL.dim, 'center');
        text(ctx, `${fmtTime(w.run.stats.time)} · ${w.run.stats.kills} enemies · Seed ${formatSeed(w.run.seed)}`, VIEW_W / 2, ey + 22, 7, COL.dim, 'center');
        const sc = w.run.flags.score as { score: number; best: number; isBest: boolean } | undefined;
        if (sc && ey + 40 < VIEW_H - 16) {
          text(ctx, `Score ${sc.score}`, VIEW_W / 2, ey + 36, 10, '#efe2c8', 'center', FONT_TITLE, 400);
          text(ctx, sc.isBest ? 'New personal best!' : `Best ${sc.best}`, VIEW_W / 2, ey + 45, 6.5, sc.isBest ? COL.gold : COL.dim, 'center');
        }
        if (ey + 80 < VIEW_H - (next ? 28 : 14)) unlockedThisRun(ctx, w.run.flags.unlockedNow, VIEW_W / 2, ey + 58, COL.gold, '#e6d6bc');
        if (next) text(ctx, `Ending ${next.num} is still out there. ${next.clue}`, VIEW_W / 2, VIEW_H - 22, 6.5, 'rgba(220,200,160,0.8)', 'center');
        ctx.globalAlpha = 1;
        if (this.t > 4) hint(ctx, 'Press Enter');
      },
    };
  }

  /** Every ending: the ones you've seen, and a nudge toward the rest. */
  endingsScreen(): Screen {
    const self = this, g = this.g;
    let sel = 0;
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back' || k === 'confirm') { self.pop(); return; }
          if (k === 'up' || k === 'left') { sel = (sel + ENDINGS.length - 1) % ENDINGS.length; self.sfxMove(); }
          if (k === 'down' || k === 'right') { sel = (sel + 1) % ENDINGS.length; self.sfxMove(); }
        }
      },
      pointer(x, y, click, _m, wheel) {
        if (wheel) { sel = clamp(sel + wheel, 0, ENDINGS.length - 1); return; }
        const i = Math.floor((y - 48) / 34);
        if (x > 30 && x < 200 && i >= 0 && i < ENDINGS.length && i !== sel) { sel = i; self.sfxMove(); }
        if (click && x > 30 && x < 200 && i >= 0 && i < ENDINGS.length) sel = i;
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 20, 14, 440, 244, 1, 21);
        heading(ctx, 'Endings', 40, 38, 12, INK, 'left');
        const seen = (id: string) => g.save.hasEnding(id);
        text(ctx, `${ENDINGS.filter((e) => seen(e.id)).length} / ${ENDINGS.length}`, 190, 38, 8, INK2, 'right', FONT_BODY, 600, false);
        ENDINGS.forEach((e, i) => {
          const y = 56 + i * 34, on = i === sel, got = seen(e.id);
          if (on) inkBlot(ctx, 115, y + 6, 178, 30, self.time, 'rgba(40,30,60,0.14)');
          text(ctx, roman(e.num), 44, y + 9, 12, got ? '#8a2a2a' : '#a89a8a', 'left', FONT_TITLE, 400, false);
          text(ctx, got ? e.name : '? ? ?', 64, y + 6, 10, got ? INK : '#8a7a6a', 'left', FONT_TITLE, 400, false);
          text(ctx, got ? 'Seen' : 'Not yet', 64, y + 15, 6.5, INK2, 'left', FONT_BODY, 600, false);
        });
        const e = ENDINGS[sel], got = seen(e.id);
        const X = 226, Wd = 214;
        text(ctx, `Ending ${e.num}`, X, 46, 7, INK2, 'left', FONT_BODY, 700, false);
        text(ctx, got ? e.name : '? ? ?', X, 62, 13, INK, 'left', FONT_TITLE, 400, false);
        let y = 80;
        if (got) {
          for (const l of e.lines) { for (const s2 of wrap(ctx, l, 7.5, Wd)) { text(ctx, s2, X, y, 7.5, INK, 'left', FONT_BODY, 600, false); y += 9.5; } y += 3; }
        } else {
          for (const s2 of wrap(ctx, e.clue, 8, Wd)) { text(ctx, s2, X, y, 8, '#6a3a2a', 'left', FONT_BODY, 600, false); y += 10.5; }
        }
        hint(ctx, '↑/↓ browse · Esc back');
      },
    };
  }

  /** Grandfather's notes, in the order they were written. Unread ones are blank with a hint where to look. */
  notesScreen(): Screen {
    const self = this, g = this.g;
    let sel = 0, scroll = 0;
    const VIS = 15;
    const follow = () => { if (sel < scroll) scroll = sel; if (sel >= scroll + VIS) scroll = sel - VIS + 1; };
    const where = (n: NoteDef) => n.where?.includes('hospital') ? 'Found only up the back stair.' : n.req ? 'Turns up later in the story.' : 'Found lying around in the book.';
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back' || k === 'confirm') { self.pop(); return; }
          if (k === 'up') { sel = Math.max(0, sel - 1); self.sfxMove(); }
          if (k === 'down') { sel = Math.min(NOTES.length - 1, sel + 1); self.sfxMove(); }
        }
        follow();
      },
      pointer(x, y, click, _m, wheel) {
        if (wheel) { scroll = clamp(scroll + wheel, 0, Math.max(0, NOTES.length - VIS)); sel = clamp(sel, scroll, scroll + VIS - 1); return; }
        const i = Math.floor((y - 50) / 12.5) + scroll;
        if (x > 30 && x < 196 && i >= scroll && i < Math.min(NOTES.length, scroll + VIS)) { if (i !== sel) { sel = i; self.sfxMove(); } }
        void click;
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 20, 14, 440, 244, 1, 23);
        heading(ctx, 'Notes', 40, 38, 12, INK, 'left');
        text(ctx, 'in Grandfather\'s hand', 41, 47, 6.5, INK2, 'left', FONT_BODY, 600, false);
        const read = (n: NoteDef) => g.save.hasNote(n.id);
        text(ctx, `${NOTES.filter(read).length} / ${NOTES.length}`, 196, 38, 8, INK2, 'right', FONT_BODY, 600, false);
        if (g.save.isUnlocked('notes_all')) { ctx.fillStyle = '#c89a2a'; ctx.fillRect(28, 14, 5, 22); }
        NOTES.slice(scroll, scroll + VIS).forEach((n, k) => {
          const i = k + scroll, y = 56 + k * 12.5, on = i === sel;
          if (on) inkBlot(ctx, 112, y - 3, 170, 12, self.time, 'rgba(40,30,60,0.14)');
          text(ctx, `${i + 1}.`, 44, y, 7, INK2, 'left', FONT_BODY, 600, false);
          text(ctx, read(n) ? n.title : '· · ·', 58, y, 8, read(n) ? INK : '#9a8a7a', 'left', FONT_TITLE, 400, false);
        });
        if (scroll > 0) text(ctx, '▲', 112, 47, 6, INK2, 'center', FONT_BODY, 600, false);
        if (scroll + VIS < NOTES.length) text(ctx, '▼ more', 112, 250, 6, INK2, 'center', FONT_BODY, 600, false);
        const n = NOTES[sel], X = 216, Wd = 224;
        if (read(n)) {
          text(ctx, n.title, X, 56, 12, INK, 'left', FONT_TITLE, 400, false);
          let y = 74;
          for (const s2 of wrap(ctx, n.text, 8, Wd)) { text(ctx, s2, X, y, 8, '#3a2a40', 'left', FONT_BODY, 600, false); y += 10.5; }
          text(ctx, '— ' + (n.by ?? 'Grandfather'), X + Wd, y + 8, 7.5, INK2, 'right', FONT_BODY, 600, false);
        } else {
          text(ctx, 'Not yet read', X, 56, 12, '#8a7a6a', 'left', FONT_TITLE, 400, false);
          text(ctx, where(n), X, 74, 8, '#6a3a2a', 'left', FONT_BODY, 600, false);
        }
        hint(ctx, '↑/↓ or wheel to browse · Esc back');
      },
    };
  }
}
void CONSUMABLES; void getItem; void measure;

/**
 * Completion marks, like Isaac's: one symbol per ending, filled once this reader has reached it
 * (cream on Normal, red on Second Edition).
 */
const MARK_ICONS: Record<string, (c: CanvasRenderingContext2D, x: number, y: number) => void> = {
  morning: (c, x, y) => { c.beginPath(); c.arc(x, y, 2.6, 0, TAU); c.fill(); for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; c.fillRect(x + Math.cos(a) * 4.3 - 0.5, y + Math.sin(a) * 4.3 - 0.5, 1, 1); } },
  own_hand: (c, x, y) => { c.beginPath(); c.arc(x, y + 1.2, 3, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x - 2.4, y); c.lineTo(x, y - 4.6); c.lineTo(x + 2.4, y); c.fill(); },
  for_marcus: (c, x, y) => { c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * TAU, r = k % 2 ? 1.9 : 4.4; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); },
  the_visit: (c, x, y) => { c.beginPath(); c.arc(x - 1.6, y - 1, 2, Math.PI, 0); c.arc(x + 1.6, y - 1, 2, Math.PI, 0); c.lineTo(x, y + 3.6); c.closePath(); c.fill(); },
  goodnight: (c, x, y) => { c.beginPath(); c.arc(x, y, 4, 0.6, TAU - 0.6 + Math.PI * 0.0, false); c.arc(x + 2, y - 0.8, 3, TAU - 0.9, 0.9, true); c.fill(); },
};
function drawMarks(ctx: CanvasRenderingContext2D, g: Game, char: string, cx: number, y: number): void {
  const won = (char === 'marcus' ? g.save.isUnlocked('beat_final') : g.save.isUnlocked('win_' + char));
  text(ctx, 'MARKS', cx, y - 9, 5.5, INK2, 'center', FONT_BODY, 700, false);
  ENDINGS.forEach((e, i) => {
    const x = cx + (i - 2) * 15;
    const hard = g.save.hasMark(char, e.id + ':hard');
    const done = hard || g.save.hasMark(char, e.id) || (e.id === 'morning' && won);
    ctx.fillStyle = done ? 'rgba(60,40,30,0.85)' : 'rgba(60,40,30,0.12)';
    ctx.beginPath(); ctx.roundRect(x - 6.5, y - 6.5, 13, 13, 2.5); ctx.fill();
    ctx.fillStyle = hard ? '#ff5060' : done ? '#f4ead2' : 'rgba(90,60,40,0.3)';
    MARK_ICONS[e.id]?.(ctx, x, y);
  });
}

/** Draw an enemy's first idle frame fitted into a square (black silhouette if unknown). */
/** A group of cells in a GridView, drawn under its own heading. */
interface GridGroup { label: string; note: string; color: string; ids: number[] }

/**
 * A scrolling grid of icons split into labelled groups, with a visible scrollbar, fades at the edges
 * when there's more to see, mouse-wheel scrolling and hover/click selection.
 */
class GridView {
  cells: { id: number; x: number; y: number }[] = [];
  heads: { g: GridGroup; y: number }[] = [];
  height = 0; scroll = 0; sel = 0;
  constructor(groups: GridGroup[], public cols: number, public size: number, public x0: number, public top: number, public viewH: number) {
    let y = 0;
    for (const g of groups) {
      this.heads.push({ g, y }); y += 12;
      g.ids.forEach((id, i) => { this.cells.push({ id, x: x0 + (i % cols) * size, y: y + Math.floor(i / cols) * size }); });
      y += Math.ceil(g.ids.length / cols) * size + 4;
    }
    this.height = y;
  }
  selected(): number { return this.cells[this.sel]?.id ?? 0; }
  private maxScroll(): number { return Math.max(0, this.height - this.viewH); }
  private reveal(): void {
    const c = this.cells[this.sel]; if (!c) return;
    const head = this.heads.find((h) => h.y + 12 === c.y);
    const top = head ? head.y : c.y - 2;
    if (top < this.scroll) this.scroll = top;
    if (c.y + this.size > this.scroll + this.viewH) this.scroll = c.y + this.size - this.viewH;
    this.scroll = clamp(this.scroll, 0, this.maxScroll());
  }
  move(k: MenuKey): void {
    const c = this.cells[this.sel]; if (!c) return;
    if (k === 'left') this.sel = Math.max(0, this.sel - 1);
    else if (k === 'right') this.sel = Math.min(this.cells.length - 1, this.sel + 1);
    else {
      // the nearest cell in the next row up or down, even across a group heading
      const rows = this.cells.filter((o) => (k === 'up' ? o.y < c.y : o.y > c.y));
      if (rows.length) {
        const ry = k === 'up' ? Math.max(...rows.map((o) => o.y)) : Math.min(...rows.map((o) => o.y));
        let best = -1, bd = 1e9;
        this.cells.forEach((o, i) => { if (o.y === ry && Math.abs(o.x - c.x) < bd) { bd = Math.abs(o.x - c.x); best = i; } });
        if (best >= 0) this.sel = best;
      }
    }
    this.reveal();
  }
  wheel(n: number): void { this.scroll = clamp(this.scroll + n * this.size * 1.5, 0, this.maxScroll()); }
  /** Returns true when the selection changed. */
  pointer(x: number, y: number, click: boolean, moved: boolean): boolean {
    // scrollbar: click or hover-drag along the track
    const bx = this.x0 + this.cols * this.size + 4;
    if (click && x >= bx - 3 && x <= bx + 8 && y >= this.top && y <= this.top + this.viewH && this.maxScroll() > 0) {
      this.scroll = clamp(((y - this.top) / this.viewH) * this.height - this.viewH / 2, 0, this.maxScroll()); return false;
    }
    if (!moved && !click) return false;
    if (y < this.top || y > this.top + this.viewH) return false;
    const vy = y - this.top + this.scroll;
    const i = this.cells.findIndex((c) => x >= c.x - 1 && x < c.x - 1 + this.size && vy >= c.y - 1 && vy < c.y - 1 + this.size);
    if (i >= 0 && i !== this.sel) { this.sel = i; return true; }
    return false;
  }
  render(ctx: CanvasRenderingContext2D, cell: (ctx: CanvasRenderingContext2D, id: number, x: number, y: number, size: number, on: boolean) => void): void {
    const right = this.x0 + this.cols * this.size;
    ctx.save();
    ctx.beginPath(); ctx.rect(this.x0 - 4, this.top - 2, right - this.x0 + 6, this.viewH + 2); ctx.clip();
    for (const h of this.heads) {
      const y = this.top + h.y - this.scroll;
      if (y < this.top - 14 || y > this.top + this.viewH) continue;
      text(ctx, h.g.label, this.x0, y + 8, 7.5, h.g.color, 'left', FONT_TITLE, 400, false);
      const lw = measure(ctx, h.g.label, 7.5, FONT_TITLE, 400);
      text(ctx, h.g.note, right - 2, y + 8, 6, INK2, 'right', FONT_BODY, 600, false);
      ctx.fillStyle = 'rgba(90,60,40,0.25)'; ctx.fillRect(this.x0 + lw + 5, y + 5.5, right - this.x0 - lw - 5 - measure(ctx, h.g.note, 6) - 8, 0.6);
    }
    this.cells.forEach((c, i) => {
      const y = this.top + c.y - this.scroll;
      if (y < this.top - this.size || y > this.top + this.viewH) return;
      cell(ctx, c.id, c.x, y, this.size, i === this.sel);
    });
    ctx.restore();
    // fades and a scrollbar make it obvious there's more below (or above)
    const max = this.maxScroll();
    if (max <= 0) return;
    const fade = (y: number, up: boolean) => {
      const gr = ctx.createLinearGradient(0, y, 0, y + (up ? 12 : -12));
      gr.addColorStop(0, 'rgba(230,218,189,0.95)'); gr.addColorStop(1, 'rgba(230,218,189,0)');
      ctx.fillStyle = gr; ctx.fillRect(this.x0 - 4, up ? y : y - 12, right - this.x0 + 6, 12);
    };
    if (this.scroll > 1) fade(this.top - 2, true);
    if (this.scroll < max - 1) fade(this.top + this.viewH, false);
    const bx = right + 4, th = Math.max(16, (this.viewH * this.viewH) / this.height), ty = this.top + (this.scroll / max) * (this.viewH - th);
    ctx.fillStyle = 'rgba(90,60,40,0.18)'; ctx.fillRect(bx, this.top, 4, this.viewH);
    ctx.fillStyle = 'rgba(110,50,40,0.75)'; ctx.fillRect(bx, ty, 4, th);
    if (this.scroll > 1) text(ctx, '▲', bx + 2, this.top - 3, 6, '#8a3a2a', 'center', FONT_BODY, 700, false);
    if (this.scroll < max - 1) {
      text(ctx, '▼', bx + 2, this.top + this.viewH + 7, 6, '#8a3a2a', 'center', FONT_BODY, 700, false);
      text(ctx, 'scroll for more', right - 2, this.top + this.viewH + 7, 6, '#8a3a2a', 'right', FONT_BODY, 700, false);
    }
  }
}

function drawBeast(ctx: CanvasRenderingContext2D, d: EnemyDef, x: number, y: number, size: number, hidden: boolean): void {
  let spr: Sprite | undefined;
  try { const set = getSprites(d); spr = (set.portrait ?? set.idle ?? Object.values(set)[0])?.[0]; } catch { spr = undefined; }
  if (!spr) return;
  const c = spr.canvas, k = Math.min(size / c.width, size / c.height, 2);
  const w = Math.round(c.width * k), h = Math.round(c.height * k);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (hidden) { ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.3; }
  ctx.drawImage(c, Math.round(x + (size - w) / 2), Math.round(y + (size - h) / 2), w, h);
  ctx.restore();
}

/** A reader standing at (0, 0), with whatever they always wear (a braid, a beard, wings if they fly). */
function drawReader(ctx: CanvasRenderingContext2D, sp: PlayerSprites, c: CharacterDef, t: number): void {
  const body = (c.flight ? sp.fly : sp.bodyIdle).down[Math.floor(t * 1.5) % 2], head = sp.head.down[(t % 4) < 0.15 ? 'blink' : 'normal'];
  const acc = costumeFor([], [], [], !!c.flight, c.look).acc;
  const fr: Frame = { ctx, t, hx: -head.ox, hy: -10 - head.oy, hw: head.w, hflip: false, hdir: 'down', bx: -body.ox, by: -body.oy, bw: body.w, bflip: false, bdir: 'down' };
  drawCostume(fr, acc, 'back');
  body.draw(ctx, 0, 0); drawCostume(fr, acc, 'body'); drawCostume(fr, acc, 'hand');
  head.draw(ctx, 0, -10); drawCostume(fr, acc, 'face'); drawCostume(fr, acc, 'head');
}
