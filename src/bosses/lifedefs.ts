// Per-boss life layers and idle loops (see bosslife.ts). Coordinates are in sprite pixels.
import { life, loops, L_ } from './bosslife';
const { px, glow, motes, orbit, eyes, puffs } = L_;

// ---------------------------------------------------------------- Chapter I
life('grubmother', (L) => {
  const rear = L.e.anim === 'rear';
  motes(L, { n: 3, x: 52, y: rear ? 24 : 30, w: 2, rise: 14, speed: 0.6, colors: ['#d8eadc', '#b8d0c0'], fall: true, sway: 0 });
  motes(L, { n: 5, x: 6, y: 40, w: 50, rise: 8, speed: 0.4, colors: ['#8a7a68'], sway: 3 });
});
life('wardrobe', (L) => {
  const open = L.e.anim === 'open';
  if (open) { eyes(L, [[19, 25], [31, 25]], '#ffd040', 12, 0.45); glow(L, 25, 36, 18, '#ff3020', 0.12); }
  else eyes(L, [[25, 27]], '#ffd040', 6, 0.4);
  // moths slip out of the crack at the top, dust sifts off the feet
  motes(L, { n: 3, x: 20, y: 12, w: 10, rise: 26, speed: 0.35, colors: ['#c8b490', '#8a7656'], size: 2, sway: 6 });
  motes(L, { n: 4, x: 8, y: 56, w: 34, rise: 6, speed: 0.5, colors: ['#5a4a3a'], fall: true });
});
life(['snipA', 'snipB'], (L) => {
  // a glint running up each blade
  const k = (L.t * 0.9 + L.e.id * 0.3) % 1.6;
  if (k < 1) for (const s of [-1, 1]) px(L, 18 + s * (2 + k * 9), 19 - k * 17, '#ffffff', 1, 1 - k * 0.5);
  eyes(L, [[18, 20]], L.e.def.id === 'snipB' ? '#60ff60' : '#ff4040', 6, 0.35);
});
loops('wardrobe', { closed: 3 });


// ---------------------------------------------------------------- Chapters II–III
life('furnaceheart', (L) => {
  const hot = L.e.anim === 'hot' || !!L.e.data.phase;
  motes(L, { n: hot ? 10 : 6, x: 36, y: 1, w: 8, rise: 34, speed: 0.55, colors: ['#ffd040', '#ff8a2a', '#ff4a1a'], glowR: 6, sway: 5 });
  puffs(L, 40, -2, 4, 26, hot ? '#3a2a2a' : '#4a4448', 3, 0.35);
  glow(L, 28, 36, 26, hot ? '#ff3a1a' : '#ff7a2a', 0.22 + Math.sin(L.t * 9) * 0.06);
  eyes(L, [[18, 19], [38, 19]], '#ffe0a0', 7, 0.25);
  motes(L, { n: 4, x: 16, y: 44, w: 24, rise: 10, speed: 0.8, colors: ['#ffb040'], sway: 1 });
});
life('oldstoker', (L) => {
  const raise = L.e.anim === 'raise';
  motes(L, { n: 5, x: 44, y: raise ? -4 : 20, w: 6, rise: 18, speed: 0.7, colors: ['#ffd040', '#ff8a2a'], glowR: 5 });
  eyes(L, [[19, 15], [26, 15]], '#ffb040', 7, 0.3);
  puffs(L, 23, 4, 2, 10, '#9a8a80', 2, 0.4);   // sweat steaming off his head
});
life(['ratking', 'ratprince'], (L) => {
  const k = L.e.def.id === 'ratking' ? 1 : 0.7;
  orbit(L, 28 * k, 20 * k, 22 * k, 10 * k, 5, 2.2, '#1a1a1a', 1, 2.5);   // flies
  if (k === 1) glow(L, 28, 12, 12, '#ffe080', 0.12);
});
life('bilgemaw', (L) => {
  const ph = (L.e.frame / 6) * Math.PI * 2;
  const lx = 38 + Math.sin(ph) * 2, ly = 4 + Math.cos(ph);
  glow(L, lx, ly, 14, '#e8ff80', 0.35 + Math.sin(L.t * 5) * 0.12);
  motes(L, { n: 4, x: 32, y: 22, w: 8, rise: 10, speed: 0.7, colors: ['#8ab0a0', '#5a8a7a'], fall: true, sway: 0 });
  motes(L, { n: 4, x: 6, y: 20, w: 30, rise: 22, speed: 0.4, colors: ['#a8d8e0'], sway: 3 });   // bubbles
});
life('matron', (L) => {
  if (L.e.anim === 'idle') motes(L, { n: 2, x: 29, y: 40, w: 1, rise: 14, speed: 0.6, colors: ['#8ac04a'], fall: true, sway: 0 });
  eyes(L, [[16, 13], [22, 13]], '#e8f0ff', 6, 0.18);
  glow(L, 19, 8, 30, '#c8e0ff', 0.06 + Math.sin(L.t * 23) * 0.03);   // the ward lights flicker on her
});
life('sleepwalker', (L) => {
  if (L.e.anim === 'idle') {
    // Zzz drifting up
    const ctx = L.ctx;
    for (let i = 0; i < 3; i++) {
      const k = (L.t * 0.4 + i / 3) % 1;
      ctx.globalAlpha = (1 - k) * Math.min(1, k * 4); ctx.fillStyle = '#c8d0ff';
      ctx.font = `${5 + i * 2}px serif`; ctx.fillText('z', L_.X(L, 28 + k * 8 + i * 2), L_.Y(L, 4 - k * 18));
    }
  } else {
    motes(L, { n: 6, x: 10, y: 48, w: 20, rise: 30, speed: 0.4, colors: ['#3a3a4a', '#5a5a6a'], size: 2, sway: 4 });
    eyes(L, [[17, 10], [23, 10]], '#a0c0ff', 8, 0.3);
  }
});
loops(['furnaceheart'], { idle: 8, open: 10, hot: 12 });
loops('matron', { idle: 5 });
loops('sleepwalker', { idle: 4, awake: 6 });

// ---------------------------------------------------------------- Chapters IV–V
life('ossuaryknight', (L) => {
  eyes(L, [[21, 13], [29, 13]], '#ff3030', 7, 0.4);
  motes(L, { n: 4, x: 14, y: 30, w: 22, rise: 24, speed: 0.4, colors: ['#e0d6c0', '#b8ae98'], fall: true, sway: 1 });
  const k = (L.t * 0.7) % 1.8; if (k < 1) px(L, 39 + k * 7, 34 - k * 18, '#ffffff', 1, 1 - k);
});
life('mothmother', (L) => {
  orbit(L, 36, 26, 40, 22, 7, 1.6, '#c8b48a', 2, 3);
  motes(L, { n: 10, x: 4, y: 34, w: 64, rise: 30, speed: 0.35, colors: ['#e8dcc0', '#c8b48a'], fall: true, sway: 4 });
  eyes(L, [[33, 14], [39, 14]], '#f0e060', 6, 0.3);
  const fl = (Math.sin((L.e.frame / 8) * Math.PI * 2) * 0.5 + 0.5) * 9;
  glow(L, 14, 20 + fl * 0.45, 9, '#e8c040', 0.18); glow(L, 58, 20 + fl * 0.45, 9, '#e8c040', 0.18);
});
life('bellringer', (L) => {
  const sw = L.e.anim === 'swing';
  const bx = (sw ? 4 : 8) + 7, by = sw ? 30 : 40;
  if (sw || Math.sin(L.t * 2) > 0.7) {
    const ctx = L.ctx;
    for (let i = 0; i < 3; i++) { const k = (L.t * 1.5 + i / 3) % 1; ctx.globalAlpha = 0.5 * (1 - k); ctx.strokeStyle = '#e8c070'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L_.X(L, bx), L_.Y(L, by), 6 + k * 18, 0, Math.PI * 2); ctx.stroke(); }
  }
  eyes(L, [[19, 25]], '#ffe0a0', 5, 0.25);
});
life('choirmaster', (L) => {
  const ctx = L.ctx;
  for (let i = 0; i < 4; i++) {
    const k = (L.t * 0.45 + i / 4) % 1;
    ctx.globalAlpha = (1 - k) * Math.min(1, k * 5); ctx.fillStyle = i % 2 ? '#e8c060' : '#f0e8ff';
    ctx.font = '7px serif'; ctx.fillText(i % 2 ? '♪' : '♫', L_.X(L, 24 + Math.sin(L.t * 2 + i) * 6 + k * 8), L_.Y(L, 14 - k * 26));
  }
  glow(L, 22, 10, 18, '#c0a0ff', 0.12);
});
life(['blottedman', 'blottedhalf'], (L) => {
  const k = L.e.def.id === 'blottedman' ? 1 : 0.7;
  motes(L, { n: 6, x: 4 * k, y: 40 * k, w: 34 * k, rise: 22 * k, speed: 0.7, colors: ['#1e1a36', '#2a2650'], fall: true, size: 2, sway: 0 });
  eyes(L, [[(20 - 3) * k, 10 * k], [(20 + 3.5) * k, 11.5 * k]], '#f2f0ff', 6, 0.2);
});
life(['unbound', 'itremembers'], (L) => {
  const ctx = L.ctx, flesh = L.e.def.id === 'itremembers';
  // loose pages circling the book
  for (let i = 0; i < 6; i++) {
    const a = L.t * 0.8 + (i / 6) * Math.PI * 2;
    const x = 44 + Math.cos(a) * 52, y = 34 + Math.sin(a) * 18 + Math.sin(L.t * 3 + i) * 3;
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#e6dcc0';
    const w2 = 2 + Math.abs(Math.cos(L.t * 4 + i)) * 3;
    ctx.fillRect(Math.round(L_.X(L, x) - w2 / 2), Math.round(L_.Y(L, y)), Math.round(w2), 5);
    ctx.fillStyle = flesh ? '#8a2a2a' : '#5a4a3a'; ctx.fillRect(Math.round(L_.X(L, x) - w2 / 2), Math.round(L_.Y(L, y)) + 2, Math.max(1, Math.round(w2 - 1)), 1);
  }
  if (L.e.anim === 'idle') eyes(L, [[42, 34]], flesh ? '#60ff60' : '#ff3040', 18, 0.3);
  else eyes(L, [[41, 28], [46, 28]], flesh ? '#60ff60' : '#ff3040', 9, 0.4);
});
loops(['unbound', 'itremembers'], { idle: 6, open: 7 });
loops('choirmaster', { up: 4 });

// ---------------------------------------------------------------- Chapters VI–VII, finals, hospital
life('thornwife', (L) => {
  motes(L, { n: 6, x: 18, y: 16, w: 32, rise: 50, speed: 0.25, colors: ['#c8283a', '#e84a5a', '#8a1424'], size: 2, fall: true, sway: 6 });   // falling petals
  motes(L, { n: 4, x: 20, y: 46, w: 28, rise: 14, speed: 0.5, colors: ['#e0e8a0'], sway: 3 });   // pollen
  if (L.e.anim === 'open') glow(L, 34, 20, 20, '#ff4050', 0.18);
});
life('rimebride', (L) => {
  motes(L, { n: 12, x: -6, y: -4, w: 72, rise: 80, speed: 0.2, colors: ['#ffffff', '#d8f0ff'], fall: true, sway: 5 });   // snow
  puffs(L, 30, 66, 4, 10, '#c8e8ff', 4, 0.3);   // frost mist at the hem
  eyes(L, [[27, 16], [33, 16]], '#7af0ff', 9, 0.4);
});
life('pendulum', (L) => {
  glow(L, 36, 22, 22, '#ff4040', 0.1 + Math.max(0, Math.sin(L.t * 6.28)) * 0.15);   // the dial throbs every second
  const k = (L.e.frame / 12) * Math.PI * 2, sw = Math.sin(k) * 7;
  glow(L, 36 + sw, 66, 10, '#ffe080', 0.2);
  motes(L, { n: 3, x: 26, y: 8, w: 20, rise: 70, speed: 0.15, colors: ['#8a7a6a'], fall: true });   // dust sifting
});
life('typesetter', (L) => {
  eyes(L, [[28, 20], [48, 20]], '#ff4040', 8, 0.35);
  motes(L, { n: 6, x: 14, y: 46, w: 48, rise: 14, speed: 0.6, colors: ['#14122a', '#2a2650'], fall: true, size: 2, sway: 0 });
  puffs(L, 38, 0, 3, 14, '#5a5a66', 2, 0.4);
});
life('bookbinder', (L) => {
  eyes(L, [[24, 12], [30, 12]], '#ff3040', 8, 0.4);
  const k = (L.t * 0.8) % 1.5; if (k < 1 && L.e.anim === 'raise') px(L, 10 - k * 9, 32 - k * 22, '#ffffff', 1, 1 - k);
});
life('unwritten', (L) => {
  const rage = L.e.anim === 'rage';
  const ctx = L.ctx;
  // letters peeling off it and drifting up
  const GL = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < 9; i++) {
    const k = (L.t * 0.3 + i / 9) % 1;
    ctx.globalAlpha = (1 - k) * Math.min(1, k * 5); ctx.fillStyle = rage ? '#ff4060' : '#a898ff';
    ctx.font = '7px serif'; ctx.fillText(GL[(i * 7 + Math.floor(L.t)) % 26], L_.X(L, 20 + L_.hash(i) * 56 + Math.sin(L.t + i) * 4), L_.Y(L, 80 - k * 90));
  }
  eyes(L, [[44, 13], [52, 13]], rage ? '#ff3040' : '#8a7aff', 12, 0.45);
  motes(L, { n: 8, x: 16, y: 92, w: 64, rise: 10, speed: 0.6, colors: ['#14112a'], size: 2 });
});
life('author', (L) => {
  const rage = L.e.anim === 'rage';
  motes(L, { n: 12, x: 14, y: 96, w: 68, rise: 100, speed: 0.2, colors: rage ? ['#ff8060', '#ffd0a0'] : ['#fff4c0', '#ffe080', '#ffffff'], glowR: 6, sway: 4 });
  glow(L, 48, 18, 30, rage ? '#ff4030' : '#fff0b0', 0.16 + Math.sin(L.t * 2) * 0.05);
  // rays from the hood
  const ctx = L.ctx;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.35 + Math.sin(L.t * 0.7 + i) * 0.05;
    ctx.globalAlpha = 0.12 + 0.06 * Math.sin(L.t * 3 + i); ctx.strokeStyle = rage ? '#ff8060' : '#fff4c0'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(L_.X(L, 48), L_.Y(L, 14)); ctx.lineTo(L_.X(L, 48 + Math.cos(a) * 40), L_.Y(L, 14 + Math.sin(a) * 40)); ctx.stroke();
  }
});
life('ironlung', (L) => {
  const rage = L.e.anim === 'rage';
  puffs(L, 74, 18, 4, 18, '#d8e0e8', 3, 0.6);    // the bellows exhaling
  puffs(L, 8, 32, 2, 8, '#e8f4ff', 2, 0.8);      // breath fogging the mask
  eyes(L, [[6, 26], [10, 26]], rage ? '#ff3040' : '#c8e0f0', 5, rage ? 0.4 : 0.15);
  if (rage) motes(L, { n: 5, x: 20, y: 14, w: 50, rise: 16, speed: 0.8, colors: ['#ffb040'], glowR: 4 });
});
life('patient', (L) => {
  const rage = L.e.anim === 'rage';
  // the drip, and the monitor's glow
  motes(L, { n: 2, x: 81, y: 30, w: 1, rise: 8, speed: 1.2, colors: [rage ? '#c83a4a' : '#c8e0f0'], fall: true, sway: 0 });
  const beat = (L.t * (rage ? 2.4 : 1.1)) % 1 < 0.12;
  glow(L, 44, 48, 20, rage ? '#ff4050' : '#60ff90', beat ? 0.35 : 0.12);
  eyes(L, [[41, 18], [47, 18]], rage ? '#ff3040' : '#c8e8ff', 7, 0.35);
  motes(L, { n: 4, x: 38, y: 20, w: 12, rise: 16, speed: 0.5, colors: ['#14112a'], fall: true, sway: 0 });   // ink running from the eyes
});
life('echo', (L) => {
  motes(L, { n: 6, x: 2, y: 28, w: 18, rise: 26, speed: 0.5, colors: ['#a8c8f0', '#e8f4ff'], glowR: 5, sway: 3 });
});
loops('rimebride', { veil: 6 });
loops('pendulum', { idle: 10 });
loops('bookbinder', { raise: 6 });
loops('thornwife', { open: 6 });
loops('typesetter', { open: 8 });
