// Can ANY shipped action repair a violated requirement?
// Sweeps the camera/shot action families with plausible payloads from a violated
// state, restoring between every trial, and reports which requirements are
// repairable at all. This turns "the optimal action does not exist" from an
// anecdote into a coverage number.
import { makeEnv } from "./env.mjs";
import * as R from "../core/index.js";
import { cameraPosition } from "./actions.mjs";

const env = makeEnv({ task: "truck-preserve-orientation" });
env.reset();
const T = env.task;

// plausible payloads per action, built from the live project
function payloadsFor(name) {
  const d = R.store.get();
  const cam = T.camId, shot = T.shotId;
  const ent = d.entities?.[0]?.id;
  const P = {
    "camera.transform": [{ id: cam, delta: [0.15, 0, 0] }, { id: cam, delta: [-0.15, 0, 0] },
                         { id: cam, rotation: [0, 0.03, 0] }, { id: cam, height: 1.6 }],
    "camera.nudge":     [{ id: cam, direction: "left", amount: "一点" }, { id: cam, direction: "right", amount: "一点" }],
    "camera.look-at":   ent ? [{ id: cam, target: ent }, { id: cam, target: null }] : [],
    "camera.lens":      [{ id: cam, focalLength: 35 }, { id: cam, focalLength: 50 }],
    "camera.frame":     [{ id: cam, size: "MS" }, { id: cam, size: "CU" }],
    "camera.rig":       [{ id: cam, rig: "tripod" }],
    "camera.update":    [{ id: cam, preset: "MS" }],
    "shot.update":      [{ id: shot, title: "x" }, { id: shot, targetIds: ent ? [ent] : [] }],
    "shot.select":      [{ id: shot }],
  };
  return P[name] || [];
}

const CANDIDATES = R.listActions().filter(n => /^(camera|shot)\./.test(n));
const base = env.snapshot();

function violate() {                       // put the world into the violated state
  env.restore(base);
  env.step("camera.nudge", { id: T.camId, direction: "right", amount: "一点" });
  return env.snapshot();
}

const violated = violate();
const pre = env.verdicts();
const broken = pre.reqs.filter(r => r.status === "violate").map(r => r.kind);
console.log(`violated requirement(s): ${broken.join(", ")}`);
console.log(`sweeping ${CANDIDATES.length} camera/shot actions with plausible payloads\n`);

const repairs = [];
let tried = 0;
for (const name of CANDIDATES) {
  for (const payload of payloadsFor(name)) {
    env.restore(violated);
    tried++;
    const a = env.attribute(name, payload);
    if (!a.ok) continue;
    const fixed = a.delta.filter(x => x.effect === "repaired").map(x => x.kind);
    const brokeMore = a.delta.filter(x => x.effect === "broke").map(x => x.kind);
    if (fixed.length) repairs.push({ name, payload, fixed, brokeMore, goal: a.goalDelta.to });
  }
}
console.log(`trials: ${tried}`);
console.log(`shipped actions that repair anything: ${repairs.length}`);
for (const r of repairs)
  console.log(`   ${r.name}  fixed=${r.fixed.join(",")}  broke=${r.brokeMore.join(",")||"-"}  goal=${r.goal}`);

// the research-only action, for contrast
env.restore(violated);
const d0 = cameraPosition(T.camId);
env.restore(base); const p0 = cameraPosition(T.camId);
env.restore(violated);
const delta = cameraPosition(T.camId).map((x, i) => x - p0[i]);
const orig = env.originGeometry()[T.shotId];
const bake = env.attribute("research.shot.bake", { id: T.shotId,
  keyframes: orig.map(s => ({ frame: s.f, position: s.position.map((x,i)=>x+delta[i]),
    lookAt: s.lookAt.map((x,i)=>x+delta[i]), focalLength: s.focalLength, roll: s.roll })) });
console.log(`\nresearch.shot.bake (added by us): fixed=${bake.delta.filter(x=>x.effect==="repaired").map(x=>x.kind).join(",")||"-"}`);
console.log(`\n=> repair coverage for "${broken.join(",")}" in the shipped action space: ${repairs.length}/${tried} trials`);
