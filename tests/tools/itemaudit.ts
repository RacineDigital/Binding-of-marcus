// Item audit: what every curio actually does, how strong it is for its quality, which ones do nearly
// the same thing, and which icons look alike.
//   npx tsx tests/tools/itemaudit.ts [--all]
import { ENEMY_DEFS } from '../../src/enemies/registry';
import { ALL_ITEMS } from '../../src/items/registry';
import { computeStats, MARCUS_BASE } from '../../src/player/stats';
import { itemIconArt } from '../../src/art/items';
void ENEMY_DEFS;
const all = process.argv.includes('--all');
const BASE = computeStats(MARCUS_BASE, []), BASE_DPS = BASE.damage * BASE.fireRate;
const items = ALL_ITEMS.filter((it) => !(it.tags ?? []).some((t) => ['quest', 'innate', 'tainted'].includes(t)) && Object.keys(it.pools ?? {}).length);
type Row = { id: string; name: string; q: number; kind: string; pool: string; power: number; sig: string; notes: string[] };
const rows: Row[] = [];
for (const it of items as any[]) {
  const st = computeStats(MARCUS_BASE, it.stats ? [it.stats] : []);
  let mul = (st.damage * st.fireRate) / BASE_DPS;
  const a = it.attack ?? {}, notes: string[] = [];
  if (a.shots) mul *= 1 + a.shots * 0.75;
  if (a.pierce) mul *= a.pierce > 50 ? 1.35 : 1 + a.pierce * 0.12;
  if (a.homing) mul *= 1.15; if (a.spectral) mul *= 1.05; if (a.bounce) mul *= 1 + a.bounce * 0.05;
  if (a.split) mul *= 1 + (a.splitOnHit ? 0.22 : 0.12) * a.split;
  if (a.explode) mul *= 1.4; if (a.chain) mul *= 1 + a.chain * (a.chainChance ?? 0.3) * 0.5;
  if (a.crit) mul *= 1 + a.crit * 2; if (a.burn) mul *= 1 + a.burn * 0.4; if (a.poison) mul *= 1 + a.poison * 0.4;
  if (a.rear || a.sides) mul *= 1.12; if (a.mode) notes.push('mode:' + a.mode);
  for (const k of ['slow', 'freeze', 'fear', 'confuse', 'mark', 'charm', 'lifesteal', 'magnet', 'pull', 'shatter', 'rainbow', 'creep', 'orbit', 'boomerang', 'wiggle', 'spiral', 'grow', 'accel', 'arc']) if (a[k]) notes.push(k);
  if (it.familiar) { const f = it.familiar; const fd = f.shoot ? (f.shoot.inherit ? f.shoot.dmg * BASE_DPS : f.shoot.dmg * f.shoot.rate) : (f.contact ?? 0) * 0.8; mul += (fd / BASE_DPS) * (it.familiarCount ?? 1); notes.push('familiar:' + f.kind); }
  if (it.hooks) notes.push('hooks:' + Object.keys(it.hooks).join('+'));
  if (it.health) notes.push('health:' + Object.entries(it.health).map(([k, v]) => k + v).join(','));
  if (it.give) notes.push('give'); if (it.flight) notes.push('flight'); if (it.active) notes.push('active:' + it.active.type + it.active.charge);
  if (st.speed !== BASE.speed) notes.push('speed' + (st.speed > BASE.speed ? '+' : '-'));
  if (st.range !== BASE.range) notes.push('range' + (st.range > BASE.range ? '+' : '-'));
  if (st.luck !== BASE.luck) notes.push('luck' + (st.luck > BASE.luck ? '+' : '-'));
  const sigParts = [...Object.keys(it.stats ?? {}).map((k) => k + (it.stats[k] > (k.endsWith('Mult') ? 1 : 0) ? '+' : '-')), ...Object.keys(a).filter((k) => !['tint', 'shape'].includes(k)), ...(it.hooks ? Object.keys(it.hooks).map((h) => 'hook.' + h) : []), it.familiar ? 'fam.' + it.familiar.kind : '', it.health ? 'health' : '', it.active ? 'active' : ''].filter(Boolean).sort();
  rows.push({ id: it.id, name: it.name, q: it.quality, kind: it.kind, pool: Object.keys(it.pools).join('/'), power: +mul.toFixed(2), sig: sigParts.join(' '), notes });
}
// power vs quality
const band: Record<number, [number, number]> = { 0: [0.6, 1.1], 1: [0.95, 1.35], 2: [1.05, 1.6], 3: [1.25, 2.1], 4: [1.5, 9] };
const dmgItems = rows.filter((r) => r.kind === 'passive' && !r.notes.some((n) => n.startsWith('hooks') || n.startsWith('health') || n === 'give' || n.startsWith('mode') || n.startsWith('familiar')));
console.log('=== power outliers (pure combat passives; power = DPS multiplier on base Marcus) ===');
for (const r of dmgItems) { const [lo, hi] = band[r.q] ?? [0, 9]; if (r.power < lo || r.power > hi) console.log(`Q${r.q} ${r.power.toFixed(2).padStart(5)}  ${r.id.padEnd(18)} ${r.sig}`); }
console.log('\n=== same effect signature (candidates for being too alike) ===');
const bySig = new Map<string, Row[]>(); for (const r of rows) { if (!r.sig) continue; (bySig.get(r.sig) ?? bySig.set(r.sig, []).get(r.sig)!).push(r); }
for (const [sig, rs] of bySig) if (rs.length > 1) console.log(`${rs.map((r) => `${r.id}(Q${r.q})`).join(', ')}  <=  ${sig}`);
console.log('\n=== icon look-alikes (most similar pairs) ===');
const feats = items.map((it) => { const art = itemIconArt(it.id); const f: number[] = []; for (let gy = 0; gy < 6; gy++) for (let gx = 0; gx < 6; gx++) { let r = 0, g = 0, b = 0, n = 0; for (let y = gy * 3; y < gy * 3 + 3; y++) for (let x = gx * 3; x < gx * 3 + 3; x++) { const c = art.get(x, y); if ((c >>> 24) > 128) { r += c & 255; g += (c >>> 8) & 255; b += (c >>> 16) & 255; n++; } } f.push(n / 9, n ? r / n / 255 : 0, n ? g / n / 255 : 0, n ? b / n / 255 : 0); } return { id: it.id, f }; });
const pairs: [number, string, string][] = [];
for (let i = 0; i < feats.length; i++) for (let j = i + 1; j < feats.length; j++) { let d = 0; for (let k = 0; k < feats[i].f.length; k++) d += (feats[i].f[k] - feats[j].f[k]) ** 2; pairs.push([Math.sqrt(d), feats[i].id, feats[j].id]); }
pairs.sort((a, b) => a[0] - b[0]); for (const [d, a, b] of pairs.slice(0, 30)) console.log(d.toFixed(2), a, '~', b);
if (all) { console.log('\n=== all ==='); for (const r of rows.sort((a, b) => a.q - b.q || b.power - a.power)) console.log(`Q${r.q} ${r.power.toFixed(2).padStart(5)} ${r.kind.padEnd(8)} ${r.pool.padEnd(10)} ${r.id.padEnd(18)} ${r.notes.join(' ')}`); }
console.log(`\n${rows.length} pool items audited`);
