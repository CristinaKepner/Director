// Harness self-extension, gated by an admission test the proposer cannot game.
//
// The environment already says where it is incomplete:
//   * an `unverifiable` verdict marks a MISSING PROBE  (coverage gap)
//   * a state where no action repairs requirement j while the goal stays pass
//     marks a MISSING ACTION                            (capability gap)
//
// The danger is obvious: a harness that writes its own probes can make its own
// exam easier. So nothing is admitted on the proposer's say-so. A proposed probe
// must classify a set of held-out fixtures with known answers, built by
// construction rather than by the proposer, and a proposed action must repair
// its target without breaking the goal or any other requirement.
import { makeEnv } from "./env.mjs";
import { REQUIREMENTS } from "./env.mjs";

// ---------- gap detection ----------
export function findGaps(env, contract) {
  const { reqs, goal } = env.verdicts();
  const coverage = reqs.filter(r => r.status === "unverifiable")
                       .map(r => ({ kind: "missing-probe", requirement: r.kind }));
  const violated = reqs.filter(r => r.status === "violate");
  return { coverage, violated: violated.map(r => r.kind), goal: goal.status };
}

// A capability gap: no candidate repairs `requirement` while the goal survives.
export function capabilityGap(env, requirement, candidates) {
  const viable = [];
  for (const [name, payload] of candidates) {
    const a = env.attribute(name, payload);
    if (!a.ok) continue;
    const fixed = a.delta.some(x => x.kind === requirement && x.effect === "repaired");
    const brokeOther = a.delta.some(x => x.kind !== requirement && x.effect === "broke");
    if (fixed && !brokeOther && a.goalDelta.to === "pass") viable.push(name);
  }
  return { requirement, repairable: viable.length > 0, viable };
}

// ---------- admission: fixtures with known answers, built by construction ----------
// Each fixture is a (before, after) geometry pair whose correct verdict is known
// because we constructed the perturbation. The proposer never sees these.
export function buildFixtures(env, requirement, shotId) {
  const base = env.snapshot();
  const mk = (label, expect, mutate) => {
    env.restore(base);
    const before = env.evaluatedGeometry();
    mutate();
    return { label, expect, before, after: env.evaluatedGeometry() };
  };
  const T = env.task;
  const f = [
    mk("untouched", "pass", () => {}),
    mk("lens changed", requirement === "focal-constant" ? "violate" : "pass",
       () => env.step("camera.lens", { id: T.camId, focalLength: 55 })),
    mk("camera trucked", requirement === "orientation-constant" ? "violate" : "pass",
       () => env.step("camera.nudge", { id: T.camId, direction: "right", amount: "一点" })),
    mk("camera trucked far", requirement === "orientation-constant" ? "violate" : "pass",
       () => env.step("camera.nudge", { id: T.camId, direction: "left", amount: "明显" })),
  ];
  env.restore(base);
  return f.filter(x => x.expect);
}

// A probe is admitted only if it gets every fixture right.
export function admitProbe(probeFn, fixtures, shotId) {
  const results = fixtures.map(fx => {
    let got;
    try { got = probeFn({ kind: "candidate", shotId }, fx.before, fx.after).status; }
    catch (e) { got = `error: ${e.message}`; }
    return { ...fx, got, ok: got === fx.expect };
  });
  const degenerate = new Set(results.map(r => r.got)).size === 1 && results.length > 1;
  return { admitted: results.every(r => r.ok) && !degenerate, degenerate, results };
}
