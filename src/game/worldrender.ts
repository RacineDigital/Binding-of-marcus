// Draws the current room: background, obstacles, doors, entities (y-sorted), projectiles, particles, lights.
import type { World } from './world';
import { BG_MARGIN } from '../art/roombg';
import { Ob, Side } from '../rooms/room';
import { TILE, VIEW_W, VIEW_H } from '../core/constants';
import { doorSprites } from '../art/props';
import { ease, TAU } from '../core/math';
import { renderPickup, Pickup } from './pickups';
import { renderBomb, Bomb } from './bombs';
import { renderNpc, Npc } from './npc';
import { renderFamiliar, Familiar } from '../items/familiar_rt';
import { renderBeams } from '../projectiles/weapons';
import { Enemy } from '../enemies/enemy';
import { hex, darken, toCss, ramp } from '../render/color';
import { pickupSprites } from '../art/pickups';

type Drawable = { y: number; kind: number; ref: any };
const drawables: Drawable[] = [];
let scratch: HTMLCanvasElement | null = null;

export function renderWorld(w: World): void {
  const r = w.r, ctx = r.ctx, room = w.room, theme = w.theme;
  const shakeAmt = w.trauma * w.trauma * 7;
  const shx = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0, shy = shakeAmt ? (Math.random() * 2 - 1) * shakeAmt : 0;
  const camX = Math.round(w.camX + shx), camY = Math.round(w.camY + shy);
  w.camX = w.camX; // keep float for simulation
  let darkness = theme.darkness + (w.floor.curse === 'dark' ? 0.25 : 0) + (w.run.challenge === 'darkness' ? 0.3 : 0);
  if (room.type === 'treasure' || room.type === 'shop' || room.type === 'blessing') darkness *= 0.75;
  r.beginFrame(theme.ambient, Math.min(0.9, darkness));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#050307'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (room.bgCache) ctx.drawImage(room.bgCache, -BG_MARGIN - camX, -BG_MARGIN - camY);
  // --------------------------------------------------------------- creep
  for (const c of w.creep) {
    const a = Math.min(1, c.life / 0.6) * 0.75;
    ctx.globalAlpha = a; ctx.fillStyle = c.color;
    ctx.beginPath(); ctx.ellipse(Math.round(c.x - camX), Math.round(c.y - camY), c.r, c.r * 0.6, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a * 0.5; ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.round(c.x - camX - c.r * 0.3), Math.round(c.y - camY - c.r * 0.25), 2, 1);
  }
  ctx.globalAlpha = 1;
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
    ctx.beginPath(); ctx.ellipse(Math.round(t.x - camX), Math.round(t.y - camY), t.r, t.r * 0.62, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.12 + 0.2 * k; ctx.fillStyle = t.color;
    ctx.beginPath(); ctx.ellipse(Math.round(t.x - camX), Math.round(t.y - camY), t.r * k, t.r * 0.62 * k, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // trapdoor
  if (w.trapdoor) {
    const t = w.trapdoor; const S = pickupSprites();
    const f = Math.min(3, Math.floor(t.t / 0.18));
    S.trapdoor[f].draw(ctx, t.x - camX, t.y - camY);
    if (f === 3) r.addLight(t.x - camX, t.y - camY, 26, 0.3);
  }
  // --------------------------------------------------------------- y-sorted entities
  drawables.length = 0;
  for (const e of w.enemies) drawables.push({ y: e.y + (e.def.boss ? -4 : 0), kind: 0, ref: e });
  drawables.push({ y: w.player.y, kind: 1, ref: w.player });
  for (const p of w.pickups) drawables.push({ y: p.y - (p.pedestal ? 2 : 0), kind: 2, ref: p });
  for (const b of w.bombs) drawables.push({ y: b.y, kind: 3, ref: b });
  for (const n of w.npcs) drawables.push({ y: n.y, kind: 4, ref: n });
  for (const f of w.familiars) drawables.push({ y: f.y, kind: 5, ref: f });
  for (const c of w.corpses) drawables.push({ y: c.e.y, kind: 7, ref: c });
  // animated obstacles
  for (let i = 0; i < room.grid.length; i++) {
    const k = room.grid[i];
    if (k === Ob.Fire || k === Ob.TimedSpikes) { const c = i % room.cols, rr = (i / room.cols) | 0; drawables.push({ y: room.oy + rr * TILE + (k === Ob.Fire ? 18 : 0), kind: 6, ref: i }); }
  }
  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) {
    switch (d.kind) {
      case 0: drawEnemy(w, ctx, d.ref as Enemy, camX, camY); break;
      case 1: w.player.render(ctx, w, Math.round(w.player.x - camX), Math.round(w.player.y - camY)); break;
      case 2: renderPickup(w, ctx, d.ref as Pickup, Math.round((d.ref as Pickup).x - camX), Math.round((d.ref as Pickup).y - camY)); break;
      case 3: renderBomb(w, ctx, d.ref as Bomb, Math.round((d.ref as Bomb).x - camX), Math.round((d.ref as Bomb).y - camY)); break;
      case 4: renderNpc(w, ctx, d.ref as Npc, Math.round((d.ref as Npc).x - camX), Math.round((d.ref as Npc).y - camY)); break;
      case 5: renderFamiliar(w, ctx, d.ref as Familiar, Math.round((d.ref as Familiar).x - camX), Math.round((d.ref as Familiar).y - camY)); break;
      case 6: drawDynamicObstacle(w, ctx, d.ref as number, camX, camY); break;
      case 7: {
        const c = d.ref as { e: Enemy; t: number; dur: number };
        const e = c.e; const k = c.t / c.dur;
        const jx = (Math.random() - 0.5) * 3 * (1 + k * 2);
        ctx.save(); ctx.globalAlpha = 1 - Math.max(0, k - 0.85) * 6;
        e.flash = Math.random() < 0.3 ? 1 : 0; e.sx = 1 + k * 0.15; e.sy = 1 - k * 0.25; e.dead = false;
        drawEnemyBody(w, ctx, e, Math.round(e.x - camX + jx), Math.round(e.y - camY));
        e.dead = true;
        ctx.restore();
        break;
      }
    }
  }
  // --------------------------------------------------------------- projectiles, beams, particles
  w.proj.render(ctx, camX, camY, w);
  renderBeams(w, ctx, camX, camY);
  w.fx.render(ctx, camX, camY, (x, y, rr, c, a) => r.addGlow(x, y, rr, c, a));
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
  const nx = Math.round((1 - k) * t.dx * VIEW_W), ny = Math.round((1 - k) * t.dy * VIEW_H);
  const ox = Math.round(-k * t.dx * VIEW_W), oy = Math.round(-k * t.dy * VIEW_H);
  const r = w.r;
  if (!scratch) { scratch = document.createElement('canvas'); scratch.width = VIEW_W; scratch.height = VIEW_H; }
  const sc = scratch.getContext('2d')!;
  for (const cv of [r.world, r.light, r.glow]) {
    sc.clearRect(0, 0, VIEW_W, VIEW_H); sc.drawImage(cv, 0, 0);
    const c = cv.getContext('2d')!;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.clearRect(0, 0, VIEW_W, VIEW_H);
    if (cv === r.world) { c.fillStyle = '#050307'; c.fillRect(0, 0, VIEW_W, VIEW_H); }
    c.drawImage(scratch, nx, ny);
    if (cv === r.world) c.drawImage(t.snap, ox, oy);
    c.restore();
  }
}

function drawEnemy(w: World, ctx: CanvasRenderingContext2D, e: Enemy, camX: number, camY: number): void {
  const sx = Math.round(e.x - camX), sy = Math.round(e.y - camY);
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
    drawEnemyBody(w, ctx, e, sx, sy + Math.round((1 - k) * (e.hitY * 2 + 6)));
    ctx.restore();
    return;
  }
  drawEnemyBody(w, ctx, e, sx, sy);
}

function drawEnemyBody(w: World, ctx: CanvasRenderingContext2D, e: Enemy, sx: number, sy: number): void {
  // shadow
  if (!e.hidden) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    const sr = e.r * (e.z > 0 ? Math.max(0.4, 1 - e.z / 80) : 1);
    ctx.beginPath(); ctx.ellipse(sx, sy, sr, Math.max(1.5, sr * 0.35), 0, 0, TAU); ctx.fill();
  }
  if (e.def.draw) { e.def.draw(e, ctx, w, sx, sy); }
  else {
    const set = e.sprites[e.anim] ?? e.sprites.idle;
    if (set && set.length) {
      const spr = set[e.frame % set.length];
      let tint: string | undefined, tintAmt = 0;
      if (e.freeze > 0) { tint = '#9ad8ff'; tintAmt = 0.55; }
      else if (e.burn > 0) { tint = '#ff7a2a'; tintAmt = 0.3 + Math.sin(w.time * 20) * 0.1; }
      else if (e.poison > 0) { tint = '#6ad040'; tintAmt = 0.35; }
      else if (e.slow > 0) { tint = '#8a9aa8'; tintAmt = 0.35; }
      else if (e.charm > 0) { tint = '#ff80c0'; tintAmt = 0.4; }
      else if (e.mark > 0) { tint = '#c040ff'; tintAmt = 0.3; }
      else if (e.champion) { tint = e.champion === 'armored' ? '#8a8aa8' : e.champion === 'swift' ? '#40c0ff' : '#e04040'; tintAmt = 0.35; }
      spr.draw(ctx, sx, sy - e.z, { flip: e.flip, flash: e.flash > 0 ? (e.isBoss ? 0.5 : 0.85) : 0, sx: e.sx, sy: e.sy, alpha: e.alpha < 1 ? e.alpha : undefined, tint, tintAmt });
    }
  }
  if (e.fear > 0 || e.confuse > 0) {
    ctx.fillStyle = e.fear > 0 ? '#c060ff' : '#ffe060';
    const a = w.time * 6;
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(sx + Math.cos(a + i * 2.1) * 6), Math.round(sy - e.hitY * 2 - 6 + Math.sin(a + i * 2.1) * 2), 1, 1);
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
  const x = Math.round(d.x - camX), y = Math.round(d.y - camY);
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
}

// ------------------------------------------------------------------ ambient particles
let lastT = 0;
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
      ctx.fillStyle = 'rgba(150,180,200,0.8)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, p.life > 2.5 ? 3 : 1);
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (kind === 'dust' || kind === 'motes') { p.vx += (Math.random() - 0.5) * 4 * dt; p.vy += (Math.random() - 0.5) * 4 * dt; }
    if (p.x < -10 || p.x > VIEW_W + 10 || p.y < -10 || p.y > VIEW_H + 10 || p.life > 12) { A.splice(i, 1); continue; }
    const tw = 0.5 + 0.5 * Math.sin(p.life * 2 + i);
    switch (kind) {
      case 'dust': ctx.fillStyle = `rgba(210,200,180,${0.25 * tw})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); break;
      case 'motes': ctx.fillStyle = `rgba(200,230,220,${0.35 * tw})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); w.r.addGlow(p.x, p.y, 4, '#c0f0e0', 0.15 * tw); break;
      case 'embers': ctx.fillStyle = `rgba(255,${140 + Math.floor(tw * 80)},60,${0.8 * tw})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); w.r.addGlow(p.x, p.y, 5, '#ff8030', 0.3 * tw); break;
      case 'ash': ctx.fillStyle = `rgba(160,150,150,${0.5})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1 + (i % 2), 1); break;
      case 'ink': ctx.fillStyle = 'rgba(40,36,90,0.55)'; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 3); break;
      case 'pages': ctx.fillStyle = `rgba(230,220,190,${0.35 + 0.2 * tw})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2 + p.kind, 2); break;
      case 'glass': w.r.addGlow(p.x, p.y, 10, glassCols[p.kind], 0.12 * tw); ctx.fillStyle = glassCols[p.kind]; ctx.globalAlpha = 0.4 * tw; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); ctx.globalAlpha = 1; break;
    }
  }
}
