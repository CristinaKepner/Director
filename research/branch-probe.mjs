// Measures how far a program-LOCAL edit propagates through EVALUATED geometry.
// Uses only the runtime's own snapshot / restore, so every branch starts identical.
import { makeEnv } from "./env.mjs";

const env = makeEnv();
const fmt = (x) => (x === 0 ? "0" : x.toExponential(2));

function branch(base, fn) {
  env.restore(base);
  const before = env.evaluatedGeometry();
  const r = fn();
  const after = env.evaluatedGeometry();
  return { ok: r.ok, error: r.error, before, after };
}

function spread(before, after) {
  const rows = [];
  for (const id of Object.keys(after)) {
    const b = before[id], a = after[id];
    const per = a.map((s, i) => Math.max(
      Math.hypot(...s.position.map((x, k) => x - b[i].position[k])),
      Math.abs(s.focalLength - b[i].focalLength)));
    const touched = per.filter((d) => d > 1e-9).length;
    rows.push({ id, frames: per.length, touched, maxDrift: Math.max(...per) });
  }
  return rows;
}

env.reset();
const base = env.snapshot();

const EDITS = [
  ["camera.nudge  (declared: move program camera right 0.15 m)",
   () => env.step("camera.nudge", { id: "cam_program", direction: "right", amount: "一点" }).res],
  ["shot.update   (declared: shot_01 motion dolly-in -> truck)",
   () => env.step("shot.update", { id: "shot_01", motion: { type: "truck" } }).res],
  ["camera.lens   (declared: program camera 40 mm -> 55 mm)",
   () => env.step("camera.lens", { id: "cam_program", focalLength: 55 }).res],
];

console.log("Program-local edit  ->  extent in EVALUATED geometry");
console.log("=".repeat(74));
for (const [label, fn] of EDITS) {
  const { ok, error, before, after } = branch(base, fn);
  console.log(`\n${label}`);
  if (!ok) { console.log(`   rejected: ${error}`); continue; }
  for (const r of spread(before, after))
    console.log(`   ${r.id}  frames touched ${String(r.touched).padStart(3)}/${r.frames}` +
                `   max drift ${fmt(r.maxDrift)}`);
}

// A contract that a program-state lock would call satisfied.
console.log("\n" + "=".repeat(74));
const { before, after } = branch(base, () =>
  env.step("camera.nudge", { id: "cam_program", direction: "right", amount: "一点" }).res);
const verdict = env.contractCheck([
  { kind: "focal-constant",       shotId: "shot_01", note: "lens must not change" },
  { kind: "orientation-constant", shotId: "shot_01", note: "a truck must not become a pan" },
  { kind: "shot-untouched",       shotId: "shot_02", note: "only shot_01 was addressed" },
  { kind: "actor-timing",         shotId: "shot_01", note: "action timing preserved" },
], before, after);
console.log("Contract verdict after the nudge (evaluated, not declared):");
for (const v of verdict)
  console.log(`   ${v.status.toUpperCase().padEnd(13)} ${v.kind.padEnd(22)} ${v.why || JSON.stringify(
      Object.fromEntries(Object.entries(v).filter(([k]) => /drift|worstDeg/.test(k))))}`);
