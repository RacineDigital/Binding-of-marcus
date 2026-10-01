// Updates. The installed Windows version updates itself (the desktop shell downloads the new version
// and installs it when you quit); everywhere else (the portable .exe, the browser) the main menu
// just says when a newer version is out.
import { GAME_VERSION } from './constants';

export const update = { text: '', ready: false };

const newer = (a: string, b: string) => {
  const x = a.replace(/^v/, '').split('.').map(Number), y = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

export function watchForUpdates(): void {
  try {
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
