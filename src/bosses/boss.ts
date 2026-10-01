// Boss framework: weighted attack selection per phase, telegraphs, phase transitions and death sequences.
import type { Enemy } from '../enemies/enemy';
import type { World } from '../game/world';

export interface BossAttack {
  id: string;
  weight: number;
  phases?: number[];           // allowed phases (0-based); default all
  cooldown?: number;           // min seconds before reuse
  start?(e: Enemy, w: World): void;
  /** Return true when the attack is finished. t = seconds since start. */
  run(e: Enemy, w: World, t: number, dt: number): boolean;
}
export interface BossBrain {
  attacks: BossAttack[];
  idle(e: Enemy, w: World, dt: number): void;
  idleTime: [number, number];
  phases?: number[];            // hp fractions that trigger phases, descending e.g. [0.5]
  onPhase?(e: Enemy, w: World, phase: number): void;
}

export function bossUpdate(e: Enemy, w: World, dt: number, brain: BossBrain): void {
  const d = e.data;
  d.phase ??= 0; d.lastUsed ??= {} as Record<string, number>;
  // phase change
  const thresholds = brain.phases ?? [];
  if (d.phase < thresholds.length && e.hpFrac() <= thresholds[d.phase] && e.state !== 'phase') {
    d.phase++;
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
  if (e.state === 'idle') {
    brain.idle(e, w, dt);
    if (d.hard) d.idleT = (d.idleT ?? 1) - dt * 0.6;
    d.idleT = (d.idleT ?? rand(brain.idleTime)) - dt;
    if (d.idleT <= 0) {
      const now = e.t;
      const opts = brain.attacks.filter((a) => (!a.phases || a.phases.includes(d.phase)) && (now - (d.lastUsed[a.id] ?? -99)) >= (a.cooldown ?? 0) && a.id !== d.lastAttack);
      const pool = opts.length ? opts : brain.attacks.filter((a) => !a.phases || a.phases.includes(d.phase));
      let tot = 0; for (const a of pool) tot += a.weight;
      let r = Math.random() * tot; let pick = pool[0];
      for (const a of pool) { r -= a.weight; if (r <= 0) { pick = a; break; } }
      d.attack = pick; d.lastAttack = pick.id; d.lastUsed[pick.id] = now;
      e.setState('attack');
      pick.start?.(e, w);
    }
    return;
  }
  if (e.state === 'attack') {
    const a: BossAttack = d.attack;
    if (a.run(e, w, e.st, dt)) { e.setState('idle'); d.idleT = rand(brain.idleTime) * (d.phase > 0 ? 0.7 : 1); }
  }
}
function rand([a, b]: [number, number]): number { return a + Math.random() * (b - a); }

/** Telegraph marker on the floor (drawn by the world as a pulsing ring). */
export function telegraph(w: World, x: number, y: number, r: number, dur: number, color = '#ff3050'): void {
  w.telegraphs.push({ x, y, r, t: 0, dur, color });
}
