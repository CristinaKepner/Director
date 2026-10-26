// Cinemap app icon: the pixel globe from the login page on a brand-green rounded square,
// written as a 1024×1024 PNG without image libraries. `sh make-icns.sh` turns it into .icns.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const S = 1024;
// 21×21 pixel globe (same symbol as web/favicon.svg): meridians, equator, outline
const GLOBE = ['M7 0h7v1H7', 'M5 1h2v1H5', 'M14 1h2v1h-2', 'M3 2h2v1H3', 'M16 2h2v1h-2', 'M2 3h1v1H2', 'M18 3h1v1h-1', 'M1 4h1v1H1', 'M19 4h1v1h-1', 'M1 5h1v1H1', 'M19 5h1v1h-1', 'M0 6h1v1H0', 'M20 6h1v1h-1', 'M0 7h1v1H0', 'M20 7h1v1h-1', 'M0 8h1v1H0', 'M20 8h1v1h-1', 'M0 9h1v1H0', 'M20 9h1v1h-1', 'M0 10h21v1H0', 'M0 11h1v1H0', 'M20 11h1v1h-1', 'M0 12h1v1H0', 'M20 12h1v1h-1', 'M0 13h1v1H0', 'M20 13h1v1h-1', 'M0 14h1v1H0', 'M20 14h1v1h-1', 'M1 15h1v1H1', 'M19 15h1v1h-1', 'M1 16h1v1H1', 'M19 16h1v1h-1', 'M2 17h1v1H2', 'M18 17h1v1h-1', 'M3 18h2v1H3', 'M16 18h2v1h-2', 'M5 19h2v1H5', 'M14 19h2v1h-2', 'M7 20h7v1H7', 'M10 1h1v19h-1', 'M5 3h1v15H5', 'M15 3h1v15h-1', 'M3 5h1v1H3', 'M17 5h1v1h-1', 'M2 6h1v9H2', 'M18 6h1v9h-1', 'M3 15h1v1H3', 'M17 15h1v1h-1'];
const cells = new Set();
for (const d of GLOBE) {
  const m = /M(\d+) (\d+)h(-?\d+)v(\d+)/.exec(d.replace(/H-?\d+|z/g, ''));
  if (!m) continue;
  const [x, y, w, h] = m.slice(1).map(Number);
  for (let i = 0; i < Math.abs(w); i++) for (let j = 0; j < h; j++) cells.add(`${x + (w < 0 ? -i - 1 : i)},${y + j}`);
}
const px = Buffer.alloc(S * S * 4);
const rr = (x, y, c, h, r) => {
  const qx = Math.abs(x - c) - (h - r), qy = Math.abs(y - c) - (h - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
const cell = 36, ox = (S - 21 * cell) / 2, oy = (S - 21 * cell) / 2;
for (let y = 0; y < S; y++)
  for (let x = 0; x < S; x++) {
    const a = Math.max(0, Math.min(1, 0.5 - rr(x + 0.5, y + 0.5, 512, 440, 200)));
    if (!a) continue;
    const t = (y / S) * 0.25;
    let col = [14 + 20 * t, 55 + 18 * t, 35 + 14 * t];
    const gx = Math.floor((x - ox) / cell), gy = Math.floor((y - oy) / cell);
    if (cells.has(`${gx},${gy}`)) col = [247, 248, 246];
    const i = (y * S + x) * 4;
    px[i] = col[0];
    px[i + 1] = col[1];
    px[i + 2] = col[2];
    px[i + 3] = Math.round(a * 255);
  }
const crc = (buf) => {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4);
  c.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, c]);
};
const raw = Buffer.alloc((S * 4 + 1) * S);
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0;
  px.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8;
ihdr[9] = 6;
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(path.join(here, 'icon.png'), png);
console.log(`wrote ${path.join(here, 'icon.png')} (${png.length} bytes)`);
