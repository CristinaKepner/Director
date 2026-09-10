// Motion system: evaluates camera / entity / light state at a frame. Pure math, engine-agnostic.
import { MOTION_TYPES, SHOT_SIZES, focalToFov, clamp } from "./schema.js";

const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
};
export { V };

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1, 2].map((i) => 0.5 * (2 * p1[i] + (-p0[i] + p2[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 + (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3));
}

// Evaluate a keyframe list [{frame, position, ...}] at frame. Returns interpolated object.
export function sampleKeyframes(keys, frame, fields = ["position"]) {
  if (!keys || keys.length === 0) return null;
  const ks = [...keys].sort((a, b) => a.frame - b.frame);
  if (frame <= ks[0].frame) return { ...ks[0] };
  if (frame >= ks[ks.length - 1].frame) return { ...ks[ks.length - 1] };
  let i = 0;
  while (i < ks.length - 1 && ks[i + 1].frame < frame) i++;
  const a = ks[i], b = ks[i + 1];
  const span = Math.max(1, b.frame - a.frame);
  const raw = (frame - a.frame) / span;
  const t = a.ease === "linear" ? raw : easeInOut(raw);
  const out = { frame };
  for (const f of fields) {
    const av = a[f], bv = b[f];
    if (av == null && bv == null) continue;
    if (Array.isArray(av) && Array.isArray(bv)) {
      const same = av.length === bv.length && av.every((v, k) => Math.abs(v - bv[k]) < 1e-9);
      if (same) out[f] = [...av]; // dwell: hold, never let the spline drift through a rest
      else if (f === "position" && ks.length >= 3 && a.ease !== "linear") {
        const p0 = ks[Math.max(0, i - 1)].position, p3 = ks[Math.min(ks.length - 1, i + 2)].position;
        out[f] = catmull(p0, av, bv, p3, t);
      } else out[f] = V.lerp(av, bv, t);
    } else if (typeof av === "number" && typeof bv === "number") out[f] = av + (bv - av) * t;
    else out[f] = t < 0.5 ? av : bv;
  }
  return out;
}

// Entity world position/yaw at frame (path aware).
export function entityStateAt(ent, frame) {
  if (ent.path && ent.path.length > 0) {
    const s = sampleKeyframes(ent.path, frame, ["position", "yaw"]);
    return { position: s.position || ent.transform.position, yaw: s.yaw ?? ent.transform.rotation[1] };
  }
  return { position: ent.transform.position, yaw: ent.transform.rotation[1] };
}

export function lightStateAt(light, frame) {
  if (light.keyframes && light.keyframes.length) {
    const s = sampleKeyframes(light.keyframes, frame, ["intensity"]);
    return { intensity: s.intensity ?? light.intensity, color: s.color || light.color };
  }
  return { intensity: light.enabled === false ? 0 : light.intensity, color: light.color };
}

export function subjectPoint(ent, frame, preset) {
  if (!ent) return [0, 1, 0];
  const st = entityStateAt(ent, frame);
  const h = ent.proxy?.dimensions?.[1] || 1;
  const aim = SHOT_SIZES[preset]?.aim;
  let y;
  if (ent.semanticType === "character") y = st.position[1] + h * (aim ?? 0.55);
  else if (ent.semanticType === "building") y = st.position[1] + h * 0.3;
  else if (ent.semanticType === "weapon") y = st.position[1];
  else y = st.position[1] + h * (aim ? Math.min(aim, 0.5) : 0.35);
  return [st.position[0], y, st.position[2]];
}

// Main: camera rig state for a shot at a frame.
// returns { position, lookAt, focalLength, roll }
export function cameraStateAt(d, shot, frame) {
  const cam = d.cameras.find((c) => c.id === shot.cameraId) || d.cameras[0];
  if (!cam) return null;
  const inF = shot.range.inFrame, outF = shot.range.outFrame;
  const span = Math.max(1, outF - inF);
  const k = clamp((frame - inF) / span, 0, 1);
  const e = easeInOut(k);
  const targetId = shot.targetIds?.[0] || cam.target;
  const targetEnt = d.entities.find((x) => x.id === targetId);
  const focal0 = shot.lens?.focalLength || cam.lens.focalLength;
  const base = [...(shot.cameraPose?.position || cam.pose.position)];
  const target = subjectPoint(targetEnt, frame, cam.preset);

  // Explicit keyframes win.
  if (shot.keyframes && shot.keyframes.length >= 2) {
    const s = sampleKeyframes(shot.keyframes, frame, ["position", "lookAt", "focalLength", "roll"]);
    return { position: s.position || base, lookAt: s.lookAt || target, focalLength: s.focalLength || focal0, roll: s.roll || 0, k };
  }
  if (shot.keyframes && shot.keyframes.length === 1) {
    const s = shot.keyframes[0];
    return { position: s.position || base, lookAt: s.lookAt || target, focalLength: s.focalLength || focal0, roll: 0, k };
  }

  const type = shot.motion?.type || "static";
  const p = { ...(MOTION_TYPES[type]?.params || {}), ...(shot.motion?.params || {}) };
  let pos = base, look = target, focal = focal0, roll = 0;
  const toT = V.sub(target, base);
  const dist = V.len(toT) || 4;
  const dir = V.norm(toT);
  const right = V.norm(V.cross(dir, [0, 1, 0]));

  switch (type) {
    case "dolly-in":
      pos = V.lerp(base, V.sub(target, V.scale(dir, Math.max(1.2, dist * (1 - (p.amount ?? 0.55))))), e);
      break;
    case "dolly-out":
      pos = V.lerp(base, V.sub(base, V.scale(dir, dist * (p.amount ?? 0.6))), e);
      break;
    case "push-in":
      pos = V.lerp(base, V.sub(target, V.scale(dir, Math.max(1.4, dist * (1 - (p.amount ?? 0.35))))), e);
      focal = focal0 * (1 + 0.18 * e);
      break;
    case "dolly-zoom": {
      const newDist = dist * (1 - (p.amount ?? 0.5) * e);
      pos = V.sub(target, V.scale(dir, newDist));
      focal = focal0 * (dist / newDist) * (dist / newDist) ** -0.5 * (newDist / dist) ** 0 * (dist / newDist); // keeps subject size ~constant
      break;
    }
    case "truck":
      pos = V.add(base, V.scale(right, (e - 0.5) * (p.distance ?? 3)));
      break;
    case "pedestal":
      pos = [base[0], base[1] + (e - 0.5) * (p.distance ?? 1.5), base[2]];
      break;
    case "pan": {
      const a = ((p.degrees ?? 45) * Math.PI) / 180;
      const ang = (e - 0.5) * a;
      const rx = dir[0] * Math.cos(ang) - dir[2] * Math.sin(ang);
      const rz = dir[0] * Math.sin(ang) + dir[2] * Math.cos(ang);
      look = V.add(base, V.scale([rx, dir[1], rz], dist));
      break;
    }
    case "orbit": {
      const radius = Math.hypot(base[0] - target[0], base[2] - target[2]) || 4;
      const a0 = Math.atan2(base[2] - target[2], base[0] - target[0]);
      const a = a0 + e * (((p.degrees ?? 150) * Math.PI) / 180);
      pos = [target[0] + Math.cos(a) * radius, base[1], target[2] + Math.sin(a) * radius];
      break;
    }
    case "chase": {
      const off = p.offset || [1.4, 0.4, -4.2];
      const st = entityStateAt(targetEnt || { transform: { position: target, rotation: [0, 0, 0] } }, frame);
      const yaw = st.yaw || 0;
      // offset in the subject's local frame (subject faces +Z after yaw rotation)
      const lx = off[0] * Math.cos(yaw) + off[2] * Math.sin(yaw);
      const lz = -off[0] * Math.sin(yaw) + off[2] * Math.cos(yaw);
      pos = [target[0] + lx, Math.max(0.25, base[1]), target[2] + lz];
      pos[0] += Math.sin(frame * 0.35) * 0.02;
      pos[1] += Math.sin(frame * 0.5) * 0.015;
      break;
    }
    case "crane":
      pos = [base[0], base[1] + e * (p.rise ?? 8), base[2] - e * 2.5];
      break;
    case "drone":
      pos = V.lerp([base[0] - 10, p.height ?? 14, base[2] - 18], base, e);
      break;
    case "handheld": {
      const s = p.shake ?? 0.03;
      pos = [base[0] + Math.sin(frame * 0.9) * s + Math.sin(frame * 2.3) * s * 0.4, base[1] + Math.sin(frame * 1.3) * s * 0.7, base[2] + Math.cos(frame * 0.7) * s * 0.5];
      roll = Math.sin(frame * 0.4) * 0.004;
      break;
    }
    default:
      pos = [base[0], base[1] + Math.sin(frame * 0.12) * 0.004, base[2]];
  }
  return { position: pos, lookAt: look, focalLength: focal, roll, k };
}

export function fovFor(state, cam) {
  return focalToFov(state?.focalLength || cam?.lens?.focalLength || 35, cam?.lens?.sensorWidth || 36);
}

// Simple humanoid walk cycle applied on top of pose joints when the entity travels along a path.
export function gaitOffsets(ent, frame) {
  if (!ent.path || ent.path.length < 2) return null;
  const s = Math.sin(frame * 0.45);
  const speed = ent.pose === "run" ? 1.6 : 1;
  return { lHip: s * 0.55 * speed, rHip: -s * 0.55 * speed, lKnee: Math.max(0, -s) * 0.8, rKnee: Math.max(0, s) * 0.8, lShoulder: -s * 0.4 * speed, rShoulder: s * 0.4 * speed };
}

// Sequence helpers: which shot is active at a global sequence frame.
export function sequenceLayout(shots) {
  let cursor = 0;
  return shots.map((s) => {
    const len = s.range.outFrame - s.range.inFrame;
    const item = { shotId: s.id, start: cursor, end: cursor + len, len };
    cursor += len;
    return item;
  });
}
