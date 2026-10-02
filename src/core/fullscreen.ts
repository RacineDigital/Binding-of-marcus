// Fullscreen that Esc can't knock you out of. The desktop app uses real window fullscreen (Esc is a
// game key there); in a browser the page asks for a keyboard lock so Esc reaches the game too
// (Chromium then exits only on a long press of Esc).
type Desk = { isFullscreen?(): boolean; setFullscreen?(on: boolean): void; onFullscreen?(fn: (on: boolean) => void): void };
const desk = (): Desk | undefined => (globalThis as any).bomDesktop;

export function isFullscreen(): boolean {
  const d = desk();
  if (d?.isFullscreen) return d.isFullscreen();
  return !!document.fullscreenElement;
}

export function setFullscreen(on: boolean): void {
  const d = desk();
  if (d?.setFullscreen) { d.setFullscreen(on); return; }
  if (on) {
    document.documentElement.requestFullscreen?.()
      .then(() => (navigator as any).keyboard?.lock?.(['Escape']))
      .catch(() => {});
  } else if (document.fullscreenElement) {
    (navigator as any).keyboard?.unlock?.();
    document.exitFullscreen().catch(() => {});
  }
}

/** Called when the desktop window enters or leaves fullscreen any way (F11, Alt+Enter, the menu). */
export function onFullscreenChange(fn: (on: boolean) => void): void {
  desk()?.onFullscreen?.(fn);
}
