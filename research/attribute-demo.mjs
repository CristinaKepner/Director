// Credit assignment by replayable branching: from one intermediate state, ask of each
// candidate action what it repairs and what it breaks. Only possible because evaluated
// geometry is observable without generating a single frame.
import { makeEnv } from "./env.mjs";
import { cameraPosition } from "./actions.mjs";

const env = makeEnv({ task: "truck-preserve-orientation" });
env.reset();

const posBefore = cameraPosition(env.task.camId);
env.step("camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" });
const d = cameraPosition(env.task.camId).map((x, i) => x - posBefore[i]);
const orig = env.originGeometry()[env.task.shotId];

const CANDIDATES = {
  "camera.lens 55mm": ["camera.lens", { id: env.task.camId, focalLength: 55 }],
  "nudge again right": ["camera.nudge", { id: env.task.camId, direction: "right", amount: "一点" }],
  "bake translated path": ["research.shot.bake", { id: env.task.shotId,
    keyframes: orig.map((s) => ({ frame: s.f, position: s.position.map((x, i) => x + d[i]),
      lookAt: s.lookAt.map((x, i) => x + d[i]), focalLength: s.focalLength, roll: s.roll })) }],
};

console.log("State: nudge applied, orientation already violated.");
console.log("Which candidate action repairs it, and what does each break?\n");
console.log("candidate               goal          orientation   focal        other-shot");
console.log("-".repeat(80));
for (const [label, [name, payload]] of Object.entries(CANDIDATES)) {
  const a = env.attribute(name, payload);
  const by = Object.fromEntries(a.delta.map((x) => [x.kind, x.effect]));
  console.log(label.padEnd(23),
    `${a.goalDelta.from}->${a.goalDelta.to}`.padEnd(14),
    (by["orientation-constant"] || "-").padEnd(13),
    (by["focal-constant"] || "-").padEnd(12),
    by["shot-untouched"] || "-");
}
