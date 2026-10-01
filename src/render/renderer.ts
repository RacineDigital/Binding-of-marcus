import { VIEW_W, VIEW_H } from '../core/constants';

export type ScaleMode = 'sharp' | 'integer' | 'stretch';

/** Owns the display canvas plus low-res world, light and glow buffers; composites them each frame. */
export class Renderer {
  display: HTMLCanvasElement;
  dctx: CanvasRenderingContext2D;
  world: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  light: HTMLCanvasElement;
  lctx: CanvasRenderingContext2D;
  glow: HTMLCanvasElement;
  gctx: CanvasRenderingContext2D;
  private sharp: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  scale = 1; offX = 0; offY = 0;
  mode: ScaleMode = 'sharp';
  shakeX = 0; shakeY = 0;
  lightSprite: HTMLCanvasElement;

  constructor(display: HTMLCanvasElement) {
    this.display = display;
    this.dctx = display.getContext('2d', { alpha: false })!;
    const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.world = mk(VIEW_W, VIEW_H);
    this.ctx = this.world.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.light = mk(VIEW_W, VIEW_H);
    this.lctx = this.light.getContext('2d')!;
    this.glow = mk(VIEW_W, VIEW_H);
    this.gctx = this.glow.getContext('2d')!;
    this.sharp = mk(VIEW_W * 2, VIEW_H * 2);
    this.sctx = this.sharp.getContext('2d')!;
    this.lightSprite = mk(64, 64);
    const lc = this.lightSprite.getContext('2d')!;
    const g = lc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    lc.fillStyle = g; lc.fillRect(0, 0, 64, 64);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(window.innerWidth * dpr), h = Math.floor(window.innerHeight * dpr);
    this.display.width = w; this.display.height = h;
    this.display.style.width = window.innerWidth + 'px';
    this.display.style.height = window.innerHeight + 'px';
    let s = Math.min(w / VIEW_W, h / VIEW_H);
    if (this.mode === 'integer' && s >= 1) s = Math.floor(s);
    this.scale = s;
    this.offX = Math.floor((w - VIEW_W * s) / 2);
    this.offY = Math.floor((h - VIEW_H * s) / 2);
    const k = Math.max(1, Math.ceil(s));
    if (this.sharp.width !== VIEW_W * k) { this.sharp.width = VIEW_W * k; this.sharp.height = VIEW_H * k; }
  }

  /** Begin a new frame: reset light/glow layers. */
  beginFrame(ambient: string, darkness: number): void {
    this.lctx.globalCompositeOperation = 'source-over';
    this.lctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.lctx.globalAlpha = 1;
    this.lctx.fillStyle = ambient;
    this.lctx.globalAlpha = darkness;
    this.lctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.lctx.globalAlpha = 1;
    this.lctx.globalCompositeOperation = 'destination-out';
    this.gctx.clearRect(0, 0, VIEW_W, VIEW_H);
  }
  /** Punch a hole in the darkness (screen coords in low-res pixels). */
  addLight(x: number, y: number, r: number, intensity = 1): void {
    if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r) return;
    this.lctx.globalAlpha = Math.min(1, intensity);
    this.lctx.drawImage(this.lightSprite, x - r, y - r, r * 2, r * 2);
  }
  private glowCache = new Map<string, HTMLCanvasElement>();
  private glowSprite(color: string): HTMLCanvasElement {
    let c = this.glowCache.get(color);
    if (!c) {
      c = document.createElement('canvas'); c.width = c.height = 32;
      const x = c.getContext('2d')!;
      const g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, color); g.addColorStop(0.45, color); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalAlpha = 1; x.fillStyle = g; x.fillRect(0, 0, 32, 32);
      // fade the mid-ring
      const m = x.createRadialGradient(16, 16, 0, 16, 16, 16);
      m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.3, 'rgba(0,0,0,0.35)'); m.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = m; x.fillRect(0, 0, 32, 32);
      if (this.glowCache.size > 200) this.glowCache.clear();
      this.glowCache.set(color, c);
    }
    return c;
  }
  /** Additive coloured glow. */
  addGlow(x: number, y: number, r: number, color: string, alpha: number): void {
    if (x < -r || y < -r || x > VIEW_W + r || y > VIEW_H + r || alpha <= 0.01) return;
    const g = this.gctx;
    g.globalAlpha = Math.min(1, alpha);
    g.drawImage(this.glowSprite(color), x - r, y - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }

  /** Composite world + lighting to the display. */
  present(): void {
    const d = this.dctx;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalAlpha = 1; d.globalCompositeOperation = 'source-over';
    d.fillStyle = '#050307';
    d.fillRect(0, 0, this.display.width, this.display.height);
    const s = this.scale;
    const x = this.offX + this.shakeX * s, y = this.offY + this.shakeY * s;
    const w = VIEW_W * s, h = VIEW_H * s;
    if (this.mode === 'sharp' && Math.abs(s - Math.round(s)) > 0.01) {
      this.sctx.imageSmoothingEnabled = false;
      this.sctx.drawImage(this.world, 0, 0, this.sharp.width, this.sharp.height);
      d.imageSmoothingEnabled = true; d.imageSmoothingQuality = 'high';
      d.drawImage(this.sharp, x, y, w, h);
    } else {
      d.imageSmoothingEnabled = false;
      d.drawImage(this.world, x, y, w, h);
    }
    d.imageSmoothingEnabled = true;
    d.globalCompositeOperation = 'lighter';
    d.drawImage(this.glow, x, y, w, h);
    d.globalCompositeOperation = 'source-over';
    d.drawImage(this.light, x, y, w, h);
    d.globalCompositeOperation = 'source-over';
  }
  /** Set transform for hi-res UI drawing in virtual (VIEW) coordinates. */
  uiBegin(): CanvasRenderingContext2D {
    const d = this.dctx;
    d.setTransform(this.scale, 0, 0, this.scale, this.offX, this.offY);
    d.imageSmoothingEnabled = false;
    d.globalAlpha = 1;
    return d;
  }
}
