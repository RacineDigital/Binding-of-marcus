// Controller play in a real browser (npm run dev first): a simulated standard-mapping gamepad drives
// the menus and a run, the way a Steam Deck or any pad would. Covers the prompts following the pad in
// hand, picking a seed without a keyboard, rebinding controller buttons (and getting out of a rebind),
// typing a seed on the keyboard without the keys leaking into the menu, swapping pocket items, and
// the cursor hiding. Saves glyph screenshots to SHOTS (default: the system temp folder).
//   npx tsx tests/controller.ts
import { chromium, Page } from 'playwright-core';
import * as os from 'os';
import * as path from 'path';
import { CHROME } from './browser';

const base = process.env.BASE_URL || 'http://localhost:5173/';
const SHOTS = process.env.SHOTS || os.tmpdir();
const D = 'window.__bomDebug';
let failures = 0;
const ok = (cond: unknown, msg: string) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) failures++; };
const ev = <T>(p: Page, js: string): Promise<T> => p.evaluate(js) as Promise<T>;

const PADS = {
  xbox: 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)',
  playstation: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)',
  nintendo: 'Pro Controller (STANDARD GAMEPAD Vendor: 057e Product: 2009)',
  deck: 'Steam Deck Controller (Vendor: 28de Product: 1205)',
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // one fake pad, its buttons and sticks set from the test
  // (a string, not a function: the test runner's compiled helpers don't exist in the page)
  await page.addInitScript(`(() => {
    const pad = { id: ${JSON.stringify(PADS.xbox)}, index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], vibrationActuator: null,
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    window.__pad = pad;
    Object.defineProperty(navigator, 'getGamepads', { value: () => [pad], configurable: true });
    try { localStorage.clear(); } catch (e) { /* a fresh profile anyway */ }
  })()`);
  const hold = (b: number, on: boolean) => ev(page, `(() => { const x = window.__pad.buttons[${b}]; x.pressed = ${on}; x.value = ${on ? 1 : 0}; })()`);
  const tap = async (b: number, n = 1) => { for (let i = 0; i < n; i++) { await hold(b, true); await page.waitForTimeout(70); await hold(b, false); await page.waitForTimeout(70); } };
  const [A, B, X, , LB, , , RT] = [0, 1, 2, 3, 4, 5, 6, 7];
  const UP = 12, DOWN = 13, RIGHT = 15;
  const top = () => ev<string>(page, `(() => { const m = ${D}.game.menus; return String(m.stack.length); })()`);

  await page.goto(base);
  await page.waitForTimeout(3000);
  await tap(A); await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(SHOTS, 'pad-title.png') });
  console.log('prompts follow the controller in hand');
  ok(await ev(page, `${D}.game.input.usingPad`), 'a button press switches to controller prompts');
  for (const [kind, id] of Object.entries(PADS)) {
    await ev(page, `window.__pad.id = ${JSON.stringify(id)}`); await page.waitForTimeout(120);
    ok((await ev<string>(page, `${D}.game.input.padKind`)) === kind, `${kind} pad recognised from its id`);
    await ev(page, `(() => { const m = ${D}.game.menus; m.stack = []; m.push(m.helpScreen(false)); })()`);
    await tap(UP); await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(SHOTS, `pad-help-${kind}.png`) });
  }
  await ev(page, `window.__pad.id = ${JSON.stringify(PADS.xbox)}`); await page.waitForTimeout(120);
  // (asked of the game's own input: a dynamic import here can be a second copy of the module under the dev server)
  const labels = await ev<string>(page, `(async () => { const { padLabel } = await import('/src/core/input.ts'); const i = ${D}.game.input; return padLabel(i.padBindings.bomb[0], i.padKind) + ' ' + padLabel(i.padBindings.swap[0], i.padKind); })()`);
  ok(labels === 'LB RT', `controller labels name the bound buttons (bomb LB, swap RT): ${labels}`);
  ok((await ev<string>(page, `document.querySelector('canvas').style.cursor`)) === 'none', 'the mouse cursor hides while the controller is in use');

  console.log('picking a seed without a keyboard');
  await ev(page, `(() => { const m = ${D}.game.menus; m.stack = []; m.push(m.newRunScreen(null, undefined, 'AAAABBBB')); })()`);
  await page.waitForTimeout(150);
  await tap(DOWN, 2);                 // reader -> binding -> seed
  await tap(A);                       // open the seed picker
  await tap(UP);                      // A -> B
  await tap(RIGHT); await tap(DOWN);  // second character: A -> 9 (wraps backwards)
  await page.screenshot({ path: path.join(SHOTS, 'pad-seed.png') });
  await tap(A);                       // done
  await tap(DOWN); await tap(A);      // OPEN THE BOOK
  await page.waitForFunction(`${D}.game.scene === 'run' && !!${D}.world`, null, { timeout: 8000 });
  ok((await ev<string>(page, `${D}.world.run.seed`)) === 'B9AABBBB', 'the picked seed starts the run');

  console.log('swapping pocket items');
  await page.waitForFunction(`!${D}.world.inputLocked()`, null, { timeout: 8000 });
  await ev(page, `(() => { const p = ${D}.world.player; p.consumableSlots = 2; p.consumables = [{ kind: 'page', id: 'pg_lantern' }, { kind: 'page', id: 'pg_stair' }]; })()`);
  await tap(RT);
  ok((await ev<string>(page, `${D}.world.player.consumables[0].id`)) === 'pg_stair', 'RT swaps the pocket items');

  await tap(9); await page.waitForTimeout(300);
  ok(await ev(page, `${D}.game.paused`), 'Menu (Start) pauses');
  await page.screenshot({ path: path.join(SHOTS, 'pad-pause.png') });
  await tap(B); await page.waitForTimeout(200);
  ok(!(await ev(page, `${D}.game.paused`)), 'B resumes');

  console.log('rebinding controller buttons');
  await ev(page, `(() => { const g = ${D}.game; g.scene = 'menu'; g.paused = false; const m = g.menus; m.stack = []; m.push(m.controlsScreen(false)); })()`);
  await page.waitForTimeout(150);
  const bombRow = await ev<number>(page, `(async () => (await import('/src/core/input.ts')).ACTION_ORDER.indexOf('bomb'))()`);  // plain data: any copy will do
  await tap(DOWN, bombRow);
  await tap(A);                       // wait for a button...
  await page.screenshot({ path: path.join(SHOTS, 'pad-rebind.png') });
  await tap(X);                       // ...bomb on X
  const pb = await ev<any>(page, `${D}.game.save.data.settings.padBindings`);
  ok(pb?.bomb?.[0] === X && (pb?.shootLeft ?? []).length === 0, 'a controller button rebinds, and leaves the action that had it');
  ok((await top()) === '1', 'the Controls page is still open after rebinding');
  await tap(A); await page.waitForTimeout(5600);
  ok((await ev<any>(page, `${D}.game.save.data.settings.padBindings.bomb[0]`)) === X, 'waiting for a button gives up after a few seconds, unchanged');
  await page.screenshot({ path: path.join(SHOTS, 'pad-controls.png') });
  await tap(UP, bombRow + 1);         // around to Reset to defaults
  await tap(A);
  ok((await ev<any>(page, `${D}.game.save.data.settings.padBindings.bomb[0]`)) === LB, 'Reset to defaults restores the controller layout');
  await tap(B);
  ok((await top()) === '0', 'B leaves the Controls page');

  console.log('typing a seed on the keyboard');
  await ev(page, `(() => { const m = ${D}.game.menus; m.stack = []; m.push(m.newRunScreen(null)); })()`);
  await page.waitForTimeout(150);
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.type('zzzzyyyy');
  await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, 'keys-seed.png') });
  ok(!(await ev(page, `!!${D}.game.input.textCapture`)), 'Enter finishes typing (and does not start it again)');
  ok((await ev<string>(page, `document.querySelector('canvas').style.cursor`)) !== 'none', 'the cursor is back with the keyboard and mouse');
  await page.keyboard.press('Enter'); await page.waitForTimeout(100);
  ok(!!(await ev(page, `!!${D}.game.input.textCapture`)), 'Enter on the seed starts typing again');
  await tap(B); await page.waitForTimeout(100);
  ok(!(await ev(page, `!!${D}.game.input.textCapture`)) && (await top()) === '1', "a controller's B gets out of typing without leaving the page");
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  await page.waitForFunction(`${D}.game.scene === 'run' && !!${D}.world`, null, { timeout: 8000 });
  ok((await ev<string>(page, `${D}.world.run.seed`)) === 'ZZZZYYYY', 'the typed seed starts the run');

  ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(failures ? `${failures} controller check(s) FAILED` : 'all controller checks passed');
  process.exit(failures ? 1 : 0);
})();
