const { test } = require('node:test');
const assert = require('node:assert/strict');
const { supportsAutoUpdates } = require('../electron/distribution.cjs');

for (const distribution of [undefined, 'github']) {
  test(`GitHub installed builds retain updates (${distribution ?? 'legacy'})`, () => {
    assert.equal(supportsAutoUpdates({ packaged: true, distribution }), true);
    for (const override of [{ packaged: false }, { smoke: true }, { portable: true }]) {
      assert.equal(supportsAutoUpdates({ packaged: true, distribution, ...override }), false);
    }
  });
}
for (const distribution of ['steam', 'itch', 'unknown', null, '']) {
  test(`distribution ${JSON.stringify(distribution)} cannot self-update from GitHub`, () => {
    assert.equal(supportsAutoUpdates({ packaged: true, distribution }), false);
  });
}

// Exercise the real IPC handlers too: hiding a UI button must not leave store builds installable.
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
/** Run electron/main.cjs against a fake Electron and return its IPC handlers. */
function loadMain({ distribution, steamAppId = 0, env = {}, argv = [], onInstall = () => {}, steamLib } = {}) {
  const handlers = new Map(), calls = { quit: 0, lock: 0 };
  const electron = {
    app: {
      isPackaged: true, setName() {}, on() {}, quit() { calls.quit++; }, whenReady: () => ({ then() {} }),
      requestSingleInstanceLock() { calls.lock++; return true; }, commandLine: { appendSwitch() {} },
    },
    ipcMain: { on: (name, fn) => handlers.set(name, fn), handle() {} },
    BrowserWindow: { getAllWindows: () => [] },
  };
  const steam = require('../electron/steam.cjs');
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../electron/main.cjs'), 'utf8'), {
    require: name => {
      if (name === 'electron') return electron;
      if (name === './discord.cjs') return { DiscordPresence: class { set() {} } };
      if (name === './distribution.cjs') return { supportsAutoUpdates };
      if (name === './steam.cjs') return { ...steam, start: (o) => steam.start({ ...o, lib: steamLib, log() {} }) };
      if (name === '../package.json') return { distribution, steam: { appId: steamAppId } };
      if (name === 'electron-updater') return { autoUpdater: { quitAndInstall() { onInstall(); } } };
      return require(name);
    },
    process: { argv, env }, console, setTimeout,
    __dirname: path.join(__dirname, '../electron'),
  });
  return { handlers, calls };
}
const ipc = (handlers, name, ...args) => { const e = {}; handlers.get(name)(e, ...args); return e.returnValue; };

for (const distribution of ['steam', 'itch', undefined]) {
  test(`desktop update IPC honors ${distribution ?? 'legacy'} channel`, () => {
    const handlers = new Map(); let installs = 0;
    const { handlers: h } = loadMain({ distribution, onInstall: () => installs++ });
    for (const [k, v] of h) handlers.set(k, v);
    const event = {}; handlers.get('update:auto')(event);
    assert.equal(event.returnValue, distribution === undefined);
    handlers.get('update:install')();
    assert.equal(installs, distribution === undefined ? 1 : 0);
  });
}

// The page asks the shell which store delivered it, and skips the GitHub update check for stores.
for (const [distribution, expected] of [['steam', 'steam'], ['itch', 'itch'], [undefined, 'github']]) {
  test(`the page is told this copy came from ${expected}`, () => {
    const { handlers, calls } = loadMain({ distribution });
    assert.equal(ipc(handlers, 'app:distribution'), expected);
    assert.equal(calls.lock, 1, 'only one copy of the game runs at a time');
  });
}

// A fake steamworks.js: records what the game asked Steam to do.
function fakeSteam({ fail = false, deck = false } = {}) {
  const got = new Set(), log = [];
  const client = {
    achievement: { isActivated: (n) => got.has(n), activate: (n) => { got.add(n); log.push('ach:' + n); return true; } },
    stats: { store: () => { log.push('store'); return true; } },
    utils: { isSteamRunningOnSteamDeck: () => deck },
    apps: { currentGameLanguage: () => 'english' },
    localplayer: { setRichPresence: (k, v) => log.push(`rp:${k}=${v ?? ''}`) },
  };
  return { got, log, lib: { init: (id) => { if (fail) throw new Error('Steam is not running'); log.push('init:' + id); return client; }, electronEnableSteamOverlay: () => log.push('overlay') } };
}

test('Steam stays off without an App ID, and never loads the library', () => {
  const steam = require('../electron/steam.cjs');
  let loaded = false;
  const st = steam.start({ appId: 0, lib: new Proxy({}, { get() { loaded = true; return () => {}; } }), log() {} });
  assert.equal(st.running, false); assert.equal(loaded, false);
});

test('Steam failing to start (not running) leaves the game playable', () => {
  const f = fakeSteam({ fail: true });
  const { handlers } = loadMain({ distribution: 'steam', steamAppId: 1234, steamLib: f.lib });
  const info = ipc(handlers, 'steam:info');
  assert.equal(info.running, false); assert.match(info.reason, /not running/);
  // calls from the page are harmless no-ops
  ipc(handlers, 'steam:achieve', 'beat_ch1'); ipc(handlers, 'steam:sync', ['beat_ch1']);
  handlers.get('presence')({}, { details: 'Chapter I', state: 'Marcus' });
  assert.deepEqual(f.log, []);
});

test('Steam mirrors achievements, catches up on old ones, and shows Rich Presence', () => {
  const f = fakeSteam({ deck: true });
  const { handlers } = loadMain({ distribution: 'steam', steamAppId: 1234, steamLib: f.lib });
  const info = ipc(handlers, 'steam:info');
  assert.equal(info.running, true); assert.equal(info.deck, true);
  assert.ok(f.log.includes('init:1234')); assert.ok(f.log.includes('overlay'));
  ipc(handlers, 'steam:sync', ['beat_ch1', 'first_death', 'bad name!']);
  assert.ok(f.got.has('beat_ch1') && f.got.has('first_death')); assert.ok(!f.got.has('bad name!'));
  ipc(handlers, 'steam:achieve', 'beat_ch2');
  assert.ok(f.got.has('beat_ch2')); assert.ok(f.log.includes('store'));
  handlers.get('presence')({}, { details: 'Chapter II', state: 'Wren · Normal' });
  assert.ok(f.log.includes('rp:steam_display=#Status')); assert.ok(f.log.includes('rp:details=Chapter II'));
});

test('Steam overlay can be turned off with --no-steam-overlay, and Steam passes its own App ID', () => {
  const f = fakeSteam();
  loadMain({ distribution: 'steam', steamAppId: 0, env: { SteamAppId: '777' }, argv: ['--no-steam-overlay'], steamLib: f.lib });
  assert.ok(f.log.includes('init:777')); assert.ok(!f.log.includes('overlay'));
});

test('only the Steam build loads Steamworks', () => {
  for (const distribution of [undefined, 'itch']) {
    const f = fakeSteam();
    const { handlers } = loadMain({ distribution, steamAppId: 1234, steamLib: f.lib });
    assert.equal(ipc(handlers, 'steam:info'), null); assert.deepEqual(f.log, []);
  }
});

test('the Steam package config ships steam_api64.dll and unpacks the library; other builds leave it out', () => {
  const pkg = require('../package.json');
  assert.ok(pkg.build.files.includes('!node_modules/steamworks.js/**'));
  assert.ok(pkg.build.files.includes('electron/steam.cjs'));
  const cfg = require('../steam/electron-builder.cjs');
  assert.equal(cfg.extraMetadata.distribution, 'steam');
  assert.ok(!cfg.files.includes('!node_modules/steamworks.js/**'));
  assert.ok(cfg.asarUnpack.some((p) => p.includes('steamworks.js')));
  assert.ok(cfg.extraFiles.some((f) => f.to === 'steam_api64.dll' && fs.existsSync(path.join(__dirname, '..', f.from))));
  assert.match(pkg.scripts['dist:steam'], /steam\/electron-builder\.cjs/);
});
