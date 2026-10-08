// Chapter I–IV bosses against the base build (part of npm run test:e2e): each one dies, reaches its
// second phase, and a simple dodging bot (tests/tools/bossprobe.ts, dodge mode) gets through with
// few hits, evidence that the patterns leave safe paths. Not proof of feel: that needs people.
import { execFileSync } from 'child_process';
const out = execFileSync('npx', ['tsx', 'tests/tools/bossprobe.ts', 'grubmother,wardrobe,twinsnips,furnaceheart,oldstoker,ratking,bilgemaw,matron,sleepwalker', '100', 'dodge', 'weak'], { encoding: 'utf8', env: process.env, timeout: 1200000 });
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
const rows = out.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
ok(rows.length === 9, `nine fights ran (${rows.length})`);
for (const r of rows) {
  // the Rat King is two fights (the knot, then two princes), so it gets longer
  const limit = r.boss === 'ratking' || r.boss === 'matron' ? 80 : 60;
  ok(r.killed && r.t < limit, `${r.boss}: the base build kills it in ${r.t}s`);
  ok(r.phases.length >= 1, `${r.boss}: its second phase begins (at ${r.phases[0]}s)`);
  // the Rat King and the Matron are the noisiest for the bot (measured: up to 13 and 12 hits over
  // 11 and 9 fights, medians 4 and 8), so they get more room; the rest stay at 12
  const hitCap = r.boss === 'ratking' || r.boss === 'matron' ? 16 : 12;
  ok(r.hits <= hitCap, `${r.boss}: a dodging bot takes ${r.hits} hits`);
}
ok(!out.includes('page errors'), 'no page errors');
if (fails) { console.log(fails + ' boss checks failed'); process.exit(1); }
console.log('all boss checks passed');
