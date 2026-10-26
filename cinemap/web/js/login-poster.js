// Poster still: a procedural half-resolution landscape drawn on a 2D canvas (sky, far ridges,
// meadow, a winding river), toned to paper and ordered-dithered, with a calm zone behind the
// copy panel so the headline stays readable. Drawn in slices so it never blocks input.
const PAPER = [247 / 255, 248 / 255, 246 / 255];
const LUMA = [0.299, 0.587, 0.114];
const PAPER_L = PAPER[0] * LUMA[0] + PAPER[1] * LUMA[1] + PAPER[2] * LUMA[2];
const BAYER = new Float32Array(64);
for (let y = 0; y < 8; y++)
  for (let x = 0; x < 8; x++) {
    const v = x ^ y;
    const b = ((v & 1) << 5) | ((y & 1) << 4) | ((v & 2) << 2) | ((y & 2) << 1) | ((v & 4) >> 1) | ((y & 4) >> 2);
    BAYER[y * 8 + x] = (b + 0.5) / 64;
  }
const bayer = (x, y) => BAYER[(y & 7) * 8 + (x & 7)];
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const noise = (x, y) => {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
};
const rect = (el) => {
  const r = el?.getBoundingClientRect();
  return r ? [r.left / innerWidth, r.top / innerHeight, r.right / innerWidth, r.bottom / innerHeight] : [0, 0, 0, 0];
};
const yieldFrame = () => new Promise((r) => setTimeout(r, 0));
const mix = (a, b, t) => a + (b - a) * t;

// Scene colour at normalised screen coords (u right, v up), narrow = phone layout.
function scenePixel(u, v, narrow) {
  const horizon = narrow ? 0.62 : 0.54;
  const cx = narrow ? 0.42 : 0.5;
  const aspect = innerWidth / innerHeight;
  const x = (u - cx) * aspect;
  let r, g, b;
  if (v > horizon) {
    const t = smooth(horizon, 1, v);
    r = mix(242, 232, t * 0.5) / 255;
    g = mix(244, 238, t * 0.5) / 255;
    b = mix(241, 243, t * 0.5) / 255;
  } else {
    const d = (horizon - v) / horizon; // 0 at horizon → 1 at bottom
    const depth = 1 / (0.04 + d * 1.1);
    const wx = x * depth;
    const wz = depth * 30;
    const riverX = 0.18 * Math.sin(wz * 0.09 + 0.6) * (wz * 0.12) + wz * 0.14 - 2;
    const rw = 0.6 + wz * 0.02;
    const dist = Math.abs(wx - riverX);
    const grass = [216 / 255, 233 / 255, 215 / 255];
    const lush = smooth(0.52, 0.7, noise(wx * 0.05 + 3, wz * 0.05));
    r = mix(grass[0], 184 / 255, lush * 0.9);
    g = mix(grass[1], 212 / 255, lush * 0.9);
    b = mix(grass[2], 190 / 255, lush * 0.9);
    const bank = 1 - smooth(rw, rw + 0.9, dist);
    r = mix(r, 226 / 255, bank * 0.8);
    g = mix(g, 224 / 255, bank * 0.8);
    b = mix(b, 216 / 255, bank * 0.8);
    const water = 1 - smooth(rw - 0.08, rw + 0.08, dist);
    const rip = noise(wx * 2.4, wz * 0.9) * 0.6 + noise(wx * 5, wz * 2.1) * 0.4;
    const wc = [186 / 255 * (0.96 + 0.09 * rip), 212 / 255 * (0.96 + 0.09 * rip), 228 / 255 * (0.96 + 0.09 * rip)];
    r = mix(r, wc[0], water);
    g = mix(g, wc[1], water);
    b = mix(b, wc[2], water);
    // far ridges: a silhouette band just under the horizon
    const ridge = 0.1 * Math.exp(-((x - 0.25) * (x - 0.25)) / 0.12) + 0.14 * Math.exp(-((x + 0.1) * (x + 0.1)) / 0.05) + 0.07 * Math.exp(-((x - 0.7) * (x - 0.7)) / 0.03);
    const rid = noise(x * 9 + 11, 0) * 0.02;
    if (v > horizon - ridge - rid && v < horizon + 0.001) {
      const snow = smooth(horizon - ridge * 0.45, horizon - ridge * 0.1, v);
      r = mix(223 / 255, 248 / 255, snow);
      g = mix(221 / 255, 249 / 255, snow);
      b = mix(214 / 255, 247 / 255, snow);
    }
    // fog toward the horizon
    const fog = (1 - Math.exp(-depth * 0.045)) * 0.78;
    r = mix(r, 242 / 255, fog);
    g = mix(g, 244 / 255, fog);
    b = mix(b, 241 / 255, fog);
  }
  return [r, g, b];
}

export function drawPoster(host, { panel, foot, className = '', onReady } = {}) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  canvas.className = className;
  host.prepend(canvas);
  let run = 0;
  let announced = false;
  const draw = async () => {
    const id = ++run;
    const narrow = innerWidth < 760;
    const w = Math.ceil(innerWidth / 4), h = Math.ceil(innerHeight / 4);   // quarter-res: the still is a stand-in, it must be cheap
    const img = new ImageData(w, h);
    const px = img.data;
    const p = rect(panel), f = rect(foot);
    const ax = p[0] - 0.05, ay = p[3] + 0.08, bx = p[2] + 0.03;
    let nx = -((p[1] + p[3]) / 2 - ay), ny = -(ax - bx);
    const nl = Math.hypot(nx, ny) || 1;
    nx /= nl;
    ny /= nl;
    const footOn = f[2] > f[0];
    const fcx = (f[0] + f[2]) / 2, fcy = (f[1] + f[3]) / 2, fhw = (f[2] - f[0]) / 2 + 0.12;
    let t0 = performance.now();
    for (let y = 0; y < h; y++) {
      const sy = (y + 0.5) / h; // 0 top → 1 bottom (screen)
      for (let x = 0; x < w; x++) {
        const sx = (x + 0.5) / w;
        let [r, g, b] = scenePixel(sx, 1 - sy, narrow);
        const d1 = (sx - ax) * nx + (sy - ay) * ny;
        const d2 = ((sx - bx) * w) / h;
        const calm = smooth(0.12, -0.1, Math.max(d1, d2));
        const halo = footOn ? smooth(1, 0.15, Math.hypot((sx - fcx) / fhw, (sy - fcy) / 0.13)) * 0.42 : 0;
        const vig = Math.pow(Math.min(1, Math.hypot(((sx - 0.5) * (innerWidth / innerHeight) - 0.25) * 0.55, (0.5 - sy - 0.02) * 1.05)), 2.4);
        const toPaper = Math.max(calm * 0.72, vig * 0.55, halo);
        r += (PAPER[0] - r) * toPaper;
        g += (PAPER[1] - g) * toPaper;
        b += (PAPER[2] - b) * toPaper;
        const L = Math.min((r * LUMA[0] + g * LUMA[1] + b * LUMA[2]) / PAPER_L, 1);
        const levels = bayer(x + 21, y + 21) < calm ? 12 : 6;
        const xq = Math.pow(Math.min(1, Math.max(0, (L - 0.3) / 0.7)), 1.6);
        const q = 0.3 + 0.7 * Math.pow(Math.min(Math.floor(xq * levels + bayer(x, y)) / levels, 1), 1 / 1.6);
        const k = q / Math.max(L, 0.02);
        r *= k;
        g *= k;
        b *= k;
        const m = r * LUMA[0] + g * LUMA[1] + b * LUMA[2];
        const sat = 1 + Math.max(1 - k, 0) * 2.2;
        const i = (y * w + x) * 4;
        px[i] = Math.min(255, Math.max(0, (m + (r - m) * sat) * 255));
        px[i + 1] = Math.min(255, Math.max(0, (m + (g - m) * sat) * 255));
        px[i + 2] = Math.min(255, Math.max(0, (m + (b - m) * sat) * 255));
        px[i + 3] = 255;
      }
      if (performance.now() - t0 > 8) {
        await yieldFrame();
        if (id !== run) return;
        t0 = performance.now();
      }
    }
    canvas.width = w;
    canvas.height = h;
    ctx.putImageData(img, 0, 0);
    if (!announced) {
      announced = true;
      requestAnimationFrame(() => onReady?.());
    }
  };
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(draw, 200);
  };
  addEventListener('resize', schedule);
  let ro = null;
  if (window.ResizeObserver) {
    let first = true;
    ro = new ResizeObserver(() => (first ? (first = false) : schedule()));
    panel && ro.observe(panel);
    foot && ro.observe(foot);
  }
  draw();
  return {
    stop() {
      run++;
      clearTimeout(timer);
      removeEventListener('resize', schedule);
      ro?.disconnect();
      canvas.remove();
    },
  };
}
