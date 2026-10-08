// Ambience: each floor gets a soundscape, it follows the run scene, every detail sound synthesises,
// the volume setting reaches its bus, and a fight pulls it down. (Whether it sounds good needs ears.)
import { chromium } from 'playwright-core';
import { CHROME } from './browser';
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.BASE_URL || 'http://localhost:5173/'); await page.waitForTimeout(2500);
  let fails = 0;
  const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
  const r: any = await page.evaluate(`(async () => {
    const d = window.__bomDebug, g = d.game, a = g.audio;
    a.unlock();
    const out = { menu: null, floors: [], fired: 0, vol: 0, fight: 0 };
    await new Promise((res) => setTimeout(res, 200));
    out.menu = a.ambience && a.ambience.current;
    g.newRun('marcus', 'AMB1'); g.menus.stack = [];
    for (let f = 0; f < 4; f++) { await new Promise((res) => setTimeout(res, 150)); out.floors.push([d.world.theme.id, a.ambience.current]); d.nextFloor(); }
    for (const k of ['drip','creak','crackle','clang','chime','rustle','groan','bubble','beep','gust','flutter','hiss']) a.ambience.event(k);
    out.fired = a.ambience.fired;
    g.save.data.settings.ambience = 0.3; g.applySettings();
    await new Promise((res) => setTimeout(res, 400));
    out.vol = a.ambBus.gain.value;
    a.setIntensity(1); await new Promise((res) => setTimeout(res, 2500));
    out.fight = a.ambience.bus.gain.value;
    g.quitToMenu ? g.quitToMenu() : null;
    return out;
  })()`);
  ok(r.menu === null, `silent on the title screen (${r.menu})`);
  for (const [floor, scape] of r.floors) ok(!!scape, `floor ${floor} plays ambience '${scape}'`);
  ok(new Set(r.floors.map((x: string[]) => x[1])).size >= 3, 'different floors sound different');
  ok(r.fired >= 12, `all 12 detail sounds synthesised (${r.fired})`);
  ok(Math.abs(r.vol - 0.15) < 0.02, `ambience volume setting reaches its bus (${r.vol.toFixed(3)})`);
  ok(r.fight < 0.7, `a fight pulls the ambience down (${r.fight.toFixed(2)})`);
  ok(errors.length === 0, 'no page errors ' + errors.join('; '));
  await browser.close();
  if (fails) { console.log(fails + ' ambience checks failed'); process.exit(1); }
  console.log('all ambience checks passed');
})();
