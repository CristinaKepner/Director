// Regression tests for the Director-RL research environment.
// These assert environment PROPERTIES, not model quality.
import test from "node:test";
import assert from "node:assert/strict";
import { makeEnv } from "./env.mjs";
import { runEpisode } from "./rollout.mjs";
import { naivePolicy, repairPolicy, wrongRepairPolicy } from "./policies.mjs";
import { cameraPosition } from "./actions.mjs";
import * as R from "../core/index.js";

const TASK = "truck-preserve-orientation";

test("reset is deterministic and the action space is state-masked", () => {
  const a = makeEnv({ task: TASK }); a.reset();
  const b = makeEnv({ task: TASK }); b.reset();
  assert.deepEqual(a.evaluatedGeometry(), b.evaluatedGeometry());
  const legal = a.legalActions();
  assert.ok(legal.length > 0);
  const state = R.store.get().project.currentState;
  for (const act of legal) assert.ok(R.capabilities().find((c) => c.name === act.name).allowedIn.includes(state));
});

test("a declared-correct truck violates orientation in evaluated geometry", () => {
  const env = makeEnv({ task: TASK }); env.reset();
  env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" });
  const { reqs, goal } = env.verdicts();
  assert.equal(goal.status, "pass", "the declared edit lands");
  const ori = reqs.find((r) => r.kind === "orientation-constant");
  const foc = reqs.find((r) => r.kind === "focal-constant");
  const other = reqs.find((r) => r.kind === "shot-untouched");
  assert.equal(foc.status, "pass", "lens untouched");
  assert.equal(other.status, "pass", "neighbouring shot untouched");
  assert.equal(ori.status, "violate", "but the viewing direction rotates");
  assert.ok(Math.abs(ori.worstDeg - 1.689) < 0.01, `expected ~1.689 deg, got ${ori.worstDeg}`);
});

test("an unverifiable requirement is never scored as a pass", () => {
  const env = makeEnv({ task: TASK }); env.reset();
  const before = env.baseline();
  env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" });
  const v = env.contractCheck([{ kind: "actor-timing", shotId: "shot_01" }], before.geom, env.baseline().geom);
  assert.equal(v[0].status, "unverifiable");
  assert.notEqual(v[0].status, "pass");
});

test("repair beats naive, and breaking a second requirement is worse than neither", () => {
  const naive = runEpisode(TASK, naivePolicy);
  const wrong = runEpisode(TASK, wrongRepairPolicy);
  const fixed = runEpisode(TASK, repairPolicy);
  assert.equal(naive.success, false);
  assert.equal(wrong.success, false);
  assert.equal(fixed.success, true, "baking the translated path satisfies every requirement");
  assert.ok(fixed.reward > naive.reward, "repair must be rewarded");
  assert.ok(naive.reward > wrong.reward, "breaking more requirements must cost more");
  assert.deepEqual(fixed.violated, []);
});

test("branch-and-compare attributes the repair to the action that made it", () => {
  const env = makeEnv({ task: TASK }); env.reset();
  const p0 = cameraPosition(env.task.camId);
  env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" });
  const d = cameraPosition(env.task.camId).map((x, i) => x - p0[i]);
  const orig = env.originGeometry()[env.task.shotId];

  const bake = env.attribute("research.shot.bake", { id: env.task.shotId,
    keyframes: orig.map((s) => ({ frame: s.f, position: s.position.map((x, i) => x + d[i]),
      lookAt: s.lookAt.map((x, i) => x + d[i]), focalLength: s.focalLength, roll: s.roll })) });
  assert.equal(bake.delta.find((x) => x.kind === "orientation-constant").effect, "repaired");
  assert.equal(bake.delta.find((x) => x.kind === "focal-constant").effect, "unchanged");

  const lens = env.attribute("camera.lens", { id: env.task.camId, focalLength: 55 });
  assert.equal(lens.delta.find((x) => x.kind === "focal-constant").effect, "broke");
  assert.equal(lens.delta.find((x) => x.kind === "orientation-constant").effect, "unchanged");

  // attribute() must leave no trace: it branches and restores.
  const after = env.verdicts();
  assert.equal(after.reqs.find((r) => r.kind === "focal-constant").status, "pass");
});

test("a success flag is not evidence that an edit happened", () => {
  const env = makeEnv({ task: TASK }); env.reset();
  const before = JSON.stringify(R.store.get().shots.find((s) => s.id === "shot_01").motion);
  const r = env.step("shot.update", { id: "shot_01", motion: { type: "truck" } });
  assert.equal(r.ok, true, "the runtime reports success");
  const after = JSON.stringify(R.store.get().shots.find((s) => s.id === "shot_01").motion);
  assert.equal(before, after, "but the declared field is unchanged: unknown keys are dropped");
});

test("the goal probe is direction-aware and not gameable by magnitude", () => {
  const right = runEpisode(TASK, (env) =>
    env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" }));
  const left = runEpisode(TASK, (env) =>
    env.step("camera.nudge", { id: env.task.camId, direction: "left", amount: "一点" }));
  const far = runEpisode(TASK, (env) =>
    env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "明显" }));
  assert.equal(right.goal, "pass", "correct direction and distance");
  assert.equal(left.goal, "violate", "same distance, wrong way, is not a pass");
  assert.equal(far.goal, "violate", "overshoot is not a pass");
});

test("the shipped action space cannot satisfy goal and constraint together", async () => {
  const { capabilityGap } = await import("./evolve.mjs");
  const env = makeEnv({ task: TASK }); env.reset();
  env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" });
  const cands = [
    ["camera.nudge", { id: env.task.camId, direction: "left", amount: "一点" }],
    ["camera.lens", { id: env.task.camId, focalLength: 35 }],
    ["camera.transform", { id: env.task.camId, delta: [-0.15, 0, 0] }],
    ["camera.frame", { id: env.task.camId, size: "MS" }],
  ];
  const cg = capabilityGap(env, "orientation-constant", cands);
  assert.equal(cg.repairable, false,
    "every shipped repair for orientation destroys the goal: the two are jointly unsatisfiable");
});

test("a self-proposed probe is admitted only if it survives held-out fixtures", async () => {
  const { buildFixtures, admitProbe } = await import("./evolve.mjs");
  const { REQUIREMENTS } = await import("./env.mjs");
  const env = makeEnv({ task: TASK }); env.reset();
  const fx = buildFixtures(env, "orientation-constant", env.task.shotId);
  assert.ok(fx.length >= 3, "fixtures must contain both passing and violating cases");

  const honest = (req, b, a) =>
    REQUIREMENTS["orientation-constant"]({ ...req, shotId: env.task.shotId, tolDeg: 0.05 }, b, a);
  assert.equal(admitProbe(honest, fx, env.task.shotId).admitted, true);

  // the self-gaming failure mode: a probe that makes its own exam easier
  for (const bad of [() => ({ status: "pass" }), () => ({ status: "unverifiable" })]) {
    const v = admitProbe(bad, fx, env.task.shotId);
    assert.equal(v.admitted, false, "a constant-verdict probe must never be admitted");
    assert.equal(v.degenerate, true);
  }
  // measuring the wrong quantity is also caught
  const wrong = (req, b, a) =>
    REQUIREMENTS["focal-constant"]({ ...req, shotId: env.task.shotId, tol: 1e-6 }, b, a);
  assert.equal(admitProbe(wrong, fx, env.task.shotId).admitted, false);
});
