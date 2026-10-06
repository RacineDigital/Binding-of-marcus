import type { Binding } from '../game/bindings';

/** A small engraved device, shared by book covers and the run's HUD. */
export function bindingSeal(ctx: CanvasRenderingContext2D, b: Binding, x: number, y: number, size: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 20, size / 20);
  ctx.strokeStyle = b.color; ctx.fillStyle = b.color; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0); ctx.closePath(); ctx.stroke();
  ctx.beginPath();
  if (b.id === 'ember') {
    ctx.moveTo(0, -6); ctx.bezierCurveTo(0, -1, 7, 0, 3, 5); ctx.bezierCurveTo(-4, 8, -6, 1, -2, -2); ctx.lineTo(-1, 2); ctx.closePath(); ctx.fill();
  } else if (b.id === 'wayfarer') {
    ctx.moveTo(0, -6); ctx.lineTo(3, 4); ctx.lineTo(0, 2); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill();
    ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
  } else if (b.id === 'clockwork') {
    ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.moveTo(0, -3); ctx.lineTo(0, 0); ctx.lineTo(3, 2); ctx.stroke();
  } else {
    ctx.moveTo(-5, -3); ctx.quadraticCurveTo(-2, -5, 0, -2); ctx.quadraticCurveTo(2, -5, 5, -3);
    ctx.lineTo(5, 4); ctx.quadraticCurveTo(2, 2, 0, 5); ctx.quadraticCurveTo(-2, 2, -5, 4); ctx.closePath();
    ctx.moveTo(0, -2); ctx.lineTo(0, 5); ctx.stroke();
  }
  ctx.restore();
}
