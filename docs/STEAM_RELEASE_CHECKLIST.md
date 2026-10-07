# Steam release checklist

## Current readiness

**The repository side is ready; the Steamworks side is not set up yet.** The Steam depot builds and
self-tests on Windows on every push, the Steam build integrates Steamworks (achievements, Rich
Presence, overlay, controller types) and stays fully playable without it, and the store and
Steamworks material is drafted in [steam/](../steam/README.md). What remains is the part only the
publisher can do: the App ID and Steamworks configuration, testing through the real Steam client,
store review, and the launch QA below. Confirm current fees, review lead times and partner
requirements in Steamworks before setting a public date.

| Area | What the repository shows | Status |
| --- | --- | --- |
| Steam package | `npm run dist:steam` builds `release-steam/win-unpacked` with the Steamworks library and `steam_api64.dll` beside `Lost Marcus.exe`. CI (*Desktop build check -> steam*) builds it on Windows, checks those files, runs `--smoke` (the library loads, reports Steam not running, and the game plays) and keeps the depot as an artifact. | Implemented; CI-tested on Windows without a Steam client |
| Store-owned updates | Steam and itch.io copies never contact GitHub: the shell reports its store and the page skips the update check (unit-tested for both stores, plus the itch.io web zip). | Implemented |
| Steam identity and upload | `package.json` `steam.appId` / `steam.depotId` (placeholders: 0). `npm run steam:upload` writes the app build `.vdf` and runs SteamCMD; the manual *Steam upload* workflow does the same from GitHub. Both refuse the default branch and a shipped `steam_appid.txt`. | Ready; needs the real App ID |
| Steamworks features | `electron/steam.cjs` (steamworks.js): achievements mirror the save's own (caught up on launch), Rich Presence, the overlay (`--no-steam-overlay` opt-out), Steam Deck and Steam Input controller type for glyphs. Off without an App ID or a running Steam. | Implemented; test in the Steam client |
| Save data | Desktop saves live in `%APPDATA%\Lost Marcus\saves` (`*.json`); `steam/README.md` gives the Auto-Cloud root path. | Local saves implemented; Cloud to configure and test |
| Controllers | Every menu works on a pad (seed picker, rebinding, quit to desktop); prompts show the pad in hand (Xbox, PlayStation, Switch Pro, Steam Deck); buttons are remappable; `tests/controller.ts` drives it with a simulated pad. | Implemented; test with real pads through Steam Input |
| Automated checks | Unit/content tests, Electron distribution and Steam-bridge tests, browser e2e and controller tests, the packaged `--smoke` self-test of both the GitHub and the Steam builds. | Implemented |
| Store assets | `npm run steam:media`: 9 gameplay screenshots, all store capsules, library art, app icon and 164 achievement icons in Valve's sizes, plus a store-page draft (`steam/STORE_PAGE.md`). | Drafts ready; commissioned key art recommended |
| Licences | `THIRD_PARTY_NOTICES.txt` (typefaces, runtime packages, Steamworks redistributable) ships beside every desktop build and in the browser zips; the credits point to it. | Implemented |
| Platforms | Windows x64 only. Steam Deck runs the Windows build through Proton; Deck glyphs and pad-only menus are in, but no Deck hardware test has been done. | Decide what to advertise |

## P0 — fix before producing the release candidate

- [x] **Align release versions.** Package, lockfile and in-game versions are aligned (checked by `npm test`).
- [x] **Stop store builds from advertising GitHub updates.** Steam and itch.io copies skip the GitHub check entirely; regression tests cover both stores and the itch.io web zip.
- [ ] **Choose the first shipping platform.** `dist:steam` is Windows x64. Decide whether the launch is Windows-only, and whether to request a Steam Deck review after testing on a Deck.
- [ ] **Run the current test suite from a clean checkout.** `npm ci`, `npm test`, `npm run test:desktop`, `npm run build`, `npm run build:single`, then with `npm run dev` running: `npm run test:e2e` (includes the controller tests), `npm run smoke` and `npm run test:synergy`. The browser tests find Chrome themselves (or set `CHROME_PATH`).
- [x] **Build the Steam artifact on Windows.** CI builds it on every push and checks `Lost Marcus.exe`, `steam_api64.dll`, the unpacked Steamworks module, and `resources/game/index.html` with its music.
- [ ] **Test the actual packaged executable.** CI runs `--smoke`; a person still needs to launch it normally and check first launch, menus, a complete run, controller and keyboard input, fullscreen, save/continue after relaunch, audio, and play without Internet access, plus an upgrade over an earlier build with existing saves.
- [ ] **Fix any Steam-specific package issues found by that run.**

## P1 — configure and pass Steamworks review

- [ ] **Set up the Steamworks app.** Obtain the real Steam App ID and put it in `package.json`; create the Windows x64 depot and launch option; enter the achievements, Rich Presence file, Auto-Cloud path and Steam Input defaults as [steam/README.md](../steam/README.md) describes; decide branch names and access; and verify the default branch points to the reviewed build. The upload tools refuse test-only App ID files.
- [ ] **Upload and install through Steam.** Upload with `npm run steam:upload -- --user <account> --live beta` or the *Steam upload* workflow. Use the Steam client and the intended beta/default branch to install the depot on a clean Windows machine. Confirm Steam starts the correct executable from a path containing spaces, reports the intended app, and launches without developer tools or local build files.
- [ ] **Complete the store page.** `steam/STORE_PAGE.md` drafts the short and long descriptions, tags, requirements and content notes. Finish the short and long descriptions, supported-language list, tags, system requirements, controller-support statement, release date, and pricing. Only claim features and platforms that passed the relevant tests.
- [ ] **Prepare store media.** `npm run steam:media` makes drafts of everything in Valve's sizes (`steam/media/`). Supply the required Steam capsule/library artwork, screenshots captured from the release build, and a trailer if planned. Check that UI text remains legible in the screenshots and that store claims match the game.
- [ ] **Complete the content and legal forms.** Finish Steam's current content survey and any applicable regional ratings or disclosures. Confirm commercial distribution rights and attribution for the soundtrack, fonts, code, and any incorporated third-party material. The in-game credits identify the typeface authors and SIL OFL, and `THIRD_PARTY_NOTICES.txt` (generated by `npm run notices`, checked by `npm test`) ships with every build.
- [ ] **Submit both the store page and build for review.** Address Steam's review feedback, and follow current partner guidance for the required public Coming Soon period and release scheduling. Don't set a public launch date until review and depot installation are confirmed.

## P1 — player-facing release QA

- [ ] Test fresh install, update-over-install, offline launch, clean uninstall/reinstall, and save preservation on a Windows account without development dependencies.
- [ ] Test keyboard, mouse, and supported controllers through Steam, including Steam Input defaults, rebinding, menu focus, pause/resume, fullscreen, and focus loss. State controller support conservatively until this passes.
- [ ] Test save export/import and recovery. The local save path is under Electron `userData/saves`; record the exact Windows path and confirm player-facing support instructions match it.
- [ ] Decide whether to enable Steam Cloud. If enabled, use the Auto-Cloud path in `steam/README.md`, test sync and conflict cases across two machines and Steam accounts, and verify that disabled/offline Cloud does not lose local progress. No game code is needed for Auto-Cloud.
- [ ] Test Steam achievements in the client: the bridge unlocks each achievement by the game's own id as it happens and catches up on existing saves at launch. Do not advertise them until unlocks, timing and existing-save catch-up are tested with the real App ID.
- [ ] Test the Steam overlay (Shift+Tab, F12 screenshots) and, if it will be advertised, Steam Deck/Proton: controller glyphs, pad-only menus, text at 1280x800, suspend/resume. The overlay can be turned off per player with the `--no-steam-overlay` launch option.
- [ ] Playtest a full progression path with new players: first run, unlock clarity, story comprehension, difficulty curve, controller menus, reduced-flash option, and recovery from death. Fix any launch-blocking confusion or softlocks and retest from a clean save.
- [ ] Check crash/error logs and performance on a minimum-spec target machine. Record the tested Windows version, hardware, controller, resolution, and build hash.

## P2 — optional Steamworks integration

Steamworks API integration is not itself a prerequisite for uploading a playable depot; these are
in the Steam build and need testing in the client before the store page mentions them:

- [x] Steam achievements, mapped to the game's existing achievement IDs (enter them from `steam/achievements.csv`).
- [ ] Steam Cloud through Auto-Cloud (configuration only), with multi-account and conflict testing.
- [x] Steam Rich Presence (upload `steam/rich_presence_english.vdf`); Discord Rich Presence stays as well.
- [ ] Steam leaderboards or other online features: not implemented.

## Release-day gate

- [ ] Freeze the release commit; bump `package.json`, `package-lock.json`, and `GAME_VERSION`; tag the exact tested commit.
- [ ] Repeat clean install, smoke test, online/offline launch, save/continue, and one full run from the Steam default branch.
- [ ] Confirm the final store page has passed review, the correct depot is on the default branch, the release date and price are correct, and every advertised feature has evidence from the QA run.
- [ ] Publish, then monitor Steam discussion/support channels and crash reports. Keep a tested rollback build and a clear process for replacing a broken depot.

## Research note

Live Steamworks pages were not reachable while this was written; asset sizes follow Valve's
published specifications as of 2026 (header 920x430, small 462x174, main 1232x706, vertical
748x896, library 600x900, hero 3840x1240, logo 1280x720, achievement icons 256x256). Check the
current Steamworks documentation for review timing, asset rules, the content survey and release
scheduling before acting on them.
