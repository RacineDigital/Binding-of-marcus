import type { Game } from '../game/game';
import type { World } from '../game/world';
import { text, COL, FONT_TITLE } from './draw';
import { VIEW_W, VIEW_H } from '../core/constants';
export class MenuSystem {
  g: Game;
  constructor(g: Game) { this.g = g; }
  update(_dt: number): void {
    const keys = this.g.input.takeMenu();
    if (this.g.scene === 'menu' && keys.includes('confirm')) this.g.newRun('marcus');
    if (this.g.paused && (keys.includes('back') || keys.includes('confirm'))) this.g.paused = false;
    if (this.g.scene === 'dead' && keys.includes('confirm')) this.g.newRun('marcus');
  }
  render(ctx: CanvasRenderingContext2D): void { text(ctx, 'Binding of Marcus', VIEW_W / 2, VIEW_H / 2, 24, COL.text, 'center', FONT_TITLE, 400); }
  renderBackground(_dt: number): void { const c = this.g.r.ctx; c.fillStyle = '#0a0610'; c.fillRect(0, 0, VIEW_W, VIEW_H); this.g.r.beginFrame('#000', 0); }
  renderPause(ctx: CanvasRenderingContext2D): void { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); text(ctx, 'Paused', VIEW_W / 2, VIEW_H / 2, 20, COL.text, 'center', FONT_TITLE, 400); }
  openPause(): void {}
  openMain(): void {}
  openDeath(_w: World): void {}
  openEnding(_w: World): void {}
}
