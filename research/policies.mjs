// Scripted reference policies. These are not learned -- they exist to prove the
// environment rewards repair, and to give an RL policy something to beat.
import { cameraAimPoint, cameraPosition } from "./actions.mjs";

// Does exactly what the instruction says, trusts the runtime, never checks.
export function naivePolicy(env) {
  const T = env.task;
  env.step("camera.nudge", { id: T.camId, direction: "right", amount: "一点" });
}

// Executes, inspects the evaluated result, and repairs what it broke.
export function repairPolicy(env) {
  const T = env.task;
  const posBefore = cameraPosition(T.camId);
  env.step("camera.nudge", { id: T.camId, direction: "right", amount: "一点" });

  const { reqs } = env.probe();                       // costs budget, returns evidence
  const broken = reqs.filter((r) => r.status === "violate");
  if (!broken.length) return;

  if (broken.some((r) => r.kind === "orientation-constant")) {
    // The evaluated aim follows an entity, so no camera-level action can restore the
    // direction. The repair is to bake the original path translated by the same delta:
    // translating position and aim together leaves every viewing direction unchanged.
    const posAfter = cameraPosition(T.camId);
    const d = posAfter.map((x, i) => x - posBefore[i]);
    const orig = env.originGeometry()[T.shotId];
    env.step("research.shot.bake", {
      id: T.shotId,
      keyframes: orig.map((s) => ({
        frame: s.f,
        position: s.position.map((x, i) => x + d[i]),
        lookAt: s.lookAt.map((x, i) => x + d[i]),
        focalLength: s.focalLength,
        roll: s.roll,
      })),
    });
  }
}

// Repairs, but by changing the lens instead -- breaks a different requirement.
export function wrongRepairPolicy(env) {
  const T = env.task;
  env.step("camera.nudge", { id: T.camId, direction: "right", amount: "一点" });
  env.probe();
  env.step("camera.lens", { id: T.camId, focalLength: 55 });
}
