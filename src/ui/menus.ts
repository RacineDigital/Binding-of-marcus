// Front-end and overlay menus. Keyboard and controller navigable; drawn crisp over an animated scene.
import type { Game } from '../game/game';
import type { World } from '../game/world';
import { MenuKey, ACTION_ORDER, ACTION_LABELS, keyLabel, DEFAULT_BINDINGS, Action, bindLabel } from '../core/input';
import { text, COL, FONT_TITLE, FONT_BODY, wrap, measure, heading, panel } from './draw';
import { VIEW_W, VIEW_H } from '../core/constants';
import { CHARACTERS, CharacterDef } from '../player/characters';
import { buildPlayerSprites, PlayerSprites } from '../art/marcus';
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

export interface Screen {
  update(keys: MenuKey[], dt: number): void; render(ctx: CanvasRenderingContext2D): void; t: number; overlay?: boolean;
  /** Optional mouse support: hover / click / wheel in virtual coordinates. */
  pointer?(x: number, y: number, click: boolean, moved: boolean, wheel: number): void;
}

const INK = '#2a1e18', INK2 = '#5a4636', PAPER = '#e6dabd';

/** Parchment page panel with burnt edges. */
function page(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 1, seed = 3): void {
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 3, y + 4, w, h);
  let s = seed; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  ctx.beginPath(); ctx.moveTo(x, y);
  for (let i = 1; i <= 20; i++) ctx.lineTo(x + (w * i) / 20, y + r() * 1.5);
  for (let i = 1; i <= 14; i++) ctx.lineTo(x + w - r() * 1.5, y + (h * i) / 14);
  for (let i = 19; i >= 0; i--) ctx.lineTo(x + (w * i) / 20, y + h - r() * 1.5);
  for (let i = 13; i >= 1; i--) ctx.lineTo(x + r() * 1.5, y + (h * i) / 14);
  ctx.closePath();
  ctx.fillStyle = PAPER; ctx.fill();
  ctx.save(); ctx.clip();
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(120,90,50,0)'); g.addColorStop(1, 'rgba(90,60,30,0.35)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(110,80,50,0.07)';
  for (let i = 0; i < 90; i++) ctx.fillRect(x + r() * w, y + r() * h, 1 + r() * 4, 0.5);
  ctx.restore();
  ctx.strokeStyle = 'rgba(70,45,25,0.6)'; ctx.lineWidth = 0.6; ctx.stroke();
  // a book-cover frame: double rule with diamonds at the corners
  ctx.strokeStyle = 'rgba(95,62,32,0.32)'; ctx.lineWidth = 0.6; ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);
  ctx.strokeStyle = 'rgba(95,62,32,0.18)'; ctx.lineWidth = 0.4; ctx.strokeRect(x + 8.5, y + 8.5, w - 17, h - 17);
  ctx.fillStyle = 'rgba(95,62,32,0.45)';
  for (const [cx, cy] of [[x + 6, y + 6], [x + w - 6, y + 6], [x + 6, y + h - 6], [x + w - 6, y + h - 6]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy - 2.4); ctx.lineTo(cx + 2.4, cy); ctx.lineTo(cx, cy + 2.4); ctx.lineTo(cx - 2.4, cy); ctx.fill();
  }
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
        sp.bodyIdle.down[Math.floor(self.time * 1.5) % 2].draw(ctx, 0, 0);
        sp.head.down[(self.time % 4) < 0.15 ? 'blink' : 'normal'].draw(ctx, 0, -10);
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
          if ((k === 'left' || k === 'right') && row === 0 && !forceChar) { ci = (ci + (k === 'left' ? -1 : 1) + CHARACTERS.length) % CHARACTERS.length; self.sfxMove(); }
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
        sp.bodyIdle.down[Math.floor(self.time * 1.5) % 2].draw(ctx, 0, 0);
        sp.head.down[(self.time % 4) < 0.15 ? 'blink' : 'normal'].draw(ctx, 0, -10);
        ctx.restore();
        if (!forceChar) { text(ctx, '◀', 62, 112, 12, INK2, 'center', FONT_BODY, 600, false); text(ctx, '▶', 158, 112, 12, INK2, 'center', FONT_BODY, 600, false); }
        // info
        const x0 = 190;
        text(ctx, un ? c.name : '???', x0, 70, 20, INK, 'left', FONT_TITLE, 400, false);
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
          for (let i = 0; i < (c.health.brass ?? 0); i++) { ctx.drawImage(H.brass.canvas, hx, hy); hx += 11; }
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
        if (row === 0) text(ctx, '— character —', 110, 186, 7, INK2, 'center', FONT_BODY, 600, false);
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
    let sel = 0;
    return {
      t: 0,
      update(keys) {
        for (const k of keys) {
          if (k === 'back') { self.pop(); return; }
          if (k === 'left' || k === 'right' || k === 'up' || k === 'down') { sel = (sel + (k === 'left' || k === 'up' ? -1 : 1) + CHARACTERS.length) % CHARACTERS.length; self.sfxMove(); }
          if (k === 'confirm') { const c = CHARACTERS[sel]; if (!c.unlock || g.save.isUnlocked(c.unlock)) self.push(self.newRunScreen(null, c.id)); else g.audio.play('deny'); }
        }
      },
      render(ctx) {
        ctx.fillStyle = 'rgba(4,2,6,0.55)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 30, 20, 420, 228, 1, 11);
        heading(ctx, 'The Readers', 240, 44, 13, INK);
        CHARACTERS.forEach((c, i) => {
          const x = 70 + i * 85, y = 120;
          const un = !c.unlock || g.save.isUnlocked(c.unlock);
          const sp = self.sprites(c);
          if (i === sel) inkBlot(ctx, x, y - 16, 60, 60, self.time, 'rgba(40,30,60,0.15)');
          ctx.save(); ctx.translate(x, y); ctx.scale(2, 2);
          if (!un) ctx.filter = 'brightness(0)';
          sp.bodyIdle.down[Math.floor(self.time * 1.5 + i) % 2].draw(ctx, 0, 0); sp.head.down.normal.draw(ctx, 0, -10);
          ctx.restore();
          text(ctx, un ? c.name : '???', x, y + 14, 10, INK, 'center', FONT_TITLE, 400, false);
        });
        const c = CHARACTERS[sel]; const un = !c.unlock || g.save.isUnlocked(c.unlock);
        wrap(ctx, un ? c.desc : 'Locked — ' + c.unlockHint, 8, 340).forEach((l, i) => text(ctx, l, 240, 168 + i * 10, 8, INK2, 'center', FONT_BODY, 600, false));
        if (un) text(ctx, c.passive, 240, 200, 7.5, '#4a3a6a', 'center', FONT_BODY, 600, false);
        hint(ctx, 'Enter to start a run · Esc back');
      },
    };
  }

  // ------------------------------------------------------------ collection
  collectionScreen(): Screen {
    const self = this, g = this.g;
    const all = ALL_ITEMS.filter((i) => i.id !== 'moth_wings_rev');
    const seen = new Set(g.save.data.itemsSeen);
    // What you've found comes first, gathered into sets (a transformation's items, then actives,
    // familiars and the rest); everything still missing waits at the end as silhouettes.
    const SET_TAGS = ['vamp', 'drain', 'jeffy', 'dice', 'moth', 'ink', 'clock', 'wax', 'thread', 'bone', 'void'];
    const setOf = (it: typeof all[number]) => SET_TAGS.find((t) => it.tags?.includes(t)) ?? (it.kind === 'active' ? 'active' : it.kind === 'familiar' ? 'familiar' : 'curio');
    const SET_NAME = (k: string) => k === 'dice' ? 'The Dice' : k === 'active' ? 'Active items' : k === 'familiar' ? 'Familiars' : k === 'curio' ? 'Curios' : `${TRANSFORM_EFFECTS[k]?.name ?? k} set`;
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
      } else {
        text(ctx, '???', dx, dy + 46, 14, INK2, 'left', FONT_TITLE, 400, false);
        const a = it.unlock ? ACHIEVEMENTS.find((x) => x.id === it.unlock) : null;
        if (a && !g.save.isUnlocked(a.id)) wrap(ctx, 'Locked: ' + a.desc, 7.5, 108).forEach((l, i) => text(ctx, l, dx, dy + 62 + i * 9, 7.5, '#8a3a2a', 'left', FONT_BODY, 600, false));
        else text(ctx, 'Not yet found.', dx, dy + 62, 7.5, INK2, 'left', FONT_BODY, 600, false);
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
      update(keys) { for (const k of keys) { if (k === 'back' || k === 'confirm') { self.pop(); return; } if (k === 'down') scroll = Math.min(ACHIEVEMENTS.length - 10, scroll + 1); if (k === 'up') scroll = Math.max(0, scroll - 1); } },
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
        ACHIEVEMENTS.slice(scroll, scroll + 10).forEach((a, i) => {
          const got = g.save.isUnlocked(a.id);
          const y = 54 + i * 19;
          text(ctx, (got ? '◆ ' : '◇ ') + (got || !a.hidden ? a.name : '???'), 230, y, 8.5, got ? INK : '#8a7a6a', 'left', FONT_TITLE, 400, false);
          text(ctx, got ? a.unlocks : (a.hidden ? 'A hidden achievement.' : a.desc), 238, y + 8, 6.5, INK2, 'left', FONT_BODY, 600, false);
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
    const step = (k: 'music' | 'sfx' | 'shake', d: number) => { const s = st(); s[k] = clamp(Math.round((s[k] + d) * 10) / 10, 0, 1); g.applySettings(); g.save.markDirty(); g.audio.play('coin', { vol: 0.5 }); };
    const opts: Opt[] = [
      { label: 'Music volume', value: () => pct(st().music), left: () => step('music', -0.1), right: () => step('music', 0.1) },
      { label: 'Effects volume', value: () => pct(st().sfx), left: () => step('sfx', -0.1), right: () => step('sfx', 0.1) },
      { label: 'Screen shake', value: () => pct(st().shake), left: () => step('shake', -0.1), right: () => step('shake', 0.1) },
      { label: 'Scaling', value: () => ({ sharp: 'Sharp (fit)', integer: 'Pixel perfect', stretch: 'Nearest (fit)' } as any)[st().scale], ok: () => { const m = ['sharp', 'integer', 'stretch'] as const; st().scale = m[(m.indexOf(st().scale) + 1) % 3]; g.applySettings(); g.save.markDirty(); } },
      { label: 'Fullscreen', value: () => (document.fullscreenElement ? 'On' : 'Off'), ok: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); } },
      { label: 'Item descriptions', value: () => (st().descStyle === 'card' ? 'Large card' : 'Compact (EID style)'), ok: () => { st().descStyle = st().descStyle === 'card' ? 'eid' : 'card'; g.save.markDirty(); } },
      ...((window as any).bomDesktop?.setPresence ? [{ label: 'Discord status', value: () => (st().discord !== false ? 'On' : 'Off'), ok: () => { st().discord = st().discord === false; g.save.markDirty(); } }] : []),
      { label: 'Run timer', value: () => (st().timer ? 'On' : 'Off'), ok: () => { st().timer = !st().timer; g.save.markDirty(); } },
      { label: 'Show items on HUD', value: () => (st().showItems !== false ? 'On' : 'Off'), ok: () => { st().showItems = st().showItems === false; g.save.markDirty(); } },
      { label: 'Show stats on HUD', value: () => (st().showStats ? 'On' : 'Off'), ok: () => { st().showStats = !st().showStats; g.save.markDirty(); } },
      { label: 'Motion smoothing', value: () => (st().interpolate !== false ? 'On' : 'Off'), ok: () => { st().interpolate = st().interpolate === false; g.save.markDirty(); } },
      { label: 'Frame rate cap', value: () => (st().fpsCap ? st().fpsCap + ' fps' : 'Display rate'), ok: () => { const caps = [0, 60, 120, 144, 165, 240]; st().fpsCap = caps[(caps.indexOf(st().fpsCap ?? 0) + 1) % caps.length]; g.save.markDirty(); } },
      { label: 'Show FPS', value: () => (st().showFps ? 'On' : 'Off'), ok: () => { st().showFps = !st().showFps; g.save.markDirty(); } },
      { label: 'Diagonal keyboard aiming', value: () => (st().diagonalAim ? 'On' : 'Off'), ok: () => { st().diagonalAim = !st().diagonalAim; g.applySettings(); g.save.markDirty(); } },
      { label: 'Fire button-drop chance', value: () => pct(st().fireDropChance), left: () => { st().fireDropChance = clamp(Math.round((st().fireDropChance - 0.05) * 100) / 100, 0, 0.5); g.save.markDirty(); }, right: () => { st().fireDropChance = clamp(Math.round((st().fireDropChance + 0.05) * 100) / 100, 0, 0.5); g.save.markDirty(); } },
      { label: 'Controls', value: () => '', ok: () => self.push(self.controlsScreen(overlay)) },
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
    const items = ['Resume', 'Options', 'Restart (same character)', 'Save & quit to menu'];
    let sel = 0;
    const scr: Screen = {
      t: 0,
      update(keys) {
        if (self.stack.length) return;
        for (const k of keys) {
          if (k === 'back') { g.paused = false; g.audio.duck(1, 0.01); return; }
          if (k === 'up' || k === 'down') { sel = (sel + (k === 'up' ? -1 : 1) + items.length) % items.length; self.sfxMove(); }
          if (k === 'confirm') {
            if (sel === 0) { g.paused = false; return; }
            if (sel === 1) { self.push(self.optionsScreen(true)); return; }
            if (sel === 2) { const c = g.world!.run.charId, ch = g.world!.run.challenge; g.paused = false; g.fadeTo(() => g.newRun(c, undefined, ch), 0.4); return; }
            if (sel === 3) { g.saveSnapshot(); g.save.flush(); g.fadeTo(() => g.quitToMenu(), 0.4); return; }
          }
        }
      },
      render(ctx) {
        const w = g.world; if (!w) return;
        // a deep, vignetted backdrop so the room (and any title card) falls away
        ctx.fillStyle = 'rgba(4,2,6,0.84)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 60, VIEW_W / 2, VIEW_H / 2, 300);
        vg.addColorStop(0, 'rgba(60,30,20,0.12)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        heading(ctx, 'Paused', 48, 46, 17, '#efe2c8', 'left');
        ctx.fillStyle = 'rgba(201,164,106,0.45)'; ctx.fillRect(48, 53, 150, 0.6);
        items.forEach((it, i) => {
          const y = 76 + i * 18;
          if (i === sel) inkBlot(ctx, 108, y - 3.5, 160, 16, self.time);
          text(ctx, it, 48 + (i === sel ? 4 : 0), y, i === sel ? 11 : 9.5, i === sel ? '#fff4dc' : '#b8a890', 'left', FONT_TITLE, 400);
        });
        // your controls, as currently bound
        const cx0 = 44, cy0 = 160;
        panel(ctx, cx0, cy0, 176, 92, 0.9);
        text(ctx, 'CONTROLS', cx0 + 8, cy0 + 11, 6.5, '#c9a46a', 'left', FONT_BODY, 600, false);
        const b = g.save.data.settings.bindings;
        const one = (a: Action) => [bindLabel(a)];
        const rows: [string, string[]][] = [
          ['Move', g.input.usingPad ? ['L-stick'] : [b.moveUp, b.moveLeft, b.moveDown, b.moveRight].map((c) => keyLabel(c[0] ?? ''))],
          ['Fire', g.input.usingPad ? ['R-stick'] : [b.shootUp, b.shootLeft, b.shootDown, b.shootRight].map((c) => keyLabel(c[0] ?? ''))],
          ['Bomb', one('bomb')], ['Active item', one('active')], ['Page / sweet', one('consumable')],
          ['Swap', one('swap')], ['Drop charm (hold)', one('drop')], ['Map & item info (hold)', one('map')],
        ];
        rows.forEach(([label, caps], i) => {
          const col = i < 4 ? 0 : 1, row = i % 4;
          const x = cx0 + 8 + col * 86, y = cy0 + 29 + row * 16;
          text(ctx, label, x, y, 6.5, COL.dim, 'left', FONT_BODY, 600, false);
          keycaps(ctx, caps, x + 79, y + 1);
        });
        // run info
        const r = w.run;
        const x0 = 246;
        panel(ctx, x0 - 10, 30, 214, 222, 0.75);
        text(ctx, w.floor.label, x0, 48, 10, '#e6d6bc', 'left', FONT_TITLE, 400);
        text(ctx, `Seed  ${formatSeed(r.seed)}`, x0, 62, 9, COL.gold, 'left', FONT_BODY, 600);
        const st: [string, string][] = [['Time', fmtTime(r.stats.time)], ['Enemies defeated', String(r.stats.kills)], ['Rooms cleared', String(r.stats.roomsCleared)], ['Secrets found', String(r.stats.secretsFound)], ['Damage taken', `${r.stats.damageTaken / 2} hearts`]];
        st.forEach(([k, v], i) => {
          const y = 80 + i * 12;
          if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,240,220,0.035)'; ctx.fillRect(x0 - 4, y - 8, 194, 11); }
          text(ctx, k, x0, y, 7.5, COL.dim); text(ctx, v, x0 + 186, y, 7.5, COL.text, 'right');
        });
        text(ctx, 'Curios', x0, 152, 8, COL.dim);
        const ids = [...w.player.itemOrder, ...(w.player.active ? [w.player.active] : [])];
        if (!ids.length) text(ctx, 'Nothing yet.', x0, 166, 7, 'rgba(168,156,140,0.6)');
        ids.forEach((id, i) => ctx.drawImage(itemIconCanvas(id), x0 + (i % 10) * 18, 156 + Math.floor(i / 10) * 18));
        if (w.player.transformations.size) text(ctx, [...w.player.transformations].map((t) => t[0].toUpperCase() + t.slice(1)).join(' · '), x0, 246, 7, '#c8a0ff');
        hint(ctx, `${bindLabel('pause')} to resume`);
      },
    };
    return scr;
  }

  // ------------------------------------------------------------ death & ending
  deathScreen(w: World): Screen {
    const self = this, g = this.g;
    let sel = 0; const items = ['Begin again', 'Return to the menu'];
    return {
      t: 0,
      update(keys) {
        if (this.t < 1) return;
        for (const k of keys) {
          if (k === 'up' || k === 'down') { sel = 1 - sel; self.sfxMove(); }
          if (k === 'confirm') {
            if (sel === 0) g.fadeTo(() => { self.stack = []; g.newRun(w.run.charId, undefined, w.run.challenge); }, 0.5);
            else g.fadeTo(() => g.quitToMenu(), 0.5);
          }
        }
      },
      render(ctx) {
        const a = clamp(this.t * 1.2, 0, 1);
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(4,2,6,0.75)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        page(ctx, 90, 18, 300, 236, a, 13);
        text(ctx, 'The story ends here', 240, 50, 18, INK, 'center', FONT_TITLE, 400, false);
        const r = w.run;
        text(ctx, `${CHARACTERS.find((c) => c.id === r.charId)?.name} fell in ${w.floor.theme.name}`, 240, 64, 8.5, INK2, 'center', FONT_BODY, 600, false);
        text(ctx, `to ${r.stats.deathCause ?? 'something in the dark'}.`, 240, 74, 8.5, '#8a2a2a', 'center', FONT_BODY, 600, false);
        const st: [string, string][] = [['Time', fmtTime(r.stats.time)], ['Enemies', String(r.stats.kills)], ['Rooms', String(r.stats.roomsCleared)], ['Secrets', String(r.stats.secretsFound)], ['Seed', formatSeed(r.seed)]];
        st.forEach(([k, v], i) => { text(ctx, k, 160, 92 + i * 10, 7.5, INK2, 'left', FONT_BODY, 600, false); text(ctx, v, 320, 92 + i * 10, 7.5, INK, 'right', FONT_BODY, 600, false); });
        const ids = [...w.player.itemOrder, ...(w.player.active ? [w.player.active] : [])];
        ids.slice(0, 26).forEach((id, i) => ctx.drawImage(itemIconCanvas(id), 125 + (i % 13) * 18, 146 + Math.floor(i / 13) * 18));
        const sc = r.flags.score as { score: number; best: number; isBest: boolean } | undefined;
        if (sc) {
          text(ctx, `Score ${sc.score}`, 240, 190, 11, INK, 'center', FONT_TITLE, 400, false);
          text(ctx, sc.isBest ? 'New personal best!' : `Best ${sc.best}`, 240, 199, 7, sc.isBest ? '#8a2a2a' : INK2, 'center', FONT_BODY, 600, false);
        }
        items.forEach((it, i) => {
          const y = 214 + i * 15;
          if (i === sel) inkBlot(ctx, 240, y - 3, 140, 14, self.time, 'rgba(40,30,60,0.2)');
          text(ctx, it, 240, y, 10, INK, 'center', FONT_TITLE, 400, false);
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
  try { const set = getSprites(d); spr = (set.idle ?? Object.values(set)[0])?.[0]; } catch { spr = undefined; }
  if (!spr) return;
  const c = spr.canvas, k = Math.min(size / c.width, size / c.height, 2);
  const w = Math.round(c.width * k), h = Math.round(c.height * k);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (hidden) { ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.3; }
  ctx.drawImage(c, Math.round(x + (size - w) / 2), Math.round(y + (size - h) / 2), w, h);
  ctx.restore();
}
