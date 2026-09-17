// Research-only Actions. Registered from research/ so the shipping runtime is untouched.
// They exist because the released action space cannot express an orientation-preserving
// truck: camera.look-at only accepts an entity id, so a world-space aim point is
// unreachable, and the repair the contract requires is therefore inexpressible.
import { register, store } from "../core/index.js";

let installed = false;

export function installResearchActions() {
  if (installed) return;
  installed = true;

  register("research.camera.aim", {
    doc: "Set the camera's look-at to an explicit world point (research: enables orientation repair).",
    params: { id: "string", point: "[x,y,z]" },
    required: ["id", "point"],
    undoable: true,
    validate: ({ id }, d) => (d.cameras.some((c) => c.id === id) ? null : { error: "NO_CAMERA" }),
    handler({ id, point }) {
      const p = [Number(point[0]), Number(point[1]), Number(point[2])];
      if (p.some((x) => !Number.isFinite(x))) return { ok: false, error: "BAD_POINT" };
      store.patch((d) => {
        const c = d.cameras.find((x) => x.id === id);
        c.pose.lookAt = p;
        c.version += 1;
      });
      return { ok: true, aimed: p };
    },
  });

  // Preserving orientation under a truck requires an explicit R. In this runtime the
  // evaluated aim comes from shot.targetIds[0] || cam.target -- an ENTITY -- not from
  // cam.pose.lookAt, so no camera-level action can repair evaluated orientation.
  // Baking per-frame keyframes is the only expressible repair; keyframes win in
  // cameraStateAt, which is exactly why this action closes the gap.
  register("research.shot.bake", {
    doc: "Write explicit per-frame keyframes for a shot (research: the only orientation-preserving repair).",
    params: { id: "string", keyframes: "[{frame,position,lookAt,focalLength,roll}]" },
    required: ["id", "keyframes"],
    undoable: true,
    validate: ({ id }, d) => (d.shots.some((s) => s.id === id) ? null : { error: "NO_SHOT" }),
    handler({ id, keyframes }) {
      if (!Array.isArray(keyframes) || keyframes.length < 2) return { ok: false, error: "NEED_2_KEYFRAMES" };
      store.patch((d) => {
        const s = d.shots.find((x) => x.id === id);
        s.keyframes = keyframes.map((k) => ({
          frame: Number(k.frame),
          position: k.position.map(Number),
          lookAt: k.lookAt.map(Number),
          focalLength: Number(k.focalLength),
          roll: Number(k.roll || 0),
        }));
        s.version = (s.version || 0) + 1;
      });
      return { ok: true, baked: keyframes.length };
    },
  });

  // A probe costs the agent budget and returns evidence, but changes nothing.
  register("research.probe.contract", {
    doc: "Score the active contract against evaluated geometry (research: costs one probe).",
    undoable: false,
    handler: () => ({ ok: true, probe: true }),
  });
}

export function cameraAimPoint(camId) {
  const d = store.get();
  const c = d.cameras.find((x) => x.id === camId);
  const t = c?.pose?.lookAt ?? c?.target ?? [0, 1, 0];
  if (Array.isArray(t)) return [...t];
  const e = d.entities.find((x) => x.id === t);
  return e?.transform?.position ? [...e.transform.position] : [0, 1, 0];
}

export function cameraPosition(camId) {
  return [...store.get().cameras.find((x) => x.id === camId).pose.position];
}
