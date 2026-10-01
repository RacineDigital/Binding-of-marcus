// Renders hand-authored grid sprites to a zoomed PNG for quick review.
// Usage: tsx tests/sprite-png.ts <module.ts> <out.png> [scale] [bg]
//   Every exported string[] is drawn with the module's exported *_PAL palette.
//   Exported functions named sheet() returning Record<string,{rows,pal}> are drawn too.
import * as fs from 'fs';
import * as zlib from 'zlib';
import * as path from 'path';

const [mod, out = 'test-output/sprites.png', scaleArg = '8', bgArg = '2a2530'] = process.argv.slice(2);
const S = Number(scaleArg);
const hexToRgb = (h: string): [number, number, number, number] => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), s.length >= 8 ? parseInt(s.slice(6, 8), 16) : 255];
};
function crc32(buf: Buffer): number {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ 0xffffffff) >>> 0;
}
function png(w: number, h: number, rgba: Uint8Array): Buffer {
  const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
(async () => {
  const m = await import(path.resolve(mod));
  const items: { name: string; rows: string[]; pal: Record<string, string> }[] = [];
  const pals = Object.entries(m).filter(([k]) => k.endsWith('_PAL')).map(([, v]) => v as Record<string, string>);
  const defPal = pals[0] ?? {};
  for (const [k, v] of Object.entries(m)) if (Array.isArray(v) && typeof v[0] === 'string') items.push({ name: k, rows: v as string[], pal: defPal });
  if (typeof m.sheet === 'function') for (const [k, v] of Object.entries(m.sheet() as Record<string, { rows: string[]; pal: Record<string, string> }>)) items.push({ name: k, ...v });
  const gap = 4;
  // wrap into rows of max ~ 1400px
  let x = gap, y = gap, rowH = 0, W = 0;
  const pos = items.map((it) => {
    const w = Math.max(...it.rows.map((r) => r.length)) * S, h = it.rows.length * S;
    if (x + w > 1400) { x = gap; y += rowH + gap; rowH = 0; }
    const p = { x, y, w, h }; x += w + gap; rowH = Math.max(rowH, h); W = Math.max(W, x); return p;
  });
  const H = y + rowH + gap;
  const buf = new Uint8Array(W * H * 4);
  const bg = hexToRgb(bgArg);
  for (let i = 0; i < W * H; i++) buf.set(bg, i * 4);
  items.forEach((it, i) => {
    const p = pos[i];
    it.rows.forEach((row, ry) => [...row].forEach((ch, rx) => {
      if (ch === '.' || ch === ' ') return;
      const c = it.pal[ch]; if (!c) { console.warn(`${it.name}: unknown '${ch}'`); return; }
      const rgb = hexToRgb(c);
      for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) buf.set(rgb, ((p.y + ry * S + yy) * W + p.x + rx * S + xx) * 4);
    }));
    const bad = it.rows.findIndex((r) => r.length !== it.rows[0].length);
    if (bad >= 0) console.warn(`${it.name}: row ${bad} width ${it.rows[bad].length} != ${it.rows[0].length}`);
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, png(W, H, buf));
  console.log(`${items.length} sprites -> ${out} (${W}x${H})`);
})();
