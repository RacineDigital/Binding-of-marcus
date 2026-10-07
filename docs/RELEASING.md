# Steam and itch.io releases

For a prioritized Steam launch plan and repository readiness audit, see
[STEAM_RELEASE_CHECKLIST.md](STEAM_RELEASE_CHECKLIST.md).

Build from a clean checkout with the lockfile (`npm ci`), then run `npm test`,
`npm run test:desktop`, `npm run build`, and `npm run build:single`.
Start `npm run dev` before `npm run test:e2e` (which includes the controller tests)
and `npm run smoke`. The browser tests find Chrome or Chromium themselves; set
`CHROME_PATH` to choose one.

## Store packages (Windows runner)

- `npm run dist:steam`: unpacked application in `release-steam/win-unpacked`, with
  the Steamworks library and `steam_api64.dll`. Upload it with
  `npm run steam:upload` or the *Steam upload* workflow; [steam/README.md](../steam/README.md)
  covers the Steamworks setup (App ID, achievements, Rich Presence, Cloud, Steam Input).
- `npm run dist:itch`: downloadable Windows zip in `release-itch`.
- `npm run dist:win`: existing GitHub installer/portable builds in `release-desktop`.

Steam and itch packages embed their distribution in package metadata. The
Electron updater is disabled for those builds and the page never checks GitHub
for updates (unit-tested), while GitHub installed packages keep their updater.
The store client owns Steam updates.

Before uploading, run the generated Windows executable with `--smoke`, then play
it normally from the packaged folder. Check first launch, controller input,
fullscreen, save/continue after relaunch, and operation without Internet access.
The Windows store targets need validation on a Windows runner before release.

## itch.io browser upload

Run `npm run package:itch` (built as the itch.io distribution, so it never checks
GitHub for updates). Upload `release-itch/Lost-Marcus-<version>-web.zip`
as an HTML game and select **This file will be played in the browser**. The zip
has `index.html` at its root and includes fonts, game bundles and chapter music.
Allow fullscreen, use a 16:9 embed, and test keyboard focus, audio after a click,
controller input and save persistence in the actual itch.io iframe. Browser
privacy settings can restrict iframe storage; Save Slots export/import lets
players keep a separate backup.

## Art and music

Opening enemies have authored articulated sprites in `src/art/cellar-creatures.ts`.
The whole enemy/boss roster gets cached material accents in `src/art/material.ts`;
no extra surface processing runs during combat. Boss anatomy stays in the existing
parametric painters, with rig eyes and animation metadata preserved.

`src/audio/drive.ts` is the original melodic arcade-rock score. Start the dev
server and run `npm run music:render` to regenerate the gameplay OGG recordings,
or `npm run music:render -- cellar boiler` for selected chapters. This needs
Chromium (`CHROMIUM_PATH` can override `/usr/bin/chromium`) and ffmpeg.
The renderer updates `assets/music/chapter-map.json` after each completed track;
run `python3 scripts/prepare-music.py` afterwards to refresh recording durations.
The home and Room 4 themes retain their quiet ending arrangements. Synth fallback
scores match the rock recordings, and exploration preserves their upper frequencies.

## Store material and licences

`npm run steam:media` remakes the screenshots, capsules, library art, app icon and
achievement icons in `steam/media/`; `steam/STORE_PAGE.md` is the store text.
`THIRD_PARTY_NOTICES.txt` ships beside every desktop build and in the browser zips;
regenerate it with `npm run notices` after changing dependencies (`npm test` fails
until you do).

## Remaining launch work

Configure the App ID, depot, achievements, Rich Presence, Cloud and Steam Input in
Steamworks (steam/README.md), then test everything through the Steam client with two
accounts before advertising it. Verify distribution rights for the soundtrack, replace
the drafted capsules with key art if you can, and run a player playtest for
readability, controller navigation and difficulty. Do not label store features as
supported until their packaged behavior is tested.
