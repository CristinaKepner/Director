// Spatial evidence: what the camera actually does over time, and where everything is on the floor.
// Pure math on the project state — no DOM, no node:, no store. The console's top-down panel, the
// `context.map` / `context.trajectory` Actions and the research RL environment all read from here,
// so a policy is scored on exactly the geometry the director sees.
import { cameraStateAt, entityStateAt, subjectPoint, fovFor, V } from "./motion.js";
import { ASPECTS, SHOT_SIZES } from "./schema.js";

const DEG = Math.PI / 180;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const round = (x, n = 4) => { const k = 10 ** n; return Math.round(x * k) / k; };

// Set dressing is never "the subject" and never blocks the lens from above: a ground plane is
// under everything, smoke is translucent.
const SEE_THROUGH = new Set(["environment", "smoke"]);
const GROUND_LIKE = (e) => e.semanticType === "environment" || (e.proxy?.dimensions?.[1] ?? 1) < 0.3;

export function shotTarget(d, shot) {
  const cam = d.cameras.find((c) => c.id === shot.cameraId) || d.cameras[0];
  const id = shot.targetIds?.[0] || cam?.target;
  return d.entities.find((e) => e.id === id) || null;
}

// ---- camera basis + projection ------------------------------------------------------------------
export function cameraBasis(cs) {
  const fwd = V.norm(V.sub(cs.lookAt, cs.position));
  let right = V.cross(fwd, [0, 1, 0]);
  if (V.len(right) < 1e-6) right = [1, 0, 0]; // looking straight down
  right = V.norm(right);
  const up = V.cross(right, fwd);
  return { fwd, right, up };
}

/** World point → normalised device coords. x,y in [-1,1] inside the frame; depth in metres along the lens. */
export function projectPoint(d, shot, frame, point, cs = cameraStateAt(d, shot, frame)) {
  const cam = d.cameras.find((c) => c.id === shot.cameraId) || d.cameras[0];
  const { fwd, right, up } = cameraBasis(cs);
  const v = V.sub(point, cs.position);
  const depth = dot(v, fwd);
  const hfov = fovFor(cs, cam) * DEG;
  const aspect = ASPECTS[d.project.aspect] || 16 / 9;
  const tx = Math.tan(hfov / 2), ty = tx / aspect;
  if (depth <= 1e-3) return { x: 0, y: 0, depth, visible: false, hfov, aspect };
  const x = dot(v, right) / (depth * tx), y = dot(v, up) / (depth * ty);
  return { x, y, depth, visible: Math.abs(x) <= 1 && Math.abs(y) <= 1, hfov, aspect };
}

// ---- occlusion: segment vs yaw-rotated boxes ------------------------------------------------------
function segmentHitsBox(a, b, ent, frame) {
  const st = entityStateAt(ent, frame);
  const dim = ent.proxy?.dimensions || [1, 1, 1];
  const c = [st.position[0], st.position[1] + dim[1] / 2, st.position[2]];
  const yaw = st.yaw || 0, cy = Math.cos(-yaw), sy = Math.sin(-yaw);
  const local = (p) => { const x = p[0] - c[0], z = p[2] - c[2]; return [x * cy + z * sy, p[1] - c[1], -x * sy + z * cy]; };
  const p0 = local(a), p1 = local(b), h = [dim[0] / 2, dim[1] / 2, dim[2] / 2];
  let t0 = 0, t1 = 1;
  for (let i = 0; i < 3; i++) {
    const dlt = p1[i] - p0[i];
    if (Math.abs(dlt) < 1e-9) { if (Math.abs(p0[i]) > h[i]) return null; continue; }
    let lo = (-h[i] - p0[i]) / dlt, hi = (h[i] - p0[i]) / dlt;
    if (lo > hi) [lo, hi] = [hi, lo];
    t0 = Math.max(t0, lo); t1 = Math.min(t1, hi);
    if (t0 > t1) return null;
  }
  return t0;
}

/** Which entity (if any) sits between the lens and the point it is supposed to see. */
export function occluderOf(d, from, to, frame, ignore = []) {
  let best = null;
  for (const e of d.entities) {
    if (ignore.includes(e.id) || SEE_THROUGH.has(e.semanticType) || e.hollow) continue;
    const t = segmentHitsBox(from, to, e, frame);
    if (t !== null && t > 1e-4 && t < 0.97 && (!best || t < best.t)) best = { id: e.id, t };
  }
  return best;
}

export function cameraInsideProxy(d, pos, frame = 0) {
  return d.entities.find((e) => {
    if (SEE_THROUGH.has(e.semanticType) || e.semanticType === "building" || e.hollow) return false;
    return segmentHitsBox(pos, [pos[0], pos[1] + 1e-3, pos[2]], e, frame) !== null
      && segmentHitsBox([pos[0], pos[1] + 1e-3, pos[2]], pos, e, frame) !== null;
  }) || null;
}

// ---- camera trajectory ----------------------------------------------------------------------------
/** Evaluated camera path for one shot, with what it means for the subject at every sample. */
export function cameraTrajectory(d, shot, { samples = 0, targetId = null } = {}) {
  const inF = shot.range.inFrame, outF = Math.max(inF + 1, shot.range.outFrame);
  const n = samples > 1 ? samples : outF - inF;
  const target = targetId ? d.entities.find((e) => e.id === targetId) : shotTarget(d, shot);
  const cam = d.cameras.find((c) => c.id === shot.cameraId) || d.cameras[0];
  const out = [];
  for (let i = 0; i < n; i++) {
    const frame = n === outF - inF ? inF + i : inF + ((outF - 1 - inF) * i) / Math.max(1, n - 1);
    const cs = cameraStateAt(d, shot, frame);
    if (!cs) continue;
    const { fwd } = cameraBasis(cs);
    const s = {
      frame: round(frame, 2), t: round((frame - inF) / d.project.fps, 4),
      position: [...cs.position], lookAt: [...cs.lookAt], // full precision: jerk is a third difference, rounding here shows up as noise
      yaw: round(Math.atan2(fwd[0], fwd[2]) / DEG, 3), pitch: round(Math.asin(clamp(fwd[1], -1, 1)) / DEG, 3),
      focalLength: round(cs.focalLength, 3), hfov: round(fovFor(cs, cam), 3), roll: round(cs.roll || 0, 5),
    };
    if (target) {
      const aim = subjectPoint(target, frame, shot.size || cam?.preset);
      const dim = target.proxy?.dimensions || [1, 1, 1];
      const p = projectPoint(d, shot, frame, aim, cs);
      const dist = V.len(V.sub(aim, cs.position));
      const angR = Math.atan2(Math.max(0.25, Math.max(...dim) / 2), Math.max(0.1, p.depth));
      const occ = occluderOf(d, cs.position, aim, frame, [target.id]);
      s.subject = {
        id: target.id, point: aim, x: round(p.x), y: round(p.y), depth: round(p.depth), distance: round(dist),
        inFrame: p.visible, fill: p.depth > 0 ? round(Math.min(1, (2 * angR) / (p.hfov || 1))) : 0,
        // vertical share of the frame the subject's height takes: the number a shot size is really about
        heightFill: p.depth > 0 ? round(Math.min(10, dim[1] / (2 * p.depth * Math.tan(p.hfov / 2) / p.aspect))) : 0,
        occludedBy: occ?.id || null,
      };
    }
    out.push(s);
  }
  return out;
}

const angDiff = (a, b) => { let x = a - b; while (x > 180) x -= 360; while (x < -180) x += 360; return x; };

/** Kinematics of a sampled trajectory, decomposed in the camera's own starting frame. */
export function trajectoryKinematics(tr, fps = 24) {
  if (tr.length < 2) return { samples: tr.length, duration: 0, pathLength: 0, speedMean: 0, speedMax: 0, accelMax: 0, jerkRms: 0, dolly: 0, truck: 0, pedestal: 0, yawChange: 0, pitchChange: 0, focalRatio: 1, orbitDeg: 0, shake: 0, distanceChange: 0 };
  const dt = (i) => Math.max(1e-6, tr[i].t - tr[i - 1].t);
  const vel = [], speed = [];
  let pathLength = 0;
  for (let i = 1; i < tr.length; i++) {
    const dp = V.sub(tr[i].position, tr[i - 1].position);
    pathLength += V.len(dp);
    vel.push(V.scale(dp, 1 / dt(i))); speed.push(V.len(dp) / dt(i));
  }
  const acc = [], jerk = [];
  for (let i = 1; i < vel.length; i++) acc.push(V.scale(V.sub(vel[i], vel[i - 1]), 1 / dt(i)));
  for (let i = 1; i < acc.length; i++) jerk.push(V.len(V.sub(acc[i], acc[i - 1])) / dt(i));
  const a = tr[0], b = tr[tr.length - 1];
  const basis = cameraBasis(a);
  const net = V.sub(b.position, a.position);
  let yawChange = 0, pitchChange = 0, orbit = 0;
  for (let i = 1; i < tr.length; i++) {
    yawChange += angDiff(tr[i].yaw, tr[i - 1].yaw); pitchChange += tr[i].pitch - tr[i - 1].pitch;
    // bearing of the camera as seen from its subject (or, with no subject, the point it looks at)
    const br = (s) => { const c = s.subject?.point || s.lookAt; return Math.atan2(s.position[0] - c[0], s.position[2] - c[2]) / DEG; };
    orbit += angDiff(br(tr[i]), br(tr[i - 1]));
  }
  // shake = how far the path wanders off the straight chord between its ends
  const chord = V.len(net) || 1e-9;
  let dev = 0;
  for (const s of tr) { const v = V.sub(s.position, a.position); const along = dot(v, net) / chord; dev = Math.max(dev, V.len(V.sub(v, V.scale(net, along / chord)))); }
  const rms = (xs) => (xs.length ? Math.sqrt(xs.reduce((m, x) => m + x * x, 0) / xs.length) : 0);
  return {
    samples: tr.length, duration: round(b.t - a.t, 3), pathLength: round(pathLength),
    speedMean: round(pathLength / Math.max(1e-6, b.t - a.t)), speedMax: round(Math.max(...speed)),
    accelMax: round(acc.length ? Math.max(...acc.map(V.len)) : 0), jerkRms: round(rms(jerk), 3),
    dolly: round(dot(net, basis.fwd)), truck: round(dot(net, basis.right)), pedestal: round(net[1]),
    yawChange: round(yawChange, 3), pitchChange: round(pitchChange, 3),
    focalRatio: round(b.focalLength / (a.focalLength || 1)),
    orbitDeg: round(orbit, 3), shake: round(dev),
    distanceChange: a.subject && b.subject ? round(b.subject.distance - a.subject.distance) : 0,
    distanceMean: round(tr.reduce((m, s) => m + (s.subject?.distance ?? V.len(V.sub(s.lookAt, s.position))), 0) / tr.length),
  };
}

/**
 * Name the move from what the camera did, not from what the shot says it does.
 * Returns the same vocabulary as MOTION_TYPES so a declared move can be checked against an evaluated one.
 */
export function classifyMove(k) {
  const still = k.pathLength < 0.08 && Math.abs(k.yawChange) < 1.5 && Math.abs(k.pitchChange) < 1.5;
  const zoom = Math.abs(Math.log(k.focalRatio || 1)) > 0.08;
  if (still) return { type: zoom ? "zoom" : "static", confidence: 0.9 };
  const horiz = Math.hypot(k.dolly, k.truck), total = Math.hypot(horiz, k.pedestal) || 1e-9;
  if (k.pathLength < 0.25 && k.shake > 0 && k.pathLength / Math.max(0.02, Math.hypot(k.dolly, k.truck, k.pedestal)) > 3) return { type: "handheld", confidence: 0.7 };
  // A truck past a subject the camera keeps watching sweeps the same bearing as an orbit and ends at the
  // same distance it started. What tells them apart is the path: an arc bulges off its chord, a rail does not.
  const sagitta = (k.distanceMean || 0) * (1 - Math.cos((Math.abs(k.orbitDeg) / 2) * DEG));
  if (Math.abs(k.orbitDeg) > 20 && k.shake > 0.5 * sagitta && Math.abs(k.distanceChange) < 0.35 * Math.max(1, horiz)) return { type: "orbit", confidence: clamp(Math.abs(k.orbitDeg) / 90, 0.5, 0.95) };
  if (total < 0.15 && Math.abs(k.yawChange) > 4) return { type: "pan", confidence: 0.85 };
  if (total < 0.15 && Math.abs(k.pitchChange) > 4) return { type: "tilt", confidence: 0.85 };
  const share = { dolly: Math.abs(k.dolly) / total, truck: Math.abs(k.truck) / total, pedestal: Math.abs(k.pedestal) / total };
  const [axis, s] = Object.entries(share).sort((x, y) => y[1] - x[1])[0];
  if (axis === "pedestal") return { type: Math.abs(k.pedestal) > 3 ? "crane" : "pedestal", confidence: round(s, 2), direction: k.pedestal > 0 ? "up" : "down" };
  if (axis === "truck") return { type: "truck", confidence: round(s, 2), direction: k.truck > 0 ? "right" : "left" };
  if (k.dolly > 0) return { type: zoom && k.focalRatio > 1 ? "push-in" : zoom ? "dolly-zoom" : "dolly-in", confidence: round(s, 2) };
  return { type: zoom && k.focalRatio > 1 ? "dolly-zoom" : "dolly-out", confidence: round(s, 2) };
}

/** Framing over the whole shot: is the subject there, how big, where, and can the lens see it. */
export function framingReport(tr) {
  const ss = tr.map((s) => s.subject).filter(Boolean);
  if (!ss.length) return null;
  const mean = (f) => ss.reduce((m, s) => m + f(s), 0) / ss.length;
  const occluders = [...new Set(ss.map((s) => s.occludedBy).filter(Boolean))];
  return {
    subjectId: ss[0].id,
    inFrameRatio: round(mean((s) => (s.inFrame ? 1 : 0)), 3),
    occludedRatio: round(mean((s) => (s.occludedBy ? 1 : 0)), 3), occluders,
    fillMean: round(mean((s) => s.fill), 3), heightFillMean: round(mean((s) => s.heightFill), 3),
    heightFillStart: ss[0].heightFill, heightFillEnd: ss[ss.length - 1].heightFill,
    xMean: round(mean((s) => s.x), 3), yMean: round(mean((s) => s.y), 3),
    xStart: ss[0].x, xEnd: ss[ss.length - 1].x,
    distanceStart: ss[0].distance, distanceEnd: ss[ss.length - 1].distance,
  };
}

// Share of the frame height a standing subject takes at each shot size. Derived from the same
// table camera.frame places cameras with, so "MCU" means one thing everywhere.
export function expectedHeightFill(size, sensorWidth = 36, aspect = 16 / 9) {
  const S = SHOT_SIZES[size];
  if (!S) return null;
  if (CANONICAL_HEIGHT_FILL[size]) return CANONICAL_HEIGHT_FILL[size];
  return 1 / (2 * S.distance * (sensorWidth / (2 * S.focal)) / aspect);
}
// The shipped table is not monotonic: MS (2.9 × height at 35 mm) frames a standing person at 0.60 of
// frame height — WIDER than MLS at 0.77. Scoring against that would teach a policy that a medium shot
// is a full shot, so the scorer uses the conventional waist-up value and the table is left as it ships.
export const CANONICAL_HEIGHT_FILL = { MS: 1.25 };
export function sizeFromHeightFill(hf, aspect = 16 / 9) {
  let best = null;
  for (const k of Object.keys(SHOT_SIZES)) { const e = Math.abs(Math.log(hf / expectedHeightFill(k, 36, aspect))); if (!best || e < best.e) best = { k, e }; }
  return best?.k || null;
}

// ---- top-down map -------------------------------------------------------------------------------
export const MAP_CHANNELS = ["static", "characters", "vehicles", "subject", "camera_path", "view_cone", "entity_paths", "lights"];

function footprint(ent, frame) {
  const st = entityStateAt(ent, frame);
  const dim = ent.proxy?.dimensions || [1, 1, 1];
  const round_ = ["cylinder", "sphere", "cone"].includes(ent.proxy?.geometry);
  return { id: ent.id, name: ent.displayName || ent.id, type: ent.semanticType, x: st.position[0], z: st.position[2], yaw: st.yaw || 0, w: dim[0], d: dim[2], h: dim[1], round: round_, ground: GROUND_LIKE(ent) };
}

export function worldBounds(d, { shot = null, pad = 2, subjectId = null } = {}) {
  const xs = [], zs = [];
  const add = (x, z, r = 0) => { xs.push(x - r, x + r); zs.push(z - r, z + r); };
  const paths = (shot ? [shot] : d.shots).map((s) => cameraTrajectory(d, s, { samples: 8, targetId: subjectId }));
  for (const tr of paths) for (const p of tr) add(p.position[0], p.position[2], 0.3);
  // One shot: frame the action, not the whole street — the subject, the camera path, and whatever
  // stands near enough to matter (it could block the lens or be walked into).
  const subj = shot ? (subjectId ? d.entities.find((e) => e.id === subjectId) : shotTarget(d, shot)) : null;
  const sp = subj ? entityStateAt(subj, shot.range.inFrame).position : null;
  const reach = sp ? Math.max(5, 1.4 * Math.max(0, ...paths[0].map((p) => Math.hypot(p.position[0] - sp[0], p.position[2] - sp[2])))) : Infinity;
  for (const e of d.entities) {
    if (GROUND_LIKE(e) || (e.semanticType === "building" && shot)) continue;
    const f = footprint(e, 0);
    if (sp && Math.hypot(f.x - sp[0], f.z - sp[2]) > reach) continue;
    add(f.x, f.z, Math.max(f.w, f.d) / 2);
    for (const k of e.path || []) if (k.position) add(k.position[0], k.position[2]);
  }
  if (!xs.length) return { minX: -10, maxX: 10, minZ: -10, maxZ: 10 };
  let minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad, minZ = Math.min(...zs) - pad, maxZ = Math.max(...zs) + pad;
  const span = Math.max(maxX - minX, maxZ - minZ), cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2; // square, so the grid is isotropic
  return { minX: cx - span / 2, maxX: cx + span / 2, minZ: cz - span / 2, maxZ: cz + span / 2 };
}

/**
 * The floor plan a director would sketch: who stands where, where the camera travels, what it sees.
 * Returns vector layers (for drawing) and, when `size` is given, a [C,H,W] raster (for a policy).
 * Row 0 is +Z far edge → rows grow toward the viewer; column 0 is -X. Same orientation as the SVG.
 */
export function topDownMap(d, { shotId = null, frame = null, size = 0, bounds = null, samples = 48, subjectId = null } = {}) {
  const shot = d.shots.find((s) => s.id === (shotId || d.project.currentShotId)) || d.shots[0] || null;
  const f = frame ?? (shot ? shot.range.inFrame : 0);
  const B = bounds || worldBounds(d, { shot, subjectId });
  const target = subjectId ? d.entities.find((e) => e.id === subjectId) || null : shot ? shotTarget(d, shot) : null;
  const entities = d.entities.map((e) => ({ ...footprint(e, f), subject: e.id === target?.id }));
  const paths = d.entities.filter((e) => e.path?.length > 1).map((e) => ({ id: e.id, points: e.path.map((k) => [k.position[0], k.position[2], k.frame]) }));
  const tr = shot ? cameraTrajectory(d, shot, { samples, targetId: target?.id || null }) : [];
  const cone = (s, reach) => {
    const half = (s.hfov / 2) * DEG, y = s.yaw * DEG;
    const p = [s.position[0], s.position[2]];
    const edge = (a) => [p[0] + Math.sin(y + a) * reach, p[1] + Math.cos(y + a) * reach];
    return [p, edge(-half), edge(half)];
  };
  const reach = (s) => clamp((s.subject?.distance || 6) * 1.6, 3, (B.maxX - B.minX) * 0.9);
  const at = tr.length ? tr.reduce((m, s) => (Math.abs(s.frame - f) < Math.abs(m.frame - f) ? s : m), tr[0]) : null;
  const map = {
    shotId: shot?.id || null, frame: f, bounds: B, metresPerCell: size ? round((B.maxX - B.minX) / size, 4) : null,
    entities,
    entityPaths: paths,
    camera: tr.length ? {
      id: shot.cameraId, path: tr.map((s) => [s.position[0], s.position[2], s.t]), look: tr.map((s) => [s.lookAt[0], s.lookAt[2]]),
      heights: tr.map((s) => s.position[1]), cones: [tr[0], at, tr[tr.length - 1]].map((s) => ({ frame: s.frame, points: cone(s, reach(s)) })),
    } : null,
    otherCameras: d.cameras.filter((c) => c.id !== shot?.cameraId).map((c) => ({ id: c.id, name: c.name, x: c.pose.position[0], z: c.pose.position[2] })),
    lights: d.lights.filter((l) => l.position).map((l) => ({ id: l.id, x: l.position[0], z: l.position[2], group: l.group, on: l.enabled !== false })),
  };
  if (size) map.raster = rasterize(map, size);
  return map;
}

function rasterize(map, N) {
  const C = MAP_CHANNELS.length, data = new Float32Array(C * N * N);
  const B = map.bounds, sx = N / (B.maxX - B.minX), sz = N / (B.maxZ - B.minZ);
  const col = (x) => (x - B.minX) * sx, row = (z) => (B.maxZ - z) * sz;
  const put = (c, r, q, v) => { r = Math.floor(r); q = Math.floor(q); if (r >= 0 && r < N && q >= 0 && q < N) { const i = c * N * N + r * N + q; if (v > data[i]) data[i] = v; } };
  const ch = (name) => MAP_CHANNELS.indexOf(name);
  for (const e of map.entities) {
    if (e.ground) continue;
    const c = e.subject ? ch("subject") : e.type === "character" ? ch("characters") : e.type === "vehicle" ? ch("vehicles") : ch("static");
    const v = e.subject || c !== ch("static") ? 1 : clamp(e.h / 12, 0.15, 1); // static: taller reads brighter
    const R = Math.hypot(e.w, e.d) / 2, cy = Math.cos(-e.yaw), sy = Math.sin(-e.yaw);
    for (let r = Math.floor(row(e.z + R)); r <= row(e.z - R); r++) for (let q = Math.floor(col(e.x - R)); q <= col(e.x + R); q++) {
      const wx = B.minX + (q + 0.5) / sx - e.x, wz = B.maxZ - (r + 0.5) / sz - e.z;
      const lx = wx * cy + wz * sy, lz = -wx * sy + wz * cy;
      const inside = e.round ? (lx / Math.max(e.w / 2, 0.5 / sx)) ** 2 + (lz / Math.max(e.d / 2, 0.5 / sz)) ** 2 <= 1 : Math.abs(lx) <= Math.max(e.w / 2, 0.5 / sx) && Math.abs(lz) <= Math.max(e.d / 2, 0.5 / sz);
      if (inside) put(c, r, q, v);
    }
  }
  const line = (c, a, b, va, vb) => { const n = Math.max(2, Math.ceil(Math.hypot(col(b[0]) - col(a[0]), row(b[1]) - row(a[1])) * 2)); for (let i = 0; i <= n; i++) { const t = i / n; put(c, row(a[1] + (b[1] - a[1]) * t), col(a[0] + (b[0] - a[0]) * t), va + (vb - va) * t); } };
  if (map.camera) {
    const p = map.camera.path, T = p[p.length - 1][2] || 1;
    // time-coded: 0.2 at the first frame → 1.0 at the last, so direction of travel is in the pixels
    for (let i = 1; i < p.length; i++) line(ch("camera_path"), p[i - 1], p[i], 0.2 + 0.8 * (p[i - 1][2] / T), 0.2 + 0.8 * (p[i][2] / T));
    if (p.length === 1 || Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 1e-6) put(ch("camera_path"), row(p[0][1]), col(p[0][0]), 1);
    const tri = map.camera.cones[1].points, [o, l, r_] = tri;
    const sign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
    for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
      const w = [B.minX + (q + 0.5) / sx, B.maxZ - (r + 0.5) / sz];
      const d1 = sign(w, o, l), d2 = sign(w, l, r_), d3 = sign(w, r_, o);
      if (!((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0))) put(ch("view_cone"), r, q, 1);
    }
  }
  for (const ep of map.entityPaths) { const T = ep.points[ep.points.length - 1][2] || 1; for (let i = 1; i < ep.points.length; i++) line(ch("entity_paths"), ep.points[i - 1], ep.points[i], 0.2 + 0.8 * (ep.points[i - 1][2] / T), 0.2 + 0.8 * (ep.points[i][2] / T)); }
  for (const l of map.lights) put(ch("lights"), row(l.z), col(l.x), l.on ? 1 : 0.3);
  return { channels: MAP_CHANNELS, size: N, data };
}

const TYPE_FILL = { character: "#d9c3a0", vehicle: "#4f86b3", building: "#3a3d46", prop: "#8a7a5a", weapon: "#b05c5c", tree: "#3f5d3a", lamp: "#c9b27a", flower: "#8a4d6d", smoke: "#77777755", environment: "#1b1e24" };

/** The same map as a picture. Self-contained SVG: drops into the console, a notebook, or a VLM prompt. */
export function mapToSvg(map, { px = 480, labels = true, theme = "dark" } = {}) {
  const B = map.bounds, W = B.maxX - B.minX, k = px / W;
  const X = (x) => round((x - B.minX) * k, 1), Z = (z) => round((B.maxZ - z) * k, 1);
  const ink = theme === "dark" ? "#e9e6df" : "#1b1e24", bg = theme === "dark" ? "#0b0c10" : "#f6f4ef", grid = theme === "dark" ? "#ffffff12" : "#00000012";
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${px}" width="${px}" height="${px}" font-family="ui-sans-serif,system-ui" font-size="10">`, `<rect width="${px}" height="${px}" fill="${bg}"/>`];
  const step = W > 60 ? 10 : W > 24 ? 5 : W > 8 ? 2 : 1;
  for (let g = Math.ceil(B.minX / step) * step; g <= B.maxX; g += step) out.push(`<line x1="${X(g)}" y1="0" x2="${X(g)}" y2="${px}" stroke="${grid}"/>`);
  for (let g = Math.ceil(B.minZ / step) * step; g <= B.maxZ; g += step) out.push(`<line x1="0" y1="${Z(g)}" x2="${px}" y2="${Z(g)}" stroke="${grid}"/>`);
  if (map.camera) {
    const cones = map.camera.cones;
    cones.forEach((c, i) => out.push(`<polygon points="${c.points.map((p) => `${X(p[0])},${Z(p[1])}`).join(" ")}" fill="${i === 1 ? "#ffd59a22" : "none"}" stroke="#ffd59a" stroke-opacity="${i === 1 ? 0.7 : 0.25}" stroke-dasharray="${i === 1 ? "" : "3 3"}"/>`));
  }
  for (const e of [...map.entities].sort((a, b) => (a.ground ? -1 : 0) - (b.ground ? -1 : 0))) {
    if (e.ground) continue;
    const fill = TYPE_FILL[e.type] || "#777", stroke = e.subject ? "#ff5f8a" : "none", sw = e.subject ? 2 : 0;
    const w = Math.max(3, e.w * k), h = Math.max(3, e.d * k);
    out.push(e.round
      ? `<ellipse cx="${X(e.x)}" cy="${Z(e.z)}" rx="${round(w / 2, 1)}" ry="${round(h / 2, 1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"><title>${esc(e.name)}</title></ellipse>`
      : `<rect x="${round(-w / 2, 1)}" y="${round(-h / 2, 1)}" width="${round(w, 1)}" height="${round(h, 1)}" transform="translate(${X(e.x)} ${Z(e.z)}) rotate(${round(e.yaw / DEG, 1)})" fill="${fill}" fill-opacity="${e.type === "building" ? 0.55 : 0.9}" stroke="${stroke}" stroke-width="${sw}"><title>${esc(e.name)}</title></rect>`);
    if (e.type === "character" || e.type === "vehicle") { // facing tick (+Z after yaw)
      const len = Math.max(e.w, e.d) * 0.8;
      out.push(`<line x1="${X(e.x)}" y1="${Z(e.z)}" x2="${X(e.x + Math.sin(e.yaw) * len)}" y2="${Z(e.z + Math.cos(e.yaw) * len)}" stroke="${ink}" stroke-opacity=".6"/>`);
    }
    if (labels && (e.subject || e.type === "character" || e.type === "vehicle")) out.push(`<text x="${X(e.x) + 6}" y="${Z(e.z) - 6}" fill="${ink}" fill-opacity=".8">${esc(e.name)}</text>`);
  }
  for (const ep of map.entityPaths) out.push(`<polyline points="${ep.points.map((p) => `${X(p[0])},${Z(p[1])}`).join(" ")}" fill="none" stroke="#7fd1b9" stroke-dasharray="4 3" stroke-opacity=".8"/>`);
  for (const l of map.lights) out.push(`<path d="M${X(l.x) - 4} ${Z(l.z)}h8M${X(l.x)} ${Z(l.z) - 4}v8" stroke="#ffe08a" stroke-opacity="${l.on ? 0.9 : 0.3}"/>`);
  for (const c of map.otherCameras) out.push(`<rect x="${X(c.x) - 3}" y="${Z(c.z) - 3}" width="6" height="6" fill="none" stroke="${ink}" stroke-opacity=".35"><title>${esc(c.name || c.id)}</title></rect>`);
  if (map.camera) {
    const p = map.camera.path;
    for (let i = 1; i < p.length; i++) out.push(`<line x1="${X(p[i - 1][0])}" y1="${Z(p[i - 1][1])}" x2="${X(p[i][0])}" y2="${Z(p[i][1])}" stroke="#5fb0ff" stroke-width="2.2" stroke-opacity="${round(0.3 + 0.7 * (i / (p.length - 1)), 2)}" stroke-linecap="round"/>`);
    const a = p[0], b = p[p.length - 1], at = map.camera.cones[1].points[0];
    out.push(`<circle cx="${X(a[0])}" cy="${Z(a[1])}" r="3.5" fill="none" stroke="#5fb0ff"/>`, `<circle cx="${X(b[0])}" cy="${Z(b[1])}" r="3.5" fill="#5fb0ff"/>`, `<circle cx="${X(at[0])}" cy="${Z(at[1])}" r="5" fill="none" stroke="#ffd59a" stroke-width="1.5"/>`);
  }
  out.push(`<text x="8" y="${px - 8}" fill="${ink}" fill-opacity=".5">${round(W, 1)} m · grid ${step} m · +Z up</text>`, "</svg>");
  return out.join("");
}

/** The same map for a text-only policy. One character per cell; later layers win. */
export function mapToAscii(map, N = 32) {
  const m = map.raster?.size === N ? map : { ...map, raster: rasterize(map, N) };
  const { data } = m.raster, at = (c, r, q) => data[c * N * N + r * N + q];
  const glyph = [["static", "#"], ["entity_paths", ":"], ["view_cone", "·"], ["vehicles", "V"], ["characters", "o"], ["lights", "*"], ["camera_path", "c"], ["subject", "S"]];
  const rows = [];
  for (let r = 0; r < N; r++) {
    let s = "";
    for (let q = 0; q < N; q++) { let g = " "; for (const [name, ch] of glyph) if (at(MAP_CHANNELS.indexOf(name), r, q) > 0) g = name === "static" && at(MAP_CHANNELS.indexOf("view_cone"), r, q) > 0 ? "#" : ch; s += g; }
    rows.push(s);
  }
  if (m.camera) { // mark the camera's end point so direction is readable
    const B = m.bounds, p = m.camera.path[m.camera.path.length - 1];
    const r = Math.floor(((B.maxZ - p[1]) / (B.maxZ - B.minZ)) * N), q = Math.floor(((p[0] - B.minX) / (B.maxX - B.minX)) * N);
    if (rows[r]) rows[r] = rows[r].slice(0, q) + "C" + rows[r].slice(q + 1);
  }
  return rows.join("\n");
}
