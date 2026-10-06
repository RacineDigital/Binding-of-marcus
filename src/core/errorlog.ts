// Error log, so players can send a useful bug report. Every uncaught error and rejected promise
// (and anything passed to logError) is kept: on the desktop build it's appended to
// logs/errors.log next to the saves folder; in the browser the last few live in local storage.
// Options -> Error log opens that folder (desktop) or copies a report to the clipboard (browser).
import { GAME_VERSION } from './constants';

const desktop = (globalThis as any).bomDesktop as { logError?(s: string): void; openLogFolder?(): Promise<string> } | undefined;
const KEY = 'bom:errors', KEEP = 25;
let entries: string[] = [];
try { entries = JSON.parse(localStorage.getItem(KEY) ?? '[]'); if (!Array.isArray(entries)) entries = []; } catch { entries = []; }
let lastMsg = '', lastAt = 0;

export function logError(what: unknown, where = ''): void {
  const err = what as { message?: string; stack?: string };
  const msg = (err?.message ?? String(what)).slice(0, 400);
  // the same error every frame is one entry, not thousands
  const now = Date.now();
  if (msg === lastMsg && now - lastAt < 5000) return;
  lastMsg = msg; lastAt = now;
  const stack = (err?.stack ?? '').split('\n').slice(1, 7).map((s) => s.trim()).join('\n  ');
  const line = `[${new Date(now).toISOString()}] v${GAME_VERSION}${where ? ' ' + where : ''}: ${msg}${stack ? '\n  ' + stack : ''}`;
  entries.push(line); if (entries.length > KEEP) entries = entries.slice(-KEEP);
  try { desktop?.logError?.(line); } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify(entries)); } catch { /* ignore */ }
}

export function installErrorLog(): void {
  window.addEventListener('error', (e) => logError(e.error ?? e.message, 'uncaught'));
  window.addEventListener('unhandledrejection', (e) => logError(e.reason, 'promise'));
}

export function errorCount(): number { return entries.length; }

/** A plain-text report: version, browser and the logged errors, newest last. */
export function errorReport(): string {
  return [`Lost Marcus ${GAME_VERSION}`, navigator.userAgent, `${entries.length} error(s) logged`, '', ...entries].join('\n');
}

/** Desktop: open the log folder. Browser: copy the report. Returns what happened, for the menu. */
export async function shareErrorLog(): Promise<string> {
  if (desktop?.openLogFolder) { await desktop.openLogFolder(); return 'Folder opened'; }
  try { await navigator.clipboard.writeText(errorReport()); return 'Copied'; } catch { return 'Copy failed'; }
}
