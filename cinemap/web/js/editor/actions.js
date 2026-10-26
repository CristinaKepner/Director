// Turns assistant steps into world edits: choose spots near water / roads / the hill / open
// ground, drop kits, clear things, move the clock or the weather.
const rand = (a, b) => a + Math.random() * (b - a);
export function spotsFor(env, near, count, existing) {
  const half = env.size / 2 - 12;
  const taken = (x, z) => existing.some((it) => Math.hypot(it.x - x, it.z - z) < 5);
  const out = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    let x, z;
    if (near === 'water' && env.water) {
      if (env.water.axis === 'x') {
        x = env.water.at + rand(4, 26);
        z = rand(-half * 0.6, half * 0.6);
      } else if (env.water.river) {
        z = rand(-half * 0.7, half * 0.7);
        x = env.water.x(z) + (Math.random() < 0.5 ? -1 : 1) * rand(env.water.w + 3, env.water.w + 16);
      } else if (env.water.lake) {
        const a = rand(0, Math.PI * 2);
        x = env.water.x + Math.cos(a) * (env.water.r + rand(4, 18));
        z = env.water.z + Math.sin(a) * (env.water.r + rand(4, 18));
      } else {
        const a = rand(0, Math.PI * 2);
        x = Math.cos(a) * (env.water.r - rand(6, 20));
        z = Math.sin(a) * (env.water.r - rand(6, 20));
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
      if (env.water?.axis === 'x' && x < env.water.at + 4) continue;
      if (env.water?.island && Math.hypot(x, z) > env.water.r - 8) continue;
    }
    if (Math.abs(x) > half || Math.abs(z) > half || taken(x, z) || out.some((o) => Math.hypot(o.x - x, o.z - z) < 5)) continue;
    out.push({ x, z });
  }
  return out;
}
export function waterSpots(env, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    if (env.water?.axis === 'x') out.push({ x: env.water.at - rand(12, 60), z: rand(-100, 100) });
    else if (env.water?.lake) out.push({ x: env.water.x + rand(-env.water.r * 0.5, env.water.r * 0.5), z: env.water.z + rand(-env.water.r * 0.5, env.water.r * 0.5) });
    else if (env.water?.island) {
      const a = rand(0, Math.PI * 2);
      out.push({ x: Math.cos(a) * (env.water.r + rand(15, 50)), z: Math.sin(a) * (env.water.r + rand(15, 50)) });
    } else if (env.water?.river) {
      const z = rand(-150, 150);
      out.push({ x: env.water.x(z), z });
    } else out.push({ x: rand(-60, 60), z: rand(-60, 60) });
  }
  return out;
}
