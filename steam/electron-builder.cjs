// electron-builder settings for the Steam depot (npm run dist:steam): the usual desktop build from
// package.json "build", as an unpacked Windows x64 folder tagged as the Steam distribution, plus the
// Steamworks library (unpacked from the asar so its native module can load) and steam_api64.dll
// beside "Lost Marcus.exe". Other builds leave the Steamworks library out.
const base = require('../package.json').build;

module.exports = {
  ...base,
  directories: { ...base.directories, output: 'release-steam' },
  extraMetadata: { distribution: 'steam' },
  files: base.files.filter((f) => !f.startsWith('!node_modules/steamworks.js')).concat(['!node_modules/steamworks.js/dist/osx/**', '!node_modules/steamworks.js/dist/linux64/**', '!node_modules/steamworks.js/dist/win64/*.lib']),
  asarUnpack: ['node_modules/steamworks.js/**'],
  extraFiles: [{ from: 'node_modules/steamworks.js/dist/win64/steam_api64.dll', to: 'steam_api64.dll' }],
  publish: null,
};
