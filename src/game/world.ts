// The in-run simulation: owns every entity in the current room and all cross-system interactions.
import type { Game } from './game';
import type { Renderer } from '../render/renderer';
import type { Input } from '../core/input';
import type { AudioEngine } from '../audio/audio';
import { Run, Floor } from './run';
import { RoomData, Ob, OB_SOLID_SHOT, DoorDef, Side } from '../rooms/room';
import { FloorTheme } from '../data/floors';
import { Player } from '../player/player';
import { Enemy, HurtInfo } from '../enemies/enemy';
import { Projectiles, Proj } from '../projectiles/projectiles';
import { Beam, updateBeams } from '../projectiles/weapons';
import { Pickup, popPickup, updatePickups } from './pickups';
import { FX } from '../effects/fx';
import { FlowField, flushTell, TELL } from '../enemies/ai';
import { OpenDoor } from '../rooms/collide';
import { TILE } from '../core/constants';
import { TAU, clamp, dist, dist2 } from '../core/math';
import { AttackProfile, luckChance, luckChance as luckChanceBase } from '../projectiles/profile';
import { Bomb, updateBombs } from './bombs';
import { Familiar, updateFamiliars, syncFamiliars } from '../items/familiar_rt';
import { Npc, updateNpcs } from './npc';
import { getItem } from '../items/registry';
import type { ItemHooks } from '../items/types';
import { propsFor, PropSet } from '../art/props';
import { BG_MARGIN } from '../art/roombg';
import { RNG } from '../core/rng';
import { rollDropKind, spawnDrop } from './drops';
import { checkProgress } from './progress';
import * as flow from './roomflow';
import { loopBossFrames } from '../bosses/bosslife';
import { renderWorld } from './worldrender';
import { Hud } from '../ui/hud';

import { BEER } from '../projectiles/art';
export interface Creep { x: number; y: number; r: number; team: 'player' | 'enemy'; dps: number; life: number; max: number; color: string; tick: number }
export interface DoorRT { def: DoorDef; open: number; x: number; y: number; revealed: boolean }
export interface Transition { snap: HTMLCanvasElement; dx: number; dy: number; t: number; dur: number; kind: 'slide' | 'fade' }
export interface ExplodeOpts { friendly?: boolean; small?: boolean; bomb?: boolean; mods?: any; noPlayer?: boolean; source?: string }

export class World {
  game: Game; r: Renderer; input: Input; audio: AudioEngine;
  run: Run; floor!: Floor; theme!: FloorTheme; room!: RoomData;
  player: Player;
  enemies: Enemy[] = []; proj = new Projectiles(); beams: Beam[] = []; pickups: Pickup[] = []; bombs: Bomb[] = [];
  familiars: Familiar[] = []; creep: Creep[] = []; npcs: Npc[] = [];
  fx = new FX(); flow = new FlowField();
  props!: PropSet;
  doors: DoorRT[] = [];
  /** Set when the player takes a hit in the current room (flawless-clear bonus). */
  roomHit = false;
  time = 0; roomTime = 0; hitstopT = 0; trauma = 0; camX = 0; camY = 0; camTX = 0; camTY = 0;
  icamX = 0; icamY = 0; renderCamX = 0; renderCamY = 0;
  obstacleLayer: HTMLCanvasElement | null = null; obstacleDirty = true;
  transition: Transition | null = null;
  lockdown = false;       // doors held shut (boss fight, challenge waves)
  hud: Hud;
  /** Debug: draw hurtboxes (toggled from __bomDebug.hitboxes). */
  showHitboxes = false;
  bossList: Enemy[] = [];
  deathT = -1;
  floorIntroT = 0;
  redFlash = 0; whiteFlash = 0;
  pendingKegs: { c: number; r: number; t: number }[] = [];
  roomRng: RNG = new RNG('x');
  timeScale = 1; slowT = 0;
  labels: { x: number; y: number; text: string; color: string }[] = [];
  nearPedestal: Pickup | null = null;
  /** Seconds every remaining enemy has been unreachable and unhittable (soft-lock failsafe). */
  stuckT = 0;
  /** Closest pedestal or shop pickup, for the inspect card. */
  nearInspect: Pickup | null = null;
  trapdoor: { x: number; y: number; t: number; kind: 'down' | 'light' | 'portal'; armed?: boolean } | null = null;
  /** After the Binding (once the story is finished): the door that ends the run as a win. */
  exitDoor: { x: number; y: number; t: number; kind?: 'exit' | 'room4'; cd?: number } | null = null;
  /** After the Binding: a beam of light up to the Dedication (or, in Room 4, up into the morning). */
  lightBeam: { x: number; y: number; t: number; kind?: 'light' | 'home' } | null = null;
  /** The back stair to St. Agnes, boarded over until something blows the boards off. */
  backStair: { x: number; y: number; t: number; boarded: boolean } | null = null;
  ambient: { x: number; y: number; vx: number; vy: number; life: number; kind: number }[] = [];
  telegraphs: { x: number; y: number; r: number; t: number; dur: number; color: string }[] = [];
  corpses: { e: Enemy; t: number; dur: number }[] = [];
  /** Enemies in the blink between dying and bursting (drawn as a white swell). */
  pops: { e: Enemy; t: number }[] = [];
  tasks: { t: number; fn: () => void; persist: boolean }[] = [];
  /** Run fn after `delay` seconds of game time (paused with the game; dropped on room change unless persist). */
  after(delay: number, fn: () => void, persist = false): void { this.tasks.push({ t: delay, fn, persist }); }
  constructor(game: Game, run: Run, player: Player) {
    this.game = game; this.r = game.r; this.input = game.input; this.audio = game.audio;
    this.run = run; this.player = player;
    this.hud = new Hud(this);
    this.fx.decalSink = (x, y, c, s) => this.decalSplat(x, y, c, s * 0.8);
  }

  // =============================================================== main update
  inputLocked(): boolean { return !!this.transition || this.deathT >= 0 || this.floorIntroT > 0.6 || this.hud.bossIntroT > 0; }

  update(dtReal: number): void {
    this.hud.update(dtReal);
    (this.audio as any).listenerX = this.camX + 240;
    if (this.transition) {
      this.transition.t += dtReal;
      if (this.transition.t >= this.transition.dur) this.transition = null;
      this.fx.update(dtReal);
      return;
    }
    if (this.floorIntroT > 0) this.floorIntroT -= dtReal;
    this.hitstopBudget = Math.min(0.15, this.hitstopBudget + dtReal * 0.15);
    if (this.hitstopT > 0) { this.hitstopT -= dtReal; this.trauma = Math.max(0, this.trauma - dtReal * 1.5); return; }
    if (this.slowT > 0) { this.slowT -= dtReal; this.timeScale = 0.5; } else this.timeScale = 1;
    const dt = dtReal * this.timeScale;
    this.time += dt; this.roomTime += dt; this.run.stats.time += dtReal;
    this.trauma = Math.max(0, this.trauma - dtReal * 1.6);
    this.redFlash = Math.max(0, this.redFlash - dtReal * 3);
    this.whiteFlash = Math.max(0, this.whiteFlash - dtReal * 4);

    if (this.deathT >= 0) {
      this.deathT += dtReal;
      this.player.update(this, dtReal);
      this.fx.update(dtReal);
      if (this.deathT > 2.2) this.game.onPlayerDeath();
      return;
    }
    const pl = this.player;
    pl.update(this, dtReal); // player keeps full speed even in slow-mo
    this.flow.t -= dt;
    if (this.flow.t <= 0) { this.flow.build(this); this.flow.t = 0.2; }
    for (const e of this.enemies) this.updateEnemy(e, dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.separateEnemies();
    updateFamiliars(this, dt);
    this.proj.enemyGrace = Math.max(0, this.proj.enemyGrace - dt);
    this.proj.update(this, dt);
    updateBeams(this, dt);
    updateBombs(this, dt);
    updatePickups(this, dt);
    updateNpcs(this, dt);
    this.updateCreep(dt);
    this.updateObstacles(dt);
    this.contactDamage();
    this.collectPickups();
    flow.updateDoors(this, dt);
    flow.checkRoomClear(this);
    flow.checkExit(this);
    flow.updateSpecial(this, dt);
    this.itemHook('onTick', dt);
    for (let i = 0; i < this.tasks.length; i++) {
      const k = this.tasks[i]; k.t -= dt;
      if (k.t <= 0) { this.tasks.splice(i--, 1); try { k.fn(); } catch (e) { console.error('task', e); } }
    }
    for (const t of this.telegraphs) t.t += dt;
    this.telegraphs = this.telegraphs.filter((t) => t.t < t.dur);
    this.updateCorpses(dt);
    this.fx.update(dt, (x, y) => x < this.room.ox || y < this.room.oy || x > this.room.ox + this.room.cols * TILE || y > this.room.oy + this.room.rows * TILE);
    this.updateCamera(dtReal);
    // pending chained keg explosions
    for (let i = this.pendingKegs.length - 1; i >= 0; i--) {
      const k = this.pendingKegs[i]; k.t -= dt;
      if (k.t <= 0) { this.pendingKegs.splice(i, 1); if (this.room.at(k.c, k.r) === Ob.Keg) this.destroyObstacle(k.c, k.r, true); }
    }
  }

  private updateEnemy(e: Enemy, dt: number): void {
    if (e.dead) return;
    e.t += dt;
    if (e.spawnT > 0) { e.spawnT -= dt; e.flash = Math.max(0, e.flash - dt); return; }
    e.flash = Math.max(0, e.flash - dt);
    e.sx += (1 - e.sx) * Math.min(1, dt * 10); e.sy += (1 - e.sy) * Math.min(1, dt * 10);
    // statuses
    e.tickT -= dt;
    if (e.tickT <= 0) {
      e.tickT = 0.5;
      if (e.burn > 0) { this.damageEnemy(e, e.burnDmg, { ang: 0, knock: 0, source: 'burn' }); this.fx.embers(e.x, e.y - e.hitY, 3, '#ff9a3a'); }
      if (e.poison > 0) { this.damageEnemy(e, e.poisonDmg, { ang: 0, knock: 0, source: 'poison' }); this.fx.burst(e.x, e.y - e.hitY, 4, 3, '#7ad040', 20, 0.4); }
      if (e.dead) return;
    }
    e.burn = Math.max(0, e.burn - dt); e.poison = Math.max(0, e.poison - dt); e.slow = Math.max(0, e.slow - dt);
    e.freeze = Math.max(0, e.freeze - dt); e.fear = Math.max(0, e.fear - dt); e.confuse = Math.max(0, e.confuse - dt);
    e.mark = Math.max(0, e.mark - dt); e.charm = Math.max(0, e.charm - dt);
    // knockback
    if (e.kvx || e.kvy) {
      e.move(this, e.kvx * dt, e.kvy * dt);
      const f = Math.exp(-12 * dt); e.kvx *= f; e.kvy *= f;
      if (Math.abs(e.kvx) < 2) e.kvx = 0; if (Math.abs(e.kvy) < 2) e.kvy = 0;
    }
    if (e.freeze > 0) return;
    e.st += dt;
    e.def.update(e, this, dt);
    if (e.data.tellAt !== undefined) {
      // the tell: a swell and a white pulse while the shot is held
      const k = 1 - (e.data.tellAt - e.t) / TELL;
      e.sx = 1 + k * 0.14; e.sy = 1 - k * 0.1; e.flash = Math.max(e.flash, Math.sin(k * Math.PI * 3) > 0 ? 0.05 : 0);
      flushTell(e, this);
    }
    if (e.def.boss) loopBossFrames(e, dt);
  }

  private separateEnemies(): void {
    const es = this.enemies;
    for (let i = 0; i < es.length; i++) {
      const a = es[i]; if (a.hidden || a.def.noSeparate || a.spawnT > 0) continue;
      for (let j = i + 1; j < es.length; j++) {
        const b = es[j]; if (b.hidden || b.def.noSeparate || b.spawnT > 0) continue;
        if (a.mode === 'fly' !== (b.mode === 'fly')) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = (a.r + b.r) * 0.85;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 < 0.001) continue;
        const d = Math.sqrt(d2), push = (rr - d) * 0.5;
        const nx = dx / d, ny = dy / d;
        const wa = a.isBoss ? 0.1 : 1, wb = b.isBoss ? 0.1 : 1;
        a.move(this, -nx * push * wa, -ny * push * wa); b.move(this, nx * push * wb, ny * push * wb);
      }
    }
  }

  private contactDamage(): void {
    const pl = this.player;
    if (pl.dead) return;
    for (const e of this.enemies) {
      if (e.dead || e.hidden || e.spawnT > 0 || e.friendly || e.charm > 0 || e.z > 12) continue;
      const c = e.def.contact ?? 1;
      if (c <= 0) continue;
      // contact hitbox a little smaller than the sprite so grazes feel fair
      const rr = e.r * 0.8 + pl.hitR;
      if (dist2(e.x, e.y, pl.x, pl.y) < rr * rr) this.hurtPlayer(this.dmgScale(c), e.def.name);
    }
    // spikes & fires & creep
    const [c, r] = this.room.cellAt(pl.x, pl.y);
    const k = this.room.at(c, r);
    // the Pincushion's spikes are an offering: wings and bikes don't get you out of paying
    const pin = this.room.type === 'sacrifice';
    if ((pin || (!pl.flight && !pl.has('ewens_bike'))) && (k === Ob.Spikes || (k === Ob.TimedSpikes && this.spikesUp(c, r)))) {
      if (this.hurtPlayer(1, 'Spikes', { redFirst: pin }) && pin) flow.onPincushion(this);
    }
    for (const [dc, dr] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (this.room.at(c + dc, r + dr) === Ob.Fire) {
        const cc = this.room.cellCenter(c + dc, r + dr);
        const hp = this.room.ghp[this.room.idx(c + dc, r + dr)];
        if (hp > 0 && dist2(cc.x, cc.y, pl.x, pl.y) < 15 * 15) this.hurtPlayer(1, 'Fire');
      }
    }
  }
  spikesUp(c: number, r: number): boolean {
    const phase = (this.roomTime + (c + r) * 0) % 3;
    return phase > 1.6 && phase < 2.8;
  }
  dmgScale(c: number): number { return this.run.floorIndex >= (this.run.mode === 'hard' ? 3 : 5) && c === 1 ? 2 : c; }

  private updateCorpses(dt: number): void {
    for (const p of this.pops) p.t += dt;
    if (this.pops.length) this.pops = this.pops.filter((p) => p.t < 0.09);
    for (const c of this.corpses) {
      c.t += dt;
      const e = c.e;
      if (Math.random() < dt * 14) {
        const ox = (Math.random() - 0.5) * e.r * 2, oy = -Math.random() * e.hitY * 2;
        this.fx.burst(e.x + ox, e.y + oy * 0.5, -oy, 8, e.def.gore ?? '#7a1a2a', 90, 0.5, 2);
        this.fx.flash(e.x + ox, e.y + oy, 8, '#ffe0c0', 0.1);
        if (Math.random() < 0.4) this.audio.play('boomSmall', { x: e.x, vol: 0.5 });
      }
      this.trauma = Math.max(this.trauma, 0.35);
      if (c.t >= c.dur) {
        this.fx.burst(e.x, e.y, e.hitY, 40, e.def.gore ?? '#7a1a2a', 160, 0.9, 3);
        this.fx.spray(e.x, e.y, e.hitY, 0, TAU, 30, e.def.gore ?? '#7a1a2a', 140, 0.8, e.def.goreDecal ?? e.def.gore ?? '#6a1420');
        this.fx.ring(e.x, e.y, 10, 120, '#ffffff', 0.5);
        this.decalSplat(e.x, e.y, e.def.goreDecal ?? e.def.gore ?? '#6a1420', 22);
        this.shake(8); this.audio.play('bossDie', { x: e.x });
      }
    }
    this.corpses = this.corpses.filter((c) => c.t < c.dur);
  }

  // =============================================================== queries
  nearestEnemy(x: number, y: number, maxD: number, exclude?: number[]): Enemy | null {
    let best: Enemy | null = null, bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || e.hidden || e.spawnT > 0 || e.friendly || e.invuln) continue;
      if (exclude && exclude.includes(e.id)) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  aliveEnemies(): number { let n = 0; for (const e of this.enemies) if (!e.dead && !e.friendly && !e.data.noClear) n++; return n; }
  openDoorList(): OpenDoor[] {
    const out: OpenDoor[] = [];
    for (const d of this.doors) if (d.open > 0.6) out.push({ side: d.def.side, pos: d.def.side === Side.N || d.def.side === Side.S ? d.x : d.y });
    return out;
  }
  blindItems(): boolean { return this.floor?.curse === 'unknown'; }

  // =============================================================== damage
  damageEnemy(e: Enemy, dmg: number, info: HurtInfo): void {
    if (e.dead || e.spawnT > 0 || e.friendly) return;
    if (e.invuln) {
      // a blocked hit says so: a grey clink at the point of contact (not every beam tick)
      if ((info.source === 'shot' || info.source === 'melee') && this.time - (e.data.blockT ?? -1) > 0.08) {
        e.data.blockT = this.time;
        this.fx.sparks(e.x - Math.cos(info.ang) * e.r, e.y - e.hitY, 4, '#c8c8d8', 80);
        this.fx.ring(e.x - Math.cos(info.ang) * e.r, e.y - e.hitY, 2, 9, '#d0d0e0', 0.14, false);
        this.audio.play('tink', { vol: 0.4, x: e.x, pitch: 0.8 });
      }
      return;
    }
    let d = dmg;
    if (e.mark > 0) d *= 1.5;
    if (e.champion === 'armored') d *= 0.6;
    // a boss caught spent (or opened up) takes more; say so, but not on every tick of a beam
    if (e.isBoss && e.data.exposed && info.source !== 'burn' && info.source !== 'poison') {
      d *= 1.5;
      if (this.time - (e.data.weakFxT ?? -9) > 0.12) {
        e.data.weakFxT = this.time;
        this.fx.sparks(e.x - Math.cos(info.ang) * e.r * 0.7, e.y - e.hitY, 5, '#ffd860', 110, 0.22);
        this.audio.play('weakHit', { x: e.x, vol: 0.4 });
      }
    }
    if (e.def.onHurt) { const r = e.def.onHurt(e, this, d, info); if (typeof r === 'number') d = r; }
    if (d <= 0) {
      if (info.source === 'shot' || info.source === 'melee') { this.fx.sparks(e.x - Math.cos(info.ang) * e.r, e.y - e.hitY, 3, '#e0e0f0', 70); this.audio.play('tink', { vol: 0.35, x: e.x }); }
      return;
    }
    e.hp -= d;
    e.flash = e.isBoss ? 0.07 : 0.1;
    if (!e.def.noKnock && info.knock > 0 && !e.isBoss) {
      const kb = 120 * info.knock / (e.def.mass ?? 1);
      e.kvx += Math.cos(info.ang) * kb; e.kvy += Math.sin(info.ang) * kb;
    }
    if (info.source === 'shot' || info.source === 'melee' || info.source === 'beam') {
      e.sx = 1.15; e.sy = 0.88;
      // the impact itself: a small bright star where the shot landed
      if (info.source !== 'beam') this.fx.flash(e.x - Math.cos(info.ang) * e.r * 0.8, e.y - e.hitY - Math.sin(info.ang) * e.r * 0.4, info.crit ? 9 : 5, '#fff4e0', 0.07);
      const gore = e.def.gore ?? '#7a1a2a';
      if (info.source !== 'beam' || Math.random() < 0.3) this.fx.spray(e.x, e.y, e.hitY, info.ang, 1.4, info.crit ? 10 : 4, gore, 70, 0.3, Math.random() < 0.3 ? gore : null);
      this.audio.play('hit', { vol: info.source === 'beam' ? 0.15 : 0.4, x: e.x, pitch: e.isBoss ? 0.8 : 1 });
    }
    if (info.crit) { this.hitstop(0.05); this.fx.flash(e.x, e.y - e.hitY, 10, '#fff4c0'); this.fx.text(e.x, e.y - e.hitY - 12, 'BOLD!', '#ffe070'); this.audio.play('crit', { x: e.x }); }
    else if (d >= 25 && !e.isBoss) this.hitstop(0.03);
    // statuses
    const prof = info.prof;
    if (prof && !e.def.noStatus) {
      const luck = this.player.stats.luck, pm = info.procMul ?? 1;
      const luckChance = (c: number, l: number) => luckChanceBase(c, l) * pm;
      if (prof.burn > 0 && Math.random() < luckChance(prof.burn, luck)) { e.burn = 3; e.burnDmg = Math.max(1, this.player.stats.damage * 0.35); }
      if (prof.poison > 0 && Math.random() < luckChance(prof.poison, luck)) { e.poison = 3.5; e.poisonDmg = Math.max(1, this.player.stats.damage * 0.3); }
      if (prof.slow > 0 && Math.random() < luckChance(prof.slow, luck)) e.slow = 2.5;
      if (prof.freeze > 0 && Math.random() < luckChance(prof.freeze, luck) && !e.isBoss) e.freeze = 1.2;
      if (prof.fear > 0 && Math.random() < luckChance(prof.fear, luck)) e.fear = 2;
      if (prof.confuse > 0 && Math.random() < luckChance(prof.confuse, luck)) e.confuse = 2;
      if (prof.mark > 0 && Math.random() < luckChance(prof.mark, luck)) e.mark = 4;
      if (prof.charm > 0 && Math.random() < luckChance(prof.charm, luck) && !e.isBoss) e.charm = 3;
    }
    if (info.status && !e.def.noStatus) {
      if (info.status === 'burn') { e.burn = 3; e.burnDmg = Math.max(1, this.player.stats.damage * 0.35); }
      if (info.status === 'poison') { e.poison = 3; e.poisonDmg = Math.max(1, this.player.stats.damage * 0.3); }
      if (info.status === 'slow') e.slow = 2.5; if (info.status === 'fear') e.fear = 2; if (info.status === 'confuse') e.confuse = 2;
    }
    this.hitSource = info.source; this.hitCrit = !!info.crit;
    this.itemHook('onHitEnemy', e, d);
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e: Enemy, quiet = false): void {
    if (e.dead) return;
    e.dead = true; e.hp = 0;
    if (!e.friendly && !quiet) { const k = (this.game.save.data.kills ??= {}); k[e.def.id] = (k[e.def.id] ?? 0) + 1; }
    const gore = e.def.gore ?? '#7a1a2a';
    if (e.isBoss && !quiet && this.room.type === 'boss') { this.corpses.push({ e, t: 0, dur: 1.3 }); }
    else if (!quiet) {
      // the death pop: the body flashes white and swells for a blink before it bursts
      this.pops.push({ e, t: 0 });
      this.fx.ring(e.x, e.y - e.hitY * 0.6, 3, 10 + e.r * 1.4, '#fff0e0', 0.18, false);
      if (e.r > 9) this.hitstop(0.025);
      this.fx.burst(e.x, e.y, e.hitY, 8 + Math.floor(e.r), gore, 90, 0.5, 2);
      this.fx.spray(e.x, e.y, e.hitY, 0, TAU, 6, gore, 60, 0.4, e.def.goreDecal ?? gore);
      this.fx.smoke(e.x, e.y - e.hitY * 0.5, 2, 'rgba(40,34,50,', e.r * 0.6, 0.5, 8);
      this.decalSplat(e.x, e.y, e.def.goreDecal ?? gore, Math.min(10, e.r * 0.8));
      this.audio.play(e.def.deathSound ?? (e.r > 10 ? 'deathBig' : 'death'), { x: e.x, pitch: 0.9 + Math.random() * 0.2 });
      if (e.r > 12) this.shake(2);
    }
    e.def.onDeath?.(e, this);
    this.run.stats.kills++;
    this.itemHook('onKill', e);
    if (this.game.save.stat('kills', 1) % 50 === 0) checkProgress(this);
    // kill-charged actives
    const act = this.player.active ? getItem(this.player.active) : null;
    if (act?.active?.type === 'kill') this.player.charge = Math.min(act.active.charge, this.player.charge + 1);
    if (!e.noDrop && !e.isBoss && !e.parent && Math.random() < luckChance(0.035, this.player.stats.luck)) {
      const k = rollDropKind(new RNG(Math.random()), this.player.stats.luck, 'small');
      if (k) spawnDrop(this, k, e.x, e.y);
    }
    if (e.champion) spawnDrop(this, Math.random() < 0.5 ? 'heart' : 'button', e.x, e.y);
    else if (this.room.flags.variant === 'gilded' && !e.friendly && Math.random() < 0.45) spawnDrop(this, Math.random() < 0.15 ? 'button5' : 'button', e.x, e.y);
    if (e.isBoss) flow.onBossKilled(this, e);
  }

  hurtPlayer(half: number, source: string, o: { ignoreIframes?: boolean; redFirst?: boolean; noIframes?: boolean } = {}): boolean {
    const pl = this.player;
    if (pl.dead || this.deathT >= 0) return false;
    if (pl.iframes > 0 && !o.ignoreIframes) return false;
    if (this.transition) return false;
    if (!o.redFirst && pl.count('cardigan') > 0 && this.roomRng.next() < 0.15) {
      pl.iframes = 0.8; this.audio.play('brass', { x: pl.x, pitch: 0.7 }); this.fx.ring(pl.x, pl.y - 10, 4, 20, '#c8a070', 0.3);
      this.hud.toast('Grandad\'s cardigan. It doesn\'t even hurt.', 1.2); return false;
    }
    if (!o.redFirst && this.run.flags.jacket && pl.count('dust_jacket') > 0) {
      this.run.flags.jacket = false; pl.iframes = 1; this.audio.play('brass', { x: pl.x }); this.fx.ring(pl.x, pl.y - 10, 4, 24, '#8ab0d0', 0.3);
      this.hud.toast('The jacket takes the blow.', 1.2); return false;
    }
    // the Brass Breastplate: no hit takes more than half a heart
    if (!o.redFirst && pl.count('brass_plate') > 0 && half > 1) { half = 1; this.fx.ring(pl.x, pl.y - 10, 4, 22, '#d8a040', 0.3); }
    const red0 = pl.health.red;
    const res = pl.health.damage(half, !!o.redFirst);
    if (!o.noIframes) pl.iframes = 1.25 + this.player.count('pocket_watch') * 0.3;
    pl.hurtT = 0.45;
    this.hitstop(0.09);
    this.shake(4);
    this.redFlash = 0.6;
    this.audio.play('hurt', { x: pl.x });
    this.fx.spray(pl.x, pl.y, 12, -Math.PI / 2, TAU, 8, '#a01e2a', 70, 0.4, '#6a1420');
    if (res.inkLost > 0) this.inkBurst();
    if (res.gildedBroke > 0) for (let i = 0; i < 3 * res.gildedBroke; i++) spawnDrop(this, 'button', pl.x, pl.y);
    this.run.stats.damageTaken += res.taken;
    this.run.flags.hitThisFloor = true;
    this.roomHit = true;
    if (this.room.type === 'boss') this.run.flags.bossHit = true;
    // only losing red hearts costs you the bargain door (wax and ink soak hits for free), and
    // paying the Pincushion never counts
    if (pl.health.red < red0 && !o.redFirst) { this.run.flags.redHit = true; if (this.room.type === 'boss') this.run.flags.bossRedHit = true; }
    if (!o.redFirst) this.itemHook('onHurt');
    // Jeffy throws a tantrum: pencils everywhere and a burst of speed
    if (pl.transformations.has('jeffy') && !res.dead) {
      for (let i = 0; i < 14; i++) this.proj.player(this, pl.prof, pl.x, pl.y - 6, 10, (i / 14) * TAU, pl.stats.damage * 1.3, 240, 170, 1);
      pl.clearTemp((t) => t.id === 'tantrum'); pl.addTemp({ id: 'tantrum', time: 3, stats: { speed: 0.4, tearsMult: 1.4 } });
      this.hud.toast(['WHY\'D YOU HAVE TO DO THAT?!', 'DADDY!', 'I\'M A BIG BOY!', 'THAT\'S MINE!'][Math.floor(Math.random() * 4)], 1.2);
      this.audio.play('bossRoar', { x: pl.x, pitch: 2.2, vol: 0.4 });
    }
    if (res.dead) this.onPlayerDied(source);
    return true;
  }
  private onPlayerDied(source: string): void {
    const pl = this.player;
    // revival items
    for (const id of ['second_draft', 'moth_cocoon']) {
      if (pl.count(id) > 0) {
        pl.items.delete(id); pl.itemOrder = pl.itemOrder.filter((x) => x !== id);
        if (pl.health.noRed) pl.health.addExtra('wax', 2); else { if (pl.health.redMax < 2) pl.health.addContainers(1); pl.health.red = Math.max(pl.health.red, 2); }
        pl.iframes = 2.5; this.whiteFlash = 1; this.audio.play('revive');
        this.hud.banner(getItem(id)?.name ?? 'Revived', 'Not the end of the story yet');
        if (id === 'moth_cocoon') { pl.items.set('moth_wings_rev', 1); }
        pl.recompute();
        return;
      }
    }
    pl.dead = true; pl.deathT = 0;
    this.deathT = 0;
    this.run.stats.deathCause = source;
    this.audio.play('playerDeath');
    this.audio.setMusic(null);
    this.hitstop(0.25);
    this.fx.spray(pl.x, pl.y, 10, 0, TAU, 30, '#262a5c', 90, 0.7, '#1a1c40');
  }
  playerHitByShot(p: Proj): boolean {
    if (this.player.iframes > 0) return true;
    this.hurtPlayer(this.dmgScale(p.dmg), 'a projectile');
    return true;
  }
  familiarBlocksShot(p: Proj): boolean {
    for (const f of this.familiars) {
      if (!f.spec.blocks) continue;
      const rr = f.r + p.r;
      if (dist2(f.x, f.y, p.x, p.y - p.z * 0.3) < rr * rr) { this.fx.sparks(p.x, p.y - p.z, 3, '#e0e0ff', 60); f.onBlock?.(this); return true; }
    }
    return false;
  }
  inkBurst(): void {
    const pl = this.player;
    this.fx.ring(pl.x, pl.y - 8, 6, 160, '#3a3480', 0.5);
    this.fx.flash(pl.x, pl.y - 8, 30, '#6a64d0', 0.2);
    this.shake(5);
    this.audio.play('inkBurst');
    for (const e of this.enemies) if (!e.dead) this.damageEnemy(e, 40, { ang: Math.atan2(e.y - pl.y, e.x - pl.x), knock: 2, source: 'ink' });
  }
  chainLightning(from: Enemy, n: number, dmg: number, prof?: AttackProfile | null): void {
    let cur = from; const hit = [from.id];
    for (let i = 0; i < n; i++) {
      const next = this.nearestEnemy(cur.x, cur.y, 110, hit);
      if (!next) break;
      hit.push(next.id);
      this.fx.bolt(cur.x, cur.y - cur.hitY, next.x, next.y - next.hitY);
      this.damageEnemy(next, dmg, { ang: Math.atan2(next.y - cur.y, next.x - cur.x), knock: 0.3, source: 'chain', prof: prof ? { ...prof, chain: 0, split: 0 } as AttackProfile : null });
      cur = next;
    }
    if (hit.length > 1) this.audio.play('zap', { x: from.x, vol: 0.5 });
  }

  // =============================================================== explosions & obstacles
  explode(x: number, y: number, r: number, dmg: number, o: ExplodeOpts = {}): void {
    const small = !!o.small;
    this.fx.flash(x, y - 6, r * 0.6, '#fff0c0', small ? 0.08 : 0.14);
    this.fx.ring(x, y, r * 0.3, r * 1.1, 'rgba(255,200,120,0.9)', small ? 0.2 : 0.35);
    const busy = this.fx.parts.length - (this.fx as any).free.length > 1500;
    this.fx.smoke(x, y - 4, small ? (busy ? 1 : 3) : 12, 'rgba(50,42,48,', small ? 5 : 9, small ? 0.6 : 1.1, 18);
    this.fx.sparks(x, y - 6, small ? (busy ? 2 : 5) : 18, '#ffb040', small ? 120 : 200, 0.35);
    if (!busy || !small) this.fx.shards(x, y, small ? 2 : 10, '#3a3034', 120);
    this.scorch(x, y, r * 0.55);
    this.shake(small ? 1.5 : 6);
    if (!small) this.hitstop(0.06);
    this.audio.play(small ? 'boomSmall' : 'boom', { x });
    for (const e of this.enemies) {
      if (e.dead || e.spawnT > 0 || e.hidden) continue;
      if (dist2(x, y, e.x, e.y - e.hitY * 0.5) < (r + e.r) * (r + e.r)) this.damageEnemy(e, dmg, { ang: Math.atan2(e.y - y, e.x - x), knock: small ? 1 : 3, source: 'explosion' });
    }
    const st = this.backStair;
    if (st?.boarded && dist2(x, y, st.x, st.y) < (r + 16) * (r + 16)) {
      st.boarded = false; if (this.room.flags.stair) this.room.flags.stair.boarded = false;
      this.fx.shards(st.x, st.y - 4, 18, '#7a5a3a', 140); this.audio.play('secret', { x: st.x });
      this.hud.toast('The boards give way. The stair goes up, and it smells of disinfectant.', 3);
    }
    const pl = this.player;
    if (!o.friendly && !o.noPlayer && dist2(x, y, pl.x, pl.y) < (r + 4) * (r + 4) && !this.player.has('blast_apron') && !(o.bomb && this.player.has('bike_helmet'))) this.hurtPlayer(2, 'an explosion');
    // obstacles
    const room = this.room;
    const [c0, r0] = room.cellAt(x - r, y - r), [c1, r1] = room.cellAt(x + r, y + r);
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      if (!room.inGrid(cc, rr)) continue;
      const k = room.at(cc, rr); if (k === Ob.None) continue;
      const p = room.cellCenter(cc, rr);
      if (dist2(p.x, p.y, x, y) > (r + 10) * (r + 10)) continue;
      if (k === Ob.Keg) { this.pendingKegs.push({ c: cc, r: rr, t: 0.12 }); continue; }
      if (k === Ob.Block || k === Ob.Pit || k === Ob.Spikes || k === Ob.TimedSpikes || k === Ob.Button) continue;
      if (k === Ob.Pillar && small) continue;
      if ((k === Ob.Rock || k === Ob.Marked) && small && !(this.player.prof.shatter)) { if (dist2(p.x, p.y, x, y) > (r * 0.7) ** 2) continue; }
      this.destroyObstacle(cc, rr, true);
    }
    // secret walls
    flow.revealSecretsNear(this, x, y, r + 14);
    // pickups & bombs get blown around
    for (const p of this.pickups) {
      if (p.pedestal) continue;
      const d = dist(x, y, p.x, p.y);
      if (d < r + 20) { const a = Math.atan2(p.y - y, p.x - x); p.vx += Math.cos(a) * 160; p.vy += Math.sin(a) * 160; p.vz = 90; p.z = Math.max(p.z, 1); }
    }
    for (const b of this.bombs) if (!b.dead && dist2(x, y, b.x, b.y) < (r + 8) ** 2 && b.fuse > 0.1) b.fuse = Math.min(b.fuse, 0.1);
    for (const n of this.npcs) if (dist2(x, y, n.x, n.y) < (r + n.r) ** 2) n.onBomb?.(this);
    if (o.bomb) this.itemHook('onBombExplode', x, y);
  }

  obstacleBlocksShot(c: number, r: number): boolean {
    const k = this.room.at(c, r);
    if (!this.room.inGrid(c, r)) return false;
    if (k === Ob.Fire) return this.room.ghp[this.room.idx(c, r)] > 0;
    return OB_SOLID_SHOT.has(k);
  }
  /** Shot impact on an obstacle cell. */
  hitObstacle(c: number, r: number, dmg: number, shatter: boolean, x: number, y: number): void {
    const room = this.room; const k = room.at(c, r);
    const i = room.idx(c, r);
    if (k === Ob.Heap || k === Ob.Fire || k === Ob.Urn || k === Ob.Keg) {
      // ink fire (purple) is twice as stubborn as a normal flame
      room.ghp[i] -= Math.max(1, dmg) * (k === Ob.Fire && room.gvar[i] === 3 ? 0.5 : 1);
      this.obstacleDirty = true;
      const col = k === Ob.Fire ? '#ffb040' : this.theme.pal.heap;
      this.fx.burst(x, y, 6, 3, col, 40, 0.3);
      if (k === Ob.Fire) { this.fx.smoke(x, y - 6, 1, 'rgba(90,80,90,', 3, 0.4); this.audio.play('sizzle', { vol: 0.4, x }); }
      else this.audio.play('thud', { vol: 0.3, x });
      if (room.ghp[i] <= 0) this.destroyObstacle(c, r, false);
    } else if ((k === Ob.Rock || k === Ob.Marked) && shatter) {
      this.destroyObstacle(c, r, true);
    } else if (k === Ob.Rock || k === Ob.Block || k === Ob.Marked || k === Ob.Pillar) {
      this.fx.burst(x, y, 6, 2, this.theme.pal.rock, 30, 0.25);
    }
  }
  /** Fires that are still lit, kegs, heaps and urns: things a shot can wear down. */
  isBreakable(c: number, r: number): boolean {
    if (!this.room.inGrid(c, r)) return false;
    const k = this.room.at(c, r);
    if (k === Ob.Fire) return this.room.ghp[this.room.idx(c, r)] > 0;
    return k === Ob.Heap || k === Ob.Urn || k === Ob.Keg;
  }
  damageObstacleAt(x: number, y: number, dmg: number): void {
    const [c, r] = this.room.cellAt(x, y);
    if (this.isBreakable(c, r)) this.hitObstacle(c, r, dmg, false, x, y);
  }
  destroyObstacle(c: number, r: number, violent: boolean): void {
    const room = this.room; const i = room.idx(c, r); const k = room.grid[i]; const v = room.gvar[i];
    const p = room.cellCenter(c, r);
    const rng = new RNG(room.seed + ':ob' + i + ':' + this.run.stats.kills);
    this.obstacleDirty = true;
    switch (k) {
      case Ob.Rock: case Ob.Marked: case Ob.Pillar: {
        room.setOb(c, r, Ob.None);
        this.fx.shards(p.x, p.y, 10, this.theme.pal.rock, 110);
        this.fx.smoke(p.x, p.y, 5, 'rgba(90,82,80,', 6, 0.8, 8);
        this.stampRubble(p.x, p.y);
        this.audio.play('rockBreak', { x: p.x });
        // filling adjacent pits with rubble: an exploded rock drops into a neighbouring pit
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (room.at(c + dc, r + dr) === Ob.Pit) { room.setOb(c + dc, r + dr, Ob.None); this.stampRubble(room.cellCenter(c + dc, r + dr).x, room.cellCenter(c + dc, r + dr).y); break; }
        if (k === Ob.Marked) {
          this.audio.play('secret');
          this.fx.stars(p.x, p.y - 6, 10, '#fff0a0', 60);
          const drop = rng.weighted(['chest:tin', 'button5', 'bomb2', 'key', 'page', 'wax', 'item'], (x) => ({ 'chest:tin': 3, button5: 3, bomb2: 2, key: 2, page: 2, wax: 2, item: 0.4 } as any)[x]);
          if (drop === 'item') flow.spawnPedestal(this, p.x, p.y, this.run.pools.roll('secret'), 'normal');
          else if (drop) spawnDrop(this, drop, p.x, p.y);
          this.run.stats.secretsFound++;
        } else if (rng.chance(0.06)) spawnDrop(this, rng.pick(['button', 'button', 'key', 'bomb']), p.x, p.y);
        break;
      }
      case Ob.Heap: {
        room.setOb(c, r, Ob.None);
        this.fx.burst(p.x, p.y, 6, 14, this.theme.pal.heap, 70, 0.5, 2);
        this.fx.smoke(p.x, p.y, 3, 'rgba(120,110,100,', 5, 0.6);
        this.audio.play('heapBreak', { x: p.x });
        const luck = this.player.stats.luck;
        if (v === 1) { for (let n = 0; n < rng.int(2, 4); n++) spawnDrop(this, 'button', p.x, p.y); }
        else if (v === 2) { flow.spawnEnemy(this, 'mite', p.x, p.y, true); }
        else if (rng.chance(luckChance(0.12, luck))) { const kk = rollDropKind(rng, luck, 'small'); if (kk) spawnDrop(this, kk, p.x, p.y); }
        break;
      }
      case Ob.Fire: {
        room.ghp[i] = 0;
        this.fx.smoke(p.x, p.y - 8, 6, 'rgba(110,100,110,', 5, 1, 20);
        this.audio.play('extinguish', { x: p.x });
        if (v !== 1 || rng.chance(0.5)) if (rng.chance(luckChance(this.game.save.data.settings.fireDropChance ?? 0.1, this.player.stats.luck))) spawnDrop(this, rng.chance(0.3) ? 'heart' : 'button', p.x, p.y);
        break;
      }
      case Ob.Urn: {
        room.setOb(c, r, Ob.None);
        this.fx.shards(p.x, p.y, 10, '#a86a44', 90);
        this.audio.play('urnBreak', { x: p.x });
        if (rng.chance(luckChance(0.35, this.player.stats.luck))) { const kk = rollDropKind(rng, this.player.stats.luck, 'urn'); if (kk) spawnDrop(this, kk, p.x, p.y); }
        else if (rng.chance(0.12)) flow.spawnEnemy(this, 'mite', p.x, p.y, true);
        break;
      }
      case Ob.Keg: {
        room.setOb(c, r, Ob.None);
        this.fx.shards(p.x, p.y, 8, '#7a4a2a', 120);
        this.explode(p.x, p.y, 44, 30, { source: 'keg' });
        break;
      }
      case Ob.Web: room.setOb(c, r, Ob.None); break;
      default: if (violent) room.setOb(c, r, Ob.None);
    }
  }
  private updateObstacles(dt: number): void {
    const room = this.room;
    // blue spirit fires occasionally spit at the player
    for (let i = 0; i < room.grid.length; i++) {
      if (room.grid[i] !== Ob.Fire || room.ghp[i] <= 0) continue;
      const v = room.gvar[i];
      const c = i % room.cols, r = (i / room.cols) | 0;
      const p = room.cellCenter(c, r);
      if (Math.random() < dt * 3) this.fx.embers(p.x, p.y - 10, 1, v === 1 ? '#6ab0ff' : v === 2 ? '#a0f060' : v === 3 ? '#9a7ae0' : '#ffb040');
      if (v === 1 && !room.cleared && Math.random() < dt * 0.35 && dist2(p.x, p.y, this.player.x, this.player.y) < 150 * 150) {
        this.proj.enemy(p.x, p.y - 8, Math.atan2(this.player.y - p.y, this.player.x - p.x), 120, { shape: 'water', r: 3.5 });
        this.audio.play('fireSpit', { x: p.x, vol: 0.4 });
      }
    }
  }
  stampRubble(x: number, y: number): void {
    const bg = this.room.bgCache; if (!bg) return;
    const ctx = bg.getContext('2d')!;
    const spr = this.props.rubble[Math.floor(Math.random() * this.props.rubble.length)];
    spr.draw(ctx, x + BG_MARGIN, y + 12 + BG_MARGIN);
  }
  decalSplat(x: number, y: number, color: string, size: number): void {
    const bg = this.room.bgCache; if (!bg) return;
    const [c, r] = this.room.cellAt(x, y);
    if (!this.room.inGrid(c, r)) return;
    const ctx = bg.getContext('2d')!;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = color;
    const n = 2 + Math.floor(size);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.random() * size;
      const s = Math.max(1, Math.round(size * (0.3 + Math.random() * 0.4)));
      ctx.fillRect(Math.round(x + Math.cos(a) * d + BG_MARGIN), Math.round(y + Math.sin(a) * d * 0.6 + BG_MARGIN), s, Math.max(1, s - 1));
    }
    ctx.globalAlpha = 1;
  }
  scorch(x: number, y: number, r: number): void {
    const bg = this.room.bgCache; if (!bg) return;
    const ctx = bg.getContext('2d')!;
    const n = r > 15 ? 70 : 18;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.pow(Math.random(), 0.7) * r;
      ctx.globalAlpha = (0.12 + Math.random() * 0.25) * (1 - d / r * 0.5); ctx.fillStyle = Math.random() < 0.85 ? '#0a0606' : '#2a1a10';
      const s = Math.random() < 0.5 ? 2 : 3;
      ctx.fillRect(Math.round(x + Math.cos(a) * d + BG_MARGIN), Math.round(y + Math.sin(a) * d * 0.7 + BG_MARGIN), s, s - 1);
    }
    ctx.globalAlpha = 1;
  }

  // =============================================================== creep
  addCreep(x: number, y: number, r: number, team: 'player' | 'enemy', dps: number, life: number, color?: string): void {
    if (this.creep.length > 160) this.creep.shift();
    this.creep.push({ x, y, r, team, dps, life, max: life, color: color ?? (team === 'player' ? '#2a2e70' : '#5a8a2a'), tick: 0 });
  }
  private updateCreep(dt: number): void {
    const pl = this.player;
    for (let i = this.creep.length - 1; i >= 0; i--) {
      const c = this.creep[i];
      c.life -= dt; if (c.life <= 0) { if (c.color === BEER) this.fx.burst(c.x, c.y - 2, 4, 3, '#f4f0e4', 20, 0.5, 1, 0); this.creep.splice(i, 1); continue; }
      if (c.color === BEER && c.life < c.max * 0.6 && Math.random() < dt * 14) this.fx.burst(c.x + (Math.random() - 0.5) * c.r * 1.6, c.y + (Math.random() - 0.5) * c.r, 1, 2, '#f8f4ea', 12, 0.6, 1, 0);
      c.tick -= dt;
      if (c.tick > 0) continue;
      c.tick = 0.3;
      if (c.team === 'player') {
        for (const e of this.enemies) if (!e.dead && e.z < 4 && e.mode !== 'fly' && dist2(c.x, c.y, e.x, e.y) < (c.r + e.r * 0.5) ** 2) this.damageEnemy(e, c.dps * 0.3, { ang: 0, knock: 0, source: 'creep' });
      } else if (!pl.flight && !pl.has('ewens_bike') && dist2(c.x, c.y, pl.x, pl.y) < (c.r * 0.85) ** 2) this.hurtPlayer(1, 'creep');
    }
  }

  // =============================================================== misc helpers
  cancelEnemyShotsNear(x: number, y: number, r: number): void {
    for (const p of this.proj.list) if (p.active && p.team === 1 && dist2(p.x, p.y, x, y) < r * r) { this.fx.sparks(p.x, p.y - p.z, 2, '#ffffff', 40); this.proj.kill(p); }
  }
  pullPickups(x: number, y: number, r: number): void {
    for (const p of this.pickups) if (!p.pedestal && !p.isChest() && dist2(p.x, p.y, x, y) < r * r) { p.vx += (x - p.x) * 0.5; p.vy += (y - p.y) * 0.5; }
  }
  shake(amt: number): void { this.trauma = Math.min(1, this.trauma + amt * 0.08 * (this.game.save.data.settings.shake ?? 1)); }
  /**
   * A short freeze on impact. Scaled by the Hit pause setting, and drawn from a budget that refills at
   * 0.15s per second: a big hit always lands, but a hail of small ones never makes the controls stick.
   */
  hitstop(t: number): void {
    const k = this.game.save.data.settings.hitPause ?? 1;
    const want = Math.min(t * k, this.hitstopBudget);
    if (want <= this.hitstopT) return;
    this.hitstopBudget -= want - this.hitstopT; this.hitstopT = want;
  }
  hitstopBudget = 0.15;
  /** What dealt the hit an onHitEnemy hook is looking at (so 'on hit' items ignore burn and poison ticks). */
  hitSource = '';
  /** Whether that hit was a crit. */
  hitCrit = false;
  itemHook<K extends keyof ItemHooks>(name: K, ...args: any[]): void {
    const pl = this.player;
    const fire = (id: string, n: number) => {
      const h = getItem(id)?.hooks?.[name] as any;
      if (h) { try { h(this, ...args, n); } catch (e) { console.error('item hook', id, name, e); } }
    };
    for (const [id, n] of pl.items) fire(id, n);
    for (const id of pl.charms) fire(id, 1);
  }
  private collectPickups(): void {
    const pl = this.player;
    this.nearPedestal = null; this.nearInspect = null;
    let nd = 42 * 42, ni = 44 * 44;
    for (const p of this.pickups) {
      if (p.dead || p.collectT >= 0) continue;
      const d2 = dist2(p.x, p.y, pl.x, pl.y);
      if (p.pedestal && p.data.id && d2 < nd) { nd = d2; this.nearPedestal = p; }
      if ((p.pedestal ? !!p.data.id : p.price > 0 || p.deal > 0) && d2 < ni) { ni = d2; this.nearInspect = p; }
      if (p.noCollect > 0 || p.z > 8) continue;
      const rr = p.r + pl.r;
      if (d2 < rr * rr) flow.touchPickup(this, p);
    }
  }
  private updateCamera(dt: number): void {
    const room = this.room, pl = this.player;
    const W = 480, H = 270;
    let tx = room.pxW > W ? clamp(pl.x - W / 2, 0, room.pxW - W) : 0;
    let ty = room.pxH > H ? clamp(pl.y - H / 2 - 8, 0, room.pxH - H) : 0;
    this.camTX = tx; this.camTY = ty;
    const k = 1 - Math.exp(-10 * dt);
    this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k;
  }
  snapCamera(): void { this.updateCamera(10); this.camX = this.camTX; this.camY = this.camTY; }

  // =============================================================== delegates
  render(): void { renderWorld(this); }
  enterRoom(id: number, from: Side | null, transition = true): void { flow.enterRoom(this, id, from, transition); }
  startFloor(): void { flow.startFloor(this); }
  syncFamiliars(): void { syncFamiliars(this); }
  spawnEnemy(id: string, x: number, y: number, quick = true): Enemy | null { return flow.spawnEnemy(this, id, x, y, quick); }
}
