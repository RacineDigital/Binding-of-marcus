// Synergy matrix: every passive and familiar is paired with every attack mode (and every pair of
// modes), plus random multi-item builds. Each combo is simulated against dummies; it must not throw
// and must deal damage. Usage: tsx tests/synergy.ts [frames] [randomBuilds]
import { chromium } from 'playwright-core';
const base = process.env.BASE_URL || 'http://localhost:5173/';
const frames = Number(process.argv[2] || 150);
const randomBuilds = Number(process.argv[3] || 150);
const MODE_ITEMS: Record<string, string> = { beam: 'burning_glass', laser: 'copper_filament', melee: 'bone_folder', burst: 'bellows_lung', charge: 'held_breath' };
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(base + '?play&seed=SYNERGY1');
  await page.waitForTimeout(2500);
  // freeze the real loop so only the harness advances the world
  await page.evaluate(`(() => { const g = __bomDebug.game; g.__realUpdate = g.world.update.bind(g.world); g.world.update = () => {}; })()`);
  const items: { id: string; kind: string }[] = await page.evaluate(`(async () => { const r = await import('/src/items/registry.ts'); return r.ALL_ITEMS.filter(i => i.kind !== 'active').map(i => ({ id: i.id, kind: i.kind })); })()`);
  const run = async (ids: string[]) => page.evaluate(([ids, frames]) => {
    const d = (window as any).__bomDebug; const w = d.world;
    const real = d.game.__realUpdate; const stub = w.update; w.update = real;
    try { return d.synergy(ids, frames); } finally { w.update = stub; }
  }, [ids, frames] as const);
  const modeSets: string[][] = [[]];
  const modes = Object.keys(MODE_ITEMS);
  for (const m of modes) modeSets.push([m]);
  for (let i = 0; i < modes.length; i++) for (let j = i + 1; j < modes.length; j++) modeSets.push([modes[i], modes[j]]);
  let total = 0, fails = 0;
  const failures: string[] = [];
  const check = (label: string, r: any) => {
    total++;
    if (!r || r.err || !(r.dealt > 0)) { fails++; failures.push(`${label} -> ${JSON.stringify(r)}`); }
  };
  const t0 = Date.now();
  // 1. every mode combination on its own
  for (const ms of modeSets) check(`[${ms.join('+') || 'shot'}]`, await run(ms.map((m) => MODE_ITEMS[m])));
  // 2. every item x every single mode and the mode pairs
  for (const it of items) {
    for (const ms of modeSets) {
      if (ms.length > 1 && it.kind !== 'passive') continue;
      const ids = [...ms.map((m) => MODE_ITEMS[m]), it.id];
      check(`[${ms.join('+') || 'shot'}] + ${it.id}`, await run(ids));
    }
  }
  // 2b. every shot modifier must visibly work in every attack mode
  const mods: { id: string; attack: any }[] = await page.evaluate(`(async () => { const r = await import('/src/items/registry.ts'); return r.ALL_ITEMS.filter(i => i.attack && !i.attack.mode).map(i => ({ id: i.id, attack: i.attack })); })()`);
  const EXPECT: [string, (a: any) => boolean][] = [
    ['burn', (a) => a.burn > 0], ['poison', (a) => a.poison > 0], ['slow', (a) => a.slow > 0], ['freeze', (a) => a.freeze > 0],
    ['fear', (a) => a.fear > 0], ['confuse', (a) => a.confuse > 0], ['mark', (a) => a.mark > 0], ['charm', (a) => a.charm > 0],
    ['explode', (a) => a.explode > 0], ['chain', (a) => a.chain > 0 && a.chainChance >= 0.2], ['creep', (a) => !!a.creep], ['crit', (a) => a.crit >= 0.1],
  ];
  let effTotal = 0, effFails = 0;
  for (const m of mods) {
    const want = EXPECT.filter(([, f]) => f(m.attack)).map(([k]) => k);
    if (!want.length) continue;
    for (const mode of ['shot', ...modes]) {
      const ids = [...(mode === 'shot' ? [] : [MODE_ITEMS[mode]]), m.id, m.id];
      // chance-based effects get a few tries
      let missing = want;
      for (let tries = 0; tries < 6 && missing.length; tries++) {
        const r = await page.evaluate(([ids, frames]) => {
          const d = (window as any).__bomDebug; const w = d.world;
          const real = d.game.__realUpdate; const stub = w.update; w.update = real;
          try { return d.synergy(ids, frames); } finally { w.update = stub; }
        }, [ids, 300] as const);
        missing = missing.filter((k) => !(r?.seen?.[k] > 0));
      }
      effTotal++;
      if (missing.length) { effFails++; failures.push(`effect: ${m.id} in ${mode} mode never showed ${missing.join(', ')}`); }
    }
  }
  console.log(`effects: ${effTotal - effFails}/${effTotal} modifier x mode checks ok`);
  fails += effFails; total += effTotal;
  // 3. random builds of 4-8 items
  let seed = 1234567;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let b = 0; b < randomBuilds; b++) {
    const n = 4 + Math.floor(rnd() * 5);
    const ids = Array.from({ length: n }, () => items[Math.floor(rnd() * items.length)].id);
    check(`build ${ids.join(',')}`, await run(ids));
  }
  console.log(`synergy: ${total - fails}/${total} combos ok in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (failures.length) console.log(failures.slice(0, 40).join('\n'));
  if (pageErrors.length) console.log('page errors:\n' + [...new Set(pageErrors)].slice(0, 20).join('\n'));
  await browser.close();
  process.exit(fails || pageErrors.length ? 1 : 0);
})();
