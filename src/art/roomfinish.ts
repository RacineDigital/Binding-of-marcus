import type { RoomData } from '../rooms/room';
import type { FloorTheme } from '../data/floors';
import { TILE } from '../core/constants';

/** Cached art direction: quiet floor centre, engraved borders, warm/cool pools of light. */
export function finishRoom(canvas: HTMLCanvasElement, room: RoomData, theme: FloorTheme, margin: number): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')!;
  const x = room.ox + margin, y = room.oy + margin, w = room.cols * TILE, h = room.rows * TILE;
  const treasure = room.type === 'treasure' || room.type === 'blessing';
  const built = ['stone', 'chapel', 'ward', 'spines'].includes(theme.wall);
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // Coloured light is baked behind hazards and actors, never across enemy projectiles.
  const cool = ctx.createRadialGradient(x + w * 0.8, y + h * 0.1, 0, x + w * 0.8, y + h * 0.1, w * 0.7);
  cool.addColorStop(0, 'rgba(106,173,181,0.13)'); cool.addColorStop(1, 'rgba(30,55,66,0)');
  ctx.fillStyle = cool; ctx.fillRect(x, y, w, h);
  const warm = ctx.createRadialGradient(x + w * 0.26, y + h * 0.64, 0, x + w * 0.26, y + h * 0.64, w * 0.5);
  warm.addColorStop(0, `rgba(219,172,97,${treasure ? 0.17 : 0.08})`); warm.addColorStop(1, 'rgba(200,140,70,0)');
  ctx.fillStyle = warm; ctx.fillRect(x, y, w, h);
  if (built) {
    ctx.strokeStyle = treasure ? 'rgba(215,181,108,0.42)' : 'rgba(180,174,136,0.14)'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 7.5, y + 7.5, w - 15, h - 15);
    ctx.strokeStyle = 'rgba(10,22,27,0.48)'; ctx.strokeRect(x + 10.5, y + 10.5, w - 21, h - 21);
    // Four engraved corners make a room read as a composed book illustration.
    for (const [cx, cy, sx, sy] of [[x + 14, y + 14, 1, 1], [x + w - 14, y + 14, -1, 1], [x + 14, y + h - 14, 1, -1], [x + w - 14, y + h - 14, -1, -1]]) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy);
      ctx.strokeStyle = treasure ? '#a88c56' : '#667372'; ctx.globalAlpha = treasure ? 0.8 : 0.4;
      ctx.beginPath(); ctx.moveTo(0, 20); ctx.lineTo(0, 0); ctx.lineTo(20, 0); ctx.moveTo(3, 12); ctx.lineTo(3, 3); ctx.lineTo(12, 3); ctx.stroke();
      ctx.fillStyle = '#c7b584'; ctx.beginPath(); ctx.moveTo(8, 5); ctx.lineTo(11, 8); ctx.lineTo(8, 11); ctx.lineTo(5, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }
  if (treasure) {
    // A woven runner connects both offers; it is decorative and has no collision.
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = '#233c3c'; ctx.fillRect(cx - 80, cy - 31, 160, 65);
    ctx.strokeStyle = '#8f8055'; ctx.strokeRect(cx - 77.5, cy - 28.5, 155, 60);
    ctx.strokeStyle = '#496360'; ctx.strokeRect(cx - 74.5, cy - 25.5, 149, 54);
    ctx.fillStyle = '#ad9560';
    for (let dx = -76; dx <= 76; dx += 4) { ctx.fillRect(cx + dx, cy - 34, 1, 3); ctx.fillRect(cx + dx, cy + 34, 1, 3); }
    ctx.strokeStyle = '#718073'; ctx.beginPath(); ctx.moveTo(cx, cy - 20); ctx.lineTo(cx + 17, cy); ctx.lineTo(cx, cy + 20); ctx.lineTo(cx - 17, cy); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = '#b5a16b'; ctx.fillRect(cx - 1, cy - 6, 2, 12); ctx.fillRect(cx - 5, cy - 1, 10, 2);
  }
  if (built && room.type !== 'boss') {
    const wx = x + w * 0.76;
    const beam = ctx.createLinearGradient(0, y, 0, y + h * 0.8);
    beam.addColorStop(0, 'rgba(148,202,207,0.11)'); beam.addColorStop(1, 'rgba(148,202,207,0)');
    ctx.fillStyle = beam;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(wx + i * 8, y); ctx.lineTo(wx + 5 + i * 8, y);
      ctx.lineTo(wx - 35 + i * 15, y + h * 0.8); ctx.lineTo(wx - 44 + i * 15, y + h * 0.8); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
  return canvas;
}
