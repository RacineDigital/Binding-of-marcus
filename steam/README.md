# Lost Marcus on Steam

Everything the Steam release needs that lives in the repository: the depot build, the Steamworks
integration, and the store and Steamworks material made from the game itself. The launch plan
(review, QA, release day) is in [docs/STEAM_RELEASE_CHECKLIST.md](../docs/STEAM_RELEASE_CHECKLIST.md).

| File | What it is |
| --- | --- |
| `electron-builder.cjs` | The Steam depot build (`npm run dist:steam`): the desktop app with the Steamworks library and `steam_api64.dll` beside `Lost Marcus.exe`. |
| `achievements.csv` | All 82 achievements to enter in Steamworks: API name, name, description, hidden, and their icons. |
| `rich_presence_english.vdf` | The Rich Presence localization file (what friends see you doing). |
| `media/` | Screenshots, store capsules, library art, the app icon and every achievement icon, in Valve's sizes. `npm run steam:media` remakes them. |

## 1. One-time Steamworks setup

1. **App ID.** Put your App ID in `package.json`: `"steam": { "appId": 1234560, "depotId": 0 }`.
   Steamworks makes the first depot `appId + 1`; set `depotId` only if yours is different.
2. **Depot and launch option.** One depot, *Windows, 64-bit*. Launch option: executable
   `Lost Marcus.exe`, operating system Windows, 64-bit only, no arguments. (Players having trouble
   with the overlay can add the launch option `--no-steam-overlay` themselves.)
3. **Achievements** (*Stats & Achievements -> Achievements*). For each row of `achievements.csv`
   make an achievement whose **API name is exactly the first column** (that is what the game
   unlocks), with its name and description, *Hidden* ticked where the sheet says so, and the
   icons from `media/achievements/` (`<id>.jpg` achieved, `<id>_locked.jpg` unachieved, 256x256).
   Publish the changes. The game also catches Steam up on achievements earned before it was
   connected (an older save, another save slot) every time it starts.
4. **Rich Presence** (*Community -> Rich Presence Localization*): upload
   `rich_presence_english.vdf`. Friends then see e.g. *Chapter III — The Frozen Cistern · Fighting Bilgemaw*.
5. **Steam Cloud** (*Steam Cloud* page, Auto-Cloud): byte quota 10 MB, 50 files, and one root path:
   root `WinAppDataRoaming`, subdirectory `Lost Marcus/saves`, pattern `*.json`, not recursive.
   That is every save slot and the settings, and nothing else (the `.bak` and `.tmp` copies stay
   local). Test with two machines before advertising Cloud on the store page.
6. **Steam Input** (*Steam Input* page). Default configuration: the official **Gamepad** template,
   and turn on Steam Input for PlayStation, Switch and generic controllers. Every controller then
   reaches the game as an Xbox pad, and the game asks Steam Input which one is really in hand to
   show its buttons (PlayStation shapes, Switch letters, Steam Deck labels).
7. **Store and library art** from `media/`: header, small, main and vertical capsules and the
   page background from `media/store`; library capsule, header, hero and logo from
   `media/library`; the 184x184 app icon from `media/community`; screenshots from
   `media/screenshots` (1920x1080). Valve reviews capsules: these are a solid start, made from the
   title scene and logo, but commissioned key art sells better.

## 2. Build and upload

**From a Windows PC** (with [SteamCMD](https://partner.steamgames.com/doc/sdk/uploading) installed):

```bash
npm ci
npm run dist:steam                       # -> release-steam/win-unpacked
"release-steam/win-unpacked/Lost Marcus.exe" --smoke   # prints SMOKE OK
npm run steam:upload -- --user <build account> --live beta
```

`steam:upload` writes `release-steam/app_build.vdf` and runs SteamCMD, which asks for the
password and Steam Guard code. `--dry` only writes the file and prints the command. Steam never
lets an upload go live on the default branch: test the beta branch, then set the build live in
Steamworks (*SteamPipe -> Builds*).

**From GitHub** (Actions -> **Steam upload** -> Run workflow): builds and self-tests the depot on
Windows, then uploads it with [game-ci/steam-deploy](https://github.com/game-ci/steam-deploy) and sets
it live on the branch you type (`beta` by default). It needs three repository secrets:

- `STEAM_USERNAME` and `STEAM_PASSWORD`: a separate Steam account for builds, added to your
  Steamworks partner group with only the *Edit App Metadata* and *Publish App Changes to Steam*
  permissions for this app.
- `STEAM_CONFIG_VDF`: log in once with SteamCMD on your own computer
  (`steamcmd +login <build account>`, enter the Steam Guard code), then base64 the file
  `config/config.vdf` from the SteamCMD folder (`base64 -w0 config/config.vdf` on Linux,
  `[Convert]::ToBase64String([IO.File]::ReadAllBytes("config\config.vdf"))` in PowerShell) and
  paste it as the secret. Do it again if Steam asks the build account for a new code.

Every push also builds and self-tests the depot (*Desktop build check -> steam*) and keeps it as a
downloadable artifact for testing between uploads.

## 3. What the Steam build does differently

- **No update checks.** Steam delivers updates; the game never contacts GitHub or mentions it.
- **Achievements** unlock on Steam the moment they unlock in the game.
- **Rich Presence** shows the chapter, the boss, or the menus (Options -> *Status for friends*).
- **The Steam overlay** (Shift+Tab) works, and **F12** is left to Steam's screenshots (F9 still
  saves the game's own to *Pictures/Lost Marcus*).
- **Controllers** show the right buttons for an Xbox, PlayStation, Switch Pro or Steam Deck pad.
- **One copy at a time**, so a second launch can't write over the first one's save files.
- Without Steam running (or with no App ID set) the same build simply plays without the Steam
  features: nothing in the game depends on them, and achievements stay in the save.

To try the Steam features before release, set the App ID and start the game from your Steam
library (add the depot to a beta branch you own). Never ship a `steam_appid.txt`: the upload
script and workflow refuse a depot that has one.

## 4. Remaking the media

```bash
npm run steam:media                      # everything into steam/media/
npm run steam:media -- shots             # only screenshots (or capsules, achievements)
```

It starts its own dev server and plays the game in headless Chromium (`CHROME_PATH` to pick one),
with a story save well under way, pixel-perfect scaling and the run timer and stats panel off.
