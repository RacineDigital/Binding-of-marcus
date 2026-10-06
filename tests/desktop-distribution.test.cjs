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
for (const distribution of ['steam', 'itch', undefined]) {
  test(`desktop update IPC honors ${distribution ?? 'legacy'} channel`, () => {
    const handlers = new Map(); let installs = 0;
    const electron = {
      app: { isPackaged: true, setName() {}, on() {}, whenReady: () => ({ then() {} }) },
      ipcMain: { on: (name, fn) => handlers.set(name, fn), handle() {} },
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../electron/main.cjs'), 'utf8'), {
      require: name => {
        if (name === 'electron') return electron;
        if (name === './discord.cjs') return { DiscordPresence: class {} };
        if (name === './distribution.cjs') return { supportsAutoUpdates };
        if (name === '../package.json') return { distribution };
        if (name === 'electron-updater') return { autoUpdater: { quitAndInstall() { installs++; } } };
        return require(name);
      },
      process: { argv: [], env: {} }, console, setTimeout,
      __dirname: path.join(__dirname, '../electron'),
    });
    const event = {}; handlers.get('update:auto')(event);
    assert.equal(event.returnValue, distribution === undefined);
    handlers.get('update:install')();
    assert.equal(installs, distribution === undefined ? 1 : 0);
  });
}
