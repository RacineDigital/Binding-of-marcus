// Chapter I–III bosses against the base build (part of npm run test:e2e): each one dies, reaches its
// second phase, and a simple dodging bot (tests/tools/bossprobe.ts, dodge mode) gets through with
// few hits, evidence that the patterns leave safe paths. Not proof of feel: that needs people.
import { execFileSync } from 'child_process';
const out = execFileSync('npx', ['tsx', 'tests/tools/bossprobe.ts', 'grubmother,wardrobe,twinsnips,furnaceheart,oldstoker,ratking,bilgemaw', '100', 'dodge', 'weak'], { encoding: 'utf8', env: process.env, timeout: 900000 });
let fails = 0;
const ok = (c: boolean, m: string) => { console.log(c ? '  ok  ' : '  FAIL', m); if (!c) fails++; };
const rows = out.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
ok(rows.length === 7, `seven fights ran (${rows.length})`);
for (const r of rows) {
  // the Rat King is two fights (the knot, then two princes), so it gets longer
  const limit = r.boss === 'ratking' ? 80 : 60;
  ok(r.killed && r.t < limit, `${r.boss}: the base build kills it in ${r.t}s`);
  ok(r.phases.length >= 1, `${r.boss}: its second phase begins (at ${r.phases[0]}s)`);
  ok(r.hits <= 12, `${r.boss}: a dodging bot takes ${r.hits} hits`);
}
ok(!out.includes('page errors'), 'no page errors');
if (fails) { console.log(fails + ' boss checks failed'); process.exit(1); }
console.log('all boss checks passed');
