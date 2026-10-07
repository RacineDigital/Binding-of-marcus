// Steam store art made from the game itself, in Valve's sizes: gameplay screenshots (1920x1080), the
// store capsules and library images, the app icon, and an icon for every achievement (achieved and
// locked), plus steam/achievements.csv to enter them in Steamworks. Starts its own Vite server and
// drives the game in headless Chromium (CHROME_PATH to choose one).
//   npm run steam:media                       everything, into steam/media/
//   npm run steam:media -- shots capsules     only some groups: shots, capsules, achievements
// The capsules are a solid start, but Valve reviews them and they sell the game: replace them with
// commissioned key art when you can.
import { createServer } from 'vite';
import { chromium, type Browser, type Page } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { CHROME } from '../tests/browser';
import { ACHIEVEMENTS } from '../src/data/achievements';
import { GAME_VERSION } from '../src/core/constants';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'steam', 'media');
const groups = process.argv.slice(2);
const want = (g: string) => !groups.length || groups.includes(g);
const D = 'window.__bomDebug';
const ev = <T>(p: Page, js: string): Promise<T> => p.evaluate(js) as Promise<T>;
const write = (rel: string, data: Buffer | string) => {
  const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof data === 'string' ? Buffer.from(data.split(',')[1], 'base64') : data);
  console.log('  ' + path.relative(ROOT, f));
};

// A save with the story well under way (every reader and curio, but not the very last ending, which
// changes the cellar), the tutorial off, pixel-perfect scaling and no debug readouts.
const SEED_SAVE = `(() => {
  try {
    localStorage.clear();
    localStorage.setItem('bom:settings', JSON.stringify({ scale: 'integer', tutorial: false, showFps: false, timer: false, hudScale: 1, showStats: false, showItems: true, descStyle: 'card', seenVersion: ${JSON.stringify(GAME_VERSION)}, music: 0, sfx: 0 }));
    localStorage.setItem('bom:slot1', JSON.stringify({ version: 1, introSeen: true, unlocks: ${JSON.stringify(ACHIEVEMENTS.map((a) => a.id).filter((id) => id !== 'the_end'))}, itemsSeen: [], bossesBeaten: [], challengesDone: [], stats: { runs: 40, wins: 6 } }));
    localStorage.setItem('bom:meta', JSON.stringify({ slot: 1 }));
  } catch (e) {}
})()`;

async function openGame(browser: Browser, base: string, w: number, h: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('  page error:', e.message));
  await page.addInitScript(SEED_SAVE);
  await page.goto(base);
  await page.waitForFunction(`!!${D} && !!${D}.game`, null, { timeout: 30000 });
  await ev(page, `(() => { const m = ${D}.game.menus; m.stack = []; m.openMain(); })()`);
  await page.waitForTimeout(1200);
  return page;
}

/** The title scene alone (no menu, no logo), at an exact multiple of the 480x270 view. */
async function scene(browser: Browser, base: string, scale: number): Promise<Buffer> {
  const page = await openGame(browser, base, 480 * scale, 270 * scale);
  await ev(page, `(() => { const m = ${D}.game.menus; m.sceneShade = false; m.stack = [{ t: 0, update() {}, render() {} }]; })()`);
  await page.waitForTimeout(2500);
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  return png;
}

// ---------------------------------------------------------------------------- screenshots
async function shots(browser: Browser, base: string): Promise<void> {
  console.log('screenshots (1920x1080)');
  const page = await openGame(browser, base, 1920, 1080);
  // Marcus can't be hurt while the pictures are taken, without the invulnerability flicker (or a hurt flash)
  const unhurt = () => ev(page, `(() => { const w = ${D}.world; if (!w) return; w.hurtPlayer = () => false; w.player.iframes = 0; w.player.hurtT = 0; })()`);
  const snap = async (name: string, settle = 600) => {
    await unhurt();
    await page.waitForTimeout(settle);
    // no pickup chatter over the picture
    await ev(page, `(() => { const w = ${D}.world; if (w) w.hud.toasts = []; })()`);
    await page.waitForTimeout(40);
    write(`screenshots/${name}.png`, await page.screenshot({ type: 'png' }));
  };
  const run = async (char: string, seed: string) => {
    await ev(page, `(() => { const g = ${D}.game; g.menus.stack = []; g.newRun(${JSON.stringify(char)}, ${JSON.stringify(seed)}); })()`);
    await page.waitForFunction(`${D}.game.scene === 'run' && !!${D}.world && !${D}.world.inputLocked()`, null, { timeout: 15000 });
    await unhurt();
  };
  /** Walk into the first room of a kind on this floor (fights spawn as you arrive). */
  const room = async (type: string, nth = 0) => {
    const id = await ev<number>(page, `(() => { const w = ${D}.world; const r = w.floor.rooms.filter((r) => r.type === ${JSON.stringify(type)} && (r.type !== 'normal' || r.spawns.length >= 3)); return r.length ? r[Math.min(${nth}, r.length - 1)].id : -1; })()`);
    if (id < 0) return false;
    await ev(page, `${D}.goto(${id})`);
    await page.waitForTimeout(900);
    return true;
  };
  /** Fire at the enemies (whichever way most of them are) and take the picture mid-fight. */
  const fight = async (name: string, ms = 1000) => {
    const key = await ev<string>(page, `(() => { const w = ${D}.world, pl = w.player, es = w.enemies.filter((e) => !e.dead);
      if (!es.length) return 'ArrowUp';
      const dx = es.reduce((s, e) => s + e.x, 0) / es.length - pl.x, dy = es.reduce((s, e) => s + e.y, 0) / es.length - pl.y;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dy > 0 ? 'ArrowDown' : 'ArrowUp'); })()`);
    await page.keyboard.down(key); await page.waitForTimeout(ms); await snap(name, 0); await page.keyboard.up(key);
  };
  const give = (ids: string[]) => ev(page, `(() => { for (const id of ${JSON.stringify(ids)}) ${D}.give(id); })()`);

  await snap('01-title', 2200);

  // the first fight: Marcus with a few curios, ink flying
  await run('marcus', 'STEAMAA2');
  await give(['split_nib', 'spectacles', 'red_thread']);
  if (await room('normal', 1)) await fight('02-cellar-fight', 700);

  // a treasure room: two curios, choose one
  if (await room('treasure')) {
    await ev(page, `(() => { const w = ${D}.world, p = w.pickups.find((p) => p.kind === 'item'); if (p) { w.player.x = p.x; w.player.y = p.y + 22; } })()`);
    await snap('03-treasure', 900);
  }
  // the shop
  if (await room('shop')) { await ev(page, `(() => { const w = ${D}.world; w.player.buttons = 37; const p = w.pickups[0]; if (p) { w.player.x = p.x + 4; w.player.y = p.y + 24; } })()`); await snap('04-shop', 900); }

  // a later chapter, mid-fight, with a fuller build
  await ev(page, `${D}.nextFloor()`); await page.waitForTimeout(2500);
  await ev(page, `${D}.nextFloor()`); await page.waitForTimeout(2500);
  await unhurt();
  await give(['copper_filament', 'grandpas_pipe', 'marginalia']);
  if (await room('normal', 1)) await fight('05-chapter-fight', 550);

  // the chapter's keeper
  if (await room('boss')) {
    await page.waitForTimeout(3600);   // past the title card
    await fight('06-boss', 1400);
  }
  // the map and what every curio does
  await ev(page, `${D}.killAll()`); await page.waitForTimeout(1500);
  await page.keyboard.down('Tab'); await snap('07-map', 700); await page.keyboard.up('Tab');

  // deeper still, another reader
  await run('nell', 'STEAMBB3');
  for (let i = 0; i < 4; i++) { await ev(page, `${D}.nextFloor()`); await page.waitForTimeout(2500); }
  await unhurt();
  await give(['spilt_inkwell', 'reading_lamp', 'bookends']);
  if (await room('normal', 1)) await fight('08-deep-fight', 650);

  // choosing a story
  await ev(page, `(() => { const g = ${D}.game; g.quitToMenu(); })()`); await page.waitForTimeout(800);
  await ev(page, `(() => { const m = ${D}.game.menus; m.stack = []; m.push(m.newRunScreen(null, 'wren')); })()`);
  await snap('09-choose-your-story', 1200);
  await page.close();
}

// ---------------------------------------------------------------------------- capsules and library art
async function capsules(browser: Browser, base: string): Promise<void> {
  console.log('capsules and library art');
  const scenes: Record<number, string> = {};
  for (const s of [1, 2, 3, 4, 8]) scenes[s] = 'data:image/png;base64,' + (await scene(browser, base, s)).toString('base64');
  const page = await openGame(browser, base, 800, 600);
  // the title's logo, at any size: LOST small and spaced between rules, MARCUS in candlelit capitals
  await ev(page, `(() => {
    window.__logo = (ctx, cx, y, size, shadow = true) => {
      const FONT = "'Cinzel', 'Trajan Pro', Georgia, serif";
      const track = (s, t) => { let w = 0; for (let i = 0; i < s.length; i++) w += ctx.measureText(s[i]).width + (i < s.length - 1 ? t : 0); return w; };
      const draw = (s, x, yy, t) => { for (let i = 0; i < s.length; i++) { ctx.fillText(s[i], x, yy); x += ctx.measureText(s[i]).width + t; } };
      ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.font = '700 ' + size + 'px ' + FONT;
      const tr = size * 0.074, W = track('MARCUS', tr), x = cx - W / 2;
      if (shadow) {
        // candlelight behind the name, fading out well inside the area it fills
        const R = W * 0.7, gy = y - size * 0.35;
        const glow = ctx.createRadialGradient(cx, gy, size * 0.1, cx, gy, R);
        glow.addColorStop(0, 'rgba(210,140,60,0.26)'); glow.addColorStop(0.6, 'rgba(210,140,60,0.08)'); glow.addColorStop(1, 'rgba(210,140,60,0)');
        ctx.fillStyle = glow; ctx.fillRect(cx - R, gy - R, R * 2, R * 2);
      }
      ctx.font = '600 ' + size * 0.33 + 'px ' + FONT;
      const lt = size * 0.27, lw = track('LOST', lt), ly = y - size * 0.98;
      ctx.fillStyle = '#d6b27a'; draw('LOST', cx - lw / 2, ly, lt);
      ctx.fillStyle = 'rgba(214,178,122,0.6)';
      const rh = Math.max(1, size * 0.024);
      ctx.fillRect(x, ly - size * 0.115, cx - lw / 2 - x - size * 0.24, rh); ctx.fillRect(cx + lw / 2 + size * 0.24, ly - size * 0.115, x + W - (cx + lw / 2 + size * 0.24), rh);
      ctx.font = '700 ' + size + 'px ' + FONT;
      if (shadow) { ctx.fillStyle = 'rgba(16,6,4,0.9)'; draw('MARCUS', x + size * 0.045, y + size * 0.045, tr); }
      const g = ctx.createLinearGradient(0, y - size * 0.76, 0, y + size * 0.06);
      g.addColorStop(0, '#f8efdc'); g.addColorStop(0.55, '#e6cb9e'); g.addColorStop(1, '#ad7840');
      ctx.fillStyle = g; draw('MARCUS', x, y, tr);
      const ry = y + size * 0.27, d = size * 0.078;
      ctx.fillStyle = 'rgba(214,178,122,0.6)'; ctx.fillRect(x, ry, W / 2 - d * 2.3, rh); ctx.fillRect(cx + d * 2.3, ry, W / 2 - d * 2.3, rh);
      ctx.fillStyle = '#d6b27a'; ctx.beginPath(); ctx.moveTo(cx, ry - d); ctx.lineTo(cx + d, ry + rh / 2); ctx.lineTo(cx, ry + d + rh); ctx.lineTo(cx - d, ry + rh / 2); ctx.fill();
      ctx.restore();
      return W;
    };
  })()`);
  type Spec = { name: string; w: number; h: number; scale: number; crop: [number, number]; logo?: [number, number, number]; fmt?: 'png' | 'jpg'; shade?: 'top' | 'bottom' | 'left' | 'dim' };
  const specs: Spec[] = [
    // Store
    { name: 'store/header_capsule_920x430', w: 920, h: 430, scale: 2, crop: [40, 60], logo: [240, 262, 74], shade: 'left' },
    { name: 'store/small_capsule_462x174', w: 462, h: 174, scale: 1, crop: [12, 48], logo: [231, 118, 60], shade: 'dim' },
    { name: 'store/main_capsule_1232x706', w: 1232, h: 706, scale: 3, crop: [180, 58], logo: [330, 392, 104], shade: 'left' },
    { name: 'store/vertical_capsule_748x896', w: 748, h: 896, scale: 4, crop: [1010, 184], logo: [374, 800, 100], shade: 'bottom' },
    { name: 'store/page_background_1438x810', w: 1438, h: 810, scale: 3, crop: [1, 0], shade: 'dim', fmt: 'jpg' },
    // Library
    { name: 'library/library_capsule_600x900', w: 600, h: 900, scale: 4, crop: [1080, 180], logo: [300, 812, 80], shade: 'bottom' },
    { name: 'library/library_header_920x430', w: 920, h: 430, scale: 2, crop: [40, 60], logo: [240, 262, 74], shade: 'left' },
    { name: 'library/library_hero_3840x1240', w: 3840, h: 1240, scale: 8, crop: [0, 520] },
  ];
  for (const s of specs) {
    const url = await ev<string>(page, `(async () => {
      const img = new Image(); img.src = ${JSON.stringify(scenes[s.scale])}; await img.decode();
      const c = document.createElement('canvas'); c.width = ${s.w}; c.height = ${s.h};
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, ${s.crop[0]}, ${s.crop[1]}, ${s.w}, ${s.h}, 0, 0, ${s.w}, ${s.h});
      const shade = ${JSON.stringify(s.shade ?? '')};
      if (shade === 'top') { const g = ctx.createLinearGradient(0, 0, 0, ${s.h} * 0.5); g.addColorStop(0, 'rgba(5,3,9,0.9)'); g.addColorStop(1, 'rgba(5,3,9,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, ${s.w}, ${s.h}); }
      if (shade === 'bottom') { const g = ctx.createLinearGradient(0, ${s.h} * 0.6, 0, ${s.h}); g.addColorStop(0, 'rgba(5,3,9,0)'); g.addColorStop(1, 'rgba(5,3,9,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, ${s.w}, ${s.h}); }
      if (shade === 'left') { const g = ctx.createLinearGradient(0, 0, ${s.w} * 0.6, 0); g.addColorStop(0, 'rgba(5,3,9,0.85)'); g.addColorStop(0.55, 'rgba(5,3,9,0.55)'); g.addColorStop(1, 'rgba(5,3,9,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, ${s.w}, ${s.h}); }
      if (shade === 'dim') { ctx.fillStyle = 'rgba(5,3,9,0.5)'; ctx.fillRect(0, 0, ${s.w}, ${s.h}); }
      const L = ${JSON.stringify(s.logo ?? null)};
      if (L) window.__logo(ctx, L[0], L[1], L[2]);
      return c.toDataURL(${s.fmt === 'jpg' ? "'image/jpeg', 0.92" : "'image/png'"});
    })()`);
    write(`${s.name}.${s.fmt ?? 'png'}`, url);
  }
  // the library logo: the logotype alone on transparency, 1280 wide
  write('library/library_logo_1280x720.png', await ev<string>(page, `(() => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
    const ctx = c.getContext('2d'); window.__logo(ctx, 640, 470, 236, false);
    return c.toDataURL('image/png');
  })()`));
  // the app icon (184x184 JPG): Marcus's face on the dark tile, as on the desktop icon
  write('community/app_icon_184x184.jpg', await ev<string>(page, `(async () => {
    const { HEAD_DOWN, MARCUS_PAL } = await import('/src/art/hand/marcus.ts');
    const N = 184, c = document.createElement('canvas'); c.width = c.height = N;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(N / 2, N / 2, 4, N / 2, N / 2, N * 0.72); g.addColorStop(0, '#3a2048'); g.addColorStop(1, '#120c1e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    const w = HEAD_DOWN[0].length, h = HEAD_DOWN.length, S = Math.floor((N * 0.86) / Math.max(w, h));
    const ox = Math.floor((N - w * S) / 2), oy = Math.floor((N - h * S) / 2) + 4;
    HEAD_DOWN.forEach((row, y) => [...row].forEach((ch, x) => { const col = MARCUS_PAL[ch]; if (col) { ctx.fillStyle = col; ctx.fillRect(ox + x * S, oy + y * S, S, S); } }));
    return c.toDataURL('image/jpeg', 0.95);
  })()`));
  await page.close();
}

// ---------------------------------------------------------------------------- achievement icons
async function achievements(browser: Browser, base: string): Promise<void> {
  console.log('achievement icons (256x256, achieved and locked)');
  const page = await openGame(browser, base, 800, 600);
  const icons = await ev<{ id: string; on: string; off: string }[]>(page, `(async () => {
    const { ACHIEVEMENTS } = await import('/src/data/achievements.ts');
    const { ALL_ITEMS } = await import('/src/items/registry.ts');
    const { CHARACTERS } = await import('/src/player/characters.ts');
    const { itemIconCanvas } = await import('/src/art/items.ts');
    const { buildPlayerSprites } = await import('/src/art/marcus.ts');
    const { LOOKS } = await import('/src/art/look.ts');
    const { doorSymbol } = await import('/src/art/roomicons.ts');
    const { drawReader } = await import('/src/ui/menus.ts');
    // what each achievement shows: the curio or reader it unlocks, else the room or reader it's about
    const ROOM = { back_stair: 'secret', notes_all: 'library', shop_max: 'shop', transform_jeffy: 'blessing', transform_laser: 'blessing' };
    const reader = (c) => {
      const cv = document.createElement('canvas'); cv.width = 48; cv.height = 52;
      const ctx = cv.getContext('2d'); ctx.translate(24, 44); drawReader(ctx, buildPlayerSprites(LOOKS[c.look]), c, 0.5); return cv;
    };
    const art = (a) => {
      const item = ALL_ITEMS.find((i) => i.unlock === a.id);
      if (item) return { cv: itemIconCanvas(item.id), hue: '#7a5a20' };
      const ch = CHARACTERS.find((c) => c.unlock === a.id) ?? (a.id.startsWith('win_') ? CHARACTERS.find((c) => c.id === a.id.slice(4)) : null);
      if (ch) return { cv: reader(ch), hue: '#1f5a58' };
      const sym = doorSymbol(ROOM[a.id] ?? 'treasure');
      return { cv: sym.canvas, hue: a.id.startsWith('transform') ? '#4a2a6a' : '#5a2430' };
    };
    // trim transparent edges so every picture fills the frame the same way
    const trim = (cv) => {
      const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      return x1 < 0 ? [0, 0, cv.width, cv.height] : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
    };
    const N = 256, out = [];
    for (const a of ACHIEVEMENTS) {
      const { cv, hue } = art(a);
      const c = document.createElement('canvas'); c.width = c.height = N;
      const ctx = c.getContext('2d');
      // a dark plate, lit from the centre in the achievement's colour, in a gilt frame
      const bg = ctx.createRadialGradient(N / 2, N * 0.46, 8, N / 2, N / 2, N * 0.7); bg.addColorStop(0, hue); bg.addColorStop(1, '#0b070d');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, N, N);
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, N - 14, N - 14);
      ctx.strokeStyle = '#c9a46a'; ctx.lineWidth = 4; ctx.strokeRect(14, 14, N - 28, N - 28);
      ctx.strokeStyle = 'rgba(255,230,180,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(19.5, 19.5, N - 39, N - 39);
      for (const [x, y] of [[14, 14], [N - 14, 14], [14, N - 14], [N - 14, N - 14]]) { ctx.fillStyle = '#e6c98f'; ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 7); ctx.lineTo(x - 7, y); ctx.fill(); }
      const [sx, sy, sw, sh] = trim(cv);
      const k = Math.max(1, Math.floor(Math.min(170 / sw, 170 / sh)));
      const w = sw * k, h = sh * k, x = Math.round((N - w) / 2), y = Math.round((N - h) / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.globalAlpha = 0.5; ctx.filter = 'brightness(0)'; ctx.drawImage(cv, sx, sy, sw, sh, x + k, y + k * 1.5, w, h);
      ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.drawImage(cv, sx, sy, sw, sh, x, y, w, h);
      const off = document.createElement('canvas'); off.width = off.height = N;
      const o = off.getContext('2d'); o.filter = 'grayscale(1) brightness(0.5) contrast(0.9)'; o.drawImage(c, 0, 0);
      out.push({ id: a.id, on: c.toDataURL('image/jpeg', 0.92), off: off.toDataURL('image/jpeg', 0.92) });
    }
    return out;
  })()`);
  for (const i of icons) { write(`achievements/${i.id}.jpg`, i.on); write(`achievements/${i.id}_locked.jpg`, i.off); }
  // the sheet to type into Steamworks (Stats & Achievements): API name = the game's own id
  const csv = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = ACHIEVEMENTS.map((a) => [a.id, a.name, a.desc, a.hidden ? 'yes' : 'no', `media/achievements/${a.id}.jpg`, `media/achievements/${a.id}_locked.jpg`].map(csv).join(','));
  fs.writeFileSync(path.join(ROOT, 'steam', 'achievements.csv'), ['api_name,display_name,description,hidden,icon,icon_locked', ...rows].join('\n') + '\n');
  console.log('  steam/achievements.csv');
  await page.close();
}

(async () => {
  const server = await createServer({ root: ROOT, configFile: path.join(ROOT, 'vite.config.ts'), logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  const base = server.resolvedUrls!.local[0];
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  try {
    if (want('shots')) await shots(browser, base);
    if (want('capsules')) await capsules(browser, base);
    if (want('achievements')) await achievements(browser, base);
  } finally {
    await browser.close();
    await server.close();
  }
  console.log('done: steam/media');
})().catch((e) => { console.error(e); process.exit(1); });
