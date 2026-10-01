// Debug helpers exposed on window for automated tests (harmless in normal play).
import type { Game } from './game';
import * as flow from './roomflow';
import { placeBomb } from './bombs';
import { ALL_ITEMS } from '../items/registry';
import { ALL_ENEMY_DEFS } from '../enemies/registry';

export function attachDebug(g: Game): void {
  (window as any).__bomDebug = {
    game: g,
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
    god() { const w = g.world; if (w) w.player.iframes = 1e9; },
    errors: [] as string[],
  };
  window.addEventListener('error', (e) => (window as any).__bomDebug.errors.push(String(e.message)));
}
