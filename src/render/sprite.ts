import { PixelArt } from './pixel';

export interface DrawOpts {
  flip?: boolean; flash?: number; alpha?: number; sx?: number; sy?: number; rot?: number; tint?: string; tintAmt?: number;
}

/** A pre-rendered pixel sprite with a pivot (usually the feet). */
export class Sprite {
  canvas: HTMLCanvasElement;
  w: number; h: number; ox: number; oy: number;
  private white: HTMLCanvasElement | null = null;
  private flipped: HTMLCanvasElement | null = null;
  private tints = new Map<string, HTMLCanvasElement>();
  private src: PixelArt;
  constructor(pa: PixelArt, ox?: number, oy?: number) {
    this.src = pa;
    this.canvas = pa.toCanvas();
    this.w = pa.w; this.h = pa.h;
    this.ox = ox ?? Math.floor(pa.w / 2); this.oy = oy ?? pa.h;
  }
  getWhite(): HTMLCanvasElement {
    if (!this.white) this.white = this.src.silhouette('#ffffff').toCanvas();
    return this.white;
  }
  getFlipped(): HTMLCanvasElement {
    if (!this.flipped) this.flipped = this.src.flipX().toCanvas();
    return this.flipped;
  }
  getTint(css: string): HTMLCanvasElement {
    let c = this.tints.get(css);
    if (!c) {
      c = document.createElement('canvas'); c.width = this.w; c.height = this.h;
      const x = c.getContext('2d')!;
      x.drawImage(this.canvas, 0, 0);
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = css; x.fillRect(0, 0, this.w, this.h);
      this.tints.set(css, c);
    }
    return c;
  }
  draw(ctx: CanvasRenderingContext2D, x: number, y: number, o?: DrawOpts): void {
    const flip = !!o?.flip;
    const img = flip ? this.getFlipped() : this.canvas;
    const ox = flip ? this.w - this.ox : this.ox;
    const simple = !o || (!o.sx && !o.sy && !o.rot && o.alpha === undefined);
    if (simple && !o?.flash && !o?.tint) {
      ctx.drawImage(img, Math.round(x - ox), Math.round(y - this.oy));
      return;
    }
    ctx.save();
    if (o?.alpha !== undefined) ctx.globalAlpha *= o.alpha;
    ctx.translate(Math.round(x), Math.round(y));
    if (o?.rot) ctx.rotate(o.rot);
    if (o?.sx || o?.sy) ctx.scale(o.sx ?? 1, o.sy ?? 1);
    ctx.drawImage(img, -ox, -this.oy);
    if (o?.tint && (o.tintAmt ?? 0) > 0) {
      ctx.globalAlpha *= o.tintAmt!;
      const t = this.getTint(o.tint);
      if (flip) { ctx.scale(-1, 1); ctx.drawImage(t, -(this.w - ox), -this.oy); }
      else ctx.drawImage(t, -ox, -this.oy);
    }
    if (o?.flash && o.flash > 0) {
      ctx.globalAlpha = (o.alpha ?? 1) * Math.min(1, o.flash);
      const w = this.getWhite();
      if (flip) { ctx.scale(-1, 1); ctx.drawImage(w, -(this.w - ox), -this.oy); }
      else ctx.drawImage(w, -ox, -this.oy);
    }
    ctx.restore();
  }
}

export function sp(pa: PixelArt, ox?: number, oy?: number): Sprite { return new Sprite(pa, ox, oy); }
