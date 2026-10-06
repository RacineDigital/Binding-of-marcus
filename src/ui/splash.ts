// Studio splash: a folded-paper moth flutters in and settles above the studio name.
// Any key or click skips it.
import type { Screen, MenuSystem } from './menus';
import { VIEW_W, VIEW_H } from '../core/constants';
import { text, FONT_BODY, FONT_LOGO } from './draw';

export const STUDIO = 'Papermoth';

const PAPER = '#efe6d2', SHADE = '#cbbd9c', DEEP = '#a8966f', FOLD = 'rgba(120,100,70,0.55)';

/** An origami moth: faceted fore- and hindwings that fold shut (open = 0..1). */
function drawMoth(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, open: number, rot: number): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const k = 0.18 + 0.82 * open;
  for (const side of [-1, 1]) {
    ctx.save(); ctx.scale(side * k, 1);
    // forewing: two facets split by a fold line
    ctx.fillStyle = PAPER; ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(19, -13); ctx.lineTo(15, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SHADE; ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(15, -2); ctx.lineTo(2, 2); ctx.closePath(); ctx.fill();
    // hindwing
    ctx.fillStyle = DEEP; ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(13, 3); ctx.lineTo(6, 11); ctx.closePath(); ctx.fill();
    ctx.fillStyle = SHADE; ctx.beginPath(); ctx.moveTo(2, 1); ctx.lineTo(6, 11); ctx.lineTo(1, 6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = FOLD; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(15, -2); ctx.moveTo(2, 1); ctx.lineTo(6, 11); ctx.stroke();
    // an eyespot printed on the forewing
    ctx.fillStyle = 'rgba(90,30,30,0.55)'; ctx.beginPath(); ctx.arc(12, -6, 1.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // body and antennae
  ctx.fillStyle = DEEP; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(1.6, -1); ctx.lineTo(0, 9); ctx.lineTo(-1.6, -1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = SHADE; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(-0.5, -6); ctx.quadraticCurveTo(-3, -11, -5, -11); ctx.moveTo(0.5, -6); ctx.quadraticCurveTo(3, -11, 5, -11); ctx.stroke();
  ctx.restore();
}

export function splashScreen(ms: MenuSystem, next: () => void): Screen {
  const DUR = 4.4;
  let done = false, skipAt = -1;
  const dust = Array.from({ length: 26 }, () => ({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, v: 3 + Math.random() * 6, a: Math.random() }));
  const finish = () => { if (done) return; done = true; next(); };
  const skip = (t: number) => { if (t > 0.3 && skipAt < 0) skipAt = t; };
  let chimed = false;
  const scr: Screen = {
    t: 0,
    update(keys) { if (keys.length) skip(this.t); },
    pointer(_x, _y, click) { if (click) skip(scr.t); },
    render(ctx) {
      const t = scr.t;
      const end = skipAt >= 0 ? Math.min(DUR, skipAt + 0.35) : DUR;
      if (t >= end) { finish(); }
      // fade out over the last half second (or quickly when skipped)
      const out = skipAt >= 0 ? Math.max(0, 1 - (t - skipAt) / 0.35) : Math.min(1, Math.max(0, (DUR - t) / 0.6));
      ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.save(); ctx.globalAlpha = out;
      const cx = VIEW_W / 2, cy = 112;
      // soft warm light where the moth lands
      const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 120);
      glow.addColorStop(0, `rgba(210,150,80,${0.16 * Math.min(1, t / 1.6)})`); glow.addColorStop(1, 'rgba(210,150,80,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      for (const d of dust) {
        d.y -= d.v * 0.016; if (d.y < -2) d.y = VIEW_H + 2;
        ctx.fillStyle = `rgba(239,230,210,${0.12 + 0.12 * Math.sin(t * 2 + d.a * 6)})`; ctx.fillRect(d.x, d.y, 1, 1);
      }
      // flight: a lazy curve up from the bottom left, then settling
      const fly = Math.min(1, Math.max(0, (t - 0.3) / 1.4));
      const e = 1 - Math.pow(1 - fly, 3);
      const mx = cx - 150 * (1 - e) + Math.sin(e * Math.PI * 2) * 18 * (1 - e);
      const my = cy + 130 * (1 - e) - Math.sin(e * Math.PI) * 30 * (1 - e);
      const flap = fly < 1 ? 0.5 + 0.5 * Math.sin(t * 22) : 0.75 + 0.25 * Math.sin(t * 2.4);
      const rot = fly < 1 ? -0.5 * (1 - e) + Math.sin(t * 9) * 0.08 : 0;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(mx, cy + 24, 14 * flap + 4, 2, 0, 0, Math.PI * 2); ctx.globalAlpha = out * e; ctx.fill(); ctx.globalAlpha = out;
      if (t > 0.3) drawMoth(ctx, mx, my, 1.35, flap, rot);
      if (fly >= 1 && !chimed) { chimed = true; ms.g.audio.play('pageUse', { vol: 0.35 }); }
      // the name, letter by letter
      const reveal = Math.max(0, (t - 1.7) / 0.9);
      if (reveal > 0) {
        const name = STUDIO.toUpperCase();
        ctx.font = `700 19px ${FONT_LOGO}`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
        const track = 5;
        let w = -track; for (const ch of name) w += ctx.measureText(ch).width + track;
        let x = cx - w / 2;
        for (let i = 0; i < name.length; i++) {
          const a = Math.min(1, Math.max(0, reveal * name.length - i));
          ctx.globalAlpha = out * a;
          ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(name[i], x + 1, cy + 51 + (1 - a) * 3);
          ctx.fillStyle = PAPER; ctx.fillText(name[i], x, cy + 50 + (1 - a) * 3);
          x += ctx.measureText(name[i]).width + track;
        }
        const r2 = Math.min(1, Math.max(0, (t - 2.5) / 0.5));
        ctx.globalAlpha = out * r2;
        ctx.fillStyle = 'rgba(201,164,106,0.6)';
        ctx.fillRect(cx - w / 2, cy + 57, w / 2 - 16, 0.6); ctx.fillRect(cx + 16, cy + 57, w / 2 - 16, 0.6);
        text(ctx, 'G A M E S', cx, cy + 60, 6.5, '#c9a46a', 'center', FONT_BODY, 600, false);
      }
      // photosensitivity notice, under everything else
      ctx.globalAlpha = out * Math.min(1, t / 0.6);
      text(ctx, 'Photosensitivity notice: this game has flashing lights and screen shake.', cx, VIEW_H - 22, 6.5, 'rgba(220,205,180,0.75)', 'center', FONT_BODY, 600, false);
      text(ctx, 'Options \u2192 Reduce flashing and Screen shake tone them down.', cx, VIEW_H - 13, 6.5, 'rgba(220,205,180,0.6)', 'center', FONT_BODY, 600, false);
      ctx.restore();
    },
  };
  return scr;
}
