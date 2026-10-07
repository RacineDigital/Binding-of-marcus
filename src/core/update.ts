// Updates. The installed Windows version from GitHub updates itself (the desktop shell downloads the
// new version and installs it when you quit); the portable .exe and the browser build just say on the
// main menu when a newer version is out. Store copies (Steam, itch.io) never check: the store
// delivers their updates, and pointing those players at GitHub would only confuse them.
import { GAME_VERSION } from './constants';

declare const __LM_DISTRIBUTION__: string | undefined;

export const update = { text: '', ready: false };

const newer = (a: string, b: string) => {
  const x = a.replace(/^v/, '').split('.').map(Number), y = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

/** Who delivers this copy: 'steam' or 'itch' for store builds (the desktop shell says, or the web build was made for one), else 'github'. */
export function distribution(): string {
  try {
    const d = (globalThis as any).bomDesktop?.distribution?.();
    if (d) return String(d);
  } catch { /* an older desktop shell: no store channel */ }
  const built = typeof __LM_DISTRIBUTION__ !== 'undefined' ? __LM_DISTRIBUTION__ : '';
  return built || 'github';
}
export const storeBuild = (): boolean => distribution() !== 'github';

export function watchForUpdates(): void {
  try {
    if (storeBuild()) return;
    const desk = (window as any).bomDesktop;
    if (desk?.onUpdate && desk.autoUpdates?.()) {
      desk.onUpdate((m: { state: string; version: string }) => {
        if (m.state === 'downloading') update.text = `Downloading v${m.version}...`;
        if (m.state === 'ready') { update.text = `v${m.version} is ready: it installs when you quit`; update.ready = true; }
      });
      return;
    }
    if (location.search.includes('play=') || (navigator as any).webdriver) return;
    fetch('https://api.github.com/repos/RacineDigital/Binding-of-marcus/releases/latest')
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => { if (r?.tag_name && newer(r.tag_name, GAME_VERSION)) update.text = `${r.tag_name} is out: get it from the Releases page`; })
      .catch(() => {});
  } catch { /* offline, or no desktop shell: no notice */ }
}
