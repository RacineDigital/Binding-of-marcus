// Renders the app icon (electron/icon.png, 256x256) from Marcus's hand-drawn head.
//   npx tsx scripts/make-icon.ts
import * as fs from 'fs';
import * as zlib from 'zlib';
import { HEAD_DOWN, MARCUS_PAL } from '../src/art/hand/marcus';

const N = 256, S = 10;
const px = new Uint8Array(N * N * 4);
const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// rounded dark tile with a soft inner glow
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const r = 40, cx = Math.min(Math.max(x, r), N - 1 - r), cy = Math.min(Math.max(y, r), N - 1 - r);
  const inside = Math.hypot(x - cx, y - cy) <= r;
  if (!inside) continue;
  const d = Math.hypot(x - N / 2, y - N / 2) / (N / 2);
  const k = Math.max(0, 1 - d);
  const i = (y * N + x) * 4;
  px[i] = 18 + 40 * k; px[i + 1] = 12 + 18 * k; px[i + 2] = 30 + 46 * k; px[i + 3] = 255;
}
const w = HEAD_DOWN[0].length, h = HEAD_DOWN.length;
const ox = Math.floor((N - w * S) / 2), oy = Math.floor((N - h * S) / 2) + 6;
HEAD_DOWN.forEach((row, ry) => [...row].forEach((ch, rx) => {
  const c = MARCUS_PAL[ch]; if (!c) return;
  const [r, g, b] = hex(c);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) { const i = ((oy + ry * S + yy) * N + ox + rx * S + xx) * 4; px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; }
}));
function crc32(buf: Buffer): number { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr[8] = 8; ihdr[9] = 6;
const raw = Buffer.alloc((N * 4 + 1) * N);
for (let y = 0; y < N; y++) Buffer.from(px.buffer, y * N * 4, N * 4).copy(raw, y * (N * 4 + 1) + 1);
fs.writeFileSync('electron/icon.png', Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
console.log('wrote electron/icon.png');
