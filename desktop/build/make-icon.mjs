// Generates the Director icon and matching web SVG without image dependencies.
// Run npm run icon in desktop to regenerate PNG, SVG, and macOS ICNS.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const S = 1024;
const lerp = (a, b, t) => a + (b - a) * t;
const cover = d => Math.max(0, Math.min(1, 0.5 - d));
function roundRectSDF(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}
function polygonSDF(x, y, points) {
  let distance = Infinity, inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [ax, ay] = points[j], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)));
    distance = Math.min(distance, Math.hypot(x-ax-t*dx, y-ay-t*dy));
    if ((ay > y) !== (by > y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
  }
  return inside ? -distance : distance;
}
const dark = [27, 30, 34], ivory = [243, 242, 229], lime = [210, 242, 103];
const play = [[458, 516], [458, 666], [588, 591]];
const stripes = [350, 520, 690].map(x => [[x,0],[x+76,0],[x+6,120],[x-70,120]]);
const angle = -12 * Math.PI / 180;
const px = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    const X = x+.5, Y = y+.5;
    const d = roundRectSDF(X,Y,512,512,420,420,190);
    const alpha = cover(d);
    if (!alpha) continue;
    const light = Math.max(0, 1-Math.hypot(X-290,Y-140)/1000);
    let color = [20+22*light,23+23*light,27+25*light];
    const paint = (c,a) => { color = color.map((v,i)=>lerp(v,c[i],a)); };
    paint([91,96,100], cover(Math.abs(d+2)-1)*.5);
    // Ivory slate with a bold negative-space play mark.
    paint(ivory, cover(roundRectSDF(X,Y,512,592,252,154,38)));
    paint(dark, cover(polygonSDF(X,Y,play)-9));
    // Raised clapper lid, rotated around its left hinge.
    const dx=X-260, dy=Y-414;
    const u=260+dx*Math.cos(angle)+dy*Math.sin(angle);
    const v=-dx*Math.sin(angle)+dy*Math.cos(angle)+120;
    const lid=cover(roundRectSDF(u,v,512,60,252,60,18));
    paint(lime,lid);
    for (const stripe of stripes) paint(dark, Math.min(lid,cover(polygonSDF(u,v,stripe))));
    const i=(y*S+x)*4;
    color.forEach((c,j)=>{px[i+j]=Math.round(c);});
    px[i+3]=Math.round(alpha*255);
  }
}
const rgb = c => `rgb(${c.join(",")})`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><radialGradient id="body" cx="24%" cy="6%" r="110%"><stop stop-color="#2a2e34"/><stop offset="1" stop-color="#14171b"/></radialGradient><clipPath id="lid"><rect x="260" y="294" width="504" height="120" rx="18"/></clipPath></defs>
<rect x="92" y="92" width="840" height="840" rx="190" fill="url(#body)" stroke="#454a50" stroke-width="2"/>
<rect x="260" y="438" width="504" height="308" rx="38" fill="${rgb(ivory)}"/>
<path d="M458 516L458 666L588 591Z" fill="${rgb(dark)}" stroke="${rgb(dark)}" stroke-width="18" stroke-linejoin="round"/>
<g transform="rotate(-12 260 414)"><rect x="260" y="294" width="504" height="120" rx="18" fill="${rgb(lime)}"/><g clip-path="url(#lid)" fill="${rgb(dark)}">${stripes.map(p=>`<polygon points="${p.map(([x,y])=>`${x},${y+294}`).join(" ")}"/>`).join("")}</g></g>
</svg>
`;
fs.writeFileSync(path.resolve(here,"../../web/public/favicon.svg"),svg);

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
