// Pooled particles and transient effects. All positions are in room (world) pixels.
import { TAU } from '../core/math';

export const enum PK { Pix = 0, Spark = 1, Smoke = 2, Ring = 3, Flash = 4, Ember = 5, Splat = 6, Star = 7, Bubble = 8, Shard = 9 }

export class Particle {
  active = false; kind: PK = PK.Pix;
  x = 0; y = 0; z = 0; vx = 0; vy = 0; vz = 0;
  life = 0; max = 1; size = 1; size2 = 1; color = '#fff'; color2: string | null = null;
  grav = 0; drag = 0; glow = false; bounce = 0.3; decal: string | null = null; above = true;
}

export interface Lightning { pts: number[]; life: number; max: number; color: string; width: number }
export interface TextFx { x: number; y: number; text: string; life: number; max: number; color: string; vy: number; big: boolean }

const smokeCache = new Map<string, HTMLCanvasElement>();
function smokeSprite(color: string): HTMLCanvasElement {
  let c = smokeCache.get(color);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 16;
    const x = c.getContext('2d')!;
    // soft dithered puff
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const d = Math.hypot(i - 7.5, j - 7.5) / 8;
      if (d > 1) continue;
      const a = (1 - d) * (((i + j) & 1) ? 0.9 : 0.7);
      x.fillStyle = color + a.toFixed(2) + ')'; x.fillRect(i, j, 1, 1);
    }
    smokeCache.set(color, c);
  }
  return c;
}

export class FX {
  parts: Particle[] = [];
  private free: Particle[] = [];
  bolts: Lightning[] = [];
  texts: TextFx[] = [];
  /** Decal sink set by the world: draws permanent marks onto the room floor. */
  decalSink: ((x: number, y: number, color: string, size: number) => void) | null = null;
  constructor(n = 3500) {
    for (let i = 0; i < n; i++) { const p = new Particle(); this.parts.push(p); this.free.push(p); }
  }
  spawn(kind: PK, x: number, y: number): Particle | null {
    const p = this.free.pop();
    if (!p) return null;
    p.active = true; p.kind = kind; p.x = x; p.y = y; p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0;
    p.life = 0; p.max = 0.5; p.size = 1; p.size2 = 1; p.color = '#fff'; p.color2 = null; p.grav = 0; p.drag = 0;
    p.glow = false; p.bounce = 0.3; p.decal = null; p.above = true;
    return p;
  }
  clear(): void {
    for (const p of this.parts) if (p.active) { p.active = false; this.free.push(p); }
    this.bolts.length = 0; this.texts.length = 0;
  }

  // ------------------------------------------------------------ presets
  burst(x: number, y: number, z: number, n: number, color: string, speed = 60, life = 0.4, size = 1, grav = 260): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Pix, x, y); if (!p) return;
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.7; p.z = z; p.vz = 40 + Math.random() * speed * 0.8;
      p.max = life * (0.6 + Math.random() * 0.6); p.size = size + (Math.random() < 0.3 ? 1 : 0); p.color = color; p.grav = grav; p.drag = 2;
    }
  }
  /** Directional spray (impacts). */
  spray(x: number, y: number, z: number, dir: number, cone: number, n: number, color: string, speed = 80, life = 0.35, decal: string | null = null): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Pix, x, y); if (!p) return;
      const a = dir + (Math.random() - 0.5) * cone, s = speed * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.z = z; p.vz = 20 + Math.random() * 60;
      p.max = life * (0.6 + Math.random() * 0.7); p.size = Math.random() < 0.4 ? 2 : 1; p.color = color; p.grav = 300; p.drag = 3;
      if (decal && Math.random() < 0.5) p.decal = decal;
    }
  }
  sparks(x: number, y: number, n: number, color: string, speed = 120, life = 0.25): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Spark, x, y); if (!p) return;
      const a = Math.random() * TAU, s = speed * (0.5 + Math.random() * 0.8);
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.max = life * (0.5 + Math.random()); p.color = color; p.drag = 5; p.glow = true;
    }
  }
  smoke(x: number, y: number, n: number, color = 'rgba(60,54,64,', size = 5, life = 0.8, rise = 14): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Smoke, x + (Math.random() - 0.5) * size * 2, y + (Math.random() - 0.5) * size); if (!p) return;
      const a = Math.random() * TAU;
      p.vx = Math.cos(a) * 16; p.vy = Math.sin(a) * 10; p.vz = rise * (0.5 + Math.random()); p.z = 2;
      p.size = size * (0.5 + Math.random() * 0.5); p.size2 = p.size * 2.2; p.max = life * (0.6 + Math.random() * 0.6); p.color = color; p.drag = 3;
    }
  }
  ring(x: number, y: number, r0: number, r1: number, color: string, life = 0.3, glow = true): void {
    const p = this.spawn(PK.Ring, x, y); if (!p) return;
    p.size = r0; p.size2 = r1; p.max = life; p.color = color; p.glow = glow;
  }
  flash(x: number, y: number, r: number, color: string, life = 0.12): void {
    const p = this.spawn(PK.Flash, x, y); if (!p) return;
    p.size = r; p.size2 = r * 1.3; p.max = life; p.color = color; p.glow = true;
  }
  embers(x: number, y: number, n: number, color: string, spread = 6): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Ember, x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread * 0.5); if (!p) return;
      p.vx = (Math.random() - 0.5) * 20; p.vz = 20 + Math.random() * 30; p.z = 4 + Math.random() * 8; p.max = 0.6 + Math.random() * 0.8;
      p.color = color; p.glow = true; p.drag = 1;
    }
  }
  stars(x: number, y: number, n: number, color: string, speed = 50): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Star, x, y); if (!p) return;
      const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.6; p.vz = 30 + Math.random() * 40; p.z = 6;
      p.max = 0.5 + Math.random() * 0.5; p.color = color; p.glow = true; p.drag = 3; p.grav = 60;
    }
  }
  shards(x: number, y: number, n: number, color: string, speed = 90): void {
    for (let i = 0; i < n; i++) {
      const p = this.spawn(PK.Shard, x, y); if (!p) return;
      const a = Math.random() * TAU, s = speed * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s * 0.7; p.z = 6 + Math.random() * 6; p.vz = 60 + Math.random() * 90;
      p.max = 0.8 + Math.random() * 0.6; p.size = 2 + (Math.random() < 0.4 ? 1 : 0); p.color = color; p.grav = 420; p.drag = 1.5; p.bounce = 0.35;
    }
  }
  bolt(x0: number, y0: number, x1: number, y1: number, color = '#bfe8ff', life = 0.16, width = 1): void {
    const pts: number[] = [x0, y0];
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.floor(d / 9));
    const nx = -(y1 - y0) / (d || 1), ny = (x1 - x0) / (d || 1);
    for (let i = 1; i < n; i++) {
      const t = i / n, off = (Math.random() - 0.5) * Math.min(14, d * 0.25);
      pts.push(x0 + (x1 - x0) * t + nx * off, y0 + (y1 - y0) * t + ny * off);
    }
    pts.push(x1, y1);
    this.bolts.push({ pts, life: 0, max: life, color, width });
  }
  text(x: number, y: number, text: string, color = '#fff', big = false): void {
    this.texts.push({ x, y, text, life: 0, max: big ? 1.4 : 0.9, color, vy: -22, big });
  }

  update(dt: number, solid?: (x: number, y: number) => boolean): void {
    for (const p of this.parts) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.max) { p.active = false; this.free.push(p); continue; }
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy *= dr;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (solid && (p.kind === PK.Pix || p.kind === PK.Shard) && solid(nx, ny)) { p.vx *= -0.3; p.vy *= -0.3; }
      else { p.x = nx; p.y = ny; }
      if (p.kind === PK.Smoke || p.kind === PK.Ember) { p.z += p.vz * dt; continue; }
      if (p.grav) {
        p.vz -= p.grav * dt; p.z += p.vz * dt;
        if (p.z <= 0) {
          p.z = 0;
          if (p.decal && this.decalSink) { this.decalSink(p.x, p.y, p.decal, p.size); p.active = false; this.free.push(p); continue; }
          if (Math.abs(p.vz) > 30) p.vz = -p.vz * p.bounce; else p.vz = 0;
          p.vx *= 0.6; p.vy *= 0.6;
        }
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) { const b = this.bolts[i]; b.life += dt; if (b.life >= b.max) this.bolts.splice(i, 1); }
    for (let i = this.texts.length - 1; i >= 0; i--) { const t = this.texts[i]; t.life += dt; t.y += t.vy * dt; t.vy *= Math.exp(-3 * dt); if (t.life >= t.max) this.texts.splice(i, 1); }
  }

  /** Floor-level and airborne particles. cam = camera offset. */
  render(ctx: CanvasRenderingContext2D, camX: number, camY: number, glow: (x: number, y: number, r: number, c: string, a: number) => void): void {
    for (const p of this.parts) {
      if (!p.active) continue;
      const t = p.life / p.max;
      const sx = Math.round(p.x - camX), sy = Math.round(p.y - p.z - camY);
      switch (p.kind) {
        case PK.Pix: case PK.Shard: {
          ctx.globalAlpha = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
          ctx.fillStyle = p.color;
          const s = p.size;
          ctx.fillRect(sx, sy, s, s);
          if (p.kind === PK.Shard && p.z > 1) { ctx.globalAlpha *= 0.3; ctx.fillStyle = '#000'; ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), s, 1); }
          break;
        }
        case PK.Spark: {
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = p.color; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(sx + 0.5, sy + 0.5); ctx.lineTo(sx - p.vx * 0.03 + 0.5, sy - p.vy * 0.03 + 0.5); ctx.stroke();
          if (p.glow) glow(sx, sy, 6, p.color, 0.3 * (1 - t));
          break;
        }
        case PK.Smoke: {
          const r = Math.max(1, p.size + (p.size2 - p.size) * t);
          ctx.globalAlpha = 0.55 * (1 - t);
          ctx.drawImage(smokeSprite(p.color), sx - r, sy - r, r * 2, r * 2);
          break;
        }
        case PK.Ring: {
          const r = p.size + (p.size2 - p.size) * (1 - Math.pow(1 - t, 3));
          ctx.globalAlpha = 1 - t;
          ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1, 3 * (1 - t));
          ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.75, 0, 0, TAU); ctx.stroke();
          break;
        }
        case PK.Flash: {
          const r = p.size + (p.size2 - p.size) * t;
          ctx.globalAlpha = 1 - t;
          ctx.drawImage(smokeSprite('rgba(255,244,214,'), sx - r, sy - r, r * 2, r * 2);
          glow(sx, sy, r * 3, p.color, 0.8 * (1 - t));
          break;
        }
        case PK.Ember: {
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = p.color; ctx.fillRect(sx, sy, 1, 1);
          glow(sx, sy, 5, p.color, 0.35 * (1 - t));
          break;
        }
        case PK.Star: {
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = p.color;
          ctx.fillRect(sx, sy - 1, 1, 3); ctx.fillRect(sx - 1, sy, 3, 1);
          glow(sx, sy, 6, p.color, 0.3 * (1 - t));
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
    for (const b of this.bolts) {
      const a = 1 - b.life / b.max;
      ctx.globalAlpha = a;
      for (const [w, c] of [[b.width + 2, 'rgba(120,180,255,0.35)'], [b.width, b.color]] as [number, string][]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(b.pts[0] - camX, b.pts[1] - camY);
        for (let i = 2; i < b.pts.length; i += 2) ctx.lineTo(b.pts[i] - camX, b.pts[i + 1] - camY);
        ctx.stroke();
      }
      for (let i = 0; i < b.pts.length; i += 4) glow(b.pts[i] - camX, b.pts[i + 1] - camY, 14, '#6ab0ff', 0.25 * a);
    }
    ctx.globalAlpha = 1;
  }
}
