// Debug helpers exposed on window for automated tests (harmless in normal play).
import type { Game } from './game';
import * as flow from './roomflow';
import { syncFamiliars } from '../items/familiar_rt';
import { placeBomb } from './bombs';
import { ALL_ITEMS } from '../items/registry';
import { ALL_ENEMY_DEFS } from '../enemies/registry';
import * as Ink from './inklings';

export function attachDebug(g: Game): void {
  (window as any).__bomDebug = {
    game: g,
    /** The Inklings module, for tests (the same instance the game uses). */
    ink: Ink,
    get world() { return g.world; },
    items: () => ALL_ITEMS.map((i) => i.id),
    enemies: () => ALL_ENEMY_DEFS().map((d) => d.id),
    give(id: string) { if (g.world) flow.grantItem(g.world, id); },
    nextFloor() { if (g.world) flow.nextFloor(g.world); },
    goto(id: number) {
      const w = g.world; if (!w) return;
      for (const e of w.enemies) e.dead = true;
      w.enemies = []; w.lockdown = false; w.room.cleared = true;
      w.enterRoom(id, null, false);
      const c = w.room.center(); w.player.x = c.x; w.player.y = c.y + 30; w.snapCamera();
    },
    killAll() { const w = g.world; if (!w) return; for (const e of [...w.enemies]) if (!e.dead) w.killEnemy(e); },
    spawn(id: string, x?: number, y?: number) { const w = g.world; if (!w) return null; const c = w.room.center(); return w.spawnEnemy(id, x ?? c.x, y ?? c.y - 40, false); },
    bomb() { if (g.world) { g.world.player.bombs++; placeBomb(g.world); } },
    /** Open a bargain room beside the current room and walk in. */
    async bargain(kind: 'deal' | 'blessing' | 'lostfound') {
      const w = g.world; if (!w) return null;
      const { openBargain } = await import('./bargain');
      const r = openBargain(w, w.room, kind); if (!r) return null;
      this.goto(r.id); return r.id;
    },
    hitboxes(on = true) { if (g.world) g.world.showHitboxes = on; },
    god() { const w = g.world; if (w) w.player.iframes = 1e9; },
    /** Render a music track offline and report timing / levels (for tests). */
    async music(name: string) {
      const { SONGS } = await import('../audio/songs');
      const { renderSong } = await import('../audio/render');
      const t0 = performance.now();
      const st = await renderSong(name, SONGS[name], true);
      const stat = (b: AudioBuffer) => { let pk = 0, sq = 0; const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) { pk = Math.max(pk, Math.abs(d[i])); sq += d[i] * d[i]; } return { peak: +pk.toFixed(3), rms: +Math.sqrt(sq / d.length).toFixed(3) }; };
      return { ms: Math.round(performance.now() - t0), loop: +st.loop.toFixed(2), calm: stat(st.calm), combat: stat(st.combat) };
    },
    /**
     * Synergy harness: hold exactly `ids`, line up sturdy dummies to the right, hold fire (with
     * periodic releases so charged modes fire) for `frames` simulated frames, and report what happened.
     */
    synergy(ids: string[], frames = 180) {
      const w = g.world; if (!w) return null;
      const pl = w.player;
      for (const e of w.enemies) e.dead = true;
      w.enemies = []; w.proj.clear(); w.beams = []; w.bombs = []; w.creep = [];
      pl.items.clear(); pl.itemOrder = []; pl.temp = []; pl.transformations.clear(); pl.active = null; pl.charms = [];
      pl.wcharge = 0; pl.wasAiming = false; pl.fireCd = 0; pl.swing = null;
      for (const id of ids) flow.grantItem(w, id, true);
      pl.recompute(); syncFamiliars(w);
      const c = w.room.center();
      pl.x = c.x - 70; pl.y = c.y; pl.vx = pl.vy = 0; pl.iframes = 1e9;
      // a line in the aim direction plus a ring, so curving / orbiting / rear shots all have targets
      const spots = [[24, -10], [58, 0], [92, 10], ...Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4 + 0.4) * 62, Math.sin(i * Math.PI / 4 + 0.4) * 44])];
      const dummies = spots.map(([dx, dy]) => {
        const e = w.spawnEnemy('valvehead', c.x - 70 + dx, c.y + dy, false)!;
        e.hp = e.maxHp = 1e6; e.spawnT = 0; return e;
      });
      // observe which effects actually happen
      const seen: Record<string, number> = {};
      const bump = (k: string) => { seen[k] = (seen[k] ?? 0) + 1; };
      const W = w as any;
      const wrap = (name: string, tag: (...a: any[]) => string | null) => { const o = W[name]; W[name] = function (this: any, ...a: any[]) { const t = tag(...a); if (t) bump(t); return o.apply(this, a); }; return () => { W[name] = o; }; };
      const unwrap = [
        wrap('explode', (_x: number, _y: number, _r: number, _d: number, o: any) => (o?.friendly ? 'explode' : null)),
        wrap('chainLightning', () => 'chain'),
        wrap('addCreep', (_x: number, _y: number, _r: number, team: string) => (team === 'player' ? 'creep' : null)),
        wrap('damageEnemy', (_e: any, _d: number, info: any) => (info?.crit ? 'crit' : null)),
      ];
      const STATUS = ['burn', 'poison', 'slow', 'freeze', 'fear', 'confuse', 'mark', 'charm'];
      const inp = g.input as any, orig = inp.aimVector;
      let f = 0, maxProj = 0, maxBeams = 0, err: string | null = null;
      // hold fire; let go for a frame whenever a charged attack is full so it releases
      inp.aimVector = () => (pl.wcharge >= 1 ? null : { x: 1, y: 0 });
      try {
        for (f = 0; f < frames; f++) {
          w.update(1 / 60);
          pl.iframes = 1e9; pl.x = c.x - 70; pl.y = c.y;
          maxProj = Math.max(maxProj, w.proj.list.filter((p: any) => p.active && p.team === 0).length);
          maxBeams = Math.max(maxBeams, w.beams.length);
          for (const e of dummies) for (const k of STATUS) if ((e as any)[k] > 0 && !seen[k]) bump(k);
        }
      } catch (e: any) { err = String(e?.stack ?? e).split('\n').slice(0, 3).join(' | '); }
      finally { inp.aimVector = orig; for (const u of unwrap) u(); }
      const dealt = dummies.reduce((s, e) => s + (e.maxHp - Math.max(0, e.hp)), 0);
      for (const e of w.enemies) e.dead = true;
      w.enemies = []; w.proj.clear(); w.beams = [];
      return { mode: pl.mode, modes: [...pl.prof.modes], dealt: Math.round(dealt), maxProj, maxBeams, err, seen };
    },
    errors: [] as string[],
  };
  window.addEventListener('error', (e) => (window as any).__bomDebug.errors.push(String(e.message)));
}
