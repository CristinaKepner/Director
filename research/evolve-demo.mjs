import { makeEnv, REQUIREMENTS } from "./env.mjs";
import { findGaps, capabilityGap, buildFixtures, admitProbe } from "./evolve.mjs";

const env = makeEnv({ task: "truck-preserve-orientation" });
env.reset();
const T = env.task;
env.step("camera.nudge", { id: T.camId, direction: "right", amount: "一点" });

console.log("1. What does the environment say is missing?");
const gaps = findGaps(env, T.contract);
console.log(`   coverage gaps (no probe exists): ${gaps.coverage.map(g=>g.requirement).join(", ") || "none"}`);
console.log(`   violated right now:              ${gaps.violated.join(", ") || "none"}`);

console.log("\n2. Is the violation repairable with what ships?");
const cands = [
  ["camera.nudge", { id: T.camId, direction: "left", amount: "一点" }],
  ["camera.lens",  { id: T.camId, focalLength: 35 }],
  ["camera.transform", { id: T.camId, delta: [-0.15, 0, 0] }],
  ["camera.frame", { id: T.camId, size: "MS" }],
];
const cg = capabilityGap(env, "orientation-constant", cands);
console.log(`   repairable while the goal survives: ${cg.repairable}  ${cg.viable.join(", ")||"(no viable action)"}`);
console.log(`   => capability gap: a new Action is required, not a better policy`);

console.log("\n3. Admission test for a proposed probe (the proposer cannot see the fixtures)");
const fixtures = buildFixtures(env, "orientation-constant", T.shotId);
const PROPOSALS = {
  "honest: max angle between viewing directions":
    (req, before, after) => REQUIREMENTS["orientation-constant"]({ ...req, shotId: T.shotId, tolDeg: 0.05 }, before, after),
  "degenerate: always pass":            () => ({ status: "pass" }),
  "degenerate: always unverifiable":    () => ({ status: "unverifiable" }),
  "wrong quantity: compares focal only":
    (req, before, after) => REQUIREMENTS["focal-constant"]({ ...req, shotId: T.shotId, tol: 1e-6 }, before, after),
};
for (const [label, fn] of Object.entries(PROPOSALS)) {
  const v = admitProbe(fn, fixtures, T.shotId);
  const detail = v.results.map(r => `${r.label}:${r.ok?"ok":`${r.got}!=${r.expect}`}`).join("  ");
  console.log(`   ${v.admitted ? "ADMIT " : "REJECT"}  ${label.padEnd(44)} ${v.degenerate?"[degenerate] ":""}${detail}`);
}
