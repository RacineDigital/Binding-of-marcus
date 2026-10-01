import { buildPlayerSprites } from '../art/marcus';
import { LOOKS } from '../art/look';

export async function boot(): Promise<void> {
  // the logo face is only used on canvas, so ask for it explicitly before the first frame
  await Promise.all(["700 32px 'Cinzel'", "600 12px 'Cinzel'"].map((f) => document.fonts.load(f))).catch(() => {});
  await document.fonts.ready;
  const params = new URLSearchParams(location.search);
  document.getElementById('boot')?.remove();
  const cv = document.getElementById('screen') as HTMLCanvasElement;
  if (params.has('art')) { artPreview(cv, params.get('art') || 'player'); return; }
  const { startGame } = await import('./game');
  startGame(cv, params);
}

async function artPreview(cv: HTMLCanvasElement, which: string): Promise<void> {
  cv.width = 1400; cv.height = 900;
  cv.style.width = '1400px'; cv.style.height = '900px';
  const ctx = cv.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#2a2530'; ctx.fillRect(0, 0, cv.width, cv.height);
  const { artSheets } = await import('../art/preview');
  const sheets = artSheets(which);
  let x = 10, y = 10, rowH = 0;
  const S = Number(new URLSearchParams(location.search).get('s') || 4);
  for (const s of sheets) {
    const w = s.canvas.width * S, h = s.canvas.height * S;
    if (x + w > cv.width - 10) { x = 10; y += rowH + 10; rowH = 0; }
    ctx.drawImage(s.canvas, x, y, w, h);
    ctx.fillStyle = '#aaa'; ctx.font = '10px monospace'; ctx.fillText(s.label, x, y + h + 10);
    x += w + 10; rowH = Math.max(rowH, h + 12);
  }
  (window as any).__ready = true;
  void buildPlayerSprites; void LOOKS;
}
