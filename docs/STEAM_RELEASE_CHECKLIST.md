# Steam release checklist

## Current readiness

**Not ready for a Steam upload yet.** The repository has a Steam-specific Windows x64 packaging command, but no Steam App ID/depot configuration, no Steam build uploaded or tested through the client, and no completed Steam store listing recorded here. This audit is based on the checked-in project and its current scripts. Confirm current fees, review lead times, and partner requirements in Steamworks before setting a public date.

| Area | What the repository shows | Status |
| --- | --- | --- |
| Steam package | `npm run dist:steam` builds an unpacked Windows x64 Electron app at `release-steam/win-unpacked` | Implemented; not validated on Windows in this audit |
| Store-owned updates | Electron disables its self-updater for `distribution=steam` | Implemented; browser-side update notice still needs a Steam-specific test/fix |
| Steam identity and upload | No Steam App ID, depot script, or Steamworks configuration is checked in. `com.racinedigital.lostmarcus` is the Electron app identifier, not a Steam App ID. | Not set up |
| Steamworks features | No Steamworks SDK/API integration found | Absent; achievements, Cloud API, and Rich Presence are optional unless advertised |
| Save data | Desktop saves live under Electron's `userData/saves` directory; no Steam Cloud setup is included | Local saves implemented; cloud unconfigured |
| Automated checks | Node content tests, Electron distribution tests, and a packaged `--smoke` mode exist | Useful baseline; store package and client testing still needed |
| Store assets | Game icon and in-game credits exist; Steam page artwork, trailer, and listing configuration are not in the repository | Prepare in Steamworks |
| Platforms | Steam packaging currently targets Windows x64 only | Decide and advertise Windows-only unless additional targets are built and tested |

## P0 — fix before producing the release candidate

- [x] **Align release versions.** Package, lockfile and in-game versions are aligned for `3.15.0`. The release workflow performs a clean `npm ci`; Windows/store validation remains below.
- [ ] **Stop store builds from advertising GitHub updates.** `src/core/update.ts` enters the GitHub Releases fallback when the desktop bridge reports that auto-updates are disabled. For Steam and itch packages, exit the update check without contacting GitHub or showing a GitHub release notice. Add a regression test for both store distributions; the existing Electron tests cover updater IPC, not this browser-side fallback.
- [ ] **Choose the first shipping platform.** The current `dist:steam` command is Windows x64 only. Decide whether the launch is Windows-only. If adding Linux, macOS, or Steam Deck support, produce and test each target before listing it as supported.
- [ ] **Run the current test suite from a clean checkout.** Use `npm ci`, `npm test`, `npm run test:desktop`, `npm run build`, and `npm run build:single`. Run `npm run test:e2e`, `npm run smoke`, and `npm run test:synergy` with a configured browser. `tests/e2e.ts` currently hard-codes a Linux Chromium path, so make that path configurable before relying on it outside this environment.
- [ ] **Build the Steam artifact on Windows.** Run `npm run dist:steam` on a clean Windows x64 runner. Confirm `release-steam/win-unpacked/Lost Marcus.exe` and the packaged `resources/game/index.html` plus `resources/game/music/` files are present and complete.
- [ ] **Test the actual packaged executable.** Run `Lost Marcus.exe --smoke`, then launch it normally. Verify first launch, title/menu navigation, a complete run, controller and keyboard input, fullscreen, save/continue after relaunch, audio playback, and operation without Internet access. Test upgrades over an earlier build and confirm existing saves remain readable.
- [ ] **Fix any Steam-specific package issues found by that run.** In particular, verify that no GitHub updater UI appears, the game does not require a development server, audio is loaded from the package, and quitting/saving works when launched by Steam.

## P1 — configure and pass Steamworks review

- [ ] **Set up the Steamworks app.** Obtain the real Steam App ID; create the Windows x64 depot and launch configuration; decide branch names and access; and verify the default branch points to the reviewed build. Keep test-only App ID files out of the shipped depot.
- [ ] **Upload and install through Steam.** Use the Steam client and the intended beta/default branch to install the depot on a clean Windows machine. Confirm Steam starts the correct executable from a path containing spaces, reports the intended app, and launches without developer tools or local build files.
- [ ] **Complete the store page.** Write the short and long descriptions, supported-language list, tags, system requirements, controller-support statement, release date, and pricing. Only claim features and platforms that passed the relevant tests.
- [ ] **Prepare store media.** Supply the required Steam capsule/library artwork, screenshots captured from the release build, and a trailer if planned. Check that UI text remains legible in the screenshots and that store claims match the game.
- [ ] **Complete the content and legal forms.** Finish Steam's current content survey and any applicable regional ratings or disclosures. Confirm commercial distribution rights and attribution for the soundtrack, fonts, code, and any incorporated third-party material. The in-game credits already identify the typeface authors and SIL OFL; retain any required license notices in the shipped credits/materials.
- [ ] **Submit both the store page and build for review.** Address Steam's review feedback, and follow current partner guidance for the required public Coming Soon period and release scheduling. Don't set a public launch date until review and depot installation are confirmed.

## P1 — player-facing release QA

- [ ] Test fresh install, update-over-install, offline launch, clean uninstall/reinstall, and save preservation on a Windows account without development dependencies.
- [ ] Test keyboard, mouse, and supported controllers through Steam, including Steam Input defaults, rebinding, menu focus, pause/resume, fullscreen, and focus loss. State controller support conservatively until this passes.
- [ ] Test save export/import and recovery. The local save path is under Electron `userData/saves`; record the exact Windows path and confirm player-facing support instructions match it.
- [ ] Decide whether to enable Steam Cloud. If enabled, configure Cloud for the actual save files, test sync and conflict cases across two machines and Steam accounts, and verify that disabled/offline Cloud does not lose local progress. The game currently has no Cloud implementation or configuration.
- [ ] Decide whether to map the game's existing achievements to Steam achievements. There is no Steamworks achievement bridge today; do not advertise Steam achievements until unlocks, unlock timing, and existing-save migration are tested in the Steam client.
- [ ] Test the Steam overlay and Steam Deck/Proton only if they will be supported or advertised. These are not currently verified by the Windows packaging command.
- [ ] Playtest a full progression path with new players: first run, unlock clarity, story comprehension, difficulty curve, controller menus, reduced-flash option, and recovery from death. Fix any launch-blocking confusion or softlocks and retest from a clean save.
- [ ] Check crash/error logs and performance on a minimum-spec target machine. Record the tested Windows version, hardware, controller, resolution, and build hash.

## P2 — optional Steamworks integration

Steamworks API integration is not itself a prerequisite for uploading a playable depot. It becomes necessary for features the store page promises or that the team chooses to support:

- [ ] Steam achievements and stats, mapped to the game's existing achievement IDs.
- [ ] Steam Cloud through Auto-Cloud paths or the Cloud API, with multi-account and conflict testing.
- [ ] Steam Rich Presence, if desired; the current desktop integration is Discord Rich Presence.
- [ ] Steam leaderboards or other online features, if they are added and supported operationally.

## Release-day gate

- [ ] Freeze the release commit; bump `package.json`, `package-lock.json`, and `GAME_VERSION`; tag the exact tested commit.
- [ ] Repeat clean install, smoke test, online/offline launch, save/continue, and one full run from the Steam default branch.
- [ ] Confirm the final store page has passed review, the correct depot is on the default branch, the release date and price are correct, and every advertised feature has evidence from the QA run.
- [ ] Publish, then monitor Steam discussion/support channels and crash reports. Keep a tested rollback build and a clear process for replacing a broken depot.

## Research note

Live Steamworks pages were not reachable during this repository audit. Use the current Steamworks Partner documentation to verify changing review timing, store asset specifications, content-survey rules, and release scheduling before acting on those details.
