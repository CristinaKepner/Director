// Where to put things: near water / a road / the hill / open ground. Pure, shared by the
// server (agent steps) and the editor (quick placing).
import { riverX, onWater } from './worldgen.js';
const rand = (a, b) => a + Math.random() * (b - a);
export function spotsFor(env, near, count, existing, { water = false } = {}) {
  const half = env.size / 2 - 12;
  const taken = (x, z) => existing.some((it) => Math.hypot(it.x - x, it.z - z) < 5);
  const out = [];
  let guard = 0;
  const w = env.water;
  while (out.length < count && guard++ < count * 60) {
    let x, z;
    if (water) {
      if (!w) {
        x = rand(-60, 60);
        z = rand(-60, 60);
      } else if (w.kind === 'sea') {
        x = w.at - rand(12, 60);
        z = rand(-100, 100);
      } else if (w.kind === 'lake') {
        x = w.x + rand(-w.r * 0.5, w.r * 0.5);
        z = w.z + rand(-w.r * 0.5, w.r * 0.5);
      } else if (w.kind === 'island') {
        const a = rand(0, Math.PI * 2);
        x = Math.cos(a) * (w.r + rand(15, 50));
        z = Math.sin(a) * (w.r + rand(15, 50));
      } else {
        z = rand(-150, 150);
        x = riverX(w, z);
      }
    } else if (near === 'water' && w) {
      if (w.kind === 'sea') {
        x = w.at + rand(4, 26);
        z = rand(-half * 0.6, half * 0.6);
      } else if (w.kind === 'river') {
        z = rand(-half * 0.7, half * 0.7);
        x = riverX(w, z) + (Math.random() < 0.5 ? -1 : 1) * rand(w.w + 3, w.w + 16);
      } else if (w.kind === 'lake') {
        const a = rand(0, Math.PI * 2);
        x = w.x + Math.cos(a) * (w.r + rand(4, 18));
        z = w.z + Math.sin(a) * (w.r + rand(4, 18));
      } else {
        const a = rand(0, Math.PI * 2);
        x = Math.cos(a) * (w.r - rand(6, 20));
        z = Math.sin(a) * (w.r - rand(6, 20));
      }
    } else if (near === 'road' && env.roads.length) {
      const rd = env.roads[Math.floor(Math.random() * env.roads.length)];
      const t = Math.random();
      const px = rd.from[0] + (rd.to[0] - rd.from[0]) * t, pz = rd.from[1] + (rd.to[1] - rd.from[1]) * t;
      const dx = rd.to[0] - rd.from[0], dz = rd.to[1] - rd.from[1], len = Math.hypot(dx, dz) || 1;
      const side = Math.random() < 0.5 ? -1 : 1, off = rd.w / 2 + rand(3, 9);
      x = px + (-dz / len) * off * side;
      z = pz + (dx / len) * off * side;
    } else if (near === 'hill' && env.hill) {
      const a = rand(0, Math.PI * 2), d = rand(0, env.hill.r * 0.8);
      x = env.hill.x + Math.cos(a) * d;
      z = env.hill.z + Math.sin(a) * d;
    } else {
      x = rand(-half * 0.5, half * 0.5);
      z = rand(-half * 0.5, half * 0.5);
      if (onWater(x, z, env)) continue;
    }
    if (Math.abs(x) > half || Math.abs(z) > half || taken(x, z) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 5)) continue;
    if (!water && onWater(x, z, env)) continue;
    out.push({ x, z });
  }
  return out;
}
