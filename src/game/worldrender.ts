// Draws the current room: background, obstacles, doors, entities (y-sorted), projectiles, particles, lights.
import type { World } from './world';
import { snap } from '../render/snap';
import { drawBossLife } from '../bosses/bosslife';
import { drawRigged } from '../bosses/rig';
import { doorSymbol } from '../art/roomicons';
import { BG_MARGIN } from '../art/roombg';
import { Ob, Side } from '../rooms/room';
import { TILE, VIEW_W, VIEW_H } from '../core/constants';
import { doorSprites } from '../art/props';
import { ease, TAU } from '../core/math';
import { renderPickup, Pickup } from './pickups';
import { renderBomb, Bomb } from './bombs';
import { renderNpc, Npc } from './npc';
import { renderFamiliar, Familiar } from '../items/familiar_rt';
import { Team } from '../projectiles/projectiles';
import { renderBeams } from '../projectiles/weapons';
import { Enemy } from '../enemies/enemy';
import { hex, darken, toCss, ramp } from '../render/color';
import { pickupSprites } from '../art/pickups';
import { CHAMPIONS, ChampKind } from './roomflow';
import { renderInkWorld } from './inklings';

type Drawable = { y: number; kind: number; ref: any };
const drawables: Drawable[] = [];
const scratch = new Map<number, HTMLCanvasElement>();

export function renderWorld(w: World): void {
  const r = w.r, ctx = r.ctx, room = w.room, theme = w.theme;
  const shakeAmt = w.trauma * w.trauma * 7;
  const shx = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0, shy = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0;
  const camX = snap(w.renderCamX + shx), camY = snap(w.renderCamY + shy);
  let darkness = theme.darkness * 0.85 + (w.floor.curse === 'dark' ? 0.25 : 0) + (w.run.challenge === 'darkness' ? 0.3 : 0);
  if (room.type === 'treasure' || room.type === 'shop' || room.type === 'blessing' || room.type === 'lostfound') darkness *= 0.75;
  if (room.flags.variant === 'dark' && !room.cleared) darkness += 0.3;
  r.beginFrame(theme.ambient, Math.min(0.9, darkness));
  r.worldBegin();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (room.bgCache) ctx.drawImage(room.bgCache, -BG_MARGIN - camX, -BG_MARGIN - camY);
  // --------------------------------------------------------------- creep
  for (const c of w.creep) {
    const a = Math.min(1, c.life / 0.6) * 0.75;
    ctx.globalAlpha = a; ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.ellipse(snap(c.x - camX), snap(c.y - camY), c.r, c.r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#ffffff';
    ctx.fillRect(snap(c.x - camX - c.r * 0.3), snap(c.y - camY - c.r * 0.25), 2, 1);
  }
  ctx.globalAlpha = 1;
  renderInkWorld(w, ctx, camX, camY, 'floor');
  // --------------------------------------------------------------- obstacles (cached layer)
  if (w.obstacleDirty || !w.obstacleLayer) rebuildObstacleLayer(w);
  ctx.drawImage(w.obstacleLayer!, -camX, -camY);
  // --------------------------------------------------------------- doors
  for (const d of w.doors) drawDoor(w, ctx, d, camX, camY);
  // telegraphs
  for (const t of w.telegraphs) {
    const k = t.t / t.dur;
    const pulse = 0.5 + 0.5 * Math.sin(t.t * 22);
    ctx.globalAlpha = 0.25 + 0.35 * pulse * (0.5 + k * 0.5);
    ctx.strokeStyle = t.color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(snap(t.x - camX), snap(t.y - camY), t.r, t.r * 0.62, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.12 + 0.2 * k; ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.ellipse(snap(t.x - camX), snap(t.y - camY), t.r * k, t.r * 0.62 * k, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // trapdoor
  if (w.trapdoor && w.trapdoor.kind === 'portal') drawPortal(w, ctx, w.trapdoor.x - camX, w.trapdoor.y - camY, w.trapdoor.t);
  else if (w.trapdoor) {
    const t = w.trapdoor; const S = pickupSprites();
    const f = Math.min(3, Math.floor(t.t / 0.18));
    S.trapdoor[f].draw(ctx, t.x - camX, t.y - camY);
    if (f === 3) r.addLight(t.x - camX, t.y - camY, 26, 0.3);
  }
  if (w.exitDoor?.kind === 'room4') drawRoom4Door(w, ctx, w.exitDoor.x - camX, w.exitDoor.y - camY, w.exitDoor.t);
  else if (w.exitDoor) drawExitDoor(w, ctx, w.exitDoor.x - camX, w.exitDoor.y - camY, w.exitDoor.t);
  if (w.backStair) drawBackStair(w, ctx, w.backStair.x - camX, w.backStair.y - camY, w.backStair.t, w.backStair.boarded);
  if (w.lightBeam) drawLightBeam(w, ctx, w.lightBeam.x - camX, w.lightBeam.y - camY, w.lightBeam.t);
  // --------------------------------------------------------------- y-sorted entities
  drawables.length = 0;
  for (const e of w.enemies) drawables.push({ y: e.y + (e.def.boss ? -4 : 0), kind: 0, ref: e });
  drawables.push({ y: w.player.y, kind: 1, ref: w.player });
  for (const p of w.pickups) drawables.push({ y: p.y - (p.pedestal ? 2 : 0), kind: 2, ref: p });
  for (const b of w.bombs) drawables.push({ y: b.y, kind: 3, ref: b });
  for (const n of w.npcs) drawables.push({ y: n.y, kind: 4, ref: n });
  for (const f of w.familiars) drawables.push({ y: f.y, kind: 5, ref: f });
  for (const c of w.corpses) drawables.push({ y: c.e.y, kind: 7, ref: c });
  for (const pp of w.pops) drawables.push({ y: pp.e.y, kind: 8, ref: pp });
  // animated obstacles
  for (let i = 0; i < room.grid.length; i++) {
    const k = room.grid[i];
    if (k === Ob.Fire || k === Ob.TimedSpikes) { const c = i % room.cols, rr = (i / room.cols) | 0; drawables.push({ y: room.oy + rr * TILE + (k === Ob.Fire ? 18 : 0), kind: 6, ref: i }); }
  }
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) {
    switch (d.kind) {
      case 0: drawEnemy(w, ctx, d.ref as Enemy, camX, camY); break;
      case 1: w.player.render(ctx, w, snap(w.player.x - camX), snap(w.player.y - camY)); break;
      case 2: renderPickup(w, ctx, d.ref as Pickup, snap((d.ref as Pickup).x - camX), snap((d.ref as Pickup).y - camY)); break;
      case 3: renderBomb(w, ctx, d.ref as Bomb, snap((d.ref as Bomb).x - camX), snap((d.ref as Bomb).y - camY)); break;
      case 4: renderNpc(w, ctx, d.ref as Npc, snap((d.ref as Npc).x - camX), snap((d.ref as Npc).y - camY)); break;
      case 5: renderFamiliar(w, ctx, d.ref as Familiar, snap((d.ref as Familiar).x - camX), snap((d.ref as Familiar).y - camY)); break;
      case 6: drawDynamicObstacle(w, ctx, d.ref as number, camX, camY); break;
      case 8: {
        const pp = d.ref as { e: Enemy; t: number }, e = pp.e, k = pp.t / 0.09;
        const set = e.sprites[e.anim] ?? e.sprites.idle ?? Object.values(e.sprites)[0], spr = set?.[e.frame % (set?.length || 1)];
        if (spr) spr.draw(ctx, snap(e.x - camX), snap(e.y - e.z - camY), { flip: e.flip, flash: 1, sx: 1 + k * 0.35, sy: 1 + k * 0.2, alpha: 1 - k * 0.6 });
        break;
      }
      case 7: {
        const c = d.ref as { e: Enemy; t: number; dur: number };
        const e = c.e; const k = c.t / c.dur;
        const jx = (Math.random() - 0.5) * 3 * (1 + k * 2);
        ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - 0.85) * 6;
        // a rigged boss plays its own death; anything else shakes and squashes
        const own = !!e.sprites.death;
        e.flash = Math.random() < (own ? 0.12 : 0.3) ? 1 : 0;
        if (own) { e.data.deathK = Math.min(0.999, k); e.sx = e.sy = 1; } else { e.sx = 1 + k * 0.15; e.sy = 1 - k * 0.25; }
        e.dead = false;
        drawEnemyBody(w, ctx, e, snap(e.x - camX + jx * (own ? 0.4 : 1)), snap(e.y - camY));
        e.dead = true;
        ctx.restore();
        break;
      }
    }
  }
  // --------------------------------------------------------------- projectiles, beams, particles
  w.proj.render(ctx, camX, camY, w, Team.Player);
  renderBeams(w, ctx, camX, camY);
  w.fx.render(ctx, camX, camY, (x, y, rr, c, a) => r.addGlow(x, y, rr, c, a));
  renderInkWorld(w, ctx, camX, camY, 'top');
  w.proj.render(ctx, camX, camY, w, Team.Enemy);   // what can hurt you goes on top of everything
  renderAmbient(w, ctx, camX, camY);
  // --------------------------------------------------------------- lights
  const pl = w.player;
  const plLight = theme.playerLight + (pl.has('pocket_lantern') ? 40 : 0);
  r.addLight(pl.x - camX, pl.y - 10 - camY, plLight, 0.95);
  r.addLight(pl.x - camX, pl.y - 10 - camY, plLight * 0.45, 0.9);
  for (const d of w.doors) if (d.open > 0.5) r.addLight(d.x - camX, d.y - camY, 40, 0.5 * d.open);
  const c = room.center();
  if (room.type === 'treasure') { r.addLight(c.x - camX, c.y - camY, 110, 0.7); r.addGlow(c.x - camX, c.y - 10 - camY, 70, '#ffd080', 0.12); }
  if (room.type === 'deal') { r.addLight(c.x - camX, c.y - camY, 90, 0.5); r.addGlow(c.x - camX, c.y - camY, 90, '#5a40d0', 0.2); }
  if (room.type === 'lostfound') { r.addLight(c.x - camX, c.y - 30 - camY, 130, 0.8); r.addGlow(c.x - camX, c.y - camY, 100, '#ffb050', 0.14); }
  if (room.type === 'blessing') { r.addLight(c.x - camX, c.y - camY, 160, 0.9); r.addGlow(c.x - camX, c.y - camY, 110, '#fff0c0', 0.15); }
  if (room.type === 'shop' || room.type === 'library' || room.type === 'arcade') r.addLight(c.x - camX, c.y - camY, 150, 0.7);
  if (room.type === 'boss' && room.cleared) r.addLight(c.x - camX, c.y - camY, 170, 0.6);
  for (let i = 0; i < room.grid.length; i++) {
    if (room.grid[i] !== Ob.Fire || room.ghp[i] <= 0) continue;
    const cc = i % room.cols, rr = (i / room.cols) | 0;
    const p = room.cellCenter(cc, rr);
    const v = room.gvar[i];
    const col = v === 1 ? '#4a8aff' : v === 2 ? '#8ad040' : v === 3 ? '#7a4ad0' : '#ff8a30';
    const fl = 0.85 + Math.sin(w.time * 13 + i) * 0.08 + Math.sin(w.time * 7.3 + i * 2) * 0.07;
    r.addLight(p.x - camX, p.y - 8 - camY, 70 * fl * (0.5 + 0.5 * Math.min(1, room.ghp[i] / 12)), 0.9);
    r.addGlow(p.x - camX, p.y - 10 - camY, 34 * fl, col, 0.3);
  }
  if (room.flags.lights) for (const L of room.flags.lights as { x: number; y: number; c?: string; r?: number }[]) {
    const fl = L.c ? 1 : 0.9 + Math.sin(w.time * 9 + L.x) * 0.06 + Math.sin(w.time * 23 + L.y) * 0.03;
    r.addLight(L.x - camX, L.y - camY, (L.r ?? 46) * fl, 0.85);
    r.addGlow(L.x - camX + 1, L.y - 2 - camY, (L.c ? 26 : 12) * fl, L.c ?? '#ffb050', L.c ? 0.22 : 0.4);
    if (!L.c && Math.random() < 0.02) w.fx.embers(L.x + 1, L.y - 3, 1, '#ffc060', 1);
  }
  for (const e of w.enemies) if (e.def.light) { r.addLight(e.x - camX, e.y - e.hitY - camY, e.def.light[0], 0.7); r.addGlow(e.x - camX, e.y - e.hitY - camY, e.def.light[0] * 0.5, e.def.light[1], 0.25); }
  // --------------------------------------------------------------- transition slide
  if (w.transition) applyTransition(w);
}

function applyTransition(w: World): void {
  const t = w.transition!;
  const k = ease.inOutCubic(Math.min(1, t.t / t.dur));
  const r = w.r;
  // each buffer slides in its own pixels (the world's are finer than the light's)
  for (const cv of [r.world, r.light, r.glow]) {
    const s = cv.width / VIEW_W, W = cv.width, H = cv.height;
    const nx = Math.round((1 - k) * t.dx * W), ny = Math.round((1 - k) * t.dy * H);
    const ox = Math.round(-k * t.dx * W), oy = Math.round(-k * t.dy * H);
    let sc = scratch.get(W);
    if (!sc) { sc = document.createElement('canvas'); sc.width = W; sc.height = H; scratch.set(W, sc); }
    const sx = sc.getContext('2d')!;
    sx.clearRect(0, 0, W, H); sx.drawImage(cv, 0, 0);
    const c = cv.getContext('2d')!;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, W, H);
    if (cv === r.world) { c.fillStyle = '#050307'; c.fillRect(0, 0, W, H); }
    c.drawImage(sc, nx, ny);
    if (cv === r.world) { c.imageSmoothingEnabled = false; c.drawImage(t.snap, ox, oy, VIEW_W * s, VIEW_H * s); }
    c.restore();
  }
}

function drawEnemy(w: World, ctx: CanvasRenderingContext2D, e: Enemy, camX: number, camY: number): void {
  const sx = snap(e.x - camX), sy = snap(e.y - camY);
  if (e.hidden && !e.def.draw) return;
  // spawn-in: rise out of an ink pool
  if (e.spawnT > 0 && !e.def.spawnQuiet) {
    const k = Math.max(0, Math.min(1, 1 - e.spawnT / 0.55));
    ctx.fillStyle = 'rgba(20,16,40,' + (0.6 * (1 - k * 0.5)).toFixed(2) + ')';
    ctx.beginPath(); ctx.ellipse(sx, sy, e.r * 1.2 * (0.4 + k * 0.6), e.r * 0.45, 0, 0, TAU); ctx.fill();
    if (k <= 0) return;
    ctx.save();
    ctx.beginPath(); ctx.rect(sx - 60, sy - 200, 120, 200 + 1); ctx.clip();
    ctx.globalAlpha = k;
    drawEnemyBody(w, ctx, e, sx, sy + snap((1 - k) * (e.hitY * 2 + 6)));
    ctx.restore();
    return;
  }
  drawEnemyBody(w, ctx, e, sx, sy);
}

function drawEnemyBody(w: World, ctx: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number): void {
  const boss = e.isBoss && !e.dead && !e.hidden;
  // shadow (bosses get a heavier, layered one)
  if (!e.hidden) {
    const sr = e.r * (e.z > 0 ? Math.max(0.4, 1 - e.z / 80) : 1);
    if (boss) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.beginPath(); ctx.ellipse(sx, sy, sr * 1.45, Math.max(2, sr * 0.55), 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(sx, sy, sr, Math.max(1.5, sr * 0.35), 0, 0, TAU); ctx.fill();
  }
  // a landing mark where a hopping creature will come down, and the edge of a protecting aura
  const land = e.data.landAt as { x: number; y: number; r: number } | null | undefined;
  if (land && !e.dead) {
    const lx = snap(land.x - e.x + sx), ly = snap(land.y - e.y + sy), k = 0.5 + 0.5 * Math.sin(w.time * 18);
    ctx.fillStyle = `rgba(0,0,0,${0.22 + 0.1 * k})`; ctx.beginPath(); ctx.ellipse(lx, ly, land.r, land.r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,120,90,${0.35 + 0.25 * k})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(lx, ly, land.r + 2, land.r * 0.4 + 1, 0, 0, TAU); ctx.stroke();
  }
  const flow = e.data.flow as { horiz: boolean; at: number; half: number; dir: number; warn: number; t: number } | null | undefined;
  if (flow && !e.dead) {
    // a sluice: a trickling band while it warns, a running current once it opens
    const ox = sx - e.x, oy = sy - e.y, room = w.room;
    const x0 = room.ox + TILE + ox, y0 = room.oy + TILE + oy, x1 = room.ox + (room.cols - 1) * TILE + ox, y1 = room.oy + (room.rows - 1) * TILE + oy;
    const running = flow.t > flow.warn;
    ctx.save();
    ctx.globalAlpha = running ? 0.22 : 0.08 + 0.08 * Math.sin(w.time * 14); ctx.fillStyle = '#6ab0d8';
    if (flow.horiz) ctx.fillRect(x0, flow.at - flow.half + oy, x1 - x0, flow.half * 2); else ctx.fillRect(flow.at - flow.half + ox, y0, flow.half * 2, y1 - y0);
    ctx.globalAlpha = running ? 0.6 : 0.35; ctx.strokeStyle = '#bfe4f4'; ctx.lineWidth = 1; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -w.time * (running ? 90 : 20) * flow.dir;
    for (const k of [-0.6, 0, 0.6]) { ctx.beginPath(); if (flow.horiz) { const y = flow.at + k * flow.half + oy; ctx.moveTo(x0, y); ctx.lineTo(x1, y); } else { const x = flow.at + k * flow.half + ox; ctx.moveTo(x, y0); ctx.lineTo(x, y1); } ctx.stroke(); }
    ctx.restore();
  }
  const aim = e.data.aimLine as { a: number; locked: boolean } | null | undefined;
  if (aim && !e.dead) {
    // a sighting line: thin and dim while it tracks you, bright once it has locked
    ctx.save(); ctx.globalAlpha = aim.locked ? 0.75 + 0.25 * Math.sin(w.time * 40) : 0.35; ctx.strokeStyle = aim.locked ? '#ff4030' : '#ff8070'; ctx.lineWidth = aim.locked ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(sx + Math.cos(aim.a) * 10, sy - 6 + Math.sin(aim.a) * 6); ctx.lineTo(sx + Math.cos(aim.a) * 260, sy - 6 + Math.sin(aim.a) * 260); ctx.stroke(); ctx.restore();
  }
  if (e.def.aura && !e.dead && e.spawnT <= 0) {
    const a = e.def.aura;
    ctx.save(); ctx.globalAlpha = 0.28 + 0.08 * Math.sin(w.time * 3); ctx.strokeStyle = a.color; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -w.time * 8;
    ctx.beginPath(); ctx.ellipse(sx, sy, a.r, a.r * 0.75, 0, 0, TAU); ctx.stroke(); ctx.restore();
  } else if (!e.dead && !e.hidden) {
    const ward = w.wardOf(e);
    if (ward) w.r.addGlow(sx, sy - e.z - e.hitY, e.r * 1.8, ward.def.aura!.color, 0.16);
  }
  // bosses: a soft aura in the chapter's accent (red when badly hurt), a slow breath while idle,
  // and ink dripping off them near the end
  let breathe = false;
  if (boss) {
    const hurt = e.hpFrac() < 0.3;
    const pulse = 0.5 + 0.5 * Math.sin(w.time * (hurt ? 6 : 2));
    w.r.addGlow(sx, sy - e.z - e.hitY, e.r * 3.2, hurt ? '#ff2040' : w.theme.pal.accent, 0.08 + 0.06 * pulse);
    if (hurt && Math.random() < 0.12) w.fx.burst(e.x + (Math.random() - 0.5) * e.r * 1.4, e.y, e.hitY * (0.5 + Math.random()), 1, e.def.gore ?? '#1a1430', 20, 0.6);
    if (e.state === 'idle' && e.sx === 1 && e.sy === 1) {
      breathe = true;
      const b = Math.sin(w.time * 2.4 + e.id) * 0.022;
      ctx.save(); ctx.translate(sx, sy); ctx.scale(1 - b * 0.5, 1 + b); ctx.translate(-sx, -sy);
    }
  }
  const champ = boss ? e.data.champ as ChampKind | undefined : undefined;
  if (champ) { ctx.save(); ctx.filter = CHAMPIONS[champ].filter; w.r.addGlow(sx, sy - e.z - e.hitY, e.r * 3.6, CHAMPIONS[champ].glow, 0.22); }
  if (e.def.draw) { e.def.draw(e, ctx, w, sx, sy); }
  else {
    const set = e.sprites[e.anim] ?? e.sprites.idle;
    if (set && set.length) {
      const spr = set[e.frame % set.length];
      let tint: string | undefined, tintAmt = 0;
      const rigged = e.isBoss && !!e.sprites.death;
      if (e.freeze > 0) { tint = '#9ad8ff'; tintAmt = 0.55; }
      else if (e.burn > 0) { tint = '#ff7a2a'; tintAmt = 0.3 + Math.sin(w.time * 20) * 0.1; }
      else if (e.poison > 0) { tint = '#6ad040'; tintAmt = 0.35; }
      else if (e.slow > 0) { tint = '#8a9aa8'; tintAmt = 0.35; }
      else if (e.charm > 0) { tint = '#ff80c0'; tintAmt = 0.4; }
      else if (e.mark > 0) { tint = '#c040ff'; tintAmt = 0.3; }
      else if (e.champion) { tint = e.champion === 'armored' ? '#8a8aa8' : e.champion === 'swift' ? '#40c0ff' : '#e04040'; tintAmt = 0.35; }
      // rigged bosses pick their own pose and draw their eyes live
      if (rigged) drawRigged(e, ctx, w, sx, sy, { tint, tintAmt });
      else spr.draw(ctx, sx, sy - e.z, { flip: e.flip, flash: e.flash > 0 ? (e.isBoss ? 0.5 : 0.85) : 0, sx: e.sx, sy: e.sy, alpha: e.alpha < 1 ? e.alpha : undefined, tint, tintAmt });
    }
  }
  if (champ) ctx.restore();
  if (e.def.boss && !e.hidden && !e.dead) drawBossLife(w, ctx, e, sx, sy);
  if (breathe) ctx.restore();
  if (e.fear > 0 || e.confuse > 0) {
    ctx.fillStyle = e.fear > 0 ? '#c060ff' : '#ffe060';
    const a = w.time * 6;
    for (let i = 0; i < 3; i++) ctx.fillRect(snap(sx + Math.cos(a + i * 2.1) * 6), snap(sy - e.hitY * 2 - 6 + Math.sin(a + i * 2.1) * 2), 1, 1);
  }
}

function drawDynamicObstacle(w: World, ctx: CanvasRenderingContext2D, i: number, camX: number, camY: number): void {
  const room = w.room, S = w.props;
  const c = i % room.cols, r = (i / room.cols) | 0;
  const x = room.ox + c * TILE + TILE / 2 - camX, y = room.oy + r * TILE + TILE - camY;
  const k = room.grid[i];
  if (k === Ob.TimedSpikes) {
    const up = w.spikesUp(c, r); const phase = (w.roomTime % 3);
    (up ? S.spikes : phase > 1.3 && phase <= 1.6 ? S.spikesMid : S.spikesDown).draw(ctx, x, y);
    return;
  }
  const hp = room.ghp[i];
  const v = room.gvar[i];
  S.fireBase.draw(ctx, x, y - 2);
  if (hp <= 0) return;
  const scale = 0.45 + 0.55 * Math.min(1, hp / 12);
  const f = Math.floor(w.time * 12 + i) % 6;
  S.fire[v][f].draw(ctx, x, y - 5, { sx: scale, sy: scale });
}

function rebuildObstacleLayer(w: World): void {
  const room = w.room, S = w.props;
  if (!w.obstacleLayer || w.obstacleLayer.width !== room.pxW || w.obstacleLayer.height !== room.pxH) {
    w.obstacleLayer = document.createElement('canvas'); w.obstacleLayer.width = room.pxW; w.obstacleLayer.height = room.pxH;
  }
  const ctx = w.obstacleLayer.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, room.pxW, room.pxH);
  const pitDeep = hex('#060408');
  const lipC = ramp(w.theme.pal.floor2);
  // pits first (flat)
  for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) {
    if (room.at(c, r) !== Ob.Pit) continue;
    const x = room.ox + c * TILE, y = room.oy + r * TILE;
    const pit = (dc: number, dr: number) => room.at(c + dc, r + dr) === Ob.Pit;
    ctx.fillStyle = toCss(pitDeep); ctx.fillRect(x, y, TILE, TILE);
    if (!pit(0, -1)) {
      for (let j = 0; j < 7; j++) { ctx.fillStyle = toCss(darken(lipC[1], 0.1 + j * 0.11)); ctx.fillRect(x, y + j, TILE, 1); }
      ctx.fillStyle = toCss(lipC[3]); ctx.fillRect(x, y, TILE, 1);
    }
    ctx.fillStyle = toCss(lipC[0]);
    if (!pit(-1, 0)) ctx.fillRect(x, y, 2, TILE);
    if (!pit(1, 0)) ctx.fillRect(x + TILE - 2, y, 2, TILE);
    if (!pit(0, 1)) { ctx.fillStyle = toCss(lipC[3]); ctx.fillRect(x, y + TILE - 1, TILE, 1); }
  }
  for (let r = 0; r < room.rows; r++) for (let c = 0; c < room.cols; c++) {
    const k = room.at(c, r); if (k === Ob.None || k === Ob.Pit) continue;
    const i = room.idx(c, r), v = room.gvar[i];
    const x = room.ox + c * TILE + TILE / 2, y = room.oy + r * TILE + TILE;
    switch (k) {
      case Ob.Rock: S.rocks[v % S.rocks.length].draw(ctx, x, y); break;
      case Ob.Marked: S.marked[v % S.marked.length].draw(ctx, x, y); break;
      case Ob.Block: S.block.draw(ctx, x, y); break;
      case Ob.Pillar: S.pillar.draw(ctx, x, y); break;
      case Ob.Spikes: S.spikes.draw(ctx, x, y); break;
      case Ob.Heap: { const hp = room.ghp[i]; const stage = hp > 9 ? 0 : hp > 6 ? 1 : hp > 3 ? 2 : 3; S.heap[v % 4][stage].draw(ctx, x, y); break; }
      case Ob.Keg: S.keg.draw(ctx, x, y); break;
      case Ob.Urn: S.urn.draw(ctx, x, y - 1); break;
      case Ob.Web: S.web.draw(ctx, x, y); break;
      case Ob.Button: (v ? S.buttonDown : S.button).draw(ctx, x, y); break;
    }
  }
  w.obstacleDirty = false;
}

function drawDoor(w: World, ctx: CanvasRenderingContext2D, d: import('./world').DoorRT, camX: number, camY: number): void {
  if (d.def.hidden && !d.revealed) return;
  const kind = d.def.kind === 'normal' && w.room.type !== 'normal' && w.room.type !== 'start' ? (w.room.type as any) : d.def.kind;
  const ds = doorSprites(kind === 'secret' || kind === 'supersecret' ? 'secret' : kind, w.theme);
  const x = snap(d.x - camX), y = snap(d.y - camY);
  ctx.save();
  ctx.translate(x, y);
  const rot = d.def.side === Side.N ? 0 : d.def.side === Side.S ? Math.PI : d.def.side === Side.W ? -Math.PI / 2 : Math.PI / 2;
  ctx.rotate(rot);
  if (kind === 'secret' || kind === 'supersecret') { ds.hole.draw(ctx, 0, 3); ctx.restore(); return; }
  ds.frame.draw(ctx, 0, 3);
  const li = Math.round(d.open * 4);
  ds.leaves[li].draw(ctx, 0, 3);
  if (d.def.locked) ds.lock.draw(ctx, 0, 3);
  ctx.restore();
  // a small symbol just above the top of the doorway, saying what is through it
  const sym = d.def.kind !== 'normal' ? doorSymbol(d.def.kind) : null;
  if (sym) {
    const sd = d.def.side, bob = Math.sin(w.time * 2.2 + x * 0.1) * 0.6;
    const py = y + (sd === Side.N ? -18 : sd === Side.S ? -15 : -22) + bob;
    const px = x + (sd === Side.E ? 5 : sd === Side.W ? -5 : 0);
    sym.draw(ctx, px, py);
    if (d.def.kind === 'deal' || d.def.kind === 'blessing' || d.def.kind === 'boss') w.r.addGlow(px, py - 5, 7, d.def.kind === 'deal' ? '#ff2030' : d.def.kind === 'boss' ? '#ff6040' : '#fff0b0', 0.16);
  }
}

// ------------------------------------------------------------------ ambient particles
let lastT = 0;
/** A tear in the page: a swirling ink vortex rimmed with torn paper, opening over a second. */
function drawPortal(w: World, ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const k = ease.outBack(Math.min(1, t / 0.9));
  const rx = 15 * k, ry = 8 * k;
  if (rx <= 0.5) return;
  ctx.save();
  // torn paper rim
  ctx.fillStyle = '#e6dcc0';
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * TAU, j = 1.18 + 0.12 * Math.sin(i * 2.7 + 1.3);
    const px = x + Math.cos(a) * rx * j, py = y + Math.sin(a) * ry * j;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.fill();
  // the void, with ink swirling in
  ctx.fillStyle = '#07050f'; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 3; i++) {
    const s = 1 - i * 0.28;
    ctx.strokeStyle = ['#5a3ad0', '#8a5aff', '#c8b0ff'][i]; ctx.lineWidth = 1.2 - i * 0.3;
    ctx.beginPath(); ctx.ellipse(x, y, rx * s, ry * s, 0, w.time * (2 + i) + i, w.time * (2 + i) + i + Math.PI * 1.2); ctx.stroke();
  }
  ctx.restore();
  w.r.addGlow(x, y, 40, '#7a50ff', 0.5 * k);
  w.r.addLight(x, y, 50, 0.6 * k);
}

/** A shaft of light falling from above onto a bright spot on the floor, with motes drifting up it. */
function drawLightBeam(w: World, ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const k = Math.min(1, t / 1.2), wd = 10 * k;
  if (wd <= 0.5) return;
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 140, 0, y);
  g.addColorStop(0, 'rgba(255,248,220,0)'); g.addColorStop(1, `rgba(255,248,220,${0.55 * k})`);
  ctx.fillStyle = g; ctx.fillRect(x - wd, y - 140, wd * 2, 140);
  ctx.fillStyle = `rgba(255,255,240,${0.6 * k})`; ctx.fillRect(x - wd * 0.35, y - 140, wd * 0.7, 140);
  ctx.fillStyle = `rgba(255,240,190,${0.5 * k})`; ctx.beginPath(); ctx.ellipse(x, y, wd * 1.3, wd * 0.5, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 6; i++) { const m = (w.time * 0.6 + i / 6) % 1; ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - m) * k})`; ctx.fillRect(snap(x + Math.sin(i * 7 + w.time * 2) * wd * 0.6), snap(y - m * 120), 1, 1); }
  ctx.restore();
  w.r.addGlow(x, y - 30, 60, '#fff0c0', 0.5 * k);
  w.r.addLight(x, y - 20, 70, 0.8 * k);
}

/** The way out: a plain door standing in the boss room, with a lit EXIT sign over it. */
function drawExitDoor(w: World, ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const k = Math.min(1, t / 0.6);
  const rise = snap((1 - k) * 34);
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 20, y - 64, 40, 64); ctx.clip();
  const by = y + rise;
  // frame and door
  ctx.fillStyle = '#2a1c14'; ctx.fillRect(x - 13, by - 34, 26, 34);
  ctx.fillStyle = '#6a4a30'; ctx.fillRect(x - 11, by - 32, 22, 32);
  ctx.fillStyle = '#7e5a3a'; ctx.fillRect(x - 9, by - 30, 8, 12); ctx.fillRect(x + 1, by - 30, 8, 12); ctx.fillRect(x - 9, by - 15, 8, 13); ctx.fillRect(x + 1, by - 15, 8, 13);
  ctx.fillStyle = '#e0c060'; ctx.fillRect(x + 6, by - 17, 2, 2);
  // a sliver of light under it
  ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.fillRect(x - 10, by - 1, 20, 1);
  // EXIT sign
  const sy = by - 44;
  ctx.fillStyle = '#101810'; ctx.fillRect(x - 12, sy, 24, 9);
  ctx.fillStyle = '#3aff7a'; ctx.font = '700 7px ' + 'monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.globalAlpha = 0.85 + 0.15 * Math.sin(w.time * 9);
  ctx.fillText('EXIT', x, sy + 7.5);
  ctx.restore();
  w.r.addGlow(x, sy + 4, 26, '#3aff7a', 0.45 * k);
  w.r.addLight(x, by - 10, 46, 0.5 * k);
}

/** A hospital door with a little wired window and a 4 on it. It glows when the letter will open it. */
function drawRoom4Door(w: World, ctx: CanvasRenderingContext2D, x: number, y: number, t: number): void {
  const k = Math.min(1, t / 0.6), rise = snap((1 - k) * 34);
  const open = w.player.has('grandfathers_letter');
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 20, y - 64, 40, 64); ctx.clip();
  const by = y + rise;
  ctx.fillStyle = '#20302c'; ctx.fillRect(x - 13, by - 36, 26, 36);
  ctx.fillStyle = '#7a9a8a'; ctx.fillRect(x - 11, by - 34, 22, 34);
  ctx.fillStyle = '#8aaa9a'; ctx.fillRect(x - 11, by - 34, 22, 2);
  // wired glass window, lit from inside
  ctx.fillStyle = open ? '#fff0c0' : '#2a3a40'; ctx.fillRect(x - 6, by - 30, 12, 9);
  ctx.fillStyle = 'rgba(40,60,60,0.6)'; for (let i = 0; i < 3; i++) { ctx.fillRect(x - 6 + i * 4, by - 30, 0.6, 9); ctx.fillRect(x - 6, by - 30 + i * 3, 12, 0.6); }
  ctx.fillStyle = '#c8c8b8'; ctx.fillRect(x + 6, by - 17, 3, 1.5);
  ctx.fillStyle = 'rgba(30,40,40,0.5)'; ctx.fillRect(x - 11, by - 4, 22, 4);
  if (!open) { ctx.fillStyle = '#c8a04a'; ctx.fillRect(x + 4, by - 15, 4, 3); ctx.strokeStyle = '#c8a04a'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x + 6, by - 15, 1.6, Math.PI, 0); ctx.stroke(); }
  if (open) { ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.fillRect(x - 10, by - 1, 20, 1); }
  // the number plate
  const sy = by - 46;
  ctx.fillStyle = '#e8e4d8'; ctx.fillRect(x - 7, sy, 14, 9); ctx.fillStyle = '#2a3a40'; ctx.fillRect(x - 7, sy + 8, 14, 1);
  ctx.fillStyle = '#2a2a3a'; ctx.font = '700 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('4', x, sy + 7.5);
  ctx.restore();
  if (open) { w.r.addGlow(x, by - 26, 24, '#fff0c0', 0.35 * k); w.r.addLight(x, by - 12, 50, 0.5 * k); }
}

/** A narrow stairwell going up out of the boss room, planked over until something blows it open. */
function drawBackStair(w: World, ctx: CanvasRenderingContext2D, x: number, y: number, t: number, boarded: boolean): void {
  const k = Math.min(1, t / 0.5);
  ctx.save(); ctx.globalAlpha = k;
  // the opening, with steps climbing away into the light
  ctx.fillStyle = '#100c10'; ctx.fillRect(x - 11, y - 9, 22, 16);
  for (let i = 0; i < 5; i++) { const g = 30 + i * 22; ctx.fillStyle = `rgb(${g},${g + 8},${g + 6})`; ctx.fillRect(x - 10 + i, y + 5 - i * 3, 20 - i * 2, 2); }
  if (!boarded) { const gl = ctx.createLinearGradient(0, y - 9, 0, y + 7); gl.addColorStop(0, 'rgba(220,240,230,0.55)'); gl.addColorStop(1, 'rgba(220,240,230,0)'); ctx.fillStyle = gl; ctx.fillRect(x - 10, y - 9, 20, 14); }
  ctx.strokeStyle = '#3a2a20'; ctx.lineWidth = 1.2; ctx.strokeRect(x - 11.5, y - 9.5, 23, 17);
  if (boarded) {
    for (const [dy, a] of [[-5, -0.12], [0, 0.08], [5, -0.05]] as [number, number][]) {
      ctx.save(); ctx.translate(x, y + dy); ctx.rotate(a);
      ctx.fillStyle = '#6a4a2e'; ctx.fillRect(-14, -2, 28, 4); ctx.fillStyle = '#8a6a44'; ctx.fillRect(-14, -2, 28, 1);
      ctx.fillStyle = '#c8c0b0'; ctx.fillRect(-12, -0.5, 1, 1); ctx.fillRect(11, -0.5, 1, 1);
      ctx.restore();
    }
  }
  // a small enamel sign
  ctx.fillStyle = '#e8e4d8'; ctx.fillRect(x - 13, y - 19, 26, 7);
  ctx.fillStyle = '#2a4a8a'; ctx.font = '700 5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillText('ST.AGNES', x, y - 13.8);
  ctx.restore();
  if (!boarded) w.r.addLight(x, y - 2, 40, 0.5 * k);
}

/** Debug overlay: every hurtbox and shot as the collision code sees them (screen space). */
export function drawHitboxes(w: World, ctx: CanvasRenderingContext2D): void {
  const camX = w.renderCamX, camY = w.renderCamY;
  ctx.save(); ctx.lineWidth = 0.6;
  const c = w.player.hurtCapsule();
  ctx.strokeStyle = '#40ff70';
  ctx.beginPath();
  ctx.arc(c.x - camX, c.y0 - camY, c.r, Math.PI, 0); ctx.lineTo(c.x + c.r - camX, c.y1 - camY);
  ctx.arc(c.x - camX, c.y1 - camY, c.r, 0, Math.PI); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = '#ffa040';
  ctx.beginPath(); ctx.ellipse(w.player.x - camX, w.player.y - camY, w.player.hitR, w.player.hitR * 0.6, 0, 0, TAU); ctx.stroke();
  for (const e of w.enemies) {
    if (e.dead || e.hidden) continue;
    ctx.strokeStyle = e.friendly ? '#80c0ff' : '#ff4060';
    ctx.beginPath(); ctx.arc(e.x - camX, e.y - e.hitY - e.z - camY, e.r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,160,64,0.7)';
    ctx.beginPath(); ctx.ellipse(e.x - camX, e.y - camY, e.r * 0.8, e.r * 0.48, 0, 0, TAU); ctx.stroke();
  }
  ctx.strokeStyle = '#ffff60';
  for (const p of w.proj.list) {
    if (!p.active) continue;
    ctx.beginPath(); ctx.arc(p.x - camX, p.y - p.z - camY, p.r, 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

function renderAmbient(w: World, ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
  const dt = Math.min(0.05, Math.max(0, w.time - lastT)); lastT = w.time;
  const kind = w.theme.ambience;
  const A = w.ambient;
  const target = kind === 'drips' ? 6 : kind === 'glass' ? 22 : 34;
  while (A.length < target) {
    const p = { x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, vx: 0, vy: 0, life: Math.random() * 6, kind: 0 };
    switch (kind) {
      case 'dust': case 'motes': p.vx = (Math.random() - 0.5) * 6; p.vy = (Math.random() - 0.5) * 4; break;
      case 'embers': p.y = VIEW_H + 4; p.vx = (Math.random() - 0.5) * 10; p.vy = -12 - Math.random() * 18; break;
      case 'ash': p.y = -4; p.vx = 4 + Math.random() * 6; p.vy = 8 + Math.random() * 8; break;
      case 'ink': p.y = -4; p.vx = 20; p.vy = 90 + Math.random() * 40; break;
      case 'pages': p.vx = 6 + Math.random() * 8; p.vy = 3 + Math.random() * 4; p.kind = Math.floor(Math.random() * 3); break;
      case 'glass': p.vx = (Math.random() - 0.5) * 3; p.vy = -2 - Math.random() * 3; p.kind = Math.floor(Math.random() * 4); break;
      case 'drips': p.y = w.room.oy - camY + Math.random() * 30; p.x = w.room.ox - camX + Math.random() * w.room.cols * TILE; p.vy = 0; p.life = Math.random() * 3; p.kind = 1; break;
    }
    A.push(p);
  }
  const glassCols = ['#e04a6a', '#4a8ae0', '#e0c04a', '#6ad08a'];
  for (let i = A.length - 1; i >= 0; i--) {
    const p = A[i];
    p.life += dt;
    if (kind === 'drips') {
      if (p.life > 2.5) { p.vy += 500 * dt; p.y += p.vy * dt; }
      if (p.y > VIEW_H || p.life > 5) { if (p.life > 2.5) w.fx.ring(p.x + camX, p.y + camY, 1, 5, 'rgba(160,190,210,0.6)', 0.3, false); A.splice(i, 1); continue; }
      ctx.fillStyle = 'rgba(150,180,200,0.8)'; ctx.fillRect(snap(p.x), snap(p.y), 1, p.life > 2.5 ? 3 : 1);
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (kind === 'dust' || kind === 'motes') { p.vx += (Math.random() - 0.5) * 4 * dt; p.vy += (Math.random() - 0.5) * 4 * dt; }
    if (p.x < -10 || p.x > VIEW_W + 10 || p.y < -10 || p.y > VIEW_H + 10 || p.life > 12) { A.splice(i, 1); continue; }
    const tw = 0.5 + 0.5 * Math.sin(p.life * 2 + i);
    switch (kind) {
      case 'dust': ctx.fillStyle = `rgba(210,200,180,${0.25 * tw})`; ctx.fillRect(snap(p.x), snap(p.y), 1, 1); break;
      case 'motes': ctx.fillStyle = `rgba(200,230,220,${0.35 * tw})`; ctx.fillRect(snap(p.x), snap(p.y), 1, 1); w.r.addGlow(p.x, p.y, 4, '#c0f0e0', 0.15 * tw); break;
      case 'embers': ctx.fillStyle = `rgba(255,${140 + Math.floor(tw * 80)},60,${0.8 * tw})`; ctx.fillRect(snap(p.x), snap(p.y), 1, 1); w.r.addGlow(p.x, p.y, 5, '#ff8030', 0.3 * tw); break;
      case 'ash': ctx.fillStyle = `rgba(160,150,150,${0.5})`; ctx.fillRect(snap(p.x), snap(p.y), 1 + (i % 2), 1); break;
      case 'ink': ctx.fillStyle = 'rgba(40,36,90,0.55)'; ctx.fillRect(snap(p.x), snap(p.y), 1, 3); break;
      case 'pages': ctx.fillStyle = `rgba(230,220,190,${0.35 + 0.2 * tw})`; ctx.fillRect(snap(p.x), snap(p.y), 2 + p.kind, 2); break;
      case 'glass': w.r.addGlow(p.x, p.y, 10, glassCols[p.kind], 0.12 * tw); ctx.fillStyle = glassCols[p.kind]; ctx.globalAlpha = 0.4 * tw; ctx.fillRect(snap(p.x), snap(p.y), 1, 1); ctx.globalAlpha = 1; break;
    }
  }
}
