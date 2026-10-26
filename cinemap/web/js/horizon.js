// The hero of the home page: a dithered valley backdrop, a turntable that shows the selected
// starting point as a floating white-model plate, and a track of starting points on an arc.
const BAYER = new Float32Array(64);
for (let y = 0; y < 8; y++)
  for (let x = 0; x < 8; x++) {
    const v = x ^ y;
    BAYER[y * 8 + x] = ((((v & 1) << 5) | ((y & 1) << 4) | ((v & 2) << 2) | ((y & 2) << 1) | ((v & 4) >> 1) | ((y & 4) >> 2)) + 0.5) / 64;
  }
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
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a, b, t) => a + (b - a) * t;

// Two-tone dithered valley: ridge silhouettes, a bright plain and a dark band of woods.
export function drawValley(canvas) {
  const w = Math.ceil(innerWidth / 3), h = Math.ceil(innerHeight / 3);
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const ink = [0x8f, 0xb0, 0x9c], paper = [0xf7, 0xf8, 0xf6];
  for (let y = 0; y < h; y++) {
    const v = y / h;
    for (let x = 0; x < w; x++) {
      const u = x / w;
      const aspect = w / h;
      const xx = (u - 0.5) * aspect;
      let L = 1;
      const horizon = 0.42;
      const ridge = 0.09 * Math.exp(-((xx + 0.25) ** 2) / 0.09) + 0.14 * Math.exp(-((xx - 0.35) ** 2) / 0.05) + 0.05 * Math.exp(-((xx + 0.75) ** 2) / 0.04) + noise(xx * 7 + 4, 0) * 0.03;
      if (v > horizon - ridge && v < horizon) {
        const depth = (v - (horizon - ridge)) / ridge;
        L = mix(0.72, 0.9, depth) + noise(xx * 30, v * 60) * 0.1;
      } else if (v >= horizon) {
        const d = (v - horizon) / (1 - horizon);
        const woods = smooth(0.08, 0.2, d) * (1 - smooth(0.42, 0.55, d));
        const water = smooth(0.58, 0.63, d) * (1 - smooth(0.9, 0.98, d));
        L = 0.96 - woods * (0.5 + noise(xx * 25, d * 40) * 0.25) - water * 0.14 + noise(xx * 12, d * 20) * 0.06;
        const bank = Math.abs(xx - 0.1 - 0.2 * Math.sin(d * 7)) < 0.03 + d * 0.1 ? 1 : 0;
        L += bank * water * 0.08;
      } else {
        L = 0.98 + noise(xx * 3, v * 3) * 0.02;
      }
      // the copy and the composer sit in the lower middle: keep it bright there
      const calm = 1 - smooth(0.35, 0.05, Math.hypot((u - 0.5) * 1.4, (v - 0.86) * 1.1));
      L = mix(L, 1, (1 - calm) * 0.75);
      const q = L + (BAYER[(y & 7) * 8 + (x & 7)] - 0.5) * 0.28 > 0.86 ? 1 : 0;
      const i = (y * w + x) * 4;
      px[i] = q ? paper[0] : ink[0];
      px[i + 1] = q ? paper[1] : ink[1];
      px[i + 2] = q ? paper[2] : ink[2];
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  canvas.classList.add('on');
}

// Floating plate drawn in 2D isometric projection; rotates slowly, drag to turn.
export function mountTurntable(canvas, { getCover } = {}) {
  const ctx = canvas.getContext('2d');
  let angle = 0.6, vel = 0.003, drag = null, cover = null, coverImg = null, raf = 0, bob = 0;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * devicePixelRatio);
    canvas.height = Math.round(r.height * devicePixelRatio);
  };
  const draw = (t) => {
    const W = canvas.width, H = canvas.height, dpr = devicePixelRatio;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.52 + Math.sin(t / 1400) * 4 * dpr;
    const size = Math.min(W, H * 1.4) * 0.34;
    const thick = size * 0.16;
    const c = Math.cos(angle), s = Math.sin(angle);
    const corner = (x, z) => [cx + (x * c - z * s) * size, cy + (x * s + z * c) * size * 0.5];
    const pts = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    // shadow
    ctx.fillStyle = 'rgba(40,60,45,.14)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + thick + size * 0.42, size * 1.15, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // sides: draw the two faces that point toward the viewer
    for (let i = 0; i < 4; i++) {
      const a = pts[i], b = pts[(i + 1) % 4];
      if ((a[1] + b[1]) / 2 < cy) continue;
      ctx.fillStyle = (a[0] + b[0]) / 2 < cx ? '#d7d9d3' : '#c6c9c2';
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.lineTo(b[0], b[1] + thick);
      ctx.lineTo(a[0], a[1] + thick);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#eef0ea';
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
    if (coverImg && coverImg.complete && coverImg.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.clip();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(coverImg, cx - size * 1.1, cy - size * 0.95, size * 2.2, size * 1.6);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.lineWidth = dpr;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.stroke();
  };
  const loop = (t) => {
    if (!drag) {
      angle += vel;
      vel += (0.003 - vel) * 0.02;
    }
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, a: angle };
    canvas.classList.add('grabbing');
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const next = drag.a + (e.clientX - drag.x) * 0.008;
    vel = next - angle;
    angle = next;
  });
  const up = () => {
    drag = null;
    canvas.classList.remove('grabbing');
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(loop);
  return {
    show(starter) {
      cover = starter;
      coverImg = null;
      const url = getCover?.(starter);
      if (!url) return;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => (coverImg = img);
      img.src = url;
    },
    stop: () => cancelAnimationFrame(raf),
  };
}

// Small pixel "grain" thumbnails for cells: a tiny slab with a seeded skyline.
function drawCell(canvas, id) {
  const w = 46, h = 26;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#d2d5cf';
  ctx.fillRect(4, 16, 38, 6);
  ctx.fillStyle = '#eceee9';
  ctx.fillRect(4, 12, 38, 5);
  if (id === 'blank') return;
  let seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let x = 7; x < 39; x += 3 + Math.floor(r() * 3)) {
    const hh = 2 + Math.floor(r() * 8);
    ctx.fillStyle = r() < 0.3 ? '#a9c3ad' : '#f4f4f1';
    ctx.fillRect(x, 12 - hh, 2 + Math.floor(r() * 2), hh);
  }
}

export function mountTrack({ track, tips, dot, cells, selected, onSelect, onEnter, labelOf }) {
  const nodes = new Map();
  const tipNodes = new Map();
  for (const c of cells) {
    const b = document.createElement('button');
    b.type = 'button';
    b.role = 'option';
    b.id = `hz-cell-${c.id}`;
    b.className = `hz-cell ${c.id === 'blank' ? 'blank' : c.id === 'tutorial' ? 'tutorial' : 'template'}`;
    b.dataset.cell = c.id;
    b.tabIndex = -1;
    const cv = document.createElement('canvas');
    cv.className = 'hz-grain';
    drawCell(cv, c.id);
    b.append(cv);
    if (c.id === 'blank') {
      const plus = document.createElement('span');
      plus.className = 'hz-plus';
      plus.innerHTML = '<i class="cm-g cm-g-plus s12"></i>';
      b.append(plus);
    }
    b.addEventListener('click', () => select(c.id, true));
    b.addEventListener('dblclick', () => onEnter?.(c.id));
    b.addEventListener('pointerenter', () => showTip(c.id, true));
    b.addEventListener('pointerleave', () => showTip(c.id, false));
    track.append(b);
    nodes.set(c.id, b);
    const tip = document.createElement('span');
    tip.className = 'cm-tag hz-tip';
    tip.innerHTML = '<span></span>';
    tips.append(tip);
    tipNodes.set(c.id, tip);
  }
  let current = selected;
  const showTip = (id, on) => {
    const tip = tipNodes.get(id);
    if (!tip) return;
    tip.firstChild.textContent = labelOf(id);
    tip.classList.toggle('on', on || id === current);
  };
  function layout() {
    const W = track.clientWidth, H = track.clientHeight;
    const cx = W / 2, baseY = H * 0.5 + 90;
    const idx = cells.findIndex((c) => c.id === current);
    cells.forEach((c, i) => {
      const k = i - idx;
      const d = Math.abs(k);
      const x = cx + k * 106 - 46;
      const y = baseY - d * d * 2.2;
      const scale = d === 0 ? 1.22 : Math.max(0.15, 0.98 - d * 0.14);
      const op = d > 3 ? 0 : d === 0 ? 1 : Math.max(0, 1 - d * 0.28);
      const b = nodes.get(c.id);
      b.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale.toFixed(3)})`;
      b.style.opacity = op;
      b.style.zIndex = 100 - d * 4;
      b.style.pointerEvents = op < 0.05 ? 'none' : '';
      b.setAttribute('aria-selected', String(d === 0));
      b.classList.toggle('on', d === 0);
      const tip = tipNodes.get(c.id);
      tip.style.transform = `translate3d(${x + 46}px,${y - 6}px,0) translate(-50%,-100%)`;
      tip.firstChild.textContent = labelOf(c.id);
      tip.classList.toggle('on', d === 0);
    });
    dot.style.transform = `translate3d(${cx - 4}px,${baseY + 60}px,0)`;
    track.setAttribute('aria-activedescendant', `hz-cell-${current}`);
  }
  function select(id, user) {
    if (!nodes.has(id)) return;
    current = id;
    layout();
    onSelect?.(id, user);
  }
  track.addEventListener('keydown', (e) => {
    const idx = cells.findIndex((c) => c.id === current);
    if (e.key === 'ArrowRight') select(cells[Math.min(cells.length - 1, idx + 1)].id, true);
    else if (e.key === 'ArrowLeft') select(cells[Math.max(0, idx - 1)].id, true);
    else if (e.key === 'Enter') onEnter?.(current);
    else return;
    e.preventDefault();
  });
  track.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) < 8) return;
    const idx = cells.findIndex((c) => c.id === current);
    select(cells[Math.max(0, Math.min(cells.length - 1, idx + Math.sign(e.deltaX)))].id, true);
  }, { passive: true });
  addEventListener('resize', layout);
  layout();
  return { select, relabel: layout, get current() { return current; } };
}
