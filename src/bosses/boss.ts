// Boss framework: weighted attack selection per phase, telegraphs, phase transitions and death sequences.
import type { Enemy } from '../enemies/enemy';
import type { World } from '../game/world';
import { PATTERNS, patternsFor, shapeFor } from './patterns';

/** Bosses that keep only the fight they were written with (the final forms are their own bullet hell). */
const OWN_FIGHT = new Set(['unwritten', 'author', 'echo', 'patient']);
const dealt = new WeakSet<BossBrain>();
/** Attacks that throw the whole body somewhere: the boss is spent for a moment after any of them. */
const COMMITTED = new Set(['charge', 'dash', 'lunge', 'stomp', 'leap', 'dive', 'roll', 'slam', 'bash', 'uproot']);
/**
 * Every boss gets its own pair of extra patterns once it's hurt (and a third for its last phase),
 * and at least one phase change, so no fight stays the same from start to finish.
 */
function deal(e: Enemy, brain: BossBrain): void {
  if (dealt.has(brain)) return;
  dealt.add(brain);
  // bosses with an authored rhythm fight only with their own moves
  if (OWN_FIGHT.has(e.def.id) || brain.sequence) return;
  const shape = shapeFor(e.def.id), picks = patternsFor(e.def.id);
  picks.forEach((name, i) => {
    const a = PATTERNS[name](shape);
    a.minTier = i < 2 ? 1 : 2;
    a.weight *= 0.8;
    brain.attacks.push(a);
  });
}

export interface BossAttack {
  id: string;
  weight: number;
  phases?: number[];           // allowed phases (0-based); default all
  /** Only once the boss is this hurt: 1 under two thirds of its health, 2 under a third. */
  minTier?: number;
  cooldown?: number;           // min seconds before reuse
  start?(e: Enemy, w: World): void;
  /** Return true when the attack is finished. t = seconds since start. */
  run(e: Enemy, w: World, t: number, dt: number): boolean;
  /**
   * Seconds the boss is left spent after this attack: it pants in place and takes 50% more damage.
   * This is the punish window the fight teaches: dodge the attack, then hit back.
   */
  recover?: number | ((e: Enemy) => number);
}
export interface BossBrain {
  attacks: BossAttack[];
  idle(e: Enemy, w: World, dt: number): void;
  idleTime: [number, number];
  phases?: number[];            // hp fractions that trigger phases, descending e.g. [0.5]
  onPhase?(e: Enemy, w: World, phase: number): void;
  /**
   * An authored rhythm: the attack ids for each phase, played in order and looped. A boss with a
   * sequence always fights the same way, so its fight can be learned.
   */
  sequence?: string[][];
}

export function bossUpdate(e: Enemy, w: World, dt: number, brain: BossBrain): void {
  const d = e.data;
  deal(e, brain);
  d.phase ??= 0; d.lastUsed ??= {} as Record<string, number>;
  // pressure tiers (separate from the boss's own phases): each one is announced and opens up more
  const tier = e.hpFrac() <= 0.33 ? 2 : e.hpFrac() <= 0.66 ? 1 : 0;
  if (tier > (d.tier ?? 0) && !OWN_FIGHT.has(e.def.id)) {
    d.tier = tier;
    w.shake(4 + tier * 2); w.audio.play('bossRoar', { x: e.x, pitch: 1.1 - tier * 0.15, vol: 0.7 });
    w.fx.ring(e.x, e.y - e.hitY, 8, 70 + tier * 20, tier >= 2 ? '#ff3050' : '#ffa040', 0.45);
    e.flash = 0.25;
  }
  d.tier ??= 0;
  // phase change
  const thresholds = brain.phases ?? [];
  if (d.phase < thresholds.length && e.hpFrac() <= thresholds[d.phase] && e.state !== 'phase') {
    d.phase++; d.seqI = 0; d.exposed = false;
    e.setState('phase'); e.invuln = true;
    w.shake(6); w.audio.play('bossRoar', { x: e.x }); w.hitstop(0.12);
    w.fx.ring(e.x, e.y - e.hitY, 10, 90, '#ff4060', 0.5);
    w.proj.clear();
    brain.onPhase?.(e, w, d.phase);
    return;
  }
  if (e.state === 'phase') {
    e.sx = 1 + Math.sin(e.st * 40) * 0.06; e.sy = 1 - Math.sin(e.st * 40) * 0.06;
    if (e.st > 1.0) { e.invuln = false; e.setState('idle'); d.idleT = 0.4; }
    return;
  }
  // ending bosses: a last stand under a fifth of their health, with a bullet-hell layer under every attack
  if (d.hard && !d.desperate && e.hpFrac() <= 0.2) {
    d.desperate = true; w.whiteFlash = 0.5; w.shake(7); w.audio.play('bossRoar', { x: e.x, pitch: 0.6 });
    w.hud.toast(`${e.def.name}: last stand.`, 1.6);
  }
  if (d.desperate && e.state !== 'phase') {
    d.dsT = (d.dsT ?? 0.6) - dt;
    if (d.dsT <= 0) {
      d.dsT = 0.42; d.dsA = (d.dsA ?? 0) + 0.37;
      for (let i = 0; i < 4; i++) { const a = d.dsA + (i / 4) * Math.PI * 2; w.proj.enemy(e.x, e.y - 6, a, 78, { r: 3.2, shape: 'dark' }); }
    }
  }
  // champions: crimson ones bleed creep and act sooner, inked ones leak rings of ink
  if (d.champ === 'crimson' && Math.random() < dt * 5) w.addCreep(e.x, e.y, 9, 'enemy', 1, 3, '#7a0a14');
  if (d.champ === 'inked' && e.state !== 'phase') {
    d.inkT = (d.inkT ?? 2) - dt;
    if (d.inkT <= 0) { d.inkT = 2.8; const off = Math.random(); for (let i = 0; i < 10; i++) w.proj.enemy(e.x, e.y - 6, off + (i / 10) * Math.PI * 2, 70, { r: 3.5, shape: 'inkE' }); }
  }
  // every boss gets desperate near the end: less rest between attacks, smoke pouring off it
  if (!d.hard && !d.cornered && e.hpFrac() <= 0.15 && !OWN_FIGHT.has(e.def.id)) {
    d.cornered = true; w.shake(5); w.audio.play('bossRoar', { x: e.x, pitch: 0.8 });
  }
  if (d.cornered && Math.random() < dt * 8) w.fx.smoke(e.x + (Math.random() - 0.5) * e.r * 1.6, e.y - e.hitY, 1, 'rgba(40,20,30,', 5, 0.7);
  // the tell: a beat where the boss gathers itself before every attack, so you can read it coming
  if (e.state === 'windup') {
    const k = e.st / d.windT;
    e.sx = 1 + Math.sin(k * Math.PI) * 0.12; e.sy = 1 - Math.sin(k * Math.PI) * 0.1;
    if (e.st >= d.windT) { e.sx = e.sy = 1; e.setState('attack'); (d.attack as BossAttack).start?.(e, w); }
    return;
  }
  if (e.state === 'idle') {
    // between attacks bosses press in harder than they were written to, more so as they're hurt
    const own = OWN_FIGHT.has(e.def.id), pace = own ? 1 : 1.35 + d.tier * 0.15;
    brain.idle(e, w, dt * pace);
    if (!own) d.idleT = (d.idleT ?? 1) - dt * 0.25;
    if (d.champ === 'crimson') d.idleT = (d.idleT ?? 1) - dt * 0.4;
    if (d.hard) d.idleT = (d.idleT ?? 1) - dt * 0.6;
    if (d.cornered) d.idleT = (d.idleT ?? 1) - dt * 0.5;
    d.idleT = (d.idleT ?? rand(brain.idleTime)) - dt;
    if (d.idleT <= 0) {
      const now = e.t;
      const ok = (a: BossAttack) => (!a.phases || a.phases.includes(d.phase)) && (a.minTier === undefined || d.tier >= a.minTier);
      const opts = brain.attacks.filter((a) => ok(a) && (now - (d.lastUsed[a.id] ?? -99)) >= (a.cooldown ?? 0) && a.id !== d.lastAttack);
      const pool = opts.length ? opts : brain.attacks.filter(ok);
      let tot = 0; for (const a of pool) tot += a.weight;
      let r = Math.random() * tot; let pick = pool[0];
      for (const a of pool) { r -= a.weight; if (r <= 0) { pick = a; break; } }
      // an authored rhythm overrides the dice: the next attack in this phase's sequence
      const seq = brain.sequence?.[Math.min(d.phase, brain.sequence.length - 1)];
      if (seq?.length) { d.seqI ??= 0; const next = brain.attacks.find((a) => a.id === seq[d.seqI % seq.length]); d.seqI++; if (next) pick = next; }
      d.attack = pick; d.lastAttack = pick.id; d.lastUsed[pick.id] = now;
      // a short tell (shorter as the fight goes on), with a flash of the boss's colour on the floor
      const pressure = Math.max(d.phase, d.tier);
      const readable = w.run.mode === 'normal' && w.run.challenge !== 'hard' && !d.hard;
      d.windT = OWN_FIGHT.has(e.def.id) ? 0 : readable
        ? Math.max(0.3, 0.42 - pressure * 0.06)
        : Math.max(0.16, 0.34 - pressure * 0.07);
      if (d.windT > 0) {
        e.setState('windup');
        w.fx.ring(e.x, e.y, 4, e.r + 14, d.tier >= 2 || d.cornered ? '#ff4050' : '#ffb060', d.windT);
        w.audio.play('rumble', { x: e.x, vol: 0.22, pitch: 1.5 });
      } else { e.setState('attack'); pick.start?.(e, w); }
    }
    return;
  }
  if (e.state === 'attack') {
    const a: BossAttack = d.attack;
    if (a.run(e, w, e.st, dt)) {
      d.idleT = rand(brain.idleTime) * (d.phase > 0 ? 0.7 : 1);
      // spent: a window to hit back, a little shorter once it's cornered
      // the rule the reworked fights teach carries over: any boss that commits its whole body to a move
      // is briefly spent after it, even ones without an authored rhythm
      const rec = typeof a.recover === 'function' ? a.recover(e) : a.recover ?? (!OWN_FIGHT.has(e.def.id) && COMMITTED.has(a.id) ? 0.6 : 0);
      if (rec > 0) { e.setState('recover'); d.recoverT = rec * (d.cornered ? 0.7 : 1); d.exposed = true; w.audio.play('bossPant', { x: e.x, vol: 0.5 }); }
      else { e.setState('idle'); d.exposed = false; }
    }
    return;
  }
  if (e.state === 'recover') {
    // heaving in place: slow, wide breaths so it reads as tired, not as winding up
    e.sx = 1 + Math.sin(e.st * 9) * 0.07; e.sy = 1 - Math.sin(e.st * 9) * 0.06;
    if (Math.random() < dt * 6) w.fx.smoke(e.x + (Math.random() - 0.5) * e.r, e.y - e.hitY - e.r * 0.6, 1, 'rgba(230,220,200,', 3, 0.5, 8);
    // a gold ring pulsing on the floor under it: open to attack
    d.ringT = (d.ringT ?? 0) - dt;
    if (d.ringT <= 0) { d.ringT = 0.3; w.fx.ring(e.x, e.y, e.r * 0.8, e.r + 10, '#ffd860', 0.3, false); }
    if (e.st >= d.recoverT) { e.setState('idle'); d.exposed = false; e.sx = e.sy = 1; }
  }
}
function rand([a, b]: [number, number]): number { return a + Math.random() * (b - a); }

/** Telegraph marker on the floor (drawn by the world as a pulsing ring). */
export function telegraph(w: World, x: number, y: number, r: number, dur: number, color = '#ff3050'): void {
  w.telegraphs.push({ x, y, r, t: 0, dur, color });
}
