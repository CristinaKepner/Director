// Base layout for each starting point: deterministic from (starter, seed). Shared by the
// server (authoritative world) and the editor (rendering). Everything returned is plain data.
const seeded = (seed) => {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};
export const riverX = (w, z) => w.base + z * w.slope + w.amp * Math.sin(z * w.freq);
export function generate(starter, seed, size = 512) {
  const r = seeded(seed + 17);
  const items = [];
  const env = { size, water: null, roads: [], hill: null, snow: false, sand: false };
  const half = size / 2;
  let n = 0;
  const add = (kind, x, z, rot = r() * Math.PI * 2, scale = 1) => items.push({ id: `b${n++}`, kind, x, z, rot, scale, base: true });
  const row = (kind, x0, z0, x1, z1, count, jitter = 2) => {
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      add(kind, x0 + (x1 - x0) * t + (r() - 0.5) * jitter, z0 + (z1 - z0) * t + (r() - 0.5) * jitter, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2 + (r() - 0.5) * 0.3);
    }
  };
  const scatter = (kind, cx, cz, radius, count, avoid = () => false) => {
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * radius;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      if (Math.abs(x) > half - 6 || Math.abs(z) > half - 6 || avoid(x, z)) continue;
      add(kind, x, z, r() * 6, 0.8 + r() * 0.5);
    }
  };
  switch (starter) {
    case 'tutorial':
    case 'harbor_town': {
      env.water = { kind: 'sea', at: -20 };
      env.roads.push({ from: [-14, -half + 20], to: [-14, half - 20], w: 5 });
      row('house', -4, -60, -4, 70, 9, 3);
      row('house', 10, -70, 10, 80, 10, 4);
      row('house', 26, -40, 26, 60, 7, 5);
      scatter('tree', 30, 0, 60, 18, (x) => x < 0);
      scatter('pine', 60, -40, 40, 10, (x) => x < 20);
      row('lamp', -11, -60, -11, 70, 8, 0);
      add('shed', -6, -90, 0.1);
      add('lighthouse', -60, -40, 0);
      add('boat', -40, 10, 0.4);
      add('boat', -52, 30, 2.1);
      add('boat', -34, -15, 1.1);
      row('person', -12, -30, -12, 40, 6, 3);
      add('car', -14, 20, Math.PI / 2);
      break;
    }
    case 'valley_village': {
      env.water = { kind: 'river', base: 10, slope: 0, amp: 18, freq: 0.02, w: 6 };
      env.hill = { x: -120, z: 120, r: 110, h: 40 };
      const rx = (z) => riverX(env.water, z);
      scatter('pine', -80, 90, 70, 26, (x, z) => Math.abs(x - rx(z)) < 10);
      scatter('tree', 50, 0, 90, 24, (x, z) => Math.abs(x - rx(z)) < 10);
      row('house', 40, -50, 44, 50, 6, 6);
      row('house', 70, -30, 74, 40, 4, 6);
      scatter('rock', 0, 0, 120, 10, (x, z) => Math.abs(x - rx(z)) < 8);
      row('person', 36, -20, 36, 30, 3, 2);
      break;
    }
    case 'hill_town': {
      env.hill = { x: 0, z: 40, r: 120, h: 28 };
      env.roads.push({ from: [-6, -half + 20], to: [6, 40], w: 5 });
      row('house', -16, -120, -8, 20, 10, 4);
      row('house', 12, -110, 20, 30, 10, 4);
      row('house', -30, -90, -24, 0, 6, 5);
      row('house', 34, -80, 40, 10, 6, 5);
      add('tower', 6, 50, 0.3);
      row('lamp', -3, -110, 3, 30, 7, 0);
      scatter('tree', 0, -140, 60, 12, (x) => Math.abs(x) < 20);
      scatter('bush', 0, 0, 90, 14, (x) => Math.abs(x) < 12);
      row('person', 0, -80, 0, 20, 5, 4);
      break;
    }
    case 'old_street': {
      env.roads.push({ from: [-140, 0], to: [140, 0], w: 7 });
      row('house', -130, -8, 130, -8, 18, 2);
      row('house', -130, 9, 130, 9, 18, 2);
      row('lamp', -120, -5, 120, -5, 9, 0);
      row('person', -100, 0, 100, 0, 12, 4);
      add('bench', 30, 5.5, Math.PI);
      add('bench', -40, 5.5, Math.PI);
      scatter('tree', 0, 40, 60, 10, (x, z) => Math.abs(z) < 16);
      break;
    }
    case 'campus': {
      env.roads.push({ from: [-100, 0], to: [100, 0], w: 6 }, { from: [0, -100], to: [0, 100], w: 6 });
      add('shed', -50, -50, 0);
      add('shed', 50, -50, 0);
      add('shed', -50, 50, Math.PI / 2);
      add('tower', 40, 40, 0);
      row('tree', -90, -6, 90, -6, 12, 0);
      row('tree', -90, 6, 90, 6, 12, 0);
      row('bench', -60, 10, 60, 10, 5, 0);
      scatter('person', 0, 0, 70, 10, (x, z) => Math.abs(x) < 4 || Math.abs(z) < 4);
      break;
    }
    case 'desert_station': {
      env.sand = true;
      env.roads.push({ from: [-half + 10, 20], to: [half - 10, 20], w: 4, rail: true });
      add('shed', 0, 8, 0);
      add('tower', 30, 2, 0, 0.7);
      row('lamp', -40, 14, 40, 14, 5, 0);
      scatter('rock', 0, -80, 150, 26);
      scatter('bush', 0, -60, 150, 10);
      add('car', -30, 0, 0.2);
      row('person', -10, 10, 20, 10, 3, 2);
      break;
    }
    case 'snow_village': {
      env.snow = true;
      env.water = { kind: 'lake', x: 60, z: -40, r: 70 };
      scatter('pine', -60, 60, 90, 30, (x, z) => Math.hypot(x - 60, z + 40) < 75);
      row('house', -70, -20, -20, 20, 7, 5);
      row('house', -30, 40, 30, 60, 5, 5);
      row('lamp', -60, 0, 0, 30, 4, 0);
      row('person', -40, 10, 0, 30, 3, 2);
      break;
    }
    case 'night_market': {
      env.roads.push({ from: [-100, 0], to: [100, 0], w: 6 });
      row('shed', -90, -10, 90, -10, 8, 1);
      row('shed', -90, 10, 90, 10, 8, 1);
      row('lamp', -90, -4, 90, -4, 13, 0);
      row('lamp', -90, 4, 90, 4, 13, 0);
      row('person', -90, 0, 90, 0, 24, 5);
      break;
    }
    case 'island': {
      env.water = { kind: 'island', r: 150 };
      env.hill = { x: 0, z: 0, r: 70, h: 30 };
      scatter('pine', 0, 0, 60, 16);
      scatter('tree', 0, 0, 120, 20, (x, z) => Math.hypot(x, z) < 55);
      row('house', -90, 40, -60, 90, 4, 4);
      add('lighthouse', 120, -60, 0);
      add('boat', 150, 40, 1);
      scatter('rock', 0, 0, 140, 12, (x, z) => Math.hypot(x, z) < 120);
      break;
    }
    case 'studio_lot': {
      env.roads.push({ from: [-100, -30], to: [100, -30], w: 6 }, { from: [-100, 30], to: [100, 30], w: 6 });
      row('shed', -80, -60, 80, -60, 4, 0);
      row('shed', -80, 60, 80, 60, 4, 0);
      row('house', -80, 0, 80, 0, 8, 1);
      row('car', -70, -24, 70, -24, 5, 0);
      row('person', -60, 0, 60, 6, 8, 3);
      break;
    }
    case 'courtyard': {
      add('house', 0, -14, 0, 1.4);
      add('house', -16, 0, Math.PI / 2, 1.1);
      add('house', 16, 0, -Math.PI / 2, 1.1);
      add('house', 0, 16, Math.PI, 1);
      add('tree', 0, 0, 0, 0.8);
      add('bench', 5, 3, 0);
      break;
    }
    case 'loft': {
      add('shed', 0, 0, 0);
      add('bench', -4, 2, 0);
      add('person', 3, -1, 0);
      break;
    }
    default:
      break; // blank
  }
  return { items, env };
}
// height of the ground at (x, z) for an env — the same on server and client
export function groundY(x, z, env) {
  let y = 0;
  if (env?.hill) {
    const d = Math.hypot(x - env.hill.x, z - env.hill.z);
    if (d < env.hill.r) y = Math.max(y, env.hill.h * (1 - d / env.hill.r) - 0.5);
  }
  if (env?.water?.kind === 'island') y = Math.hypot(x, z) < env.water.r ? 2.1 : 0.9;
  if (env?.water?.kind === 'sea' && x < env.water.at) y = 0.8;
  return y;
}
export const onWater = (x, z, env) => {
  const w = env?.water;
  if (!w) return false;
  if (w.kind === 'sea') return x < w.at;
  if (w.kind === 'lake') return Math.hypot(x - w.x, z - w.z) < w.r;
  if (w.kind === 'island') return Math.hypot(x, z) > w.r;
  if (w.kind === 'river') return Math.abs(x - riverX(w, z)) < w.w;
  return false;
};
