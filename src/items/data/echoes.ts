// The Echoes update: three things from the house that play with time and noise.
//   Snow Globe     - shake it and the room stops (enemies and their shots hang in the air)
//   Rewind Tape    - wind yourself back three seconds, hurt and all
//   Grandad's Radio - every so often it crackles and everything in the room loses its place
import type { ItemDef } from '../types';
import type { World } from '../../game/world';
import { ramp, hex, P } from './kit';
import { Health } from '../../player/health';
import { TAU } from '../../core/math';

function snowGlobe(p: P): void {
  p.rect(4, 13, 10, 3, hex('#6a3a1e')); p.rect(4, 13, 10, 1, hex('#9a5a2e'));
  p.ball(9, 8, 5.5, 5.5, ramp('#a8d0f0'), { dither: 0.4 });
  p.rect(7, 8, 4, 3, hex('#c83a3a')); p.poly([6, 8, 9, 5, 12, 8], hex('#5a2a1a')); p.set(9, 10, '#ffe080');
  for (const [x, y] of [[6, 5], [11, 4], [5, 9], [12, 9], [8, 3], [10, 7]] as [number, number][]) p.set(x, y, '#ffffff');
  p.set(6, 4, '#ffffff'); p.set(7, 4, '#e8f4ff');
}
function rewindTape(p: P): void {
  p.rect(2, 5, 14, 9, hex('#1a1a20')); p.rect(2, 5, 14, 1, hex('#3a3a44'));
  p.rect(4, 6, 10, 3, hex('#e8e0c8')); p.rect(5, 7, 5, 1, hex('#c83a3a'));
  for (const x of [6, 12]) { p.ball(x, 11, 1.8, 1.8, ramp('#d8d8e0')); p.set(x, 11, '#1a1a20'); }
  p.rect(7, 11, 4, 1, hex('#5a4a3a'));
  p.poly([1, 2, 5, 0, 5, 4], hex('#ffd040')); p.poly([5, 2, 9, 0, 9, 4], hex('#ffd040'));
}
function radio(p: P): void {
  const w = ramp('#8a5a30');
  p.rect(2, 5, 14, 10, w[2]); p.rect(2, 5, 14, 1, w[3]); p.rect(2, 14, 14, 1, w[0]);
  for (let y = 7; y < 13; y += 2) p.rect(4, y, 6, 1, hex('#3a2a1a'));
  p.ball(13, 9, 2, 2, ramp('#e8d8a0')); p.set(13, 8, '#3a2a1a');
  p.rect(11, 12, 4, 1, hex('#e8c050'));
  p.line(12, 5, 15, 1, hex('#8a8a92')); p.set(15, 1, '#c8c8d0');
}

/** Rewind Tape keeps the last three seconds of where you were and how you were. */
interface Frame { x: number; y: number; h: any }
const tapeOf = (w: World): Frame[] => ((w as any).rewindTape ??= []);

export const ECHO_ITEMS: ItemDef[] = [
  { id: 'snow_globe', name: 'Snow Globe', kind: 'active', quality: 3, pools: { treasure: 0.8, shop: 0.5 },
    pickup: 'Shake it, and everything stops', effect: ['Freezes every enemy and every enemy shot in the room for 3.5 seconds (bosses for 1.5).'],
    active: { charge: 4, type: 'room', use: (w) => {
      for (const e of w.enemies) if (!e.dead) e.freeze = Math.max(e.freeze, e.isBoss ? 1.5 : 3.5);
      for (const p of w.proj.list) if (p.active && p.team === 1) p.delay = Math.max(p.delay, 3.5);
      w.beams = w.beams.filter((b) => !b.enemyBeam);
      w.whiteFlash = 0.45; w.audio.play('chime', { pitch: 1.6 }); w.audio.play('bell', { pitch: 2.4, vol: 0.4 });
      const c = w.room.center();
      for (let i = 0; i < 60; i++) w.fx.burst(c.x + (Math.random() - 0.5) * w.room.pxW, c.y + (Math.random() - 0.5) * w.room.pxH, 30, 1, '#ffffff', 10, 2.4, 1, 0);
      w.hud.toast('Everything hangs in the air.', 1.4);
    } },
    icon: snowGlobe, lore: 'Grandmother\'s, from a seaside town nobody can remember the name of.' },
  { id: 'rewind_tape', name: 'Rewind Tape', kind: 'active', quality: 3, pools: { treasure: 0.7, secret: 0.6 }, unlock: 'echo_rest',
    pickup: 'Be kind, rewind', effect: ['Takes you back to where you were 3 seconds ago, healing any damage you took since then.', 'Clears enemy shots around you.'],
    hooks: { onTick: (w) => {
      // a frame every tenth of a second, three seconds long
      const tape = tapeOf(w); const now = w.time;
      if (!tape.length || now - (tape as any).last > 0.1) { (tape as any).last = now; tape.push({ x: w.player.x, y: w.player.y, h: w.player.health.serialize() }); if (tape.length > 30) tape.shift(); }
    } },
    active: { charge: 3, type: 'room', use: (w) => {
      const tape = tapeOf(w); const f = tape[0]; if (!f) return false;
      const pl = w.player;
      w.fx.ring(pl.x, pl.y - 10, 4, 30, '#80c0ff', 0.4);
      pl.x = f.x; pl.y = f.y; pl.vx = pl.vy = 0;
      // only ever heals: the tape won't give back containers you've since traded, or take any away
      const old = Health.from(f.h);
      if (old.redMax === pl.health.redMax && old.totalHalf() > pl.health.totalHalf()) pl.health = old;
      w.cancelEnemyShotsNear(pl.x, pl.y, 60);
      pl.iframes = Math.max(pl.iframes, 0.8);
      tape.length = 0;
      w.audio.play('reroll', { pitch: 0.6 }); w.whiteFlash = 0.25;
      w.fx.ring(pl.x, pl.y - 10, 30, 4, '#80c0ff', 0.4);
    } },
    icon: rewindTape, lore: 'Grandad taped everything off the telly. This one is labelled MARCUS – DO NOT RECORD OVER.' },
  { id: 'grandads_radio', name: 'Grandad\'s Radio', kind: 'passive', quality: 2, pools: { treasure: 0.9, shop: 0.6 }, unlock: 'transform_crew',
    pickup: 'Static every now and then', effect: ['Luck +1.', 'Every 9 seconds in a fight the radio crackles: every enemy in the room is confused for a moment.'],
    stats: { luck: 1 },
    hooks: { onTick: (w, dt) => {
      const W = w as any;
      if (w.aliveEnemies() === 0) { W.radioT = 4; return; }
      W.radioT = (W.radioT ?? 4) - dt;
      if (W.radioT > 0) return;
      W.radioT = 9;
      for (const e of w.enemies) if (!e.dead && !e.isBoss) e.confuse = Math.max(e.confuse, 1.8);
      w.audio.play('zap', { pitch: 0.5, vol: 0.4 });
      const pl = w.player;
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; w.fx.burst(pl.x + Math.cos(a) * 14, pl.y - 12 + Math.sin(a) * 8, 6, 2, '#e8d8a0', 30, 0.8, 1, 0); }
      w.hud.toast('♪ The radio crackles.', 1);
    } },
    icon: radio, lore: 'Tuned to the station that only plays old songs. Grandad hummed along to every one.' },
];
