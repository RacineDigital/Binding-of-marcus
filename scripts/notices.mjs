// Writes THIRD_PARTY_NOTICES.txt: the licences of everything shipped with the game that isn't ours,
// from the files the packages themselves carry. The typefaces are inside the game page; the other
// packages are the desktop app's runtime dependencies (Electron and Chromium's own licences sit in
// every desktop build's folder as LICENSE.electron.txt and LICENSES.chromium.html). The desktop
// builds put it beside the .exe and the browser zips beside the page. Run after changing dependencies:
//   node scripts/notices.mjs        (npm test fails while it's out of date)
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const licenceFile = (dir) => {
  for (const f of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'license', 'LICENSE-MIT', 'OFL.txt']) {
    const p = path.join(dir, f);
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8').trim();
  }
  return null;
};
const rule = '='.repeat(78);
const parts = [
  'Lost Marcus: third-party notices',
  '',
  'Lost Marcus includes the following third-party software and typefaces, used under the licences',
  'reproduced below. Everything else in the game is (c) Racine Digital.',
];

// typefaces (bundled into the game page)
const FONTS = [['Cinzel', 'cinzel'], ['Pirata One', 'pirata-one'], ['Barlow Condensed', 'barlow-condensed']];
for (const [name, pkg] of FONTS) {
  const text = licenceFile(path.join(ROOT, 'node_modules', '@fontsource', pkg));
  if (!text) throw new Error(`no licence found for ${name}`);
  parts.push('', rule, `${name} (typeface)`, rule, '', text);
}

// the desktop app's runtime packages, from the lockfile (not the development tools)
const shipped = Object.entries(lock.packages)
  .filter(([k, v]) => k.startsWith('node_modules/') && !v.dev && !v.devOptional && !k.includes('@types/') && !k.endsWith('undici-types'))
  .map(([k, v]) => ({ name: k.replace(/^.*node_modules\//, ''), dir: path.join(ROOT, k), version: v.version, license: v.license }))
  .sort((a, b) => a.name.localeCompare(b.name));
const seen = new Set();
for (const p of shipped) {
  if (seen.has(p.name)) continue;
  seen.add(p.name);
  const text = licenceFile(p.dir);
  parts.push('', rule, `${p.name} ${p.version} (${p.license ?? 'see licence'})`, rule, '', text ?? `Licensed under ${p.license}.`);
}
parts.push('', rule, 'Steamworks SDK redistributable (steam_api64.dll, Steam build only)', rule, '',
  'Copyright (c) Valve Corporation. Redistributed with the Steam build of the game under the',
  'Steamworks SDK Access Agreement.');
fs.writeFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.txt'), parts.join('\n') + '\n');
console.log(`wrote THIRD_PARTY_NOTICES.txt (${FONTS.length} typefaces, ${seen.size} packages)`);
