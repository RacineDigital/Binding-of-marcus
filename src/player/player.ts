// Marcus (or another character): movement, attacking, animation state and inventory.
import { WALK_BOB, WALK_FRAMES, WALK_STEP } from '../art/hand/build';
import type { World } from '../game/world';
import { Health } from './health';
import { computeStats, FinalStats, StatMods } from './stats';
import { AttackProfile, baseProfile, mergeProfile, primaryMode, AttackMode, ProfilePart } from '../projectiles/profile';
import { CharacterDef } from './characters';
import { buildOutfitSprites, PlayerSprites, HeadDir, HeadState } from '../art/marcus';
import { costumeFor, Costume, drawCostume, Frame } from '../art/costume';
import { LOOKS } from '../art/look';
import { volley, Beam, meleeSwing, Swing, SHOT_PX } from '../projectiles/weapons';
import { clamp, TAU } from '../core/math';
import { moveBody } from '../rooms/collide';
import { getItem } from '../items/registry';
import { Side } from '../rooms/room';
import { TILE, HURT_TOP, HURT_BOT, HURT_R } from '../core/constants';

export interface TempEffect { id: string; stats?: StatMods; attack?: ProfilePart; room?: boolean; time?: number; floor?: boolean; flight?: boolean }

const MOVE_PX = 118;

export class Player {
  x = 0; y = 0; z = 0; vx = 0; vy = 0; r = 5.5; hitR = 4;
  char: CharacterDef;
  spr: PlayerSprites;
  /** What the player is wearing: accessories from items, and an outfit from strong items or a transformation. */
  costume: Costume = { outfit: null, acc: [] };
  health = new Health();
  buttons = 0; keys = 0; bombs = 0;
  goldKey = false; goldBomb = false;
  items = new Map<string, number>(); itemOrder: string[] = [];
  active: string | null = null; charge = 0; timedAcc = 0; activeRoomUses = 0;
  consumables: { kind: 'page' | 'sweet'; id: string }[] = []; consumableSlots = 1;
  charms: string[] = []; charmSlots = 1;
  stats!: FinalStats; prof!: AttackProfile; mode: AttackMode = 'shot';
  flight = false; spectralBody = false;
  temp: TempEffect[] = [];
  transformations = new Set<string>();
  // animation / state
  headDir: HeadDir = 'down'; headFlip = false; bodyDir: 'down' | 'up' | 'side' = 'down'; bodyFlip = false;
  walkDist = 0; idleT = 0; blinkT = 2; fireFlash = 0; hurtT = 0; iframes = 0; happyT = 0;
  pickupT = 0; pickupSprite: HTMLCanvasElement | null = null;
  aimAng = Math.PI / 2; aiming = false; lastAim = { x: 0, y: 1 };
  fireCd = 0; wcharge = 0; wasAiming = false; altHand = 1;
  /** The Blot's chest: how far the wound is torn open (0..1). */
  chest = 0;
  swing: Swing | null = null;
  dead = false; deathT = 0;
  squashX = 1; squashY = 1;
  controlLock = 0;
  invisible = false;
  constructor(char: CharacterDef) {
    this.char = char;
    this.spr = buildOutfitSprites(char.look, LOOKS[char.look] ?? LOOKS.marcus, null);
    this.flight = !!char.flight;
    this.recompute();
  }

  count(id: string): number { return this.items.get(id) ?? 0; }
  has(id: string): boolean { return this.items.has(id) || this.charms.includes(id); }
  tagCount(tag: string): number {
    let n = 0;
    for (const [id, c] of this.items) if (getItem(id)?.tags?.includes(tag)) n += c;
    return n;
  }

  recompute(): void {
    const mods: StatMods[] = [];
    const prof = baseProfile();
    if (this.char.profile) mergeProfile(prof, this.char.profile);
    let flight = !!this.char.flight, spectral = false;
    const addItem = (id: string, n: number) => {
      const it = getItem(id); if (!it) return;
      for (let i = 0; i < n; i++) {
        if (it.stats) mods.push(it.stats);
        if (it.attack) mergeProfile(prof, it.attack);
      }
      if (it.flight) flight = true;
      if (it.spectralBody) spectral = true;
    };
    for (const [id, n] of this.items) addItem(id, n);
    for (const id of this.charms) addItem(id, 1);
    for (const t of this.temp) { if (t.stats) mods.push(t.stats); if (t.attack) mergeProfile(prof, t.attack); if (t.flight) flight = true; }
    for (const tf of this.transformations) {
      const T = TRANSFORM_EFFECTS[tf];
      if (T) { if (T.stats) mods.push(T.stats); if (T.attack) mergeProfile(prof, T.attack); if (T.flight) flight = true; }
    }
    // Stacked homing / piercing etc. are bounded to keep extreme builds sane.
    prof.shots = Math.min(prof.shots, 16);
    prof.split = Math.min(prof.split, 8);
    prof.chain = Math.min(prof.chain, 6);
    prof.bounce = Math.min(prof.bounce, 8);
    if (prof.pierce > 50) prof.pierce = 999;
    if (prof.modes.has('charge') || prof.modes.has('burst') || prof.modes.has('beam')) { /* tears scale charge time */ }
    const st = computeStats(this.char.base, mods);
    // Charged modes trade fire rate for power.
    this.stats = st; this.prof = prof; this.mode = primaryMode(prof);
    this.flight = flight; this.spectralBody = spectral;
    this.refreshCostume();
  }

  /** Items and transformations change how you look; rebuild the sprites only when the outfit changes. */
  refreshCostume(): void {
    const c = costumeFor(this.items.keys(), this.charms, this.transformations, this.flight, this.char.look);
    if ((c.outfit?.id ?? '') !== (this.costume.outfit?.id ?? '')) this.spr = buildOutfitSprites(this.char.look, LOOKS[this.char.look] ?? LOOKS.marcus, c.outfit);
    this.costume = c;
  }

  addTemp(t: TempEffect): void { this.temp.push(t); this.recompute(); }
  clearTemp(pred: (t: TempEffect) => boolean): void {
    const n = this.temp.length; this.temp = this.temp.filter((t) => !pred(t));
    if (this.temp.length !== n) this.recompute();
  }

  healRed(half: number, fx = false): number {
    const h = this.health.healRed(half);
    if (fx && h > 0) this.happyT = 0.4;
    return h;
  }

  chargeTime(): number {
    // Higher fire rate charges faster.
    const m = this.prof.modes;
    // a laser filament focuses the Burning Glass; Held Breath steadies every charged attack
    const k = (this.mode === 'beam' && m.has('laser') ? 0.65 : 1) * (this.mode !== 'charge' && m.has('charge') ? 0.85 : 1);
    return clamp(this.prof.chargeTime * k * (2.73 / this.stats.fireRate), 0.25, 3.2);
  }

  /** Where the Blot's beam pours from: the middle of the chest, wherever the body is floating. */
  chestY(): number { return this.y - (this.flight ? 8 : 0) - 6; }
  update(w: World, dt: number): void {
    // the chest tears open as the beam charges, gapes while it pours, then seals over again
    if (this.prof.short) {
      const firing = w.beams.some((b) => !b.enemyBeam && b.prof?.short);
      const want = firing ? 1 : this.wcharge * 0.75;
      this.chest += (want - this.chest) * Math.min(1, dt * (want > this.chest ? 14 : 5));
    } else this.chest = 0;
    if (this.dead) { this.deathT += dt; return; }
    const inp = w.input;
    const locked = this.controlLock > 0 || w.inputLocked();
    if (this.controlLock > 0) this.controlLock -= dt;
    // ------------------------------------------------ movement
    const mv = locked ? { x: 0, y: 0 } : inp.moveVector();
    const focus = !locked && inp.isDown('focus');
    const top = MOVE_PX * this.stats.speed * (focus ? 0.55 : 1);
    const tx = mv.x * top, ty = mv.y * top;
    const accel = (mv.x || mv.y) ? 30 : 24;
    const k = 1 - Math.exp(-accel * dt);
    this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
    if (Math.abs(this.vx) < 0.5 && !mv.x) this.vx = 0;
    if (Math.abs(this.vy) < 0.5 && !mv.y) this.vy = 0;
    // door funnel: when pushing into a wall near an open door, slide toward it
    this.doorAssist(w, mv.x, mv.y, dt);
    const doors = w.openDoorList();
    const before = { x: this.x, y: this.y };
    moveBody(w.room, this, this.vx * dt, this.vy * dt, this.flight ? 'fly' : 'walk', doors);
    const moved = Math.hypot(this.x - before.x, this.y - before.y);
    // a puff of dust each time a foot lands (twice per walk cycle)
    const half = (WALK_FRAMES / 2) * WALK_STEP, stepBefore = Math.floor((this.walkDist + WALK_STEP) / half);
    this.walkDist += moved;
    if (!this.flight && Math.floor((this.walkDist + WALK_STEP) / half) !== stepBefore && Math.hypot(this.vx, this.vy) > 60) {
      w.fx.smoke(this.x - this.vx * 0.04, this.y + 1, 1, 'rgba(120,110,105,', 2, 0.35, 3);
    }
    if (moved < 0.05) this.idleT += dt; else this.idleT = 0;
    if (mv.x || mv.y) {
      if (Math.abs(mv.x) > Math.abs(mv.y) * 1.1) { this.bodyDir = 'side'; this.bodyFlip = mv.x < 0; }
      else this.bodyDir = mv.y < 0 ? 'up' : 'down';
    }
    // ------------------------------------------------ aim & attack
    const aim = locked ? null : inp.aimVector();
    this.aiming = !!aim;
    if (aim) { this.aimAng = Math.atan2(aim.y, aim.x); this.lastAim = aim; }
    this.attack(w, dt, aim);
    // head direction: aim wins, else movement
    const hx = aim ? aim.x : mv.x, hy = aim ? aim.y : mv.y;
    if (hx || hy) {
      if (Math.abs(hx) > Math.abs(hy) * 0.9) { this.headDir = 'side'; this.headFlip = hx < 0; }
      else this.headDir = hy < 0 ? 'up' : 'down';
    }
    // ------------------------------------------------ timers
    this.fireFlash = Math.max(0, this.fireFlash - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.happyT = Math.max(0, this.happyT - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.pickupT = Math.max(0, this.pickupT - dt);
    this.blinkT -= dt; if (this.blinkT < -0.12) this.blinkT = 1.5 + Math.random() * 3;
    this.squashX += (1 - this.squashX) * Math.min(1, dt * 14);
    this.squashY += (1 - this.squashY) * Math.min(1, dt * 14);
    if (this.swing) { this.swing.t += dt; if (this.swing.t >= this.swing.dur) this.swing = null; }
    // timed temp effects
    let changed = false;
    for (const t of this.temp) if (t.time !== undefined) { t.time -= dt; if (t.time <= 0) changed = true; }
    if (changed) this.clearTemp((t) => t.time !== undefined && t.time <= 0);
    // timed active charge
    const act = this.active ? getItem(this.active) : null;
    if (act?.active?.type === 'timed' && this.charge < act.active.charge) {
      this.charge = Math.min(act.active.charge, this.charge + dt);
    }
  }

  private doorAssist(w: World, mx: number, my: number, dt: number): void {
    if (!mx && !my) return;
    const room = w.room;
    for (const d of w.openDoorList()) {
      const L = room.ox, T = room.oy, R = room.ox + room.cols * TILE, B = room.oy + room.rows * TILE;
      if (d.side === Side.N && my < -0.5 && this.y - this.r < T + 3 && Math.abs(this.x - d.pos) < 18) this.vx += (d.pos - this.x) * 18 * dt * 4;
      if (d.side === Side.S && my > 0.5 && this.y + this.r > B - 3 && Math.abs(this.x - d.pos) < 18) this.vx += (d.pos - this.x) * 18 * dt * 4;
      if (d.side === Side.W && mx < -0.5 && this.x - this.r < L + 3 && Math.abs(this.y - d.pos) < 18) this.vy += (d.pos - this.y) * 18 * dt * 4;
      if (d.side === Side.E && mx > 0.5 && this.x + this.r > R - 3 && Math.abs(this.y - d.pos) < 18) this.vy += (d.pos - this.y) * 18 * dt * 4;
    }
  }

  /**
   * Where Marcus can be hurt, in screen space (the way shots are drawn): an upright capsule over
   * his torso and face, a little inside the sprite so grazes feel fair.
   */
  hurtCapsule(): { x: number; y0: number; y1: number; r: number } {
    const lift = this.flight ? 8 : 0;
    return { x: this.x, y0: this.y - HURT_TOP - lift, y1: this.y - HURT_BOT - lift, r: HURT_R };
  }
  /** Squared distance from a screen-space point to the hurt capsule's spine. */
  hurtDist2(x: number, y: number): number {
    const c = this.hurtCapsule();
    const cy = Math.max(c.y0, Math.min(c.y1, y));
    return (x - c.x) * (x - c.x) + (y - cy) * (y - cy);
  }
  /** Does a round thing of radius r drawn at (x, y) touch Marcus? */
  hurtBy(x: number, y: number, r: number): boolean {
    const rr = HURT_R + r;
    return this.hurtDist2(x, y) < rr * rr;
  }

  /** Muzzle position: in front of Marcus at hand height, alternating hands. */
  muzzle(ang: number): { x: number; y: number; z: number } {
    const px = -Math.sin(ang), py = Math.cos(ang);
    const side = this.altHand * 3;
    return { x: this.x + Math.cos(ang) * 6 + px * side, y: this.y + Math.sin(ang) * 3 + py * side * 0.5 + 1, z: 12 };
  }

  private attack(w: World, dt: number, aim: { x: number; y: number } | null): void {
    this.fireCd = Math.max(this.fireCd - dt, aim ? -dt * 4 : 0);
    const mode = this.mode;
    const prof = this.prof, st = this.stats;
    const ang = this.aimAng;
    const charged = mode === 'charge' || mode === 'burst' || mode === 'beam';
    if (charged) {
      if (aim) {
        this.wcharge = Math.min(1, this.wcharge + dt / this.chargeTime());
        if (this.wcharge >= 1 && !this.wasAiming) { /* noop */ }
        if (this.wcharge >= 1 && Math.random() < 0.3) w.fx.sparks(this.x, this.y - 22, 1, '#b8b0ff', 30, 0.2);
      } else if (this.wasAiming && this.wcharge > 0) {
        this.releaseCharged(w, mode);
        this.wcharge = 0;
      } else this.wcharge = Math.max(0, this.wcharge - dt * 3);
      this.wasAiming = !!aim;
      return;
    }
    if (mode === 'melee') {
      if (aim) {
        this.wcharge = Math.min(1, this.wcharge + dt / (this.chargeTime() * 1.3));
        if (this.fireCd <= 0 && this.wcharge < 0.35) {
          this.swing = meleeSwing(w, prof, st, this.x, this.y - 8, ang, false);
          this.modeCombos(w, ang, false);
          this.fireCd = 1 / Math.max(1.2, st.fireRate * 0.55);
          this.onFired(w, ang, 'swing');
        }
      } else if (this.wasAiming) {
        if (this.wcharge >= 1) { this.swing = meleeSwing(w, prof, st, this.x, this.y - 8, this.aimAng, true); this.modeCombos(w, this.aimAng, true); this.onFired(w, this.aimAng, 'spin'); w.shake(3); }
        this.wcharge = 0;
      }
      this.wasAiming = !!aim;
      return;
    }
    this.wasAiming = !!aim;
    if (!aim || this.fireCd > 0) return;
    let volleys = 0;
    while (this.fireCd <= 0 && volleys < 3) { this.fireCd += 1 / st.fireRate; volleys++; }
    if (mode === 'laser') {
      const n = Math.max(1, Math.min(5, prof.shots));
      const heavy = prof.modes.has('charge');
      for (const base of this.fireAngles(ang)) {
        for (let i = 0; i < n; i++) this.fireLaser(w, base, n === 1 ? 0 : (i - (n - 1) / 2) * 0.14, st.damage * (heavy ? 1.3 : 1), heavy ? 1 : 0);
        // burst: each pull also scatters a pair of weaker stray lasers
        if (prof.modes.has('burst')) for (const o of [-0.3, 0.3]) this.fireLaser(w, base, o + (Math.random() - 0.5) * 0.2, st.damage * 0.55, 0);
      }
      this.onFired(w, ang, 'laser');
      return;
    }
    for (let k = 0; k < volleys; k++) {
      const m = this.muzzle(ang);
      volley(w, prof, st, m.x, m.y, m.z, ang, { inherit: { vx: this.vx, vy: this.vy } });
      this.altHand = -this.altHand;
    }
    this.onFired(w, ang, 'shot');
  }

  private releaseCharged(w: World, mode: AttackMode): void {
    const c = this.wcharge, prof = this.prof, st = this.stats, ang = this.aimAng;
    const m = this.muzzle(ang);
    if (mode === 'beam') {
      if (c < 1) return;
      const n = Math.max(1, Math.min(5, prof.shots));
      const heavy = prof.modes.has('charge');
      for (const base of this.fireAngles(ang)) for (let i = 0; i < n; i++) {
        const b = new Beam(prof);
        b.ang = base; b.offset = n === 1 ? 0 : (i - (n - 1) / 2) * 0.22;
        b.dur = prof.short ? 0.7 : 0.5; b.width = (prof.short ? 9 : 7) * Math.min(2.2, st.size) * (heavy ? 1.25 : 1); b.dmg = st.damage * 0.55 * (heavy ? 1.35 : 1);
        b.color = prof.tint ?? (prof.modes.has('laser') ? '#ff5a8a' : '#6a58ff');
        w.beams.push(b);
      }
      // burst: the beam goes off with a spray of shots
      if (prof.modes.has('burst')) this.spray(w, ang, 6 + prof.shots * 2, 0.8);
      w.shake(2.5);
      this.onFired(w, ang, 'beam');
      return;
    }
    if (mode === 'burst') {
      const n = Math.round((3 + 13 * c) * (prof.modes.has('charge') ? 1.4 : 1)) + (prof.shots - 1) * 2;
      for (const base of this.fireAngles(ang)) this.spray(w, base, base === ang ? n : Math.ceil(n / 3), 0.9);
      w.shake(1 + c * 2);
      this.onFired(w, ang, 'burst');
      return;
    }
    // charge
    volley(w, prof, st, m.x, m.y, m.z, ang, { dmgMul: 0.3 + c * 3.7, sizeMul: 0.6 + c * 1.1, speedMul: 1 + c * 0.25, rangeMul: 1 + c * 0.3, inherit: { vx: this.vx, vy: this.vy } });
    if (c >= 1) w.shake(2);
    this.onFired(w, ang, c >= 1 ? 'bigshot' : 'shot');
  }

  /** Aim direction plus the extra directions rear / side shots add. */
  private fireAngles(ang: number): number[] {
    const a = [ang];
    if (this.prof.rear) a.push(ang + Math.PI);
    if (this.prof.sides) a.push(ang + Math.PI / 2, ang - Math.PI / 2);
    return a;
  }
  private fireLaser(w: World, ang: number, offset: number, dmg: number, extraW: number): void {
    const b = new Beam(this.prof);
    b.ang = ang; b.offset = offset; b.laser = true; b.dur = 0.12;
    b.width = 2 + (this.stats.size - 1) * 3 + extraW; b.dmg = dmg; b.color = this.prof.tint ?? '#ff5a6a';
    w.beams.push(b);
  }
  /** A burst-style spray of shots carrying the full profile. */
  private spray(w: World, ang: number, n: number, dmgMul: number): void {
    const m = this.muzzle(ang), st = this.stats;
    for (let i = 0; i < n; i++) {
      const a = ang + (Math.random() - 0.5) * 0.9;
      w.proj.player(w, this.prof, m.x, m.y, m.z, a, st.damage * dmgMul, SHOT_PX * st.shotSpeed * (0.7 + Math.random() * 0.6), st.range * (0.7 + Math.random() * 0.5), st.size * (0.8 + Math.random() * 0.5));
    }
  }
  /** Melee folds the other attack modes into its swings. */
  private modeCombos(w: World, ang: number, charged: boolean): void {
    const m = this.prof.modes, st = this.stats;
    if (m.has('laser')) {
      if (charged) for (let i = 0; i < 8; i++) this.fireLaser(w, ang + (i / 8) * TAU, 0, st.damage * 1.2, 1);
      else this.fireLaser(w, ang, 0, st.damage * 0.8, 0);
    }
    if (m.has('beam') && charged) {
      for (const base of this.fireAngles(ang)) {
        const b = new Beam(this.prof);
        b.ang = base; b.dur = 0.45; b.width = 7 * Math.min(2.2, st.size); b.dmg = st.damage * 0.5; b.color = this.prof.tint ?? '#6a58ff';
        w.beams.push(b);
      }
    }
    if (m.has('burst') && charged) for (let i = 0; i < 4; i++) this.spray(w, ang + (i / 4) * TAU, 3, 0.7);
    if (m.has('charge') && charged) w.shake(1.5);
  }

  private onFired(w: World, ang: number, kind: string): void {
    this.fireFlash = 0.11;
    this.squashX = 1.08; this.squashY = 0.93;
    const m = this.muzzle(ang);
    w.fx.spray(m.x, m.y, m.z, ang, 1.2, 2, this.prof.tint ?? '#3a3f9a', 40, 0.15);
    w.audio.play(kind === 'beam' ? 'beam' : kind === 'laser' ? 'laser' : kind === 'swing' || kind === 'spin' ? 'swing' : kind === 'burst' || kind === 'bigshot' ? 'bigshot' : 'shoot', { vol: 0.5, x: this.x });
    w.itemHook('onFire', ang);
  }

  // ------------------------------------------------------------ render
  render(ctx: CanvasRenderingContext2D, w: World, sx: number, sy: number): void {
    const s = this.spr;
    if (this.dead) {
      const t = this.deathT;
      const pr = Math.min(17, 3 + t * 16);
      ctx.fillStyle = '#14163a'; ctx.beginPath(); ctx.ellipse(sx, sy, pr, pr * 0.42, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2e70'; ctx.beginPath(); ctx.ellipse(sx - pr * 0.25, sy - pr * 0.12, pr * 0.45, pr * 0.15, 0, 0, TAU); ctx.fill();
      if (t < 1.35) {
        const k = t < 0.35 ? 0 : Math.min(1, (t - 0.35) / 1.0);
        const jx = t < 0.35 ? (Math.random() - 0.5) * 3 : 0;
        const sink = Math.round(k * k * 30);
        ctx.save();
        ctx.beginPath(); ctx.rect(sx - 20, sy - 40, 40, 40 + 1); ctx.clip();
        s.body.down[0].draw(ctx, sx + jx, sy + sink, { flash: t < 0.12 ? 1 : 0, tint: '#2a2e70', tintAmt: k * 0.7 });
        s.head.down.hurt.draw(ctx, sx + jx, sy - 10 + sink, { tint: '#2a2e70', tintAmt: k * 0.7 });
        ctx.restore();
      } else {
        const blink = Math.floor(t * 2.2) % 5 === 0;
        ctx.fillStyle = '#f2f0ff';
        if (!blink) { ctx.fillRect(Math.round(sx - 4), Math.round(sy - 2), 2, 2); ctx.fillRect(Math.round(sx + 2), Math.round(sy - 2), 2, 2); }
      }
      return;
    }
    if (this.invisible) return;
    // shadow
    // flying readers ride well above a small, faint shadow, with a downdraft stirring under them
    const hover = this.flight ? 8 + Math.sin(w.time * 4) * 2 : 0;
    if (this.flight) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.ellipse(sx, sy + 1, 4.5 - (hover - 8) * 0.4, 1.8, 0, 0, TAU); ctx.fill();
      const k = (w.time * 1.6) % 1;
      ctx.strokeStyle = `rgba(230,230,255,${0.3 * (1 - k)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(sx, sy + 1, 4 + k * 7, 1.5 + k * 2.2, 0, 0, TAU); ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath(); ctx.ellipse(sx, sy, 7, 2.5, 0, 0, TAU); ctx.fill();
    }
    const flicker = this.iframes > 0 && Math.floor(this.iframes * 18) % 2 === 0;
    const alpha = flicker ? 0.35 : this.char.id === 'elias' ? 0.85 : 1;
    const moving = Math.hypot(this.vx, this.vy) > 12;
    const walkFrame = Math.floor(this.walkDist / WALK_STEP) % WALK_FRAMES;
    let body;
    if (this.pickupT > 0) body = s.pickup;
    // fliers never walk: their legs hang still, angel-style, whether moving or not
    else if (this.flight) body = s.fly[this.bodyDir][Math.floor(w.time * 1.6) % 2];
    else if (moving) body = s.body[this.bodyDir][1 + (walkFrame % (s.body[this.bodyDir].length - 1))];
    else body = s.bodyIdle[this.bodyDir][Math.floor(w.time * 1.6) % 2];
    const by = sy - hover;
    const o = { flip: this.bodyDir === 'side' && this.bodyFlip, alpha, sx: this.squashX, sy: this.squashY, flash: this.hurtT > 0.3 ? (this.hurtT - 0.3) * 4 : 0, tint: this.hurtT > 0 ? '#ff2030' : undefined, tintAmt: this.hurtT > 0 ? this.hurtT * 0.8 : 0 };
    const headAbove = this.headDir === 'up';
    let hs: HeadState = 'normal';
    if (this.hurtT > 0) hs = 'hurt';
    else if (this.fireFlash > 0) hs = 'fire';
    else if (this.happyT > 0 || this.pickupT > 0) hs = 'happy';
    else if (this.blinkT < 0) hs = 'blink';
    const head = s.head[this.headDir][hs];
    // the head rides on the torso: it dips exactly when the body does, a whole pixel, never a half
    const bob = this.pickupT > 0 ? 0 : moving && !this.flight ? WALK_BOB[walkFrame] : (Math.floor(w.time * 1.6) % 2);
    const headY = by - 10 + bob;
    const hsq = this.fireFlash > 0 ? { sx: 1.06, sy: 0.92 } : { sx: this.squashX, sy: this.squashY };
    // costume pieces are layered around the body and head
    const acc = this.costume.acc;
    const fr: Frame | null = acc.length ? {
      ctx, t: w.time,
      hx: sx - head.ox, hy: headY - head.oy, hw: head.w, hflip: this.headDir === 'side' && this.headFlip, hdir: this.headDir,
      bx: sx - body.ox, by: by - body.oy, bw: body.w, bflip: o.flip, bdir: this.pickupT > 0 ? 'down' : this.bodyDir,
    } : null;
    const layer = (l: 'back' | 'body' | 'hand' | 'head' | 'face') => { if (!fr) return; ctx.save(); ctx.globalAlpha = alpha; drawCostume(fr, acc, l); ctx.restore(); };
    const facingAway = this.bodyDir === 'up' && this.pickupT <= 0;
    if (!facingAway) layer('back');
    if (!headAbove) { body.draw(ctx, sx, by, o); layer('body'); layer('hand'); }
    if (!headAbove) this.drawChest(w, ctx, sx, by);
    head.draw(ctx, sx, headY, { ...o, flip: this.headDir === 'side' && this.headFlip, sx: hsq.sx, sy: hsq.sy });
    layer('face'); layer('head');
    if (this.chest > 0.05) this.drawBlazingEyes(w, ctx, sx, headY, head);
    if (headAbove) { body.draw(ctx, sx, by, o); layer('body'); layer('hand'); }
    if (facingAway) layer('back');
    if (this.pickupT > 0 && this.pickupSprite) {
      const k = Math.min(1, (1.1 - this.pickupT) * 6);
      ctx.drawImage(this.pickupSprite, Math.round(sx - 8), Math.round(headY - 34 - k * 4));
    }
    // charge meter
    if (this.wcharge > 0.02 && (this.mode === 'charge' || this.mode === 'burst' || this.mode === 'beam' || this.mode === 'melee')) {
      const wbar = 16, x0 = Math.round(sx - wbar / 2), y0 = Math.round(headY - 30);
      ctx.fillStyle = '#0c0a12'; ctx.fillRect(x0 - 1, y0 - 1, wbar + 2, 4);
      const full = this.wcharge >= 1;
      ctx.fillStyle = full ? (Math.floor(w.time * 12) % 2 ? '#ffffff' : '#c8c0ff') : '#8a7cff';
      ctx.fillRect(x0, y0, Math.round(wbar * this.wcharge), 2);
    }
    // melee swing arc
    if (this.swing) {
      const sw = this.swing, k = sw.t / sw.dur;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = sw.big ? '#e8e0ff' : '#d8d0c0'; ctx.lineWidth = sw.big ? 4 : 3;
      for (const c of sw.big ? [sw.ang] : sw.centers) {
        const a0 = c - sw.arc / 2, a1 = c + sw.arc / 2;
        const sweep = a0 + (a1 - a0) * Math.min(1, k * 2.2);
        ctx.strokeStyle = sw.big ? '#e8e0ff' : this.prof.tint ?? '#d8d0c0'; ctx.lineWidth = sw.big ? 4 : 3;
        ctx.beginPath(); ctx.ellipse(sx, sy - 8, sw.radius * 0.9, sw.radius * 0.75, 0, a0, sweep); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(sx, sy - 8, sw.radius, sw.radius * 0.85, 0, a0, sweep); ctx.stroke();
      }
      ctx.restore();
    }
  }
  /** The wound in the Blot's chest: a ragged ring of ink with little teeth, a churning void, drips. */
  private drawChest(w: World, ctx: CanvasRenderingContext2D, sx: number, by: number): void {
    const k = this.chest; if (k < 0.04) return;
    const cx = sx + (this.bodyDir === 'side' ? (this.bodyFlip ? -1 : 1) : 0), cy = by - 6, t = w.time;
    const rx = 0.8 + 3.6 * k, ry = 0.8 + 3.2 * k;
    ctx.save();
    // torn rim: a jagged ring of ink, its spikes curling as it breathes
    ctx.fillStyle = '#2a2650';
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * TAU, spike = i % 2 ? 1 + 0.5 * k + Math.sin(t * 9 + i) * 0.25 : 0.8;
      ctx.lineTo(cx + Math.cos(a) * (rx + 1.5) * spike, cy + Math.sin(a) * (ry + 1.3) * spike);
    }
    ctx.fill();
    // the hole itself
    ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.fill();
    // ink swirling in the dark
    for (let i = 0; i < 5; i++) {
      const a = t * 6 + i * 1.26, r = (0.3 + (i % 3) * 0.25) * Math.min(rx, ry);
      ctx.fillStyle = i % 2 ? '#3a2a8a' : '#6a5ad8';
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), 1, 1);
    }
    if (k > 0.5) { ctx.globalAlpha = (k - 0.5) * 2 * (0.6 + 0.4 * Math.sin(t * 30)); ctx.fillStyle = '#a898ff'; ctx.fillRect(Math.round(cx - 1), Math.round(cy - 0.5), 2, 1); ctx.globalAlpha = 1; }
    // little teeth round the edge once it's wide open
    if (k > 0.45) {
      ctx.fillStyle = '#e8e4ff';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.2; ctx.fillRect(Math.round(cx + Math.cos(a) * rx * 0.9), Math.round(cy + Math.sin(a) * ry * 0.9), 1, 1); }
    }
    // ink running down from the wound
    ctx.fillStyle = '#14122a';
    for (let i = 0; i < 3; i++) {
      const l = ((t * 1.6 + i * 0.33) % 1) * (2 + k * 5);
      ctx.fillRect(Math.round(cx - 2 + i * 2), Math.round(cy + ry), 1, Math.round(1 + l));
    }
    ctx.restore();
    w.r.addGlow(cx, cy, 10 + k * 12, '#6a4aff', 0.12 + k * 0.25);
  }
  /** While the wound is open the Blot's eyes burn white-violet. */
  private drawBlazingEyes(w: World, ctx: CanvasRenderingContext2D, sx: number, headY: number, head: { ox: number; oy: number; w: number }): void {
    if (this.headDir === 'up') return;
    const k = this.chest, x0 = sx - head.ox, y0 = headY - head.oy, flip = this.headDir === 'side' && this.headFlip;
    const eyes = this.headDir === 'down' ? [5, 14] : [13];
    const flick = 0.75 + 0.25 * Math.sin(w.time * 40);
    for (const ex of eyes) {
      const x = flip ? x0 + head.w - ex - 2 : x0 + ex;
      ctx.globalAlpha = Math.min(1, k * 1.6) * flick; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y0 + 12), 2, 2);
      ctx.fillStyle = '#c8bcff'; ctx.fillRect(Math.round(x - 1), Math.round(y0 + 13), 1, 1); ctx.fillRect(Math.round(x + 2), Math.round(y0 + 13), 1, 1);
      // streaks of light trailing off the eyes
      ctx.globalAlpha = k * 0.5 * flick; ctx.fillRect(Math.round(x + (flip ? 2 : -1)), Math.round(y0 + 12 - k * 2), 1, Math.round(1 + k * 2));
      w.r.addGlow(x + 1, y0 + 13, 8 + k * 10, '#b8a8ff', 0.25 + k * 0.45);
    }
    ctx.globalAlpha = 1;
  }
}

/** Transformation bonuses (granted by collecting 3 items sharing a tag). */
export const TRANSFORM_EFFECTS: Record<string, { name: string; desc: string; stats?: StatMods; attack?: ProfilePart; flight?: boolean }> = {
  moth: { name: 'Mothkin', desc: 'Flight. Speed up. Dusty wings.', stats: { speed: 0.2 }, flight: true },
  ink: { name: 'Inkblooded', desc: 'Shots leave ink puddles. Damage up.', stats: { damage: 1 }, attack: { creep: true } },
  clock: { name: 'Clockwork', desc: 'Fire rate up. Shots wind forward faster.', stats: { tears: 0.7 }, attack: { accel: 0.8 } },
  wax: { name: 'Waxen Saint', desc: 'Shots burn. A halo of heat.', stats: { damage: 0.5 }, attack: { burn: 0.25, tint: '#f0c060' } },
  thread: { name: 'Needleworker', desc: 'Shots pierce and stitch enemies together.', attack: { pierce: 2, chain: 1, chainChance: 0.2 } },
  bone: { name: 'Ossified', desc: 'Brass heart every floor. Bony shots.', stats: { damage: 0.7 }, attack: { shape: 'bone', knock: 1 } },
  void: { name: 'Hollowed', desc: 'Spectral homing shots.', attack: { spectral: true, homing: 0.4 } },
  drain: { name: 'Drainer', desc: 'Flight. Speed up. Every shot can chill.', stats: { speed: 0.2, tears: 0.3 }, attack: { slow: 0.25, tint: '#a8dcff' }, flight: true },
  vamp: { name: 'King Vamp', desc: 'Damage up. Your shots drink blood.', stats: { damage: 1.5 }, attack: { lifesteal: 0.35, tint: '#d01828', shape: 'blood' } },
  jeffy: { name: 'Jeffy', desc: 'Speed and damage up. Getting hit throws a tantrum of pencils.', stats: { damage: 1, speed: 0.2 }, attack: { pierce: 1, shape: 'needle', tint: '#f0c030' } },
};
