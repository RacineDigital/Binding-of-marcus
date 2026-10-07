// Steamworks for the Steam build: achievements, Rich Presence, the overlay, and telling the game when
// it is running on a Steam Deck. Only the Steam build loads this, and only with an App ID (package.json
// "steam.appId", or the SteamAppId that Steam sets for games it launches). Anything that goes wrong
// (Steam not running, the library missing, an achievement not set up in Steamworks yet) just leaves
// the Steam features off: the game never depends on them, and keeps its own achievements in the save.
let client = null, inputReady = false;
const status = { enabled: false, running: false, deck: false, language: '', reason: '' };
const loaded = new Set();

/**
 * Connect to Steam. Call before the app is ready (the overlay needs its command-line switches set first).
 * `overlay: false` (the --no-steam-overlay launch option) skips the overlay for machines where it misbehaves.
 */
function start({ appId, overlay = true, log = console.error, lib } = {}) {
  const id = Number(appId) || 0;
  status.enabled = id > 0;
  if (!id) { status.reason = 'no Steam App ID configured'; return status; }
  let sw;
  try { sw = lib || require('steamworks.js'); } catch (err) { status.reason = 'steamworks.js unavailable'; log('steam: ' + status.reason, err && err.message); return status; }
  try { client = sw.init(id); } catch (err) { client = null; status.reason = 'Steam is not running'; log('steam: init failed', err && err.message); return status; }
  status.running = true; status.reason = '';
  try { status.deck = !!client.utils.isSteamRunningOnSteamDeck(); } catch { /* older client */ }
  try { status.language = String(client.apps.currentGameLanguage() || ''); } catch { /* not reported */ }
  // Steam Input, only to ask which controller is in hand (for the right button glyphs): the game still
  // reads the pad itself, the way Steam presents it
  try { client.input.init(); inputReady = true; } catch { inputReady = false; }
  if (overlay) { try { sw.electronEnableSteamOverlay(); } catch (err) { log('steam: overlay unavailable', err && err.message); } }
  return status;
}

/** The Steam Input type of the first connected controller (e.g. 'PS5Controller', 'SteamDeckController'), or null. */
function padType() {
  if (!client || !inputReady) return null;
  try { const c = client.input.getControllers(); return c.length ? String(c[0].getType()) : null; } catch { return null; }
}

/** Unlock one achievement (by the game's own id, which is also its Steam API name). */
function achieve(name) {
  if (!client || typeof name !== 'string' || !/^[A-Za-z0-9_]{1,64}$/.test(name)) return false;
  try {
    if (client.achievement.isActivated(name)) return true;
    const ok = client.achievement.activate(name);
    if (ok) client.stats.store();
    return ok;
  } catch { return false; }
}

/** Bring Steam up to date with everything the save has already earned (first launch through Steam, other save slots). */
function sync(names) {
  if (!client || !Array.isArray(names)) return 0;
  let n = 0;
  for (const name of names) {
    if (typeof name !== 'string' || loaded.has(name)) continue;
    loaded.add(name);
    try {
      if (/^[A-Za-z0-9_]{1,64}$/.test(name) && !client.achievement.isActivated(name) && client.achievement.activate(name)) n++;
    } catch { /* not set up in Steamworks yet */ }
  }
  if (n) { try { client.stats.store(); } catch { /* offline: Steam keeps it for later */ } }
  return n;
}

/**
 * What the friends list shows. Steam displays the "#Status" token from the Rich Presence localization
 * file (steam/rich_presence_english.vdf), filled in with these two values.
 */
let lastPresence = '';
function presence(p) {
  if (!client) return;
  const clip = (t) => (t ? String(t).slice(0, 120) : '');
  const key = p ? clip(p.details) + '\u0000' + clip(p.state) : '';
  if (key === lastPresence) return;
  lastPresence = key;
  try {
    const rp = client.localplayer;
    if (!p) { rp.setRichPresence('steam_display'); rp.setRichPresence('details'); rp.setRichPresence('state'); rp.setRichPresence('status'); return; }
    rp.setRichPresence('details', clip(p.details) || 'Lost Marcus');
    rp.setRichPresence('state', clip(p.state) || ' ');
    rp.setRichPresence('status', [clip(p.details), clip(p.state)].filter(Boolean).join(' · '));
    rp.setRichPresence('steam_display', '#Status');
  } catch { /* Steam went away: nothing to show */ }
}

function info() { return { ...status }; }

module.exports = { start, achieve, sync, presence, info, padType };
