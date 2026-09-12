// Generates the app icon with no image dependencies: a rounded squircle carrying the MiniMax
// spectrum gradient, with a viewfinder frame cut into it. Writes PNGs, then `iconutil` makes the .icns.
//   node desktop/build/make-icon.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const S = 1024;

// MiniMax spectrum: #ffd400 → #ff891f 18% → #e4659a 42% → #db2ed7 60% → #7264f4 85%
const STOPS = [
  [0.0, [255, 212, 0]],
  [0.18, [255, 137, 31]],
  [0.42, [228, 101, 154]],
  [0.6, [219, 46, 215]],
  [0.85, [114, 100, 244]],
  [1.0, [90, 78, 226]],
];

const lerp = (a, b, t) => a + (b - a) * t;
function gradient(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [p0, c0] = STOPS[i - 1];
      const [p1, c1] = STOPS[i];
      const k = (t - p0) / (p1 - p0 || 1);
      return [lerp(c0[0], c1[0], k), lerp(c0[1], c1[1], k), lerp(c0[2], c1[2], k)];
    }
  }
  return STOPS.at(-1)[1];
}

// signed distance to a rounded rect, used for antialiased edges
function roundRectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
const cover = (d) => Math.max(0, Math.min(1, 0.5 - d)); // ~1px antialiasing

const px = Buffer.alloc(S * S * 4);
const PAD = 92;                 // macOS icons sit inside their canvas
const R = 232;                  // squircle radius
const cx = S / 2, cy = S / 2, hw = S / 2 - PAD, hh = S / 2 - PAD;

// viewfinder: four corner brackets
const F = 300;                  // half-size of the frame
const ARM = 118, TH = 30;       // bracket arm length and thickness
function bracketAlpha(x, y) {
  let a = 0;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const ox = cx + sx * F, oy = cy + sy * F;
      // horizontal arm
      const h = roundRectSDF(x, y, ox - sx * (ARM - TH) / 2, oy, (ARM + TH) / 2, TH / 2, TH / 2);
      // vertical arm
      const v = roundRectSDF(x, y, ox, oy - sy * (ARM - TH) / 2, TH / 2, (ARM + TH) / 2, TH / 2);
      a = Math.max(a, cover(h), cover(v));
    }
  }
  return a;
}

for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4;
    const body = cover(roundRectSDF(x + 0.5, y + 0.5, cx, cy, hw, hh, R));
    if (body <= 0) continue;
    const t = ((x - PAD) + (y - PAD)) / (2 * (S - 2 * PAD)); // 135° sweep
    let [r, g, b] = gradient(t);
    // darken toward the bottom-right so the squircle reads as a solid object
    const shade = 1 - 0.16 * Math.max(0, (x + y) / (2 * S) - 0.35);
    r *= shade; g *= shade; b *= shade;
    // knock the viewfinder out in near-white
    const w = bracketAlpha(x + 0.5, y + 0.5);
    r = lerp(r, 255, w); g = lerp(g, 252, w); b = lerp(b, 255, w);
    px[i] = Math.round(r); px[i + 1] = Math.round(g); px[i + 2] = Math.round(b); px[i + 3] = Math.round(255 * body);
  }
}

// ---- minimal PNG writer ----
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(here, { recursive: true });
const out = path.join(here, "icon.png");
fs.writeFileSync(out, png(S, px));
console.log(`wrote ${out} (${S}×${S})`);
