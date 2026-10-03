// The boss rig: every boss is one parametric painter, baked into a full set of poses, and a runtime
// that picks the right pose from what the boss is doing. A painter draws the creature for a Pose
// (breath, jaw, lean, squash, step, hurt recoil, death progress, phase) and marks where its eyes are;
// the rig bakes idle / move / windup / attack / recover / hurt / roar / death (plus damaged
// second-phase sets), and at runtime the eyes are drawn live, tracking the player.
import { PixelArt } from '../render/pixel';
import { Sprite } from '../render/sprite';
import type { Enemy, SpriteSet } from '../enemies/enemy';
import type { World } from '../game/world';
import { snap } from '../render/snap';

const TAU = Math.PI * 2;

/** An eye the runtime animates: sclera painted in the sprite, iris and pupil drawn live. */
export interface EyeMark { x: number; y: number; r: number; iris: string; pupil?: string; glint?: boolean; slit?: boolean }

export interface Pose {
  /** Which set this frame belongs to ('idle', 'move', 'windup', 'attack', 'recover', 'hurt', 'roar', 'death' or a boss's own). */
  anim: string;
  f: number; n: number;
  /** Loop position 0..1 (f / n) and one-shot progress 0..1 (f / (n - 1)). */
  t: number; k: number;
  /** 0 = first phase; 1+ = hurt, changed, angrier. */
  phase: number;
  /** -1..1: the breathing / bobbing cycle. */
  breath: number;
  /** 0..1: how open the mouth is. */
  jaw: number;
  /** -1 (reared back) .. 1 (thrown forward). */
  lean: number;
  /** > 0 squashed down and wide, < 0 stretched tall. */
  squash: number;
  /** -1..1: walk / crawl cycle. */
  step: number;
  /** 0..1: recoil from a hit (eyes squeezed, body knocked back). */
  hurt: number;
  /** 0..1: how far through dying. */
  death: number;
  /** Arms / limbs raised 0..1 (wind-ups lift them, attacks bring them down). */
  raise: number;
  /** Eyes the painter wants animated (filled in by the painter). */
  eyes: EyeMark[];
  /** Anything else a boss's own pose wants to pass its painter. */
  x: Record<string, number>;
}

export type BossPainter = (p: PixelArt, s: Pose) => void;

export interface RigSpec {
  w: number; h: number;
  /** Pivot y (feet) if not the bottom row. */
  oy?: number;
  paint: BossPainter;
  /** Frames per generic set (defaults below). */
  counts?: Partial<Record<string, number>>;
  /** Phases that get their own idle / move / attack sets (the boss visibly changes). */
  phases?: number;
  /** The boss's own named sets, each a list of pose overrides (the brain picks frames from these). */
  extra?: Record<string, Partial<Pose>[]>;
  /** Skip the generic outline pass (for art that outlines itself). */
  noOutline?: boolean;
  /** Names the boss's brain uses for a generic set (e.g. { closed: 'idle', walk: 'move' }). */
  aliases?: Record<string, string>;
  /** Own sets that play by themselves at this many frames a second (the brain only picks the set). */
  fps?: Record<string, number>;
}

const DEFAULT_COUNTS: Record<string, number> = { idle: 6, move: 6, windup: 4, attack: 4, recover: 4, hurt: 2, roar: 4, death: 8 };

/** The generic pose curves: what each set does to breath, jaw, lean and so on. */
export function genericPose(anim: string, f: number, n: number, phase: number): Pose {
  const t = f / n, k = n > 1 ? f / (n - 1) : 1, s = Math.sin(t * TAU);
  const P: Pose = { anim, f, n, t, k, phase, breath: s, jaw: 0.12 + 0.08 * Math.max(0, s), lean: 0, squash: 0, step: 0, hurt: 0, death: 0, raise: 0, eyes: [], x: {} };
  switch (anim) {
    case 'move': P.step = s; P.breath = Math.sin(t * TAU * 2) * 0.5; P.lean = 0.25; P.jaw = 0.25; P.squash = Math.abs(s) * 0.05; break;
    // anticipation: rear back, gather in, mouth starting to open, limbs coming up
    case 'windup': P.lean = -0.75 * k; P.squash = 0.1 * k; P.jaw = 0.25 + 0.45 * k; P.raise = k; P.breath = 0; break;
    // the release: thrown forward and stretched, mouth wide, limbs down
    case 'attack': P.lean = 0.85 - 0.3 * k; P.squash = -0.1 + 0.08 * k; P.jaw = 1 - 0.25 * k; P.raise = 0.15; P.breath = 0; break;
    // spent: slumped, panting with the mouth hanging open
    case 'recover': P.lean = 0.35; P.squash = 0.07 + Math.abs(s) * 0.04; P.jaw = 0.55 + 0.25 * Math.abs(s); P.breath = Math.sin(t * TAU * 2); P.raise = 0; break;
    case 'hurt': P.hurt = f === 0 ? 1 : 0.5; P.lean = -0.4 * P.hurt; P.jaw = 0.6; P.squash = -0.06 * P.hurt; break;
    // the phase change: a full-body roar
    case 'roar': P.jaw = 1; P.lean = -0.5 + 0.2 * Math.sin(k * Math.PI); P.squash = -0.08; P.raise = 1; P.breath = Math.sin(t * TAU * 3) * 0.5; break;
    case 'death': P.death = k; P.hurt = 1 - k * 0.5; P.jaw = 0.9; P.lean = -0.3 + k * 0.6; P.squash = k * 0.35; break;
  }
  return P;
}

function bake(spec: RigSpec, pose: Pose, eyesIn = false): Sprite {
  const p = new PixelArt(spec.w, spec.h);
  spec.paint(p, pose);
  // a melting corpse has no eyes left to follow you with
  if (pose.death > 0.15) pose.eyes.length = 0;
  if (eyesIn) {
    // a still portrait (intro card, Bestiary): paint the irises in, looking straight out
    for (const m of pose.eyes) {
      const ir = Math.max(1, m.r * 0.6), iy = m.y + m.r * 0.3;
      p.ellipse(m.x, iy, ir, ir, m.iris);
      if (m.slit) p.rect(m.x, iy - ir * 0.8, 1, Math.max(2, Math.round(ir * 1.6)), m.pupil ?? '#0a0408');
      else p.ellipse(m.x, iy, Math.max(0.5, ir * 0.5), Math.max(0.5, ir * 0.5), m.pupil ?? '#0a0408');
      if (m.glint !== false) p.set(m.x - ir * 0.45, iy - ir * 0.5, '#ffffff');
    }
    pose.eyes.length = 0;
  }
  p.polish();
  if (!spec.noOutline) p.outline(undefined, false, 0.86);
  const sp = new Sprite(p, Math.floor(spec.w / 2), spec.oy ?? spec.h - 1);
  (sp as any).eyes = pose.eyes;
  return sp;
}

/** Bake a boss's full pose set from its painter. */
export function rig(spec: RigSpec): SpriteSet {
  const counts = { ...DEFAULT_COUNTS, ...spec.counts };
  const out: SpriteSet = {};
  for (const [anim, n] of Object.entries(counts)) {
    if (!n) continue;
    out[anim] = [...Array(n).keys()].map((f) => bake(spec, genericPose(anim, f, n, 0)));
  }
  // the idle loop with its eyes painted in, for places that show the boss without the rig
  out.portrait = [...Array(counts.idle!).keys()].map((f) => bake(spec, genericPose('idle', f, counts.idle!, 0), true));
  for (let ph = 1; ph <= (spec.phases ?? 0); ph++) {
    for (const anim of ['idle', 'move', 'windup', 'attack', 'recover']) {
      const n = counts[anim]; if (!n) continue;
      out[`${anim}_p${ph}`] = [...Array(n).keys()].map((f) => bake(spec, genericPose(anim, f, n, ph)));
    }
  }
  for (const [name, to] of Object.entries(spec.aliases ?? {})) {
    // same frames, flagged so the runtime treats them as "let the rig choose"
    const list = out[to].slice(); (list as any).generic = true; out[name] = list;
  }
  for (const [name, list] of Object.entries(spec.extra ?? {})) {
    out[name] = list.map((o, f) => {
      const base = genericPose(o.anim ?? 'idle', f, list.length, o.phase ?? 0);
      return bake(spec, { ...base, ...o, anim: name, eyes: [], x: { ...(o.x ?? {}) } });
    });
    if (spec.fps?.[name]) (out[name] as any).fps = spec.fps[name];
    // a damaged second-phase version of the boss's own sets too
    for (let ph = 1; ph <= (spec.phases ?? 0); ph++) {
      out[`${name}_p${ph}`] = list.map((o, f) => {
        const base = genericPose(o.anim ?? 'idle', f, list.length, ph);
        return bake(spec, { ...base, ...o, phase: ph, anim: name, eyes: [], x: { ...(o.x ?? {}) } });
      });
      if (spec.fps?.[name]) (out[`${name}_p${ph}`] as any).fps = spec.fps[name];
    }
  }
  return out;
}

// ------------------------------------------------------------------ runtime

/** Names the brains use that mean "nothing special: let the rig pick". */
const GENERIC = new Set(['idle', 'move', 'walk']);

/**
 * The sprite to show for a rigged boss right now. The boss's brain stays in charge of its own named
 * poses; the rig fills in everything else from its state: the wind-up tell, the spent recovery, a
 * flinch when hit, a roar at the phase change, the death, walking vs. standing, and the damaged
 * second-phase look.
 */
export function rigFrame(e: Enemy, w: World): Sprite | null {
  const S = e.sprites, d = e.data;
  const ph = Math.max(d.phase ?? 0, d.tier >= 2 ? 1 : 0);
  // the most damaged version of a set this boss has (some have two later phases, most have one)
  const pick = (anim: string): Sprite[] | undefined => { for (let k = ph; k >= 1; k--) if (S[`${anim}_p${k}`]) return S[`${anim}_p${k}`]; return S[anim]; };
  const at = (list: Sprite[] | undefined, k: number) => list?.length ? list[Math.min(list.length - 1, Math.max(0, Math.floor(k * list.length)))] : null;
  const loop = (list: Sprite[] | undefined, fps: number) => list?.length ? list[Math.floor((w.time + e.id * 0.37) * fps) % list.length] : null;
  // dying (the boss corpse sequence sets deathK)
  if (d.deathK !== undefined && S.death) return at(S.death, d.deathK);
  // movement this frame, for walking vs. standing
  const mv = Math.hypot(e.x - (d.rigPx ?? e.x), e.y - (d.rigPy ?? e.y));
  d.rigPx = e.x; d.rigPy = e.y;
  d.rigMove = (d.rigMove ?? 0) * 0.85 + mv * 0.15;
  // a flinch when hit, but not every frame of a fast weapon: at most once every 0.6 s
  if (e.flash > 0 && w.time - (d.rigHurtAt ?? -9) > 0.6) d.rigHurtAt = w.time;
  const hurting = w.time - (d.rigHurtAt ?? -9) < 0.16;
  if (e.state === 'phase' && S.roar) return at(S.roar, Math.min(0.999, e.st / 1.0));
  const own = e.anim && !GENERIC.has(e.anim) && S[e.anim] && !(S[e.anim] as any).generic;
  if (e.state === 'windup' && pick('windup')) return at(pick('windup'), Math.min(0.999, e.st / Math.max(0.05, d.windT ?? 0.3)));
  if (hurting && S.hurt && e.state !== 'attack') return at(S.hurt, (w.time - d.rigHurtAt) / 0.16);
  if (own) {
    const list = pick(e.anim)!;
    return (list as any).fps ? loop(list, (list as any).fps) : list[e.frame % list.length];
  }
  if (e.state === 'recover' && pick('recover')) return loop(pick('recover'), 7);
  if (e.state === 'attack' && pick('attack')) return loop(pick('attack'), 9);
  if (d.rigMove > 0.25 && pick('move')) return loop(pick('move'), 9);
  return loop(pick('idle'), 6);
}

/** Draw a rigged boss: its pose, then its eyes, alive and looking at you. */
export function drawRigged(e: Enemy, ctx: CanvasRenderingContext2D, w: World, sx: number, sy: number, o: { tint?: string; tintAmt?: number; alpha?: number; yoff?: number } = {}): Sprite | null {
  const spr = rigFrame(e, w); if (!spr) return null;
  const y = sy - e.z + (o.yoff ?? 0);
  spr.draw(ctx, sx, y, { flip: e.flip, flash: e.flash > 0 ? 0.5 : 0, sx: e.sx, sy: e.sy, alpha: o.alpha ?? (e.alpha < 1 ? e.alpha : undefined), tint: o.tint, tintAmt: o.tintAmt });
  if (e.flash > 0.05) return spr;
  drawEyes(e, ctx, w, spr, sx, y, e.sx, e.sy, !!e.flip);
  return spr;
}

/**
 * The live irises for a rig frame drawn with its pivot at (sx, y), scaled by (kx, ky): each one
 * looks toward the player. Also used when another boss borrows this one's body at a different size.
 */
export function drawEyes(e: Enemy, ctx: CanvasRenderingContext2D, w: World, spr: Sprite, sx: number, y: number, kx: number, ky: number, flip: boolean): void {
  const eyes = (spr as any).eyes as EyeMark[] | undefined;
  if (!eyes?.length) return;
  const pl = w.player, k = Math.max(kx, ky);
  for (const m of eyes) {
    const ex = sx + (flip ? spr.ox - m.x : m.x - spr.ox) * kx, ey = y + (m.y - spr.oy) * ky;
    // world position of this eye, so it looks right at the player
    const wx = e.x + (ex - sx), wy = e.y - e.z + (ey - y);
    const dx = pl.x - wx, dy = pl.y - 8 - wy, l = Math.hypot(dx, dy) || 1;
    const reach = Math.max(0.5, m.r * 0.45) * k;
    const ix = ex + (dx / l) * reach, iy = ey + (dy / l) * reach * 0.8;
    const ir = Math.max(1, m.r * 0.6) * k;
    ctx.fillStyle = m.iris; ctx.beginPath(); ctx.ellipse(snap(ix) + 0.5, snap(iy) + 0.5, ir, ir, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = m.pupil ?? '#0a0408';
    if (m.slit) ctx.fillRect(snap(ix), snap(iy - ir * 0.8), 1, Math.max(2, Math.round(ir * 1.6)));
    else { const pr = Math.max(0.5, ir * 0.5); ctx.beginPath(); ctx.ellipse(snap(ix) + 0.5, snap(iy) + 0.5, pr, pr, 0, 0, TAU); ctx.fill(); }
    if (m.glint !== false) { ctx.fillStyle = '#ffffff'; ctx.fillRect(snap(ix - ir * 0.45), snap(iy - ir * 0.5), 1, 1); }
  }
}
